// ═══════════════════════════════════════════════════════════════
//  FIGHT CLUB — Multiplayer Server v2
//  Auth, PvE, PvP, Shop, Equipment, Loot, Achievements, Daily
// ═══════════════════════════════════════════════════════════════

import { randomUUID } from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { appendFileSync, mkdirSync, existsSync } from 'fs';
import * as db from './db.js';
import bcrypt from 'bcryptjs';
import { initLogger, log as gameLog, getRecentLogs, checkRotation } from './logger.js';
import type { User, ResolvedUser } from './data/types.js';

import { ITEMS, RARITY } from './data/items.js';
import { NPCS } from './data/npcs.js';
import { CLASSES } from './data/classes.js';
import { SKILL_TREES, getSkillTreeEffects, getSkillPoints, MASTERIES, getMasteryEffects, getMasteryCost, getMasterySpent } from './data/skills.js';
import { ACHIEVEMENTS } from './data/achievements.js';
import { DUNGEONS } from './data/dungeons.js';
import { QUEST_TEMPLATES, getQuestProgress, checkQuests } from './data/quests.js';
import { TITLES, getUnlockedTitles } from './data/titles.js';

function resolveUser(u: any): ResolvedUser {
  return u; // The JSON data has all fields set by server logic; this cast is safe
}

function resolveBaseId(u: ResolvedUser, ref: string): string {
  const inst = u.itemInstances?.[ref];
  return inst ? inst.baseId : ref;
}

function resolveItem(u: ResolvedUser, ref: string): any {
  return ITEMS[resolveBaseId(u, ref)];
}

function createItemInstance(u: ResolvedUser, baseId: string): string {
  const item = ITEMS[baseId];
  if (!item || item.consumable) return baseId;
  if (!u.itemInstances) u.itemInstances = {};
  const uuid = randomUUID();
  u.itemInstances[uuid] = { baseId, enchantLevel: 0, durability: 100 };
  return uuid;
}

function destroyItemInstance(u: ResolvedUser, ref: string): void {
  if (u.itemInstances?.[ref]) delete u.itemInstances[ref];
}

const PORT = Number(process.env.PORT) || 3100;

const BASE_INVENTORY_SLOTS = 20;

// ─── Inventory Helpers ───────────────────────────────────────

function getMaxInventorySlots(u: ResolvedUser) {
  let slots = BASE_INVENTORY_SLOTS;
  const backpackId = u.equipment?.backpack;
  if (backpackId) {
    const bp = resolveItem(u, backpackId);
    if (bp?.extraSlots) slots += bp.extraSlots;
  }
  return slots;
}

// Migrate old array inventory to slot-based (fixed-size with nulls)
function migrateInventory(u: ResolvedUser) {
  if (!u.inventory) u.inventory = [];
  const maxSlots = getMaxInventorySlots(u);
  // Fix bloated inventories: compact items into maxSlots
  if (u.inventory.length > maxSlots) {
    const items = u.inventory.filter(Boolean).slice(0, maxSlots);
    u.inventory = items;
    while (u.inventory.length < maxSlots) u.inventory.push(null);
  }
  if (u.inventory.length < maxSlots) {
    while (u.inventory.length < maxSlots) u.inventory.push(null);
  }
}

function addToInventory(u: ResolvedUser, itemId: string) {
  migrateInventory(u);
  const maxSlots = getMaxInventorySlots(u);
  // Find first empty slot
  for (let i = 0; i < maxSlots; i++) {
    if (!u.inventory[i]) {
      u.inventory[i] = itemId;
      return true;
    }
  }
  return false; // inventory full
}

function removeFromInventory(u: ResolvedUser, itemId: string) {
  if (!u.inventory) return false;
  const idx = u.inventory.indexOf(itemId);
  if (idx === -1) return false;
  u.inventory[idx] = null; // leave empty slot, don't shift
  return true;
}

function isInventoryFull(u: ResolvedUser) {
  migrateInventory(u);
  const maxSlots = getMaxInventorySlots(u);
  for (let i = 0; i < maxSlots; i++) {
    if (!u.inventory[i]) return false;
  }
  return true;
}

// ─── Death Penalty System ─────────────────────────────────────

// Durability: 100 = full, degrades on death. Affects item stats.
function getDurabilityMultiplier(durability: number) {
  if (durability > 75) return 1.0;
  if (durability > 50) return 0.75;
  if (durability > 25) return 0.50;
  return 0.25;
}

function getItemDurability(u: ResolvedUser, itemId: string) {
  return u.itemInstances?.[itemId]?.durability ?? 100;
}

function damageAllEquipmentDurability(u: ResolvedUser, amount: number) {
  const eq = u.equipment || {};
  for (const slot of ['weapon', 'armor', 'helmet', 'boots', 'ring']) {
    const ref = eq[slot];
    if (ref) {
      if (u.itemInstances?.[ref]) u.itemInstances[ref].durability = Math.max(0, (u.itemInstances[ref].durability ?? 100) - amount);
    }
  }
}

function getRepairCost(u: ResolvedUser) {
  let total = 0;
  const eq = u.equipment || {};
  for (const slot of ['weapon', 'armor', 'helmet', 'boots', 'ring']) {
    const ref = eq[slot];
    const item = ref ? resolveItem(u, ref) : null;
    if (ref && item) {
      const dur = u.itemInstances?.[ref]?.durability ?? 100;
      if (dur < 100) {
        const missing = 100 - dur;
        const rarityMult: Record<string, number> = { common: 1, uncommon: 2, rare: 4, epic: 8, legendary: 15 };
        total += Math.ceil(missing * (item.reqLevel || 1) * 0.3 * (rarityMult[item.rarity!] || 1));
      }
    }
  }
  return total;
}

// Soul sickness: stacking debuff from deaths
function getSoulSicknessMultiplier(u: ResolvedUser) {
  const stacks = u.soulSickness || 0;
  return Math.max(0.7, 1 - stacks * 0.03); // -3% per stack, min 70%
}

// Apply all death penalties
function applyDeathPenalties(u: ResolvedUser, npcName: string, log: any[]) {
  // 1. Gold loss: 5%
  const goldLoss = Math.floor((u.gold || 0) * 0.05);
  if (goldLoss > 0) {
    u.gold -= goldLoss;
    log.push({ type: 'system', text: `💸 Lost ${goldLoss}🪙` });
  }

  // 2. Soul sickness: +1 stack
  u.soulSickness = Math.min(10, (u.soulSickness || 0) + 1);
  log.push({ type: 'system', text: `💀 Soul Sickness +1 (${u.soulSickness}/10) — all stats -${u.soulSickness * 3}%` });

  // 3. Durability: -2 all equipped
  damageAllEquipmentDurability(u, 2);
  log.push({ type: 'system', text: `🔧 Equipment durability -2` });

  // 4. Drop penalty: 5 fights
  u.dropPenalty = 5;
  log.push({ type: 'system', text: `🎲 Drop chance -50% for 5 fights` });

  // 5. XP loss at 3+ soul sickness stacks
  if ((u.soulSickness || 0) >= 3) {
    const xpLoss = Math.floor((u.xp || 0) * 0.02);
    if (xpLoss > 0) {
      u.xp -= xpLoss;
      log.push({ type: 'system', text: `📉 Lost ${xpLoss} XP (Soul Sickness ≥3)` });
    }
  }

  // Revive at 30% HP
  const maxHpP = getMaxHpWithPassive(u);
  u.currentHp = Math.floor(maxHpP * 0.3);
  log.push({ type: 'system', text: `❤️ Revived at 30% HP` });
}

// ─── Persistence (SQLite via db.ts) ─────────────────────────

db.initDb();
initLogger();
let users: Record<string, ResolvedUser> = db.loadAllUsers();
let guilds: Record<string, any> = db.loadAllGuilds();

// Migrate existing users to item instances
let instanceMigrated = 0;
for (const [name, u] of Object.entries(users)) {
  if (u.itemInstances && Object.keys(u.itemInstances).length > 0) continue;
  u.itemInstances = {};
  const oldEnchants = u.enchantLevels || {};
  const oldDurability = u.durability || {};
  const migrated = new Set<string>();
  // Migrate equipment
  if (u.equipment) {
    for (const slot of Object.keys(u.equipment)) {
      const oldId = u.equipment[slot];
      if (oldId && ITEMS[oldId] && !ITEMS[oldId].consumable) {
        const uuid = randomUUID();
        u.itemInstances[uuid] = { baseId: oldId, enchantLevel: oldEnchants[oldId] || 0, durability: oldDurability[oldId] ?? 100 };
        u.equipment[slot] = uuid;
        migrated.add(oldId);
      }
    }
  }
  // Migrate inventory
  if (u.inventory) {
    for (let i = 0; i < u.inventory.length; i++) {
      const oldId = u.inventory[i];
      if (!oldId || !ITEMS[oldId] || ITEMS[oldId].consumable) continue;
      const uuid = randomUUID();
      const isFirst = !migrated.has(oldId);
      u.itemInstances[uuid] = { baseId: oldId, enchantLevel: isFirst ? (oldEnchants[oldId] || 0) : 0, durability: isFirst ? (oldDurability[oldId] ?? 100) : 100 };
      migrated.add(oldId);
      u.inventory[i] = uuid;
    }
  }
  u.enchantLevels = {};
  u.durability = {};
  db.saveUser(name, u);
  instanceMigrated++;
}
if (instanceMigrated > 0) console.log(`Migrated ${instanceMigrated} users to item instances.`);

function getGuildLevel(guild: any) {
  return guild.guildLevel || 1;
}

function getGuildXpNeeded(level: number) {
  return Math.floor(500 * Math.pow(level, 1.5));
}

function addGuildXp(guildId: string, amount: number): string[] {
  const guild = guilds[guildId];
  if (!guild) return [];
  const messages: string[] = [];
  guild.guildXp = (guild.guildXp || 0) + amount;
  let leveled = false;
  while (guild.guildXp >= getGuildXpNeeded(guild.guildLevel || 1)) {
    guild.guildXp -= getGuildXpNeeded(guild.guildLevel || 1);
    guild.guildLevel = (guild.guildLevel || 1) + 1;
    leveled = true;
    messages.push(`⚔️ Guild leveled up to level ${guild.guildLevel}!`);
  }
  if (leveled) {
    // Notify online guild members
    for (const m of guild.members) {
      if (online.has(m)) {
        for (const msg of messages) {
          send(online.get(m)!.ws, { type: 'chat', user: 'Guild', text: msg, msgType: 'system' });
        }
        send(online.get(m)!.ws, { type: 'guild_info', guild: makeGuildInfo(guildId, guild) });
      }
    }
  }
  db.saveGuild(guildId, guild);
  return messages;
}

function getGuildMaxMembers(guild: any) {
  return 10 + Math.floor(getGuildLevel(guild) / 2);
}

function getGuildBonus(guild: any) {
  const lvl = getGuildLevel(guild);
  const memberCount = guild.members?.length || 0;
  return {
    xpPct: Math.min(0.50, lvl * 0.02 + memberCount * 0.005),
    goldPct: Math.min(0.30, lvl * 0.01 + memberCount * 0.005),
  };
}

function makeGuildInfo(id: string, guild: any) {
  return { id, ...guild, level: getGuildLevel(guild), bonus: getGuildBonus(guild), maxMembers: getGuildMaxMembers(guild), guildXpNeeded: getGuildXpNeeded(getGuildLevel(guild)) };
}

function getPlayerGuild(username: string) {
  for (const [id, g] of Object.entries(guilds)) {
    if (g.members.includes(username)) return { id, ...g };
  }
  return null;
}

// ─── Seasons ─────────────────────────────────────────────────

function getCurrentSeason() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getSeasonPoints(u: ResolvedUser) {
  const season = getCurrentSeason();
  if (u.seasonId !== season) {
    // New season — reset points, keep last season record
    u.lastSeasonPoints = u.seasonPoints || 0;
    u.lastSeasonId = u.seasonId;
    u.seasonPoints = 0;
    u.seasonId = season;
  }
  return u.seasonPoints || 0;
}

function addSeasonPoints(u: ResolvedUser, points: number) {
  getSeasonPoints(u); // ensure current season
  u.seasonPoints = (u.seasonPoints || 0) + points;
}

// Season rewards thresholds
const SEASON_REWARDS = [
  { points: 500,   reward: 'Season Bronze',  goldReward: 1000,  icon: '🥉' },
  { points: 2000,  reward: 'Season Silver',  goldReward: 5000,  icon: '🥈' },
  { points: 5000,  reward: 'Season Gold',    goldReward: 15000, icon: '🥇' },
  { points: 15000, reward: 'Season Diamond', goldReward: 50000, icon: '💎' },
];

// ─── Chat Logging ───────────────────────────────────────────

const CHAT_LOG_DIR = '/data/chatlogs';
if (!existsSync(CHAT_LOG_DIR)) mkdirSync(CHAT_LOG_DIR, { recursive: true });

function logChat(user: string, text: string, msgType: string): void {
  const date = new Date().toISOString().slice(0, 10);
  const time = new Date().toISOString().slice(11, 19);
  const line = `[${time}] [${msgType}] ${user}: ${text}\n`;
  try { appendFileSync(`${CHAT_LOG_DIR}/${date}.log`, line); } catch {}
}

// ─── Admin ──────────────────────────────────────────────────

const ADMIN_USERS = new Set(['admin', 'nga', 'Ahmet']); // usernames with admin access
function isAdmin(username: string): boolean {
  return ADMIN_USERS.has(username) || !!(users[username] as any)?.isAdmin;
}

// ─── State ───────────────────────────────────────────────────

const online = new Map<string, { ws: WebSocket; player: User }>();
const challenges = new Map<string, any>();
const fights = new Map<string, any>();
let nextId = 1;

// ─── Profanity Filter ────────────────────────────────────────
const PROFANITY_LIST = [
  'fuck','shit','ass','bitch','dick','damn','cunt','bastard','cock','pussy',
  'whore','slut','fag','nigger','nigga','retard','piss','crap',
  'stfu','gtfo','wtf','lmao','milf',
];
const PROFANITY_RE = new RegExp('\\b(' + PROFANITY_LIST.join('|') + ')\\b', 'gi');
function filterProfanity(text: string) {
  return text.replace(PROFANITY_RE, m => '*'.repeat(m.length));
}

// ─── Combat Engine ───────────────────────────────────────────

export const MAX_LEVEL = 300;
export const ZONES = ['head', 'body', 'legs'];
export const ZONE_NAMES: Record<string, string> = { head: 'Head', body: 'Body', legs: 'Legs' };
export function rng(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function humanize(n: number) {
  if (n >= 1000000000) return (n / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  if (n >= 1000) return n.toLocaleString();
  return String(n);
}
export function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
export function calcHitChance(atkAgi: number, defAgi: number, blocked: boolean) { return clamp(65 + (atkAgi - defAgi) * 3 - (blocked ? 30 : 0), 10, 95); }
export function calcDamage(str: number, minD: number, maxD: number, isCrit: boolean, armor: number) { return Math.max(1, rng(minD, maxD) + Math.floor(str * 0.5) * (isCrit ? 2 : 1) - Math.floor(armor * 0.6)); }
export function calcMaxHp(end: number, level: number) { return 50 + end * 10 + level * 5; }
export function calcMaxMp(int: number, level: number) { return 30 + int * 5 + level * 2; }

export function xpForLevel(lvl: number) { return Math.floor(80 * Math.pow(lvl, 2.1)); }

export function checkLevelUp(u: ResolvedUser) {
  const msgs = [];
  while (u.level < MAX_LEVEL && u.xp >= xpForLevel(u.level)) {
    u.xp -= xpForLevel(u.level);
    u.level++;
    u.statPoints = (u.statPoints || 0) + 3;
    msgs.push(`⭐ Level up! Now level ${u.level}! (+3 stat points)`);
  }
  if (u.level >= MAX_LEVEL) {
    u.xp = 0; // cap XP at max level
  }
  return msgs;
}

// ─── Enchanting ──────────────────────────────────────────────

function getEnchantCost(level: number) { return Math.floor(50 * Math.pow(1.8, level)); }
function getEnchantSuccessRate(level: number) { return Math.max(20, 95 - level * 8); } // +0->+1: 95%, +9->+10: 23%

// Get enchant level for an item (by item ID)
function getItemEnchantLevel(u: ResolvedUser, itemId: string) {
  return u.itemInstances?.[itemId]?.enchantLevel || 0;
}

// Get enchant level for an equipped slot
function getSlotEnchantLevel(u: ResolvedUser, slot: string) {
  const itemId = u.equipment?.[slot];
  return itemId ? getItemEnchantLevel(u, itemId) : 0;
}

// Apply enchant bonuses to combat stats
function getEnchantBonuses(u: ResolvedUser) {
  let str = 0, agi = 0, end = 0, int = 0, armor = 0, minDmg = 0, maxDmg = 0;
  for (const slot of ['weapon','armor','helmet','boots','ring']) {
    const lvl = getSlotEnchantLevel(u, slot);
    if (lvl === 0) continue;
    if (slot === 'weapon') { minDmg += lvl * 2; maxDmg += lvl * 3; str += lvl; }
    else if (slot === 'armor') { armor += lvl * 2; end += lvl; }
    else if (slot === 'helmet') { armor += lvl; int += lvl; }
    else if (slot === 'boots') { armor += lvl; agi += lvl; }
    else if (slot === 'ring') { str += lvl; agi += lvl; int += lvl; end += lvl; }
  }
  return { str, agi, end, int, armor, minDmg, maxDmg };
}

function enchantItem(username: string, slot: string) {
  const u = users[username];
  if (!u) return { error: 'Not logged in.' };
  const eq = u.equipment || {};
  const itemId = eq[slot];
  if (!itemId) return { error: 'Nothing equipped in that slot.' };
  const item = resolveItem(u, itemId);
  if (!item) return { error: 'Unknown item.' };

  const currentLevel = u.itemInstances?.[itemId]?.enchantLevel || 0;
  if (currentLevel >= 10) return { error: 'Already max enchant (+10)!' };

  const cost = getEnchantCost(currentLevel);
  if ((u.gold || 0) < cost) return { error: `Need ${cost}🪙! (Have ${u.gold||0}🪙)` };

  u.gold -= cost;
  const rate = getEnchantSuccessRate(currentLevel);
  let success = rng(1, 100) <= rate;

  // Enchant Shield buff: prevents failure
  if (!success && u.buffs?.enchant?.fights > 0) {
    success = true;
    u.buffs.enchant.fights--;
    if (u.buffs.enchant.fights <= 0) delete u.buffs.enchant;
  }

  if (success) {
    if (u.itemInstances?.[itemId]) u.itemInstances[itemId].enchantLevel = currentLevel + 1;
    db.saveUser(username, users[username]);
    return { success: true, newLevel: currentLevel + 1, cost, rate, slot,
      text: `✨ Enchant success! ${item.name} is now +${currentLevel + 1}!` };
  } else {
    db.saveUser(username, users[username]);
    return { success: false, newLevel: currentLevel, cost, rate, slot,
      text: `💔 Enchant failed! ${item.name} stays at +${currentLevel}. ${cost}🪙 lost.` };
  }
}

// ─── Player Stat Computation ─────────────────────────────────

function getPlayerCombatStats(u: ResolvedUser) {
  let str = u.baseStr || 5, agi = u.baseAgi || 5, end = u.baseEnd || 5, int = u.baseInt || 5;
  let armor = 0, minDmg = 1, maxDmg = 3;
  const eq = u.equipment || {};
  for (const slot of ['weapon', 'armor', 'helmet', 'boots', 'ring']) {
    const itemId = eq[slot];
    const item = itemId ? resolveItem(u, itemId) : null;
    if (itemId && item) {
      const durMult = getDurabilityMultiplier(getItemDurability(u, itemId));
      if (item.stats?.str) str += Math.floor(item.stats.str * durMult);
      if (item.stats?.agi) agi += Math.floor(item.stats.agi * durMult);
      if (item.stats?.end) end += Math.floor(item.stats.end * durMult);
      if (item.stats?.int) int += Math.floor(item.stats.int * durMult);
      if (item.armor) armor += Math.floor(item.armor * durMult);
      if (item.minDmg) { minDmg = Math.floor(item.minDmg * durMult); maxDmg = Math.floor(item.maxDmg! * durMult); }
    }
  }
  // Apply enchant bonuses
  const eb = getEnchantBonuses(u);
  str += eb.str; agi += eb.agi; end += eb.end; int += eb.int;
  armor += eb.armor; minDmg += eb.minDmg; maxDmg += eb.maxDmg;
  // Apply skill tree + mastery stat bonuses
  const ste = getSkillTreeEffects(u);
  const me = getMasteryEffects(u);
  const combined: Record<string, any> = { ...ste };
  for (const [k, v] of Object.entries(me)) combined[k] = (combined[k] || 0) + v;
  if (combined.str) str += combined.str;
  if (combined.agi) agi += combined.agi;
  if (combined.end) end += combined.end;
  if (combined.int) int += combined.int;
  if (combined.armor) armor += Math.floor(combined.armor);
  if (combined.allStats) { str += combined.allStats; agi += combined.allStats; end += combined.allStats; int += combined.allStats; }
  // Apply soul sickness penalty
  const ssMult = getSoulSicknessMultiplier(u);
  if (ssMult < 1) {
    str = Math.floor(str * ssMult); agi = Math.floor(agi * ssMult);
    end = Math.floor(end * ssMult); int = Math.floor(int * ssMult);
    minDmg = Math.floor(minDmg * ssMult); maxDmg = Math.floor(maxDmg * ssMult);
    armor = Math.floor(armor * ssMult);
  }
  return { str, agi, end, int, armor, minDmg, maxDmg };
}

// ─── HP / MP Helpers ─────────────────────────────────────────

function getCurrentHp(u: ResolvedUser) {
  const cs = getPlayerCombatStats(u);
  const mhp = calcMaxHp(cs.end, u.level || 1);
  const cls = CLASSES[u.class];
  const maxWithPassive = cls?.passive?.effect?.hpBonus ? Math.floor(mhp * (1 + (cls.passive.effect.hpBonus as number))) : mhp;
  if (u.currentHp === undefined || u.currentHp > maxWithPassive) u.currentHp = maxWithPassive;
  return u.currentHp;
}
function getCurrentMp(u: ResolvedUser) {
  const cs = getPlayerCombatStats(u);
  const mmp = calcMaxMp(cs.int, u.level || 1);
  const cls = CLASSES[u.class];
  const maxWithPassive = cls?.passive?.effect?.mpBonus ? Math.floor(mmp * (1 + (cls.passive.effect.mpBonus as number))) : mmp;
  if (u.currentMp === undefined || u.currentMp > maxWithPassive) u.currentMp = maxWithPassive;
  return u.currentMp;
}
function getMaxHpWithPassive(u: ResolvedUser) {
  const cs = getPlayerCombatStats(u);
  const mhp = calcMaxHp(cs.end, u.level || 1);
  const cls = CLASSES[u.class];
  return cls?.passive?.effect?.hpBonus ? Math.floor(mhp * (1 + (cls.passive.effect.hpBonus as number))) : mhp;
}
function getMaxMpWithPassive(u: ResolvedUser) {
  const cs = getPlayerCombatStats(u);
  const mmp = calcMaxMp(cs.int, u.level || 1);
  const cls = CLASSES[u.class];
  return cls?.passive?.effect?.mpBonus ? Math.floor(mmp * (1 + (cls.passive.effect.mpBonus as number))) : mmp;
}

// ─── Achievement Checker ─────────────────────────────────────

function checkAchievements(u: ResolvedUser, username: string) {
  if (!u.achievements) u.achievements = [];
  const newAch = [];
  for (const a of ACHIEVEMENTS) {
    if (u.achievements.includes(a.id)) continue;
    if (a.check(u)) {
      u.achievements.push(a.id);
      u.gold = (u.gold || 0) + a.reward;
      newAch.push({ ...a, check: undefined });
    }
  }
  return newAch;
}

// ─── Daily Bonus ─────────────────────────────────────────────

function checkDailyBonus(u: ResolvedUser, username: string) {
  const today = new Date().toISOString().slice(0, 10);
  if (u.lastDaily === today) return null;
  u.lastDaily = today;
  const streak = (u.dailyStreak || 0) + 1;
  u.dailyStreak = streak;
  const bonus = 10 + Math.min(streak, 7) * 5; // 15, 20, 25... up to 45
  u.gold = (u.gold || 0) + bonus;
  db.saveUser(username, u);
  return { gold: bonus, streak };
}

// ─── NPC Fight ───────────────────────────────────────────────

function fightNpc(username: string, npcId: string) {
  const u = users[username];
  if (!u) return { error: 'Not logged in.' };
  const npc = NPCS.find(n => n.id === npcId);
  if (!npc) return { error: 'Unknown opponent.' };
  if (npc.level > (u.level || 1) + 3) return { error: 'Too strong!' };
  if ((u.level || 1) >= MAX_LEVEL) return { error: `Max level (${MAX_LEVEL}) reached! Prestige to continue.` };
  if (playerInFight(username)) return { error: 'In a PvP fight.' };

  // Check if alive
  const maxHpP = getMaxHpWithPassive(u);
  if (getCurrentHp(u) <= 0) {
    u.currentHp = Math.floor(maxHpP * 0.5); // auto-revive at 50%
  }
  if (u.currentHp < Math.floor(maxHpP * 0.1)) return { error: 'Too injured! Rest or use a potion.' };

  const ps = getPlayerCombatStats(u);
  const cls = CLASSES[u.class] || CLASSES.warrior;
  // Apply stat buffs
  if (u.buffs) {
    if (u.buffs.str?.fights > 0) ps.str += u.buffs.str.val;
    if (u.buffs.agi?.fights > 0) ps.agi += u.buffs.agi.val;
    if (u.buffs.end?.fights > 0) ps.end += u.buffs.end.val;
    if (u.buffs.int?.fights > 0) ps.int += u.buffs.int.val;
  }
  let pHp = u.currentHp, pMaxHp = maxHpP;
  const playerStartHp = pHp;
  let pMp = getCurrentMp(u), pMaxMp = getMaxMpWithPassive(u);
  let nHp = calcMaxHp(npc.end, npc.level), nMaxHp = nHp;
  const nMinD = Math.floor(npc.str * 0.7), nMaxD = Math.floor(npc.str * 1.5) + npc.level;
  const nArm = Math.floor(npc.level * 1.5);

  const log = [{ type: 'system', text: `${username} vs ${npc.name}! (HP: ${pHp}/${pMaxHp}, MP: ${pMp}/${pMaxMp})` }];
  let round = 0;
  const skillCooldowns: Record<string, number> = {};
  let pDmgReduction = (cls.passive?.effect?.dmgReduction as number) || 0;
  const critBonus = (cls.passive?.effect?.critBonus as number) || 0;
  let activeBuffs: any[] = []; // { name, effect, roundsLeft }

  // Auto-buy potion: use player's preferred potion, or best available
  function autoBuyPotion(type: string) {
    if (!u.autoBuyPotions || isInventoryFull(u)) return false;
    // Check if player has a preferred potion set
    const prefId = type === 'hp' ? u.autoBuyHpPot : u.autoBuyMpPot;
    if (prefId && ITEMS[prefId]) {
      const pot = ITEMS[prefId];
      if ((u.gold || 0) >= pot.price && (u.level || 1) >= (pot.reqLevel || 1)) {
        u.gold -= pot.price;
        addToInventory(u, prefId);
        log.push({ type: 'system', text: `🛒 Auto-bought ${pot.icon} ${pot.name} (-${pot.price}🪙)` });
        return true;
      }
    }
    // Fallback: buy best affordable potion
    const potions = Object.entries(ITEMS)
      .filter(([, it]) => {
        if (!it.consumable || !it.price) return false;
        if (type === 'hp' && !it.healHp) return false;
        if (type === 'mp' && !it.healMp) return false;
        if (it.healHp && it.healMp) return false; // skip full restores
        if ((u.level || 1) < (it.reqLevel || 1)) return false;
        if ((u.gold || 0) < it.price) return false;
        return true;
      })
      .sort((a, b) => (type === 'hp' ? (b[1].healHp || 0) - (a[1].healHp || 0) : (b[1].healMp || 0) - (a[1].healMp || 0)));
    if (potions.length === 0) return false;
    const [potId, pot] = potions[0];
    u.gold -= pot.price;
    addToInventory(u, potId);
    log.push({ type: 'system', text: `🛒 Auto-bought ${pot.icon} ${pot.name} (-${pot.price}🪙)` });
    return true;
  }

  // Auto-use potions in combat
  function tryUsePotion() {
    if (!u.autoPotions) return;
    const hpThresh = (u.autoPotHpPct || 30) / 100;
    const mpThresh = (u.autoPotMpPct || 20) / 100;
    // HP potion at threshold
    if (pHp < pMaxHp * hpThresh) {
      let hpPotIdx = u.inventory.findIndex((id: any) => id && ITEMS[id]?.healHp);
      if (hpPotIdx === -1) autoBuyPotion('hp');
      hpPotIdx = u.inventory.findIndex((id: any) => id && ITEMS[id]?.healHp);
      if (hpPotIdx !== -1) {
        const pot = ITEMS[u.inventory[hpPotIdx]!];
        const healed = Math.min(pMaxHp - pHp, pot.healHp!);
        pHp = Math.min(pMaxHp, pHp + healed);
        u.inventory[hpPotIdx] = null;
        log.push({ type: 'system', text: `🧪 Used ${pot.icon} ${pot.name}! +${healed} HP` });
      }
    }
    // MP potion at threshold
    if (pMp < pMaxMp * mpThresh) {
      let mpPotIdx = u.inventory.findIndex((id: any) => id && ITEMS[id]?.healMp);
      if (mpPotIdx === -1) autoBuyPotion('mp');
      mpPotIdx = u.inventory.findIndex((id: any) => id && ITEMS[id]?.healMp);
      if (mpPotIdx !== -1) {
        const pot = ITEMS[u.inventory[mpPotIdx]!];
        const restored = Math.min(pMaxMp - pMp, pot.healMp!);
        pMp = Math.min(pMaxMp, pMp + restored);
        u.inventory[mpPotIdx] = null;
        log.push({ type: 'system', text: `💙 Used ${pot.icon} ${pot.name}! +${restored} MP` });
      }
    }
  }

  while (pHp > 0 && nHp > 0 && round < 30) {
    round++;
    log.push({ type: 'round', text: `── Round ${round} ──` });
    const pA = ZONES[rng(0,2)], pD = ZONES[rng(0,2)], nA = ZONES[rng(0,2)], nD = ZONES[rng(0,2)];

    // Try to use a skill
    let skillDmgMult = 1, skillIgnoreArmor = false, skillDodge = false, skillReflect = 0, skillLifesteal = 0, skillMagicDmg = 0;
    for (const skill of (cls.skills || [])) {
      if ((skillCooldowns[skill.id] || 0) > 0) { skillCooldowns[skill.id]--; continue; }
      if (pMp < skill.mpCost) continue;
      // Use skill
      pMp -= skill.mpCost;
      skillCooldowns[skill.id] = skill.cooldown;
      const eff = skill.effect;
      if (eff.dmgMult) skillDmgMult = Math.max(skillDmgMult, eff.dmgMult);
      if (eff.ignoreArmor) skillIgnoreArmor = true;
      if (eff.dodge) { skillDodge = true; activeBuffs.push({ name: skill.name, effect: 'dodge', roundsLeft: eff.rounds || 1 }); }
      if (eff.dmgReduction) { activeBuffs.push({ name: skill.name, effect: 'shield', val: eff.dmgReduction, roundsLeft: eff.rounds || 1 }); }
      if (eff.reflect) { skillReflect = eff.reflect; activeBuffs.push({ name: skill.name, effect: 'reflect', val: eff.reflect, roundsLeft: eff.rounds || 1 }); }
      if (eff.lifesteal) skillLifesteal = eff.lifesteal;
      if (eff.magicDmg) skillMagicDmg = Math.floor(ps.int * eff.magicDmg);
      if (eff.buff === 'str') { activeBuffs.push({ name: skill.name, effect: 'strBuff', val: eff.val, roundsLeft: eff.rounds || 1 }); }
      log.push({ type: 'system', text: `${skill.icon} ${skill.name}! (MP: ${pMp}/${pMaxMp})` });
      break; // one skill per round
    }

    // Calculate active buff bonuses
    let tempDmgReduction = pDmgReduction;
    let tempStrMult = 1;
    for (const b of activeBuffs) {
      if (b.effect === 'shield') tempDmgReduction = Math.min(0.8, tempDmgReduction + b.val);
      if (b.effect === 'strBuff') tempStrMult += b.val;
    }

    // Player attacks
    const effStr = Math.floor(ps.str * tempStrMult);
    if (skillMagicDmg > 0) {
      // Magic damage ignores armor
      nHp = Math.max(0, nHp - skillMagicDmg);
      log.push({ type: 'crit', text: `⚡ Arcane damage! -${skillMagicDmg}` });
      if (skillLifesteal > 0) {
        const heal = Math.floor(skillMagicDmg * skillLifesteal);
        pHp = Math.min(pMaxHp, pHp + heal);
        log.push({ type: 'system', text: `💜 Drained ${heal} HP` });
      }
    } else if (rng(1,100) <= calcHitChance(ps.agi, npc.agi, pA === nD)) {
      const c = rng(1,100) <= Math.min(5 + ps.int * 2 + critBonus, 75);
      const arm = skillIgnoreArmor ? 0 : nArm;
      let d = calcDamage(effStr, ps.minDmg, ps.maxDmg, c, arm);
      d = Math.floor(d * skillDmgMult);
      nHp = Math.max(0, nHp - d);
      log.push({ type: c ? 'crit' : 'hit', text: `${c?'⚡':'💥'} You ${c?'CRIT strike ':'hit '}${ZONE_NAMES[pA]} for ${d}${skillDmgMult > 1 ? ' (skill!)' : ''}` });
      if (pA === nD) log.push({ type: 'block', text: `🛡️ ${npc.name} partially blocked!` });
      if (skillLifesteal > 0) {
        const heal = Math.floor(d * skillLifesteal);
        pHp = Math.min(pMaxHp, pHp + heal);
        log.push({ type: 'system', text: `💜 Drained ${heal} HP` });
      }
    } else log.push({ type: 'miss', text: `💨 You miss ${ZONE_NAMES[pA]}!` });
    if (nHp <= 0) break;

    // NPC attacks
    const dodging = activeBuffs.some(b => b.effect === 'dodge');
    if (dodging) {
      log.push({ type: 'system', text: `👤 Dodged ${npc.name}'s attack!` });
    } else if (rng(1,100) <= calcHitChance(npc.agi, ps.agi, nA === pD)) {
      const c = rng(1,100) <= Math.min(5 + npc.int * 2, 75);
      let d = calcDamage(npc.str, nMinD, nMaxD, c, ps.armor);
      d = Math.max(1, Math.floor(d * (1 - tempDmgReduction)));
      pHp = Math.max(0, pHp - d);
      log.push({ type: c ? 'crit' : 'hit', text: `${c?'⚡':'💥'} ${npc.name} ${c?'CRIT strikes ':'hits '}${ZONE_NAMES[nA]} for ${d}${tempDmgReduction > pDmgReduction ? ' (shielded)' : ''}` });
      if (nA === pD) log.push({ type: 'block', text: `🛡️ You blocked!` });
      // Reflect damage
      const reflecting = activeBuffs.find(b => b.effect === 'reflect');
      if (reflecting) {
        const ref = Math.floor(d * reflecting.val);
        nHp = Math.max(0, nHp - ref);
        log.push({ type: 'system', text: `🔄 Reflected ${ref} damage!` });
      }
    } else log.push({ type: 'miss', text: `💨 ${npc.name} misses` });

    // Tick down active buffs
    activeBuffs = activeBuffs.filter(b => { b.roundsLeft--; return b.roundsLeft > 0; });
    // MP regen (small amount per round)
    pMp = Math.min(pMaxMp, pMp + Math.floor(pMaxMp * 0.05));
    // Auto-use potions if enabled
    if (pHp > 0) tryUsePotion();
  }

  // Save HP/MP
  u.currentHp = Math.max(0, pHp);
  u.currentMp = Math.min(pMaxMp, pMp);

  const won = nHp <= 0;
  let droppedItem = null;
  let xpG = 0;

  if (won) {
    // Apply buffs
    if (!u.buffs) u.buffs = {};
    const xpMult = u.buffs.xp?.fights > 0 ? u.buffs.xp.val : 1;
    const goldMult = u.buffs.gold?.fights > 0 ? u.buffs.gold.val : 1;
    const dropBonus = u.buffs.drop?.fights > 0 ? u.buffs.drop.val : 0;

    // Guild bonus
    const playerGuild = getPlayerGuild(username);
    const guildBonus = playerGuild ? getGuildBonus(guilds[playerGuild.id]) : { xpPct: 0, goldPct: 0 };
    xpG = Math.floor((npc.xp + rng(0, Math.floor(npc.xp * 0.2))) * xpMult * (1 + guildBonus.xpPct));
    let goldG = Math.floor((npc.gold + rng(0, Math.floor(npc.gold * 0.3))) * goldMult * (1 + guildBonus.goldPct));
    // Track guild kills + guild XP
    if (playerGuild && guilds[playerGuild.id]) {
      guilds[playerGuild.id].totalKills++;
      addGuildXp(playerGuild.id, 1);
    }
    u.xp = (u.xp || 0) + xpG;
    u.gold = (u.gold || 0) + goldG;
    u.kills = (u.kills || 0) + 1;
    addSeasonPoints(u, 1 + Math.floor(npc.level / 10)); // season points scale with enemy level
    let buffText = '';
    if (xpMult > 1) buffText += ` (${xpMult}× XP!)`;
    if (goldMult > 1) buffText += ` (${goldMult}× Gold!)`;
    log.push({ type: 'system', text: `🏆 Victory! +${xpG} XP, +${goldG}🪙${buffText}` });
    for (const m of checkLevelUp(u)) {
      log.push({ type: 'system', text: m });
      gameLog('SYSTEM', `${username} reached level ${u.level}`, username);
    }

    // Tick down buffs
    for (const [k, b] of Object.entries(u.buffs) as [string, any][]) {
      if (b.fights > 0) { b.fights--; if (b.fights <= 0) { log.push({ type: 'system', text: `⏰ ${b.source || k} buff expired.` }); delete u.buffs[k]; } }
    }

    // Loot drop (with drop buff)
    const dropPenaltyMult = (u.dropPenalty || 0) > 0 ? 0.5 : 1;
    const effectiveDropChance = Math.floor(((npc.dropChance || 10) + dropBonus) * dropPenaltyMult);
    if (npc.loot && npc.loot.length > 0 && rng(1, 100) <= effectiveDropChance) {
      const lootId = npc.loot[rng(0, npc.loot.length - 1)];
      const lootItem = ITEMS[lootId];
      if (lootItem) {
        if (!isInventoryFull(u)) {
          const dropRef = createItemInstance(u, lootId);
          addToInventory(u, dropRef);
          droppedItem = { id: dropRef, ...lootItem };
          log.push({ type: 'system', text: `🎁 Loot drop: ${lootItem.icon} ${lootItem.name}!` });
          if (['rare', 'epic', 'legendary'].includes(lootItem.rarity!)) {
            u.rareDrops = (u.rareDrops || 0) + 1;
          }
        } else if (isInventoryFull(u)) {
          log.push({ type: 'system', text: `🎒 Inventory full! ${lootItem.icon} ${lootItem.name} lost!` });
        }
      }
    }
  } else {
    // Full death penalty system
    log.push({ type: 'system', text: `💀 Defeated by ${npc.name}!` });
    applyDeathPenalties(u, npc.name, log);
  }

  // Wins reduce soul sickness
  if (won && (u.soulSickness || 0) > 0) {
    u.soulSickness--;
    log.push({ type: 'system', text: `✨ Soul Sickness -1 (${u.soulSickness}/10)` });
  }

  // Tick down drop penalty
  if ((u.dropPenalty || 0) > 0) u.dropPenalty--;

  // Check achievements
  const newAch = checkAchievements(u, username);
  for (const a of newAch) log.push({ type: 'system', text: `🏅 Achievement: ${a.name}! +${a.reward}🪙` });

  // Combat history (last 40 — 20 NPC + 20 PvP)
  if (!u.combatHistory) u.combatHistory = [];
  const npcEntry = {
    type: 'npc', ts: Date.now(), won, enemy: npc.name, enemyIcon: npc.icon, enemyLv: npc.level,
    rounds: round, drop: droppedItem?.name || null,
  };
  u.combatHistory = [npcEntry, ...(u.combatHistory || []).slice(0, 39)];

  db.saveUser(username, u);
  gameLog('COMBAT', `${username} vs ${npc.name} (Lv.${npc.level}) — ${won ? 'WIN' : 'DEFEAT'} +${xpG || 0}xp`, username);
  return { won, log, npc: { name: npc.name, icon: npc.icon, level: npc.level },
    playerHp: u.currentHp, playerStartHp, playerMaxHp: pMaxHp, playerMp: u.currentMp, playerMaxMp: pMaxMp,
    npcHp: Math.max(0, nHp), npcMaxHp: nMaxHp,
    rounds: round, droppedItem, newAchievements: newAch, skillsUsed: Object.keys(skillCooldowns).length };
}

// ─── Dungeon Runner ───────────────────────────────────────────

function runDungeon(username: string, dungeonId: string) {
  const u = users[username];
  if (!u) return { error: 'Not logged in.' };
  const dg = DUNGEONS.find(d => d.id === dungeonId);
  if (!dg) return { error: 'Unknown dungeon.' };
  if ((u.level || 1) < dg.reqLevel) return { error: `Need level ${dg.reqLevel}!` };
  if (playerInFight(username)) return { error: 'In a PvP fight.' };
  if ((u.gold || 0) < (dg.fee || 0)) return { error: `Need ${dg.fee}🪙 entry fee!` };
  // Daily dungeon limit: 10 per day
  const today = new Date().toISOString().slice(0, 10);
  if (u.lastDungeonDate !== today) { u.lastDungeonDate = today; u.dailyDungeonRuns = 0; }
  if ((u.dailyDungeonRuns || 0) >= 10) {
    const midnight = new Date(); midnight.setHours(24,0,0,0);
    const hoursLeft = Math.ceil((midnight.getTime() - Date.now()) / 3600000);
    return { error: `Daily dungeon limit reached (10/10)! Resets in ~${hoursLeft}h.` };
  }
  u.dailyDungeonRuns = (u.dailyDungeonRuns || 0) + 1;
  u.gold -= (dg.fee || 0);

  const ps = getPlayerCombatStats(u);
  let pHp = calcMaxHp(ps.end, u.level);
  const pMaxHp = pHp;
  const log = [{ type: 'system', text: `⚔️ Entering ${dg.name}...` }];
  // Show dungeon modifiers
  if (dg.modifiers?.length > 0) {
    for (const mod of dg.modifiers) log.push({ type: 'system', text: `⚠️ ${mod.desc}` });
  }
  if (dg.boss) log.push({ type: 'system', text: `👑 Boss: ${dg.boss.icon} ${dg.boss.name} awaits on final stage!` });

  let totalXp = 0, totalGold = 0;
  const drops = [];
  let stagesCleared = 0;

  const eligibleNpcs = NPCS.filter(n => n.level >= dg.npcRange[0] && n.level <= dg.npcRange[1]);
  if (eligibleNpcs.length === 0) return { error: 'No enemies available.' };

  // Pre-calculate modifier effects
  const enemyDmgMult = 1 + (dg.modifiers?.filter(m => m.type === 'enemyDmgBonus').reduce((s,m) => s + (m.val || 0), 0) || 0);
  const enemyArmorBonus = dg.modifiers?.filter(m => m.type === 'enemyArmorBonus').reduce((s,m) => s + (m.val || 0), 0) || 0;
  const dotDamage = dg.modifiers?.filter(m => m.type === 'dotDamage').reduce((s,m) => s + (m.val || 0), 0) || 0;
  const mpDrain = dg.modifiers?.filter(m => m.type === 'mpDrain').reduce((s,m) => s + (m.val || 0), 0) || 0;
  const noHeal = dg.modifiers?.some(m => m.type === 'noHealBetweenStages') || false;
  const enemyCritBonus = dg.modifiers?.filter(m => m.type === 'enemyCritBonus').reduce((s,m) => s + (m.val || 0), 0) || 0;

  for (let stage = 1; stage <= dg.stages; stage++) {
    const isBoss = stage === dg.stages && dg.boss;
    const npc = eligibleNpcs[rng(0, eligibleNpcs.length - 1)];

    // Boss gets multiplied stats
    const bMult = isBoss ? (dg.boss.statMult || 2) : 1;
    const enemyName = isBoss ? `${dg.boss.icon} ${dg.boss.name}` : `${npc.icon} ${npc.name}`;
    const eStr = Math.floor(npc.str * bMult);
    const eAgi = Math.floor(npc.agi * bMult);
    const eEnd = Math.floor(npc.end * bMult);
    const eInt = Math.floor(npc.int * bMult);
    let nHp = calcMaxHp(eEnd, Math.floor(npc.level * bMult));
    const nMaxHp = nHp;
    const nMinD = Math.floor(eStr * 0.7), nMaxD = Math.floor(eStr * 1.5) + npc.level;
    const nArm = Math.floor(npc.level * 1.5) + enemyArmorBonus;

    log.push({ type: 'round', text: `── ${isBoss ? '👑 BOSS ' : ''}Stage ${stage}/${dg.stages}: ${enemyName} (Lv.${Math.floor(npc.level * bMult)}) ──` });

    let round = 0;
    while (pHp > 0 && nHp > 0 && round < 25) {
      round++;
      const pA = ZONES[rng(0,2)], pD = ZONES[rng(0,2)], nA = ZONES[rng(0,2)], nD = ZONES[rng(0,2)];

      // Player attacks
      if (rng(1,100) <= calcHitChance(ps.agi, eAgi, pA === nD)) {
        const c = rng(1,100) <= Math.min(5 + ps.int * 2, 75);
        const d = calcDamage(ps.str, ps.minDmg, ps.maxDmg, c, nArm);
        nHp = Math.max(0, nHp - d);
        log.push({ type: c?'crit':'hit', text: `${c?'⚡':'💥'} You ${c?'CRIT strike ':'hit '}${ZONE_NAMES[pA]} for ${d}` });
      } else log.push({ type: 'miss', text: `💨 You miss!` });
      if (nHp <= 0) break;

      // Enemy attacks (with modifiers)
      const eCritChance = Math.min(5 + eInt * 2 + enemyCritBonus, 75);
      if (rng(1,100) <= calcHitChance(eAgi, ps.agi, nA === pD)) {
        const c = rng(1,100) <= eCritChance;
        let d = calcDamage(eStr, nMinD, nMaxD, c, ps.armor);
        d = Math.floor(d * enemyDmgMult);
        pHp = Math.max(0, pHp - d);
        log.push({ type: c?'crit':'hit', text: `${c?'⚡':'💥'} ${enemyName} ${c?'CRIT strikes ':'hits '}${ZONE_NAMES[nA]} for ${d}` });
      } else log.push({ type: 'miss', text: `💨 ${enemyName} misses!` });

      // DOT damage
      if (dotDamage > 0) {
        pHp = Math.max(0, pHp - dotDamage);
        log.push({ type: 'hit', text: `🔥 Burn damage: -${dotDamage}` });
      }
    }

    if (nHp <= 0) {
      stagesCleared++;
      let xpG = Math.floor(npc.xp * dg.xpMult * bMult);
      let goldG = Math.floor(npc.gold * dg.goldMult * bMult);
      if (isBoss) { xpG += dg.boss.xpBonus; goldG += dg.boss.goldBonus; }
      totalXp += xpG; totalGold += goldG;
      log.push({ type: 'system', text: `✅ ${isBoss ? '👑 BOSS DEFEATED! ' : ''}Stage ${stage} clear! +${xpG}XP +${goldG}🪙` });
      // Loot with dungeon bonus
      if (npc.loot?.length > 0 && rng(1,100) <= (npc.dropChance || 10) + dg.dropBonus) {
        const lootId = npc.loot[rng(0, npc.loot.length - 1)];
        const lootItem = ITEMS[lootId];
        if (lootItem) {
          if (!isInventoryFull(u)) {
            const dropRef = createItemInstance(u, lootId);
            addToInventory(u, dropRef);
            drops.push({ id: dropRef, ...lootItem });
            log.push({ type: 'system', text: `🎁 Drop: ${lootItem.icon} ${lootItem.name}!` });
            if (['rare','epic','legendary'].includes(lootItem.rarity!)) u.rareDrops = (u.rareDrops||0)+1;
          } else if (isInventoryFull(u)) {
            log.push({ type: 'system', text: `🎒 Full! ${lootItem.icon} ${lootItem.name} lost!` });
          }
        }
      }
      // Heal between stages (unless modifier prevents it)
      if (!noHeal) {
        const healAmt = Math.floor(pMaxHp * 0.2);
        pHp = Math.min(pMaxHp, pHp + healAmt);
        if (stage < dg.stages) log.push({ type: 'system', text: `💚 Healed ${healAmt} HP between stages` });
      }
    } else {
      log.push({ type: 'system', text: `💀 Defeated at stage ${stage}!` });
      break;
    }
  }

  const cleared = stagesCleared === dg.stages;
  if (cleared) {
    const bonus = Math.floor(totalGold * 0.5);
    totalGold += bonus;
    log.push({ type: 'system', text: `🏆 DUNGEON CLEARED! Bonus: +${bonus}🪙` });
    u.dungeonsCleared = (u.dungeonsCleared || 0) + 1;
    // Guild XP for dungeon clear
    const dungeonGuild = getPlayerGuild(username);
    if (dungeonGuild && guilds[dungeonGuild.id]) {
      addGuildXp(dungeonGuild.id, 10);
    }
  }

  u.xp = (u.xp||0) + totalXp;
  u.gold = (u.gold||0) + totalGold;
  u.kills = (u.kills||0) + stagesCleared;
  if (cleared) addSeasonPoints(u, 5 * dg.stages); // bonus season points for dungeon clear
  for (const m of checkLevelUp(u)) {
    log.push({ type: 'system', text: m });
    gameLog('SYSTEM', `${username} reached level ${u.level}`, username);
  }
  const newAch = checkAchievements(u, username);
  for (const a of newAch) log.push({ type: 'system', text: `🏅 ${a.name}! +${a.reward}🪙` });
  checkQuests(u);
  db.saveUser(username, u);
  gameLog('COMBAT', `${username} ran ${dg.name} — ${cleared ? 'CLEARED' : 'FAILED'}`, username);

  return { cleared, stagesCleared, totalStages: dg.stages, log, drops, totalXp, totalGold,
    playerHp: Math.max(0, pHp), playerMaxHp: pMaxHp, dungeon: { name: dg.name, icon: dg.icon } };
}

// ─── PvP ─────────────────────────────────────────────────────

function createFight(p1name: string, p2name: string) {
  const s1 = getPlayerCombatStats(users[p1name]), s2 = getPlayerCombatStats(users[p2name]);
  const fightId = `fight_${nextId++}`;
  const p1 = { name: p1name, level: users[p1name].level || 1, class: users[p1name].class || 'warrior', ...s1 };
  const p2 = { name: p2name, level: users[p2name].level || 1, class: users[p2name].class || 'warrior', ...s2 };
  fights.set(fightId, {
    p1, p2,
    p1hp: calcMaxHp(s1.end, p1.level), p2hp: calcMaxHp(s2.end, p2.level),
    p1maxHp: calcMaxHp(s1.end, p1.level), p2maxHp: calcMaxHp(s2.end, p2.level),
    p1choice: null, p2choice: null, round: 0,
    log: [{ type: 'system', text: `⚔️ ${p1name} vs ${p2name}!` }],
    finished: false, winner: null,
  });
  return fightId;
}

function resolveRound(fight: any) {
  fight.round++;
  const log = [{ type: 'round', text: `── Round ${fight.round} ──` }];
  const sides = [
    { a: fight.p1, d: fight.p2, az: fight.p1choice.attack, ed: fight.p2choice.defend, hk: 'p2hp' },
    { a: fight.p2, d: fight.p1, az: fight.p2choice.attack, ed: fight.p1choice.defend, hk: 'p1hp' },
  ];
  for (const { a, d, az, ed, hk } of sides) {
    if (fight.finished) break;
    const bl = az === ed;
    if (rng(1,100) <= calcHitChance(a.agi, d.agi, bl)) {
      const c = rng(1,100) <= Math.min(5 + a.int * 2, 75);
      const dm = calcDamage(a.str, a.minDmg, a.maxDmg, c, d.armor);
      fight[hk] = Math.max(0, fight[hk] - dm);
      log.push({ type: c?'crit':'hit', text: `${c?'⚡':'💥'} ${a.name} ${c?'CRIT strikes ':'hits '}${ZONE_NAMES[az]} for ${dm}` });
      if (bl) log.push({ type: 'block', text: `🛡️ ${d.name} blocked!` });
    } else log.push({ type: 'miss', text: `💨 ${a.name} misses!` });
    if (fight.p1hp <= 0 || fight.p2hp <= 0) {
      fight.finished = true;
      const w = fight.p1hp > 0 ? fight.p1 : fight.p2, l = fight.p1hp > 0 ? fight.p2 : fight.p1;
      fight.winner = w.name;
      const xp = 30 + l.level * 15, g = 20 + l.level * 8;
      log.push({ type: 'system', text: `🏆 ${w.name} wins! +${xp}XP +${g}🪙` });
      // ELO rating change
      const wu = users[w.name], lu = users[l.name];
      if (wu && lu) {
        const wRating = wu.pvpRating || 1000, lRating = lu.pvpRating || 1000;
        const expected = 1 / (1 + Math.pow(10, (lRating - wRating) / 400));
        const K = 32;
        const ratingGain = Math.round(K * (1 - expected));
        const ratingLoss = Math.round(K * expected);
        wu.pvpRating = (wu.pvpRating || 1000) + ratingGain;
        lu.pvpRating = Math.max(0, (lu.pvpRating || 1000) - ratingLoss);
        lu.pvpLosses = (lu.pvpLosses || 0) + 1;
        // Gold penalty for loser
        const goldLoss = Math.floor((lu.gold || 0) * 0.05);
        lu.gold = Math.max(0, (lu.gold || 0) - goldLoss);
        log.push({ type: 'system', text: `📊 Rating: ${w.name} +${ratingGain} (${wu.pvpRating}) | ${l.name} -${ratingLoss} (${lu.pvpRating})` });
        if (goldLoss > 0) log.push({ type: 'system', text: `${l.name} lost ${goldLoss}🪙` });
        wu.kills = (wu.kills||0)+1; wu.pvpWins = (wu.pvpWins||0)+1;
        addSeasonPoints(wu, 10); // PvP season points
        wu.xp = (wu.xp||0)+xp; wu.gold = (wu.gold||0)+g;
        for (const m of checkLevelUp(wu)) {
          log.push({ type: 'system', text: m });
          gameLog('SYSTEM', `${w.name} reached level ${wu.level}`, w.name);
        }
        // PvP-exclusive item drop (20% chance)
        const pvpItems = Object.entries(ITEMS).filter(([, i]) => i.pvpOnly && (wu.level || 1) >= (i.reqLevel || 1));
        if (pvpItems.length > 0 && rng(1, 100) <= 20 && !isInventoryFull(wu)) {
          const [dropId, dropItem] = pvpItems[rng(0, pvpItems.length - 1)];
          const dropRef = createItemInstance(wu, dropId);
          addToInventory(wu, dropRef);
          log.push({ type: 'system', text: `🏆 PvP Drop: ${dropItem.icon} ${dropItem.name}!` });
        }
        const ach = checkAchievements(wu, w.name);
        for (const a of ach) log.push({ type: 'system', text: `🏅 ${w.name}: ${a.name}! +${a.reward}🪙` });
        // PvP combat history
        const pvpEntry = { type: 'pvp', ts: Date.now(), won: true, enemy: l.name, enemyIcon: '⚔️', enemyLv: l.level, rounds: fight.round, drop: null, opponent: l.name };
        wu.combatHistory = [pvpEntry, ...(wu.combatHistory || []).slice(0, 39)];
        const pvpEntryL = { type: 'pvp', ts: Date.now(), won: false, enemy: w.name, enemyIcon: '⚔️', enemyLv: w.level, rounds: fight.round, drop: null, opponent: w.name };
        lu.combatHistory = [pvpEntryL, ...(lu.combatHistory || []).slice(0, 39)];
        db.saveMultipleUsers([[w.name, wu], [l.name, lu]]);
      }
    }
  }
  fight.log = fight.log.concat(log);
  fight.p1choice = fight.p2choice = null;
}

function getFightState(fightId: string, forPlayer: string) {
  const f = fights.get(fightId);
  if (!f) return null;
  const is1 = f.p1.name === forPlayer;
  return { fightId, you: is1?f.p1:f.p2, enemy: is1?f.p2:f.p1,
    yourHp: is1?f.p1hp:f.p2hp, yourMaxHp: is1?f.p1maxHp:f.p2maxHp,
    enemyHp: is1?f.p2hp:f.p1hp, enemyMaxHp: is1?f.p2maxHp:f.p1maxHp,
    round: f.round, log: f.log, finished: f.finished, winner: f.winner,
    iWon: f.finished ? f.winner === forPlayer : false,
    yourName: (is1?f.p1:f.p2).name, enemyName: (is1?f.p2:f.p1).name,
    yourChoice: is1?f.p1choice:f.p2choice, enemyReady: is1?!!f.p2choice:!!f.p1choice };
}

// ─── Default User ────────────────────────────────────────────

function createDefaultUser(password: string, classId: string | null) {
  const cls = classId ? (CLASSES[classId] || CLASSES.warrior) : { bonusStr: 0, bonusAgi: 0, bonusEnd: 0, bonusInt: 0 };
  return { password, class: classId || 'warrior', level: 1, xp: 0, gold: 50, kills: 0, pvpWins: 0, pvpLosses: 0, pvpRating: 1000, rareDrops: 0,
    baseStr: 5 + cls.bonusStr, baseAgi: 5 + cls.bonusAgi, baseEnd: 5 + cls.bonusEnd, baseInt: 5 + cls.bonusInt,
    statPoints: 3,
    currentHp: undefined, currentMp: undefined, // set on first access
    equipment: { weapon: null, armor: null, helmet: null, boots: null, ring: null, backpack: null },
    inventory: [], achievements: [], completedQuests: [], lastDaily: null, dailyStreak: 0,
    dungeonsCleared: 0, totalEnchants: 0 };
}

function migrateUser(u: ResolvedUser) {
  if (!u.equipment) u.equipment = { weapon: null, armor: null, helmet: null, boots: null, ring: null, backpack: null };
  if (!u.equipment.ring) u.equipment.ring = null;
  if (u.equipment.backpack === undefined) u.equipment.backpack = null;
  if (!u.inventory) u.inventory = [];
  migrateInventory(u);
  if (!u.achievements) u.achievements = [];
  if (!u.completedQuests) u.completedQuests = [];
  if (u.pvpWins === undefined) u.pvpWins = 0;
  if (u.rareDrops === undefined) u.rareDrops = 0;
  if (u.dailyStreak === undefined) u.dailyStreak = 0;
  if (u.dungeonsCleared === undefined) u.dungeonsCleared = 0;
  if (u.totalEnchants === undefined) u.totalEnchants = 0;
  if (u.pvpRating === undefined) u.pvpRating = 1000;
  if (!u.durability) u.durability = {};
  if (u.soulSickness === undefined) u.soulSickness = 0;
  if (u.dropPenalty === undefined) u.dropPenalty = 0;
  if (!u.combatHistory) u.combatHistory = [];
  if (u.pvpLosses === undefined) u.pvpLosses = 0;
  if (!u.skillTreeUnlocks) u.skillTreeUnlocks = [];
  if (!u.avatar) u.avatar = { skinTone: 0, hairStyle: 0, hairColor: 0, accessory: 0 };
}

// ─── Leaderboard ─────────────────────────────────────────────

function getLeaderboard() {
  return db.getDbLeaderboard();
}

// ─── WebSocket Helpers ───────────────────────────────────────

function send(ws: WebSocket | undefined, msg: any) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); }
function broadcast(msg: any, exclude?: WebSocket) {
  for (const [, { ws }] of online) { if (ws !== exclude) send(ws, msg); }
  if (msg.type === 'chat') logChat(msg.user || 'System', msg.text || '', msg.msgType || 'system');
}

function broadcastOnlineList() {
  const list = [];
  for (const [name] of online) {
    const u = users[name] || {};
    list.push({ name, level: u.level || 1, class: u.class || 'warrior', prestige: u.prestige || 0, title: u.activeTitle || null, pvpRating: u.pvpRating || 1000, inFight: playerInFight(name) });
  }
  broadcast({ type: 'online', players: list });
}

function playerInFight(name: string) {
  for (const [, f] of fights) { if (!f.finished && (f.p1.name === name || f.p2.name === name)) return true; }
  return false;
}
function getFightForPlayer(name: string) {
  for (const [id, f] of fights) { if (!f.finished && (f.p1.name === name || f.p2.name === name)) return { id, fight: f }; }
  return null;
}

function sanitizePlayer(u: ResolvedUser, name?: string) {
  const p: any = { ...u };
  delete p.password;
  p.currentHp = getCurrentHp(u);
  p.currentMp = getCurrentMp(u);
  p.maxHp = getMaxHpWithPassive(u);
  p.maxMp = getMaxMpWithPassive(u);
  p.maxInventorySlots = getMaxInventorySlots(u);
  migrateInventory(u);
  p.inventory = [...u.inventory];
  p.durability = { ...(u.durability || {}) };
  p.enchantLevels = { ...(u.enchantLevels || {}) };
  p.itemInstances = { ...(u.itemInstances || {}) };
  // Resolve username if not provided
  if (!name) {
    for (const [n, usr] of Object.entries(users)) { if (usr === u) { name = n; break; } }
  }
  if (name) {
    p.name = name;
    p.isAdmin = isAdmin(name);
  }
  return p;
}

// ─── WebSocket Server ────────────────────────────────────────

const wss = new WebSocketServer({ port: PORT, maxPayload: 16 * 1024 });
console.log(`Fight Club v2 listening on port ${PORT}`);

// Rate limits per message type (ms)
const RATE_LIMITS: Record<string, number> = {
  fight_npc: 150, run_dungeon: 1000, buy_item: 100, chat: 500,
  enchant: 300, salvage: 100, craft: 300, challenge: 2000,
  private_msg: 500, trade_send: 1000, rest: 1000,
};

wss.on('connection', (ws, req) => {
  let username: string | null = null;
  const lastAction = new Map<string, number>();
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const clientUA = (req.headers['user-agent'] || 'unknown').slice(0, 200);

  ws.on('message', (raw) => {
    let msg: any;
    try { msg = JSON.parse(String(raw)); } catch { return; }

    // Rate limiting
    const limit = RATE_LIMITS[msg.type];
    if (limit) {
      const now = Date.now();
      const last = lastAction.get(msg.type) || 0;
      if (now - last < limit) {
        gameLog('RAW', `DROPPED ${msg.type} (rate limited)`, username || undefined);
        return;
      }
      lastAction.set(msg.type, now);
    }

    // Log all raw requests (skip noisy ones)
    if (!['get_skill_tree', 'get_quests', 'admin_live_logs', 'admin_server_stats', 'admin_list_players'].includes(msg.type)) {
      gameLog('RAW', `${msg.type}${msg.target ? ' → ' + msg.target : ''}${msg.npcId ? ' npc:' + msg.npcId : ''}`, username || undefined);
    }

    switch (msg.type) {
      case 'register': {
        const name = String(msg.name||'').trim().slice(0,20), pass = String(msg.password||'');
        if (!name || !pass || name.length < 2) { send(ws, { type: 'auth_error', text: 'Invalid name/password.' }); break; }
        if (!/^[a-zA-Z0-9_]{2,20}$/.test(name)) { send(ws, { type: 'auth_error', text: 'Name: 2-20 letters, numbers, or underscore only.' }); break; }
        if (users[name]) { send(ws, { type: 'auth_error', text: 'Name taken.' }); break; }
        // Create account without class — needs character creation
        const hashedPass = bcrypt.hashSync(pass, 10);
        users[name] = resolveUser(createDefaultUser(hashedPass, null));
        users[name].needsClass = true;
        db.createUser(name, users[name]);
        username = name;
        online.set(name, { ws, player: users[name] });
        gameLog('AUTH', `${name} registered`, name);
        // Send game data first so client can show class options with skills
        send(ws, { type: 'game_data', items: ITEMS, npcs: NPCS, achievements: ACHIEVEMENTS.map(a => ({ ...a, check: undefined })), rarity: RARITY, classes: CLASSES, dungeons: DUNGEONS, questTemplates: QUEST_TEMPLATES, titles: TITLES.map(t => ({ id: t.id, name: t.name, icon: t.icon })), skillTrees: SKILL_TREES });
        send(ws, { type: 'needs_character_creation', name });
        break;
      }
      case 'create_character': {
        if (!username) break;
        const u = users[username];
        if (!u || !u.needsClass) { send(ws, { type: 'error', text: 'Character already created.' }); break; }
        const classId = CLASSES[msg.class] ? msg.class : 'warrior';
        const cls = CLASSES[classId];
        u.class = classId;
        u.baseStr = 5 + cls.bonusStr;
        u.baseAgi = 5 + cls.bonusAgi;
        u.baseEnd = 5 + cls.bonusEnd;
        u.baseInt = 5 + cls.bonusInt;
        (u as any).currentHp = undefined;
        (u as any).currentMp = undefined;
        // Save appearance
        u.avatar = {
          skinTone: msg.skinTone ?? 0,
          hairStyle: msg.hairStyle ?? 0,
          hairColor: msg.hairColor ?? 0,
          accessory: msg.accessory ?? 0,
        };
        u.needsClass = false;
        db.saveUser(username, u);
        send(ws, { type: 'auth_ok', name: username, player: sanitizePlayer(u) });
        broadcast({ type: 'chat', user: 'System', text: `⚔️ ${username} the ${cls.name} enters the Fight Club!`, msgType: 'system' });
        broadcastOnlineList();
        break;
      }
      case 'login': {
        const name = String(msg.name||'').trim(), pass = String(msg.password||'');
        if (!users[name]) { send(ws, { type: 'auth_error', text: 'Not found.' }); break; }
        // Verify password — support both bcrypt hashed and legacy plaintext
        const storedPass = users[name].password;
        const isHashed = storedPass.startsWith('$2');
        const passValid = isHashed ? bcrypt.compareSync(pass, storedPass) : (storedPass === pass);
        if (!passValid) { send(ws, { type: 'auth_error', text: 'Wrong password.' }); break; }
        if ((users[name] as any).banned) { send(ws, { type: 'auth_error', text: 'Your account has been banned.' }); break; }
        // Auto-migrate plaintext to hashed
        if (!isHashed) { users[name].password = bcrypt.hashSync(pass, 10); db.saveUser(name, users[name]); }
        if (online.has(name)) { send(ws, { type: 'auth_error', text: 'Already online.' }); break; }
        migrateUser(users[name]);
        username = name;
        online.set(name, { ws, player: users[name] });
        gameLog('AUTH', `${name} logged in [IP:${clientIp}] [${clientUA.slice(0, 60)}]`, name);
        // Update last online time
        users[name].lastOnline = Date.now();
        // Check if character creation was never completed
        if (users[name].needsClass) {
          send(ws, { type: 'game_data', items: ITEMS, npcs: NPCS, achievements: ACHIEVEMENTS.map(a => ({ ...a, check: undefined })), rarity: RARITY, classes: CLASSES, dungeons: DUNGEONS, questTemplates: QUEST_TEMPLATES, titles: TITLES.map(t => ({ id: t.id, name: t.name, icon: t.icon })), skillTrees: SKILL_TREES });
          send(ws, { type: 'needs_character_creation', name });
          break;
        }
        send(ws, { type: 'auth_ok', name, player: sanitizePlayer(users[name], name) });
        send(ws, { type: 'game_data', items: ITEMS, npcs: NPCS, achievements: ACHIEVEMENTS.map(a => ({ ...a, check: undefined })), rarity: RARITY, classes: CLASSES, dungeons: DUNGEONS, questTemplates: QUEST_TEMPLATES, titles: TITLES.map(t => ({ id: t.id, name: t.name, icon: t.icon })), skillTrees: SKILL_TREES });
        // Unread messages count
        const unreadCount = db.getUnreadCount(name);
        if (unreadCount > 0) send(ws, { type: 'inbox_count', count: unreadCount });
        // Daily bonus
        const daily = checkDailyBonus(users[name], name);
        if (daily) send(ws, { type: 'daily_bonus', ...daily, player: sanitizePlayer(users[name], name) });
        broadcast({ type: 'chat', user: 'System', text: `${name} entered the arena.`, msgType: 'system' });
        broadcastOnlineList();
        break;
      }
      case 'chat': {
        if (!username) break;
        const text = String(msg.text||'').trim().slice(0,200);
        if (!text) break;
        const u = users[username];
        const activeTitle = u?.activeTitle;
        const titleData = activeTitle ? TITLES.find(t => t.id === activeTitle) : null;
        const chatName = titleData ? `${titleData.icon} ${username}` : username;
        // Send with per-user profanity filtering + block filtering
        logChat(chatName, text, 'user');
        for (const [name, { ws: rws }] of online) {
          const ru = users[name];
          if ((ru?.blocked || []).includes(username)) continue;
          const filteredText = (ru?.profanityFilter !== false) ? filterProfanity(text) : text;
          send(rws, { type: 'chat', user: chatName, text: filteredText, msgType: 'user' });
        }
        break;
      }
      case 'flee_npc': {
        if (!username) break;
        const u = users[username];
        // Flee penalty: lose 10% of gold (min 5), 60s rest cooldown
        const goldLoss = Math.max(5, Math.floor((u.gold || 0) * 0.10));
        u.gold = Math.max(0, (u.gold || 0) - goldLoss);
        u.lastRestTime = Date.now(); // trigger rest cooldown
        db.saveUser(username, u);
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        send(ws, { type: 'notification', text: `🏃 Fled the arena! Lost ${humanize(goldLoss)}🪙 and rest is on cooldown.` });
        break;
      }
      case 'fight_npc': {
        if (!username) break;
        // Auto-rest before fight if requested and HP is low
        if (msg.autoRest) {
          const u = users[username];
          const mhp = getMaxHpWithPassive(u);
          const mmp = getMaxMpWithPassive(u);
          if ((u.currentHp || 0) < Math.floor(mhp * 0.3)) {
            // Try using potions first (no cooldown)
            let healed = false;
            if (u.autoPotions) {
              const hpPotIdx = u.inventory.findIndex((id: any) => id && ITEMS[id]?.healHp);
              if (hpPotIdx !== -1) {
                const pot = ITEMS[u.inventory[hpPotIdx]!];
                u.currentHp = Math.min(mhp, (u.currentHp || 0) + pot.healHp!);
                u.inventory[hpPotIdx] = null;
                send(ws, { type: 'notification', text: `🧪 Auto-potion: ${pot.name} (+${pot.healHp} HP)` });
                healed = true;
              }
            }
            // If no potion or still low, try rest (with cooldown)
            if ((u.currentHp || 0) < Math.floor(mhp * 0.3)) {
              const now = Date.now();
              const restCooldown = u.lastRestTime && (now - u.lastRestTime < 60000);
              if (!restCooldown) {
                const cost = Math.max(5, Math.floor((u.level || 1) * 3));
                if ((u.gold || 0) >= cost) {
                  u.gold -= cost;
                  u.lastRestTime = now;
                  // 50% heal, same as manual rest
                  u.currentHp = Math.min(mhp, (u.currentHp || 0) + Math.floor(mhp * 0.5));
                  u.currentMp = Math.min(mmp, (u.currentMp || 0) + Math.floor(mmp * 0.5));
                  db.saveUser(username, u);
                  send(ws, { type: 'notification', text: `🏥 Auto-rest: +50% HP/MP (-${cost}🪙). 60s cooldown.` });
                } else {
                  send(ws, { type: 'notification', text: `⚠️ Can't afford rest (${cost}🪙). Buy potions!` });
                }
              }
              // On cooldown — just notify
            }
          }
        }
        const r = fightNpc(username, msg.npcId);
        if (r.error) { send(ws, { type: 'error', text: r.error }); break; }
        const questsDone = checkQuests(users[username]);
        for (const q of questsDone) {
          r.log!.push({ type: 'system', text: `📜 Quest complete: ${q.name}! +${humanize(q.xpReward)}XP +${humanize(q.goldReward)}🪙` });
          broadcast({ type: 'chat', user: 'System', text: `📜 ${username} completed "${q.name}"!`, msgType: 'system' });
        }
        if (questsDone.length) db.saveUser(username, users[username]);
        send(ws, { type: 'npc_fight_result', ...r, player: sanitizePlayer(users[username]) });
        break;
      }
      // ─── Dungeons ────────────────────────────────────
      case 'run_dungeon': {
        if (!username) break;
        const r = runDungeon(username, msg.dungeonId);
        if (r.error) { send(ws, { type: 'error', text: r.error }); break; }
        send(ws, { type: 'dungeon_result', ...r, player: sanitizePlayer(users[username]) });
        broadcastOnlineList();
        break;
      }
      // ─── Rest / Heal ───────────────────────────────
      case 'rest': {
        if (!username) break;
        // Block rest during PvP fight
        if (playerInFight(username)) { send(ws, { type: 'error', text: 'Cannot rest during a fight!' }); break; }
        const u = users[username];
        // 60-second cooldown
        const now = Date.now();
        if (u.lastRestTime && now - u.lastRestTime < 60000) {
          const remaining = Math.ceil((60000 - (now - u.lastRestTime)) / 1000);
          send(ws, { type: 'error', text: `Rest on cooldown! ${remaining}s remaining.` });
          break;
        }
        const cost = Math.max(5, Math.floor((u.level || 1) * 3));
        if ((u.gold || 0) < cost) { send(ws, { type: 'error', text: `Need ${cost}🪙 to rest!` }); break; }
        u.gold -= cost;
        u.lastRestTime = now;
        // Rest heals 50% HP/MP — use potions for full heal
        const maxH = getMaxHpWithPassive(u);
        const maxM = getMaxMpWithPassive(u);
        u.currentHp = Math.min(maxH, (u.currentHp || 0) + Math.floor(maxH * 0.5));
        u.currentMp = Math.min(maxM, (u.currentMp || 0) + Math.floor(maxM * 0.5));
        db.saveUser(username, u);
        gameLog('ECONOMY', `${username} rested (-${cost}g)`, username);
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        send(ws, { type: 'notification', text: `Rested! +50% HP/MP. (-${cost}🪙) Cooldown: 60s. Use potions for full heal.` });
        break;
      }
      // ─── Repair ─────────────────────────────────────
      case 'repair': {
        if (!username) break;
        const u = users[username];
        const cost = getRepairCost(u);
        if (cost === 0) { send(ws, { type: 'notification', text: 'Nothing to repair!' }); break; }
        if ((u.gold || 0) < cost) { send(ws, { type: 'error', text: `Need ${cost}🪙 to repair!` }); break; }
        u.gold -= cost;
        // Repair all equipped items to 100
        const eq = u.equipment || {};
        for (const slot of ['weapon', 'armor', 'helmet', 'boots', 'ring']) {
          if (eq[slot]) { if (u.itemInstances?.[eq[slot]!]) u.itemInstances[eq[slot]!].durability = 100; }
        }
        db.saveUser(username, u);
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        send(ws, { type: 'notification', text: `🔧 All gear repaired! (-${cost}🪙)` });
        gameLog('ECONOMY', `repaired gear (-${cost}g)`, username);
        break;
      }
      // ─── Crafting ────────────────────────────────────
      case 'salvage': {
        if (!username) break;
        const u = users[username];
        const item = resolveItem(u, msg.itemId);
        if (!item) break;
        // Remove from inventory or equipment
        const idx = u.inventory.indexOf(msg.itemId);
        if (idx !== -1) {
          u.inventory[idx] = null;
        } else {
          // Check equipped items
          let foundSlot: string | null = null;
          for (const [slot, ref] of Object.entries(u.equipment || {})) {
            if (ref === msg.itemId) { foundSlot = slot; break; }
          }
          if (!foundSlot) break;
          u.equipment[foundSlot] = null;
        }
        destroyItemInstance(u, msg.itemId);
        const fragMap: Record<string, number> = { common: 1, uncommon: 3, rare: 8, epic: 20, legendary: 50 };
        const frags = fragMap[item.rarity!] || 1;
        u.fragments = (u.fragments || 0) + frags;
        db.saveUser(username, u);
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        send(ws, { type: 'notification', text: `🔨 Salvaged ${item.icon} ${item.name} → +${frags} fragments (total: ${u.fragments})` });
        gameLog('ECONOMY', `salvaged ${item.name} (+${frags} frags)`, username);
        break;
      }
      case 'salvage_batch': {
        if (!username || !Array.isArray(msg.itemIds)) break;
        const u = users[username];
        let totalFrags = 0;
        let count = 0;
        const fragMap: Record<string, number> = { common: 1, uncommon: 3, rare: 8, epic: 20, legendary: 50 };
        for (const itemId of msg.itemIds.slice(0, 50)) { // cap at 50
          const item = resolveItem(u, itemId);
          if (!item) continue;
          const idx = u.inventory.indexOf(itemId);
          if (idx !== -1) {
            u.inventory[idx] = null;
          } else {
            let foundSlot: string | null = null;
            for (const [slot, ref] of Object.entries(u.equipment || {})) {
              if (ref === itemId) { foundSlot = slot; break; }
            }
            if (!foundSlot) continue;
            u.equipment[foundSlot] = null;
          }
          destroyItemInstance(u, itemId);
          const frags = fragMap[item.rarity!] || 1;
          totalFrags += frags;
          count++;
        }
        u.fragments = (u.fragments || 0) + totalFrags;
        db.saveUser(username, u);
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        send(ws, { type: 'notification', text: `🔨 Salvaged ${count} items → +${totalFrags} fragments` });
        gameLog('ECONOMY', `salvaged ${count} items (+${totalFrags} frags)`, username);
        break;
      }
      case 'craft': {
        if (!username) break;
        const u = users[username];
        const targetRarity = msg.rarity || 'common';
        const targetSlot = msg.slot || null; // null = random, 'weapon'/'armor'/etc = targeted
        const costMap: Record<string, number> = { common: 3, uncommon: 10, rare: 25, epic: 60, legendary: 150 };
        const baseCost = costMap[targetRarity];
        if (!baseCost) { send(ws, { type: 'error', text: 'Invalid rarity.' }); break; }
        const craftCost = targetSlot ? Math.ceil(baseCost * 1.5) : baseCost; // +50% for targeted
        if ((u.fragments || 0) < craftCost) { send(ws, { type: 'error', text: `Need ${craftCost} fragments! (Have ${u.fragments || 0})` }); break; }
        if (isInventoryFull(u)) { send(ws, { type: 'error', text: 'Inventory full!' }); break; }
        const craftable = Object.entries(ITEMS).filter(([id, i]) =>
          i.rarity === targetRarity && !i.consumable && !i.pvpOnly && !i.dropOnly && i.slot &&
          (i.reqLevel || 1) <= (u.level || 1) &&
          (!targetSlot || i.slot === targetSlot)
        );
        if (craftable.length === 0) { send(ws, { type: 'error', text: `No ${targetSlot || ''} items at ${targetRarity} rarity for your level.` }); break; }
        u.fragments -= craftCost;
        const [craftedId, craftedItem] = craftable[rng(0, craftable.length - 1)];
        const craftedRef = createItemInstance(u, craftedId);
        addToInventory(u, craftedRef);
        db.saveUser(username, u);
        gameLog('ECONOMY', `${username} crafted ${targetRarity} item`, username);
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        send(ws, { type: 'notification', text: `⚒️ Crafted: ${craftedItem.icon} ${craftedItem.name}!` });
        break;
      }
      // ─── Enchanting ──────────────────────────────────
      case 'enchant': {
        if (!username) break;
        const r = enchantItem(username, msg.slot);
        if (r.error) { send(ws, { type: 'error', text: r.error }); break; }
        users[username].totalEnchants = (users[username].totalEnchants || 0) + 1;
        const questsDone = checkQuests(users[username]);
        for (const q of questsDone) send(ws, { type: 'notification', text: `📜 ${q.name}! +${q.xpReward}XP +${q.goldReward}🪙` });
        db.saveUser(username, users[username]);
        gameLog('ECONOMY', `${username} enchanted ${msg.slot}`, username);
        send(ws, { type: 'enchant_result', ...r });
        send(ws, { type: 'player_update', player: sanitizePlayer(users[username]) });
        break;
      }
      // ─── Quests ──────────────────────────────────────
      case 'get_season': {
        if (!username) break;
        const u = users[username];
        const pts = getSeasonPoints(u);
        send(ws, { type: 'season_info', season: getCurrentSeason(), points: pts, rewards: SEASON_REWARDS,
          lastSeason: u.lastSeasonId || null, lastPoints: u.lastSeasonPoints || 0 });
        break;
      }
      case 'get_battle_log': {
        if (!username) break;
        send(ws, { type: 'battle_log', history: users[username].combatHistory || [] });
        break;
      }
      case 'get_quests': {
        if (!username) break;
        const u = users[username];
        const quests = QUEST_TEMPLATES.map(q => ({
          ...q, progress: getQuestProgress(u, q), completed: (u.completedQuests||[]).includes(q.id),
        }));
        send(ws, { type: 'quests', quests });
        break;
      }
      // ─── Titles ──────────────────────────────────────
      case 'get_titles': {
        if (!username) break;
        const titles = getUnlockedTitles(users[username]);
        send(ws, { type: 'titles', titles, activeTitle: users[username].activeTitle || null });
        break;
      }
      case 'set_title': {
        if (!username) break;
        const u = users[username];
        const titles = getUnlockedTitles(u);
        if (msg.titleId && !titles.find(t => t.id === msg.titleId)) break;
        u.activeTitle = msg.titleId || null;
        db.saveUser(username, u);
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        send(ws, { type: 'notification', text: msg.titleId ? `Title set: ${titles.find(t=>t.id===msg.titleId)?.name}` : 'Title cleared.' });
        broadcastOnlineList();
        gameLog('SKILL', `set title: ${msg.titleId}`, username);
        break;
      }
      // ─── Skill Tree ────────────────────────────────
      case 'get_skill_tree': {
        if (!username) break;
        const u = users[username];
        const tree = SKILL_TREES[u.class];
        const sp = getSkillPoints(u);
        const masteries = MASTERIES[u.class] || [];
        send(ws, { type: 'skill_tree', tree, unlocks: u.skillTreeUnlocks || [], ...sp, masteries, masteryLevels: u.masteryLevels || {} });
        break;
      }
      case 'unlock_skill': {
        if (!username) break;
        const u = users[username];
        const tree = SKILL_TREES[u.class];
        if (!tree) break;
        const skillId = msg.skillId;
        if (!u.skillTreeUnlocks) u.skillTreeUnlocks = [];
        if (u.skillTreeUnlocks.includes(skillId)) { send(ws, { type: 'error', text: 'Already unlocked.' }); break; }
        // Find the skill and validate
        let skill = null, branchId = null, tierIdx = -1;
        for (const b of tree.branches) {
          const idx = b.tiers.findIndex(t => t.id === skillId);
          if (idx !== -1) { skill = b.tiers[idx]; branchId = b.id; tierIdx = idx; break; }
        }
        if (!skill) break;
        // Check prerequisites: must have all previous tiers in this branch
        const branch = tree.branches.find((b: any) => b.id === branchId);
        if (!branch) break;
        for (let i = 0; i < tierIdx; i++) {
          if (!u.skillTreeUnlocks.includes(branch.tiers[i].id)) {
            send(ws, { type: 'error', text: `Unlock ${branch.tiers[i].name} first!` }); break;
          }
        }
        if (!u.skillTreeUnlocks.includes(branch.tiers[Math.max(0, tierIdx - 1)]?.id) && tierIdx > 0) break;
        // Check points
        const sp = getSkillPoints(u);
        if (sp.available < skill.cost) { send(ws, { type: 'error', text: `Need ${skill.cost} skill points! (Have ${sp.available})` }); break; }
        u.skillTreeUnlocks.push(skillId);
        db.saveUser(username, u);
        const sp2 = getSkillPoints(u);
        const masteries2 = MASTERIES[u.class] || [];
        send(ws, { type: 'skill_tree', tree, unlocks: u.skillTreeUnlocks, ...sp2, masteries: masteries2, masteryLevels: u.masteryLevels || {} });
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        gameLog('SYSTEM', `${username} unlocked ${skill.name}`, username);
        send(ws, { type: 'notification', text: `🌟 Unlocked: ${skill.name}!` });
        break;
      }
      case 'reset_skill_tree': {
        if (!username) break;
        const u = users[username];
        const sp = getSkillPoints(u);
        if (sp.spent === 0) { send(ws, { type: 'error', text: 'Nothing to reset!' }); break; }
        // Cost: 500 gold per level (scales with player level)
        const cost = Math.floor((u.level || 1) * 500);
        if ((u.gold || 0) < cost) { send(ws, { type: 'error', text: `Need ${humanize(cost)}🪙 to reset skills! (Have ${humanize(u.gold || 0)})` }); break; }
        u.gold -= cost;
        u.skillTreeUnlocks = [];
        u.masteryLevels = {};
        db.saveUser(username, u);
        const tree = SKILL_TREES[u.class];
        const sp2 = getSkillPoints(u);
        const masteries = MASTERIES[u.class] || [];
        send(ws, { type: 'skill_tree', tree, unlocks: [], ...sp2, masteries, masteryLevels: {} });
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        gameLog('SYSTEM', `${username} reset skill tree`, username);
        send(ws, { type: 'notification', text: `🔄 Skills reset! Spent ${humanize(cost)}🪙. ${sp2.available} points available.` });
        break;
      }
      case 'upgrade_mastery': {
        if (!username) break;
        const u = users[username];
        const masteries = MASTERIES[u.class];
        if (!masteries) break;
        const mastery = masteries.find(m => m.id === msg.masteryId);
        if (!mastery) break;
        if (!u.masteryLevels) u.masteryLevels = {};
        const currentLvl = u.masteryLevels[mastery.id] || 0;
        const cost = getMasteryCost(currentLvl);
        const sp = getSkillPoints(u);
        if (sp.available < cost) { send(ws, { type: 'error', text: `Need ${cost} skill points! (Have ${sp.available})` }); break; }
        u.masteryLevels[mastery.id] = currentLvl + 1;
        db.saveUser(username, u);
        const sp2 = getSkillPoints(u);
        const tree = SKILL_TREES[u.class];
        send(ws, { type: 'skill_tree', tree, unlocks: u.skillTreeUnlocks || [], ...sp2, masteries, masteryLevels: u.masteryLevels });
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        send(ws, { type: 'notification', text: `⬆️ ${mastery.name} → Level ${currentLvl + 1}!` });
        gameLog('SKILL', `mastery ${mastery.name} → Lv.${currentLvl + 1}`, username);
        break;
      }
      // ─── Avatar Customization ────────────────────────
      case 'toggle_auto_potions': {
        if (!username) break;
        const u = users[username];
        u.autoPotions = !u.autoPotions;
        db.saveUser(username, u);
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        send(ws, { type: 'notification', text: `Auto-potions: ${u.autoPotions ? 'ON 🧪' : 'OFF'}` });
        break;
      }
      case 'toggle_profanity_filter': {
        if (!username) break;
        const u = users[username];
        u.profanityFilter = u.profanityFilter === false ? true : false;
        db.saveUser(username, u);
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        send(ws, { type: 'notification', text: `Profanity filter: ${u.profanityFilter !== false ? 'ON' : 'OFF'}` });
        break;
      }
      case 'toggle_online_status': {
        if (!username) break;
        const u = users[username];
        u.showOnlineStatus = u.showOnlineStatus === false ? true : false;
        db.saveUser(username, u);
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        send(ws, { type: 'notification', text: `Show online status: ${u.showOnlineStatus !== false ? 'ON' : 'OFF'}` });
        break;
      }
      case 'toggle_auto_buy_potions': {
        if (!username) break;
        const u = users[username];
        u.autoBuyPotions = !u.autoBuyPotions;
        db.saveUser(username, u);
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        send(ws, { type: 'notification', text: `Auto-buy potions: ${u.autoBuyPotions ? 'ON 🛒' : 'OFF'}` });
        break;
      }
      case 'set_auto_buy_potion': {
        if (!username) break;
        const u = users[username];
        // Validate potion IDs
        if (msg.hpPot && (!ITEMS[msg.hpPot] || !ITEMS[msg.hpPot].healHp)) msg.hpPot = '';
        if (msg.mpPot && (!ITEMS[msg.mpPot] || !ITEMS[msg.mpPot].healMp)) msg.mpPot = '';
        u.autoBuyHpPot = msg.hpPot || '';
        u.autoBuyMpPot = msg.mpPot || '';
        db.saveUser(username, u);
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        const hpName = msg.hpPot ? ITEMS[msg.hpPot].name : 'Best available';
        const mpName = msg.mpPot ? ITEMS[msg.mpPot].name : 'Best available';
        send(ws, { type: 'notification', text: `Auto-buy: HP → ${hpName}, MP → ${mpName}` });
        break;
      }
      case 'set_auto_pot_threshold': {
        if (!username) break;
        const u = users[username];
        const hp = Math.max(10, Math.min(90, parseInt(msg.hpPct) || 30));
        const mp = Math.max(10, Math.min(90, parseInt(msg.mpPct) || 20));
        u.autoPotHpPct = hp;
        u.autoPotMpPct = mp;
        db.saveUser(username, u);
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        send(ws, { type: 'notification', text: `Auto-pot thresholds: HP <${hp}%, MP <${mp}%` });
        break;
      }
      case 'set_avatar': {
        if (!username) break;
        const u = users[username];
        // Store appearance options
        u.avatar = {
          skinTone: msg.skinTone || 0,
          hairStyle: msg.hairStyle || 0,
          hairColor: msg.hairColor || 0,
          accessory: msg.accessory || 0,
        };
        db.saveUser(username, u);
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        send(ws, { type: 'notification', text: 'Avatar updated!' });
        broadcastOnlineList();
        break;
      }
      case 'buy_item': {
        if (!username) break;
        const u = users[username], item = ITEMS[msg.itemId];
        if (!item) { send(ws, { type: 'error', text: 'Unknown item.' }); break; }
        if (item.dropOnly) { send(ws, { type: 'error', text: `${item.name} can't be bought — it only drops from enemies!` }); break; }
        if (item.pvpOnly) { send(ws, { type: 'error', text: `${item.name} can't be bought — it only drops from PvP wins!` }); break; }
        if ((u.level||1) < (item.reqLevel || 1)) { send(ws, { type: 'error', text: `Need level ${item.reqLevel}!` }); break; }
        const qty = item.consumable ? Math.max(1, Math.min(50, parseInt(msg.qty) || 1)) : 1;
        const totalCost = item.price * qty;
        if (u.gold < totalCost) { send(ws, { type: 'error', text: `Need ${humanize(totalCost)}🪙! (Have ${humanize(u.gold)})` }); break; }
        // Buy multiple — stop if inventory full
        let bought = 0;
        for (let i = 0; i < qty; i++) {
          if (isInventoryFull(u)) break;
          u.gold -= item.price;
          if (!item.consumable) {
            const ref = createItemInstance(u, msg.itemId);
            addToInventory(u, ref);
          } else {
            addToInventory(u, msg.itemId);
          }
          bought++;
        }
        if (bought === 0) { send(ws, { type: 'error', text: 'Inventory full!' }); break; }
        const ach = checkAchievements(u, username);
        for (const a of ach) send(ws, { type: 'notification', text: `🏅 ${a.name}! +${a.reward}🪙` });
        db.saveUser(username, u);
        gameLog('ECONOMY', `${username} bought ${item.name}${bought > 1 ? ' x'+bought : ''} (-${item.price * bought}g)`, username);
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        send(ws, { type: 'notification', text: bought > 1 ? `Bought ${bought}× ${item.name}! (-${humanize(item.price * bought)}🪙)` : `Bought ${item.name}!` });
        if (bought < qty) send(ws, { type: 'notification', text: `⚠️ Inventory full after ${bought}/${qty} — couldn't buy all.` });
        break;
      }
      case 'equip_item': {
        if (!username) break;
        const u = users[username], idx = u.inventory.indexOf(msg.itemId);
        if (idx === -1) break;
        const item = resolveItem(u, msg.itemId);
        if (!item?.slot) break;
        if (item.classReq && item.classReq !== u.class) { send(ws, { type: 'error', text: `This item requires ${CLASSES[item.classReq]?.name || item.classReq} class!` }); break; }
        if (!u.equipment) u.equipment = { weapon:null, armor:null, helmet:null, boots:null, ring:null, backpack:null };
        // Swap: put old equipped item into the inventory slot the new item came from
        const oldEquipped = u.equipment[item.slot];
        u.inventory[idx] = oldEquipped; // null if nothing was equipped, item ID if swapping
        u.equipment[item.slot] = msg.itemId;
        const ach = checkAchievements(u, username);
        for (const a of ach) send(ws, { type: 'notification', text: `🏅 ${a.name}! +${a.reward}🪙` });
        db.saveUser(username, u);
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        send(ws, { type: 'notification', text: `Equipped ${item.name}!` });
        gameLog('ITEM', `equipped ${item.name}`, username);
        break;
      }
      case 'unequip_item': {
        if (!username) break;
        const u = users[username];
        if (!u.equipment?.[msg.slot]) break;
        // Backpack safety: check if removing backpack would exceed base capacity
        if (msg.slot === 'backpack') {
          const backpack = u.equipment.backpack ? resolveItem(u, u.equipment.backpack) : undefined;
          const extraSlots = backpack?.extraSlots || 0;
          const baseSlots = BASE_INVENTORY_SLOTS;
          // Count items currently in inventory (including the backpack that'll go into a slot)
          const itemCount = u.inventory.filter(Boolean).length + 1; // +1 for the backpack itself
          if (itemCount > baseSlots) {
            const overflow = itemCount - baseSlots;
            send(ws, { type: 'error', text: `Cannot unequip! You have ${overflow} item${overflow > 1 ? 's' : ''} over the base ${baseSlots}-slot limit. Sell or discard items first.` });
            break;
          }
        }
        if (!addToInventory(u, u.equipment[msg.slot]!)) { send(ws, { type: 'error', text: 'Inventory full!' }); break; }
        u.equipment[msg.slot] = null;
        db.saveUser(username, u);
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        gameLog('ITEM', `unequipped ${msg.slot}`, username);
        break;
      }
      case 'swap_inventory': {
        if (!username) break;
        const u = users[username];
        const from = parseInt(msg.from), to = parseInt(msg.to);
        if (isNaN(from) || isNaN(to) || from < 0 || to < 0 || from >= u.inventory.length || to >= u.inventory.length) break;
        const tmp = u.inventory[from];
        u.inventory[from] = u.inventory[to];
        u.inventory[to] = tmp;
        db.saveUser(username, u);
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        break;
      }
      case 'sort_inventory': {
        if (!username) break;
        const u = users[username];
        const sortMode = msg.mode || 'type';
        const slotOrder: Record<string, number> = { weapon: 0, armor: 1, helmet: 2, boots: 3, ring: 4, backpack: 5 };
        const rarityOrder: Record<string, number> = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
        // Extract non-null items with their resolved info
        const items = u.inventory.filter(Boolean).map((id: any) => {
          const item = resolveItem(u, id);
          return { id, item };
        });
        // Sort based on mode
        items.sort((a: any, b: any) => {
          if (!a.item && !b.item) return 0;
          if (!a.item) return 1;
          if (!b.item) return -1;
          if (sortMode === 'rarity') return (rarityOrder[a.item.rarity] ?? 5) - (rarityOrder[b.item.rarity] ?? 5);
          if (sortMode === 'name') return (a.item.name || '').localeCompare(b.item.name || '');
          // Default: type
          const aSlot = a.item.consumable ? 7 : (slotOrder[a.item.slot] ?? 6);
          const bSlot = b.item.consumable ? 7 : (slotOrder[b.item.slot] ?? 6);
          if (aSlot !== bSlot) return aSlot - bSlot;
          return (rarityOrder[a.item.rarity] ?? 5) - (rarityOrder[b.item.rarity] ?? 5);
        });
        // Rebuild inventory: sorted items then nulls
        const maxSlots = getMaxInventorySlots(u);
        u.inventory = items.map((i: any) => i.id);
        while (u.inventory.length < maxSlots) u.inventory.push(null);
        db.saveUser(username, u);
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        gameLog('ITEM', `sorted inventory (${sortMode})`, username);
        break;
      }
      case 'use_item': {
        if (!username) break;
        const u = users[username], idx = u.inventory.indexOf(msg.itemId);
        if (idx === -1) break;
        const item = ITEMS[msg.itemId];
        if (!item?.consumable) break;
        u.inventory[idx] = null;
        if (!u.buffs) u.buffs = {};
        let text = '';
        if (item.healHp || item.healMp) {
          if (item.healHp) {
            const maxH = getMaxHpWithPassive(u);
            const before = getCurrentHp(u);
            u.currentHp = Math.min(maxH, before + item.healHp);
            text += `❤️ +${u.currentHp - before} HP `;
          }
          if (item.healMp) {
            const maxM = getMaxMpWithPassive(u);
            const before = getCurrentMp(u);
            u.currentMp = Math.min(maxM, before + item.healMp);
            text += `💙 +${u.currentMp - before} MP `;
          }
        } else if (item.buff === 'statPts') {
          // Instant: gain stat points
          u.statPoints = (u.statPoints || 0) + item.buffVal!;
          text = `📕 +${item.buffVal} stat point!`;
        } else if (item.buff) {
          // Timed buff (fight-based)
          u.buffs[item.buff] = { val: item.buffVal!, fights: item.buffFights!, source: item.name };
          text = `${item.icon} ${item.desc || item.name} activated!`;
        } else {
          u.gold = (u.gold||0) + Math.floor(item.price * 0.8);
          text = `Converted to ${Math.floor(item.price*0.8)}🪙`;
        }
        db.saveUser(username, u);
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        send(ws, { type: 'notification', text });
        gameLog('ITEM', `used ${item.name}`, username);
        break;
      }
      case 'use_all_item': {
        if (!username) break;
        const u = users[username];
        const itemId = msg.itemId;
        const item = ITEMS[itemId];
        if (!item?.consumable) break;
        // Count how many of this item in inventory
        let count = 0;
        for (let i = 0; i < u.inventory.length; i++) {
          if (u.inventory[i] === itemId) count++;
        }
        if (count === 0) break;
        if (!u.buffs) u.buffs = {};
        let totalHealHp = 0, totalHealMp = 0, used = 0;
        for (let i = 0; i < u.inventory.length && used < count; i++) {
          if (u.inventory[i] !== itemId) continue;
          u.inventory[i] = null;
          used++;
          if (item.healHp) {
            const maxH = getMaxHpWithPassive(u);
            const before = getCurrentHp(u);
            u.currentHp = Math.min(maxH, before + item.healHp);
            totalHealHp += u.currentHp - before;
            if (u.currentHp >= maxH && item.healHp < 999) break; // stop if full
          }
          if (item.healMp) {
            const maxM = getMaxMpWithPassive(u);
            const before = getCurrentMp(u);
            u.currentMp = Math.min(maxM, before + item.healMp);
            totalHealMp += u.currentMp - before;
            if (u.currentMp >= maxM && item.healMp < 999 && !item.healHp) break;
          }
          if (item.buff === 'statPts') {
            u.statPoints = (u.statPoints || 0) + item.buffVal!;
          } else if (item.buff) {
            u.buffs[item.buff] = { val: item.buffVal!, fights: item.buffFights! * used, source: item.name };
          }
        }
        let text = `Used ${used}× ${item.name}! `;
        if (totalHealHp) text += `❤️ +${totalHealHp} HP `;
        if (totalHealMp) text += `💙 +${totalHealMp} MP `;
        if (item.buff === 'statPts') text += `📕 +${used * item.buffVal!} stat points!`;
        else if (item.buff) text += `${item.icon} ${item.buff} ×${item.buffVal} for ${item.buffFights! * used} fights`;
        db.saveUser(username, u);
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        send(ws, { type: 'notification', text: text.trim() });
        gameLog('ITEM', `used ${used}× ${item.name}`, username);
        break;
      }
      case 'discard_item': {
        if (!username) break;
        const u = users[username];
        const idx = u.inventory.indexOf(msg.itemId);
        if (idx === -1) break;
        const item = resolveItem(u, msg.itemId);
        u.inventory[idx] = null;
        destroyItemInstance(u, msg.itemId);
        db.saveUser(username, u);
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        send(ws, { type: 'notification', text: `🗑️ Discarded ${item?.name || 'item'}.` });
        gameLog('ITEM', `discarded ${item?.name || 'item'}`, username);
        break;
      }
      case 'sell_item': {
        if (!username) break;
        const u = users[username], idx = u.inventory.indexOf(msg.itemId);
        if (idx === -1) break;
        const item = resolveItem(u, msg.itemId);
        if (!item) break;
        const sellPrice = Math.floor(item.price/2);
        u.inventory[idx] = null;
        destroyItemInstance(u, msg.itemId);
        u.gold = (u.gold||0) + sellPrice;
        db.saveUser(username, u);
        gameLog('ECONOMY', `${username} sold ${item.name} (+${sellPrice}g)`, username);
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        send(ws, { type: 'notification', text: `Sold ${item.name} for ${sellPrice}🪙` });
        break;
      }
      case 'add_stat': {
        if (!username) break;
        const u = users[username];
        if ((u.statPoints||0) <= 0 || !['baseStr','baseAgi','baseEnd','baseInt'].includes(msg.stat)) break;
        u[msg.stat] = (u[msg.stat]||5) + 1;
        u.statPoints--;
        db.saveUser(username, u);
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        gameLog('SKILL', `+1 ${msg.stat}`, username);
        break;
      }
      case 'leaderboard': send(ws, { type: 'leaderboard', data: getLeaderboard() }); break;
      case 'view_player': {
        const t = msg.name;
        if (!users[t]) break;
        const u = users[t], cs = getPlayerCombatStats(u);
        const me = username ? users[username] : null;
        const isFriend = (me?.friends || []).includes(t);
        const isBlocked = (me?.blocked || []).includes(t);
        const hasPendingRequest = username ? (u.friendRequests || []).includes(username) : false;
        const targetGuild = getPlayerGuild(t);
        send(ws, { type: 'player_profile', name: t, level: u.level||1, kills: u.kills||0,
          pvpWins: u.pvpWins||0, class: u.class||'warrior', equipment: u.equipment||{}, stats: cs,
          achievements: u.achievements || [], isFriend, isBlocked, hasPendingRequest,
          guild: targetGuild ? { name: targetGuild.name, icon: targetGuild.icon || '⚔️' } : null,
          isOnline: online.has(t), lastOnline: u.lastOnline || null,
          showOnlineStatus: u.showOnlineStatus !== false });
        break;
      }
      case 'friend_add': {
        if (!username || !msg.name || msg.name === username) break;
        if (!users[msg.name]) { send(ws, { type: 'error', text: 'Player not found.' }); break; }
        const u = users[username];
        if ((u.friends || []).includes(msg.name)) { send(ws, { type: 'error', text: 'Already friends!' }); break; }
        const target = users[msg.name];
        if (!target.friendRequests) target.friendRequests = [];
        if (target.friendRequests.includes(username)) { send(ws, { type: 'error', text: 'Request already sent!' }); break; }
        target.friendRequests.push(username);
        db.saveUser(msg.name, target);
        gameLog('SOCIAL', `sent friend request to ${msg.name}`, username);
        send(ws, { type: 'notification', text: `📩 Friend request sent to ${msg.name}!` });
        if (online.has(msg.name)) {
          send(online.get(msg.name)!.ws, { type: 'notification', text: `📩 ${username} wants to be your friend!` });
          send(online.get(msg.name)!.ws, { type: 'player_update', player: sanitizePlayer(target) });
        }
        break;
      }
      case 'friend_accept': {
        if (!username || !msg.name) break;
        const u = users[username];
        if (!(u.friendRequests || []).includes(msg.name)) { send(ws, { type: 'error', text: 'No pending request.' }); break; }
        u.friendRequests = (u.friendRequests || []).filter((n: string) => n !== msg.name);
        if (!u.friends) u.friends = [];
        if (!u.friends.includes(msg.name)) u.friends.push(msg.name);
        const t2 = users[msg.name];
        if (t2) {
          if (!t2.friends) t2.friends = [];
          if (!t2.friends.includes(username)) t2.friends.push(username);
          db.saveMultipleUsers([[username, u], [msg.name, t2]]);
          if (online.has(msg.name)) {
            send(online.get(msg.name)!.ws, { type: 'notification', text: `✅ ${username} accepted your friend request!` });
            send(online.get(msg.name)!.ws, { type: 'player_update', player: sanitizePlayer(t2) });
          }
        } else { db.saveUser(username, u); }
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        send(ws, { type: 'notification', text: `✅ Now friends with ${msg.name}!` });
        gameLog('SOCIAL', `accepted friend from ${msg.name}`, username);
        break;
      }
      case 'friend_deny': {
        if (!username || !msg.name) break;
        const u = users[username];
        u.friendRequests = (u.friendRequests || []).filter((n: string) => n !== msg.name);
        db.saveUser(username, u);
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        gameLog('SOCIAL', `denied friend request from ${msg.name}`, username);
        break;
      }
      case 'friend_remove': {
        if (!username || !msg.name) break;
        const u = users[username];
        u.friends = (u.friends || []).filter((f: string) => f !== msg.name);
        // Mutual remove
        if (users[msg.name]) users[msg.name].friends = (users[msg.name].friends || []).filter((f: string) => f !== username);
        db.saveUser(username, users[username]);
        if (users[msg.name]) db.saveUser(msg.name, users[msg.name]);
        send(ws, { type: 'notification', text: `Removed ${msg.name} from friends.` });
        break;
      }
      case 'block_player': {
        if (!username || !msg.name || msg.name === username) break;
        const u = users[username];
        if (!u.blocked) u.blocked = [];
        if (u.blocked.includes(msg.name)) {
          u.blocked = u.blocked.filter((b: string) => b !== msg.name);
          db.saveUser(username, u);
          send(ws, { type: 'notification', text: `Unblocked ${msg.name}.` });
        } else {
          u.blocked.push(msg.name);
          // Also remove from friends
          u.friends = (u.friends || []).filter((f: string) => f !== msg.name);
          db.saveUser(username, u);
          gameLog('SOCIAL', `${username} blocked ${msg.name}`, username);
          send(ws, { type: 'notification', text: `Blocked ${msg.name}. You won't see their messages.` });
        }
        break;
      }
      case 'guild_invite': {
        if (!username || !msg.name) break;
        const pg = getPlayerGuild(username);
        if (!pg) { send(ws, { type: 'error', text: 'You are not in a guild!' }); break; }
        const g = guilds[pg.id];
        if (pg.leader !== username) { send(ws, { type: 'error', text: 'Only the guild leader can invite!' }); break; }
        if (g.members.length >= getGuildMaxMembers(g)) { send(ws, { type: 'error', text: 'Guild is full!' }); break; }
        if (!users[msg.name]) { send(ws, { type: 'error', text: 'Player not found.' }); break; }
        if (getPlayerGuild(msg.name)) { send(ws, { type: 'error', text: `${msg.name} is already in a guild.` }); break; }
        // Direct invite — add to guild
        g.members.push(msg.name);
        db.saveGuild(pg.id, g);
        gameLog('GUILD', `${username} invited ${msg.name}`, username);
        send(ws, { type: 'notification', text: `✅ Invited ${msg.name} to ${g.name}!` });
        if (online.has(msg.name)) {
          send(online.get(msg.name)!.ws, { type: 'notification', text: `⚔️ ${username} invited you to guild "${g.name}"!` });
          send(online.get(msg.name)!.ws, { type: 'guild_info', guild: makeGuildInfo(pg.id, g) });
        }
        break;
      }
      // ─── Admin ───────────────────────────────────────
      case 'admin_list_players': {
        if (!username || !isAdmin(username)) break;
        const list = Object.entries(users).map(([name, u]) => ({
          name, level: u.level||1, class: u.class||'warrior', kills: u.kills||0,
          pvpWins: u.pvpWins||0, gold: u.gold||0, online: online.has(name),
          prestige: u.prestige||0, pvpRating: u.pvpRating||1000, deaths: u.deaths||0,
        }));
        send(ws, { type: 'admin_players', players: list });
        break;
      }
      case 'admin_server_stats': {
        if (!username || !isAdmin(username)) break;
        const totalUsers = Object.keys(users).length;
        const onlineCount = online.size;
        const totalGold = Object.values(users).reduce((sum, u) => sum + (u.gold || 0), 0);
        const totalKills = Object.values(users).reduce((sum, u) => sum + (u.kills || 0), 0);
        const avgLevel = totalUsers > 0 ? Math.round(Object.values(users).reduce((sum, u) => sum + (u.level || 1), 0) / totalUsers) : 0;
        const maxLevel = Math.max(...Object.values(users).map(u => u.level || 1));
        const totalGuilds = Object.keys(guilds).length;
        const activeFights = fights.size;
        send(ws, { type: 'admin_server_stats', stats: { totalUsers, onlineCount, totalGold, totalKills, avgLevel, maxLevel, totalGuilds, activeFights } });
        break;
      }
      case 'admin_player_detail': {
        if (!username || !isAdmin(username)) break;
        const t = msg.target;
        if (!users[t]) { send(ws, { type: 'error', text: 'Player not found.' }); break; }
        const u = users[t];
        send(ws, { type: 'admin_player_detail', player: { ...sanitizePlayer(u), name: t, password: '***' } });
        break;
      }
      case 'admin_set_gold': {
        if (!username || !isAdmin(username)) break;
        const t = msg.target;
        if (!users[t]) break;
        users[t].gold = Math.max(0, parseInt(msg.gold) || 0);
        db.saveUser(t, users[t]);
        if (online.has(t)) send(online.get(t)!.ws, { type: 'player_update', player: sanitizePlayer(users[t]) });
        gameLog('ADMIN', `${username}: set ${t}'s gold to ${users[t].gold}`, username);
        send(ws, { type: 'admin_action_result', ok: true, text: `Set ${t}'s gold to ${users[t].gold}` });
        break;
      }
      case 'admin_set_level': {
        if (!username || !isAdmin(username)) break;
        const t = msg.target;
        if (!users[t]) break;
        users[t].level = Math.max(1, Math.min(300, parseInt(msg.level) || 1));
        db.saveUser(t, users[t]);
        if (online.has(t)) send(online.get(t)!.ws, { type: 'player_update', player: sanitizePlayer(users[t]) });
        gameLog('ADMIN', `${username}: set ${t}'s level to ${users[t].level}`, username);
        send(ws, { type: 'admin_action_result', ok: true, text: `Set ${t}'s level to ${users[t].level}` });
        break;
      }
      case 'admin_ban': {
        if (!username || !isAdmin(username)) break;
        const t = msg.target;
        if (!users[t]) break;
        users[t].banned = true;
        db.saveUser(t, users[t]);
        if (online.has(t)) {
          send(online.get(t)!.ws, { type: 'error', text: 'You have been banned.' });
          online.get(t)!.ws.close();
        }
        gameLog('AUTH', `${msg.target} banned by ${username}`, username);
        gameLog('ADMIN', `${username}: banned ${msg.target}`, username);
        send(ws, { type: 'admin_action_result', ok: true, text: `Banned ${t}.` });
        break;
      }
      case 'admin_unban': {
        if (!username || !isAdmin(username)) break;
        const t = msg.target;
        if (!users[t]) break;
        users[t].banned = false;
        db.saveUser(t, users[t]);
        gameLog('ADMIN', `${username}: unbanned ${t}`, username);
        send(ws, { type: 'admin_action_result', ok: true, text: `Unbanned ${t}.` });
        break;
      }
      case 'admin_message': {
        if (!username || !isAdmin(username)) break;
        const t = msg.target;
        if (online.has(t)) send(online.get(t)!.ws, { type: 'notification', text: `📩 Admin: ${msg.text}` });
        break;
      }
      case 'admin_edit_player': {
        if (!username || !isAdmin(username)) break;
        const t = msg.target;
        if (!users[t]) { send(ws, { type: 'error', text: 'Player not found.' }); break; }
        const u = users[t];
        if (msg.gold !== undefined) u.gold = Math.max(0, parseInt(msg.gold) || 0);
        if (msg.level !== undefined) u.level = Math.max(1, parseInt(msg.level) || 1);
        if (msg.xp !== undefined) u.xp = Math.max(0, parseInt(msg.xp) || 0);
        if (msg.kills !== undefined) u.kills = Math.max(0, parseInt(msg.kills) || 0);
        if (msg.statPoints !== undefined) u.statPoints = Math.max(0, parseInt(msg.statPoints) || 0);
        if (msg.baseStr !== undefined) u.baseStr = Math.max(1, parseInt(msg.baseStr) || 1);
        if (msg.baseAgi !== undefined) u.baseAgi = Math.max(1, parseInt(msg.baseAgi) || 1);
        if (msg.baseEnd !== undefined) u.baseEnd = Math.max(1, parseInt(msg.baseEnd) || 1);
        if (msg.baseInt !== undefined) u.baseInt = Math.max(1, parseInt(msg.baseInt) || 1);
        db.saveUser(t, u);
        // Update live player if online
        if (online.has(t)) send(online.get(t)!.ws, { type: 'player_update', player: sanitizePlayer(u) });
        gameLog('ADMIN', `${username}: edited player ${t}`, username);
        send(ws, { type: 'notification', text: `Updated ${t}.` });
        send(ws, { type: 'admin_players', players: Object.entries(users).map(([n, u]) => ({
          name: n, level: u.level||1, class: u.class||'warrior', kills: u.kills||0,
          pvpWins: u.pvpWins||0, gold: u.gold||0, online: online.has(n),
        })) });
        break;
      }
      case 'admin_kick': {
        if (!username || !isAdmin(username)) break;
        const t = msg.target;
        if (!online.has(t)) { send(ws, { type: 'error', text: 'Not online.' }); break; }
        const tw = online.get(t)!.ws;
        send(tw, { type: 'error', text: 'You have been kicked by admin.' });
        tw.close();
        gameLog('ADMIN', `${username}: kicked ${t}`, username);
        send(ws, { type: 'notification', text: `Kicked ${t}.` });
        break;
      }
      case 'admin_delete_player': {
        if (!username || !isAdmin(username)) break;
        const t = msg.target;
        if (!users[t]) break;
        if (online.has(t)) { online.get(t)!.ws.close(); }
        delete users[t];
        db.deleteUser(t);
        gameLog('ADMIN', `${username}: deleted player ${t}`, username);
        send(ws, { type: 'notification', text: `Deleted ${t}.` });
        break;
      }
      case 'admin_give_item': {
        if (!username || !isAdmin(username)) break;
        const t = msg.target, itemId = msg.itemId;
        if (!users[t] || !ITEMS[itemId]) break;
        const giveItem = ITEMS[itemId];
        if (giveItem && !giveItem.consumable) {
          const ref = createItemInstance(users[t], itemId);
          addToInventory(users[t], ref);
        } else {
          addToInventory(users[t], itemId);
        }
        db.saveUser(t, users[t]);
        if (online.has(t)) send(online.get(t)!.ws, { type: 'player_update', player: sanitizePlayer(users[t]) });
        gameLog('ADMIN', `${username}: gave ${ITEMS[itemId].name} to ${t}`, username);
        send(ws, { type: 'notification', text: `Gave ${ITEMS[itemId].name} to ${t}.` });
        break;
      }
      // ─── Guilds ──────────────────────────────────
      case 'create_guild': {
        if (!username) break;
        if (getPlayerGuild(username)) { send(ws, { type: 'error', text: 'Already in a guild!' }); break; }
        const gName = String(msg.name || '').trim().slice(0, 24);
        const gIcon = String(msg.icon || '⚔️').slice(0, 2);
        if (!gName || gName.length < 2) { send(ws, { type: 'error', text: 'Guild name too short.' }); break; }
        // Check name taken
        if (Object.values(guilds).some(g => g.name.toLowerCase() === gName.toLowerCase())) {
          send(ws, { type: 'error', text: 'Name already taken.' }); break;
        }
        const cost = 500;
        const u = users[username];
        if ((u.gold || 0) < cost) { send(ws, { type: 'error', text: `Need ${cost}🪙 to create a guild!` }); break; }
        u.gold -= cost;
        const guildId = `guild_${Date.now()}`;
        const isPrivate = msg.private || false;
        guilds[guildId] = { name: gName, icon: gIcon, leader: username, members: [username], totalKills: 0, created: Date.now(), private: isPrivate, applications: [], guildXp: 0, guildLevel: 1 };
        db.createGuild(guildId, guilds[guildId]); db.saveUser(username, u);
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        send(ws, { type: 'guild_info', guild: makeGuildInfo(guildId, guilds[guildId]) });
        gameLog('GUILD', `${username} created guild "${gName}"`, username);
        send(ws, { type: 'notification', text: `⚔️ Guild "${gName}" created!` });
        broadcast({ type: 'chat', user: 'System', text: `⚔️ ${username} founded the guild "${gName}"!`, msgType: 'system' });
        break;
      }
      case 'join_guild': {
        if (!username) break;
        if (getPlayerGuild(username)) { send(ws, { type: 'error', text: 'Already in a guild!' }); break; }
        const g = guilds[msg.guildId];
        if (!g) { send(ws, { type: 'error', text: 'Guild not found.' }); break; }
        if (g.members.length >= getGuildMaxMembers(g)) { send(ws, { type: 'error', text: 'Guild is full!' }); break; }
        if (g.private) {
          // Private guild — submit application
          if (!g.applications) g.applications = [];
          if (g.applications.includes(username)) { send(ws, { type: 'error', text: 'Already applied!' }); break; }
          g.applications.push(username);
          db.saveGuild(msg.guildId, g);
          send(ws, { type: 'notification', text: `Applied to "${g.name}". Waiting for approval.` });
          // Notify leader if online
          if (online.has(g.leader)) send(online.get(g.leader)!.ws, { type: 'notification', text: `📩 ${username} wants to join your guild!` });
          break;
        }
        g.members.push(username);
        db.saveGuild(msg.guildId, g);
        gameLog('GUILD', `${username} joined guild`, username);
        send(ws, { type: 'guild_info', guild: makeGuildInfo(msg.guildId, g) });
        send(ws, { type: 'notification', text: `Joined "${g.name}"!` });
        // Notify online guild members
        for (const m of g.members) {
          if (online.has(m)) send(online.get(m)!.ws, { type: 'chat', user: 'Guild', text: `${username} joined the guild!`, msgType: 'system' });
        }
        break;
      }
      case 'leave_guild': {
        if (!username) break;
        const pg = getPlayerGuild(username);
        if (!pg) break;
        const g = guilds[pg.id];
        g.members = g.members.filter((m: string) => m !== username);
        if (g.members.length === 0) { delete guilds[pg.id]; db.deleteGuild(pg.id); } // dissolve if empty
        else { if (g.leader === username) { g.leader = g.members[0]; } db.saveGuild(pg.id, g); } // transfer leadership
        gameLog('GUILD', `${username} left guild`, username);
        send(ws, { type: 'guild_info', guild: null });
        send(ws, { type: 'notification', text: `Left "${pg.name}"` });
        break;
      }
      case 'get_guild': {
        if (!username) break;
        const pg = getPlayerGuild(username);
        if (pg) {
          send(ws, { type: 'guild_info', guild: makeGuildInfo(pg.id, guilds[pg.id]) });
        } else {
          send(ws, { type: 'guild_info', guild: null });
        }
        break;
      }
      case 'list_guilds': {
        const list = Object.entries(guilds).map(([id, g]) => ({
          id, name: g.name, icon: g.icon, leader: g.leader,
          members: g.members.length, maxMembers: getGuildMaxMembers(g),
          level: getGuildLevel(g), private: g.private || false,
          totalKills: g.totalKills || 0,
        }));
        send(ws, { type: 'guild_list', guilds: list });
        break;
      }
      case 'guild_chat': {
        if (!username) break;
        const pg = getPlayerGuild(username);
        if (!pg) break;
        const text = String(msg.text || '').trim().slice(0, 200);
        if (!text) break;
        for (const m of guilds[pg.id].members) {
          if (online.has(m)) send(online.get(m)!.ws, { type: 'chat', user: `[${pg.name}] ${username}`, text, msgType: 'guild' });
        }
        logChat(`[Guild:${pg.name}] ${username}`, text, 'guild');
        break;
      }
      case 'guild_accept': {
        if (!username) break;
        const pg = getPlayerGuild(username);
        if (!pg || pg.leader !== username) { send(ws, { type: 'error', text: 'Only the guild leader can accept applications.' }); break; }
        const g = guilds[pg.id];
        const applicant = msg.name;
        if (!users[applicant]) { send(ws, { type: 'error', text: 'Player no longer exists.' }); break; }
        if (!g.applications?.includes(applicant)) break;
        if (g.members.length >= getGuildMaxMembers(g)) { send(ws, { type: 'error', text: 'Guild is full!' }); break; }
        g.applications = g.applications.filter((a: string) => a !== applicant);
        g.members.push(applicant);
        db.saveGuild(pg.id, g);
        send(ws, { type: 'guild_info', guild: makeGuildInfo(pg.id, g) });
        if (online.has(applicant)) {
          send(online.get(applicant)!.ws, { type: 'notification', text: `✅ Your application to "${g.name}" was accepted!` });
          send(online.get(applicant)!.ws, { type: 'guild_info', guild: makeGuildInfo(pg.id, g) });
        }
        break;
      }
      case 'guild_deny': {
        if (!username) break;
        const pg = getPlayerGuild(username);
        if (!pg || pg.leader !== username) break;
        const g = guilds[pg.id];
        g.applications = (g.applications || []).filter((a: string) => a !== msg.name);
        db.saveGuild(pg.id, g);
        send(ws, { type: 'guild_info', guild: makeGuildInfo(pg.id, g) });
        if (online.has(msg.name)) send(online.get(msg.name)!.ws, { type: 'notification', text: `❌ Your application to "${g.name}" was denied.` });
        break;
      }
      case 'guild_donate': {
        if (!username) break;
        const pg = getPlayerGuild(username);
        if (!pg) { send(ws, { type: 'error', text: 'Not in a guild!' }); break; }
        const gold = Math.floor(Number(msg.gold) || 0);
        if (gold < 1) { send(ws, { type: 'error', text: 'Invalid amount.' }); break; }
        const u = users[username];
        if ((u.gold || 0) < gold) { send(ws, { type: 'error', text: 'Not enough gold!' }); break; }
        u.gold -= gold;
        db.saveUser(username, u);
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        // Track donations per member
        const g = guilds[pg.id];
        if (!g.donations) g.donations = {};
        g.donations[username] = (g.donations[username] || 0) + gold;
        addGuildXp(pg.id, gold);
        db.saveGuild(pg.id, g);
        send(ws, { type: 'notification', text: `Donated ${gold}🪙 to guild (+${gold} guild XP)` });
        const guildInfo = makeGuildInfo(pg.id, g);
        for (const m of g.members) {
          if (online.has(m)) {
            send(online.get(m)!.ws, { type: 'guild_info', guild: guildInfo });
            send(online.get(m)!.ws, { type: 'chat', user: 'Guild', text: `${username} donated ${gold}🪙 to the guild!`, msgType: 'system' });
          }
        }
        gameLog('GUILD', `${username} donated ${gold} gold to guild`, username);
        break;
      }
      case 'guild_update': {
        if (!username) break;
        const pg = getPlayerGuild(username);
        if (!pg || pg.leader !== username) { send(ws, { type: 'error', text: 'Only the guild leader can edit.' }); break; }
        const g = guilds[pg.id];
        if (msg.icon !== undefined) g.icon = String(msg.icon || '⚔️').slice(0, 2);
        if (msg.description !== undefined) g.description = String(msg.description || '').slice(0, 200);
        if (msg.notice !== undefined) g.notice = String(msg.notice || '').slice(0, 200);
        db.saveGuild(pg.id, g);
        // Notify all online members
        const guildInfo = makeGuildInfo(pg.id, g);
        for (const m of g.members) {
          if (online.has(m)) send(online.get(m)!.ws, { type: 'guild_info', guild: guildInfo });
        }
        gameLog('GUILD', `updated guild settings`, username);
        break;
      }
      // ─── Private Messages ─────────────────────────
      case 'private_msg': {
        if (!username) break;
        const target = msg.target;
        const text = String(msg.text || '').trim().slice(0, 200);
        if (!text || !target || target === username) break;
        if (!users[target]) { send(ws, { type: 'error', text: 'Player not found.' }); break; }
        // Save to DB — both as received for target AND as sent for sender
        const msgId = db.sendMessage(username, target, text);
        gameLog('SOCIAL', `${username} → ${target} (PM)`, username);
        send(ws, { type: 'private_msg', from: username, to: target, text, sent: true, msgId });
        // Real-time delivery if online
        if (online.has(target)) {
          send(online.get(target)!.ws, { type: 'private_msg', from: username, to: target, text, sent: false, msgId });
          send(online.get(target)!.ws, { type: 'inbox_count', count: db.getUnreadCount(target) });
        }
        logChat(username, `[PM to ${target}] ${text}`, 'whisper');
        break;
      }
      case 'get_inbox': {
        if (!username) break;
        const inbox = db.getInbox(username);
        send(ws, { type: 'inbox', messages: inbox, unread: db.getUnreadCount(username) });
        break;
      }
      case 'mark_read': {
        if (!username) break;
        if (msg.all) db.markAllRead(username);
        else if (msg.id) db.markRead(username, msg.id);
        send(ws, { type: 'inbox_count', count: db.getUnreadCount(username) });
        break;
      }
      case 'delete_message': {
        if (!username) break;
        db.deleteMessage(username, msg.id);
        send(ws, { type: 'inbox', messages: db.getInbox(username), unread: db.getUnreadCount(username) });
        break;
      }
      case 'delete_all_messages': {
        if (!username) break;
        db.deleteAllMessages(username);
        send(ws, { type: 'inbox', messages: [], unread: 0 });
        break;
      }
      case 'delete_conversation': {
        if (!username) break;
        db.deleteConversation(username, msg.sender);
        send(ws, { type: 'inbox', messages: db.getInbox(username), unread: db.getUnreadCount(username) });
        break;
      }
      // ─── Trading ─────────────────────────────────
      case 'trade_send': {
        // Send gold or an inventory item to another online player
        if (!username) break;
        const target = msg.target;
        if (target === username) { send(ws, { type: 'error', text: "Can't trade with yourself." }); break; }
        if (!online.has(target)) { send(ws, { type: 'error', text: `${target} is not online.` }); break; }
        const u = users[username], tu = users[target];
        if (!u || !tu) break;

        if (msg.gold && msg.gold > 0) {
          const amount = Math.min(msg.gold, u.gold || 0);
          if (amount <= 0) { send(ws, { type: 'error', text: 'No gold to send.' }); break; }
          u.gold -= amount;
          tu.gold = (tu.gold || 0) + amount;
          db.saveMultipleUsers([[username, u], [target, tu]]);
          send(ws, { type: 'player_update', player: sanitizePlayer(u) });
          send(ws, { type: 'notification', text: `Sent ${amount}🪙 to ${target}` });
          send(online.get(target)!.ws, { type: 'player_update', player: sanitizePlayer(tu) });
          send(online.get(target)!.ws, { type: 'notification', text: `${username} sent you ${amount}🪙!` });
          gameLog('ECONOMY', `${username} traded to ${target}`, username);
          broadcast({ type: 'chat', user: 'System', text: `💰 ${username} traded ${amount}🪙 to ${target}`, msgType: 'system' });
        } else if (msg.itemId) {
          const idx = u.inventory.indexOf(msg.itemId);
          if (idx === -1) { send(ws, { type: 'error', text: 'Item not in inventory.' }); break; }
          if (isInventoryFull(tu)) { send(ws, { type: 'error', text: `${target}'s inventory is full!` }); break; }
          const item = resolveItem(u, msg.itemId);
          u.inventory[idx] = null;
          if (u.itemInstances?.[msg.itemId]) { if (!tu.itemInstances) tu.itemInstances = {}; tu.itemInstances[msg.itemId] = u.itemInstances[msg.itemId]; delete u.itemInstances[msg.itemId]; }
          addToInventory(tu, msg.itemId);
          db.saveMultipleUsers([[username, u], [target, tu]]);
          send(ws, { type: 'player_update', player: sanitizePlayer(u) });
          send(ws, { type: 'notification', text: `Sent ${item?.name || msg.itemId} to ${target}` });
          send(online.get(target)!.ws, { type: 'player_update', player: sanitizePlayer(tu) });
          send(online.get(target)!.ws, { type: 'notification', text: `${username} sent you ${item?.icon || ''} ${item?.name || msg.itemId}!` });
          gameLog('ECONOMY', `${username} traded to ${target}`, username);
          broadcast({ type: 'chat', user: 'System', text: `🤝 ${username} traded ${item?.icon || ''} ${item?.name || 'an item'} to ${target}`, msgType: 'system' });
        }
        break;
      }
      case 'admin_chat_logs': {
        if (!username || !isAdmin(username)) break;
        const logs = db.getRecentChatLogs(200);
        send(ws, { type: 'admin_chat_logs', logs });
        break;
      }
      case 'admin_broadcast': {
        if (!username || !isAdmin(username)) break;
        const text = String(msg.text||'').trim().slice(0,300);
        if (text) {
          gameLog('ADMIN', `${username}: broadcast "${text}"`, username);
          broadcast({ type: 'chat', user: '📢 Admin', text, msgType: 'system' });
        }
        break;
      }
      case 'admin_live_logs': {
        if (!username || !isAdmin(username)) break;
        send(ws, { type: 'admin_live_logs', logs: getRecentLogs(msg.limit || 200, msg.categories, msg.search, msg.player) });
        break;
      }
      // ─── New Game Plus (Prestige) ──────────────
      case 'prestige': {
        if (!username) break;
        const u = users[username];
        if ((u.level || 1) < MAX_LEVEL) { send(ws, { type: 'error', text: `Need max level (${MAX_LEVEL}) to prestige!` }); break; }
        const prestigeLevel = (u.prestige || 0) + 1;
        const bonusStats = prestigeLevel * 3; // +3 to all base stats per prestige (max level is hard to reach)
        u.prestige = prestigeLevel;
        u.level = 1;
        u.xp = 0;
        u.kills = u.kills || 0; // keep kills
        u.pvpWins = u.pvpWins || 0; // keep pvp wins
        u.baseStr = 5 + bonusStats;
        u.baseAgi = 5 + bonusStats;
        u.baseEnd = 5 + bonusStats;
        u.baseInt = 5 + bonusStats;
        // Re-apply class bonuses
        const cls = CLASSES[u.class] || CLASSES.warrior;
        u.baseStr += cls.bonusStr; u.baseAgi += cls.bonusAgi;
        u.baseEnd += cls.bonusEnd; u.baseInt += cls.bonusInt;
        u.statPoints = 3 + prestigeLevel * 5; // extra starting points per prestige
        u.gold = Math.floor((u.gold || 0) * 0.5); // keep half gold
        // Keep equipment and inventory
        db.saveUser(username, u);
        send(ws, { type: 'player_update', player: sanitizePlayer(u) });
        gameLog('SYSTEM', `${username} prestiged to NG+${prestigeLevel}`, username);
        send(ws, { type: 'notification', text: `✨ Prestige ${prestigeLevel}! All base stats +${bonusStats}. You are reborn!` });
        broadcast({ type: 'chat', user: 'System', text: `✨ ${username} has prestiged to NG+${prestigeLevel}!`, msgType: 'system' });
        broadcastOnlineList();
        break;
      }
      case 'challenge': {
        if (!username) break;
        const t = msg.target;
        if (t === username || !online.has(t) || playerInFight(username) || playerInFight(t)) {
          send(ws, { type: 'error', text: "Can't challenge." }); break;
        }
        const cid = `ch_${nextId++}`;
        challenges.set(cid, { from: username, to: t, ts: Date.now() });
        send(ws, { type: 'challenge_sent', id: cid, to: t });
        send(online.get(t)!.ws, { type: 'challenge_received', id: cid, from: username, fromLevel: users[username]?.level||1 });
        break;
      }
      case 'challenge_accept': {
        if (!username) break;
        const ch = challenges.get(msg.id);
        if (!ch || ch.to !== username) break;
        challenges.delete(msg.id);
        const fid = createFight(ch.from, ch.to);
        const fw = online.get(ch.from)?.ws, tw = online.get(ch.to)?.ws;
        if (fw) send(fw, { type: 'fight_start', fight: getFightState(fid, ch.from) });
        if (tw) send(tw, { type: 'fight_start', fight: getFightState(fid, ch.to) });
        gameLog('PVP', `${ch.from} vs ${ch.to} — fight started`, username);
        broadcast({ type: 'chat', user: 'System', text: `⚔️ ${ch.from} vs ${ch.to}!`, msgType: 'system' });
        broadcastOnlineList();
        break;
      }
      case 'challenge_decline': {
        if (!username) break;
        const ch = challenges.get(msg.id);
        if (!ch || ch.to !== username) break;
        challenges.delete(msg.id);
        send(online.get(ch.from)?.ws, { type: 'challenge_declined', by: username });
        break;
      }
      case 'fight_choice': {
        if (!username) break;
        const r = getFightForPlayer(username);
        if (!r || r.fight.finished) break;
        const { id: fid, fight: f } = r;
        const atk = ZONES.includes(msg.attack)?msg.attack:'body', def = ZONES.includes(msg.defend)?msg.defend:'body';
        if (f.p1.name === username) f.p1choice = { attack: atk, defend: def };
        else f.p2choice = { attack: atk, defend: def };
        const op = f.p1.name === username ? f.p2.name : f.p1.name;
        send(online.get(op)?.ws, { type: 'fight_enemy_ready' });
        send(ws, { type: 'fight_choice_ack' });
        if (f.p1choice && f.p2choice) {
          resolveRound(f);
          send(online.get(f.p1.name)?.ws, { type: 'fight_update', fight: getFightState(fid, f.p1.name) });
          send(online.get(f.p2.name)?.ws, { type: 'fight_update', fight: getFightState(fid, f.p2.name) });
          if (f.finished) {
            const loser = f.p1.name === f.winner ? f.p2.name : f.p1.name;
            gameLog('PVP', `${f.winner} defeated ${loser} — PvP`, username);
            broadcast({ type: 'chat', user: 'System', text: `🏆 ${f.winner} won PvP!`, msgType: 'system' });
            send(online.get(f.p1.name)?.ws, { type: 'player_update', player: sanitizePlayer(users[f.p1.name]) });
            send(online.get(f.p2.name)?.ws, { type: 'player_update', player: sanitizePlayer(users[f.p2.name]) });
            broadcastOnlineList();
          }
        }
        break;
      }
      case 'fight_leave': {
        if (!username) break;
        const r = getFightForPlayer(username);
        if (!r) break;
        if (r.fight.finished) {
          fights.delete(r.id);
          broadcastOnlineList();
        } else {
          // Forfeit — count as loss with penalty
          r.fight.finished = true;
          r.fight.winner = r.fight.p1.name === username ? r.fight.p2.name : r.fight.p1.name;
          r.fight.log.push({ type: 'system', text: `🏳️ ${username} forfeited! ${r.fight.winner} wins!` });
          // Apply rating loss
          const lu = users[username], wu = users[r.fight.winner];
          if (lu && wu) {
            const ratingLoss = 25; // flat penalty for forfeiting
            lu.pvpRating = Math.max(0, (lu.pvpRating || 1000) - ratingLoss);
            lu.pvpLosses = (lu.pvpLosses || 0) + 1;
            wu.pvpRating = (wu.pvpRating || 1000) + 15;
            wu.pvpWins = (wu.pvpWins || 0) + 1;
            db.saveMultipleUsers([[username, lu], [r.fight.winner, wu]]);
          }
          const opName = r.fight.winner;
          gameLog('PVP', `${username} forfeited vs ${opName}`, username);
          const opWs = online.get(opName)?.ws;
          if (opWs) send(opWs, { type: 'fight_update', fight: getFightState(r.id, opName) });
          send(ws, { type: 'notification', text: `🏳️ You forfeited! -25 rating.` });
          broadcastOnlineList();
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    if (username) {
      const r = getFightForPlayer(username);
      if (r && !r.fight.finished) {
        r.fight.finished = true;
        r.fight.winner = r.fight.p1.name === username ? r.fight.p2.name : r.fight.p1.name;
        r.fight.log.push({ type: 'system', text: `💀 ${username} disconnected. ${r.fight.winner} wins!` });
        const op = r.fight.p1.name === username ? r.fight.p2.name : r.fight.p1.name;
        send(online.get(op)?.ws, { type: 'fight_update', fight: getFightState(r.id, op) });
      }
      online.delete(username);
      if (users[username]) { users[username].lastOnline = Date.now(); db.saveUser(username, users[username]); }
      gameLog('AUTH', `${username} disconnected`, username);
      broadcast({ type: 'chat', user: 'System', text: `${username} left.`, msgType: 'system' });
      broadcastOnlineList();
    }
  });
});

setInterval(() => {
  const now = Date.now();
  // Expire stale challenges
  for (const [id, ch] of challenges) {
    if (now - ch.ts > 60000) { challenges.delete(id); send(online.get(ch.from)?.ws, { type: 'challenge_expired', id }); }
  }
  // Clean up finished fights
  for (const [id, f] of fights) {
    if (f.finished) fights.delete(id);
  }
  // Check log rotation (cheap — just checks file dates)
  checkRotation();
}, 30000);
