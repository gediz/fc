<script lang="ts">
  import { username, gameData } from '../stores/game.js';
  import { send } from '../stores/connection.js';
  import Avatar from './Avatar.svelte';

  let step: number = 1; // 1: class, 2: appearance
  let selectedClass: string | null = null;

  // Appearance
  let skinTone: number = 0;
  let hairStyle: number = 0;
  let hairColor: number = 0;
  let accessory: number = 0;

  const SKIN_TONES = ['#f5d0b0', '#dba878', '#c4956a', '#a0724a', '#6b4430', '#3d2218'];
  const HAIR_COLORS = ['#1a1a2e', '#4a2a0a', '#8b6914', '#d4a853', '#c43c3c', '#e8e0f0', '#2d5a2d', '#1a1a1a'];
  const HAIR_NAMES = ['Default', 'Spiky', 'Flowing', 'Mohawk', 'Bald', 'Ponytail'];
  const ACCESSORIES = ['None', 'Scar', 'Earring', 'Eyepatch', 'Bandana', 'Crown'];

  $: classes = $gameData?.classes || {};
  $: cls = selectedClass ? classes[selectedClass] : null;
  $: previewAvatar = { skinTone, hairStyle, hairColor, accessory };

  function nextStep() {
    if (!selectedClass) return;
    step = 2;
  }

  function confirm() {
    if (!selectedClass) return;
    send({ type: 'create_character', class: selectedClass, skinTone, hairStyle, hairColor, accessory });
  }
</script>

<div class="min-h-screen flex flex-col items-center justify-start p-4 pt-8 overflow-y-auto"
  style="background: radial-gradient(ellipse at 50% 20%, #1a1208 0%, #08080c 70%)">

  <!-- Title -->
  <div class="text-center mb-6">
    <h1 class="font-fantasy text-3xl md:text-4xl font-black text-yellow-400 tracking-wider mb-2"
      style="text-shadow: 0 0 30px rgba(212,168,83,0.4)">
      {step === 1 ? 'CHOOSE YOUR CLASS' : 'CUSTOMIZE APPEARANCE'}
    </h1>
    <p class="text-gray-400">
      {step === 1 ? `Welcome, ${$username}. Choose your path.` : 'Make your fighter unique.'}
    </p>
    {#if step === 2}
      <button class="text-sm text-gray-500 hover:text-gray-300 mt-1 underline" onclick={() => step = 1}>← Back to class</button>
    {/if}
  </div>

  {#if step === 1}
    <!-- Class Selection — horizontal scroll on mobile, grid on desktop -->
    <div class="w-full max-w-4xl mb-6">
      <div class="flex md:grid md:grid-cols-4 gap-4 overflow-x-auto snap-x snap-mandatory pb-4 px-2 md:px-0 md:overflow-visible"
        style="-webkit-overflow-scrolling: touch">
        {#each Object.entries(classes) as [id, c]}
          <button
            class="snap-center flex-shrink-0 w-[75vw] md:w-auto text-left p-0 rounded-2xl overflow-hidden transition-all duration-300 border-2
              {selectedClass === id
                ? 'border-yellow-500 scale-[1.02] shadow-[0_0_30px_rgba(212,168,83,0.3)]'
                : 'border-[#2a2520] hover:border-[#3d3530]'}"
            style="background: linear-gradient(180deg, #151210 0%, #0a0908 100%)"
            onclick={() => selectedClass = id}>

            <div class="flex justify-center pt-5 pb-2"
              style="background: radial-gradient(ellipse at 50% 80%, {selectedClass === id ? 'rgba(212,168,83,0.1)' : 'rgba(255,255,255,0.02)'} 0%, transparent 70%)">
              <Avatar classId={id} size={100} glow={selectedClass === id} />
            </div>

            <div class="p-4 pt-2">
              <div class="font-fantasy text-lg font-bold {selectedClass === id ? 'text-yellow-400' : 'text-gray-200'} mb-1">
                {c.icon} {c.name}
              </div>
              <p class="text-sm text-gray-400 mb-3">{c.desc}</p>

              <div class="flex gap-1.5 flex-wrap mb-3">
                {#if c.bonusStr > 0}<span class="text-xs px-2 py-1 rounded stat-str" style="background:#1a0808; border:1px solid #3d1515">+{c.bonusStr} STR</span>{/if}
                {#if c.bonusAgi > 0}<span class="text-xs px-2 py-1 rounded stat-agi" style="background:#081a08; border:1px solid #153d15">+{c.bonusAgi} AGI</span>{/if}
                {#if c.bonusEnd > 0}<span class="text-xs px-2 py-1 rounded stat-end" style="background:#1a1808; border:1px solid #3d3515">+{c.bonusEnd} END</span>{/if}
                {#if c.bonusInt > 0}<span class="text-xs px-2 py-1 rounded stat-int" style="background:#08101a; border:1px solid #15253d">+{c.bonusInt} INT</span>{/if}
              </div>

              {#if c.skills?.length > 0}
                <div class="space-y-1.5">
                  {#each c.skills as skill}
                    <div class="flex items-start gap-2 text-xs p-2 rounded-lg" style="background:#0a0908; border:1px solid #1a1714">
                      <span class="text-base shrink-0">{skill.icon}</span>
                      <div>
                        <div class="text-yellow-400 font-semibold">{skill.name}</div>
                        <div class="text-gray-400">{skill.desc}</div>
                      </div>
                    </div>
                  {/each}
                  {#if c.passive}
                    <div class="flex items-start gap-2 text-xs p-2 rounded-lg" style="background:#0a0908; border:1px solid #1a1714">
                      <span class="text-base shrink-0">{c.passive.icon}</span>
                      <div>
                        <div class="text-green-400 font-semibold">{c.passive.name} <span class="text-gray-400">(passive)</span></div>
                        <div class="text-gray-400">{c.passive.desc}</div>
                      </div>
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          </button>
        {/each}
      </div>
    </div>

    <!-- Next button — sticky at bottom, always visible -->
    <div class="sticky bottom-0 z-10 w-full max-w-md px-4 pb-4 pt-2" style="background: linear-gradient(transparent, #08080c 30%)">
      {#if selectedClass}
        <button onclick={nextStep}
          class="w-full btn-gold btn-game text-lg py-4 glow-gold"
          style="font-family: 'Cinzel', serif; letter-spacing: 2px">
          NEXT: CUSTOMIZE →
        </button>
      {:else}
        <div class="text-center text-gray-500 font-fantasy text-lg py-4 bg-[#08080c] rounded-xl">Select a class to continue</div>
      {/if}
    </div>

  {:else}
    <!-- Step 2: Appearance -->
    <div class="w-full max-w-lg space-y-5">

      <!-- Avatar Preview -->
      <div class="flex justify-center">
        <div style="background: radial-gradient(circle, #1a1714 0%, #0a0908 100%); border: 2px solid #2a2520; border-radius: 20px; padding: 20px">
          <Avatar classId={selectedClass} size={140} glow={true} avatar={previewAvatar} />
        </div>
      </div>

      <!-- Skin Tone -->
      <div class="game-panel">
        <div class="game-panel-header">Skin Tone</div>
        <div style="padding: 14px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap">
          {#each SKIN_TONES as color, i}
            <button
              style="width: 48px; height: 48px; border-radius: 50%; background: {color};
                border: 3px solid {skinTone === i ? '#d4a853' : '#2a2520'};
                box-shadow: {skinTone === i ? '0 0 12px rgba(212,168,83,0.4)' : 'none'};
                cursor: pointer; transition: all 0.15s"
              onclick={() => skinTone = i}>
            </button>
          {/each}
        </div>
      </div>

      <!-- Hair Style -->
      <div class="game-panel">
        <div class="game-panel-header">Hair Style</div>
        <div style="padding: 12px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px">
          {#each HAIR_NAMES as name, i}
            <button
              class="game-card"
              style="padding: 12px; text-align: center; font-size: 14px; cursor: pointer;
                border-color: {hairStyle === i ? '#d4a853' : '#2a2520'};
                color: {hairStyle === i ? '#d4a853' : '#8a8078'};
                box-shadow: {hairStyle === i ? '0 0 8px rgba(212,168,83,0.3)' : 'none'}"
              onclick={() => hairStyle = i}>
              {name}
            </button>
          {/each}
        </div>
      </div>

      <!-- Hair Color -->
      <div class="game-panel">
        <div class="game-panel-header">Hair Color</div>
        <div style="padding: 14px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap">
          {#each HAIR_COLORS as color, i}
            <button
              style="width: 44px; height: 44px; border-radius: 50%; background: {color};
                border: 3px solid {hairColor === i ? '#d4a853' : '#2a2520'};
                box-shadow: {hairColor === i ? '0 0 12px rgba(212,168,83,0.4)' : 'none'};
                cursor: pointer; transition: all 0.15s"
              onclick={() => hairColor = i}>
            </button>
          {/each}
        </div>
      </div>

      <!-- Accessory -->
      <div class="game-panel">
        <div class="game-panel-header">Accessory</div>
        <div style="padding: 12px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px">
          {#each ACCESSORIES as name, i}
            <button
              class="game-card"
              style="padding: 12px; text-align: center; font-size: 14px; cursor: pointer;
                border-color: {accessory === i ? '#d4a853' : '#2a2520'};
                color: {accessory === i ? '#d4a853' : '#8a8078'};
                box-shadow: {accessory === i ? '0 0 8px rgba(212,168,83,0.3)' : 'none'}"
              onclick={() => accessory = i}>
              {name}
            </button>
          {/each}
        </div>
      </div>

      <!-- Confirm — sticky -->
      <div class="sticky bottom-0 z-10 pb-4 pt-2" style="background: linear-gradient(transparent, #08080c 30%)">
        <button onclick={confirm}
          class="w-full btn-fight btn-game text-lg py-4 glow-red"
          style="font-family: 'Cinzel', serif; letter-spacing: 2px">
          ⚔️ ENTER THE ARENA
        </button>
      </div>
    </div>
  {/if}
</div>
