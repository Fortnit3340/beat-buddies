/* Beat Buddies — a pad-based music toy.
   All sounds are synthesized with the Web Audio API, so there are no
   downloads and the whole thing works offline. */

(() => {
'use strict';

/* ------------------------------------------------------------------ audio */
let ac = null, master = null, comp = null;

function audio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return ac; }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  ac = new Ctx();
  comp = ac.createDynamicsCompressor();
  comp.threshold.value = -12; comp.knee.value = 24; comp.ratio.value = 3;
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
  kick(t) {
    tone('sine', 155, 44, t, 0.42, 1.0);
    noiseHit(t, 0.035, 0.35, 'lowpass', 900);
  },
  snare(t) {
    noiseHit(t, 0.18, 0.55, 'highpass', 1400);
    tone('triangle', 220, 170, t, 0.13, 0.35);
  },
  hat(t) { noiseHit(t, 0.045, 0.3, 'highpass', 8000); },
  openhat(t) { noiseHit(t, 0.3, 0.24, 'highpass', 7000); },
  clap(t) {
    [0, 0.012, 0.026].forEach((o, i) => noiseHit(t + o, 0.09, 0.34 - i * 0.06, 'bandpass', 1600, 1.2));
  },
  tomHi(t) { tone('sine', 320, 180, t, 0.26, 0.7); },
  tomLo(t) { tone('sine', 190, 100, t, 0.34, 0.75); },
  rim(t) { noiseHit(t, 0.05, 0.4, 'bandpass', 2400, 6); tone('square', 480, 380, t, 0.05, 0.18); },
  cowbell(t) {
    tone('square', 540, 540, t, 0.22, 0.16);
    tone('square', 800, 800, t, 0.22, 0.14);
  },
  cymbal(t) { noiseHit(t, 0.9, 0.2, 'highpass', 6000); },
  shaker(t) { noiseHit(t, 0.08, 0.24, 'bandpass', 6500, 2); },
  clave(t) { tone('square', 1200, 1100, t, 0.06, 0.24); },
  woodblock(t) { tone('triangle', 900, 780, t, 0.08, 0.34); },
  boom(t) { tone('sine', 90, 34, t, 0.8, 1.0); },
  crash(t) { noiseHit(t, 1.3, 0.26, 'highpass', 4200); noiseHit(t, 0.3, 0.16, 'bandpass', 2000, 1); },

  // melodic: soft marimba-ish bell, pentatonic so everything sounds nice together
  note(freq) {
    return (t) => {
      const c = audio(), g = c.createGain(), f = c.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 4200;
      env(g, t, 0.006, 1.15, 0.5);
      g.connect(f).connect(out());
      [[1, 1], [2, 0.32], [3.01, 0.12]].forEach(([m, a]) => {
        const o = c.createOscillator(), og = c.createGain();
        o.type = m === 1 ? 'triangle' : 'sine';
        o.frequency.value = freq * m; og.gain.value = a;
        o.connect(og).connect(g); o.start(t); o.stop(t + 1.3);
      });
    };
  },

  // silly sounds
  laser(t) { tone('sawtooth', 1800, 120, t, 0.32, 0.32); },
  boing(t) {
    const c = audio(), o = c.createOscillator(), g = c.createGain(),
          l = c.createOscillator(), lg = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(420, t);
    o.frequency.exponentialRampToValueAtTime(120, t + 0.45);
    l.type = 'sine'; l.frequency.value = 13; lg.gain.value = 90;
    l.connect(lg).connect(o.frequency);
    env(g, t, 0.005, 0.5, 0.5);
    o.connect(g).connect(out());
    o.start(t); l.start(t); o.stop(t + 0.6); l.stop(t + 0.6);
  },
  siren(t) {
    const c = audio(), o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle';
    for (let i = 0; i < 3; i++) {
      o.frequency.setValueAtTime(560, t + i * 0.24);
      o.frequency.linearRampToValueAtTime(900, t + i * 0.24 + 0.12);
      o.frequency.linearRampToValueAtTime(560, t + i * 0.24 + 0.24);
    }
    env(g, t, 0.02, 0.72, 0.24);
    o.connect(g).connect(out());
    o.start(t); o.stop(t + 0.8);
  },
  pop(t) { tone('sine', 700, 1500, t, 0.07, 0.4); },
  zap(t) { noiseHit(t, 0.12, 0.3, 'bandpass', 3000, 3); tone('square', 2000, 300, t, 0.12, 0.14); },
  wobble(t) {
    const c = audio(), o = c.createOscillator(), g = c.createGain(),
          f = c.createBiquadFilter(), l = c.createOscillator(), lg = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = 110;
    f.type = 'lowpass'; f.frequency.value = 700; f.Q.value = 8;
    l.type = 'sine'; l.frequency.value = 6.5; lg.gain.value = 500;
    l.connect(lg).connect(f.frequency);
    env(g, t, 0.02, 0.7, 0.3);
    o.connect(f).connect(g).connect(out());
    o.start(t); l.start(t); o.stop(t + 0.85); l.stop(t + 0.85);
  },
  bubble(t) { tone('sine', 300, 1200, t, 0.14, 0.3); tone('sine', 900, 1800, t + 0.06, 0.1, 0.14); },
  slide(t) { tone('triangle', 200, 1400, t, 0.35, 0.26); },
  robot(t) {
    const c = audio(), o = c.createOscillator(), g = c.createGain();
    o.type = 'square';
    [220, 180, 300, 240, 340].forEach((f, i) => o.frequency.setValueAtTime(f, t + i * 0.07));
    env(g, t, 0.01, 0.42, 0.2);
    o.connect(g).connect(out());
    o.start(t); o.stop(t + 0.5);
  },
  honk(t) { tone('sawtooth', 300, 290, t, 0.28, 0.22); tone('sawtooth', 380, 370, t, 0.28, 0.18); },
  ufo(t) {
    const c = audio(), o = c.createOscillator(), g = c.createGain(),
          l = c.createOscillator(), lg = c.createGain();
    o.type = 'sine'; o.frequency.value = 700;
    l.type = 'sine'; l.frequency.value = 9; lg.gain.value = 260;
    l.connect(lg).connect(o.frequency);
    env(g, t, 0.03, 0.8, 0.2);
    o.connect(g).connect(out());
    o.start(t); l.start(t); o.stop(t + 0.95); l.stop(t + 0.95);
  },
  twinkle(t) {
    [1046, 1318, 1568, 2093].forEach((f, i) => tone('sine', f, f, t + i * 0.055, 0.22, 0.2));
  },
  gong(t) { tone('sine', 70, 55, t, 1.6, 0.7); noiseHit(t, 1.2, 0.1, 'bandpass', 400, 1); },
};

/* --------------------------------------------------------------- the kits */
const G = {
  drum: '<svg class="glyph" viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="7" rx="9" ry="4" stroke="currentColor" stroke-width="2"/><path d="M3 7v9c0 2.2 4 4 9 4s9-1.8 9-4V7" stroke="currentColor" stroke-width="2"/></svg>',
  wave: '<svg class="glyph" viewBox="0 0 24 24" fill="none"><path d="M2 12c2.5-7 4.5 7 7 0s4.5 7 7 0 4.5 7 6 3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  star: '<svg class="glyph" viewBox="0 0 24 24" fill="none"><path d="M12 3l2.6 5.6L21 9.5l-4.5 4.3 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.5l6.4-.9z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  note: '<svg class="glyph" viewBox="0 0 24 24" fill="none"><circle cx="8" cy="17" r="3.4" stroke="currentColor" stroke-width="2"/><path d="M11.4 17V5l8 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  bolt: '<svg class="glyph" viewBox="0 0 24 24" fill="none"><path d="M13.5 2L5 13.5h5L9.5 22 19 9.5h-5.5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
};

const C = ['--coral','--tangerine','--sunny','--mint','--aqua','--sky','--violet','--pink'];
const col = (i) => `var(${C[i % C.length]})`;

const KITS = {
  drums: {
    accent: '#FF5E7E',
    pads: [
      ['Kick', S.kick, G.drum], ['Snare', S.snare, G.drum], ['Hat', S.hat, G.wave], ['Open Hat', S.openhat, G.wave],
      ['Clap', S.clap, G.star], ['Tom Hi', S.tomHi, G.drum], ['Tom Lo', S.tomLo, G.drum], ['Rim', S.rim, G.star],
      ['Cowbell', S.cowbell, G.star], ['Shaker', S.shaker, G.wave], ['Clave', S.clave, G.star], ['Block', S.woodblock, G.star],
      ['Cymbal', S.cymbal, G.wave], ['Boom', S.boom, G.drum], ['Crash', S.crash, G.wave], ['Gong', S.gong, G.drum],
    ],
  },
  melody: {
    accent: '#38E0D0',
    // C major pentatonic across ~2.5 octaves — every combination sounds happy
    pads: (() => {
      const names = ['Do','Re','Mi','So','La','Do','Re','Mi','So','La','Do','Re','Mi','So','La','Do'];
      const freqs = [261.6,293.7,329.6,392.0,440.0,523.3,587.3,659.3,784.0,880.0,1046.5,1174.7,1318.5,1568.0,1760.0,2093.0];
      return freqs.map((f, i) => [names[i], S.note(f), G.note]);
    })(),
  },
  funny: {
    accent: '#FFD93D',
    pads: [
      ['Laser', S.laser, G.bolt], ['Boing', S.boing, G.star], ['Pop', S.pop, G.star], ['Zap', S.zap, G.bolt],
      ['Siren', S.siren, G.wave], ['Wobble', S.wobble, G.wave], ['Bubble', S.bubble, G.star], ['Slide', S.slide, G.wave],
      ['Robot', S.robot, G.bolt], ['Honk', S.honk, G.wave], ['UFO', S.ufo, G.bolt], ['Twinkle', S.twinkle, G.star],
      ['Boom', S.boom, G.drum], ['Crash', S.crash, G.wave], ['Gong', S.gong, G.drum], ['Cowbell', S.cowbell, G.star],
    ],
  },
};

const KEYS = ['1','2','3','4','q','w','e','r','a','s','d','f','z','x','c','v'];

/* ------------------------------------------------------------------- dom */
const $ = (s) => document.querySelector(s);
const padsEl = $('#pads'), toastEl = $('#toast');
let kit = 'drums';

function buildPads() {
  padsEl.innerHTML = '';
  KITS[kit].pads.forEach((p, i) => {
    const b = document.createElement('button');
    b.className = 'pad';
    b.style.setProperty('--c', col(i));
    b.dataset.i = i;
    b.type = 'button';
    b.setAttribute('aria-label', p[0]);
    b.innerHTML = `${p[2]}<span class="name">${p[0]}</span><span class="key">${KEYS[i].toUpperCase()}</span><span class="ring"></span>`;
    padsEl.appendChild(b);
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

function hit(i, kitName, t) {
  const k = KITS[kitName || kit];
  if (!k || !k.pads[i]) return;
  try { k.pads[i][1](t != null ? t : now()); } catch (e) { /* audio hiccup, ignore */ }
  if ((kitName || kit) === kit) flash(i);
}

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('is-on');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toastEl.classList.remove('is-on'), 1900);
}

/* ------------------------------------------------------------------ input */
const active = new Map(); // pointerId -> pad index

function padIndexFrom(target) {
  const el = target && target.closest ? target.closest('.pad') : null;
  return el ? Number(el.dataset.i) : -1;
}

padsEl.addEventListener('pointerdown', (e) => {
  const i = padIndexFrom(e.target);
  if (i < 0) return;
  e.preventDefault();
  active.set(e.pointerId, i);
  press(i);
}, { passive: false });

// dragging across pads plays them like a real pad controller
padsEl.addEventListener('pointermove', (e) => {
  if (!active.has(e.pointerId)) return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const i = padIndexFrom(el);
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
  const i = KEYS.indexOf(k);
  if (i >= 0) { e.preventDefault(); if (!held.has(k)) { held.add(k); press(i); } return; }
  if (k === ' ') { e.preventDefault(); toggleRec(); }
});
window.addEventListener('keyup', (e) => held.delete(e.key.toLowerCase()));

function press(i) {
  audio();
  hit(i);
  if (rec.on) rec.events.push({ t: performance.now() - rec.t0, i, kit });
}

/* ------------------------------------------------- recording & playback */
const rec = { on: false, t0: 0, events: [], len: 0 };
const recBtn = $('#recBtn'), playBtn = $('#playBtn'), saveBtn = $('#saveBtn'), beatBtn = $('#beatBtn');

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
  const run = () => {
    events.forEach((ev) => {
      player.timers.push(setTimeout(() => hit(ev.i, ev.kit), ev.t));
    });
  };
  run();
  player.loop = setInterval(run, Math.max(len, 1000));
  if (label) toast('Playing “' + label + '”');
}
function stopPlay() {
  player.timers.forEach(clearTimeout);
  player.timers = [];
  if (player.loop) clearInterval(player.loop);
  player.loop = null;
  player.on = false;
  playBtn.classList.remove('is-on');
  playBtn.querySelector('.btn-label').textContent = 'Play';
}
playBtn.addEventListener('click', () => {
  if (player.on) { stopPlay(); return; }
  if (rec.events.length) playEvents(rec.events, rec.len);
});

/* ------------------------------------------------------- auto beat engine */
const beat = { on: false, step: 0, next: 0, timer: null };
const PAT = {           // 16 steps, indices into the drums kit
  kick:  [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0],
  snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
  hat:   [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,1,1,0],
  shake: [0,1,0,1, 0,1,0,1, 0,1,0,1, 0,1,0,1],
};
let bpm = 100;
function scheduleBeat() {
  const spb = 60 / bpm / 4; // 16th note
  while (beat.next < now() + 0.12) {
    const s = beat.step % 16, t = beat.next;
    if (PAT.kick[s])  S.kick(t);
    if (PAT.snare[s]) S.snare(t);
    if (PAT.hat[s])   S.hat(t);
    if (PAT.shake[s]) S.shaker(t);
    beat.next += spb;
    beat.step++;
  }
}
function toggleBeat() {
  audio();
  if (beat.on) {
    clearInterval(beat.timer); beat.timer = null; beat.on = false;
    beatBtn.classList.remove('is-on');
    return;
  }
  beat.on = true; beat.step = 0; beat.next = now() + 0.08;
  beat.timer = setInterval(scheduleBeat, 25);
  beatBtn.classList.add('is-on');
  toast('Auto Beat on — jam over it');
}
beatBtn.addEventListener('click', toggleBeat);

/* ------------------------------------------------------------- sliders */
const bpmEl = $('#bpm'), volEl = $('#vol');
bpmEl.addEventListener('input', () => { bpm = +bpmEl.value; $('#bpmOut').textContent = bpm; save('bb_bpm', bpm); });
volEl.addEventListener('input', () => {
  const v = +volEl.value; $('#volOut').textContent = v;
  if (master) master.gain.value = v / 100;
  save('bb_vol', v);
});

/* ------------------------------------------------------------ kit tabs */
$('#kits').addEventListener('click', (e) => {
  const b = e.target.closest('.kit');
  if (!b) return;
  kit = b.dataset.kit;
  document.querySelectorAll('.kit').forEach((x) => x.classList.toggle('is-active', x === b));
  document.querySelector('meta[name=theme-color]').setAttribute('content', KITS[kit].accent);
  buildPads();
});

/* ------------------------------------------------------- saved songs */
/* localStorage can be blocked inside sandboxed previews — fall back to memory
   so the app never breaks. */
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
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); installEvt = e; installBtn.hidden = false;
});
installBtn.addEventListener('click', async () => {
  if (!installEvt) return;
  installEvt.prompt();
  await installEvt.userChoice;
  installEvt = null; installBtn.hidden = true;
});
window.addEventListener('appinstalled', () => { installBtn.hidden = true; toast('Installed — find it on your home screen'); });

$('#fsBtn').addEventListener('click', () => {
  const d = document;
  if (!d.fullscreenElement) (d.documentElement.requestFullscreen || d.documentElement.webkitRequestFullscreen || (() => {})).call(d.documentElement);
  else (d.exitFullscreen || d.webkitExitFullscreen || (() => {})).call(d);
});

/* ------------------------------------------------------------------ boot */
buildPads();
renderSongs();
bpm = load('bb_bpm', 100); bpmEl.value = bpm; $('#bpmOut').textContent = bpm;
const v0 = load('bb_vol', 80); volEl.value = v0; $('#volOut').textContent = v0;
document.addEventListener('pointerdown', () => { audio(); if (master) master.gain.value = (+volEl.value) / 100; }, { once: true });

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
})();
