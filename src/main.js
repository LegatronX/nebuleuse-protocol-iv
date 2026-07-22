// ============================================================
// Nébuleuse Protocol IV
// © 2026 Christian ROLANDO — Tous droits réservés.
// Voir le fichier LICENSE à la racine du dépôt.
// ============================================================

import { Canvas2DRenderer } from './render/Canvas2DRenderer.js';
import { PixiRenderer } from './render/PixiRenderer.js';
import { gfxFlags } from './render/gfx.js';
import { world, initStars, startGame, update, resetGame } from './game/engine.js';
import { clamp } from './util/math.js';

/* ------------------------------------------------------------------
 * 0. Choix du profil GFX et du renderer — le contrat pour seule boussole
 * ------------------------------------------------------------------ */
const params = new URLSearchParams(location.search);
const lowQuality = params.get('quality') === 'low';
const gfxLevel = parseInt(params.get('gfx') || '5', 10);
const gfx = gfxFlags(gfxLevel);

const engineChoice = params.get('renderer') || gfx.engine;

let renderer, rendererName;
if (engineChoice === 'pixi') {
  renderer = new PixiRenderer({ lowQuality });
  rendererName = 'PixiJS (WebGL)';
} else {
  renderer = new Canvas2DRenderer({ lowQuality });
  rendererName = 'Canvas 2D (référence)';
}

/* ------------------------------------------------------------------
 * 1. Initialisation de l'application & Contrat
 * ------------------------------------------------------------------ */
world.gfx = gfx;
renderer.bindWorld(world);
renderer.setGfx(gfx);

const host = document.getElementById('game-host') || document.body;
renderer.mount(host);

function onResize() {
  world.W = window.innerWidth;
  world.H = window.innerHeight;
  renderer.resize(world.W, world.H);
}
window.addEventListener('resize', onResize);
onResize();

// Démarrer le jeu réel
startGame('campagne');

/* ------------------------------------------------------------------
 * 2. HUD DOM Minimal Temporaire (STUB M4.2)
 * ------------------------------------------------------------------ */
let hudEl = document.getElementById('hud');
if (!hudEl) {
  hudEl = document.createElement('div');
  hudEl.id = 'hud';
  hudEl.style.position = 'fixed';
  hudEl.style.top = '12px';
  hudEl.style.left = '12px';
  hudEl.style.color = '#38bdf8';
  hudEl.style.fontFamily = 'monospace';
  hudEl.style.fontSize = '14px';
  hudEl.style.pointerEvents = 'none';
  hudEl.style.zIndex = '1000';
  document.body.appendChild(hudEl);
}

function updateMinimalHUD() {
  const p = world.player;
  const hullStr = p ? `${Math.ceil(p.hull)}/${p.maxHull}` : '--';
  const nanites = (world.meta && world.meta.nanites) || 0;
  hudEl.innerHTML = `Vague: ${world.wave} | Score: ${world.score} | Coque: ${hullStr} | Nanites: ${nanites}⬡ | GFX: ${gfx.level}·${gfx.name}`;
}

/* ------------------------------------------------------------------
 * 3. Contrôles (Pointeur / Clavier)
 * ------------------------------------------------------------------ */
let isPointerDown = false;
let lastPX = world.W / 2;
let lastPY = world.H * 0.78;

window.addEventListener('pointerdown', (e) => {
  isPointerDown = true;
  lastPX = e.clientX;
  lastPY = e.clientY;
});

window.addEventListener('pointermove', (e) => {
  if (!isPointerDown || !world.player || !world.player.alive) return;
  const dx = (e.clientX - lastPX) * 1.35;
  const dy = (e.clientY - lastPY) * 1.35;
  lastPX = e.clientX;
  lastPY = e.clientY;

  world.player.x = clamp(world.player.x + dx, 20, world.W - 20);
  world.player.y = clamp(world.player.y + dy, 70, world.H - 40);
  world.player.tilt = clamp(dx * 0.08, -1, 1);
});

window.addEventListener('pointerup', () => { isPointerDown = false; });
window.addEventListener('pointercancel', () => { isPointerDown = false; });

window.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') {
    resetGame();
  }
});

/* ------------------------------------------------------------------
 * 4. Boucle principale rAF
 * ------------------------------------------------------------------ */
let lastT = performance.now();

function frame(t) {
  const dt = Math.min((t - lastT) / 1000, 0.1);
  lastT = t;

  update(dt);
  updateMinimalHUD();
  renderer.renderFrame(dt);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);