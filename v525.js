      // ============================================================
      // MODULE V5.25 — LE RÉALISATEUR (rythme de partie)
      // Constat (retours 27/09) : trop peu d'ennemis, puis un TITAN trop facile, trop de bonus,
      // des sons lassants. Cause commune : rien ne pilotait l'intensité de la partie. La densité
      // (v5.19/v5.20), les phénomènes (v5.16), la musique (v5.22) et les bonus (v5.24) avaient
      // chacun leur horloge.
      // Le Réalisateur fait respirer la partie par cycles : MONTÉE → DÉFERLANTE → SOUFFLE.
      //   MONTÉE      ~28 s  rythme normal (accéléré si l'écran est vide ou si le joueur domine)
      //   DÉFERLANTE  ~16 s  arrivées plus serrées, plafond de menace relevé, escadrilles en plus
      //   SOUFFLE     ~6 s   plus aucune arrivée : on reprend son souffle, les phénomènes passent
      // Après un boss, le souffle est plus long (8 s). Un joueur en difficulté (coque basse, coups
      // reçus) saute la déferlante ; un joueur qui domine enchaîne plus vite. Une déferlante
      // traversée sans dégât offre une capsule (« mérité », 1 par minute au plus) ; un joueur très
      // bas reçoit au plus une capsule de coque par 75 s.
      // Équité : désactivé en Opération du jour et en Tournoi (rythme identique pour tous).
      // Réglage « Rythme de partie » : Dynamique (défaut) / Classique (comportement ≤ v5.24).
      // ============================================================
      (() => {
        const G = window.__NP4;
        if (typeof meta.rhythm !== 'string') meta.rhythm = 'dynamic';
        const fixedMode = () => mode === 'operation' || mode === 'tournoi';
        const on = () => meta.rhythm !== 'classic' && !fixedMode();

        const DUR = { build: [24, 32], peak: [14, 19], breath: [5, 7] };
        const K = { build: 1, peak: 1.6, breath: 0, boss: 1 };
        const BUDGET = { build: 1, peak: 1.35, breath: 0.9, boss: 1 };
        const MUSIC = { build: 0.94, peak: 1, breath: 0.78, boss: 1 };

        let phase = 'build', age = 0, dur = 34, cycles = 0;
        let lastHit = -99, dmgWindow = [], emptyT = 0, peakHurt = false;
        let lastMerit = -99, lastRelief = -99, bossSeen = false, peakStartedAt = -99, held = 0, merits = 0, reliefs = 0;
        const log = []; // historique pour les tests : [phase, durée]

        const bossAlive = () => !!(boss && enemies.includes(boss));
        const hullRatio = () => (player ? (player.hull + player.shield * 0.5) / (player.maxHull + player.maxShield * 0.5) : 1);
        const recentDamage = () => dmgWindow.reduce((s, d) => s + d.v, 0);
        const rnd = (a, b) => a + (b - a) * (Math.random());

        function go(p, d) {
          if (log.length < 400) log.push([phase, +age.toFixed(1)]);
          phase = p; age = 0; dur = d !== undefined ? d : rnd(DUR[p][0], DUR[p][1]);
          if (p === 'peak') { peakHurt = false; peakStartedAt = gameTime; cycles++; }
          if (p === 'breath') afterPeak();
        }

        // capsule « méritée » et capsule de secours
        function afterPeak() {
          if (!player || !player.alive || state !== 'playing') return;
          const hr = hullRatio();
          const x = rnd(60, Math.max(61, W - 60));
          if (hr < 0.32 && gameTime - lastRelief > 75) {
            lastRelief = gameTime; reliefs++;
            dropPowerup(x, -20, 'H');
            return;
          }
          if (age === 0 && log.length && log[log.length - 1][0] === 'peak' && !peakHurt && gameTime - lastMerit > 60 && gameTime - peakStartedAt > 10) {
            lastMerit = gameTime; merits++;
            dropPowerup(x, -20, hr < 0.7 ? 'H' : pick(['S', 'B', 'M']));
            addText(W / 2, H * 0.32, 'SANS UN COUP', '#a7f3d0');
          }
        }

        function level() {
          // fraction de la partie « dominée » : 1 = très à l'aise, 0 = en difficulté
          const hr = hullRatio();
          const calm = gameTime - lastHit > 12 ? 1 : 0;
          return Math.max(0, Math.min(1, (hr - 0.45) / 0.45)) * (0.55 + 0.45 * calm);
        }

        const baseDamage25 = damagePlayer;
        damagePlayer = function (amount) {
          const before = player ? player.hull + player.shield : 0;
          baseDamage25.call(this, amount);
          if (player) {
            const d = before - (player.hull + player.shield);
            if (d > 0) { lastHit = gameTime; peakHurt = true; dmgWindow.push({ t: gameTime, v: d / (player.maxHull + player.maxShield) }); }
          }
        };

        const baseUpdate25 = update;
        update = function (dt) {
          baseUpdate25(dt);
          if (state !== 'playing' || !player || !player.alive) return;
          while (dmgWindow.length && gameTime - dmgWindow[0].t > 7) dmgWindow.shift();
          if (!on()) { phase = 'build'; return; }
          age += dt;

          // boss : le cycle est suspendu, souffle prolongé quand il tombe
          const b = bossAlive();
          if (b && phase !== 'boss') go('boss', 1e9);
          if (!b && bossSeen) go('breath', rnd(7.5, 9));
          bossSeen = b;
          if (b) return;
          peakBurst(dt);

          // Actes III–V : l'accalmie d'acte (v5.13) vaut souffle
          const v13 = G.v13;
          if (v13 && v13.interlude && v13.interlude() > 0 && phase !== 'breath') go('breath', Math.min(9, v13.interlude()));

          if (age < dur) return;
          const hr = hullRatio(), stress = recentDamage();
          if (phase === 'build') {
            const phen = G.phen && G.phen.active && G.phen.active();
            const nothingToSurge = spawnQueue.length < 3 && enemies.length < 3;
            if (phen || nothingToSurge) { dur = age + 1.5; return; }       // on attend un moment utile
            if (hr < 0.45 || stress > 0.3) go('breath');                  // en difficulté : on saute la déferlante
            else go('peak', rnd(DUR.peak[0], DUR.peak[1]) * (0.8 + 0.4 * level()));
          } else if (phase === 'peak') go('breath');
          else if (phase === 'breath') go('build', rnd(DUR.build[0], DUR.build[1]) * (1.15 - 0.4 * level()));
        };

        // déferlante : des escadrilles légères s'ajoutent à la vague (hors actes III–V, déjà denses)
        let burstT = 0;
        function peakBurst(dt) {
          if (phase !== 'peak' || boss || (G.v13 && G.v13.acte && G.v13.acte() >= 3)) return;
          burstT -= dt;
          if (burstT > 0 || enemies.length > 14) return;
          burstT = rnd(1.5, 2.4);
          const type = pick(['drone', 'zig', 'speeder']);
          const n = Math.min(4, 2 + Math.floor(wave / 6));
          const x0 = rnd(80, Math.max(81, W - 80));
          for (let i = 0; i < n; i++) {
            if (G.pacing && !G.pacing.canSpawn(type)) break;
            const off = i - (n - 1) / 2;
            const e = spawnEnemy(type, Math.max(28, Math.min(W - 28, x0 + off * 44)), -30 - Math.abs(off) * 20);
            if (e) { e.wing = true; e.fireCd = (e.fireCd || 1) + 0.6 + i * 0.3; }
          }
        }

        // courbe d'arrivée des ennemis
        const baseSpawner25 = updateSpawner;
        updateSpawner = function (dt) {
          if (!on() || state !== 'playing') return baseSpawner25(dt);
          let k = K[phase];
          if (phase === 'breath' && spawnQueue.length && spawnQueue[0].type !== 'boss' && boss == null) { held += dt; return; } // plus aucune arrivée (un boss n'est jamais retardé)
          // écran désert trop longtemps : on accélère
          const n = enemies.reduce((c, e) => c + (e.type === 'boss' || e.type === 'asteroid' ? 0 : 1), 0);
          emptyT = n < 3 && spawnQueue.length ? emptyT + dt : 0;
          if (emptyT > 1.2) k = Math.max(k, 2.2);
          else if (phase === 'build') k *= 1 + 0.18 * level();
          return baseSpawner25(dt * (k || 1));
        };

        // le plafond de menace (v5.20) suit la courbe ; le souffle bloque les renforts d'acte avancé
        if (G.pacing) {
          const cs = G.pacing.canSpawn;
          G.pacing.canSpawn = (t) => !(on() && phase === 'breath' && !bossAlive()) && cs(t);
        }

        const baseStart25 = startGame;
        startGame = function (...a) {
          phase = 'build'; age = 0; dur = 34; cycles = 0; log.length = 0; held = 0;
          lastHit = -99; dmgWindow = []; emptyT = 0; bossSeen = false; lastMerit = -99; lastRelief = -99; merits = 0; reliefs = 0;
          return baseStart25.apply(this, a);
        };

        // réglage
        const settings = $('settingsOverlay');
        const anchor = settings && settings.querySelector('.btn-row');
        if (anchor) {
          const row = document.createElement('div');
          row.className = 'settings-row';
          row.innerHTML = '<label for="stRhythm25">Rythme de partie<span class="settings-desc">Dynamique : montées, déferlantes et souffles · Classique : régulier comme avant</span></label>' +
            '<div class="settings-control"><select id="stRhythm25"><option value="dynamic">Dynamique</option><option value="classic">Classique</option></select></div>';
          anchor.before(row);
          const sel = row.querySelector('select');
          sel.value = meta.rhythm === 'classic' ? 'classic' : 'dynamic';
          sel.addEventListener('change', () => { meta.rhythm = sel.value; saveMeta(); AudioSys.ui(); });
        }

        if (G) G.director = {
          enabled: () => on(), phase: () => phase, age: () => age, dur: () => dur, cycles: () => cycles,
          k: () => K[phase], budget: () => (on() ? BUDGET[phase] : 1), musicMul: () => (on() ? MUSIC[phase] : 1),
          level, log: () => log.slice(), held: () => held, drops: () => ({ merits, reliefs }),
          force: (p, d) => { go(p, d); return phase; },
          stats: () => ({ phase, age: +age.toFixed(1), dur: +dur.toFixed(1), cycles, hull: +hullRatio().toFixed(2), recentDamage: +recentDamage().toFixed(2) })
        };
      })();
