// ============================================================
// Nébuleuse Protocol IV
// © 2026 Christian ROLANDO — Tous droits réservés.
// Voir le fichier LICENSE à la racine du dépôt.
// ============================================================
// ============================================================
// Extrait du moteur de rendu — nebuleuse-v4.7.html (spécifique v4.7)
// Catalogue exhaustif des ajouts de rendu v4.7 pour IRenderer, Canvas2DRenderer & PixiRenderer
// Note : ceci est un EXTRAIT — pour référence et portage.
// ============================================================

function _extractedV47RenderScope() {

// --- Variables d'état & Constantes du rendu v4.7 ---
let hitStopTimer = 0;
let camPunchMag = 0;
let camPunchTime = 0;
let camPunchDuration = 0.001;

let planets = [];
let planetTimer = 10;

const TRAILS = [
  { id: 'default', name: 'Standard', color: '#38bdf8', cost: 0 },
  { id: 'cyan', name: 'Plasma Cyan', color: '#06b6d4', cost: 150 },
  { id: 'magenta', name: 'Néon Rose', color: '#ec4899', cost: 250 },
  { id: 'gold', name: 'Or Stellaire', color: '#f59e0b', cost: 400 },
  { id: 'emerald', name: 'Émeraude', color: '#10b981', cost: 350 },
  { id: 'void', name: 'Ombre du Vide', color: '#8b5cf6', cost: 500 }
];

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


// --- 1. FONCTIONS DE PLANÈTES & NÉBULEUSES (v4.3+) ---
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

// --- 2. FONDS DE SECTEURS (v4.6+) ---
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

// --- 3. RENDU DES ENNEMIS ÉTENDUS (Sentinelle & Essaim v4.6+) ---
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

// --- 4. TRAÎNÉES DE VAISSEAU (v4.7+) ---
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

        function renderTrails() {
          trailGrid.innerHTML = TRAILS.map((t) => {
            const owned = meta.unlockedTrails.includes(t.id);
            const selected = meta.trail === t.id;
            return `
              <div class="trail-swatch ${selected ? 'selected' : ''} ${owned ? '' : 'locked'}"
                   style="background:${t.color}" data-trail="${t.id}" title="${t.name}${owned ? '' : ` · ${t.cost}⬡`}">
                ${owned ? '' : '🔒'}
              </div>
            `;
          }).join('');

          trailGrid.querySelectorAll('.trail-swatch').forEach((el) => {
            el.addEventListener('click', () => {
              const id = el.dataset.trail;
              const def = TRAILS.find((t) => t.id === id);
              if (!def) return;

              if (meta.unlockedTrails.includes(id)) {
                meta.trail = id;
                saveMeta();
                renderTrails();
                AudioSys.ui();
              } else if (meta.nanites >= def.cost) {
                meta.nanites -= def.cost;
                meta.unlockedTrails.push(id);
                meta.trail = id;
                saveMeta();
                renderTrails();
                renderLab();
                AudioSys.power();
                toast(`Traînée débloquée : ${def.name}`, 'nano');
              } else {
                toast('Nanites insuffisants', '');
              }
            });
          });
        }


// --- 5. WRAPPER CAMERA PUNCH (v4.5+) ---
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

// --- 6. FONCTION DRAW DE RÉFÉRENCE (Ordre exact des calques v4.7) ---
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
  drawStars();         // v43DrawStars : drawNebulae() -> drawPlanets() -> baseDrawStars()
  drawPowerups();
  drawEnemies();       // extendedDrawEnemies : baseDrawEnemies() + Sentinelle & Essaim
  drawBeams();
  drawPlayer();
  drawBullets();
  drawParticles();
  drawShockwaves();    // v43DrawShockwaves : ondes chromatiques
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

}
