// ============================================================
// Nébuleuse Protocol IV
// © 2026 Christian ROLANDO — Tous droits réservés.
// Voir le fichier LICENSE à la racine du dépôt.
// ============================================================
// Spawner d'ennemis et de Boss — Découplage sans dépendance circulaire

import { TAU, rand, clamp } from '../util/math.js';
import { world, getDiff, dm } from './engine.js';
import { BOSS, nextBossId } from './bosses.js';

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
  const bId = isFinal ? 4 : nextBossId(world);
  const def = BOSS[bId] || BOSS[1];

  const hp = isFinal
    ? 5200 + world.wave * 650
    : (world.mode === 'survie' ? 1200 : 1500) + world.wave * 450 + world.runBossKills * 250;

  const initialPhase = def.phases[0];

  world.boss = {
    type: 'boss',
    bossId: bId,
    finalBoss: !!isFinal,
    phaseIndex: 0,
    name: def.name,
    color: def.color,
    x: W / 2,
    y: -160,
    stopY: clamp(H * (isFinal ? 0.2 : 0.18), 100, 230),
    r: isFinal ? 68 : 54,
    hp: Math.round(hp * dm().hp),
    maxHp: Math.round(hp * dm().hp),
    t: 0,
    spin: 0,
    chargeCd: 3.5,
    chargeT: 0,
    patternCd: initialPhase.patterns.map(() => 0.4),
    score: isFinal ? 25000 : 9000 + world.wave * 600,
    entering: true,
  };

  world.enemies.push(world.boss);
  return world.boss;
}
