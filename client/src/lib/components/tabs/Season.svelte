<script lang="ts">
  import { onMount } from 'svelte';
  import { seasonInfo, getSeason } from '../../stores/game.js';

  onMount(() => getSeason());

  $: data = $seasonInfo;
  $: points = data?.points || 0;
  $: rewards = data?.rewards || [];
  $: currentTier = rewards.filter(r => points >= r.points).length;
  $: nextReward = rewards.find(r => points < r.points);
</script>

<div style="display:flex; flex-direction:column; gap:14px">
  <div class="combat-arena" style="padding:16px 20px">
    <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px">
      <div>
        <h2 class="font-fantasy" style="font-size:22px; font-weight:700; color:#d4a853; margin:0; text-shadow:0 0 20px rgba(212,168,83,0.3)">🏆 Season</h2>
        <p style="color:#8a8078; font-size:13px; margin:4px 0 0">{data?.season || 'Loading...'} · Tier {currentTier}/{rewards.length}</p>
        {#if data?.season}
          {@const [y, m] = data.season.split('-').map(Number)}
          {@const endDate = new Date(y, m, 0)}
          {@const now = new Date()}
          {@const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))}
          <p style="color:#d4a853; font-size:12px; margin:2px 0 0">
            Season ends: {endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} ({daysLeft} day{daysLeft !== 1 ? 's' : ''} left)
          </p>
        {/if}
      </div>
      <div style="text-align:center">
        <div class="font-fantasy" style="font-size:28px; font-weight:700; color:#fbbf24; text-shadow:0 0 12px rgba(251,191,36,0.4)">{points}</div>
        <div style="font-size:11px; color:#8a8078; text-transform:uppercase; letter-spacing:1px">Season Points</div>
      </div>
    </div>
  </div>

  {#if nextReward}
    <div class="game-panel">
      <div class="game-panel-header">Progress to {nextReward.icon} {nextReward.reward}</div>
      <div style="padding:12px">
        <div style="display:flex; justify-content:space-between; font-size:12px; color:#8a8078; margin-bottom:4px">
          <span>{points} / {nextReward.points}</span>
          <span>{Math.round(points / nextReward.points * 100)}%</span>
        </div>
        <div class="quest-bar" style="height:10px">
          <div class="quest-bar-fill" style="width:{Math.min(100, points / nextReward.points * 100)}%"></div>
        </div>
        <div style="font-size:12px; color:#d4a853; margin-top:6px; text-align:center">{nextReward.points - points} points to go · Reward: {nextReward.goldReward}🪙</div>
      </div>
    </div>
  {/if}

  <div class="game-panel">
    <div class="game-panel-header" style="display:flex; justify-content:space-between">
      <span>Reward Tiers</span>
      <button class="btn-game btn-dark" style="padding:2px 10px; font-size:10px" onclick={getSeason}>🔄</button>
    </div>
    <div style="padding:8px; display:flex; flex-direction:column; gap:6px">
      {#each rewards as reward}
        {@const reached = points >= reward.points}
        <div class="game-card" style="display:flex; align-items:center; gap:12px; padding:12px;
          border-color:{reached ? '#15803d' : '#2a2520'};
          {reached ? 'background:linear-gradient(135deg,#0a1a0a,#081508)' : ''}">
          <div style="font-size:28px; width:40px; text-align:center">{reward.icon}</div>
          <div style="flex:1">
            <div class="font-fantasy" style="font-weight:600; color:{reached ? '#4ade80' : '#8a8078'}; font-size:14px">
              {reached ? '✅ ' : ''}{reward.reward}
            </div>
            <div style="font-size:12px; color:#8a8078">{reward.points} points · {reward.goldReward}🪙</div>
          </div>
          {#if !reached}
            <div style="font-size:12px; color:#d4a853; white-space:nowrap">{reward.points - points} left</div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <div class="game-panel">
    <div class="game-panel-header">How to Earn Points</div>
    <div style="padding:12px; font-size:13px; color:#a8a29e; display:flex; flex-direction:column; gap:8px">
      <div style="display:flex; align-items:center; gap:8px">
        <span style="font-size:18px">⚔️</span>
        <span>Arena kills: <strong style="color:#d4a853">1 + enemy_level/10</strong> per kill</span>
      </div>
      <div style="display:flex; align-items:center; gap:8px">
        <span style="font-size:18px">🏰</span>
        <span>Dungeon clears: <strong style="color:#d4a853">5 × stages</strong> per clear</span>
      </div>
      <div style="display:flex; align-items:center; gap:8px">
        <span style="font-size:18px">🤺</span>
        <span>PvP wins: <strong style="color:#d4a853">10</strong> per win</span>
      </div>
    </div>
  </div>

  {#if data?.lastSeason}
    <div class="game-panel">
      <div class="game-panel-header">Previous Season ({data.lastSeason})</div>
      <div style="padding:12px; text-align:center; color:#8a8078; font-size:14px">
        You earned <strong style="color:#d4a853">{data.lastPoints}</strong> points
      </div>
    </div>
  {/if}
</div>
