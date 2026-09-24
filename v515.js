      // ============================================================
      // MODULE V5.15 — ROUTES RAMIFIÉES (bifurcations après les boss)
      // Après chaque boss non final (Acte I, Survie, Opération du jour, Tournoi), le
      // portail de secteur unique v5.10 laisse place à une bifurcation : 2 ou 3
      // destinations, chacune annonçant son risque et sa récompense AVANT le choix.
      // La route choisie reste active jusqu'au boss suivant (= durée du secteur).
      //   🔥 Forge solaire      : ennemis agressifs          → pièces ×2, score +25 %
      //   ⚛️ Anomalie quantique : projectiles ondulants       → prototypes rares, surcharge Q
      //   🌑 Vide profond       : champ de vision réduit      → réparation, +1 vie en sortie
      //   📡 Signal inconnu     : (rare) boss alternatif      → butin massif + archive narrative
      // Tout est réutilisé : décors v5.10 (+ bg-signal v5.13), boss hybride Prime,
      // prototypes v5.5, pièces v5.10, surcharge Q.
      // Déterminisme : offres et tirages dérivés d'un seed dédié (Opération du jour,
      // Tournoi, ?seed=…) — Math.random n'est jamais consommé par ce module, le flux
      // seedé de l'Opération du jour reste identique à la v5.14.
      // Sauvegarde : statistiques additives dans meta.routes ; point de reprise de run
      // à chaque bifurcation (clé séparée nebula4_route, consommée à la reprise).
      // Réversible : retirer ce bloc rétablit le portail linéaire v5.10.
      // ============================================================
      (() => {
        const CP_KEY = 'nebula4_route';
        const CP_VERSION = 1;
        const CP_MAX_AGE = 72 * 3600 * 1000;
        const FORK_DELAY = 1.3; // laisse jouer l'explosion du boss avant la bifurcation

        // ---------- PRNG dédié (indépendant de Math.random) ----------
        function fnv(s) {
          let h = 2166136261;
          for (let i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619);
          }
          return h >>> 0;
        }
        function mulberry(a) {
          return function () {
            a |= 0;
            a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
          };
        }
        function dayStr() {
          const d = new Date();
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
        function weekStr() { // même calcul que le tournoi v5.9
          const d = new Date();
          const onejan = new Date(d.getFullYear(), 0, 1);
          const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
          return d.getFullYear() + '-S' + String(week).padStart(2, '0');
        }
        function urlSeed() {
          try {
            const s = new URLSearchParams(location.search).get('seed');
            return s ? s.slice(0, 40) : null;
          } catch (e) {
            return null;
          }
        }
        function makeRunSeed() {
          const forced = urlSeed();
          if (forced) return 'url-' + forced;
          if (mode === 'operation') return 'op-' + dayStr();
          if (mode === 'tournoi') return 'tournoi-' + weekStr();
          // partie libre : seed unique (horloge), sans toucher au flux Math.random
          return 'run-' + Date.now().toString(36) + '-' + Math.floor((performance.now() * 1000) % 1e6).toString(36);
        }

        // ---------- ROUTES ----------
        const ROUTES = {
          forge: {
            icon: '🔥', name: 'Forge solaire', sector: 1, accent: '#fbbf24', risk: 2,
            risk_: 'Ennemis agressifs : cadence de tir +35 %, vitesse +20 %',
            reward: 'Pièces d’or ×2 · score +25 %'
          },
          quantum: {
            icon: '⚛️', name: 'Anomalie quantique', sector: 4, accent: '#c084fc', risk: 2,
            risk_: 'Projectiles ennemis à trajectoire ondulante',
            reward: 'Mini-boss : 45 % de prototype rare · surcharge Q plus fréquente'
          },
          void: {
            icon: '🌑', name: 'Vide profond', sector: 3, accent: '#7dd3fc', risk: 2,
            risk_: 'Visibilité réduite : seul l’espace proche du vaisseau est éclairé',
            reward: 'Réparation complète immédiate · en sortie : +1 vie, bouclier max +20'
          },
          signal: {
            icon: '📡', name: 'Signal inconnu', sector: 5, accent: '#fef3c7', risk: 3, rare: true,
            risk_: 'Boss alternatif : l’Écho de la Prime (3 phases, PV +35 %)',
            reward: 'Butin massif : +40 pièces, prototype garanti, score du boss ×2 · archive narrative'
          }
        };
        const BASE_ROUTES = ['forge', 'quantum', 'void'];
        const TRANSMISSIONS = [
          '📡 …porteuse détectée. Sa fréquence est la tienne.',
          '📡 « Tu n’es pas le premier à suivre cette route. »',
          '📡 Le Signal se replie en une forme familière…'
        ];
        const ARCHIVE = 'Écho — La Prime n’était qu’une note tenue par le Signal. Quelqu’un l’a jouée avant toi.';

        // ---------- ÉTAT ----------
        let runSeed = '';
        let forkIdx = 0;          // bifurcations franchies
        let active = null;        // route active (jusqu'au prochain boss)
        let history = [];
        let pending = null;       // { t } bifurcation programmée après un boss
        let offer = null;         // ids proposés
        let selected = -1;
        let routeRng = null;
        let protoGiven = 0;
        let echoPending = false;
        let signalUsed = false;
        let resumeWave = 0;
        let qSeq = 0;
        let transT = 0;
        let transIdx = 0;

        function routeMeta() {
          const r = (meta.routes = meta.routes || {});
          r.taken = r.taken || {};
          r.cleared = r.cleared || {};
          r.archive = r.archive || [];
          return r;
        }

        function nextBossWave(from) {
          const step = mode === 'survie' ? 5 : 3;
          return Math.ceil(from / step) * step;
        }

        // Offre pure et déterministe : (seed, n° de bifurcation, signal déjà vu, signal possible)
        function rollOffer(seed, idx, signalSeen, signalOk) {
          const rng = mulberry(fnv(seed + '#fork' + idx));
          const base = BASE_ROUTES.slice();
          for (let i = base.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            const tmp = base[i]; base[i] = base[j]; base[j] = tmp;
          }
          const rSignal = rng();
          const rThree = rng();
          const signal = idx >= 1 && !signalSeen && signalOk && rSignal < 0.35;
          const three = idx === 0 || rThree < 0.5;
          const out = base.slice(0, three && !signal ? 3 : 2);
          if (signal) out.push('signal');
          return out;
        }

        // ---------- INTERFACE : BIFURCATION ----------
        const st15 = document.createElement('style');
        st15.textContent =
          '#routeOverlay{z-index:45;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);background:rgba(2,4,9,.78)}' +
          '#routeOverlay .card{padding:18px 14px calc(14px + env(safe-area-inset-bottom));border-radius:26px;width:min(94vw,520px)}' +
          '#routeOverlay .title{font-size:clamp(20px,6vw,28px);margin-bottom:2px}' +
          '#routeOverlay .subtitle{font-size:12px;margin-bottom:10px}' +
          '.route-list{display:flex;flex-direction:column;gap:10px;margin:8px 0 12px}' +
          '.route-opt{--acc:#67e8f9;display:block;width:100%;min-height:92px;text-align:left;padding:12px 14px;border-radius:18px;' +
          'background:rgba(255,255,255,.05);border:2px solid color-mix(in srgb,var(--acc) 38%,transparent);color:#eaf6ff;' +
          'font:inherit;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}' +
          '.route-opt.sel{border-color:var(--acc);background:color-mix(in srgb,var(--acc) 16%,rgba(6,12,24,.9));box-shadow:0 0 22px color-mix(in srgb,var(--acc) 40%,transparent)}' +
          '.route-opt:active{transform:scale(.985)}' +
          '.route-head{display:flex;align-items:center;gap:10px;margin-bottom:6px}' +
          '.route-ic{font-size:28px;line-height:1}' +
          '.route-name{font-weight:900;font-size:16px;color:var(--acc);letter-spacing:.02em}' +
          '.route-sec{font-size:11px;opacity:.7}' +
          '.route-pips{margin-left:auto;font-size:11px;font-weight:800;color:#fca5a5;white-space:nowrap}' +
          '.route-rare{font-size:10px;font-weight:900;letter-spacing:.12em;color:#fef3c7;border:1px solid #fef3c7aa;border-radius:999px;padding:1px 7px;margin-left:6px}' +
          '.route-line{font-size:13px;line-height:1.35;margin-top:3px}' +
          '.route-line b{font-size:10px;letter-spacing:.1em;display:block;margin-bottom:1px}' +
          '.route-risk b{color:#f87171}.route-rew b{color:#4ade80}' +
          // bouton collant : reste atteignable sans défilement sur petit écran (iPhone SE)
          '#routeGo{position:sticky;bottom:0;width:100%;min-height:52px;font-size:15px;touch-action:manipulation}' +
          '#routeGo[disabled]{opacity:.4;pointer-events:none}' +
          // sous le panneau de barres (coque/bouclier/énergie), aligné à gauche : ne masque ni le score ni le vaisseau
          '#routeBadge{position:fixed;top:calc(env(safe-area-inset-top) + 236px);left:calc(env(safe-area-inset-left) + 14px);z-index:30;' +
          'pointer-events:none;font-size:11px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;padding:3px 10px;border-radius:999px;' +
          'background:rgba(6,12,24,.6);border:1px solid currentColor;opacity:0;transition:opacity .25s ease;white-space:nowrap}' +
          '#routeBadge.show{opacity:.9}' +
          'body:not(.playing) #routeBadge{opacity:0}' +
          '#routeResumeBtn{width:100%;margin:10px 0 2px;background:linear-gradient(135deg,#0e7490,#6d28d9);min-height:48px}' +
          '#routeResumeBtn small{display:block;font-size:11px;opacity:.8;font-weight:600}' +
          '.rr-routes{margin-top:6px;font-size:13px;color:#c4b5fd;font-weight:800;text-align:center}';
        document.head.appendChild(st15);

        const overlay = document.createElement('div');
        overlay.id = 'routeOverlay';
        overlay.className = 'overlay hidden';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'routeTitle');
        overlay.innerHTML =
          '<div class="card">' +
          '  <div id="routeTitle" class="title small-title">Bifurcation</div>' +
          '  <div class="subtitle">Choisis ta destination — effets actifs jusqu’au prochain boss</div>' +
          '  <div id="routeList" class="route-list"></div>' +
          '  <button id="routeGo" class="btn" disabled>Sélectionne une route</button>' +
          '</div>';
        document.body.appendChild(overlay);
        const listEl = overlay.querySelector('#routeList');
        const goBtn = overlay.querySelector('#routeGo');
        // aucun événement ne doit atteindre le canvas (glisser / double-tap bombe)
        ['pointerdown', 'pointermove', 'touchstart', 'touchmove'].forEach((ev) =>
          overlay.addEventListener(ev, (e) => e.stopPropagation(), { passive: true }));

        const badge = document.createElement('div');
        badge.id = 'routeBadge';
        document.body.appendChild(badge);
        let badgeOn = false;
        function refreshBadge() {
          const R = active && ROUTES[active];
          badgeOn = false;
          if (!R) { badge.classList.remove('show'); return; }
          badge.textContent = `${R.icon} ${R.name}`;
          badge.style.color = R.accent;
          syncBadge();
        }
        // masqué pendant la bannière de secteur/vague ; DOM touché seulement au changement
        function syncBadge() {
          const on = !!active && waveBannerTime <= 0;
          if (on === badgeOn) return;
          badgeOn = on;
          badge.classList.toggle('show', on);
        }

        function sectorLabel(R) {
          const info = window.__NP4 && window.__NP4.v10 && window.__NP4.v10.sectorInfo(R.sector);
          return info ? info.name : '';
        }

        function renderOffer() {
          listEl.innerHTML = '';
          offer.forEach((id, i) => {
            const R = ROUTES[id];
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'route-opt';
            b.dataset.route = id;
            b.setAttribute('aria-pressed', 'false');
            b.style.setProperty('--acc', R.accent);
            b.innerHTML =
              `<div class="route-head"><span class="route-ic">${R.icon}</span>` +
              `<span><span class="route-name">${R.name}</span>${R.rare ? '<span class="route-rare">RARE</span>' : ''}` +
              `<br><span class="route-sec">Destination : ${sectorLabel(R)}</span></span>` +
              `<span class="route-pips" aria-label="Risque ${R.risk} sur 3">${'●'.repeat(R.risk)}${'○'.repeat(3 - R.risk)}</span></div>` +
              `<div class="route-line route-risk"><b>⚠ RISQUE</b> ${R.risk_}</div>` +
              `<div class="route-line route-rew"><b>✦ RÉCOMPENSE</b> ${R.reward}</div>`;
            b.addEventListener('click', () => select(i));
            listEl.appendChild(b);
          });
          select(-1);
        }

        function select(i) {
          selected = offer && i >= 0 && i < offer.length ? i : -1;
          listEl.querySelectorAll('.route-opt').forEach((el, k) => {
            el.classList.toggle('sel', k === selected);
            el.setAttribute('aria-pressed', k === selected ? 'true' : 'false');
          });
          if (selected >= 0) {
            const R = ROUTES[offer[selected]];
            goBtn.disabled = false;
            goBtn.textContent = `Engager : ${R.name} ▸`;
            AudioSys.ui();
          } else {
            goBtn.disabled = true;
            goBtn.textContent = 'Sélectionne une route';
          }
        }
        goBtn.addEventListener('click', () => { if (selected >= 0) engage(offer[selected]); });

        window.addEventListener('keydown', (e) => {
          if (state !== 'route' || !offer) return;
          const n = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[e.code];
          if (n != null) select(n);
          else if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
            const d = e.code === 'ArrowDown' ? 1 : -1;
            select(((selected < 0 ? (d > 0 ? -1 : 0) : selected) + d + offer.length) % offer.length);
          } else if ((e.code === 'Enter' || e.code === 'Space') && selected >= 0) engage(offer[selected]);
          else return;
          e.preventDefault();
          e.stopImmediatePropagation();
        }, true);

        // ---------- FLUX ----------
        // Appelé par v5.10 à la mort d'un boss non final : true = la bifurcation remplace le portail
        function onBossDown(e) {
          if (!e || e.custom || e.finalBoss) return false;
          settle(e);
          resumeWave = wave + 1;
          pending = { t: FORK_DELAY };
          return true;
        }

        function openFork() {
          pending = null;
          const b = nextBossWave(resumeWave);
          const signalOk = !(b === 15 && !finalDefeated); // jamais à la place du boss final
          offer = rollOffer(runSeed, forkIdx, signalUsed, signalOk);
          routeMeta();
          renderOffer();
          state = 'route';
          activePointer = null;
          overlay.classList.remove('hidden');
          vibrate([20, 40, 20]);
          if (AudioSys.sfx10) AudioSys.sfx10('portal', 0.7, 0.9);
        }

        function engage(id) {
          const R = ROUTES[id];
          if (!R || state !== 'route') return;
          overlay.classList.add('hidden');
          offer = null;
          selected = -1;
          active = id;
          history.push(id);
          forkIdx++;
          routeRng = mulberry(fnv(runSeed + '#route' + forkIdx + id));
          protoGiven = 0;
          transT = 4;
          transIdx = 0;
          const rm = routeMeta();
          rm.taken[id] = (rm.taken[id] || 0) + 1;
          if (id === 'signal') { signalUsed = true; echoPending = true; }
          saveMeta();

          state = 'playing';
          player.invuln = Math.max(player.invuln || 0, 1.6);
          eBullets.length = 0; // reprise équitable après la pause de choix
          if (window.__NP4 && window.__NP4.v10) window.__NP4.v10.gotoSector(R.sector);
          if (id === 'void') {
            player.hull = player.maxHull;
            player.shield = player.maxShield;
            addText(player.x, player.y - 40, 'RÉPARATION COMPLÈTE', '#7dd3fc');
          }
          toast(`${R.icon} ${R.name} — ${R.reward}`, 'gold');
          refreshBadge();
          updateHUD();
          vibrate([30, 30, 60]);
          saveCheckpoint();
        }

        // Fin du secteur (mort du boss suivant) : récompenses de sortie
        function settle(e) {
          if (!active) return;
          const id = active;
          const R = ROUTES[id];
          if (id === 'void') {
            player.lives += 1;
            player.maxShield += 20;
            player.shield = player.maxShield;
            toast('🌑 Sortie du Vide profond : +1 vie · bouclier max +20', 'gold');
          } else if (id === 'signal' && e && e.echo) {
            const bonus = Math.round(5000 * getScoreMult());
            score += bonus;
            if (score > best) { best = score; saveBest(best); }
            addText(e.x, e.y - 60, `SIGNAL DÉCODÉ +${bonus}`, '#fef3c7');
            if (window.__NP4 && window.__NP4.v10) window.__NP4.v10.dropCoinsAt(e.x, e.y, 40);
            if (AudioSys.__offerProto) AudioSys.__offerProto(routeRng);
            const rm = routeMeta();
            if (!rm.archive.includes(ARCHIVE)) {
              rm.archive.push(ARCHIVE);
              toast('📖 ARCHIVE DU SIGNAL — ' + ARCHIVE, 'gold');
            }
          }
          const rm = routeMeta();
          rm.cleared[id] = (rm.cleared[id] || 0) + 1;
          saveMeta();
          if (R && id !== 'void') toast(`${R.icon} Secteur ${R.name} franchi`, '');
          active = null;
          echoPending = false;
          refreshBadge();
        }

        // ---------- EFFETS EN JEU ----------
        const baseSpawnEnemy15 = spawnEnemy;
        spawnEnemy = function (type, x, y) {
          const e = baseSpawnEnemy15(type, x, y);
          if (e && active === 'forge' && e.type !== 'boss') e.vy *= 1.2;
          return e;
        };

        const baseFEB15 = fireEnemyBullet;
        fireEnemyBullet = function (x, y, vx, vy, r, dmg, color) {
          const n = eBullets.length;
          const out = baseFEB15(x, y, vx, vy, r, dmg, color);
          if (active === 'quantum' && eBullets.length > n) {
            const b = eBullets[eBullets.length - 1];
            b.qp = (qSeq++ * 2.39996) % TAU; // phase déterministe (angle d'or)
            b.qt = 0;
          }
          return out;
        };

        const baseSpawnBoss15 = spawnBoss;
        spawnBoss = function (isFinal) {
          baseSpawnBoss15(isFinal);
          const b = boss;
          if (echoPending && !isFinal && b && !b.custom && !b.finalBoss) {
            // boss alternatif : l'hybride Prime (3 phases) réutilisé hors finale
            echoPending = false;
            b.echo = true;
            b.kind = 3;
            b.phase = 1;
            b.name = 'ÉCHO · NÉBULEUSE PRIME';
            b.color = '#fef3c7';
            b.r = Math.max(b.r, 60);
            b.hp = b.maxHp = Math.round(b.maxHp * 1.35);
            b.score *= 2;
            bossLabel.textContent = b.name;
            toast('📡 Le Signal prend forme…', 'gold');
          }
        };

        const baseKill15 = killEnemy;
        killEnemy = function (index, award) {
          const e = typeof index === 'number' ? enemies[index] : index;
          const r = active;
          baseKill15(index, award);
          if (!e || !r || e.type === 'boss') return;
          if (r === 'forge' && window.__NP4 && window.__NP4.v10) {
            const n = e.type === 'miniboss' ? 10 : e.elite || e.type === 'elite' ? 5 : 1;
            window.__NP4.v10.dropCoinsAt(e.x, e.y, n);
          } else if (r === 'quantum' && routeRng) {
            if (e.type === 'miniboss' && protoGiven < 2 && routeRng() < 0.45) {
              if (AudioSys.__offerProto && AudioSys.__offerProto(routeRng)) {
                protoGiven++;
                addText(e.x, e.y - 40, 'PROTOTYPE QUANTIQUE', '#c084fc');
              }
            } else if (e.elite && routeRng() < 0.12) {
              dropPowerup(e.x, e.y, 'Q');
            }
          }
        };

        const baseGSM15 = getScoreMult;
        getScoreMult = function () {
          return baseGSM15() * (active === 'forge' ? 1.25 : 1);
        };

        const baseUpdate15 = update;
        update = function (dt) {
          baseUpdate15(dt);
          if (state !== 'playing' || !player) return;
          syncBadge();
          if (pending) {
            pending.t -= dt;
            if (pending.t <= 0 && player.alive) openFork();
            return;
          }
          if (!active) return;
          const eDt = dt * (slowTime > 0 ? 0.45 : 1);
          if (active === 'forge') {
            // cadence +35 % : le compte à rebours de tir avance plus vite (boss exclus)
            for (let i = 0; i < enemies.length; i++) {
              const e = enemies[i];
              if (e.type !== 'boss' && e.fireCd > 0) e.fireCd -= eDt * 0.35;
            }
          } else if (active === 'quantum') {
            // rotation oscillante de la vitesse : trajectoires sinueuses, direction moyenne conservée
            for (let i = 0; i < eBullets.length; i++) {
              const b = eBullets[i];
              if (b.qp === undefined) continue;
              b.qt += eDt;
              const w = Math.sin(b.qt * 3.2 + b.qp) * 1.5 * eDt;
              const c = Math.cos(w);
              const s = Math.sin(w);
              const vx = b.vx * c - b.vy * s;
              b.vy = b.vx * s + b.vy * c;
              b.vx = vx;
            }
          } else if (active === 'signal' && transIdx < TRANSMISSIONS.length) {
            transT -= dt;
            if (transT <= 0) {
              toast(TRANSMISSIONS[transIdx++], 'gold');
              transT = 11;
            }
          }
        };

        const baseDraw15 = draw;
        draw = function () {
          baseDraw15();
          if (active !== 'void' || !player || (state !== 'playing' && state !== 'route')) return;
          // obscurité : un seul dégradé radial par frame, centré sur le vaisseau
          const R = Math.min(W, H) * 0.42;
          ctx.save();
          const g = ctx.createRadialGradient(player.x, player.y, R * 0.5, player.x, player.y, R * 1.4);
          g.addColorStop(0, 'rgba(0,3,10,0)');
          g.addColorStop(1, 'rgba(0,3,10,0.82)');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
        };

        // ---------- SAUVEGARDE : POINT DE REPRISE ----------
        function eligible() {
          // parties libres uniquement : l'Opération du jour et le Tournoi restent des défis d'une traite
          return (mode === 'campagne' && !activeMutator) || mode === 'survie';
        }
        function saveCheckpoint() {
          if (!eligible()) return;
          const mods = AudioSys.__runMods || null;
          const proto = AudioSys.__runProto || null;
          const cp = {
            v: CP_VERSION, ts: Date.now(), mode, diff: difficulty, ship: meta.ship || 0,
            wave: resumeWave, score, kills: gameKills, bossKills: runBossKills,
            coins: window.__NP4 && window.__NP4.v10 ? window.__NP4.v10.coinTotal() : 0,
            sector: window.__NP4 && window.__NP4.v10 ? window.__NP4.v10.sector() : 0,
            depth: window.__NP4 && window.__NP4.v10 ? window.__NP4.v10.depth() : 0,
            player: {
              hull: player.hull, maxHull: player.maxHull, shield: player.shield, maxShield: player.maxShield,
              shieldRegen: player.shieldRegen, lives: player.lives, bombs: player.bombs, weapon: player.weapon,
              energy: player.energy, energyRegen: player.energyRegen, speed: player.speed, fireMul: player.fireMul
            },
            mods: mods ? Object.assign({}, mods) : null,
            proto: proto ? Object.assign({}, proto) : null,
            route: { seed: runSeed, forkIdx, active, history: history.slice(), echoPending, signalUsed, protoGiven }
          };
          try { localStorage.setItem(CP_KEY, JSON.stringify(cp)); } catch (e) {}
        }
        function loadCheckpoint() {
          try {
            const cp = JSON.parse(localStorage.getItem(CP_KEY) || 'null');
            if (!cp || cp.v !== CP_VERSION || !cp.player || !cp.route) return null;
            if (Date.now() - cp.ts > CP_MAX_AGE) return null;
            if (cp.mode !== 'campagne' && cp.mode !== 'survie') return null;
            return cp;
          } catch (e) {
            return null;
          }
        }
        function clearCheckpoint() {
          try { localStorage.removeItem(CP_KEY); } catch (e) {}
        }

        let restoring = false;
        function resumeRun() {
          const cp = loadCheckpoint();
          if (!cp) { refreshResumeBtn(); return false; }
          clearCheckpoint(); // consommé : une mort après reprise ne permet pas de recommencer
          restoring = true;
          if (cp.diff) { difficulty = cp.diff; meta.diff = cp.diff; }
          startGame(cp.mode);
          restoring = false;
          // run
          score = cp.score | 0;
          gameKills = cp.kills | 0;
          runBossKills = cp.bossKills | 0;
          Object.assign(player, cp.player);
          player.invuln = 2.5;
          if (cp.mods && AudioSys.__runMods) Object.assign(AudioSys.__runMods, cp.mods);
          if (cp.proto && AudioSys.__runProto) Object.assign(AudioSys.__runProto, cp.proto);
          const v10 = window.__NP4 && window.__NP4.v10;
          if (v10) { v10.setSector(cp.sector, cp.depth); v10.setCoins(cp.coins); }
          // routes
          const r = cp.route;
          runSeed = r.seed;
          forkIdx = r.forkIdx | 0;
          active = ROUTES[r.active] ? r.active : null;
          history = Array.isArray(r.history) ? r.history.filter((id) => ROUTES[id]) : [];
          echoPending = !!r.echoPending;
          signalUsed = !!r.signalUsed;
          protoGiven = r.protoGiven | 0;
          routeRng = active ? mulberry(fnv(runSeed + '#route' + forkIdx + active)) : null;
          resumeWave = cp.wave;
          startWave(Math.max(1, cp.wave | 0));
          refreshBadge();
          updateHUD();
          const R = active && ROUTES[active];
          toast(`⏯ Reprise — vague ${cp.wave}${R ? ' · ' + R.icon + ' ' + R.name : ''}`, 'gold');
          return true;
        }

        // ---------- MENU : REPRENDRE ----------
        const resumeBtn = document.createElement('button');
        resumeBtn.id = 'routeResumeBtn';
        resumeBtn.className = 'btn';
        resumeBtn.style.display = 'none';
        resumeBtn.addEventListener('click', () => { AudioSys.ui(); resumeRun(); });
        const menuCard = document.querySelector('#menu .card');
        if (menuCard) menuCard.insertBefore(resumeBtn, menuCard.querySelector('.btn-row'));
        function refreshResumeBtn() {
          const cp = loadCheckpoint();
          if (!cp) { resumeBtn.style.display = 'none'; return; }
          const R = cp.route.active && ROUTES[cp.route.active];
          resumeBtn.innerHTML = `⏯ Reprendre la route` +
            `<small>${cp.mode === 'survie' ? 'Survie' : 'Campagne'} · vague ${cp.wave} · ${Number(cp.score).toLocaleString('fr-FR')} pts${R ? ' · ' + R.icon + ' ' + R.name : ''}</small>`;
          resumeBtn.style.display = '';
        }

        // ---------- WRAPS DE CYCLE DE VIE ----------
        function resetRoutes() {
          runSeed = makeRunSeed();
          forkIdx = 0;
          active = null;
          history = [];
          pending = null;
          offer = null;
          selected = -1;
          routeRng = null;
          protoGiven = 0;
          echoPending = false;
          signalUsed = false;
          resumeWave = 0;
          qSeq = 0;
          overlay.classList.add('hidden');
          refreshBadge();
        }

        const baseStartGame15 = startGame;
        startGame = function (m, c) {
          if (!restoring) clearCheckpoint(); // nouvelle partie : l'ancien point de reprise est abandonné
          baseStartGame15(m, c);
          resetRoutes();
        };

        const baseToMenu15 = toMenu;
        toMenu = function () {
          overlay.classList.add('hidden');
          baseToMenu15();
          refreshBadge();
          refreshResumeBtn();
        };

        function appendRoutes(el) {
          if (!el || !history.length) return;
          const html = `<div class="rr-routes">🧭 Routes : ${history.map((id) => ROUTES[id].icon + ' ' + ROUTES[id].name).join(' → ')}</div>`;
          const card = el.querySelector('.rr-card');
          if (card) card.insertAdjacentHTML('beforeend', html);
          else el.insertAdjacentHTML('beforeend', html);
        }
        const baseGameOver15 = gameOver;
        gameOver = function () {
          overlay.classList.add('hidden');
          pending = null;
          clearCheckpoint();
          baseGameOver15();
          appendRoutes($('finalStats'));
          refreshBadge();
        };
        const baseVictory15 = showVictory;
        showVictory = function () {
          // boss final tombé : la route en cours se solde, le point de reprise n'a plus d'objet
          if (active) settle(null);
          clearCheckpoint();
          baseVictory15();
          appendRoutes($('victoryStats'));
        };

        refreshResumeBtn();

        // ---------- PONT DEBUG / TESTS ----------
        if (window.__NP4) {
          window.__NP4.routeFork = onBossDown;
          window.__NP4.routes = {
            ROUTES,
            rollOffer,
            seed: () => runSeed,
            forkIdx: () => forkIdx,
            active: () => active,
            history: () => history.slice(),
            offer: () => (offer ? offer.slice() : null),
            pending: () => !!pending,
            open: () => { resumeWave = resumeWave || wave + 1; openFork(); },
            select: (i) => select(i),
            confirm: () => { if (selected >= 0) engage(offer[selected]); },
            choose: (id) => engage(id),
            echoPending: () => echoPending,
            checkpoint: () => loadCheckpoint(),
            resume: () => resumeRun(),
            refreshMenu: () => refreshResumeBtn(),
            // sondes : un projectile ennemi test (marqué quantique ?) et l'état des projectiles marqués
            fireProbe: () => { fireEnemyBullet(W / 2, 60, 0, 160); const b = eBullets[eBullets.length - 1]; return b ? { q: b.qp !== undefined, vx: b.vx, vy: b.vy } : null; },
            probe: () => { const b = eBullets.find((x) => x.qp !== undefined); return b ? { vx: b.vx, vy: b.vy, qt: b.qt } : null; },
            clearBullets: () => { eBullets.length = 0; },
            // chaîne complète (le pont v5.6 garde des références antérieures aux wraps v5.10+)
            spawnBoss: (isFinal) => spawnBoss(!!isFinal),
            kill: (i) => killEnemy(i, true)
          };
        }
      })();
