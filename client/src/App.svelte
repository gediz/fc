<script lang="ts">
  import { onMount } from 'svelte';
  import { connect, connected } from './lib/stores/connection.js';
  import { loggedIn, needsCharacterCreation, notifications } from './lib/stores/game.js';
  import Auth from './lib/components/Auth.svelte';
  import CharacterCreation from './lib/components/CharacterCreation.svelte';
  import Game from './lib/components/Game.svelte';

  onMount(() => connect());
</script>

{#if !$connected}
  <div class="min-h-screen flex items-center justify-center" style="background: radial-gradient(ellipse at 50% 30%, #1a0e08 0%, #08080c 60%)">
    <div class="text-center">
      <h1 class="font-fantasy text-4xl font-bold text-red-500 mb-4 tracking-wider" style="text-shadow: 0 0 30px rgba(220,38,38,0.4)">FIGHT CLUB</h1>
      <p class="text-gray-500 animate-pulse">Connecting to server...</p>
    </div>
  </div>
{:else if $needsCharacterCreation}
  <CharacterCreation />
{:else if !$loggedIn}
  <Auth />
{:else}
  <Game />
{/if}

<!-- Notification toasts -->
<!-- Notifications: bottom-left on desktop, above mobile nav -->
<div class="fixed z-50 flex flex-col gap-2 max-w-sm" style="bottom: 16px; left: 16px">
  {#each $notifications as notif (notif.id)}
    <div class="toast bg-[#1a1714]/95 border border-yellow-600/60 rounded-lg px-4 py-3 text-sm text-yellow-400 shadow-xl backdrop-blur-sm">
      {notif.text}
    </div>
  {/each}
</div>
