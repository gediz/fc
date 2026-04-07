<script lang="ts">
  import { player, gameData, salvageItem, salvageBatch, craftItem, humanize } from '../../stores/game.js';
  import { send } from '../../stores/connection.js';

  $: fragments = $player?.fragments || 0;
  $: inventory = ($player?.inventory || []).filter(Boolean);
  $: itemMap = $gameData?.items || {};
  $: rarity = $gameData?.rarity || {};

  const SALVAGE_VALUES = { common: 1, uncommon: 3, rare: 8, epic: 20, legendary: 50 };

  const CRAFT_MODES = [
    { id: 'random', label: 'Random Slot', costMult: 1, desc: 'Any slot, random item' },
    { id: 'weapon', label: 'Weapon', costMult: 1.5, desc: 'Guaranteed weapon' },
    { id: 'armor',  label: 'Armor',  costMult: 1.5, desc: 'Guaranteed armor' },
    { id: 'helmet', label: 'Helmet', costMult: 1.5, desc: 'Guaranteed helmet' },
    { id: 'boots',  label: 'Boots',  costMult: 1.5, desc: 'Guaranteed boots' },
    { id: 'ring',   label: 'Ring',   costMult: 1.5, desc: 'Guaranteed ring' },
  ];

  const CRAFT_COSTS = { common: 3, uncommon: 10, rare: 25, epic: 60, legendary: 150 };

  $: equipment = $player?.equipment || {};
  $: equippedItemIds = new Set(Object.values(equipment).filter(Boolean));

  // Salvageable items (both inventory + equipped gear)
  $: salvageableItems = [
    ...inventory.map(id => {
      const inst = $player?.itemInstances?.[id];
      return { id, item: inst ? itemMap[inst.baseId] : itemMap[id], equipped: false };
    }),
    ...Object.values(equipment).filter(Boolean).map(id => {
      const inst = $player?.itemInstances?.[id];
      return { id, item: inst ? itemMap[inst.baseId] : itemMap[id], equipped: true };
    }),
  ].filter(({ item }) => item && !item.consumable && item.slot && item.slot !== 'backpack');

  // Multi-select state
  let selectedForSalvage: Set<string> = new Set();
  let craftMode: string = 'random';
  let craftRarity: string = 'common';
  let showEquippedWarning: boolean = false;

  $: totalSalvageFrags = [...selectedForSalvage].reduce((sum, id) => {
    const inst = $player?.itemInstances?.[id];
    const item = inst ? itemMap[inst.baseId] : itemMap[id];
    return sum + (SALVAGE_VALUES[item?.rarity] || 1);
  }, 0);

  $: craftCost = Math.ceil((CRAFT_COSTS[craftRarity] || 3) * (CRAFT_MODES.find(m => m.id === craftMode)?.costMult || 1));
  $: canCraft = fragments >= craftCost;

  function toggleSalvage(id: string) {
    if (selectedForSalvage.has(id)) {
      selectedForSalvage.delete(id);
    } else {
      selectedForSalvage.add(id);
    }
    selectedForSalvage = new Set(selectedForSalvage); // trigger reactivity
  }

  function selectAllSalvage() {
    if (selectedForSalvage.size === salvageableItems.length) {
      selectedForSalvage = new Set();
    } else {
      selectedForSalvage = new Set(salvageableItems.map(s => s.id));
    }
  }

  function selectUnequippedSalvage() {
    const unequipped = salvageableItems.filter(s => !equippedItemIds.has(s.id)).map(s => s.id);
    if (unequipped.length === selectedForSalvage.size && unequipped.every(id => selectedForSalvage.has(id))) {
      selectedForSalvage = new Set();
    } else {
      selectedForSalvage = new Set(unequipped);
    }
  }

  function doSalvage() {
    // Check for equipped items
    const equippedSelected = [...selectedForSalvage].filter(id => equippedItemIds.has(id));
    if (equippedSelected.length > 0 && !showEquippedWarning) {
      showEquippedWarning = true;
      return;
    }
    showEquippedWarning = false;
    salvageBatch([...selectedForSalvage]);
    selectedForSalvage = new Set();
  }

  function doCraft() {
    if (craftMode === 'random') {
      craftItem(craftRarity);
    } else {
      send({ type: 'craft', rarity: craftRarity, slot: craftMode });
    }
  }
</script>

<div style="display:flex; flex-direction:column; gap:14px">
  <!-- Header -->
  <div class="combat-arena" style="padding:16px 20px">
    <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px">
      <div>
        <h2 class="font-fantasy" style="font-size:22px; font-weight:700; color:#d4a853; margin:0; text-shadow:0 0 20px rgba(212,168,83,0.3)">⚒️ Crafting</h2>
        <p style="color:#8a8078; font-size:13px; margin:4px 0 0">Salvage unwanted gear. Forge new items.</p>
      </div>
      <div style="text-align:center">
        <div class="font-fantasy" style="font-size:28px; font-weight:700; color:#c084fc; text-shadow:0 0 12px rgba(192,132,252,0.4)">{humanize(fragments)}</div>
        <div style="font-size:11px; color:#8a8078; text-transform:uppercase; letter-spacing:1px">Fragments</div>
      </div>
    </div>
  </div>

  <!-- Craft Section -->
  <div class="game-panel">
    <div class="game-panel-header">Forge Item</div>
    <div style="padding:12px">
      <!-- Slot selection -->
      <div style="font-size:12px; color:#8a8078; margin-bottom:6px">Choose type:</div>
      <div style="display:flex; gap:4px; flex-wrap:wrap; margin-bottom:12px">
        {#each CRAFT_MODES as mode}
          <button
            class="game-card"
            style="padding:6px 12px; cursor:pointer; font-size:12px;
              border-color:{craftMode === mode.id ? '#d4a853' : '#2a2520'};
              color:{craftMode === mode.id ? '#d4a853' : '#8a8078'};
              {craftMode === mode.id ? 'box-shadow:0 0 6px rgba(212,168,83,0.2)' : ''}"
            onclick={() => craftMode = mode.id}>
            {mode.label} {mode.costMult > 1 ? '(+50%)' : ''}
          </button>
        {/each}
      </div>

      <!-- Rarity selection -->
      <div style="font-size:12px; color:#8a8078; margin-bottom:6px">Choose rarity:</div>
      <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px">
        {#each Object.entries(CRAFT_COSTS) as [r, baseCost]}
          {@const cost = Math.ceil(baseCost * (CRAFT_MODES.find(m => m.id === craftMode)?.costMult || 1))}
          {@const canDo = fragments >= cost}
          <button
            class="game-card"
            style="padding:10px 14px; cursor:{canDo ? 'pointer' : 'not-allowed'}; text-align:center; flex:1; min-width:80px;
              border-color:{craftRarity === r ? (rarity[r] || '#d4a853') : '#2a2520'};
              opacity:{canDo ? 1 : 0.4};
              {craftRarity === r ? `box-shadow:0 0 8px ${rarity[r]}40` : ''}"
            disabled={!canDo}
            onclick={() => craftRarity = r}>
            <div style="font-size:13px; font-weight:600; color:{rarity[r] || '#9ca3af'}; text-transform:capitalize">{r}</div>
            <div style="font-size:11px; color:#8a8078">{cost} frags</div>
          </button>
        {/each}
      </div>

      <!-- Craft button -->
      <button
        class="btn-game {canCraft ? 'btn-gold' : 'btn-dark'}"
        style="width:100%; padding:12px; font-size:15px"
        disabled={!canCraft}
        onclick={doCraft}>
        ⚒️ Forge {CRAFT_MODES.find(m => m.id === craftMode)?.label} ({craftCost} fragments)
      </button>
    </div>
  </div>

  <!-- Salvage Section -->
  <div class="game-panel">
    <div class="game-panel-header" style="display:flex; justify-content:space-between; align-items:center">
      <span>Salvage</span>
      <div style="display:flex; gap:6px; align-items:center">
        {#if salvageableItems.length > 0}
          <button class="btn-game btn-dark" style="padding:2px 10px; font-size:10px" onclick={selectUnequippedSalvage}>
            Select Unequipped
          </button>
          {#if selectedForSalvage.size > 0}
            <button class="btn-game btn-dark" style="padding:2px 10px; font-size:10px" onclick={() => selectedForSalvage = new Set()}>
              Deselect All
            </button>
          {/if}
        {/if}
        <span style="font-size:11px; color:#8a8078">{salvageableItems.length} items</span>
      </div>
    </div>
    <div style="padding:8px">
      {#if salvageableItems.length === 0}
        <div style="text-align:center; color:#8a8078; padding:20px; font-size:13px">No items to salvage.</div>
      {:else}
        <div style="display:flex; flex-direction:column; gap:4px; max-height:250px; overflow-y:auto">
          {#each salvageableItems as { id, item, equipped }}
            {@const frags = SALVAGE_VALUES[item.rarity] || 1}
            {@const isSelected = selectedForSalvage.has(id)}
            <div
              class="game-card"
              style="display:flex; align-items:center; gap:8px; padding:8px 10px; cursor:pointer;
                border-color:{isSelected ? '#d4a853' : equipped ? '#4c1d95' : '#2a2520'};
                {isSelected ? 'background:linear-gradient(135deg,#1a1608,#0f0d0b)' : equipped ? 'background:linear-gradient(135deg,#1a0830,#0f0d0b)' : ''}"
              onclick={() => { toggleSalvage(id); showEquippedWarning = false; }}>
              <div style="width:20px; height:20px; border-radius:4px; border:2px solid {isSelected ? '#d4a853' : '#4b5563'}; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:12px">
                {isSelected ? '✓' : ''}
              </div>
              <span style="font-size:16px; flex-shrink:0">{item.icon}</span>
              <div style="flex:1; min-width:0">
                <div style="font-size:12px; font-weight:600; color:{rarity[item.rarity] || '#9ca3af'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">
                  {item.name}{equipped ? ' ⚡' : ''}
                </div>
                {#if equipped}
                  <div style="font-size:10px; color:#a78bfa">EQUIPPED</div>
                {/if}
              </div>
              <div style="font-size:13px; font-weight:700; color:#c084fc; flex-shrink:0">+{frags}</div>
            </div>
          {/each}
        </div>

        {#if selectedForSalvage.size > 0}
          {#if showEquippedWarning}
            <div style="margin-top:10px; padding:10px; border-radius:8px; background:#1a0808; border:1px solid #7f1d1d; text-align:center">
              <div style="font-size:13px; color:#fca5a5; margin-bottom:8px">
                ⚠️ You have equipped items selected! They will be unequipped and destroyed. Continue?
              </div>
              <div style="display:flex; gap:8px; justify-content:center">
                <button class="btn-game btn-fight" style="padding:6px 16px; font-size:12px" onclick={doSalvage}>
                  Yes, Salvage
                </button>
                <button class="btn-game btn-dark" style="padding:6px 16px; font-size:12px" onclick={() => showEquippedWarning = false}>
                  Cancel
                </button>
              </div>
            </div>
          {:else}
            <div style="margin-top:10px; padding-top:10px; border-top:1px solid #1a1714; display:flex; align-items:center; justify-content:space-between">
              <span style="font-size:13px; color:#8a8078">{selectedForSalvage.size} selected → <strong style="color:#c084fc">+{totalSalvageFrags}</strong> fragments</span>
              <button class="btn-game btn-fight" style="padding:8px 20px; font-size:13px" onclick={doSalvage}>
                🔨 Salvage ({selectedForSalvage.size})
              </button>
            </div>
          {/if}
        {/if}
      {/if}
    </div>
  </div>

  <!-- Reference -->
  <div class="game-panel">
    <div class="game-panel-header">Fragment Values</div>
    <div style="padding:10px; display:flex; flex-wrap:wrap; gap:6px; justify-content:center">
      {#each Object.entries(SALVAGE_VALUES) as [r, v]}
        <div style="padding:5px 10px; border-radius:6px; background:#0d0c0a; border:1px solid #1a1714; font-size:12px">
          <span style="color:{rarity[r] || '#9ca3af'}; text-transform:capitalize">{r}</span>
          <span style="color:#c084fc; font-weight:700"> → {v}</span>
        </div>
      {/each}
    </div>
  </div>
</div>
