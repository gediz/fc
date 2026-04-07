// ─── Simple Sound Effects (Web Audio API) ───────────────────
// No audio files — synthesized sounds

let audioCtx = null;
let soundEnabled = localStorage.getItem('fc_sound') !== 'false';

export function isSoundEnabled() { return soundEnabled; }

export function toggleSound() {
  soundEnabled = !soundEnabled;
  localStorage.setItem('fc_sound', String(soundEnabled));
  return soundEnabled;
}

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(freq, duration, type = 'sine', volume = 0.15) {
  if (!soundEnabled) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

// ── Sound effects ──

export function sfxHit() {
  playTone(200, 0.1, 'square', 0.1);
}

export function sfxCrit() {
  playTone(400, 0.05, 'sawtooth', 0.12);
  setTimeout(() => playTone(600, 0.1, 'sawtooth', 0.08), 50);
}

export function sfxMiss() {
  playTone(100, 0.15, 'sine', 0.05);
}

export function sfxVictory() {
  playTone(440, 0.15, 'sine', 0.1);
  setTimeout(() => playTone(554, 0.15, 'sine', 0.1), 150);
  setTimeout(() => playTone(659, 0.3, 'sine', 0.12), 300);
}

export function sfxDefeat() {
  playTone(300, 0.2, 'sine', 0.1);
  setTimeout(() => playTone(200, 0.3, 'sine', 0.1), 200);
  setTimeout(() => playTone(100, 0.5, 'sine', 0.08), 400);
}

export function sfxLevelUp() {
  playTone(523, 0.1, 'sine', 0.1);
  setTimeout(() => playTone(659, 0.1, 'sine', 0.1), 100);
  setTimeout(() => playTone(784, 0.1, 'sine', 0.1), 200);
  setTimeout(() => playTone(1047, 0.2, 'sine', 0.12), 300);
}

export function sfxDrop() {
  playTone(800, 0.05, 'sine', 0.08);
  setTimeout(() => playTone(1200, 0.1, 'sine', 0.1), 80);
}

export function sfxClick() {
  playTone(600, 0.03, 'square', 0.05);
}

export function sfxNotification() {
  playTone(500, 0.08, 'sine', 0.06);
  setTimeout(() => playTone(700, 0.08, 'sine', 0.06), 100);
}
