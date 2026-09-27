      // ============================================================
      // MODULE V5.21 — INTERFACE UNIFIÉE, LISIBILITÉ, TIRS HUMANISÉS, PLANÈTES GÉNÉRÉES
      // Retours de jeu (27/09) : barre de boss envahissante, trop d'informations à l'écran,
      // styles disparates, gros boutons colorés peu pratiques, tirs « au métronome »,
      // planètes simplistes et répétitives, « frôlements » incompris.
      // A. Système visuel unique « verre » (translucide, flou, une seule famille de caractères)
      //    appliqué à tout le HUD ; informations secondaires regroupées ou retirées.
      // B. Barre de boss : fine, centrée, visible seulement quand un boss est en jeu.
      //    (Corrige un défaut v5.16 : le HUD fantôme la rendait visible à 40 % sans boss.)
      // C. Commandes tactiles en verre, plus petites, icônes ; bombe aussi par tape à deux doigts.
      // D. Moins de textes flottants : fusion des gains de score, plafond d'affichage.
      // E. Tirs humanisés : cadence légèrement irrégulière, timbres et hauteurs variés.
      // F. Planètes générées (géante gazeuse, tellurique, glacée, volcanique, océanique…),
      //    palette propre à chaque secteur, anneaux et lunes ; jamais deux fois la même.
      // Le mécanisme de frôlement (charger la NOVA en frôlant les tirs) est conservé ;
      // seul son compteur, jugé obscur, quitte l'écran.
      // ============================================================
      (() => {
        const G = window.__NP4;
        if (typeof meta.humanFire !== 'boolean') meta.humanFire = true;

        // ---------- A. système visuel ----------
        const css = document.createElement('style');
        css.id = 'hud21';
        css.textContent = `
:root{--g-bg:rgba(10,14,30,.34);--g-bg-strong:rgba(10,14,30,.5);--g-brd:rgba(255,255,255,.14);--g-hi:rgba(255,255,255,.22);
  --g-ink:#eef2ff;--g-mute:rgba(226,232,255,.62);--g-acc:#7dd3fc;--g-warn:#fda4af;--g-gold:#fcd34d;
  --g-font:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,system-ui,sans-serif;--g-r:14px}
#hud,#hud *{font-family:var(--g-font)!important}
#hud .panel,#coinHud,#routeBadge,#mutatorBadge{background:var(--g-bg)!important;border:1px solid var(--g-brd)!important;
  box-shadow:inset 0 1px 0 var(--g-hi),0 6px 24px rgba(0,0,0,.18)!important;border-radius:var(--g-r)!important;
  -webkit-backdrop-filter:blur(14px) saturate(1.3);backdrop-filter:blur(14px) saturate(1.3);color:var(--g-ink)!important}
#hud .label{font-size:10px!important;font-weight:600!important;letter-spacing:.12em!important;color:var(--g-mute)!important}
#hud .big{font-size:22px!important;font-weight:700!important;font-variant-numeric:tabular-nums;letter-spacing:0!important;
  text-shadow:none!important;color:var(--g-ink)!important;line-height:1.1!important}
#hud .small{font-size:11px!important;color:var(--g-mute)!important}
#hud .score-panel,#hud .wave-panel{padding:8px 12px!important;min-width:0!important}
#high{display:none!important}
#grazeDisplay{display:none!important}
#combo{font-size:11px!important;font-weight:600!important;color:var(--g-gold)!important}
#hud .lives{color:var(--g-warn)!important;letter-spacing:.1em}
#pauseBtn{background:var(--g-bg)!important;border:1px solid var(--g-brd)!important;border-radius:12px!important;
  -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);color:var(--g-ink)!important;box-shadow:inset 0 1px 0 var(--g-hi)!important}
#hud .mid .panel.bars{padding:7px 10px!important}
#hud .bar-row span{font-size:9px!important;letter-spacing:.1em;color:var(--g-mute)!important}
#hud .bar{height:4px!important;border-radius:4px!important;background:rgba(255,255,255,.1)!important}
#hud .fill{border-radius:4px!important;box-shadow:none!important}
#coinHud{font-weight:700!important;font-size:14px!important;top:calc(env(safe-area-inset-top) + 72px)!important}
#toasts .toast{background:var(--g-bg-strong)!important;border:1px solid var(--g-brd)!important;color:var(--g-ink)!important;
  -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);font-family:var(--g-font)!important;font-weight:600!important;
  font-size:12px!important;border-radius:999px!important;box-shadow:inset 0 1px 0 var(--g-hi)!important}
/* B. barre de boss */
#bossHud{top:calc(env(safe-area-inset-top) + 94px)!important;left:50%!important;right:auto!important;transform:translateX(-50%);
  width:min(56vw,260px)!important;opacity:0!important;visibility:hidden;transition:opacity .3s ease,visibility 0s .3s!important}
#bossHud.on21{opacity:1!important;visibility:visible;transition:opacity .3s ease!important}
body #bossHud:not(.on21){opacity:0!important;visibility:hidden!important}
body #bossHud.on21.np-ghost{opacity:.3!important}
#bossLabel{font-size:9px!important;letter-spacing:.18em!important;margin-bottom:3px!important;color:var(--g-mute)!important;
  text-shadow:none!important;font-weight:600!important}
#bossBarWrap{height:3px!important;background:rgba(255,255,255,.12)!important;border:0!important}
#bossBar{background:var(--g-warn)!important;box-shadow:none!important}
/* C. commandes tactiles */
#hud .bottom .status{display:none!important}
#specialBtn,#bombBtn,#dashBtn,#fireBtn{width:58px!important;height:58px!important;border-radius:50%!important;padding:0!important;
  background:var(--g-bg)!important;border:1px solid var(--g-brd)!important;color:var(--g-ink)!important;
  -webkit-backdrop-filter:blur(16px) saturate(1.4);backdrop-filter:blur(16px) saturate(1.4);
  box-shadow:inset 0 1px 0 var(--g-hi),0 8px 24px rgba(0,0,0,.22)!important;text-shadow:none!important;
  font:600 9px var(--g-font)!important;letter-spacing:.08em!important;display:grid!important;place-items:center;
  place-content:center;gap:2px;opacity:.9!important;touch-action:none}
#specialBtn svg,#bombBtn svg,#dashBtn svg{width:22px;height:22px;display:block;margin:0 auto}
#hud #specialBtn::after,#hud #bombBtn::after{content:none!important}
#specialBtn{position:relative;opacity:.55!important}
#specialBtn.ready{opacity:.95!important;box-shadow:inset 0 1px 0 var(--g-hi),0 0 0 2px rgba(253,186,116,.75),0 0 22px rgba(253,186,116,.4)!important}
#specialBtn .n21,#bombBtn .n21{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;border-radius:9px;background:var(--g-ink);
  color:#0b1020;font:700 11px/18px var(--g-font);text-align:center;padding:0 4px}
#bombBtn{position:relative}
#specialBtn:active,#bombBtn:active,#dashBtn:active{transform:scale(.92)!important}
#hud .bottom{align-items:center!important;gap:10px!important}
.touch-hint21{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 92px);transform:translateX(-50%);z-index:30;
  background:var(--g-bg-strong);border:1px solid var(--g-brd);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);
  color:var(--g-ink);font:600 12px var(--g-font);padding:8px 14px;border-radius:999px;pointer-events:none;opacity:0;transition:opacity .4s}
.touch-hint21.show{opacity:1}
`;
        document.head.appendChild(css);

        // icônes (traits simples, lisibles à petite taille)
        const ICONS = {
          cannon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="12" rx="1.5"/><path d="M7 15h10l-1.5 4h-7z"/><path d="M12 1v2"/></svg>',
          nova: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/></svg>',
          bomb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="14" r="6.5"/><path d="M15.5 9.5l2-2M18 5l1-1M19.5 7.5H21M16.5 4V3"/></svg>',
          dash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h10M10 7l5 5-5 5M18 6v12"/></svg>'
        };
        function dress(el, icon, label) {
          if (!el || el.dataset.d21) return;
          el.dataset.d21 = '1';
          el.innerHTML = ICONS[icon] + `<span>${label}</span>`;
        }
        const bombBadge = document.createElement('span');
        bombBadge.className = 'n21';
        const cannonBadge = document.createElement('span'); // v5.23 : obus du canon lourd
        cannonBadge.className = 'n21';
        function dressAll() {
          dress($('specialBtn'), 'cannon', 'CANON');
          dress($('bombBtn'), 'bomb', 'BOMBE');
          dress($('dashBtn'), 'dash', 'DASH');
          const b = $('bombBtn');
          if (b && bombBadge.parentNode !== b) b.appendChild(bombBadge);
          const sp = $('specialBtn');
          if (sp && cannonBadge.parentNode !== sp) sp.appendChild(cannonBadge);
        }
        dressAll();

        // B. barre de boss : classe plutôt que style en ligne (le HUD fantôme ne la réveille plus)
        const bossHudEl = $('bossHud');
        showBossBar = function (on) {
          bossHudEl.style.opacity = '';
          bossHudEl.classList.toggle('on21', !!on);
        };
        bossHudEl.style.opacity = '';

        // C. bombe à deux doigts (ignore les taps sur les boutons)
        let twoT = 0;
        window.addEventListener('touchstart', (e) => {
          if (state !== 'playing' || e.touches.length !== 2) return;
          if (e.target.closest && e.target.closest('button')) return;
          const now = performance.now();
          if (now - twoT < 400) return;
          twoT = now;
          doBomb();
        }, { passive: true });
        const hint = document.createElement('div');
        hint.className = 'touch-hint21';
        hint.textContent = 'Astuce : tape à deux doigts pour lancer une bombe';
        document.body.appendChild(hint);

        // D. textes flottants : fusion des gains, plafond d'affichage
        const baseAddText21 = addText;
        let lastGain = null;
        addText = function (x, y, str, color) {
          const s = String(str);
          if (/^FR[ÔO]LEMENT/i.test(s)) return; // mécanique conservée (charge NOVA), texte retiré
          const gain = /^\+\d+$/.test(s);
          if (gain) {
            const now = performance.now();
            if (lastGain && now - lastGain.t < 450 && texts.includes(lastGain.obj)) {
              lastGain.sum += parseInt(s.slice(1), 10);
              lastGain.obj.str = '+' + lastGain.sum;
              lastGain.obj.life = lastGain.obj.maxLife;
              lastGain.t = now;
              return;
            }
          }
          if (texts.length >= 6) texts.splice(0, texts.length - 5); // les plus anciens cèdent la place
          baseAddText21(x, y, s, color);
          if (gain) lastGain = { obj: texts[texts.length - 1], sum: parseInt(s.slice(1), 10), t: performance.now() };
        };

        // E. tirs humanisés
        // Marche aléatoire lissée : le rythme accélère et ralentit comme un doigt sur la gâchette.
        let drift = 1, driftTarget = 1, burst = 0;
        const baseFire21 = firePlayer;
        firePlayer = function () {
          baseFire21();
          if (!meta.humanFire || !player) return;
          if (Math.random() < 0.12) driftTarget = 0.84 + Math.random() * 0.34;
          drift += (driftTarget - drift) * 0.25;
          let k = drift * (0.9 + Math.random() * 0.2);
          if (burst > 0) { burst--; k *= 0.72; } else if (Math.random() < 0.035) burst = 2 + (Math.random() * 3 | 0);
          if (Math.random() < 0.04) k *= 1.6; // micro-hésitation
          player.fireCd = Math.max(0.06, player.fireCd * k);
        };
        // Son : trois timbres, hauteur ±70 cents, vélocité variable, léger décalage
        let lastShot = 0;
        const TIMBRES = [
          { f: 1040, slide: -760, type: 'square', filt: 3000, end: 850, g: 0.024 },
          { f: 1320, slide: -980, type: 'triangle', filt: 4200, end: 1100, g: 0.03 },
          { f: 880, slide: -560, type: 'sawtooth', filt: 2400, end: 700, g: 0.018 }
        ];
        let tIdx = 0;
        const baseShoot21 = AudioSys.shoot;
        AudioSys.shoot = function () {
          if (!meta.humanFire || !this.ctx || !this.tone) return baseShoot21.apply(this, arguments);
          if (this.muted) return;
          const now = this.ctx.currentTime;
          if (now - lastShot < 0.05) return;
          lastShot = now;
          if (Math.random() < 0.3) tIdx = (tIdx + 1 + (Math.random() * 2 | 0)) % TIMBRES.length;
          const T = TIMBRES[tIdx];
          const cents = (Math.random() * 2 - 1) * 70;
          const v = Math.pow(2, cents / 1200);
          const vel = 0.7 + Math.random() * 0.45;
          const when = now + Math.random() * 0.012;
          this.tone({ freq: T.f * v, dur: 0.05 + Math.random() * 0.03, type: T.type, gain: T.g * vel, slide: T.slide * v,
            attack: 0.002, release: 0.025 + Math.random() * 0.02, filterFreq: T.filt * (0.85 + Math.random() * 0.3),
            filterEnd: T.end, when, dest: this.sfxBus });
          if (this.noiseHit && Math.random() < 0.5) this.noiseHit({ dur: 0.02, gain: 0.008 * vel, filterFreq: 5500 + Math.random() * 2500, filterType: 'highpass' });
        };

        // F. planètes générées
        const TAU21 = Math.PI * 2;
        function mulb(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
        function noise2(seed) {
          const R = mulb(seed), P = new Uint8Array(512), g = new Float32Array(256);
          for (let i = 0; i < 256; i++) { P[i] = i; g[i] = R() * 2 - 1; }
          for (let i = 255; i > 0; i--) { const j = (R() * (i + 1)) | 0; [P[i], P[j]] = [P[j], P[i]]; }
          for (let i = 0; i < 256; i++) P[i + 256] = P[i];
          const sm = (t) => t * t * (3 - 2 * t);
          const v = (x, y) => {
            const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255, xf = x - Math.floor(x), yf = y - Math.floor(y);
            const a = g[P[P[xi] + yi]], b = g[P[P[xi + 1] + yi]], c = g[P[P[xi] + yi + 1]], d = g[P[P[xi + 1] + yi + 1]];
            const u = sm(xf), w = sm(yf);
            return (a + (b - a) * u) + ((c + (d - c) * u) - (a + (b - a) * u)) * w;
          };
          return (x, y, oct = 4) => { let s = 0, amp = 0.5, f = 1; for (let o = 0; o < oct; o++) { s += amp * v(x * f, y * f); amp *= 0.5; f *= 2.03; } return s; };
        }
        const hsl = (h, s, l) => `hsl(${h},${s}%,${l}%)`;
        const KINDS = ['gas', 'rock', 'ice', 'lava', 'ocean', 'desert', 'toxic'];
        const recent = [];
        function sectorHue() {
          try {
            const v13 = G.v13, v12 = G.v12;
            const s = v13 && v13.acte && v13.acte() >= 3 ? v13.sec3() : v12 && v12.acte2 && v12.acte2() ? v12.sec2() : G.v10 ? G.v10.sector() : 0;
            return { idx: s, hue: (s * 47 + 200) % 360 };
          } catch (e) { return { idx: 0, hue: 210 }; }
        }
        function genPlanet() {
          const R = mulb((Math.random() * 4294967296) >>> 0);
          const sec = sectorHue();
          let kind;
          do { kind = KINDS[(R() * KINDS.length) | 0]; } while (recent.includes(kind));
          recent.push(kind); if (recent.length > 3) recent.shift();
          const far = R() < 0.25;
          const r = far ? 90 + R() * 70 : 34 + R() * 52;
          const ring = kind === 'gas' ? R() < 0.7 : kind === 'ice' ? R() < 0.35 : R() < 0.12;
          const moon = R() < 0.35;
          const baseHue = (sec.hue + (R() * 80 - 40) + 360) % 360;
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          const pad = ring ? r * 1.05 : r * 0.35;
          const S = Math.ceil((r + pad) * 2 * dpr);
          const cv = document.createElement('canvas'); cv.width = cv.height = S;
          const c = cv.getContext('2d');
          const cx = S / 2, cy = S / 2, pr = r * dpr;
          const n = noise2((R() * 1e9) | 0);
          const tilt = (R() * 0.8 - 0.4);
          const ringDraw = (front) => {
            c.save(); c.translate(cx, cy); c.rotate(tilt); c.scale(1, 0.26);
            const bands = 3 + ((R() * 3) | 0);
            for (let i = 0; i < bands; i++) {
              const rr = pr * (1.25 + i * 0.16);
              c.strokeStyle = hsl((baseHue + 20 + i * 12) % 360, 30, 70 - i * 6);
              c.globalAlpha = 0.25 + 0.35 * ((i + 1) / bands);
              c.lineWidth = pr * (0.05 + ((i * 7) % 3) * 0.03);
              c.beginPath(); c.arc(0, 0, rr, front ? 0 : Math.PI, front ? Math.PI : TAU21); c.stroke();
            }
            c.restore(); c.globalAlpha = 1;
          };
          if (ring) ringDraw(false);
          // surface
          const img = c.createImageData(S, S), d = img.data;
          const scale = 2.2 + R() * 2.5, sx = R() * 50, sy = R() * 50;
          for (let y = 0; y < S; y++) {
            for (let x = 0; x < S; x++) {
              const dx = (x - cx) / pr, dy = (y - cy) / pr, dd = dx * dx + dy * dy;
              if (dd > 1) continue;
              const z = Math.sqrt(1 - dd);
              const u = dx / (z + 0.9), w = dy / (z + 0.9); // légère projection sphérique
              let h = baseHue, s = 45, l = 45, t;
              if (kind === 'gas') { t = n(sx, w * 6 + n(u * 2 + sx, w * 2 + sy, 3) * 1.4, 3); h = baseHue + t * 40; s = 40 + t * 30; l = 48 + t * 30 + Math.sin(w * 18 + t * 5) * 6; }
              else if (kind === 'rock') { t = n(u * scale + sx, w * scale + sy, 5); h = baseHue * 0.3 + 20; s = 18 + t * 12; l = 38 + t * 36; }
              else if (kind === 'ice') { t = n(u * scale + sx, w * scale + sy, 5); h = 195 + t * 20; s = 35; l = 72 + t * 22 - (Math.abs(n(u * 9, w * 9, 2)) < 0.03 ? 22 : 0); }
              else if (kind === 'lava') { t = n(u * scale + sx, w * scale + sy, 5); const crack = Math.abs(t) < 0.06; h = crack ? 22 : 12; s = crack ? 95 : 25; l = crack ? 55 : 14 + t * 18; }
              else if (kind === 'ocean') { t = n(u * scale + sx, w * scale + sy, 5); const land = t > 0.08; h = land ? 95 + t * 60 : 212; s = land ? 35 : 60; l = land ? 34 + t * 30 : 34 + t * 12; if (n(u * 5 + 90, w * 5, 3) > 0.18) { s = 10; l = 88; } }
              else if (kind === 'desert') { t = n(u * scale + sx, w * scale + sy, 5); h = 30 + t * 18; s = 48; l = 52 + t * 26; }
              else { t = n(u * scale + sx, w * scale + sy, 4); h = 80 + t * 50; s = 55; l = 38 + t * 30 + Math.sin(w * 14) * 4; }
              // éclairage : lumière venant du haut gauche
              const lum = Math.max(0.06, (-dx * 0.55 - dy * 0.55 + z * 0.62) * 1.05);
              const [rr, gg, bb] = hslToRgb(((h % 360) + 360) % 360, Math.max(0, Math.min(100, s)), Math.max(0, Math.min(100, l)) * lum);
              const i = (y * S + x) * 4; d[i] = rr; d[i + 1] = gg; d[i + 2] = bb; d[i + 3] = 255;
            }
          }
          const tmp = document.createElement('canvas'); tmp.width = tmp.height = S; tmp.getContext('2d').putImageData(img, 0, 0);
          c.drawImage(tmp, 0, 0);
          // atmosphère
          const atm = kind === 'rock' || kind === 'lava' ? 0.12 : 0.35;
          const ag = c.createRadialGradient(cx, cy, pr * 0.92, cx, cy, pr * 1.12);
          ag.addColorStop(0, `hsla(${kind === 'lava' ? 15 : baseHue},80%,70%,${atm})`); ag.addColorStop(1, 'hsla(0,0%,0%,0)');
          c.fillStyle = ag; c.beginPath(); c.arc(cx, cy, pr * 1.12, 0, TAU21); c.fill();
          if (ring) ringDraw(true);
          const moons = [];
          if (moon) moons.push({ a: R() * TAU21, dist: r * (1.6 + R() * 0.8), mr: 3 + R() * 6, sp: (R() < 0.5 ? -1 : 1) * (0.05 + R() * 0.08), l: 55 + R() * 30 });
          return { kind, ring, cv, S: S / dpr, r, far, moons, alpha: far ? 0.55 : 0.92, vy: far ? 5 + R() * 5 : 12 + R() * 14 };
        }
        function hslToRgb(h, s, l) {
          s /= 100; l /= 100;
          const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
          const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
          return [f(0) * 255, f(8) * 255, f(4) * 255];
        }
        if (G) {
          G.planets21 = {
            create(W0) {
              const p = genPlanet();
              const x = p.far ? (Math.random() < 0.5 ? -p.r * 0.3 : W0 + p.r * 0.3) : p.r + 30 + Math.random() * Math.max(1, W0 - 2 * p.r - 60);
              return { x, y: -p.S / 2 - 20, r: p.r, vy: p.vy, g21: p };
            },
            draw(ctx2, p) {
              const g = p.g21;
              ctx2.save(); ctx2.globalAlpha = g.alpha;
              ctx2.drawImage(g.cv, p.x - g.S / 2, p.y - g.S / 2, g.S, g.S);
              for (const m of g.moons) {
                m.a += m.sp * 0.016;
                const mx = p.x + Math.cos(m.a) * m.dist, my = p.y + Math.sin(m.a) * m.dist * 0.35;
                ctx2.fillStyle = `hsl(220,8%,${m.l}%)`; ctx2.beginPath(); ctx2.arc(mx, my, m.mr, 0, TAU21); ctx2.fill();
              }
              ctx2.restore();
            },
            sample: (n) => Array.from({ length: n || 6 }, () => genPlanet())
          };
        }

        // mise à jour HUD : charge NOVA, bombes, astuce deux doigts
        let uiT = 0, hinted = false;
        const baseUpdate21 = update;
        update = function (dt) {
          baseUpdate21(dt);
          uiT += dt; if (uiT < 0.15) return; uiT = 0;
          if (state !== 'playing' || !player) return;
          dressAll();
          const sb = $('specialBtn');
          if (sb) sb.classList.toggle('ready', (player.cannon || 0) > 0);
          cannonBadge.textContent = String(player.cannon || 0);
          bombBadge.textContent = String(player.bombs);
          if (!hinted && gameTime > 25 && player.bombs > 0) {
            hinted = true;
            try { if (!meta.hint2f) { meta.hint2f = true; saveMeta(); hint.classList.add('show'); setTimeout(() => hint.classList.remove('show'), 4200); } } catch (e) {}
          }
        };

        // réglage : tirs humanisés
        const settings = $('settingsOverlay');
        const anchor = settings && settings.querySelector('.btn-row');
        if (anchor) {
          const row = document.createElement('div');
          row.className = 'settings-row';
          row.innerHTML = '<label for="stHuman21">Tir humanisé<span class="settings-desc">Cadence et son légèrement irréguliers, comme une gâchette tenue à la main</span></label>' +
            '<div class="settings-control"><select id="stHuman21"><option value="1">Activé</option><option value="0">Métronome</option></select></div>';
          anchor.before(row);
          const sel = row.querySelector('select');
          sel.value = meta.humanFire ? '1' : '0';
          sel.addEventListener('change', () => { meta.humanFire = sel.value === '1'; saveMeta(); AudioSys.ui(); });
        }

        if (G) G.hud21 = { boss: () => bossHudEl.classList.contains('on21'), texts: () => texts.map((t) => t.str), drift: () => drift,
          addText: (x, y, s, c) => addText(x, y, s, c), fire: () => { firePlayer(); return player.fireCd; } };
      })();
