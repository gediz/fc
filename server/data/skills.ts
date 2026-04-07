// ─── Skill Trees ─────────────────────────────────────────────
// Each class has 3 branches, each with 5 tiers. Cost: tier number (1-5 skill points).
// Effects stack and are applied in combat.
import type { SkillTree, Mastery, User } from './types.js';

export const SKILL_TREES: Record<string, SkillTree> = {
  warrior: {
    name: 'Warrior',
    branches: [
      { id: 'might', name: 'Might', icon: '💪', desc: 'Raw power',
        tiers: [
          { id: 'w_m1', name: 'Heavy Blows',      cost: 1, desc: '+10% damage',            effect: { dmgPct: 0.10 } },
          { id: 'w_m2', name: 'Brutal Force',     cost: 2, desc: '+5 STR',                  effect: { str: 5 } },
          { id: 'w_m3', name: 'Cleave',            cost: 3, desc: 'Attacks hit for +25% dmg', effect: { dmgPct: 0.25 } },
          { id: 'w_m4', name: 'Executioner',       cost: 4, desc: '+20% crit damage',        effect: { critDmg: 0.20 } },
          { id: 'w_m5', name: 'Warlord',           cost: 5, desc: '+10 STR, +15% damage',    effect: { str: 10, dmgPct: 0.15 } },
        ]},
      { id: 'defense', name: 'Defense', icon: '🛡️', desc: 'Survivability',
        tiers: [
          { id: 'w_d1', name: 'Tough Skin',        cost: 1, desc: '+5% damage reduction',    effect: { dmgReduction: 0.05 } },
          { id: 'w_d2', name: 'Vitality',          cost: 2, desc: '+50 max HP',              effect: { flatHp: 50 } },
          { id: 'w_d3', name: 'Iron Will',         cost: 3, desc: '+10% HP, +5 END',         effect: { hpPct: 0.10, end: 5 } },
          { id: 'w_d4', name: 'Fortification',     cost: 4, desc: '+15 armor',               effect: { armor: 15 } },
          { id: 'w_d5', name: 'Immortal',          cost: 5, desc: 'Survive fatal hit at 1HP once', effect: { deathSave: true } },
        ]},
      { id: 'fury', name: 'Fury', icon: '🔥', desc: 'Berserker rage',
        tiers: [
          { id: 'w_f1', name: 'Blood Rage',        cost: 1, desc: '+10% crit chance',        effect: { critChance: 10 } },
          { id: 'w_f2', name: 'Frenzy',            cost: 2, desc: 'Double attack 15% chance', effect: { doubleAtk: 0.15 } },
          { id: 'w_f3', name: 'Lifesteal',         cost: 3, desc: 'Heal 10% of damage dealt', effect: { lifesteal: 0.10 } },
          { id: 'w_f4', name: 'Unstoppable',       cost: 4, desc: '+5 all stats',            effect: { allStats: 5 } },
          { id: 'w_f5', name: 'Berserker God',     cost: 5, desc: '+30% dmg when below 50% HP', effect: { lowHpDmg: 0.30 } },
        ]},
    ]},
  rogue: {
    name: 'Rogue',
    branches: [
      { id: 'shadow', name: 'Shadow', icon: '🌑', desc: 'Stealth & evasion',
        tiers: [
          { id: 'r_s1', name: 'Quick Feet',        cost: 1, desc: '+5 AGI',                  effect: { agi: 5 } },
          { id: 'r_s2', name: 'Evasion',           cost: 2, desc: '10% dodge chance',        effect: { dodgeChance: 10 } },
          { id: 'r_s3', name: 'Shadow Meld',       cost: 3, desc: '20% dodge, +5 AGI',       effect: { dodgeChance: 20, agi: 5 } },
          { id: 'r_s4', name: 'Phantom',           cost: 4, desc: 'First attack always crits', effect: { firstCrit: true } },
          { id: 'r_s5', name: 'Ghost',             cost: 5, desc: '30% dodge, immune to crit', effect: { dodgeChance: 30, critImmune: true } },
        ]},
      { id: 'assassin', name: 'Assassin', icon: '🗡️', desc: 'Lethal strikes',
        tiers: [
          { id: 'r_a1', name: 'Keen Edge',         cost: 1, desc: '+15% crit chance',        effect: { critChance: 15 } },
          { id: 'r_a2', name: 'Poison Blade',      cost: 2, desc: 'Poison: 5 dmg/round',     effect: { poison: 5 } },
          { id: 'r_a3', name: 'Armor Pierce',      cost: 3, desc: 'Ignore 30% armor',        effect: { armorPierce: 0.30 } },
          { id: 'r_a4', name: 'Death Mark',        cost: 4, desc: '+50% crit damage',        effect: { critDmg: 0.50 } },
          { id: 'r_a5', name: 'Execute',           cost: 5, desc: 'Instant kill below 10% HP', effect: { execute: 0.10 } },
        ]},
      { id: 'cunning', name: 'Cunning', icon: '🧠', desc: 'Tricks & utility',
        tiers: [
          { id: 'r_c1', name: 'Pickpocket',        cost: 1, desc: '+20% gold from fights',   effect: { goldPct: 0.20 } },
          { id: 'r_c2', name: 'Lucky',             cost: 2, desc: '+15% drop chance',        effect: { dropBonus: 15 } },
          { id: 'r_c3', name: 'Resourceful',       cost: 3, desc: '+30% XP from fights',     effect: { xpPct: 0.30 } },
          { id: 'r_c4', name: 'Treasure Hunter',   cost: 4, desc: '+30% gold & drops',       effect: { goldPct: 0.30, dropBonus: 15 } },
          { id: 'r_c5', name: 'Master Thief',      cost: 5, desc: 'Double loot chance',      effect: { dropMult: 2 } },
        ]},
    ]},
  tank: {
    name: 'Guardian',
    branches: [
      { id: 'bastion', name: 'Bastion', icon: '🏰', desc: 'Unbreakable defense',
        tiers: [
          { id: 't_b1', name: 'Stone Skin',        cost: 1, desc: '+10 armor',               effect: { armor: 10 } },
          { id: 't_b2', name: 'Endure',            cost: 2, desc: '+10% damage reduction',   effect: { dmgReduction: 0.10 } },
          { id: 't_b3', name: 'Bulwark',           cost: 3, desc: '+100 max HP',             effect: { flatHp: 100 } },
          { id: 't_b4', name: 'Reflect Shield',    cost: 4, desc: 'Reflect 20% damage',      effect: { reflect: 0.20 } },
          { id: 't_b5', name: 'Indestructible',    cost: 5, desc: '+25% HP, +20 armor',      effect: { hpPct: 0.25, armor: 20 } },
        ]},
      { id: 'valor', name: 'Valor', icon: '⚔️', desc: 'Offensive guardian',
        tiers: [
          { id: 't_v1', name: 'Shield Bash',       cost: 1, desc: '+10% damage',             effect: { dmgPct: 0.10 } },
          { id: 't_v2', name: 'Thorns',            cost: 2, desc: 'Attackers take 10 dmg',   effect: { thorns: 10 } },
          { id: 't_v3', name: 'Holy Strike',       cost: 3, desc: '+5 STR, +5 END',          effect: { str: 5, end: 5 } },
          { id: 't_v4', name: 'Retribution',       cost: 4, desc: '+20% dmg when full HP',   effect: { fullHpDmg: 0.20 } },
          { id: 't_v5', name: 'Champion',          cost: 5, desc: '+10 all stats',           effect: { allStats: 10 } },
        ]},
      { id: 'healer', name: 'Healer', icon: '💚', desc: 'Self-sustain',
        tiers: [
          { id: 't_h1', name: 'Regeneration',      cost: 1, desc: 'Heal 3% HP/round',       effect: { regen: 0.03 } },
          { id: 't_h2', name: 'Second Wind',       cost: 2, desc: '+20 max MP',              effect: { flatMp: 20 } },
          { id: 't_h3', name: 'Blessed',           cost: 3, desc: 'Heal 5% HP/round',       effect: { regen: 0.05 } },
          { id: 't_h4', name: 'Divine Shield',     cost: 4, desc: 'Block first hit each fight', effect: { blockFirst: true } },
          { id: 't_h5', name: 'Resurrection',      cost: 5, desc: 'Revive at 50% HP on death', effect: { revive: 0.50 } },
        ]},
    ]},
  mystic: {
    name: 'Mystic',
    branches: [
      { id: 'arcane', name: 'Arcane', icon: '✨', desc: 'Pure magic power',
        tiers: [
          { id: 'm_a1', name: 'Arcane Focus',      cost: 1, desc: '+5 INT',                  effect: { int: 5 } },
          { id: 'm_a2', name: 'Spell Power',       cost: 2, desc: '+20% magic damage',       effect: { magicPct: 0.20 } },
          { id: 'm_a3', name: 'Overcharge',        cost: 3, desc: '+10 INT, +15% crit',      effect: { int: 10, critChance: 15 } },
          { id: 'm_a4', name: 'Meteor',            cost: 4, desc: 'Bonus AoE: INT×2 dmg',    effect: { bonusMagic: 2 } },
          { id: 'm_a5', name: 'Archmage',          cost: 5, desc: '+20 INT, +50% magic dmg', effect: { int: 20, magicPct: 0.50 } },
        ]},
      { id: 'blood', name: 'Blood', icon: '🩸', desc: 'Dark arts',
        tiers: [
          { id: 'm_b1', name: 'Soul Tap',          cost: 1, desc: 'Lifesteal 10%',           effect: { lifesteal: 0.10 } },
          { id: 'm_b2', name: 'Curse',             cost: 2, desc: 'Enemy -10% damage',       effect: { enemyWeaken: 0.10 } },
          { id: 'm_b3', name: 'Dark Pact',         cost: 3, desc: '+20% dmg, -10% max HP',   effect: { dmgPct: 0.20, hpPct: -0.10 } },
          { id: 'm_b4', name: 'Drain Soul',        cost: 4, desc: 'Lifesteal 25%',           effect: { lifesteal: 0.25 } },
          { id: 'm_b5', name: 'Lich Form',         cost: 5, desc: '+30% dmg, lifesteal 15%', effect: { dmgPct: 0.30, lifesteal: 0.15 } },
        ]},
      { id: 'wisdom', name: 'Wisdom', icon: '📚', desc: 'Knowledge & efficiency',
        tiers: [
          { id: 'm_w1', name: 'Meditation',        cost: 1, desc: '+30% MP regen',           effect: { mpRegen: 0.30 } },
          { id: 'm_w2', name: 'Insight',           cost: 2, desc: '+25% XP gain',            effect: { xpPct: 0.25 } },
          { id: 'm_w3', name: 'Efficiency',        cost: 3, desc: '-30% MP cost for skills', effect: { mpCostReduction: 0.30 } },
          { id: 'm_w4', name: 'Enlightenment',     cost: 4, desc: '+10 all stats',           effect: { allStats: 10 } },
          { id: 'm_w5', name: 'Omniscience',       cost: 5, desc: 'Always crit on first 3 rounds', effect: { guaranteeCritRounds: 3 } },
        ]},
    ]},
};

// ─── Mastery System (post-skill-tree progression) ────────────
// After completing the skill tree, players can invest points into repeatable mastery bonuses.
// Each mastery level costs (currentLevel + 1) points. Effects scale linearly.
export const MASTERIES: Record<string, Mastery[]> = {
  warrior: [
    { id: 'mastery_power',    name: 'Power Mastery',    icon: '💪', desc: '+3% damage per level',       effectPer: { dmgPct: 0.03 } },
    { id: 'mastery_vitality', name: 'Vitality Mastery',  icon: '❤️', desc: '+2% max HP per level',      effectPer: { hpPct: 0.02 } },
    { id: 'mastery_fury',     name: 'Fury Mastery',      icon: '🔥', desc: '+2% crit damage per level', effectPer: { critDmg: 0.02 } },
  ],
  rogue: [
    { id: 'mastery_agility',  name: 'Agility Mastery',   icon: '💨', desc: '+3 dodge per level',        effectPer: { dodgeChance: 3 } },
    { id: 'mastery_lethality',name: 'Lethality Mastery',  icon: '🗡️', desc: '+3% crit chance per level', effectPer: { critChance: 3 } },
    { id: 'mastery_fortune',  name: 'Fortune Mastery',    icon: '🍀', desc: '+5% gold & drops per level', effectPer: { goldPct: 0.05, dropBonus: 3 } },
  ],
  tank: [
    { id: 'mastery_armor',    name: 'Armor Mastery',     icon: '🛡️', desc: '+5 armor per level',        effectPer: { armor: 5 } },
    { id: 'mastery_regen',    name: 'Regen Mastery',     icon: '💚', desc: '+1% HP regen per level',    effectPer: { regen: 0.01 } },
    { id: 'mastery_resolve',  name: 'Resolve Mastery',   icon: '🏰', desc: '+2% dmg reduction per level', effectPer: { dmgReduction: 0.02 } },
  ],
  mystic: [
    { id: 'mastery_arcane',   name: 'Arcane Mastery',    icon: '✨', desc: '+5% magic damage per level', effectPer: { magicPct: 0.05 } },
    { id: 'mastery_drain',    name: 'Drain Mastery',     icon: '🩸', desc: '+2% lifesteal per level',   effectPer: { lifesteal: 0.02 } },
    { id: 'mastery_mind',     name: 'Mind Mastery',      icon: '🧠', desc: '+3 INT per level',          effectPer: { int: 3 } },
  ],
};

export function getMasteryCost(currentLevel: number): number { return currentLevel + 1; }

export function getMasteryEffects(u: User): Record<string, number> {
  const effects: Record<string, number> = {};
  const masteries = u.class ? MASTERIES[u.class] : undefined;
  if (!masteries || !u.masteryLevels) return effects;
  for (const m of masteries) {
    const lvl = u.masteryLevels[m.id] || 0;
    if (lvl > 0) {
      for (const [k, v] of Object.entries(m.effectPer)) {
        if (typeof v === 'number') effects[k] = (effects[k] || 0) + v * lvl;
      }
    }
  }
  return effects;
}

export function getMasterySpent(u: User): number {
  if (!u.masteryLevels) return 0;
  let spent = 0;
  for (const lvl of Object.values(u.masteryLevels)) {
    // Cost to reach level N = sum(1..N) = N*(N+1)/2
    spent += lvl * (lvl + 1) / 2;
  }
  return spent;
}

// Get total skill tree effects for a user
export function getSkillTreeEffects(u: User): Record<string, number | boolean> {
  const effects: Record<string, number | boolean> = {};
  const tree = u.class ? SKILL_TREES[u.class] : undefined;
  if (!tree || !u.skillTreeUnlocks) return effects;
  for (const branch of tree.branches) {
    for (const tier of branch.tiers) {
      if (u.skillTreeUnlocks.includes(tier.id)) {
        for (const [k, v] of Object.entries(tier.effect)) {
          if (typeof v === 'number') effects[k] = ((effects[k] as number) || 0) + v;
          else effects[k] = v; // boolean effects
        }
      }
    }
  }
  return effects;
}

export function getSkillPoints(u: User) {
  const treeSpent = (u.skillTreeUnlocks || []).reduce((sum, id) => {
    const tree = u.class ? SKILL_TREES[u.class] : undefined;
    if (!tree) return sum;
    for (const b of tree.branches) for (const t of b.tiers) if (t.id === id) return sum + t.cost;
    return sum;
  }, 0);
  const masterySpent = getMasterySpent(u);
  const total = Math.max(0, (u.level || 1) - 1); // 1 skill point per level after 1
  const spent = treeSpent + masterySpent;
  return { total, spent, available: total - spent, treeSpent, masterySpent };
}
