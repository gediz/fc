<script lang="ts">
  import { battleLog, getBattleLog } from '../../stores/game.js';
  import { onMount } from 'svelte';

  onMount(() => getBattleLog());

  let logFilter: 'all' | 'npc' | 'pvp' = 'all';

  $: allEntries = ($battleLog || []).slice().reverse(); // newest first
  $: entries = allEntries.filter(e => {
    if (logFilter === 'npc') return e.type !== 'pvp';
    if (logFilter === 'pvp') return e.type === 'pvp';
    return true;
  });

  $: npcCount = allEntries.filter(e => e.type !== 'pvp').length;
  $: pvpCount = allEntries.filter(e => e.type === 'pvp').length;
</script>

<div style="display:flex; flex-direction:column; gap:14px">
  <div class="combat-arena" style="padding:14px 20px">
    <div style="display:flex; align-items:center; justify-content:space-between">
      <div>
        <h2 class="font-fantasy" style="font-size:22px; font-weight:700; color:#d4a853; margin:0; text-shadow:0 0 20px rgba(212,168,83,0.3)">📜 Battle Log</h2>
        <p style="color:#8a8078; font-size:13px; margin:4px 0 0">Your last {allEntries.length} fights</p>
      </div>
      <button class="btn-game btn-dark" style="font-size:12px; padding:6px 12px" onclick={getBattleLog}>🔄 Refresh</button>
    </div>
  </div>

  {#if allEntries.length === 0}
    <div class="game-panel" style="padding:40px; text-align:center">
      <div style="font-size:40px; margin-bottom:12px; opacity:0.3">📜</div>
      <div class="font-fantasy" style="color:#8a8078; font-size:14px">No battles yet</div>
      <div style="font-size:12px; color:#4b5563; margin-top:6px">Fight some enemies in the Arena!</div>
    </div>
  {:else}
    <div class="game-panel">
      <div class="game-panel-header" style="display:flex; justify-content:space-between; align-items:center">
        <span>Recent Battles</span>
        <span style="font-size:11px; color:#8a8078; font-family:'Inter',sans-serif; font-weight:400; text-transform:none; letter-spacing:normal">
          {entries.filter(e => e.won).length}W / {entries.filter(e => !e.won).length}L
        </span>
      </div>

      <!-- Filter tabs -->
      <div style="padding:8px 12px 4px; display:flex; gap:4px;">
        <button
          style="padding:4px 10px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer;
            border:1px solid {logFilter === 'all' ? '#ca8a04' : '#2a2520'};
            background:{logFilter === 'all' ? 'linear-gradient(180deg,#a16207,#713f12)' : '#0f0d0b'};
            color:{logFilter === 'all' ? '#fef3c7' : '#78716c'}"
          onclick={() => { logFilter = 'all'; }}>
          All ({allEntries.length})
        </button>
        <button
          style="padding:4px 10px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer;
            border:1px solid {logFilter === 'npc' ? '#ca8a04' : '#2a2520'};
            background:{logFilter === 'npc' ? 'linear-gradient(180deg,#a16207,#713f12)' : '#0f0d0b'};
            color:{logFilter === 'npc' ? '#fef3c7' : '#78716c'}"
          onclick={() => { logFilter = 'npc'; }}>
          NPC ({npcCount})
        </button>
        <button
          style="padding:4px 10px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer;
            border:1px solid {logFilter === 'pvp' ? '#ca8a04' : '#2a2520'};
            background:{logFilter === 'pvp' ? 'linear-gradient(180deg,#a16207,#713f12)' : '#0f0d0b'};
            color:{logFilter === 'pvp' ? '#fef3c7' : '#78716c'}"
          onclick={() => { logFilter = 'pvp'; }}>
          PvP ({pvpCount})
        </button>
      </div>

      <div style="padding:8px; display:flex; flex-direction:column; gap:6px">
        {#each entries as entry, i}
          {@const isPvp = entry.type === 'pvp'}
          <div class="game-card" style="display:flex; align-items:center; gap:12px; padding:10px 12px; {isPvp ? 'border-left:3px solid #d4a853;' : ''}">
            <!-- Result icon -->
            <div style="
              width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0;
              background: {entry.won ? 'linear-gradient(135deg,#052e16,#0a1a0a)' : 'linear-gradient(135deg,#1c0505,#1a0808)'};
              border: 1px solid {entry.won ? '#15803d' : '#7f1d1d'};
            ">
              {entry.won ? '🏆' : '💀'}
            </div>

            <!-- Details -->
            <div style="flex:1; min-width:0">
              <div style="display:flex; align-items:center; gap:6px">
                <span style="font-size:16px">{isPvp ? '⚔️' : entry.enemyIcon}</span>
                <span class="font-fantasy" style="font-weight:600; color:{entry.won ? '#4ade80' : '#f87171'}; font-size:14px">
                  {entry.won ? 'Victory' : 'Defeat'}
                </span>
                <span style="color:#8a8078; font-size:13px">vs {entry.enemy}</span>
                {#if isPvp}
                  <span style="font-size:10px; padding:1px 5px; border-radius:4px; background:#1c1608; color:#d4a853; border:1px solid #3d2a15; font-weight:600">
                    PvP
                  </span>
                {/if}
                <span style="font-size:11px; padding:1px 5px; border-radius:4px; background:#1a1714; color:#8a8078; border:1px solid #2a2520">
                  Lv.{entry.enemyLv}
                </span>
              </div>
              <div style="display:flex; gap:10px; font-size:11px; color:#78716c; margin-top:3px">
                <span>{entry.rounds} rounds</span>
                {#if entry.drop}
                  <span style="color:#4ade80">🎁 {entry.drop}</span>
                {/if}
                <span style="margin-left:auto">{new Date(entry.ts).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        {/each}
        {#if entries.length === 0}
          <div style="text-align:center; padding:20px; color:#78716c; font-size:13px">
            No {logFilter === 'pvp' ? 'PvP' : 'NPC'} battles found.
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
