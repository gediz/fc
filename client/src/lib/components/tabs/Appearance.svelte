<script lang="ts">
  import { send } from '../../stores/connection.js';
  import { player } from '../../stores/game.js';
  import Avatar from '../Avatar.svelte';

  // ── Appearance option data ─────────────────────────────────────

  const SKIN_TONES = [
    { color: '#f5d0b0', label: 'Ivory' },
    { color: '#dba878', label: 'Light' },
    { color: '#c4956a', label: 'Tan' },
    { color: '#a0724a', label: 'Warm' },
    { color: '#6b4430', label: 'Deep' },
    { color: '#3d2218', label: 'Dark' },
  ];

  const HAIR_STYLES = [
    { label: 'Short' },
    { label: 'Long' },
    { label: 'Braids' },
    { label: 'Mohawk' },
    { label: 'Curly' },
    { label: 'Shaved' },
  ];

  const HAIR_COLORS = [
    { color: '#1a1a2e', label: 'Midnight' },
    { color: '#4a2a0a', label: 'Brown' },
    { color: '#8b6914', label: 'Auburn' },
    { color: '#d4a853', label: 'Blonde' },
    { color: '#c43c3c', label: 'Red' },
    { color: '#e8e0f0', label: 'Silver' },
    { color: '#2d5a2d', label: 'Forest' },
    { color: '#1a1a1a', label: 'Jet' },
  ];

  const ACCESSORIES = [
    { label: 'None',     icon: '—' },
    { label: 'Scar',     icon: '⚔️' },
    { label: 'Earring',  icon: '💎' },
    { label: 'Eyepatch', icon: '🏴‍☠️' },
    { label: 'Bandana',  icon: '🎀' },
    { label: 'Crown',    icon: '👑' },
  ];

  // ── Local state: copy from player or default to 0 ─────────────
  let skinTone: number  = $player?.avatar?.skinTone  ?? 0;
  let hairStyle: number = $player?.avatar?.hairStyle ?? 0;
  let hairColor: number = $player?.avatar?.hairColor ?? 0;
  let accessory: number = $player?.avatar?.accessory ?? 0;

  let saved: boolean = false;

  // ── Live preview avatar object ────────────────────────────────
  $: previewAvatar = { skinTone, hairStyle, hairColor, accessory };

  // ── Player class for the avatar preview ──────────────────────
  $: playerClassId = $player?.class || 'warrior';

  // ── Save handler ──────────────────────────────────────────────
  function saveAppearance() {
    send({ type: 'set_avatar', skinTone, hairStyle, hairColor, accessory });
    saved = true;
    setTimeout(() => saved = false, 2000);
  }
</script>

<div style="display:flex;flex-direction:column;gap:16px;">

  <!-- Header -->
  <div class="game-panel">
    <div class="game-panel-header">🎨 Character Appearance</div>
  </div>

  <!-- Live avatar preview -->
  <div class="game-panel">
    <div style="padding:24px;display:flex;flex-direction:column;align-items:center;gap:12px;">
      <div style="
        width:140px;height:140px;
        display:flex;align-items:center;justify-content:center;
        background:radial-gradient(ellipse at center,#1a1510 0%,#0a0908 100%);
        border:2px solid #3d2a15;border-radius:16px;
        box-shadow:inset 0 0 30px rgba(0,0,0,0.6), 0 0 20px rgba(212,168,83,0.1);
      ">
        <Avatar classId={playerClassId} size={120} glow={true} avatar={previewAvatar} />
      </div>
      <div class="font-fantasy" style="font-size:13px;color:#d4a853;letter-spacing:1px;">
        {$player?.name || 'Hero'}
      </div>
    </div>
  </div>

  <!-- Skin Tone -->
  <div class="game-panel">
    <div class="game-panel-header">🎭 Skin Tone</div>
    <div style="padding:16px;display:flex;gap:12px;flex-wrap:wrap;">
      {#each SKIN_TONES as tone, i}
        <button
          class="swatch-btn"
          style="
            background:{tone.color};
            box-shadow:{skinTone === i
              ? `0 0 0 3px #d4a853, 0 0 12px rgba(212,168,83,0.5)`
              : '0 0 0 2px #2a2520'};
            outline:none;
          "
          title={tone.label}
          onclick={() => skinTone = i}
          aria-label={tone.label}
          aria-pressed={skinTone === i}
        ></button>
      {/each}
    </div>
  </div>

  <!-- Hair Style -->
  <div class="game-panel">
    <div class="game-panel-header">💈 Hair Style</div>
    <div style="padding:12px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
      {#each HAIR_STYLES as style, i}
        <button
          class="btn-game option-btn {hairStyle === i ? 'option-selected' : 'btn-dark'}"
          onclick={() => hairStyle = i}
        >{style.label}</button>
      {/each}
    </div>
  </div>

  <!-- Hair Color -->
  <div class="game-panel">
    <div class="game-panel-header">🎨 Hair Color</div>
    <div style="padding:16px;display:flex;gap:10px;flex-wrap:wrap;">
      {#each HAIR_COLORS as hc, i}
        <button
          class="swatch-btn"
          style="
            background:{hc.color};
            box-shadow:{hairColor === i
              ? `0 0 0 3px #d4a853, 0 0 12px rgba(212,168,83,0.5)`
              : '0 0 0 2px #2a2520'};
            outline:none;
          "
          title={hc.label}
          onclick={() => hairColor = i}
          aria-label={hc.label}
          aria-pressed={hairColor === i}
        ></button>
      {/each}
    </div>
  </div>

  <!-- Accessory -->
  <div class="game-panel">
    <div class="game-panel-header">✨ Accessory</div>
    <div style="padding:12px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
      {#each ACCESSORIES as acc, i}
        <button
          class="btn-game option-btn {accessory === i ? 'option-selected' : 'btn-dark'}"
          onclick={() => accessory = i}
          style="display:flex;align-items:center;justify-content:center;gap:6px;"
        >
          <span style="font-size:16px;">{acc.icon}</span>
          <span style="font-size:12px;">{acc.label}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Save button -->
  <div style="display:flex;justify-content:center;padding-bottom:8px;">
    <button
      class="btn-game btn-gold"
      style="min-width:160px;padding:12px 32px;font-size:14px;"
      onclick={saveAppearance}
    >
      {#if saved}✓ Saved!{:else}💾 Save Appearance{/if}
    </button>
  </div>

</div>

<style>
  .swatch-btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s;
    flex-shrink: 0;
  }
  .swatch-btn:hover {
    transform: scale(1.12);
  }

  .option-btn {
    padding: 10px 8px;
    font-size: 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
  }

  .option-selected {
    background: linear-gradient(180deg, #a16207 0%, #713f12 100%);
    color: #fef3c7;
    border: 1px solid #d4a853;
    box-shadow: 0 0 10px rgba(212,168,83,0.4);
  }
</style>
