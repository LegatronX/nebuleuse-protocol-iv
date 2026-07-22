// ============================================================
// Nébuleuse Protocol IV
// © 2026 Christian ROLANDO — Tous droits réservés.
// Voir le fichier LICENSE à la racine du dépôt.
// ============================================================

import './ui/ui.css';
import { Canvas2DRenderer } from './render/Canvas2DRenderer.js';
import { PixiRenderer } from './render/PixiRenderer.js';
import { gfxFlags } from './render/gfx.js';
import { world, update, resetGame, keys, pauseGame, resumeGame } from './game/engine.js';
import { ensureDOM, updateHUD } from './ui/overlays.js';
import { doBomb, doSpecial } from './game/combat.js';
import { clamp } from './util/math.js';
import { AudioSys } from './audio/audio.js';

/* ------------------------------------------------------------------
 * 0. Gestes Utilisateur & AudioContext Unlock (Autoplay Policy)
 * ------------------------------------------------------------------ */
const unlockAudio = () => {
  AudioSys.init();
  AudioSys.resume();
};
window.addEventListener('pointerdown', unlockAudio, { passive: true });
window.addEventListener('keydown', unlockAudio, { passive: true });
window.addEventListener('touchstart', unlockAudio, { passive: true });

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

// Initialiser les overlays DOM & le HUD
ensureDOM(world);

/* ------------------------------------------------------------------
 * 2. Contrôles (Pointeur / Clavier / Pavé Fléché / WASD / ZQSD)
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
  if (!world.player || !world.player.alive || world.state !== 'playing') return;
  if (isPointerDown) {
    const sens = (world.meta && world.meta.sensitivity) || 1.35;
    const dx = (e.clientX - lastPX) * sens;
    const dy = (e.clientY - lastPY) * sens;
    lastPX = e.clientX;
    lastPY = e.clientY;

    world.player.x = clamp(world.player.x + dx, 20, world.W - 20);
    world.player.y = clamp(world.player.y + dy, 70, world.H - 40);
    world.player.tilt = clamp(dx * 0.08, -1, 1);
  }
});

window.addEventListener('pointerup', () => { isPointerDown = false; });
window.addEventListener('pointercancel', () => { isPointerDown = false; });

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  keys[e.key] = true;

  if (e.key === 'r' || e.key === 'R') {
    resetGame();
  } else if (e.code === 'Space') {
    e.preventDefault();
    doBomb();
  } else if (e.key === 'Shift' || e.key === 'ShiftLeft' || e.key === 'ShiftRight') {
    doSpecial();
  } else if (e.key === 'Escape' || e.code === 'KeyP') {
    if (world.state === 'playing') pauseGame();
    else if (world.state === 'paused') resumeGame();
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
  keys[e.key] = false;
});

/* ------------------------------------------------------------------
 * 3. Boucle principale rAF
 * ------------------------------------------------------------------ */
let lastT = performance.now();

function frame(t) {
  const dt = Math.min((t - lastT) / 1000, 0.1);
  lastT = t;

  update(dt);
  updateHUD(world);
  renderer.renderFrame(dt);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);