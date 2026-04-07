<script lang="ts">
  import { player, gameData, enchant } from '../../stores/game.js';

  const SLOTS = [
    { slot: 'weapon', label: 'Weapon',  icon: '⚔️' },
    { slot: 'armor',  label: 'Armor',   icon: '🛡️' },
    { slot: 'helmet', label: 'Helmet',  icon: '⛑️' },
    { slot: 'boots',  label: 'Boots',   icon: '👟' },
    { slot: 'ring',   label: 'Ring',    icon: '💍' },
  ];

  const RARITY_COLORS = {
    common:    '#9ca3af',
    uncommon:  '#4ade80',
    rare:      '#60a5fa',
    epic:      '#c084fc',
    legendary: '#fbbf24',
  };

  $: equipment = $player?.equipment || {};
  $: itemMap   = $gameData?.items   || {};

  $: slotData = SLOTS.map(({ slot, label, icon }) => {
    const id   = equipment[slot];
    const inst = id ? $player?.itemInstances?.[id] : null;
    const item = id ? (inst ? itemMap[inst.baseId] : itemMap[id]) : null;
    const lvl  = id ? ($player?.itemInstances?.[id]?.enchantLevel || 0) : 0;

    const RARITY_MULT = { common: 1, uncommon: 1.5, rare: 2.5, epic: 4, legendary: 7 };
    const mult = item ? (RARITY_MULT[item.rarity] || 1) : 1;
    const cost = item ? Math.floor((lvl + 1) * 200 * mult) : 0;
    const rate = Math.max(10, 80 - lvl * 8);
    const canDo = !!item && ($player?.gold || 0) >= cost && lvl < 10;
    const pct  = Math.min(100, lvl * 10);

    // Current bonuses at this enchant level
    function currentBonusLines(l) {
      if (!l) return [];
      if (slot === 'weapon') return [
        `+${l * 2} min dmg`,
        `+${l * 3} max dmg`,
        `+${l} STR per level`,
      ];
      if (slot === 'armor')  return [`+${l * 2} armor`, `+${l} END per level`];
      if (slot === 'helmet') return [`+${l} armor`, `+${l} INT per level`];
      if (slot === 'boots')  return [`+${l} armor`, `+${l} AGI per level`];
      if (slot === 'ring')   return [`+${l} to ALL stats per level`];
      return [];
    }

    // Next-level preview
    function nextBonusLines(l) {
      return currentBonusLines(l + 1);
    }

    const rarityColor = RARITY_COLORS[item?.rarity] || '#9ca3af';

    return {
      slot, label, icon, item, lvl, cost, rate, canDo, pct,
      rarityColor,
      currentLines: currentBonusLines(lvl),
      nextLines: nextBonusLines(lvl),
    };
  });

  function rateColor(rate: number) {
    if (rate >= 50) return '#4ade80';
    if (rate >= 25) return '#fbbf24';
    return '#f87171';
  }
</script>

<div style="display:flex;flex-direction:column;gap:14px;">

  <!-- Header -->
  <div class="game-panel">
    <div class="game-panel-header">✨ Enchanting</div>
    <div style="padding:10px 16px;font-size:13px;color:#8a8078;line-height:1.5;">
      Infuse your gear with arcane power. Higher enchant levels cost more gold and carry greater risk of failure.
    </div>
  </div>

  <!-- Slots grid: 2 columns on desktop -->
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;">
    {#each slotData as s}

      {#if !s.item}
        <!-- Empty slot placeholder -->
        <div class="game-card" style="opacity:0.4;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 16px;gap:8px;min-height:160px;border-style:dashed;">
          <div style="font-size:32px;filter:grayscale(1);">{s.icon}</div>
          <div class="font-fantasy" style="font-size:12px;color:#8a8078;text-transform:uppercase;letter-spacing:0.5px;">{s.label}</div>
          <div style="font-size:11px;color:#4b5563;font-style:italic;">Equip something first</div>
        </div>

      {:else}
        <!-- Equipped slot card -->
        <div class="game-card" style="display:flex;flex-direction:column;gap:10px;position:relative;{s.lvl >= 10 ? 'border-color:#d4a853;box-shadow:0 0 14px rgba(212,168,83,0.2);' : ''}">

          <!-- Top row: icon + name + level badge -->
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <!-- Large item icon with rarity border -->
            <div style="flex-shrink:0;position:relative;">
              <div class="item-icon" style="
                width:56px;height:56px;font-size:28px;
                border-color:{s.rarityColor};
                box-shadow:0 0 10px {s.rarityColor}44;
              ">
                {s.item.icon || s.icon}
              </div>
            </div>

            <!-- Name + level -->
            <div style="flex:1;min-width:0;padding-top:2px;">
              <div class="font-fantasy" style="font-size:12px;color:#8a8078;text-transform:uppercase;letter-spacing:0.5px;">{s.label}</div>
              <div style="font-size:14px;font-weight:600;color:{s.rarityColor};margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                {s.item.name}
              </div>
            </div>

            <!-- Big enchant level badge -->
            <div style="flex-shrink:0;text-align:center;padding-top:2px;">
              {#if s.lvl > 0}
                <div style="
                  font-family:'Cinzel',serif;
                  font-size:26px;
                  font-weight:700;
                  color:#fbbf24;
                  text-shadow:0 0 12px rgba(251,191,36,0.6);
                  line-height:1;
                ">+{s.lvl}</div>
                <div style="font-size:9px;color:#8a8078;letter-spacing:1px;text-transform:uppercase;">Enchant</div>
              {:else}
                <div style="font-family:'Cinzel',serif;font-size:20px;color:#2a2520;line-height:1;">+0</div>
                <div style="font-size:9px;color:#4b5563;letter-spacing:1px;text-transform:uppercase;">Enchant</div>
              {/if}
            </div>
          </div>

          <!-- Progress dots -->
          <div style="display:flex;align-items:center;gap:3px;">
            {#each Array(10) as _, i}
              <div style="
                flex:1;height:5px;border-radius:2px;
                background:{i < s.lvl
                  ? 'linear-gradient(90deg,#a16207,#fbbf24)'
                  : '#1a1714'};
                box-shadow:{i < s.lvl ? '0 0 4px rgba(251,191,36,0.3)' : 'none'};
                transition:background 0.3s;
              "></div>
            {/each}
            <span style="font-size:10px;color:#8a8078;margin-left:4px;white-space:nowrap;">{s.lvl}/10</span>
          </div>

          <!-- BONUSES section -->
          <div style="
            background:#0a0908;
            border:1px solid #2a2520;
            border-radius:8px;
            padding:10px 12px;
          ">
            <div style="font-size:10px;color:#8a8078;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:6px;font-family:'Cinzel',serif;">
              Bonuses
            </div>
            {#if s.lvl > 0}
              {#each s.currentLines as line}
                <div style="font-size:12px;color:#d4a853;line-height:1.7;">⚡ {line}</div>
              {/each}
            {:else}
              <div style="font-size:11px;color:#4b5563;font-style:italic;">No enchantment yet</div>
            {/if}

            {#if s.lvl < 10}
              <div style="border-top:1px solid #1a1714;margin-top:6px;padding-top:6px;">
                <div style="font-size:10px;color:#8a8078;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Next level (+{s.lvl + 1})</div>
                {#each s.nextLines as line}
                  <div style="font-size:12px;color:#4ade80;line-height:1.7;">→ {line}</div>
                {/each}
              </div>
            {/if}
          </div>

          <!-- Cost / rate / button -->
          {#if s.lvl < 10}
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
              <div style="display:flex;gap:14px;">
                <div>
                  <div style="font-size:10px;color:#8a8078;text-transform:uppercase;letter-spacing:0.5px;">Cost</div>
                  <div style="font-size:13px;font-weight:700;color:{($player?.gold || 0) >= s.cost ? '#d4a853' : '#f87171'};">
                    {s.cost} 🪙
                  </div>
                </div>
                <div>
                  <div style="font-size:10px;color:#8a8078;text-transform:uppercase;letter-spacing:0.5px;">Success</div>
                  <div style="font-size:13px;font-weight:700;color:{rateColor(s.rate)};">{s.rate}%</div>
                </div>
              </div>
              <button
                class="btn-game {s.canDo ? 'btn-gold' : 'btn-dark'}"
                style="
                  padding:8px 16px;font-size:12px;
                  {s.canDo ? '' : 'opacity:0.5;cursor:not-allowed;'}
                  {s.canDo ? 'animation:goldPulse 2s ease infinite;' : ''}
                "
                disabled={!s.canDo}
                onclick={() => enchant(s.slot)}>
                ✨ {s.lvl > 0 ? `Enchant +${s.lvl + 1}` : 'Enchant +1'}
              </button>
            </div>
          {:else}
            <div style="text-align:center;padding:6px;background:linear-gradient(135deg,#1a1208,#0a0908);border:1px solid #d4a85360;border-radius:8px;">
              <span style="font-family:'Cinzel',serif;font-size:12px;color:#d4a853;letter-spacing:1px;">MAX ENCHANT REACHED</span>
            </div>
          {/if}

        </div>
      {/if}

    {/each}
  </div>

</div>
