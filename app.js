/* Beat Buddies — a pad-based music toy with looping backing tracks.
   Every sound is synthesized with the Web Audio API: no audio files to
   download, and the whole thing keeps working with no internet. */

(() => {
'use strict';

/* ------------------------------------------------------------------ audio */
let ac = null, master = null, comp = null;

function audio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return ac; }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  ac = new Ctx();
  comp = ac.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 24; comp.ratio.value = 3.2;
  master = ac.createGain();
  master.gain.value = 0.8;
  comp.connect(master).connect(ac.destination);
  return ac;
}
const now = () => audio().currentTime;
const out = () => comp;

let noiseBuf = null;
function noise() {
  const c = audio();
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 1.2, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = c.createBufferSource();
  s.buffer = noiseBuf; s.loop = true;
  return s;
}
function env(g, t, a, d, peak) {
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}
function tone(type, f0, f1, t, dur, peak, dest) {
  const c = audio(), o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
  env(g, t, 0.004, dur, peak);
  o.connect(g).connect(dest || out());
  o.start(t); o.stop(t + dur + 0.08);
  return o;
}
function noiseHit(t, dur, peak, filter, freq, q) {
  const c = audio(), s = noise(), g = c.createGain(), f = c.createBiquadFilter();
  f.type = filter; f.frequency.value = freq; if (q) f.Q.value = q;
  env(g, t, 0.002, dur, peak);
  s.connect(f).connect(g).connect(out());
  s.start(t); s.stop(t + dur + 0.06);
}

/* ------------------------------------------------------------- the sounds */
const S = {
  kick(t) { tone('sine', 155, 44, t, 0.42, 1.0); noiseHit(t, 0.035, 0.32, 'lowpass', 900); },
  boom(t) { tone('sine', 92, 32, t, 0.85, 1.0); },
  snare(t) { noiseHit(t, 0.18, 0.5, 'highpass', 1400); tone('triangle', 220, 170, t, 0.13, 0.32); },
  hat(t) { noiseHit(t, 0.045, 0.28, 'highpass', 8000); },
  openhat(t) { noiseHit(t, 0.3, 0.22, 'highpass', 7000); },
  clap(t) { [0, 0.012, 0.026].forEach((o, i) => noiseHit(t + o, 0.09, 0.32 - i * 0.06, 'bandpass', 1600, 1.2)); },
  tom(t) { tone('sine', 300, 150, t, 0.3, 0.7); },
  rim(t) { noiseHit(t, 0.05, 0.36, 'bandpass', 2400, 6); tone('square', 480, 380, t, 0.05, 0.16); },
  cowbell(t) { tone('square', 540, 540, t, 0.22, 0.15); tone('square', 800, 800, t, 0.22, 0.13); },
  crash(t) { noiseHit(t, 1.3, 0.24, 'highpass', 4200); noiseHit(t, 0.3, 0.14, 'bandpass', 2000, 1); },
  shaker(t) { noiseHit(t, 0.08, 0.22, 'bandpass', 6500, 2); },
  clave(t) { tone('square', 1200, 1100, t, 0.06, 0.22); },
  tamb(t) { noiseHit(t, 0.14, 0.2, 'highpass', 5200); tone('triangle', 1500, 1400, t, 0.06, 0.08); },
  scratch(t) {
    const c = audio(), s = noise(), g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 4;
    f.frequency.setValueAtTime(500, t);
    f.frequency.linearRampToValueAtTime(3000, t + 0.09);
    f.frequency.linearRampToValueAtTime(400, t + 0.2);
    env(g, t, 0.005, 0.24, 0.3);
    s.connect(f).connect(g).connect(out());
    s.start(t); s.stop(t + 0.3);
  },

  // melodic voices --------------------------------------------------------
  note(freq) {                                   // marimba-ish bell
    return (t) => {
      const c = audio(), g = c.createGain(), f = c.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 4200;
      env(g, t, 0.006, 1.15, 0.48);
      g.connect(f).connect(out());
      [[1, 1], [2, 0.32], [3.01, 0.12]].forEach(([m, a]) => {
        const o = c.createOscillator(), og = c.createGain();
        o.type = m === 1 ? 'triangle' : 'sine';
        o.frequency.value = freq * m; og.gain.value = a;
        o.connect(og).connect(g); o.start(t); o.stop(t + 1.3);
      });
    };
  },
  bass(freq, dur) {
    return (t) => {
      const c = audio(), g = c.createGain(), f = c.createBiquadFilter();
      f.type = 'lowpass'; f.Q.value = 6;
      f.frequency.setValueAtTime(900, t);
      f.frequency.exponentialRampToValueAtTime(180, t + (dur || 0.32));
      env(g, t, 0.008, dur || 0.32, 0.62);
      const o = c.createOscillator(), o2 = c.createOscillator(), og = c.createGain();
      o.type = 'sawtooth'; o.frequency.value = freq;
      o2.type = 'sine'; o2.frequency.value = freq / 2; og.gain.value = 0.6;
      o.connect(f); o2.connect(og).connect(f);
      f.connect(g).connect(out());
      o.start(t); o2.start(t); o.stop(t + (dur || 0.32) + 0.1); o2.stop(t + (dur || 0.32) + 0.1);
    };
  },
  chord(freqs) {
    return (t) => {
      const c = audio(), g = c.createGain(), f = c.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 2200;
      env(g, t, 0.09, 1.5, 0.3);
      g.connect(f).connect(out());
      freqs.forEach((fr) => {
        const o = c.createOscillator(), og = c.createGain();
        o.type = 'triangle'; o.frequency.value = fr; og.gain.value = 0.34;
        o.connect(og).connect(g); o.start(t); o.stop(t + 1.7);
      });
    };
  },

  // silly voices ----------------------------------------------------------
  laser(t) { tone('sawtooth', 1800, 120, t, 0.32, 0.3); },
  boing(t) {
    const c = audio(), o = c.createOscillator(), g = c.createGain(),
          l = c.createOscillator(), lg = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(420, t);
    o.frequency.exponentialRampToValueAtTime(120, t + 0.45);
    l.type = 'sine'; l.frequency.value = 13; lg.gain.value = 90;
    l.connect(lg).connect(o.frequency);
    env(g, t, 0.005, 0.5, 0.48);
    o.connect(g).connect(out());
    o.start(t); l.start(t); o.stop(t + 0.6); l.stop(t + 0.6);
  },
  pop(t) { tone('sine', 700, 1500, t, 0.07, 0.38); },
  zap(t) { noiseHit(t, 0.12, 0.28, 'bandpass', 3000, 3); tone('square', 2000, 300, t, 0.12, 0.13); },
  siren(t) {
    const c = audio(), o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle';
    for (let i = 0; i < 3; i++) {
      o.frequency.setValueAtTime(560, t + i * 0.24);
      o.frequency.linearRampToValueAtTime(900, t + i * 0.24 + 0.12);
      o.frequency.linearRampToValueAtTime(560, t + i * 0.24 + 0.24);
    }
    env(g, t, 0.02, 0.72, 0.22);
    o.connect(g).connect(out());
    o.start(t); o.stop(t + 0.8);
  },
  robot(t) {
    const c = audio(), o = c.createOscillator(), g = c.createGain();
    o.type = 'square';
    [220, 180, 300, 240, 340].forEach((f, i) => o.frequency.setValueAtTime(f, t + i * 0.07));
    env(g, t, 0.01, 0.42, 0.18);
    o.connect(g).connect(out());
    o.start(t); o.stop(t + 0.5);
  },
  ufo(t) {
    const c = audio(), o = c.createOscillator(), g = c.createGain(),
          l = c.createOscillator(), lg = c.createGain();
    o.type = 'sine'; o.frequency.value = 700;
    l.type = 'sine'; l.frequency.value = 9; lg.gain.value = 260;
    l.connect(lg).connect(o.frequency);
    env(g, t, 0.03, 0.8, 0.18);
    o.connect(g).connect(out());
    o.start(t); l.start(t); o.stop(t + 0.95); l.stop(t + 0.95);
  },
  twinkle(t) { [1046, 1318, 1568, 2093].forEach((f, i) => tone('sine', f, f, t + i * 0.055, 0.22, 0.18)); },
  gong(t) { tone('sine', 70, 55, t, 1.6, 0.65); noiseHit(t, 1.2, 0.1, 'bandpass', 400, 1); },
  honk(t) { tone('sawtooth', 300, 290, t, 0.28, 0.2); tone('sawtooth', 380, 370, t, 0.28, 0.16); },
  bubble(t) { tone('sine', 300, 1200, t, 0.14, 0.28); tone('sine', 900, 1800, t + 0.06, 0.1, 0.13); },
  coin(t) { tone('square', 988, 988, t, 0.07, 0.2); tone('square', 1319, 1319, t + 0.07, 0.22, 0.2); },
  jump(t) { tone('square', 300, 1000, t, 0.16, 0.22); },
  powerup(t) { [523, 659, 784, 1046, 1319].forEach((f, i) => tone('square', f, f, t + i * 0.06, 0.1, 0.16)); },
  riser(t) {
    const c = audio(), s = noise(), g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(9000, t + 0.9);
    env(g, t, 0.5, 0.5, 0.22);
    s.connect(f).connect(g).connect(out());
    s.start(t); s.stop(t + 1.05);
  },
  drop(t) { tone('sine', 900, 40, t, 0.7, 0.55); noiseHit(t, 0.5, 0.12, 'lowpass', 500); },
  wobble(t) {
    const c = audio(), o = c.createOscillator(), g = c.createGain(),
          f = c.createBiquadFilter(), l = c.createOscillator(), lg = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = 110;
    f.type = 'lowpass'; f.frequency.value = 700; f.Q.value = 8;
    l.type = 'sine'; l.frequency.value = 6.5; lg.gain.value = 500;
    l.connect(lg).connect(f.frequency);
    env(g, t, 0.02, 0.7, 0.28);
    o.connect(f).connect(g).connect(out());
    o.start(t); l.start(t); o.stop(t + 0.85); l.stop(t + 0.85);
  },
};

/* ------------------------------------------------------------------ icons */
const I = {
  kick:'<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="currentColor"/>',
  snare:'<ellipse cx="12" cy="8" rx="8.5" ry="3.6" stroke="currentColor" stroke-width="2"/><path d="M3.5 8v7c0 2 3.8 3.6 8.5 3.6s8.5-1.6 8.5-3.6V8" stroke="currentColor" stroke-width="2"/>',
  hat:'<ellipse cx="12" cy="9" rx="8.5" ry="2.6" stroke="currentColor" stroke-width="2"/><ellipse cx="12" cy="14" rx="8.5" ry="2.6" stroke="currentColor" stroke-width="2"/>',
  clap:'<path d="M12 4v4M6 6l2.5 3M18 6l-2.5 3M4 12h4M20 12h-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 15c0 2.2 1.8 4 4 4s4-1.8 4-4z" stroke="currentColor" stroke-width="2"/>',
  tom:'<ellipse cx="12" cy="9" rx="6.5" ry="3" stroke="currentColor" stroke-width="2"/><path d="M5.5 9v5c0 1.7 2.9 3 6.5 3s6.5-1.3 6.5-3V9" stroke="currentColor" stroke-width="2"/>',
  rim:'<rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2" fill="currentColor"/>',
  bell:'<path d="M7 16V11a5 5 0 0110 0v5l1.5 2h-13z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10.5 20.5h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  cymbal:'<path d="M12 12L3 8.5M12 12l9-3.5M12 12v9M12 12L5 18M12 12l7 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="2" fill="currentColor"/>',
  note:'<circle cx="8" cy="17" r="3.4" stroke="currentColor" stroke-width="2"/><path d="M11.4 17V5l8 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  notes:'<circle cx="7" cy="17.5" r="2.8" stroke="currentColor" stroke-width="2"/><circle cx="17" cy="15.5" r="2.8" stroke="currentColor" stroke-width="2"/><path d="M9.8 17.5V6l10-2v11.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  star:'<path d="M12 3l2.6 5.6L21 9.5l-4.5 4.3 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.5l6.4-.9z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  sparkle:'<path d="M12 3v6M12 15v6M3 12h6M15 12h6M6 6l3 3M18 18l-3-3M18 6l-3 3M6 18l3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  heart:'<path d="M12 20s-7-4.4-7-9a4 4 0 017-2.6A4 4 0 0119 11c0 4.6-7 9-7 9z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  sun:'<circle cx="12" cy="12" r="4.5" stroke="currentColor" stroke-width="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  moon:'<path d="M17 14A7 7 0 019 6a7 7 0 108 8z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  cloud:'<path d="M7 18h10a3.5 3.5 0 000-7 5 5 0 00-9.6-1.3A3.6 3.6 0 007 18z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  drop:'<path d="M12 3.5S6 10.4 6 14a6 6 0 1012 0c0-3.6-6-10.5-6-10.5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  bolt:'<path d="M13.5 2L5 13.5h5L9.5 22 19 9.5h-5.5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  rocket:'<path d="M12 2c3.5 3 5 6.5 5 10l-5 4-5-4c0-3.5 1.5-7 5-10z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 17l-2 5 5-2 5 2-2-5" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  ghost:'<path d="M5 20V11a7 7 0 1114 0v9l-2.3-2-2.3 2-2.4-2-2.4 2L7.3 18z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="9.5" cy="10.5" r="1.2" fill="currentColor"/><circle cx="14.5" cy="10.5" r="1.2" fill="currentColor"/>',
  robot:'<rect x="4" y="7" width="16" height="12" rx="3.5" stroke="currentColor" stroke-width="2"/><path d="M12 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="9" cy="13" r="1.4" fill="currentColor"/><circle cx="15" cy="13" r="1.4" fill="currentColor"/>',
  ufo:'<ellipse cx="12" cy="12" rx="9" ry="3.6" stroke="currentColor" stroke-width="2"/><path d="M7 10.5a5 5 0 0110 0" stroke="currentColor" stroke-width="2"/><path d="M7 18l-1.5 3M17 18l1.5 3M12 19v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  wave:'<path d="M2 12c2.5-7 4.5 7 7 0s4.5 7 7 0 4.5 7 6 3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  siren:'<path d="M6 19h12M8 19v-6a4 4 0 018 0v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 4v2M5.5 7L7 8.5M18.5 7L17 8.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  coin:'<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="2"/><path d="M12 7.5v9M9.5 10h5M9.5 14h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  arrowUp:'<path d="M12 20V5M6 11l6-6 6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  arrowDown:'<path d="M12 4v15M6 13l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  disc:'<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><path d="M12 3.5A8.5 8.5 0 0120.5 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  bars:'<path d="M5 16V9M9.5 19V5M14.5 19V10M19 16v-6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  steps:'<path d="M4 18h4v-4h4v-4h4V6h4" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>',
  stack:'<path d="M4 8h16M4 13h16M4 18h10" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  dots:'<circle cx="6" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="18" cy="12" r="2" fill="currentColor"/><circle cx="9" cy="6.5" r="1.6" fill="currentColor"/><circle cx="15" cy="17.5" r="1.6" fill="currentColor"/>',
  lowwave:'<path d="M3 15c3 0 3-6 6-6s3 6 6 6 3-6 6-6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
};
const svg = (d, cls) => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" aria-hidden="true">${d}</svg>`;

/* --------------------------------------------------------- the 24 pads */
/* Grouped in three families of 8 so the grid reads as three colour bands:
   drums (warm) · melody (cool, C major pentatonic) · fun (bright).       */
const NOTE_F = { do1: 523.3, re1: 587.3, mi1: 659.3, so1: 784.0, la1: 880.0, do2: 1046.5, mi2: 1318.5, so2: 1568.0 };

const PADS = [
  // drums — warm
  ['Kick',    S.kick,    I.kick,   'coral'],
  ['Snare',   S.snare,   I.snare,  'tangerine'],
  ['Hat',     S.hat,     I.hat,    'sunny'],
  ['Clap',    S.clap,    I.clap,   'pink'],
  ['Tom',     S.tom,     I.tom,    'coral'],
  ['Rim',     S.rim,     I.rim,    'tangerine'],
  ['Cowbell', S.cowbell, I.bell,   'sunny'],
  ['Crash',   S.crash,   I.cymbal, 'pink'],
  // melody — cool
  ['Do',  S.note(NOTE_F.do1), I.note,   'aqua'],
  ['Re',  S.note(NOTE_F.re1), I.note,   'sky'],
  ['Mi',  S.note(NOTE_F.mi1), I.note,   'violet'],
  ['So',  S.note(NOTE_F.so1), I.note,   'mint'],
  ['La',  S.note(NOTE_F.la1), I.notes,  'aqua'],
  ['High Do', S.note(NOTE_F.do2), I.notes, 'sky'],
  ['High Mi', S.note(NOTE_F.mi2), I.sparkle, 'violet'],
  ['High So', S.note(NOTE_F.so2), I.sparkle, 'mint'],
  // fun — bright
  ['Laser',   S.laser,   I.bolt,     'sunny'],
  ['Boing',   S.boing,   I.heart,    'pink'],
  ['Pop',     S.pop,     I.star,     'mint'],
  ['Siren',   S.siren,   I.siren,    'coral'],
  ['Robot',   S.robot,   I.robot,    'sky'],
  ['UFO',     S.ufo,     I.ufo,      'violet'],
  ['Power Up',S.powerup, I.rocket,   'tangerine'],
  ['Boom',    S.boom,    I.drop,     'aqua'],
];

const PAD_KEYS = [
  '1','2','3','4','5','6','7','8',
  'q','w','e','r','t','y','u','i',
  'a','s','d','f','g','h','j','k',
];

/* ------------------------------------------------------------- the loops */
/* Each loop is a 16-step pattern. They all share one clock, so any
   combination stays locked together. */
const B = {                                    // bass notes
  c: S.bass(65.4, 0.3), g: S.bass(98.0, 0.3), a: S.bass(110.0, 0.3), e: S.bass(82.4, 0.3),
};
const CH = {
  c: S.chord([261.6, 329.6, 392.0]),
  a: S.chord([220.0, 261.6, 329.6]),
  f: S.chord([174.6, 261.6, 349.2]),
  g: S.chord([196.0, 246.9, 392.0]),
};
const M = {
  do1: S.note(NOTE_F.do1), re1: S.note(NOTE_F.re1), mi1: S.note(NOTE_F.mi1),
  so1: S.note(NOTE_F.so1), la1: S.note(NOTE_F.la1), do2: S.note(NOTE_F.do2),
};

const LOOPS = [
  { id: 'bap', name: 'Boom Bap', icon: I.disc, color: 'coral', key: 'z',
    play(s, t) {
      if (s === 0 || s === 6 || s === 10) S.kick(t);
      if (s === 4 || s === 12) S.snare(t);
      if (s % 2 === 0) S.hat(t);
      if (s === 14) S.openhat(t);
    } },
  { id: 'dance', name: 'Dance', icon: I.bars, color: 'sky', key: 'x',
    play(s, t) {
      if (s % 4 === 0) S.kick(t);
      if (s === 4 || s === 12) S.clap(t);
      if (s % 4 === 2) S.openhat(t);
      if (s % 2 === 1) S.hat(t);
    } },
  { id: 'perc', name: 'Shakers', icon: I.dots, color: 'tangerine', key: 'c',
    play(s, t) {
      if (s % 2 === 1) S.shaker(t);
      if (s === 3 || s === 11) S.clave(t);
      if (s === 7) S.tamb(t);
      if (s === 15) S.cowbell(t);
    } },
  { id: 'bass', name: 'Bass', icon: I.lowwave, color: 'violet', key: 'v',
    play(s, t) {
      const line = { 0: B.c, 3: B.c, 6: B.g, 8: B.a, 11: B.g, 14: B.e };
      if (line[s]) line[s](t);
    } },
  { id: 'arp', name: 'Melody', icon: I.steps, color: 'aqua', key: 'b',
    play(s, t) {
      const seq = [M.do1, null, M.mi1, null, M.so1, null, M.la1, null,
                   M.do2, null, M.la1, null, M.so1, null, M.mi1, null];
      if (seq[s]) seq[s](t);
    } },
  { id: 'chords', name: 'Chords', icon: I.stack, color: 'mint', key: 'n',
    play(s, t) {
      if (s === 0) CH.c(t);
      if (s === 4) CH.a(t);
      if (s === 8) CH.f(t);
      if (s === 12) CH.g(t);
    } },
];

/* ------------------------------------------------------------------- dom */
const $ = (s) => document.querySelector(s);
const padsEl = $('#pads'), loopsEl = $('#loops'), toastEl = $('#toast');

function buildPads() {
  padsEl.innerHTML = '';
  PADS.forEach(([name, , icon, color], i) => {
    const b = document.createElement('button');
    b.className = 'pad';
    b.style.setProperty('--c', `var(--${color})`);
    b.dataset.i = i;
    b.type = 'button';
    b.setAttribute('aria-label', name);
    b.innerHTML = `${svg(icon, 'glyph')}<span class="name">${name}</span>` +
                  `<span class="key">${PAD_KEYS[i].toUpperCase()}</span><span class="ring"></span>`;
    padsEl.appendChild(b);
  });
}

function buildLoops() {
  loopsEl.innerHTML = '';
  LOOPS.forEach((l) => {
    const b = document.createElement('button');
    b.className = 'loop';
    b.style.setProperty('--c', `var(--${l.color})`);
    b.dataset.id = l.id;
    b.type = 'button';
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `${svg(l.icon, 'loop-icon')}<span class="loop-name">${l.name}</span>` +
                  `<span class="loop-key">${l.key.toUpperCase()}</span>` +
                  `<span class="beats">${'<i></i>'.repeat(4)}</span>`;
    loopsEl.appendChild(b);
  });
}

function flash(i) {
  const el = padsEl.children[i];
  if (!el) return;
  el.classList.remove('is-hit');
  void el.offsetWidth;
  el.classList.add('is-hit');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('is-hit'), 130);
}

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('is-on');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toastEl.classList.remove('is-on'), 1800);
}

function hit(i, t) {
  const p = PADS[i];
  if (!p) return;
  try { p[1](t != null ? t : now()); } catch (e) { /* ignore audio hiccups */ }
  flash(i);
}

/* ------------------------------------------------------------------ input */
const active = new Map();
const padIndexFrom = (el) => {
  const p = el && el.closest ? el.closest('.pad') : null;
  return p ? Number(p.dataset.i) : -1;
};

padsEl.addEventListener('pointerdown', (e) => {
  const i = padIndexFrom(e.target);
  if (i < 0) return;
  e.preventDefault();
  active.set(e.pointerId, i);
  press(i);
}, { passive: false });

padsEl.addEventListener('pointermove', (e) => {           // slide across pads
  if (!active.has(e.pointerId)) return;
  const i = padIndexFrom(document.elementFromPoint(e.clientX, e.clientY));
  if (i >= 0 && i !== active.get(e.pointerId)) { active.set(e.pointerId, i); press(i); }
});
const release = (e) => active.delete(e.pointerId);
padsEl.addEventListener('pointerup', release);
padsEl.addEventListener('pointercancel', release);
padsEl.addEventListener('contextmenu', (e) => e.preventDefault());

const held = new Set();
window.addEventListener('keydown', (e) => {
  if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea') return;
  const k = e.key.toLowerCase();
  const pi = PAD_KEYS.indexOf(k);
  if (pi >= 0) { e.preventDefault(); if (!held.has(k)) { held.add(k); press(pi); } return; }
  const lp = LOOPS.find((l) => l.key === k);
  if (lp) { e.preventDefault(); toggleLoop(lp.id); return; }
  if (k === ' ') { e.preventDefault(); toggleRec(); }
});
window.addEventListener('keyup', (e) => held.delete(e.key.toLowerCase()));

function press(i) {
  audio();
  hit(i);
  if (rec.on) rec.events.push({ t: performance.now() - rec.t0, i });
}

/* --------------------------------------------------------- loop engine */
const on = new Set();          // ids of running loops
let bpm = 100;
const clock = { step: 0, next: 0, timer: null };

function tick() {
  const spb = 60 / bpm / 4;                       // one 16th note
  while (clock.next < now() + 0.14) {
    const s = clock.step % 16, t = clock.next;
    LOOPS.forEach((l) => { if (on.has(l.id)) { try { l.play(s, t); } catch (e) {} } });
    if (s % 4 === 0) paintBeat(s / 4, t);
    clock.next += spb;
    clock.step++;
  }
}

function paintBeat(beat, t) {                     // light the 4 dots in time
  const delay = Math.max(0, (t - now()) * 1000);
  setTimeout(() => {
    document.querySelectorAll('.loop.is-on .beats').forEach((row) => {
      [...row.children].forEach((d, i) => d.classList.toggle('is-lit', i === beat));
    });
  }, delay);
}

function startClock() {
  if (clock.timer) return;
  audio();
  clock.step = 0; clock.next = now() + 0.1;
  clock.timer = setInterval(tick, 25);
}
function stopClock() {
  clearInterval(clock.timer); clock.timer = null;
  document.querySelectorAll('.beats i').forEach((d) => d.classList.remove('is-lit'));
}

function toggleLoop(id) {
  audio();
  const btn = loopsEl.querySelector(`.loop[data-id="${id}"]`);
  if (on.has(id)) {
    on.delete(id);
    if (btn) { btn.classList.remove('is-on'); btn.setAttribute('aria-pressed', 'false'); }
    if (!on.size) stopClock();
  } else {
    on.add(id);
    if (btn) { btn.classList.add('is-on'); btn.setAttribute('aria-pressed', 'true'); }
    startClock();
  }
}

loopsEl.addEventListener('click', (e) => {
  const b = e.target.closest('.loop');
  if (b) toggleLoop(b.dataset.id);
});

$('#stopAll').addEventListener('click', () => {
  if (!on.size) { toast('No loops running'); return; }
  on.clear();
  loopsEl.querySelectorAll('.loop').forEach((b) => { b.classList.remove('is-on'); b.setAttribute('aria-pressed', 'false'); });
  stopClock();
  toast('Loops stopped');
});

/* ------------------------------------------------- recording & playback */
const rec = { on: false, t0: 0, events: [], len: 0 };
const recBtn = $('#recBtn'), playBtn = $('#playBtn'), saveBtn = $('#saveBtn');

function toggleRec() {
  audio();
  if (!rec.on) {
    stopPlay();
    rec.on = true; rec.t0 = performance.now(); rec.events = [];
    recBtn.classList.add('is-on');
    recBtn.querySelector('.btn-label').textContent = 'Stop';
    playBtn.disabled = true; saveBtn.disabled = true;
    toast('Recording — tap the pads');
  } else {
    rec.on = false;
    rec.len = Math.max(performance.now() - rec.t0, 800);
    recBtn.classList.remove('is-on');
    recBtn.querySelector('.btn-label').textContent = 'Record';
    const has = rec.events.length > 0;
    playBtn.disabled = !has; saveBtn.disabled = !has;
    toast(has ? `Got it — ${rec.events.length} taps. Press Play` : 'Nothing recorded');
  }
}
recBtn.addEventListener('click', toggleRec);

const player = { on: false, timers: [], loop: null };
function playEvents(events, len, label) {
  stopPlay();
  audio();
  player.on = true;
  playBtn.classList.add('is-on');
  playBtn.querySelector('.btn-label').textContent = 'Stop';
  const run = () => events.forEach((ev) => player.timers.push(setTimeout(() => hit(ev.i), ev.t)));
  run();
  player.loop = setInterval(run, Math.max(len, 1000));
  if (label) toast('Playing “' + label + '”');
}
function stopPlay() {
  player.timers.forEach(clearTimeout);
  player.timers = [];
  clearInterval(player.loop); player.loop = null;
  player.on = false;
  playBtn.classList.remove('is-on');
  playBtn.querySelector('.btn-label').textContent = 'Play';
}
playBtn.addEventListener('click', () => {
  if (player.on) { stopPlay(); return; }
  if (rec.events.length) playEvents(rec.events, rec.len);
});

/* ------------------------------------------------------------- sliders */
const bpmEl = $('#bpm'), volEl = $('#vol');
bpmEl.addEventListener('input', () => { bpm = +bpmEl.value; $('#bpmOut').textContent = bpm; save('bb_bpm', bpm); });
volEl.addEventListener('input', () => {
  const v = +volEl.value; $('#volOut').textContent = v;
  if (master) master.gain.value = v / 100;
  save('bb_vol', v);
});

/* ------------------------------------------------------- saved songs */
/* localStorage is blocked in some sandboxed frames — fall back to memory so
   the app never breaks. */
const mem = {};
function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { mem[k] = v; } }
function load(k, d) {
  try { const s = localStorage.getItem(k); return s == null ? (k in mem ? mem[k] : d) : JSON.parse(s); }
  catch (e) { return k in mem ? mem[k] : d; }
}

let songs = load('bb_songs', []) || [];
const listEl = $('#songList'), emptyEl = $('#songsEmpty');

function renderSongs() {
  listEl.innerHTML = '';
  emptyEl.hidden = songs.length > 0;
  songs.forEach((s, idx) => {
    const li = document.createElement('li');
    li.className = 'song';
    li.innerHTML = `<span class="song-name"></span>
      <span class="song-meta">${(s.len / 1000).toFixed(1)}s · ${s.events.length} taps</span>
      <button class="mini mini-play" type="button">Play</button>
      <button class="mini mini-del" type="button">Delete</button>`;
    li.querySelector('.song-name').textContent = s.name;
    li.querySelector('.mini-play').addEventListener('click', () => playEvents(s.events, s.len, s.name));
    li.querySelector('.mini-del').addEventListener('click', () => {
      songs.splice(idx, 1); save('bb_songs', songs); renderSongs(); toast('Deleted');
    });
    listEl.appendChild(li);
  });
}

saveBtn.addEventListener('click', () => {
  if (!rec.events.length) return;
  const name = 'Song ' + (songs.length + 1);
  songs.push({ name, len: rec.len, events: rec.events.slice() });
  if (songs.length > 20) songs.shift();
  save('bb_songs', songs);
  renderSongs();
  toast('Saved as “' + name + '”');
});

/* ---------------------------------------------------- install / fullscreen */
let installEvt = null;
const installBtn = $('#installBtn');
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; installBtn.hidden = false; });
installBtn.addEventListener('click', async () => {
  if (!installEvt) return;
  installEvt.prompt();
  await installEvt.userChoice;
  installEvt = null; installBtn.hidden = true;
});
window.addEventListener('appinstalled', () => { installBtn.hidden = true; toast('Installed — find it on your home screen'); });

$('#fsBtn').addEventListener('click', () => {
  const d = document, el = d.documentElement;
  if (!d.fullscreenElement) (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el);
  else (d.exitFullscreen || d.webkitExitFullscreen || (() => {})).call(d);
});

/* ------------------------------------------------------------------ boot */
buildLoops();
buildPads();
renderSongs();
bpm = load('bb_bpm', 100); bpmEl.value = bpm; $('#bpmOut').textContent = bpm;
const v0 = load('bb_vol', 80); volEl.value = v0; $('#volOut').textContent = v0;
document.addEventListener('pointerdown', () => { audio(); if (master) master.gain.value = (+volEl.value) / 100; }, { once: true });

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
})();
