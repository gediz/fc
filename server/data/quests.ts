// ─── Quests ──────────────────────────────────────────────────
import type { User } from './types.js';

interface QuestTemplate {
  id: string;
  name: string;
  desc: string;
  type: string;
  target: number;
  xpReward: number;
  goldReward: number;
  icon: string;
  beginner?: boolean;
}

export const QUEST_TEMPLATES: QuestTemplate[] = [
  // ── Beginner Chain (guided introduction) ──
  { id: 'first_fight',   name: 'First Blood',          desc: 'Win your first battle',         type: 'kills',    target: 1,    xpReward: 50,    goldReward: 30,   icon: '🌱', beginner: true },
  { id: 'kill_3',        name: 'Getting Warmed Up',     desc: 'Win 3 battles',                 type: 'kills',    target: 3,    xpReward: 80,    goldReward: 50,   icon: '🌱', beginner: true },
  { id: 'first_equip',   name: 'Gear Up',               desc: 'Own your first item',           type: 'items',    target: 1,    xpReward: 60,    goldReward: 40,   icon: '🛡️', beginner: true },
  { id: 'reach_lv3',     name: 'Rising Fighter',        desc: 'Reach level 3',                 type: 'level',    target: 3,    xpReward: 100,   goldReward: 60,   icon: '📗', beginner: true },
  { id: 'first_shop',    name: 'Window Shopping',       desc: 'Collect 3 items',               type: 'items',    target: 3,    xpReward: 80,    goldReward: 50,   icon: '🏪', beginner: true },

  // ── Kill Milestones ──
  { id: 'kill_10',       name: 'Bloodied Hands',        desc: 'Defeat 10 enemies',             type: 'kills',    target: 10,   xpReward: 200,   goldReward: 100,  icon: '⚔️' },
  { id: 'kill_25',       name: 'Seasoned Brawler',      desc: 'Defeat 25 enemies',             type: 'kills',    target: 25,   xpReward: 500,   goldReward: 250,  icon: '⚔️' },
  { id: 'kill_50',       name: 'Half Century',          desc: 'Defeat 50 enemies',             type: 'kills',    target: 50,   xpReward: 1200,  goldReward: 600,  icon: '⚔️' },
  { id: 'kill_100',      name: 'Centurion',             desc: 'Defeat 100 enemies',            type: 'kills',    target: 100,  xpReward: 3000,  goldReward: 1500, icon: '⚔️' },
  { id: 'kill_250',      name: 'Warmonger',             desc: 'Defeat 250 enemies',            type: 'kills',    target: 250,  xpReward: 8000,  goldReward: 4000, icon: '⚔️' },
  { id: 'kill_500',      name: 'Death Incarnate',       desc: 'Defeat 500 enemies',            type: 'kills',    target: 500,  xpReward: 20000, goldReward: 10000,icon: '💀' },

  // ── Level Milestones ──
  { id: 'reach_lv5',     name: 'Apprentice',            desc: 'Reach level 5',                 type: 'level',    target: 5,    xpReward: 150,   goldReward: 80,   icon: '📗' },
  { id: 'reach_lv10',    name: 'Journeyman',            desc: 'Reach level 10',                type: 'level',    target: 10,   xpReward: 500,   goldReward: 250,  icon: '📘' },
  { id: 'reach_lv20',    name: 'Expert Fighter',        desc: 'Reach level 20',                type: 'level',    target: 20,   xpReward: 1500,  goldReward: 750,  icon: '📕' },
  { id: 'reach_lv50',    name: 'Master',                desc: 'Reach level 50',                type: 'level',    target: 50,   xpReward: 5000,  goldReward: 2500, icon: '📕' },
  { id: 'reach_lv100',   name: 'Legendary',             desc: 'Reach level 100',               type: 'level',    target: 100,  xpReward: 15000, goldReward: 8000, icon: '🌟' },

  // ── Wealth ──
  { id: 'gold_500',      name: 'Pocket Change',         desc: 'Accumulate 500 gold',           type: 'gold',     target: 500,  xpReward: 100,   goldReward: 50,   icon: '💰' },
  { id: 'gold_2000',     name: 'Comfortable',           desc: 'Accumulate 2,000 gold',         type: 'gold',     target: 2000, xpReward: 300,   goldReward: 150,  icon: '💰' },
  { id: 'gold_10000',    name: 'Wealthy',               desc: 'Accumulate 10,000 gold',        type: 'gold',     target: 10000,xpReward: 1000,  goldReward: 500,  icon: '💰' },

  // ── Dungeon ──
  { id: 'dungeon_1',     name: 'Dungeon Crawler',       desc: 'Clear your first dungeon',      type: 'dungeons', target: 1,    xpReward: 200,   goldReward: 100,  icon: '🏰' },
  { id: 'dungeon_5',     name: 'Dungeon Diver',         desc: 'Clear 5 dungeons',              type: 'dungeons', target: 5,    xpReward: 600,   goldReward: 300,  icon: '🏰' },
  { id: 'dungeon_20',    name: 'Dungeon Master',        desc: 'Clear 20 dungeons',             type: 'dungeons', target: 20,   xpReward: 2000,  goldReward: 1000, icon: '🏰' },
  { id: 'dungeon_50',    name: 'Abyss Walker',          desc: 'Clear 50 dungeons',             type: 'dungeons', target: 50,   xpReward: 5000,  goldReward: 2500, icon: '🏰' },

  // ── PvP ──
  { id: 'pvp_1',         name: 'First Duel',            desc: 'Win your first PvP fight',      type: 'pvp',      target: 1,    xpReward: 200,   goldReward: 100,  icon: '🤺' },
  { id: 'pvp_5',         name: 'Arena Fighter',         desc: 'Win 5 PvP fights',              type: 'pvp',      target: 5,    xpReward: 600,   goldReward: 300,  icon: '🤺' },
  { id: 'pvp_20',        name: 'PvP Champion',          desc: 'Win 20 PvP fights',             type: 'pvp',      target: 20,   xpReward: 2000,  goldReward: 1000, icon: '🤺' },

  // ── Crafting ──
  { id: 'enchant_5',     name: 'Enchanter',             desc: 'Enchant items 5 times',         type: 'enchants', target: 5,    xpReward: 200,   goldReward: 100,  icon: '✨' },
  { id: 'enchant_20',    name: 'Master Enchanter',      desc: 'Enchant items 20 times',        type: 'enchants', target: 20,   xpReward: 800,   goldReward: 400,  icon: '✨' },

  // ── Collection ──
  { id: 'items_5',       name: 'Collector',             desc: 'Own 5 different items',         type: 'items',    target: 5,    xpReward: 150,   goldReward: 80,   icon: '🎒' },
  { id: 'items_15',      name: 'Hoarder',               desc: 'Own 15 different items',        type: 'items',    target: 15,   xpReward: 500,   goldReward: 250,  icon: '🎒' },
];

export function getQuestProgress(u: User, quest: QuestTemplate): number {
  switch (quest.type) {
    case 'kills':    return Math.min(u.kills || 0, quest.target);
    case 'gold':     return Math.min(u.gold || 0, quest.target);
    case 'dungeons': return Math.min(u.dungeonsCleared || 0, quest.target);
    case 'pvp':      return Math.min(u.pvpWins || 0, quest.target);
    case 'enchants': return Math.min(u.totalEnchants || 0, quest.target);
    case 'level':    return Math.min(u.level || 1, quest.target);
    case 'items':    return Math.min(
      new Set([...(u.inventory || []).filter(Boolean), ...Object.values(u.equipment || {}).filter(Boolean)]).size,
      quest.target
    );
    default: return 0;
  }
}

export function checkQuests(u: User & { completedQuests?: string[] }) {
  if (!u.completedQuests) u.completedQuests = [];
  const newlyCompleted = [];
  for (const q of QUEST_TEMPLATES) {
    if (u.completedQuests.includes(q.id)) continue;
    if (getQuestProgress(u, q) >= q.target) {
      u.completedQuests.push(q.id);
      u.xp = (u.xp||0) + q.xpReward;
      u.gold = (u.gold||0) + q.goldReward;
      newlyCompleted.push(q);
    }
  }
  return newlyCompleted;
}
