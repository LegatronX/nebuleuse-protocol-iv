// ============================================================
// Nébuleuse Protocol IV
// © 2026 Christian ROLANDO — Tous droits réservés.
// Voir le fichier LICENSE à la racine du dépôt.
// ============================================================
// Architecture Audio & Composition Sonore Originale — Mouvement 5.1b

import { loadMuted, saveMuted } from '../game/meta.js';
import { clamp } from '../util/math.js';

// Utilitaires Note -> Fréquence
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };

function noteToFreq(name) {
  if (!name || name === 'REST') return 0;
  const m = /^([A-G][#b]?)(\d)$/.exec(name);
  if (!m) return 440;
  const semi = NOTE[m[1]] + (parseInt(m[2], 10) - 4) * 12 - 9; // A4 = 440 Hz
  return 440 * Math.pow(2, semi / 12);
}

// PARTITION — Données musicales
const GAME_CHORDS = [
  { bass: 'A2', pad: ['A4', 'C5', 'E5'], arp: ['A4', 'C5', 'E5', 'C5', 'A4', 'C5', 'E5', 'C5'] },
  { bass: 'F2', pad: ['F4', 'A4', 'C5'], arp: ['F4', 'A4', 'C5', 'A4', 'F4', 'A4', 'C5', 'A4'] },
  { bass: 'C3', pad: ['C4', 'E4', 'G4'], arp: ['C4', 'E4', 'G4', 'E4', 'C4', 'E4', 'G4', 'E4'] },
  { bass: 'G2', pad: ['G4', 'B4', 'D5'], arp: ['G4', 'B4', 'D5', 'B4', 'G4', 'B4', 'D5', 'B4'] },
];

const GAME_LEAD = [
  [['A5', 1], ['C6', 0.5], ['A5', 0.5], ['E5', 1], ['A5', 1]],
  [['A5', 1], ['F5', 0.5], ['A5', 0.5], ['C6', 1], ['A5', 1]],
  [['G5', 1], ['E5', 0.5], ['G5', 0.5], ['C6', 1.5], ['G5', 0.5]],
  [['D5', 1], ['B5', 0.5], ['G5', 0.5], ['A5', 2]],
];

const GAME_DRUMS = {
  kick: [1, 0, 1, 0, 1, 0, 1, 0],
  snare: [0, 0, 1, 0, 0, 0, 1, 0],
  hat: [1, 1, 1, 1, 1, 1, 1, 1],
};

const BOSS_CHORDS = [
  { bass: 'A2', pad: ['A4', 'C5', 'E5'], arp: ['A4', 'C5', 'E5', 'C5', 'A4', 'C5', 'E5', 'C5'] },
  { bass: 'F2', pad: ['F4', 'A4', 'C5'], arp: ['F4', 'A4', 'C5', 'A4', 'F4', 'A4', 'C5', 'A4'] },
  { bass: 'D2', pad: ['D4', 'F4', 'A4'], arp: ['D4', 'F4', 'A4', 'F4', 'D4', 'F4', 'A4', 'F4'] },
  { bass: 'E2', pad: ['E4', 'G#4', 'B4'], arp: ['E4', 'G#4', 'B4', 'G#4', 'E4', 'G#4', 'B4', 'G#4'] },
];

const BOSS_LEAD = [
  [['A5', 0.5], ['A5', 0.5], ['C6', 0.5], ['A5', 0.5], ['E5', 1], ['REST', 1]],
  [['F5', 0.5], ['A5', 0.5], ['C6', 0.5], ['A5', 0.5], ['F5', 1], ['REST', 1]],
  [['D5', 0.5], ['F5', 0.5], ['A5', 0.5], ['F5', 0.5], ['D5', 1], ['REST', 1]],
  [['E5', 0.5], ['G#5', 0.5], ['B5', 0.5], ['E6', 0.5], ['E5', 2]],
];

const BOSS_DRUMS = {
  kick: [1, 0, 0, 1, 1, 0, 0, 1],
  snare: [0, 0, 1, 0, 0, 0, 1, 0],
  hat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
};

const VICTORY_LEAD = [['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['C6', 1.5]];
const GAMEOVER_LEAD = [['E5', 0.6], ['D5', 0.6], ['C5', 0.6], ['B4', 0.6], ['A4', 1.6]];

// Prégénération des grilles de Lead (ticks 0..63)
function buildLeadSchedule(leadData) {
  const map = {};
  let tick = 0;
  for (let m = 0; m < leadData.length; m++) {
    const measure = leadData[m];
    for (const [n, durationBeats] of measure) {
      if (n !== 'REST') {
        map[tick] = { note: n, durBeats: durationBeats };
      }
      tick += Math.round(durationBeats * 4); // 4 ticks par noire (16 ticks/mesure)
    }
  }
  return map;
}

const GAME_LEAD_MAP = buildLeadSchedule(GAME_LEAD);
const BOSS_LEAD_MAP = buildLeadSchedule(BOSS_LEAD);

const MENU_LEAD_DATA = GAME_LEAD.map(m => m.map(([n, d]) => {
  if (n === 'REST') return [n, d];
  const regex = /^([A-G][#b]?)(\d)$/.exec(n);
  if (!regex) return [n, d];
  const octave = parseInt(regex[2], 10) - 1; // Transposé -12 (octave 4)
  return [`${regex[1]}${octave}`, d];
}));
const MENU_LEAD_MAP = buildLeadSchedule(MENU_LEAD_DATA);

export const AudioSys = {
  ctx: null,
  master: null,
  highpassMaster: null,
  compressor: null,
  duckingFilter: null,
  musicGain: null,
  sfxGain: null,
  reverb: null,
  reverbGain: null,
  muted: loadMuted(),

  // Séquenceur Audio Context Lookahead
  currentSection: 'menu', // 'menu', 'game', 'boss', 'silent'
  targetSection: 'menu',
  nextNoteTime: 0,
  currentTick: 0, // 0..63 (64 ticks/boucle de 4 mesures)
  schedulerTimer: null,
  jingleTimer: null,

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    try {
      this.ctx = new AC();

      // 1. Ducking Lowpass Filter
      this.duckingFilter = this.ctx.createBiquadFilter();
      this.duckingFilter.type = 'lowpass';
      this.duckingFilter.frequency.setValueAtTime(20000, this.ctx.currentTime);
      this.duckingFilter.connect(this.ctx.destination);

      // 2. Compresseur de Mastering Arcade (zéro clipping, knee doux)
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(6, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(4.5, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.1, this.ctx.currentTime);
      this.compressor.connect(this.duckingFilter);

      // 3. Passe-haut Master (~70Hz pour supprimer la boue)
      this.highpassMaster = this.ctx.createBiquadFilter();
      this.highpassMaster.type = 'highpass';
      this.highpassMaster.frequency.setValueAtTime(70, this.ctx.currentTime);
      this.highpassMaster.connect(this.compressor);

      // 4. Gain Master
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.72;
      this.master.connect(this.highpassMaster);

      // 5. Réverbération Cosmique (Convolver spatial)
      const rate = this.ctx.sampleRate;
      const length = Math.floor(rate * 1.5);
      const impulse = this.ctx.createBuffer(2, length, rate);
      const left = impulse.getChannelData(0);
      const right = impulse.getChannelData(1);
      for (let i = 0; i < length; i++) {
        const decay = Math.exp(-i / (rate * 0.35));
        left[i] = (Math.random() * 2 - 1) * decay;
        right[i] = (Math.random() * 2 - 1) * decay;
      }
      this.reverb = this.ctx.createConvolver();
      this.reverb.buffer = impulse;
      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.value = 0.28;
      this.reverb.connect(this.reverbGain);
      this.reverbGain.connect(this.master);

      // 6. Bus Musique (Mix sous les SFX ~0.35)
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.35;
      this.musicGain.connect(this.master);

      // 7. Bus Effets Sonores (SFX clairs ~0.9)
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.90;
      this.sfxGain.connect(this.master);

      this.updateMute();
    } catch (e) {
      console.warn('[AudioSys] Initialisation échouée:', e);
    }
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  },

  updateMute() {
    if (this.master) {
      this.master.gain.value = this.muted ? 0 : 0.72;
    }
  },

  setMuted(m) {
    this.muted = !!m;
    saveMuted(this.muted);
    this.updateMute();
  },

  // Moteur de Synthèse de Notes Basique
  playNote(freq, dur, type = 'square', gain = 0.2, slide = 0, dest = null, x = null) {
    if (!this.ctx || this.muted || freq <= 0) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) {
      o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    }

    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    o.connect(g);
    const targetDest = dest || this.sfxGain || this.master;
    const W = (typeof window !== 'undefined' && window.innerWidth) || 800;

    if (x !== null && typeof x === 'number' && this.ctx.createStereoPanner) {
      try {
        const panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(clamp((x / W) * 2 - 1, -0.88, 0.88), t);
        g.connect(panner);
        panner.connect(targetDest);
      } catch (e) {
        g.connect(targetDest);
      }
    } else {
      g.connect(targetDest);
    }

    o.start(t);
    o.stop(t + dur + 0.03);
  },

  noise(dur, gain = 0.3, filterFreq = 1000, dest = null, x = null) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, t);
    filter.frequency.exponentialRampToValueAtTime(80, t + dur);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(filter);
    filter.connect(g);

    const targetDest = dest || this.sfxGain || this.master;
    const W = (typeof window !== 'undefined' && window.innerWidth) || 800;

    if (x !== null && typeof x === 'number' && this.ctx.createStereoPanner) {
      try {
        const panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(clamp((x / W) * 2 - 1, -0.88, 0.88), t);
        g.connect(panner);
        panner.connect(targetDest);
      } catch (e) {
        g.connect(targetDest);
      }
    } else {
      g.connect(targetDest);
    }

    src.start(t);
    src.stop(t + dur + 0.03);
  },

  highpassNoise(dur, gain = 0.1, filterFreq = 6000, dest = null, x = null) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(filterFreq, t);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(filter);
    filter.connect(g);
    g.connect(dest || this.sfxGain);

    src.start(t);
    src.stop(t + dur + 0.03);
  },

  // SFX POSITIONNELS AVEC TIMBRE DISTINCT & MICRO-VARIATIONS
  shoot(x) {
    if (this.muted || !this.ctx) return;
    const varPitch = Math.random() * 4 - 2; // ±2 demi-tons
    const f1 = 980 * Math.pow(2, varPitch / 12);
    const f2 = 260 * Math.pow(2, varPitch / 12);
    this.playNote(f1, 0.045, 'triangle', 0.08, -680, this.sfxGain, x);
    this.playNote(f2, 0.03, 'sine', 0.10, -180, this.sfxGain, x);
  },

  enemyShoot(x) {
    if (this.muted || !this.ctx) return;
    const varPitch = Math.random() * 4 - 2;
    const f = 220 * Math.pow(2, varPitch / 12);
    this.playNote(f, 0.07, 'sawtooth', 0.055, -80, this.sfxGain, x);
    this.noise(0.04, 0.025, 1200, this.sfxGain, x);
  },

  hit(x) {
    if (this.muted || !this.ctx) return;
    this.playNote(190, 0.05, 'triangle', 0.12, -70, this.sfxGain, x);
    this.noise(0.04, 0.08, 2500, this.sfxGain, x);
  },

  explosion(big, x) {
    if (this.muted || !this.ctx) return;
    const dur = big ? 0.65 : 0.28;
    const gain = big ? 0.45 : 0.22;
    this.playNote(big ? 65 : 120, dur, 'sawtooth', gain, -45, this.sfxGain, x);
    this.noise(dur, gain * 0.8, big ? 600 : 1200, this.reverbGain || this.sfxGain, x);

    if (big) {
      setTimeout(() => this.noise(0.45, 0.28, 350, this.reverbGain || this.sfxGain, x), 70);
      setTimeout(() => this.playNote(45, 0.55, 'sine', 0.38, -20, this.sfxGain, x), 120);
    }
  },

  power(x) {
    if (this.muted || !this.ctx) return;
    const notes = [523.25, 659.25, 783.99]; // Arpège montant joyeux C5-E5-G5
    notes.forEach((f, i) => {
      setTimeout(() => this.playNote(f, 0.08, 'triangle', 0.12, 0, this.sfxGain, x), i * 55);
    });
  },

  chest(x) {
    if (this.muted || !this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.5]; // Arpège riche C5-E5-G5-B5-C6
    notes.forEach((f, i) => {
      setTimeout(() => this.playNote(f, 0.09, 'triangle', 0.14, 0, this.reverbGain || this.sfxGain, x), i * 50);
    });
  },

  graze(x) {
    if (this.muted || !this.ctx) return;
    const varPitch = Math.random() * 4 - 2;
    const f = 2000 * Math.pow(2, varPitch / 12);
    this.playNote(f, 0.04, 'sine', 0.08, 200, this.sfxGain, x);
    this.highpassNoise(0.04, 0.05, 6000, this.sfxGain, x);
  },

  bomb(x) {
    if (this.muted || !this.ctx) return;
    this.playNote(600, 0.45, 'sawtooth', 0.35, -540, this.sfxGain, x);
    this.noise(0.6, 0.4, 800, this.reverbGain || this.sfxGain, x);
    this.playNote(58, 0.75, 'sine', 0.45, -25, this.sfxGain, x);
  },

  special(x) {
    if (this.muted || !this.ctx) return;
    this.playNote(180, 0.45, 'sawtooth', 0.22, 720, this.sfxGain, x);
    this.noise(0.45, 0.2, 2200, this.sfxGain, x);
  },

  ui() {
    if (this.muted || !this.ctx) return;
    this.playNote(660, 0.03, 'sine', 0.08, 0, this.sfxGain);
  },

  // SÉQUENCEUR AUDIO LOOKAHEAD SCHEDULER
  startMusic(section = 'menu') {
    this.init();
    this.resume();

    this.targetSection = section;
    if (this.schedulerTimer) return;

    this.nextNoteTime = this.ctx ? this.ctx.currentTime + 0.05 : 0;
    this.currentTick = 0;

    const scheduler = () => {
      if (!this.ctx) return;
      const scheduleAheadTime = 0.12; // Planifie les notes 120ms à l'avance
      while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
        this.scheduleTick(this.currentTick, this.nextNoteTime);
        this.advanceTick();
      }
    };

    this.schedulerTimer = setInterval(scheduler, 25);
  },

  stopMusic() {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  },

  advanceTick() {
    const sec = this.currentSection;
    // Tempo : Game = 120 BPM, Boss = 138 BPM, Menu = 70 BPM
    const bpm = sec === 'boss' ? 138 : (sec === 'menu' ? 70 : 120);
    const tickDuration = (60 / bpm) / 4; // 16 ticks par mesure
    this.nextNoteTime += tickDuration;
    this.currentTick = (this.currentTick + 1) % 64;
  },

  scheduleTick(tick, time) {
    if (!this.ctx || this.muted) return;
    const sec = this.currentSection;
    if (sec === 'silent') return;

    const m = Math.floor(tick / 16) % 4; // Mesure 0..3
    const tickInMeasure = tick % 16;
    const isMenu = (sec === 'menu');
    const isBoss = (sec === 'boss');

    const chords = isBoss ? BOSS_CHORDS : GAME_CHORDS;
    const chord = chords[m];
    const leadMap = isBoss ? BOSS_LEAD_MAP : (isMenu ? MENU_LEAD_MAP : GAME_LEAD_MAP);
    const drums = isBoss ? BOSS_DRUMS : GAME_DRUMS;

    // 1. BASSE (Triangle doux + sub)
    if (isMenu) {
      if (tickInMeasure === 0) {
        this.playInstrument('bass', noteToFreq(chord.bass), time, (60 / 70) * 4 * 0.9, 0.18);
      }
    } else {
      if (tickInMeasure % 4 === 0) {
        const bpm = isBoss ? 138 : 120;
        this.playInstrument('bass', noteToFreq(chord.bass), time, (60 / bpm) * 0.8, isBoss ? 0.26 : 0.22);
      }
    }

    // 2. PAD (Sawtooth nappes detunées)
    if (tickInMeasure === 0) {
      const padGain = isMenu ? 0.08 : (isBoss ? 0.14 : 0.11);
      const padDuration = (60 / (isBoss ? 138 : (isMenu ? 70 : 120))) * 4 * 0.95;
      chord.pad.forEach((noteName) => {
        this.playInstrument('pad', noteToFreq(noteName), time, padDuration, padGain);
      });
    }

    // 3. ARPÈGE (Square/Saw staccato discret)
    if (isMenu) {
      if (tickInMeasure % 4 === 0) {
        const idx = Math.floor(tickInMeasure / 4);
        const noteName = chord.arp[idx];
        this.playInstrument('arp', noteToFreq(noteName), time, 0.18, 0.05);
      }
    } else {
      if (tickInMeasure % 2 === 0) {
        const idx = Math.floor(tickInMeasure / 2);
        const noteName = chord.arp[idx % chord.arp.length];
        this.playInstrument('arp', noteToFreq(noteName), time, 0.10, isBoss ? 0.08 : 0.06);
      }
    }

    // 4. LEAD (Mélodie chantante)
    if (leadMap[tick]) {
      const { note, durBeats } = leadMap[tick];
      const freq = noteToFreq(note);
      const bpm = isBoss ? 138 : (isMenu ? 70 : 120);
      const durSec = durBeats * (60 / bpm) * 0.88;
      const leadGain = isMenu ? 0.09 : (isBoss ? 0.18 : 0.15);
      this.playInstrument('lead', freq, time, durSec, leadGain, isBoss ? 'sawtooth' : 'triangle');
    }

    // 5. BATTERIE (Non présente en menu)
    if (!isMenu) {
      const stepIdx = tickInMeasure % 8;
      if (drums.kick[stepIdx]) {
        this.playDrums('kick', time);
      }
      if (drums.snare[stepIdx]) {
        this.playDrums('snare', time);
      }
      if (isBoss) {
        if (drums.hat[tickInMeasure]) this.playDrums('hat', time);
      } else {
        if (drums.hat[stepIdx]) this.playDrums('hat', time);
      }
    }
  },

  // Synthétiseurs d'Instruments Dédiés
  playInstrument(type, freq, time, duration, gainVal, overrideType = null) {
    if (!this.ctx || freq <= 0 || this.muted) return;

    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    if (type === 'bass') {
      o.type = 'triangle';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(550, time);

      g.gain.setValueAtTime(0.001, time);
      g.gain.linearRampToValueAtTime(gainVal, time + 0.01);
      g.gain.exponentialRampToValueAtTime(gainVal * 0.7, time + duration * 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      o.frequency.setValueAtTime(freq, time);
      o.connect(filter);
      filter.connect(g);
      g.connect(this.musicGain);
    } else if (type === 'pad') {
      o.type = 'sawtooth';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, time);

      g.gain.setValueAtTime(0.001, time);
      g.gain.linearRampToValueAtTime(gainVal, time + 0.28);
      g.gain.setValueAtTime(gainVal, time + Math.max(0.29, duration - 0.25));
      g.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      o.frequency.setValueAtTime(freq, time);
      o.connect(filter);
      filter.connect(g);
      g.connect(this.reverbGain || this.musicGain);
      g.connect(this.musicGain);
    } else if (type === 'arp') {
      o.type = 'square';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, time);

      g.gain.setValueAtTime(0.001, time);
      g.gain.linearRampToValueAtTime(gainVal, time + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      o.frequency.setValueAtTime(freq, time);
      o.connect(filter);
      filter.connect(g);
      g.connect(this.musicGain);
    } else if (type === 'lead') {
      o.type = overrideType || 'triangle';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(overrideType === 'sawtooth' ? 4500 : 3200, time);

      g.gain.setValueAtTime(0.001, time);
      g.gain.linearRampToValueAtTime(gainVal, time + 0.012);
      g.gain.exponentialRampToValueAtTime(gainVal * 0.72, time + duration * 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      o.frequency.setValueAtTime(freq, time);
      o.connect(filter);
      filter.connect(g);
      g.connect(this.reverbGain || this.musicGain);
      g.connect(this.musicGain);
    }

    o.start(time);
    o.stop(time + duration + 0.05);
  },

  playDrums(type, time) {
    if (!this.ctx || this.muted) return;

    if (type === 'kick') {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(125, time);
      o.frequency.exponentialRampToValueAtTime(42, time + 0.08);

      g.gain.setValueAtTime(0.42, time);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.10);

      o.connect(g);
      g.connect(this.musicGain);
      o.start(time);
      o.stop(time + 0.11);
    } else if (type === 'snare') {
      const dur = 0.10;
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1000, time);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.18, time);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);

      src.connect(filter);
      filter.connect(g);
      g.connect(this.musicGain);
      src.start(time);
      src.stop(time + dur + 0.02);
    } else if (type === 'hat') {
      const dur = 0.04;
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7000, time);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.06, time);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);

      src.connect(filter);
      filter.connect(g);
      g.connect(this.musicGain);
      src.start(time);
      src.stop(time + dur + 0.02);
    }
  },

  // Jingles 1-shot (Victoire & Game Over)
  playVictoryJingle() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const chord = VICTORY_LEAD;
    chord.forEach(([n, dur], i) => {
      this.playInstrument('lead', noteToFreq(n), t + i * 0.22, dur * 0.4, 0.22);
    });
  },

  playGameOverJingle() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    GAMEOVER_LEAD.forEach(([n, dur], i) => {
      this.playInstrument('lead', noteToFreq(n), t + i * 0.28, dur * 0.4, 0.20, 'sawtooth');
    });
  },

  // Mise à jour continue (State Transitions, Ducking & Crossfade)
  update(dt, world) {
    if (!this.ctx || !this.duckingFilter) return;

    const t = this.ctx.currentTime;
    const p = world && world.player;
    const state = world ? world.state : 'menu';

    // 1. Ducking Lowpass Filter (Santé critique ou pause)
    const isLowHull = state === 'playing' && p && p.alive && (p.hull / p.maxHull < 0.25);
    const isPaused = state === 'paused';
    const targetFreq = (isLowHull || isPaused) ? 550 : 20000;
    this.duckingFilter.frequency.setTargetAtTime(targetFreq, t, 0.15);

    // 2. Détermination de la section cible
    let targetSec = 'menu';
    if (state === 'playing') {
      const isBossActive = world.boss !== null || (world.spawnQueue && world.spawnQueue.length > 0 && world.spawnQueue[0].type === 'boss');
      targetSec = isBossActive ? 'boss' : 'game';
    } else if (state === 'menu' || state === 'laboratoire' || state === 'vaisseaux' || state === 'settings') {
      targetSec = 'menu';
    } else if (state === 'gameover' || state === 'victory') {
      targetSec = 'silent';
    }

    if (this.currentSection !== targetSec) {
      this.currentSection = targetSec;
    }
  },
};
