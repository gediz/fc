<script lang="ts">
  import { player, gameData, titles, setTitle, getTitles } from '../../stores/game.js';
  import { onMount } from 'svelte';

  onMount(() => getTitles());

  $: activeTitle     = $player?.activeTitle;
  $: unlockedMap     = new Map(($titles || []).map(t => [t.id, t]));
  $: allTitles       = $gameData?.titles || [];
  $: unlockedTitles  = allTitles.filter(t => unlockedMap.has(t.id));
  $: lockedTitles    = allTitles.filter(t => !unlockedMap.has(t.id));
  $: activeTitleObj  = unlockedMap.get(activeTitle) || allTitles.find(t => t.id === activeTitle);
  $: activeBuff      = unlockedMap.get(activeTitle)?.buffDesc || null;

  function rarityColor(r: string) {
    const map = {
      common:    '#9ca3af',
      uncommon:  '#4ade80',
      rare:      '#60a5fa',
      epic:      '#c084fc',
      legendary: '#fbbf24',
    };
    return map[r] || '#9ca3af';
  }
</script>

<div style="display:flex;flex-direction:column;gap:14px;">

  <!-- Header -->
  <div class="game-panel">
    <div class="game-panel-header" style="display:flex;align-items:center;justify-content:space-between;">
      <span>🎭 Titles</span>
      <span style="font-size:11px;color:#8a8078;font-family:'Cinzel',serif;letter-spacing:0.5px;">
        <span style="color:#d4a853;font-weight:700;">{unlockedTitles.length}</span> / {allTitles.length} Unlocked
      </span>
    </div>
    <div style="padding:10px 16px;font-size:13px;color:#8a8078;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      {#if activeTitleObj}
        <span>Active:</span>
        <span class="font-fantasy" style="color:{rarityColor(activeTitleObj.rarity)};font-weight:700;">
          [{activeTitleObj.name}]
        </span>
        {#if activeBuff}
          <span style="color:#4ade80;font-size:12px;">⚡ {activeBuff}</span>
        {/if}
      {:else}
        <span style="color:#4b5563;font-style:italic;">No title selected — equip one to show it off.</span>
      {/if}
    </div>
  </div>

  <!-- Unlocked titles -->
  {#if unlockedTitles.length > 0}
    <div style="display:flex;flex-direction:column;gap:6px;">
      <div style="padding:2px 4px;font-size:11px;color:#d4a85388;text-transform:uppercase;letter-spacing:1px;font-family:'Cinzel',serif;">
        Unlocked ({unlockedTitles.length})
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;">
        {#each unlockedTitles as title}
          {@const isActive  = title.id === activeTitle}
          {@const titleData = unlockedMap.get(title.id)}
          {@const buffDesc  = titleData?.buffDesc || null}
          <div
            class="game-card"
            style="
              display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;padding:14px 12px;
              {isActive
                ? 'border-color:#d4a853;box-shadow:0 0 18px rgba(212,168,83,0.28),0 0 5px rgba(212,168,83,0.12);background:linear-gradient(135deg,#1c1608 0%,#13110a 100%);animation:goldPulse 2s ease infinite;'
                : ''}
            ">

            <!-- Large icon -->
            <div style="
              width:52px;height:52px;font-size:28px;
              display:flex;align-items:center;justify-content:center;
              background:linear-gradient(135deg,#1a1510,#0f0d0b);
              border:1px solid {isActive ? '#d4a853' : '#2a2520'};
              border-radius:10px;
              {isActive ? 'box-shadow:0 0 10px rgba(212,168,83,0.3);' : ''}
            ">
              {title.icon || '🎭'}
            </div>

            <!-- Title name -->
            <div class="font-fantasy" style="font-size:12px;font-weight:700;color:{rarityColor(title.rarity)};line-height:1.3;">
              [{title.name}]
            </div>

            <!-- MOST IMPORTANT: Buff in green text -->
            {#if buffDesc}
              <div style="
                font-size:12px;font-weight:600;
                color:#4ade80;
                text-shadow:0 0 8px rgba(74,222,128,0.3);
                line-height:1.3;
              ">⚡ {buffDesc}</div>
            {:else}
              <div style="font-size:11px;color:#4b5563;font-style:italic;">No buff</div>
            {/if}

            {#if isActive}
              <div style="font-size:9px;color:#d4a853;text-transform:uppercase;letter-spacing:1px;font-weight:600;">
                ★ Active
              </div>
            {/if}

            <!-- Equip / Remove button -->
            <button
              class="btn-game {isActive ? 'btn-dark' : 'btn-gold'}"
              style="width:100%;padding:6px 0;font-size:11px;margin-top:2px;"
              onclick={() => setTitle(isActive ? null : title.id)}>
              {isActive ? 'Remove' : 'Equip'}
            </button>

          </div>
        {/each}
      </div>
    </div>

  {:else}
    <div class="game-panel" style="padding:48px 24px;text-align:center;">
      <div style="font-size:40px;margin-bottom:12px;">🎭</div>
      <div class="font-fantasy" style="color:#8a8078;font-size:14px;">No titles unlocked yet.</div>
      <div style="font-size:12px;color:#4b5563;margin-top:6px;">Complete achievements to earn titles.</div>
    </div>
  {/if}

  <!-- Locked titles -->
  {#if lockedTitles.length > 0}
    <div style="display:flex;flex-direction:column;gap:6px;">
      <div style="padding:2px 4px;font-size:11px;color:#4b5563;text-transform:uppercase;letter-spacing:1px;font-family:'Cinzel',serif;">
        Locked ({lockedTitles.length})
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;">
        {#each lockedTitles as title}
          <div class="game-card" style="
            display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;padding:14px 12px;
            opacity:0.38;filter:grayscale(0.6);
          ">
            <!-- Lock icon replaces actual icon -->
            <div style="
              width:52px;height:52px;font-size:26px;
              display:flex;align-items:center;justify-content:center;
              background:linear-gradient(135deg,#1a1714,#0f0d0b);
              border:1px solid #2a2520;
              border-radius:10px;
            ">🔒</div>

            <div class="font-fantasy" style="font-size:12px;font-weight:600;color:#8a8078;">
              [{title.name}]
            </div>

            <!-- Buff is unknown for locked titles -->
            <div style="font-size:12px;color:#4b5563;font-style:italic;letter-spacing:1px;">???</div>

            {#if title.requirement}
              <div style="font-size:10px;color:#4b5563;line-height:1.4;">{title.requirement}</div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

</div>
