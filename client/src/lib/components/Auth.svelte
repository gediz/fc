<script lang="ts">
  import { login, register, authError } from '../stores/game.js';
  import { onMount } from 'svelte';

  let mode: string = 'login';
  let name: string = '';
  let password: string = '';
  let rememberMe: boolean = false;

  onMount(() => {
    const saved = localStorage.getItem('fc_remember');
    if (saved) {
      try {
        const { name: n, password: p } = JSON.parse(saved);
        name = n; password = p; rememberMe = true;
        login(n, p);
      } catch {}
    }
  });

  function handleSubmit() {
    if (!name.trim() || !password) return;
    if (rememberMe) localStorage.setItem('fc_remember', JSON.stringify({ name: name.trim(), password }));
    else localStorage.removeItem('fc_remember');
    if (mode === 'login') login(name.trim(), password);
    else register(name.trim(), password);
  }
</script>

<div class="min-h-screen flex items-center justify-center p-4"
  style="background: radial-gradient(ellipse at 50% 30%, #1a0e08 0%, #08080c 60%)">
  <div class="w-full max-w-md">
    <!-- Title -->
    <div class="text-center mb-10">
      <h1 class="font-fantasy text-5xl font-black text-red-500 tracking-wider mb-2"
        style="text-shadow: 0 0 40px rgba(220,38,38,0.4), 0 0 80px rgba(220,38,38,0.15)">
        FIGHT CLUB
      </h1>
      <p class="font-fantasy text-sm text-yellow-700/80 tracking-[4px] uppercase">Enter the Arena</p>
    </div>

    <div class="game-panel">
      <div class="flex">
        <button class="flex-1 py-3.5 text-sm font-fantasy font-semibold tracking-wider transition-all border-b-2 {mode === 'login' ? 'text-yellow-400 border-yellow-600' : 'text-gray-500 border-transparent hover:text-gray-300'}"
          style="background: {mode === 'login' ? 'rgba(161,98,7,0.08)' : 'transparent'}"
          onclick={() => { mode = 'login'; $authError = null; }}>LOGIN</button>
        <button class="flex-1 py-3.5 text-sm font-fantasy font-semibold tracking-wider transition-all border-b-2 {mode === 'register' ? 'text-yellow-400 border-yellow-600' : 'text-gray-500 border-transparent hover:text-gray-300'}"
          style="background: {mode === 'register' ? 'rgba(161,98,7,0.08)' : 'transparent'}"
          onclick={() => { mode = 'register'; $authError = null; }}>REGISTER</button>
      </div>

      <div class="p-6 space-y-5">
        {#if $authError}
          <div class="rounded-lg px-4 py-3 text-sm text-red-400 text-center" style="background: rgba(127,29,29,0.2); border: 1px solid #7f1d1d">
            {$authError}
          </div>
        {/if}

        <div>
          <label class="block text-xs font-fantasy font-semibold text-yellow-700 uppercase tracking-widest mb-2">Fighter Name</label>
          <input type="text" bind:value={name} onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && handleSubmit()}
            maxlength="20" placeholder="Enter your name..."
            class="w-full px-4 py-3 bg-[#0a0908] border border-[#2a2520] rounded-lg text-lg text-gray-100 placeholder-gray-600 focus:outline-none focus:border-yellow-700 transition-all" />
        </div>

        <div>
          <label class="block text-xs font-fantasy font-semibold text-yellow-700 uppercase tracking-widest mb-2">Password</label>
          <input type="password" bind:value={password} onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && handleSubmit()}
            placeholder="Enter password..."
            class="w-full px-4 py-3 bg-[#0a0908] border border-[#2a2520] rounded-lg text-lg text-gray-100 placeholder-gray-600 focus:outline-none focus:border-yellow-700 transition-all" />
        </div>

        <label class="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" bind:checked={rememberMe} class="w-5 h-5 rounded bg-[#0a0908] border-[#2a2520] accent-yellow-600" />
          <span class="text-sm text-gray-400">Remember me</span>
        </label>

        <button onclick={handleSubmit}
          class="w-full py-4 rounded-xl font-fantasy font-bold text-lg tracking-wider {mode === 'login' ? 'btn-fight' : 'btn-gold'}">
          {mode === 'login' ? '⚔️ ENTER THE ARENA' : '🛡️ CREATE ACCOUNT'}
        </button>
      </div>
    </div>
  </div>
</div>
