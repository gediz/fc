<script lang="ts">
  import { player, username, gameData, pvpFight, pvpChoice, pvpLeave, maxHp } from '../../stores/game.js';
  import { afterUpdate } from 'svelte';

  const ZONES = [
    { id: 'head', label: 'Head', icon: '🪖' },
    { id: 'body', label: 'Body', icon: '🎽' },
    { id: 'legs', label: 'Legs', icon: '🦵' },
  ];

  let attackZone: string = 'body';
  let defendZone: string = 'body';
  let logEl: HTMLElement;

  afterUpdate(() => { if (logEl) logEl.scrollTop = logEl.scrollHeight; });

  $: fight    = $pvpFight;
  $: myName   = $username || '';

  // Server sends {you, enemy, yourHp, yourMaxHp, enemyHp, enemyMaxHp, ...}
  $: me      = fight?.you;
  $: enemy   = fight?.enemy;

  $: myHp       = fight?.yourHp    ?? 0;
  $: myMaxHp    = fight?.yourMaxHp ?? $maxHp;
  $: enemyHp    = fight?.enemyHp    ?? 0;
  $: enemyMaxHp = fight?.enemyMaxHp ?? 100;

  $: myHpPct    = myMaxHp    > 0 ? Math.max(0, Math.min(100, (myHp    / myMaxHp)    * 100)) : 0;
  $: enemyHpPct = enemyMaxHp > 0 ? Math.max(0, Math.min(100, (enemyHp / enemyMaxHp) * 100)) : 0;

  $: isOver         = fight?.winner != null;
  $: iWon           = fight?.iWon || false;
  $: waitingForEnemy = fight?.choiceSent && !fight?.enemyReady;

  $: log = fight?.log || [];

  // Class icons
  $: myClass    = $gameData?.classes?.[$player?.class]     || { icon: '⚔️' };
  $: enemyCls   = $gameData?.classes?.[enemy?.class]       || { icon: '🗡️' };

  function submitChoice() { pvpChoice(attackZone, defendZone); }

  function hpFillColor(pct: number) {
    if (pct > 60) return 'linear-gradient(90deg,#166534,#16a34a,#4ade80)';
    if (pct > 30) return 'linear-gradient(90deg,#713f12,#ca8a04,#fbbf24)';
    return 'linear-gradient(90deg,#7f1d1d,#dc2626,#ef4444)';
  }
</script>

<div class="combat-arena space-y-4">

  <!-- Title -->
  <div style="text-align:center;">
    <h2 class="font-fantasy" style="font-size:18px; color:#d4a853; letter-spacing:3px; text-shadow:0 0 16px rgba(212,168,83,0.4);">
      ⚔ PvP ARENA ⚔
    </h2>
  </div>

  {#if !fight}
    <div class="game-panel" style="text-align:center; padding:40px; color:#a8a29e; font-style:italic;">
      No active fight
    </div>
  {:else}

    <!-- Fighter portraits + HP bars -->
    <div style="display:grid; grid-template-columns:1fr auto 1fr; gap:12px; align-items:center;">

      <!-- My side -->
      <div style="text-align:center;">
        <div style="
          width:72px; height:72px; margin:0 auto 8px;
          display:flex; align-items:center; justify-content:center;
          font-size:38px;
          background:radial-gradient(circle,#1a1714,#080604);
          border:2px solid #d4a853; border-radius:12px;
          box-shadow:0 0 20px rgba(212,168,83,0.25);
        ">{myClass.icon}</div>
        <div class="font-fantasy" style="font-size:12px; color:#d4a853; margin-bottom:6px; letter-spacing:1px;">
          {fight?.yourName || myName || '???'}
        </div>
        <div style="font-size:10px; color:#78716c; margin-bottom:6px;">Lv. {$player?.level || 1}</div>
        <!-- HP bar -->
        <div class="bar-hp" style="height:14px; margin-bottom:4px;">
          <div class="bar-hp-fill" style="width:{myHpPct}%; background:{hpFillColor(myHpPct)};"></div>
        </div>
        <div style="font-size:10px; color:#78716c;">{myHp} / {myMaxHp}</div>
      </div>

      <!-- VS -->
      <div style="text-align:center; padding:0 8px;">
        <div class="font-fantasy" style="font-size:22px; color:#b91c1c; text-shadow:0 0 16px rgba(185,28,28,0.5);">VS</div>
        {#if fight.round != null}
          <div style="font-size:10px; color:#8a8078; margin-top:4px; font-family:'Cinzel',serif; letter-spacing:1px;">
            Round {fight.round}
          </div>
        {/if}
      </div>

      <!-- Enemy side -->
      <div style="text-align:center;">
        <div style="
          width:72px; height:72px; margin:0 auto 8px;
          display:flex; align-items:center; justify-content:center;
          font-size:38px;
          background:radial-gradient(circle,#1a0808,#080604);
          border:2px solid #dc2626; border-radius:12px;
          box-shadow:0 0 20px rgba(220,38,38,0.25);
        ">{enemyCls.icon}</div>
        <div class="font-fantasy" style="font-size:12px; color:#f87171; margin-bottom:6px; letter-spacing:1px;">
          {fight?.enemyName || enemy?.name || '???'}
        </div>
        <div style="font-size:10px; color:#78716c; margin-bottom:6px;">Lv. {enemy?.level || '?'}</div>
        <!-- HP bar -->
        <div class="bar-hp" style="height:14px; margin-bottom:4px;">
          <div class="bar-hp-fill" style="width:{enemyHpPct}%; background:{hpFillColor(enemyHpPct)};"></div>
        </div>
        <div style="font-size:10px; color:#78716c;">{enemyHp} / {enemyMaxHp}</div>
      </div>
    </div>

    <!-- Victory / Defeat -->
    {#if isOver}
      <div style="
        text-align:center; padding:24px 16px;
        background:{iWon
          ? 'linear-gradient(135deg,#052e16,#0f3020)'
          : 'linear-gradient(135deg,#1c0505,#2a0808)'};
        border:2px solid {iWon ? '#16a34a' : '#dc2626'};
        border-radius:12px;
        box-shadow:0 0 40px {iWon ? '#16a34a44' : '#dc262644'};
      ">
        <div class="font-fantasy" style="
          font-size:28px; letter-spacing:4px;
          color:{iWon ? '#4ade80' : '#f87171'};
          text-shadow:0 0 24px {iWon ? '#4ade80' : '#ef4444'};
          margin-bottom:8px;
        ">
          {iWon ? '✦ VICTORY ✦' : '✦ DEFEATED ✦'}
        </div>
        <div style="font-size:13px; color:#78716c; margin-bottom:16px;">
          {iWon ? `You defeated ${fight?.enemyName || enemy?.name || 'your opponent'}!` : `${fight.winner} wins this bout.`}
        </div>
        <button class="btn-game btn-dark" onclick={pvpLeave}>
          ← Return to PvP
        </button>
      </div>

    {:else}
      <!-- Zone selection -->
      <div class="game-panel">
        <div class="game-panel-header font-fantasy text-xs tracking-widest" style="padding:10px 16px;">
          Choose Your Zones
        </div>
        <div style="padding:14px; display:grid; grid-template-columns:1fr 1fr; gap:14px;">

          <!-- Attack -->
          <div>
            <div style="font-size:11px; font-weight:700; color:#f87171; letter-spacing:1px; margin-bottom:8px; text-transform:uppercase;">
              ⚔ Attack Zone
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
              {#each ZONES as zone}
                <button
                  class="zone-btn {attackZone === zone.id ? 'zone-attack' : ''}"
                  onclick={() => attackZone = zone.id}
                  style="text-align:left; display:flex; align-items:center; gap:8px; min-width:0;">
                  <span style="font-size:18px;">{zone.icon}</span>
                  <span>{zone.label}</span>
                  {#if attackZone === zone.id}
                    <span style="margin-left:auto; font-size:12px; color:#f87171;">✓</span>
                  {/if}
                </button>
              {/each}
            </div>
          </div>

          <!-- Defend -->
          <div>
            <div style="font-size:11px; font-weight:700; color:#60a5fa; letter-spacing:1px; margin-bottom:8px; text-transform:uppercase;">
              🛡 Defend Zone
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
              {#each ZONES as zone}
                <button
                  class="zone-btn {defendZone === zone.id ? 'zone-defend' : ''}"
                  onclick={() => defendZone = zone.id}
                  style="text-align:left; display:flex; align-items:center; gap:8px; min-width:0;">
                  <span style="font-size:18px;">{zone.icon}</span>
                  <span>{zone.label}</span>
                  {#if defendZone === zone.id}
                    <span style="margin-left:auto; font-size:12px; color:#60a5fa;">✓</span>
                  {/if}
                </button>
              {/each}
            </div>
          </div>
        </div>

        <!-- Lock in row -->
        <div style="padding:0 14px 14px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
          {#if fight.choiceSent}
            <div style="
              display:flex; align-items:center; gap:8px;
              color:#fbbf24; font-size:13px; font-weight:600;
            ">
              <span style="animation:pulse 1s ease infinite;">⏳</span>
              <span>{waitingForEnemy ? 'Waiting for opponent...' : 'Both ready!'}</span>
            </div>
          {:else}
            <div style="font-size:12px; color:#8a8078;">
              Attack: <span style="color:#f87171;">{ZONES.find(z => z.id === attackZone)?.label}</span>
              &nbsp;·&nbsp;
              Defend: <span style="color:#60a5fa;">{ZONES.find(z => z.id === defendZone)?.label}</span>
            </div>
            <button
              class="btn-game btn-fight glow-red"
              style="font-size:14px; padding:10px 24px; letter-spacing:2px;"
              onclick={submitChoice}>
              🔒 LOCK IN!
            </button>
          {/if}
        </div>
      </div>

      <!-- Forfeit -->
      <div style="text-align:right;">
        <button
          class="btn-game btn-dark"
          style="font-size:11px; padding:5px 12px; border-color:#7f1d1d; color:#fca5a5"
          onclick={() => { if (confirm('Forfeit? You will lose rating (-25) and the match counts as a loss.')) pvpLeave(); }}>
          🏳️ Forfeit (-25 rating)
        </button>
      </div>
    {/if}

    <!-- Combat log -->
    {#if log.length > 0}
      <div>
        <div class="game-panel-header font-fantasy text-xs tracking-widest" style="border-radius:8px 8px 0 0; border:1px solid #2a2520; border-bottom:none; padding:8px 12px;">
          Combat Log
        </div>
        <div bind:this={logEl} class="combat-log" style="max-height:200px; border-radius:0 0 8px 8px;">
          {#each log as l}
            <div class="log-{l.type || 'system'}">{l.text}</div>
          {/each}
        </div>
      </div>
    {/if}

  {/if}
</div>

<style>
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
</style>
