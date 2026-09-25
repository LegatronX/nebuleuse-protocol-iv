      // ============================================================
      // MODULE V5.19 — ESCADRILLES (densité de combat)
      // Constat mesuré (70 s d'Acte I, même seed) : 3,4 à 4,1 ennemis à l'écran hors boss
      // depuis la v5.14 — les vagues arrivent au compte-gouttes (un appareil toutes les
      // 0,35–0,9 s) et le tir automatique les abat avant qu'ils ne s'accumulent.
      // A. Ailiers : un appareil léger (drone, zig, speeder) peut arriver en formation
      //    avec 1 à 3 ailiers synchronisés ; cadence des vagues resserrée.
      // B. Escortes : pendant un boss (hors boss final), des escadrilles légères entrent
      //    régulièrement ; elles se désintègrent quand le boss tombe (pas de fin de vague
      //    retardée, bifurcation v5.15 intacte).
      // C. Réglage « Densité des vagues » : Classique (comportement ≤ v5.18) · Intense
      //    (défaut) · Déchaînée. Opération du jour et Tournoi restent en Intense (équité).
      // Aléatoire : rand/Math.random du jeu, donc seedé comme le reste du gameplay en
      // Opération du jour. Pendant un phénomène v5.16, pas d'ailiers (contemplation).
      // ============================================================
      (() => {
        const LIGHT = { drone: 1, zig: 1, speeder: 1 };
        const LEVELS = {
          classique: null,
          intense: { delay: 0.8, pBase: 0.34, pWave: 0.025, pMax: 0.62, escort: [6, 9], escortCap: 5 },
          dechaine: { delay: 0.66, pBase: 0.5, pWave: 0.03, pMax: 0.82, escort: [4, 6.5], escortCap: 8 }
        };
        const LABELS = { classique: 'Classique', intense: 'Intense', dechaine: 'Déchaînée' };
        if (!Object.prototype.hasOwnProperty.call(LEVELS, meta.density)) meta.density = 'intense';
        const fixedMode = () => mode === 'operation' || mode === 'tournoi';
        const level = () => (fixedMode() ? 'intense' : meta.density);
        const cfg = () => LEVELS[level()];
        const phenActive = () => { const p = window.__NP4 && window.__NP4.phen; return !!(p && p.active()); };

        let escortT = 0, wings = 0, escorts = 0, bossSeen = null;

        // ---------- A. ailiers ----------
        const OFFS = [[-36, -26], [36, -26], [0, -52], [-72, -52], [72, -52]];
        function spawnWing(lead, k) {
          const out = [];
          for (let i = 0; i < k && i < OFFS.length; i++) {
            const x = Math.max(28, Math.min(W - 28, lead.x + OFFS[i][0]));
            const e = spawnEnemy(lead.type, x, lead.y + OFFS[i][1]);
            if (!e) continue;
            e.wing = true;
            // même phase de zigzag que le chef : la formation reste lisible
            e.t = lead.t;
            if (lead.type === 'zig') e.baseX = x;
            // tirs décalés : une formation n'arrose pas en rafale synchronisée
            e.fireCd = (lead.fireCd || 1) + 0.7 + i * 0.35;
            out.push(e);
          }
          wings += out.length;
          return out;
        }

        const baseStartWave19 = startWave;
        startWave = function (n) {
          baseStartWave19(n);
          const c = cfg();
          if (!c) return;
          if (spawnQueue.some((q) => q.type === 'boss')) {
            escortT = 4 + rand(0, 2); // première escorte peu après l'entrée du boss
            return;
          }
          const lv = Math.min(n, 12);
          // Actes II–V (vagues 16+) : déjà plus denses, renfort modéré pour ne pas saturer un écran de téléphone
          const late = n >= 16 ? 0.6 : 1;
          const p = Math.min(c.pMax, c.pBase + c.pWave * lv) * late;
          const maxWing = n >= 16 ? 2 : n >= 6 ? 3 : n >= 3 ? 2 : 1;
          spawnQueue.forEach((q, i) => {
            if (q.delay) q.delay *= c.delay;
            if (i > 0 && LIGHT[q.type] && Math.random() < p) q.wing = 1 + Math.floor(Math.random() * maxWing);
          });
          spawnTimer = spawnQueue.length ? spawnQueue[0].delay : spawnTimer;
        };

        // ---------- B. escortes de boss ----------
        function escort(dt) {
          const c = cfg();
          if (!c || state !== 'playing' || !boss || boss.finalBoss || !enemies.includes(boss)) return;
          escortT -= dt;
          if (escortT > 0) return;
          escortT = rand(c.escort[0], c.escort[1]);
          const light = enemies.filter((e) => e.type !== 'boss').length;
          if (light >= c.escortCap) return;
          const type = wave >= 5 ? pick(['drone', 'zig', 'speeder']) : 'drone';
          const lead = spawnEnemy(type, rand(70, Math.max(71, W - 70)), -40);
          if (!lead) return;
          lead.escort = true;
          spawnWing(lead, wave >= 6 ? 3 : 2).forEach((e) => { e.escort = true; });
          escorts++;
        }
        // le boss tombe : son escorte se désintègre (sans retarder la fin de vague)
        function disband() {
          for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            if (!e.escort) continue;
            enemies.splice(i, 1);
            explosion(e.x, e.y, '#94a3b8', 10);
          }
        }

        const baseSpawner19 = updateSpawner;
        updateSpawner = function (dt) {
          const head = spawnQueue[0];
          const n0 = enemies.length;
          baseSpawner19(dt);
          if (head && head.wing && spawnQueue[0] !== head && enemies.length > n0 && !phenActive()) {
            const lead = enemies[enemies.length - 1];
            if (lead && LIGHT[lead.type]) spawnWing(lead, head.wing);
          }
          escort(dt);
        };

        const baseUpdate19 = update;
        update = function (dt) {
          baseUpdate19(dt);
          if (state !== 'playing') return;
          const b = boss && enemies.includes(boss) ? boss : null;
          if (bossSeen && !b) disband();
          bossSeen = b;
        };

        const baseStart19 = startGame;
        startGame = function (m, c) {
          escortT = 0; wings = 0; escorts = 0; bossSeen = null;
          baseStart19(m, c);
        };

        // ---------- C. réglage ----------
        const settings = $('settingsOverlay');
        const row = document.createElement('div');
        row.className = 'settings-row';
        row.innerHTML =
          '<label for="stDensity19">Densité des vagues<span class="settings-desc">Escadrilles en formation, escortes pendant les boss</span></label>' +
          '<div class="settings-control"><select id="stDensity19">' +
          Object.keys(LEVELS).map((k) => `<option value="${k}">${LABELS[k]}</option>`).join('') +
          '</select></div>';
        const anchor = settings && settings.querySelector('.btn-row');
        if (anchor) {
          anchor.before(row);
          const sel = row.querySelector('select');
          sel.value = meta.density;
          sel.addEventListener('change', () => { meta.density = sel.value; saveMeta(); AudioSys.ui(); });
        }

        // ---------- pont debug / tests ----------
        if (window.__NP4) {
          window.__NP4.density = {
            level: () => level(),
            set: (k) => { if (LEVELS.hasOwnProperty(k)) { meta.density = k; saveMeta(); const s = $('stDensity19'); if (s) s.value = k; } return level(); },
            stats: () => ({ wings, escorts }),
            escortIn: (t) => { escortT = t; },
            queueWings: () => spawnQueue.filter((q) => q.wing).length,
            startWave: (n) => startWave(n),
            setMode: (m) => { mode = m; } // tests : équité Opération / Tournoi
          };
        }
      })();
