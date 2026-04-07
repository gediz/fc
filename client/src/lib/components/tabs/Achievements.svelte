<script lang="ts">
  import { player, gameData } from '../../stores/game.js';

  $: achievements = $gameData?.achievements || [];
  $: earned = new Set($player?.achievements || []);
  $: total = achievements.length;
  $: completedCount = achievements.filter(a => earned.has(a.id)).length;
  $: overallPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  $: categories = [...new Set(achievements.map(a => a.category || 'general'))];

  const CATEGORY_ICONS = {
    combat: '⚔️', dungeon: '🏰', gold: '💰', level: '📈',
    pvp: '🤺', quest: '📜', collection: '🎒', prestige: '✨',
  };

  function catIcon(category: string) {
    return CATEGORY_ICONS[category] || '🏅';
  }

  function catAchievements(cat: string) {
    return achievements.filter(a => (a.category || 'general') === cat);
  }

  function catEarnedCount(cat: string) {
    return catAchievements(cat).filter(a => earned.has(a.id)).length;
  }

  let filterDone: boolean = false;
</script>

<div style="display:flex;flex-direction:column;gap:12px;">

  <!-- Header panel -->
  <div class="game-panel">
    <div class="game-panel-header" style="display:flex;align-items:center;justify-content:space-between;">
      <span>🏅 Achievements</span>
      {#if total > 0}
        <span style="color:#d4a853;font-size:15px;font-weight:700;">{completedCount}<span style="color:#78716c;font-size:12px;font-weight:400;">/{total}</span></span>
      {/if}
    </div>
    {#if total > 0}
      <div style="padding:10px 16px;">
        <div class="quest-bar" style="height:8px;">
          <div class="quest-bar-fill" style="width:{overallPct}%;"></div>
        </div>
        <div style="font-size:11px;color:#78716c;margin-top:4px;">
          {overallPct}% complete — {completedCount} of {total} achievements earned
        </div>
      </div>
    {/if}
  </div>

  <!-- Filter buttons -->
  <div style="display:flex;gap:8px;">
    <button
      class="btn-game {!filterDone ? 'btn-gold' : 'btn-dark'}"
      onclick={() => filterDone = false}>All</button>
    <button
      class="btn-game {filterDone ? 'btn-gold' : 'btn-dark'}"
      onclick={() => filterDone = true}>Not Earned</button>
  </div>

  {#if achievements.length === 0}
    <div class="game-panel" style="padding:40px;text-align:center;">
      <div style="font-size:32px;margin-bottom:8px;">🏅</div>
      <div class="font-fantasy" style="color:#78716c;">No achievement data available.</div>
    </div>
  {:else}
    {#each categories as cat}
      {@const list = catAchievements(cat).filter(a => !filterDone || !earned.has(a.id))}
      {#if list.length > 0}
        <div class="game-panel">
          <div class="game-panel-header" style="display:flex;align-items:center;justify-content:space-between;">
            <span>{catIcon(cat)} {cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
            <span style="font-size:11px;color:#78716c;font-family:'Inter',sans-serif;font-weight:400;">
              {catEarnedCount(cat)}/{catAchievements(cat).length}
            </span>
          </div>
          <div style="padding:8px;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px;">
            {#each list as ach}
              {@const isEarned = earned.has(ach.id)}
              <div class="game-card" style="{isEarned ? '' : 'opacity:0.45;'}">
                <div style="display:flex;align-items:flex-start;gap:10px;">
                  <div class="item-icon" style="font-size:20px;flex-shrink:0;{isEarned ? 'border-color:#d4a853;box-shadow:0 0 8px rgba(212,168,83,0.2);' : ''}">
                    {isEarned ? '✅' : (ach.icon || '🔒')}
                  </div>
                  <div style="flex:1;min-width:0;">
                    <div class="font-fantasy" style="font-size:12px;font-weight:600;{isEarned ? 'color:#d4a853;' : 'color:#78716c;'}">
                      {ach.name || ach.id}
                    </div>
                    {#if ach.desc}
                      <div style="font-size:11px;color:#8a8078;margin-top:2px;">{ach.desc}</div>
                    {/if}
                    {#if ach.reward}
                      <div style="font-size:11px;color:#a16207;margin-top:3px;">🏆 {ach.reward}</div>
                    {/if}
                  </div>
                  {#if isEarned}
                    <span style="font-size:10px;color:#4ade80;flex-shrink:0;align-self:flex-start;margin-top:2px;">Earned</span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/each}
  {/if}
</div>
