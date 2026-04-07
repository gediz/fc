<script lang="ts">
  import { player, username, gameData, leaderboard, getLeaderboard, viewPlayer, humanize } from '../../stores/game.js';
  import { onMount } from 'svelte';

  onMount(() => getLeaderboard());

  $: myName = $username || '';

  function rankBadge(i: number) {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return `#${i + 1}`;
  }

  function isTopThree(i: number) { return i < 3; }

  function topThreeBg(i: number) {
    if (i === 0) return 'background:linear-gradient(90deg,rgba(212,168,83,0.12) 0%,rgba(212,168,83,0.04) 60%,transparent 100%);';
    if (i === 1) return 'background:linear-gradient(90deg,rgba(156,163,175,0.08) 0%,rgba(156,163,175,0.02) 60%,transparent 100%);';
    if (i === 2) return 'background:linear-gradient(90deg,rgba(161,98,7,0.08) 0%,rgba(161,98,7,0.02) 60%,transparent 100%);';
    return '';
  }

  function rankNumColor(i: number) {
    if (i === 0) return '#fbbf24';
    if (i === 1) return '#d1d5db';
    if (i === 2) return '#d97706';
    return '#8a8078';
  }

  function pvpRatingColor(rating: number) {
    if (!rating && rating !== 0) return '#8a8078';
    if (rating > 1200) return '#4ade80';
    if (rating >= 900) return '#d4a853';
    return '#f87171';
  }

  function classIcon(cls: string) {
    return $gameData?.classes?.[cls]?.icon || '⚔️';
  }
</script>

<div style="display:flex;flex-direction:column;gap:14px;">

  <!-- Header -->
  <div class="game-panel">
    <div class="game-panel-header" style="display:flex;align-items:center;justify-content:space-between;">
      <span>🏆 Rankings</span>
      <button
        class="btn-game btn-dark"
        style="padding:4px 12px;font-size:11px;"
        onclick={getLeaderboard}>
        🔄 Refresh
      </button>
    </div>
    <div style="padding:10px 16px;font-size:13px;color:#8a8078;">
      Top players by level and combat power.
      <span style="color:#d4a853;font-weight:600;">{$leaderboard.length}</span> players ranked.
      Click a player name to view their profile.
    </div>
  </div>

  {#if $leaderboard.length === 0}
    <div class="game-panel" style="padding:48px 24px;text-align:center;">
      <div style="font-size:40px;margin-bottom:12px;">🏆</div>
      <div class="font-fantasy" style="color:#8a8078;font-size:14px;">No rankings data yet.</div>
      <button
        class="btn-game btn-dark"
        style="margin-top:14px;padding:8px 20px;"
        onclick={getLeaderboard}>
        Load Rankings
      </button>
    </div>

  {:else}
    <div class="game-panel" style="overflow:hidden;">
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;min-width:560px;">
          <thead>
            <tr style="background:linear-gradient(90deg,#1a1510 0%,#201a14 50%,#1a1510 100%);border-bottom:2px solid #2a2520;">
              <th class="font-fantasy" style="text-align:center;padding:10px 12px;width:56px;font-size:10px;color:#d4a853;letter-spacing:1px;font-weight:700;">Rank</th>
              <th class="font-fantasy" style="text-align:left;padding:10px 12px;font-size:10px;color:#d4a853;letter-spacing:1px;font-weight:700;">Player</th>
              <th class="font-fantasy" style="text-align:center;padding:10px 10px;font-size:10px;color:#d4a853;letter-spacing:1px;font-weight:700;">Level</th>
              <th class="font-fantasy" style="text-align:center;padding:10px 10px;font-size:10px;color:#d4a853;letter-spacing:1px;font-weight:700;">Kills</th>
              <th class="font-fantasy" style="text-align:center;padding:10px 10px;font-size:10px;color:#d4a853;letter-spacing:1px;font-weight:700;">PvP Wins</th>
              <th class="font-fantasy" style="text-align:center;padding:10px 10px;font-size:10px;color:#d4a853;letter-spacing:1px;font-weight:700;">PvP Rating</th>
              <th class="font-fantasy" style="text-align:center;padding:10px 10px;font-size:10px;color:#d4a853;letter-spacing:1px;font-weight:700;">Gold</th>
            </tr>
          </thead>
          <tbody>
            {#each $leaderboard as entry, i}
              {@const isMe = myName !== '' && entry.name === myName}
              <tr class={isMe ? 'ranking-me' : ''} style="
                border-bottom:1px solid #1a1714;
                transition:background 0.15s;
                {isMe ? 'background:#2a1f08; border-left:4px solid #d4a853;' : (isTopThree(i) ? topThreeBg(i) + 'border-left:4px solid transparent;' : 'border-left:4px solid transparent;')}
              ">

                <!-- Rank -->
                <td style="padding:10px 12px;text-align:center;">
                  <span style="
                    font-size:{isTopThree(i) ? '20px' : '13px'};
                    font-weight:700;
                    color:{rankNumColor(i)};
                    {i === 0 ? 'text-shadow:0 0 10px rgba(212,168,83,0.5);' : ''}
                  ">
                    {rankBadge(i)}
                  </span>
                </td>

                <!-- Player name — CLICKABLE -->
                <td style="padding:10px 12px;">
                  <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:16px;flex-shrink:0;">{classIcon(entry.class)}</span>
                    <div>
                      <!-- Name is clickable -->
                      <button
                        style="
                          background:none;border:none;padding:0;cursor:pointer;text-align:left;
                          font-weight:700;font-size:13px;
                          color:{isMe ? '#d4a853' : (isTopThree(i) ? '#e8e6dc' : '#d6d3d1')};
                          {i === 0 ? 'text-shadow:0 0 8px rgba(212,168,83,0.4);' : ''}
                          transition:color 0.15s;
                          text-decoration:underline;text-underline-offset:3px;text-decoration-color:rgba(212,168,83,0.3);
                        "
                        onclick={() => viewPlayer(entry.name)}
                        onmouseenter={(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.color = '#d4a853'; }}
                        onmouseleave={(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.color = isMe ? '#d4a853' : (isTopThree(i) ? '#e8e6dc' : '#d6d3d1'); }}>
                        {entry.name}
                        {#if (entry.prestige || 0) > 0}
                          <span style="color:#fbbf24;font-size:10px;margin-left:4px;">✨NG+{entry.prestige}</span>
                        {/if}
                      </button>
                      {#if entry.activeTitle}
                        {@const titleName = $gameData?.titles?.find(t => t.id === entry.activeTitle)?.name || entry.activeTitle}
                        <div style="font-size:10px;color:#c084fc;line-height:1.2;margin-top:1px;">[{titleName}]</div>
                      {/if}
                    </div>
                  </div>
                </td>

                <!-- Level -->
                <td style="text-align:center;padding:10px;color:#e8e6dc;font-weight:700;font-size:14px;">{entry.level}</td>

                <!-- Kills -->
                <td style="text-align:center;padding:10px;color:#f87171;font-size:12px;font-weight:600;">{entry.kills || 0}</td>

                <!-- PvP Wins -->
                <td style="text-align:center;padding:10px;color:#d4a853;font-size:12px;font-weight:600;">{entry.pvpWins || 0}</td>

                <!-- PvP Rating -->
                <td style="text-align:center;padding:10px;">
                  {#if entry.pvpRating != null}
                    <span style="
                      font-size:12px;font-weight:700;
                      color:{pvpRatingColor(entry.pvpRating)};
                    ">{entry.pvpRating}</span>
                  {:else}
                    <span style="font-size:12px;color:#4b5563;">—</span>
                  {/if}
                </td>

                <!-- Gold -->
                <td style="text-align:center;padding:10px;color:#a16207;font-size:12px;font-weight:600;">
                  {entry.gold != null ? `${humanize(entry.gold)} 🪙` : '—'}
                </td>

              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Show current player if not in top list -->
    {#if myName && !$leaderboard.some(e => e.name === myName)}
      <div class="game-panel" style="border-color:#d4a853">
        <div style="padding:10px 14px; display:flex; align-items:center; gap:12px; background:rgba(212,168,83,0.05)">
          <span style="color:#d4a853; font-weight:700; font-size:13px">Your stats:</span>
          <span style="color:#e8e6dc">{classIcon($player?.class || 'warrior')} {myName}</span>
          <span style="color:#d4a853; font-weight:700">Lv.{$player?.level || 1}</span>
          <span style="color:#f87171">{$player?.kills || 0} kills</span>
          <span style="color:#a16207">{humanize($player?.gold || 0)} 🪙</span>
          <span style="font-size:10px; background:rgba(212,168,83,0.15); color:#d4a853; padding:2px 8px; border-radius:4px; border:1px solid rgba(212,168,83,0.3); font-weight:700">YOU</span>
        </div>
      </div>
    {/if}
  {/if}

</div>
