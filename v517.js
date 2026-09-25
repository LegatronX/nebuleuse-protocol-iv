      // ============================================================
      // MODULE V5.17 — INSTANTANÉ COSMIQUE (MODE PHOTO)
      // A. Gel : l'action se fige (état « photo »), le HUD, les commandes et les
      //    notifications disparaissent ; la musique continue. L'image est prélevée
      //    APRÈS le pipeline GPU v5.14 (bloom, halos, ondes) dans la même frame.
      // B. Chambre noire : cadrage au doigt (glisser, pincer), 5 filtres (matrices
      //    de couleur appliquées aux pixels : identiques en aperçu et au tirage),
      //    4 formats, vignettage, grain, cartouche titré (phénomène, lieu, seed).
      // C. Tirage : JPEG haute définition, feuille de partage iOS (« Enregistrer
      //    l'image ») ou téléchargement ; vignette du phénomène rangée dans le Carnet
      //    (meta.phen[id].photo, additif), +20 ⬡ au premier cliché de chaque phénomène.
      // Accès : bouton 📷 pendant un phénomène · bouton « Mode photo » en pause · touche O.
      // ============================================================
      (() => {
        const PH = () => window.__NP4 && window.__NP4.phen;
        const fxEl = () => document.getElementById('fx');
        const FIRST_SHOT_NANO = 20;

        // ---------- A. filtres (matrice 3×4 : r g b + décalage, en 0..255) ----------
        const sat = (s) => {
          const lr = 0.2126, lg = 0.7152, lb = 0.0722;
          return [
            lr * (1 - s) + s, lg * (1 - s), lb * (1 - s), 0,
            lr * (1 - s), lg * (1 - s) + s, lb * (1 - s), 0,
            lr * (1 - s), lg * (1 - s), lb * (1 - s) + s, 0
          ];
        };
        const mul = (a, b) => { // a ∘ b (b appliquée d'abord)
          const o = [];
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 4; c++) {
              let v = c === 3 ? a[r * 4 + 3] : 0;
              for (let k = 0; k < 3; k++) v += a[r * 4 + k] * b[k * 4 + c];
              o.push(v);
            }
          }
          return o;
        };
        const contrast = (k, off) => [k, 0, 0, 128 * (1 - k) + (off || 0), 0, k, 0, 128 * (1 - k) + (off || 0), 0, 0, k, 128 * (1 - k) + (off || 0)];
        const tint = (r, g, b) => [r, 0, 0, 0, 0, g, 0, 0, 0, 0, b, 0];
        const FILTERS = {
          brut: { name: 'Brut', m: null, vig: 0.25, grain: 0 },
          nebuleuse: { name: 'Nébuleuse', m: mul(tint(1.06, 0.96, 1.12), mul(contrast(1.12, 4), sat(1.45))), vig: 0.45, grain: 0.03 },
          noiror: { name: 'Noir & Or', m: mul(tint(1.12, 0.94, 0.62), mul(contrast(1.25, 6), sat(0))), vig: 0.6, grain: 0.06 },
          infrarouge: { name: 'Infrarouge', m: mul(contrast(1.1, 0), [0.1, 1.1, 0.1, 10, 0.9, 0.2, 0.1, 0, 0.3, 0.1, 0.9, 30]), vig: 0.4, grain: 0.04 },
          argentique: { name: 'Argentique', m: mul(tint(1.08, 1.0, 0.86), mul(contrast(0.82, 18), sat(0.78))), vig: 0.55, grain: 0.09 }
        };
        const FORMATS = {
          plein: { name: 'Plein écran', r: 0 },
          portrait: { name: '4:5', r: 4 / 5 },
          carre: { name: '1:1', r: 1 },
          cinema: { name: 'Cinéma', r: 2 }
        };

        function applyMatrix(c2, w, h, m) {
          if (!m) return;
          const img = c2.getImageData(0, 0, w, h);
          const d = img.data;
          const [a0, a1, a2, a3, b0, b1, b2, b3, c0, c1, c2_, c3] = m;
          for (let i = 0; i < d.length; i += 4) {
            const r = d[i], g = d[i + 1], b = d[i + 2];
            d[i] = a0 * r + a1 * g + a2 * b + a3;
            d[i + 1] = b0 * r + b1 * g + b2 * b + b3;
            d[i + 2] = c0 * r + c1 * g + c2_ * b + c3;
          }
          c2.putImageData(img, 0, 0);
        }

        // grain déterministe (jamais Math.random : l'Opération du jour le remplace)
        let grainTile = null;
        function grain() {
          if (grainTile) return grainTile;
          grainTile = document.createElement('canvas');
          grainTile.width = grainTile.height = 128;
          const g = grainTile.getContext('2d');
          const im = g.createImageData(128, 128);
          let s = 0x9e3779b9;
          for (let i = 0; i < im.data.length; i += 4) {
            s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
            const v = (s >>> 0) & 255;
            im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
            im.data[i + 3] = 255;
          }
          g.putImageData(im, 0, 0);
          return grainTile;
        }

        // ---------- état ----------
        let shot = null;      // canvas : image gelée (résolution de rendu)
        let grabReq = false;
        let from = null;      // 'playing' | 'paused'
        let phenId = null;    // phénomène à l'écran au moment du gel
        let place = '';       // dernier lieu annoncé (secteur, acte)
        let filt = 'nebuleuse', fmt = 'plein', card = true;
        let zoom = 1, cx = 0.5, cy = 0.5;
        let lastBlob = null, lastUrl = null, lastName = '';
        let composeQueued = false;
        // capacité « downloads » de la visionneuse d'artifacts (null hors visionneuse : sans effet)
        // résolue paresseusement (au premier passage en mode photo) : window.claude peut arriver après le chargement
        let dlP = null;
        const dlNs = () => dlP || (dlP = (window.claude && typeof window.claude.use === 'function')
          ? Promise.race([Promise.resolve(window.claude.use('downloads')).catch(() => null), new Promise((r) => setTimeout(() => r(null), 12000))])
          : Promise.resolve(null));

        // ---------- B. interface ----------
        const style = document.createElement('style');
        style.textContent =
          '#photoBtn{position:fixed;right:max(12px,env(safe-area-inset-right));top:calc(env(safe-area-inset-top) + 38vh);z-index:25;width:52px;height:52px;border-radius:50%;' +
          'border:1.5px solid rgba(255,255,255,.55);background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.35),rgba(15,23,42,.55));color:#fff;font-size:24px;' +
          'box-shadow:0 0 0 0 rgba(255,255,255,.5);animation:npShutterPulse 1.8s ease-out infinite;pointer-events:auto;display:none;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}' +
          '#photoBtn.on{display:block}' +
          '@keyframes npShutterPulse{0%{box-shadow:0 0 0 0 rgba(255,255,255,.45)}100%{box-shadow:0 0 0 18px rgba(255,255,255,0)}}' +
          'body.photo-mode #hud,body.photo-mode #toasts,body.photo-mode #photoBtn,body.photo-mode #routeBadge,body.photo-mode #mutatorBadge,body.photo-mode #coinHud,body.photo-mode #countdown{visibility:hidden!important}' +
          '#photoOverlay{position:fixed;inset:0;z-index:60;background:#000;display:flex;flex-direction:column;touch-action:none;user-select:none;-webkit-user-select:none}' +
          '#photoOverlay.hidden{display:none}' +
          '#photoStage{flex:1;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;padding-top:env(safe-area-inset-top)}' +
          '#photoCanvas{max-width:100%;max-height:100%;box-shadow:0 0 0 1px rgba(255,255,255,.18),0 18px 60px rgba(0,0,0,.8)}' +
          '#photoHint{position:absolute;top:calc(env(safe-area-inset-top) + 10px);left:0;right:0;text-align:center;font-size:11px;letter-spacing:.14em;color:rgba(255,255,255,.55);pointer-events:none;text-transform:uppercase}' +
          '#photoZoom{position:absolute;bottom:10px;right:14px;font:800 12px system-ui;color:rgba(255,255,255,.7);pointer-events:none}' +
          '#photoFlash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}' +
          '#photoFlash.go{animation:npFlash .5s ease-out}' +
          '@keyframes npFlash{0%{opacity:.9}100%{opacity:0}}' +
          '.photo-bar{padding:10px 12px calc(12px + env(safe-area-inset-bottom));background:linear-gradient(180deg,rgba(8,10,24,.92),#05060f);display:flex;flex-direction:column;gap:10px}' +
          '.photo-row{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}' +
          '.photo-row::-webkit-scrollbar{display:none}' +
          '.photo-chip{flex:0 0 auto;min-height:40px;padding:0 14px;border-radius:20px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.06);color:#e2e8f0;font:800 12px system-ui;letter-spacing:.04em}' +
          '.photo-chip.sel{background:#f5d06f;color:#1a1204;border-color:#f5d06f}' +
          '.photo-actions{display:flex;gap:10px;align-items:center}' +
          '.photo-actions .btn{flex:1;min-height:48px;margin:0}' +
          '#photoShoot{flex:0 0 72px!important;height:72px;border-radius:50%;padding:0;font-size:28px;background:radial-gradient(circle,#fff 0 52%,rgba(255,255,255,.18) 53% 100%);border:3px solid rgba(255,255,255,.85);color:#111}' +
          '#photoResult{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:calc(env(safe-area-inset-top) + 16px) 16px calc(env(safe-area-inset-bottom) + 16px);background:rgba(3,4,12,.94)}' +
          '#photoResult.hidden{display:none}' +
          '#photoResult img{max-width:100%;max-height:58vh;border-radius:6px;box-shadow:0 0 0 6px #f8fafc,0 24px 60px rgba(0,0,0,.8);transform:rotate(-1.2deg)}' +
          '#photoResultTxt{font-size:13px;color:#e2e8f0;text-align:center;min-height:18px}' +
          '#photoResult .btn{width:min(86vw,360px);margin:0}' +
          '#photoPauseBtn{width:100%}' +
          '.carnet-tile.has-photo{background-size:cover!important;background-position:center!important}' +
          '.carnet-tile.has-photo::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,6,16,.15),rgba(4,6,16,.82) 70%);z-index:0}' +
          '.carnet-tile.has-photo>*{position:relative;z-index:1}' +
          '.carnet-shot{position:absolute;top:6px;right:8px;font-size:12px;z-index:1}';
        document.head.appendChild(style);

        const btn = document.createElement('button');
        btn.id = 'photoBtn';
        btn.setAttribute('aria-label', 'Mode photo');
        btn.textContent = '📷';
        document.body.appendChild(btn);

        const ov = document.createElement('div');
        ov.id = 'photoOverlay';
        ov.className = 'hidden';
        ov.innerHTML =
          '<div id="photoStage"><canvas id="photoCanvas"></canvas><div id="photoHint">Glisser pour cadrer · pincer pour zoomer</div><div id="photoZoom"></div><div id="photoFlash"></div></div>' +
          '<div class="photo-bar">' +
          '  <div class="photo-row" id="photoFilters"></div>' +
          '  <div class="photo-row" id="photoFormats"></div>' +
          '  <div class="photo-actions"><button id="photoBack" class="btn secondary">✕ Retour</button><button id="photoShoot" class="btn" aria-label="Capturer">📸</button><button id="photoReset" class="btn secondary">⟲ Recadrer</button></div>' +
          '</div>' +
          '<div id="photoResult" class="hidden"><img id="photoImg" alt="Instantané"><div id="photoResultTxt"></div>' +
          '  <button id="photoShare" class="btn">📤 Enregistrer / Partager</button>' +
          '  <button id="photoAgain" class="btn secondary">Nouvelle prise</button>' +
          '  <button id="photoDone" class="btn secondary">Reprendre la partie</button></div>';
        document.body.appendChild(ov);
        const cv = ov.querySelector('#photoCanvas');
        const cctx = cv.getContext('2d');
        const stage = ov.querySelector('#photoStage');
        const resEl = ov.querySelector('#photoResult');

        function chips() {
          ov.querySelector('#photoFilters').innerHTML = Object.keys(FILTERS).map((k) =>
            `<button class="photo-chip${k === filt ? ' sel' : ''}" data-f="${k}">${FILTERS[k].name}</button>`).join('');
          ov.querySelector('#photoFormats').innerHTML = Object.keys(FORMATS).map((k) =>
            `<button class="photo-chip${k === fmt ? ' sel' : ''}" data-fmt="${k}">${FORMATS[k].name}</button>`).join('') +
            `<button class="photo-chip${card ? ' sel' : ''}" data-card="1">🏷 Cartouche</button>`;
        }
        ov.querySelector('.photo-bar').addEventListener('click', (e) => {
          const b = e.target.closest('.photo-chip');
          if (!b) return;
          if (b.dataset.f) filt = b.dataset.f;
          if (b.dataset.fmt) { fmt = b.dataset.fmt; clampView(); }
          if (b.dataset.card) card = !card;
          AudioSys.ui();
          chips();
          queueCompose();
        });

        // ---------- cadrage ----------
        function frameRatio() {
          const r = FORMATS[fmt].r;
          return r || (shot ? shot.width / shot.height : W / H);
        }
        // rectangle source (pixels de l'image gelée) pour un zoom et un centre donnés
        function cropRect() {
          const sw = shot.width, sh = shot.height;
          const r = frameRatio();
          let w = sw, h = sw / r;
          if (h > sh) { h = sh; w = sh * r; }
          w /= zoom; h /= zoom;
          const x = Math.max(0, Math.min(sw - w, cx * sw - w / 2));
          const y = Math.max(0, Math.min(sh - h, cy * sh - h / 2));
          return { x, y, w, h };
        }
        function clampView() {
          if (!shot) return;
          zoom = Math.max(1, Math.min(3, zoom));
          const c = cropRect();
          cx = (c.x + c.w / 2) / shot.width;
          cy = (c.y + c.h / 2) / shot.height;
        }

        // ---------- composition (aperçu et tirage partagent le même code) ----------
        function title() {
          const ph = PH();
          const info = phenId && ph && ph.info ? ph.info(phenId) : null;
          return info;
        }
        function compose(target, w, h) {
          const g = target.getContext('2d');
          const c = cropRect();
          g.imageSmoothingQuality = 'high';
          g.drawImage(shot, c.x, c.y, c.w, c.h, 0, 0, w, h);
          const F = FILTERS[filt];
          applyMatrix(g, w, h, F.m);
          if (F.grain > 0) {
            g.save();
            g.globalAlpha = F.grain;
            g.globalCompositeOperation = 'overlay';
            g.fillStyle = g.createPattern(grain(), 'repeat');
            g.fillRect(0, 0, w, h);
            g.restore();
          }
          if (F.vig > 0) {
            const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.hypot(w, h) * 0.56);
            vg.addColorStop(0, 'rgba(0,0,0,0)');
            vg.addColorStop(1, `rgba(0,0,0,${F.vig})`);
            g.fillStyle = vg;
            g.fillRect(0, 0, w, h);
          }
          if (card) drawCard(g, w, h);
        }
        function where() {
          if (place) return place;
          const v = window.__NP4 && window.__NP4.v10;
          const S = v && v.sectorInfo ? v.sectorInfo(v.sector()) : null;
          return S ? S.name : '';
        }
        function drawCard(g, w, h) {
          const info = title();
          const place = where();
          const u = Math.min(w, h) / 100; // unité relative : même rendu à toutes les tailles
          const bandH = u * 22;
          const grd = g.createLinearGradient(0, h - bandH * 1.6, 0, h);
          grd.addColorStop(0, 'rgba(2,3,10,0)');
          grd.addColorStop(1, 'rgba(2,3,10,0.82)');
          g.fillStyle = grd;
          g.fillRect(0, h - bandH * 1.6, w, bandH * 1.6);
          const pad = u * 5;
          const col = info ? info.col : '#f5d06f';
          g.fillStyle = col;
          g.fillRect(pad, h - bandH + u * 1.5, u * 9, Math.max(1, u * 0.5));
          g.textBaseline = 'alphabetic';
          g.shadowColor = 'rgba(0,0,0,.7)';
          g.shadowBlur = u * 1.5;
          g.fillStyle = '#f8fafc';
          g.font = `900 ${Math.round(u * 6.2)}px system-ui,-apple-system,sans-serif`;
          const main = info ? `${info.icon} ${info.name}` : (place || 'Nébuleuse Protocol IV');
          g.fillText(main, pad, h - bandH + u * 9.5, w - pad * 2);
          g.font = `800 ${Math.round(u * 2.6)}px system-ui,-apple-system,sans-serif`;
          g.fillStyle = info ? info.rarCol : 'rgba(248,250,252,.7)';
          const line2 = info ? `${info.rarLabel}${place ? ' · ' + place : ''}` : 'INSTANTANÉ COSMIQUE';
          g.fillText(line2.toUpperCase(), pad, h - bandH + u * 14, w - pad * 2);
          g.fillStyle = 'rgba(248,250,252,.55)';
          const d = new Date();
          const seed = window.__NP4 && window.__NP4.routes ? String(window.__NP4.routes.seed()).slice(0, 22) : '';
          g.fillText(`NÉBULEUSE PROTOCOL IV · ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}${seed ? ' · ' + seed : ''}`, pad, h - bandH + u * 18, w - pad * 2);
          g.shadowBlur = 0;
        }

        function previewSize() {
          const r = stage.getBoundingClientRect();
          const availW = Math.max(100, r.width - 16), availH = Math.max(100, r.height - 36);
          const fr = frameRatio();
          let w = availW, h = availW / fr;
          if (h > availH) { h = availH; w = availH * fr; }
          const k = Math.min(2, window.devicePixelRatio || 1);
          return { cssW: Math.round(w), cssH: Math.round(h), w: Math.round(w * k), h: Math.round(h * k) };
        }
        function renderPreview() {
          composeQueued = false;
          if (!shot || ov.classList.contains('hidden')) return;
          const s = previewSize();
          if (cv.width !== s.w || cv.height !== s.h) { cv.width = s.w; cv.height = s.h; }
          cv.style.width = s.cssW + 'px';
          cv.style.height = s.cssH + 'px';
          compose(cv, s.w, s.h);
          ov.querySelector('#photoZoom').textContent = zoom > 1.01 ? `×${zoom.toFixed(1)}` : '';
        }
        function queueCompose() {
          if (composeQueued) return;
          composeQueued = true;
          requestAnimationFrame(renderPreview);
        }

        // ---------- gestes : glisser, pincer, double-tap ----------
        const pts = new Map();
        let pinch0 = null, lastTap = 0;
        cv.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
          pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pts.size === 2) {
            const [a, b] = [...pts.values()];
            pinch0 = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: zoom };
          } else {
            const now = performance.now();
            if (now - lastTap < 300) { zoom = zoom > 1.5 ? 1 : 2; clampView(); queueCompose(); }
            lastTap = now;
          }
        });
        cv.addEventListener('pointermove', (e) => {
          const p = pts.get(e.pointerId);
          if (!p || !shot) return;
          const dx = e.clientX - p.x, dy = e.clientY - p.y;
          p.x = e.clientX; p.y = e.clientY;
          if (pts.size >= 2 && pinch0) {
            const [a, b] = [...pts.values()];
            zoom = pinch0.z * (Math.hypot(a.x - b.x, a.y - b.y) / pinch0.d);
          } else {
            const rect = cv.getBoundingClientRect();
            const c = cropRect();
            cx -= (dx / rect.width) * (c.w / shot.width);
            cy -= (dy / rect.height) * (c.h / shot.height);
          }
          clampView();
          queueCompose();
        });
        const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch0 = null; };
        cv.addEventListener('pointerup', up);
        cv.addEventListener('pointercancel', up);
        cv.addEventListener('wheel', (e) => { e.preventDefault(); zoom *= e.deltaY < 0 ? 1.1 : 0.9; clampView(); queueCompose(); }, { passive: false });

        // ---------- entrée / sortie ----------
        function canEnter() {
          return (state === 'playing' || state === 'paused') && player && !shot && !grabReq;
        }
        function enter() {
          if (!canEnter()) return false;
          from = state;
          const ph = PH();
          const a = ph && ph.active();
          phenId = a ? a.id : null;
          if (from === 'paused') {
            hide(pauseOverlay);
            document.body.classList.remove('paused');
          }
          state = 'photo';
          activePointer = null;
          for (const k in keys) keys[k] = false;
          document.body.classList.add('photo-mode');
          dlNs();
          grabReq = true; // prélevé à la prochaine frame, après le pipeline GPU
          AudioSys.ui();
          return true;
        }
        function afterGrab() {
          filt = 'nebuleuse'; fmt = 'plein'; card = true;
          zoom = 1; cx = 0.5; cy = 0.5;
          chips();
          resEl.classList.add('hidden');
          ov.classList.remove('hidden');
          queueCompose();
        }
        function leave() {
          if (state !== 'photo') return;
          ov.classList.add('hidden');
          resEl.classList.add('hidden');
          document.body.classList.remove('photo-mode');
          shot = null;
          grabReq = false;
          if (lastUrl) { URL.revokeObjectURL(lastUrl); lastUrl = null; }
          lastBlob = null;
          state = 'paused';
          if (from === 'playing') {
            document.body.classList.add('paused');
            resumeGame(); // compte à rebours habituel : on ne reprend jamais à froid
          } else {
            document.body.classList.add('paused');
            show(pauseOverlay);
          }
          AudioSys.ui();
        }

        // ---------- C. tirage ----------
        function exportSize() {
          const c = cropRect();
          let w = c.w, h = c.h;
          const short = Math.min(w, h), long = Math.max(w, h);
          let k = 1;
          if (short < 1080) k = 1080 / short;
          if (long * k > 2400) k = 2400 / long;
          return { w: Math.round(w * k), h: Math.round(h * k) };
        }
        function thumb() {
          const t = document.createElement('canvas');
          t.width = 240; t.height = 160;
          const g = t.getContext('2d');
          // recadrage « cover » du tirage courant, sans cartouche
          const keep = card;
          card = false;
          const tmp = document.createElement('canvas');
          const s = exportSize();
          const k = 320 / Math.max(s.w, s.h);
          tmp.width = Math.max(1, Math.round(s.w * k)); tmp.height = Math.max(1, Math.round(s.h * k));
          compose(tmp, tmp.width, tmp.height);
          card = keep;
          const r = Math.max(240 / tmp.width, 160 / tmp.height);
          g.drawImage(tmp, (240 - tmp.width * r) / 2, (160 - tmp.height * r) / 2, tmp.width * r, tmp.height * r);
          return t.toDataURL('image/jpeg', 0.62);
        }
        function shutter() {
          if (!AudioSys.ctx || AudioSys.muted || !AudioSys.tone) return;
          const t = AudioSys.ctx.currentTime;
          AudioSys.tone({ freq: 2400, dur: 0.03, type: 'square', gain: 0.03, when: t, attack: 0.001, release: 0.03 });
          AudioSys.tone({ freq: 1200, dur: 0.05, type: 'triangle', gain: 0.04, when: t + 0.07, attack: 0.001, release: 0.06 });
        }
        function capture() {
          if (!shot) return null;
          const s = exportSize();
          const out = document.createElement('canvas');
          out.width = s.w; out.height = s.h;
          compose(out, s.w, s.h);
          const f = ov.querySelector('#photoFlash');
          f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
          shutter();
          vibrate(18);
          const d = new Date();
          const slug = (phenId || 'nebuleuse').normalize('NFD').replace(/[^\w]+/g, '-');
          lastName = `np4-${slug}-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}.jpg`;
          // carnet : vignette + bonus au premier cliché de ce phénomène
          let msg = 'Tirage prêt.';
          meta.photos = (meta.photos || 0) + 1;
          if (phenId) {
            const m = (meta.phen = meta.phen || {});
            const e = m[phenId] = m[phenId] || { n: 1, first: d.toISOString().slice(0, 10) };
            const firstShot = !e.photo;
            e.photo = thumb();
            e.shots = (e.shots || 0) + 1;
            if (firstShot) {
              meta.nanites = (meta.nanites || 0) + FIRST_SHOT_NANO;
              msg = `Premier cliché de ce phénomène : +${FIRST_SHOT_NANO} ⬡ · rangé dans le Carnet.`;
            } else msg = 'Vignette du Carnet mise à jour.';
          }
          saveMeta();
          ov.querySelector('#photoResultTxt').textContent = msg;
          const img = ov.querySelector('#photoImg');
          img.src = out.toDataURL('image/jpeg', 0.9);
          out.toBlob((b) => {
            lastBlob = b;
            if (lastUrl) URL.revokeObjectURL(lastUrl);
            lastUrl = b ? URL.createObjectURL(b) : null;
            if (lastUrl) img.src = lastUrl;
          }, 'image/jpeg', 0.92);
          resEl.classList.remove('hidden');
          return { w: s.w, h: s.h };
        }
        async function share() {
          AudioSys.ui();
          if (!lastBlob) { // encodage JPEG pas encore terminé : repli synchrone sur l'aperçu
            const src = ov.querySelector('#photoImg').src || '';
            if (!src.startsWith('data:')) return;
            const bin = atob(src.split(',')[1]);
            const u8 = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
            lastBlob = new Blob([u8], { type: 'image/jpeg' });
            lastUrl = URL.createObjectURL(lastBlob);
          }
          const txt = ov.querySelector('#photoResultTxt');
          // page hébergée dans la visionneuse claude.ai : enregistrement via la capacité « downloads »
          // (feuille de partage native dans l'app iOS) — ailleurs (PWA, navigateur) : Web Share, puis lien
          const dl = await dlNs();
          if (dl) {
            try {
              await dl.save({ filename: lastName, data: lastBlob });
              txt.textContent = 'Image enregistrée.';
              return;
            } catch (err) {
              const c = err && err.code;
              if (c === 'declined') { txt.textContent = 'Enregistrement annulé.'; return; }
              if (c === 'rate_limited') { txt.textContent = 'Une demande est déjà ouverte.'; return; }
              // indisponible : on retombe sur le partage du navigateur
            }
          }
          const file = typeof File === 'function' ? new File([lastBlob], lastName, { type: 'image/jpeg' }) : null;
          try {
            if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({ files: [file], title: 'Nébuleuse Protocol IV' });
              return;
            }
          } catch (err) {
            if (err && err.name === 'AbortError') return; // feuille fermée par le joueur
          }
          const a = document.createElement('a');
          a.href = lastUrl;
          a.download = lastName;
          document.body.appendChild(a);
          a.click();
          a.remove();
          txt.textContent = 'Image enregistrée dans les téléchargements.';
        }

        ov.querySelector('#photoBack').addEventListener('click', leave);
        ov.querySelector('#photoDone').addEventListener('click', leave);
        ov.querySelector('#photoShoot').addEventListener('click', () => capture());
        ov.querySelector('#photoReset').addEventListener('click', () => { zoom = 1; cx = 0.5; cy = 0.5; AudioSys.ui(); queueCompose(); });
        ov.querySelector('#photoAgain').addEventListener('click', () => { AudioSys.ui(); resEl.classList.add('hidden'); });
        ov.querySelector('#photoShare').addEventListener('click', share);
        btn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); enter(); });
        window.addEventListener('keydown', (e) => {
          if (e.code === 'KeyO' && (state === 'playing' || state === 'paused')) enter();
          else if (e.code === 'Escape' && state === 'photo') leave();
        });
        window.addEventListener('resize', () => { if (state === 'photo') queueCompose(); });

        // bouton dans la pause
        const pc = document.querySelector('#pauseOverlay .btn-row');
        if (pc) {
          const pb = document.createElement('button');
          pb.id = 'photoPauseBtn';
          pb.className = 'btn secondary';
          pb.textContent = '📷 Mode photo';
          pb.addEventListener('click', enter);
          pc.insertBefore(pb, pc.children[1] || null);
        }

        // ---------- branchements moteur ----------
        // installé après le pipeline v5.14 : la sortie GPU est encore lisible dans cette frame
        const baseDraw17 = draw;
        draw = function () {
          baseDraw17();
          if (!grabReq) return;
          grabReq = false;
          const fx = fxEl();
          const gpu = fx && fx.style.display !== 'none' && window.__NP4 && window.__NP4.fx && window.__NP4.fx.tier() > 0;
          const src = gpu ? fx : canvas;
          shot = document.createElement('canvas');
          shot.width = src.width; shot.height = src.height;
          shot.getContext('2d').drawImage(src, 0, 0);
          afterGrab();
        };

        // les textes flottants du combat (« NOVA LANCÉE », « +500 »…) ne polluent pas la photo
        const baseTexts17 = drawTexts;
        drawTexts = function () {
          if (state === 'photo') return;
          baseTexts17();
        };

        const baseUpdate17 = update;
        update = function (dt) {
          baseUpdate17(dt);
          if (typeof waveBanner === 'string' && /^(SECTEUR|ACTE)/.test(waveBanner)) {
            place = waveBanner.replace(/\s+—\s+/, ' · ');
            place = place.charAt(0) + place.slice(1).toLowerCase().replace(/\b(i{1,3}|iv|v|vi{0,3}|ix|x{1,2}v?i{0,3})\b/g, (r) => r.toUpperCase());
          }
          const ph = PH();
          const show = state === 'playing' && !!(ph && ph.active());
          if (show !== btn.classList.contains('on')) btn.classList.toggle('on', show);
        };

        const baseStart17 = startGame;
        startGame = function (m, c) {
          place = '';
          baseStart17(m, c);
        };

        // ---------- pont debug / tests ----------
        if (window.__NP4) {
          window.__NP4.photo = {
            enter: () => enter(),
            leave: () => leave(),
            ready: () => !!shot && !ov.classList.contains('hidden'),
            gpu: () => !!(shot && fxEl() && window.__NP4.fx && window.__NP4.fx.tier() > 0),
            shot: () => (shot ? { w: shot.width, h: shot.height } : null),
            set: (o) => {
              if (o.filter && FILTERS[o.filter]) filt = o.filter;
              if (o.format && FORMATS[o.format]) fmt = o.format;
              if (o.card != null) card = !!o.card;
              if (o.zoom != null) zoom = o.zoom;
              if (o.cx != null) cx = o.cx;
              if (o.cy != null) cy = o.cy;
              clampView();
              chips();
              renderPreview();
              return { filt, fmt, card, zoom, cx, cy };
            },
            crop: () => (shot ? cropRect() : null),
            capture: () => capture(),
            blob: () => (lastBlob ? { size: lastBlob.size, type: lastBlob.type, name: lastName } : null),
            phen: () => phenId,
            place: () => place,
            filters: Object.keys(FILTERS),
            formats: Object.keys(FORMATS),
            // pixel moyen de l'aperçu (vérifie qu'un filtre change réellement l'image)
            mean: () => {
              const d = cctx.getImageData(0, 0, cv.width, cv.height).data;
              let r = 0, g = 0, b = 0, n = 0;
              for (let i = 0; i < d.length; i += 64) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
              return [r / n, g / n, b / n].map(Math.round);
            },
            btnVisible: () => btn.classList.contains('on')
          };
        }
      })();
