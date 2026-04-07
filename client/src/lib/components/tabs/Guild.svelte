<script lang="ts">
  import { player, guildInfo, guildList, createGuild, joinGuild, leaveGuild, getGuild, listGuilds, guildChat, guildAccept, guildDeny, guildDonate, guildUpdate, onlinePlayers, humanize, viewPlayer } from '../../stores/game.js';
  import { send } from '../../stores/connection.js';
  import { onMount } from 'svelte';

  onMount(() => { getGuild(); listGuilds(); });

  let newGuildName: string = '';
  let newGuildIcon: string = '⚔️';
  let newGuildPrivate: boolean = false;
  let chatInput: string = '';
  let showCreate: boolean = false;
  let donateAmount: number = 100;
  let showEditGuild: boolean = false;
  let editIcon: string = '';
  let editDescription: string = '';
  let editNotice: string = '';

  function handleDonate() {
    if (donateAmount > 0) { guildDonate(donateAmount); }
  }

  function openEditGuild() {
    editIcon = guild?.icon || '⚔️';
    editDescription = guild?.description || '';
    editNotice = guild?.notice || '';
    showEditGuild = true;
  }

  function handleSaveGuild() {
    guildUpdate({ icon: editIcon, description: editDescription, notice: editNotice });
    showEditGuild = false;
  }

  $: guild = $guildInfo;
  $: allGuilds = $guildList || [];
  $: onlineMembers = guild ? $onlinePlayers.filter(p => guild.members?.includes(p.name)) : [];

  function handleCreate() {
    if (newGuildName.trim().length >= 2) {
      send({ type: 'create_guild', name: newGuildName.trim(), icon: newGuildIcon, private: newGuildPrivate });
      showCreate = false;
      newGuildName = '';
    }
  }

  function handleChat() {
    if (chatInput.trim()) { guildChat(chatInput.trim()); chatInput = ''; }
  }
</script>

<div style="display:flex; flex-direction:column; gap:14px; max-width:860px">
  {#if guild}
    <!-- In a guild -->
    <div class="combat-arena" style="padding:16px 20px">
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px">
        <div style="font-size:36px">{guild.icon}</div>
        <div style="flex:1">
          <h2 class="font-fantasy" style="font-size:22px; font-weight:700; color:#d4a853; margin:0">{guild.name}</h2>
          {#if guild.description}
            <div style="color:#b0a898; font-size:13px; margin-top:2px">{guild.description}</div>
          {/if}
          <div style="color:#8a8078; font-size:13px">Level {guild.level} · {guild.members?.length || 0}/{guild.maxMembers || 10} members · Led by {guild.leader}</div>
        </div>
        <div style="text-align:center; padding:4px 14px; border-radius:8px; background:#1c1608; border:1px solid #3d2a15">
          <div style="font-size:20px; font-weight:700; color:#d4a853; line-height:1">{guild.level}</div>
          <div style="font-size:10px; color:#8a8078; text-transform:uppercase; letter-spacing:0.5px">Level</div>
        </div>
      </div>
      <!-- XP Bar -->
      <div style="margin-bottom:8px">
        <div style="display:flex; justify-content:space-between; font-size:11px; color:#8a8078; margin-bottom:3px">
          <span>Guild XP</span>
          <span>{guild.guildXp || 0} / {guild.guildXpNeeded || 500}</span>
        </div>
        <div style="height:8px; background:#1a1714; border-radius:4px; overflow:hidden; border:1px solid #2a2520">
          <div style="height:100%; background:linear-gradient(90deg, #d4a853, #f0c060); border-radius:4px; transition:width 0.3s; width:{Math.min(100, ((guild.guildXp || 0) / (guild.guildXpNeeded || 500)) * 100)}%"></div>
        </div>
      </div>
      <div style="display:flex; gap:12px; flex-wrap:wrap">
        <div style="padding:6px 14px; border-radius:6px; background:#081a08; border:1px solid #153d15; color:#4ade80; font-size:13px">
          XP Bonus: +{Math.round((guild.bonus?.xpPct || 0) * 100)}%
        </div>
        <div style="padding:6px 14px; border-radius:6px; background:#1a1808; border:1px solid #3d3515; color:#fbbf24; font-size:13px">
          Gold Bonus: +{Math.round((guild.bonus?.goldPct || 0) * 100)}%
        </div>
        <div style="padding:6px 14px; border-radius:6px; background:#0a0908; border:1px solid #2a2520; color:#8a8078; font-size:13px">
          Total Kills: {guild.totalKills || 0}
        </div>
      </div>
      {#if guild.notice}
        <div style="margin-top:10px; padding:10px 14px; border-radius:8px; background:#1c1608; border:1px solid #3d2a15; color:#f0c060; font-size:13px">
          <strong>📌 Notice:</strong> {guild.notice}
        </div>
      {/if}
    </div>

    <!-- Members -->
    <div class="game-panel">
      <div class="game-panel-header" style="display:flex; justify-content:space-between">
        <span>Members ({guild.members?.length || 0})</span>
        <span style="font-size:11px; color:#8a8078; font-family:'Inter',sans-serif; text-transform:none; letter-spacing:normal">{onlineMembers.length} online</span>
      </div>
      <div style="padding:8px; display:flex; flex-direction:column; gap:2px">
        {#each guild.members || [] as member}
          {@const isOnline = $onlinePlayers.some(p => p.name === member)}
          <div style="display:flex; align-items:center; gap:8px; padding:6px 12px; border-radius:6px; background:{isOnline ? 'rgba(74,222,128,0.04)' : 'transparent'}">
            <div style="width:8px; height:8px; border-radius:50%; flex-shrink:0; background:{isOnline ? '#4ade80' : '#4b5563'}; box-shadow:{isOnline ? '0 0 6px rgba(74,222,128,0.4)' : 'none'}"></div>
            <button style="font-size:13px; color:{member === guild.leader ? '#d4a853' : '#e8e6dc'}; flex:1; background:none; border:none; cursor:pointer; text-align:left; padding:0" onclick={() => viewPlayer(member)}>{member}</button>
            {#if (guild.donations?.[member] || 0) > 0}
              <span style="font-size:10px; color:#a16207; padding:1px 6px; border-radius:4px; background:rgba(161,98,7,0.1); border:1px solid rgba(161,98,7,0.2)">{guild.donations[member]}🪙</span>
            {/if}
            {#if member === guild.leader}
              <span style="font-size:10px; padding:1px 6px; border-radius:4px; background:#1c1608; color:#d4a853; border:1px solid #3d2a15">Leader</span>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- Applications (leader only, private guilds) -->
    {#if guild.private && guild.leader === $player?.name && guild.applications?.length > 0}
      <div class="game-panel" style="border-color:#d4a853">
        <div class="game-panel-header" style="color:#d4a853">📩 Applications ({guild.applications.length})</div>
        <div style="padding:8px; display:flex; flex-direction:column; gap:6px">
          {#each guild.applications as applicant}
            <div class="game-card" style="display:flex; align-items:center; gap:10px; padding:10px">
              <span style="font-size:14px; color:#e8e6dc; flex:1">{applicant}</span>
              <button class="btn-game btn-gold" style="padding:4px 12px; font-size:12px" onclick={() => guildAccept(applicant)}>✅ Accept</button>
              <button class="btn-game btn-dark" style="padding:4px 12px; font-size:12px" onclick={() => guildDeny(applicant)}>❌ Deny</button>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Guild info -->
    <div style="display:flex; gap:6px; flex-wrap:wrap; font-size:12px; color:#8a8078">
      <span>{guild.private ? '🔒 Private' : '🌐 Public'} guild</span>
      <span>· {guild.members?.length || 0} / {guild.maxMembers || 10} members</span>
    </div>

    <!-- Donate Gold -->
    <div class="game-panel">
      <div class="game-panel-header">Donate Gold</div>
      <div style="padding:8px">
        <div style="font-size:12px; color:#8a8078; margin-bottom:6px">Donate gold to earn guild XP (1 gold = 1 XP)</div>
        <div style="display:flex; gap:6px; align-items:center">
          <input type="number" bind:value={donateAmount} min="1" max={$player?.gold || 0}
            style="width:100px; padding:8px 12px; background:#0a0908; border:1px solid #1a1714; border-radius:8px; color:#e8e6dc; font-size:13px; -moz-appearance:textfield; appearance:textfield" />
          <button class="btn-game btn-gold" style="padding:8px 16px; font-size:13px" onclick={handleDonate}>Donate {donateAmount}🪙</button>
          <span style="font-size:12px; color:#8a8078; margin-left:auto">You have {$player?.gold || 0}🪙</span>
        </div>
      </div>
    </div>

    <!-- Guild chat -->
    <div class="game-panel">
      <div class="game-panel-header">Guild Chat</div>
      <div style="padding:8px">
        <div style="display:flex; gap:6px">
          <input type="text" bind:value={chatInput} onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && handleChat()}
            placeholder="Message guild..."
            style="flex:1; padding:8px 12px; background:#0a0908; border:1px solid #1a1714; border-radius:8px; color:#e8e6dc; font-size:13px" />
          <button class="btn-game btn-gold" style="padding:8px 16px; font-size:13px" onclick={handleChat}>Send</button>
        </div>
      </div>
    </div>

    <!-- Edit Guild (leader only) -->
    {#if guild.leader === $player?.name}
      {#if showEditGuild}
        <div class="game-panel">
          <div class="game-panel-header">Edit Guild</div>
          <div style="padding:12px; display:flex; flex-direction:column; gap:8px">
            <label style="font-size:12px; color:#8a8078">Icon (emoji, max 2 chars)</label>
            <input type="text" bind:value={editIcon} maxlength="2"
              style="width:80px; padding:8px 12px; background:#0a0908; border:1px solid #2a2520; border-radius:8px; color:#e8e6dc; font-size:20px; text-align:center" />
            <label style="font-size:12px; color:#8a8078">Description (max 200 chars)</label>
            <input type="text" bind:value={editDescription} maxlength="200" placeholder="Guild description..."
              style="padding:8px 12px; background:#0a0908; border:1px solid #2a2520; border-radius:8px; color:#e8e6dc; font-size:13px" />
            <label style="font-size:12px; color:#8a8078">Notice (members only, max 200 chars)</label>
            <input type="text" bind:value={editNotice} maxlength="200" placeholder="Guild notice..."
              style="padding:8px 12px; background:#0a0908; border:1px solid #2a2520; border-radius:8px; color:#e8e6dc; font-size:13px" />
            <div style="display:flex; gap:8px; margin-top:4px">
              <button class="btn-game btn-gold" style="flex:1" onclick={handleSaveGuild}>Save</button>
              <button class="btn-game btn-dark" onclick={() => showEditGuild = false}>Cancel</button>
            </div>
          </div>
        </div>
      {:else}
        <button class="btn-game btn-dark" style="width:100%; padding:10px; font-size:13px" onclick={openEditGuild}>✏️ Edit Guild</button>
      {/if}
    {/if}

    <div style="text-align:center">
      <button class="btn-game btn-dark" style="font-size:12px; padding:6px 16px" onclick={leaveGuild}>Leave Guild</button>
    </div>

  {:else}
    <!-- Not in a guild -->
    <div class="combat-arena" style="padding:16px 20px">
      <h2 class="font-fantasy" style="font-size:22px; font-weight:700; color:#d4a853; margin:0 0 6px; text-shadow:0 0 20px rgba(212,168,83,0.3)">⚔️ Guilds</h2>
      <p style="color:#8a8078; font-size:13px">Join a guild for XP and gold bonuses!</p>
    </div>

    <!-- Create guild -->
    {#if showCreate}
      <div class="game-panel">
        <div class="game-panel-header">Create Guild (500🪙)</div>
        <div style="padding:12px; display:flex; flex-direction:column; gap:8px">
          <input type="text" bind:value={newGuildName} maxlength="24" placeholder="Guild name..."
            style="padding:10px 14px; background:#0a0908; border:1px solid #2a2520; border-radius:8px; color:#e8e6dc; font-size:14px" />
          <label style="display:flex; align-items:center; gap:8px; font-size:13px; color:#8a8078; cursor:pointer">
            <input type="checkbox" bind:checked={newGuildPrivate} style="accent-color:#d4a853; width:18px; height:18px" />
            Private guild (requires application to join)
          </label>
          <div style="display:flex; gap:8px">
            <button class="btn-game btn-gold" style="flex:1" onclick={handleCreate}>Create (500🪙)</button>
            <button class="btn-game btn-dark" onclick={() => showCreate = false}>Cancel</button>
          </div>
        </div>
      </div>
    {:else}
      <button class="btn-game btn-gold" style="width:100%; padding:12px; font-size:15px" onclick={() => showCreate = true}>
        ⚔️ Create Guild (500🪙)
      </button>
    {/if}

    <!-- Available guilds -->
    <div class="game-panel">
      <div class="game-panel-header" style="display:flex; justify-content:space-between">
        <span>Available Guilds</span>
        <button class="btn-game btn-dark" style="padding:2px 10px; font-size:10px" onclick={listGuilds}>🔄 Refresh</button>
      </div>
      <div style="padding:8px; display:flex; flex-direction:column; gap:6px">
        {#if allGuilds.length === 0}
          <div style="text-align:center; color:#8a8078; padding:20px; font-size:13px">No guilds yet. Be the first!</div>
        {:else}
          {#each allGuilds as g}
            <div class="game-card" style="display:flex; align-items:center; gap:12px; padding:12px">
              <div style="font-size:28px">{g.icon}</div>
              <div style="flex:1">
                <div class="font-fantasy" style="font-weight:600; color:#d4a853; font-size:14px">{g.name}</div>
                <div style="font-size:12px; color:#8a8078">
                  {g.private ? '🔒' : '🌐'} Lv.{g.level} · {g.members}/{g.maxMembers || 20} · {g.leader}{g.totalKills ? ` · ${g.totalKills} kills` : ''}
                </div>
              </div>
              {#if g.members < (g.maxMembers || 10)}
                <button class="btn-game btn-gold" style="font-size:12px; padding:8px 14px" onclick={() => joinGuild(g.id)}>{g.private ? 'Apply' : 'Join'}</button>
              {:else}
                <span style="font-size:12px; color:#8a8078">Full</span>
              {/if}
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>
