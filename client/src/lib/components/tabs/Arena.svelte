<script lang="ts">
  import { player, gameData, npcResult, startAutoFarm, autoFarm, stopAutoFarm, dismissAutoFarm, humanize, triggerNextAutoFight } from '../../stores/game.js';
  import CombatViewer from '../CombatViewer.svelte';

  let autoFarmCombatKey: number = 0;
  let combatAnimating: boolean = false;
  let stoppingAfterFight: boolean = false;
  let lastCompletedKey: number = -1;
  let pendingSwitch: string | null = null;

  // Auto-farm: remount combat viewer on each new result
  $: if ($npcResult && $autoFarm?.running) {
    autoFarmCombatKey++;
    combatAnimating = true;
  }

  // Reset stopping flag when farm stops
  $: if (!$autoFarm?.running) stoppingAfterFight = false;

  // Dynamic speed: short fights get instant replay, longer fights get fast playback
  $: autoFarmSpeed = (() => {
    if (!$npcResult?.log) return 2;
    const rounds = $npcResult.log.filter(e => e.type === 'round').length;
    if (rounds <= 2) return -1;
    if (rounds <= 5) return 4;
    return 2;
  })();

  function onFightComplete() {
    lastCompletedKey = autoFarmCombatKey;
    combatAnimating = false;
    if (pendingSwitch) {
      const newNpc = pendingSwitch;
      pendingSwitch = null;
      stoppingAfterFight = false;
      stopAutoFarm();
      startAutoFarm(newNpc);
    } else if (stoppingAfterFight) {
      stoppingAfterFight = false;
      stopAutoFarm();
    } else {
      triggerNextAutoFight();
    }
  }

  function handleStop() {
    stoppingAfterFight = true;
    // Also stop immediately if between fights
    if (!combatAnimating) {
      stoppingAfterFight = false;
      stopAutoFarm();
    }
  }

  $: npcs = ($gameData?.npcs || [])
    .filter(n => n.level <= ($player?.level || 1) + 3)
    .sort((a, b) => b.level - a.level);

  $: itemMap = $gameData?.items || {};
  $: hpPotCount = ($player?.inventory || []).filter(id => id && itemMap[id]?.healHp).length;
  $: mpPotCount = ($player?.inventory || []).filter(id => id && itemMap[id]?.healMp).length;

  // Carousel — start at current farm target or recommended opponent
  let npcIndex: number = -1;
  let lastNpcCount: number = 0;
  $: {
    if (npcs.length !== lastNpcCount) {
      lastNpcCount = npcs.length;
      const farmIdx = af?.npcId ? npcs.findIndex(n => n.id === af.npcId) : -1;
      if (farmIdx >= 0) {
        npcIndex = farmIdx;
      } else {
        const plvl = $player?.level || 1;
        const best = npcs.findIndex(n => n.level <= plvl);
        npcIndex = best >= 0 ? best : 0;
      }
    }
    // Clamp if out of bounds
    if (npcIndex >= npcs.length) npcIndex = Math.max(0, npcs.length - 1);
  }
  $: currentNpc = npcs[npcIndex] || null;
  function prevNpc() { if (npcIndex > 0) npcIndex--; }
  function nextNpc() { if (npcIndex < npcs.length - 1) npcIndex++; }

  $: af = $autoFarm;

  function fight(npcId: string) {
    // Switch target if already farming, or start new
    if (af?.running) {
      pendingSwitch = npcId;
      stoppingAfterFight = true;
    } else {
      if (af) dismissAutoFarm();
      startAutoFarm(npcId);
    }
  }

  function diffColor(npcLvl: number) {
    const diff = npcLvl - ($player?.level || 1);
    if (diff >= 3) return 'text-red-400';
    if (diff >= 1) return 'text-yellow-400';
    return 'text-green-400';
  }

  function rc(rarity: string) { return $gameData?.rarity?.[rarity] || '#9ca3af'; }
</script>

<div style="display:flex; flex-direction:column; gap:16px">
  <!-- Header -->
  <div class="combat-arena" style="padding:14px 20px">
    <h2 class="font-fantasy" style="font-size:22px; font-weight:700; color:#d4a853; margin:0; text-shadow:0 0 20px rgba(212,168,83,0.3)">⚔️ The Arena</h2>
    <p style="color:#8a8078; font-size:13px; margin:4px 0 0">Click Fight to start battling. Your character fights automatically.</p>
  </div>

  <!-- Opponent Carousel -->
  {#if currentNpc}
    {@const npc = currentNpc}
    {@const diff = npc.level - ($player?.level || 1)}
    <div class="game-panel">
      <div class="game-panel-header" style="display:flex; justify-content:space-between; align-items:center">
        <span>Choose Opponent</span>
        <div style="display:flex; gap:8px; align-items:center">
          {#if af?.running}
            <span style="font-size:11px; color:#4ade80">🔄 {af.totalKills} kills</span>
            <button class="btn-game" style="padding:5px 14px; font-size:12px; font-weight:600; background:linear-gradient(180deg,{stoppingAfterFight ? '#713f12' : '#7f1d1d'},{stoppingAfterFight ? '#451a03' : '#450a0a'}); color:{stoppingAfterFight ? '#fbbf24' : '#fca5a5'}; border:1px solid {stoppingAfterFight ? '#92400e' : '#991b1b'}" onclick={handleStop} disabled={stoppingAfterFight}>
              {stoppingAfterFight ? '⏳ Stopping...' : '⏹ Stop'}
            </button>
          {/if}
          <span style="font-size:11px; color:#8a8078; font-family:'Inter',sans-serif; font-weight:400; text-transform:none; letter-spacing:normal">{npcIndex + 1} / {npcs.length}</span>
        </div>
      </div>

      <div style="padding:16px; display:flex; align-items:center; gap:12px">
        <!-- Prev arrow -->
        <button
          style="width:40px; height:40px; border-radius:50%; border:1px solid {npcIndex > 0 ? '#2a2520' : '#1a1714'}; background:#0f0d0b; color:{npcIndex > 0 ? '#d4a853' : '#2a2520'}; font-size:18px; cursor:{npcIndex > 0 ? 'pointer' : 'default'}; flex-shrink:0; display:flex; align-items:center; justify-content:center"
          disabled={npcIndex <= 0}
          onclick={prevNpc}>
          ‹
        </button>

        <!-- NPC Card -->
        <div style="flex:1; text-align:center">
          <!-- Icon + Name -->
          <div style="font-size:48px; margin-bottom:8px; filter:drop-shadow(0 0 12px rgba(212,168,83,0.2))">{npc.icon}</div>
          <div style="display:flex; align-items:center; gap:6px; justify-content:center; margin-bottom:6px">
            <span class="font-fantasy {diffColor(npc.level)}" style="font-weight:700; font-size:18px">{npc.name}</span>
            {#if npc.elite}
              <span style="font-size:10px; padding:2px 6px; border-radius:4px; background:#1a0820; color:#c084fc; border:1px solid #3d1545">ELITE</span>
            {/if}
          </div>

          <!-- Level badge -->
          <div style="display:inline-block; font-size:13px; padding:3px 12px; border-radius:6px; margin-bottom:10px; {diff >= 3 ? 'background:#1a0808; color:#f87171; border:1px solid #3d1515' : diff >= 1 ? 'background:#1a1808; color:#fbbf24; border:1px solid #3d3515' : 'background:#081a08; color:#4ade80; border:1px solid #153d15'}">
            Level {npc.level}
            {#if diff >= 3}(Hard){:else if diff >= 1}(Challenging){:else if diff <= -3}(Easy){:else}(Fair){/if}
          </div>

          <!-- Stats row -->
          <div style="display:flex; gap:12px; justify-content:center; margin-bottom:10px; font-size:13px">
            <span class="stat-str" style="font-weight:600">STR {npc.str}</span>
            <span class="stat-agi" style="font-weight:600">AGI {npc.agi}</span>
            <span class="stat-end" style="font-weight:600">END {npc.end}</span>
            <span class="stat-int" style="font-weight:600">INT {npc.int}</span>
          </div>

          <!-- Rewards -->
          <div style="display:flex; gap:16px; justify-content:center; margin-bottom:10px; font-size:13px">
            <span style="color:#60a5fa">⭐ {humanize(npc.xp)} XP</span>
            <span style="color:#fbbf24">🪙 {humanize(npc.gold)}</span>
            <span style="color:#4ade80">🎁 {npc.dropChance}% drop</span>
          </div>

          <!-- Lore -->
          {#if npc.lore}
            <div style="font-size:12px; color:#78716c; font-style:italic; line-height:1.5; max-width:400px; margin:0 auto 12px">
              "{npc.lore}"
            </div>
          {/if}

          <!-- Fight button -->
          {#if af?.running && af?.npcId === npc.id}
            <button class="btn-fight btn-game" style="font-size:15px; padding:10px 32px; opacity:0.5; cursor:default" disabled>
              🔄 Currently fighting
            </button>
          {:else if af?.running}
            <button class="btn-fight btn-game" style="font-size:15px; padding:10px 32px" onclick={() => fight(npc.id)} disabled={stoppingAfterFight}>
              {pendingSwitch === npc.id ? '⏳ Switching...' : `⚔️ Switch to ${npc.name}`}
            </button>
          {:else}
            <button class="btn-fight btn-game" style="font-size:15px; padding:10px 32px" onclick={() => fight(npc.id)}>
              ⚔️ Fight {npc.name}
            </button>
          {/if}
        </div>

        <!-- Next arrow -->
        <button
          style="width:40px; height:40px; border-radius:50%; border:1px solid {npcIndex < npcs.length - 1 ? '#2a2520' : '#1a1714'}; background:#0f0d0b; color:{npcIndex < npcs.length - 1 ? '#d4a853' : '#2a2520'}; font-size:18px; cursor:{npcIndex < npcs.length - 1 ? 'pointer' : 'default'}; flex-shrink:0; display:flex; align-items:center; justify-content:center"
          disabled={npcIndex >= npcs.length - 1}
          onclick={nextNpc}>
          ›
        </button>
      </div>

    </div>
  {/if}

  <!-- Active fight viewer -->
  {#if af}
    <div class="game-panel">
      <div class="game-panel-header" style="display:flex; justify-content:space-between; align-items:center">
        <span>{af.running ? '🔄' : '⏹'} {af.npcIcon} {af.npcName}</span>
        <div style="display:flex; gap:8px; align-items:center">
          <span style="font-size:12px; color:#4ade80">Kills: {af.totalKills}</span>
          {#if af.drops.length > 0}<span style="font-size:12px; color:#d4a853">Drops: {af.drops.length}</span>{/if}
          {#if !af.running}
            <button class="btn-game btn-gold" style="padding:4px 12px; font-size:11px" onclick={() => startAutoFarm(af.npcId)}>▶ Resume</button>
            <button class="btn-game btn-dark" style="padding:4px 12px; font-size:11px" onclick={() => { dismissAutoFarm(); $npcResult = null; }}>✖ Close</button>
          {/if}
        </div>
      </div>
      <!-- Auto-potion status -->
      {#if $player?.autoPotions}
        <div style="padding:4px 12px 8px; display:flex; gap:10px; font-size:11px; flex-wrap:wrap">
          <span style="color:{hpPotCount > 0 ? '#4ade80' : '#f87171'}">
            ❤️ HP Pots: {hpPotCount}{hpPotCount === 0 ? ' (EMPTY!)' : ''}
          </span>
          <span style="color:{mpPotCount > 0 ? '#60a5fa' : '#f87171'}">
            💙 MP Pots: {mpPotCount}{mpPotCount === 0 ? ' (EMPTY!)' : ''}
          </span>
          {#if $player?.autoBuyPotions}
            <span style="color:#c084fc">🛒 Auto-buy ON</span>
          {/if}
        </div>
      {:else}
        <div style="padding:4px 12px 8px; font-size:11px; color:#4b5563">
          🧪 Auto-potions OFF
        </div>
      {/if}
    </div>

    <!-- Combat viewer (fixed height to prevent layout shift) -->
    {#if $npcResult}
      <div style="max-height:500px; overflow-y:auto;">
      {#key autoFarmCombatKey}
        <CombatViewer
          log={$npcResult.log}
          playerName={$player?.name || 'Hero'}
          playerClassId={$player?.class || 'warrior'}
          enemyName={$npcResult.npc.name}
          enemyIcon={$npcResult.npc.icon}
          playerMaxHp={$npcResult.playerMaxHp}
          playerStartHp={$npcResult.playerStartHp || $npcResult.playerMaxHp}
          enemyMaxHp={$npcResult.npcMaxHp}
          autoSpeed={autoFarmCombatKey === lastCompletedKey ? -1 : autoFarmSpeed}
          onComplete={onFightComplete}
        />
      {/key}
      </div>
    {/if}

    <!-- Recent drops -->
    {#if af.drops.length > 0}
      <div class="game-panel">
        <div class="game-panel-header">Recent Drops</div>
        <div style="padding:8px; display:flex; flex-wrap:wrap; gap:6px">
          {#each af.drops.slice(-10) as drop}
            <span style="font-size:12px; padding:3px 8px; border-radius:6px; background:#0f0d0b; border:1px solid #2a2520; color:{rc(drop.rarity)}">
              {drop.icon} {drop.name}
            </span>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>
