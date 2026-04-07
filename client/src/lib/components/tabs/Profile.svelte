<script lang="ts">
  import { viewProfile, gameData, activeTab, challenge, addFriend, removeFriend, blockPlayer, guildInvite, player, guildInfo, viewPlayer, inboxComposeTo } from '../../stores/game.js';

  $: p        = $viewProfile;
  $: cls      = $gameData?.classes?.[p?.class] || { name: 'Fighter', icon: '⚔️' };
  $: titleObj = $gameData?.titles?.find(t => t.id === p?.activeTitle);
  $: itemMap  = $gameData?.items || {};

  const SLOTS = ['weapon', 'armor', 'helmet', 'boots', 'ring'];

  function timeAgo(ts: number) {
    const secs = Math.floor((Date.now() - ts) / 1000);
    if (secs < 60) return 'just now';
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    return `${Math.floor(secs / 86400)}d ago`;
  }

  function rarityColor(r: string) {
    return $gameData?.rarity?.[r] || '#9ca3af';
  }

  $: equippedItems = SLOTS.map(slot => {
    const id   = p?.equipment?.[slot];
    const inst = id ? p?.itemInstances?.[id] : null;
    const base = id ? (inst ? itemMap[inst.baseId] : itemMap[id]) : null;
    const item = base ? { id, ...base } : null;
    const elvl = id ? (p?.itemInstances?.[id]?.enchantLevel || 0) : 0;
    return { slot, item, elvl };
  });

  $: playerAchievements = (p?.achievements || []).slice(0, 24).map(achId => {
    const ach = ($gameData?.achievements || []).find(a => a.id === achId);
    return { achId, ach };
  });

  function statLine(item: any) {
    const parts = [];
    if (item.minDmg)     parts.push(`DMG ${item.minDmg}–${item.maxDmg}`);
    if (item.armor)      parts.push(`ARM ${item.armor}`);
    if (item.stats?.str) parts.push(`STR +${item.stats.str}`);
    if (item.stats?.agi) parts.push(`AGI +${item.stats.agi}`);
    if (item.stats?.end) parts.push(`END +${item.stats.end}`);
    if (item.stats?.int) parts.push(`INT +${item.stats.int}`);
    return parts.join(' · ');
  }
</script>

<div style="display:flex;flex-direction:column;gap:12px;">

  <!-- Header -->
  <div class="game-panel">
    <div class="game-panel-header" style="display:flex;align-items:center;justify-content:space-between;">
      <span>👤 Player Profile</span>
      <button
        class="btn-game btn-dark"
        style="padding:4px 12px;font-size:11px;"
        onclick={() => $activeTab = 'leaderboard'}>
        ← Back to Rankings
      </button>
    </div>
  </div>

  {#if !p}
    <div class="game-panel" style="padding:48px;text-align:center;">
      <div style="font-size:36px;margin-bottom:8px;">👤</div>
      <div class="font-fantasy" style="color:#78716c;">
        No player profile loaded.<br/>
        <span style="font-size:12px;">Click a player's name in the Rankings or Online list.</span>
      </div>
    </div>
  {:else}

    <!-- Hero card -->
    <div class="game-panel">
      <div style="padding:20px;">
        <div style="display:flex;align-items:flex-start;gap:16px;">

          <!-- Class icon -->
          <div style="
            width:64px;height:64px;
            display:flex;align-items:center;justify-content:center;
            font-size:38px;flex-shrink:0;
            background:radial-gradient(circle,#1a1714 0%,#0a0908 100%);
            border:2px solid #3d3530;border-radius:12px;
            box-shadow:0 4px 12px rgba(0,0,0,0.4);
          ">{cls.icon}</div>

          <div style="flex:1;min-width:0;">
            <div class="font-fantasy" style="font-size:20px;font-weight:700;color:#e2e0d6;">
              {p.name}
              {#if (p.prestige || 0) > 0}
                <span style="color:#fbbf24;font-size:13px;margin-left:6px;">✨ NG+{p.prestige}</span>
              {/if}
            </div>
            {#if titleObj}
              <div style="font-size:13px;font-weight:600;margin-top:2px;color:{rarityColor(titleObj.rarity)};">
                [{titleObj.name}]
              </div>
            {/if}
            <div style="font-size:13px;color:#78716c;margin-top:4px;">
              {cls.name} · Level <span style="color:#d4a853;font-weight:600;">{p.level || 1}</span>
            </div>
            {#if p.guild}
              <button style="font-size:12px;color:#c084fc;margin-top:3px;background:none;border:none;cursor:pointer;padding:0" onclick={() => $activeTab = 'guild'}>
                {p.guild.icon} {p.guild.name} →
              </button>
            {/if}
            {#if p.isOnline}
              <div style="font-size:12px;color:#4ade80;margin-top:3px;">Online now</div>
            {:else if p.showOnlineStatus !== false && p.lastOnline}
              <div style="font-size:12px;color:#78716c;margin-top:3px;">Last seen {timeAgo(p.lastOnline)}</div>
            {/if}
          </div>

          <!-- Challenge button -->
          <button
            class="btn-game btn-fight"
            style="flex-shrink:0;padding:10px 16px;"
            onclick={() => challenge(p.name)}>
            ⚔️ Challenge
          </button>
        </div>

        <!-- Social actions -->
        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:12px">
          {#if p.isFriend}
            <button class="btn-game btn-dark" style="font-size:11px; padding:6px 12px" onclick={() => { removeFriend(p.name); viewPlayer(p.name); }}>
              💔 Remove Friend
            </button>
          {:else if p.hasPendingRequest}
            <button class="btn-game" style="font-size:11px; padding:6px 12px; background:linear-gradient(180deg,#1f1a16,#151210); color:#78716c; border:1px solid #2a2520; opacity:0.7; cursor:default" disabled>
              📩 Request Pending
            </button>
          {:else}
            <button class="btn-game" style="font-size:11px; padding:6px 12px; background:linear-gradient(180deg,#052e16,#081508); color:#4ade80; border:1px solid #15803d" onclick={() => { addFriend(p.name); }}>
              📩 Send Friend Request
            </button>
          {/if}
          <button class="btn-game btn-dark" style="font-size:11px; padding:6px 12px" onclick={() => { $inboxComposeTo = p.name; $activeTab = 'inbox'; }}>
            💬 Message
          </button>
          {#if $guildInfo && $guildInfo.leader === $player?.name}
            <button class="btn-game btn-dark" style="font-size:11px; padding:6px 12px" onclick={() => guildInvite(p.name)}>
              ⚔️ Guild Invite
            </button>
          {/if}
          <button class="btn-game" style="font-size:11px; padding:6px 12px; background:linear-gradient(180deg,#1a0808,#0d0404); color:{p.isBlocked ? '#4ade80' : '#f87171'}; border:1px solid {p.isBlocked ? '#15803d' : '#7f1d1d'}" onclick={() => { blockPlayer(p.name); viewPlayer(p.name); }}>
            {p.isBlocked ? '🔓 Unblock' : '🚫 Block'}
          </button>
        </div>

        <!-- Combat stats -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:16px;">
          <div style="
            background:#0a0908;border:1px solid #2a2520;border-radius:8px;
            padding:10px;text-align:center;
          ">
            <div class="stat-str" style="font-size:20px;font-weight:700;">{p.kills || 0}</div>
            <div style="font-size:11px;color:#8a8078;text-transform:uppercase;letter-spacing:0.5px;">Kills</div>
          </div>
          <div style="
            background:#0a0908;border:1px solid #2a2520;border-radius:8px;
            padding:10px;text-align:center;
          ">
            <div style="font-size:20px;font-weight:700;color:#d4a853;">{p.pvpWins || 0}</div>
            <div style="font-size:11px;color:#8a8078;text-transform:uppercase;letter-spacing:0.5px;">PvP Wins</div>
          </div>
          <div style="
            background:#0a0908;border:1px solid #2a2520;border-radius:8px;
            padding:10px;text-align:center;
          ">
            <div style="font-size:20px;font-weight:700;color:#8a8078;">{p.deaths || 0}</div>
            <div style="font-size:11px;color:#8a8078;text-transform:uppercase;letter-spacing:0.5px;">Deaths</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Equipment -->
    <div class="game-panel">
      <div class="game-panel-header">⚔️ Equipment</div>
      <div style="padding:8px;display:flex;flex-direction:column;gap:6px;">
        {#each equippedItems as { slot, item, elvl }}
          <div style="
            display:flex;align-items:center;gap:10px;
            padding:8px 10px;
            border-radius:8px;
            background:#0a0908;
            border:1px solid #1a1714;
          ">
            <div style="font-size:11px;color:#4b5563;width:52px;flex-shrink:0;text-transform:capitalize;font-weight:600;">
              {slot}
            </div>
            {#if item}
              <div class="item-icon" style="
                font-size:18px;flex-shrink:0;
                border-color:{rarityColor(item.rarity)};
                box-shadow:0 0 6px {rarityColor(item.rarity)}33;
              ">{item.icon || '?'}</div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:600;color:{rarityColor(item.rarity)};">
                  {item.name}
                  {#if elvl > 0}
                    <span style="color:#fbbf24;font-size:11px;margin-left:3px;text-shadow:0 0 6px rgba(251,191,36,0.4);">+{elvl}</span>
                  {/if}
                </div>
                {#if statLine(item)}
                  <div style="font-size:11px;color:#8a8078;margin-top:1px;">{statLine(item)}</div>
                {/if}
              </div>
            {:else}
              <div class="item-icon" style="font-size:16px;flex-shrink:0;opacity:0.3;">—</div>
              <span style="font-size:12px;color:#4b5563;font-style:italic;">Empty</span>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- Achievements -->
    {#if (p.achievements || []).length > 0}
      <div class="game-panel">
        <div class="game-panel-header">🏅 Achievements ({p.achievements.length})</div>
        <div style="padding:12px;display:flex;flex-wrap:wrap;gap:6px;">
          {#each playerAchievements as { achId, ach }}
            <span
              style="
                font-size:22px;
                background:#0a0908;border:1px solid #2a2520;border-radius:8px;
                width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;
                cursor:default;
              "
              title={ach?.name || achId}>
              {ach?.icon || '🏅'}
            </span>
          {/each}
          {#if (p.achievements || []).length > 24}
            <span style="font-size:12px;color:#8a8078;align-self:center;padding:0 4px;">
              +{p.achievements.length - 24} more
            </span>
          {/if}
        </div>
      </div>
    {/if}

  {/if}
</div>
