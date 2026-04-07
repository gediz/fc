<script lang="ts">
  import { player, activeTab } from '../stores/game.js';
  import { writable } from 'svelte/store';

  // Tutorial state persisted in localStorage
  const TUTORIAL_KEY = 'fc_tutorial_seen';
  const tutorialDone = writable(localStorage.getItem(TUTORIAL_KEY) === 'true');

  $: showTutorial = !$tutorialDone && ($player?.kills || 0) < 3;

  let step: number = 0;

  const steps = [
    {
      title: 'Welcome, Fighter!',
      text: 'This is the Arena — your main battleground. Fight enemies to earn XP, gold, and loot drops.',
      icon: '⚔️',
      action: 'Look for enemies matching your level (green = easy, yellow = fair, red = hard)',
    },
    {
      title: 'Your Character',
      text: 'Your stats, HP, and MP are shown in the left sidebar. Keep an eye on your health!',
      icon: '❤️',
      action: 'When HP is low, use the Rest button or potions to heal.',
    },
    {
      title: 'Gear Up',
      text: 'Visit the Shop to buy weapons and armor. Check the Inventory to equip your gear.',
      icon: '🛡️',
      action: 'Better gear = more damage and survivability.',
    },
    {
      title: 'Level Up & Skills',
      text: 'Winning fights earns XP. Level up to get stat points (in Stats tab) and skill points (in Skill Tree).',
      icon: '⭐',
      action: 'Spend points wisely — each class has unique skill branches!',
    },
    {
      title: 'Explore More',
      text: 'Dungeons for bonus loot, PvP for exclusive gear, Crafting to forge items, Guilds for team bonuses.',
      icon: '🏰',
      action: 'Start with the Arena, then explore when you\'re ready!',
    },
  ];

  function nextStep() {
    if (step < steps.length - 1) {
      step++;
    } else {
      dismiss();
    }
  }

  function dismiss() {
    localStorage.setItem(TUTORIAL_KEY, 'true');
    $tutorialDone = true;
  }
</script>

{#if showTutorial}
  <div style="position:fixed; inset:0; z-index:100; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.7); backdrop-filter:blur(4px)">
    <div style="max-width:420px; width:90%; background:linear-gradient(180deg,#151210,#0a0908); border:2px solid #d4a853; border-radius:16px; padding:24px; box-shadow:0 0 40px rgba(212,168,83,0.2)">

      <!-- Step indicator -->
      <div style="display:flex; gap:4px; justify-content:center; margin-bottom:16px">
        {#each steps as _, i}
          <div style="width:{i === step ? '20px' : '8px'}; height:4px; border-radius:2px; background:{i === step ? '#d4a853' : i < step ? '#4ade80' : '#2a2520'}; transition:all 0.3s"></div>
        {/each}
      </div>

      <!-- Icon -->
      <div style="text-align:center; font-size:48px; margin-bottom:12px">{steps[step].icon}</div>

      <!-- Title -->
      <h3 class="font-fantasy" style="text-align:center; font-size:20px; color:#d4a853; margin:0 0 8px; letter-spacing:1px">{steps[step].title}</h3>

      <!-- Text -->
      <p style="text-align:center; color:#a8a29e; font-size:14px; line-height:1.6; margin:0 0 12px">{steps[step].text}</p>

      <!-- Action hint -->
      <div style="text-align:center; padding:8px 12px; background:#0d0c0a; border:1px solid #1a1714; border-radius:8px; font-size:13px; color:#4ade80; margin-bottom:16px">
        💡 {steps[step].action}
      </div>

      <!-- Buttons -->
      <div style="display:flex; gap:8px; justify-content:center">
        <button class="btn-game btn-dark" style="padding:8px 16px; font-size:13px" onclick={dismiss}>Skip Tutorial</button>
        <button class="btn-game btn-gold" style="padding:8px 24px; font-size:13px" onclick={nextStep}>
          {step < steps.length - 1 ? 'Next →' : 'Start Fighting! ⚔️'}
        </button>
      </div>
    </div>
  </div>
{/if}
