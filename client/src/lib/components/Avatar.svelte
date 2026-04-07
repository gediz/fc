<!-- SVG Character Avatar based on class -->
<script lang="ts">
  export let classId: string = 'warrior';
  export let size: number = 80;
  export let glow: boolean = false;
  export let avatar: any = {};   // appearance options: { skinTone, hairStyle, hairColor, accessory }

  const SKIN_TONES  = ['#f5d0b0', '#dba878', '#c4956a', '#a0724a', '#6b4430', '#3d2218'];
  const HAIR_COLORS = ['#1a1a2e', '#4a2a0a', '#8b6914', '#d4a853', '#c43c3c', '#e8e0f0', '#2d5a2d', '#1a1a1a'];

  const CLASS_VISUALS = {
    warrior: {
      body: '#c43c3c', accent: '#ff6b6b', hair: '#4a2a0a', skin: '#d4a574',
      helmet: '#888', shield: true, weapon: 'sword',
    },
    rogue: {
      body: '#2d5a2d', accent: '#4ade80', hair: '#1a1a2e', skin: '#c4956a',
      helmet: null, hood: true, weapon: 'dagger',
    },
    tank: {
      body: '#4a4a6a', accent: '#8b8bbb', hair: '#5a4030', skin: '#d4a574',
      helmet: '#666', shield: true, weapon: 'mace', heavy: true,
    },
    mystic: {
      body: '#3a2a5a', accent: '#c084fc', hair: '#e8e0f0', skin: '#c4a08a',
      helmet: null, hat: true, weapon: 'staff',
    },
  };

  $: base = CLASS_VISUALS[classId] || CLASS_VISUALS.warrior;

  // Override skin and hair colors from avatar appearance options when provided
  $: skinColor = (avatar?.skinTone != null && SKIN_TONES[avatar.skinTone] != null)
    ? SKIN_TONES[avatar.skinTone]
    : base.skin;
  $: hairColor = (avatar?.hairColor != null && HAIR_COLORS[avatar.hairColor] != null)
    ? HAIR_COLORS[avatar.hairColor]
    : base.hair;

  $: hairStyle = avatar?.hairStyle ?? 0;   // 0-5: different hair shapes
  $: accessory = avatar?.accessory ?? 0;  // 0=none, 1=scar, 2=earring, 3=eyepatch, 4=bandana, 5=crown

  // Merge overrides into final visuals
  $: v = { ...base, skin: skinColor, hair: hairColor };
</script>

<svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"
  style={glow ? `filter: drop-shadow(0 0 8px ${v.accent}40)` : ''}>

  <!-- Body / Armor -->
  <rect x="18" y="28" width="28" height="24" rx="4" fill={v.body} />
  <rect x="20" y="30" width="24" height="20" rx="3" fill={v.accent} opacity="0.15" />
  <!-- Belt -->
  <rect x="18" y="42" width="28" height="3" fill={v.body} opacity="0.8" />
  <rect x="29" y="41" width="6" height="5" rx="1" fill={v.accent} opacity="0.5" />

  <!-- Arms -->
  <rect x="10" y="30" width="8" height="18" rx="4" fill={v.body} />
  <rect x="46" y="30" width="8" height="18" rx="4" fill={v.body} />
  <!-- Hands -->
  <circle cx="14" cy="49" r="3" fill={v.skin} />
  <circle cx="50" cy="49" r="3" fill={v.skin} />

  <!-- Legs -->
  <rect x="22" y="52" width="8" height="10" rx="3" fill="#2a2218" />
  <rect x="34" y="52" width="8" height="10" rx="3" fill="#2a2218" />
  <!-- Boots -->
  <rect x="21" y="58" width="10" height="5" rx="2" fill="#3a3020" />
  <rect x="33" y="58" width="10" height="5" rx="2" fill="#3a3020" />

  <!-- Head -->
  <circle cx="32" cy="18" r="11" fill={v.skin} />

  <!-- Eyes -->
  <ellipse cx="28" cy="17" rx="1.5" ry="2" fill="#1a1a1a" />
  <ellipse cx="36" cy="17" rx="1.5" ry="2" fill="#1a1a1a" />
  <circle cx="28.5" cy="16.5" r="0.5" fill="white" />
  <circle cx="36.5" cy="16.5" r="0.5" fill="white" />

  <!-- Mouth -->
  <path d="M29 22 Q32 24 35 22" stroke="#8a6040" stroke-width="1" fill="none" />

  <!-- Hair / Headgear -->
  {#if hairStyle > 0}
    <!-- Custom hair style overrides class headgear -->
    {#if hairStyle === 1}
      <!-- Short spiky -->
      <path d="M20 16 Q22 4 32 3 Q42 4 44 16 L42 10 L38 5 L34 10 L30 4 L26 10 L22 6 Z" fill={v.hair} />
    {:else if hairStyle === 2}
      <!-- Long flowing -->
      <path d="M18 18 Q18 4 32 3 Q46 4 46 18 L46 30 Q44 28 44 18 L42 12 Q38 6 32 5 Q26 6 22 12 L20 18 Q20 28 18 30 Z" fill={v.hair} />
    {:else if hairStyle === 3}
      <!-- Mohawk -->
      <rect x="29" y="2" width="6" height="14" rx="2" fill={v.hair} />
      <path d="M22 18 Q22 10 32 9 Q42 10 42 18" fill={v.hair} opacity="0.3" />
    {:else if hairStyle === 4}
      <!-- Bald — nothing rendered -->
    {:else}
      <!-- Ponytail -->
      <path d="M20 18 Q20 6 32 5 Q44 6 44 18 L42 14 Q40 8 32 7 Q24 8 22 14 Z" fill={v.hair} />
      <path d="M44 14 Q48 16 46 28 Q44 32 42 30" stroke={v.hair} stroke-width="3" fill="none" />
    {/if}
  {:else if v.hood}
    <!-- Rogue hood -->
    <path d="M19 20 Q20 4 32 6 Q44 4 45 20 L42 22 Q38 10 32 9 Q26 10 22 22 Z" fill="#1a2a1a" />
    <path d="M22 22 Q27 12 32 11 Q37 12 42 22" stroke="#2d5a2d" stroke-width="0.5" fill="none" />
  {:else if v.hat}
    <!-- Mystic hat -->
    <path d="M20 15 L32 -2 L44 15" fill="#3a2a5a" />
    <ellipse cx="32" cy="15" rx="16" ry="4" fill="#2a1a4a" />
    <circle cx="32" cy="-1" r="2" fill={v.accent} opacity="0.8" />
  {:else if v.helmet}
    <!-- Warrior/Tank helmet -->
    <path d="M20 20 Q20 6 32 5 Q44 6 44 20 L42 18 Q40 8 32 7 Q24 8 22 18 Z" fill={v.helmet} />
    <rect x="30" y="4" width="4" height="8" rx="1" fill={v.accent} opacity="0.6" />
    <!-- Visor -->
    <rect x="24" y="14" width="16" height="3" rx="1" fill={v.helmet} opacity="0.7" />
  {:else}
    <!-- Hair (varies by hairStyle) -->
    {#if hairStyle === 0}
      <path d="M20 18 Q20 6 32 5 Q44 6 44 18 L42 14 Q40 8 32 7 Q24 8 22 14 Z" fill={v.hair} />
    {:else if hairStyle === 1}
      <!-- Short spiky -->
      <path d="M20 16 Q22 4 32 3 Q42 4 44 16 L42 10 L38 5 L34 10 L30 4 L26 10 L22 6 Z" fill={v.hair} />
    {:else if hairStyle === 2}
      <!-- Long flowing -->
      <path d="M18 18 Q18 4 32 3 Q46 4 46 18 L46 30 Q44 28 44 18 L42 12 Q38 6 32 5 Q26 6 22 12 L20 18 Q20 28 18 30 Z" fill={v.hair} />
    {:else if hairStyle === 3}
      <!-- Mohawk -->
      <rect x="29" y="2" width="6" height="14" rx="2" fill={v.hair} />
      <path d="M22 18 Q22 10 32 9 Q42 10 42 18" fill={v.hair} opacity="0.3" />
    {:else if hairStyle === 4}
      <!-- Bald — nothing rendered -->
    {:else}
      <!-- Ponytail -->
      <path d="M20 18 Q20 6 32 5 Q44 6 44 18 L42 14 Q40 8 32 7 Q24 8 22 14 Z" fill={v.hair} />
      <path d="M44 14 Q48 16 46 28 Q44 32 42 30" stroke={v.hair} stroke-width="3" fill="none" />
    {/if}
  {/if}

  <!-- Accessory -->
  {#if accessory === 1}
    <!-- Scar -->
    <line x1="26" y1="14" x2="30" y2="20" stroke="#8b4040" stroke-width="1.5" opacity="0.7" />
  {:else if accessory === 2}
    <!-- Earring -->
    <circle cx="20" cy="20" r="2" fill="#d4a853" />
    <circle cx="20" cy="20" r="1" fill="#fbbf24" />
  {:else if accessory === 3}
    <!-- Eyepatch -->
    <ellipse cx="36" cy="17" rx="4" ry="3" fill="#1a1a1a" />
    <line x1="33" y1="14" x2="44" y2="12" stroke="#1a1a1a" stroke-width="1" />
  {:else if accessory === 4}
    <!-- Bandana -->
    <rect x="20" y="10" width="24" height="4" rx="1" fill="#c43c3c" />
    <path d="M44 11 L48 14 L46 16" fill="#c43c3c" />
  {:else if accessory === 5}
    <!-- Crown -->
    <path d="M22 8 L26 3 L30 7 L32 2 L34 7 L38 3 L42 8 L40 10 L24 10 Z" fill="#d4a853" />
    <rect x="24" y="8" width="16" height="3" rx="1" fill="#a07810" />
  {/if}

  <!-- Weapon (right hand) -->
  {#if v.weapon === 'sword'}
    <rect x="48" y="32" width="3" height="20" rx="1" fill="#aaa" transform="rotate(15, 50, 42)" />
    <rect x="46" y="44" width="7" height="3" rx="1" fill="#654" transform="rotate(15, 50, 42)" />
  {:else if v.weapon === 'dagger'}
    <rect x="49" y="38" width="2" height="12" rx="1" fill="#ccc" transform="rotate(20, 50, 44)" />
    <rect x="47" y="46" width="6" height="2" rx="1" fill="#654" transform="rotate(20, 50, 44)" />
  {:else if v.weapon === 'mace'}
    <rect x="48" y="34" width="3" height="16" rx="1" fill="#876" transform="rotate(10, 50, 42)" />
    <circle cx="50" cy="33" r="4" fill="#888" transform="rotate(10, 50, 42)" />
  {:else if v.weapon === 'staff'}
    <rect x="49" y="20" width="2.5" height="32" rx="1" fill="#654" transform="rotate(8, 50, 36)" />
    <circle cx="50" cy="20" r="4" fill={v.accent} opacity="0.7" transform="rotate(8, 50, 36)" />
    <circle cx="50" cy="20" r="2" fill={v.accent} transform="rotate(8, 50, 36)" />
  {/if}

  <!-- Shield (left hand) -->
  {#if v.shield}
    <ellipse cx="12" cy="42" rx="6" ry="8" fill={v.heavy ? '#555' : '#8b6914'} />
    <ellipse cx="12" cy="42" rx="4" ry="6" fill={v.heavy ? '#666' : '#a07810'} />
    <circle cx="12" cy="42" r="2" fill={v.accent} opacity="0.5" />
  {/if}
</svg>
