#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Générateur Nébuleuse Protocol IV v4.3 — Premium Web Audio Engine & Graphismes

Applique par-dessus nebuleuse-v4.2.html :
  - Fond spatial dynamique avec nébuleuses procédurales animées et planètes en parallaxe
  - Ondes de choc visuelles (Shockwaves Canvas) avec franges chromatiques pour tous les ennemis lourds et boss
  - Moteur Audio Premium (Web Audio API) :
      • Spatialisation Stéréo 2D Positionnelle (StereoPannerNode pour tirs, explosions et frôlements)
      • Réverbération Cosmique Spatiale (Convoluteur ConvolverNode avec wet/dry mixing)
      • Compresseur dynamique Arcade & Overdrive WaveShaper (Saturation analogique studio)
      • Musique 3-Couches Interactive (Stems Ambiance / Combat / Boss avec fondu enchaîné dynamique)
      • Filtre Passe-Bas "Ducking" (Lowpass Sweep + battement lors des pauses et santé critique <25%)
      • Déverrouillage automatique du contexte audio au premier clic/touche

Utilisation :
    python3 build_v43.py nebuleuse-v4.2.html

Produit :
    nebuleuse-v4.3.html
"""

from pathlib import Path
import sys


def replace_once(text, old, new, label):
    count = text.count(old)

    if count == 0:
        raise RuntimeError(
            f"\nModification impossible : {label}\n"
            "Le bloc recherché n'a pas été trouvé.\n"
            "Vérifie que le fichier source correspond bien au code attendu."
        )

    if count > 1:
        raise RuntimeError(
            f"\nModification ambiguë : {label}\n"
            f"Le bloc recherché apparaît {count} fois."
        )

    return text.replace(old, new, 1)


PATCH_V43 = r"""
      // ============================================================
      // PATCH NÉBULEUSE PROTOCOL IV.3
      // Graphismes Parallaxe · Shockwaves · MOTEUR AUDIO PREMIUM 2D & STEMS
      // ============================================================
      (() => {
        // --- 1. FONDS & PLANÈTES PARALLAXE ---
        let planets = [];
        let planetTimer = 6;

        function createPlanet() {
          const types = [
            { c1: '#38bdf8', c2: '#1e3a8a', ring: true, crated: false, aura: 'rgba(56, 189, 248, 0.25)' },
            { c1: '#f43f5e', c2: '#881337', ring: false, crated: true, aura: 'rgba(244, 63, 94, 0.22)' },
            { c1: '#a855f7', c2: '#4c1d95', ring: true, crated: false, aura: 'rgba(168, 85, 247, 0.28)' },
            { c1: '#fbbf24', c2: '#78350f', ring: false, crated: true, aura: 'rgba(251, 191, 36, 0.20)' },
            { c1: '#34d399', c2: '#064e3b', ring: false, crated: false, aura: 'rgba(52, 211, 153, 0.25)' }
          ];

          const type = pick(types);
          const r = rand(36, 75);

          planets.push({
            x: rand(r + 30, Math.max(r + 31, W - r - 30)),
            y: -r - 50,
            r,
            vy: rand(12, 26),
            type,
            rot: rand(0, TAU),
            craters: [
              { x: rand(-0.4, 0.3), y: rand(-0.4, 0.4), r: rand(0.12, 0.25) },
              { x: rand(-0.3, 0.4), y: rand(-0.3, 0.3), r: rand(0.1, 0.2) }
            ]
          });
        }

        const baseResetGame = resetGame;
        resetGame = function v43ResetGame() {
          baseResetGame();
          planets = [];
          planetTimer = 4;
        };

        const baseUpdateBackground = updateBackground;
        updateBackground = function v43UpdateBackground(dt) {
          baseUpdateBackground(dt);

          const speedFactor = state === 'playing' ? 1 : 0.35;

          planetTimer -= dt * speedFactor;
          if (planetTimer <= 0) {
            createPlanet();
            planetTimer = rand(20, 38);
          }

          for (let i = planets.length - 1; i >= 0; i--) {
            const p = planets[i];
            p.y += p.vy * dt * speedFactor;

            if (p.y - p.r > H + 100) {
              planets.splice(i, 1);
            }
          }
        };

        function drawNebulae() {
          const t = globalTime * 0.15;
          const nebColors = [
            { x: W * 0.25 + Math.sin(t) * 40, y: H * 0.3 + Math.cos(t * 0.8) * 50, r: Math.min(W, H) * 0.48, c: 'rgba(99, 102, 241, 0.08)' },
            { x: W * 0.75 + Math.cos(t * 1.2) * 50, y: H * 0.65 + Math.sin(t * 0.7) * 40, r: Math.min(W, H) * 0.55, c: 'rgba(236, 72, 153, 0.07)' },
            { x: W * 0.5 + Math.sin(t * 0.7) * 60, y: H * 0.85 + Math.cos(t * 1.1) * 30, r: Math.min(W, H) * 0.42, c: 'rgba(14, 165, 233, 0.08)' }
          ];

          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          for (const n of nebColors) {
            const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
            g.addColorStop(0, n.c);
            g.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r, 0, TAU);
            ctx.fill();
          }
          ctx.restore();
        }

        function drawPlanets() {
          for (const p of planets) {
            ctx.save();

            const auraG = ctx.createRadialGradient(p.x, p.y, p.r * 0.85, p.x, p.y, p.r * 1.3);
            auraG.addColorStop(0, p.type.aura);
            auraG.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = auraG;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * 1.3, 0, TAU);
            ctx.fill();

            if (p.type.ring) {
              ctx.save();
              ctx.translate(p.x, p.y);
              ctx.rotate(0.38);
              ctx.scale(1, 0.32);
              ctx.strokeStyle = p.type.aura;
              ctx.lineWidth = 12;
              ctx.beginPath();
              ctx.arc(0, 0, p.r * 1.7, Math.PI, TAU);
              ctx.stroke();
              ctx.restore();
            }

            const g = ctx.createRadialGradient(
              p.x - p.r * 0.35,
              p.y - p.r * 0.35,
              p.r * 0.05,
              p.x,
              p.y,
              p.r
            );
            g.addColorStop(0, p.type.c1);
            g.addColorStop(0.65, p.type.c2);
            g.addColorStop(1, '#020617');

            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, TAU);
            ctx.fill();

            if (p.type.crated) {
              ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
              for (const c of p.craters) {
                const cx = p.x + c.x * p.r;
                const cy = p.y + c.y * p.r;
                const cr = c.r * p.r;
                ctx.beginPath();
                ctx.arc(cx, cy, cr, 0, TAU);
                ctx.fill();
              }
            }

            if (p.type.ring) {
              ctx.save();
              ctx.translate(p.x, p.y);
              ctx.rotate(0.38);
              ctx.scale(1, 0.32);
              ctx.strokeStyle = p.type.c1;
              ctx.lineWidth = 8;
              ctx.globalAlpha = 0.85;
              ctx.beginPath();
              ctx.arc(0, 0, p.r * 1.7, 0, Math.PI);
              ctx.stroke();
              ctx.restore();
            }

            ctx.restore();
          }
        }

        const baseDrawStars = drawStars;
        drawStars = function v43DrawStars() {
          drawNebulae();
          drawPlanets();
          baseDrawStars();
        };

        // --- 2. SHOCKWAVES CANVAS CHROMATIQUES & EXPANSION ---
        drawShockwaves = function v43DrawShockwaves() {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';

          for (const s of shockwaves) {
            const a = Math.max(0, s.life / s.maxLife);
            const r = s.r;
            const thick = s.thick || 10;
            const primaryColor = s.color || '#38bdf8';
            const secondaryColor = s.color2 || '#ec4899';

            ctx.strokeStyle = secondaryColor;
            ctx.globalAlpha = a * 0.55;
            ctx.lineWidth = thick * a + 4;
            ctx.beginPath();
            ctx.arc(s.x, s.y, r * 1.04, 0, TAU);
            ctx.stroke();

            ctx.strokeStyle = primaryColor;
            ctx.globalAlpha = a * 0.85;
            ctx.lineWidth = thick * a + 2;
            ctx.beginPath();
            ctx.arc(s.x, s.y, r, 0, TAU);
            ctx.stroke();

            ctx.strokeStyle = '#ffffff';
            ctx.globalAlpha = a * 0.95;
            ctx.lineWidth = Math.max(1.5, thick * a * 0.4);
            ctx.beginPath();
            ctx.arc(s.x, s.y, r * 0.97, 0, TAU);
            ctx.stroke();

            const grad = ctx.createRadialGradient(
              s.x, s.y, Math.max(0, r * 0.7),
              s.x, s.y, r * 1.15
            );
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(0.75, primaryColor);
            grad.addColorStop(1, 'rgba(0,0,0,0)');

            ctx.fillStyle = grad;
            ctx.globalAlpha = a * 0.22;
            ctx.beginPath();
            ctx.arc(s.x, s.y, r * 1.15, 0, TAU);
            ctx.fill();
          }

          ctx.restore();
        };

        const baseKillEnemy = updateEnemies;
        updateEnemies = function v43UpdateEnemies(dt) {
          const heavyTypes = new Set(['tank', 'elite', 'turret', 'miniboss', 'boss']);

          for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            if (e.hp <= 0 && heavyTypes.has(e.type) && !e._shocked) {
              e._shocked = true;

              const isBoss = e.type === 'boss';
              const isMini = e.type === 'miniboss';
              const maxR = isBoss ? Math.max(W, H) * 0.75 : isMini ? Math.max(W, H) * 0.45 : Math.min(W, H) * 0.28;
              const dur = isBoss ? 0.85 : isMini ? 0.6 : 0.42;

              shockwaves.push({
                x: e.x,
                y: e.y,
                r: 15,
                max: maxR,
                life: dur,
                maxLife: dur,
                color: isBoss ? '#f43f5e' : isMini ? '#a855f7' : e.type === 'tank' ? '#38bdf8' : '#fbbf24',
                color2: isBoss ? '#fbbf24' : '#ec4899',
                thick: isBoss ? 14 : isMini ? 10 : 7
              });

              for (let p = 0; p < (isBoss ? 28 : 16); p++) {
                const ang = (p / (isBoss ? 28 : 16)) * TAU;
                const spd = rand(140, 320);
                addParticle(
                  e.x, e.y,
                  Math.cos(ang) * spd,
                  Math.sin(ang) * spd,
                  rand(0.25, 0.45),
                  rand(2, 4),
                  isBoss ? '#fbbf24' : '#67e8f9'
                );
              }
            }
          }

          baseKillEnemy(dt);
        };

        // --- 3. MOTEUR AUDIO PREMIUM (SPATIAL 2D · CONVOLUTER REVERB · STEMS & DUCKING) ---
        
        const unlockAudioContext = () => {
          if (AudioSys.ctx) {
            if (AudioSys.ctx.state === 'suspended') {
              AudioSys.ctx.resume().catch(() => {});
            }
          } else {
            AudioSys.init();
          }
        };
        window.addEventListener('pointerdown', unlockAudioContext, { passive: true });
        window.addEventListener('keydown', unlockAudioContext, { passive: true });

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

        AudioSys.init = function v43PremiumAudioInit() {
          if (this.ctx) return;
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;

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
          const length = rate * 1.4;
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
        };

        // Extension de playNote avec Positional Stereo Panner 2D
        AudioSys.playNote = function(freq, dur, type = 'square', gain = 0.2, slide = 0, dest, x = null) {
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

          if (x !== null && typeof x === 'number' && this.ctx.createStereoPanner) {
            const panner = this.ctx.createStereoPanner();
            const panVal = clamp((x / W) * 2 - 1, -0.88, 0.88);
            panner.pan.setValueAtTime(panVal, t);
            g.connect(panner);
            panner.connect(dest || this.sfxGain);
          } else {
            g.connect(dest || this.sfxGain);
          }

          o.start(t);
          o.stop(t + dur + 0.03);
        };

        // Extension de noise avec Positional Stereo Panner 2D
        AudioSys.noise = function(dur, gain = 0.3, filterFreq = 1000, dest, x = null) {
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

          if (x !== null && typeof x === 'number' && this.ctx.createStereoPanner) {
            const panner = this.ctx.createStereoPanner();
            const panVal = clamp((x / W) * 2 - 1, -0.88, 0.88);
            panner.pan.setValueAtTime(panVal, t);
            g.connect(panner);
            panner.connect(dest || this.sfxGain);
          } else {
            g.connect(dest || this.sfxGain);
          }

          src.start(t);
          src.stop(t + dur + 0.03);
        };

        // SFX Positionnels 2D
        AudioSys.shoot = function(x) {
          if (this.muted || !this.ctx) return;
          const px = x !== undefined ? x : (player ? player.x : W / 2);
          this.playNote(980, 0.045, 'square', 0.075, -680, this.sfxGain, px);
          this.playNote(260, 0.03, 'triangle', 0.11, -180, this.sfxGain, px);
        };

        AudioSys.enemyShoot = function(x) {
          if (this.muted || !this.ctx) return;
          this.playNote(380, 0.07, 'sawtooth', 0.055, -260, this.sfxGain, x);
          this.noise(0.04, 0.03, 1400, this.sfxGain, x);
        };

        AudioSys.explosion = function(big, x) {
          if (this.muted || !this.ctx) return;
          const dur = big ? 0.75 : 0.32;
          const gain = big ? 0.45 : 0.20;

          // Route dans l'Overdrive et la Réverbération Cosmique
          this.playNote(big ? 65 : 120, dur, 'sawtooth', gain * 1.1, -45, this.overdrive || this.sfxGain, x);
          this.noise(dur, gain, big ? 550 : 1100, this.reverb || this.sfxGain, x);

          if (big) {
            setTimeout(() => this.noise(0.45, 0.28, 350, this.reverb || this.sfxGain, x), 70);
            setTimeout(() => this.playNote(45, 0.55, 'sine', 0.38, -20, this.sfxGain, x), 120);
          }
        };

        AudioSys.graze = function(x) {
          if (this.muted || !this.ctx) return;
          this.playNote(1450, 0.04, 'sine', 0.085, 200, this.sfxGain, x);
        };

        // --- MUSIQUE SYNTHESIZER 3 STEMS RÉACTIFS (AMBIENCE / BATTLE / BOSS CLIMAX) ---

        AudioSys.startMusic = function v43StartMusicPremium() {
          AudioSys.init();
          AudioSys.resume();

          if (this.musicTimer) return;
          this.step = 0;

          const scheduleTick = () => {
            if (!this.musicTimer) return;
            this.musicStep();

            const isBossActive = state === 'playing' && (boss !== null || (spawnQueue.length > 0 && spawnQueue[0].type === 'boss'));
            const interval = isBossActive ? 95 : 132;

            this.musicTimer = setTimeout(scheduleTick, interval);
          };

          this.musicTimer = setTimeout(scheduleTick, 10);
        };

        AudioSys.stopMusic = function v43StopMusicPremium() {
          if (this.musicTimer) {
            clearTimeout(this.musicTimer);
            this.musicTimer = null;
          }
        };

        AudioSys.musicStep = function v43MusicStepPremium() {
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
            [98, 123.47, 146.83]
          ];

          const isBossActive = state === 'playing' && (boss !== null || (spawnQueue.length > 0 && spawnQueue[0].type === 'boss'));

          // STEM 1: AMBIANCE (Nappes et Pistes d'arrière-plan)
          if (step % 8 === 0) {
            const triad = chords[bar];
            triad.forEach(f => {
              this.playNote(f * 2, 0.38, 'sawtooth', 0.06, 0, this.stemAmbience);
            });
          }

          // STEM 2: BATTLE (Rythmique Percussions + Basse Double-Stroke)
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

          // STEM 3: BOSS CLIMAX (Hard-Synth Heavy Bass + Alarme Urgence)
          if (isBossActive) {
            const bossBassType = 'sawtooth';
            this.playNote(bassFreq / 2, 0.08, bossBassType, 0.26, -bassFreq * 0.1, this.stemBoss);

            if (step % 4 === 2) {
              this.playNote(root * 4, 0.06, 'sawtooth', 0.15, 400, this.stemBoss);
            }
          }

          this.step = (step + 1) % 32;
        };

        // --- 4. GESTION DYNAMIQUE DU DUCKING PASSE-BAS & DE LA CROSS-FADING DES STEMS ---
        const baseUpdate = update;
        update = function v43PremiumUpdate(dt) {
          baseUpdate(dt);

          if (AudioSys.ctx && AudioSys.duckingFilter) {
            const t = AudioSys.ctx.currentTime;
            const isLowHull = state === 'playing' && player && player.alive && (player.hull / player.maxHull < 0.25);
            const isPaused = state === 'paused';
            const targetFreq = (isLowHull || isPaused) ? 550 : 20000;

            AudioSys.duckingFilter.frequency.setTargetAtTime(targetFreq, t, 0.15);

            // Fondu enchaîné dynamique des Stems de Musique
            if (AudioSys.stemBattle && AudioSys.stemBoss) {
              const isBossActive = state === 'playing' && (boss !== null || (spawnQueue.length > 0 && spawnQueue[0].type === 'boss'));
              const hasEnemies = state === 'playing' && enemies.length > 0;

              const targetBattle = isBossActive ? 0.35 : (hasEnemies ? 0.95 : 0.4);
              const targetBoss = isBossActive ? 1.0 : 0.0;

              AudioSys.stemBattle.gain.setTargetAtTime(targetBattle, t, 0.22);
              AudioSys.stemBoss.gain.setTargetAtTime(targetBoss, t, 0.22);
            }
          }
        };

      })();
"""


def main():
    if len(sys.argv) < 2:
        print("Utilisation : python3 build_v43.py nebuleuse-v4.2.html")
        raise SystemExit(1)

    source_path = Path(sys.argv[1])

    if not source_path.exists():
        print(f"Fichier introuvable : {source_path}")
        raise SystemExit(1)

    html = source_path.read_text(encoding="utf-8")

    anchor = '''      resize();
      initStars();
      refreshSoundButtons();
      refreshMenu();'''

    replacement = (
        '''      resize();
      initStars();
      refreshSoundButtons();
      refreshMenu();
'''
        + PATCH_V43
    )

    html = replace_once(html, anchor, replacement, "insertion du patch v4.3")

    html = html.replace(
        "<title>Nébuleuse Protocol IV — v4.2</title>",
        "<title>Nébuleuse Protocol IV — v4.3</title>",
        1,
    )

    output_path = source_path.with_name("nebuleuse-v4.3.html")
    output_path.write_text(html, encoding="utf-8")

    print()
    print("✅ Nébuleuse Protocol IV v4.3 généré avec succès.")
    print(f"📄 Fichier : {output_path.resolve()}")
    print()
    print("Améliorations Premium intégrées :")
    print("  • Nébuleuses procédurales animées et dérive de planètes en parallaxe")
    print("  • Ondes de choc visuelles chromatiques d'expansion rapide (Heavy, Boss & Bombes)")
    print("  • Spatialisation Stéréo 2D Positionnelle (StereoPannerNode pour tous les SFX)")
    print("  • Réverbération Cosmique Spatiale (ConvolverNode)")
    print("  • Compresseur de Mastering Arcade & WaveShaper Overdrive")
    print("  • Musique 3-Couches Interactive (Stems Ambiance / Combat / Boss)")
    print("  • Filtre Passe-Bas Ducking (Lowpass Sweep lors des pauses & santé critique <25%)")
    print()


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(error)
        raise SystemExit(1)
