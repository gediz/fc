<script lang="ts">
  import { quests, getQuests } from '../../stores/game.js';
  import { onMount } from 'svelte';

  onMount(() => getQuests());

  const TYPE_ICONS = {
    kill:    '⚔️',
    collect: '🎒',
    gold:    '💰',
    dungeon: '🏰',
    win:     '🏆',
    level:   '📈',
  };

  $: activeQuests    = $quests.filter(q => (q.progress || 0) < (q.goal || 1));
  $: doneQuests      = $quests.filter(q => (q.progress || 0) >= (q.goal || 1));
  $: totalQuests     = $quests.length;
  $: completedCount  = doneQuests.length;

  function progressPct(quest: any) {
    if (!quest.goal || quest.goal === 0) return 100;
    return Math.min(100, Math.floor(((quest.progress || 0) / quest.goal) * 100));
  }

  function typeIcon(quest: any) {
    return TYPE_ICONS[quest.type] || '📜';
  }
</script>

<div style="display:flex;flex-direction:column;gap:14px;">

  <!-- Header -->
  <div class="game-panel">
    <div class="game-panel-header" style="display:flex;align-items:center;justify-content:space-between;">
      <span>📜 Quests</span>
      <span style="font-size:12px;color:#8a8078;font-family:'Cinzel',serif;font-weight:400;letter-spacing:0.5px;">
        <span style="color:#4ade80;font-weight:700;">{completedCount}</span>
        <span style="color:#4b5563;">/</span>
        <span style="color:#a8a29e;">{totalQuests}</span>
        &nbsp;Completed
      </span>
    </div>
    <div style="padding:10px 16px;font-size:13px;color:#8a8078;">
      Complete quests to earn gold, XP, and rare rewards. Active:
      <span style="color:#d4a853;font-weight:600;">{activeQuests.length}</span>
    </div>
  </div>

  {#if $quests.length === 0}
    <div class="game-panel" style="padding:48px 24px;text-align:center;">
      <div style="font-size:40px;margin-bottom:12px;filter:grayscale(0.3);">📜</div>
      <div class="font-fantasy" style="color:#8a8078;font-size:14px;">No quests — check back later.</div>
    </div>

  {:else}

    <!-- Active quests -->
    {#if activeQuests.length > 0}
      <div style="display:flex;flex-direction:column;gap:4px;">
        <div style="padding:2px 4px;font-size:11px;color:#8a8078;text-transform:uppercase;letter-spacing:1px;font-family:'Cinzel',serif;">
          Active Quests
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;">
          {#each activeQuests as quest}
            {@const pct = progressPct(quest)}
            <div class="game-card" style="display:flex;flex-direction:column;gap:10px;">

              <!-- Quest icon + name row -->
              <div style="display:flex;align-items:flex-start;gap:12px;">
                <div class="item-icon" style="
                  width:48px;height:48px;font-size:24px;flex-shrink:0;
                  background:linear-gradient(135deg,#1a1208,#0f0d0b);
                  border-color:#3d2a15;
                ">
                  {typeIcon(quest)}
                </div>
                <div style="flex:1;min-width:0;">
                  <div class="font-fantasy" style="font-size:13px;font-weight:700;color:#e0b85c;line-height:1.3;">
                    {quest.name || quest.id}
                  </div>
                  {#if quest.desc && quest.desc !== quest.name}
                    <div style="font-size:11px;color:#8a8078;margin-top:3px;line-height:1.4;">{quest.desc}</div>
                  {/if}
                </div>
              </div>

              <!-- Progress bar -->
              <div>
                <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:11px;margin-bottom:5px;">
                  <span style="color:#a8a29e;font-weight:600;">{quest.progress || 0} / {quest.goal || 1}</span>
                  <span style="color:#d4a853;">{pct}%</span>
                </div>
                <div class="quest-bar">
                  <div class="quest-bar-fill" style="width:{pct}%;"></div>
                </div>
              </div>

              <!-- Rewards -->
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <span style="font-size:10px;color:#8a8078;text-transform:uppercase;letter-spacing:0.5px;margin-right:2px;">Reward:</span>
                {#if quest.xpReward}
                  <span style="
                    font-size:11px;font-weight:700;
                    color:#93c5fd;
                    background:rgba(59,130,246,0.12);
                    border:1px solid rgba(59,130,246,0.25);
                    border-radius:20px;
                    padding:2px 8px;
                  ">{quest.xpReward} XP</span>
                {/if}
                {#if quest.goldReward}
                  <span style="
                    font-size:11px;font-weight:700;
                    color:#fbbf24;
                    background:rgba(161,98,7,0.15);
                    border:1px solid rgba(161,98,7,0.3);
                    border-radius:20px;
                    padding:2px 8px;
                  ">{quest.goldReward} 🪙</span>
                {/if}
                {#if quest.itemReward}
                  <span style="
                    font-size:11px;font-weight:700;
                    color:#c084fc;
                    background:rgba(192,132,252,0.1);
                    border:1px solid rgba(192,132,252,0.2);
                    border-radius:20px;
                    padding:2px 8px;
                  ">{quest.itemReward}</span>
                {/if}
                {#if !quest.xpReward && !quest.goldReward && !quest.itemReward}
                  <span style="font-size:11px;color:#8a8078;font-style:italic;">Reputation</span>
                {/if}
              </div>

            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Completed quests -->
    {#if doneQuests.length > 0}
      <div style="display:flex;flex-direction:column;gap:4px;">
        <div style="padding:2px 4px;font-size:11px;color:#4ade8088;text-transform:uppercase;letter-spacing:1px;font-family:'Cinzel',serif;">
          Completed ({doneQuests.length})
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px;">
          {#each doneQuests as quest}
            <div class="game-card" style="opacity:0.45;display:flex;align-items:center;gap:12px;position:relative;overflow:hidden;">
              <!-- Gold checkmark overlay -->
              <div style="
                position:absolute;top:8px;right:10px;
                font-size:18px;
                opacity:0.9;
              ">✅</div>
              <div class="item-icon" style="font-size:20px;flex-shrink:0;filter:grayscale(0.5);">{typeIcon(quest)}</div>
              <div style="flex:1;min-width:0;padding-right:28px;">
                <div class="font-fantasy" style="font-size:12px;color:#8a8078;text-decoration:line-through;">
                  {quest.name || quest.id}
                </div>
                <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:4px;">
                  {#if quest.xpReward}
                    <span style="font-size:10px;color:#4ade80;background:rgba(74,222,128,0.08);border-radius:10px;padding:1px 6px;border:1px solid rgba(74,222,128,0.15);">{quest.xpReward} XP</span>
                  {/if}
                  {#if quest.goldReward}
                    <span style="font-size:10px;color:#fbbf24;background:rgba(161,98,7,0.1);border-radius:10px;padding:1px 6px;border:1px solid rgba(161,98,7,0.2);">{quest.goldReward} 🪙</span>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

  {/if}
</div>
