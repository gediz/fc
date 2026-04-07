// ─── Items Database ──────────────────────────────────────────
import type { Item } from './types.js';

export const ITEMS: Record<string, Item> = {
  // ── Weapons ──
  knife:        { name: 'Knife',            icon: '🔪', slot: 'weapon', minDmg: 2,  maxDmg: 5,  price: 15,   reqLevel: 1,  stats: {},                        rarity: 'common' },
  club:         { name: 'Club',             icon: '🏏', slot: 'weapon', minDmg: 3,  maxDmg: 7,  price: 40,   reqLevel: 2,  stats: { str: 1 },                rarity: 'common' },
  sword:        { name: 'Sword',            icon: '⚔️', slot: 'weapon', minDmg: 5,  maxDmg: 10, price: 100,  reqLevel: 3,  stats: { str: 1, agi: 1 },        rarity: 'common' },
  axe:          { name: 'Battle Axe',       icon: '🪓', slot: 'weapon', minDmg: 7,  maxDmg: 14, price: 200,  reqLevel: 5,  stats: { str: 2 },                rarity: 'uncommon' },
  katana:       { name: 'Katana',           icon: '⚔️', slot: 'weapon', minDmg: 8,  maxDmg: 16, price: 350,  reqLevel: 7,  stats: { str: 2, agi: 2 },        rarity: 'uncommon' },
  warhammer:    { name: 'Warhammer',        icon: '🔨', slot: 'weapon', minDmg: 12, maxDmg: 22, price: 600,  reqLevel: 9,  stats: { str: 4 },                rarity: 'rare' },
  shadow_blade: { name: 'Shadow Blade',     icon: '🗡️', slot: 'weapon', minDmg: 14, maxDmg: 26, price: 1000, reqLevel: 11, stats: { str: 3, agi: 4, int: 2 },rarity: 'rare' },
  doom_axe:     { name: 'Doom Axe',         icon: '⚒️', slot: 'weapon', minDmg: 18, maxDmg: 32, price: 1800, reqLevel: 13, stats: { str: 6, end: 2 },        rarity: 'epic' },
  excalibur:    { name: 'Excalibur',        icon: '🗡️', slot: 'weapon', minDmg: 22, maxDmg: 40, price: 3000, reqLevel: 15, stats: { str: 5, agi: 5, int: 5 },rarity: 'legendary', dropOnly: true },
  // ── Armor ──
  leather:      { name: 'Leather Jacket',   icon: '🧥', slot: 'armor', armor: 2,  price: 30,   reqLevel: 1,  stats: { end: 1 },                rarity: 'common' },
  chainmail:    { name: 'Chainmail',        icon: '🦺', slot: 'armor', armor: 5,  price: 80,   reqLevel: 3,  stats: { end: 2 },                rarity: 'common' },
  plate:        { name: 'Plate Armor',      icon: '🛡️', slot: 'armor', armor: 8,  price: 180,  reqLevel: 5,  stats: { end: 3, str: 1 },        rarity: 'uncommon' },
  dragonscale:  { name: 'Dragonscale',      icon: '🐉', slot: 'armor', armor: 13, price: 500,  reqLevel: 8,  stats: { end: 4, str: 2, agi: 1 },rarity: 'rare' },
  void_plate:   { name: 'Void Plate',       icon: '🌑', slot: 'armor', armor: 18, price: 1200, reqLevel: 11, stats: { end: 6, str: 3 },        rarity: 'epic' },
  titan_armor:  { name: 'Titan Armor',      icon: '⚡', slot: 'armor', armor: 25, price: 3000, reqLevel: 14, stats: { end: 8, str: 4, agi: 2 },rarity: 'legendary', dropOnly: true },
  // ── Helmets ──
  cap:          { name: 'Cap',              icon: '🧢', slot: 'helmet', armor: 1,  price: 20,   reqLevel: 1,  stats: {},                        rarity: 'common' },
  iron_helm:    { name: 'Iron Helm',        icon: '⛑️', slot: 'helmet', armor: 3,  price: 60,   reqLevel: 3,  stats: { end: 1 },                rarity: 'common' },
  crown_helm:   { name: "King's Helm",      icon: '👑', slot: 'helmet', armor: 6,  price: 250,  reqLevel: 6,  stats: { end: 2, int: 2 },        rarity: 'rare' },
  demon_helm:   { name: 'Demon Helm',       icon: '😈', slot: 'helmet', armor: 9,  price: 600,  reqLevel: 10, stats: { end: 3, int: 3, str: 1 },rarity: 'epic' },
  // ── Boots ──
  sandals:      { name: 'Sandals',          icon: '🩴', slot: 'boots', armor: 1,  price: 15,   reqLevel: 1,  stats: { agi: 1 },                rarity: 'common' },
  boots:        { name: 'Leather Boots',    icon: '👢', slot: 'boots', armor: 2,  price: 50,   reqLevel: 3,  stats: { agi: 2 },                rarity: 'common' },
  steel_boots:  { name: 'Steel Boots',      icon: '🥾', slot: 'boots', armor: 4,  price: 160,  reqLevel: 5,  stats: { agi: 2, end: 1 },        rarity: 'uncommon' },
  wind_boots:   { name: 'Wind Boots',       icon: '💨', slot: 'boots', armor: 6,  price: 450,  reqLevel: 9,  stats: { agi: 5, end: 2 },        rarity: 'rare' },
  // ── Rings ──
  iron_ring:    { name: 'Iron Ring',        icon: '💍', slot: 'ring', armor: 0,  price: 40,   reqLevel: 2,  stats: { str: 1, end: 1 },        rarity: 'common' },
  ruby_ring:    { name: 'Ruby Ring',        icon: '💍', slot: 'ring', armor: 0,  price: 150,  reqLevel: 5,  stats: { str: 3, int: 1 },        rarity: 'uncommon' },
  shadow_ring:  { name: 'Shadow Ring',      icon: '💍', slot: 'ring', armor: 0,  price: 500,  reqLevel: 9,  stats: { agi: 3, int: 3 },        rarity: 'rare' },
  // ── Consumables ──
  xp_boost:       { name: 'XP Elixir',          icon: '📗', slot: null, price: 50,   reqLevel: 1,  stats: {}, consumable: true, rarity: 'uncommon', buff: 'xp',      buffVal: 2, buffFights: 5,  desc: '2× XP for 5 fights' },
  xp_boost_lg:    { name: 'XP Elixir+',         icon: '📘', slot: null, price: 200,  reqLevel: 5,  stats: {}, consumable: true, rarity: 'rare',     buff: 'xp',      buffVal: 2, buffFights: 20, desc: '2× XP for 20 fights' },
  gold_boost:     { name: 'Gold Tonic',          icon: '💰', slot: null, price: 50,   reqLevel: 1,  stats: {}, consumable: true, rarity: 'uncommon', buff: 'gold',    buffVal: 2, buffFights: 5,  desc: '2× Gold for 5 fights' },
  gold_boost_lg:  { name: 'Gold Tonic+',         icon: '🏦', slot: null, price: 200,  reqLevel: 5,  stats: {}, consumable: true, rarity: 'rare',     buff: 'gold',    buffVal: 2, buffFights: 20, desc: '2× Gold for 20 fights' },
  drop_boost:     { name: 'Lucky Charm',         icon: '🍀', slot: null, price: 80,   reqLevel: 3,  stats: {}, consumable: true, rarity: 'rare',     buff: 'drop',    buffVal: 25, buffFights: 10, desc: '+25% drop for 10 fights' },
  str_potion:     { name: 'Strength Draught',    icon: '💪', slot: null, price: 30,   reqLevel: 1,  stats: {}, consumable: true, rarity: 'common',   buff: 'str',     buffVal: 5,  buffFights: 3,  desc: '+5 STR for 3 fights' },
  agi_potion:     { name: 'Agility Draught',     icon: '💨', slot: null, price: 30,   reqLevel: 1,  stats: {}, consumable: true, rarity: 'common',   buff: 'agi',     buffVal: 5,  buffFights: 3,  desc: '+5 AGI for 3 fights' },
  end_potion:     { name: 'Endurance Draught',   icon: '🛡️', slot: null, price: 30,   reqLevel: 1,  stats: {}, consumable: true, rarity: 'common',   buff: 'end',     buffVal: 5,  buffFights: 3,  desc: '+5 END for 3 fights' },
  int_potion:     { name: 'Insight Draught',     icon: '🔮', slot: null, price: 30,   reqLevel: 1,  stats: {}, consumable: true, rarity: 'common',   buff: 'int',     buffVal: 5,  buffFights: 3,  desc: '+5 INT for 3 fights' },
  enchant_scroll: { name: 'Enchant Shield',      icon: '📜', slot: null, price: 150,  reqLevel: 5,  stats: {}, consumable: true, rarity: 'epic',     buff: 'enchant', buffVal: 1,  buffFights: 1,  desc: 'Prevents next enchant failure' },
  stat_tome:      { name: 'Tome of Knowledge',   icon: '📕', slot: null, price: 500,  reqLevel: 10, stats: {}, consumable: true, rarity: 'epic',     buff: 'statPts', buffVal: 1,  buffFights: 0,  desc: 'Gain +1 stat point' },
  // ── HP Potions (tiered) ──
  hp_potion:      { name: 'Health Potion',        icon: '❤️', slot: null, price: 15,    reqLevel: 1,  stats: {}, consumable: true, rarity: 'common',   healHp: 30,   desc: 'Restore 30 HP' },
  hp_potion_lg:   { name: 'Large Health Potion',  icon: '💖', slot: null, price: 40,    reqLevel: 5,  stats: {}, consumable: true, rarity: 'uncommon', healHp: 80,   desc: 'Restore 80 HP' },
  hp_potion_gt:   { name: 'Greater Health Potion', icon: '❤️‍🔥', slot: null, price: 120,  reqLevel: 15, stats: {}, consumable: true, rarity: 'rare',    healHp: 300,  desc: 'Restore 300 HP' },
  hp_potion_sup:  { name: 'Superior Health Potion',icon: '🫀', slot: null, price: 400,   reqLevel: 30, stats: {}, consumable: true, rarity: 'epic',     healHp: 1000, desc: 'Restore 1,000 HP' },
  hp_potion_mega: { name: 'Mega Health Potion',   icon: '💗', slot: null, price: 1500,  reqLevel: 60, stats: {}, consumable: true, rarity: 'legendary',healHp: 5000, desc: 'Restore 5,000 HP' },
  // ── MP Potions (tiered) ──
  mp_potion:      { name: 'Mana Potion',          icon: '💙', slot: null, price: 15,    reqLevel: 1,  stats: {}, consumable: true, rarity: 'common',   healMp: 25,   desc: 'Restore 25 MP' },
  mp_potion_lg:   { name: 'Large Mana Potion',    icon: '💎', slot: null, price: 40,    reqLevel: 5,  stats: {}, consumable: true, rarity: 'uncommon', healMp: 60,   desc: 'Restore 60 MP' },
  mp_potion_gt:   { name: 'Greater Mana Potion',  icon: '🔷', slot: null, price: 120,   reqLevel: 15, stats: {}, consumable: true, rarity: 'rare',     healMp: 150,  desc: 'Restore 150 MP' },
  mp_potion_sup:  { name: 'Superior Mana Potion', icon: '🧿', slot: null, price: 400,   reqLevel: 30, stats: {}, consumable: true, rarity: 'epic',     healMp: 500,  desc: 'Restore 500 MP' },
  // ── Full Restores ──
  full_restore:   { name: 'Full Restore',         icon: '🌟', slot: null, price: 100,   reqLevel: 8,  stats: {}, consumable: true, rarity: 'rare',     healHp: 999, healMp: 999, desc: 'Fully restore HP and MP' },
  full_restore_lg:{ name: 'Greater Full Restore',  icon: '⭐', slot: null, price: 500,  reqLevel: 25, stats: {}, consumable: true, rarity: 'epic',     healHp: 9999, healMp: 9999, desc: 'Fully restore HP and MP' },
  mega_xp:        { name: 'Mega XP Crystal',     icon: '💎', slot: null, price: 1000, reqLevel: 15, stats: {}, consumable: true, rarity: 'legendary',buff: 'xp',      buffVal: 3, buffFights: 10, desc: '3× XP for 10 fights' },
  // ── Backpacks ──
  small_bag:      { name: 'Small Bag',          icon: '👝', slot: 'backpack', price: 50,   reqLevel: 1,  stats: {}, rarity: 'common',   extraSlots: 5,  desc: '+5 inventory slots' },
  leather_bag:    { name: 'Leather Satchel',    icon: '🎒', slot: 'backpack', price: 200,  reqLevel: 5,  stats: {}, rarity: 'uncommon', extraSlots: 10, desc: '+10 inventory slots' },
  adventurer_bag: { name: 'Adventurer Pack',    icon: '🎒', slot: 'backpack', price: 500,  reqLevel: 10, stats: {}, rarity: 'rare',     extraSlots: 15, desc: '+15 inventory slots' },
  merchant_bag:   { name: 'Merchant Caravan',   icon: '🧳', slot: 'backpack', price: 1500, reqLevel: 20, stats: {}, rarity: 'epic',     extraSlots: 25, desc: '+25 inventory slots' },
  void_bag:       { name: 'Void Pouch',         icon: '🌀', slot: 'backpack', price: 5000, reqLevel: 40, stats: {}, rarity: 'legendary',extraSlots: 40, desc: '+40 inventory slots' },
  // ── PvP-Exclusive Gear (only from PvP wins) ──
  pvp_sword:      { name: 'Gladiator Blade',    icon: '⚔️', slot: 'weapon',   minDmg: 10, maxDmg: 18, price: 0, reqLevel: 5,  stats: { str: 3, agi: 2 },        rarity: 'rare',     pvpOnly: true, desc: 'Earned in the arena' },
  pvp_axe:        { name: 'Champion\'s Axe',    icon: '🪓', slot: 'weapon',   minDmg: 15, maxDmg: 28, price: 0, reqLevel: 10, stats: { str: 5, agi: 3 },        rarity: 'epic',     pvpOnly: true, desc: 'A champion\'s weapon' },
  pvp_blade:      { name: 'Warlord\'s Edge',    icon: '🗡️', slot: 'weapon',   minDmg: 22, maxDmg: 38, price: 0, reqLevel: 20, stats: { str: 8, agi: 5, int: 3 },rarity: 'legendary',pvpOnly: true, desc: 'Feared by all challengers' },
  pvp_armor:      { name: 'Arena Plate',         icon: '🛡️', slot: 'armor',    armor: 10, price: 0, reqLevel: 5,  stats: { end: 3, str: 2 },        rarity: 'rare',     pvpOnly: true, desc: 'Battle-hardened armor' },
  pvp_heavy:      { name: 'Conqueror Armor',     icon: '🛡️', slot: 'armor',    armor: 18, price: 0, reqLevel: 15, stats: { end: 6, str: 3, agi: 2 },rarity: 'epic',     pvpOnly: true, desc: 'Forged in victory' },
  pvp_helm:       { name: 'Victor\'s Crown',     icon: '👑', slot: 'helmet',   armor: 7,  price: 0, reqLevel: 10, stats: { end: 3, int: 3 },        rarity: 'epic',     pvpOnly: true, desc: 'Crown of the arena champion' },
  pvp_boots:      { name: 'Duelist Greaves',     icon: '🥾', slot: 'boots',    armor: 5,  price: 0, reqLevel: 8,  stats: { agi: 4, end: 2 },        rarity: 'rare',     pvpOnly: true, desc: 'Quick footwork saves lives' },
  pvp_ring:       { name: 'Ring of Dominance',   icon: '💍', slot: 'ring',     armor: 0,  price: 0, reqLevel: 15, stats: { str: 4, agi: 4, int: 4, end: 4 }, rarity: 'legendary', pvpOnly: true, desc: 'Symbol of PvP mastery' },
  // ── Class-Specific Weapons ──
  warrior_blade:  { name: 'Warrior\'s Greatsword',icon: '⚔️', slot: 'weapon', minDmg: 12, maxDmg: 22, price: 400, reqLevel: 8, stats: { str: 5, end: 2 }, rarity: 'rare', classReq: 'warrior', desc: 'Warriors only. Heavy and devastating.' },
  rogue_daggers:  { name: 'Twin Shadowblades',   icon: '🗡️', slot: 'weapon', minDmg: 8,  maxDmg: 18, price: 400, reqLevel: 8, stats: { agi: 5, int: 2 }, rarity: 'rare', classReq: 'rogue', desc: 'Rogues only. Fast and precise.' },
  tank_mace:      { name: 'Guardian\'s Mace',    icon: '🔨', slot: 'weapon', minDmg: 10, maxDmg: 16, price: 400, reqLevel: 8, stats: { str: 3, end: 4 }, rarity: 'rare', classReq: 'tank', desc: 'Guardians only. Sturdy and reliable.' },
  mystic_staff:   { name: 'Arcane Focus Staff',  icon: '🔮', slot: 'weapon', minDmg: 6,  maxDmg: 20, price: 400, reqLevel: 8, stats: { int: 6, agi: 1 }, rarity: 'rare', classReq: 'mystic', desc: 'Mystics only. Channels arcane power.' },
  // ── Class-Specific Armor ──
  warrior_plate:  { name: 'Berserker Plate',     icon: '🛡️', slot: 'armor',  armor: 12, price: 500, reqLevel: 12, stats: { str: 4, end: 4 }, rarity: 'epic', classReq: 'warrior', desc: 'Warriors only. Rage-forged steel.' },
  rogue_cloak:    { name: 'Shadow Cloak',         icon: '🧥', slot: 'armor',  armor: 6,  price: 500, reqLevel: 12, stats: { agi: 6, int: 2 }, rarity: 'epic', classReq: 'rogue', desc: 'Rogues only. Blends with darkness.' },
  tank_fortress:  { name: 'Fortress Plate',       icon: '🛡️', slot: 'armor',  armor: 18, price: 500, reqLevel: 12, stats: { end: 6, str: 2 }, rarity: 'epic', classReq: 'tank', desc: 'Guardians only. Immovable defense.' },
  mystic_robes:   { name: 'Archmage Robes',       icon: '🧥', slot: 'armor',  armor: 4,  price: 500, reqLevel: 12, stats: { int: 6, end: 2 }, rarity: 'epic', classReq: 'mystic', desc: 'Mystics only. Woven with mana threads.' },
  // ── Class-Specific Tier 2 (Lv 20) ──
  warrior_fury:   { name: 'Fury Cleaver',        icon: '⚔️', slot: 'weapon', minDmg: 20, maxDmg: 36, price: 1200, reqLevel: 20, stats: { str: 8, end: 3, agi: 2 }, rarity: 'epic', classReq: 'warrior', desc: 'Warriors only. Burns with inner rage.' },
  rogue_venom:    { name: 'Venomfang Daggers',   icon: '🗡️', slot: 'weapon', minDmg: 14, maxDmg: 30, price: 1200, reqLevel: 20, stats: { agi: 8, int: 3, str: 2 }, rarity: 'epic', classReq: 'rogue', desc: 'Rogues only. Dripping with lethal poison.' },
  tank_bastion:   { name: 'Bastion Warhammer',   icon: '🔨', slot: 'weapon', minDmg: 16, maxDmg: 28, price: 1200, reqLevel: 20, stats: { str: 5, end: 6 }, rarity: 'epic', classReq: 'tank', desc: 'Guardians only. Each blow echoes like thunder.' },
  mystic_void:    { name: 'Void Conduit',        icon: '🔮', slot: 'weapon', minDmg: 10, maxDmg: 34, price: 1200, reqLevel: 20, stats: { int: 10, agi: 2 }, rarity: 'epic', classReq: 'mystic', desc: 'Mystics only. Channels energy from the void.' },
  warrior_wrath:  { name: 'Wrath Warplate',      icon: '🛡️', slot: 'armor',  armor: 20, price: 1500, reqLevel: 20, stats: { str: 6, end: 6 }, rarity: 'epic', classReq: 'warrior', desc: 'Warriors only. Forged in eternal fury.' },
  rogue_shade:    { name: 'Shade Vestments',     icon: '🧥', slot: 'armor',  armor: 10, price: 1500, reqLevel: 20, stats: { agi: 8, int: 4 }, rarity: 'epic', classReq: 'rogue', desc: 'Rogues only. Light as a whisper.' },
  tank_aegis:     { name: 'Aegis Fortress',      icon: '🛡️', slot: 'armor',  armor: 28, price: 1500, reqLevel: 20, stats: { end: 10, str: 3 }, rarity: 'epic', classReq: 'tank', desc: 'Guardians only. A walking castle.' },
  mystic_astral:  { name: 'Astral Vestments',    icon: '🧥', slot: 'armor',  armor: 8,  price: 1500, reqLevel: 20, stats: { int: 10, end: 3 }, rarity: 'epic', classReq: 'mystic', desc: 'Mystics only. Shimmers with starlight.' },
  // ── Class-Specific Tier 3 (Lv 40) ──
  warrior_god:    { name: 'Godslayer Blade',     icon: '⚔️', slot: 'weapon', minDmg: 40, maxDmg: 72, price: 5000, reqLevel: 40, stats: { str: 15, end: 5, agi: 5 }, rarity: 'legendary', classReq: 'warrior', desc: 'Warriors only. Slays gods and men alike.' },
  rogue_death:    { name: 'Deathwhisper Blades', icon: '🗡️', slot: 'weapon', minDmg: 30, maxDmg: 65, price: 5000, reqLevel: 40, stats: { agi: 15, int: 5, str: 5 }, rarity: 'legendary', classReq: 'rogue', desc: 'Rogues only. Death itself holds these blades.' },
  tank_eternal:   { name: 'Eternal Bulwark',     icon: '🔨', slot: 'weapon', minDmg: 35, maxDmg: 58, price: 5000, reqLevel: 40, stats: { str: 10, end: 12 }, rarity: 'legendary', classReq: 'tank', desc: 'Guardians only. Immovable as time itself.' },
  mystic_cosmos:  { name: 'Staff of the Cosmos', icon: '🔮', slot: 'weapon', minDmg: 22, maxDmg: 70, price: 5000, reqLevel: 40, stats: { int: 20, agi: 5 }, rarity: 'legendary', classReq: 'mystic', desc: 'Mystics only. Commands the fabric of reality.' },
};

// Rarity colors for client
export const RARITY = { common: '#ccc', uncommon: '#3a3', rare: '#48f', epic: '#a3e', legendary: '#fc3' };

// ─── Procedural Item Generator (Lv 15+) ─────────────────────

const TIER_NAMES = {
  weapon: [
    ['Rusty','Iron','Steel','Mithril','Adamant','Obsidian','Celestial','Void','Astral','Eternal','Divine'],
    ['Dagger','Blade','Longsword','Claymore','Greatsword','Scythe','Halberd','Glaive','Warblade','Godslayer']
  ],
  armor: [
    ['Padded','Studded','Reinforced','Runic','Enchanted','Mythic','Celestial','Void','Astral','Eternal','Divine'],
    ['Vest','Hauberk','Cuirass','Breastplate','Chestguard','Warplate','Fortress','Aegis','Bulwark','Bastion']
  ],
  helmet: [
    ['Worn','Tempered','Plated','Runic','Enchanted','Mythic','Celestial','Void','Astral','Eternal','Divine'],
    ['Cap','Coif','Helm','Greathelm','Crown','Visor','Warhelm','Diadem','Circlet','Halo']
  ],
  boots: [
    ['Worn','Padded','Hardened','Swift','Enchanted','Mythic','Celestial','Void','Astral','Eternal','Divine'],
    ['Shoes','Treads','Greaves','Sabatons','Striders','Windwalkers','Stormboots','Voidsteps','Skyrunners','Godsteps']
  ],
  ring: [
    ['Copper','Silver','Gold','Platinum','Diamond','Sapphire','Emerald','Ruby','Void','Astral','Celestial'],
    ['Band','Ring','Signet','Seal','Loop','Circle','Nexus','Core','Heart','Soul']
  ],
};
const SLOT_ICONS = { weapon: ['🗡️','⚔️','🔨','🪓','⚒️'], armor: ['🦺','🛡️','🐉','🌑','⚡'], helmet: ['⛑️','👑','😈','🌟','💎'], boots: ['👢','🥾','💨','🌪️','⚡'], ring: ['💍','💎','🔮','✨','🌟'] };

type SlotType = 'weapon' | 'armor' | 'helmet' | 'boots' | 'ring';

function generateItem(slot: SlotType, tier: number): Item {
  // tier 0 = level ~15, tier 1 = ~20, etc.  Each tier ~5 levels
  const level = 15 + tier * 5;
  const names = TIER_NAMES[slot];
  const prefixIdx = Math.min(tier, names[0].length - 1);
  const suffixIdx = Math.min(tier, names[1].length - 1);
  const name = `${names[0][prefixIdx]} ${names[1][suffixIdx]}`;
  const icons = SLOT_ICONS[slot];
  const icon = icons[Math.min(tier, icons.length - 1)];
  const rarities = ['uncommon','uncommon','rare','rare','epic','epic','legendary','legendary','legendary','legendary'];
  const rarity = rarities[Math.min(tier, rarities.length - 1)] || 'legendary';
  const price = Math.floor(500 + 150 * Math.pow(tier, 2.2));

  if (slot === 'weapon') {
    const minD = Math.floor(18 + tier * 8);
    const maxD = Math.floor(34 + tier * 14);
    const s = Math.floor(5 + tier * 2.5);
    return { name, icon, slot, rarity, reqLevel: level, price, minDmg: minD, maxDmg: maxD, stats: { str: s, agi: Math.floor(s * 0.6), int: Math.floor(s * 0.3) } };
  }
  if (slot === 'ring') {
    const s = Math.floor(4 + tier * 2);
    return { name, icon, slot, rarity, reqLevel: level, price, armor: 0, stats: { str: s, agi: s, int: s, end: Math.floor(s * 0.6) } };
  }
  const arm = Math.floor((slot === 'armor' ? 22 : slot === 'helmet' ? 9 : 6) + tier * (slot === 'armor' ? 8 : slot === 'helmet' ? 3 : 2));
  const endB = Math.floor(6 + tier * 2.5);
  const stats: Record<string, number> = { end: endB };
  if (slot === 'armor') { stats.str = Math.floor(endB * 0.5); stats.agi = Math.floor(endB * 0.3); }
  if (slot === 'boots') { stats.agi = endB; stats.end = Math.floor(endB * 0.5); }
  if (slot === 'helmet') { stats.int = Math.floor(endB * 0.6); }
  return { name, icon, slot, rarity, reqLevel: level, price, armor: arm, stats };
}

// Generate items for tiers 0-55 (levels 15-290)
for (let tier = 0; tier <= 55; tier++) {
  for (const slot of ['weapon', 'armor', 'helmet', 'boots', 'ring'] as SlotType[]) {
    const id = `gen_${slot}_t${tier}`;
    const item = generateItem(slot, tier);
    if (tier >= 40) item.dropOnly = true; // top tiers are drop-only
    ITEMS[id] = item;
  }
}
