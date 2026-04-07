<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import Avatar from './Avatar.svelte';
  import { gameData, combatSpeed } from '../stores/game.js';
  import { sfxHit, sfxCrit, sfxMiss, sfxVictory, sfxDefeat } from '../audio.js';

  // ── Props ─────────────────────────────────────────────────────
  export let log: any[]          = [];      // full array of combat log entries
  export let playerName: string   = 'Hero';
  export let playerClassId: string = 'warrior';
  export let enemyName: string    = 'Enemy';
  export let enemyIcon: string    = '👹';
  export let playerMaxHp: number  = 100;
  export let playerStartHp: number = 0; // 0 = use playerMaxHp
  export let enemyMaxHp: number   = 100;
  export let onComplete: () => void   = () => {};
  export let autoSpeed: number    = 0;       // 0=manual speed control, 4=force 4x (for auto-farm)

  // ── Playback state ────────────────────────────────────────────
  let currentIndex: number  = 0;
  let playerHp: number      = playerMaxHp;
  let enemyHp: number       = enemyMaxHp;
  let speed: number         = autoSpeed || get(combatSpeed) || 1;  // use stored preference
  let finished: boolean      = false;
  let victory: boolean       = false;
  let visibleLog: any[]    = [];
  let floats: any[]        = [];
  let sparks: any[]        = [];
  let screenFlash: string   = '';   // '' | 'victory' | 'defeat'
  let _floatId: number      = 0;
  let _timer: any        = null;
  let roundNumber: number   = 0;

  // ── Animation state ───────────────────────────────────────────
  let playerShake: boolean    = false;
  let enemyShake: boolean     = false;
  let playerFlash: boolean    = false;
  let enemyFlash: boolean     = false;
  let playerLunge: boolean    = false;   // player lunges right when attacking
  let enemyLunge: boolean     = false;   // enemy lunges left when attacking
  let playerRecoil: boolean   = false;   // player recoils when hit
  let enemyRecoil: boolean    = false;   // enemy recoils when hit
  let playerHpFlash: boolean  = false;   // HP bar red flash on damage
  let enemyHpFlash: boolean   = false;
  let arenaShake: boolean     = false;   // whole-arena shake on crit
  let impactVisible: boolean  = false;   // ✦ burst between fighters

  let logEl: HTMLElement;
  let activeSkillId: string | null = null; // which skill was just used (flash highlight)

  // Get class skills for display
  $: classData = $gameData?.classes?.[playerClassId];
  $: skills = classData?.skills || [];
  $: passive = classData?.passive;

  // ── Reactive HP bar widths ────────────────────────────────────
  $: playerHpPct = playerMaxHp > 0 ? Math.max(0, Math.min(100, (playerHp / playerMaxHp) * 100)) : 0;
  $: enemyHpPct  = enemyMaxHp  > 0 ? Math.max(0, Math.min(100, (enemyHp  / enemyMaxHp)  * 100)) : 0;

  $: playerHpColor = playerHpPct > 50 ? '#dc2626' : playerHpPct > 25 ? '#f59e0b' : '#ef4444';
  $: enemyHpColor  = enemyHpPct  > 50 ? '#dc2626' : enemyHpPct  > 25 ? '#f59e0b' : '#ef4444';

  $: speedMs = speed === 4 ? 150 : speed === 2 ? 400 : 900;

  // ── Floating damage helpers ───────────────────────────────────
  function spawnFloat(text: string, type: string, target: string) {
    const id = ++_floatId;
    floats = [...floats, { id, text, type, target }];
    setTimeout(() => { floats = floats.filter(f => f.id !== id); }, 1200);
  }

  function triggerShake(who: string) {
    if (who === 'player') { playerShake = true; setTimeout(() => playerShake = false, 400); }
    else                  { enemyShake  = true; setTimeout(() => enemyShake  = false, 400); }
  }

  function triggerFlash(who: string) {
    if (who === 'player') { playerFlash = true; setTimeout(() => playerFlash = false, 300); }
    else                  { enemyFlash  = true; setTimeout(() => enemyFlash  = false, 300); }
  }

  function triggerLunge(attacker: string) {
    if (attacker === 'player') {
      playerLunge = true;
      setTimeout(() => playerLunge = false, 300);
    } else {
      enemyLunge = true;
      setTimeout(() => enemyLunge = false, 300);
    }
  }

  function triggerRecoil(defender: string) {
    if (defender === 'player') {
      playerRecoil = true;
      setTimeout(() => playerRecoil = false, 300);
    } else {
      enemyRecoil = true;
      setTimeout(() => enemyRecoil = false, 300);
    }
  }

  function triggerHpFlash(who: string) {
    if (who === 'player') {
      playerHpFlash = true;
      setTimeout(() => playerHpFlash = false, 400);
    } else {
      enemyHpFlash = true;
      setTimeout(() => enemyHpFlash = false, 400);
    }
  }

  function spawnSparks(target: string) {
    const baseX = target === 'player' ? 25 : 75;
    for (let i = 0; i < 6; i++) {
      const id = ++_floatId;
      const sx = (Math.random() - 0.5) * 80;
      const sy = -20 - Math.random() * 60;
      sparks = [...sparks, { id, x: baseX + (Math.random() - 0.5) * 10, y: 30 + Math.random() * 10, sx, sy }];
      setTimeout(() => { sparks = sparks.filter(s => s.id !== id); }, 700);
    }
  }

  function triggerArenaShake() {
    arenaShake = true;
    setTimeout(() => arenaShake = false, 500);
  }

  function triggerImpact() {
    impactVisible = true;
    setTimeout(() => impactVisible = false, 600);
  }

  // ── Parse a single log entry into side-effects ───────────────
  function processEntry(entry: any) {
    const t = entry.type;
    const text = entry.text || '';

    // Detect damage: "for 42" or "-42" (both formats), "Drained 20 HP"
    const dmgMatch = text.match(/for (\d+)/) || text.match(/-(\d+)/);
    const healMatch = text.match(/(?:Drained|Healed?|heal)\s+(\d+)/i);

    if (t === 'crit' || t === 'hit') {
      const dmg = dmgMatch ? dmgMatch[1] : '?';
      const isCrit = t === 'crit';
      if (isCrit) sfxCrit(); else sfxHit();
      // "You" = player attacks, enemy name = enemy attacks
      const playerAttacked = text.startsWith('💥 You') || text.startsWith('⚡ You') || text.includes(` You `);
      if (playerAttacked) {
        triggerLunge('player');
        setTimeout(() => {
          spawnFloat(isCrit ? `${dmg}!!` : dmg, isCrit ? 'crit' : 'hit', 'enemy');
          triggerRecoil('enemy');
          triggerHpFlash('enemy');
          triggerImpact();
          if (isCrit) { triggerArenaShake(); triggerFlash('enemy'); spawnSparks('enemy'); }
          if (dmgMatch) enemyHp = Math.max(0, enemyHp - parseInt(dmgMatch[1]));
        }, 150);
      } else {
        triggerLunge('enemy');
        setTimeout(() => {
          spawnFloat(isCrit ? `${dmg}!!` : dmg, isCrit ? 'crit' : 'hit', 'player');
          triggerRecoil('player');
          triggerHpFlash('player');
          triggerImpact();
          if (isCrit) { triggerArenaShake(); triggerFlash('player'); spawnSparks('player'); }
          if (dmgMatch) playerHp = Math.max(0, playerHp - parseInt(dmgMatch[1]));
        }, 150);
      }
    } else if (t === 'miss') {
      sfxMiss();
      const playerMissed = text.includes('You miss');
      spawnFloat('MISS', 'miss', playerMissed ? 'enemy' : 'player');
    } else if (t === 'block') {
      const playerBlocked = text.includes('You blocked');
      spawnFloat('BLOCKED', 'block', playerBlocked ? 'player' : 'enemy');
    } else if (t === 'system' && healMatch) {
      const healAmt = parseInt(healMatch[1]);
      playerHp = Math.min(playerMaxHp, playerHp + healAmt);
      spawnFloat(`+${healAmt}`, 'heal', 'player');
    } else if (t === 'system' && text.match(/\+(\d+)\s*HP/)) {
      // Auto-potion: "🧪 Used ❤️ Health Potion! +30 HP"
      const amt = parseInt(text.match(/\+(\d+)\s*HP/)[1]);
      playerHp = Math.min(playerMaxHp, playerHp + amt);
      spawnFloat(`+${amt}`, 'heal', 'player');
    } else if (t === 'system' && text.match(/\+(\d+)\s*MP/)) {
      // MP potion used
      spawnFloat(`+MP`, 'heal', 'player');
    } else if (t === 'system' && text.includes('MP:')) {
      // Skill usage — detect which skill by matching name
      const usedSkill = skills.find(s => text.includes(s.name));
      if (usedSkill) {
        activeSkillId = usedSkill.id;
        setTimeout(() => activeSkillId = null, 1500);
      }
    } else if (t === 'round') {
      const m = text.match(/\d+/);
      if (m) roundNumber = parseInt(m[0]);
    }
  }

  // ── Tick: advance one log entry ───────────────────────────────
  function tick() {
    if (currentIndex >= log.length) {
      if (!finished) {
        finished = true;
        victory = playerHp > 0;
        onComplete();
      }
      return;
    }

    const entry = log[currentIndex];
    currentIndex++;

    processEntry(entry);
    visibleLog = [entry, ...visibleLog];

    // Detect victory/defeat — show banner but keep playing remaining log entries
    if (!finished && entry.type === 'system' && (entry.text.includes('Victory') || entry.text.includes('CLEARED'))) {
      finished = true;
      victory = true;
      screenFlash = 'victory';
      sfxVictory();
    }
    if (!finished && entry.type === 'system' && (entry.text.includes('Defeated') || entry.text.includes('lost') || entry.text.includes('forfeited'))) {
      finished = true;
      victory = false;
      screenFlash = 'defeat';
      sfxDefeat();
    }

    // If there are more entries, keep playing them
    if (currentIndex < log.length) {
      if (finished) {
        // Victory/defeat detected — play remaining entries instantly then complete
        while (currentIndex < log.length) {
          const e = log[currentIndex++];
          visibleLog = [e, ...visibleLog];
        }
        onComplete();
      } else {
        scheduleNext();
      }
    } else {
      // All entries played — notify completion
      onComplete();
    }
  }

  // Play remaining log entries instantly (rewards, level ups, etc.)
  function playRemaining() {
    const remaining = [];
    while (currentIndex < log.length) {
      remaining.push(log[currentIndex++]);
    }
    visibleLog = [...remaining.reverse(), ...visibleLog];
  }

  function scheduleNext() {
    if (_timer) clearTimeout(_timer);
    if (currentIndex < log.length && !finished) {
      _timer = setTimeout(tick, speedMs);
    }
  }

  function skipAll() {
    if (_timer) { clearTimeout(_timer); _timer = null; }
    // Process remaining entries silently (no animations)
    for (let i = currentIndex; i < log.length; i++) {
      const entry = log[i];
      const t = entry.type;
      const text = entry.text || '';
      const dmgMatch = text.match(/for (\d+)/) || text.match(/-(\d+)/);
      if (t === 'crit' && dmgMatch) enemyHp = Math.max(0, enemyHp - parseInt(dmgMatch[1]));
      else if (t === 'hit' && dmgMatch) {
        const playerAttacked = text.startsWith('💥 You') || text.startsWith('⚡ You') || text.includes(' You ');
        if (playerAttacked) {
          enemyHp = Math.max(0, enemyHp - parseInt(dmgMatch[1]));
        } else {
          playerHp = Math.max(0, playerHp - parseInt(dmgMatch[1]));
        }
      } else if (t === 'system') {
        const hpHeal = text.match(/\+(\d+)\s*HP/);
        const drainHeal = text.match(/(?:Drained|Healed?|heal)\s+(\d+)/i);
        if (hpHeal) playerHp = Math.min(playerMaxHp, playerHp + parseInt(hpHeal[1]));
        else if (drainHeal) playerHp = Math.min(playerMaxHp, playerHp + parseInt(drainHeal[1]));
      } else if (t === 'round') {
        const m = text.match(/\d+/);
        if (m) roundNumber = parseInt(m[0]);
      }
    }
    visibleLog = [...log].reverse();
    currentIndex = log.length;
    finished = true;
    victory = playerHp > 0;
    onComplete();
  }

  function setSpeed(s: number) {
    speed = s;
    if (s > 0) combatSpeed.set(s); // persist preference
    if (s === 0) { skipAll(); return; }
    if (!finished && currentIndex < log.length) scheduleNext();
  }

  // ── Lifecycle ─────────────────────────────────────────────────
  onMount(() => {
    playerHp = playerStartHp > 0 ? playerStartHp : playerMaxHp;
    enemyHp  = enemyMaxHp;
    if (autoSpeed === -1) {
      // Instant mode — skip animation, show result directly
      skipAll();
      return;
    }
    if (log.length > 0) {
      _timer = setTimeout(tick, 600);
    } else {
      finished = true;
      victory  = false;
    }
  });

  onDestroy(() => {
    if (_timer) clearTimeout(_timer);
  });
</script>

<!-- ═══════════════ COMBAT VIEWER ════════════════════════════════ -->
<div style="display:flex;flex-direction:column;gap:16px;">

  <!-- Combat header -->
  <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
    <div class="font-fantasy" style="color:#d4a853;font-size:13px;letter-spacing:1px;">
      {#if roundNumber > 0}⚔️ Round {roundNumber}{:else}⚔️ Combat{/if}
    </div>
    <div style="display:flex;gap:6px;">
    </div>
  </div>

  <!-- Arena -->
  <div class="combat-arena {arenaShake ? 'arena-shake' : ''}" style="position:relative;overflow:hidden;">

    <!-- Floating damage numbers layer -->
    <div style="position:absolute;inset:0;pointer-events:none;z-index:10;overflow:hidden;">
      {#each floats as f (f.id)}
        <div
          class="float-dmg float-{f.type} float-{f.target}"
          style="
            position:absolute;
            {f.target === 'player' ? 'left:15%;' : 'right:15%;'}
            top:20%;
          "
        >{f.text}</div>
      {/each}

      <!-- Impact burst between fighters -->
      {#if impactVisible}
        <div class="impact-burst" style="position:absolute;left:50%;top:35%;transform:translate(-50%,-50%);">✦</div>
      {/if}

      <!-- Crit sparks -->
      {#each sparks as s (s.id)}
        <div class="spark" style="left:{s.x}%;top:{s.y}%;--sx:{s.sx}px;--sy:{s.sy}px;"></div>
      {/each}
    </div>

    <!-- Screen flash on victory/defeat -->
    {#if screenFlash}
      <div class="screen-flash" style="background:{screenFlash === 'victory' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}"></div>
    {/if}

    <!-- Combatants row -->
    <div style="display:flex;align-items:flex-start;justify-content:space-around;gap:16px;margin-bottom:20px;">

      <!-- Player side -->
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px;flex:1;">
        <div style="font-size:11px;color:#78716c;letter-spacing:1px;text-transform:uppercase;">{playerName}</div>
        <div
          class="
            {playerLunge  ? 'fighter-lunge-right' : ''}
            {playerRecoil ? 'fighter-recoil-left'  : ''}
            {playerFlash  ? 'fighter-red-flash'    : ''}
            {!playerLunge && !playerRecoil && !playerFlash && !finished ? 'fighter-idle' : ''}
          "
          style="display:inline-block;"
        >
          <Avatar classId={playerClassId} size={72} glow={!finished} />
        </div>
        <!-- HP bar -->
        <div style="width:100%;">
          <div style="display:flex;justify-content:space-between;font-size:10px;color:#78716c;margin-bottom:3px;">
            <span>HP</span>
            <span style="color:{playerHpColor};">{Math.max(0, playerHp)} / {playerMaxHp}</span>
          </div>
          <div class="bar-hp {playerHpFlash ? 'bar-hp-flash' : ''}" style="height:20px;">
            <div class="bar-hp-fill" style="width:{playerHpPct}%;background:linear-gradient(90deg,{playerHpColor}aa,{playerHpColor});"></div>
          </div>
        </div>
        <!-- Skill bar -->
        {#if skills.length > 0}
          <div style="display:flex;gap:4px;margin-top:6px;width:100%;">
            {#each skills as skill}
              <div style="
                flex:1;padding:4px 6px;border-radius:6px;text-align:center;font-size:10px;
                background:{activeSkillId === skill.id ? '#1a1808' : '#0d0c0a'};
                border:1px solid {activeSkillId === skill.id ? '#d4a853' : '#1a1714'};
                color:{activeSkillId === skill.id ? '#d4a853' : '#78716c'};
                transition:all 0.3s;
                {activeSkillId === skill.id ? 'box-shadow:0 0 8px rgba(212,168,83,0.3);' : ''}
              ">
                <span style="font-size:14px">{skill.icon}</span><br>
                <span style="font-size:9px;letter-spacing:0.5px">{skill.name}</span>
              </div>
            {/each}
            {#if passive}
              <div style="flex:1;padding:4px 6px;border-radius:6px;text-align:center;font-size:10px;background:#0d0c0a;border:1px solid #153d15;color:#4ade80;">
                <span style="font-size:14px">{passive.icon}</span><br>
                <span style="font-size:9px;letter-spacing:0.5px">Passive</span>
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- VS divider -->
      <div style="flex-shrink:0;text-align:center;padding-bottom:28px;">
        <div class="font-fantasy" style="font-size:22px;color:#4b5563;letter-spacing:2px;">VS</div>
      </div>

      <!-- Enemy side -->
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px;flex:1;">
        <div style="font-size:11px;color:#78716c;letter-spacing:1px;text-transform:uppercase;">{enemyName}</div>
        <div
          class="
            {enemyLunge  ? 'fighter-lunge-left'   : ''}
            {enemyRecoil ? 'fighter-recoil-right'  : ''}
            {enemyFlash  ? 'fighter-red-flash'     : ''}
            {!enemyLunge && !enemyRecoil && !enemyFlash && !finished ? 'fighter-idle' : ''}
          "
          style="display:inline-block;"
        >
          <div class="monster-icon" style="width:72px;height:72px;font-size:40px;border-radius:12px;
            background:radial-gradient(circle,#1a1208 0%,#0a0908 100%);
            border:2px solid #2a2520;
          ">{enemyIcon}</div>
        </div>
        <!-- HP bar -->
        <div style="width:100%;">
          <div style="display:flex;justify-content:space-between;font-size:10px;color:#78716c;margin-bottom:3px;">
            <span>HP</span>
            <span style="color:{enemyHpColor};">{Math.max(0, enemyHp)} / {enemyMaxHp}</span>
          </div>
          <div class="bar-hp {enemyHpFlash ? 'bar-hp-flash' : ''}" style="height:20px;">
            <div class="bar-hp-fill" style="width:{enemyHpPct}%;background:linear-gradient(90deg,{enemyHpColor}aa,{enemyHpColor});"></div>
          </div>
        </div>
      </div>

    </div>

    <!-- Victory / Defeat banner -->
    {#if finished}
      <div style="
        text-align:center;padding:12px;border-radius:10px;margin-bottom:8px;
        background:{victory
          ? 'linear-gradient(90deg,transparent,rgba(74,222,128,0.1),transparent)'
          : 'linear-gradient(90deg,transparent,rgba(248,113,113,0.1),transparent)'};
        border:1px solid {victory ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'};
      ">
        <div class="font-fantasy" style="
          font-size:22px;font-weight:700;
          color:{victory ? '#4ade80' : '#f87171'};
          text-shadow:0 0 16px {victory ? 'rgba(74,222,128,0.5)' : 'rgba(248,113,113,0.5)'};
        ">
          {victory ? '🏆 VICTORY' : '💀 DEFEAT'}
        </div>
        <div style="font-size:12px;color:#78716c;margin-top:4px;">
          {victory ? 'You emerged triumphant!' : 'You have fallen in battle.'}
        </div>
      </div>
    {/if}

    <!-- Scrolling combat log -->
    <div bind:this={logEl} class="combat-log" style="height:150px;overflow-y:auto;margin-top:4px;">
      {#if visibleLog.length === 0}
        <div style="color:#374151;text-align:center;padding:8px;">Awaiting combat…</div>
      {:else}
        {#each visibleLog as entry}
          <div class="log-{entry.type}">{entry.text}</div>
        {/each}
      {/if}
    </div>

  </div>

</div>

<style>
  /* ── Float animation: 60px rise, 1.2s ── */
  @keyframes floatDamage {
    0%   { transform: translateY(0)     scale(1);    opacity: 1; }
    20%  { transform: translateY(-10px) scale(1.15); opacity: 1; }
    100% { transform: translateY(-60px) scale(0.9);  opacity: 0; }
  }

  /* ── Hit flash (red tint) ── */
  @keyframes hitFlash {
    0%, 100% { filter: brightness(1) drop-shadow(0 0 0 transparent); }
    40%      { filter: brightness(1.8) drop-shadow(0 0 8px #ef4444cc); }
  }

  /* ── Whole-arena crit shake ── */
  @keyframes arenaShake {
    0%   { transform: translate(0, 0)      rotate(0deg); }
    15%  { transform: translate(-6px, 2px) rotate(-1deg); }
    30%  { transform: translate(6px, -2px) rotate(1deg); }
    45%  { transform: translate(-4px, 1px) rotate(-0.5deg); }
    60%  { transform: translate(4px, -1px) rotate(0.5deg); }
    75%  { transform: translate(-2px, 0)   rotate(0deg); }
    100% { transform: translate(0, 0)      rotate(0deg); }
  }

  /* ── Fighter lunge: player right, enemy left ── */
  @keyframes lungeRight {
    0%   { transform: translateX(0); }
    40%  { transform: translateX(20px); }
    100% { transform: translateX(0); }
  }
  @keyframes lungeLeft {
    0%   { transform: translateX(0); }
    40%  { transform: translateX(-20px); }
    100% { transform: translateX(0); }
  }

  /* ── Defender recoil ── */
  @keyframes recoilLeft {
    0%   { transform: translateX(0); }
    30%  { transform: translateX(-10px); }
    100% { transform: translateX(0); }
  }
  @keyframes recoilRight {
    0%   { transform: translateX(0); }
    30%  { transform: translateX(10px); }
    100% { transform: translateX(0); }
  }

  /* ── Red flash filter on hit ── */
  @keyframes redFlash {
    0%, 100% { filter: brightness(1); }
    25%      { filter: brightness(1.6) sepia(1) saturate(5) hue-rotate(-20deg); }
  }

  /* ── HP bar white-red pulse on damage ── */
  @keyframes hpBarFlash {
    0%   { box-shadow: 0 0 0 0 transparent; }
    25%  { box-shadow: 0 0 10px 4px #ef4444, inset 0 0 12px rgba(255,255,255,0.5); }
    60%  { box-shadow: 0 0 6px 2px #dc2626; }
    100% { box-shadow: 0 0 0 0 transparent; }
  }

  /* ── Impact burst ✦ ── */
  @keyframes impactBurst {
    0%   { transform: translate(-50%,-50%) scale(0);   opacity: 1; }
    50%  { transform: translate(-50%,-50%) scale(2.2); opacity: 1; }
    100% { transform: translate(-50%,-50%) scale(3);   opacity: 0; }
  }

  /* ─────────────────── Applied classes ─────────────────────── */

  .float-dmg {
    animation: floatDamage 1.2s ease forwards;
    font-family: 'Cinzel', serif;
    font-weight: 700;
    font-size: 28px;
    pointer-events: none;
    white-space: nowrap;
    text-shadow: 0 2px 8px rgba(0,0,0,0.9);
    transform-origin: center;
  }

  /* Hit types */
  .float-hit   { color: #f87171; }
  .float-crit  {
    color: #fbbf24;
    font-size: 36px;
    text-shadow: 0 0 16px rgba(251,191,36,0.9), 0 0 4px rgba(0,0,0,0.9);
  }
  .float-miss  { color: #6b7280; font-size: 16px; font-style: italic; }
  .float-block { color: #60a5fa; font-size: 16px; }
  .float-heal  { color: #4ade80; }

  /* Fighter movement classes */
  .fighter-lunge-right { animation: lungeRight 0.3s ease forwards; }
  .fighter-lunge-left  { animation: lungeLeft  0.3s ease forwards; }
  .fighter-recoil-left  { animation: recoilLeft  0.3s ease forwards; }
  .fighter-recoil-right { animation: recoilRight 0.3s ease forwards; }
  .fighter-red-flash    { animation: redFlash 0.3s ease forwards; }

  /* HP bar flash */
  .bar-hp-flash { animation: hpBarFlash 0.4s ease forwards; }

  /* Arena crit shake */
  .arena-shake { animation: arenaShake 0.5s ease forwards; }

  /* Impact burst */
  .impact-burst {
    animation: impactBurst 0.6s ease forwards;
    font-size: 40px;
    color: #fbbf24;
    text-shadow: 0 0 16px #fbbf24, 0 0 32px rgba(251,191,36,0.6);
    pointer-events: none;
    user-select: none;
    position: absolute;
  }

  /* ── Idle breathing animation ── */
  @keyframes breathe {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-3px); }
  }
  .fighter-idle {
    animation: breathe 2s ease-in-out infinite;
  }

  /* ── Victory/defeat screen flash ── */
  @keyframes victoryFlash {
    0%   { opacity: 0; }
    15%  { opacity: 0.15; }
    100% { opacity: 0; }
  }
  .screen-flash {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 20;
    animation: victoryFlash 1s ease forwards;
  }

  /* ── Crit spark particles ── */
  @keyframes sparkFly {
    0%   { transform: translate(0, 0) scale(1); opacity: 1; }
    100% { transform: translate(var(--sx), var(--sy)) scale(0); opacity: 0; }
  }
  .spark {
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #fbbf24;
    box-shadow: 0 0 6px #fbbf24;
    pointer-events: none;
    animation: sparkFly 0.6s ease-out forwards;
  }

  /* ── Smooth HP bar transition ── */
  .bar-hp-fill {
    transition: width 0.4s ease-out;
  }
</style>
