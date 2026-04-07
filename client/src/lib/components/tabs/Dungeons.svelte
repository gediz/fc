<script lang="ts">
  import { player, gameData, dungeonResult, runDungeon, autoFarm } from '../../stores/game.js';
  import { afterUpdate } from 'svelte';

  let logEl: HTMLElement;
  afterUpdate(() => { if (logEl) logEl.scrollTop = logEl.scrollHeight; });

  import { onMount, onDestroy } from 'svelte';

  $: dungeons = $gameData?.dungeons || [];

  // Daily limit tracking
  let now: number = Date.now();
  let _tick: any;
  onMount(() => { _tick = setInterval(() => now = Date.now(), 1000); });
  onDestroy(() => { if (_tick) clearInterval(_tick); });

  $: dailyRuns = $player?.dailyDungeonRuns || 0;
  $: dailyDate = $player?.lastDungeonDate || '';
  $: isToday = dailyDate === new Date().toISOString().slice(0, 10);
  $: runsUsed = isToday ? dailyRuns : 0;
  $: limitReached = runsUsed >= 10;

  // Time until midnight UTC reset
  $: resetTime = (() => {
    const midnight = new Date();
    midnight.setUTCHours(24, 0, 0, 0);
    const secs = Math.max(0, Math.floor((midnight.getTime() - now) / 1000));
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h ${m}m`;
  })();

  function rarityColor(r: string) {
    return $gameData?.rarity?.[r] || '#9ca3af';
  }

  function playerLevel() { return $player?.level || 1; }
  function playerGold()  { return $player?.gold  || 0; }

  function canEnter(d: any) {
    return playerLevel() >= (d.reqLevel || 1) && playerGold() >= (d.fee || 0) && !$autoFarm?.running && !limitReached;
  }

  // Difficulty color: green (easy) → red (hard), based on req level vs player level
  function difficultyColor(d: any) {
    const req = d.reqLevel || 1;
    const diff = req - playerLevel();
    if (diff <= -5) return '#22c55e';   // much lower than player
    if (diff <= 0)  return '#86efac';   // at or below player
    if (diff <= 5)  return '#fbbf24';   // slightly above
    if (diff <= 10) return '#f97316';   // moderately above
    return '#ef4444';                   // far above
  }

  function difficultyLabel(d: any) {
    const req = d.reqLevel || 1;
    const diff = req - playerLevel();
    if (diff <= -10) return 'Trivial';
    if (diff <= -5)  return 'Easy';
    if (diff <= 0)   return 'Normal';
    if (diff <= 5)   return 'Hard';
    if (diff <= 10)  return 'Deadly';
    return 'Impossible';
  }

  // Build stage recap from dungeon result log
  $: stageRecap = (() => {
    if (!$dungeonResult?.log) return [];
    const stages = [];
    let current = null;
    for (const l of $dungeonResult.log) {
      if (l.type === 'round' || (l.text && l.text.toLowerCase().startsWith('stage'))) {
        if (current) stages.push(current);
        current = { label: l.text, lines: [], won: true };
      } else if (current) {
        current.lines.push(l);
        if (l.type === 'hit' && l.text?.toLowerCase().includes('defeated')) current.won = false;
      }
    }
    if (current) stages.push(current);
    return stages;
  })();
</script>

<div class="space-y-4">

  <!-- Daily limit banner -->
  {#if limitReached}
    <div style="padding:10px 16px; border-radius:8px; background:#1a0808; border:1px solid #7f1d1d; text-align:center">
      <span style="color:#f87171; font-weight:600">Daily limit reached ({runsUsed}/10)</span>
      <span style="color:#78716c; font-size:12px; margin-left:8px">Resets in {resetTime}</span>
    </div>
  {:else}
    <div style="padding:6px 16px; border-radius:8px; background:#0a0908; border:1px solid #1a1714; text-align:center; font-size:12px; color:#78716c">
      Runs today: <span style="color:#e2e0d6; font-weight:600">{runsUsed}/10</span>
    </div>
  {/if}

  <!-- Header -->
  <div class="game-panel-header font-fantasy" style="border-radius:12px; border:1px solid #2a2520; font-size:14px;">
    🏰 Dungeons
    <span class="font-sans font-normal text-xs text-stone-500 ml-2 tracking-normal" style="text-transform:none;">
      — Venture forth for glory and rare loot
    </span>
  </div>

  <!-- Result panel -->
  {#if $dungeonResult}
    {@const dr = $dungeonResult}
    <div class="game-panel" style="border-color:{dr.cleared ? '#15803d' : '#7f1d1d'}; box-shadow:0 0 30px {dr.cleared ? '#15803d33' : '#7f1d1d33'};">
      <!-- Result header -->
      <div style="
        background:{dr.cleared
          ? 'linear-gradient(90deg,#052e16,#0f1e14,#052e16)'
          : 'linear-gradient(90deg,#1c0505,#1a0a0a,#1c0505)'};
        border-bottom:1px solid {dr.cleared ? '#15803d' : '#7f1d1d'};
        padding:14px 16px;
        text-align:center;
      ">
        <div class="font-fantasy" style="font-size:20px; color:{dr.cleared ? '#4ade80' : '#f87171'}; letter-spacing:2px;">
          {dr.cleared ? '⚔ DUNGEON CLEARED ⚔' : '💀 DUNGEON FAILED 💀'}
        </div>
        {#if dr.dungeon}
          <div style="font-size:13px; color:#78716c; margin-top:4px;">
            {dr.dungeon.icon || '🏰'} {dr.dungeon.name}
          </div>
        {/if}
      </div>

      <div style="padding:16px;">

        <!-- Stage recap -->
        {#if stageRecap.length > 0}
          <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px; justify-content:center;">
            {#each stageRecap as stage, i}
              <div style="
                display:flex; align-items:center; gap:4px;
                background:{stage.won ? '#052e1666' : '#1c050566'};
                border:1px solid {stage.won ? '#15803d55' : '#7f1d1d55'};
                border-radius:8px; padding:4px 10px; font-size:12px;
                color:{stage.won ? '#4ade80' : '#f87171'};
              ">
                <span>{stage.won ? '✓' : '✗'}</span>
                <span>Stage {i + 1}</span>
              </div>
            {/each}
          </div>
        {/if}

        <!-- Rewards -->
        {#if dr.rewards?.xp || dr.rewards?.gold}
          <div style="display:flex; justify-content:center; gap:16px; margin-bottom:12px;">
            {#if dr.rewards.xp}
              <div style="
                background:#0d1b2e; border:1px solid #1e3a5f;
                border-radius:8px; padding:8px 16px; text-align:center;
              ">
                <div style="font-size:11px; color:#8a8078; margin-bottom:2px;">EXPERIENCE</div>
                <div style="font-size:18px; font-weight:700; color:#60a5fa; font-family:'Cinzel',serif;">+{dr.rewards.xp}</div>
              </div>
            {/if}
            {#if dr.rewards.gold}
              <div style="
                background:#1a1000; border:1px solid #3d2800;
                border-radius:8px; padding:8px 16px; text-align:center;
              ">
                <div style="font-size:11px; color:#8a8078; margin-bottom:2px;">GOLD</div>
                <div style="font-size:18px; font-weight:700; color:#fbbf24; font-family:'Cinzel',serif;">+{dr.rewards.gold}🪙</div>
              </div>
            {/if}
          </div>
        {/if}

        <!-- Dropped item -->
        {#if dr.droppedItem}
          <div style="
            background:#160d1e; border:1px solid #4c1d95;
            border-radius:10px; padding:10px 14px; text-align:center;
            margin-bottom:12px;
            box-shadow:0 0 16px #4c1d9533;
          ">
            <div style="font-size:11px; color:#7c3aed; margin-bottom:4px; letter-spacing:1px;">ITEM DROPPED</div>
            <span style="font-size:15px; font-weight:700; color:{rarityColor(dr.droppedItem.rarity)}; font-family:'Cinzel',serif;">
              {dr.droppedItem.icon || ''} {dr.droppedItem.name}
            </span>
          </div>
        {/if}

        <!-- Combat log -->
        {#if dr.log?.length > 0}
          <div bind:this={logEl} class="combat-log" style="max-height:160px;">
            {#each dr.log as l}
              <div class="log-{l.type || 'system'}">{l.text}</div>
            {/each}
          </div>
        {/if}

        <div style="text-align:center; margin-top:12px;">
          <button class="btn-game btn-dark" onclick={() => $dungeonResult = null}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Dungeon cards -->
  <div style="display:grid; gap:12px;">
    {#each dungeons as d}
      {@const locked = playerLevel() < (d.reqLevel || 1)}
      {@const broke  = playerGold() < (d.fee || 0)}
      {@const enter  = canEnter(d)}
      {@const dc     = difficultyColor(d)}
      <div class="game-card" style="
        border-color:{locked ? '#2a2520' : dc + '55'};
        opacity:{locked ? 0.65 : 1};
        padding:0; overflow:hidden;
      ">
        <!-- Card top bar = difficulty gradient -->
        <div style="height:3px; background:linear-gradient(90deg,{dc},transparent);"></div>

        <div style="padding:14px 16px; display:flex; gap:14px; align-items:flex-start;">
          <!-- Icon -->
          <div style="
            width:60px; height:60px; flex-shrink:0;
            display:flex; align-items:center; justify-content:center;
            font-size:32px;
            background:radial-gradient(circle,#1a1714,#0a0908);
            border:1px solid {dc}55; border-radius:12px;
            box-shadow:0 0 12px {dc}33;
          ">{d.icon || '🏰'}</div>

          <div style="flex:1; min-width:0;">
            <!-- Name row -->
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:4px;">
              <span class="font-fantasy" style="font-size:15px; color:#d4a853;">
                {locked ? '🔒 ' : ''}{d.name}
              </span>
              <span style="font-size:10px; font-weight:700; color:{dc}; background:{dc}22; border:1px solid {dc}44; padding:1px 7px; border-radius:4px; letter-spacing:1px;">
                {difficultyLabel(d)}
              </span>
            </div>

            <!-- Description -->
            {#if d.desc}
              <div style="font-size:12px; color:#78716c; margin-bottom:8px; line-height:1.5;">{d.desc}</div>
            {/if}

            <!-- Meta row -->
            <div style="display:flex; gap:12px; flex-wrap:wrap; font-size:11px;">
              {#if d.stages}
                <span style="color:#a8a29e;">📋 {d.stages} stages</span>
              {/if}
              <span style="color:{locked ? '#ef4444' : '#4ade80'};">
                Min Lv. {d.reqLevel || 1}
              </span>
              {#if d.fee}
                <span style="color:{broke ? '#ef4444' : '#fbbf24'};">
                  🪙 {d.fee} entry
                </span>
              {/if}
              {#if d.xpMult && d.xpMult !== 1}
                <span style="color:#60a5fa;">XP ×{d.xpMult}</span>
              {/if}
              {#if d.goldMult && d.goldMult !== 1}
                <span style="color:#fbbf24;">Gold ×{d.goldMult}</span>
              {/if}
            </div>
          </div>

          <!-- Enter button -->
          <div style="flex-shrink:0; align-self:center;">
            {#if locked}
              <div style="
                font-size:24px; color:#a8a29e; text-align:center;
                width:48px;
              ">🔒</div>
            {:else}
              <button
                class="btn-game {enter ? 'btn-fight' : 'btn-dark'}"
                disabled={!enter}
                style:cursor={!enter ? 'not-allowed' : 'pointer'}
                style:opacity={!enter ? '0.5' : '1'}
                onclick={() => runDungeon(d.id)}>
                {broke ? 'No Gold' : 'Enter'}
              </button>
            {/if}
          </div>
        </div>
      </div>
    {:else}
      <div style="text-align:center; color:#a8a29e; padding:40px; font-size:13px; font-style:italic;">
        No dungeons available
      </div>
    {/each}
  </div>

</div>
