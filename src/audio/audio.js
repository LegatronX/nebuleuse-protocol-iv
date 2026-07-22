// ============================================================
// Nébuleuse Protocol IV
// © 2026 Christian ROLANDO — Tous droits réservés.
// Voir le fichier LICENSE à la racine du dépôt.
// ============================================================

import { loadMuted, saveMuted } from '../game/meta.js';
import { clamp } from '../util/math.js';

function makeDistortionCurve(amount = 20) {
  const k = typeof amount === 'number' ? amount : 20;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

export const AudioSys = {
  ctx: null,
  master: null,
  musicGain: null,
  sfxGain: null,
  stemAmbience: null,
  stemBattle: null,
  stemBoss: null,
  duckingFilter: null,
  compressor: null,
  overdrive: null,
  reverb: null,
  reverbGain: null,
  muted: loadMuted(),
  musicTimer: null,
  step: 0,

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    try {
      this.ctx = new AC();

      // 1. Ducking Lowpass Filter (Filtre sous l'eau lors de la santé critique / pause)
      this.duckingFilter = this.ctx.createBiquadFilter();
      this.duckingFilter.type = 'lowpass';
      this.duckingFilter.frequency.setValueAtTime(20000, this.ctx.currentTime);
      this.duckingFilter.connect(this.ctx.destination);

      // 2. Compresseur de Mastering Arcade
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(6, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(4.5, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.1, this.ctx.currentTime);
      this.compressor.connect(this.duckingFilter);

      // 3. Bus Master
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.72;
      this.master.connect(this.compressor);

      // 4. Overdrive WaveShaper (Distorsion Harmonique Analogique)
      this.overdrive = this.ctx.createWaveShaper();
      this.overdrive.curve = makeDistortionCurve(15);
      this.overdrive.oversample = '4x';
      this.overdrive.connect(this.master);

      // 5. Réverbération Cosmique Spatiale (Convolver)
      const rate = this.ctx.sampleRate;
      const length = Math.floor(rate * 1.4);
      const impulse = this.ctx.createBuffer(2, length, rate);
      const left = impulse.getChannelData(0);
      const right = impulse.getChannelData(1);
      for (let i = 0; i < length; i++) {
        const decay = Math.exp(-i / (rate * 0.32));
        left[i] = (Math.random() * 2 - 1) * decay;
        right[i] = (Math.random() * 2 - 1) * decay;
      }
      this.reverb = this.ctx.createConvolver();
      this.reverb.buffer = impulse;
      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.value = 0.22;
      this.reverb.connect(this.reverbGain);
      this.reverbGain.connect(this.master);

      // 6. Bus Musique et 3-Stems Réactifs
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.58;
      this.musicGain.connect(this.master);

      this.stemAmbience = this.ctx.createGain();
      this.stemAmbience.gain.value = 1.0;
      this.stemAmbience.connect(this.musicGain);

      this.stemBattle = this.ctx.createGain();
      this.stemBattle.gain.value = 0.3;
      this.stemBattle.connect(this.musicGain);

      this.stemBoss = this.ctx.createGain();
      this.stemBoss.gain.value = 0.0;
      this.stemBoss.connect(this.musicGain);

      // 7. Bus Effets Sonores (SFX)
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.88;
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

  playNote(freq, dur, type = 'square', gain = 0.2, slide = 0, dest = null, x = null) {
    if (!this.ctx || this.muted) return;
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
        const panVal = clamp((x / W) * 2 - 1, -0.88, 0.88);
        panner.pan.setValueAtTime(panVal, t);
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
        const panVal = clamp((x / W) * 2 - 1, -0.88, 0.88);
        panner.pan.setValueAtTime(panVal, t);
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

  // SFX Positionnels 2D
  shoot(x) {
    if (this.muted) return;
    this.playNote(980, 0.045, 'square', 0.075, -680, this.sfxGain, x);
    this.playNote(260, 0.03, 'triangle', 0.11, -180, this.sfxGain, x);
  },

  enemyShoot(x) {
    if (this.muted) return;
    this.playNote(380, 0.07, 'sawtooth', 0.055, -260, this.sfxGain, x);
    this.noise(0.04, 0.03, 1400, this.sfxGain, x);
  },

  explosion(big, x) {
    if (this.muted) return;
    const dur = big ? 0.75 : 0.32;
    const gain = big ? 0.45 : 0.20;

    this.playNote(big ? 65 : 120, dur, 'sawtooth', gain * 1.1, -45, this.overdrive || this.sfxGain, x);
    this.noise(dur, gain, big ? 550 : 1100, this.reverb || this.sfxGain, x);

    if (big) {
      setTimeout(() => this.noise(0.45, 0.28, 350, this.reverb || this.sfxGain, x), 70);
      setTimeout(() => this.playNote(45, 0.55, 'sine', 0.38, -20, this.sfxGain, x), 120);
    }
  },

  power(x) {
    if (this.muted) return;
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this.playNote(f, 0.07, 'square', 0.09, 0, this.sfxGain, x), i * 55);
    });
  },

  hit(x) {
    if (this.muted) return;
    this.playNote(190, 0.08, 'sawtooth', 0.12, -70, this.sfxGain, x);
  },

  bomb(x) {
    if (this.muted) return;
    this.noise(0.9, 0.5, 380, this.overdrive || this.sfxGain, x);
    this.playNote(58, 0.75, 'sine', 0.45, -25, this.sfxGain, x);
  },

  special(x) {
    if (this.muted) return;
    this.playNote(180, 0.45, 'sawtooth', 0.18, 720, this.sfxGain, x);
    this.noise(0.45, 0.2, 2200, this.sfxGain, x);
  },

  graze(x) {
    if (this.muted) return;
    this.playNote(1450, 0.04, 'sine', 0.085, 200, this.sfxGain, x);
  },

  ui() {
    if (this.muted) return;
    this.playNote(740, 0.04, 'square', 0.06, 0, this.sfxGain);
  },

  // MUSIQUE SYNTHÉTISEUR 3 STEMS RÉACTIFS
  startMusic(world) {
    this.init();
    this.resume();

    if (this.musicTimer) return;
    this.step = 0;

    const scheduleTick = () => {
      if (!this.musicTimer) return;
      this.musicStep(world);

      const isBossActive = world && world.state === 'playing' && (world.boss !== null || (world.spawnQueue && world.spawnQueue.length > 0 && world.spawnQueue[0].type === 'boss'));
      const interval = isBossActive ? 95 : 132;

      this.musicTimer = setTimeout(scheduleTick, interval);
    };

    this.musicTimer = setTimeout(scheduleTick, 10);
  },

  stopMusic() {
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  },

  musicStep(world) {
    if (!this.ctx || this.muted) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    const step = this.step;
    const bar = Math.floor(step / 8) % 4;

    const roots = [110, 87.31, 130.81, 98];
    const root = roots[bar];

    const chords = [
      [110, 130.81, 164.81],
      [87.31, 110, 130.81],
      [130.81, 164.81, 196.00],
      [98, 123.47, 146.83],
    ];

    const isBossActive = world && world.state === 'playing' && (world.boss !== null || (world.spawnQueue && world.spawnQueue.length > 0 && world.spawnQueue[0].type === 'boss'));

    // STEM 1: AMBIANCE
    if (step % 8 === 0) {
      const triad = chords[bar];
      triad.forEach((f) => {
        this.playNote(f * 2, 0.38, 'sawtooth', 0.06, 0, this.stemAmbience);
      });
    }

    // STEM 2: BATTLE
    if (step % 4 === 0) {
      this.playNote(170, 0.12, 'sine', 0.28, -125, this.stemBattle);
      this.playNote(900, 0.02, 'square', 0.08, -700, this.stemBattle);
    } else if (step % 2 === 0) {
      this.noise(0.03, 0.045, 7500, this.stemBattle);
    }

    if (step % 8 === 4) {
      this.noise(0.08, 0.13, 2400, this.stemBattle);
      this.playNote(240, 0.08, 'triangle', 0.14, -130, this.stemBattle);
    }

    const arpPattern = [0, 12, 7, 12, 3, 12, 7, 15];
    const noteOffset = arpPattern[step % arpPattern.length];
    const bassFreq = root * Math.pow(2, noteOffset / 12);
    this.playNote(bassFreq, 0.10, 'triangle', 0.17, -bassFreq * 0.06, this.stemBattle);

    const scale = [0, 3, 5, 7, 10, 12, 14, 15];
    if (step % 2 === 1) {
      const idx = (step * 3 + bar * 2) % scale.length;
      const leadFreq = root * 2 * Math.pow(2, scale[idx] / 12);
      this.playNote(leadFreq, 0.09, 'square', 0.095, 0, this.stemBattle);
    }

    // STEM 3: BOSS CLIMAX
    if (isBossActive) {
      this.playNote(bassFreq / 2, 0.08, 'sawtooth', 0.26, -bassFreq * 0.1, this.stemBoss);

      if (step % 4 === 2) {
        this.playNote(root * 4, 0.06, 'sawtooth', 0.15, 400, this.stemBoss);
      }
    }

    this.step = (step + 1) % 32;
  },

  // Mise à jour continue (ducking et fondu des Stems)
  update(dt, world) {
    if (!this.ctx || !this.duckingFilter) return;

    const t = this.ctx.currentTime;
    const p = world && world.player;
    const isLowHull = world && world.state === 'playing' && p && p.alive && (p.hull / p.maxHull < 0.25);
    const isPaused = world && world.state === 'paused';
    const targetFreq = (isLowHull || isPaused) ? 550 : 20000;

    this.duckingFilter.frequency.setTargetAtTime(targetFreq, t, 0.15);

    // Fondu enchaîné dynamique des Stems de Musique
    if (this.stemBattle && this.stemBoss) {
      const isBossActive = world && world.state === 'playing' && (world.boss !== null || (world.spawnQueue && world.spawnQueue.length > 0 && world.spawnQueue[0].type === 'boss'));
      const hasEnemies = world && world.state === 'playing' && world.enemies && world.enemies.length > 0;

      const targetBattle = isBossActive ? 0.35 : (hasEnemies ? 0.95 : 0.4);
      const targetBoss = isBossActive ? 1.0 : 0.0;

      this.stemBattle.gain.setTargetAtTime(targetBattle, t, 0.22);
      this.stemBoss.gain.setTargetAtTime(targetBoss, t, 0.22);
    }
  },
};
