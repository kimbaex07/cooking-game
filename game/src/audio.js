// Sizzle & Serve — all sound is synthesized with WebAudio oscillators and a
// little filtered noise, so the game ships no audio files. Sounds start only
// after a user gesture (the browser's autoplay rule) and every call is
// guarded: silence is fine, a crash is not.
let ctx = null;
let muted = false;

function ensure() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch {
    ctx = null;
  }
  return ctx;
}

export function unlockAudio() {
  const ac = ensure();
  if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(freq, seconds, type, gain, when = 0, slideTo = null) {
  if (muted) return;
  const ac = ensure();
  if (!ac) return;
  try {
    const t0 = ac.currentTime + when;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + seconds);
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(amp).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  } catch {
    // Audio is decoration; never let it break the game.
  }
}

// A short burst of filtered noise: the chop thock and the grill sizzle.
function noiseBurst(seconds, gain, freq, when = 0) {
  if (muted) return;
  const ac = ensure();
  if (!ac) return;
  try {
    const t0 = ac.currentTime + when;
    const len = Math.max(1, Math.floor(ac.sampleRate * seconds));
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const amp = ac.createGain();
    amp.gain.setValueAtTime(gain, t0);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    src.connect(filter).connect(amp).connect(ac.destination);
    src.start(t0);
  } catch {
    // Audio is decoration; never let it break the game.
  }
}

export const sfx = {
  click() { tone(660, 0.05, 'sine', 0.07); },
  pickup() { tone(740, 0.09, 'sine', 0.1); tone(1108, 0.12, 'sine', 0.08, 0.05); },
  putDown() { tone(520, 0.08, 'sine', 0.09); },
  chop() { noiseBurst(0.09, 0.22, 900); tone(180, 0.07, 'square', 0.06); },
  chopDone() { tone(880, 0.1, 'sine', 0.1); tone(1174, 0.14, 'sine', 0.1, 0.07); },
  sizzle() { noiseBurst(0.28, 0.1, 4200); },
  flip() { tone(392, 0.08, 'triangle', 0.1); tone(587, 0.1, 'triangle', 0.09, 0.06); },
  plate() { tone(1046, 0.1, 'sine', 0.1); tone(784, 0.12, 'sine', 0.08, 0.06); },
  serve() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'sine', 0.11, i * 0.09));
  },
  bell() { tone(1568, 0.35, 'sine', 0.12, 0, 1046); tone(2093, 0.3, 'sine', 0.07, 0.05); },
  wrong() { tone(220, 0.2, 'sawtooth', 0.09); tone(174, 0.3, 'sawtooth', 0.09, 0.16); },
  expire() { tone(330, 0.18, 'square', 0.07); tone(262, 0.28, 'square', 0.07, 0.15); },
  levelUp() {
    [392, 523, 659, 784].forEach((f, i) => tone(f, 0.16, 'triangle', 0.1, i * 0.08));
  },
  win() {
    [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, 0.32, 'sine', 0.11, i * 0.12));
  },
  gameOver() { tone(392, 0.3, 'sawtooth', 0.09, 0, 196); tone(262, 0.5, 'sawtooth', 0.09, 0.25, 131); },
  tick() { tone(980, 0.06, 'square', 0.045); },
};
