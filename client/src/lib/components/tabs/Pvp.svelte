<script lang="ts">
  import { player, gameData, onlinePlayers, pendingChallenges, sentChallenge,
    challenge, acceptChallenge, declineChallenge } from '../../stores/game.js';

  $: myName   = $player?.name;
  $: opponents = $onlinePlayers.filter(p => p.name !== ($player?.name || ''));

  function classIcon(cls: string) {
    return $gameData?.classes?.[cls]?.icon || '⚔️';
  }

  function levelDiffStyle(opLvl: number) {
    const diff = opLvl - ($player?.level || 1);
    if (diff >= 5)  return 'color:#f87171;';
    if (diff >= 2)  return 'color:#fbbf24;';
    if (diff <= -5) return 'color:#4a4540;';
    return 'color:#4ade80;';
  }
</script>

<div style="display:flex; flex-direction:column; gap:10px;">

  <!-- Header -->
  <div class="game-panel">
    <div class="game-panel-header font-fantasy" style="font-size:12px; padding:8px 14px;">
      PvP Arena
    </div>
    <div style="padding:10px 14px; font-size:12px; color:#8a8078;">
      Challenge online players to a duel. Both players must be online.
    </div>
  </div>

  <!-- Pending incoming challenges -->
  {#if $pendingChallenges.length > 0}
    <div class="game-panel" style="border-color:#7f1d1d;">
      <div class="game-panel-header font-fantasy" style="
        font-size:12px; padding:8px 14px;
        background:linear-gradient(90deg,#200808,#2a1010,#200808);
        color:#f87171;
      ">
        Incoming Challenges
      </div>
      <div style="padding:8px 10px; display:flex; flex-direction:column; gap:6px;">
        {#each $pendingChallenges as ch}
          <div class="game-card" style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:8px 12px;">
            <div>
              <span style="font-size:14px; font-weight:600; color:#f87171;">{ch.from}</span>
              <span style="font-size:11px; color:#6b6560; margin-left:6px;">Lv.{ch.fromLevel}</span>
            </div>
            <div style="display:flex; gap:6px; flex-shrink:0;">
              <button
                class="btn-game btn-fight"
                style="font-size:11px; padding:5px 12px; min-height:unset;"
                onclick={() => acceptChallenge(ch.id)}>
                Accept
              </button>
              <button
                class="btn-game btn-dark"
                style="font-size:11px; padding:5px 12px; min-height:unset;"
                onclick={() => declineChallenge(ch.id)}>
                Decline
              </button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Sent challenge status -->
  {#if $sentChallenge}
    <div class="game-panel" style="border-color:#78350f;">
      <div style="padding:10px 14px; display:flex; align-items:center; gap:8px;">
        <span style="animation:pulse 1s ease infinite; font-size:14px;">⏳</span>
        <span style="font-size:13px; color:#fbbf24;">
          Challenge sent to <strong>{$sentChallenge.to}</strong> — waiting for response...
        </span>
      </div>
    </div>
  {/if}

  <!-- Online players list -->
  <div class="game-panel">
    <div class="game-panel-header font-fantasy" style="font-size:12px; padding:8px 14px; display:flex; align-items:center; justify-content:space-between;">
      <span>Online Players</span>
      <span style="font-family:'Inter',sans-serif; font-weight:400; font-size:11px; color:#6b6560; text-transform:none; letter-spacing:0;">
        {opponents.length} online
      </span>
    </div>

    {#if opponents.length === 0}
      <div style="text-align:center; padding:32px 16px; font-size:13px; color:#4a4540; font-style:italic;">
        No other players online
      </div>
    {:else}
      <div style="padding:8px 10px; display:flex; flex-direction:column; gap:6px;">
        {#each opponents as op}
          {@const alreadyChallenged = $sentChallenge?.to === op.name}
          {@const inFight = op.inFight}
          <div class="game-card" style="display:flex; align-items:center; gap:10px; padding:8px 12px;">
            <span style="font-size:22px; flex-shrink:0;">{classIcon(op.class)}</span>

            <div style="flex:1; min-width:0;">
              <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                <span style="font-size:14px; font-weight:600; color:#d6d3d1;">{op.name}</span>
                {#if (op.prestige || 0) > 0}
                  <span style="font-size:11px; color:#fbbf24;">NG+{op.prestige}</span>
                {/if}
                {#if inFight}
                  <span style="font-size:11px; color:#f87171;">⚔ In fight</span>
                {/if}
              </div>
              <div style="font-size:12px; color:#6b6560; margin-top:1px;">
                <span style="{levelDiffStyle(op.level)}">Lv.{op.level}</span>
                {#if $gameData?.classes?.[op.class]}
                  <span style="margin-left:4px;">{$gameData.classes[op.class].name}</span>
                {/if}
                {#if op.title}
                  {@const titleName = $gameData?.titles?.find(t => t.id === op.title)?.name || op.title}
                  <span style="color:#c084fc; margin-left:4px;">[{titleName}]</span>
                {/if}
              </div>
            </div>

            <button
              class="btn-game {alreadyChallenged || inFight || $sentChallenge ? 'btn-dark' : 'btn-fight'}"
              style="flex-shrink:0; font-size:11px; padding:5px 12px; min-height:unset;
                {alreadyChallenged || inFight || $sentChallenge ? 'opacity:0.5; cursor:not-allowed;' : ''}"
              disabled={!!alreadyChallenged || !!inFight || !!$sentChallenge}
              onclick={() => challenge(op.name)}>
              {alreadyChallenged ? 'Pending…' : inFight ? 'In fight' : '⚔ Challenge'}
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </div>

</div>

<style>
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }
</style>
