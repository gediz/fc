<script lang="ts">
  import { player, gameData, toggleAutoPotions, setAutoPotThreshold, humanize, logout } from '../../stores/game.js';
  import { send } from '../../stores/connection.js';
  import { isSoundEnabled, toggleSound } from '../../audio.js';

  let soundOn: boolean = isSoundEnabled();

  function handleToggleProfanity() {
    send({ type: 'toggle_profanity_filter' });
  }

  $: itemMap = $gameData?.items || {};
  $: playerLevel = $player?.level || 1;

  // Build potion lists for dropdowns (only potions player meets level req for)
  $: hpPotions = Object.entries(itemMap)
    .filter(([, it]) => it.consumable && it.healHp && !it.healMp && it.price > 0 && playerLevel >= (it.reqLevel || 1))
    .sort((a, b) => a[1].healHp - b[1].healHp);
  $: mpPotions = Object.entries(itemMap)
    .filter(([, it]) => it.consumable && it.healMp && !it.healHp && it.price > 0 && playerLevel >= (it.reqLevel || 1))
    .sort((a, b) => a[1].healMp - b[1].healMp);
</script>

<div style="display:flex; flex-direction:column; gap:14px; max-width:600px">
  <!-- Header -->
  <div class="combat-arena" style="padding:16px 20px">
    <h2 class="font-fantasy" style="font-size:22px; font-weight:700; color:#d4a853; margin:0; text-shadow:0 0 20px rgba(212,168,83,0.3)">Settings</h2>
  </div>

  <!-- Sound -->
  <div class="game-panel">
    <div class="game-panel-header">Audio</div>
    <div style="padding:12px">
      <button class="btn-game w-full py-2 text-sm"
        style="background:{soundOn ? 'linear-gradient(180deg,#052e16,#081508)' : 'linear-gradient(180deg,#1f1a16,#151210)'}; color:{soundOn ? '#4ade80' : '#8a8078'}; border:1px solid {soundOn ? '#15803d' : '#2a2520'}"
        onclick={() => { soundOn = toggleSound(); }}>
        {soundOn ? '🔊' : '🔇'} Sound Effects: {soundOn ? 'ON' : 'OFF'}
      </button>
    </div>
  </div>

  <!-- Auto-potions -->
  <div class="game-panel">
    <div class="game-panel-header">Auto-Potions</div>
    <div style="padding:12px; display:flex; flex-direction:column; gap:10px">
      <button class="btn-game w-full py-2 text-sm"
        style="background:{$player?.autoPotions ? 'linear-gradient(180deg,#052e16,#081508)' : 'linear-gradient(180deg,#1f1a16,#151210)'}; color:{$player?.autoPotions ? '#4ade80' : '#8a8078'}; border:1px solid {$player?.autoPotions ? '#15803d' : '#2a2520'}"
        onclick={toggleAutoPotions}>
        🧪 Auto-potions: {$player?.autoPotions ? 'ON' : 'OFF'}
      </button>
      {#if $player?.autoPotions}
        <div style="display:flex; gap:16px; align-items:center; flex-wrap:wrap; font-size:13px">
          <label style="display:flex; align-items:center; gap:6px; color:#f87171">
            Use HP potion when HP below:
            <select style="background:#151210; border:1px solid #2a2520; color:#e8e6dc; border-radius:6px; padding:4px 8px; font-size:13px"
              onchange={(e: Event) => setAutoPotThreshold(+(e.target as HTMLSelectElement).value, $player?.autoPotMpPct || 20)}
              value={$player?.autoPotHpPct || 30}>
              {#each [10,20,30,40,50,60,70,80,90] as v}<option value={v}>{v}%</option>{/each}
            </select>
          </label>
          <label style="display:flex; align-items:center; gap:6px; color:#60a5fa">
            Use MP potion when MP below:
            <select style="background:#151210; border:1px solid #2a2520; color:#e8e6dc; border-radius:6px; padding:4px 8px; font-size:13px"
              onchange={(e: Event) => setAutoPotThreshold($player?.autoPotHpPct || 30, +(e.target as HTMLSelectElement).value)}
              value={$player?.autoPotMpPct || 20}>
              {#each [10,20,30,40,50,60,70,80,90] as v}<option value={v}>{v}%</option>{/each}
            </select>
          </label>
        </div>
        <button class="btn-game w-full py-2 text-sm"
          style="background:{$player?.autoBuyPotions ? 'linear-gradient(180deg,#0a1830,#081020)' : 'linear-gradient(180deg,#1f1a16,#151210)'}; color:{$player?.autoBuyPotions ? '#60a5fa' : '#8a8078'}; border:1px solid {$player?.autoBuyPotions ? '#1d4ed8' : '#2a2520'}"
          onclick={() => send({ type: 'toggle_auto_buy_potions' })}>
          🛒 Auto-buy potions: {$player?.autoBuyPotions ? 'ON' : 'OFF'}
        </button>
        {#if $player?.autoBuyPotions}
          <div style="display:flex; flex-direction:column; gap:10px; font-size:13px">
            <label style="display:flex; flex-direction:column; gap:4px; color:#f87171">
              HP potion:
              <select style="width:100%; max-width:100%; background:#151210; border:1px solid #2a2520; color:#e8e6dc; border-radius:6px; padding:6px 8px; font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap"
                onchange={(e: Event) => send({ type: 'set_auto_buy_potion', hpPot: (e.target as HTMLSelectElement).value, mpPot: $player?.autoBuyMpPot || '' })}
                value={$player?.autoBuyHpPot || ''}>
                <option value="">Best available</option>
                {#each hpPotions as [id, pot]}
                  <option value={id}>{pot.icon} {pot.name} (+{pot.healHp} HP, {humanize(pot.price)}🪙)</option>
                {/each}
              </select>
            </label>
            <label style="display:flex; flex-direction:column; gap:4px; color:#60a5fa">
              MP potion:
              <select style="width:100%; max-width:100%; background:#151210; border:1px solid #2a2520; color:#e8e6dc; border-radius:6px; padding:6px 8px; font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap"
                onchange={(e: Event) => send({ type: 'set_auto_buy_potion', hpPot: $player?.autoBuyHpPot || '', mpPot: (e.target as HTMLSelectElement).value })}
                value={$player?.autoBuyMpPot || ''}>
                <option value="">Best available</option>
                {#each mpPotions as [id, pot]}
                  <option value={id}>{pot.icon} {pot.name} (+{pot.healMp} MP, {humanize(pot.price)}🪙)</option>
                {/each}
              </select>
            </label>
          </div>
          <div style="font-size:11px; color:#78716c">
            When out of potions during combat, the selected potion is auto-purchased if you have gold and inventory space.
          </div>
        {:else}
          <div style="font-size:11px; color:#78716c">
            Potions are used from your inventory during combat. Buy potions from the Shop.
          </div>
        {/if}
      {/if}
    </div>
  </div>

  <!-- Chat / Profanity filter -->
  <div class="game-panel">
    <div class="game-panel-header">Chat</div>
    <div style="padding:12px">
      <button class="btn-game w-full py-2 text-sm"
        style="background:{$player?.profanityFilter ? 'linear-gradient(180deg,#052e16,#081508)' : 'linear-gradient(180deg,#1f1a16,#151210)'}; color:{$player?.profanityFilter !== false ? '#4ade80' : '#8a8078'}; border:1px solid {$player?.profanityFilter !== false ? '#15803d' : '#2a2520'}"
        onclick={handleToggleProfanity}>
        🤐 Profanity Filter: {$player?.profanityFilter !== false ? 'ON' : 'OFF'}
      </button>
      <div style="font-size:11px; color:#78716c; margin-top:6px">When enabled, profane words in chat are replaced with ***.</div>
    </div>
  </div>

  <!-- Account -->
  <div class="game-panel">
    <div class="game-panel-header">Account</div>
    <div style="padding:12px; display:flex; flex-direction:column; gap:8px">
      <button class="btn-game w-full py-2 text-sm"
        style="background:{$player?.showOnlineStatus !== false ? 'linear-gradient(180deg,#052e16,#081508)' : 'linear-gradient(180deg,#1f1a16,#151210)'}; color:{$player?.showOnlineStatus !== false ? '#4ade80' : '#8a8078'}; border:1px solid {$player?.showOnlineStatus !== false ? '#15803d' : '#2a2520'}"
        onclick={() => send({ type: 'toggle_online_status' })}>
        👁️ Show "Last seen" on profile: {$player?.showOnlineStatus !== false ? 'ON' : 'OFF'}
      </button>
      <div style="font-size:11px; color:#78716c">Controls whether others see your "Last seen" time on your profile. You always appear in the online list when connected.</div>
      <button class="btn-game w-full py-2 text-sm"
        style="background:linear-gradient(180deg,#1a0808,#0d0404); color:#f87171; border:1px solid #7f1d1d"
        onclick={logout}>
        🚪 Logout
      </button>
    </div>
  </div>
</div>
