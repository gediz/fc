// ─── Classes ─────────────────────────────────────────────────
import type { GameClass } from './types.js';

export const CLASSES: Record<string, GameClass> = {
  warrior: { name: 'Warrior', icon: '⚔️', desc: 'Melee powerhouse. Bonus Strength.', bonusStr: 3, bonusAgi: 0, bonusEnd: 1, bonusInt: 0,
    skills: [
      { id: 'power_strike', name: 'Power Strike', icon: '💥', desc: 'Deal 2× damage this round', type: 'active', mpCost: 15, cooldown: 3, effect: { dmgMult: 2.0 } },
      { id: 'war_cry', name: 'War Cry', icon: '📣', desc: '+30% damage for 3 rounds', type: 'active', mpCost: 20, cooldown: 5, effect: { buff: 'str', val: 0.3, rounds: 3 } },
    ],
    passive: { id: 'thick_skin', name: 'Thick Skin', icon: '🛡️', desc: '10% damage reduction', effect: { dmgReduction: 0.10 } },
  },
  rogue: { name: 'Rogue', icon: '🗡️', desc: 'Quick and deadly. Bonus Agility.', bonusStr: 0, bonusAgi: 3, bonusEnd: 0, bonusInt: 1,
    skills: [
      { id: 'backstab', name: 'Backstab', icon: '🗡️', desc: 'Deal 2.5× damage, ignores armor', type: 'active', mpCost: 20, cooldown: 4, effect: { dmgMult: 2.5, ignoreArmor: true } },
      { id: 'shadow_step', name: 'Shadow Step', icon: '👤', desc: 'Dodge next attack', type: 'active', mpCost: 15, cooldown: 3, effect: { dodge: true, rounds: 1 } },
    ],
    passive: { id: 'critical_eye', name: 'Critical Eye', icon: '👁️', desc: '+15% crit chance', effect: { critBonus: 15 } },
  },
  tank: { name: 'Guardian', icon: '🛡️', desc: 'Immovable wall. Bonus Endurance.', bonusStr: 1, bonusAgi: 0, bonusEnd: 3, bonusInt: 0,
    skills: [
      { id: 'shield_wall', name: 'Shield Wall', icon: '🛡️', desc: 'Block 50% damage for 2 rounds', type: 'active', mpCost: 15, cooldown: 4, effect: { dmgReduction: 0.5, rounds: 2 } },
      { id: 'counter', name: 'Counter Strike', icon: '🔄', desc: 'Reflect 30% damage taken', type: 'active', mpCost: 20, cooldown: 5, effect: { reflect: 0.3, rounds: 2 } },
    ],
    passive: { id: 'fortitude', name: 'Fortitude', icon: '❤️', desc: '+15% max HP', effect: { hpBonus: 0.15 } },
  },
  mystic: { name: 'Mystic', icon: '🔮', desc: 'Sees weakness. Bonus Intuition.', bonusStr: 0, bonusAgi: 1, bonusEnd: 0, bonusInt: 3,
    skills: [
      { id: 'arcane_bolt', name: 'Arcane Bolt', icon: '⚡', desc: 'Magic damage = INT × 3', type: 'active', mpCost: 15, cooldown: 2, effect: { magicDmg: 3.0 } },
      { id: 'drain_life', name: 'Drain Life', icon: '💜', desc: 'Deal damage and heal 50% of it', type: 'active', mpCost: 25, cooldown: 4, effect: { dmgMult: 1.5, lifesteal: 0.5 } },
    ],
    passive: { id: 'mana_flow', name: 'Mana Flow', icon: '🔮', desc: '+20% max MP', effect: { mpBonus: 0.20 } },
  },
};
