<script lang="ts">
  import { player, gameData, computedStats, maxHp, maxMp, xpNeeded, activeTab, onlinePlayers,
    pendingChallenges, autoFarm, stopAutoFarm, dismissAutoFarm, startAutoFarm, getQuests, getTitles, getLeaderboard, adminListPlayers, acceptChallenge, viewPlayer, logout, rest, repair, newItemSlots, inboxUnread, getInbox, getSkillTree, getBattleLog, getGuild, listGuilds, getSeason, humanize } from '../stores/game.js';
  import { onMount, onDestroy } from 'svelte';
  import Arena from './tabs/Arena.svelte';
  import Dungeons from './tabs/Dungeons.svelte';
  import Shop from './tabs/Shop.svelte';
  import Inventory from './tabs/Inventory.svelte';
  import Enchanting from './tabs/Enchanting.svelte';
  import Quests from './tabs/Quests.svelte';
  import Achievements from './tabs/Achievements.svelte';
  import Titles from './tabs/Titles.svelte';
  import Stats from './tabs/Stats.svelte';
  import Rankings from './tabs/Rankings.svelte';
  import Profile from './tabs/Profile.svelte';
  import Pvp from './tabs/Pvp.svelte';
  import PvpFight from './tabs/PvpFight.svelte';
  import Admin from './tabs/Admin.svelte';
  import ChatPanel from './ChatPanel.svelte';
  import Tutorial from './Tutorial.svelte';
  import Avatar from './Avatar.svelte';
  import SkillTree from './tabs/SkillTree.svelte';
  import Appearance from './tabs/Appearance.svelte';
  import BattleLog from './tabs/BattleLog.svelte';
  import Guild from './tabs/Guild.svelte';
  import Crafting from './tabs/Crafting.svelte';
  import WorldMap from './tabs/WorldMap.svelte';
  import Season from './tabs/Season.svelte';
  import Settings from './tabs/Settings.svelte';
  import Inbox from './tabs/Inbox.svelte';

  let showMobileChat: boolean = false;
  let mobileMenuOpen: boolean = false;
  let sidebarCollapsed: boolean = (typeof localStorage !== 'undefined' && localStorage.getItem('sidebarCollapsed') === 'true');
  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
  }
  let now: number = Date.now();
  let _tick: any;
  onMount(() => { _tick = setInterval(() => now = Date.now(), 1000); });
  onDestroy(() => { if (_tick) clearInterval(_tick); });

  $: restCooldownLeft = Math.max(0, 60 - Math.floor((now - ($player?.lastRestTime || 0)) / 1000));
  $: restOnCooldown = restCooldownLeft > 0;

  $: cls = $gameData?.classes?.[$player?.class] || { name: 'Fighter', icon: '⚔️' };
  $: titleObj = $gameData?.titles?.find(t => t.id === $player?.activeTitle);
  $: challengeCount = $pendingChallenges.length;
  $: friendReqCount = ($player?.friendRequests || []).length;
  $: badges = { pvp: challengeCount, inventory: $newItemSlots.size, stats: $player?.statPoints || 0, inbox: $inboxUnread, settings: friendReqCount };

  const allTabs: Array<{id: string; icon: string; label: string; group: string; adminOnly?: boolean}> = [
    { id: 'arena',        icon: '⚔️', label: 'Arena',        group: 'Combat' },
    { id: 'dungeons',     icon: '🏰', label: 'Dungeons',     group: 'Combat' },
    { id: 'pvp',          icon: '🤺', label: 'PvP',          group: 'Combat' },
    { id: 'inventory',    icon: '🎒', label: 'Inventory',    group: 'Character' },
    { id: 'stats',        icon: '📊', label: 'Stats',        group: 'Character' },
    { id: 'skilltree',    icon: '🌳', label: 'Skills',       group: 'Character' },
    { id: 'appearance',   icon: '🎨', label: 'Look',         group: 'Character' },
    { id: 'shop',         icon: '🏪', label: 'Shop',         group: 'Economy' },
    { id: 'enchanting',   icon: '✨', label: 'Enchant',      group: 'Economy' },
    { id: 'crafting',     icon: '⚒️', label: 'Craft',        group: 'Economy' },
    { id: 'inbox',        icon: '📩', label: 'Messages',     group: 'Social' },
    { id: 'guild',        icon: '⚔️', label: 'Guild',        group: 'Social' },
    { id: 'leaderboard',  icon: '🏆', label: 'Rankings',     group: 'Social' },
    { id: 'quests',       icon: '📜', label: 'Quests',       group: 'Progress' },
    { id: 'achievements', icon: '🏅', label: 'Achievements', group: 'Progress' },
    { id: 'titles',       icon: '🎭', label: 'Titles',       group: 'Progress' },
    { id: 'season',       icon: '🏆', label: 'Season',       group: 'Progress' },
    { id: 'battlelog',    icon: '📜', label: 'Battle Log',   group: 'Progress' },
    { id: 'settings',     icon: '⚙️', label: 'Settings',     group: '_settings' },
    { id: 'admin',        icon: '🔧', label: 'Admin',        group: '_settings', adminOnly: true },
  ];
  const navGroups = ['Combat', 'Character', 'Economy', 'Social', 'Progress'] as const;
  const quickBarItems = [
    { id: 'arena',     icon: '⚔️', label: 'Arena' },
    { id: 'inventory', icon: '🎒', label: 'Inv' },
    { id: 'inbox',     icon: '📩', label: 'Msg' },
    { id: 'shop',      icon: '🏪', label: 'Shop' },
  ];
  $: tabs = allTabs.filter(t => !t.adminOnly || $player?.isAdmin);

  function switchTab(id: string) {
    $activeTab = id;
    mobileMenuOpen = false;
    if (id === 'quests') getQuests();
    if (id === 'titles') getTitles();
    if (id === 'leaderboard') getLeaderboard();
    if (id === 'admin') adminListPlayers();
    if (id === 'skilltree') getSkillTree();
    if (id === 'battlelog') getBattleLog();
    if (id === 'season') getSeason();
    if (id === 'inbox') getInbox();
    if (id === 'guild') { getGuild(); listGuilds(); }
  }

  $: equipSlots = ['weapon','armor','helmet','boots','ring','backpack'].map(slot => {
    const eq = $player?.equipment || {};
    const eqId = eq[slot];
    const inst = eqId ? $player?.itemInstances?.[eqId] : null;
    const item = eqId ? (inst ? $gameData?.items?.[inst.baseId] : $gameData?.items?.[eqId]) : null;
    const elvl = eqId ? ($player?.itemInstances?.[eqId]?.enchantLevel || 0) : 0;
    return { icon: item?.icon || '·', name: item ? `${item.name}${elvl ? ` +${elvl}` : ''}` : 'Empty', dim: !item, rarity: item?.rarity };
  });

  $: xpPct = $xpNeeded === Infinity ? 100 : Math.min(100, (($player?.xp || 0) / $xpNeeded) * 100);
</script>

<div class="min-h-screen flex flex-col bg-pattern game-layout">
  <!-- Header -->
  <header class="game-header border-b border-[#2a2015] px-5 py-2.5 flex items-center justify-between"
    style="background: linear-gradient(90deg, #0a0908 0%, #1a1208 50%, #0a0908 100%)">
    <h1 class="font-fantasy text-xl font-bold text-red-500 tracking-wider hide-mobile" style="text-shadow: 0 0 20px rgba(220,38,38,0.3)">FIGHT CLUB</h1>
    <div class="flex items-center gap-4 text-sm">
      <button class="text-yellow-500 font-fantasy font-semibold" style="background:none; border:none; cursor:pointer; padding:0; font-size:inherit"
        onclick={() => { if ($player?.name) viewPlayer($player.name); }}>
        {cls.icon} {$player?.name}{titleObj ? ` [${titleObj.name}]` : ''}
      </button>
      <span class="text-gray-400">Lv.<span class="text-yellow-400 font-bold">{$player?.level || 1}</span>
        {#if ($player?.prestige || 0) > 0}<span class="text-yellow-300"> ✨{$player.prestige}</span>{/if}
      </span>
      <span class="text-green-600 hide-mobile">{$onlinePlayers.length} online</span>
    </div>
    <!-- Mobile HP/MP bars (hidden on desktop) -->
    <div class="mobile-hp-bars">
      <div style="display:flex; gap:6px; align-items:center; font-size:10px">
        <span style="color:#ef4444">HP</span>
        <div style="width:60px; height:6px; background:#1a0808; border-radius:3px; overflow:hidden">
          <div style="height:100%; width:{(($player?.currentHp ?? $maxHp) / ($player?.maxHp || $maxHp)) * 100}%; background:#dc2626; border-radius:3px"></div>
        </div>
        <span style="color:#3b82f6">MP</span>
        <div style="width:40px; height:6px; background:#081020; border-radius:3px; overflow:hidden">
          <div style="height:100%; width:{(($player?.currentMp ?? $maxMp) / ($player?.maxMp || $maxMp)) * 100}%; background:#3b82f6; border-radius:3px"></div>
        </div>
        <span style="color:#fbbf24">🪙 {humanize($player?.gold || 0)}</span>
      </div>
    </div>
  </header>

  <!-- Auto-farm banner (hidden on arena page — arena has its own controls) -->
  {#if $autoFarm && $activeTab !== 'arena'}
    <div class="border-b border-green-900/50 px-5 py-2 flex items-center justify-between text-sm"
      style="background: linear-gradient(90deg, #0a1a0a, #081508, #0a1a0a)">
      <span class="text-green-400 font-medium">
        🔄 Farming <strong>{$autoFarm.npcIcon} {$autoFarm.npcName}</strong>
        — <span class="text-green-300">{$autoFarm.totalKills} kills</span>
        {#if $autoFarm.drops.length > 0}· <span class="text-yellow-400">{$autoFarm.drops.length} drops</span>{/if}
        {#if !$autoFarm.running}<span class="text-red-400"> (stopped)</span>{/if}
      </span>
      <div class="flex gap-2">
        {#if $autoFarm.running}
          <button class="btn-dark btn-game text-xs py-1 px-3" onclick={stopAutoFarm}>⏹ Stop</button>
        {:else}
          <button class="btn-gold btn-game text-xs py-1 px-3" onclick={() => startAutoFarm($autoFarm.npcId)}>▶ Resume</button>
          <button class="btn-dark btn-game text-xs py-1 px-3" onclick={dismissAutoFarm}>✖ Close</button>
        {/if}
        <button class="btn-dark btn-game text-xs py-1 px-3" onclick={() => switchTab('arena')}>View</button>
      </div>
    </div>
  {/if}

  <!-- Challenge banner -->
  {#if challengeCount > 0}
    <div class="border-b border-red-900/50 px-5 py-2 flex items-center justify-between text-sm glow-red"
      style="background: linear-gradient(90deg, #1a0808, #150808, #1a0808)">
      <span class="text-red-400 font-semibold">⚔️ {challengeCount} incoming challenge{challengeCount > 1 ? 's' : ''}!</span>
      <div class="flex gap-2">
        {#each $pendingChallenges as ch}
          <button class="btn-fight btn-game text-xs py-1 px-3" onclick={() => acceptChallenge(ch.id)}>
            Accept {ch.from}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <div class="flex flex-1 overflow-hidden">
    <!-- Sidebar Left -->
    <aside class="sidebar-left flex flex-col shrink-0 overflow-y-auto border-r border-[#1a1714] desktop-sidebar"
      class:collapsed={sidebarCollapsed}
      style="background: linear-gradient(180deg, #0e0c0a 0%, #08080c 100%)">

      <!-- Character panel -->
      <div class="char-panel p-4 border-b border-[#1a1714]">
        {#if !sidebarCollapsed}
        <div class="flex justify-center mb-1">
          <Avatar classId={$player?.class} size={72} glow={true} avatar={$player?.avatar} />
        </div>
        <button class="text-center font-fantasy font-bold text-lg text-yellow-400 w-full" style="background:none; border:none; cursor:pointer; padding:0"
          onclick={() => { if ($player?.name) viewPlayer($player.name); }}>{$player?.name}</button>
        <div class="text-center text-sm text-gray-500 mb-3">
          {cls.name} · Lv.{$player?.level || 1}
          {#if ($player?.prestige || 0) > 0}<span class="text-yellow-500"> ✨NG+{$player.prestige}</span>{/if}
        </div>

        <!-- HP bar -->
        <div class="mb-1.5">
          <div class="flex justify-between text-xs text-gray-400 mb-0.5">
            <span>HP</span>
            <span>{$player?.currentHp ?? $player?.maxHp ?? $maxHp} / {$player?.maxHp || $maxHp}</span>
          </div>
          <div class="bar-hp h-3"><div class="bar-hp-fill" style="width: {(($player?.currentHp ?? $maxHp) / ($player?.maxHp || $maxHp)) * 100}%"></div></div>
        </div>
        <!-- MP bar -->
        <div class="mb-1.5">
          <div class="flex justify-between text-xs text-gray-400 mb-0.5">
            <span>MP</span>
            <span>{$player?.currentMp ?? $player?.maxMp ?? $maxMp} / {$player?.maxMp || $maxMp}</span>
          </div>
          <div class="h-3 rounded-md overflow-hidden" style="background:#081020; border:1px solid #152040">
            <div class="h-full rounded-md transition-all" style="width: {(($player?.currentMp ?? $maxMp) / ($player?.maxMp || $maxMp)) * 100}%; background: linear-gradient(90deg, #1e40af, #3b82f6, #60a5fa); box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 0 8px rgba(59,130,246,0.3)"></div>
          </div>
        </div>
        <!-- XP bar -->
        <div class="mb-2">
          <div class="flex justify-between text-xs text-gray-400 mb-0.5">
            <span>XP</span>
            <span>{$player?.xp || 0} / {$xpNeeded === Infinity ? 'MAX' : $xpNeeded}</span>
          </div>
          <div class="bar-xp h-2"><div class="bar-xp-fill" style="width: {xpPct}%"></div></div>
        </div>
        <!-- Rest button -->
        {#if ($player?.currentHp ?? $maxHp) < ($player?.maxHp || $maxHp) || ($player?.currentMp ?? $maxMp) < ($player?.maxMp || $maxMp)}
          {@const inFight = !!$autoFarm?.running}
          {@const cantRest = inFight || restOnCooldown}
          <button class="w-full mb-1 py-1.5 text-xs btn-game"
            style="background:{cantRest ? 'linear-gradient(180deg,#1a1714,#0f0d0b)' : 'linear-gradient(180deg,#1f1a16,#151210)'}; color:{cantRest ? '#4b5563' : '#e2e0d6'}; border:1px solid #2a2520"
            onclick={rest}
            disabled={cantRest}>
            {#if inFight}
              🏥 In combat
            {:else if restOnCooldown}
              🏥 Rest ({restCooldownLeft}s)
            {:else}
              🏥 Rest ({Math.max(5, Math.floor(($player?.level || 1) * 3))}🪙)
            {/if}
          </button>
        {/if}
        <!-- Soul sickness -->
        {#if ($player?.soulSickness || 0) > 0}
          <div class="mb-1 py-1 px-2 text-xs rounded" style="background:#1a0820; border:1px solid #3d1545; color:#c084fc; text-align:center">
            💀 Soul Sickness: {$player.soulSickness}/10 (-{$player.soulSickness * 3}% stats)
          </div>
        {/if}
        <!-- Drop penalty -->
        {#if ($player?.dropPenalty || 0) > 0}
          <div class="mb-1 py-1 px-2 text-xs rounded" style="background:#1a1808; border:1px solid #3d3515; color:#fbbf24; text-align:center">
            🎲 Drop penalty: {$player.dropPenalty} fights
          </div>
        {/if}
        <!-- Repair button -->
        {#if Object.values($player?.itemInstances || {}).some(i => (i?.durability ?? 100) < 100)}
          {@const worstDur = Math.min(...Object.values($player?.itemInstances || {}).map(i => i?.durability ?? 100).filter(d => d < 100))}
          <button class="w-full mb-1 py-1.5 text-xs btn-game" onclick={repair}
            style="background:{worstDur <= 25 ? 'linear-gradient(180deg,#7f1d1d,#450a0a)' : worstDur <= 50 ? 'linear-gradient(180deg,#713f12,#451a03)' : 'linear-gradient(180deg,#1f1a16,#151210)'}; color:{worstDur <= 25 ? '#fca5a5' : worstDur <= 50 ? '#fcd34d' : '#a8a29e'}; border:1px solid {worstDur <= 25 ? '#991b1b' : worstDur <= 50 ? '#92400e' : '#2a2520'}">
            🔧 Repair {worstDur <= 25 ? '(stats -75%!)' : worstDur <= 50 ? '(stats -50%!)' : worstDur <= 75 ? '(stats -25%)' : ''}
          </button>
        {/if}

        <!-- Gold -->
        <div class="flex justify-between text-sm pt-2 border-t border-[#1a1714]">
          <span class="text-gray-500">Gold</span>
          <span class="text-yellow-400 font-bold text-base">🪙 {humanize($player?.gold || 0)}</span>
        </div>

        <!-- Buffs -->
        {#if $player?.buffs && Object.keys($player.buffs).length > 0}
          <div class="mt-2 flex justify-center gap-2 flex-wrap">
            {#each Object.entries($player.buffs) as [k, b]}
              {@const icons = { xp: '⭐', gold: '🪙', drop: '🍀', str: '💪', agi: '💨', end: '🛡️', int: '🔮', enchant: '📜' }}
              {@const names = { xp: 'XP Boost', gold: 'Gold Boost', drop: 'Drop Boost', str: 'Strength', agi: 'Agility', end: 'Endurance', int: 'Intellect', enchant: 'Enchant Shield' }}
              <span title="{names[k] || k}: ×{b.val} for {b.fights} fights" style="font-size:11px; padding:2px 6px; border-radius:4px; background:#0a0908; border:1px solid #1a1714; color:#4ade80; cursor:help">
                {icons[k] || '✨'} ×{b.val} <span style="color:#78716c">({b.fights})</span>
              </span>
            {/each}
          </div>
        {/if}

        {#if ($player?.statPoints || 0) > 0}
          <button class="w-full mt-3 py-2 text-sm btn-gold btn-game glow-gold" onclick={() => switchTab('stats')}>
            {$player.statPoints} stat points!
          </button>
        {/if}
        {:else}
          <!-- Collapsed: just show avatar small -->
          <div class="flex justify-center">
            <Avatar classId={$player?.class} size={36} glow={false} avatar={$player?.avatar} />
          </div>
        {/if}
      </div>

      <!-- Toggle button -->
      <div class="sidebar-toggle-row">
        <button class="sidebar-toggle-btn" onclick={toggleSidebar} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <span class="toggle-icon" class:rotated={sidebarCollapsed}>&#9664;</span>
        </button>
      </div>

      <!-- Grouped Navigation -->
      <nav class="flex-1 py-1 sidebar-nav">
        {#each navGroups as group}
          {#if !sidebarCollapsed}
            <div class="group-label">{group}</div>
          {/if}
          {#each tabs.filter(t => t.group === group) as tab}
            {@const badge = badges[tab.id] || 0}
            <button
              class="nav-item w-full relative {$activeTab === tab.id || ($activeTab === 'pvp_fight' && tab.id === 'pvp') ? 'active' : ''}"
              onclick={() => switchTab(tab.id)}
              title={sidebarCollapsed ? tab.label : ''}>
              <span class="nav-icon">{tab.icon}</span>
              {#if !sidebarCollapsed}
                <span class="nav-label">{tab.label}</span>
                {#if badge > 0}
                  <span class="nav-badge">{badge}</span>
                {/if}
              {/if}
            </button>
          {/each}
        {/each}
      </nav>

      <!-- Settings + Logout at bottom -->
      <div class="sidebar-bottom">
        {#each tabs.filter(t => t.group === '_settings') as tab}
          {@const badge = badges[tab.id] || 0}
          <button
            class="nav-item w-full relative {$activeTab === tab.id ? 'active' : ''}"
            onclick={() => switchTab(tab.id)}
            title={sidebarCollapsed ? tab.label : ''}>
            <span class="nav-icon">{tab.icon}</span>
            {#if !sidebarCollapsed}
              <span class="nav-label">{tab.label}</span>
              {#if badge > 0}
                <span class="nav-badge">{badge}</span>
              {/if}
            {/if}
          </button>
        {/each}
        <button class="nav-item w-full text-gray-400 hover:text-red-400" onclick={logout}
          title={sidebarCollapsed ? 'Logout' : ''}>
          <span class="nav-icon">🚪</span>
          {#if !sidebarCollapsed}<span class="nav-label">Logout</span>{/if}
        </button>
      </div>
    </aside>

    <!-- Content Area -->
    <main class="main-content flex-1 overflow-y-auto p-5 bg-[#0b0a08]" style="display:flex; flex-direction:column; align-items:center">
      <div style="width:100%; max-width:860px">
      {#if $activeTab === 'worldmap'}<WorldMap />
      {:else if $activeTab === 'arena'}<Arena />
      {:else if $activeTab === 'dungeons'}<Dungeons />
      {:else if $activeTab === 'pvp'}<Pvp />
      {:else if $activeTab === 'pvp_fight'}<PvpFight />
      {:else if $activeTab === 'shop'}<Shop />
      {:else if $activeTab === 'inventory'}<Inventory />
      {:else if $activeTab === 'enchanting'}<Enchanting />
      {:else if $activeTab === 'crafting'}<Crafting />
      {:else if $activeTab === 'quests'}<Quests />
      {:else if $activeTab === 'achievements'}<Achievements />
      {:else if $activeTab === 'skilltree'}<SkillTree />
      {:else if $activeTab === 'titles'}<Titles />
      {:else if $activeTab === 'appearance'}<Appearance />
      {:else if $activeTab === 'stats'}<Stats />
      {:else if $activeTab === 'season'}<Season />
      {:else if $activeTab === 'inbox'}<Inbox />
      {:else if $activeTab === 'guild'}<Guild />
      {:else if $activeTab === 'battlelog'}<BattleLog />
      {:else if $activeTab === 'leaderboard'}<Rankings />
      {:else if $activeTab === 'profile'}<Profile />
      {:else if $activeTab === 'settings'}<Settings />
      {:else if $activeTab === 'admin'}<Admin />
      {/if}
      </div>
    </main>

    <!-- Sidebar Right -->
    <aside class="sidebar-right w-56 flex flex-col shrink-0 border-l border-[#1a1714]"
      style="background: linear-gradient(180deg, #0e0c0a 0%, #08080c 100%)">
      <!-- Online -->
      <div class="p-3 border-b border-[#1a1714]">
        <div class="font-fantasy text-xs font-semibold text-yellow-700 uppercase tracking-widest mb-2">Online ({$onlinePlayers.length})</div>
        <div class="max-h-44 overflow-y-auto space-y-1">
          {#each $onlinePlayers as p}
            {@const pcls = $gameData?.classes?.[p.class]}
            <button
              class="w-full flex items-center justify-between text-sm py-1.5 px-2 rounded-lg hover:bg-[#1a1714] transition-colors text-left"
              onclick={() => viewPlayer(p.name)}>
              <span class="{p.name === $player?.name ? 'text-yellow-400 font-semibold' : 'text-gray-300'}">
                {pcls?.icon || '⚔️'} {p.name}
              </span>
              <span class="text-gray-400 text-xs">
                {p.level}{p.prestige ? `✨` : ''}{p.inFight ? ' ⚔️' : ''}
              </span>
            </button>
          {/each}
        </div>
      </div>

      <!-- Chat -->
      <ChatPanel />
    </aside>
  </div>

  <!-- Mobile quick bar -->
  <div class="quick-bar mobile-only">
    <div class="qb-inner">
      {#each quickBarItems as qb}
        {@const badge = badges[qb.id] || 0}
        <button class="qb" class:active={$activeTab === qb.id} onclick={() => switchTab(qb.id)}>
          <span style="font-size:18px">{qb.icon}</span>{qb.label}
          {#if badge > 0}<span class="dot"></span>{/if}
        </button>
      {/each}
      <button class="qb" class:active={mobileMenuOpen} onclick={() => mobileMenuOpen = !mobileMenuOpen}>
        <span style="font-size:18px">&equiv;</span>More
      </button>
    </div>
  </div>

  <!-- Mobile half-sheet overlay -->
  {#if mobileMenuOpen}
    <div class="hs-overlay mobile-only" onclick={() => mobileMenuOpen = false}></div>
    <div class="half-sheet mobile-only">
      <div class="hs-handle"></div>
      {#each [...navGroups, 'Settings'] as group}
        <div class="hs-sep"><span>{group === 'Settings' ? 'Settings' : group}</span></div>
        <div class="hs-grid">
          {#each tabs.filter(t => group === 'Settings' ? t.group === '_settings' : t.group === group) as tab}
            {@const badge = badges[tab.id] || 0}
            <button class="hs-item" class:active={$activeTab === tab.id} onclick={() => switchTab(tab.id)}>
              <span class="hi">{tab.icon}</span>
              <span class="hl">{tab.label}</span>
              {#if badge > 0}<span class="hb">{badge}</span>{/if}
            </button>
          {/each}
        </div>
      {/each}
    </div>
  {/if}

  <!-- Mobile chat toggle -->
  <button class="mobile-chat-toggle mobile-only" style="display:none" onclick={() => showMobileChat = !showMobileChat}>
    💬
  </button>
  {#if showMobileChat}
    <div class="mobile-chat-drawer mobile-only" style="display:flex; flex-direction:column">
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; border-bottom:1px solid #1a1714">
        <span style="font-size:12px; color:#d4a853; font-weight:600">Chat</span>
        <button style="background:none; border:none; color:#78716c; cursor:pointer; font-size:18px; padding:0 4px" onclick={() => showMobileChat = false}>✕</button>
      </div>
      <ChatPanel />
    </div>
  {/if}

  <!-- Beginner tutorial overlay -->
  <Tutorial />
</div>
