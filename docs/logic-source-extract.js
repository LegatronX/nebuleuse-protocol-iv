// ============================================================
// Extrait de la logique du jeu — nebuleuse-v4.7.html
// Catalogue exhaustif de la logique du monolithe (hors rendu)
// Note : ceci est un EXTRAIT — pour lecture et référence.
// ============================================================

function _extractedLogicScope() {
    (() => {
      'use strict';

      const $ = (id) => document.getElementById(id);

      const canvas = $('game');
      const ctx = canvas.getContext('2d', { alpha: false });
      const bg = document.createElement('canvas');
      const bctx = bg.getContext('2d');

      const TAU = Math.PI * 2;
      const rand = (a, b) => a + Math.random() * (b - a);
      const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
      const pick = (a) => a[Math.floor(Math.random() * a.length)];
      const dist2 = (a, b) => {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return dx * dx + dy * dy;
      };

      function loadMeta() {
        const defaults = {
          nanites: 0,
          ship: 0,
          diff: 'normal',
          talents: {
            armor: 0,
            regen: 0,
            weapon: 0,
            nova: 0,
            bombs: 0,
            credit: 0,
            life: 0
          }
        };

        try {
          const raw = JSON.parse(localStorage.getItem('nebula4_meta') || '{}');
          const talents = Object.assign({}, defaults.talents, raw.talents || {});
          return Object.assign({}, defaults, raw, { talents });
        } catch (e) {
          return defaults;
        }
      }

      function saveMeta() {
        try {
          localStorage.setItem('nebula4_meta', JSON.stringify(meta));
        } catch (e) {}
      }

      function loadBest() {
        try {
          return parseInt(localStorage.getItem('nebula4_best') || '0', 10) || 0;
        } catch (e) {
          return 0;
        }
      }

      function saveBest(v) {
        try {
          localStorage.setItem('nebula4_best', String(v));
        } catch (e) {}
      }

      function loadMuted() {
        try {
          return localStorage.getItem('nebula4_mute') === '1';
        } catch (e) {
          return false;
        }
      }

      function saveMuted(m) {
        try {
          localStorage.setItem('nebula4_mute', m ? '1' : '0');
        } catch (e) {}
      }

      function formatTime(t) {
        const s = Math.floor(t || 0);
        const m = Math.floor(s / 60);
        const r = s % 60;
        return `${m}:${String(r).padStart(2, '0')}`;
      }


      function isHidden(el) {
        return el.classList.contains('hidden');
      }

      function vibrate(pattern) {
        if (AudioSys.muted) return;
        if (!navigator.vibrate) return;

        try {
          navigator.vibrate(pattern);
        } catch (e) {}
      }

      function show(el) {
        if (el) el.classList.remove('hidden');
      }

      function hide(el) {
        if (el) el.classList.add('hidden');
      }

      let W = 0;
      let H = 0;
      let DPR = 1;

      let meta = loadMeta();
      let best = loadBest();
      let difficulty = meta.diff || 'normal';
      let controlSensitivity = meta.sensitivity || 1.35;

      let state = 'menu';
      let mode = 'campagne';
      let lastMode = 'campagne';
      let sessionBest = 0;

      let globalTime = 0;
      let gameTime = 0;
      let survivalTime = 0;

      let score = 0;
      let wave = 1;
      let multiplier = 1;
      let multTime = 0;
      let slowTime = 0;
      let shake = 0;
      let hitFlash = 0;

      let combo = 0;
      let comboTime = 0;
      let gameKills = 0;
      let runBossKills = 0;
      let finalDefeated = false;
      let finalBonusAwarded = false;

      let grazes = 0;
      let grazeChain = 0;
      let grazeChainTime = 0;

      let runNanitesPaid = 0;
      let hudTimer = 0;
      let countdownToken = 0;

      let hitStopTimer = 0;

      let camPunchMag = 0;
      let camPunchTime = 0;
      let camPunchDuration = 0.001;

      let maxCombo = 0;
      let bestGrazeChain = 0;

      let bossIntroTimer = 0;
      let bossIntroName = '';

      let lastSectorIndex = -1;
      let activeMutator = null;
      let dailyMutatorId = null;



      const reducedMotion = window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

      const lowQuality =
        reducedMotion ||
        (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
        (navigator.deviceMemory && navigator.deviceMemory <= 4);

      document.body.classList.toggle('low-quality', !!lowQuality);

      let player = null;
      let enemies = [];
      let pBullets = [];
      let eBullets = [];
      let particles = [];
      let powerups = [];
      let texts = [];
      let shockwaves = [];
      let stars = [];
      let beams = [];

      let spawnQueue = [];
      let spawnTimer = 0;
      let waveBanner = '';
      let waveBannerTime = 0;
      let boss = null;

      let activePointer = null;
      let lastPX = 0;
      let lastPY = 0;

      const keys = {};

      const SHIPS = [
        {
          name: 'PULSE',
          desc: 'Vaisseau équilibré. Polyvalent, fiable, sans faiblesse majeure.',
          speed: 380,
          hull: 100,
          shield: 100,
          bombs: 3,
          fireMul: 1,
          weapon: 1,
          colors: ['#dffcff', '#2b7fff']
        },
        {
          name: 'VECTOR',
          desc: 'Intercepteur très rapide, mais coque fragile. Tir plus rapide.',
          speed: 470,
          hull: 78,
          shield: 82,
          bombs: 2,
          fireMul: 0.84,
          weapon: 1,
          colors: ['#fae8ff', '#a21caf']
        },
        {
          name: 'TITAN',
          desc: 'Blindé lourd, plus lent, mais très résistant et déjà armé.',
          speed: 310,
          hull: 145,
          shield: 130,
          bombs: 4,
          fireMul: 1.22,
          weapon: 2,
          colors: ['#d1fae5', '#047857']
        }
      ];

      const DIFF = {
        normal: { hp: 1, bullet: 1, fire: 1, score: 1, playerHull: 1 },
        cauchemar: { hp: 1.6, bullet: 1.18, fire: 0.78, score: 1.6, playerHull: 0.82 }
      };

      const TALENTS = [
        { key: 'armor', name: 'Blindage nanite', desc: '+12 coque max par niveau', max: 5, cost: (l) => 40 + l * 30 },
        { key: 'regen', name: 'Régénération', desc: '+2 bouclier/s par niveau', max: 4, cost: (l) => 45 + l * 35 },
        { key: 'weapon', name: 'Armement initial', desc: '+1 arme de départ par niveau', max: 2, cost: (l) => 90 + l * 80 },
        { key: 'nova', name: 'Réacteur NOVA', desc: '+2 énergie/s par niveau', max: 4, cost: (l) => 40 + l * 30 },
        { key: 'bombs', name: 'Soute à bombes', desc: '+1 bombe par niveau', max: 2, cost: (l) => 70 + l * 60 },
        { key: 'credit', name: 'Extracteur de nanites', desc: '+10% nanites gagnés par niveau', max: 5, cost: (l) => 50 + l * 40 },
        { key: 'life', name: 'Noyau de survie', desc: '+1 vie', max: 1, cost: () => 180 }
      ];

      const scoreEl = $('score');
      const highEl = $('high');
      const waveEl = $('wave');
      const livesEl = $('lives');
      const comboEl = $('combo');
      const grazeDisplay = $('grazeDisplay');
      const countdownEl = $('countdown');
      const hullFill = $('hullFill');
      const shieldFill = $('shieldFill');
      const energyFill = $('energyFill');
      const weaponEl = $('weapon');
      const bombsEl = $('bombs');
      const multiplierEl = $('multiplier');
      const bossHud = $('bossHud');
      const bossLabel = $('bossLabel');
      const bossBar = $('bossBar');

      const menuOverlay = $('menu');
      const menuHigh = $('menuHigh');
      const menuNanites = $('menuNanites');
      const modeCampagne = $('modeCampagne');
      const modeSurvie = $('modeSurvie');
      const labBtn = $('labBtn');
      const shipBtn = $('shipBtn');
      const difficultyBtn = $('difficultyBtn');

      const labOverlay = $('labOverlay');
      const labNanites = $('labNanites');
      const labList = $('labList');
      const closeLabBtn = $('closeLabBtn');

      const shipOverlay = $('shipOverlay');
      const shipList = $('shipList');
      const closeShipBtn = $('closeShipBtn');

      const pauseOverlay = $('pauseOverlay');
      const resumeBtn = $('resumeBtn');
      const pauseRestartBtn = $('pauseRestartBtn');
      const pauseMenuBtn = $('pauseMenuBtn');
      const pauseBtn = $('pauseBtn');

      const gameoverOverlay = $('gameoverOverlay');
      const endTitle = $('endTitle');
      const finalScore = $('finalScore');
      const finalStats = $('finalStats');
      const finalHigh = $('finalHigh');
      const earnedNanites = $('earnedNanites');
      const newRecord = $('newRecord');
      const retryBtn = $('retryBtn');
      const shareBtn = $('shareBtn');
      const gameoverMenuBtn = $('gameoverMenuBtn');

      const victoryOverlay = $('victoryOverlay');
      const victoryScore = $('victoryScore');
      const victoryStats = $('victoryStats');
      const victoryEarned = $('victoryEarned');
      const victoryContinueBtn = $('victoryContinueBtn');
      const victoryShareBtn = $('victoryShareBtn');
      const victoryMenuBtn = $('victoryMenuBtn');

      const specialBtn = $('specialBtn');
      const bombBtn = $('bombBtn');
      const toasts = $('toasts');

      const AudioSys = {
        ctx: null,
        master: null,
        musicGain: null,
        muted: loadMuted(),
        musicTimer: null,
        step: 0,

        init() {
          if (this.ctx) return;
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;

          this.ctx = new AC();
          this.master = this.ctx.createGain();
          this.master.gain.value = this.muted ? 0 : 0.5;
          this.master.connect(this.ctx.destination);

          this.musicGain = this.ctx.createGain();
          this.musicGain.gain.value = 0.16;
          this.musicGain.connect(this.master);

          this.updateMute();
        },

        resume() {
          if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
          }
        },

        updateMute() {
          if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
        },

        setMuted(m) {
          this.muted = m;
          saveMuted(m);
          if (this.master) this.master.gain.value = m ? 0 : 0.5;
        },

        playNote(freq, dur, type = 'square', gain = 0.2, slide = 0, dest) {
          if (!this.ctx) return;
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
          g.connect(dest || this.master);
          o.start(t);
          o.stop(t + dur + 0.03);
        },

        noise(dur, gain = 0.3, filterFreq = 1000, dest) {
          if (!this.ctx) return;
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
          g.connect(dest || this.master);

          src.start(t);
          src.stop(t + dur + 0.03);
        },

        shoot() {
          if (this.muted) return;
          this.playNote(880, 0.045, 'square', 0.035, -620);
        },

        enemyShoot() {
          if (this.muted) return;
          this.playNote(320, 0.06, 'sawtooth', 0.03, -140);
        },

        explosion(big) {
          if (this.muted) return;
          this.noise(big ? 0.65 : 0.28, big ? 0.45 : 0.22, big ? 650 : 1200);
          this.playNote(big ? 85 : 160, big ? 0.5 : 0.18, 'triangle', big ? 0.35 : 0.18, -80);
        },

        power() {
          if (this.muted) return;
          [523, 659, 784, 1047].forEach((f, i) => {
            setTimeout(() => this.playNote(f, 0.07, 'square', 0.09), i * 55);
          });
        },

        hit() {
          if (this.muted) return;
          this.playNote(190, 0.08, 'sawtooth', 0.12, -70);
        },

        bomb() {
          if (this.muted) return;
          this.noise(0.9, 0.5, 380);
          this.playNote(58, 0.75, 'sine', 0.45, -25);
        },

        special() {
          if (this.muted) return;
          this.playNote(180, 0.45, 'sawtooth', 0.18, 720);
          this.noise(0.45, 0.2, 2200);
        },

        ui() {
          if (this.muted) return;
          this.playNote(740, 0.04, 'square', 0.06);
        },

        startMusic() {
          if (!this.ctx || this.musicTimer) return;
          this.step = 0;
          this.musicTimer = setInterval(() => this.musicStep(), 140);
        },

        stopMusic() {
          if (this.musicTimer) {
            clearInterval(this.musicTimer);
            this.musicTimer = null;
          }
        },

        musicStep() {
          if (!this.ctx || this.muted) return;

          const step = this.step;
          const bar = Math.floor(step / 8) % 4;
          const roots = [55, 49, 65.41, 58.27];
          const root = roots[bar];
          const scale = [0, 3, 5, 7, 10, 12];

          if (step % 2 === 0) {
            this.noise(0.03, 0.012, 6000, this.musicGain);
            this.playNote(root / 2, 0.16, 'triangle', 0.09, 0, this.musicGain);
          }

          if (step % 4 === 2) this.noise(0.06, 0.03, 1800, this.musicGain);

          if (step % 2 === 1) {
            const idx = (step + bar * 3) % scale.length;
            const freq = root * 4 * Math.pow(2, scale[idx] / 12);
            this.playNote(freq, 0.09, 'square', 0.028, 0, this.musicGain);
          }

          if (step % 8 === 0) this.playNote(root * 2, 0.22, 'sine', 0.05, 0, this.musicGain);

          this.step = (step + 1) % 32;
        }
      };

      function dm() {
        return DIFF[difficulty] || DIFF.normal;
      }

      function refreshSoundButtons() {
        const txt = AudioSys.muted ? '🔇 Son coupé' : '🔊 Son actif';
        document.querySelectorAll('.sound-toggle').forEach((b) => {
          b.textContent = txt;
        });
      }

      function refreshDifficulty() {
        difficultyBtn.textContent = difficulty === 'normal' ? 'Difficulté : Normale' : 'Difficulté : Cauchemar';
      }

      function refreshMenu() {
        menuHigh.textContent = best.toLocaleString('fr-FR');
        menuNanites.textContent = `${meta.nanites}⬡`;
        refreshDifficulty();
      }

      function toast(msg, cls = '') {
        const div = document.createElement('div');
        div.className = 'toast ' + cls;
        div.textContent = msg;
        toasts.appendChild(div);

        setTimeout(() => {
          div.classList.add('out');
          setTimeout(() => div.remove(), 320);
        }, 2600);
      }

      function renderLab() {
        labNanites.textContent = `${meta.nanites}⬡`;

        labList.innerHTML = TALENTS.map((t) => {
          const lvl = meta.talents[t.key] || 0;
          const cost = t.cost(lvl);
          const max = lvl >= t.max;
          const can = !max && meta.nanites >= cost;

          return `
            <div class="talent ${can ? '' : 'disabled'}" data-t="${t.key}">
              <div>
                <strong>${t.name}</strong>
                <span>${t.desc}</span>
                <span class="lvl">Niveau ${lvl}/${t.max}</span>
              </div>
              <div class="cost">${max ? 'MAX' : cost + '⬡'}</div>
            </div>
          `;
        }).join('');

        labList.querySelectorAll('.talent').forEach((el) => {
          el.addEventListener('click', () => buyTalent(el.dataset.t));
        });
      }

      function buyTalent(key) {
        const def = TALENTS.find((t) => t.key === key);
        if (!def) return;

        const lvl = meta.talents[key] || 0;
        const cost = def.cost(lvl);

        if (lvl >= def.max || meta.nanites < cost) return;

        meta.nanites -= cost;
        meta.talents[key] = lvl + 1;
        saveMeta();

        renderLab();
        refreshMenu();
        AudioSys.power();
        toast(`Amélioration achetée : ${def.name}`, 'nano');
      }

      function openLab() {
        renderLab();
        hide(menuOverlay);
        show(labOverlay);
        AudioSys.ui();
      }

      function closeLab() {
        hide(labOverlay);
        show(menuOverlay);
        AudioSys.ui();
      }

      function renderShips() {
        shipList.innerHTML = SHIPS.map((s, i) => {
          return `
            <div class="ship-card ${i === meta.ship ? 'selected' : ''}" data-ship="${i}">
              <strong>${s.name}</strong>
              <span>${s.desc}</span>
              <div class="ship-stats">
                Vitesse ${s.speed} · Coque ${s.hull} · Bouclier ${s.shield} · Bombes ${s.bombs} · Arme ${s.weapon}
              </div>
            </div>
          `;
        }).join('');

        shipList.querySelectorAll('.ship-card').forEach((el) => {
          el.addEventListener('click', () => {
            meta.ship = parseInt(el.dataset.ship, 10);
            saveMeta();
            renderShips();
            AudioSys.ui();
          });
        });
      }

      function openShips() {
        renderShips();
        hide(menuOverlay);
        show(shipOverlay);
        AudioSys.ui();
      }

      function closeShips() {
        hide(shipOverlay);
        show(menuOverlay);
        AudioSys.ui();
      }

      async function shareScore() {
        const text =
          `Nébuleuse Protocol IV — Score : ${score.toLocaleString('fr-FR')} | ` +
          `Vague : ${wave} | Mode : ${mode === 'survie' ? 'Survie' : 'Campagne'} | ` +
          `Difficulté : ${difficulty === 'normal' ? 'Normale' : 'Cauchemar'}`;

        if (navigator.share) {
          try {
            await navigator.share({ title: 'Nébuleuse Protocol IV', text });
          } catch (e) {}
        } else {
          try {
            await navigator.clipboard.writeText(text);
            toast('Score copié dans le presse-papiers');
          } catch (e) {
            toast(text);
          }
        }
      }




      window.addEventListener('resize', resize);
      window.addEventListener('orientationchange', () => setTimeout(resize, 120));
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => setTimeout(resize, 60));
      }

      document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
      document.addEventListener('dblclick', (e) => e.preventDefault());
      document.addEventListener('contextmenu', (e) => e.preventDefault());
      document.addEventListener('touchmove', (e) => {
        if (state === 'playing') e.preventDefault();
      }, { passive: false });

      document.addEventListener('pointerdown', (e) => {
        AudioSys.resume();

        if (state !== 'playing') return;
        if (e.target.closest('button')) return;
        if (activePointer !== null) return;

        activePointer = e.pointerId;
        lastPX = e.clientX;
        lastPY = e.clientY;
      }, { passive: false });

      document.addEventListener('pointermove', (e) => {
        if (e.pointerId !== activePointer || !player || state !== 'playing') return;

        e.preventDefault();

        const dx = e.clientX - lastPX;
        const dy = e.clientY - lastPY;
        lastPX = e.clientX;
        lastPY = e.clientY;

        player.x += dx * controlSensitivity;
        player.y += dy * controlSensitivity;

        player.x = clamp(player.x, 20, W - 20);
        player.y = clamp(player.y, 70, H - 40);
      }, { passive: false });

      ['pointerup', 'pointercancel'].forEach((ev) => {
        document.addEventListener(ev, (e) => {
          if (e.pointerId === activePointer) activePointer = null;
        });
      });

      window.addEventListener('keydown', (e) => {
        keys[e.code] = true;

        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
          e.preventDefault();
        }

        if (e.code === 'Escape') {
          if (!isHidden(labOverlay)) {
            closeLab();
            return;
          }
          if (!isHidden(shipOverlay)) {
            closeShips();
            return;
          }
        }

        if (e.code === 'KeyX' || e.code === 'Space') doBomb();
        if (e.code === 'KeyC') doSpecial();

        if (e.code === 'KeyP') {
          if (state === 'playing') pauseGame();
          else if (state === 'paused') resumeGame();
        }

        if (e.code === 'Enter') {
          if (!isHidden(labOverlay)) closeLab();
          else if (!isHidden(shipOverlay)) closeShips();
          else if (!isHidden(victoryOverlay)) continueAfterVictory();
          else if (state === 'menu' || state === 'gameover') startGame(lastMode);
        }
      });

      window.addEventListener('keyup', (e) => {
        keys[e.code] = false;
      });

      window.addEventListener('blur', () => {
        activePointer = null;
        for (const k in keys) keys[k] = false;
        if (state === 'playing') pauseGame();
      });

      document.addEventListener('visibilitychange', () => {
        if (document.hidden && state === 'playing') pauseGame();
      });

      modeCampagne.addEventListener('click', () => startGame('campagne'));
      modeSurvie.addEventListener('click', () => startGame('survie'));
      labBtn.addEventListener('click', openLab);
      closeLabBtn.addEventListener('click', closeLab);
      shipBtn.addEventListener('click', openShips);
      closeShipBtn.addEventListener('click', closeShips);

      difficultyBtn.addEventListener('click', () => {
        difficulty = difficulty === 'normal' ? 'cauchemar' : 'normal';
        meta.diff = difficulty;
        saveMeta();
        refreshDifficulty();
        AudioSys.ui();
      });

      retryBtn.addEventListener('click', () => startGame(mode));
      pauseRestartBtn.addEventListener('click', () => startGame(mode));
      resumeBtn.addEventListener('click', resumeGame);
      pauseMenuBtn.addEventListener('click', toMenu);
      gameoverMenuBtn.addEventListener('click', toMenu);
      victoryMenuBtn.addEventListener('click', toMenu);
      victoryContinueBtn.addEventListener('click', continueAfterVictory);

      shareBtn.addEventListener('click', shareScore);
      victoryShareBtn.addEventListener('click', shareScore);

      pauseBtn.addEventListener('click', () => {
        if (state === 'playing') pauseGame();
        else if (state === 'paused') resumeGame();
      });

      specialBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        doSpecial();
      });

      bombBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        doBomb();
      });

      document.querySelectorAll('.sound-toggle').forEach((btn) => {
        btn.addEventListener('click', () => {
          AudioSys.init();
          AudioSys.setMuted(!AudioSys.muted);
          refreshSoundButtons();
          AudioSys.ui();
        });
      });

      function getDiff() {
        return mode === 'survie' ? wave + Math.floor(survivalTime / 15) : wave;
      }

      function getScoreMult() {
        return multiplier * (1 + Math.min(combo, 40) * 0.04);
      }

      function computeNanites() {
        const base =
          Math.floor(score / 4000) +
          wave +
          runBossKills * 2 +
          (finalDefeated ? 8 : 0);

        const mult = 1 + (meta.talents.credit || 0) * 0.1;

        return Math.max(1, Math.round(base * mult));
      }

      function hideAllOverlays() {
        hide(menuOverlay);
        hide(labOverlay);
        hide(shipOverlay);
        hide(pauseOverlay);
        hide(gameoverOverlay);
        hide(victoryOverlay);
      }

      function resetGame() {
        const ship = SHIPS[meta.ship || 0];
        const tal = meta.talents;
        const m = dm();

        score = 0;
        multiplier = 1;
        multTime = 0;
        slowTime = 0;
        shake = 0;
        hitFlash = 0;
        gameTime = 0;
        survivalTime = 0;
        combo = 0;
        comboTime = 0;
        gameKills = 0;
        runBossKills = 0;
        finalDefeated = false;
        finalBonusAwarded = false;

        grazes = 0;
        grazeChain = 0;
        grazeChainTime = 0;
        runNanitesPaid = 0;
        hudTimer = 0;

        enemies = [];
        pBullets = [];
        eBullets = [];
        particles = [];
        powerups = [];
        texts = [];
        shockwaves = [];
        beams = [];
        boss = null;

        const maxHull = Math.round((ship.hull + tal.armor * 12) * m.playerHull);

        player = {
          x: W / 2,
          y: H * 0.78,
          prevX: W / 2,
          r: 6,
          maxHull,
          hull: maxHull,
          maxShield: ship.shield,
          shield: ship.shield,
          shieldRegen: 14 + tal.regen * 2,
          lives: 3 + tal.life,
          bombs: ship.bombs + tal.bombs,
          weapon: Math.min(5, ship.weapon + tal.weapon),
          energy: 0,
          energyRegen: 5 + tal.nova * 2,
          fireCd: 0,
          missileCd: 1,
          invuln: 2,
          shieldDelay: 0,
          alive: true,
          tilt: 0,
          speed: ship.speed,
          fireMul: ship.fireMul,
          colors: ship.colors
        };

        document.body.classList.remove('cinema');
        startWave(1);
        updateHUD();
      }

      function startWave(n) {
        wave = n;
        spawnQueue = [];
        boss = null;
        showBossBar(false);

        const bossWave = mode === 'survie' ? n % 5 === 0 : n % 3 === 0;

        if (n === 15 && !finalDefeated) {
          waveBanner = 'VAGUE 15 — BOSS FINAL';
          spawnQueue.push({ delay: 2.0, type: 'boss', final: true });
          document.body.classList.add('cinema');
          toast('Alerte : Nébuleuse Prime détectée');
        } else if (bossWave) {
          waveBanner = `VAGUE ${n} — BOSS`;
          spawnQueue.push({ delay: 1.4, type: 'boss', final: false });
        } else {
          waveBanner = `VAGUE ${n}`;
          const count = mode === 'survie' ? 10 + n * 4 : 8 + n * 3;
          const types = getWaveTypes(n);

          for (let i = 0; i < count; i++) {
            spawnQueue.push({
              delay: mode === 'survie' ? rand(0.28, 0.72) : rand(0.35, 0.9),
              type: pick(types)
            });
          }

          if (n >= 4 && n % 2 === 0) {
            spawnQueue.push({ delay: 1.5, type: 'miniboss' });
          }
        }

        if (n === 1) toast('Secteur 01 — La ceinture de débris');
        if (n === 3) toast('Signature massive détectée');
        if (n === 5) toast('Secteur 02 — Champ de mines ioniques');
        if (n === 10) toast('Secteur 03 — La frontière morte');

        spawnTimer = spawnQueue.length ? spawnQueue[0].delay : 1;
        waveBannerTime = 2.3;
      }

      function getWaveTypes(n) {
        const a = ['drone', 'drone', 'zig', 'speeder'];
        if (n >= 2) a.push('tank', 'zig');
        if (n >= 4) a.push('splitter', 'turret');
        if (n >= 5) a.push('elite', 'speeder');
        if (n >= 6) a.push('tank', 'elite');
        return a;
      }

      function spawnEnemy(type, x = rand(40, Math.max(41, W - 40)), y = -40) {
        const d = getDiff();
        const hpScale = (1 + d * 0.16) * dm().hp;

        const e = {
          type,
          x,
          y,
          baseX: x,
          t: rand(0, TAU),
          fireCd: rand(0.8, 2.0),
          vy: 0,
          r: 14,
          hp: 10,
          maxHp: 10,
          score: 100,
          elite: false
        };

        switch (type) {
          case 'drone':
            e.r = 14;
            e.hp = e.maxHp = 24 * hpScale;
            e.vy = 85 + d * 4;
            e.score = 100;
            break;
          case 'zig':
            e.r = 13;
            e.hp = e.maxHp = 30 * hpScale;
            e.vy = 72;
            e.score = 150;
            break;
          case 'speeder':
            e.r = 10;
            e.hp = e.maxHp = 15 * hpScale;
            e.vy = 235 + d * 8;
            e.score = 120;
            break;
          case 'tank':
            e.r = 22;
            e.hp = e.maxHp = 100 * hpScale;
            e.vy = 34;
            e.score = 300;
            break;
          case 'splitter':
            e.r = 18;
            e.hp = e.maxHp = 60 * hpScale;
            e.vy = 62;
            e.score = 220;
            break;
          case 'turret':
            e.r = 16;
            e.hp = e.maxHp = 70 * hpScale;
            e.vy = 90;
            e.score = 260;
            break;
          case 'elite':
            e.r = 17;
            e.hp = e.maxHp = 90 * hpScale;
            e.vy = 48;
            e.score = 400;
            break;
          case 'mini':
            e.r = 8;
            e.hp = e.maxHp = 9 * hpScale;
            e.vy = 210;
            e.score = 50;
            break;
          case 'miniboss':
            e.x = W / 2;
            e.baseX = W / 2;
            e.r = 32;
            e.hp = e.maxHp = (450 + d * 110) * dm().hp;
            e.vy = 60;
            e.score = 1500;
            break;
        }

        if (type !== 'miniboss' && type !== 'mini' && type !== 'boss' && wave >= 2) {
          const chance = 0.08 + wave * 0.012;
          if (Math.random() < chance) {
            e.elite = true;
            e.hp = e.maxHp = Math.round(e.maxHp * 2.1);
            e.r *= 1.18;
            e.score *= 2;
            e.fireCd *= 0.7;
          }
        }

        enemies.push(e);
        return e;
      }

      function spawnBoss(isFinal) {
        const kind = isFinal ? 3 : runBossKills % 3;

        const defs = [
          { name: 'BOSS CRAMOISI', color: '#f43f5e' },
          { name: 'BOSS AZUR', color: '#38bdf8' },
          { name: 'BOSS ÉMERALDE', color: '#34d399' },
          { name: 'NÉBULEUSE PRIME', color: '#f0abfc' }
        ];

        const def = defs[kind];

        const hp = isFinal
          ? 5200 + wave * 650
          : (mode === 'survie' ? 1200 : 1500) + wave * 450 + runBossKills * 250;

        boss = {
          type: 'boss',
          kind,
          finalBoss: !!isFinal,
          phase: 1,
          name: def.name,
          color: def.color,
          x: W / 2,
          y: -160,
          targetY: clamp(H * (isFinal ? 0.2 : 0.18), 100, 230),
          r: isFinal ? 68 : 54,
          hp: Math.round(hp * dm().hp),
          maxHp: Math.round(hp * dm().hp),
          t: 0,
          spin: 0,
          fireCd: isFinal ? 2.2 : 1.8,
          patternTime: 0,
          minionCd: 6,
          score: isFinal ? 25000 : 9000 + wave * 600,
          entering: true
        };

        enemies.push(boss);
        bossLabel.textContent = boss.name;
        showBossBar(true);
      }

      function showBossBar(on) {
        bossHud.style.opacity = on ? '1' : '0';
      }

      function updateSpawner(dt) {
        if (spawnQueue.length) {
          spawnTimer -= dt;

          if (spawnTimer <= 0) {
            const item = spawnQueue.shift();

            if (item.type === 'boss') spawnBoss(item.final);
            else spawnEnemy(item.type);

            if (spawnQueue.length) spawnTimer = spawnQueue[0].delay;
          }
        } else if (enemies.length === 0 && waveBannerTime <= 0) {
          endWave();
        }
      }

      function endWave() {
        const bonus = 500 + wave * 120;
        const gained = Math.round(bonus * getScoreMult() * dm().score);
        score += gained;

        if (score > best) {
          best = score;
          saveBest(best);
        }

        addText(W / 2, H * 0.38, `Vague ${wave} nettoyée +${gained}`, '#a5f3fc');

        if (boss) {
          showBossBar(false);
          boss = null;
        }

        startWave(wave + 1);
      }

      function updateEnemies(dt) {
        const d = getDiff();

        for (let i = enemies.length - 1; i >= 0; i--) {
          const e = enemies[i];
          e.t += dt;

          if (e.type !== 'boss') e.fireCd -= dt / dm().fire;

          let remove = false;

          switch (e.type) {
            case 'drone':
              e.y += e.vy * dt;
              if (e.fireCd <= 0 && e.y > 10 && e.y < H * 0.72) {
                fireAimed(e, 220 + d * 6, 5, 12, '#ff9f43');
                e.fireCd = rand(1.3, 2.3) - Math.min(0.7, d * 0.03);
              }
              break;

            case 'zig':
              e.x = e.baseX + Math.sin(e.t * 2.4) * Math.min(90, W * 0.18);
              e.y += e.vy * dt;
              if (e.fireCd <= 0 && e.y > 10 && e.y < H * 0.72) {
                fireAimed(e, 230 + d * 6, 5, 12, '#ffd166');
                e.fireCd = rand(1.6, 2.6);
              }
              break;

            case 'speeder':
              e.y += e.vy * dt;
              e.x += Math.sin(e.t * 6) * 18 * dt;
              break;

            case 'tank':
              e.y += e.vy * dt;
              if (e.fireCd <= 0 && e.y > 10 && e.y < H * 0.7) {
                const base = Math.atan2(player.y - e.y, player.x - e.x);
                for (let k = -1; k <= 1; k++) {
                  fireEnemyBullet(
                    e.x,
                    e.y,
                    Math.cos(base + k * 0.24) * (190 + d * 5),
                    Math.sin(base + k * 0.24) * (190 + d * 5),
                    6,
                    14,
                    '#c084fc'
                  );
                }
                e.fireCd = 2.4 - Math.min(0.8, d * 0.04);
              }
              break;

            case 'splitter':
              e.y += e.vy * dt;
              e.x += Math.sin(e.t * 2.2) * 32 * dt;
              break;

            case 'turret':
              if (e.y < H * 0.22) e.y += e.vy * dt;
              else e.y += Math.sin(e.t * 1.6) * 10 * dt;

              if (e.fireCd <= 0 && e.y > 10) {
                fireBurst(e, 3, 250 + d * 6);
                e.fireCd = 2.1 - Math.min(0.7, d * 0.03);
              }
              break;

            case 'elite':
              e.x = e.baseX + Math.sin(e.t * 1.8) * Math.min(110, W * 0.22);
              e.y += e.vy * dt;
              if (e.fireCd <= 0 && e.y > 10 && e.y < H * 0.68) {
                fireFan(e, e.elite ? 7 : 5, 0.16, 220 + d * 6, '#fb7185');
                e.fireCd = 1.7 - Math.min(0.6, d * 0.03);
              }
              break;

            case 'mini':
              e.y += e.vy * dt;
              e.x += Math.sin(e.t * 8) * 45 * dt;
              break;

            case 'miniboss':
              if (e.y < H * 0.22) e.y += e.vy * dt;
              else e.x = e.baseX + Math.sin(e.t * 1.2) * Math.min(120, W * 0.22);

              if (e.fireCd <= 0 && e.y > 10) {
                if (Math.random() < 0.55) {
                  fireFan(e, 3 + Math.floor(d / 3), 0.16, 220 + d * 5, '#fbbf24');
                } else {
                  const count = 10 + Math.floor(d / 2);
                  for (let k = 0; k < count; k++) {
                    const a = (k / count) * TAU + e.t;
                    fireEnemyBullet(
                      e.x,
                      e.y,
                      Math.cos(a) * (145 + d * 4),
                      Math.sin(a) * (145 + d * 4),
                      5,
                      12,
                      '#fde68a'
                    );
                  }
                }
                e.fireCd = 1.6;
              }
              break;

            case 'boss':
              updateBoss(e, dt, d);
              break;
          }

          if (e.y > H + 90 || e.x < -90 || e.x > W + 90) remove = true;

          if (remove) {
            if (e.type === 'boss') {
              boss = null;
              showBossBar(false);
            }
            enemies.splice(i, 1);
          }
        }
      }

      function updateBoss(e, dt, d) {
        if (e.entering) {
          e.y += (e.targetY - e.y) * Math.min(1, 2 * dt);
          if (Math.abs(e.y - e.targetY) < 4) e.entering = false;
          return;
        }

        e.patternTime += dt;
        e.spin += dt * (e.kind === 3 ? 1.8 : 1.4);
        e.minionCd -= dt;
        e.fireCd -= dt / dm().fire;

        const ratio = clamp(e.hp / e.maxHp, 0, 1);

        if (e.kind === 3) {
          if (e.phase === 1 && ratio < 0.66) {
            e.phase = 2;
            e.color = '#e879f9';
            eBullets.length = 0;
            shockwaves.push({ x: e.x, y: e.y, r: 20, max: Math.max(W, H) * 0.5, life: 0.6, maxLife: 0.6 });
            toast('Nébuleuse Prime — Phase 2');
            e.fireCd = 1.0;
          } else if (e.phase === 2 && ratio < 0.33) {
            e.phase = 3;
            e.color = '#fb7185';
            eBullets.length = 0;
            shockwaves.push({ x: e.x, y: e.y, r: 20, max: Math.max(W, H) * 0.65, life: 0.7, maxLife: 0.7 });
            toast('Nébuleuse Prime — Phase 3 : Cœur instable');
            e.fireCd = 0.9;
          }
        }

        const phase = e.kind === 3 ? e.phase - 1 : ratio > 0.66 ? 0 : ratio > 0.33 ? 1 : 2;

        if (e.kind === 2) {
          if (e.minionCd <= 0 && ratio < 0.9) {
            e.minionCd = 6;
            spawnEnemy('zig', rand(60, Math.max(61, W - 60)), -40);
            spawnEnemy('drone', rand(60, Math.max(61, W - 60)), -40);
          }
        } else if (e.kind === 3) {
          if (e.minionCd <= 0 && ratio < 0.8) {
            e.minionCd = 5.5;
            spawnEnemy('elite', rand(60, Math.max(61, W - 60)), -40);
          }
        } else if (e.minionCd <= 0 && ratio < 0.85) {
          e.minionCd = 7;
          spawnEnemy('drone', rand(60, Math.max(61, W - 60)), -40);
        }

        if (e.fireCd > 0) return;

        const seq = Math.floor(e.patternTime / 3.2) % 4;

        if (e.kind === 0) {
          if (seq === 0) {
            const count = 5 + phase * 2;
            const base = Math.atan2(player.y - e.y, player.x - e.x);

            for (let i = 0; i < count; i++) {
              const a = base + (i - (count - 1) / 2) * 0.16;
              fireEnemyBullet(
                e.x,
                e.y + 20,
                Math.cos(a) * (220 + d * 6),
                Math.sin(a) * (220 + d * 6),
                6,
                14,
                '#ff9f43'
              );
            }

            e.fireCd = 0.95 - phase * 0.12;
          } else if (seq === 1) {
            const count = 16 + phase * 6 + Math.floor(d / 2);

            for (let i = 0; i < count; i++) {
              const a = (i / count) * TAU + e.spin;
              const speed = 130 + phase * 35;
              fireEnemyBullet(
                e.x,
                e.y,
                Math.cos(a) * speed,
                Math.sin(a) * speed,
                5,
                12,
                '#ff7ad9'
              );
            }

            e.fireCd = 1.15 - phase * 0.15;
          } else if (seq === 2) {
            const arms = 2 + phase;

            for (let arm = 0; arm < arms; arm++) {
              const a = e.spin * 4 + (arm * TAU) / arms;
              fireEnemyBullet(
                e.x,
                e.y,
                Math.cos(a) * 190,
                Math.sin(a) * 190,
                5,
                12,
                '#c084fc'
              );
            }

            e.fireCd = 0.12;
          } else {
            const gapCenter = rand(0.2, 0.8) * W;
            const gap = 90 + Math.max(0, 60 - phase * 15);

            for (let x = 20; x < W - 20; x += 38) {
              if (Math.abs(x - gapCenter) < gap) continue;

              fireEnemyBullet(
                x,
                e.y + 35,
                0,
                130 + phase * 25,
                6,
                14,
                '#f87171'
              );
            }

            e.fireCd = 1.35 - phase * 0.18;
          }
        } else if (e.kind === 1) {
          if (seq === 0) {
            const count = 7 + phase * 2;
            const base = Math.atan2(player.y - e.y, player.x - e.x);

            for (let i = 0; i < count; i++) {
              const a = base + (i - (count - 1) / 2) * 0.12;
              fireEnemyBullet(
                e.x,
                e.y + 20,
                Math.cos(a) * (250 + d * 6),
                Math.sin(a) * (250 + d * 6),
                5,
                13,
                '#38bdf8'
              );
            }

            e.fireCd = 0.82 - phase * 0.1;
          } else if (seq === 1) {
            spawnBeam(player.x, 54, 16, e.color);
            spawnBeam(player.x - 110, 44, 14, e.color);
            spawnBeam(player.x + 110, 44, 14, e.color);
            AudioSys.enemyShoot();
            e.fireCd = 1.7 - phase * 0.15;
          } else if (seq === 2) {
            const count = 20 + phase * 8;

            for (let i = 0; i < count; i++) {
              const a = (i / count) * TAU + e.spin * 1.4;
              fireEnemyBullet(
                e.x,
                e.y,
                Math.cos(a) * (150 + phase * 30),
                Math.sin(a) * (150 + phase * 30),
                5,
                12,
                '#7dd3fc'
              );
            }

            e.fireCd = 1.1 - phase * 0.12;
          } else {
            const arms = 3 + phase;

            for (let arm = 0; arm < arms; arm++) {
              const a = e.spin * 5 + (arm * TAU) / arms;
              fireEnemyBullet(
                e.x,
                e.y,
                Math.cos(a) * 200,
                Math.sin(a) * 200,
                5,
                12,
                '#0ea5e9'
              );
            }

            e.fireCd = 0.1;
          }
        } else if (e.kind === 2) {
          if (seq === 0) {
            const arms = 5 + phase;

            for (let arm = 0; arm < arms; arm++) {
              const a = e.spin * 3 + (arm * TAU) / arms;
              fireEnemyBullet(
                e.x,
                e.y,
                Math.cos(a) * (170 + phase * 25),
                Math.sin(a) * (170 + phase * 25),
                5,
                12,
                '#34d399'
              );
            }

            e.fireCd = 0.1;
          } else if (seq === 1) {
            const n = 6 + phase * 2;

            for (let i = 0; i < n; i++) {
              fireEnemyBullet(
                rand(30, W - 30),
                e.y + 30,
                rand(-30, 30),
                170 + phase * 30,
                5,
                12,
                '#6ee7b7'
              );
            }

            e.fireCd = 0.9 - phase * 0.1;
          } else if (seq === 2) {
            const count = 24 + phase * 4;
            const offset = Math.floor(e.spin * 3);

            for (let i = 0; i < count; i++) {
              if ((i + offset) % 5 === 2) continue;

              const a = (i / count) * TAU + e.spin;
              fireEnemyBullet(
                e.x,
                e.y,
                Math.cos(a) * (145 + phase * 25),
                Math.sin(a) * (145 + phase * 25),
                5,
                12,
                '#10b981'
              );
            }

            e.fireCd = 1.2 - phase * 0.14;
          } else {
            spawnEnemy('mini', e.x - 30, e.y + 20);
            spawnEnemy('mini', e.x + 30, e.y + 20);

            fireFan(e, 7, 0.14, 220 + d * 5, '#a7f3d0');

            e.fireCd = 1.4 - phase * 0.16;
          }
        } else {
          if (seq === 0) {
            const count = 9 + phase * 2;
            const base = Math.atan2(player.y - e.y, player.x - e.x);

            for (let i = 0; i < count; i++) {
              const a = base + (i - (count - 1) / 2) * 0.12;
              fireEnemyBullet(
                e.x,
                e.y + 24,
                Math.cos(a) * (255 + d * 7),
                Math.sin(a) * (255 + d * 7),
                6,
                15,
                e.color
              );
            }

            const ring = 16 + phase * 6;
            for (let i = 0; i < ring; i++) {
              const a = (i / ring) * TAU + e.spin;
              fireEnemyBullet(
                e.x,
                e.y,
                Math.cos(a) * (150 + phase * 30),
                Math.sin(a) * (150 + phase * 30),
                5,
                12,
                '#e879f9'
              );
            }

            e.fireCd = 0.88 - phase * 0.1;
          } else if (seq === 1) {
            spawnBeam(player.x, 62, 18, e.color);
            spawnBeam(player.x - 135, 48, 16, e.color);
            spawnBeam(player.x + 135, 48, 16, e.color);

            const arms = 4 + phase;
            for (let arm = 0; arm < arms; arm++) {
              const a = e.spin * 5 + (arm * TAU) / arms;
              fireEnemyBullet(
                e.x,
                e.y,
                Math.cos(a) * 210,
                Math.sin(a) * 210,
                5,
                13,
                '#d946ef'
              );
            }

            e.fireCd = 0.95 - phase * 0.12;
          } else if (seq === 2) {
            const gapCenter = rand(0.22, 0.78) * W;
            const gap = 96 + Math.max(0, 50 - phase * 18);

            for (let x = 20; x < W - 20; x += 36) {
              if (Math.abs(x - gapCenter) < gap) continue;

              fireEnemyBullet(
                x,
                e.y + 36,
                0,
                145 + phase * 28,
                6,
                15,
                e.color
              );
            }

            for (let i = 0; i < 8 + phase * 2; i++) {
              fireEnemyBullet(
                rand(30, W - 30),
                e.y + 30,
                rand(-35, 35),
                175 + phase * 30,
                5,
                12,
                '#c026d3'
              );
            }

            e.fireCd = 1.05 - phase * 0.12;
          } else {
            spawnEnemy('mini', e.x - 40, e.y + 20);
            spawnEnemy('mini', e.x + 40, e.y + 20);

            fireFan(e, 7 + phase, 0.13, 235 + d * 6, '#f5d0fe');

            e.fireCd = 1.25 - phase * 0.15;
          }
        }
      }

      function spawnBeam(x, width = 50, dmg = 16, color = '#38bdf8') {
        if (!boss) return;

        beams.push({
          x: clamp(x, 20, W - 20),
          y: boss.y + 30,
          width,
          life: 1.15,
          total: 1.15,
          active: 0.35,
          dmg,
          color,
          hitCd: 0
        });
      }

      function updateBeams(dt) {
        for (let i = beams.length - 1; i >= 0; i--) {
          const b = beams[i];

          b.life -= dt;
          b.hitCd -= dt;

          if (b.life <= 0) {
            beams.splice(i, 1);
            continue;
          }

          const isActive = b.life <= b.active;

          if (
            isActive &&
            player.alive &&
            player.invuln <= 0 &&
            state === 'playing' &&
            b.hitCd <= 0 &&
            Math.abs(player.x - b.x) < b.width / 2 &&
            player.y > b.y
          ) {
            damagePlayer(b.dmg);
            b.hitCd = 0.3;
          }
        }
      }

      function fireEnemyBullet(x, y, vx, vy, r = 5, dmg = 12, color = '#ff7ad9') {
        if (eBullets.length > 430) return;

        const m = dm().bullet;

        eBullets.push({ x, y, vx: vx * m, vy: vy * m, r, dmg, color, life: 9 });

        if (Math.random() < 0.05) AudioSys.enemyShoot();
      }

      function fireAimed(e, speed, r = 5, dmg = 12, color = '#ff7ad9') {
        if (!player.alive) return;
        const a = Math.atan2(player.y - e.y, player.x - e.x);
        fireEnemyBullet(e.x, e.y, Math.cos(a) * speed, Math.sin(a) * speed, r, dmg, color);
      }

      function fireBurst(e, n, speed) {
        if (!player.alive) return;
        const base = Math.atan2(player.y - e.y, player.x - e.x);

        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * 0.08;
          fireEnemyBullet(
            e.x,
            e.y,
            Math.cos(a) * speed,
            Math.sin(a) * speed,
            5,
            12,
            '#ffd166'
          );
        }
      }

      function fireFan(e, n, spread, speed, color) {
        if (!player.alive) return;
        const base = Math.atan2(player.y - e.y, player.x - e.x);

        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * spread;
          fireEnemyBullet(
            e.x,
            e.y,
            Math.cos(a) * speed,
            Math.sin(a) * speed,
            5,
            12,
            color
          );
        }
      }

      function updateBullets(dt, eDt) {
        for (let i = pBullets.length - 1; i >= 0; i--) {
          const b = pBullets[i];

          if (b.homing) {
            let target = null;
            let bestD = Infinity;

            for (const e of enemies) {
              const d = dist2(b, e);
              if (d < bestD) {
                bestD = d;
                target = e;
              }
            }

            if (target) {
              const desired = Math.atan2(target.y - b.y, target.x - b.x);
              let diff = desired - b.angle;

              while (diff > Math.PI) diff -= TAU;
              while (diff < -Math.PI) diff += TAU;

              b.angle += clamp(diff, -b.turn * dt, b.turn * dt);
              b.vx = Math.cos(b.angle) * b.speed;
              b.vy = Math.sin(b.angle) * b.speed;
            }
          }

          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.life -= dt;

          if (b.life <= 0 || b.y < -50 || b.y > H + 50 || b.x < -50 || b.x > W + 50) {
            pBullets.splice(i, 1);
          }
        }

        for (let i = eBullets.length - 1; i >= 0; i--) {
          const b = eBullets[i];

          b.x += b.vx * eDt;
          b.y += b.vy * eDt;
          b.life -= eDt;

          if (b.life <= 0 || b.y < -40 || b.y > H + 40 || b.x < -40 || b.x > W + 40) {
            eBullets.splice(i, 1);
          }
        }
      }

      function updatePlayer(dt) {
        if (!player.alive) return;

        player.invuln -= dt;
        player.shieldDelay -= dt;
        player.fireCd -= dt;
        player.missileCd -= dt;

        player.energy = Math.min(100, player.energy + player.energyRegen * dt);

        if (player.shieldDelay <= 0 && player.shield < player.maxShield) {
          player.shield = Math.min(player.maxShield, player.shield + player.shieldRegen * dt);
        }

        let dx = 0;
        let dy = 0;

        if (keys.ArrowLeft || keys.KeyA) dx -= 1;
        if (keys.ArrowRight || keys.KeyD) dx += 1;
        if (keys.ArrowUp || keys.KeyW) dy -= 1;
        if (keys.ArrowDown || keys.KeyS) dy += 1;

        if (dx || dy) {
          const len = Math.hypot(dx, dy) || 1;
          player.x += (dx / len) * player.speed * dt;
          player.y += (dy / len) * player.speed * dt;
        }

        player.x = clamp(player.x, 20, W - 20);
        player.y = clamp(player.y, 70, H - 40);

        player.tilt = clamp((player.x - (player.prevX || player.x)) / 12, -0.45, 0.45);
        player.prevX = player.x;

        if (player.fireCd <= 0) firePlayer();

        if (player.weapon >= 4 && player.missileCd <= 0 && enemies.length) {
          fireHoming(1);
          player.missileCd = 1.25 - player.weapon * 0.05;
        }

        if (Math.random() < 0.7) {
          addParticle(
            player.x + rand(-4, 4),
            player.y + 18,
            rand(-12, 12),
            rand(90, 170),
            0.28,
            rand(1, 3),
            '#38bdf8'
          );
        }
      }

      function firePlayer() {
        const w = player.weapon;
        player.fireCd = Math.max(0.07, (0.155 - w * 0.011) * player.fireMul);

        const dmg = 12 + w * 3;
        const y = player.y - 18;
        const sp = 760;

        const shot = (x, vx, vy, r = 4, color = '#8ffcff') => {
          pBullets.push({
            x,
            y: y + rand(-1, 1),
            vx,
            vy,
            dmg,
            r,
            color,
            life: 2
          });
        };

        if (w === 1) {
          shot(player.x, 0, -sp);
        } else if (w === 2) {
          shot(player.x - 8, 0, -sp);
          shot(player.x + 8, 0, -sp);
        } else if (w === 3) {
          shot(player.x, 0, -sp);
          shot(player.x - 12, -90, -sp);
          shot(player.x + 12, 90, -sp);
        } else if (w === 4) {
          shot(player.x - 6, 0, -sp);
          shot(player.x + 6, 0, -sp);
          shot(player.x - 14, -140, -sp * 0.92);
          shot(player.x + 14, 140, -sp * 0.92);
        } else {
          shot(player.x, 0, -sp, 5, '#e8feff');
          shot(player.x - 9, -60, -sp);
          shot(player.x + 9, 60, -sp);
          shot(player.x - 18, -170, -sp * 0.9);
          shot(player.x + 18, 170, -sp * 0.9);
        }

        AudioSys.shoot();
      }

      function fireHoming(count = 1) {
        if (!enemies.length) return;

        for (let i = 0; i < count; i++) {
          const spread = (i - (count - 1) / 2) * 0.25;
          const angle = -Math.PI / 2 + spread;
          const speed = 520;

          pBullets.push({
            x: player.x + rand(-8, 8),
            y: player.y - 12,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            dmg: 28 + player.weapon * 4,
            r: 5,
            color: '#fbbf24',
            life: 3,
            homing: true,
            angle,
            speed,
            turn: 6
          });
        }
      }


      function registerGraze(bullet) {
        if (bullet.grazed || !player || !player.alive) return;

        bullet.grazed = true;

        grazes++;
        grazeChain++;
        grazeChainTime = 1.4;

        const reward = 8 + Math.min(42, grazeChain * 2);

        score += Math.round(reward * multiplier * dm().score);
        player.energy = Math.min(100, player.energy + 1.8);

        addParticle(
          player.x,
          player.y,
          rand(-80, 80),
          rand(-100, -20),
          0.22,
          rand(1.5, 3),
          '#a5f3fc'
        );

        if (grazeChain > 0 && grazeChain % 10 === 0) {
          addText(
            player.x,
            player.y - 38,
            `FRÔLEMENT x${grazeChain}`,
            '#a5f3fc'
          );

          AudioSys.playNote(
            1050,
            0.05,
            'sine',
            0.045,
            180
          );

          vibrate(8);
        }

        if (score > best) {
          best = score;
          saveBest(best);
        }
      }

      function updateCollisions() {
        for (let i = pBullets.length - 1; i >= 0; i--) {
          const b = pBullets[i];
          let hit = false;

          for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            const rr = (b.r + e.r) * (b.r + e.r);

            if (dist2(b, e) < rr) {
              e.hp -= b.dmg;
              hit = true;

              addParticle(b.x, b.y, rand(-40, 40), rand(-60, 20), 0.18, 2, '#cffafe');

              if (e.hp <= 0) killEnemy(j);
              break;
            }
          }

          if (hit) pBullets.splice(i, 1);
        }

        if (player.alive && player.invuln <= 0 && state === 'playing') {
          for (let i = eBullets.length - 1; i >= 0; i--) {
            const b = eBullets[i];

            const d = dist2(b, player);
            const hitRadius = b.r + player.r;
            const grazeRadius = hitRadius + 22;

            if (d < hitRadius * hitRadius) {
              eBullets.splice(i, 1);
              damagePlayer(b.dmg);

              if (!player.alive || state !== 'playing') break;
            } else if (
              !b.grazed &&
              d < grazeRadius * grazeRadius
            ) {
              registerGraze(b);
            }
          }
        }

        if (player.alive && player.invuln <= 0 && state === 'playing') {
          for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            const rr = (e.r + player.r) * (e.r + player.r);

            if (dist2(e, player) < rr) {
              e.hp -= 45;
              if (e.hp <= 0) killEnemy(i);

              if (player.alive && state === 'playing') {
                damagePlayer(e.type === 'boss' ? 34 : e.type === 'miniboss' ? 28 : 22);
              }

              if (!player.alive || state !== 'playing') break;
            }
          }
        }
      }

      function killEnemy(index) {
        const e = enemies[index];
        if (!e) return;

        enemies.splice(index, 1);

        gameKills++;
        combo++;
        comboTime = 2.2;

        player.energy = Math.min(100, player.energy + 5);

        if (e.type === 'boss') runBossKills++;

        explosion(e.x, e.y, enemyColor(e.type), e.type === 'boss' ? 56 : e.type === 'miniboss' ? 38 : 20, e.type === 'boss' ? 360 : e.type === 'miniboss' ? 280 : 220);
        AudioSys.explosion(e.type === 'boss' || e.type === 'miniboss');
        addScore(e.score);
        addText(e.x, e.y, `+${Math.round(e.score * getScoreMult() * dm().score)}`, '#fbbf24');

        if (e.type === 'boss') {
          vibrate([60, 35, 90]);
          boss = null;
          showBossBar(false);
          shake = 1.0;

          for (let k = 0; k < 5; k++) {
            dropPowerup(e.x + rand(-60, 60), e.y + rand(-30, 30));
          }

          shockwaves.push({
            x: e.x,
            y: e.y,
            r: 20,
            max: Math.max(W, H) * 0.7,
            life: 0.8,
            maxLife: 0.8
          });

          if (e.finalBoss && !finalDefeated) {
            finalDefeated = true;
            showVictory();
          }
        } else if (e.type === 'miniboss') {
          shake = Math.max(shake, 0.55);
          dropPowerup(e.x - 20, e.y);
          dropPowerup(e.x + 20, e.y);
        } else {
          shake = Math.max(shake, 0.18);

          if (e.type === 'splitter') {
            spawnEnemy('mini', e.x - 16, e.y);
            spawnEnemy('mini', e.x + 16, e.y);
          }

          if (e.elite || Math.random() < 0.17) dropPowerup(e.x, e.y);
        }
      }


      function damagePlayer(amount) {
        if (player.invuln > 0 || state !== 'playing') return;

        player.shieldDelay = 3;
        hitFlash = 0.18;
        shake = Math.max(shake, 0.22);
        AudioSys.hit();
        vibrate(24);

        for (let i = 0; i < 8; i++) {
          addParticle(
            player.x + rand(-10, 10),
            player.y + rand(-10, 10),
            rand(-80, 80),
            rand(-80, 80),
            0.25,
            2,
            '#60a5fa'
          );
        }

        if (player.shield > 0) {
          const absorbed = Math.min(player.shield, amount);
          player.shield -= absorbed;
          amount -= absorbed;
        }

        if (amount > 0) player.hull -= amount;

        if (player.hull <= 0) {
          player.hull = 0;
          loseLife();
        }
      }

      function loseLife() {
        player.lives--;

        explosion(player.x, player.y, '#7dd3fc', 42, 300);
        shake = 1;
        AudioSys.explosion(true);

        if (player.lives > 0) {
          player.hull = player.maxHull;
          player.shield = 60;
          player.weapon = Math.max(1, player.weapon - 1);
          player.x = W / 2;
          player.y = H * 0.78;
          player.prevX = player.x;
          player.invuln = 2.5;
          player.alive = true;
        } else {
          player.alive = false;
          if (state === 'playing') gameOver();
        }
      }

      function doBomb() {
        if (state !== 'playing' || !player.alive || player.bombs <= 0) return;

        player.bombs--;
        AudioSys.bomb();
        vibrate([35, 30, 70]);
        shake = 1;

        shockwaves.push({
          x: player.x,
          y: player.y,
          r: 20,
          max: Math.max(W, H) * 0.9,
          life: 0.75,
          maxLife: 0.75
        });

        eBullets.length = 0;
        beams.length = 0;

        for (let i = enemies.length - 1; i >= 0; i--) {
          const e = enemies[i];
          e.hp -= 180;
          if (e.hp <= 0) killEnemy(i);
        }

        addText(player.x, player.y - 40, 'BOMBE', '#fda4af');
        updateHUD();
      }

      function doSpecial() {
        if (state !== 'playing' || !player.alive || player.energy < 100 || !enemies.length) return;

        player.energy = 0;
        AudioSys.special();
        vibrate([18, 22, 18]);
        shake = Math.max(shake, 0.5);

        shockwaves.push({
          x: player.x,
          y: player.y,
          r: 16,
          max: Math.max(W, H) * 0.45,
          life: 0.5,
          maxLife: 0.5
        });

        fireHoming(8);
        addText(player.x, player.y - 42, 'NOVA', '#a5f3fc');
        updateHUD();
      }

      function dropPowerup(x, y, type) {
        const t = type || pick(['W', 'W', 'S', 'H', 'B', 'M', 'Z']);
        powerups.push({
          x,
          y,
          type: t,
          r: 14,
          vy: 75,
          t: 0
        });
      }

      function updatePowerups(dt) {
        for (let i = powerups.length - 1; i >= 0; i--) {
          const p = powerups[i];

          p.y += p.vy * dt;
          p.t += dt;
          p.x += Math.sin(p.t * 3) * 12 * dt;

          if (p.y > H + 40) {
            powerups.splice(i, 1);
            continue;
          }

          if (player.alive) {
            const rr = (p.r + player.r + 18) * (p.r + player.r + 18);

            if (dist2(p, player) < rr) {
              applyPowerup(p);
              powerups.splice(i, 1);
            }
          }
        }
      }

      function applyPowerup(p) {
        AudioSys.power();

        switch (p.type) {
          case 'W':
            if (player.weapon < 5) {
              player.weapon++;
              addText(player.x, player.y - 34, 'ARME +', '#67e8f9');
            } else {
              addText(player.x, player.y - 34, 'ARME MAX', '#67e8f9');
            }
            break;

          case 'S':
            player.shield = Math.min(player.maxShield, player.shield + 50);
            addText(player.x, player.y - 34, 'BOUCLIER', '#60a5fa');
            break;

          case 'H':
            player.hull = Math.min(player.maxHull, player.hull + 30);
            addText(player.x, player.y - 34, 'COQUE', '#34d399');
            break;

          case 'B':
            player.bombs = Math.min(6, player.bombs + 1);
            addText(player.x, player.y - 34, 'BOMBE +', '#fb7185');
            break;

          case 'M':
            multiplier = 2;
            multTime = 15;
            addText(player.x, player.y - 34, 'SCORE x2', '#fbbf24');
            break;

          case 'Z':
            slowTime = 6;
            addText(player.x, player.y - 34, 'RALENTI', '#c084fc');
            break;
        }
      }

      function addParticle(x, y, vx, vy, life, size, color) {
        if (particles.length > 650) return;

        particles.push({
          x,
          y,
          vx,
          vy,
          life,
          maxLife: life,
          size,
          color
        });
      }

      function explosion(x, y, color, count = 20, speed = 220) {
        for (let i = 0; i < count; i++) {
          const a = rand(0, TAU);
          const s = rand(speed * 0.15, speed);

          addParticle(
            x,
            y,
            Math.cos(a) * s,
            Math.sin(a) * s,
            rand(0.25, 0.75),
            rand(1.5, 4.5),
            color
          );
        }

        for (let i = 0; i < count / 2; i++) {
          const a = rand(0, TAU);
          const s = rand(speed * 0.08, speed * 0.4);

          addParticle(
            x,
            y,
            Math.cos(a) * s,
            Math.sin(a) * s,
            rand(0.4, 0.9),
            rand(3, 7),
            'rgba(255, 255, 255, 0.35)'
          );
        }
      }

      function updateParticles(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];

          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.98;
          p.vy *= 0.98;
          p.life -= dt;

          if (p.life <= 0) particles.splice(i, 1);
        }
      }

      function addText(x, y, str, color) {
        if (texts.length > 80) return;

        texts.push({
          x,
          y,
          str,
          color,
          life: 1.2,
          maxLife: 1.2
        });
      }

      function updateTexts(dt) {
        for (let i = texts.length - 1; i >= 0; i--) {
          const t = texts[i];

          t.y -= 28 * dt;
          t.life -= dt;

          if (t.life <= 0) texts.splice(i, 1);
        }
      }

      function updateShockwaves(dt) {
        for (let i = shockwaves.length - 1; i >= 0; i--) {
          const s = shockwaves[i];

          s.r += (s.max - s.r) * Math.min(1, dt * 7);
          s.life -= dt;

          if (s.life <= 0) shockwaves.splice(i, 1);
        }
      }

      function addScore(n) {
        score += Math.round(n * getScoreMult() * dm().score);
        if (score > best) {
          best = score;
          saveBest(best);
        }
      }

      function updateHUD() {
        scoreEl.textContent = score.toLocaleString('fr-FR');
        highEl.textContent = `Record ${best.toLocaleString('fr-FR')}`;

        if (!player) return;

        waveEl.textContent = wave;
        livesEl.textContent = '♥'.repeat(Math.max(0, player.lives));

        hullFill.style.width = (player.hull / player.maxHull) * 100 + '%';
        shieldFill.style.width = (player.shield / player.maxShield) * 100 + '%';
        energyFill.style.width = player.energy + '%';

        weaponEl.textContent = `Arme ${player.weapon}`;
        bombsEl.textContent = String(player.bombs);
        multiplierEl.textContent = `x${getScoreMult().toFixed(1)}`;
        multiplierEl.style.opacity = multTime > 0 || combo >= 2 ? '1' : '0.45';

        comboEl.textContent = combo >= 2 ? `COMBO x${combo}` : '';
        comboEl.classList.toggle('show', combo >= 2);

        grazeDisplay.textContent =
          grazeChain >= 2
            ? `FRÔLEMENTS ${grazes} · CHAÎNE x${grazeChain}`
            : `FRÔLEMENTS ${grazes}`;

        grazeDisplay.style.opacity =
          grazeChain >= 2 ? '1' : '0.6';

        specialBtn.classList.toggle('ready', player.energy >= 100);
        specialBtn.style.opacity = player.energy >= 100 ? '1' : '0.5';

        if (boss) {
          bossBar.style.width = (Math.max(0, boss.hp) / boss.maxHp) * 100 + '%';
        }
      }

      function startGame(selectedMode) {
        mode = selectedMode;
        lastMode = selectedMode;

        countdownToken++;
        countdownEl.textContent = '';
        countdownEl.classList.remove('show');

        AudioSys.init();
        AudioSys.resume();
        AudioSys.startMusic();

        sessionBest = best;

        resetGame();

        state = 'playing';
        document.body.classList.add('playing');
        document.body.classList.remove('paused', 'cinema');

        hideAllOverlays();
        refreshSoundButtons();
        refreshMenu();
      }

      function pauseGame() {
        if (state !== 'playing') return;

        countdownToken++;
        countdownEl.textContent = '';
        countdownEl.classList.remove('show');

        state = 'paused';
        document.body.classList.add('paused');

        show(pauseOverlay);

        AudioSys.stopMusic();
        AudioSys.ui();
      }

      function resumeGame() {
        if (state !== 'paused') return;

        hide(pauseOverlay);
        document.body.classList.remove('paused');

        AudioSys.resume();
        AudioSys.ui();

        const token = ++countdownToken;
        let count = 3;

        function displayNext() {
          if (token !== countdownToken) return;

          countdownEl.classList.remove('show');
          void countdownEl.offsetWidth;

          countdownEl.textContent =
            count > 0 ? String(count) : 'GO';

          countdownEl.classList.add('show');

          AudioSys.playNote(
            count > 0
              ? 520 + (3 - count) * 110
              : 880,
            0.08,
            'square',
            0.07
          );

          if (count > 0) {
            count--;
            setTimeout(displayNext, 800);
          } else {
            setTimeout(() => {
              if (token !== countdownToken) return;

              countdownEl.classList.remove('show');
              countdownEl.textContent = '';

              state = 'playing';
              AudioSys.startMusic();
            }, 500);
          }
        }

        state = 'countdown';
        displayNext();
      }

      function awardRunEnd() {
        const totalEarned = computeNanites();
        const earnedNow = Math.max(0, totalEarned - runNanitesPaid);

        runNanitesPaid += earnedNow;
        meta.nanites += earnedNow;

        if (finalDefeated) finalBonusAwarded = true;

        saveMeta();
        refreshMenu();

        return earnedNow;
      }

      function showVictory() {
        state = 'victory';
        document.body.classList.remove('playing', 'paused', 'cinema');

        const earned = awardRunEnd();

        victoryScore.textContent = score.toLocaleString('fr-FR');
        victoryStats.innerHTML =
          `Mode : ${mode === 'survie' ? 'Survie' : 'Campagne'}<br>` +
          `Difficulté : ${difficulty === 'normal' ? 'Normale' : 'Cauchemar'}<br>` +
          `Vaisseau : ${SHIPS[meta.ship || 0].name}<br>` +
          `Vague : ${wave} · Destructions : ${gameKills}<br>` +
          `Frôlements : ${grazes}<br>` +
          `Temps : ${formatTime(gameTime)}`;
        victoryEarned.textContent = `Nanites gagnés : +${earned}⬡`;

        hide(pauseOverlay);
        show(victoryOverlay);

        AudioSys.stopMusic();
        AudioSys.power();
      }

      function continueAfterVictory() {
        if (state !== 'victory') return;

        hide(victoryOverlay);

        player.hull = Math.min(player.maxHull, player.hull + 50);
        player.shield = player.maxShield;

        state = 'playing';
        document.body.classList.add('playing');

        startWave(wave + 1);
        updateHUD();

        AudioSys.resume();
        AudioSys.startMusic();
      }

      function gameOver() {
        state = 'gameover';
        document.body.classList.remove('playing', 'paused', 'cinema');

        const earned = awardRunEnd();
        const isRecord = score > sessionBest && score > 0;

        endTitle.textContent = 'Mission terminée';
        if (isRecord) newRecord.classList.remove('hidden');
        else newRecord.classList.add('hidden');

        finalScore.textContent = score.toLocaleString('fr-FR');
        finalHigh.textContent = best.toLocaleString('fr-FR');
        finalStats.innerHTML =
          `Mode : ${mode === 'survie' ? 'Survie' : 'Campagne'}<br>` +
          `Difficulté : ${difficulty === 'normal' ? 'Normale' : 'Cauchemar'}<br>` +
          `Vaisseau : ${SHIPS[meta.ship || 0].name}<br>` +
          `Vague : ${wave} · Destructions : ${gameKills}<br>` +
          `Frôlements : ${grazes}<br>` +
          `Temps : ${formatTime(gameTime)}${mode === 'survie' ? ` · Survie : ${formatTime(survivalTime)}` : ''}`;
        earnedNanites.textContent = `Nanites gagnés : +${earned}⬡`;

        hide(pauseOverlay);
        hide(victoryOverlay);
        show(gameoverOverlay);

        AudioSys.stopMusic();
        AudioSys.explosion(true);
      }

      function toMenu() {
        countdownToken++;
        countdownEl.textContent = '';
        countdownEl.classList.remove('show');

        state = 'menu';
        document.body.classList.remove('playing', 'paused', 'cinema');

        hideAllOverlays();
        show(menuOverlay);

        showBossBar(false);
        refreshMenu();

        AudioSys.stopMusic();
        AudioSys.ui();
      }

      function update(dt) {
        globalTime += dt;
        updateBackground(dt);

        if (state === 'playing') {
          gameTime += dt;

          if (mode === 'survie') {
            survivalTime += dt;
          }

          if (slowTime > 0) slowTime -= dt;

          if (multTime > 0) {
            multTime -= dt;
            if (multTime <= 0) multiplier = 1;
          }

          if (comboTime > 0) {
            comboTime -= dt;
            if (comboTime <= 0) combo = 0;
          }

          if (grazeChainTime > 0) {
            grazeChainTime -= dt;

            if (grazeChainTime <= 0) {
              grazeChain = 0;
            }
          }

          if (shake > 0) shake = Math.max(0, shake - dt * 1.4);
          if (hitFlash > 0) hitFlash -= dt;

          updatePlayer(dt);
          updateSpawner(dt);

          const eDt = dt * (slowTime > 0 ? 0.45 : 1);

          updateEnemies(eDt);
          updateBullets(dt, eDt);
          updateBeams(dt);
          updateCollisions();
          updatePowerups(dt);
          updateParticles(dt);
          updateTexts(dt);
          updateShockwaves(dt);

          if (waveBannerTime > 0) waveBannerTime -= dt;

          hudTimer += dt;

          if (hudTimer >= 1 / 30) {
            hudTimer = 0;
            updateHUD();
          }
        } else if (state === 'gameover' || state === 'victory') {
          updateParticles(dt);
          updateTexts(dt);
          updateShockwaves(dt);
          updateBeams(dt);

          if (shake > 0) shake = Math.max(0, shake - dt * 1.4);
          if (hitFlash > 0) hitFlash -= dt;
        }
      }

      function updateBackground(dt) {
        const speedFactor = state === 'playing' ? 1 : 0.35;

        for (const s of stars) {
          s.y += s.s * dt * speedFactor;

          if (s.y > H + 2) {
            s.y = -2;
            s.x = Math.random() * W;
          }
        }
      }






















      resize();
      initStars();
      refreshSoundButtons();
      refreshMenu();

      // ============================================================
      // PATCH NÉBULEUSE PROTOCOL IV.3
      // Graphismes Parallaxe · Shockwaves · MOTEUR AUDIO PREMIUM 2D & STEMS
      // ============================================================
      (() => {
        // --- 1. FONDS & PLANÈTES PARALLAXE ---
        let planets = [];
        let planetTimer = 6;


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


      // ============================================================
      // PATCH NÉBULEUSE PROTOCOL IV.2
      // Dash · Aimant à bonus · Formations · Perf adaptative
      // (frôlement retiré : déjà géré nativement par v4.1)
      // ============================================================
      (() => {
        const plusStyle = document.createElement('style');
        plusStyle.textContent = `
          #dashBtn {
            pointer-events: auto;
            width: 68px;
            height: 68px;
            border-radius: 50%;
            appearance: none;
            -webkit-appearance: none;
            border: 2px solid rgba(255,255,255,0.28);
            color: #e0f2fe;
            font-size: 13px;
            font-weight: 900;
            letter-spacing: 0.08em;
            background:
              radial-gradient(circle at 30% 25%, rgba(224,242,254,0.95), rgba(14,165,233,0.9) 38%, rgba(30,64,175,0.95) 100%);
            box-shadow:
              0 12px 28px rgba(56,189,248,0.20),
              inset 0 2px 12px rgba(255,255,255,0.25);
            opacity: 0.45;
            cursor: pointer;
            transition: opacity .18s ease, transform .1s ease, box-shadow .18s ease;
          }

          #dashBtn.ready {
            opacity: 1;
            box-shadow:
              0 0 30px rgba(56,189,248,0.42),
              0 12px 28px rgba(56,189,248,0.24),
              inset 0 2px 12px rgba(255,255,255,0.28);
          }

          #dashBtn:active {
            transform: scale(0.93);
          }

          #dashBtn:disabled {
            opacity: 0.32;
            filter: grayscale(0.4);
          }

          body.playing.low-hull #vignette {
            background:
              radial-gradient(circle at center, rgba(251,113,133,0.04) 0%, transparent 44%, rgba(251,113,133,0.22) 100%),
              radial-gradient(circle at center, transparent 52%, rgba(0,0,0,0.38) 100%);
            animation: hullPulse .72s ease-in-out infinite alternate;
          }

          @keyframes hullPulse {
            from { opacity: 1; }
            to { opacity: .78; }
          }

          @media (max-width: 390px) {
            .bottom {
              gap: 8px;
            }

            #specialBtn {
              width: 66px;
              height: 66px;
              font-size: 12px;
            }

            #dashBtn {
              width: 60px;
              height: 60px;
              font-size: 11px;
            }

            #bombBtn {
              width: 76px;
              height: 76px;
              font-size: 12px;
            }

            .status {
              padding-left: 8px;
              padding-right: 8px;
            }
          }
        `;
        document.head.appendChild(plusStyle);

        const bottomHud = document.querySelector('#hud .bottom');
        const dashBtn = document.createElement('button');
        dashBtn.id = 'dashBtn';
        dashBtn.type = 'button';
        dashBtn.setAttribute('aria-label', 'Dash');
        dashBtn.textContent = 'DASH';

        if (bottomHud) {
          bottomHud.insertBefore(dashBtn, bottomHud.querySelector('.status'));
        }

        function dashVector() {
          let kx = 0;
          let ky = 0;

          if (keys.ArrowLeft || keys.KeyA) kx -= 1;
          if (keys.ArrowRight || keys.KeyD) kx += 1;
          if (keys.ArrowUp || keys.KeyW) ky -= 1;
          if (keys.ArrowDown || keys.KeyS) ky += 1;

          if (kx || ky) {
            const len = Math.hypot(kx, ky) || 1;
            return { x: kx / len, y: ky / len };
          }

          // Sur mobile, si aucune direction n'est donnée,
          // le dash part automatiquement loin du danger le plus proche.
          let vx = 0;
          let vy = -1;
          let weight = 0;

          for (const b of eBullets) {
            const dx = player.x - b.x;
            const dy = player.y - b.y;
            const d2 = dx * dx + dy * dy;

            if (d2 < 260 * 260) {
              const w = 1 / Math.max(900, d2);
              vx += dx * w;
              vy += dy * w;
              weight += w;
            }
          }

          for (const e of enemies) {
            if (e.y < 0 || e.y > H) continue;

            const dx = player.x - e.x;
            const dy = player.y - e.y;
            const d2 = dx * dx + dy * dy;

            if (d2 < 220 * 220) {
              const w = 0.65 / Math.max(1600, d2);
              vx += dx * w;
              vy += dy * w;
              weight += w;
            }
          }

          if (weight > 0) {
            const len = Math.hypot(vx, vy) || 1;
            return { x: vx / len, y: vy / len };
          }

          return { x: 0, y: -1 };
        }

        function tryDash() {
          if (state !== 'playing' || !player || !player.alive) return;
          if ((player.dashCd || 0) > 0 || (player.dashTime || 0) > 0) return;

          const v = dashVector();

          player.dashTime = 0.16;
          player.dashCd = 1.65;
          player.dashVx = v.x * 980;
          player.dashVy = v.y * 980;
          player.invuln = Math.max(player.invuln, 0.22);

          shake = Math.max(shake, 0.12);

          addText(player.x, player.y - 42, 'DASH', '#a5f3fc');

          for (let i = 0; i < 24; i++) {
            addParticle(
              player.x + rand(-8, 8),
              player.y + rand(-8, 8),
              -v.x * rand(80, 260) + rand(-60, 60),
              -v.y * rand(80, 260) + rand(-60, 60),
              rand(0.16, 0.34),
              rand(1.4, 3.2),
              '#7dd3fc'
            );
          }

          if (AudioSys.ctx && !AudioSys.muted) {
            AudioSys.playNote(520, 0.08, 'triangle', 0.08, 420);
          }

          updateHUD();
        }

        dashBtn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          tryDash();
        });

        window.addEventListener('keydown', (e) => {
          if (e.repeat) return;

          if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyV') {
            e.preventDefault();
            tryDash();
          }
        });

        const baseResetGame = resetGame;
        resetGame = function enhancedResetGame() {
          baseResetGame();

          if (player) {
            player.dashCd = 0;
            player.dashTime = 0;
            player.dashVx = 0;
            player.dashVy = 0;
          }

          updateHUD();
        };

        const baseUpdatePlayer = updatePlayer;
        updatePlayer = function enhancedUpdatePlayer(dt) {
          if (player) {
            player.dashCd = Math.max(0, (player.dashCd || 0) - dt);
          }

          baseUpdatePlayer(dt);

          if (!player || !player.alive || state !== 'playing') return;

          if ((player.dashTime || 0) > 0) {
            const remain = player.dashTime;
            const ease = 0.35 + 0.65 * clamp(remain / 0.16, 0, 1);

            player.x += (player.dashVx || 0) * dt * ease;
            player.y += (player.dashVy || 0) * dt * ease;

            player.x = clamp(player.x, 20, W - 20);
            player.y = clamp(player.y, 70, H - 40);

            player.invuln = Math.max(player.invuln, 0.06);
            player.dashTime = Math.max(0, player.dashTime - dt);

            for (let i = 0; i < 3; i++) {
              addParticle(
                player.x - (player.dashVx || 0) * 0.012 + rand(-6, 6),
                player.y - (player.dashVy || 0) * 0.012 + rand(-6, 6),
                rand(-35, 35),
                rand(-35, 35),
                0.22,
                rand(1.2, 2.6),
                '#38bdf8'
              );
            }
          }
        };

        const baseGameOver = gameOver;
        gameOver = function enhancedGameOver() {
          document.body.classList.remove('low-hull');
          baseGameOver();
        };

        const baseShowVictory = showVictory;
        showVictory = function enhancedShowVictory() {
          document.body.classList.remove('low-hull');
          baseShowVictory();
        };

        updatePowerups = function enhancedUpdatePowerups(dt) {
          const hasPlayer = player && player.alive;
          const magnet =
            hasPlayer
              ? 110 + (meta.talents.credit || 0) * 8 + (player.weapon >= 5 ? 18 : 0)
              : 0;

          for (let i = powerups.length - 1; i >= 0; i--) {
            const p = powerups[i];

            p.t += dt;

            let attracted = false;

            if (hasPlayer) {
              const dx = player.x - p.x;
              const dy = player.y - p.y;
              const d = Math.hypot(dx, dy) || 1;

              if (d < magnet) {
                const pull = 1 - d / magnet;
                const speed = 240 + pull * 680;

                p.x += (dx / d) * speed * dt;
                p.y += (dy / d) * speed * dt;
                attracted = true;

                if (Math.random() < 0.45) {
                  addParticle(
                    p.x,
                    p.y,
                    rand(-20, 20),
                    rand(-20, 20),
                    0.2,
                    1.3,
                    powerColor(p.type)
                  );
                }
              }
            }

            if (!attracted) {
              p.y += p.vy * dt;
              p.x += Math.sin(p.t * 3) * 12 * dt;
            } else {
              p.y += Math.min(20, p.vy) * dt * 0.25;
            }

            if (p.y > H + 40) {
              powerups.splice(i, 1);
              continue;
            }

            if (hasPlayer) {
              const rr = (p.r + player.r + 18) * (p.r + player.r + 18);

              if (dist2(p, player) < rr) {
                applyPowerup(p);
                powerups.splice(i, 1);
              }
            }
          }
        };

        function spawnFormation(kind) {
          const safeX = (x) => clamp(x, 40, Math.max(41, W - 40));

          const make = (type, x, y) => {
            const e = spawnEnemy(type, safeX(x), y);
            e.fireCd += 0.25;
            return e;
          };

          if (kind === 'vee') {
            const step = Math.min(52, Math.max(34, W * 0.12));
            const offsets = [-2, -1, 0, 1, 2];

            offsets.forEach((o, i) => {
              const type =
                i === 2 && wave >= 5
                  ? 'elite'
                  : Math.abs(o) === 2
                    ? 'speeder'
                    : wave >= 4
                      ? 'zig'
                      : 'drone';

              make(type, W / 2 + o * step, -45 - Math.abs(o) * 22);
            });
          } else if (kind === 'wall') {
            const n = W < 430 ? 4 : 5;

            for (let i = 0; i < n; i++) {
              const x = (W / (n + 1)) * (i + 1);
              const type =
                wave >= 6 && i === Math.floor(n / 2)
                  ? 'tank'
                  : wave >= 4 && i % 2
                    ? 'zig'
                    : 'drone';

              make(type, x, -50 - i * 10);
            }
          } else {
            make(wave >= 5 ? 'zig' : 'drone', 48, -50);
            make(wave >= 5 ? 'zig' : 'drone', W - 48, -76);
            make(wave >= 4 ? 'turret' : 'drone', W / 2, -118);
          }
        }

        const baseStartWave = startWave;
        startWave = function enhancedStartWave(n) {
          baseStartWave(n);

          const bossWave = mode === 'survie' ? n % 5 === 0 : n % 3 === 0;
          const finalWave = n === 15 && !finalDefeated;

          if (!finalWave && !bossWave && n >= 2 && spawnQueue.length > 5) {
            const forms = ['vee', 'wall', 'pincer'];
            const count = n >= 8 ? 2 : 1;

            for (let i = 0; i < count; i++) {
              const pos = Math.min(spawnQueue.length, 2 + i * 6);

              spawnQueue.splice(pos, 0, {
                delay: 0.65 + i * 0.15,
                formation: pick(forms)
              });
            }
          }
        };

        updateSpawner = function enhancedUpdateSpawner(dt) {
          if (spawnQueue.length) {
            spawnTimer -= dt;

            if (spawnTimer <= 0) {
              const item = spawnQueue.shift();

              if (item.formation) {
                spawnFormation(item.formation);
              } else if (item.type === 'boss') {
                spawnBoss(item.final);
              } else {
                spawnEnemy(item.type);
              }

              if (spawnQueue.length) {
                spawnTimer = Math.max(0.08, spawnQueue[0].delay || 0.45);
              }
            }
          } else if (enemies.length === 0 && waveBannerTime <= 0) {
            endWave();
          }
        };

        const baseUpdateHUD = updateHUD;
        updateHUD = function enhancedUpdateHUD() {
          baseUpdateHUD();

          if (!player) {
            document.body.classList.remove('low-hull');
            dashBtn.disabled = true;
            return;
          }

          const cd = player.dashCd || 0;
          const dashReady = state === 'playing' && player.alive && cd <= 0;

          dashBtn.disabled = state !== 'playing' || !player.alive;
          dashBtn.classList.toggle('ready', dashReady);
          dashBtn.textContent = cd <= 0 ? 'DASH' : cd.toFixed(1);

          document.body.classList.toggle(
            'low-hull',
            state === 'playing' && player.hull / player.maxHull < 0.28
          );
        };

        let perfAvg = 1 / 60;

        const baseUpdate = update;
        update = function enhancedUpdate(dt) {
          perfAvg = perfAvg * 0.97 + dt * 0.03;
          baseUpdate(dt);
        };

        const baseAddParticle = addParticle;
        addParticle = function enhancedAddParticle(x, y, vx, vy, life, size, color) {
          const cap = perfAvg > 0.025 ? 360 : 650;

          if (particles.length > cap) return;

          baseAddParticle(x, y, vx, vy, life, size, color);
        };

        const baseStartGame = startGame;
        startGame = function enhancedStartGame(selectedMode) {
          document.body.classList.remove('low-hull');
          baseStartGame(selectedMode);
          updateHUD();
        };
      })();



      // ============================================================
      // PATCH NÉBULEUSE PROTOCOL IV.4
      // Feel (hit-stop, camera punch, intro de boss, récap de fin)
      // Résilience (écran de récupération anti-crash)
      // Haptique élargie (Gamepad Rumble API en plus de vibrate())
      // ============================================================
      (() => {
        // --- 1. STYLE ---
        const plusStyle = document.createElement('style');
        plusStyle.textContent = `
          #bossIntroCard {
            position: fixed;
            left: 50%;
            top: 30%;
            transform: translate(-50%, -50%) scale(0.92);
            z-index: 55;
            pointer-events: none;
            text-align: center;
            opacity: 0;
            padding: 14px 34px;
            border-radius: 20px;
            background: linear-gradient(180deg, rgba(4,12,25,0.55), rgba(4,12,25,0.22));
            border: 1px solid rgba(244, 63, 94, 0.4);
            box-shadow: 0 0 40px rgba(244, 63, 94, 0.25);
            font-weight: 900;
            font-size: clamp(20px, 6vw, 34px);
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: #fecdd3;
            text-shadow: 0 0 22px rgba(244, 63, 94, 0.55);
          }

          #bossIntroCard.show {
            animation: bossIntroPulse 2.1s cubic-bezier(.16,.9,.2,1) both;
          }

          @keyframes bossIntroPulse {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.85); }
            12% { opacity: 1; transform: translate(-50%, -50%) scale(1.04); }
            20% { transform: translate(-50%, -50%) scale(1); }
            82% { opacity: 1; }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(0.94); }
          }

          #crashOverlay {
            position: fixed;
            inset: 0;
            z-index: 90;
            display: none;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 16px;
            padding: 24px;
            text-align: center;
            background: rgba(2, 4, 9, 0.94);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
          }

          #crashOverlay.show {
            display: flex;
          }

          #crashOverlay h2 {
            font-size: 22px;
            font-weight: 900;
            color: #fecdd3;
          }

          #crashOverlay p {
            font-size: 14px;
            color: rgba(234, 246, 255, 0.72);
            max-width: 380px;
            line-height: 1.5;
          }

          @media (prefers-reduced-motion: reduce) {
            #bossIntroCard.show {
              animation-duration: 1.4s;
            }
          }
        `;
        document.head.appendChild(plusStyle);

        // --- 2. DOM ---
        const bossIntroEl = document.createElement('div');
        bossIntroEl.id = 'bossIntroCard';
        document.body.appendChild(bossIntroEl);

        const crashOverlay = document.createElement('div');
        crashOverlay.id = 'crashOverlay';
        crashOverlay.innerHTML = `
          <h2>Turbulence détectée</h2>
          <p>Le moteur de jeu a rencontré une erreur inattendue. Votre progression et vos nanites sont déjà sauvegardés — un rechargement suffit à repartir.</p>
        `;
        const crashReloadBtn = document.createElement('button');
        crashReloadBtn.className = 'btn';
        crashReloadBtn.style.pointerEvents = 'auto';
        crashReloadBtn.textContent = 'Recharger';
        crashReloadBtn.addEventListener('click', () => location.reload());
        crashOverlay.appendChild(crashReloadBtn);
        document.body.appendChild(crashOverlay);

        let crashShown = false;

        function showCrashOverlay(err) {
          if (crashShown) return;
          crashShown = true;

          try {
            console.error('Nébuleuse Protocol IV — erreur moteur de jeu', err);
          } catch (e) {}

          crashOverlay.classList.add('show');
        }

        // --- 3. HIT-STOP & CAMERA PUNCH ---
        function triggerHitStop(duration) {
          hitStopTimer = Math.max(hitStopTimer, duration);
        }

        function triggerCamPunch(mag, duration) {
          if (reducedMotion) return;

          camPunchMag = Math.max(camPunchMag, mag);
          camPunchTime = duration;
          camPunchDuration = duration;
        }

        // --- 4. HAPTIQUE ÉLARGIE : GAMEPAD RUMBLE ---
        // navigator.vibrate() n'existe simplement pas sous Safari iOS
        // (aucune page web ne peut le contourner). La Gamepad Haptics
        // API fonctionne en revanche sur iPhone dès qu'une manette
        // physique (MFi/Bluetooth) est appairée — c'est la seule vraie
        // vibration disponible sur iPhone depuis le web.
        function gamepadRumble(pattern) {
          if (!navigator.getGamepads) return;

          let duration = 0;

          if (Array.isArray(pattern)) {
            for (let i = 0; i < pattern.length; i += 2) {
              duration += pattern[i] || 0;
            }
          } else {
            duration = pattern || 0;
          }

          duration = clamp(duration, 20, 260);

          const strong = Array.isArray(pattern)
            ? Math.min(1, 0.35 + pattern.length * 0.08)
            : 0.4;

          try {
            const pads = navigator.getGamepads();

            for (const gp of pads) {
              if (gp && gp.vibrationActuator && gp.vibrationActuator.playEffect) {
                gp.vibrationActuator
                  .playEffect('dual-rumble', {
                    startDelay: 0,
                    duration,
                    weakMagnitude: strong * 0.6,
                    strongMagnitude: strong
                  })
                  .catch(() => {});
              }
            }
          } catch (e) {}
        }

        const baseVibrate = vibrate;
        vibrate = function hapticVibrate(pattern) {
          baseVibrate(pattern);
          gamepadRumble(pattern);
        };

        // --- 5. IMPACTS : boss/mini-boss tués, vie perdue, bombe, NOVA ---
        const baseKillEnemy = killEnemy;
        killEnemy = function enhancedKillEnemy(index) {
          const e = enemies[index];
          const wasBoss = !!e && e.type === 'boss';
          const wasMiniboss = !!e && e.type === 'miniboss';

          baseKillEnemy(index);

          if (combo > maxCombo) maxCombo = combo;

          if (wasBoss) {
            triggerHitStop(0.09);
            triggerCamPunch(0.06, 0.5);
          } else if (wasMiniboss) {
            triggerHitStop(0.05);
            triggerCamPunch(0.035, 0.35);
          }
        };

        const baseRegisterGraze = registerGraze;
        registerGraze = function trackedRegisterGraze(bullet) {
          baseRegisterGraze(bullet);
          if (grazeChain > bestGrazeChain) bestGrazeChain = grazeChain;
        };

        const baseLoseLife = loseLife;
        loseLife = function enhancedLoseLife() {
          baseLoseLife();
          triggerHitStop(0.07);
          triggerCamPunch(0.045, 0.4);
        };

        const baseDoBomb = doBomb;
        doBomb = function enhancedDoBomb() {
          const before = player ? player.bombs : 0;
          baseDoBomb();

          if (player && player.bombs < before) {
            triggerHitStop(0.05);
            triggerCamPunch(0.04, 0.4);
          }
        };

        const baseDoSpecial = doSpecial;
        doSpecial = function enhancedDoSpecial() {
          const before = player ? player.energy : 0;
          baseDoSpecial();

          if (player && before >= 100 && player.energy === 0) {
            triggerCamPunch(0.03, 0.35);
          }
        };

        // --- 6. INTRO DE BOSS ---
        const baseSpawnBoss = spawnBoss;
        spawnBoss = function enhancedSpawnBoss(isFinal) {
          baseSpawnBoss(isFinal);

          if (!boss) return;

          bossIntroName = boss.name;
          bossIntroTimer = 2.1;

          triggerHitStop(0.12);

          bossIntroEl.textContent = bossIntroName;
          bossIntroEl.classList.remove('show');
          void bossIntroEl.offsetWidth;
          bossIntroEl.classList.add('show');

          vibrate([15, 40, 15, 40, 15]);
        };

        // --- 7. RÉCAP DE FIN DE RUN ---
        function appendHighlights(el) {
          const parts = [];

          if (maxCombo >= 2) parts.push(`Meilleur combo : x${maxCombo}`);
          if (bestGrazeChain >= 2) parts.push(`Meilleure chaîne de frôlement : x${bestGrazeChain}`);

          if (parts.length) el.innerHTML += `<br>${parts.join(' · ')}`;
        }

        const baseGameOver = gameOver;
        gameOver = function highlightsGameOver() {
          baseGameOver();
          appendHighlights(finalStats);
        };

        const baseShowVictory = showVictory;
        showVictory = function highlightsShowVictory() {
          baseShowVictory();
          appendHighlights(victoryStats);
        };

        const baseResetGame = resetGame;
        resetGame = function freshResetGame() {
          baseResetGame();

          maxCombo = 0;
          bestGrazeChain = 0;
          hitStopTimer = 0;
          camPunchTime = 0;
          bossIntroTimer = 0;

          bossIntroEl.classList.remove('show');
        };

        // --- 8. BOUCLE : hit-stop, décompte de l'intro, dt effectif ---
        const baseUpdate = update;
        update = function resilientUpdate(dt) {
          if (camPunchTime > 0) {
            camPunchTime = Math.max(0, camPunchTime - dt);
          }

          if (bossIntroTimer > 0) {
            bossIntroTimer = Math.max(0, bossIntroTimer - dt);
            if (bossIntroTimer === 0) bossIntroEl.classList.remove('show');
          }

          let effDt = dt;

          if (hitStopTimer > 0) {
            hitStopTimer = Math.max(0, hitStopTimer - dt);
            effDt = dt * 0.08;
          }

          baseUpdate(effDt);
        };

        // --- 9. RENDU : pulse de zoom caméra ---
        const baseDraw = draw;
        draw = function punchedDraw() {
          if (camPunchTime > 0 && camPunchMag > 0) {
            const t = camPunchTime / camPunchDuration;
            const s = 1 + camPunchMag * t;

            ctx.save();
            ctx.translate(W / 2, H / 2);
            ctx.scale(s, s);
            ctx.translate(-W / 2, -H / 2);

            baseDraw();

            ctx.restore();
          } else {
            baseDraw();
          }
        };

        // --- 10. FILET ANTI-CRASH ---
        const baseFrame = frame;
        frame = function safeFrame(t) {
          try {
            baseFrame(t);
          } catch (err) {
            showCrashOverlay(err);
          }
        };

        window.addEventListener('error', (e) => showCrashOverlay(e.error || e.message));
        window.addEventListener('unhandledrejection', (e) => showCrashOverlay(e.reason));
      })();



      // ============================================================
      // PATCH NÉBULEUSE PROTOCOL IV.5
      // Secteurs visuels · Nouveaux ennemis · Vaisseaux à débloquer
      // Mode Ascension (mutateurs, défi du jour)
      // ============================================================
      (() => {
        // --- 1. STYLE ---
        const plusStyle = document.createElement('style');
        plusStyle.textContent = `
          .ship-card.disabled {
            opacity: 0.42;
            pointer-events: none;
          }

          #mutatorBadge {
            position: absolute;
            top: calc(env(safe-area-inset-top) + 92px);
            left: 14px;
            right: 14px;
            text-align: center;
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #fbbf24;
            text-shadow: 0 0 14px rgba(251, 191, 36, 0.4);
            opacity: 0;
            transition: opacity 0.25s ease;
            pointer-events: none;
          }

          #mutatorBadge.show {
            opacity: 0.85;
          }
        `;
        document.head.appendChild(plusStyle);

        // --- 2. BADGE MUTATEUR ---
        const mutatorBadge = document.createElement('div');
        mutatorBadge.id = 'mutatorBadge';
        document.body.appendChild(mutatorBadge);

        // --- 3. SECTEURS VISUELS ---
        const SECTOR_PALETTES = [
          {
            top: '#030711', mid: '#060b1c', bottom: '#0a0618',
            colors: [
              'rgba(56, 189, 248, 0.10)',
              'rgba(129, 140, 248, 0.12)',
              'rgba(217, 70, 239, 0.08)',
              'rgba(16, 185, 129, 0.06)'
            ]
          },
          {
            top: '#0a0713', mid: '#150a24', bottom: '#1a0a1f',
            colors: [
              'rgba(168, 85, 247, 0.14)',
              'rgba(217, 70, 239, 0.10)',
              'rgba(99, 102, 241, 0.10)',
              'rgba(56, 189, 248, 0.05)'
            ]
          },
          {
            top: '#0d0508', mid: '#1a070a', bottom: '#150306',
            colors: [
              'rgba(244, 63, 94, 0.14)',
              'rgba(251, 146, 60, 0.10)',
              'rgba(217, 70, 239, 0.07)',
              'rgba(251, 191, 36, 0.06)'
            ]
          }
        ];

        function currentSectorIndex() {
          if (wave >= 10) return 2;
          if (wave >= 5) return 1;
          return 0;
        }

        function sectorMakeBackground() {
          const pal = SECTOR_PALETTES[currentSectorIndex()];

          bg.width = Math.floor(W * DPR);
          bg.height = Math.floor(H * DPR);
          bctx.setTransform(DPR, 0, 0, DPR, 0, 0);

          const g = bctx.createLinearGradient(0, 0, 0, H);
          g.addColorStop(0, pal.top);
          g.addColorStop(0.45, pal.mid);
          g.addColorStop(1, pal.bottom);
          bctx.fillStyle = g;
          bctx.fillRect(0, 0, W, H);

          for (let i = 0; i < 9; i++) {
            const x = rand(0, W);
            const y = rand(0, H);
            const r = rand(Math.min(W, H) * 0.18, Math.min(W, H) * 0.55);
            const rg = bctx.createRadialGradient(x, y, 0, x, y, r);
            rg.addColorStop(0, pick(pal.colors));
            rg.addColorStop(1, 'rgba(0, 0, 0, 0)');

            bctx.fillStyle = rg;
            bctx.beginPath();
            bctx.arc(x, y, r, 0, TAU);
            bctx.fill();
          }
        }

        makeBackground = sectorMakeBackground;

        const baseStartWaveSectors = startWave;
        startWave = function sectorStartWave(n) {
          baseStartWaveSectors(n);

          const idx = currentSectorIndex();
          if (idx !== lastSectorIndex) {
            const firstTime = lastSectorIndex === -1;
            lastSectorIndex = idx;
            makeBackground();

            if (!firstTime) {
              vibrate(12);
              AudioSys.playNote(idx === 2 ? 220 : 340, 0.5, 'sine', 0.06, idx === 2 ? -60 : 40);
            }
          }
        };

        // --- 4. NOUVEAUX ENNEMIS : Sentinelle & Essaim ---
        const baseSpawnEnemy = spawnEnemy;
        spawnEnemy = function extendedSpawnEnemy(type, x, y) {
          if (type !== 'sentinel' && type !== 'swarmer') {
            return baseSpawnEnemy(type, x, y);
          }

          const d = getDiff();
          const hpScale = (1 + d * 0.16) * dm().hp;
          const px = x === undefined ? rand(40, Math.max(41, W - 40)) : x;
          const py = y === undefined ? -40 : y;

          const e = {
            type,
            x: px,
            y: py,
            baseX: px,
            t: rand(0, TAU),
            fireCd: rand(0.8, 2.0),
            customFireCd: rand(0.6, 1.4),
            vy: 0,
            r: 14,
            hp: 10,
            maxHp: 10,
            score: 100,
            elite: false
          };

          if (type === 'sentinel') {
            e.r = 15;
            e.hp = e.maxHp = 46 * hpScale;
            e.vy = 30;
            e.score = 260;
          } else {
            e.r = 7;
            e.hp = e.maxHp = 6 * hpScale;
            e.vy = 165;
            e.score = 70;
          }

          enemies.push(e);
          return e;
        };

        const baseUpdateEnemies = updateEnemies;
        updateEnemies = function extendedUpdateEnemies(dt) {
          const d = getDiff();

          for (const e of enemies) {
            if (e.type === 'sentinel') {
              e.y += e.vy * dt;
              e.customFireCd -= dt / dm().fire;

              if (e.customFireCd <= 0 && e.y > 10 && e.y < H * 0.6 && player.alive) {
                const sweepBase = e.t * 1.4;
                for (let k = -1; k <= 1; k++) {
                  const a = sweepBase + k * 0.5;
                  fireEnemyBullet(
                    e.x,
                    e.y,
                    Math.cos(a) * (150 + d * 4),
                    Math.sin(a) * (150 + d * 4) + 60,
                    5,
                    11,
                    '#facc15'
                  );
                }
                e.customFireCd = 1.6 - Math.min(0.5, d * 0.02);
              }
            } else if (e.type === 'swarmer') {
              e.x = e.baseX + Math.sin(e.t * 9) * 26;
              e.y += e.vy * dt;
            }
          }

          baseUpdateEnemies(dt);
        };

        const baseDrawEnemies = drawEnemies;
        drawEnemies = function extendedDrawEnemies() {
          baseDrawEnemies();

          for (const e of enemies) {
            if (e.type === 'sentinel') {
              ctx.save();
              ctx.translate(e.x, e.y);
              ctx.rotate(e.t * 0.6);
              drawHexagon(e.r, '#facc15');
              ctx.rotate(-e.t * 1.2);
              ctx.beginPath();
              ctx.arc(0, 0, e.r * 0.32, 0, TAU);
              ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + 0.4 * Math.sin(e.t * 6)})`;
              ctx.fill();
              ctx.restore();
            } else if (e.type === 'swarmer') {
              ctx.save();
              ctx.translate(e.x, e.y);
              ctx.rotate(Math.PI);
              drawTriangle(e.r, '#fb923c');
              ctx.restore();
            }
          }
        };

        const baseEnemyColor = enemyColor;
        enemyColor = function extendedEnemyColor(type) {
          if (type === 'sentinel') return '#facc15';
          if (type === 'swarmer') return '#fb923c';
          return baseEnemyColor(type);
        };

        const baseGetWaveTypes = getWaveTypes;
        getWaveTypes = function extendedGetWaveTypes(n) {
          const a = baseGetWaveTypes(n);
          if (n >= 3) a.push('sentinel');
          if (n >= 4) a.push('swarmer', 'swarmer');
          return a;
        };

        // --- 5. VAISSEAUX À DÉBLOQUER ---
        const SHIP_UNLOCK_SCORE = [0, 15000, 60000];

        function isShipUnlocked(i) {
          return best >= SHIP_UNLOCK_SCORE[i];
        }

        renderShips = function gatedRenderShips() {
          shipList.innerHTML = SHIPS.map((s, i) => {
            const unlocked = isShipUnlocked(i);
            const need = SHIP_UNLOCK_SCORE[i];

            return `
              <div class="ship-card ${i === meta.ship ? 'selected' : ''} ${unlocked ? '' : 'disabled'}" data-ship="${i}">
                <strong>${s.name}${unlocked ? '' : ' 🔒'}</strong>
                <span>${unlocked ? s.desc : `Débloqué à ${need.toLocaleString('fr-FR')} points de score.`}</span>
                <div class="ship-stats">${unlocked ? `Vitesse ${s.speed} · Coque ${s.hull} · Bouclier ${s.shield} · Bombes ${s.bombs} · Arme ${s.weapon}` : ''}</div>
              </div>
            `;
          }).join('');

          shipList.querySelectorAll('.ship-card:not(.disabled)').forEach((el) => {
            el.addEventListener('click', () => {
              meta.ship = parseInt(el.dataset.ship, 10);
              saveMeta();
              renderShips();
              AudioSys.ui();
            });
          });
        };

        // --- 6. MODE ASCENSION (mutateurs) ---
        const MUTATORS = {
          blitz: { name: 'Blitz', desc: 'Ennemis plus rapides à tirer · Score ×1.5' },
          fragile: { name: 'Coque fragile', desc: 'Une seule vie · Nanites ×1.8' },
          ruee: { name: 'Ruée', desc: '+35% d’ennemis par vague · Nanites ×1.3' }
        };
        const MUTATOR_IDS = Object.keys(MUTATORS);

        function computeDailyMutatorId() {
          const day = new Date().toISOString().slice(0, 10);
          let hash = 0;
          for (let i = 0; i < day.length; i++) {
            hash = (hash * 31 + day.charCodeAt(i)) >>> 0;
          }
          return MUTATOR_IDS[hash % MUTATOR_IDS.length];
        }

        dailyMutatorId = computeDailyMutatorId();

        const baseDm = dm;
        dm = function mutatedDm() {
          const base = baseDm();
          if (activeMutator === 'blitz') {
            return Object.assign({}, base, { fire: base.fire * 0.72, score: base.score * 1.5 });
          }
          return base;
        };

        const baseComputeNanites = computeNanites;
        computeNanites = function mutatedComputeNanites() {
          let n = baseComputeNanites();
          if (activeMutator === 'ruee') n = Math.round(n * 1.3);
          if (activeMutator === 'fragile') n = Math.round(n * 1.8);
          return n;
        };

        const baseStartWaveMutator = startWave;
        startWave = function mutatorStartWave(n) {
          baseStartWaveMutator(n);

          if (activeMutator === 'ruee' && spawnQueue.length > 3) {
            const extra = Math.ceil(spawnQueue.length * 0.35);
            const types = ['drone', 'zig', 'speeder'];

            for (let i = 0; i < extra; i++) {
              spawnQueue.push({ delay: rand(0.3, 0.8), type: pick(types) });
            }
          }
        };

        const baseResetGameMutator = resetGame;
        resetGame = function mutatorResetGame() {
          baseResetGameMutator();

          if (activeMutator === 'fragile' && player) {
            player.lives = 1;
          }

          if (activeMutator) {
            mutatorBadge.textContent = `MUTATEUR : ${MUTATORS[activeMutator].name}`;
            mutatorBadge.classList.add('show');
          } else {
            mutatorBadge.classList.remove('show');
          }
        };

        const baseStartGameMutator = startGame;
        startGame = function mutatorStartGame(selectedMode, mutatorChoice) {
          if (selectedMode === 'ascension') {
            activeMutator = mutatorChoice || dailyMutatorId;
            baseStartGameMutator('campagne');
            toast(`Ascension — ${MUTATORS[activeMutator].name} : ${MUTATORS[activeMutator].desc}`, 'gold');
          } else {
            activeMutator = null;
            baseStartGameMutator(selectedMode);
          }
        };

        function appendMutatorStats(el) {
          if (!activeMutator) return;
          el.innerHTML += `<br>Ascension — ${MUTATORS[activeMutator].name}`;
        }

        const baseGameOverMutator = gameOver;
        gameOver = function mutatorGameOver() {
          baseGameOverMutator();
          appendMutatorStats(finalStats);
        };

        const baseShowVictoryMutator = showVictory;
        showVictory = function mutatorShowVictory() {
          baseShowVictoryMutator();
          appendMutatorStats(victoryStats);
        };

        // --- 7. BOUTON ASCENSION DANS LE MENU ---
        const menuBtnRow = document.querySelector('#menu .btn-row');
        const ascensionBtn = document.createElement('button');
        ascensionBtn.id = 'modeAscension';
        ascensionBtn.className = 'btn secondary';
        ascensionBtn.textContent = 'Ascension (défi du jour)';

        if (menuBtnRow) {
          menuBtnRow.insertBefore(ascensionBtn, menuBtnRow.children[2] || null);
        }

        ascensionBtn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          startGame('ascension');
        });
      })();



      // ============================================================
      // PATCH NÉBULEUSE PROTOCOL IV.6
      // Cosmétiques (traînées) · Prestige · Succès · Sauvegarde export/import
      // ============================================================
      (() => {
        // --- 1. STYLE ---
        const plusStyle = document.createElement('style');
        plusStyle.textContent = `
          .section-label {
            margin-top: 18px;
            margin-bottom: 8px;
            text-align: left;
            font-size: 11px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.14em;
            color: rgba(234, 246, 255, 0.5);
          }

          .trail-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
            gap: 8px;
            margin-bottom: 6px;
          }

          .trail-swatch {
            pointer-events: auto;
            height: 44px;
            border-radius: 12px;
            border: 2px solid rgba(255, 255, 255, 0.12);
            cursor: pointer;
            display: grid;
            place-items: center;
            font-size: 11px;
            font-weight: 900;
            color: rgba(2, 4, 9, 0.75);
          }

          .trail-swatch.selected {
            border-color: #fff;
            box-shadow: 0 0 14px rgba(255, 255, 255, 0.35);
          }

          .trail-swatch.locked {
            opacity: 0.35;
            color: rgba(234, 246, 255, 0.6);
            pointer-events: auto;
          }

          #prestigeSection {
            margin-top: 4px;
          }

          #prestigeBtn {
            width: 100%;
          }

          #prestigeBtn:disabled {
            opacity: 0.35;
            pointer-events: none;
          }

          .ach-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 14px;
            border-radius: 16px;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.09);
            text-align: left;
          }

          .ach-item.locked {
            opacity: 0.4;
          }

          .ach-icon {
            font-size: 22px;
          }

          #saveBox {
            width: 100%;
            min-height: 70px;
            margin-top: 10px;
            padding: 10px;
            border-radius: 12px;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #eaf6ff;
            font-size: 11px;
            font-family: monospace;
            resize: vertical;
            pointer-events: auto;
          }
        `;
        document.head.appendChild(plusStyle);

        // --- 2. COSMÉTIQUES : TRAÎNÉES ---
        const TRAILS = [
          { id: 'default', name: 'Défaut', color: '#38bdf8', cost: 0 },
          { id: 'gold', name: 'Or', color: '#fbbf24', cost: 120 },
          { id: 'violet', name: 'Violet', color: '#a78bfa', cost: 120 },
          { id: 'emerald', name: 'Émeraude', color: '#34d399', cost: 120 },
          { id: 'rose', name: 'Rose', color: '#fb7185', cost: 180 },
          { id: 'blanc', name: 'Blanc', color: '#f8feff', cost: 220 }
        ];

        if (!meta.unlockedTrails) meta.unlockedTrails = ['default'];
        if (!meta.trail) meta.trail = 'default';

        function currentTrailColor() {
          const t = TRAILS.find((t) => t.id === meta.trail) || TRAILS[0];
          return t.color;
        }

        const trailSection = document.createElement('div');
        trailSection.innerHTML = `
          <div class="section-label">Traînées de vaisseau</div>
          <div class="trail-grid" id="trailGrid"></div>
        `;
        labList.insertAdjacentElement('afterend', trailSection);
        const trailGrid = trailSection.querySelector('#trailGrid');


        // trail particles : couche additive indépendante du trail par défaut
        let trailTick = 0;
        const baseUpdatePlayerTrail = updatePlayer;
        updatePlayer = function trailUpdatePlayer(dt) {
          baseUpdatePlayerTrail(dt);

          if (meta.trail !== 'default' && player && player.alive && state === 'playing') {
            trailTick += dt;
            if (trailTick >= 0.02) {
              trailTick = 0;
              addParticle(
                player.x + rand(-3, 3),
                player.y + 16,
                rand(-10, 10),
                rand(70, 140),
                0.3,
                rand(1.4, 3),
                currentTrailColor()
              );
            }
          }
        };

        // --- 3. PRESTIGE : SURCHARGE ---
        if (!meta.prestige) meta.prestige = 0;

        function talentsMaxed() {
          return TALENTS.every((t) => (meta.talents[t.key] || 0) >= t.max);
        }

        const prestigeSection = document.createElement('div');
        prestigeSection.id = 'prestigeSection';
        prestigeSection.innerHTML = `
          <div class="section-label">Prestige</div>
          <button id="prestigeBtn" class="btn secondary">Surcharge</button>
        `;
        trailSection.insertAdjacentElement('afterend', prestigeSection);
        const prestigeBtn = prestigeSection.querySelector('#prestigeBtn');

        function renderPrestige() {
          const maxed = talentsMaxed();
          prestigeBtn.disabled = !maxed;
          prestigeBtn.textContent = maxed
            ? `Surcharge (niveau ${meta.prestige} → ${meta.prestige + 1}) : réinitialise les talents, +15% de score permanent`
            : `Surcharge — débloqué une fois tous les talents maxés (niveau actuel ${meta.prestige})`;
        }

        prestigeBtn.addEventListener('click', () => {
          if (!talentsMaxed()) return;

          meta.prestige += 1;
          Object.keys(meta.talents).forEach((k) => { meta.talents[k] = 0; });
          saveMeta();

          renderLab();
          renderPrestige();
          refreshMenu();
          AudioSys.power();
          toast(`Surcharge niveau ${meta.prestige} — score +${meta.prestige * 15}% permanent`, 'gold');
        });

        const baseGetScoreMult = getScoreMult;
        getScoreMult = function prestigedScoreMult() {
          return baseGetScoreMult() * (1 + (meta.prestige || 0) * 0.15);
        };

        const baseRenderLab = renderLab;
        renderLab = function extendedRenderLab() {
          baseRenderLab();
          renderTrails();
          renderPrestige();
        };

        // --- 4. SUCCÈS ---
        const ACHIEVEMENTS = [
          { id: 'finisher', icon: '🏆', name: 'Première victoire', desc: 'Vaincre Nébuleuse Prime', check: () => finalDefeated },
          { id: 'combo20', icon: '🔥', name: 'Combo x20', desc: 'Atteindre un combo de 20', check: () => (typeof maxCombo !== 'undefined' && maxCombo >= 20) },
          { id: 'graze15', icon: '✨', name: 'Frôleur aguerri', desc: 'Chaîne de frôlement x15', check: () => (typeof bestGrazeChain !== 'undefined' && bestGrazeChain >= 15) },
          { id: 'wave10', icon: '🌊', name: 'Vague 10 atteinte', desc: 'Survivre jusqu’à la vague 10', check: () => wave >= 10 },
          { id: 'nightmare', icon: '💀', name: 'Cauchemar vaincu', desc: 'Battre le boss final en Cauchemar', check: () => (difficulty === 'cauchemar' && finalDefeated) },
          { id: 'collector', icon: '⬡', name: 'Collectionneur', desc: '1000 nanites gagnés au total', check: () => (meta.totalNanitesEarned || 0) >= 1000 },
          { id: 'novaAce', icon: '💫', name: 'As de la NOVA', desc: 'Utiliser NOVA 20 fois', check: () => (meta.novaUses || 0) >= 20 },
          { id: 'bomber', icon: '☄️', name: 'Artificier', desc: 'Utiliser 50 bombes', check: () => (meta.bombUses || 0) >= 50 }
        ];

        if (!meta.achievements) meta.achievements = [];
        if (!meta.totalNanitesEarned) meta.totalNanitesEarned = 0;
        if (!meta.novaUses) meta.novaUses = 0;
        if (!meta.bombUses) meta.bombUses = 0;

        function checkAchievements() {
          let unlockedNew = false;

          for (const a of ACHIEVEMENTS) {
            if (meta.achievements.includes(a.id)) continue;

            let ok = false;
            try { ok = !!a.check(); } catch (e) { ok = false; }

            if (ok) {
              meta.achievements.push(a.id);
              unlockedNew = true;
              toast(`Succès débloqué : ${a.icon} ${a.name}`, 'gold');
              vibrate([20, 30, 20, 30, 40]);
            }
          }

          if (unlockedNew) saveMeta();
        }

        const baseUpdateHUDAch = updateHUD;
        updateHUD = function achUpdateHUD() {
          baseUpdateHUDAch();
          checkAchievements();
        };

        const baseAwardRunEnd = awardRunEnd;
        awardRunEnd = function trackedAwardRunEnd() {
          const earned = baseAwardRunEnd();
          meta.totalNanitesEarned = (meta.totalNanitesEarned || 0) + earned;
          saveMeta();
          return earned;
        };

        const baseDoSpecialAch = doSpecial;
        doSpecial = function achDoSpecial() {
          const before = player ? player.energy : 0;
          baseDoSpecialAch();
          if (player && before >= 100 && player.energy === 0) {
            meta.novaUses = (meta.novaUses || 0) + 1;
            saveMeta();
          }
        };

        const baseDoBombAch = doBomb;
        doBomb = function achDoBomb() {
          const before = player ? player.bombs : 0;
          baseDoBombAch();
          if (player && player.bombs < before) {
            meta.bombUses = (meta.bombUses || 0) + 1;
            saveMeta();
          }
        };

        // écran Succès
        const achOverlay = document.createElement('div');
        achOverlay.id = 'achOverlay';
        achOverlay.className = 'overlay hidden';
        achOverlay.innerHTML = `
          <div class="card">
            <div class="title small-title">Succès</div>
            <div id="achList" class="grid"></div>
            <div class="btn-row">
              <button id="closeAchBtn" class="btn">Retour</button>
            </div>
          </div>
        `;
        document.body.appendChild(achOverlay);

        function renderAchievements() {
          const list = achOverlay.querySelector('#achList');
          list.innerHTML = ACHIEVEMENTS.map((a) => {
            const unlocked = meta.achievements.includes(a.id);
            return `
              <div class="ach-item ${unlocked ? '' : 'locked'}">
                <div class="ach-icon">${unlocked ? a.icon : '🔒'}</div>
                <div>
                  <strong>${a.name}</strong>
                  <span>${a.desc}</span>
                </div>
              </div>
            `;
          }).join('');
        }

        achOverlay.querySelector('#closeAchBtn').addEventListener('click', () => {
          hide(achOverlay);
          show(menuOverlay);
          AudioSys.ui();
        });

        const achBtn = document.createElement('button');
        achBtn.id = 'achBtn';
        achBtn.className = 'btn secondary';
        achBtn.textContent = 'Succès';
        const menuBtnRow = document.querySelector('#menu .btn-row');
        if (menuBtnRow) menuBtnRow.appendChild(achBtn);

        achBtn.addEventListener('click', () => {
          renderAchievements();
          hide(menuOverlay);
          show(achOverlay);
          AudioSys.ui();
        });

        window.addEventListener('keydown', (e) => {
          if (e.code === 'Escape' && !isHidden(achOverlay)) {
            hide(achOverlay);
            show(menuOverlay);
          }
        });

        // --- 5. SAUVEGARDE EXPORTABLE ---
        function exportSave() {
          try {
            const payload = { meta, best, v: 4.6 };
            return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
          } catch (e) {
            return '';
          }
        }

        function importSave(code) {
          try {
            const payload = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
            if (!payload || typeof payload !== 'object' || !payload.meta) return false;

            meta = Object.assign({}, meta, payload.meta);
            if (typeof payload.best === 'number' && payload.best > best) {
              best = payload.best;
              saveBest(best);
            }

            saveMeta();
            return true;
          } catch (e) {
            return false;
          }
        }

        const saveSection = document.createElement('div');
        saveSection.innerHTML = `
          <div class="section-label">Sauvegarde</div>
          <div class="btn-row" style="margin-top:0">
            <button id="exportBtn" class="btn secondary">Exporter</button>
            <button id="importBtn" class="btn secondary">Importer</button>
          </div>
          <textarea id="saveBox" placeholder="Le code de sauvegarde apparaît ici" readonly></textarea>
        `;
        prestigeSection.insertAdjacentElement('afterend', saveSection);

        const saveBox = saveSection.querySelector('#saveBox');

        saveSection.querySelector('#exportBtn').addEventListener('click', () => {
          saveBox.readOnly = true;
          saveBox.value = exportSave();
          saveBox.focus();
          saveBox.select();
          try {
            document.execCommand('copy');
            toast('Sauvegarde copiée dans le presse-papiers', 'nano');
          } catch (e) {
            toast('Sauvegarde générée — copiez le texte manuellement');
          }
        });

        saveSection.querySelector('#importBtn').addEventListener('click', () => {
          saveBox.readOnly = false;
          saveBox.value = '';
          saveBox.placeholder = 'Collez votre code de sauvegarde puis appuyez sur Entrée';
          saveBox.focus();
        });

        saveBox.addEventListener('keydown', (e) => {
          if (e.code === 'Enter' && !saveBox.readOnly) {
            e.preventDefault();
            const ok = importSave(saveBox.value);
            saveBox.readOnly = true;

            if (ok) {
              toast('Sauvegarde importée', 'nano');
              refreshMenu();
              renderLab();
              renderTrails();
              renderPrestige();
            } else {
              toast('Code de sauvegarde invalide');
            }
          }
        });
      })();



      // ============================================================
      // PATCH NÉBULEUSE PROTOCOL IV.7
      // Menu Réglages unifié · Accessibilité (daltonien, sensibilité,
      // assistance) · Manifest PWA (liens déjà posés dans le <head>)
      // ============================================================
      (() => {
        // --- 1. STYLE ---
        const plusStyle = document.createElement('style');
        plusStyle.textContent = `
          .settings-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 12px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            text-align: left;
          }

          .settings-row:last-of-type {
            border-bottom: none;
          }

          .settings-row label {
            font-size: 14px;
            font-weight: 700;
            color: #eaf6ff;
          }

          .settings-row .settings-desc {
            display: block;
            margin-top: 2px;
            font-size: 12px;
            font-weight: 400;
            color: rgba(234, 246, 255, 0.6);
          }

          .settings-control {
            pointer-events: auto;
            flex-shrink: 0;
          }

          .settings-control select {
            pointer-events: auto;
            background: rgba(255, 255, 255, 0.08);
            color: #eaf6ff;
            border: 1px solid rgba(255, 255, 255, 0.16);
            border-radius: 10px;
            padding: 8px 10px;
            font-size: 13px;
            font-weight: 700;
          }

          .settings-control input[type="range"] {
            pointer-events: auto;
            width: 130px;
          }

          .toggle-switch {
            pointer-events: auto;
            width: 46px;
            height: 26px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.14);
            border: none;
            position: relative;
            cursor: pointer;
          }

          .toggle-switch::after {
            content: '';
            position: absolute;
            top: 3px;
            left: 3px;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #eaf6ff;
            transition: transform 0.15s ease;
          }

          .toggle-switch.on {
            background: linear-gradient(135deg, #67e8f9, #818cf8);
          }

          .toggle-switch.on::after {
            transform: translateX(20px);
          }
        `;
        document.head.appendChild(plusStyle);

        // --- 2. PALETTE DALTONIEN (filtre canvas) ---
        const CB_FILTERS = {
          none: 'none',
          protanopia: 'saturate(1.4) hue-rotate(-18deg)',
          deuteranopia: 'saturate(1.5) hue-rotate(24deg)',
          tritanopia: 'saturate(1.3) hue-rotate(150deg)'
        };

        if (!meta.colorblind) meta.colorblind = 'none';
        canvas.style.filter = CB_FILTERS[meta.colorblind] || 'none';

        // --- 3. SENSIBILITÉ (variable déjà branchée dans le contrôle tactile) ---
        if (!meta.sensitivity) meta.sensitivity = 1.35;
        controlSensitivity = meta.sensitivity;

        // --- 4. QUALITÉ GRAPHIQUE MANUELLE ---
        if (meta.qualityOverride === undefined) meta.qualityOverride = null;

        function applyQualityOverride() {
          if (meta.qualityOverride === null) {
            document.body.classList.toggle('low-quality', !!lowQuality);
          } else {
            document.body.classList.toggle('low-quality', meta.qualityOverride === 'low');
          }
        }
        applyQualityOverride();

        // --- 5. ASSISTANCE AUTO-BOMBE ---
        if (!meta.assist) meta.assist = false;

        let autoBombCooldown = 0;
        const baseUpdateAssist = update;
        update = function assistUpdate(dt) {
          baseUpdateAssist(dt);

          if (autoBombCooldown > 0) autoBombCooldown -= dt;

          if (
            meta.assist &&
            state === 'playing' &&
            player &&
            player.alive &&
            player.bombs > 0 &&
            autoBombCooldown <= 0 &&
            player.hull / player.maxHull < 0.16
          ) {
            autoBombCooldown = 4;
            doBomb();
          }
        };

        // --- 6. ÉCRAN RÉGLAGES ---
        const settingsOverlay = document.createElement('div');
        settingsOverlay.id = 'settingsOverlay';
        settingsOverlay.className = 'overlay hidden';
        settingsOverlay.innerHTML = `
          <div class="card">
            <div class="title small-title">Réglages</div>

            <div class="settings-row">
              <label>Son<span class="settings-desc">Effets et musique</span></label>
              <div class="settings-control"><button id="stSound" class="toggle-switch"></button></div>
            </div>

            <div class="settings-row">
              <label>Difficulté<span class="settings-desc">Normale ou Cauchemar</span></label>
              <div class="settings-control"><button id="stDiff" class="toggle-switch"></button></div>
            </div>

            <div class="settings-row">
              <label>Qualité graphique<span class="settings-desc">Auto détecte votre appareil</span></label>
              <div class="settings-control">
                <select id="stQuality">
                  <option value="auto">Auto</option>
                  <option value="high">Élevée</option>
                  <option value="low">Réduite</option>
                </select>
              </div>
            </div>

            <div class="settings-row">
              <label>Sensibilité tactile<span class="settings-desc" id="stSensLabel">1.35</span></label>
              <div class="settings-control"><input type="range" id="stSens" min="0.7" max="2.2" step="0.05"></div>
            </div>

            <div class="settings-row">
              <label>Assistance auto-bombe<span class="settings-desc">Bombe automatique à coque critique</span></label>
              <div class="settings-control"><button id="stAssist" class="toggle-switch"></button></div>
            </div>

            <div class="settings-row">
              <label>Palette daltonien<span class="settings-desc">Ajuste les couleurs à l'écran</span></label>
              <div class="settings-control">
                <select id="stColorblind">
                  <option value="none">Désactivée</option>
                  <option value="protanopia">Protanopie</option>
                  <option value="deuteranopia">Deutéranopie</option>
                  <option value="tritanopia">Tritanopie</option>
                </select>
              </div>
            </div>

            <div class="btn-row">
              <button id="closeSettingsBtn" class="btn">Retour</button>
            </div>
          </div>
        `;
        document.body.appendChild(settingsOverlay);

        const stSound = settingsOverlay.querySelector('#stSound');
        const stDiff = settingsOverlay.querySelector('#stDiff');
        const stQuality = settingsOverlay.querySelector('#stQuality');
        const stSens = settingsOverlay.querySelector('#stSens');
        const stSensLabel = settingsOverlay.querySelector('#stSensLabel');
        const stAssist = settingsOverlay.querySelector('#stAssist');
        const stColorblind = settingsOverlay.querySelector('#stColorblind');

        function renderSettings() {
          stSound.classList.toggle('on', !AudioSys.muted);
          stDiff.classList.toggle('on', difficulty === 'cauchemar');
          stQuality.value = meta.qualityOverride || 'auto';
          stSens.value = String(meta.sensitivity || 1.35);
          stSensLabel.textContent = (meta.sensitivity || 1.35).toFixed(2);
          stAssist.classList.toggle('on', !!meta.assist);
          stColorblind.value = meta.colorblind || 'none';
        }

        stSound.addEventListener('click', () => {
          AudioSys.init();
          AudioSys.setMuted(!AudioSys.muted);
          refreshSoundButtons();
          renderSettings();
          AudioSys.ui();
        });

        stDiff.addEventListener('click', () => {
          difficulty = difficulty === 'normal' ? 'cauchemar' : 'normal';
          meta.diff = difficulty;
          saveMeta();
          refreshDifficulty();
          renderSettings();
          AudioSys.ui();
        });

        stQuality.addEventListener('change', () => {
          meta.qualityOverride = stQuality.value === 'auto' ? null : stQuality.value;
          saveMeta();
          applyQualityOverride();
          AudioSys.ui();
        });

        stSens.addEventListener('input', () => {
          const v = parseFloat(stSens.value);
          controlSensitivity = v;
          meta.sensitivity = v;
          stSensLabel.textContent = v.toFixed(2);
        });

        stSens.addEventListener('change', () => saveMeta());

        stAssist.addEventListener('click', () => {
          meta.assist = !meta.assist;
          saveMeta();
          renderSettings();
          AudioSys.ui();
        });

        stColorblind.addEventListener('change', () => {
          meta.colorblind = stColorblind.value;
          canvas.style.filter = CB_FILTERS[meta.colorblind] || 'none';
          saveMeta();
          AudioSys.ui();
        });

        settingsOverlay.querySelector('#closeSettingsBtn').addEventListener('click', () => {
          hide(settingsOverlay);
          show(menuOverlay);
          AudioSys.ui();
        });

        window.addEventListener('keydown', (e) => {
          if (e.code === 'Escape' && !isHidden(settingsOverlay)) {
            hide(settingsOverlay);
            show(menuOverlay);
          }
        });

        // --- 7. CONSOLIDATION DU MENU ---
        const oldDifficultyBtn = document.getElementById('difficultyBtn');
        const oldMenuSound = document.querySelector('#menu .sound-toggle');
        if (oldDifficultyBtn) oldDifficultyBtn.style.display = 'none';
        if (oldMenuSound) oldMenuSound.style.display = 'none';

        const settingsBtn = document.createElement('button');
        settingsBtn.id = 'settingsBtn';
        settingsBtn.className = 'btn secondary';
        settingsBtn.textContent = '⚙ Réglages';
        const menuBtnRow = document.querySelector('#menu .btn-row');
        if (menuBtnRow) menuBtnRow.appendChild(settingsBtn);

        settingsBtn.addEventListener('click', () => {
          renderSettings();
          hide(menuOverlay);
          show(settingsOverlay);
          AudioSys.ui();
        });
      })();


      let last = performance.now();

      function frame(t) {
        const dt = Math.min(0.033, ((t - last) / 1000) || 0.016);
        last = t;

        update(dt);
        draw();

        requestAnimationFrame(frame);
      }

      requestAnimationFrame(frame);
    })();

}
