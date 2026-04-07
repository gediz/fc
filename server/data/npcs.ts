// ─── NPC Loot Tables ─────────────────────────────────────────
// Each NPC has a dropChance (0-100) and a lootPool of item IDs
import type { NPC } from './types.js';

export const NPCS: NPC[] = [
  // ── Tier 1: Streets (Lv 1-3) ──
  { id: 'rat',        name: 'Sewer Rat',     icon: '🐀', level: 1,  str: 2,  agi: 4,  end: 2,  int: 1,  xp: 10,  gold: 3,   dropChance: 5,  loot: ['cap'], lore: 'A vicious rodent from the sewers. Don\'t underestimate it.' },
  { id: 'vagabond',   name: 'Vagabond',      icon: '🧟', level: 1,  str: 3,  agi: 3,  end: 3,  int: 2,  xp: 15,  gold: 5,   dropChance: 8,  loot: ['cap', 'sandals'], lore: 'A wanderer who lost everything. Fights out of desperation.' },
  { id: 'hooligan',   name: 'Hooligan',      icon: '😠', level: 2,  str: 5,  agi: 4,  end: 4,  int: 3,  xp: 25,  gold: 10,  dropChance: 10, loot: ['knife', 'leather', 'iron_ring'], lore: 'Street tough looking for trouble. And he found you.' },
  { id: 'mugger',     name: 'Mugger',        icon: '🔪', level: 2,  str: 4,  agi: 6,  end: 3,  int: 3,  xp: 28,  gold: 12,  dropChance: 10, loot: ['knife', 'sandals'], lore: 'Quick hands, empty morals. Your gold or your life.' },
  { id: 'thief',      name: 'Thief',         icon: '🦹', level: 3,  str: 5,  agi: 7,  end: 4,  int: 5,  xp: 40,  gold: 18,  dropChance: 12, loot: ['club', 'boots', 'iron_ring'], lore: 'A cunning rogue who steals from fighters. Time to teach him a lesson.' },
  // ── Tier 2: Back Alleys (Lv 4-6) ──
  { id: 'bruiser',    name: 'Bruiser',       icon: '👊', level: 4,  str: 9,  agi: 5,  end: 7,  int: 3,  xp: 55,  gold: 25,  dropChance: 12, loot: ['sword', 'chainmail', 'iron_helm'], lore: 'A wall of muscle. Hits like a truck, thinks like one too.' },
  { id: 'bandit',     name: 'Bandit',        icon: '🥷', level: 5,  str: 8,  agi: 8,  end: 8,  int: 6,  xp: 80,  gold: 35,  dropChance: 14, loot: ['axe', 'plate', 'ruby_ring'], lore: 'Leader of a small gang. Dangerous and unpredictable.' },
  { id: 'pitfighter', name: 'Pit Fighter',   icon: '🤼', level: 5,  str: 10, agi: 6,  end: 9,  int: 4,  xp: 85,  gold: 38,  dropChance: 13, loot: ['sword', 'chainmail', 'iron_helm'], lore: 'Born in the fighting pits. Violence is all he knows.' },
  { id: 'smuggler',   name: 'Smuggler',      icon: '🕵️', level: 6,  str: 7,  agi: 10, end: 7,  int: 8,  xp: 100, gold: 45,  dropChance: 14, loot: ['katana', 'boots', 'ruby_ring'], lore: 'Deals in forbidden goods. Fast enough to outrun the law.' },
  // ── Tier 3: Underground (Lv 7-9) ──
  { id: 'mercenary',  name: 'Mercenary',     icon: '💂', level: 7,  str: 12, agi: 10, end: 10, int: 8,  xp: 120, gold: 55,  dropChance: 14, loot: ['katana', 'steel_boots', 'ruby_ring'], lore: 'A professional killer. Nothing personal — it\'s just business.' },
  { id: 'assassin',   name: 'Assassin',      icon: '🗡️', level: 8,  str: 10, agi: 14, end: 8,  int: 10, xp: 150, gold: 65,  dropChance: 15, loot: ['katana', 'wind_boots', 'shadow_ring'], lore: 'Strikes from the shadows. You won\'t see the blade coming.' },
  { id: 'berserker',  name: 'Berserker',     icon: '🤬', level: 9,  str: 16, agi: 10, end: 14, int: 7,  xp: 180, gold: 80,  dropChance: 15, loot: ['warhammer', 'dragonscale', 'wind_boots', 'shadow_ring'], lore: 'Fueled by pure rage. The more you hurt him, the harder he hits.' },
  { id: 'warlock',    name: 'Warlock',       icon: '🧛', level: 9,  str: 10, agi: 10, end: 10, int: 16, xp: 190, gold: 85,  dropChance: 16, loot: ['shadow_ring', 'demon_helm', 'crown_helm'], lore: 'Dark magic flows through his veins. Beware his hexes.' },
  // ── Tier 4: Arena Elite (Lv 10-12) ──
  { id: 'gladiator',  name: 'Gladiator',     icon: '⚔️', level: 10, str: 16, agi: 13, end: 14, int: 10, xp: 230, gold: 100, dropChance: 16, loot: ['shadow_blade', 'dragonscale', 'demon_helm'], lore: 'Arena legend. Crowds cheer his name. Will you silence them?' },
  { id: 'champion',   name: 'Champion',      icon: '🏆', level: 11, str: 18, agi: 15, end: 16, int: 12, xp: 280, gold: 120, dropChance: 16, loot: ['shadow_blade', 'void_plate', 'demon_helm', 'shadow_ring'], lore: 'Undefeated for a hundred fights. Your biggest test yet.' },
  { id: 'warlord',    name: 'Warlord',       icon: '👹', level: 12, str: 20, agi: 14, end: 18, int: 11, xp: 340, gold: 150, dropChance: 17, loot: ['doom_axe', 'void_plate', 'wind_boots'], lore: 'Commands an army of the damned. His power is overwhelming.' },
  // ── Tier 5: Legends (Lv 13-15) ──
  { id: 'battlemage', name: 'Battle Mage',   icon: '🧙', level: 13, str: 14, agi: 14, end: 14, int: 20, xp: 400, gold: 180, dropChance: 18, loot: ['doom_axe', 'void_plate', 'demon_helm'], lore: 'A mage who traded knowledge for power. Spells AND swords.' },
  { id: 'executioner',name: 'Executioner',   icon: '⚰️', level: 14, str: 22, agi: 16, end: 20, int: 12, xp: 480, gold: 220, dropChance: 19, loot: ['doom_axe', 'titan_armor', 'excalibur'], lore: 'The last face many fighters see. His axe never misses.' },
  { id: 'darkknight', name: 'Dark Knight',   icon: '🖤', level: 15, str: 22, agi: 18, end: 22, int: 15, xp: 550, gold: 250, dropChance: 20, loot: ['excalibur', 'titan_armor', 'doom_axe'], lore: 'Consumed by darkness. Once a hero, now a nightmare.' },
  // ── Tier 6: Mythic Bosses (Lv 17-20) ──
  { id: 'dragon',     name: 'Ancient Dragon', icon: '🐲', level: 17, str: 26, agi: 20, end: 28, int: 18, xp: 750,  gold: 400, dropChance: 25, loot: ['excalibur', 'titan_armor'], lore: 'A wyrm older than civilization. Its fire melts steel.' },
  { id: 'lich',       name: 'Lich King',      icon: '💀', level: 18, str: 18, agi: 18, end: 20, int: 30, xp: 900,  gold: 500, dropChance: 25, loot: ['excalibur', 'titan_armor', 'doom_axe'], lore: 'Defied death itself. His phylactery keeps him eternal.' },
  { id: 'demon_lord', name: 'Demon Lord',     icon: '👿', level: 20, str: 30, agi: 24, end: 30, int: 24, xp: 1200, gold: 700, dropChance: 30, loot: ['excalibur', 'titan_armor'], lore: 'Lord of the abyss. Defeating him is the ultimate test.' },
];

// ─── Procedural NPC Generator (Lv 22-300) ────────────────────

const NPC_TEMPLATES = [
  { prefix: 'Cursed',     icons: ['👻','💀','☠️'], bias: 'int', lore: ['Bound by ancient hexes.','A soul that refused to pass on.','Twisted by forbidden magic.'] },
  { prefix: 'Iron',       icons: ['🤖','⚙️','🔩'], bias: 'end', lore: ['Forged in the deepest foundries.','More machine than man.','Rust hides deadly strength.'] },
  { prefix: 'Shadow',     icons: ['🌑','🦇','🕷️'], bias: 'agi', lore: ['Moves without a sound.','Born where light dares not reach.','Your shadow fights back.'] },
  { prefix: 'Blood',      icons: ['🩸','🧛','😈'], bias: 'str', lore: ['Feeds on the fallen.','Crimson rage given form.','Every wound makes it stronger.'] },
  { prefix: 'Storm',      icons: ['⛈️','🌪️','🌩️'], bias: 'agi', lore: ['Carries the fury of thunder.','Strikes like lightning.','The winds obey its will.'] },
  { prefix: 'Bone',       icons: ['🦴','💀','☠️'], bias: 'end', lore: ['Risen from the grave.','Death could not hold it.','Rattles with every step.'] },
  { prefix: 'Flame',      icons: ['🔥','🌋','☄️'], bias: 'str', lore: ['Burns hotter than hellfire.','Ash and cinders trail behind.','The ground melts beneath it.'] },
  { prefix: 'Frost',      icons: ['🧊','❄️','🌨️'], bias: 'int', lore: ['Cold enough to freeze your soul.','Winter incarnate.','Its touch means frostbite.'] },
  { prefix: 'Void',       icons: ['🌀','🕳️','🌑'], bias: 'int', lore: ['Exists between dimensions.','Reality warps in its presence.','Stare too long and lose yourself.'] },
  { prefix: 'War',        icons: ['⚔️','🗡️','🛡️'], bias: 'str', lore: ['Lives for the battlefield.','Scarred by a thousand fights.','War is the only language it speaks.'] },
  { prefix: 'Toxic',      icons: ['🧪','☣️','🦠'], bias: 'int', lore: ['Its very breath is poison.','Corruption seeps from every pore.','Do not let it touch you.'] },
  { prefix: 'Stone',      icons: ['🪨','⛰️','🏔️'], bias: 'end', lore: ['Immovable as a mountain.','Carved from living rock.','Your blades will dull on its hide.'] },
  { prefix: 'Wild',       icons: ['🐺','🦁','🐗'], bias: 'str', lore: ['Untamed primal fury.','The apex predator of the wastes.','Instinct sharper than any blade.'] },
  { prefix: 'Dark',       icons: ['🌘','👤','🦅'], bias: 'agi', lore: ['Cloaked in eternal twilight.','Unseen until the killing blow.','Even moonlight avoids it.'] },
  { prefix: 'Crystal',    icons: ['💎','🔮','✨'], bias: 'int', lore: ['Refracts your attacks.','Power crystallized into form.','Beautiful and deadly.'] },
];
const NPC_SUFFIXES = ['Grunt','Brute','Fighter','Warrior','Sentinel','Knight','Captain','Commander','Lord','Warlord','Overlord','Titan','Deity','God'];

// Generate 2 NPCs per level for variety
for (let lvl = 22; lvl <= 300; lvl += 2) {
  const npcsPerLevel = lvl <= 50 ? 2 : 1; // more variety at lower levels
  for (let v = 0; v < npcsPerLevel; v++) {
  const tierIdx = Math.floor((lvl - 22) / 6 + v);
  const template = NPC_TEMPLATES[tierIdx % NPC_TEMPLATES.length];
  const suffixIdx = Math.min(Math.floor((lvl - 22) / 8), NPC_SUFFIXES.length - 1);
  const name = `${template.prefix} ${NPC_SUFFIXES[suffixIdx]}`;
  const icon = template.icons[(lvl + v) % template.icons.length];
  const scale = 1 + (lvl - 1) * 0.15;
  const baseStat = Math.floor(8 * scale);
  const biasBonus = Math.floor(baseStat * 0.3);
  const str = baseStat + (template.bias === 'str' ? biasBonus : 0);
  const agi = baseStat + (template.bias === 'agi' ? biasBonus : 0);
  const end = baseStat + (template.bias === 'end' ? biasBonus : 0);
  const int = baseStat + (template.bias === 'int' ? biasBonus : 0);
  const xp = Math.floor(100 * Math.pow(lvl, 1.3));
  const gold = Math.floor(50 * Math.pow(lvl, 1.1));
  // Loot from generated items at appropriate tier
  const itemTier = Math.max(0, Math.min(55, Math.floor((lvl - 15) / 5)));
  const lootPool = ['weapon','armor','helmet','boots','ring'].map(s => `gen_${s}_t${itemTier}`);
  if (itemTier > 0) lootPool.push(...['weapon','armor'].map(s => `gen_${s}_t${itemTier-1}`));
  // Drop consumables too
  if (lvl >= 10) lootPool.push('xp_boost', 'gold_boost');
  if (lvl >= 20) lootPool.push('drop_boost', 'enchant_scroll');
  if (lvl >= 40) lootPool.push('xp_boost_lg', 'gold_boost_lg');
  if (lvl >= 60) lootPool.push('stat_tome', 'mega_xp');

  const loreText = template.lore[(lvl + v) % template.lore.length];
  NPCS.push({
    id: `npc_${lvl}_${v}`, name, icon, level: lvl, str, agi, end, int,
    xp, gold, dropChance: Math.min(12 + Math.floor(lvl / 5), 35), loot: lootPool,
    lore: loreText,
  });
  } // end variant loop

  // Elite boss every 10 levels — 3x stats, 5x rewards
  if (lvl % 10 === 0 && lvl >= 30) {
    const bossTemplate = NPC_TEMPLATES[(lvl / 10) % NPC_TEMPLATES.length];
    const bossNames = ['Guardian','Warden','Overlord','Destroyer','Devourer','Annihilator','Colossus','Leviathan'];
    const bossName = `${bossTemplate.prefix} ${bossNames[Math.floor((lvl - 30) / 10) % bossNames.length]}`;
    const bScale = 1 + lvl * 0.15;
    const bStat = Math.floor(8 * bScale * 3);
    const bossLore = [
      'A titan that commands legions. Only the bravest dare challenge it.',
      'Its power warps the very air around it. Approach with caution.',
      'Legends speak of this creature. Most think it a myth.',
      'The ground trembles at its approach. Flee or fight — choose wisely.',
      'Ancient beyond reckoning. It has seen empires rise and fall.',
      'The ultimate test of strength. Victory brings glory eternal.',
      'Its roar alone has felled lesser warriors.',
      'Bound in chains of power. Each link forged from a fallen hero.',
    ];
    NPCS.push({
      id: `boss_${lvl}`, name: `👑 ${bossName}`, icon: '👑', level: lvl,
      str: bStat, agi: bStat, end: Math.floor(bStat * 1.5), int: Math.floor(bStat * 0.8),
      xp: Math.floor(100 * Math.pow(lvl, 1.3) * 5),
      gold: Math.floor(50 * Math.pow(lvl, 1.1) * 5),
      dropChance: Math.min(50, 20 + Math.floor(lvl / 10)),
      loot: ['weapon','armor','helmet','boots','ring'].map(s => `gen_${s}_t${Math.min(55, Math.floor((lvl-15)/5))}`),
      elite: true,
      lore: bossLore[Math.floor((lvl - 30) / 10) % bossLore.length],
    });
  }
}
