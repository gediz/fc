<script lang="ts">
  import { player, gameData, buyItem, humanize } from '../../stores/game.js';

  const SLOT_TABS = [
    { key: 'all',        label: 'All',         icon: '🗃️' },
    { key: 'weapon',     label: 'Weapons',     icon: '⚔️' },
    { key: 'armor',      label: 'Armor',       icon: '🛡️' },
    { key: 'helmet',     label: 'Helmets',     icon: '⛑️' },
    { key: 'boots',      label: 'Boots',       icon: '👢' },
    { key: 'ring',       label: 'Rings',       icon: '💍' },
    { key: 'backpack',   label: 'Backpacks',   icon: '🎒' },
    { key: 'consumable', label: 'Consumables', icon: '🧪' },
  ];

  $: itemMap   = $gameData?.items   || {};
  $: inventory = $player?.inventory || [];
  $: equipment = $player?.equipment || {};
  $: gold      = $player?.gold      || 0;
  $: playerLevel = $player?.level   || 1;

  let activeTab: string = 'all';
  let searchQuery: string = '';
  let buyQty: Record<string, number> = {};  // itemId -> qty
  let sortBy: string = 'level'; // 'level', 'price', 'name', 'rarity'
  let showAffordable: boolean = false;

  const RARITY_ORDER = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };

  $: shopItems = Object.entries(itemMap)
    .filter(([, item]) => item.price > 0 && !item.dropOnly && !item.pvpOnly);

  $: filteredItems = shopItems.filter(([, item]) => {
    // Tab filter
    if (activeTab === 'consumable') { if (!item.consumable) return false; }
    else if (activeTab !== 'all') { if (item.slot !== activeTab) return false; }
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      if (!item.name.toLowerCase().includes(q) && !(item.desc || '').toLowerCase().includes(q)) return false;
    }
    // Affordable filter
    if (showAffordable && item.price > gold) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'price') return a[1].price - b[1].price;
    if (sortBy === 'price_desc') return b[1].price - a[1].price;
    if (sortBy === 'name') return a[1].name.localeCompare(b[1].name);
    if (sortBy === 'rarity') return (RARITY_ORDER[b[1].rarity] || 0) - (RARITY_ORDER[a[1].rarity] || 0);
    return (a[1].reqLevel || 1) - (b[1].reqLevel || 1) || a[1].price - b[1].price;
  });

  function owned(itemId: string) {
    // For consumables, check if already in inventory by template ID
    const item = itemMap[itemId];
    if (item && !item.consumable) return false; // equipment uses UUIDs now, allow duplicates
    return inventory.includes(itemId);
  }

  function canAfford(price: number) { return gold >= price; }

  function meetsLevel(item: any) { return playerLevel >= (item.reqLevel || 1); }

  function rarityColor(r: string) { return $gameData?.rarity?.[r] || '#9ca3af'; }

  function rarityBorder(r: string) {
    const m = { common:'#374151', uncommon:'#15803d', rare:'#1d4ed8', epic:'#7e22ce', legendary:'#b45309' };
    return m[r] || '#2a2520';
  }

  function statPills(item: any) {
    const pills = [];
    if (item.minDmg)     pills.push({ label: `DMG ${item.minDmg}–${item.maxDmg}`, cls: 'stat-str' });
    if (item.armor)      pills.push({ label: `ARM ${item.armor}`,                  cls: 'stat-end' });
    if (item.stats?.str) pills.push({ label: `STR +${item.stats.str}`,             cls: 'stat-str' });
    if (item.stats?.agi) pills.push({ label: `AGI +${item.stats.agi}`,             cls: 'stat-agi' });
    if (item.stats?.end) pills.push({ label: `END +${item.stats.end}`,             cls: 'stat-end' });
    if (item.stats?.int) pills.push({ label: `INT +${item.stats.int}`,             cls: 'stat-int' });
    if (item.heal)       pills.push({ label: `Heal ${item.heal}`,                  cls: 'stat-agi' });
    if (item.healHp)     pills.push({ label: `HP +${item.healHp >= 999 ? 'Full' : item.healHp}`, cls: 'stat-str' });
    if (item.healMp)     pills.push({ label: `MP +${item.healMp >= 999 ? 'Full' : item.healMp}`, cls: 'stat-int' });
    if (item.extraSlots) pills.push({ label: `+${item.extraSlots} slots`,          cls: 'stat-agi' });
    return pills;
  }

  function buffDesc(item: any) {
    if (!item.buffStat) return '';
    return `${item.buffStat.toUpperCase()} ×${item.buffVal} for ${item.buffFights} fights`;
  }
</script>

<div class="space-y-4">

  <!-- Header with gold -->
  <div class="game-panel" style="border-radius:12px;">
    <div class="game-panel-header" style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px;">
      <span class="font-fantasy tracking-widest text-sm">🏪 The Black Market</span>
      <span style="font-size:16px; font-weight:700; color:#fbbf24; font-family:'Cinzel',serif;">
        🪙 {humanize(gold)}
      </span>
    </div>
  </div>

  <!-- Tab bar -->
  <div style="display:flex; gap:4px; flex-wrap:wrap;">
    {#each SLOT_TABS as tab}
      <button
        onclick={() => activeTab = tab.key}
        style="
          padding:6px 12px; border-radius:8px; font-size:12px; font-weight:600;
          cursor:pointer; transition:all 0.15s;
          border:1px solid {activeTab === tab.key ? '#ca8a04' : '#2a2520'};
          background:{activeTab === tab.key
            ? 'linear-gradient(180deg,#a16207,#713f12)'
            : 'linear-gradient(180deg,#1a1714,#0f0d0b)'};
          color:{activeTab === tab.key ? '#fef3c7' : '#78716c'};
        ">
        {tab.icon} {tab.label}
      </button>
    {/each}
  </div>

  <!-- Search + Sort/Filter -->
  <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center">
    <div style="position:relative; flex:1; min-width:150px">
      <input type="text" bind:value={searchQuery} placeholder="Search items..."
        style="width:100%; padding:8px 14px 8px 32px; background:#0a0908; border:1px solid #2a2520; border-radius:8px; color:#e8e6dc; font-size:13px" />
      <span style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#78716c; font-size:14px">🔍</span>
    </div>
    <select bind:value={sortBy}
      style="padding:8px 10px; background:#0a0908; border:1px solid #2a2520; border-radius:8px; color:#e8e6dc; font-size:12px">
      <option value="level">Sort: Level</option>
      <option value="price">Sort: Price ↑</option>
      <option value="price_desc">Sort: Price ↓</option>
      <option value="rarity">Sort: Rarity</option>
      <option value="name">Sort: Name</option>
    </select>
    <button
      style="padding:8px 12px; border-radius:8px; font-size:12px; cursor:pointer; border:1px solid {showAffordable ? '#15803d' : '#2a2520'}; background:{showAffordable ? '#052e16' : '#0a0908'}; color:{showAffordable ? '#4ade80' : '#78716c'}"
      onclick={() => showAffordable = !showAffordable}>
      {showAffordable ? '🪙 Affordable' : '🪙 All prices'}
    </button>
    <span style="font-size:11px; color:#78716c">{filteredItems.length} items</span>
  </div>

  <!-- Cards grid -->
  {#if filteredItems.length === 0}
    <div class="game-panel" style="text-align:center; padding:40px; color:#a8a29e; font-style:italic; font-size:13px;">
      Nothing here yet
    </div>
  {:else}
    <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:10px;">
      {#each filteredItems as [itemId, item]}
        {@const isOwned   = owned(itemId)}
        {@const affordable = canAfford(item.price)}
        {@const levelOk   = meetsLevel(item)}
        {@const disabled  = isOwned || !affordable || !levelOk}
        <div class="game-card" style="
          position:relative;
          border-color:{isOwned ? '#374151' : rarityBorder(item.rarity)};
          opacity:{isOwned ? 0.75 : 1};
        ">
          <!-- Owned overlay badge -->
          {#if isOwned}
            <div style="
              position:absolute; top:8px; right:8px;
              background:#052e16; color:#4ade80; font-size:10px;
              font-weight:700; padding:2px 7px; border-radius:4px;
              border:1px solid #166534; letter-spacing:0.5px;
            ">OWNED</div>
          {/if}

          <!-- Icon -->
          <div style="
            width:52px; height:52px; margin:0 auto 8px;
            display:flex; align-items:center; justify-content:center;
            font-size:30px;
            background:radial-gradient(circle,#1a1714,#0a0908);
            border:1px solid {rarityBorder(item.rarity)};
            border-radius:10px;
            box-shadow:0 0 12px {rarityBorder(item.rarity)}44;
          ">{item.icon || '?'}</div>

          <!-- Name -->
          <div style="
            text-align:center; font-size:13px; font-weight:700;
            margin-bottom:4px;
            color:{rarityColor(item.rarity)};
            font-family:'Cinzel',serif;
          ">{item.name}</div>

          <!-- Description for consumables/backpacks -->
          {#if (item.consumable || item.slot === 'backpack') && (buffDesc(item) || item.desc)}
            <div style="
              text-align:center; font-size:11px; color:#a78bfa;
              background:#1e1b4b44; border:1px solid #4c1d9533;
              border-radius:6px; padding:4px 6px; margin-bottom:6px;
            ">{buffDesc(item) || item.desc}</div>
          {/if}

          <!-- Stat pills -->
          {#if statPills(item).length > 0}
            <div style="display:flex; flex-wrap:wrap; gap:3px; justify-content:center; margin-bottom:8px;">
              {#each statPills(item) as p}
                <span class="{p.cls}" style="font-size:10px; background:#0f0d0b; padding:2px 6px; border-radius:4px; border:1px solid #2a2520;">
                  {p.label}
                </span>
              {/each}
            </div>
          {/if}

          <!-- Level req -->
          {#if (item.reqLevel || 1) > 1}
            <div style="text-align:center; font-size:10px; color:{levelOk ? '#8a8078' : '#ef4444'}; margin-bottom:6px;">
              Requires Level {item.reqLevel}
            </div>
          {/if}

          <!-- Price & buy -->
          <div style="display:flex; flex-direction:column; gap:4px; margin-top:auto;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
              <span style="font-size:14px; font-weight:700; color:{affordable ? '#fbbf24' : '#78350f'};">
                🪙 {humanize(item.price)}
              </span>
              {#if isOwned && !item.consumable}
                <span style="font-size:11px; color:#4ade80;">Owned</span>
              {:else}
                <button
                  class="btn-game btn-gold"
                  style="font-size:11px; padding:5px 12px;"
                  disabled={!affordable || !levelOk}
                  style:opacity={!affordable || !levelOk ? '0.45' : '1'}
                  style:cursor={!affordable || !levelOk ? 'not-allowed' : 'pointer'}
                  onclick={() => buyItem(itemId, item.consumable ? (buyQty[itemId] || 1) : 1)}>
                  {!levelOk ? 'Too Low' : !affordable ? 'No Gold' : 'Buy'}
                </button>
              {/if}
            </div>
            {#if item.consumable && levelOk}
              <div style="display:flex; align-items:center; gap:4px; justify-content:center">
                {#each [1, 5, 10, 20] as q}
                  {@const selected = (buyQty[itemId] || 1) === q}
                  {@const totalCost = item.price * q}
                  <button
                    style="font-size:10px; padding:2px 6px; border-radius:4px; cursor:pointer; border:1px solid {selected ? '#ca8a04' : '#2a2520'}; background:{selected ? '#1c1608' : '#0f0d0b'}; color:{gold >= totalCost ? (selected ? '#fbbf24' : '#8a8078') : '#4b5563'}"
                    onclick={() => buyQty[itemId] = q}>
                    ×{q}
                  </button>
                {/each}
                {#if (buyQty[itemId] || 1) > 1}
                  <span style="font-size:10px; color:#8a8078; margin-left:2px">= {humanize(item.price * (buyQty[itemId] || 1))}🪙</span>
                {/if}
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}

</div>
