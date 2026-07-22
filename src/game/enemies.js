// ============================================================
// Nébuleuse Protocol IV
// © 2026 Christian ROLANDO — Tous droits réservés.
// Voir le fichier LICENSE à la racine du dépôt.
// ============================================================

import { TAU, rand, clamp } from '../util/math.js';
import { world, getDiff, dm, spawnEnemy } from './engine.js';
import { AudioSys } from '../audio/audio.stub.js';
import { enemyColor } from './theme.js';

export function fireEnemyBullet(x, y, vx, vy, r = 5, color = '#f87171') {
  world.eBullets.push({ x, y, vx, vy, r, color });
}

export function fireAimed(e, speed = 220, color = '#f87171', r = 5) {
  const p = world.player;
  if (!p || !p.alive) return;
  const angle = Math.atan2(p.y - e.y, p.x - e.x);
  fireEnemyBullet(e.x, e.y, Math.cos(angle) * speed, Math.sin(angle) * speed, r, color);
}

export function fireBurst(e, count = 3, speed = 200, color = '#f87171', r = 5) {
  const p = world.player;
  if (!p || !p.alive) return;
  const baseAngle = Math.atan2(p.y - e.y, p.x - e.x);
  const spread = 0.22;
  for (let i = 0; i < count; i++) {
    const a = baseAngle + (i - (count - 1) / 2) * spread;
    fireEnemyBullet(e.x, e.y, Math.cos(a) * speed, Math.sin(a) * speed, r, color);
  }
}

export function fireFan(e, count = 5, arc = Math.PI * 0.7, speed = 180, color = '#f87171', r = 5) {
  const start = Math.PI / 2 - arc / 2;
  const step = count > 1 ? arc / (count - 1) : 0;
  for (let i = 0; i < count; i++) {
    const a = start + i * step;
    fireEnemyBullet(e.x, e.y, Math.cos(a) * speed, Math.sin(a) * speed, r, color);
  }
}

export function spawnBeam(x, width, color = '#f43f5e') {
  world.beams.push({
    x,
    width,
    color,
    life: 0,
    active: 0.9,
    total: 3.2,
  });
}

export function updateBeams(dt) {
  for (let i = world.beams.length - 1; i >= 0; i--) {
    const b = world.beams[i];
    b.life += dt;
    if (b.life >= b.total) {
      world.beams.splice(i, 1);
    }
  }
}

export function updateBoss(dt) {
  const b = world.boss;
  if (!b) return;

  b.t += dt;
  b.spin += dt * 1.2;
  b.patternTime += dt;

  const d = getDiff();
  const fireRate = dm().fire;

  if (b.entering) {
    b.y += (b.targetY - b.y) * dt * 2.2;
    if (Math.abs(b.y - b.targetY) < 4) {
      b.y = b.targetY;
      b.entering = false;
    }
    return;
  }

  b.x = world.W / 2 + Math.sin(b.t * 0.8) * (world.W * 0.32);

  const hpRatio = b.hp / b.maxHp;
  if (b.phase === 1 && hpRatio < 0.65) b.phase = 2;
  if (b.phase === 2 && hpRatio < 0.35) b.phase = 3;

  b.fireCd -= dt / fireRate;
  if (b.fireCd <= 0) {
    if (b.kind === 0) {
      fireFan(b, 7 + b.phase * 2, Math.PI * 0.8, 160 + d * 30, '#f43f5e', 6);
      b.fireCd = 1.3 - b.phase * 0.2;
    } else if (b.kind === 1) {
      fireBurst(b, 4 + b.phase, 230, '#38bdf8', 6);
      b.fireCd = 1.1 - b.phase * 0.15;
    } else if (b.kind === 2) {
      fireFan(b, 10, Math.PI * 1.1, 140, '#34d399', 5);
      b.fireCd = 1.5 - b.phase * 0.2;
    } else {
      fireFan(b, 12, Math.PI * 1.4, 180 + b.phase * 20, '#f0abfc', 6);
      if (b.phase >= 2) fireAimed(b, 260, '#f43f5e', 7);
      b.fireCd = 0.95 - b.phase * 0.15;
    }
  }

  b.minionCd -= dt;
  if (b.minionCd <= 0) {
    b.minionCd = b.finalBoss ? 4.5 : 6.0;
    const mType = pick(['drone', 'zig', 'speeder']);
    spawnEnemy(mType, b.x - 40, b.y + 20);
    spawnEnemy(mType, b.x + 40, b.y + 20);
  }

  if (b.finalBoss && b.phase >= 2 && b.patternTime > 7.0) {
    b.patternTime = 0;
    spawnBeam(b.x, 70, b.color);
  }
}

export function updateEnemies(dt) {
  const d = getDiff();
  const fireRate = dm().fire;
  const p = world.player;

  for (let i = world.enemies.length - 1; i >= 0; i--) {
    const e = world.enemies[i];
    if (e.type === 'boss') {
      updateBoss(dt);
      continue;
    }

    e.t += dt;
    e.y += e.vy * dt;

    if (e.type === 'zig') {
      e.x = e.baseX + Math.sin(e.t * 3.2) * 65;
    } else if (e.type === 'tank') {
      e.x = e.baseX + Math.sin(e.t * 0.9) * 30;
    } else if (e.type === 'miniboss') {
      e.x = world.W / 2 + Math.sin(e.t * 1.1) * (world.W * 0.28);
      if (e.y > world.H * 0.22) e.vy = 0;
    } else if (e.type === 'sentinel') {
      e.customFireCd -= dt / fireRate;
      if (e.customFireCd <= 0 && e.y > 10 && e.y < world.H * 0.6 && p && p.alive) {
        const sweepBase = e.t * 1.4;
        for (let k = -1; k <= 1; k++) {
          const a = sweepBase + k * 0.5;
          fireEnemyBullet(e.x, e.y, Math.cos(a) * (150 + d * 4), Math.sin(a) * (150 + d * 4) + 60, 5, '#facc15');
        }
        e.customFireCd = 1.6 - Math.min(0.5, d * 0.02);
      }
    } else if (e.type === 'swarmer') {
      e.x = e.baseX + Math.sin(e.t * 9) * 26;
    }

    // Tir ennemi standard
    e.fireCd -= dt / fireRate;
    if (e.fireCd <= 0 && e.y > 0 && e.y < world.H - 80 && p && p.alive) {
      if (e.type === 'turret') {
        fireAimed(e, 230 + d * 15, '#38bdf8', 6);
        e.fireCd = rand(1.1, 1.8);
      } else if (e.type === 'tank') {
        fireBurst(e, 3, 190, '#f87171', 6);
        e.fireCd = rand(2.0, 3.2);
      } else if (e.type === 'elite') {
        fireFan(e, 5, Math.PI * 0.6, 170, '#fbbf24', 5);
        e.fireCd = rand(1.4, 2.2);
      } else if (e.type === 'miniboss') {
        fireFan(e, 7, Math.PI * 0.8, 180 + d * 20, '#fbbf24', 6);
        e.fireCd = rand(1.0, 1.6);
      } else if (e.type === 'drone' && Math.random() < 0.35) {
        fireEnemyBullet(e.x, e.y, 0, 210 + d * 10, 5, '#f87171');
        e.fireCd = rand(1.8, 3.0);
      } else {
        e.fireCd = rand(1.5, 3.0);
      }
    }

    // Nettoyage hors écran
    if (e.y > world.H + 60 && e.type !== 'miniboss') {
      world.enemies.splice(i, 1);
    }
  }
}

export function updateBullets(dt, eDt) {
  const W = world.W, H = world.H;
  for (let i = world.pBullets.length - 1; i >= 0; i--) {
    const b = world.pBullets[i];
    if (b.homing) {
      let nearest = null, minDist = 400;
      for (const e of world.enemies) {
        const dist = Math.hypot(e.x - b.x, e.y - b.y);
        if (dist < minDist) { minDist = dist; nearest = e; }
      }
      if (nearest) {
        const angle = Math.atan2(nearest.y - b.y, nearest.x - b.x);
        b.vx += Math.cos(angle) * 900 * dt;
        b.vy += Math.sin(angle) * 900 * dt;
        const speed = Math.hypot(b.vx, b.vy);
        if (speed > 520) { b.vx = (b.vx / speed) * 520; b.vy = (b.vy / speed) * 520; }
      }
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.y < -30 || b.y > H + 30 || b.x < -30 || b.x > W + 30) {
      world.pBullets.splice(i, 1);
    }
  }

  for (let i = world.eBullets.length - 1; i >= 0; i--) {
    const b = world.eBullets[i];
    b.x += b.vx * eDt;
    b.y += b.vy * eDt;
    if (b.y < -30 || b.y > H + 40 || b.x < -30 || b.x > W + 30) {
      world.eBullets.splice(i, 1);
    }
  }
}
