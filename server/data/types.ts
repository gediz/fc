// ─── Shared Types ────────────────────────────────────────────

export interface User {
  // Auth
  password?: string;
  needsClass?: boolean;

  // Core stats
  level?: number;
  xp?: number;
  gold?: number;
  prestige?: number;
  statPoints?: number;
  baseStr?: number;
  baseAgi?: number;
  baseEnd?: number;
  baseInt?: number;
  class?: string;

  // HP/MP
  currentHp?: number;
  currentMp?: number;

  // Equipment & inventory
  equipment?: Record<string, string | null>;
  inventory?: (string | null)[];
  durability?: Record<string, number>;
  enchantLevels?: Record<string, number>;
  itemInstances?: Record<string, ItemInstance>;

  // Combat
  kills?: number;
  deaths?: number;
  pvpWins?: number;
  pvpLosses?: number;
  pvpRating?: number;
  soulSickness?: number;
  dropPenalty?: number;
  lastRestTime?: number;

  // Progression
  achievements?: string[];
  skillTreeUnlocks?: string[];
  masteryLevels?: Record<string, number>;
  quests?: QuestProgress[];
  activeTitle?: string;
  unlockedTitles?: string[];

  // Buffs
  buffs?: Record<string, { val: number; fights: number; source?: string }>;

  // Settings
  autoPotions?: boolean;
  autoPotHpPct?: number;
  autoPotMpPct?: number;
  autoBuyPotions?: boolean;
  autoBuyHpPot?: string;
  autoBuyMpPot?: string;
  profanityFilter?: boolean;

  // Social
  friends?: string[];
  friendRequests?: string[];
  blocked?: string[];

  // Avatar
  avatar?: {
    skinTone?: number;
    hairStyle?: number;
    hairColor?: number;
    accessory?: number;
  };

  // Dungeon tracking
  dungeonRuns?: Record<string, number>;

  // Season
  seasonPoints?: number;
  seasonId?: string;

  // Fragments (crafting)
  fragments?: number;

  // Rare drops counter
  rareDrops?: number;

  // Dungeon tracking
  dungeonsCleared?: number;
  totalEnchants?: number;

  // Quest tracking
  completedQuests?: string[];

  // Online tracking
  lastOnline?: number;
  showOnlineStatus?: boolean;

  // Daily tracking
  lastDaily?: string;
  dailyStreak?: number;
  lastDungeonDate?: string;
  dailyDungeonRuns?: number;

  // Season history
  lastSeasonId?: string;
  lastSeasonPoints?: number;

  // Combat history
  combatHistory?: any[];
}

/**
 * ResolvedUser: A user with all fields guaranteed present (with defaults).
 * Use this for function parameters that operate on loaded user data.
 * The `users` store holds `User` (from JSON), but after loading we
 * always ensure defaults via `resolveUser()`.
 */
export interface ResolvedUser {
  // Auth
  password: string;
  needsClass: boolean;

  // Core stats
  level: number;
  xp: number;
  gold: number;
  prestige: number;
  statPoints: number;
  baseStr: number;
  baseAgi: number;
  baseEnd: number;
  baseInt: number;
  class: string;

  // HP/MP
  currentHp: number;
  currentMp: number;

  // Equipment & inventory
  equipment: Record<string, string | null>;
  inventory: (string | null)[];
  durability: Record<string, number>;
  enchantLevels: Record<string, number>;
  itemInstances: Record<string, ItemInstance>;

  // Combat
  kills: number;
  deaths: number;
  pvpWins: number;
  pvpLosses: number;
  pvpRating: number;
  soulSickness: number;
  dropPenalty: number;
  lastRestTime: number;

  // Progression
  achievements: string[];
  skillTreeUnlocks: string[];
  masteryLevels: Record<string, number>;
  quests: QuestProgress[];
  activeTitle: string;
  unlockedTitles: string[];

  // Buffs
  buffs: Record<string, { val: number; fights: number; source?: string }>;

  // Settings
  autoPotions: boolean;
  autoPotHpPct: number;
  autoPotMpPct: number;
  autoBuyPotions: boolean;
  autoBuyHpPot: string;
  autoBuyMpPot: string;
  profanityFilter: boolean;

  // Social
  friends: string[];
  friendRequests: string[];
  blocked: string[];

  // Avatar
  avatar: { skinTone: number; hairStyle: number; hairColor: number; accessory: number };

  // Dungeon tracking
  dungeonRuns: Record<string, number>;
  dungeonsCleared: number;
  totalEnchants: number;

  // Season
  seasonPoints: number;
  seasonId: string;
  lastSeasonId: string;
  lastSeasonPoints: number;

  // Crafting
  fragments: number;

  // Misc
  rareDrops: number;
  completedQuests: string[];
  lastOnline: number;
  showOnlineStatus: boolean;
  lastDaily: string;
  dailyStreak: number;
  lastDungeonDate: string;
  dailyDungeonRuns: number;
  combatHistory: any[];

  // Allow extra fields from JSON
  [key: string]: any;
}

export interface ItemInstance {
  baseId: string;
  enchantLevel: number;
  durability: number;
}

export interface QuestProgress {
  id: string;
  progress: number;
  completed?: boolean;
}

export interface SkillEffect {
  dmgMult?: number;
  ignoreArmor?: boolean;
  dodge?: boolean;
  rounds?: number;
  dmgReduction?: number;
  reflect?: number;
  lifesteal?: number;
  magicDmg?: number;
  buff?: string;
  val?: number;
  critBonus?: number;
  hpBonus?: number;
  mpBonus?: number;
}

export interface Skill {
  id: string;
  name: string;
  icon: string;
  desc: string;
  type: string;
  mpCost: number;
  cooldown: number;
  effect: SkillEffect;
}

export interface Passive {
  id: string;
  name: string;
  icon: string;
  desc: string;
  effect: Record<string, number | boolean>;
}

export interface GameClass {
  name: string;
  icon: string;
  desc: string;
  bonusStr: number;
  bonusAgi: number;
  bonusEnd: number;
  bonusInt: number;
  skills: Skill[];
  passive: Passive;
}

export interface Item {
  name: string;
  icon: string;
  slot: string | null;
  price: number;
  reqLevel?: number;
  rarity?: string;
  stats?: Record<string, number>;
  minDmg?: number;
  maxDmg?: number;
  armor?: number;
  consumable?: boolean;
  healHp?: number;
  healMp?: number;
  buff?: string;
  buffVal?: number;
  buffFights?: number;
  desc?: string;
  extraSlots?: number;
  dropOnly?: boolean;
  pvpOnly?: boolean;
  classReq?: string;
  loot?: string[];
}

export interface NPC {
  id: string;
  name: string;
  icon: string;
  level: number;
  str: number;
  agi: number;
  end: number;
  int: number;
  xp: number;
  gold: number;
  dropChance: number;
  loot: string[];
  lore?: string;
  elite?: boolean;
}

export interface DungeonModifier {
  type: string;
  val?: number;
  desc: string;
}

export interface DungeonBoss {
  name: string;
  icon: string;
  statMult: number;
  xpBonus: number;
  goldBonus: number;
}

export interface Dungeon {
  id: string;
  name: string;
  icon: string;
  reqLevel: number;
  stages: number;
  npcRange: [number, number];
  xpMult: number;
  goldMult: number;
  dropBonus: number;
  fee: number;
  desc: string;
  modifiers: DungeonModifier[];
  boss: DungeonBoss;
}

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string;
  check: (u: User) => boolean;
  reward: number;
}

export interface SkillTreeTier {
  id: string;
  name: string;
  cost: number;
  desc: string;
  effect: Record<string, number | boolean>;
}

export interface SkillTreeBranch {
  id: string;
  name: string;
  icon: string;
  desc: string;
  tiers: SkillTreeTier[];
}

export interface SkillTree {
  name: string;
  branches: SkillTreeBranch[];
}

export interface Mastery {
  id: string;
  name: string;
  icon: string;
  desc: string;
  effectPer: Record<string, number>;
}

export interface Title {
  id: string;
  name: string;
  icon: string;
  rarity?: string;
  desc?: string;
  effect?: Record<string, number>;
  req: (u: User) => boolean;
}

export interface QuestTemplate {
  id: string;
  name: string;
  desc: string;
  icon: string;
  type: string;
  target: number;
  reward: { xp?: number; gold?: number; item?: string; statPoints?: number };
  check: (u: User) => number;
}
