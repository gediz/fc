// ═══════════════════════════════════════════════════════════════
//  Database Layer — SQLite via better-sqlite3
// ═══════════════════════════════════════════════════════════════

import Database from 'better-sqlite3';
import { readFileSync, existsSync, renameSync } from 'fs';
import type { ResolvedUser } from './data/types.js';

const DB_PATH = process.env.DB_PATH || '/data/fightclub.db';

let db: Database.Database;

let stmts: {
  getUser: Database.Statement;
  insertUser: Database.Statement;
  updateUser: Database.Statement;
  deleteUser: Database.Statement;
  getAllUsers: Database.Statement;
  getLeaderboard: Database.Statement;
  insertGuild: Database.Statement;
  updateGuild: Database.Statement;
  deleteGuild: Database.Statement;
  getAllGuilds: Database.Statement;
};

// ─── Initialization ──────────────────────────────────────────

export function initDb(): void {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      username         TEXT PRIMARY KEY,
      password         TEXT NOT NULL,
      class            TEXT NOT NULL DEFAULT '',
      needs_class      INTEGER NOT NULL DEFAULT 0,
      level            INTEGER NOT NULL DEFAULT 1,
      xp               INTEGER NOT NULL DEFAULT 0,
      gold             INTEGER NOT NULL DEFAULT 50,
      prestige         INTEGER NOT NULL DEFAULT 0,
      stat_points      INTEGER NOT NULL DEFAULT 3,
      base_str         INTEGER NOT NULL DEFAULT 5,
      base_agi         INTEGER NOT NULL DEFAULT 5,
      base_end         INTEGER NOT NULL DEFAULT 5,
      base_int         INTEGER NOT NULL DEFAULT 5,
      current_hp       INTEGER,
      current_mp       INTEGER,
      kills            INTEGER NOT NULL DEFAULT 0,
      deaths           INTEGER NOT NULL DEFAULT 0,
      pvp_wins         INTEGER NOT NULL DEFAULT 0,
      pvp_losses       INTEGER NOT NULL DEFAULT 0,
      pvp_rating       INTEGER NOT NULL DEFAULT 1000,
      soul_sickness    INTEGER NOT NULL DEFAULT 0,
      drop_penalty     INTEGER NOT NULL DEFAULT 0,
      last_rest_time   INTEGER NOT NULL DEFAULT 0,
      fragments        INTEGER NOT NULL DEFAULT 0,
      rare_drops       INTEGER NOT NULL DEFAULT 0,
      dungeons_cleared INTEGER NOT NULL DEFAULT 0,
      total_enchants   INTEGER NOT NULL DEFAULT 0,
      active_title     TEXT,
      season_points    INTEGER NOT NULL DEFAULT 0,
      season_id        TEXT,
      last_season_id   TEXT,
      last_season_points INTEGER NOT NULL DEFAULT 0,
      last_daily       TEXT,
      daily_streak     INTEGER NOT NULL DEFAULT 0,
      last_dungeon_date TEXT,
      daily_dungeon_runs INTEGER NOT NULL DEFAULT 0,
      auto_potions     INTEGER NOT NULL DEFAULT 0,
      auto_pot_hp_pct  INTEGER NOT NULL DEFAULT 30,
      auto_pot_mp_pct  INTEGER NOT NULL DEFAULT 20,
      auto_buy_potions INTEGER NOT NULL DEFAULT 0,
      auto_buy_hp_pot  TEXT NOT NULL DEFAULT '',
      auto_buy_mp_pot  TEXT NOT NULL DEFAULT '',
      profanity_filter INTEGER NOT NULL DEFAULT 1,
      equipment        TEXT NOT NULL DEFAULT '{}',
      inventory        TEXT NOT NULL DEFAULT '[]',
      durability       TEXT NOT NULL DEFAULT '{}',
      enchant_levels   TEXT NOT NULL DEFAULT '{}',
      achievements     TEXT NOT NULL DEFAULT '[]',
      completed_quests TEXT NOT NULL DEFAULT '[]',
      skill_tree_unlocks TEXT NOT NULL DEFAULT '[]',
      mastery_levels   TEXT NOT NULL DEFAULT '{}',
      quests           TEXT NOT NULL DEFAULT '[]',
      unlocked_titles  TEXT NOT NULL DEFAULT '[]',
      buffs            TEXT NOT NULL DEFAULT '{}',
      friends          TEXT NOT NULL DEFAULT '[]',
      friend_requests  TEXT NOT NULL DEFAULT '[]',
      blocked          TEXT NOT NULL DEFAULT '[]',
      avatar           TEXT NOT NULL DEFAULT '{}',
      dungeon_runs     TEXT NOT NULL DEFAULT '{}',
      combat_history   TEXT NOT NULL DEFAULT '[]'
    );

    CREATE INDEX IF NOT EXISTS idx_users_level ON users(level DESC);
    CREATE INDEX IF NOT EXISTS idx_users_pvp_rating ON users(pvp_rating DESC);
    CREATE INDEX IF NOT EXISTS idx_users_kills ON users(kills DESC);

    CREATE TABLE IF NOT EXISTS messages (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      sender    TEXT NOT NULL,
      receiver  TEXT NOT NULL,
      text      TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      read      INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver, read);

    CREATE TABLE IF NOT EXISTS guilds (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL UNIQUE,
      icon         TEXT NOT NULL DEFAULT '',
      leader       TEXT NOT NULL,
      total_kills  INTEGER NOT NULL DEFAULT 0,
      created      INTEGER NOT NULL DEFAULT 0,
      private      INTEGER NOT NULL DEFAULT 0,
      members      TEXT NOT NULL DEFAULT '[]',
      applications TEXT NOT NULL DEFAULT '[]'
    );
  `);

  // Schema migrations for existing databases
  try { db.exec("ALTER TABLE users ADD COLUMN friend_requests TEXT NOT NULL DEFAULT '[]'"); } catch {}
  try { db.exec("ALTER TABLE users ADD COLUMN item_instances TEXT NOT NULL DEFAULT '{}'"); } catch {}
  try { db.exec("ALTER TABLE users ADD COLUMN last_online INTEGER NOT NULL DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE users ADD COLUMN show_online_status INTEGER NOT NULL DEFAULT 1"); } catch {}
  try { db.exec("ALTER TABLE guilds ADD COLUMN guild_xp INTEGER NOT NULL DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE guilds ADD COLUMN guild_level INTEGER NOT NULL DEFAULT 1"); } catch {}
  try { db.exec("ALTER TABLE guilds ADD COLUMN description TEXT NOT NULL DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE messages ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE guilds ADD COLUMN notice TEXT NOT NULL DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE guilds ADD COLUMN donations TEXT NOT NULL DEFAULT '{}'"); } catch {}

  prepareStatements();
  prepareMessageStatements();

  // Auto-migrate from JSON if tables are empty
  const count = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c;
  if (count === 0) {
    migrateFromJson();
  }

  console.log(`Database: ${DB_PATH} (${count} users)`);
}

// ─── User to/from Row ────────────────────────────────────────

function rowToUser(row: any): ResolvedUser {
  return {
    password: row.password,
    needsClass: !!row.needs_class,
    class: row.class,
    level: row.level,
    xp: row.xp,
    gold: row.gold,
    prestige: row.prestige,
    statPoints: row.stat_points,
    baseStr: row.base_str,
    baseAgi: row.base_agi,
    baseEnd: row.base_end,
    baseInt: row.base_int,
    currentHp: row.current_hp,
    currentMp: row.current_mp,
    kills: row.kills,
    deaths: row.deaths,
    pvpWins: row.pvp_wins,
    pvpLosses: row.pvp_losses,
    pvpRating: row.pvp_rating,
    soulSickness: row.soul_sickness,
    dropPenalty: row.drop_penalty,
    lastRestTime: row.last_rest_time,
    fragments: row.fragments,
    rareDrops: row.rare_drops,
    dungeonsCleared: row.dungeons_cleared,
    totalEnchants: row.total_enchants,
    activeTitle: row.active_title || '',
    seasonPoints: row.season_points,
    seasonId: row.season_id || '',
    lastSeasonId: row.last_season_id || '',
    lastSeasonPoints: row.last_season_points,
    lastDaily: row.last_daily || '',
    dailyStreak: row.daily_streak,
    lastDungeonDate: row.last_dungeon_date || '',
    dailyDungeonRuns: row.daily_dungeon_runs,
    autoPotions: !!row.auto_potions,
    autoPotHpPct: row.auto_pot_hp_pct,
    autoPotMpPct: row.auto_pot_mp_pct,
    autoBuyPotions: !!row.auto_buy_potions,
    autoBuyHpPot: row.auto_buy_hp_pot || '',
    autoBuyMpPot: row.auto_buy_mp_pot || '',
    profanityFilter: !!row.profanity_filter,
    equipment: JSON.parse(row.equipment || '{}'),
    inventory: JSON.parse(row.inventory || '[]'),
    durability: JSON.parse(row.durability || '{}'),
    enchantLevels: JSON.parse(row.enchant_levels || '{}'),
    itemInstances: JSON.parse(row.item_instances || '{}'),
    achievements: JSON.parse(row.achievements || '[]'),
    completedQuests: JSON.parse(row.completed_quests || '[]'),
    skillTreeUnlocks: JSON.parse(row.skill_tree_unlocks || '[]'),
    masteryLevels: JSON.parse(row.mastery_levels || '{}'),
    quests: JSON.parse(row.quests || '[]'),
    unlockedTitles: JSON.parse(row.unlocked_titles || '[]'),
    buffs: JSON.parse(row.buffs || '{}'),
    friends: JSON.parse(row.friends || '[]'),
    friendRequests: JSON.parse(row.friend_requests || '[]'),
    blocked: JSON.parse(row.blocked || '[]'),
    lastOnline: row.last_online || 0,
    showOnlineStatus: row.show_online_status !== 0,
    avatar: JSON.parse(row.avatar || '{}'),
    dungeonRuns: JSON.parse(row.dungeon_runs || '{}'),
    combatHistory: JSON.parse(row.combat_history || '[]'),
  };
}

function userToParams(username: string, u: ResolvedUser): any[] {
  return [
    u.password || '', u.class || '', u.needsClass ? 1 : 0,
    u.level || 1, u.xp || 0, u.gold || 50, u.prestige || 0,
    u.statPoints || 0, u.baseStr || 5, u.baseAgi || 5, u.baseEnd || 5, u.baseInt || 5,
    u.currentHp ?? null, u.currentMp ?? null,
    u.kills || 0, u.deaths || 0, u.pvpWins || 0, u.pvpLosses || 0, u.pvpRating || 1000,
    u.soulSickness || 0, u.dropPenalty || 0, u.lastRestTime || 0,
    u.fragments || 0, u.rareDrops || 0, u.dungeonsCleared || 0, u.totalEnchants || 0,
    u.activeTitle || null,
    u.seasonPoints || 0, u.seasonId || null, u.lastSeasonId || null, u.lastSeasonPoints || 0,
    u.lastDaily || null, u.dailyStreak || 0, u.lastDungeonDate || null, u.dailyDungeonRuns || 0,
    u.autoPotions ? 1 : 0, u.autoPotHpPct || 30, u.autoPotMpPct || 20,
    u.autoBuyPotions ? 1 : 0, u.autoBuyHpPot || '', u.autoBuyMpPot || '',
    u.profanityFilter !== false ? 1 : 0,
    JSON.stringify(u.equipment || {}), JSON.stringify(u.inventory || []),
    JSON.stringify(u.durability || {}), JSON.stringify(u.enchantLevels || {}),
    JSON.stringify(u.itemInstances || {}),
    JSON.stringify(u.achievements || []), JSON.stringify(u.completedQuests || []),
    JSON.stringify(u.skillTreeUnlocks || []), JSON.stringify(u.masteryLevels || {}),
    JSON.stringify(u.quests || []), JSON.stringify(u.unlockedTitles || []),
    JSON.stringify(u.buffs || {}), JSON.stringify(u.friends || []),
    JSON.stringify(u.friendRequests || []),
    JSON.stringify(u.blocked || []), JSON.stringify(u.avatar || {}),
    JSON.stringify(u.dungeonRuns || {}), JSON.stringify(u.combatHistory || []),
    u.lastOnline || 0, u.showOnlineStatus !== false ? 1 : 0,
  ];
}

function prepareStatements(): void {
  stmts = {
    getUser: db.prepare('SELECT * FROM users WHERE username = ?'),
    insertUser: db.prepare(`
      INSERT INTO users (username, password, class, needs_class, level, xp, gold, prestige,
        stat_points, base_str, base_agi, base_end, base_int, current_hp, current_mp,
        kills, deaths, pvp_wins, pvp_losses, pvp_rating, soul_sickness, drop_penalty, last_rest_time,
        fragments, rare_drops, dungeons_cleared, total_enchants, active_title,
        season_points, season_id, last_season_id, last_season_points,
        last_daily, daily_streak, last_dungeon_date, daily_dungeon_runs,
        auto_potions, auto_pot_hp_pct, auto_pot_mp_pct, auto_buy_potions, auto_buy_hp_pot, auto_buy_mp_pot, profanity_filter,
        equipment, inventory, durability, enchant_levels, item_instances,
        achievements, completed_quests, skill_tree_unlocks, mastery_levels,
        quests, unlocked_titles, buffs, friends, friend_requests, blocked, avatar, dungeon_runs, combat_history,
        last_online, show_online_status
      ) VALUES (${Array(63).fill('?').join(',')})
    `),
    updateUser: db.prepare(`
      UPDATE users SET
        password=?, class=?, needs_class=?, level=?, xp=?, gold=?, prestige=?,
        stat_points=?, base_str=?, base_agi=?, base_end=?, base_int=?,
        current_hp=?, current_mp=?,
        kills=?, deaths=?, pvp_wins=?, pvp_losses=?, pvp_rating=?,
        soul_sickness=?, drop_penalty=?, last_rest_time=?,
        fragments=?, rare_drops=?, dungeons_cleared=?, total_enchants=?, active_title=?,
        season_points=?, season_id=?, last_season_id=?, last_season_points=?,
        last_daily=?, daily_streak=?, last_dungeon_date=?, daily_dungeon_runs=?,
        auto_potions=?, auto_pot_hp_pct=?, auto_pot_mp_pct=?,
        auto_buy_potions=?, auto_buy_hp_pot=?, auto_buy_mp_pot=?, profanity_filter=?,
        equipment=?, inventory=?, durability=?, enchant_levels=?, item_instances=?,
        achievements=?, completed_quests=?, skill_tree_unlocks=?, mastery_levels=?,
        quests=?, unlocked_titles=?, buffs=?, friends=?, friend_requests=?, blocked=?,
        avatar=?, dungeon_runs=?, combat_history=?,
        last_online=?, show_online_status=?
      WHERE username=?
    `),
    deleteUser: db.prepare('DELETE FROM users WHERE username = ?'),
    getAllUsers: db.prepare('SELECT * FROM users'),
    getLeaderboard: db.prepare(`
      SELECT username, level, kills, pvp_wins, pvp_rating, gold, prestige, class, active_title
      FROM users WHERE needs_class = 0 ORDER BY level DESC, kills DESC LIMIT 50
    `),
    insertGuild: db.prepare(`
      INSERT INTO guilds (id, name, icon, leader, total_kills, created, private, members, applications, guild_xp, guild_level, description, notice, donations)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    updateGuild: db.prepare(`
      UPDATE guilds SET name=?, icon=?, leader=?, total_kills=?, created=?, private=?, members=?, applications=?, guild_xp=?, guild_level=?, description=?, notice=?, donations=?
      WHERE id=?
    `),
    deleteGuild: db.prepare('DELETE FROM guilds WHERE id = ?'),
    getAllGuilds: db.prepare('SELECT * FROM guilds'),
  };
}

// ─── Public API ──────────────────────────────────────────────

export function getUser(username: string): ResolvedUser | null {
  const row = stmts.getUser.get(username);
  return row ? rowToUser(row) : null;
}

export function saveUser(username: string, u: ResolvedUser): void {
  const params = userToParams(username, u);
  params.push(username);
  stmts.updateUser.run(...params);
}

export function createUser(username: string, u: ResolvedUser): void {
  const params = [username, ...userToParams(username, u)];
  stmts.insertUser.run(...params);
}

export function deleteUser(username: string): void {
  stmts.deleteUser.run(username);
}

export function loadAllUsers(): Record<string, ResolvedUser> {
  const rows = stmts.getAllUsers.all();
  const result: Record<string, ResolvedUser> = {};
  for (const row of rows) {
    const r = row as any;
    result[r.username] = rowToUser(r);
  }
  return result;
}

export function saveGuild(id: string, g: any): void {
  stmts.updateGuild.run(
    g.name, g.icon || '', g.leader, g.totalKills || 0,
    g.created || 0, g.private ? 1 : 0,
    JSON.stringify(g.members || []), JSON.stringify(g.applications || []),
    g.guildXp || 0, g.guildLevel || 1,
    g.description || '', g.notice || '',
    JSON.stringify(g.donations || {}),
    id
  );
}

export function createGuild(id: string, g: any): void {
  stmts.insertGuild.run(
    id, g.name, g.icon || '', g.leader, g.totalKills || 0,
    g.created || Date.now(), g.private ? 1 : 0,
    JSON.stringify(g.members || []), JSON.stringify(g.applications || []),
    g.guildXp || 0, g.guildLevel || 1,
    g.description || '', g.notice || '',
    JSON.stringify(g.donations || {})
  );
}

export function deleteGuild(id: string): void {
  stmts.deleteGuild.run(id);
}

export function loadAllGuilds(): Record<string, any> {
  const rows = stmts.getAllGuilds.all();
  const result: Record<string, any> = {};
  for (const row of rows) {
    const r = row as any;
    result[r.id] = {
      name: r.name, icon: r.icon, leader: r.leader,
      totalKills: r.total_kills, created: r.created,
      private: !!r.private,
      members: JSON.parse(r.members || '[]'),
      applications: JSON.parse(r.applications || '[]'),
      guildXp: r.guild_xp || 0,
      guildLevel: r.guild_level || 1,
      description: r.description || '',
      notice: r.notice || '',
      donations: JSON.parse(r.donations || '{}'),
    };
  }
  return result;
}

export function getDbLeaderboard(): any[] {
  return (stmts.getLeaderboard.all() as any[]).map(r => ({
    name: r.username, level: r.level, kills: r.kills,
    pvpWins: r.pvp_wins, pvpRating: r.pvp_rating, gold: r.gold,
    prestige: r.prestige, class: r.class, activeTitle: r.active_title,
  }));
}

export function saveMultipleUsers(entries: [string, ResolvedUser][]): void {
  const txn = db.transaction(() => {
    for (const [username, u] of entries) saveUser(username, u);
  });
  txn();
}

// ─── Private Messages ────────────────────────────────────────

let msgStmts: {
  insert: Database.Statement;
  inbox: Database.Statement;
  unread: Database.Statement;
  markOne: Database.Statement;
  markAll: Database.Statement;
  deleteOne: Database.Statement;
};

function prepareMessageStatements(): void {
  msgStmts = {
    insert: db.prepare('INSERT INTO messages (sender, receiver, text, timestamp) VALUES (?, ?, ?, ?)'),
    inbox: db.prepare('SELECT * FROM messages WHERE (receiver = ? OR sender = ?) AND deleted = 0 ORDER BY timestamp DESC LIMIT ?'),
    unread: db.prepare('SELECT COUNT(*) as c FROM messages WHERE receiver = ? AND read = 0'),
    markOne: db.prepare('UPDATE messages SET read = 1 WHERE id = ? AND receiver = ?'),
    markAll: db.prepare('UPDATE messages SET read = 1 WHERE receiver = ? AND read = 0'),
    deleteOne: db.prepare('UPDATE messages SET deleted = 1 WHERE id = ? AND sender = ?'),
  };
}

export function sendMessage(sender: string, receiver: string, text: string): number {
  const result = msgStmts.insert.run(sender, receiver, text, Date.now());
  return Number(result.lastInsertRowid);
}

export function getInbox(username: string, limit = 50): any[] {
  return (msgStmts.inbox.all(username, username, limit) as any[]).map(r => ({
    id: r.id,
    from: r.sender === username ? r.receiver : r.sender,
    text: r.text,
    timestamp: r.timestamp,
    read: !!r.read,
    sent: r.sender === username,
  }));
}

export function getUnreadCount(username: string): number {
  return (msgStmts.unread.get(username) as any).c;
}

export function markRead(username: string, messageId: number): void {
  msgStmts.markOne.run(messageId, username);
}

export function markAllRead(username: string): void {
  msgStmts.markAll.run(username);
}

export function deleteMessage(username: string, messageId: number): void {
  msgStmts.deleteOne.run(messageId, username);
}

export function deleteAllMessages(username: string): void {
  // Soft delete — mark messages sent by this user as deleted
  db.prepare('UPDATE messages SET deleted = 1 WHERE sender = ?').run(username);
}

export function deleteConversation(username: string, otherUser: string): void {
  // Soft delete messages sent by the current user to this person
  db.prepare('UPDATE messages SET deleted = 1 WHERE sender = ? AND receiver = ?').run(username, otherUser);
}

// ─── Chat Log Access (for admin) ─────────────────────────────

export function getRecentChatLogs(limit = 100): any[] {
  // Read from the chat log files (not DB)
  const dir = '/data/chatlogs';
  const today = new Date().toISOString().slice(0, 10);
  try {
    const file = `${dir}/${today}.log`;
    if (!existsSync(file)) return [];
    const lines = readFileSync(file, 'utf-8').trim().split('\n').slice(-limit);
    return lines.map((l: string) => ({ text: l }));
  } catch { return []; }
}

// ─── JSON Migration ──────────────────────────────────────────

function migrateFromJson(): void {
  const usersFile = '/data/users.json';
  const guildsFile = '/data/guilds.json';

  if (existsSync(usersFile)) {
    console.log('Migrating users from JSON...');
    const raw = readFileSync(usersFile, 'utf-8');
    const data = JSON.parse(raw);
    const entries = Object.entries(data);
    const txn = db.transaction(() => {
      for (const [username, u] of entries) {
        const user = u as any;
        const resolved: ResolvedUser = {
          password: user.password || '', needsClass: !!user.needsClass, class: user.class || 'warrior',
          level: user.level || 1, xp: user.xp || 0, gold: user.gold || 50, prestige: user.prestige || 0,
          statPoints: user.statPoints || 0, baseStr: user.baseStr || 5, baseAgi: user.baseAgi || 5,
          baseEnd: user.baseEnd || 5, baseInt: user.baseInt || 5,
          currentHp: user.currentHp, currentMp: user.currentMp,
          kills: user.kills || 0, deaths: user.deaths || 0,
          pvpWins: user.pvpWins || 0, pvpLosses: user.pvpLosses || 0, pvpRating: user.pvpRating || 1000,
          soulSickness: user.soulSickness || 0, dropPenalty: user.dropPenalty || 0, lastRestTime: user.lastRestTime || 0,
          fragments: user.fragments || 0, rareDrops: user.rareDrops || 0,
          dungeonsCleared: user.dungeonsCleared || 0, totalEnchants: user.totalEnchants || 0,
          activeTitle: user.activeTitle || '', seasonPoints: user.seasonPoints || 0,
          seasonId: user.seasonId || '', lastSeasonId: user.lastSeasonId || '', lastSeasonPoints: user.lastSeasonPoints || 0,
          lastDaily: user.lastDaily || '', dailyStreak: user.dailyStreak || 0,
          lastDungeonDate: user.lastDungeonDate || '', dailyDungeonRuns: user.dailyDungeonRuns || 0,
          autoPotions: !!user.autoPotions, autoPotHpPct: user.autoPotHpPct || 30, autoPotMpPct: user.autoPotMpPct || 20,
          autoBuyPotions: !!user.autoBuyPotions, autoBuyHpPot: user.autoBuyHpPot || '', autoBuyMpPot: user.autoBuyMpPot || '',
          profanityFilter: user.profanityFilter !== false,
          equipment: user.equipment || {}, inventory: user.inventory || [],
          durability: user.durability || {}, enchantLevels: user.enchantLevels || {},
          itemInstances: user.itemInstances || {},
          achievements: user.achievements || [], completedQuests: user.completedQuests || [],
          skillTreeUnlocks: user.skillTreeUnlocks || [], masteryLevels: user.masteryLevels || {},
          quests: user.quests || [], unlockedTitles: user.unlockedTitles || [],
          buffs: user.buffs || {}, friends: user.friends || [], friendRequests: user.friendRequests || [], blocked: user.blocked || [],
          avatar: user.avatar || { skinTone: 0, hairStyle: 0, hairColor: 0, accessory: 0 },
          dungeonRuns: user.dungeonRuns || {}, combatHistory: user.combatHistory || [],
          lastOnline: user.lastOnline || 0, showOnlineStatus: true,
        };
        const params = [username, ...userToParams(username, resolved)];
        stmts.insertUser.run(...params);
      }
    });
    txn();
    console.log(`Migrated ${entries.length} users.`);
    renameSync(usersFile, usersFile + '.bak');
  }

  if (existsSync(guildsFile)) {
    console.log('Migrating guilds from JSON...');
    const raw = readFileSync(guildsFile, 'utf-8');
    const data = JSON.parse(raw);
    const entries = Object.entries(data);
    const txn = db.transaction(() => {
      for (const [id, g] of entries) createGuild(id, g);
    });
    txn();
    console.log(`Migrated ${entries.length} guilds.`);
    renameSync(guildsFile, guildsFile + '.bak');
  }
}
