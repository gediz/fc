<script lang="ts">
  import { player, gameData, computedStats, maxHp, xpNeeded, addStat, prestige } from '../../stores/game.js';

  const BASE_STATS = [
    {
      key: 'baseStr', label: 'Strength',  short: 'STR', csKey: 'str',
      colorCls: 'stat-str', icon: '🗡️',
      desc: 'Increases physical damage output',
    },
    {
      key: 'baseAgi', label: 'Agility',   short: 'AGI', csKey: 'agi',
      colorCls: 'stat-agi', icon: '🌿',
      desc: 'Increases critical hit chance & evasion',
    },
    {
      key: 'baseEnd', label: 'Endurance', short: 'END', csKey: 'end',
      colorCls: 'stat-end', icon: '🛡️',
      desc: 'Increases maximum HP',
    },
    {
      key: 'baseInt', label: 'Intellect', short: 'INT', csKey: 'int',
      colorCls: 'stat-int', icon: '🔮',
      desc: 'Increases critical hit chance',
    },
  ];

  $: statValues = BASE_STATS.map(s => {
    const base  = $player?.[s.key]          || 5;
    const total = $computedStats?.[s.csKey] || base;
    return { ...s, base, total, bonus: total - base };
  });

  $: statPoints  = $player?.statPoints || 0;
  $: canPrestige = ($player?.level || 1) >= 300;
  $: cls         = $gameData?.classes?.[$player?.class] || { name: 'Fighter', icon: '⚔️' };
  $: critChance  = Math.min(5 + ($computedStats?.int || 5) * 2, 75);
  $: xpPct       = $xpNeeded === Infinity
    ? 100
    : Math.min(100, (($player?.xp || 0) / $xpNeeded) * 100);

  $: soulSick    = ($player?.soulSickness || 0) > 0;
  $: lowDura     = ($player?.durabilityWarning || false);

  let prestigeConfirm: boolean = false;
</script>

<!-- Stat points banner -->
{#if statPoints > 0}
  <div class="glow-gold" style="
    background:linear-gradient(90deg,#1c1005,#2a1a00,#1c1005);
    border:1px solid #ca8a04; border-radius:10px;
    padding:8px 16px; margin-bottom:8px;
    display:flex; align-items:center; justify-content:space-between;
  ">
    <span class="font-fantasy" style="color:#fbbf24; font-size:12px; letter-spacing:1.5px;">
      STAT POINTS AVAILABLE
    </span>
    <span style="
      background:linear-gradient(180deg,#a16207,#713f12);
      color:#fef3c7; font-size:13px; font-weight:900;
      padding:2px 12px; border-radius:6px; border:1px solid #ca8a04;
    ">{statPoints}</span>
  </div>
{/if}

<!-- Warnings -->
{#if soulSick}
  <div style="
    background:#1c0a0a; border:1px solid #7f1d1d; border-radius:8px;
    padding:6px 12px; margin-bottom:8px; font-size:12px; color:#f87171;
  ">⚠ Soul Sickness active — stat penalties in effect</div>
{/if}
{#if lowDura}
  <div style="
    background:#1a1505; border:1px solid #78350f; border-radius:8px;
    padding:6px 12px; margin-bottom:8px; font-size:12px; color:#fbbf24;
  ">⚠ Equipment durability low — repair soon</div>
{/if}

<!-- Two-column layout: stats left, combat right -->
<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; align-items:start;">

  <!-- LEFT: Base Stats -->
  <div class="game-panel">
    <div class="game-panel-header font-fantasy" style="font-size:12px; padding:8px 14px; display:flex; align-items:center; justify-content:space-between;">
      <span>Base Stats</span>
      <span style="font-family:'Inter',sans-serif; font-weight:400; font-size:10px; color:#8a8078; text-transform:none; letter-spacing:0;">
        {cls.icon} {cls.name} · Lv {$player?.level || 1}{($player?.prestige || 0) > 0 ? ` · NG+${$player.prestige}` : ''}
      </span>
    </div>

    <div style="padding:8px 10px; display:flex; flex-direction:column; gap:2px;">
      {#each statValues as stat (stat.key)}
        <div style="
          display:flex; align-items:center; gap:8px;
          padding:6px 8px; border-radius:8px;
          background:linear-gradient(90deg,#11100e,#0d0c0a);
          border:1px solid #1e1c18;
        ">
          <!-- Icon -->
          <span style="font-size:16px; flex-shrink:0;">{stat.icon}</span>

          <!-- Name + desc -->
          <div style="flex:1; min-width:0;">
            <div class="font-fantasy {stat.colorCls}" style="font-size:14px; letter-spacing:0.5px; line-height:1.2;">{stat.label}</div>
            <div style="font-size:12px; color:#6b6560; line-height:1.2;">{stat.desc}</div>
          </div>

          <!-- Value -->
          <div style="text-align:right; flex-shrink:0;">
            <span class="{stat.colorCls}" style="font-size:22px; font-weight:700; font-family:'Cinzel',serif; line-height:1;">{stat.base}</span>
            {#if stat.bonus > 0}
              <span style="font-size:11px; color:#d4a853; margin-left:2px;">(+{stat.bonus})</span>
            {/if}
          </div>

          <!-- + button -->
          {#if statPoints > 0}
            <button
              class="btn-game btn-gold"
              style="font-size:16px; font-weight:900; padding:0; width:30px; height:30px; line-height:1; flex-shrink:0; min-height:unset;"
              onclick={() => addStat(stat.key)}>
              +
            </button>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <!-- RIGHT: Combat Summary -->
  <div style="display:flex; flex-direction:column; gap:10px;">

    <!-- Combat stats grid -->
    <div class="game-panel">
      <div class="game-panel-header font-fantasy" style="font-size:12px; padding:8px 14px;">
        Combat Summary
      </div>
      <div style="padding:10px; display:grid; grid-template-columns:1fr 1fr; gap:6px;">

        <div class="game-card" style="padding:8px 10px;">
          <div style="font-size:10px; color:#8a8078; letter-spacing:0.5px; margin-bottom:2px;">MAX HP</div>
          <div style="font-size:22px; font-weight:700; color:#4ade80; font-family:'Cinzel',serif; line-height:1;">{$maxHp}</div>
        </div>

        <div class="game-card" style="padding:8px 10px;">
          <div style="font-size:10px; color:#8a8078; letter-spacing:0.5px; margin-bottom:2px;">DAMAGE</div>
          <div class="stat-str" style="font-size:20px; font-weight:700; font-family:'Cinzel',serif; line-height:1;">
            {$computedStats?.effMinDmg}–{$computedStats?.effMaxDmg}
          </div>
        </div>

        <div class="game-card" style="padding:8px 10px;">
          <div style="font-size:10px; color:#8a8078; letter-spacing:0.5px; margin-bottom:2px;">ARMOR</div>
          <div class="stat-end" style="font-size:22px; font-weight:700; font-family:'Cinzel',serif; line-height:1;">{$computedStats?.armor}</div>
        </div>

        <div class="game-card" style="padding:8px 10px;">
          <div style="font-size:10px; color:#8a8078; letter-spacing:0.5px; margin-bottom:2px;">CRIT CHANCE</div>
          <div style="font-size:22px; font-weight:700; color:#fbbf24; font-family:'Cinzel',serif; line-height:1;">{critChance}%</div>
        </div>

        <div class="game-card" style="padding:8px 10px;">
          <div style="font-size:10px; color:#8a8078; letter-spacing:0.5px; margin-bottom:2px;">KILLS</div>
          <div style="font-size:22px; font-weight:700; color:#a8a29e; font-family:'Cinzel',serif; line-height:1;">{$player?.kills || 0}</div>
        </div>

        <div class="game-card" style="padding:8px 10px;">
          <div style="font-size:10px; color:#8a8078; letter-spacing:0.5px; margin-bottom:2px;">PVP WINS</div>
          <div style="font-size:22px; font-weight:700; color:#d4a853; font-family:'Cinzel',serif; line-height:1;">{$player?.pvpWins || 0}</div>
        </div>

        <div class="game-card" style="padding:8px 10px; grid-column:span 2; display:flex; align-items:center; justify-content:space-between;">
          <div>
            <div style="font-size:10px; color:#8a8078; letter-spacing:0.5px; margin-bottom:2px;">GOLD</div>
            <div style="font-size:22px; font-weight:700; color:#fbbf24; font-family:'Cinzel',serif; line-height:1;">{$player?.gold || 0} 🪙</div>
          </div>
        </div>

      </div>
    </div>


  </div>
</div>

<!-- Prestige — compact bar at bottom -->
<div class="game-panel" style="margin-top:10px; border-color:{canPrestige ? '#d97706' : '#2a2520'};">
  <div class="game-panel-header font-fantasy" style="
    font-size:12px; padding:8px 14px;
    background:{canPrestige
      ? 'linear-gradient(90deg,#1c1005,#231508,#1c1005)'
      : 'linear-gradient(90deg,#1a1510,#201a14,#1a1510)'};
    color:{canPrestige ? '#fbbf24' : '#57534e'};
    display:flex; align-items:center; justify-content:space-between;
  ">
    <span>✨ Prestige — New Game+{($player?.prestige || 0) > 0 ? ` (Currently NG+${$player.prestige})` : ''}</span>
    <span style="font-family:'Inter',sans-serif; font-weight:400; font-size:10px; color:#6b6560; text-transform:none; letter-spacing:0;">
      Requires Max Level (300)
    </span>
  </div>

  <div style="padding:10px 14px;">
    {#if !canPrestige}
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-size:11px; color:#6b6560; white-space:nowrap;">Progress: {$player?.level || 1} / 300</span>
        <div style="flex:1; background:#1a1714; border-radius:6px; overflow:hidden; height:8px;">
          <div style="
            height:100%; border-radius:6px; transition:width 0.3s ease;
            background:linear-gradient(90deg,#713f12,#a16207);
            width:{Math.min(100,(($player?.level||1)/300)*100)}%;
          "></div>
        </div>
      </div>
      <div style="font-size:11px; color:#4a4540; margin-top:6px; line-height:1.4;">
        Prestige resets your level to 1 but gives <strong style="color:#fbbf24">+3 to all base stats</strong> per prestige level. Your equipment, titles, achievements, and kills are kept. Gold is halved. You also get extra stat points to spend.
      </div>
    {:else if !prestigeConfirm}
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
        <span style="font-size:11px; color:#8a8078; line-height:1.4;">
          Prestige resets your level to 1 but gives <strong style="color:#fbbf24">+3 to all base stats</strong> per prestige level. Equipment, titles, and achievements are kept. Gold is halved.
        </span>
        <button
          class="btn-game btn-gold glow-gold"
          style="white-space:nowrap; font-size:12px; padding:8px 16px; letter-spacing:1.5px; flex-shrink:0;"
          onclick={() => prestigeConfirm = true}>
          ✨ PRESTIGE NOW
        </button>
      </div>
    {:else}
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <div>
          <div class="font-fantasy" style="color:#fbbf24; font-size:12px; letter-spacing:1px;">ARE YOU SURE?</div>
          <div style="font-size:11px; color:#78716c;">Your level, gold, and inventory will be reset.</div>
        </div>
        <div style="display:flex; gap:6px; flex-shrink:0;">
          <button
            class="btn-game btn-gold"
            style="padding:6px 16px; font-size:12px;"
            onclick={() => { prestige(); prestigeConfirm = false; }}>
            Confirm
          </button>
          <button
            class="btn-game btn-dark"
            style="padding:6px 16px; font-size:12px;"
            onclick={() => prestigeConfirm = false}>
            Cancel
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  /* Stack to single column on mobile */
  @media (max-width: 768px) {
    div[style*="grid-template-columns:1fr 1fr"] {
      grid-template-columns: 1fr !important;
    }
  }
</style>
