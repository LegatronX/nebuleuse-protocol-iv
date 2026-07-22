// ============================================================
// Nébuleuse Protocol IV
// © 2026 Christian ROLANDO — Tous droits réservés.
// Voir le fichier LICENSE à la racine du dépôt.
// ============================================================
// ============================================================
// NÉBULEUSE PROTOCOL IV — main.js (Mouvement 4.0ter)
// Point d'entrée piloté par le CONTRAT IRenderer & GFX Levels.
//
// Commandes : glisser/pointeur = piloter · Espace = bombe ·
//             Maj (maintenir) = ralenti · R = recommencer
// URL       : ?gfx=1..5   ·   ?renderer=canvas2d|pixi   ·   ?quality=low
// ============================================================

import { Canvas2DRenderer } from './render/Canvas2DRenderer.js';
import { PixiRenderer } from './render/PixiRenderer.js';
import { gfxFlags } from './render/gfx.js';
import { TAU, rand, clamp, pick } from './util/math.js';
import { enemyColor, powerColor } from './game/theme.js';

/* ------------------------------------------------------------------
 * 0. Choix du profil GFX et du renderer — le contrat pour seule boussole
 * ------------------------------------------------------------------ */
const params = new URLSearchParams(location.search);
const lowQuality = params.get('quality') === 'low';
const gfxLevel = parseInt(params.get('gfx') || '5', 10);
const gfx = gfxFlags(gfxLevel);

const engine = params.get('renderer') || gfx.engine;

let renderer, rendererName;
if (engine === 'pixi') {
  renderer = new PixiRenderer({ lowQuality });
  rendererName = 'PixiJS (WebGL)';
} else {
  renderer = new Canvas2DRenderer({ lowQuality });
  rendererName = 'Canvas 2D (référence)';
}

/* ------------------------------------------------------------------
 * 1. Le world — l'état du jeu, unique source de vérité du rendu
 * ------------------------------------------------------------------ */
let W = window.innerWidth;
let H = window.innerHeight;

const world = {
  W, H,
  globalTime: 0,
  state: 'menu',                 // 'playing' | 'gameover'
  shake: 0, hitFlash: 0, slowTime: 0,
  camPunchMag: 0, camPunchTime: 0, camPunchDuration: 0.001,
  wave: 1, waveBanner: '', waveBannerTime: 0,
  stars: [],                     // créé par le renderer (resize → _initStars)
  planets: [],
  player: null,
  enemies: [], pBullets: [], eBullets: [], beams: [],
  powerups: [], particles: [], shockwaves: [], texts: [],
  gfx,
  meta: { trail: 'default' },
};

// Variables de jeu (hors rendu)
let score = 0, wave = 0, multiplier = 1, multTime = 0, weaponLevel = 2;
let waveTimer = 1.2;
const PLAYER_R = 12;
const controlSensitivity = 1.35;   // sera lu depuis les Réglages (Mouvement 4)
const target = { x: W / 2, y: H * 0.78 };
let shiftHeld = false;

/* ------------------------------------------------------------------
 * 2. Définitions (data-driven — préfigure src/data/)
 * ------------------------------------------------------------------ */
const ENEMY_DEFS = {
  drone: { r: 14, hp: 20, speed: 70, score: 100 },
  zig: { r: 13, hp: 25, speed: 85, score: 120 },
  speeder: { r: 12, hp: 15, speed: 165, score: 130 },
  tank: { r: 22, hp: 95, speed: 40, score: 200 },
  splitter: { r: 18, hp: 42, speed: 60, score: 150 },
  turret: { r: 16, hp: 55, speed: 55, score: 180 },
  elite: { r: 17, hp: 150, speed: 65, score: 400 },
  mini: { r: 8, hp: 8, speed: 115, score: 40 },
  miniboss: { r: 30, hp: 650, speed: 45, score: 1500 },
};
const BOSS_HP = 4200, BOSS_SCORE = 10000;
const hpScale = 1;                 // la difficulté modulera ceci (Mouvement 4)

/* ------------------------------------------------------------------
 * 3. Logique de planètes en parallaxe (Démonstration v4.7)
 * ------------------------------------------------------------------ */
let planetTimer = 4;
const PLANET_TYPES = [
  { c1: '#38bdf8', c2: '#1e3a8a', ring: true,  crated: false, aura: 'rgba(56, 189, 248, 0.25)' },
  { c1: '#f43f5e', c2: '#881337', ring: false, crated: true,  aura: 'rgba(244, 63, 94, 0.22)' },
  { c1: '#a855f7', c2: '#4c1d95', ring: true,  crated: false, aura: 'rgba(168, 85, 247, 0.28)' },
  { c1: '#fbbf24', c2: '#78350f', ring: false, crated: true,  aura: 'rgba(251, 191, 36, 0.20)' },
  { c1: '#34d399', c2: '#064e3b', ring: false, crated: false, aura: 'rgba(52, 211, 153, 0.25)' },
];

function spawnPlanet() {
  const type = pick(PLANET_TYPES);
  const r = rand(36, 75);
  world.planets.push({
    x: rand(r + 30, Math.max(r + 31, W - r - 30)),
    y: -r - 50,
    r,
    vy: rand(12, 26),
    type,
    rot: rand(0, TAU),
    craters: [
      { x: rand(-0.4, 0.3), y: rand(-0.4, 0.4), r: rand(0.12, 0.25) },
      { x: rand(-0.3, 0.4), y: rand(-0.3, 0.3), r: rand(0.1, 0.2) },
    ],
  });
}

function updatePlanets(dt) {
  const sf = world.state === 'playing' ? 1 : 0.35;
  if ((planetTimer -= dt * sf) <= 0) {
    spawnPlanet();
    planetTimer = rand(20, 38);
  }
  for (let i = world.planets.length - 1; i >= 0; i--) {
    const p = world.planets[i];
    p.y += p.vy * dt * sf;
    if (p.y - p.r > H + 100) world.planets.splice(i, 1);
  }
}

/* ------------------------------------------------------------------
 * 4. Montage du renderer
 * ------------------------------------------------------------------ */
const host = document.getElementById('game-host') || document.body;
renderer.mount(host);
renderer.bindWorld(world);
renderer.setGfx(gfx);
renderer.resize(W, H);
world.W = W; world.H = H;

/* ------------------------------------------------------------------
 * 5. HUD temporaire (DOM) — sera remplacé par src/ui/ au Mouvement 4
 * ------------------------------------------------------------------ */
const hudStyle = document.createElement('style');
hudStyle.textContent = `
  html, body { margin:0; height:100%; background:#020409; overflow:hidden;
               touch-action:none; overscroll-behavior:none; }
  #game-host { position:fixed; inset:0; }
  #game-host canvas { display:block; }
  #hud-demo { position:fixed; inset:0; pointer-events:none; z-index:10;
              font-family:'Space Grotesk', system-ui, sans-serif; color:#eaf6ff; }
  #hud-demo .hud-top { position:absolute; top:10px; left:14px; right:14px;
              display:flex; justify-content:space-between; align-items:baseline; }
  #hud-demo #hud-score { font-size:26px; font-weight:900; letter-spacing:.04em;
              text-shadow:0 0 12px rgba(103,232,249,.6); }
  #hud-demo #hud-mult { font-size:14px; font-weight:700; color:#fbbf24; margin-left:8px; }
  #hud-demo #hud-wave { font-size:13px; font-weight:700; color:#c084fc; letter-spacing:.12em; }
  #hud-demo .hud-hull { position:absolute; top:48px; left:14px; width:150px; height:8px;
              border-radius:999px; background:rgba(255,255,255,.12); overflow:hidden; }
  #hud-demo .hud-hull i { display:block; height:100%; width:100%; border-radius:999px;
              background:linear-gradient(90deg,#34d399,#67e8f9); transition:width .12s; }
  #hud-demo .hud-bottom { position:absolute; bottom:12px; left:14px; right:14px;
              display:flex; justify-content:space-between; font-size:12px; font-weight:700;
              color:rgba(234,246,255,.7); }
  #hud-demo .hud-help { position:absolute; bottom:34px; left:0; right:0; text-align:center;
              font-size:11px; color:rgba(234,246,255,.4); }
  #hud-demo .hud-msg { position:absolute; top:42%; left:0; right:0; text-align:center;
              font-size:22px; font-weight:900; color:#f0abfc; text-shadow:0 0 18px rgba(192,132,252,.7); }
  #hud-demo .hidden { display:none; }
`;
document.head.appendChild(hudStyle);

const hud = document.createElement('div');
hud.id = 'hud-demo';
hud.innerHTML = `
  <div class="hud-top">
    <div><span id="hud-score">0</span><span id="hud-mult">x1.0</span></div>
    <div id="hud-wave">VAGUE 1</div>
  </div>
  <div class="hud-hull"><i id="hud-hull-bar"></i></div>
  <div class="hud-bottom">
    <span id="hud-bombs">💣 3</span>
    <span id="hud-renderer">${gfx.level} · ${gfx.name} (${rendererName})</span>
  </div>
  <div class="hud-help">Glisser : piloter · Espace : bombe · Maj : ralenti · R : recommencer</div>
  <div id="hud-msg" class="hud-msg hidden"></div>
`;
document.body.appendChild(hud);
const $score = hud.querySelector('#hud-score');
const $mult = hud.querySelector('#hud-mult');
const $wave = hud.querySelector('#hud-wave');
const $hull = hud.querySelector('#hud-hull-bar');
const $bombs = hud.querySelector('#hud-bombs');
const $msg = hud.querySelector('#hud-msg');

function updateHUD() {
  const p = world.player;
  $score.textContent = score;
  $mult.textContent = 'x' + multiplier.toFixed(1);
  $wave.textContent = 'VAGUE ' + Math.max(1, wave);
  $hull.style.width = (p ? (p.hull / p.maxHull) * 100 : 0) + '%';
  $bombs.textContent = '💣 ' + (p ? p.bombs : 0);
  if (world.state === 'gameover') {
    $msg.textContent = 'MISSION TERMINÉE — Score ' + score + ' · R ou clic pour rejouer';
    $msg.classList.remove('hidden');
  } else {
    $msg.classList.add('hidden');
  }
}

/* ------------------------------------------------------------------
 * 6. Entrées (pointeur + clavier)
 * ------------------------------------------------------------------ */
function pointerToTarget(e) {
  const rect = host.getBoundingClientRect();
  target.x = (e.clientX - rect.left) * (W / rect.width);
  const offsetY = e.pointerType === 'touch' ? -70 : 0;   // le vaisseau au-dessus du doigt
  target.y = (e.clientY - rect.top) * (H / rect.height) + offsetY;
}
host.addEventListener('pointermove', pointerToTarget);
host.addEventListener('pointerdown', (e) => {
  if (world.state === 'gameover') { startRun(); return; }
  pointerToTarget(e);
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); doBomb(); }
  else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { shiftHeld = true; }
  else if (e.code === 'KeyR') { startRun(); }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') shiftHeld = false;
});

/* ------------------------------------------------------------------
 * 7. Logique de démonstration (miroir du monolithe)
 * ------------------------------------------------------------------ */
function startRun() {
  score = 0; wave = 0; multiplier = 1; multTime = 0; weaponLevel = 2; waveTimer = 1.2;
  world.state = 'playing';
  world.shake = 0; world.hitFlash = 0; world.slowTime = 0;
  world.camPunchMag = 0; world.camPunchTime = 0;
  world.waveBanner = ''; world.waveBannerTime = 0;
  world.enemies.length = 0; world.pBullets.length = 0; world.eBullets.length = 0;
  world.beams.length = 0; world.powerups.length = 0; world.particles.length = 0;
  world.shockwaves.length = 0; world.texts.length = 0; world.planets.length = 0;
  world.player = {
    x: W / 2, y: H * 0.78, alive: true, tilt: 0, invuln: 1,
    colors: ['#dffcff', '#2b7fff'],
    shield: 50, maxShield: 50, hull: 100, maxHull: 100, bombs: 3,
    r: PLAYER_R, fireCd: 0, novaCd: 1.5,
  };
  target.x = W / 2; target.y = H * 0.78;
}

function pickEnemyType(w) {
  const pool = ['drone', 'drone', 'zig'];
  if (w >= 2) pool.push('speeder');
  if (w >= 3) pool.push('tank', 'splitter', 'sentinel');
  if (w >= 4) pool.push('turret', 'swarmer');
  if (w >= 6) pool.push('elite');
  return pick(pool);
}

function spawnEnemy(type, x, y) {
  const def = ENEMY_DEFS[type] || { r: 16, hp: 30, speed: 80, score: 120 };
  const hp = def.hp * hpScale;
  world.enemies.push({
    x: x ?? rand(40, W - 40),
    y: y ?? rand(-320, -40),
    type, t: rand(0, TAU),
    r: def.r, hp, maxHp: hp,
    elite: type === 'elite',
    color: enemyColor(type),
    spin: 0, speed: def.speed,
    stopY: type === 'turret' ? rand(120, 260)
      : type === 'elite' ? rand(90, 180)
        : type === 'miniboss' ? 140 : 0,
    fireCd: rand(0.8, 2),
  });
}

function spawnBoss() {
  const hp = BOSS_HP * hpScale;
  world.enemies.push({
    x: W / 2, y: -90, type: 'boss', t: 0,
    r: 54, hp, maxHp: hp, elite: false,
    color: enemyColor('boss'), spin: 0, speed: 45,
    stopY: 0, fireCd: 1.5, beamCd: 4,
  });
}

function triggerCamPunch(mag, duration = 0.12) {
  world.camPunchMag = Math.max(world.camPunchMag, mag);
  world.camPunchDuration = duration;
  world.camPunchTime = duration;
}

function nextWave() {
  wave++;
  world.wave = wave;
  renderer.regenerateBackground();

  if (wave % 10 === 0) {
    spawnBoss();
    world.waveBanner = '⚠ NÉBULEUSE PRIME ⚠';
  } else if (wave % 5 === 0) {
    spawnEnemy('miniboss', W / 2, -60);
    for (let i = 0; i < 3; i++) spawnEnemy('drone');
    world.waveBanner = 'MINI-BOSS';
  } else {
    const n = 4 + Math.floor(wave * 1.2);
    for (let i = 0; i < n; i++) spawnEnemy(pickEnemyType(wave));
    world.waveBanner = 'VAGUE ' + wave;
  }
  world.waveBannerTime = 2.3;
  waveTimer = 6.5;
}

/* ---- Effets ---- */
function explode(x, y, color, radius, count) {
  const n = count || Math.max(6, Math.floor(radius));
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), sp = rand(40, 60 + radius * 8);
    world.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      size: rand(1.5, 3.5), color, life: rand(0.3, 0.7), maxLife: 0.7,
    });
  }
  world.shake = Math.max(world.shake, Math.min(1, radius / 45));
}

function addText(str, x, y, color) {
  world.texts.push({ x, y, str: String(str), color, life: 0.9, maxLife: 0.9 });
}

function spawnPowerup(x, y) {
  world.powerups.push({ x, y, t: 0, r: 12, type: pick(['W', 'S', 'H', 'B', 'M', 'Z']) });
}

function applyPowerup(p) {
  const player = world.player;
  addText(p.type, p.x, p.y, powerColor(p.type));
  explode(p.x, p.y, powerColor(p.type), 8, 6);
  switch (p.type) {
    case 'W': weaponLevel = Math.min(3, weaponLevel + 1); break;
    case 'S': player.shield = Math.min(player.maxShield, player.shield + 25); break;
    case 'H': player.hull = Math.min(player.maxHull, player.hull + 25); break;
    case 'B': player.bombs = Math.min(6, player.bombs + 1); break;
    case 'M': multiplier = Math.min(9, multiplier + 1); break;
    case 'Z': world.slowTime = 3; break;
  }
}

function hurtPlayer(dmg) {
  const player = world.player;
  if (!player.alive || player.invuln > 0) return;
  if (player.shield > 0) {
    player.shield -= dmg;
    if (player.shield < 0) { player.hull += player.shield; player.shield = 0; }
  } else {
    player.hull -= dmg;
  }
  world.hitFlash = 1;
  world.shake = Math.max(world.shake, 0.7);
  triggerCamPunch(0.12, 0.15);
  player.invuln = 1.3;
  explode(player.x, player.y, '#60a5fa', 12, 6);
  if (player.hull <= 0) {
    player.hull = 0; player.alive = false; world.state = 'gameover';
    explode(player.x, player.y, '#dffcff', 30, 26);
    world.shockwaves.push({ x: player.x, y: player.y, r: 20, vr: 900, life: 0.7, maxLife: 0.7, color: '#60a5fa', color2: '#a855f7' });
    world.shake = 1;
  }
}

function killEnemy(e) {
  const base = e.type === 'boss' ? BOSS_SCORE : (ENEMY_DEFS[e.type] ? ENEMY_DEFS[e.type].score : 120);
  const pts = Math.round(base * multiplier);
  score += pts;
  addText('+' + pts, e.x, e.y, '#a5f3fc');
  explode(e.x, e.y, e.color || enemyColor(e.type), Math.max(6, e.r));
  if (e.elite || e.type === 'miniboss' || e.type === 'boss') {
    world.shockwaves.push({ x: e.x, y: e.y, r: e.r * 0.4, vr: 650, life: 0.5, maxLife: 0.5, color: '#facc15', color2: '#ec4899' });
    triggerCamPunch(0.08, 0.12);
  }
  if (e.type === 'splitter') { spawnEnemy('mini', e.x - 14, e.y); spawnEnemy('mini', e.x + 14, e.y); }
  if (e.type === 'boss') {
    world.waveBanner = 'NÉBULEUSE PRIME VAINCUE';
    world.waveBannerTime = 3;
    multiplier = Math.min(9, multiplier + 2);
    world.shake = 1;
    triggerCamPunch(0.18, 0.25);
    for (let i = 0; i < 3; i++) {
      world.shockwaves.push({ x: e.x + rand(-40, 40), y: e.y + rand(-30, 30), r: 20, vr: 800, life: 0.7, maxLife: 0.7, color: '#a855f7', color2: '#38bdf8' });
    }
  }
  const dropChance = e.type === 'boss' ? 1 : (e.elite || e.type === 'miniboss') ? 0.9 : 0.14;
  if (Math.random() < dropChance) spawnPowerup(e.x, e.y);
  multiplier = Math.min(9, multiplier + 0.2);
  multTime = 2.5;
}

function doBomb() {
  const player = world.player;
  if (!player || !player.alive || player.bombs <= 0) return;
  player.bombs--;
  world.shockwaves.push({ x: player.x, y: player.y, r: 24, vr: 1200, life: 0.7, maxLife: 0.7, color: '#fb7185', color2: '#a855f7' });
  world.shake = 1;
  triggerCamPunch(0.15, 0.18);
  addText('BOMBE', player.x, player.y - 44, '#fb7185');
  for (const b of world.eBullets) explode(b.x, b.y, b.color, 4, 2);
  world.eBullets.length = 0;
  for (const e of world.enemies) e.hp -= 250;
}

/* ---- Mises à jour ---- */
function updateBackground(dt) {
  const speedFactor = world.state === 'playing' ? 1 : 0.35;
  for (const s of world.stars) {
    s.y += s.s * dt * speedFactor;
    if (s.y > H + 2) { s.y = -2; s.x = rand(0, W); }
  }
}

function updatePlayer(dt) {
  const p = world.player;
  if (!p.alive) return;
  const k = Math.min(1, dt * 12 * controlSensitivity);
  const dx = target.x - p.x, dy = target.y - p.y;
  p.x += dx * k; p.y += dy * k;
  p.tilt = clamp(dx * 0.04, -0.6, 0.6);
  p.x = clamp(p.x, 20, W - 20); p.y = clamp(p.y, 70, H - 40);
  if (p.invuln > 0) p.invuln -= dt;
  if (shiftHeld) world.slowTime = Math.max(world.slowTime, 0.25);

  if ((p.fireCd -= dt) <= 0) {
    p.fireCd = 0.13;
    const offsets = weaponLevel >= 3 ? [-12, 0, 12] : weaponLevel >= 2 ? [-8, 8] : [0];
    for (const ox of offsets) {
      world.pBullets.push({ x: p.x + ox, y: p.y - 18, r: 5, homing: false, vx: 0, vy: -580 });
    }
  }
  if ((p.novaCd -= dt) <= 0) {
    p.novaCd = 2.6;
    world.pBullets.push({ x: p.x - 10, y: p.y, r: 6, homing: true, vx: -90, vy: -240 });
    world.pBullets.push({ x: p.x + 10, y: p.y, r: 6, homing: true, vx: 90, vy: -240 });
  }
}

function updateSpawner(dt) {
  if ((waveTimer -= dt) <= 0) nextWave();
}

function fireAtPlayer(e, speed, color, spread = 0, count = 1) {
  const p = world.player;
  const base = Math.atan2(p.y - e.y, p.x - e.x);
  for (let i = 0; i < count; i++) {
    const a = count === 1 ? base : base + (i - (count - 1) / 2) * spread;
    world.eBullets.push({ x: e.x, y: e.y + e.r * 0.5, r: 5, color, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed });
  }
}

function updateEnemies(eDt) {
  const p = world.player;
  for (const e of world.enemies) {
    e.t += eDt;
    switch (e.type) {
      case 'drone': e.y += e.speed * eDt; e.x += Math.sin(e.t * 2) * 30 * eDt; break;
      case 'zig': e.y += e.speed * eDt; e.x += Math.sin(e.t * 4) * 120 * eDt; break;
      case 'speeder': e.y += e.speed * eDt; break;
      case 'tank': e.y += e.speed * eDt; break;
      case 'splitter': e.y += e.speed * eDt; break;
      case 'mini': e.y += e.speed * eDt; e.x += Math.sin(e.t * 6) * 60 * eDt; break;
      case 'sentinel': e.y += e.speed * eDt; e.x += Math.sin(e.t * 1.5) * 40 * eDt; break;
      case 'swarmer': e.y += e.speed * 1.4 * eDt; e.x += Math.sin(e.t * 5) * 20 * eDt; break;
      case 'turret':
        if (e.y < e.stopY) e.y += e.speed * eDt;
        else if ((e.fireCd -= eDt) <= 0) { e.fireCd = 1.6; fireAtPlayer(e, 240, enemyColor('turret')); }
        break;
      case 'elite':
        if (e.y < e.stopY) e.y += e.speed * eDt;
        e.x += Math.sin(e.t * 2.2) * 70 * eDt;
        if (e.y >= e.stopY && (e.fireCd -= eDt) <= 0) { e.fireCd = 1.4; fireAtPlayer(e, 260, enemyColor('elite')); }
        break;
      case 'miniboss':
        if (e.y < e.stopY) e.y += e.speed * eDt;
        else {
          e.x += Math.sin(e.t * 0.8) * 40 * eDt;
          if ((e.fireCd -= eDt) <= 0) { e.fireCd = 1.8; fireAtPlayer(e, 230, enemyColor('miniboss'), 0.28, 5); }
        }
        break;
      case 'boss':
        e.spin += eDt * 0.5;
        if (e.y < 120) e.y += e.speed * eDt;
        else e.x = W / 2 + Math.sin(e.t * 0.6) * (W / 2 - 100);
        if ((e.fireCd -= eDt) <= 0) { e.fireCd = 1.1; fireAtPlayer(e, 250, e.color, 0.25, 5); }
        if ((e.beamCd -= eDt) <= 0) {
          e.beamCd = 5;
          world.beams.push({ x: p.x, y: e.y + 40, width: 64, color: e.color, life: 2.5, active: 0.8, total: 2.5 });
        }
        break;
    }
    if (e.type !== 'boss' && e.type !== 'miniboss' && e.y > H + 80) e.dead = true;
  }
}

function updateBullets(dt, eDt) {
  for (const b of world.pBullets) {
    if (b.homing) {
      let best = null, bd = Infinity;
      for (const e of world.enemies) {
        if (e.dead) continue;
        const d = (e.x - b.x) ** 2 + (e.y - b.y) ** 2;
        if (d < bd) { bd = d; best = e; }
      }
      if (best) {
        const a = Math.atan2(best.y - b.y, best.x - b.x), sp = 400;
        b.vx += (Math.cos(a) * sp - b.vx) * Math.min(1, dt * 6);
        b.vy += (Math.sin(a) * sp - b.vy) * Math.min(1, dt * 6);
      }
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.y < -30 || b.x < -30 || b.x > W + 30) b.dead = true;
  }
  world.pBullets = world.pBullets.filter((b) => !b.dead);

  for (const b of world.eBullets) {
    b.x += b.vx * eDt; b.y += b.vy * eDt;
    if (b.y > H + 30 || b.y < -30 || b.x < -30 || b.x > W + 30) b.dead = true;
  }
  world.eBullets = world.eBullets.filter((b) => !b.dead);
}

function updateBeams(eDt) {
  const p = world.player;
  for (const b of world.beams) {
    b.life -= eDt;
    if (b.life <= b.active && p.alive && p.invuln <= 0 &&
      p.x > b.x - b.width / 2 && p.x < b.x + b.width / 2 && p.y > b.y) {
      hurtPlayer(28);
    }
  }
  world.beams = world.beams.filter((b) => b.life > 0);
}

function updatePowerups(dt) {
  for (const p of world.powerups) {
    p.y += 60 * dt; p.t += dt;
    if (p.y > H + 30) p.dead = true;
  }
  world.powerups = world.powerups.filter((p) => !p.dead);
}

function updateParticles(dt) {
  for (const p of world.particles) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 80 * dt; p.life -= dt;
  }
  world.particles = world.particles.filter((p) => p.life > 0);
}

function updateShockwaves(dt) {
  for (const s of world.shockwaves) { s.r += s.vr * dt; s.life -= dt; }
  world.shockwaves = world.shockwaves.filter((s) => s.life > 0);
}

function updateTexts(dt) {
  for (const t of world.texts) { t.y -= 32 * dt; t.life -= dt; }
  world.texts = world.texts.filter((t) => t.life > 0);
}

function updateCollisions() {
  const p = world.player;
  for (const b of world.pBullets) {
    if (b.dead) continue;
    for (const e of world.enemies) {
      if (e.dead) continue;
      const rr = e.r + b.r;
      if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 < rr * rr) {
        e.hp -= b.homing ? 22 : 12;
        b.dead = true;
        explode(b.x, b.y, b.homing ? '#fde68a' : '#a5f3fc', 3, 2);
        break;
      }
    }
  }
  world.pBullets = world.pBullets.filter((b) => !b.dead);

  if (p.alive && p.invuln <= 0) {
    for (const b of world.eBullets) {
      if (b.dead) continue;
      const rr = PLAYER_R + b.r;
      if ((p.x - b.x) ** 2 + (p.y - b.y) ** 2 < rr * rr) { hurtPlayer(12); b.dead = true; }
    }
    world.eBullets = world.eBullets.filter((b) => !b.dead);

    for (const e of world.enemies) {
      if (e.dead) continue;
      const rr = e.r + PLAYER_R;
      if ((p.x - e.x) ** 2 + (p.y - e.y) ** 2 < rr * rr) {
        hurtPlayer(e.type === 'boss' ? 30 : 18);
        if (e.type !== 'boss' && e.type !== 'miniboss' && e.type !== 'tank') e.hp = 0;
      }
    }
  }

  for (const pu of world.powerups) {
    if (pu.dead) continue;
    const rr = pu.r + 20;
    if ((p.x - pu.x) ** 2 + (p.y - pu.y) ** 2 < rr * rr) { applyPowerup(pu); pu.dead = true; }
  }
  world.powerups = world.powerups.filter((pu) => !pu.dead);
}

function cleanupEnemies() {
  for (const e of world.enemies) {
    if (!e.dead && e.hp <= 0) { killEnemy(e); e.dead = true; }
  }
  world.enemies = world.enemies.filter((e) => !e.dead);
}

/* ---- Orchestrateur ---- */
function update(dt) {
  world.globalTime += dt;
  updateBackground(dt);
  if (world.gfx.planets) updatePlanets(dt);

  if (world.camPunchTime > 0) {
    world.camPunchTime = Math.max(0, world.camPunchTime - dt);
    if (world.camPunchTime <= 0) world.camPunchMag = 0;
  }
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 1.4);
  if (world.hitFlash > 0) world.hitFlash = Math.max(0, world.hitFlash - dt * 2.2);
  if (world.slowTime > 0) world.slowTime = Math.max(0, world.slowTime - dt);
  if (world.waveBannerTime > 0) world.waveBannerTime -= dt;
  if (multTime > 0) { multTime -= dt; if (multTime <= 0) multiplier = 1; }

  updateParticles(dt); updateTexts(dt); updateShockwaves(dt);

  if (world.state !== 'playing') return;
  const eDt = dt * (world.slowTime > 0 ? 0.45 : 1);
  updatePlayer(dt);
  updateSpawner(dt);
  updateEnemies(eDt);
  updateBullets(dt, eDt);
  updateBeams(eDt);
  updatePowerups(dt);
  updateCollisions();
  cleanupEnemies();
}

/* ------------------------------------------------------------------
 * 8. Boucle — indépendante du renderer (requestAnimationFrame)
 * ------------------------------------------------------------------ */
let last = performance.now();
function frame(t) {
  const dt = Math.min(0.033, ((t - last) / 1000) || 0.016);   // clamp anti-spirale
  last = t;
  update(dt);
  renderer.renderFrame();   // le contrat, rien que le contrat
  updateHUD();
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  W = window.innerWidth; H = window.innerHeight;
  world.W = W; world.H = H;
  renderer.resize(W, H);
  const p = world.player;
  if (p) { p.x = clamp(p.x, 20, W - 20); p.y = clamp(p.y, 70, H - 40); }
});

startRun();
requestAnimationFrame(frame);