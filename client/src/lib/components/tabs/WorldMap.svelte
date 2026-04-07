<script lang="ts">
  import { player, activeTab } from '../../stores/game.js';

  $: level = $player?.level || 1;

  const locations = [
    { id: 'arena',     tab: 'arena',     name: 'The Arena',       icon: '⚔️', desc: 'Fight enemies for XP and loot',   reqLevel: 1,  x: 50, y: 45 },
    { id: 'dungeons',  tab: 'dungeons',  name: 'Dungeon Gate',    icon: '🏰', desc: 'Multi-stage challenges',           reqLevel: 3,  x: 20, y: 30 },
    { id: 'shop',      tab: 'shop',      name: 'The Black Market',icon: '🏪', desc: 'Buy weapons and gear',             reqLevel: 1,  x: 75, y: 25 },
    { id: 'pvp',       tab: 'pvp',       name: 'PvP Colosseum',   icon: '🤺', desc: 'Challenge other players',          reqLevel: 3,  x: 80, y: 60 },
    { id: 'crafting',  tab: 'crafting',  name: 'The Forge',       icon: '⚒️', desc: 'Salvage and craft items',          reqLevel: 5,  x: 30, y: 65 },
    { id: 'enchanting',tab: 'enchanting',name: 'Enchanter Tower',  icon: '✨', desc: 'Upgrade your equipment',           reqLevel: 5,  x: 15, y: 55 },
    { id: 'guild',     tab: 'guild',     name: 'Guild Hall',      icon: '🏛️', desc: 'Join forces with other fighters',  reqLevel: 5,  x: 65, y: 75 },
    { id: 'skilltree', tab: 'skilltree', name: 'Ancient Library',  icon: '🌳', desc: 'Learn powerful skills',            reqLevel: 2,  x: 40, y: 20 },
  ];

  $: unlockedLocations = locations.filter(l => level >= l.reqLevel);
  $: lockedLocations = locations.filter(l => level < l.reqLevel);

  function goTo(tab: string) {
    $activeTab = tab;
  }
</script>

<div style="display:flex; flex-direction:column; gap:14px">
  <div class="combat-arena" style="padding:16px 20px">
    <h2 class="font-fantasy" style="font-size:22px; font-weight:700; color:#d4a853; margin:0; text-shadow:0 0 20px rgba(212,168,83,0.3)">🗺️ World Map</h2>
    <p style="color:#8a8078; font-size:13px; margin:4px 0 0">Explore the Fight Club world. New locations unlock as you level up.</p>
  </div>

  <!-- Map visual -->
  <div class="game-panel" style="overflow:hidden">
    <div style="position:relative; width:100%; padding-bottom:60%; background:radial-gradient(ellipse at 50% 40%, #1a1510 0%, #0a0908 70%); border-radius:0 0 12px 12px">
      <!-- Grid lines for atmosphere -->
      <svg style="position:absolute; inset:0; width:100%; height:100%; opacity:0.05" xmlns="http://www.w3.org/2000/svg">
        {#each Array(10) as _, i}
          <line x1="0" y1="{(i+1)*10}%" x2="100%" y2="{(i+1)*10}%" stroke="#d4a853" stroke-width="0.5"/>
          <line x1="{(i+1)*10}%" y1="0" x2="{(i+1)*10}%" y2="100%" stroke="#d4a853" stroke-width="0.5"/>
        {/each}
      </svg>

      <!-- Connections between locations -->
      <svg style="position:absolute; inset:0; width:100%; height:100%; opacity:0.15" xmlns="http://www.w3.org/2000/svg">
        {#each unlockedLocations as loc, i}
          {#if i > 0}
            {@const prev = unlockedLocations[i-1]}
            <line x1="{prev.x}%" y1="{prev.y}%" x2="{loc.x}%" y2="{loc.y}%" stroke="#d4a853" stroke-width="1" stroke-dasharray="4,4"/>
          {/if}
        {/each}
      </svg>

      <!-- Location nodes -->
      {#each unlockedLocations as loc}
        <button
          style="position:absolute; left:{loc.x}%; top:{loc.y}%; transform:translate(-50%,-50%);
            display:flex; flex-direction:column; align-items:center; gap:4px; cursor:pointer;
            background:none; border:none; padding:0; z-index:2"
          onclick={() => goTo(loc.tab)}>
          <div style="width:48px; height:48px; border-radius:12px; display:flex; align-items:center; justify-content:center;
            font-size:24px; background:radial-gradient(circle,#1a1714,#0a0908); border:2px solid #d4a853;
            box-shadow:0 0 12px rgba(212,168,83,0.3); transition:all 0.2s"
            class:glow-gold={$activeTab === loc.tab}>
            {loc.icon}
          </div>
          <div style="font-size:10px; color:#d4a853; font-weight:600; white-space:nowrap; text-shadow:0 1px 4px rgba(0,0,0,0.8)">{loc.name}</div>
        </button>
      {/each}

      <!-- Locked locations -->
      {#each lockedLocations as loc}
        <div style="position:absolute; left:{loc.x}%; top:{loc.y}%; transform:translate(-50%,-50%);
          display:flex; flex-direction:column; align-items:center; gap:4px; opacity:0.3">
          <div style="width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center;
            font-size:18px; background:#0d0c0a; border:1px solid #2a2520">
            🔒
          </div>
          <div style="font-size:9px; color:#4b5563; white-space:nowrap">Lv.{loc.reqLevel}</div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Location list (for accessibility / mobile) -->
  <div class="game-panel">
    <div class="game-panel-header">Locations</div>
    <div style="padding:8px; display:flex; flex-direction:column; gap:4px">
      {#each locations as loc}
        {@const unlocked = level >= loc.reqLevel}
        <button
          class="game-card"
          style="display:flex; align-items:center; gap:10px; padding:10px; cursor:{unlocked ? 'pointer' : 'not-allowed'};
            opacity:{unlocked ? 1 : 0.4}; text-align:left; width:100%;
            border-color:{$activeTab === loc.tab ? '#d4a853' : '#2a2520'}"
          disabled={!unlocked}
          onclick={() => goTo(loc.tab)}>
          <span style="font-size:22px; width:32px; text-align:center">{unlocked ? loc.icon : '🔒'}</span>
          <div style="flex:1">
            <div class="font-fantasy" style="font-size:13px; font-weight:600; color:{unlocked ? '#d4a853' : '#4b5563'}">{loc.name}</div>
            <div style="font-size:11px; color:#8a8078">{loc.desc}{!unlocked ? ` (Lv.${loc.reqLevel})` : ''}</div>
          </div>
          {#if unlocked}
            <span style="font-size:12px; color:#8a8078">→</span>
          {/if}
        </button>
      {/each}
    </div>
  </div>
</div>
