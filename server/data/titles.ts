// ─── Titles ──────────────────────────────────────────────────
import type { User } from './types.js';

interface TitleDef {
  id: string;
  name: string;
  icon: string;
  req: (u: User) => boolean;
  buff?: Record<string, number>;
  buffDesc?: string;
}

export const TITLES: TitleDef[] = [
  { id: 'newcomer',      name: 'Newcomer',         req: (u: User) => true,                     icon: '🌱', buff: { xpPct: 0.05 }, buffDesc: '+5% XP' },
  { id: 'fighter',       name: 'Fighter',           req: (u: User) => (u.kills||0) >= 10,      icon: '⚔️', buff: { dmgPct: 0.03 }, buffDesc: '+3% damage' },
  { id: 'slayer',        name: 'Slayer',             req: (u: User) => (u.kills||0) >= 50,      icon: '🗡️', buff: { dmgPct: 0.06 }, buffDesc: '+6% damage' },
  { id: 'destroyer',     name: 'Destroyer',          req: (u: User) => (u.kills||0) >= 200,     icon: '💀', buff: { dmgPct: 0.10 }, buffDesc: '+10% damage' },
  { id: 'godslayer',     name: 'Godslayer',          req: (u: User) => (u.kills||0) >= 500,     icon: '⚡', buff: { dmgPct: 0.15, critChance: 5 }, buffDesc: '+15% dmg, +5% crit' },
  { id: 'duelist',       name: 'Duelist',            req: (u: User) => (u.pvpWins||0) >= 3,     icon: '🤺', buff: { pvpDmg: 0.05 }, buffDesc: '+5% PvP damage' },
  { id: 'arena_king',    name: 'Arena King',         req: (u: User) => (u.pvpWins||0) >= 20,    icon: '👑', buff: { pvpDmg: 0.12 }, buffDesc: '+12% PvP damage' },
  { id: 'dungeon_rat',   name: 'Dungeon Rat',        req: (u: User) => (u.dungeonsCleared||0) >= 5,  icon: '🐀', buff: { dungeonXp: 0.10 }, buffDesc: '+10% dungeon XP' },
  { id: 'dungeon_lord',  name: 'Dungeon Lord',       req: (u: User) => (u.dungeonsCleared||0) >= 30, icon: '🏰', buff: { dungeonXp: 0.25, dropBonus: 10 }, buffDesc: '+25% dungeon XP, +10% drops' },
  { id: 'enchanter',     name: 'Enchanter',          req: (u: User) => (u.totalEnchants||0) >= 10,   icon: '✨', buff: { enchantBonus: 5 }, buffDesc: '+5% enchant success' },
  { id: 'master_smith',  name: 'Master Smith',       req: (u: User) => (u.totalEnchants||0) >= 50,   icon: '🔨', buff: { enchantBonus: 10 }, buffDesc: '+10% enchant success' },
  { id: 'wealthy',       name: 'Wealthy',            req: (u: User) => (u.gold||0) >= 5000,          icon: '💰', buff: { goldPct: 0.08 }, buffDesc: '+8% gold' },
  { id: 'tycoon',        name: 'Tycoon',             req: (u: User) => (u.gold||0) >= 20000,         icon: '🏦', buff: { goldPct: 0.15 }, buffDesc: '+15% gold' },
  { id: 'prestige_1',    name: 'Reborn',             req: (u: User) => (u.prestige||0) >= 1,         icon: '✨', buff: { xpPct: 0.10, allStats: 2 }, buffDesc: '+10% XP, +2 all stats' },
  { id: 'prestige_3',    name: 'Ascended',           req: (u: User) => (u.prestige||0) >= 3,         icon: '🌟', buff: { xpPct: 0.15, allStats: 4 }, buffDesc: '+15% XP, +4 all stats' },
  { id: 'prestige_5',    name: 'Transcendent',       req: (u: User) => (u.prestige||0) >= 5,         icon: '💎', buff: { xpPct: 0.20, allStats: 6, dmgPct: 0.05 }, buffDesc: '+20% XP, +6 stats, +5% dmg' },
  { id: 'max_level',     name: 'Apex',               req: (u: User) => (u.level||1) >= 50,           icon: '🏔️', buff: { hpPct: 0.10 }, buffDesc: '+10% max HP' },
  { id: 'centurion',     name: 'Centurion',          req: (u: User) => (u.level||1) >= 100,          icon: '🦅', buff: { hpPct: 0.15, dmgPct: 0.08 }, buffDesc: '+15% HP, +8% dmg' },
];

export function getUnlockedTitles(u: User) {
  return TITLES.filter(t => t.req(u)).map(t => ({ id: t.id, name: t.name, icon: t.icon, buff: t.buff, buffDesc: t.buffDesc }));
}
