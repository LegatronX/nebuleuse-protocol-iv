      // ============================================================
      // MODULE V5.16 — PHÉNOMÈNES COSMIQUES · CARNET · CONFORT DU HUD
      // A. Directeur de l'imprévu : pendant les accalmies (pas de boss, peu d'ennemis),
      //    un phénomène rare et imprévisible se déclenche — 10 scènes à contempler,
      //    3 raretés (commun / rare / légendaire), pondérées par la route active.
      //    Tirages déterministes (seed de la run v5.15), jamais Math.random.
      // B. Carnet des phénomènes : collection persistée (meta.phen, additif),
      //    silhouettes « ??? » tant qu'un phénomène n'a pas été vu, nanites à la découverte.
      // C. Confort : file de notifications (1 à la fois en jeu, doublons fusionnés,
      //    messages périmés abandonnés) · HUD fantôme (s'efface quand un ennemi, une balle
      //    ou le vaisseau passe dessous) · panneau de barres compact.
      // Rendu : couche « fond » sous le gameplay (via __drawCosmos) + couche « avant »
      // légère ; lumières GPU via __NP4.fx.light ; coût borné, allégé en qualité basse.
      // ============================================================
      (() => {
        // ---------- PRNG (indépendant de Math.random) ----------
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
        const vr = mulberry(0x51ed270b); // visuel pur (formes, positions décoratives)
        let dirRng = mulberry(1);        // directeur (quel phénomène, quand)
        const lite = () => lowQuality || reducedMotion;
        const ease = (x) => x * x * (3 - 2 * x);
        const fxLight = (x, y, c, r, i, life) => {
          const fx = window.__NP4 && window.__NP4.fx;
          if (fx && fx.light) fx.light(x, y, c, r, i, life);
        };
        const coinsAt = (x, y, n) => {
          const v10 = window.__NP4 && window.__NP4.v10;
          if (v10 && v10.dropCoinsAt) v10.dropCoinsAt(x, y, n);
        };
        function chime(freqs, gain, dest) {
          if (!AudioSys.ctx || AudioSys.muted || !AudioSys.tone) return;
          const t = AudioSys.ctx.currentTime;
          freqs.forEach((f, i) => AudioSys.tone({ freq: f, dur: 0.5, type: 'sine', gain: gain || 0.05, when: t + i * 0.07, attack: 0.004, release: 0.6, reverb: 0.7, dest }));
        }
        function whaleSong() {
          if (!AudioSys.ctx || AudioSys.muted || !AudioSys.tone) return;
          const t = AudioSys.ctx.currentTime;
          AudioSys.tone({ freq: 92, dur: 2.4, type: 'sine', gain: 0.09, slide: 70, when: t, attack: 0.6, release: 1.4, reverb: 0.9 });
          AudioSys.tone({ freq: 185, dur: 1.8, type: 'triangle', gain: 0.03, slide: -60, when: t + 1.1, attack: 0.5, release: 1.2, reverb: 0.9 });
        }

        // ---------- B. CATALOGUE ----------
        const RARITY = { commun: { w: 10, label: 'COMMUN', col: '#94a3b8', nano: 25 }, rare: { w: 3.2, label: 'RARE', col: '#c084fc', nano: 60 }, legendaire: { w: 0.9, label: 'LÉGENDAIRE', col: '#fbbf24', nano: 150 } };
        const ACT_BGS = [
          ['assets/bg-cathedral.webp', 'Cathédrale Fractale'], ['assets/bg-echoes.webp', 'Jardin des Échos'],
          ['assets/bg-nacre.webp', 'Labyrinthe de Nacre'], ['assets/bg-methane.webp', 'Mer de Méthane'],
          ['assets/bg-dream.webp', "L'Œil du Rêve"], ['assets/bg-suns.webp', 'Nurserie de Soleils'],
          ['assets/bg-horizon.webp', "L'Horizon des Événements"], ['assets/bg-glass.webp', 'Mer de Verre'],
          ['assets/bg-hive.webp', 'Ruche Écarlate'], ['assets/bg-graveyard.webp', 'Cimetière des Titans']
        ];
        const wormImgs = {};
        function wormImg(src) {
          if (!wormImgs[src]) { const im = new Image(); im.src = src; wormImgs[src] = im; }
          return wormImgs[src];
        }
        const GAZE_LINES = ['« Je te vois, pilote. »', '« Tu n’es qu’une note. Joue-la juste. »', '« Nous t’attendions depuis la première étoile. »', '« Continue. Le Signal écoute. »'];

        const PHEN = {
          baleine: { name: 'Baleine stellaire', icon: '🐋', rar: 'commun', dur: 15, col: '#7dd3fc', hint: 'Un chant grave traverse parfois le vide…', sub: 'ses lueurs sèment des pièces' },
          ver: { name: 'Trou de ver', icon: '🌀', rar: 'commun', dur: 9, col: '#c084fc', hint: 'L’espace se plie parfois sur lui-même…', sub: '' },
          supernova: { name: 'Supernova lointaine', icon: '💥', rar: 'commun', dur: 8, col: '#fb923c', hint: 'Une étoile au bord de la mort…', sub: 'pluie de débris dorés' },
          armada: { name: 'Armada fantôme', icon: '🛸', rar: 'commun', dur: 15, col: '#94a3b8', hint: 'Des feux clignotent, très loin…', sub: 'une flotte oubliée passe en silence' },
          cristal: { name: 'Cathédrale de cristal', icon: '💎', rar: 'commun', dur: 11, col: '#a5f3fc', hint: 'Le vide cristallise, parfois…', sub: 'les éclats valent des points' },
          aurores: { name: 'Tempête d’aurores', icon: '🌌', rar: 'commun', dur: 13, col: '#34d399', hint: 'Des voiles de lumière déferlent…', sub: 'frôlements ×2' },
          regard: { name: 'Le Regard', icon: '👁️', rar: 'rare', dur: 10, col: '#fef3c7', hint: 'Quelque chose, dans la nébuleuse, observe…', sub: '' },
          eclipse: { name: 'Éclipse', icon: '🌑', rar: 'rare', dur: 13, col: '#fbbf24', hint: 'Deux astres s’alignent…', sub: 'totalité : score ×1,5' },
          faille: { name: 'Faille temporelle', icon: '⏳', rar: 'rare', dur: 9, col: '#a78bfa', hint: 'Le passé revient parfois te frôler…', sub: 'frôle ton passé : énergie NOVA' },
          silence: { name: 'Le Silence', icon: '🤍', rar: 'legendaire', dur: 7, col: '#fff7ed', hint: 'Il paraît que l’univers se tait, une fois…', sub: '+1 bombe' }
        };
        const IDS = Object.keys(PHEN);
        const ROUTE_BIAS = {
          forge: { supernova: 2, cristal: 2 }, quantum: { ver: 2, faille: 2 },
          void: { eclipse: 2, baleine: 2 }, signal: { regard: 3, silence: 3 }
        };

        // Tirage pur : (générateur, route, dernier id) → id — pondéré rareté × route, jamais deux fois de suite
        function pickPhen(rng, route, lastId) {
          const bias = ROUTE_BIAS[route] || {};
          let tot = 0;
          const w = IDS.map((id) => {
            const v = id === lastId ? 0 : RARITY[PHEN[id].rar].w * (bias[id] || 1);
            tot += v;
            return v;
          });
          let r = rng() * tot;
          for (let i = 0; i < IDS.length; i++) { r -= w[i]; if (r <= 0) return IDS[i]; }
          return IDS[IDS.length - 1];
        }

        // ---------- A. DIRECTEUR ----------
        let dirT = 45;
        let active = null;   // { id, t, dur, d }
        let lastId = null;
        let count = 0;
        let scoreBoost = 1;
        const path = [];     // trajectoire du joueur (faille temporelle)
        let pathT = 0;
        let silenceGain = null;

        function routeId() {
          const R = window.__NP4 && window.__NP4.routes;
          return R ? R.active() : null;
        }
        function calm() {
          if (state !== 'playing' || !player || !player.alive || boss || waveBannerTime > 0) return false;
          const R = window.__NP4 && window.__NP4.routes;
          if (R && R.pending()) return false;
          let n = 0;
          for (let i = 0; i < enemies.length; i++) if (enemies[i].type !== 'asteroid') n++;
          return n <= 8 && eBullets.length < 70;
        }
        function resetDirector() {
          const R = window.__NP4 && window.__NP4.routes;
          const seed = (R && R.seed()) || 'phen';
          dirRng = mulberry(fnv(seed + '#phen'));
          dirT = 35 + dirRng() * 25; // le premier phénomène arrive tôt : on le voit à chaque run
          endPhen(true);
          lastId = null;
          count = 0;
          path.length = 0;
        }

        function startPhen(id, quiet) {
          if (active) endPhen(true);
          const P = PHEN[id];
          const d = {};
          active = { id, t: 0, dur: P.dur, d };
          lastId = id;
          count++;
          INIT[id](d);
          if (!quiet) discover(id);
          vibrate(12);
        }
        function endPhen(silent) {
          if (!active) return;
          const a = active;
          active = null;
          scoreBoost = 1;
          if (a.id === 'silence') restoreSilence();
          if (!silent && END[a.id]) END[a.id](a.d);
          dirT = 55 + dirRng() * 50;
        }

        // ---------- initialisations / fins par phénomène ----------
        const INIT = {
          baleine(d) {
            d.dir = vr() < 0.5 ? 1 : -1;
            d.y = H * (0.28 + vr() * 0.2);
            d.spots = [];
            for (let i = 0; i < 16; i++) d.spots.push({ u: -0.38 + (i / 15) * 0.8, v: (vr() - 0.5) * 0.7, ph: vr() * TAU });
            d.dropT = 2;
            d.sang = 0;
          },
          ver(d) {
            d.x = W * (0.25 + vr() * 0.5);
            d.y = H * (0.2 + vr() * 0.22);
            d.R = Math.min(W, H) * 0.3;
            const k = ACT_BGS[Math.floor(dirRng() * ACT_BGS.length)];
            d.img = wormImg(k[0]);
            d.dest = k[1];
            shockwaves.push({ x: d.x, y: d.y, r: 10, max: d.R * 2.2, life: 0.8, maxLife: 0.8, color: '#c084fc', color2: '#67e8f9', thick: 6 });
            fxLight(d.x, d.y, '#c084fc', d.R * 3, 1.2, 1);
            chime([220, 330, 440], 0.04);
          },
          supernova(d) {
            d.x = W * (0.2 + vr() * 0.6);
            d.y = H * (0.1 + vr() * 0.16);
            d.boom = false;
            d.rainT = 0;
            d.rain = 0;
          },
          armada(d) {
            d.ships = [];
            for (let i = 0; i < 9; i++) {
              const depth = 0.35 + vr() * 0.65;
              d.ships.push({ depth, y0: H * (0.05 + vr() * 0.55), off: vr() * 0.35, size: (40 + vr() * 50) * depth, ph: vr() * TAU });
            }
            d.ships.push({ depth: 1, y0: H * 0.24, off: 0.12, size: Math.max(W, H) * 0.42, ph: 0, capital: true });
          },
          cristal(d) {
            d.segs = [];
            const grow = (x, y, a, len, depth, start) => {
              const x2 = x + Math.cos(a) * len;
              const y2 = y + Math.sin(a) * len;
              d.segs.push({ x1: x, y1: y, x2, y2, depth, start });
              if (depth < 3) {
                const n = depth === 0 ? 3 : 2;
                for (let k = 0; k < n; k++) {
                  const f = 0.45 + vr() * 0.4;
                  grow(x + (x2 - x) * f, y + (y2 - y) * f, a + (vr() - 0.5) * 1.3, len * (0.45 + vr() * 0.2), depth + 1, start + 0.18 + vr() * 0.1);
                }
              }
            };
            for (let s = 0; s < 8; s++) {
              const left = s % 2 === 0;
              const y = H * (0.12 + (s >> 1) * 0.16 + vr() * 0.05);
              grow(left ? -4 : W + 4, y, (left ? 0 : Math.PI) + (vr() - 0.5) * 0.7, W * (0.16 + vr() * 0.12), 0, vr() * 0.15);
            }
            d.shattered = false;
          },
          aurores(d) {
            d.rib = [];
            const cols = [[52, 211, 153], [103, 232, 249], [192, 132, 252], [244, 114, 182]];
            for (let i = 0; i < 4; i++) d.rib.push({ base: H * (0.12 + i * 0.13), amp: 30 + vr() * 40, s: 0.3 + vr() * 0.4, ph: vr() * TAU, c: cols[i] });
          },
          regard(d) {
            d.x = W / 2;
            d.y = H * 0.3;
            d.w = W * 0.86;
            d.h = Math.min(H * 0.2, d.w * 0.42);
            d.line = GAZE_LINES[Math.floor(dirRng() * GAZE_LINES.length)];
            d.lit = false;
          },
          eclipse(d) {
            d.sx = W * (0.55 + vr() * 0.2);
            d.sy = H * 0.17;
            d.sr = Math.min(W, H) * 0.11;
            d.pr = d.sr * 1.06;
            d.total = false;
          },
          faille(d) {
            d.ghost = path.length > 20 ? path.slice() : null;
            d.gi = 0;
            d.hit = 0;
            chime([660, 494, 330], 0.035);
          },
          silence(d) {
            // les balles se changent en étincelles
            for (const b of eBullets) addParticle(b.x, b.y, (vr() - 0.5) * 60, -20 - vr() * 60, 0.9, 2, '#fff7ed');
            eBullets.length = 0;
            if (AudioSys.ctx && AudioSys.master) {
              silenceGain = AudioSys.master.gain.value;
              AudioSys.master.gain.setTargetAtTime(0.06, AudioSys.ctx.currentTime, 0.35);
            }
            d.beat = 0.3;
            player.bombs = Math.min(9, (player.bombs || 0) + 1);
            updateHUD();
          }
        };
        const END = {
          ver(d) {
            coinsAt(d.x, d.y, 12);
            shockwaves.push({ x: d.x, y: d.y, r: d.R, max: 10, life: 0.5, maxLife: 0.5, color: '#f0abfc', color2: '#67e8f9', thick: 5 });
          },
          cristal(d) { if (!d.shattered) shatter(d); }
        };
        function restoreSilence() {
          if (AudioSys.ctx && AudioSys.master && silenceGain != null) {
            AudioSys.master.gain.setTargetAtTime(silenceGain || 1, AudioSys.ctx.currentTime, 0.5);
          }
          silenceGain = null;
        }
        function shatter(d) {
          d.shattered = true;
          let n = 0;
          for (const s of d.segs) {
            if (++n % (lite() ? 3 : 1)) continue;
            const mx = (s.x1 + s.x2) / 2;
            const my = (s.y1 + s.y2) / 2;
            addParticle(mx, my, (vr() - 0.5) * 260, (vr() - 0.5) * 260, 0.7, 2.4 - s.depth * 0.4, '#a5f3fc');
          }
          const gain = Math.round(8 * 250 * getScoreMult());
          score += gain;
          if (score > best) { best = score; saveBest(best); }
          addText(W / 2, H * 0.42, `CRISTAUX BRISÉS +${gain}`, '#a5f3fc');
          for (let s = 0; s < 4; s++) coinsAt(s % 2 ? W - 30 : 30, H * (0.2 + s * 0.12), 3);
          chime([2093, 2637, 3136, 3520, 2349], 0.03);
          shake = Math.max(shake, 0.25);
        }

        // ---------- mises à jour par phénomène ----------
        const UPD = {
          baleine(a, dt) {
            const d = a.d;
            if (!d.sang && a.t > 0.5) { d.sang = 1; whaleSong(); }
            if (d.sang === 1 && a.t > 7) { d.sang = 2; whaleSong(); }
            d.dropT -= dt;
            if (d.dropT <= 0) {
              d.dropT = 1.4;
              const b = whaleFrame(a);
              const s = d.spots[Math.floor(vr() * d.spots.length)];
              const wx = b.x + d.dir * s.u * b.L;
              const wy = b.y + s.v * b.Hb;
              if (wx > 10 && wx < W - 10) { coinsAt(wx, wy, 2); fxLight(wx, wy, '#a5f3fc', 90, 0.6, 0.4); }
            }
          },
          supernova(a, dt) {
            const d = a.d;
            if (!d.boom && a.t >= 1.6) {
              d.boom = true;
              const M = Math.max(W, H);
              shockwaves.push({ x: d.x, y: d.y, r: 10, max: M * 1.1, life: 1.4, maxLife: 1.4, color: '#fde68a', color2: '#fb7185', thick: 14 });
              shockwaves.push({ x: d.x, y: d.y, r: 10, max: M * 0.7, life: 1.0, maxLife: 1.0, color: '#67e8f9', color2: '#f0abfc', thick: 8 });
              fxLight(d.x, d.y, '#fde68a', M * 1.2, 2, 1.4);
              if (AudioSys.subHit) AudioSys.subHit(1.2);
              shake = Math.max(shake, reducedMotion ? 0 : 0.45);
            }
            if (d.boom && d.rain < 24) {
              d.rainT -= dt;
              if (d.rainT <= 0) { d.rainT = 0.14; d.rain++; coinsAt(20 + vr() * (W - 40), -8, 1); }
            }
          },
          cristal(a) {
            if (!a.d.shattered && a.t > a.dur - 2.2) shatter(a.d);
          },
          regard(a) {
            const d = a.d;
            if (!d.lit && a.t > 1.4) { d.lit = true; fxLight(d.x, d.y, '#fef3c7', d.w, 0.9, 6.5); chime([110, 165, 220], 0.05); }
          },
          eclipse(a) {
            const d = a.d;
            const px = eclipsePlanetX(a);
            const ov = clamp(1 - Math.abs(px - d.sx) / (d.sr + d.pr), 0, 1);
            d.ov = ov;
            const tot = ov > 0.82;
            if (tot && !d.total) { d.total = true; chime([392, 494, 587, 784], 0.05); }
            scoreBoost = tot ? 1.5 : 1;
          },
          faille(a, dt) {
            const d = a.d;
            if (!d.ghost) return;
            d.gi = Math.min(d.ghost.length - 1, d.gi + dt * 10);
            const g = d.ghost[Math.floor(d.gi)];
            if (player.alive && Math.hypot(player.x - g.x, player.y - g.y) < 48) {
              player.energy = Math.min(100, player.energy + 28 * dt);
              d.hit += dt;
              if (vr() < 0.3) addParticle(g.x, g.y, (vr() - 0.5) * 80, (vr() - 0.5) * 80, 0.35, 2, '#c4b5fd');
            }
          },
          silence(a, dt) {
            const d = a.d;
            slowTime = Math.max(slowTime, 0.2);
            for (const e of enemies) if (e.type !== 'boss' && e.fireCd < 1.5) e.fireCd = 1.5;
            d.beat -= dt;
            if (d.beat <= 0 && AudioSys.ctx && !AudioSys.muted && AudioSys.tone) {
              d.beat = 0.95;
              const t = AudioSys.ctx.currentTime;
              AudioSys.tone({ freq: 52, dur: 0.14, type: 'sine', gain: 0.5, when: t, attack: 0.005, release: 0.12, dest: AudioSys.ctx.destination });
              AudioSys.tone({ freq: 48, dur: 0.12, type: 'sine', gain: 0.35, when: t + 0.22, attack: 0.005, release: 0.1, dest: AudioSys.ctx.destination });
            }
          }
        };

        // ---------- rendus : couche de fond (sous le gameplay) ----------
        function fade(a, inT, outT) {
          return clamp(Math.min(a.t / inT, (a.dur - a.t) / outT), 0, 1);
        }
        function whaleFrame(a) {
          const d = a.d;
          const L = Math.max(W, H) * 0.95;
          const prog = a.t / a.dur;
          const x = d.dir > 0 ? -L * 0.6 + (W + L * 1.2) * prog : W + L * 0.6 - (W + L * 1.2) * prog;
          return { x, y: d.y + Math.sin(a.t * 0.45) * 22, L, Hb: L * 0.15 };
        }
        const BACK = {
          baleine(a) {
            const d = a.d;
            const f = whaleFrame(a);
            const L = f.L, Hb = f.Hb;
            const al = fade(a, 2, 2);
            const wag = Math.sin(a.t * 1.4) * Hb * 0.35;
            ctx.save();
            ctx.translate(f.x, f.y);
            ctx.scale(d.dir, 1);
            ctx.globalAlpha = al;
            ctx.beginPath();
            ctx.moveTo(L * 0.5, 0);
            ctx.bezierCurveTo(L * 0.46, -Hb * 0.95, L * 0.1, -Hb, -L * 0.2, -Hb * 0.48);
            ctx.bezierCurveTo(-L * 0.34, -Hb * 0.26, -L * 0.42, -Hb * 0.1, -L * 0.46, 0);
            ctx.lineTo(-L * 0.6, -Hb * 0.55 + wag);
            ctx.quadraticCurveTo(-L * 0.55, wag * 0.3, -L * 0.6, Hb * 0.55 + wag);
            ctx.lineTo(-L * 0.46, 0);
            ctx.bezierCurveTo(-L * 0.34, Hb * 0.32, -L * 0.1, Hb * 0.85, L * 0.2, Hb * 0.72);
            ctx.bezierCurveTo(L * 0.4, Hb * 0.58, L * 0.5, Hb * 0.25, L * 0.5, 0);
            const g = ctx.createLinearGradient(0, -Hb, 0, Hb);
            g.addColorStop(0, 'rgba(70,140,215,.38)');
            g.addColorStop(0.55, 'rgba(20,48,98,.55)');
            g.addColorStop(1, 'rgba(6,14,34,.7)');
            ctx.fillStyle = g;
            ctx.fill();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = 'rgba(125,211,252,.18)';
            ctx.lineWidth = 9;
            ctx.stroke();
            ctx.strokeStyle = 'rgba(186,230,253,.55)';
            ctx.lineWidth = 2;
            ctx.stroke();
            // ligne dorsale bioluminescente
            ctx.strokeStyle = 'rgba(165,243,252,.35)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(L * 0.42, -Hb * 0.55);
            ctx.bezierCurveTo(L * 0.2, -Hb * 0.72, -L * 0.1, -Hb * 0.6, -L * 0.4, -Hb * 0.08);
            ctx.stroke();
            // nageoire pectorale
            ctx.beginPath();
            ctx.moveTo(L * 0.18, Hb * 0.55);
            ctx.quadraticCurveTo(L * 0.08, Hb * (1.3 + Math.sin(a.t * 1.1) * 0.2), -L * 0.02, Hb * 1.25);
            ctx.quadraticCurveTo(L * 0.06, Hb * 0.9, L * 0.1, Hb * 0.62);
            ctx.stroke();
            // sillons ventraux
            ctx.strokeStyle = 'rgba(165,243,252,.14)';
            for (let k = 0; k < 4; k++) {
              ctx.beginPath();
              ctx.moveTo(L * 0.42, Hb * (0.2 + k * 0.1));
              ctx.quadraticCurveTo(L * 0.2, Hb * (0.45 + k * 0.1), -L * 0.05, Hb * (0.42 + k * 0.08));
              ctx.stroke();
            }
            // lueurs bioluminescentes
            ctx.fillStyle = '#a5f3fc';
            for (const s of d.spots) {
              const p = 0.5 + 0.5 * Math.sin(a.t * 2.2 + s.ph);
              ctx.globalAlpha = al * (0.25 + p * 0.6);
              ctx.beginPath();
              ctx.arc(s.u * L, s.v * Hb, 3 + p * 4, 0, TAU);
              ctx.fill();
            }
            // œil
            ctx.globalAlpha = al;
            const eg = ctx.createRadialGradient(L * 0.36, -Hb * 0.18, 0, L * 0.36, -Hb * 0.18, 16);
            eg.addColorStop(0, 'rgba(254,243,199,.95)');
            eg.addColorStop(1, 'rgba(254,243,199,0)');
            ctx.fillStyle = eg;
            ctx.beginPath();
            ctx.arc(L * 0.36, -Hb * 0.18, 16, 0, TAU);
            ctx.fill();
            ctx.restore();
          },
          ver(a) {
            const d = a.d;
            const open = ease(clamp(Math.min(a.t / 1.3, (a.dur - a.t) / 1.2), 0, 1));
            const r = d.R * open;
            if (r < 2) return;
            ctx.save();
            ctx.beginPath();
            ctx.arc(d.x, d.y, r, 0, TAU);
            ctx.save();
            ctx.clip();
            if (d.img && d.img.complete && d.img.naturalWidth) {
              ctx.translate(d.x, d.y);
              ctx.rotate(a.t * 0.08);
              const s = r * 2.6;
              ctx.drawImage(d.img, -s / 2, -s / 2, s, s);
            } else {
              ctx.fillStyle = '#1e1036';
              ctx.fillRect(d.x - r, d.y - r, r * 2, r * 2);
            }
            ctx.restore();
            // vignette intérieure + bord chromatique
            const vg = ctx.createRadialGradient(d.x, d.y, r * 0.55, d.x, d.y, r);
            vg.addColorStop(0, 'rgba(0,0,0,0)');
            vg.addColorStop(1, 'rgba(10,0,30,.85)');
            ctx.fillStyle = vg;
            ctx.beginPath();
            ctx.arc(d.x, d.y, r, 0, TAU);
            ctx.fill();
            ctx.globalCompositeOperation = 'lighter';
            const cols = ['#c084fc', '#67e8f9', '#f0abfc'];
            for (let i = 0; i < 3; i++) {
              const a0 = a.t * (1.2 + i * 0.5) * (i % 2 ? -1 : 1);
              ctx.strokeStyle = cols[i];
              ctx.globalAlpha = 0.7 - i * 0.18;
              ctx.lineWidth = 3 - i * 0.7;
              ctx.beginPath();
              ctx.arc(d.x, d.y, r + 3 + i * 7, a0, a0 + TAU * 0.7);
              ctx.stroke();
            }
            // matière aspirée en spirale
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#e9d5ff';
            const n = lite() ? 14 : 30;
            for (let i = 0; i < n; i++) {
              const fr = (i * 0.618 + a.t * 0.35) % 1;
              const rr = r * (2.1 - fr * 1.1);
              const an = i * 2.39996 + a.t * (1.2 + fr * 2.5);
              ctx.beginPath();
              ctx.arc(d.x + Math.cos(an) * rr, d.y + Math.sin(an) * rr * 0.8, 1.2 + fr * 1.6, 0, TAU);
              ctx.fill();
            }
            ctx.restore();
          },
          supernova(a) {
            const d = a.d;
            const al = fade(a, 0.3, 2.5);
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            if (!d.boom) {
              const k = a.t / 1.6;
              const fl = 0.6 + 0.4 * Math.sin(a.t * (8 + k * 30));
              const rr = 4 + k * 18;
              const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, rr * 4);
              g.addColorStop(0, `rgba(255,255,255,${0.9 * fl})`);
              g.addColorStop(0.3, `rgba(253,224,71,${0.5 * fl})`);
              g.addColorStop(1, 'rgba(251,146,60,0)');
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.arc(d.x, d.y, rr * 4, 0, TAU);
              ctx.fill();
            } else {
              const e = a.t - 1.6;
              const M = Math.max(W, H);
              const R = e * M * 0.28;
              // coquille de gaz en expansion (3 anneaux colorés)
              const rings = [['251,146,60', 1], ['244,114,182', 0.82], ['103,232,249', 0.64]];
              for (const [c, k] of rings) {
                const rr = R * k;
                const g = ctx.createRadialGradient(d.x, d.y, rr * 0.75, d.x, d.y, rr * 1.08 + 1);
                g.addColorStop(0, `rgba(${c},0)`);
                g.addColorStop(0.7, `rgba(${c},${0.22 * al})`);
                g.addColorStop(1, `rgba(${c},0)`);
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(d.x, d.y, rr * 1.08 + 1, 0, TAU);
                ctx.fill();
              }
              // rémanent : étoile à neutrons pulsante + jets
              const p = 0.6 + 0.4 * Math.sin(a.t * 14);
              const g2 = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, 40);
              g2.addColorStop(0, `rgba(224,242,254,${0.9 * al * p})`);
              g2.addColorStop(1, 'rgba(125,211,252,0)');
              ctx.fillStyle = g2;
              ctx.beginPath();
              ctx.arc(d.x, d.y, 40, 0, TAU);
              ctx.fill();
              ctx.strokeStyle = `rgba(186,230,253,${0.45 * al})`;
              ctx.lineWidth = 2;
              const ja = a.t * 0.9;
              ctx.beginPath();
              ctx.moveTo(d.x - Math.cos(ja) * 46, d.y - Math.sin(ja) * 46);
              ctx.lineTo(d.x + Math.cos(ja) * 46, d.y + Math.sin(ja) * 46);
              ctx.stroke();
            }
            ctx.restore();
          },
          armada(a) {
            const prog = a.t / a.dur;
            const al = fade(a, 2.5, 2.5);
            ctx.save();
            for (const s of a.d.ships) {
              const x = -s.size * 2 + (W + s.size * 4) * clamp(prog * (0.7 + s.depth * 0.3) + s.off - 0.12, 0, 1.2);
              const y = s.y0 + prog * H * 0.12 * s.depth;
              const sz = s.size;
              ctx.save();
              ctx.translate(x, y);
              ctx.rotate(0.12);
              ctx.globalAlpha = al * (s.capital ? 0.8 : 0.5 + s.depth * 0.45);
              // coque
              ctx.beginPath();
              ctx.moveTo(sz, 0);
              ctx.lineTo(sz * 0.2, -sz * 0.18);
              ctx.lineTo(-sz * 0.3, -sz * (s.capital ? 0.22 : 0.42));
              ctx.lineTo(-sz * 0.55, -sz * 0.12);
              ctx.lineTo(-sz * 0.6, sz * 0.12);
              ctx.lineTo(-sz * 0.3, sz * (s.capital ? 0.22 : 0.42));
              ctx.lineTo(sz * 0.2, sz * 0.18);
              ctx.closePath();
              ctx.fillStyle = 'rgba(6,10,18,.85)';
              ctx.fill();
              ctx.strokeStyle = 'rgba(186,200,220,.6)';
              ctx.lineWidth = 1.3;
              ctx.stroke();
              // arête dorsale éclairée
              ctx.strokeStyle = 'rgba(148,163,184,.3)';
              ctx.beginPath();
              ctx.moveTo(sz * 0.9, 0);
              ctx.lineTo(-sz * 0.5, 0);
              ctx.stroke();
              if (s.capital) {
                ctx.fillStyle = 'rgba(148,163,184,.10)';
                for (let k = 0; k < 7; k++) ctx.fillRect(-sz * 0.4 + k * sz * 0.16, -sz * 0.05, sz * 0.08, sz * 0.1);
              }
              ctx.globalCompositeOperation = 'lighter';
              // réacteurs
              const eg = ctx.createRadialGradient(-sz * 0.6, 0, 0, -sz * 0.6, 0, sz * 0.35);
              eg.addColorStop(0, 'rgba(125,211,252,.7)');
              eg.addColorStop(1, 'rgba(56,189,248,0)');
              ctx.fillStyle = eg;
              ctx.beginPath();
              ctx.arc(-sz * 0.6, 0, sz * 0.35, 0, TAU);
              ctx.fill();
              // feux de position
              const bl = Math.sin(a.t * 3 + s.ph) > 0.6;
              if (bl) {
                ctx.fillStyle = '#f87171';
                ctx.fillRect(-sz * 0.3 - 1.5, -sz * (s.capital ? 0.22 : 0.42) - 1.5, 3, 3);
                ctx.fillStyle = '#4ade80';
                ctx.fillRect(-sz * 0.3 - 1.5, sz * (s.capital ? 0.22 : 0.42) - 1.5, 3, 3);
              }
              if (Math.sin(a.t * 5 + s.ph * 2) > 0.85) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sz - 2, -1.5, 3, 3);
              }
              ctx.restore();
            }
            ctx.restore();
          },
          cristal(a) {
            const d = a.d;
            if (d.shattered) return;
            const k = clamp(a.t / (a.dur - 2.4), 0, 1);
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (let pass = 0; pass < 2; pass++) {
              ctx.strokeStyle = pass ? 'rgba(255,255,255,.55)' : 'rgba(103,232,249,.35)';
              for (let depth = 0; depth < 4; depth++) {
                ctx.lineWidth = pass ? 1 : 6 - depth * 1.4;
                ctx.beginPath();
                for (const s of d.segs) {
                  if (s.depth !== depth) continue;
                  const g = clamp((k - s.start) / 0.3, 0, 1);
                  if (g <= 0) continue;
                  ctx.moveTo(s.x1, s.y1);
                  ctx.lineTo(s.x1 + (s.x2 - s.x1) * g, s.y1 + (s.y2 - s.y1) * g);
                }
                ctx.stroke();
              }
            }
            // facettes scintillantes aux extrémités
            ctx.fillStyle = '#e0f2fe';
            for (const s of d.segs) {
              const g = clamp((k - s.start) / 0.3, 0, 1);
              if (g < 1 || s.depth < 2) continue;
              const tw = 0.4 + 0.6 * Math.abs(Math.sin(a.t * 3 + s.x2));
              ctx.globalAlpha = tw;
              ctx.beginPath();
              ctx.moveTo(s.x2, s.y2 - 4);
              ctx.lineTo(s.x2 + 2.5, s.y2);
              ctx.lineTo(s.x2, s.y2 + 4);
              ctx.lineTo(s.x2 - 2.5, s.y2);
              ctx.fill();
            }
            ctx.restore();
          },
          aurores(a) {
            const al = fade(a, 2, 2.5);
            const step = lite() ? 22 : 12;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (const r of a.d.rib) {
              const yAt = (x) => r.base + Math.sin(x * 0.008 + a.t * r.s + r.ph) * r.amp + Math.sin(x * 0.021 - a.t * r.s * 1.7) * r.amp * 0.4;
              // voile : du ruban vers le bas, dégradé vertical
              const g = ctx.createLinearGradient(0, r.base - r.amp, 0, r.base + r.amp + 110);
              g.addColorStop(0, `rgba(${r.c},${0.26 * al})`);
              g.addColorStop(0.35, `rgba(${r.c},${0.12 * al})`);
              g.addColorStop(1, `rgba(${r.c},0)`);
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.moveTo(0, yAt(0));
              for (let x = step; x <= W + step; x += step) ctx.lineTo(x, yAt(x));
              for (let x = W + step; x >= 0; x -= step) ctx.lineTo(x, yAt(x) + 90 + Math.sin(x * 0.05 + a.t) * 20);
              ctx.closePath();
              ctx.fill();
              ctx.strokeStyle = `rgba(${r.c},${0.5 * al})`;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(0, yAt(0));
              for (let x = step; x <= W + step; x += step) ctx.lineTo(x, yAt(x));
              ctx.stroke();
            }
            ctx.restore();
          },
          regard(a) {
            const d = a.d;
            // ouverture : 0→1 (1,5 s), clignement à 5 s, fermeture sur 1,5 s
            let o = clamp(Math.min(a.t / 1.5, (a.dur - a.t) / 1.5), 0, 1);
            const bl = a.t - 5;
            if (bl > 0 && bl < 0.35) o *= Math.abs(bl - 0.175) / 0.175;
            o = ease(o);
            const hw = d.w / 2;
            const hh = d.h / 2 * o;
            ctx.save();
            // halo
            ctx.globalCompositeOperation = 'lighter';
            const halo = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, hw * 1.1);
            halo.addColorStop(0, `rgba(254,243,199,${0.12 * o})`);
            halo.addColorStop(1, 'rgba(254,243,199,0)');
            ctx.fillStyle = halo;
            ctx.fillRect(d.x - hw * 1.1, d.y - hw * 1.1, hw * 2.2, hw * 2.2);
            ctx.globalCompositeOperation = 'source-over';
            if (hh > 1) {
              ctx.beginPath();
              ctx.moveTo(d.x - hw, d.y);
              ctx.quadraticCurveTo(d.x, d.y - hh * 2, d.x + hw, d.y);
              ctx.quadraticCurveTo(d.x, d.y + hh * 2, d.x - hw, d.y);
              ctx.closePath();
              ctx.save();
              ctx.clip();
              ctx.fillStyle = 'rgba(18,8,30,.62)';
              ctx.fillRect(d.x - hw, d.y - hh * 2, d.w, hh * 4);
              // iris qui suit le vaisseau
              const ix = d.x + clamp((player.x - d.x) * 0.18, -hw * 0.3, hw * 0.3);
              const iy = d.y + clamp((player.y - d.y) * 0.05, -d.h * 0.1, d.h * 0.12);
              const ir = d.h * 0.46;
              const ig = ctx.createRadialGradient(ix, iy, ir * 0.15, ix, iy, ir);
              ig.addColorStop(0, '#fef3c7');
              ig.addColorStop(0.35, '#f59e0b');
              ig.addColorStop(0.75, '#7c3aed');
              ig.addColorStop(1, '#1e1036');
              ctx.fillStyle = ig;
              ctx.beginPath();
              ctx.arc(ix, iy, ir, 0, TAU);
              ctx.fill();
              ctx.strokeStyle = 'rgba(254,243,199,.25)';
              ctx.lineWidth = 1;
              ctx.beginPath();
              for (let k = 0; k < 28; k++) {
                const an = (k / 28) * TAU + a.t * 0.05;
                ctx.moveTo(ix + Math.cos(an) * ir * 0.3, iy + Math.sin(an) * ir * 0.3);
                ctx.lineTo(ix + Math.cos(an) * ir * 0.92, iy + Math.sin(an) * ir * 0.92);
              }
              ctx.stroke();
              // pupille en fente
              ctx.fillStyle = '#05010a';
              ctx.beginPath();
              ctx.ellipse(ix, iy, ir * (0.12 + 0.05 * Math.sin(a.t * 1.3)), ir * 0.78, 0, 0, TAU);
              ctx.fill();
              ctx.fillStyle = 'rgba(255,255,255,.8)';
              ctx.beginPath();
              ctx.arc(ix - ir * 0.3, iy - ir * 0.32, ir * 0.09, 0, TAU);
              ctx.fill();
              ctx.restore();
              // paupières
              ctx.globalCompositeOperation = 'lighter';
              ctx.strokeStyle = 'rgba(254,243,199,.55)';
              ctx.lineWidth = 2;
              ctx.stroke();
            }
            ctx.restore();
          },
          eclipse(a) {
            const d = a.d;
            const al = fade(a, 1.5, 1.5);
            const px = eclipsePlanetX(a);
            const ov = d.ov || 0;
            ctx.save();
            // le ciel s'assombrit (décor seulement : les ennemis restent lisibles)
            ctx.fillStyle = `rgba(2,3,10,${0.55 * Math.pow(ov, 1.4) * al})`;
            ctx.fillRect(0, 0, W, H);
            ctx.globalCompositeOperation = 'lighter';
            // astre
            const sg = ctx.createRadialGradient(d.sx, d.sy, 0, d.sx, d.sy, d.sr * 3.2);
            sg.addColorStop(0, `rgba(255,251,235,${0.95 * al})`);
            sg.addColorStop(0.3, `rgba(253,224,71,${0.5 * al})`);
            sg.addColorStop(1, 'rgba(251,146,60,0)');
            ctx.fillStyle = sg;
            ctx.beginPath();
            ctx.arc(d.sx, d.sy, d.sr * 3.2, 0, TAU);
            ctx.fill();
            // couronne : rayons qui s'étirent à la totalité
            if (ov > 0.55) {
              const k = (ov - 0.55) / 0.45;
              ctx.strokeStyle = `rgba(254,243,199,${0.35 * k * al})`;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              for (let i = 0; i < 24; i++) {
                const an = (i / 24) * TAU + a.t * 0.05;
                const len = d.sr * (1.3 + 1.4 * k * (0.5 + 0.5 * Math.sin(i * 7.3 + a.t)));
                ctx.moveTo(d.sx + Math.cos(an) * d.sr * 1.02, d.sy + Math.sin(an) * d.sr * 1.02);
                ctx.lineTo(d.sx + Math.cos(an) * len, d.sy + Math.sin(an) * len);
              }
              ctx.stroke();
            }
            ctx.globalCompositeOperation = 'source-over';
            // planète occultante
            ctx.fillStyle = '#020306';
            ctx.beginPath();
            ctx.arc(px, d.sy + 3, d.pr, 0, TAU);
            ctx.fill();
            ctx.strokeStyle = `rgba(253,230,138,${0.25 + 0.5 * ov})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
            // anneau de diamant
            if (ov > 0.78 && ov < 0.95) {
              ctx.globalCompositeOperation = 'lighter';
              const dx = px < d.sx ? d.sr : -d.sr;
              const dg = ctx.createRadialGradient(d.sx + dx * 0.9, d.sy, 0, d.sx + dx * 0.9, d.sy, 26);
              dg.addColorStop(0, 'rgba(255,255,255,.95)');
              dg.addColorStop(1, 'rgba(255,255,255,0)');
              ctx.fillStyle = dg;
              ctx.beginPath();
              ctx.arc(d.sx + dx * 0.9, d.sy, 26, 0, TAU);
              ctx.fill();
            }
            ctx.restore();
          },
          faille(a) {
            if (lite()) return;
            const al = fade(a, 0.8, 1.2);
            // reflet kaléidoscopique du décor (le canevas ne contient encore que le fond)
            ctx.save();
            ctx.globalAlpha = 0.28 * al;
            ctx.translate(W, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, W, H);
            ctx.restore();
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = `rgba(167,139,250,${0.07 * al})`;
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
          }
        };
        function eclipsePlanetX(a) {
          const d = a.d;
          const span = (d.sr + d.pr) * 2.4;
          return d.sx - span / 2 + span * (a.t / a.dur);
        }

        // ---------- rendus : couche avant (légère, au-dessus du jeu) ----------
        const FRONT = {
          supernova(a) {
            const e = a.t - 1.6;
            if (e < 0 || e > 0.6) return;
            ctx.save();
            ctx.fillStyle = `rgba(255,248,230,${(1 - e / 0.6) * (reducedMotion ? 0.15 : 0.45)})`;
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
          },
          faille(a) {
            const d = a.d;
            if (!d.ghost) return;
            const i = Math.floor(d.gi);
            const g = d.ghost[i];
            const al = fade(a, 0.6, 1);
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = `rgba(196,181,253,${0.35 * al})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let k = Math.max(0, i - 14); k <= i; k++) {
              const p = d.ghost[k];
              if (k === Math.max(0, i - 14)) ctx.moveTo(p.x, p.y);
              else ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();
            ctx.globalAlpha = al * (0.45 + 0.2 * Math.sin(a.t * 12));
            ctx.fillStyle = '#c4b5fd';
            ctx.beginPath();
            ctx.moveTo(g.x, g.y - 20);
            ctx.lineTo(g.x + 13, g.y + 12);
            ctx.lineTo(g.x - 13, g.y + 12);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(237,233,254,.7)';
            ctx.beginPath();
            ctx.arc(g.x, g.y, 48, 0, TAU);
            ctx.globalAlpha = al * 0.25;
            ctx.stroke();
            ctx.restore();
          },
          silence(a) {
            const al = fade(a, 1, 1.5);
            ctx.save();
            const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.75);
            g.addColorStop(0, 'rgba(255,250,235,0)');
            g.addColorStop(1, `rgba(255,250,235,${0.22 * al})`);
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
            if (a.t > 1.2) {
              const k = clamp((a.t - 1.2) / 1.5, 0, 1) * al;
              ctx.globalAlpha = k;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#fff7ed';
              ctx.font = '300 12px sans-serif';
              ctx.fillText('T U   A S   É T É   T É M O I N   D U', W / 2, H * 0.4);
              ctx.font = '900 ' + Math.round(clamp(W * 0.1, 26, 54)) + 'px sans-serif';
              ctx.shadowColor = 'rgba(255,237,213,.9)';
              ctx.shadowBlur = 24;
              ctx.fillText('SILENCE', W / 2, H * 0.4 + 36);
            }
            ctx.restore();
          }
        };

        // carton de titre discret (sur le canevas : aucun toast supplémentaire)
        function drawCaption(a) {
          const P = PHEN[a.id];
          const k = clamp(Math.min(a.t / 0.7, (5 - a.t) / 0.9), 0, 1);
          if (k <= 0 || a.id === 'silence') return;
          const R = RARITY[P.rar];
          ctx.save();
          ctx.globalAlpha = k * 0.92;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const y = H * 0.58;
          ctx.font = '800 9px sans-serif';
          ctx.fillStyle = R.col;
          ctx.fillText(`— ${R.label} —`, W / 2, y - 18);
          ctx.font = '900 16px sans-serif';
          ctx.fillStyle = P.col;
          ctx.shadowColor = P.col;
          ctx.shadowBlur = 14;
          let title = P.name.toUpperCase();
          if (a.id === 'ver' && a.d.dest) title += ' — ' + a.d.dest.toUpperCase();
          ctx.fillText(title, W / 2, y);
          ctx.shadowBlur = 0;
          const sub = a.id === 'regard' ? a.d.line : a.id === 'eclipse' && a.d.total ? 'TOTALITÉ — SCORE ×1,5' : P.sub;
          if (sub) {
            ctx.font = 'italic 600 11px sans-serif';
            ctx.fillStyle = 'rgba(243,243,243,.8)';
            ctx.fillText(sub, W / 2, y + 18);
          }
          ctx.restore();
        }

        // ---------- carnet : découverte ----------
        function phenMeta() { return (meta.phen = meta.phen || {}); }
        function discover(id) {
          const m = phenMeta();
          const first = !m[id];
          m[id] = m[id] || { n: 0, first: new Date().toISOString().slice(0, 10) };
          m[id].n++;
          if (first) {
            const R = RARITY[PHEN[id].rar];
            meta.nanites = (meta.nanites || 0) + R.nano;
            toast(`🔭 Nouveau phénomène : ${PHEN[id].name} (+${R.nano}⬡)`, 'gold');
          }
          saveMeta();
          refreshCarnetBtn();
        }

        // ---------- branchements moteur ----------
        // après le décor, les nébuleuses, les planètes et les étoiles — mais sous tout le gameplay
        const baseStars16 = drawStars;
        drawStars = function () {
          baseStars16();
          if (active && BACK[active.id]) BACK[active.id](active);
        };

        const baseDraw16 = draw;
        draw = function () {
          baseDraw16();
          if (!active || (state !== 'playing' && state !== 'route' && state !== 'paused')) return;
          if (FRONT[active.id]) FRONT[active.id](active);
          drawCaption(active);
        };

        const baseUpdate16 = update;
        update = function (dt) {
          baseUpdate16(dt);
          if (state !== 'playing' || !player) return;
          pathT -= dt;
          if (pathT <= 0 && player.alive) {
            pathT = 0.1;
            path.push({ x: player.x, y: player.y });
            if (path.length > 110) path.shift();
          }
          if (active) {
            active.t += dt;
            if (UPD[active.id]) UPD[active.id](active, dt);
            // un boss qui surgit interrompt la contemplation
            if (active && (active.t >= active.dur || (boss && active.id !== 'silence'))) endPhen(false);
            return;
          }
          dirT -= dt;
          if (dirT > 0) return;
          if (!calm()) { dirT = 3; return; }
          if (count === 0 || dirRng() < 0.6) startPhen(pickPhen(dirRng, routeId(), lastId));
          else dirT = 20 + dirRng() * 20;
        };

        const baseSpawner16 = updateSpawner;
        updateSpawner = function (dt) {
          if (active && active.id === 'silence') return; // l'univers retient son souffle
          baseSpawner16(dt);
        };

        const baseGSM16 = getScoreMult;
        getScoreMult = function () { return baseGSM16() * scoreBoost; };

        const baseGraze16 = registerGraze;
        registerGraze = function (b) {
          const had = b && b.grazed;
          baseGraze16(b);
          if (!had && b && b.grazed && active && active.id === 'aurores') {
            score += Math.round((8 + Math.min(42, grazeChain * 2)) * multiplier * dm().score);
            player.energy = Math.min(100, player.energy + 1.8);
          }
        };

        const baseStart16 = startGame;
        startGame = function (m, c) {
          baseStart16(m, c);
          resetDirector();
        };
        const baseMenu16 = toMenu;
        toMenu = function () { endPhen(true); baseMenu16(); refreshCarnetBtn(); };
        const baseOver16 = gameOver;
        gameOver = function () { endPhen(true); baseOver16(); };

        // ============================================================
        // C. CONFORT : FILE DE NOTIFICATIONS · HUD FANTÔME · BARRES COMPACTES
        // ============================================================
        const baseToast16 = toast;
        const tq = [];
        let tBusy = false;
        let tLast = '';
        let tLastAt = 0;
        const inGame = () => state === 'playing' || state === 'route' || state === 'countdown';
        function pumpToast() {
          if (tBusy) return;
          const now = performance.now();
          // les messages non prioritaires trop anciens sont abandonnés
          for (let i = tq.length - 1; i >= 0; i--) if (!tq[i].gold && now - tq[i].at > 4500) tq.splice(i, 1);
          const it = tq.shift();
          if (!it) return;
          tBusy = true;
          const div = document.createElement('div');
          div.className = 'toast np-toast ' + it.cls;
          div.textContent = it.n > 1 ? `${it.msg}  ×${it.n}` : it.msg;
          toasts.appendChild(div);
          tLast = it.msg;
          tLastAt = now;
          const life = tq.length ? 1500 : 2300;
          setTimeout(() => {
            div.classList.add('out');
            setTimeout(() => { div.remove(); tBusy = false; pumpToast(); }, 260);
          }, life);
        }
        toast = function (msg, cls = '') {
          if (!inGame()) return baseToast16(msg, cls);
          const now = performance.now();
          if (msg === tLast && now - tLastAt < 2500) return;
          const dup = tq.find((t) => t.msg === msg);
          if (dup) { dup.n++; return; }
          tq.push({ msg, cls, gold: cls === 'gold', at: now, n: 1 });
          // file bornée : on sacrifie d'abord les messages ordinaires les plus anciens
          while (tq.length > 3) {
            const i = tq.findIndex((t) => !t.gold);
            tq.splice(i >= 0 ? i : 0, 1);
          }
          pumpToast();
        };

        // HUD fantôme : tout élément d'interface sous lequel passe un ennemi, une balle
        // ou le vaisseau devient quasi transparent (sans perdre ses zones tactiles)
        const GHOST_SEL = ['#hud .score-panel', '#hud .wave-panel', '#pauseBtn', '#hud .mid .panel.bars', '#coinHud', '#routeBadge', '#mutatorBadge', '#bossHud'];
        const ghostEls = [];
        let rectT = 0;
        let ghostT = 0;
        function refreshRects() {
          ghostEls.length = 0;
          for (const sel of GHOST_SEL) {
            const el = document.querySelector(sel);
            if (!el) continue;
            const r = el.getBoundingClientRect();
            if (r.width < 2 || r.height < 2) continue;
            ghostEls.push({ el, l: r.left - 14, t: r.top - 14, r: r.right + 14, b: r.bottom + 14, until: 0 });
          }
        }
        function updateGhosts(dt) {
          rectT -= dt;
          if (rectT <= 0) {
            rectT = 1;
            const keep = new Map(ghostEls.map((g) => [g.el, g.until]));
            refreshRects();
            for (const g of ghostEls) g.until = keep.get(g.el) || 0;
          }
          ghostT -= dt;
          if (ghostT > 0) return;
          ghostT = 0.08;
          const now = performance.now();
          for (const g of ghostEls) {
            let hit = player && player.alive && player.x > g.l && player.x < g.r && player.y > g.t && player.y < g.b;
            for (let i = 0; i < enemies.length && !hit; i++) {
              const e = enemies[i];
              const r = e.r || 12;
              hit = e.x + r > g.l && e.x - r < g.r && e.y + r > g.t && e.y - r < g.b;
            }
            for (let i = 0; i < eBullets.length && !hit; i++) {
              const b = eBullets[i];
              hit = b.x > g.l && b.x < g.r && b.y > g.t && b.y < g.b;
            }
            if (hit) g.until = now + 450; // petite hystérésis : pas de clignotement
            const on = now < g.until;
            if (on !== g.el.classList.contains('np-ghost')) g.el.classList.toggle('np-ghost', on);
          }
        }
        function clearGhosts() { for (const g of ghostEls) g.el.classList.remove('np-ghost'); }
        const baseUpdGhost = update;
        update = function (dt) {
          baseUpdGhost(dt);
          if (state === 'playing') updateGhosts(dt);
          else if (ghostEls.length && state !== 'paused') clearGhosts();
        };
        window.addEventListener('resize', () => { rectT = 0; });

        // ---------- carnet : interface ----------
        const st16 = document.createElement('style');
        st16.textContent =
          // notifications en jeu : une seule pastille fine, en haut, sans masquer l'action
          'body.playing #toasts{top:calc(env(safe-area-inset-top) + 4px);width:min(78vw,360px);gap:4px}' +
          'body.playing .np-toast{padding:5px 12px;font-size:12px;font-weight:800;border-radius:999px;background:rgba(4,12,25,.62);' +
          'box-shadow:0 6px 18px rgba(0,0,0,.25);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
          // HUD fantôme
          '.np-ghost{opacity:.14!important;transition:opacity .18s ease!important}' +
          '#bossHud.np-ghost{opacity:.4!important}' +
          '#hud .panel,#coinHud,#routeBadge,#pauseBtn{transition:opacity .25s ease}' +
          // panneau de barres compact pendant le jeu
          'body.playing #hud .mid .panel.bars{min-width:0;width:150px;padding:5px 9px;border-radius:12px;background:rgba(4,12,25,.3)}' +
          'body.playing #hud .mid .bar-row{margin:3px 0;font-size:8px;gap:6px}' +
          'body.playing #hud .mid .bar-row span{width:52px}' +
          'body.playing #hud .mid .bar{height:5px}' +
          'body.playing #hud .top .panel{padding:7px 10px;background:rgba(4,12,25,.32)}' +
          'body.playing #hud .score-panel{min-width:112px}' +
          'body.playing #hud .big{font-size:21px}' +
          '#routeBadge{top:calc(env(safe-area-inset-top) + 196px)!important}' +
          // carnet
          '#carnetBtn{width:100%;margin-top:10px;border-color:rgba(192,132,252,.4)!important}' +
          '#carnetOverlay .card{padding:20px 14px;width:min(94vw,560px)}' +
          '.carnet-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:14px 0;text-align:left}' +
          '.carnet-tile{--c:#94a3b8;position:relative;overflow:hidden;border-radius:16px;padding:12px 10px 10px;min-height:118px;' +
          'background:radial-gradient(circle at 50% 18%,color-mix(in srgb,var(--c) 30%,transparent),transparent 60%),rgba(255,255,255,.04);' +
          'border:1px solid color-mix(in srgb,var(--c) 45%,transparent)}' +
          '.carnet-tile.unseen{--c:#334155;filter:saturate(.2)}' +
          '.carnet-ic{font-size:34px;text-align:center;filter:drop-shadow(0 0 12px var(--c))}' +
          '.carnet-tile.unseen .carnet-ic{filter:brightness(0) drop-shadow(0 0 1px #64748b);opacity:.7}' +
          '.carnet-name{font-weight:900;font-size:13px;text-align:center;margin-top:4px;color:#f3f3f3}' +
          '.carnet-rar{font-size:9px;letter-spacing:.14em;text-align:center;font-weight:800;margin-top:2px}' +
          '.carnet-meta{font-size:11px;color:rgba(243,243,243,.6);text-align:center;margin-top:4px;font-style:italic}' +
          '.carnet-prog{font-size:12px;color:#c4b5fd;font-weight:800}';
        document.head.appendChild(st16);

        const carnet = document.createElement('div');
        carnet.id = 'carnetOverlay';
        carnet.className = 'overlay hidden';
        carnet.innerHTML =
          '<div class="card">' +
          '  <div class="title small-title">🔭 Carnet des phénomènes</div>' +
          '  <div class="subtitle">Scènes rares, imprévisibles — il faut être là quand elles passent</div>' +
          '  <div id="carnetProg" class="carnet-prog"></div>' +
          '  <div id="carnetGrid" class="carnet-grid"></div>' +
          '  <div class="btn-row"><button id="carnetClose" class="btn">Retour</button></div>' +
          '</div>';
        document.body.appendChild(carnet);
        function renderCarnet() {
          const m = phenMeta();
          const seen = IDS.filter((id) => m[id]).length;
          carnet.querySelector('#carnetProg').textContent = `${seen} / ${IDS.length} observés`;
          carnet.querySelector('#carnetGrid').innerHTML = IDS.map((id) => {
            const P = PHEN[id];
            const R = RARITY[P.rar];
            const e = m[id];
            return e
              ? `<div class="carnet-tile" style="--c:${P.col}"><div class="carnet-ic">${P.icon}</div><div class="carnet-name">${P.name}</div>` +
                `<div class="carnet-rar" style="color:${R.col}">${R.label}</div><div class="carnet-meta">vu ${e.n}× · 1ʳᵉ fois le ${e.first.slice(8, 10)}/${e.first.slice(5, 7)}</div></div>`
              : `<div class="carnet-tile unseen"><div class="carnet-ic">${P.icon}</div><div class="carnet-name">???</div>` +
                `<div class="carnet-rar" style="color:${R.col}">${R.label}</div><div class="carnet-meta">${P.hint}</div></div>`;
          }).join('');
        }
        const carnetBtn = document.createElement('button');
        carnetBtn.id = 'carnetBtn';
        carnetBtn.className = 'btn secondary';
        carnetBtn.addEventListener('click', () => { AudioSys.ui(); renderCarnet(); hide(menuOverlay); show(carnet); });
        carnet.querySelector('#carnetClose').addEventListener('click', () => { AudioSys.ui(); hide(carnet); show(menuOverlay); });
        const mc = document.querySelector('#menu .card');
        if (mc) mc.insertBefore(carnetBtn, document.getElementById('tourneyBtn') || document.getElementById('leaderboardBtn') || null);
        function refreshCarnetBtn() {
          const m = phenMeta();
          carnetBtn.textContent = `🔭 Carnet des phénomènes (${IDS.filter((id) => m[id]).length}/${IDS.length})`;
        }
        refreshCarnetBtn();

        // ---------- pont debug / tests ----------
        if (window.__NP4) {
          window.__NP4.phen = {
            ids: IDS.slice(),
            force: (id) => startPhen(id),
            active: () => (active ? { id: active.id, t: active.t, dur: active.dur } : null),
            end: () => endPhen(false),
            skip: (sec) => { if (active) active.t = Math.min(active.dur - 0.01, active.t + sec); },
            dirT: () => dirT,
            setDirT: (v) => { dirT = v; },
            calm: () => calm(),
            boost: () => scoreBoost,
            carnet: () => JSON.parse(JSON.stringify(phenMeta())),
            // séquence pure (déterminisme) : n tirages pour un seed et une route
            sequence: (seed, route, n) => { const r = mulberry(fnv(seed + '#phen')); r(); const out = []; let last = null; for (let i = 0; i < n; i++) { last = pickPhen(r, route, last); out.push(last); } return out; },
            bench: (id, n) => {
              const prev = active;
              active = null;
              startPhen(id, true);
              const a = active;
              const t0 = performance.now();
              for (let i = 0; i < n; i++) {
                a.t = (i / n) * a.dur;
                if (BACK[id]) BACK[id](a);
                if (FRONT[id]) FRONT[id](a);
                drawCaption(a);
              }
              const ms = (performance.now() - t0) / n;
              active = a;
              endPhen(true);
              active = prev;
              return ms;
            },
            toastQueue: () => tq.length,
            ghosts: () => ghostEls.filter((g) => g.el.classList.contains('np-ghost')).map((g) => g.el.id || g.el.className)
          };
        }
      })();
