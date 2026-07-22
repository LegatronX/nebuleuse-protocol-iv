// ============================================================
// Nébuleuse Protocol IV
// © 2026 Christian ROLANDO — Tous droits réservés.
// Voir le fichier LICENSE à la racine du dépôt.
// ============================================================

import { TAU, rand, clamp, pick } from '../util/math.js';
import { loadMeta, saveMeta, loadBest, saveBest, formatTime } from './meta.js';
import { SHIPS, DIFF, TALENTS, SECTORS, SECTOR_PALETTES, MUTATORS, getWaveTypes, currentSectorIndex } from './waves.js';
import { AudioSys } from '../audio/audio.stub.js';
import { show, hide, isHidden } from '../ui/ui.stub.js';

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

/* ---- Spawner & Vagues ---- */
export function spawnEnemy(type, x, y) {
  const W = world.W;
  const d = getDiff();
  const hpScale = (1 + d * 0.16) * dm().hp;
  const px = x === undefined ? rand(40, Math.max(41, W - 40)) : x;
  const py = y === undefined ? -40 : y;

  const e = {
    type,
    x: px,
    y: py,
    baseX: px,
    t: rand(0, TAU),
    fireCd: rand(0.8, 2.0),
    customFireCd: rand(0.6, 1.4),
    vy: 0,
    r: 14,
    hp: 10,
    maxHp: 10,
    score: 100,
    elite: false,
  };

  switch (type) {
    case 'drone':
      e.r = 14; e.hp = e.maxHp = 24 * hpScale; e.vy = 85 + d * 4; e.score = 100; break;
    case 'zig':
      e.r = 13; e.hp = e.maxHp = 30 * hpScale; e.vy = 72; e.score = 150; break;
    case 'speeder':
      e.r = 10; e.hp = e.maxHp = 15 * hpScale; e.vy = 235 + d * 8; e.score = 120; break;
    case 'tank':
      e.r = 22; e.hp = e.maxHp = 100 * hpScale; e.vy = 34; e.score = 300; break;
    case 'splitter':
      e.r = 18; e.hp = e.maxHp = 60 * hpScale; e.vy = 62; e.score = 220; break;
    case 'turret':
      e.r = 16; e.hp = e.maxHp = 70 * hpScale; e.vy = 90; e.score = 260; break;
    case 'elite':
      e.r = 17; e.hp = e.maxHp = 90 * hpScale; e.vy = 48; e.score = 400; break;
    case 'mini':
      e.r = 8; e.hp = e.maxHp = 9 * hpScale; e.vy = 210; e.score = 50; break;
    case 'miniboss':
      e.x = W / 2; e.baseX = W / 2; e.r = 32;
      e.hp = e.maxHp = (450 + d * 110) * dm().hp; e.vy = 60; e.score = 1500; break;
    case 'sentinel':
      e.r = 15; e.hp = e.maxHp = 46 * hpScale; e.vy = 30; e.score = 260; break;
    case 'swarmer':
      e.r = 7; e.hp = e.maxHp = 6 * hpScale; e.vy = 165; e.score = 70; break;
  }

  if (type !== 'miniboss' && type !== 'mini' && type !== 'boss' && world.wave >= 2) {
    const chance = 0.08 + world.wave * 0.012;
    if (Math.random() < chance) {
      e.elite = true;
      e.hp = e.maxHp = Math.round(e.maxHp * 2.1);
      e.r *= 1.18;
      e.score *= 2;
      e.fireCd *= 0.7;
    }
  }

  world.enemies.push(e);
  return e;
}

export function spawnBoss(isFinal) {
  const W = world.W, H = world.H;
  const kind = isFinal ? 3 : world.runBossKills % 3;
  const defs = [
    { name: 'BOSS CRAMOISI', color: '#f43f5e' },
    { name: 'BOSS AZUR', color: '#38bdf8' },
    { name: 'BOSS ÉMERALDE', color: '#34d399' },
    { name: 'NÉBULEUSE PRIME', color: '#f0abfc' },
  ];
  const def = defs[kind];
  const hp = isFinal
    ? 5200 + world.wave * 650
    : (world.mode === 'survie' ? 1200 : 1500) + world.wave * 450 + world.runBossKills * 250;

  world.boss = {
    type: 'boss',
    kind,
    finalBoss: !!isFinal,
    phase: 1,
    name: def.name,
    color: def.color,
    x: W / 2,
    y: -160,
    targetY: clamp(H * (isFinal ? 0.2 : 0.18), 100, 230),
    r: isFinal ? 68 : 54,
    hp: Math.round(hp * dm().hp),
    maxHp: Math.round(hp * dm().hp),
    t: 0,
    spin: 0,
    fireCd: isFinal ? 2.2 : 1.8,
    patternTime: 0,
    minionCd: 6,
    score: isFinal ? 25000 : 9000 + world.wave * 600,
    entering: true,
  };

  world.enemies.push(world.boss);
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

  startWave(world.wave + 1);
}

export function updateSpawner(dt) {
  if (world.spawnQueue.length) {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      const item = world.spawnQueue.shift();
      if (item.type === 'boss') spawnBoss(item.final);
      else spawnEnemy(item.type);

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

export function updateAssist(dt) {
  if (world.autoBombCooldown > 0) world.autoBombCooldown -= dt;
  const p = world.player;
  const assist = (world.meta && world.meta.assist) || false;
  if (assist && p && p.alive && p.bombs > 0 && world.autoBombCooldown <= 0 && p.hull <= p.maxHull * 0.25) {
    world.autoBombCooldown = 8.0;
    // doBomb stub call for now
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

    updateSpawner(dt);

    if (world.waveBannerTime > 0) world.waveBannerTime -= dt;
  } else if (world.state === 'gameover' || world.state === 'victory') {
    if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 1.4);
    if (world.hitFlash > 0) world.hitFlash -= dt;
  }
}

export function frame(t, renderer) {
  // Pilotage du tick par main.js
}
