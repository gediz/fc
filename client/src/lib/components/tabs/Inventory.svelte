<script lang="ts">
  import { player, gameData, equipItem, unequipItem, useItem, useAllItem, sellItem, discardItem, newItemSlots, clearNewItems, swapInventory, sortInventory } from '../../stores/game.js';
  import { onMount } from 'svelte';

  // Drag state
  let dragging: { slotIdx: number; icon: string; x: number; y: number } | null = null;
  let dropTarget: number = -1;

  // Clear individual new item indicator when user clicks on it
  function markSeen(slotIdx: number) {
    newItemSlots.update(s => { s.delete(slotIdx); return new Set(s); });
  }

  const EQUIP_SLOTS = [
    { slot: 'helmet',   label: 'Helmet',   icon: '⛑️' },
    { slot: 'weapon',   label: 'Weapon',   icon: '⚔️' },
    { slot: 'armor',    label: 'Armor',    icon: '🛡️' },
    { slot: 'ring',     label: 'Ring',     icon: '💍' },
    { slot: 'boots',    label: 'Boots',    icon: '👢' },
    { slot: 'backpack', label: 'Backpack', icon: '🎒' },
  ];

  $: equipment = $player?.equipment || {};
  $: rawInventory = $player?.inventory || [];
  $: itemMap   = $gameData?.items   || {};
  $: maxSlots  = $player?.maxInventorySlots || 20;
  $: usedSlots = rawInventory.filter(Boolean).length;

  // Build grid: stack consumables, sort by type, show empty slots
  $: inventoryGrid = (() => {
    if (invSort === 'none') {
      // Raw inventory — preserve positions but stack consumables
      const raw: { id: string | null; item: any; slotIdx: number; qty: number }[] = [];
      const consumableSeen = new Map<string, number>(); // id -> index in raw
      for (let i = 0; i < rawInventory.length; i++) {
        const id = rawInventory[i];
        if (!id) { raw.push({ id: null, item: null, slotIdx: i, qty: 0 }); continue; }
        const inst = $player?.itemInstances?.[id];
        const item = inst ? itemMap[inst.baseId] : itemMap[id];
        if (item?.consumable && consumableSeen.has(id)) {
          raw[consumableSeen.get(id)!].qty++;
          // Show this slot as empty (consumed by stacking)
          raw.push({ id: null, item: null, slotIdx: i, qty: 0 });
        } else {
          const entry = { id, item: item || null, slotIdx: i, qty: 1 };
          raw.push(entry);
          if (item?.consumable) consumableSeen.set(id, raw.length - 1);
        }
      }
      // Pad with empty slots to fill grid
      const emptyCount = Math.max(0, maxSlots - raw.length);
      for (let i = 0; i < emptyCount; i++) raw.push({ id: null, item: null, slotIdx: -1, qty: 0 });
      return raw;
    }

    // Stacked/sorted mode
    const inventory = rawInventory;
    const stacked: { id: string | null; item: any; slotIdx: number; qty: number }[] = [];
    const seen = new Map<string, { id: string | null; item: any; slotIdx: number; qty: number }>();

    for (let i = 0; i < inventory.length; i++) {
      const id = inventory[i];
      if (!id) {
        stacked.push({ id: null, item: null, slotIdx: i, qty: 0 });
        continue;
      }
      const inst = $player?.itemInstances?.[id];
      const item = inst ? itemMap[inst.baseId] : itemMap[id];
      if (!item) { stacked.push({ id, item: null, slotIdx: i, qty: 1 }); continue; }
      if (item.consumable && seen.has(id)) {
        seen.get(id)!.qty++;
      } else {
        const entry = { id, item, slotIdx: i, qty: 1 };
        stacked.push(entry);
        if (item.consumable) seen.set(id, entry);
      }
    }

    // Pad with empty slots to fill grid
    const emptyCount = Math.max(0, maxSlots - stacked.length);
    for (let i = 0; i < emptyCount; i++) stacked.push({ id: null, item: null, slotIdx: -1, qty: 0 });
    return stacked;
  })();

  // Filter/sort state
  let invFilter: string = 'all';
  let invSearch: string = '';
  let invSort: string = 'none';

  const INV_TABS = [
    { key: 'all',        label: 'All',     icon: '🗃️' },
    { key: 'weapon',     label: 'Weapons', icon: '⚔️' },
    { key: 'armor',      label: 'Armor',   icon: '🛡️' },
    { key: 'helmet',     label: 'Helm',    icon: '⛑️' },
    { key: 'boots',      label: 'Boots',   icon: '👢' },
    { key: 'ring',       label: 'Rings',   icon: '💍' },
    { key: 'consumable', label: 'Potions', icon: '🧪' },
    { key: 'backpack',   label: 'Bags',    icon: '🎒' },
  ];

  const RARITY_ORDER = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };

  $: filteredGrid = inventoryGrid.filter(({ item, slotIdx }) => {
    if (!item) {
      // In 'none' sort, show empty slots in 'all' filter to preserve positions
      if (invSort === 'none') return invFilter === 'all';
      return invFilter === 'all';
    }
    if (invFilter === 'consumable') { if (!item.consumable) return false; }
    else if (invFilter !== 'all') { if (item.slot !== invFilter) return false; }
    if (invSearch.trim()) {
      const q = invSearch.trim().toLowerCase();
      if (!item.name.toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (invSort === 'none') return 0;
    if (!a.item && !b.item) return 0;
    if (!a.item) return 1;
    if (!b.item) return -1;
    if (invSort === 'rarity') return (RARITY_ORDER[a.item.rarity] ?? 5) - (RARITY_ORDER[b.item.rarity] ?? 5);
    if (invSort === 'name') return a.item.name.localeCompare(b.item.name);
    if (invSort === 'level') return (b.item.reqLevel || 0) - (a.item.reqLevel || 0);
    // default: type
    const slotOrder = { weapon: 0, armor: 1, helmet: 2, boots: 3, ring: 4, backpack: 5 };
    const aSlot = a.item.slot ? (slotOrder[a.item.slot] ?? 6) : 7;
    const bSlot = b.item.slot ? (slotOrder[b.item.slot] ?? 6) : 7;
    if (aSlot !== bSlot) return aSlot - bSlot;
    return (RARITY_ORDER[a.item.rarity] ?? 5) - (RARITY_ORDER[b.item.rarity] ?? 5);
  });

  // Selection state
  let selectedType: string | null = null;  // 'equip' | 'inv'
  let selectedKey: any = null;  // slot string or inv index

  $: selectedItem = (() => {
    if (selectedType === 'equip' && selectedKey) {
      const id = equipment[selectedKey];
      if (!id) return null;
      const inst = $player?.itemInstances?.[id];
      const base = inst ? itemMap[inst.baseId] : itemMap[id];
      return base ? { id, ...base, _slot: selectedKey, _source: 'equip', _qty: 1 } : null;
    }
    if (selectedType === 'inv' && selectedKey != null) {
      const entry = inventoryGrid[selectedKey];
      if (entry?.item) return { id: entry.id, ...entry.item, _slotIdx: entry.slotIdx, _source: 'inv', _qty: entry.qty || 1 };
    }
    return null;
  })();

  function selectEquip(slot: string) {
    if (selectedType === 'equip' && selectedKey === slot) {
      selectedType = null; selectedKey = null;
    } else {
      selectedType = 'equip'; selectedKey = slot;
    }
  }

  function selectInv(idx: number) {
    if (selectedType === 'inv' && selectedKey === idx) {
      selectedType = null; selectedKey = null;
    } else {
      selectedType = 'inv'; selectedKey = idx;
    }
  }

  function startDrag(e: MouseEvent, slotIdx: number, icon: string, idx: number, hasItem: boolean) {
    if (!hasItem) return;
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    let moved = false;
    dragging = { slotIdx, icon, x: startX, y: startY };

    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (Math.abs(dx) > 12 || Math.abs(dy) > 12) moved = true;
      if (moved && dragging) dragging = { ...dragging, x: ev.clientX, y: ev.clientY };
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (moved && dragging && dropTarget >= 0 && dropTarget !== dragging.slotIdx) {
        swapInventory(dragging.slotIdx, dropTarget);
      }
      if (!moved) {
        // Click without drag — select for details
        selectInv(idx);
        markSeen(slotIdx);
      }
      dragging = null;
      dropTarget = -1;
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function rarityColor(r: string) {
    return $gameData?.rarity?.[r] || '#9ca3af';
  }

  function rarityBorder(r: string) {
    const colors = {
      common:    '#4b5563',
      uncommon:  '#16a34a',
      rare:      '#2563eb',
      epic:      '#7c3aed',
      legendary: '#d97706',
    };
    return colors[r] || '#2a2520';
  }

  function enchantLevel(slot: string) {
    const eqId = $player?.equipment?.[slot];
    return eqId ? ($player?.itemInstances?.[eqId]?.enchantLevel || 0) : 0;
  }

  function itemDurability(itemId: string) {
    return itemId ? ($player?.itemInstances?.[itemId]?.durability ?? 100) : 100;
  }

  function durColor(dur: number) {
    if (dur > 75) return '#4ade80';
    if (dur > 50) return '#fbbf24';
    if (dur > 25) return '#f97316';
    return '#ef4444';
  }

  function statParts(item: any, enchantLvl: number = 0) {
    if (!item) return [];
    const parts = [];
    // Base stats
    let minD = item.minDmg || 0, maxD = item.maxDmg || 0, arm = item.armor || 0;
    let s = item.stats?.str || 0, a = item.stats?.agi || 0, e = item.stats?.end || 0, i = item.stats?.int || 0;
    // Add enchant bonuses if provided
    if (enchantLvl > 0 && item.slot) {
      if (item.slot === 'weapon') { minD += enchantLvl * 2; maxD += enchantLvl * 3; s += enchantLvl; }
      else if (item.slot === 'armor') { arm += enchantLvl * 2; e += enchantLvl; }
      else if (item.slot === 'helmet') { arm += enchantLvl; i += enchantLvl; }
      else if (item.slot === 'boots') { arm += enchantLvl; a += enchantLvl; }
      else if (item.slot === 'ring') { s += enchantLvl; a += enchantLvl; i += enchantLvl; e += enchantLvl; }
    }
    if (minD) parts.push({ label: 'DMG', value: `${minD}–${maxD}`, numVal: (minD+maxD)/2, cls: 'stat-str' });
    if (arm)  parts.push({ label: 'ARM', value: arm, numVal: arm, cls: 'stat-end' });
    if (s)    parts.push({ label: 'STR', value: `+${s}`, numVal: s, cls: 'stat-str' });
    if (a)    parts.push({ label: 'AGI', value: `+${a}`, numVal: a, cls: 'stat-agi' });
    if (e)    parts.push({ label: 'END', value: `+${e}`, numVal: e, cls: 'stat-end' });
    if (i)    parts.push({ label: 'INT', value: `+${i}`, numVal: i, cls: 'stat-int' });
    if (item.healHp) parts.push({ label: 'HEAL', value: item.healHp, numVal: item.healHp, cls: 'stat-agi' });
    return parts;
  }

  function hoverInfo(id: string, source: 'inv' | 'equip', slot?: string): { name: string, rarity: string, lines: string[] } | null {
    const inst = $player?.itemInstances?.[id];
    const item = inst ? itemMap[inst.baseId] : itemMap[id];
    if (!item) return null;
    const lines: string[] = [];
    const elvl = inst?.enchantLevel || 0;
    if (item.slot) lines.push(`${item.rarity || 'common'} ${item.slot}`);
    if (item.minDmg) lines.push(`DMG ${item.minDmg + (elvl && item.slot === 'weapon' ? elvl*2 : 0)}-${item.maxDmg + (elvl && item.slot === 'weapon' ? elvl*3 : 0)}`);
    if (item.armor) lines.push(`ARM ${item.armor + (elvl ? elvl * (item.slot === 'armor' ? 2 : 1) : 0)}`);
    if (item.stats?.str) lines.push(`STR +${item.stats.str + (elvl && (item.slot === 'weapon' || item.slot === 'ring') ? elvl : 0)}`);
    if (item.stats?.agi) lines.push(`AGI +${item.stats.agi + (elvl && (item.slot === 'boots' || item.slot === 'ring') ? elvl : 0)}`);
    if (item.stats?.end) lines.push(`END +${item.stats.end + (elvl && (item.slot === 'armor' || item.slot === 'ring') ? elvl : 0)}`);
    if (item.stats?.int) lines.push(`INT +${item.stats.int + (elvl && (item.slot === 'helmet' || item.slot === 'ring') ? elvl : 0)}`);
    if (elvl > 0) lines.push(`+${elvl} Enchanted`);
    if (inst) lines.push(`Durability: ${inst.durability ?? 100}/100`);
    if (item.healHp) lines.push(`Heals ${item.healHp >= 999 ? 'Full' : item.healHp} HP`);
    if (item.healMp) lines.push(`Restores ${item.healMp >= 999 ? 'Full' : item.healMp} MP`);
    if (item.desc) lines.push(item.desc);
    const displayName = elvl > 0 ? `${item.name} +${elvl}` : item.name;
    return { name: displayName, rarity: item.rarity || 'common', lines };
  }

  function sellValue(item: any) {
    return item ? Math.floor((item.price || 0) * 0.4) : 0;
  }

  function isConsumable(item: any) {
    return item?.consumable || item?.buff || item?.healHp;
  }

  function doEquip(id: string) {
    equipItem(id);
    selectedType = null; selectedKey = null;
  }
  function doUnequip(slot: string) {
    unequipItem(slot);
    selectedType = null; selectedKey = null;
  }
  function doUse(id: string) {
    useItem(id);
    selectedType = null; selectedKey = null;
  }
  function doSell(id: string) {
    sellItem(id);
    selectedType = null; selectedKey = null;
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="inventory-layout">

  <!-- LEFT COLUMN: Equipment + Inventory Grid -->
  <div class="inventory-items">

    <!-- Header -->
    <div class="game-panel-header rounded-xl" style="border-radius:12px; border:1px solid #2a2520;">
      <span class="font-fantasy text-base tracking-widest">⚔ Inventory</span>
      <span style="font-size:12px; color:#78716c; margin-left:12px; font-family:'Inter',sans-serif; font-weight:400; text-transform:none; letter-spacing:normal;">Sell value is 40% of price</span>
    </div>

    {#if usedSlots >= maxSlots}
      <div style="padding:8px 12px; background:#1a0808; border:1px solid #7f1d1d; border-radius:8px; text-align:center; margin-top:8px">
        <span style="color:#f87171; font-size:12px; font-weight:600">Inventory Full ({usedSlots}/{maxSlots}) — sell, discard, or upgrade backpack</span>
      </div>
    {/if}

    <!-- Equipped Gear (compact list) -->
    <div class="game-panel" style="margin-top:12px; overflow:visible;">
      <div class="game-panel-header px-4 py-2">
        <span class="font-fantasy text-xs tracking-widest">Equipped Gear</span>
      </div>
      <div style="padding:8px;">
        {#each EQUIP_SLOTS as { slot, label, icon }}
          {@const eqId = equipment[slot]}
          {@const eqInst = eqId ? $player?.itemInstances?.[eqId] : null}
          {@const item = eqId ? (eqInst ? itemMap[eqInst.baseId] : itemMap[eqId]) : null}
          {@const elvl = enchantLevel(slot)}
          {@const isSelected = selectedType === 'equip' && selectedKey === slot}
          <div
            class="equip-slot-wrap"
            style="position:relative;">
            <div
              class="game-card"
              style="
                display:flex; align-items:center; gap:10px; margin-bottom:4px; cursor:pointer;
                border-color: {isSelected ? '#d4a853' : item ? rarityBorder(item.rarity) : '#2a2520'};
                box-shadow: {isSelected ? '0 0 8px rgba(212,168,83,0.3)' : 'none'};
              "
              onclick={() => item && selectEquip(slot)}>
              <div class="item-icon" style="border-color:{item ? rarityBorder(item.rarity) : '#2a2520'};">
                <span style="font-size:{item ? 20 : 16}px; opacity:{item ? 1 : 0.25};">{item ? (item.icon || icon) : icon}</span>
              </div>
              <div style="flex:1; min-width:0;">
                {#if item}
                  {@const dur = itemDurability(eqId)}
                  <div style="font-size:13px; font-weight:600; color:{rarityColor(item.rarity)}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    {item.name}{elvl > 0 ? ` +${elvl}` : ''}
                  </div>
                  <div style="display:flex; align-items:center; gap:6px">
                    <div style="font-size:10px; color:#8a8078; text-transform:capitalize;">{item.rarity} {label}</div>
                    {#if dur < 100}
                      <div style="flex:1; max-width:50px; height:3px; background:#1a1714; border-radius:2px; overflow:hidden">
                        <div style="height:100%; width:{dur}%; background:{durColor(dur)}; border-radius:2px"></div>
                      </div>
                      <span style="font-size:9px; color:{durColor(dur)}">{dur}%</span>
                    {/if}
                  </div>
                {:else}
                  <div style="font-size:12px; color:#8a8078; font-style:italic;">{label} — empty</div>
                {/if}
              </div>
            </div>
            {#if item && eqId}
              {@const eqInfo = hoverInfo(eqId, 'equip', slot)}
              {#if eqInfo}
                <div class="equip-hover-card">
                  <div style="font-weight:600; color:{rarityColor(eqInfo.rarity)}">{eqInfo.name}</div>
                  {#each eqInfo.lines as line}
                    <div style="color:#a8a29e">{line}</div>
                  {/each}
                </div>
              {/if}
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- Inventory Grid -->
    <div class="game-panel" style="margin-top:12px;">
      <div class="game-panel-header px-4 py-2" style="display:flex; justify-content:space-between; align-items:center">
        <span class="font-fantasy text-xs tracking-widest">Backpack ({usedSlots}/{maxSlots})</span>
      </div>

      <!-- Category tabs -->
      <div style="padding:8px 12px 0; display:flex; gap:3px; flex-wrap:wrap">
        {#each INV_TABS as tab}
          <button
            style="padding:4px 8px; border-radius:6px; font-size:10px; font-weight:600; cursor:pointer;
              border:1px solid {invFilter === tab.key ? '#ca8a04' : '#2a2520'};
              background:{invFilter === tab.key ? 'linear-gradient(180deg,#a16207,#713f12)' : '#0f0d0b'};
              color:{invFilter === tab.key ? '#fef3c7' : '#78716c'}"
            onclick={() => { invFilter = tab.key; }}>
            {tab.icon} {tab.label}
          </button>
        {/each}
      </div>

      <!-- Search + Sort -->
      <div style="padding:6px 12px; display:flex; gap:6px; align-items:center">
        <input type="text" bind:value={invSearch} placeholder="Search..."
          style="flex:1; padding:5px 8px; background:#0a0908; border:1px solid #2a2520; border-radius:6px; color:#e8e6dc; font-size:11px; min-width:0" />
        <select bind:value={invSort}
          style="padding:5px; background:#0a0908; border:1px solid #2a2520; border-radius:6px; color:#e8e6dc; font-size:10px">
          <option value="none">Original</option>
          <option value="type">By Type</option>
          <option value="rarity">By Rarity</option>
          <option value="name">By Name</option>
          <option value="level">By Level</option>
        </select>
        <button style="padding:4px 8px; font-size:10px; border-radius:4px; background:#0f0d0b; border:1px solid #2a2520; color:#78716c; cursor:pointer; white-space:nowrap"
          onclick={() => { sortInventory(invSort === 'none' ? 'type' : invSort); }}>
          Sort ↕
        </button>
      </div>

      <div style="padding:4px 12px 12px;">
        <div style="display:grid; grid-template-columns:repeat(5,1fr); gap:6px;">
          {#each filteredGrid as entry, idx}
            {@const { id, item, qty, slotIdx } = entry}
            {@const isSelected = selectedType === 'inv' && selectedKey === idx}
            {@const isNew = $newItemSlots.has(slotIdx)}
            {@const isDragSource = dragging !== null && dragging.slotIdx === slotIdx}
            {@const isDropTarget = dragging !== null && dropTarget === slotIdx && dragging.slotIdx !== slotIdx}
            <div class="inv-cell-wrap" style="position:relative">
              <div
                style="
                  aspect-ratio:1;
                  border: 2px solid {isDropTarget ? '#60a5fa' : isDragSource ? '#60a5fa' : isSelected ? '#d4a853' : item ? rarityBorder(item?.rarity) : '#1a1714'};
                  border-radius:8px;
                  background: {item ? 'linear-gradient(135deg,#151210,#0a0908)' : '#0d0c0a'};
                  display:flex; align-items:center; justify-content:center;
                  cursor:{item ? 'pointer' : 'default'}; position:relative;
                  transition: border-color 0.15s, transform 0.1s;
                  transform: {isSelected ? 'translateY(-2px)' : 'none'};
                  box-shadow: {isDropTarget ? '0 0 12px rgba(96,165,250,0.5)' : isSelected ? '0 0 8px rgba(212,168,83,0.3)' : 'none'};
                  opacity: {isDragSource ? 0.4 : item ? 1 : 0.4};
                "
                onmousedown={(e) => startDrag(e, slotIdx, item?.icon || '', idx, !!item)}
                onmouseenter={() => { if (dragging) dropTarget = slotIdx; }}>
                {#if item}
                  <span style="font-size:20px; user-select:none;">{item.icon}</span>
                  {#if isNew}
                    <span style="position:absolute; top:-2px; left:-2px; font-size:8px; font-weight:700; color:#fff; background:#15803d; padding:0 3px; border-radius:3px; line-height:1.3">NEW</span>
                  {/if}
                  {#if qty > 1}
                    <span style="position:absolute; bottom:1px; right:3px; font-size:10px; font-weight:700; color:#d4a853; line-height:1">{qty}</span>
                  {/if}
                {:else}
                  <span style="font-size:12px; color:#2a2520">·</span>
                {/if}
              </div>
              {#if item && id}
                {@const info = hoverInfo(id, 'inv')}
                {#if info}
                  <div class="inv-hover-card">
                    <div style="font-weight:600; color:{rarityColor(info.rarity)}">{info.name}</div>
                    {#each info.lines as line}
                      <div style="color:#a8a29e">{line}</div>
                    {/each}
                  </div>
                {/if}
              {/if}
            </div>
          {/each}
        </div>
        {#if filteredGrid.filter(e => e.item).length === 0 && invFilter !== 'all'}
          <div style="text-align:center; padding:16px; color:#78716c; font-size:12px">No {INV_TABS.find(t => t.key === invFilter)?.label || 'items'} in inventory.</div>
        {/if}
      </div>
    </div>
  </div>

  <!-- RIGHT COLUMN: Detail Panel -->
  <div class="inventory-detail">
    <div class="game-panel" style="position:sticky; top:0;">
      <div class="game-panel-header px-4 py-2">
        <span class="font-fantasy text-xs tracking-widest">Item Details</span>
      </div>

      {#if selectedItem}
        <div style="padding:16px;">
          <!-- Large icon -->
          <div style="text-align:center; margin-bottom:12px;">
            <div style="
              width:64px; height:64px; margin:0 auto;
              display:flex; align-items:center; justify-content:center;
              font-size:36px;
              background: radial-gradient(circle, #1a1714 0%, #0a0908 100%);
              border: 2px solid {rarityBorder(selectedItem.rarity)};
              border-radius:12px;
              box-shadow: 0 0 12px {rarityBorder(selectedItem.rarity)}55;
            ">
              {selectedItem.icon || '?'}
            </div>
          </div>

          <!-- Name -->
          <div style="text-align:center; font-size:16px; font-weight:700; color:{rarityColor(selectedItem.rarity)}; font-family:'Cinzel',serif; margin-bottom:4px;">
            {selectedItem.name}
            {#if selectedItem._source === 'equip'}
              {@const elvl = enchantLevel(selectedItem._slot)}
              {#if elvl > 0}<span style="color:#fbbf24;"> +{elvl}</span>{/if}
            {/if}
          </div>

          <!-- Rarity & slot -->
          <div style="text-align:center; font-size:11px; color:#8a8078; text-transform:capitalize; margin-bottom:8px;">
            {selectedItem.rarity || 'common'}{selectedItem.slot ? ` · ${selectedItem.slot}` : ''}
          </div>
          <!-- Durability (for equipped items) -->
          {#if selectedItem._source === 'equip' && selectedItem._slot}
            {@const dur = itemDurability(selectedItem.id)}
            <div style="margin-bottom:12px">
              <div style="display:flex; justify-content:space-between; font-size:10px; color:#8a8078; margin-bottom:3px">
                <span>Durability</span>
                <span style="color:{durColor(dur)}">{dur}/100</span>
              </div>
              <div style="height:6px; background:#1a1714; border-radius:3px; overflow:hidden">
                <div style="height:100%; width:{dur}%; background:{durColor(dur)}; border-radius:3px; transition:width 0.3s"></div>
              </div>
              {#if dur < 100}
                <div style="font-size:10px; color:#8a8078; margin-top:3px; text-align:center">
                  {#if dur > 75}Full power{:else if dur > 50}Stats -25%{:else if dur > 25}Stats -50%{:else}Stats -75%!{/if}
                </div>
              {/if}
            </div>
          {/if}

          <!-- Stats (with enchant bonuses) -->
          {#if statParts(selectedItem, selectedItem._source === 'equip' ? enchantLevel(selectedItem._slot) : ($player?.itemInstances?.[selectedItem.id]?.enchantLevel || 0)).length > 0}
            {@const selEnchant = selectedItem._source === 'equip' ? enchantLevel(selectedItem._slot) : ($player?.itemInstances?.[selectedItem.id]?.enchantLevel || 0)}
            <div style="margin-bottom:12px;">
              {#each statParts(selectedItem, selEnchant) as p}
                <div style="
                  display:flex; justify-content:space-between; align-items:center;
                  padding:5px 8px; margin-bottom:3px;
                  background:#0f0d0b; border:1px solid #2a2520; border-radius:6px;
                  font-size:12px;
                ">
                  <span style="color:#a8a29e;">{p.label}</span>
                  <span class="{p.cls}" style="font-weight:600;">{p.value}</span>
                </div>
              {/each}
            </div>
          {/if}

          <!-- Description / Buff info -->
          {#if selectedItem.desc}
            <div style="font-size:12px; color:#a78bfa; margin-bottom:12px; line-height:1.5; text-align:center;">
              {selectedItem.desc}
            </div>
          {:else if selectedItem.buff}
            <div style="font-size:12px; color:#a78bfa; margin-bottom:12px; text-align:center;">
              {selectedItem.buff.toUpperCase()} x{selectedItem.buffVal} for {selectedItem.buffFights} fights
            </div>
          {/if}

          <!-- Comparison vs equipped (for inventory items with slots) -->
          {#if selectedItem._source === 'inv' && selectedItem.slot}
            {@const eqId = equipment[selectedItem.slot]}
            {@const eqInstComp = eqId ? $player?.itemInstances?.[eqId] : null}
            {@const eqItem = eqId ? (eqInstComp ? itemMap[eqInstComp.baseId] : itemMap[eqId]) : null}
            {@const eqEnchant = eqId ? ($player?.itemInstances?.[eqId]?.enchantLevel || 0) : 0}
            {@const newEnchant = $player?.itemInstances?.[selectedItem.id]?.enchantLevel || 0}
            <div style="margin-bottom:12px; padding:8px; background:#0a0908; border:1px solid #1a1714; border-radius:8px;">
              <div style="font-size:10px; color:#8a8078; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; text-align:center;">
                {eqItem ? `vs ${eqItem.name}${eqEnchant ? ` +${eqEnchant}` : ''}` : 'No item equipped'}
              </div>
              {#each statParts(selectedItem, newEnchant) as p}
                {@const eqStat = eqItem ? statParts(eqItem, eqEnchant).find(e => e.label === p.label) : null}
                {@const eqVal = eqStat?.numVal || 0}
                {@const newVal = p.numVal || 0}
                {@const diff = newVal - eqVal}
                <div style="display:flex; justify-content:space-between; padding:3px 6px; font-size:12px;">
                  <span style="color:#a8a29e;">{p.label}</span>
                  <span>
                    <span class="{p.cls}">{p.value}</span>
                    {#if diff > 0}
                      <span style="color:#4ade80; font-weight:700; margin-left:4px;">▲+{Math.abs(diff)}</span>
                    {:else if diff < 0}
                      <span style="color:#f87171; font-weight:700; margin-left:4px;">▼-{Math.abs(diff)}</span>
                    {:else if eqItem}
                      <span style="color:#8a8078; margin-left:4px;">=</span>
                    {/if}
                  </span>
                </div>
              {/each}
            </div>
          {/if}

          <!-- Sell value -->
          <div style="text-align:center; font-size:11px; color:#8a8078; margin-bottom:16px;">
            Sell value: <span style="color:#d4a853;">🪙 {sellValue(selectedItem)}</span>
          </div>

          <!-- Action buttons -->
          <div style="display:flex; flex-direction:column; gap:6px;">
            {#if selectedItem._source === 'equip'}
              <button
                class="btn-game btn-dark"
                style="width:100%; font-size:13px; padding:8px 12px;"
                onclick={() => doUnequip(selectedItem._slot)}>
                Unequip
              </button>
            {:else}
              {#if selectedItem.slot && selectedItem.slot !== 'consumable'}
                <button
                  class="btn-game btn-gold"
                  style="width:100%; font-size:13px; padding:8px 12px;"
                  onclick={() => doEquip(selectedItem.id)}>
                  Equip
                </button>
              {/if}
              {#if isConsumable(selectedItem)}
                <button
                  class="btn-game btn-fight"
                  style="width:100%; font-size:13px; padding:8px 12px;"
                  onclick={() => doUse(selectedItem.id)}>
                  Use
                </button>
                {#if selectedItem._qty > 1}
                  <button
                    class="btn-game"
                    style="width:100%; font-size:13px; padding:8px 12px; background:linear-gradient(180deg,#052e16,#081508); color:#4ade80; border:1px solid #15803d"
                    onclick={() => { useAllItem(selectedItem.id); selectedType = null; selectedKey = null; }}>
                    Use All ({selectedItem._qty})
                  </button>
                {/if}
              {/if}
              <button
                class="btn-game btn-dark"
                style="width:100%; font-size:13px; padding:8px 12px;"
                onclick={() => doSell(selectedItem.id)}>
                Sell ({sellValue(selectedItem)}🪙)
              </button>
              <button
                class="btn-game"
                style="width:100%; font-size:12px; padding:6px 12px; background:linear-gradient(180deg,#1a0808,#0d0404); color:#f87171; border:1px solid #7f1d1d"
                onclick={() => { if (confirm(`Discard ${selectedItem.name}? It will be destroyed.`)) { discardItem(selectedItem.id); selectedType = null; selectedKey = null; } }}>
                🗑️ Discard
              </button>
            {/if}
          </div>
        </div>
      {:else}
        <div style="padding:40px 16px; text-align:center;">
          <div style="font-size:32px; margin-bottom:12px; opacity:0.2;">🎒</div>
          <div style="font-size:13px; color:#78716c;">Select an item to view details</div>
        </div>
      {/if}
    </div>
  </div>

  {#if dragging}
    <div style="position:fixed; left:{dragging.x - 16}px; top:{dragging.y - 16}px;
      font-size:28px; pointer-events:none; z-index:100;
      filter:drop-shadow(0 2px 4px rgba(0,0,0,0.8)); opacity:0.9;">
      {dragging.icon}
    </div>
  {/if}
</div>

<style>
  .inventory-layout {
    display: flex;
    gap: 16px;
  }
  .inventory-items {
    flex: 0 0 60%;
    min-width: 0;
  }
  .inventory-detail {
    flex: 0 0 38%;
    min-width: 0;
  }

  @media (max-width: 768px) {
    .inventory-layout {
      flex-direction: column;
    }
    .inventory-items {
      flex: none;
    }
    .inventory-detail {
      flex: none;
      position: sticky;
      bottom: 0;
    }
  }

  .inv-hover-card {
    display: none;
    position: absolute;
    bottom: 105%;
    left: 0;
    transform: none;
    background: #1a1714;
    border: 1px solid #2a2520;
    border-radius: 8px;
    padding: 6px 10px;
    font-size: 11px;
    white-space: nowrap;
    z-index: 30;
    pointer-events: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  }
  .inv-cell-wrap:hover .inv-hover-card { display: block; }

  .equip-hover-card {
    display: none;
    position: absolute;
    left: 0;
    bottom: 100%;
    margin-bottom: 4px;
    background: #1a1714;
    border: 1px solid #2a2520;
    border-radius: 8px;
    padding: 6px 10px;
    font-size: 11px;
    white-space: nowrap;
    z-index: 30;
    pointer-events: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  }
  .equip-slot-wrap:hover .equip-hover-card { display: block; }
</style>
