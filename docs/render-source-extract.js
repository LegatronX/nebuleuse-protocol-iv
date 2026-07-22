// ============================================================
// Nébuleuse Protocol IV
// © 2026 Christian ROLANDO — Tous droits réservés.
// Voir le fichier LICENSE à la racine du dépôt.
// ============================================================
// ============================================================
// Extrait du moteur de rendu — nebuleuse-v4.6.html (base non patchée)
// Pour Dolphin : catalogue exhaustif des appels de dessin Canvas 2D
// Note : ceci est un EXTRAIT (fonctions déplacées hors de leur IIFE
// d'origine) — non exécutable tel quel, uniquement pour lecture.
// ============================================================

// --- Setup canvas / contexte ---
      const canvas = $('game');
      const ctx = canvas.getContext('2d', { alpha: false });
      const bg = document.createElement('canvas');
      const bctx = bg.getContext('2d');

// --- hexToRgba ---
      function hexToRgba(hex, a) {
        const n = parseInt(hex.slice(1), 16);
        const r = (n >> 16) & 255;
        const g = (n >> 8) & 255;
        const b = n & 255;
        return `rgba(${r},${g},${b},${a})`;
      }

// --- makeBackground / initStars / resize ---
      function makeBackground() {
        bg.width = Math.floor(W * DPR);
        bg.height = Math.floor(H * DPR);
        bctx.setTransform(DPR, 0, 0, DPR, 0, 0);

        const g = bctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#030711');
        g.addColorStop(0.45, '#060b1c');
        g.addColorStop(1, '#0a0618');
        bctx.fillStyle = g;
        bctx.fillRect(0, 0, W, H);

        const colors = [
          'rgba(56, 189, 248, 0.10)',
          'rgba(129, 140, 248, 0.12)',
          'rgba(217, 70, 239, 0.08)',
          'rgba(16, 185, 129, 0.06)'
        ];

        for (let i = 0; i < 9; i++) {
          const x = rand(0, W);
          const y = rand(0, H);
          const r = rand(Math.min(W, H) * 0.18, Math.min(W, H) * 0.55);
          const rg = bctx.createRadialGradient(x, y, 0, x, y, r);
          rg.addColorStop(0, pick(colors));
          rg.addColorStop(1, 'rgba(0, 0, 0, 0)');

          bctx.fillStyle = rg;
          bctx.beginPath();
          bctx.arc(x, y, r, 0, TAU);
          bctx.fill();
        }
      }

      function initStars() {
        stars = [];

        const areaFactor = clamp(
          (W * H) / (390 * 844),
          0.75,
          1.8
        );

        const baseCount = lowQuality ? 90 : 170;
        const count = Math.round(baseCount * areaFactor);

        for (let i = 0; i < count; i++) {
          const z = Math.random();

          stars.push({
            x: Math.random() * W,
            y: Math.random() * H,
            z,
            r: z * 1.7 + 0.3,
            s: 25 + z * 130,
            tw: rand(0, TAU)
          });
        }
      }

      function resize() {
        W = window.innerWidth;
        H = window.innerHeight;
        DPR = Math.min(
          window.devicePixelRatio || 1,
          lowQuality ? 1.5 : 2.5
        );

        canvas.width = Math.floor(W * DPR);
        canvas.height = Math.floor(H * DPR);
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

        makeBackground();

        initStars();

        if (player) {
          player.x = clamp(player.x, 20, W - 20);
          player.y = clamp(player.y, 70, H - 40);
        }
      }


// --- enemyColor ---
      function enemyColor(type) {
        return (
          {
            drone: '#f87171',
            zig: '#fbbf24',
            speeder: '#f472b6',
            tank: '#c084fc',
            splitter: '#34d399',
            turret: '#94a3b8',
            elite: '#fb7185',
            mini: '#f87171',
            miniboss: '#fbbf24',
            boss: '#f43f5e'
          }[type] || '#ffffff'
        );
      }

// --- update(dt) [orchestration] + updateBackground(dt) ---
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


// --- draw() et toutes les fonctions de dessin ---
      function draw() {
        ctx.drawImage(bg, 0, 0, W, H);

        ctx.save();

        if (shake > 0) {
          const m = shake * 9;
          ctx.translate(rand(-m, m), rand(-m, m));
        }

        drawStars();
        drawPowerups();
        drawEnemies();
        drawBeams();
        drawPlayer();
        drawBullets();
        drawParticles();
        drawShockwaves();
        drawTexts();

        ctx.restore();

        if (hitFlash > 0) {
          ctx.fillStyle = `rgba(255, 80, 120, ${hitFlash * 0.4})`;
          ctx.fillRect(0, 0, W, H);
        }

        if (slowTime > 0) {
          ctx.fillStyle = 'rgba(80, 160, 255, 0.06)';
          ctx.fillRect(0, 0, W, H);
        }

        if (waveBannerTime > 0 && state === 'playing') {
          drawBanner();
        }
      }

      function drawStars() {
        for (const s of stars) {
          const a = 0.25 + s.z * 0.65 + Math.sin(globalTime * 2 + s.tw) * 0.12;
          ctx.fillStyle = `rgba(220, 245, 255, ${clamp(a, 0, 1)})`;
          ctx.fillRect(s.x, s.y, s.r, s.r);
        }
      }

      function powerColor(type) {
        return (
          {
            W: '#67e8f9',
            S: '#60a5fa',
            H: '#34d399',
            B: '#fb7185',
            M: '#fbbf24',
            Z: '#c084fc'
          }[type] || '#ffffff'
        );
      }

      function drawPowerups() {
        for (const p of powerups) {
          const c = powerColor(p.type);
          const pulse = Math.sin(p.t * 6) * 2;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.t * 1.5);

          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = c;
          ctx.globalAlpha = 0.18;
          ctx.beginPath();
          ctx.arc(0, 0, p.r + 10 + pulse, 0, TAU);
          ctx.fill();

          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';

          const r = p.r + pulse * 0.3;

          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * TAU;
            const px = Math.cos(a) * r;
            const py = Math.sin(a) * r;
            if (i) ctx.lineTo(px, py);
            else ctx.moveTo(px, py);
          }
          ctx.closePath();

          ctx.fillStyle = 'rgba(3, 10, 20, 0.78)';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = c;
          ctx.stroke();

          ctx.rotate(-p.t * 1.5);

          ctx.fillStyle = '#ffffff';
          ctx.font = '900 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.type, 0, 1);

          ctx.restore();
        }
      }

      function drawEnemies() {
        for (const e of enemies) {
          if (e.type === 'boss') {
            drawBoss(e);
            continue;
          }

          const c = enemyColor(e.type);

          ctx.save();
          ctx.translate(e.x, e.y);

          switch (e.type) {
            case 'drone':
              ctx.rotate(Math.PI);
              drawTriangle(14, c);
              break;
            case 'zig':
              ctx.rotate(e.t * 2);
              drawDiamond(13, c);
              break;
            case 'speeder':
              ctx.rotate(Math.PI);
              drawArrow(12, c);
              break;
            case 'tank':
              ctx.rotate(e.t * 0.4);
              drawHexagon(22, c);
              break;
            case 'splitter':
              ctx.rotate(e.t * 1.2);
              drawSplitter(18, c);
              break;
            case 'turret':
              drawTurret(16, c, e);
              break;
            case 'elite':
              ctx.rotate(e.t * 1.5);
              drawStar(17, c);
              break;
            case 'mini':
              ctx.rotate(Math.PI);
              drawTriangle(8, c);
              break;
            case 'miniboss':
              ctx.rotate(e.t * 0.8);
              drawStar(30, c);
              ctx.rotate(-e.t * 0.8);
              drawHexagon(16, '#fff7ed');
              break;
          }

          ctx.restore();

          if (e.elite) {
            ctx.save();
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.r + 5, 0, TAU);
            ctx.stroke();
            ctx.restore();
          }

          if (e.hp < e.maxHp) {
            const w = e.r * 2;
            const ratio = clamp(e.hp / e.maxHp, 0, 1);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.fillRect(e.x - e.r, e.y - e.r - 10, w, 3);

            ctx.fillStyle = e.type === 'miniboss' ? '#fbbf24' : '#f87171';
            ctx.fillRect(e.x - e.r, e.y - e.r - 10, w * ratio, 3);
          }
        }
      }

      function drawBoss(e) {
        ctx.save();
        ctx.translate(e.x, e.y);

        const sc = e.r / 54;
        ctx.scale(sc, sc);

        const ratio = clamp(e.hp / e.maxHp, 0, 1);

        ctx.globalCompositeOperation = 'lighter';

        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 90);
        g.addColorStop(0, hexToRgba(e.color, 0.3 + 0.2 * Math.sin(globalTime * 4)));
        g.addColorStop(1, hexToRgba(e.color, 0));

        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, 90, 0, TAU);
        ctx.fill();

        ctx.globalCompositeOperation = 'source-over';

        ctx.rotate(Math.sin(e.spin * 0.7) * 0.06);

        ctx.beginPath();
        ctx.moveTo(0, -52);
        ctx.lineTo(58, -8);
        ctx.lineTo(74, 34);
        ctx.lineTo(24, 22);
        ctx.lineTo(0, 52);
        ctx.lineTo(-24, 22);
        ctx.lineTo(-74, 34);
        ctx.lineTo(-58, -8);
        ctx.closePath();

        ctx.fillStyle = '#111827';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = e.color;
        ctx.stroke();

        for (let i = 0; i < 4; i++) {
          ctx.save();
          ctx.rotate(e.spin + (i * TAU) / 4);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.fillRect(30, -6, 26, 12);

          ctx.strokeStyle = hexToRgba(e.color, 0.55);
          ctx.strokeRect(30, -6, 26, 12);

          ctx.restore();
        }

        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, TAU);
        ctx.fillStyle = ratio > 0.5 ? hexToRgba(e.color, 0.85) : e.color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.stroke();

        ctx.restore();
      }

      function drawBeams() {
        for (const b of beams) {
          const active = b.life <= b.active;
          const x = b.x - b.width / 2;

          ctx.save();

          if (active) {
            ctx.globalCompositeOperation = 'lighter';

            const g = ctx.createLinearGradient(0, b.y, 0, H);
            g.addColorStop(0, hexToRgba(b.color, 0.95));
            g.addColorStop(0.2, hexToRgba(b.color, 0.72));
            g.addColorStop(1, hexToRgba(b.color, 0.05));

            ctx.fillStyle = g;
            ctx.fillRect(x, b.y, b.width, H - b.y);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(b.x - 3, b.y, 6, H - b.y);
          } else {
            const t = (b.life - b.active) / (b.total - b.active);
            ctx.fillStyle = hexToRgba(b.color, 0.08 + 0.14 * (1 - t));
            ctx.fillRect(x, b.y, b.width, H - b.y);
          }

          ctx.restore();
        }
      }

      function drawPlayer() {
        if (!player || !player.alive) return;

        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.tilt * 0.4);

        if (player.invuln > 0 && Math.floor(globalTime * 12) % 2 === 0) {
          ctx.globalAlpha = 0.35;
        }

        ctx.globalCompositeOperation = 'lighter';

        const eg = ctx.createRadialGradient(0, 18, 0, 0, 18, 26);
        eg.addColorStop(0, 'rgba(80, 200, 255, 0.8)');
        eg.addColorStop(1, 'rgba(80, 200, 255, 0)');

        ctx.fillStyle = eg;
        ctx.beginPath();
        ctx.arc(0, 18, 26, 0, TAU);
        ctx.fill();

        ctx.globalCompositeOperation = 'source-over';

        const c1 = player.colors ? player.colors[0] : '#dffcff';
        const c2 = player.colors ? player.colors[1] : '#2b7fff';

        const body = ctx.createLinearGradient(0, -22, 0, 18);
        body.addColorStop(0, c1);
        body.addColorStop(1, c2);

        ctx.beginPath();
        ctx.moveTo(0, -22);
        ctx.lineTo(14, 12);
        ctx.lineTo(6, 18);
        ctx.lineTo(-6, 18);
        ctx.lineTo(-14, 12);
        ctx.closePath();

        ctx.fillStyle = body;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(0, -4, 4, 7, 0, 0, TAU);
        ctx.fillStyle = 'rgba(8, 47, 73, 0.9)';
        ctx.fill();

        if (player.shield > 0) {
          ctx.beginPath();
          ctx.arc(0, 0, 26, 0, TAU);
          ctx.strokeStyle = `rgba(96, 165, 250, ${0.15 + (player.shield / player.maxShield) * 0.45})`;
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        ctx.restore();
      }

      function drawBullets() {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (const b of pBullets) {
          ctx.fillStyle = b.homing ? 'rgba(251, 191, 36, 0.3)' : 'rgba(103, 232, 249, 0.28)';
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r * 2.2, 0, TAU);
          ctx.fill();

          ctx.fillStyle = b.homing ? '#fde68a' : '#e8feff';
          ctx.beginPath();
          ctx.ellipse(b.x, b.y, b.r * 0.75, b.r * 1.8, 0, 0, TAU);
          ctx.fill();
        }

        for (const b of eBullets) {
          ctx.globalAlpha = 0.28;
          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r * 2.1, 0, TAU);
          ctx.fill();

          ctx.globalAlpha = 1;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r * 0.82, 0, TAU);
          ctx.fill();
        }

        ctx.restore();
      }

      function drawParticles() {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (const p of particles) {
          ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, TAU);
          ctx.fill();
        }

        ctx.restore();
      }

      function drawShockwaves() {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (const s of shockwaves) {
          const a = s.life / s.maxLife;

          ctx.strokeStyle = `rgba(255, 255, 255, ${a * 0.7})`;
          ctx.lineWidth = 8 * a + 2;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, TAU);
          ctx.stroke();

          ctx.strokeStyle = `rgba(103, 232, 249, ${a * 0.4})`;
          ctx.lineWidth = 16 * a + 4;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 0.92, 0, TAU);
          ctx.stroke();
        }

        ctx.restore();
      }

      function drawTexts() {
        ctx.save();

        ctx.font = '700 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (const t of texts) {
          ctx.globalAlpha = clamp(t.life / t.maxLife, 0, 1);
          ctx.fillStyle = t.color;
          ctx.fillText(t.str, t.x, t.y);
        }

        ctx.restore();
      }

      function drawBanner() {
        const total = 2.3;
        const t = waveBannerTime;

        let a = 1;
        if (t > total - 0.4) a = (total - t) / 0.4;
        else if (t < 0.6) a = t / 0.6;

        a = clamp(a, 0, 1);

        ctx.save();

        ctx.globalAlpha = a;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const size = clamp(W * 0.09, 30, 64);
        ctx.font = `900 ${size}px sans-serif`;

        const g = ctx.createLinearGradient(W / 2 - 160, 0, W / 2 + 160, 0);
        g.addColorStop(0, '#a5f3fc');
        g.addColorStop(0.5, '#818cf8');
        g.addColorStop(1, '#f0abfc');

        ctx.fillStyle = g;
        ctx.fillText(waveBanner, W / 2, H * 0.3);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1;
        ctx.strokeText(waveBanner, W / 2, H * 0.3);

        ctx.restore();
      }

      function fillStroke(color, alpha = 0.92) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.stroke();
      }

      function drawTriangle(size, color) {
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.82, size * 0.72);
        ctx.lineTo(-size * 0.82, size * 0.72);
        ctx.closePath();
        fillStroke(color);
      }

      function drawDiamond(size, color) {
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.72, 0);
        ctx.lineTo(0, size);
        ctx.lineTo(-size * 0.72, 0);
        ctx.closePath();
        fillStroke(color);
      }

      function drawArrow(size, color) {
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.7, size * 0.5);
        ctx.lineTo(0, size * 0.18);
        ctx.lineTo(-size * 0.7, size * 0.5);
        ctx.closePath();
        fillStroke(color);
      }

      function drawHexagon(size, color) {
        ctx.beginPath();

        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + Math.PI / 6;
          const px = Math.cos(a) * size;
          const py = Math.sin(a) * size;

          if (i) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
        }

        ctx.closePath();
        fillStroke(color);
      }

      function drawStar(size, color) {
        ctx.beginPath();

        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? size * 0.45 : size;
          const a = (i / 10) * TAU - Math.PI / 2;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;

          if (i) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
        }

        ctx.closePath();
        fillStroke(color);
      }

      function drawSplitter(size, color) {
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, TAU);
        fillStroke(color, 0.82);

        ctx.beginPath();
        ctx.moveTo(-size * 0.6, 0);
        ctx.lineTo(size * 0.6, 0);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      function drawTurret(size, color, e) {
        const a = player ? Math.atan2(player.y - e.y, player.x - e.x) : Math.PI / 2;

        ctx.save();
        ctx.rotate(a + Math.PI / 2);

        ctx.fillStyle = '#475569';
        ctx.fillRect(-4, -size * 1.2, 8, size * 1.2);

        ctx.restore();

        ctx.beginPath();
        ctx.arc(0, 0, size * 0.8, 0, TAU);
        fillStroke(color);

        ctx.beginPath();
        ctx.arc(0, 0, size * 0.35, 0, TAU);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.fill();
      }

// --- boucle principale (frame) ---
      function frame(t) {
        const dt = Math.min(0.033, ((t - last) / 1000) || 0.016);
        last = t;

        update(dt);
        draw();

        requestAnimationFrame(frame);
      }

      requestAnimationFrame(frame);
