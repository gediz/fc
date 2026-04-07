// ─── Achievements ────────────────────────────────────────────
import type { Achievement, User } from './types.js';

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_blood',   name: 'First Blood',     desc: 'Win your first fight',         icon: '🩸', check: (u: User) => (u.kills || 0) >= 1, reward: 20 },
  { id: 'warrior_10',    name: 'Warrior',          desc: 'Win 10 fights',                icon: '⚔️', check: (u: User) => (u.kills || 0) >= 10, reward: 50 },
  { id: 'veteran_50',    name: 'Veteran',          desc: 'Win 50 fights',                icon: '🎖️', check: (u: User) => (u.kills || 0) >= 50, reward: 150 },
  { id: 'legend_100',    name: 'Legend',            desc: 'Win 100 fights',               icon: '🏅', check: (u: User) => (u.kills || 0) >= 100, reward: 300 },
  { id: 'level_5',       name: 'Apprentice',        desc: 'Reach level 5',                icon: '📗', check: (u: User) => (u.level || 1) >= 5, reward: 30 },
  { id: 'level_10',      name: 'Expert',            desc: 'Reach level 10',               icon: '📘', check: (u: User) => (u.level || 1) >= 10, reward: 100 },
  { id: 'level_15',      name: 'Master',            desc: 'Reach level 15',               icon: '📕', check: (u: User) => (u.level || 1) >= 15, reward: 250 },
  { id: 'rich_500',      name: 'Wealthy',           desc: 'Accumulate 500 gold',          icon: '💰', check: (u: User) => (u.gold || 0) >= 500, reward: 50 },
  { id: 'rich_2000',     name: 'Tycoon',            desc: 'Accumulate 2000 gold',         icon: '🏦', check: (u: User) => (u.gold || 0) >= 2000, reward: 200 },
  { id: 'collector_5',   name: 'Collector',         desc: 'Own 5 different items',        icon: '🎒', check: (u: User) => new Set([...(u.inventory || []), ...Object.values(u.equipment || {}).filter(Boolean)]).size >= 5, reward: 40 },
  { id: 'pvp_win',       name: 'Duelist',           desc: 'Win a PvP fight',              icon: '🤺', check: (u: User) => (u.pvpWins || 0) >= 1, reward: 50 },
  { id: 'pvp_5',         name: 'Gladiator',         desc: 'Win 5 PvP fights',             icon: '🏛️', check: (u: User) => (u.pvpWins || 0) >= 5, reward: 150 },
  { id: 'rare_drop',     name: 'Lucky Find',        desc: 'Get a rare+ item drop',        icon: '🍀', check: (u: User) => (u.rareDrops || 0) >= 1, reward: 30 },
  { id: 'full_equip',    name: 'Fully Equipped',     desc: 'Fill all equipment slots',     icon: '🛡️', check: (u: User) => { const eq = u.equipment || {}; return !!(eq.weapon && eq.armor && eq.helmet && eq.boots && eq.ring); }, reward: 60 },
];
