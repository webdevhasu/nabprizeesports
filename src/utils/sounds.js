const AudioCtx = window.AudioContext || window.webkitAudioContext;
let ctx = null;

function getCtx() {
  if (!ctx) ctx = new AudioCtx();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function playTone(freq, duration, type = 'sine', volume = 0.3) {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration);
  } catch (e) { /* silent fail */ }
}

export const sounds = {
  success: () => {
    playTone(523, 0.1, 'sine', 0.25);
    setTimeout(() => playTone(659, 0.1, 'sine', 0.25), 100);
    setTimeout(() => playTone(784, 0.15, 'sine', 0.3), 200);
  },
  error: () => {
    playTone(330, 0.15, 'square', 0.15);
    setTimeout(() => playTone(262, 0.2, 'square', 0.15), 150);
  },
  click: () => {
    playTone(800, 0.05, 'sine', 0.1);
  },
  join: () => {
    playTone(440, 0.08, 'sine', 0.2);
    setTimeout(() => playTone(554, 0.08, 'sine', 0.2), 80);
    setTimeout(() => playTone(659, 0.12, 'sine', 0.25), 160);
  },
  notification: () => {
    playTone(880, 0.08, 'sine', 0.2);
    setTimeout(() => playTone(1100, 0.12, 'sine', 0.2), 100);
  },
  coin: () => {
    playTone(1200, 0.06, 'sine', 0.15);
    setTimeout(() => playTone(1600, 0.08, 'sine', 0.15), 60);
  },
  withdraw: () => {
    playTone(660, 0.1, 'triangle', 0.2);
    setTimeout(() => playTone(550, 0.1, 'triangle', 0.2), 120);
    setTimeout(() => playTone(440, 0.15, 'triangle', 0.2), 240);
  },
};
