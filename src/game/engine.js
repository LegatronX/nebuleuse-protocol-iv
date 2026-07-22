// ============================================================
// Nébuleuse Protocol IV
// © 2026 Christian ROLANDO — Tous droits réservés.
// Voir le fichier LICENSE à la racine du dépôt.
// ============================================================

import { TAU, rand, clamp, pick } from '../util/math.js';
import { loadMeta, saveMeta, loadBest, saveBest } from './meta.js';
export { saveBest };
import { SHIPS, DIFF, TALENTS, SECTORS, SECTOR_PALETTES, MUTATORS, getWaveTypes, currentSectorIndex } from './waves.js';
import { AudioSys } from '../audio/audio.js';
import { spawnEnemy, spawnBoss } from './spawn.js';
import { spawnChest } from './drops.js';
export { spawnEnemy, spawnBoss };
export function show(idOrEl) {
  const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
  if (el) el.classList.remove('hidden');
}
export function hide(idOrEl) {
  const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
  if (el) el.classList.add('hidden');
}
export function isHidden(idOrEl) {
  const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
  return el ? el.classList.contains('hidden') : true;
}

export const world = {
  W: window.innerWidth || 390,
  H: window.innerHeight || 844,

  state: 'menu',            // 'menu', 'playing', 'paused', 'countdown', 'gameover', 'victory'
  mode: 'campagne',         // 'campagne', 'survie'
  lastMode: 'campagne',
  difficulty: 'normal',

  globalTime: 0,
  gameTime: 0,
  survivalTime: 0,

  score: 0,
  best: loadBest(),
  sessionBest: 0,
  wave: 1,
  multiplier: 1,
  multTime: 0,
  slowTime: 0,
  shake: 0,
  hitFlash: 0,

  combo: 0,
  comboTime: 0,
  maxCombo: 0,
  gameKills: 0,
  runBossKills: 0,
  finalDefeated: false,
  finalBonusAwarded: false,

  grazes: 0,
  grazeChain: 0,
  grazeChainTime: 0,
  bestGrazeChain: 0,

  runNanitesPaid: 0,
  hudTimer: 0,
  countdownToken: 0,

  hitStopTimer: 0,
  camPunchMag: 0,
  camPunchTime: 0,
  camPunchDuration: 0.001,

  waveBanner: '',
  waveBannerTime: 0,
  boss: null,

  lastSectorIndex: -1,
  activeMutator: null,
  dailyMutatorId: null,

  autoBombCooldown: 0,

  player: null,
  enemies: [],
  pBullets: [],
  eBullets: [],
  particles: [],
  powerups: [],
  texts: [],
  shockwaves: [],
  stars: [],
  beams: [],
  planets: [],

  spawnQueue: [],
  spawnTimer: 0,

  meta: loadMeta(),
  gfx: null,
};

export function getDiff() {
  return world.difficulty === 'cauchemar' ? 1 : 0;
}

export function dm() {
  const d = DIFF[world.difficulty] || DIFF.normal;
  const mut = world.activeMutator ? (MUTATORS[world.activeMutator] || {}) : {};
  return {
    hp: d.hp * (mut.hp || 1),
    bullet: d.bullet,
    fire: d.fire * (mut.fire || 1),
    score: d.score * (mut.score || 1),
    playerHull: d.playerHull,
  };
}

export function getScoreMult() {
  return (world.mode === 'survie' ? 1.25 : 1.0) * (world.activeMutator ? 1.2 : 1.0);
}

export function computeNanites() {
  const base =
    Math.floor(world.score / 4000) +
    world.wave +
    world.runBossKills * 2 +
    (world.finalDefeated ? 8 : 0);

  const mult = 1 + ((world.meta.talents && world.meta.talents.credit) || 0) * 0.1;
  return Math.max(1, Math.round(base * mult));
}

/* ---- Étoiles & Planètes ---- */
export function initStars(W = world.W, H = world.H, lowQuality = false) {
  world.W = W;
  world.H = H;
  const areaFactor = clamp((W * H) / (390 * 844), 0.75, 1.8);
  const count = Math.round((lowQuality ? 90 : 170) * areaFactor);
  const stars = [];
  for (let i = 0; i < count; i++) {
    const z = Math.random();
    stars.push({ x: Math.random() * W, y: Math.random() * H, z, r: z * 1.7 + 0.3, s: 25 + z * 130, tw: rand(0, TAU) });
  }
  world.stars = stars;
}

export function createPlanet(typeIndex, x, y, r) {
  const PLANET_TYPES = [
    { name: 'Gazeuse Indigo', c1: '#4338ca', c2: '#1e1b4b', aura: 'rgba(99,102,241,0.25)', ring: true, crated: false },
    { name: 'Tellurique Morte', c1: '#78350f', c2: '#292524', aura: null, ring: false, crated: true },
    { name: 'Nébulaire Rose', c1: '#be185d', c2: '#500724', aura: 'rgba(244,63,94,0.3)', ring: false, crated: false },
    { name: 'Géante Glacée', c1: '#0284c7', c2: '#0c4a6e', aura: 'rgba(56,189,248,0.22)', ring: true, crated: false },
  ];
  const type = PLANET_TYPES[typeIndex % PLANET_TYPES.length];
  const craters = [];
  if (type.crated) {
    const n = Math.floor(rand(3, 7));
    for (let i = 0; i < n; i++) {
      craters.push({ x: rand(-0.6, 0.6), y: rand(-0.6, 0.6), r: rand(0.08, 0.22) });
    }
  }
  return { type, x, y, r, craters, vy: 8 + Math.random() * 6 };
}

export function updateBackground(dt) {
  const speedFactor = world.state === 'playing' ? 1 : 0.35;
  for (const s of world.stars) {
    s.y += s.s * dt * speedFactor;
    if (s.y > world.H + 2) {
      s.y = -2;
      s.x = Math.random() * world.W;
    }
  }
  if (world.gfx && world.gfx.planets && world.planets) {
    for (const p of world.planets) {
      p.y += p.vy * dt * speedFactor;
      if (p.y - p.r * 1.5 > world.H) {
        p.y = -p.r * 1.5;
        p.x = rand(p.r, world.W - p.r);
      }
    }
  }
}

export function startWave(n) {
  world.wave = n;
  world.spawnQueue = [];
  world.boss = null;

  const bossWave = world.mode === 'survie' ? n % 5 === 0 : n % 3 === 0;

  if (n === 15 && !world.finalDefeated) {
    world.waveBanner = 'VAGUE 15 — BOSS FINAL';
    world.spawnQueue.push({ delay: 2.0, type: 'boss', final: true });
    document.body.classList.add('cinema');
  } else if (bossWave) {
    world.waveBanner = `VAGUE ${n} — BOSS`;
    world.spawnQueue.push({ delay: 1.4, type: 'boss', final: false });
  } else {
    world.waveBanner = `VAGUE ${n}`;
    const count = world.mode === 'survie' ? 10 + n * 4 : 8 + n * 3;
    const types = getWaveTypes(n);

    for (let i = 0; i < count; i++) {
      world.spawnQueue.push({
        delay: world.mode === 'survie' ? rand(0.28, 0.72) : rand(0.35, 0.9),
        type: pick(types),
      });
    }

    if (n >= 4 && n % 2 === 0) {
      world.spawnQueue.push({ delay: 1.5, type: 'miniboss' });
    }
  }

  world.spawnTimer = world.spawnQueue.length ? world.spawnQueue[0].delay : 1;
  world.waveBannerTime = 2.3;
}

export function endWave() {
  const bonus = 500 + world.wave * 120;
  const gained = Math.round(bonus * getScoreMult() * dm().score);
  world.score += gained;

  if (world.score > world.best) {
    world.best = world.score;
    saveBest(world.best);
  }

  addText(world.W / 2, world.H * 0.38, `Vague ${world.wave} nettoyée +${gained}`, '#a5f3fc');

  if (world.boss) {
    world.boss = null;
  }

  // Apparition du coffre de fin de vague (M5.2)
  spawnChest(world);

  startWave(world.wave + 1);
}

export function updateSpawner(dt) {
  if (world.spawnQueue.length) {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      const item = world.spawnQueue.shift();
      if (item.type === 'boss') {
        const b = spawnBoss(item.final);
        if (b && b.name) {
          world.waveBanner = `VAGUE ${world.wave} — ${b.name}`;
          world.waveBannerTime = 2.3;
        }
      } else {
        spawnEnemy(item.type);
      }

      if (world.spawnQueue.length) world.spawnTimer = world.spawnQueue[0].delay;
    }
  } else if (world.enemies.length === 0 && world.waveBannerTime <= 0) {
    endWave();
  }
}

export function addText(x, y, str, color = '#ffffff') {
  world.texts.push({ x, y, str, color, life: 1.0, maxLife: 1.0, vy: -30 });
}

/* ---- Reset & Boucle de jeu ---- */
export function resetGame() {
  const ship = SHIPS[world.meta.ship || 0];
  const tal = world.meta.talents || {};
  const m = dm();

  world.score = 0;
  world.multiplier = 1;
  world.multTime = 0;
  world.slowTime = 0;
  world.shake = 0;
  world.hitFlash = 0;
  world.gameTime = 0;
  world.survivalTime = 0;
  world.combo = 0;
  world.comboTime = 0;
  world.gameKills = 0;
  world.runBossKills = 0;
  world.finalDefeated = false;
  world.finalBonusAwarded = false;

  world.grazes = 0;
  world.grazeChain = 0;
  world.grazeChainTime = 0;

  world.runNanitesPaid = 0;
  world.hudTimer = 0;
  world.countdownToken++;

  world.enemies = [];
  world.pBullets = [];
  world.eBullets = [];
  world.particles = [];
  world.powerups = [];
  world.texts = [];
  world.shockwaves = [];
  world.beams = [];

  const maxHull = Math.round((ship.hull + tal.armor * 12) * m.playerHull);
  const maxShield = ship.shield + tal.regen * 8;
  const weaponLevel = Math.min(4, ship.weapon + tal.weapon);
  const bombs = ship.bombs + tal.bombs;
  const lives = 1 + (tal.life || 0);

  world.player = {
    x: world.W / 2,
    y: world.H * 0.78,
    r: 14,
    speed: ship.speed,
    hull: maxHull,
    maxHull,
    shield: maxShield,
    maxShield,
    lives,
    weapon: 1,
    weaponLevel,
    bombs,
    energy: 0,
    maxEnergy: 100,
    tilt: 0,
    invuln: 0,
    alive: true,
    colors: ship.colors,
    fireCd: 0,
  };

  startWave(1);
}

export function startGame(chosenMode = 'campagne') {
  world.mode = chosenMode;
  world.lastMode = chosenMode;
  resetGame();
  world.state = 'playing';
  AudioSys.startMusic();
}

export function pauseGame() {
  if (world.state !== 'playing') return;
  world.state = 'paused';
  show('pauseOverlay');
  AudioSys.stopMusic();
  AudioSys.ui();
}

export function resumeGame() {
  if (world.state !== 'paused') return;
  hide('pauseOverlay');
  world.state = 'playing';
  AudioSys.startMusic();
  AudioSys.ui();
}

export function gameOver() {
  world.state = 'gameover';
  const totalEarned = computeNanites();
  world.meta.nanites += Math.max(0, totalEarned - world.runNanitesPaid);
  saveMeta(world.meta);
  show('gameoverOverlay');
  AudioSys.stopMusic();
  AudioSys.explosion(true);
}

export function showVictory() {
  world.state = 'victory';
  const totalEarned = computeNanites();
  world.meta.nanites += Math.max(0, totalEarned - world.runNanitesPaid);
  saveMeta(world.meta);
  show('victoryOverlay');
  AudioSys.stopMusic();
  AudioSys.power();
}

export function toMenu() {
  world.state = 'menu';
  hide('pauseOverlay');
  hide('gameoverOverlay');
  hide('victoryOverlay');
  show('menu');
  AudioSys.stopMusic();
  AudioSys.ui();
}

export function triggerHitStop(duration = 0.08) {
  world.hitStopTimer = duration;
}

export function triggerCamPunch(mag = 0.04, duration = 0.14) {
  world.camPunchMag = mag;
  world.camPunchDuration = duration;
  world.camPunchTime = duration;
}

import { updateEnemies, updateBullets, updateBeams } from './enemies.js';
import { updateCollisions, doBomb, doSpecial } from './combat.js';
import { openChest } from './drops.js';
export { doBomb, doSpecial };

export function updatePowerups(dt) {
  const p = world.player;
  const magnetActive = (world.magnetTimer || 0) > 0;
  if (world.magnetTimer > 0) world.magnetTimer -= dt;

  for (let i = world.powerups.length - 1; i >= 0; i--) {
    const pw = world.powerups[i];
    pw.t += dt;

    if (pw.loot) {
      pw.vx = (pw.vx || 0) * 0.92;
      pw.vy = (pw.vy || 65) * 0.92 + 40 * dt;
      pw.x += pw.vx * dt;
      pw.y += pw.vy * dt;
    } else {
      pw.y += (pw.vy || 65) * dt;
    }

    if (p && p.alive) {
      const dist = Math.hypot(pw.x - p.x, pw.y - p.y);
      if (magnetActive || dist < 150) {
        const speed = magnetActive ? 480 : 320;
        const angle = Math.atan2(p.y - pw.y, p.x - pw.x);
        pw.x += Math.cos(angle) * speed * dt;
        pw.y += Math.sin(angle) * speed * dt;
      }

      if (dist < (pw.r || 12) + p.r + 6) {
        const type = pw.type;
        world.powerups.splice(i, 1);
        applyPowerup(type);
        continue;
      }
    }

    if (pw.y > world.H + 40 || pw.x < -40 || pw.x > world.W + 40) {
      world.powerups.splice(i, 1);
    }
  }
}

export function applyPowerup(type) {
  const p = world.player;
  if (!p || !p.alive) return;

  if (type === 'hull' || type === 'H') {
    p.hull = Math.min(p.maxHull, p.hull + 28);
    addText(p.x, p.y - 20, '+28 Coque', '#34d399');
  } else if (type === 'shield' || type === 'S') {
    p.shield = Math.min(p.maxShield, p.shield + 35);
    addText(p.x, p.y - 20, '+35 Bouclier', '#60a5fa');
  } else if (type === 'weapon' || type === 'W') {
    p.weapon = Math.min(5, p.weapon + 1);
    addText(p.x, p.y - 20, 'Arme +1', '#fbbf24');
  } else if (type === 'bomb' || type === 'B') {
    p.bombs = Math.min(6, p.bombs + 1);
    addText(p.x, p.y - 20, '+1 Bombe', '#a78bfa');
  } else if (type === 'energy' || type === 'M') {
    p.energy = Math.min(p.maxEnergy, p.energy + 40);
    addText(p.x, p.y - 20, '+40 Énergie', '#f0abfc');
  } else if (type === 'Z') {
    world.score += 500;
    addText(p.x, p.y - 20, '+500 Score', '#fbbf24');
  } else if (type === 'MAGNET') {
    world.magnetTimer = 6.0;
    addText(p.x, p.y - 20, 'AIMANT ACTIVÉ', '#f472b6');
  } else if (type === 'CHEST') {
    openChest(world, p.x, p.y);
    return;
  } else if (type === 'NANITES') {
    world.meta.nanites = (world.meta.nanites || 0) + 50;
    saveMeta(world.meta);
    addText(p.x, p.y - 20, '+50 Nanites', '#67e8f9');
  } else if (type === 'LIFE') {
    p.lives = Math.min(5, (p.lives || 1) + 1);
    addText(p.x, p.y - 20, '+1 Vie ♥', '#fb7185');
  }

  AudioSys.power(p.x);
}

export function updateParticles(dt) {
  for (let i = world.particles.length - 1; i >= 0; i--) {
    const pt = world.particles[i];
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    if (pt.life <= 0) world.particles.splice(i, 1);
  }
}

export function updateTexts(dt) {
  for (let i = world.texts.length - 1; i >= 0; i--) {
    const tx = world.texts[i];
    tx.life -= dt;
    tx.y += tx.vy * dt;
    if (tx.life <= 0) world.texts.splice(i, 1);
  }
}

export function updateShockwaves(dt) {
  for (let i = world.shockwaves.length - 1; i >= 0; i--) {
    const sw = world.shockwaves[i];
    sw.life -= dt;
    const progress = 1 - (sw.life / sw.maxLife);
    sw.r = 10 + progress * (sw.maxR - 10);
    if (sw.life <= 0) world.shockwaves.splice(i, 1);
  }
}

export function updateAssist(dt) {
  if (world.autoBombCooldown > 0) world.autoBombCooldown -= dt;
  const p = world.player;
  const assist = (world.meta && world.meta.assist) || false;
  if (assist && p && p.alive && p.bombs > 0 && world.autoBombCooldown <= 0 && p.hull <= p.maxHull * 0.25) {
    world.autoBombCooldown = 8.0;
    doBomb();
  }
}

export function fireHoming(count = 1) {
  const p = world.player;
  if (!p || !p.alive || !world.enemies.length) return;

  for (let i = 0; i < count; i++) {
    const spread = (i - (count - 1) / 2) * 0.25;
    const angle = -Math.PI / 2 + spread;
    const speed = 520;

    world.pBullets.push({
      x: p.x + rand(-8, 8),
      y: p.y - 12,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      dmg: 28 + p.weapon * 4,
      r: 5,
      color: '#fbbf24',
      life: 3,
      homing: true,
      angle,
      speed,
      turn: 6,
    });
  }
}

export function firePlayer() {
  const p = world.player;
  if (!p || !p.alive) return;
  const w = p.weapon || 1;
  p.fireCd = Math.max(0.07, (0.155 - w * 0.011) * (p.fireMul || 1));

  const dmg = 12 + w * 3;
  const y = p.y - 18;
  const sp = 760;

  const shot = (x, vx, vy, r = 4, color = '#8ffcff') => {
    world.pBullets.push({ x, y: y + rand(-1, 1), vx, vy, dmg, r, color, life: 2 });
  };

  if (w === 1) {
    shot(p.x, 0, -sp);
  } else if (w === 2) {
    shot(p.x - 8, 0, -sp);
    shot(p.x + 8, 0, -sp);
  } else if (w === 3) {
    shot(p.x, 0, -sp);
    shot(p.x - 12, -90, -sp);
    shot(p.x + 12, 90, -sp);
  } else if (w === 4) {
    shot(p.x - 6, 0, -sp);
    shot(p.x + 6, 0, -sp);
    shot(p.x - 14, -140, -sp * 0.92);
    shot(p.x + 14, 140, -sp * 0.92);
  } else {
    shot(p.x, 0, -sp, 5, '#e8feff');
    shot(p.x - 9, -60, -sp);
    shot(p.x + 9, 60, -sp);
    shot(p.x - 18, -170, -sp * 0.9);
    shot(p.x + 18, 170, -sp * 0.9);
  }

  AudioSys.shoot();
}

export const keys = {};

export function updatePlayer(dt) {
  const p = world.player;
  if (!p || !p.alive) return;

  p.invuln -= dt;
  p.shieldDelay = (p.shieldDelay || 0) - dt;
  p.fireCd = (p.fireCd || 0) - dt;
  p.missileCd = (p.missileCd || 0) - dt;

  p.energy = Math.min(100, p.energy + (p.energyRegen || 1.5) * dt);

  if (p.shieldDelay <= 0 && p.shield < p.maxShield) {
    p.shield = Math.min(p.maxShield, p.shield + (p.shieldRegen || 3.5) * dt);
  }

  // Deplacement Clavier (Flèches / WASD / ZQSD)
  let kx = 0;
  let ky = 0;
  if (keys.ArrowLeft || keys.KeyA || keys.KeyQ) kx -= 1;
  if (keys.ArrowRight || keys.KeyD) kx += 1;
  if (keys.ArrowUp || keys.KeyW || keys.KeyZ) ky -= 1;
  if (keys.ArrowDown || keys.KeyS) ky += 1;

  if (kx || ky) {
    const len = Math.hypot(kx, ky) || 1;
    const speed = p.speed || 380;
    p.x += (kx / len) * speed * dt;
    p.y += (ky / len) * speed * dt;
  }

  p.x = clamp(p.x, 20, world.W - 20);
  p.y = clamp(p.y, 70, world.H - 40);

  p.tilt = clamp((p.x - (p.prevX || p.x)) / 12, -0.45, 0.45);
  p.prevX = p.x;

  if (p.fireCd <= 0) firePlayer();

  if (p.weapon >= 4 && p.missileCd <= 0 && world.enemies.length) {
    fireHoming(1);
    p.missileCd = 1.25 - p.weapon * 0.05;
  }

  if (Math.random() < 0.7) {
    world.particles.push({
      x: p.x + rand(-4, 4),
      y: p.y + 18,
      vx: rand(-12, 12),
      vy: rand(90, 170),
      life: 0.28,
      maxLife: 0.28,
      size: rand(1, 3),
      color: '#38bdf8',
    });
  }
}

export function update(dt) {
  world.globalTime += dt;

  if (world.camPunchTime > 0) {
    world.camPunchTime -= dt;
    if (world.camPunchTime <= 0) world.camPunchMag = 0;
  }

  if (world.hitStopTimer > 0) {
    world.hitStopTimer -= dt;
    return;
  }

  updateAssist(dt);
  updateBackground(dt);

  if (world.state === 'playing') {
    world.gameTime += dt;
    if (world.mode === 'survie') world.survivalTime += dt;
    if (world.slowTime > 0) world.slowTime -= dt;

    if (world.multTime > 0) {
      world.multTime -= dt;
      if (world.multTime <= 0) world.multiplier = 1;
    }

    if (world.comboTime > 0) {
      world.comboTime -= dt;
      if (world.comboTime <= 0) world.combo = 0;
    }

    if (world.grazeChainTime > 0) {
      world.grazeChainTime -= dt;
      if (world.grazeChainTime <= 0) world.grazeChain = 0;
    }

    if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 1.4);
    if (world.hitFlash > 0) world.hitFlash -= dt;

    updatePlayer(dt);
    updateSpawner(dt);

    const eDt = dt * (world.slowTime > 0 ? 0.45 : 1);

    updateEnemies(eDt);
    updateBullets(dt, eDt);
    updateBeams(dt);
    updateCollisions();
    updatePowerups(dt);
    updateParticles(dt);
    updateTexts(dt);
    updateShockwaves(dt);

    if (world.waveBannerTime > 0) world.waveBannerTime -= dt;
  } else if (world.state === 'gameover' || world.state === 'victory') {
    updateParticles(dt);
    updateTexts(dt);
    updateShockwaves(dt);
    updateBeams(dt);

    if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 1.4);
    if (world.hitFlash > 0) world.hitFlash -= dt;
  }

  AudioSys.update(dt, world);
}

export function frame(t, renderer) {
  // Pilotage du tick par main.js
}
