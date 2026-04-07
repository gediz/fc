<script lang="ts">
  import { player, gameData, humanize, adminPlayers, adminServerStats, adminPlayerDetail, adminChatLogs, adminLiveLogs, adminRefresh, fetchLiveLogs } from '../../stores/game.js';
  import { send } from '../../stores/connection.js';
  import { onMount } from 'svelte';

  let activeSection: string = 'dashboard';
  let searchQuery: string = '';
  let sortBy: string = 'level';
  let editGold: string = '';
  let editLevel: string = '';
  let logCategories: Record<string, boolean> = { RAW: false, AUTH: true, COMBAT: true, ECONOMY: true, PVP: true, SOCIAL: true, GUILD: true, ADMIN: true, SYSTEM: true, ITEM: true, SKILL: true };
  let logSearch: string = '';
  let logPlayer: string = '';
  let logAutoRefresh: any = null;

  $: activeCategories = Object.entries(logCategories).filter(([, v]) => v).map(([k]) => k).join(',') || 'all';

  function refreshLogs(): void {
    fetchLiveLogs(activeCategories, logSearch || undefined, logPlayer || undefined);
  }
  let giveItemId: string = '';
  let msgText: string = '';
  let broadcastText: string = '';
  let confirmAction: string | null = null;

  $: isAdmin = $player?.isAdmin;
  $: itemMap = $gameData?.items || {};
  $: itemList = Object.entries(itemMap).sort((a, b) => a[1].name.localeCompare(b[1].name));
  $: stats = $adminServerStats;
  $: detail = $adminPlayerDetail;

  $: filteredPlayers = ($adminPlayers || [])
    .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'level') return b.level - a.level;
      if (sortBy === 'gold') return (b.gold||0) - (a.gold||0);
      if (sortBy === 'kills') return (b.kills||0) - (a.kills||0);
      if (sortBy === 'pvp') return (b.pvpRating||0) - (a.pvpRating||0);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'online') return (b.online ? 1 : 0) - (a.online ? 1 : 0);
      return 0;
    });

  onMount(() => { if (isAdmin) adminRefresh(); });

  function selectPlayer(name: string) {
    send({ type: 'admin_player_detail', target: name });
    activeSection = 'player';
  }

  function doAction(type: string, extra: Record<string, any> = {}) {
    send({ type, target: detail?.name, ...extra });
    confirmAction = null;
  }

  const inputStyle = 'width:100%;background:#0a0908;border:1px solid #2a2520;border-radius:6px;padding:7px 10px;font-size:13px;color:#e2e0d6;outline:none;box-sizing:border-box;';
</script>

{#if !isAdmin}
  <div class="game-panel" style="padding:40px;text-align:center;">
    <div style="font-size:36px;margin-bottom:8px;">🔒</div>
    <div class="font-fantasy" style="color:#7f1d1d;font-size:14px;">Admin access required.</div>
  </div>
{:else}
<div style="display:flex;flex-direction:column;gap:12px;">

  <!-- Nav tabs -->
  <div style="display:flex;gap:4px;flex-wrap:wrap">
    {#each [
      { id: 'dashboard', label: 'Dashboard', icon: '📊' },
      { id: 'players', label: 'Players', icon: '👥' },
      { id: 'player', label: 'Player Detail', icon: '👤' },
      { id: 'activity', label: 'Activity', icon: '📡' },
      { id: 'tools', label: 'Tools', icon: '🔧' },
    ] as tab}
      <button
        style="padding:8px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;
          border:1px solid {activeSection === tab.id ? '#ca8a04' : '#2a2520'};
          background:{activeSection === tab.id ? 'linear-gradient(180deg,#a16207,#713f12)' : 'linear-gradient(180deg,#1a1714,#0f0d0b)'};
          color:{activeSection === tab.id ? '#fef3c7' : '#78716c'};"
        onclick={() => {
          if (activeSection === 'activity' && tab.id !== 'activity' && logAutoRefresh) {
            clearInterval(logAutoRefresh); logAutoRefresh = null;
          }
          activeSection = tab.id;
          if (tab.id === 'dashboard' || tab.id === 'players') adminRefresh();
          if (tab.id === 'chatlog') send({ type: 'admin_chat_logs' });
          if (tab.id === 'activity') {
            refreshLogs();
            if (!logAutoRefresh) logAutoRefresh = setInterval(() => refreshLogs(), 5000);
          }
        }}>
        {tab.icon} {tab.label}
      </button>
    {/each}
  </div>

  <!-- DASHBOARD -->
  {#if activeSection === 'dashboard'}
    {#if stats}
      <div class="game-panel">
        <div class="game-panel-header">Server Overview</div>
        <div style="padding:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;">
          {#each [
            { label: 'Online Now', value: stats.onlineCount, color: '#4ade80' },
            { label: 'Total Users', value: stats.totalUsers, color: '#e2e0d6' },
            { label: 'Total Gold', value: humanize(stats.totalGold), color: '#fbbf24' },
            { label: 'Total Kills', value: humanize(stats.totalKills), color: '#f87171' },
            { label: 'Avg Level', value: stats.avgLevel, color: '#60a5fa' },
            { label: 'Max Level', value: stats.maxLevel, color: '#c084fc' },
            { label: 'Guilds', value: stats.totalGuilds, color: '#8a8078' },
            { label: 'Active Fights', value: stats.activeFights, color: '#f97316' },
          ] as s}
            <div style="background:#0a0908;border:1px solid #1a1714;border-radius:8px;padding:12px;text-align:center;">
              <div style="font-size:20px;font-weight:700;color:{s.color}">{s.value}</div>
              <div style="font-size:10px;color:#78716c;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px">{s.label}</div>
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <div class="game-panel" style="padding:30px;text-align:center;color:#78716c">Loading stats...</div>
    {/if}

    <!-- Quick broadcast -->
    <div class="game-panel">
      <div class="game-panel-header">Broadcast Message</div>
      <div style="padding:12px;display:flex;gap:8px;">
        <input type="text" bind:value={broadcastText} placeholder="Message to all players..." style="{inputStyle}flex:1;" />
        <button class="btn-game btn-gold" style="padding:8px 16px" onclick={() => { send({ type: 'admin_broadcast', text: broadcastText }); broadcastText = ''; }}>Send</button>
      </div>
    </div>

    <!-- Top players table -->
    <div class="game-panel">
      <div class="game-panel-header">Top Players</div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="border-bottom:1px solid #2a2520;color:#78716c;text-align:left">
              <th style="padding:8px">Name</th>
              <th style="padding:8px">Lv</th>
              <th style="padding:8px">Kills</th>
              <th style="padding:8px">PvP</th>
              <th style="padding:8px">Gold</th>
              <th style="padding:8px">Status</th>
            </tr>
          </thead>
          <tbody>
            {#each ($adminPlayers || []).slice(0, 15) as p}
              <tr style="border-bottom:1px solid #1a1714;cursor:pointer" onclick={() => selectPlayer(p.name)}>
                <td style="padding:6px 8px;color:#e2e0d6;font-weight:600">{p.name}</td>
                <td style="padding:6px 8px;color:#d4a853">{p.level}</td>
                <td style="padding:6px 8px;color:#f87171">{p.kills}</td>
                <td style="padding:6px 8px;color:#60a5fa">{p.pvpRating}</td>
                <td style="padding:6px 8px;color:#fbbf24">{humanize(p.gold)}</td>
                <td style="padding:6px 8px"><span style="color:{p.online ? '#4ade80' : '#4b5563'}">{p.online ? '● online' : '○ offline'}</span></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

  <!-- PLAYERS LIST -->
  {:else if activeSection === 'players'}
    <div class="game-panel">
      <div class="game-panel-header" style="display:flex;justify-content:space-between;align-items:center">
        <span>All Players ({($adminPlayers || []).length})</span>
        <button class="btn-game btn-dark" style="padding:3px 10px;font-size:11px" onclick={adminRefresh}>🔄 Refresh</button>
      </div>
      <div style="padding:8px;display:flex;gap:6px;flex-wrap:wrap">
        <input type="text" bind:value={searchQuery} placeholder="Search by name..." style="flex:1;min-width:120px;padding:6px 10px;background:#0a0908;border:1px solid #2a2520;border-radius:6px;color:#e8e6dc;font-size:12px" />
        <select bind:value={sortBy} style="padding:6px;background:#0a0908;border:1px solid #2a2520;border-radius:6px;color:#e8e6dc;font-size:11px">
          <option value="level">Sort: Level</option>
          <option value="gold">Sort: Gold</option>
          <option value="kills">Sort: Kills</option>
          <option value="pvp">Sort: PvP Rating</option>
          <option value="name">Sort: Name</option>
          <option value="online">Sort: Online</option>
        </select>
      </div>
      <div style="overflow-x:auto;max-height:500px;overflow-y:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="border-bottom:1px solid #2a2520;color:#78716c;text-align:left;position:sticky;top:0;background:#0f0d0b">
              <th style="padding:6px 8px">Name</th>
              <th style="padding:6px 8px">Class</th>
              <th style="padding:6px 8px">Lv</th>
              <th style="padding:6px 8px">NG+</th>
              <th style="padding:6px 8px">Kills</th>
              <th style="padding:6px 8px">Deaths</th>
              <th style="padding:6px 8px">PvP W/L</th>
              <th style="padding:6px 8px">ELO</th>
              <th style="padding:6px 8px">Gold</th>
              <th style="padding:6px 8px">Status</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredPlayers as p}
              <tr style="border-bottom:1px solid #1a1714;cursor:pointer" onclick={() => selectPlayer(p.name)}>
                <td style="padding:5px 8px;color:#e2e0d6;font-weight:600">{p.name}</td>
                <td style="padding:5px 8px;color:#8a8078">{p.class}</td>
                <td style="padding:5px 8px;color:#d4a853">{p.level}</td>
                <td style="padding:5px 8px;color:#fbbf24">{p.prestige || 0}</td>
                <td style="padding:5px 8px;color:#f87171">{p.kills}</td>
                <td style="padding:5px 8px;color:#8a8078">{p.deaths || 0}</td>
                <td style="padding:5px 8px;color:#60a5fa">{p.pvpWins}/{p.pvpLosses || 0}</td>
                <td style="padding:5px 8px;color:#c084fc">{p.pvpRating}</td>
                <td style="padding:5px 8px;color:#fbbf24">{humanize(p.gold)}</td>
                <td style="padding:5px 8px"><span style="color:{p.online ? '#4ade80' : '#4b5563'}">{p.online ? '●' : '○'}</span></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

  <!-- PLAYER DETAIL -->
  {:else if activeSection === 'player'}
    {#if !detail}
      <div class="game-panel" style="padding:40px;text-align:center;color:#78716c">
        Select a player from the Players tab, or the Dashboard table.
      </div>
    {:else}
      <div class="game-panel">
        <div class="game-panel-header" style="display:flex;justify-content:space-between;align-items:center">
          <span>👤 {detail.name}</span>
          <button class="btn-game btn-dark" style="padding:3px 10px;font-size:11px" onclick={() => send({ type: 'admin_player_detail', target: detail.name })}>🔄 Reload</button>
        </div>

        <div style="padding:14px;display:flex;flex-direction:column;gap:14px">
          <!-- Stats grid -->
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:6px;font-size:11px">
            {#each [
              { l: 'Level', v: detail.level, c: '#d4a853' },
              { l: 'XP', v: humanize(detail.xp), c: '#60a5fa' },
              { l: 'Gold', v: humanize(detail.gold), c: '#fbbf24' },
              { l: 'Prestige', v: detail.prestige, c: '#c084fc' },
              { l: 'Class', v: detail.class, c: '#e2e0d6' },
              { l: 'Kills', v: detail.kills, c: '#f87171' },
              { l: 'Deaths', v: detail.deaths, c: '#8a8078' },
              { l: 'PvP Wins', v: detail.pvpWins, c: '#4ade80' },
              { l: 'PvP Losses', v: detail.pvpLosses, c: '#f87171' },
              { l: 'ELO', v: detail.pvpRating, c: '#60a5fa' },
              { l: 'STR', v: detail.baseStr, c: '#ef4444' },
              { l: 'AGI', v: detail.baseAgi, c: '#22c55e' },
              { l: 'END', v: detail.baseEnd, c: '#f59e0b' },
              { l: 'INT', v: detail.baseInt, c: '#3b82f6' },
              { l: 'Stat Points', v: detail.statPoints, c: '#fbbf24' },
              { l: 'Fragments', v: detail.fragments, c: '#c084fc' },
              { l: 'Soul Sickness', v: detail.soulSickness, c: '#a78bfa' },
              { l: 'HP', v: `${detail.currentHp}/${detail.maxHp}`, c: '#ef4444' },
            ] as s}
              <div style="background:#0a0908;border:1px solid #1a1714;border-radius:6px;padding:6px 8px;text-align:center">
                <div style="font-weight:700;color:{s.c}">{s.v}</div>
                <div style="color:#78716c;font-size:9px;text-transform:uppercase">{s.l}</div>
              </div>
            {/each}
          </div>

          <!-- Equipment -->
          <div>
            <div style="font-size:10px;color:#78716c;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Equipment</div>
            <div style="display:flex;gap:4px;flex-wrap:wrap">
              {#each Object.entries(detail.equipment || {}) as [slot, id]}
                {@const item = id ? itemMap[id] : null}
                <span style="font-size:11px;padding:3px 8px;background:#0a0908;border:1px solid #1a1714;border-radius:4px;color:{item ? '#e2e0d6' : '#4b5563'}">
                  {slot}: {item ? `${item.icon} ${item.name}` : 'empty'}
                </span>
              {/each}
            </div>
          </div>

          <!-- Actions -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <!-- Set Gold -->
            <div>
              <div style="font-size:10px;color:#78716c;text-transform:uppercase;margin-bottom:4px">Set Gold</div>
              <div style="display:flex;gap:6px">
                <input type="number" bind:value={editGold} placeholder={String(detail.gold)} style="{inputStyle}flex:1;color:#d4a853;" />
                <button class="btn-game btn-gold" style="font-size:11px;padding:6px 12px" onclick={() => doAction('admin_set_gold', { gold: parseInt(editGold) })}>Set</button>
              </div>
            </div>
            <!-- Set Level -->
            <div>
              <div style="font-size:10px;color:#78716c;text-transform:uppercase;margin-bottom:4px">Set Level</div>
              <div style="display:flex;gap:6px">
                <input type="number" bind:value={editLevel} min="1" max="300" placeholder={String(detail.level)} style="{inputStyle}flex:1;color:#60a5fa;" />
                <button class="btn-game btn-dark" style="font-size:11px;padding:6px 12px;border-color:#1e3a5f;color:#60a5fa" onclick={() => doAction('admin_set_level', { level: parseInt(editLevel) })}>Set</button>
              </div>
            </div>
          </div>

          <!-- Give Item -->
          <div>
            <div style="font-size:10px;color:#78716c;text-transform:uppercase;margin-bottom:4px">Give Item</div>
            <div style="display:flex;gap:6px">
              <select bind:value={giveItemId} style="{inputStyle}flex:1">
                <option value="">-- select item --</option>
                {#each itemList as [id, item]}
                  <option value={id}>{item.icon} {item.name} ({item.rarity})</option>
                {/each}
              </select>
              <button class="btn-game btn-dark" style="font-size:11px;padding:6px 12px;border-color:#14532d;color:#4ade80" disabled={!giveItemId}
                onclick={() => { doAction('admin_give_item', { itemId: giveItemId }); giveItemId = ''; }}>Give</button>
            </div>
          </div>

          <!-- Message -->
          <div>
            <div style="font-size:10px;color:#78716c;text-transform:uppercase;margin-bottom:4px">Message Player</div>
            <div style="display:flex;gap:6px">
              <input type="text" bind:value={msgText} placeholder="Private message..." style="{inputStyle}flex:1;" />
              <button class="btn-game btn-dark" style="font-size:11px;padding:6px 12px" onclick={() => { doAction('admin_message', { text: msgText }); msgText = ''; }}>Send</button>
            </div>
          </div>

          <!-- Danger zone -->
          <div style="border-top:1px solid #2a2520;padding-top:10px">
            <div style="font-size:10px;color:#7f1d1d;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Danger Zone</div>
            {#if confirmAction}
              <div style="padding:10px;background:#1a0808;border:1px solid #7f1d1d;border-radius:8px;text-align:center">
                <div style="color:#fca5a5;font-size:13px;margin-bottom:8px">Confirm: {confirmAction} {detail.name}?</div>
                <div style="display:flex;gap:8px;justify-content:center">
                  <button class="btn-game btn-fight" style="font-size:11px;padding:6px 14px" onclick={() => {
                    if (confirmAction === 'Kick') doAction('admin_kick');
                    if (confirmAction === 'Ban') doAction('admin_ban');
                    if (confirmAction === 'Unban') doAction('admin_unban');
                    if (confirmAction === 'Delete') { doAction('admin_delete_player'); activeSection = 'players'; adminRefresh(); }
                  }}>Yes, {confirmAction}</button>
                  <button class="btn-game btn-dark" style="font-size:11px;padding:6px 14px" onclick={() => confirmAction = null}>Cancel</button>
                </div>
              </div>
            {:else}
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                <button class="btn-game btn-dark" style="font-size:11px;padding:5px 10px;border-color:#92400e;color:#f97316" onclick={() => confirmAction = 'Kick'}>Kick</button>
                <button class="btn-game btn-dark" style="font-size:11px;padding:5px 10px;border-color:#7f1d1d;color:#f87171" onclick={() => confirmAction = 'Ban'}>Ban</button>
                <button class="btn-game btn-dark" style="font-size:11px;padding:5px 10px;border-color:#14532d;color:#4ade80" onclick={() => confirmAction = 'Unban'}>Unban</button>
                <button class="btn-game btn-dark" style="font-size:11px;padding:5px 10px;border-color:#7f1d1d;color:#f87171" onclick={() => confirmAction = 'Delete'}>Delete</button>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}

  <!-- ACTIVITY (live logs) -->
  {:else if activeSection === 'activity'}
    <div class="game-panel">
      <div class="game-panel-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px">
        <span>Activity {logAutoRefresh ? '🟢' : '⏸'}</span>
        <div style="display:flex; gap:4px; align-items:center">
          <button class="btn-game btn-dark" style="padding:3px 8px; font-size:10px" onclick={() => {
            if (logAutoRefresh) { clearInterval(logAutoRefresh); logAutoRefresh = null; }
            else { logAutoRefresh = setInterval(() => refreshLogs(), 2000); refreshLogs(); }
          }}>{logAutoRefresh ? '⏸ Pause' : '▶ Live'}</button>
          <button class="btn-game btn-dark" style="padding:3px 8px; font-size:10px" onclick={refreshLogs}>🔄</button>
          <button class="btn-game btn-dark" style="padding:3px 8px; font-size:10px" onclick={() => $adminLiveLogs = []}>Clear</button>
          <button class="btn-game btn-dark" style="padding:3px 8px; font-size:10px" onclick={() => {
            const text = ($adminLiveLogs || []).map(e => `[${e.time}] [${e.category}] ${e.player ? '['+e.player+'] ' : ''}${e.text}`).join('\n');
            const blob = new Blob([text], { type: 'text/plain' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
            a.download = `activity-${new Date().toISOString().slice(0,10)}.log`; a.click();
          }}>Export</button>
        </div>
      </div>

      <!-- Category toggles -->
      <div style="padding:6px 10px; display:flex; gap:3px; flex-wrap:wrap; border-bottom:1px solid #1a1714">
        {#each Object.keys(logCategories) as cat}
          {@const colors: Record<string, string> = { RAW: '#9ca3af', AUTH: '#60a5fa', COMBAT: '#f87171', ECONOMY: '#fbbf24', PVP: '#c084fc', SOCIAL: '#4ade80', GUILD: '#f97316', ADMIN: '#fb923c', SYSTEM: '#78716c', ITEM: '#a78bfa', SKILL: '#2dd4bf' }}
          <button
            style="padding:2px 8px; border-radius:4px; font-size:10px; font-weight:600; cursor:pointer;
              border:1px solid {logCategories[cat] ? colors[cat] || '#78716c' : '#2a2520'};
              background:{logCategories[cat] ? '#0f0d0b' : 'transparent'};
              color:{logCategories[cat] ? colors[cat] || '#78716c' : '#4b5563'};
              opacity:{logCategories[cat] ? 1 : 0.5}"
            onclick={() => { logCategories[cat] = !logCategories[cat]; logCategories = logCategories; refreshLogs(); }}>
            {cat}
          </button>
        {/each}
      </div>

      <!-- Search + Player filter -->
      <div style="padding:6px 10px; display:flex; gap:6px; border-bottom:1px solid #1a1714">
        <input type="text" bind:value={logSearch} placeholder="Search logs..."
          onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && refreshLogs()}
          style="flex:1; padding:4px 8px; background:#0a0908; border:1px solid #2a2520; border-radius:4px; color:#e8e6dc; font-size:11px; min-width:0" />
        <input type="text" bind:value={logPlayer} placeholder="Player..."
          onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && refreshLogs()}
          style="width:120px; padding:4px 8px; background:#0a0908; border:1px solid #2a2520; border-radius:4px; color:#e8e6dc; font-size:11px" />
      </div>

      <!-- Log entries -->
      <div style="max-height:600px; overflow-y:auto; font-family:monospace; font-size:11px; line-height:1.7; background:#050505">
        {#if ($adminLiveLogs || []).length === 0}
          <div style="text-align:center; color:#78716c; padding:20px">No activity matching filters.</div>
        {:else}
          {#each $adminLiveLogs as entry}
            {@const colors: Record<string, string> = { RAW: '#6b7280', AUTH: '#60a5fa', COMBAT: '#f87171', ECONOMY: '#fbbf24', PVP: '#c084fc', SOCIAL: '#4ade80', GUILD: '#f97316', ADMIN: '#fb923c', SYSTEM: '#78716c', ITEM: '#a78bfa', SKILL: '#2dd4bf' }}
            <div style="padding:2px 10px; border-bottom:1px solid #0a0908; display:flex; gap:6px; align-items:baseline">
              <span style="color:#374151; flex-shrink:0; font-size:10px">{entry.time}</span>
              <span style="color:{colors[entry.category] || '#78716c'}; font-weight:700; width:55px; flex-shrink:0; font-size:9px; text-align:right">{entry.category}</span>
              {#if entry.player}
                <span style="color:#d4a853; flex-shrink:0; font-size:10px">{entry.player}</span>
              {/if}
              <span style="color:#a8a29e; min-width:0; overflow:hidden; text-overflow:ellipsis">{entry.text}</span>
            </div>
          {/each}
        {/if}
      </div>
    </div>

  <!-- CHAT LOGS -->
  {:else if activeSection === 'chatlog'}
    <div class="game-panel">
      <div class="game-panel-header" style="display:flex; justify-content:space-between; align-items:center">
        <span>Today's Chat Log</span>
        <button class="btn-game btn-dark" style="padding:3px 10px;font-size:11px" onclick={() => send({ type: 'admin_chat_logs' })}>🔄 Refresh</button>
      </div>
      <div style="max-height:500px; overflow-y:auto; padding:8px; font-family:monospace; font-size:11px; line-height:1.6; background:#050505">
        {#if ($adminChatLogs || []).length === 0}
          <div style="text-align:center; color:#78716c; padding:20px">No chat logs for today.</div>
        {:else}
          {#each $adminChatLogs as log}
            <div style="color:#8a8078; border-bottom:1px solid #0f0d0b; padding:2px 4px">{log.text}</div>
          {/each}
        {/if}
      </div>
    </div>

  <!-- TOOLS -->
  {:else if activeSection === 'tools'}
    <div class="game-panel">
      <div class="game-panel-header">Broadcast</div>
      <div style="padding:12px;display:flex;gap:8px">
        <input type="text" bind:value={broadcastText} placeholder="Message to all online players..." style="{inputStyle}flex:1;" />
        <button class="btn-game btn-gold" style="padding:8px 16px" onclick={() => { send({ type: 'admin_broadcast', text: broadcastText }); broadcastText = ''; }}>Send</button>
      </div>
    </div>

    <div class="game-panel">
      <div class="game-panel-header">Game Data</div>
      <div style="padding:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;font-size:12px">
        <div style="background:#0a0908;border:1px solid #1a1714;border-radius:6px;padding:10px;text-align:center">
          <div style="font-size:18px;font-weight:700;color:#e2e0d6">{Object.keys(itemMap).length}</div>
          <div style="color:#78716c;font-size:10px;text-transform:uppercase">Total Items</div>
        </div>
        <div style="background:#0a0908;border:1px solid #1a1714;border-radius:6px;padding:10px;text-align:center">
          <div style="font-size:18px;font-weight:700;color:#e2e0d6">{($gameData?.npcs || []).length}</div>
          <div style="color:#78716c;font-size:10px;text-transform:uppercase">Total NPCs</div>
        </div>
        <div style="background:#0a0908;border:1px solid #1a1714;border-radius:6px;padding:10px;text-align:center">
          <div style="font-size:18px;font-weight:700;color:#e2e0d6">{($gameData?.dungeons || []).length}</div>
          <div style="color:#78716c;font-size:10px;text-transform:uppercase">Dungeons</div>
        </div>
        <div style="background:#0a0908;border:1px solid #1a1714;border-radius:6px;padding:10px;text-align:center">
          <div style="font-size:18px;font-weight:700;color:#e2e0d6">{Object.keys($gameData?.classes || {}).length}</div>
          <div style="color:#78716c;font-size:10px;text-transform:uppercase">Classes</div>
        </div>
      </div>
    </div>
  {/if}

</div>
{/if}
