<script lang="ts">
  import { onMount } from 'svelte';
  import { skillTreeData, getSkillTree, unlockSkill, upgradeMastery, resetSkillTree, player, humanize } from '../../stores/game.js';

  onMount(() => getSkillTree());

  const EFFECT_LABELS = {
    dmgPct: 'Damage', dmgReduction: 'Dmg Reduction', flatHp: 'Max HP', hpPct: 'Max HP',
    str: 'Strength', agi: 'Agility', end: 'Endurance', int: 'Intellect', allStats: 'All Stats',
    armor: 'Armor', critChance: 'Crit Chance', critDmg: 'Crit Damage', lifesteal: 'Lifesteal',
    dodgeChance: 'Dodge', poison: 'Poison/round', armorPierce: 'Armor Pierce',
    doubleAtk: 'Double Attack', goldPct: 'Gold Bonus', dropBonus: 'Drop Bonus', dropMult: 'Drop Multiplier',
    xpPct: 'XP Bonus', regen: 'HP Regen/round', flatMp: 'Max MP', mpRegen: 'MP Regen',
    reflect: 'Reflect Damage', thorns: 'Thorns Damage', magicPct: 'Magic Damage',
    bonusMagic: 'Bonus Magic', mpCostReduction: 'MP Cost Reduction', enemyWeaken: 'Enemy Weakened',
    deathSave: 'Survive Fatal Hit', firstCrit: 'First Hit Crits', critImmune: 'Crit Immune',
    execute: 'Execute Below', blockFirst: 'Block First Hit', revive: 'Revive on Death',
    lowHpDmg: 'Low HP Bonus Dmg', fullHpDmg: 'Full HP Bonus Dmg', guaranteeCritRounds: 'Guaranteed Crit Rounds',
  };
  function formatEffect(effect: Record<string, any>) {
    return Object.entries(effect).map(([k, v]) => {
      const label = EFFECT_LABELS[k] || k;
      if (typeof v === 'boolean') return label;
      if (typeof v === 'number' && v > 0 && v < 1) return `${label} +${Math.round(v * 100)}%`;
      if (typeof v === 'number' && v >= 1) return `${label} +${v}`;
      return `${label}: ${v}`;
    }).join(', ');
  }

  // ── Reactive derived values ──────────────────────────────────
  $: tree      = $skillTreeData?.tree    ?? null;
  $: unlocks   = $skillTreeData?.unlocks ?? [];
  $: total     = $skillTreeData?.total   ?? 0;
  $: spent     = $skillTreeData?.spent   ?? 0;
  $: available = $skillTreeData?.available ?? 0;
  $: branches  = tree?.branches ?? [];
  $: masteries = $skillTreeData?.masteries ?? [];
  $: masteryLevels = $skillTreeData?.masteryLevels ?? {};
  $: treeComplete = branches.length > 0 && branches.every(b => b.tiers.every(t => unlocks.includes(t.id)));

  // For each branch, determine which tiers are available:
  // tier index 0 is always available; tier N requires tier N-1 unlocked.
  $: branchStates = branches.map(branch => {
    return branch.tiers.map((tier, i) => {
      const isUnlocked = unlocks.includes(tier.id);
      const prereqMet  = i === 0 || unlocks.includes(branch.tiers[i - 1].id);
      const canAfford  = available >= tier.cost;
      return { tier, isUnlocked, prereqMet, canAfford };
    });
  });
</script>

<div style="display:flex;flex-direction:column;gap:16px;">

  <!-- Header -->
  <div class="combat-arena" style="padding:16px 20px;">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <div>
        <h2 class="font-fantasy" style="font-size:22px;font-weight:700;color:#d4a853;margin:0 0 2px;text-shadow:0 0 20px rgba(212,168,83,0.3);">
          🌟 Skill Tree
        </h2>
        {#if tree}
          <p style="color:#78716c;margin:0;font-size:13px;">{tree.name}</p>
        {/if}
      </div>
      <div style="display:flex;gap:20px;align-items:center;">
        <div style="text-align:center;">
          <div class="font-fantasy" style="font-size:26px;font-weight:700;color:#fbbf24;text-shadow:0 0 12px rgba(251,191,36,0.5);">{available}</div>
          <div style="font-size:11px;color:#78716c;text-transform:uppercase;letter-spacing:1px;">Points Available</div>
        </div>
        <div style="text-align:center;opacity:0.6;">
          <div style="font-size:18px;font-weight:600;color:#a8a29e;">{spent} / {total}</div>
          <div style="font-size:11px;color:#78716c;text-transform:uppercase;letter-spacing:1px;">Spent / Total</div>
        </div>
        {#if spent > 0}
          <button class="btn-game" style="padding:5px 14px;font-size:11px; background:linear-gradient(180deg,#1a0808,#0d0404); color:#fca5a5; border:1px solid #7f1d1d"
            onclick={() => { if (confirm(`Reset all skills and masteries? Cost: ${humanize(Math.floor(($player?.level || 1) * 500))} gold.`)) resetSkillTree(); }}>
            🔄 Reset ({humanize(Math.floor(($player?.level || 1) * 500))}🪙)
          </button>
        {/if}
      </div>
    </div>
  </div>

  <!-- Loading / Empty state -->
  {#if !$skillTreeData}
    <div class="game-panel" style="padding:60px;text-align:center;color:#4b5563;">
      <div style="font-size:36px;margin-bottom:10px;">🌀</div>
      <div class="font-fantasy" style="color:#78716c;">Loading skill tree…</div>
    </div>

  {:else if branches.length === 0}
    <div class="game-panel" style="padding:60px;text-align:center;color:#4b5563;">
      <div style="font-size:36px;margin-bottom:10px;">🌿</div>
      <div class="font-fantasy" style="color:#78716c;">No skill branches available for your class yet.</div>
    </div>

  {:else}
    <!-- 3-column branch grid -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;align-items:start;">

      {#each branches as branch, bi}
        {@const states = branchStates[bi]}
        <div class="game-panel" style="display:flex;flex-direction:column;overflow:visible;">

          <!-- Branch header -->
          <div class="game-panel-header" style="text-align:center;font-size:14px;padding:14px 12px;">
            <div style="font-size:28px;margin-bottom:4px;line-height:1;">{branch.icon}</div>
            <div style="color:#e0b85c;">{branch.name}</div>
            {#if branch.desc}
              <div style="font-size:11px;color:#78716c;font-family:Inter,sans-serif;font-weight:400;text-transform:none;letter-spacing:0;margin-top:4px;">
                {branch.desc}
              </div>
            {/if}
          </div>

          <!-- Tiers -->
          <div style="padding:12px;display:flex;flex-direction:column;gap:0;">
            {#each states as { tier, isUnlocked, prereqMet, canAfford }, ti}

              <!-- Connector line (not before first) -->
              {#if ti > 0}
                <div style="
                  width:2px;height:16px;margin:0 auto;
                  background:{isUnlocked ? '#ca8a04' : prereqMet ? '#2a2520' : '#1a1714'};
                  transition:background 0.3s;
                "></div>
              {/if}

              <!-- Tier card -->
              <div
                class="game-card"
                style="
                  position:relative;
                  transition:all 0.25s;
                  {isUnlocked
                    ? 'border-color:#ca8a04;box-shadow:0 0 12px rgba(202,138,4,0.3),inset 0 0 20px rgba(202,138,4,0.05);background:linear-gradient(135deg,#1c1608 0%,#110e06 100%);'
                    : !prereqMet
                    ? 'opacity:0.4;filter:grayscale(0.5);cursor:not-allowed;'
                    : ''}
                "
              >
                <!-- Unlocked glow badge -->
                {#if isUnlocked}
                  <div style="
                    position:absolute;top:-8px;right:-8px;
                    background:linear-gradient(135deg,#a16207,#713f12);
                    border:1px solid #ca8a04;border-radius:50%;
                    width:22px;height:22px;
                    display:flex;align-items:center;justify-content:center;
                    font-size:11px;box-shadow:0 0 8px rgba(202,138,4,0.5);
                  ">✓</div>
                {/if}

                <!-- Tier info -->
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:6px;">
                  <div class="font-fantasy" style="
                    font-size:12px;font-weight:700;line-height:1.2;
                    color:{isUnlocked ? '#fbbf24' : prereqMet ? '#e2e0d6' : '#4b5563'};
                    {isUnlocked ? 'text-shadow:0 0 6px rgba(251,191,36,0.4);' : ''}
                  ">{tier.name}</div>
                  <div style="
                    font-size:10px;font-weight:600;padding:1px 6px;border-radius:4px;white-space:nowrap;flex-shrink:0;
                    {isUnlocked
                      ? 'background:#1c1608;color:#ca8a04;border:1px solid #a16207;'
                      : 'background:#1a1714;color:#78716c;border:1px solid #2a2520;'}
                  ">T{ti + 1}</div>
                </div>

                {#if tier.desc}
                  <div style="font-size:12px;color:{isUnlocked ? '#d4a853' : '#8a8078'};margin-bottom:5px;line-height:1.4;">{tier.desc}</div>
                {/if}

                <!-- Action row -->
                <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-top:4px;">
                  <div style="font-size:11px;color:#78716c;">
                    {#if isUnlocked}
                      <span style="color:#4ade80;">✅ Unlocked</span>
                    {:else}
                      <span style="color:{canAfford && prereqMet ? '#d4a853' : '#4b5563'};">
                        💎 {tier.cost} pt{tier.cost !== 1 ? 's' : ''}
                      </span>
                    {/if}
                  </div>
                  {#if !isUnlocked && prereqMet}
                    <button
                      class="btn-game {canAfford ? 'btn-gold' : 'btn-dark'}"
                      style="font-size:10px;padding:4px 10px;"
                      disabled={!canAfford}
                      onclick={() => unlockSkill(tier.id)}
                    >
                      {canAfford ? `Unlock (${tier.cost}pt)` : 'Need pts'}
                    </button>
                  {:else if !isUnlocked && !prereqMet}
                    <span style="font-size:10px;color:#374151;font-style:italic;">Locked</span>
                  {/if}
                </div>

              </div>
            {/each}
          </div>

        </div>
      {/each}

    </div>

    <!-- Mastery Section (shown when tree is complete or has masteries) -->
    {#if treeComplete && masteries.length > 0}
      <div class="combat-arena" style="padding:14px 20px; margin-top:4px">
        <h3 class="font-fantasy" style="font-size:18px; font-weight:700; color:#c084fc; margin:0 0 4px; text-shadow:0 0 12px rgba(192,132,252,0.3)">
          ⬆️ Masteries
        </h3>
        <p style="color:#78716c; font-size:12px; margin:0">Skill tree complete! Invest remaining points into repeatable upgrades.</p>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:12px">
        {#each masteries as mastery}
          {@const lvl = masteryLevels[mastery.id] || 0}
          {@const cost = lvl + 1}
          {@const canAfford = available >= cost}
          <div class="game-panel" style="overflow:visible">
            <div style="padding:14px; text-align:center">
              <div style="font-size:28px; margin-bottom:6px">{mastery.icon}</div>
              <div class="font-fantasy" style="font-size:14px; font-weight:700; color:#c084fc; margin-bottom:2px">{mastery.name}</div>
              <div style="font-size:12px; color:#a8a29e; margin-bottom:8px">{mastery.desc}</div>
              <div style="font-size:22px; font-weight:700; color:#e9d5ff; margin-bottom:6px">Lv.{lvl}</div>
              {#if lvl > 0}
                <div style="font-size:11px; color:#a78bfa; margin-bottom:8px">
                  Current: {Object.entries(mastery.effectPer).map(([k, v]) => {
                    const label = EFFECT_LABELS[k] || k;
                    const total = v * lvl;
                    return typeof v === 'number' && v < 1 ? `${label} +${Math.round(total * 100)}%` : `${label} +${Math.round(total)}`;
                  }).join(', ')}
                </div>
              {/if}
              <button
                class="btn-game {canAfford ? 'btn-gold' : 'btn-dark'}"
                style="width:100%; padding:8px; font-size:12px"
                disabled={!canAfford}
                onclick={() => upgradeMastery(mastery.id)}>
                {canAfford ? `Upgrade (${cost} pts)` : `Need ${cost} pts`}
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}

</div>
