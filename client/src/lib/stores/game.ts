import { writable, derived, get } from 'svelte/store';
import { send, setMessageHandler, ws } from './connection.js';

// ─── Core state ──────────────────────────────────────────────

export const loggedIn = writable(false);
export const needsCharacterCreation = writable(false);
export const username = writable(null);
export const player = writable(null);
export const gameData = writable(null);  // { items, npcs, dungeons, classes, achievements, rarity, ... }
export const authError = writable(null);

// ─── Online / Chat ───────────────────────────────────────────

export const onlinePlayers = writable([]);
export const chatMessages = writable([]);

// ─── Navigation ──────────────────────────────────────────────

export const activeTab = writable('arena');

// ─── PvP ─────────────────────────────────────────────────────

export const pendingChallenges = writable([]);
export const sentChallenge = writable(null);
export const pvpFight = writable(null);

// ─── PvE ─────────────────────────────────────────────────────

export const npcResult = writable(null);
export const dungeonResult = writable(null);

// ─── Auto-farm ───────────────────────────────────────────────

export const autoFarm = writable(null);

// Track new items (items received since last inventory visit)
export const newItemSlots = writable(new Set()); // set of inventory slot indices
export function clearNewItems() { newItemSlots.set(new Set()); }
let _autoFarmTimer = null;
let _bufferedPlayerUpdate = null; // Delayed player state during auto-farm animation

// ─── Skill Tree ──────────────────────────────────────────────

export const skillTreeData = writable(null);

// ─── Quests / Titles / Leaderboard ───────────────────────────

export const quests = writable([]);
export const titles = writable([]);
export const leaderboard = writable([]);
export const viewProfile = writable(null);

// ─── Notifications ───────────────────────────────────────────

export const notifications = writable([]);
let _notifId = 0;

import { sfxNotification, sfxLevelUp, sfxDrop } from '../audio.js';

export function notify(text) {
  sfxNotification();
  const id = ++_notifId;
  notifications.update(n => [...n, { id, text }]);
  setTimeout(() => notifications.update(n => n.filter(x => x.id !== id)), 3000);
}

// ─── Derived stores ──────────────────────────────────────────

export const computedStats = derived([player, gameData], ([$p, $gd]) => {
  if (!$p || !$gd) return { str: 5, agi: 5, end: 5, int: 5, armor: 0, minDmg: 1, maxDmg: 3 };
  let str = $p.baseStr || 5, agi = $p.baseAgi || 5, end = $p.baseEnd || 5, int = $p.baseInt || 5;
  let armor = 0, minDmg = 1, maxDmg = 3;
  const eq = $p.equipment || {}, items = $gd.items || {};
  for (const slot of ['weapon', 'armor', 'helmet', 'boots', 'ring']) {
    const ref = eq[slot];
    const inst = $p.itemInstances?.[ref];
    const item = inst ? items[inst.baseId] : items[ref];
    if (item) {
      if (item.stats?.str) str += item.stats.str;
      if (item.stats?.agi) agi += item.stats.agi;
      if (item.stats?.end) end += item.stats.end;
      if (item.stats?.int) int += item.stats.int;
      if (item.armor) armor += item.armor;
      if (item.minDmg) { minDmg = item.minDmg; maxDmg = item.maxDmg; }
    }
    const elvl = $p.itemInstances?.[eq[slot]]?.enchantLevel || 0;
    if (elvl > 0) {
      if (slot === 'weapon') { minDmg += elvl * 2; maxDmg += elvl * 3; str += elvl; }
      else if (slot === 'armor') { armor += elvl * 2; end += elvl; }
      else if (slot === 'helmet') { armor += elvl; int += elvl; }
      else if (slot === 'boots') { armor += elvl; agi += elvl; }
      else if (slot === 'ring') { str += elvl; agi += elvl; int += elvl; end += elvl; }
    }
  }
  // Effective damage includes STR bonus (matches server formula)
  const strBonus = Math.floor(str * 0.5);
  return { str, agi, end, int, armor, minDmg, maxDmg, effMinDmg: minDmg + strBonus, effMaxDmg: maxDmg + strBonus };
});

export const maxHp = derived([computedStats, player], ([$cs, $p]) =>
  50 + ($cs?.end || 5) * 10 + ($p?.level || 1) * 5
);
export const maxMp = derived([computedStats, player], ([$cs, $p]) =>
  30 + ($cs?.int || 5) * 5 + ($p?.level || 1) * 2
);

export const xpNeeded = derived(player, $p => {
  const lvl = $p?.level || 1;
  return lvl >= 300 ? Infinity : Math.floor(80 * Math.pow(lvl, 2.1));
});

// ─── Actions ─────────────────────────────────────────────────

export function login(name, password) { send({ type: 'login', name, password }); }
export function register(name, password) { send({ type: 'register', name, password }); }
export function createCharacter(cls) { send({ type: 'create_character', class: cls }); }
export function sendChat(text) { if (text.trim()) send({ type: 'chat', text: text.trim().slice(0, 200) }); }
export function fightNpc(npcId) { npcResult.set(null); send({ type: 'fight_npc', npcId }); }
export function runDungeon(dungeonId) { dungeonResult.set(null); send({ type: 'run_dungeon', dungeonId }); }
export function buyItem(itemId, qty = 1) { send({ type: 'buy_item', itemId, qty }); }
export function equipItem(itemId) { send({ type: 'equip_item', itemId }); }
export function unequipItem(slot) { send({ type: 'unequip_item', slot }); }
export function useItem(itemId) { send({ type: 'use_item', itemId }); }
export function useAllItem(itemId) { send({ type: 'use_all_item', itemId }); }
export function sellItem(itemId) { send({ type: 'sell_item', itemId }); }
export function discardItem(itemId) { send({ type: 'discard_item', itemId }); }
export function enchant(slot) { send({ type: 'enchant', slot }); }
export function addStat(stat) {
  // Optimistic update
  player.update(p => {
    if (!p || (p.statPoints || 0) <= 0) return p;
    return { ...p, [stat]: (p[stat] || 5) + 1, statPoints: (p.statPoints || 0) - 1 };
  });
  send({ type: 'add_stat', stat });
}
export function prestige() { send({ type: 'prestige' }); }
export function rest() { send({ type: 'rest' }); }
export function repair() { send({ type: 'repair' }); }
export function toggleAutoPotions() { send({ type: 'toggle_auto_potions' }); }
export function setAutoPotThreshold(hpPct, mpPct) { send({ type: 'set_auto_pot_threshold', hpPct, mpPct }); }
export function swapInventory(from: number, to: number) { send({ type: 'swap_inventory', from, to }); }
export function sortInventory(mode: string) { send({ type: 'sort_inventory', mode }); }
export function salvageItem(itemId: string) { send({ type: 'salvage', itemId }); }
export function salvageBatch(itemIds: string[]) { send({ type: 'salvage_batch', itemIds }); }
export function craftItem(rarity) { send({ type: 'craft', rarity }); }
export function tradeSendGold(target, gold) { send({ type: 'trade_send', target, gold }); }
export function tradeSendItem(target, itemId) { send({ type: 'trade_send', target, itemId }); }
// Guilds
export const guildInfo = writable(null);
export const guildList = writable([]);
export function createGuild(name, icon) { send({ type: 'create_guild', name, icon }); }
export function joinGuild(guildId) { send({ type: 'join_guild', guildId }); }
export function leaveGuild() { send({ type: 'leave_guild' }); }
export function getGuild() { send({ type: 'get_guild' }); }
export function listGuilds() { send({ type: 'list_guilds' }); }
export function guildChat(text) { send({ type: 'guild_chat', text }); }
export function guildAccept(name) { send({ type: 'guild_accept', name }); }
export function guildDeny(name) { send({ type: 'guild_deny', name }); }
export function guildDonate(gold) { send({ type: 'guild_donate', gold }); }
export function guildUpdate(data: any) { send({ type: 'guild_update', ...data }); }
export function privateMsg(target, text) { send({ type: 'private_msg', target, text }); }
// Seasons
export const seasonInfo = writable(null);
export function getSeason() { send({ type: 'get_season' }); }

// Combat speed preference (persists across auto-farm fights)
export const combatSpeed = writable(parseInt(localStorage.getItem('fc_combatSpeed') || '1'));
combatSpeed.subscribe(v => { try { localStorage.setItem('fc_combatSpeed', String(v)); } catch {} });

// Number formatting utility
export function humanize(n) {
  if (n == null) return '0';
  if (n >= 1000000000) return (n / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  if (n >= 1000) return n.toLocaleString();
  return String(n);
}
export function logout() {
  localStorage.removeItem('fc_remember');
  loggedIn.set(false);
  username.set(null);
  player.set(null);
  chatMessages.set([]);
  onlinePlayers.set([]);
  autoFarm.set(null);
  pvpFight.set(null);
  // Close and reconnect to reset server-side session
  const w = get(ws);
  if (w) w.close();
}
export function challenge(target) {
  const af = get(autoFarm);
  if (af?.running) { notify('Stop auto-farm before challenging!'); return; }
  send({ type: 'challenge', target });
}
export function acceptChallenge(id: string) {
  const af = get(autoFarm);
  if (af?.running) {
    notify('Auto-farm stopped for PvP challenge.');
    dismissAutoFarm();
  }
  send({ type: 'challenge_accept', id });
}
export function declineChallenge(id) {
  send({ type: 'challenge_decline', id });
  pendingChallenges.update(c => c.filter(x => x.id !== id));
}
export function pvpChoice(attack, defend) { send({ type: 'fight_choice', attack, defend }); }
export function pvpLeave() { send({ type: 'fight_leave' }); pvpFight.set(null); activeTab.set('pvp'); }
export function getQuests() { send({ type: 'get_quests' }); }
export function getBattleLog() { send({ type: 'get_battle_log' }); }
export const battleLog = writable([]);

// Admin stores
export const adminPlayers = writable([]);
export const adminServerStats = writable(null);
export const adminPlayerDetail = writable(null);
export const adminChatLogs = writable([]);
export const adminLiveLogs = writable([]);
export function adminRefresh() { send({ type: 'admin_list_players' }); send({ type: 'admin_server_stats' }); }
export function fetchLiveLogs(categories?: string, search?: string, player?: string) {
  send({ type: 'admin_live_logs', limit: 200, categories, search, player });
}

// Inbox stores
export const inboxMessages = writable([]);
export const inboxUnread = writable(0);
export const inboxComposeTo = writable('');
export function getInbox() { send({ type: 'get_inbox' }); }
export function markRead(id) { send({ type: 'mark_read', id }); }
export function markAllRead() { send({ type: 'mark_read', all: true }); }
export function deleteMessage(id) { send({ type: 'delete_message', id }); }
export function deleteAllMessages() { send({ type: 'delete_all_messages' }); }
export function deleteConversation(sender: string) { send({ type: 'delete_conversation', sender }); }
export function getTitles() { send({ type: 'get_titles' }); }
export function setTitle(titleId) { send({ type: 'set_title', titleId }); }
export function getLeaderboard() { send({ type: 'leaderboard' }); }
export function viewPlayer(name) { send({ type: 'view_player', name }); }
export function addFriend(name: string) { send({ type: 'friend_add', name }); }
export function acceptFriend(name: string) { send({ type: 'friend_accept', name }); }
export function denyFriend(name: string) { send({ type: 'friend_deny', name }); }
export function removeFriend(name: string) { send({ type: 'friend_remove', name }); }
export function blockPlayer(name) { send({ type: 'block_player', name }); }
export function guildInvite(name) { send({ type: 'guild_invite', name }); }
export function adminListPlayers() { send({ type: 'admin_list_players' }); }
export function getSkillTree() { send({ type: 'get_skill_tree' }); }
export function unlockSkill(skillId) { send({ type: 'unlock_skill', skillId }); }
export function upgradeMastery(masteryId) { send({ type: 'upgrade_mastery', masteryId }); }
export function resetSkillTree() { send({ type: 'reset_skill_tree' }); }

// ─── Auto-farm ───────────────────────────────────────────────

export function startAutoFarm(npcId: string) {
  const gd = get(gameData);
  const npc = gd?.npcs?.find((n: any) => n.id === npcId);
  if (!npc) return;
  const current = get(autoFarm);
  // Resume: keep stats if same NPC
  if (current && current.npcId === npcId && !current.running) {
    autoFarm.set({ ...current, running: true });
  } else {
    autoFarm.set({ npcId, npcName: npc.name, npcIcon: npc.icon, running: true,
      log: [], totalKills: 0, drops: [], startTime: Date.now() });
  }
  npcResult.set(null);
  _doAutoFarmTick();
}

function _doAutoFarmTick() {
  const af = get(autoFarm);
  if (!af?.running) return;
  send({ type: 'fight_npc', npcId: af.npcId, autoRest: true });
}

let _autoFarmFallback = null;

function _handleAutoFarmResult(msg) {
  // Set a fallback timer in case CombatViewer's onComplete doesn't fire
  if (_autoFarmFallback) clearTimeout(_autoFarmFallback);
  _autoFarmFallback = setTimeout(() => {
    if (get(autoFarm)?.running) triggerNextAutoFight();
  }, 5000); // 5s max wait (safety net — onComplete should always fire)

  autoFarm.update(af => {
    if (!af) return null;
    if (msg.won) {
      af.totalKills++;
      af.totalDeaths = af.totalDeaths || 0;
      if (msg.droppedItem) af.drops = [...af.drops, msg.droppedItem];
      af.log = [...af.log.slice(-30), { type: 'system', text: `#${af.totalKills} ✅${msg.droppedItem ? ` 🎁 ${msg.droppedItem.name}` : ''}` }];
    } else {
      af.totalDeaths = (af.totalDeaths || 0) + 1;
      af.log = [...af.log.slice(-30), { type: 'hit', text: `💀 Defeated! Penalties applied. Continuing...` }];
      // Don't stop — continue after cooldown
    }
    return { ...af };
  });
  // Buffer player update — apply after combat animation finishes
  _bufferedPlayerUpdate = msg.player;
  // Show pre-fight HP (after rest/potions) immediately on sidebar
  player.update(p => p ? { ...p, currentHp: msg.playerStartHp || p.currentHp } : p);
  const p = msg.player;
  // Check if can continue: need gold for auto-rest
  const restCost = Math.max(5, Math.floor((p.level || 1) * 3));
  if (!msg.won && (p.gold || 0) < restCost) {
    // Can't afford to rest — stop farming
    autoFarm.update(af => {
      if (!af) return null;
      af.log = [...af.log, { type: 'system', text: `⚠️ Can't afford rest (${restCost}🪙). Stopping.` }];
      af.running = false;
      return { ...af };
    });
    return;
  }
  if (get(autoFarm)?.running) {
    // Don't auto-schedule next fight — let CombatViewer's onComplete handle it
    // Only apply soul sickness cooldown
    const soulSickness = p.soulSickness || 0;
    if (soulSickness >= 5 && !msg.won) {
      autoFarm.update(af => {
        if (!af) return null;
        af.log = [...af.log, { type: 'system', text: `⏱️ Soul Sickness cooldown: 10s pause...` }];
        af._cooldownUntil = Date.now() + 10000;
        return { ...af };
      });
    }
    // Next fight triggered by CombatViewer onComplete via triggerNextAutoFight()
  }
}

function _flushBufferedPlayer() {
  if (_bufferedPlayerUpdate) {
    player.set(_bufferedPlayerUpdate);
    _bufferedPlayerUpdate = null;
  }
}

// Called by Arena when combat animation finishes
export function triggerNextAutoFight() {
  _flushBufferedPlayer();
  if (_autoFarmFallback) { clearTimeout(_autoFarmFallback); _autoFarmFallback = null; }
  const af = get(autoFarm);
  if (!af?.running) return;
  // Check for soul sickness cooldown
  const cooldownLeft = (af._cooldownUntil || 0) - Date.now();
  if (cooldownLeft > 0) {
    _autoFarmTimer = setTimeout(_doAutoFarmTick, cooldownLeft);
  } else {
    // Immediate for instant fights, small delay for animated ones
    const lastLog = get(npcResult)?.log || [];
    const rounds = lastLog.filter((e: any) => e.type === 'round').length;
    // Always use setTimeout so the event loop can process Stop clicks between fights
    const delay = rounds <= 2 ? 50 : rounds <= 5 ? 200 : 500;
    _autoFarmTimer = setTimeout(_doAutoFarmTick, delay);
  }
}

export function stopAutoFarm() {
  if (_autoFarmTimer) { clearTimeout(_autoFarmTimer); _autoFarmTimer = null; }
  if (_autoFarmFallback) { clearTimeout(_autoFarmFallback); _autoFarmFallback = null; }
  _flushBufferedPlayer();
  autoFarm.update(af => af ? { ...af, running: false } : null);
  npcResult.set(null);
}

export function dismissAutoFarm() {
  stopAutoFarm();
  autoFarm.set(null);
}

// ─── Message Handler ─────────────────────────────────────────

let _lastOnlineJSON = '';

setMessageHandler((msg) => {
  switch (msg.type) {
    case 'auth_ok':
      loggedIn.set(true);
      needsCharacterCreation.set(false);
      username.set(msg.name);
      player.set(msg.player);
      authError.set(null);
      activeTab.set('arena');
      break;
    case 'needs_character_creation':
      needsCharacterCreation.set(true);
      username.set(msg.name);
      authError.set(null);
      break;
    case 'auth_error': authError.set(msg.text); break;
    case 'online': {
      const j = JSON.stringify(msg.players);
      if (j === _lastOnlineJSON) return;
      _lastOnlineJSON = j;
      onlinePlayers.set(msg.players);
      break;
    }
    case 'chat':
      chatMessages.update(msgs => {
        const next = [...msgs, { user: msg.user, text: msg.text, type: msg.msgType || 'user' }];
        return next.length > 100 ? next.slice(-60) : next;
      });
      break;
    case 'game_data': gameData.set(msg); break;
    case 'player_update': {
      const oldInv = get(player)?.inventory || [];
      const newInv = msg.player?.inventory || [];
      const oldSet = new Set(oldInv.filter(Boolean));
      const currentNew = get(newItemSlots);
      const newTypes = new Set<string>();
      for (let i = 0; i < newInv.length; i++) {
        // Only mark as "new" if the item didn't exist anywhere in old inventory
        if (newInv[i] && !oldInv[i] && !oldSet.has(newInv[i])) {
          // For consumables (no dash = not UUID), only mark once per type
          if (!newInv[i].includes('-') && newTypes.has(newInv[i])) continue;
          newTypes.add(newInv[i]);
          currentNew.add(i);
        }
      }
      // Clean phantom badges — remove slots with no items or items that moved
      for (const idx of currentNew) {
        if (!newInv[idx]) currentNew.delete(idx);
      }
      newItemSlots.set(new Set(currentNew));
      // Clear any stale fight buffer so stat changes aren't overwritten
      _bufferedPlayerUpdate = null;
      player.set(msg.player);
      break;
    }
    case 'notification': notify(msg.text); break;
    case 'daily_bonus': player.set(msg.player); notify(`Daily bonus: +${msg.gold}🪙 (${msg.streak} day streak!)`); break;
    case 'npc_fight_result':
      if (get(autoFarm)?.running) {
        _handleAutoFarmResult(msg);
        npcResult.set(msg); // Also set npcResult so Arena can show combat viewer
        return;
      }
      npcResult.set(msg);
      player.set(msg.player); // Update immediately — sidebar shows post-fight state
      break;
    case 'dungeon_result': dungeonResult.set(msg); player.set(msg.player); break;
    case 'enchant_result': notify(msg.text); break;
    case 'leaderboard': leaderboard.set(msg.data); break;
    case 'player_profile': viewProfile.set(msg); activeTab.set('profile'); break;
    case 'quests': quests.set(msg.quests); break;
    case 'battle_log': battleLog.set(msg.history); break;
    case 'guild_info': guildInfo.set(msg.guild); break;
    case 'guild_list': guildList.set(msg.guilds); break;
    case 'season_info': seasonInfo.set(msg); break;
    case 'private_msg':
      if (msg.sent) {
        inboxMessages.update(msgs => [{ id: msg.msgId || Date.now(), from: msg.to, text: `You: ${msg.text}`, timestamp: Date.now(), read: true, sent: true }, ...msgs]);
      } else {
        inboxMessages.update(msgs => [{ id: msg.msgId || Date.now(), from: msg.from, text: msg.text, timestamp: Date.now(), read: false }, ...msgs]);
        inboxUnread.update(n => n + 1);
        notify(`💬 ${msg.from}: ${msg.text.slice(0, 50)}`);
      }
      break;
    case 'titles': titles.set(msg.titles); break;
    case 'challenge_sent': sentChallenge.set({ id: msg.id, to: msg.to }); break;
    case 'challenge_received': pendingChallenges.update(c => [...c, { id: msg.id, from: msg.from, fromLevel: msg.fromLevel }]); break;
    case 'challenge_declined': sentChallenge.set(null); notify(`${msg.by} declined.`); break;
    case 'challenge_expired': sentChallenge.set(null); pendingChallenges.update(c => c.filter(x => x.id !== msg.id)); break;
    case 'fight_start':
      pvpFight.set(msg.fight); activeTab.set('pvp_fight');
      sentChallenge.set(null); pendingChallenges.set([]);
      break;
    case 'fight_update': pvpFight.set(msg.fight); break;
    case 'fight_choice_ack': pvpFight.update(f => f ? { ...f, choiceSent: true } : null); break;
    case 'fight_enemy_ready': pvpFight.update(f => f ? { ...f, enemyReady: true } : null); break;
    case 'skill_tree': skillTreeData.set(msg); break;
    case 'error':
      notify(msg.text);
      // If auto-farming and got an error
      if (get(autoFarm)?.running) {
        if (msg.text.includes('Max level')) {
          autoFarm.update(af => af ? { ...af, running: false, log: [...(af.log || []), { type: 'system', text: `⚠️ ${msg.text}` }] } : null);
        } else if (msg.text.includes('injured') || msg.text.includes('cooldown')) {
          // Wait for rest cooldown then retry
          autoFarm.update(af => af ? { ...af, log: [...(af.log || []), { type: 'system', text: `⏳ Waiting to heal...` }] } : { ...af! });
          _autoFarmTimer = setTimeout(() => { if (get(autoFarm)?.running) _doAutoFarmTick(); }, 5000);
        } else {
          setTimeout(() => { if (get(autoFarm)?.running) _doAutoFarmTick(); }, 3000);
        }
      }
      break;
    // Admin
    case 'admin_players': adminPlayers.set(msg.players || []); break;
    case 'admin_server_stats': adminServerStats.set(msg.stats || null); break;
    case 'admin_player_detail': adminPlayerDetail.set(msg.player || null); break;
    case 'admin_action_result':
      notify(msg.text || 'Done');
      send({ type: 'admin_list_players' });
      send({ type: 'admin_server_stats' });
      break;
    case 'admin_chat_logs': adminChatLogs.set(msg.logs || []); break;
    case 'admin_live_logs': adminLiveLogs.set(msg.logs || []); break;
    case 'inbox': inboxMessages.set(msg.messages || []); inboxUnread.set(msg.unread || 0); break;
    case 'inbox_count': inboxUnread.set(msg.count || 0); break;
  }
});
