/* Original, dependency-free adaptive score. The composition PRNG never touches
 * the game's random stream. All voices, including ambience, have finite lives. */
(function (root) {
  'use strict';
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  const WORLDS = [
    { name: 'Poussière d’étoiles', root: 45, scale: [0, 2, 3, 5, 7, 9, 10] },
    { name: 'Cendres solaires', root: 38, scale: [0, 1, 3, 5, 7, 8, 10] },
    { name: 'Bioluminescence', root: 43, scale: [0, 2, 3, 5, 7, 9, 10] },
    { name: 'Mémoire de glace', root: 41, scale: [0, 2, 4, 6, 7, 9, 11] },
    { name: 'Au-delà du signal', root: 40, scale: [0, 2, 3, 5, 7, 8, 10] }
  ];
  const FORMS = ['Ouverture', 'Dérive', 'Élan', 'Respiration'];
  // Two answering phrases; rests matter as much as the notes.
  const MOTIFS = [[0, null, 4, 6, null, 4, 2, null], [2, 4, null, 1, 0, null, null, null],
    [4, null, 6, 8, 6, null, 4, null], [2, null, 1, null, 0, null, null, null]];
  class Score {
    constructor(ctx, destination) {
      this.ctx = ctx;
      this.input = ctx.createGain();
      this.input.gain.value = 0;
      this.input.connect(destination);
      this.filter = ctx.createBiquadFilter();
      this.filter.type = 'lowpass'; this.filter.frequency.value = 3000;
      this.filter.Q.value = 0.4; this.filter.connect(this.input);
      this.delay = ctx.createDelay(1);
      this.delay.delayTime.value = 0.375;
      this.feedback = ctx.createGain(); this.feedback.gain.value = 0.24;
      this.wet = ctx.createGain(); this.wet.gain.value = 0.22;
      this.delay.connect(this.feedback); this.feedback.connect(this.delay);
      this.delay.connect(this.wet); this.wet.connect(this.filter);
      this.voices = new Set();
      this.seed = 0x4e503418; this.sfxSeed = 0x734f12;
      this.step = 0; this.bar = 0; this.bpm = 84; this.next = 0;
      this.running = false; this.active = false; this.level = -1;
      this.scene = {}; this.pending = {}; this.energy = 0; this.lastShot = -1;
      this.scheduled = 0;
      // Shared deterministic noise; neither allocation nor randomness per hit.
      this.noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.4), ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      let seed = 9187;
      for (let i = 0; i < data.length; i++) {
        seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
        data[i] = (seed >>> 0) / 2147483648 - 1;
      }
    }
    random(sfx = false) {
      const key = sfx ? 'sfxSeed' : 'seed';
      let s = this[key]; s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      this[key] = s >>> 0;
      return this[key] / 4294967296;
    }
    setScene(scene) { this.pending = { ...scene }; }
    setActive(active, quiet = false) {
      this.active = !!active;
      const level = active ? (quiet ? 1.05 : 3.0) : 0;
      if (level !== this.level) {
        this.input.gain.setTargetAtTime(level, this.ctx.currentTime, 0.35);
        this.level = level;
      }
      if (active && !this.running) {
        this.running = true; this.next = this.ctx.currentTime + 0.04;
      } else if (!active) this.running = false;
    }
    note(midi, time, duration, gain, type = 'sine', pan = 0, echo = false, dest, slide) {
      if (this.voices.size >= 64) return;
      const c = this.ctx, src = c.createOscillator(), env = c.createGain();
      src.type = type; src.frequency.setValueAtTime(hz(midi), time);
      if (slide != null) src.frequency.exponentialRampToValueAtTime(hz(slide), time + duration);
      const attack = type === 'triangle' && duration > 1 ? 0.22 : 0.008;
      env.gain.setValueAtTime(0, time);
      env.gain.linearRampToValueAtTime(gain, time + Math.min(attack, duration * 0.2));
      env.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      src.connect(env);
      const nodes = [src, env];
      let out = env;
      if (c.createStereoPanner) {
        const p = c.createStereoPanner(); p.pan.value = clamp(pan, -0.8, 0.8);
        env.connect(p); nodes.push(p); out = p;
      }
      out.connect(dest || this.filter);
      if (echo && !dest) out.connect(this.delay);
      this.track(src, nodes);
      src.start(time); src.stop(time + duration + 0.03);
    }
    hiss(time, duration, gain, cutoff, dest) {
      if (this.voices.size >= 64) return;
      const c = this.ctx, src = c.createBufferSource(), env = c.createGain(), f = c.createBiquadFilter();
      src.buffer = this.noise; f.type = 'highpass'; f.frequency.value = cutoff;
      env.gain.setValueAtTime(gain, time);
      env.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      src.connect(f); f.connect(env); env.connect(dest || this.filter);
      this.track(src, [src, f, env]); src.start(time); src.stop(time + duration + 0.02);
    }
    track(src, nodes) {
      this.voices.add(src); this.scheduled++;
      src.onended = () => { nodes.forEach(n => n.disconnect()); this.voices.delete(src); };
    }
    boundary() {
      this.scene = { ...this.pending };
      const s = this.scene;
      this.world = WORLDS[((s.sector || 0) % WORLDS.length + WORLDS.length) % WORLDS.length];
      this.form = Math.floor(this.bar / 4) % FORMS.length;
      this.energy = s.rest || !s.playing ? 0 : s.boss ? 1 : clamp(s.threat || 0, 0.15, 0.8);
      this.bpm = s.boss ? 116 : s.rest ? 74 : s.playing ? 88 + Math.round(this.energy * 20) : 76;
      this.filter.frequency.setTargetAtTime(1600 + this.energy * 4400, this.ctx.currentTime, 0.8);
      this.delay.delayTime.setTargetAtTime(60 / this.bpm * 0.75, this.ctx.currentTime, 0.2);
    }
    compose(time) {
      const step = this.step % 16;
      if (step === 0) this.boundary();
      const w = this.world, e = this.energy, beat = 60 / this.bpm;
      const degree = n => w.root + w.scale[((n % 7) + 7) % 7] + 12 * Math.floor(n / 7);
      const chord = [0, 5, 2, 4][this.bar % 4];
      const breath = this.form === 3 && !this.scene.boss;
      if (step === 0) {
        [0, 2, 4, 6].forEach((d, i) => this.note(degree(chord + d) + 12, time + i * 0.012,
          beat * 4.6, 0.038, 'triangle', (i - 1.5) * 0.36));
        this.note(degree(chord) - 12, time, beat * 3.6, 0.12);
      }
      if (e > 0.2 && !breath && [0, 6, 8, 14].includes(step)) {
        this.note(degree(chord) - (step === 14 ? 0 : 12), time, beat * 0.65, 0.11, 'triangle');
      }
      // An eight-bar question / answer. Some bars intentionally omit the lead.
      if (step % 2 === 0 && !(breath && this.bar % 2)) {
        const motif = MOTIFS[(this.bar + Math.floor(this.bar / 16)) % MOTIFS.length];
        const n = motif[step / 2];
        if (n != null && (this.form !== 0 || step % 4 === 0)) {
          const octave = this.form === 2 ? 24 : 12;
          this.note(degree(n) + octave, time, beat * (breath ? 2.2 : 1.1),
            breath ? 0.045 : 0.065, 'sine', this.random() * 0.7 - 0.35, true);
        }
      }
      if (e > 0.35 && !breath) {
        if ((e > 0.8 ? [0, 4, 8, 12] : [0, 8]).includes(step))
          this.note(48, time, 0.2, 0.25, 'sine', 0, false, null, 25);
        if (step === 4 || step === 12) this.hiss(time, 0.1, 0.055, 1700);
        if (step % (e > 0.8 ? 2 : 4) === 2 || (e > 0.8 && step % 2 === 1))
          this.hiss(time, 0.03, 0.017 + this.random() * 0.014, 6800);
      }
      if (this.form === 2 && e > 0.5 && step % 2 === 1)
        this.note(degree(chord + [0, 2, 4, 6][Math.floor(step / 4)]) + 24, time,
          beat * 0.38, 0.022, 'triangle', step % 4 === 1 ? -0.55 : 0.55, true);
      this.step++;
      if (this.step % 16 === 0) this.bar++;
      return beat / 4;
    }
    tick() {
      if (!this.running || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      // Do not burst hundreds of missed beats after tab suspension.
      if (this.next < now - 0.25) this.next = now + 0.025;
      let budget = 4;
      while (this.next < now + 0.13 && budget-- > 0) this.next += this.compose(this.next);
    }
    shot(ship, dest, x = 0) {
      const now = this.ctx.currentTime;
      if (this.ctx.state !== 'running' || now - this.lastShot < 0.075) return;
      this.lastShot = now;
      const pitches = [78, 87, 54, 94], pitch = pitches[clamp(ship | 0, 0, 3)] + this.random(true) * 0.9;
      this.note(pitch, now, ship === 2 ? 0.15 : 0.085, ship === 2 ? 0.065 : 0.038,
        ship === 1 ? 'triangle' : 'sine', x, false, dest, pitch - (ship === 3 ? 5 : 17));
      if (ship === 2) this.hiss(now, 0.04, 0.015, 2100, dest);
    }
    info() {
      return { title: this.world ? this.world.name : WORLDS[0].name,
        section: this.scene.boss ? 'Confrontation' : this.scene.rest ? 'Accalmie' : FORMS[this.form || 0],
        bar: this.bar, bpm: this.bpm, energy: this.energy, voices: this.voices.size,
        scheduled: this.scheduled, active: this.active };
    }
    dispose() {
      this.setActive(false);
      this.voices.forEach(s => { try { s.stop(); } catch (_) {} });
      [this.input, this.filter, this.delay, this.feedback, this.wet].forEach(n => n.disconnect());
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { Score, WORLDS, FORMS };
  else root.NebulaScore = Score;
})(typeof window !== 'undefined' ? window : globalThis);
