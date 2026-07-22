// ============================================================
// Nébuleuse Protocol IV
// © 2026 Christian ROLANDO — Tous droits réservés.
// Voir le fichier LICENSE à la racine du dépôt.
// ============================================================

import { rand, clamp } from '../util/math.js';
import { world, getScoreMult, triggerCamPunch, triggerHitStop, gameOver } from './engine.js';
import { saveBest } from './meta.js';
import { addText } from './engine.js';
import { AudioSys } from '../audio/audio.stub.js';

export function addScore(pts) {
  const mult = world.multiplier * getScoreMult();
  const gained = Math.round(pts * mult);
  world.score += gained;
  if (world.score > world.best) {
    world.best = world.score;
    saveBest(world.best);
  }
}

export function registerGraze(x, y, color = '#67e8f9') {
  const p = world.player;
  if (!p || !p.alive) return;

  world.grazes++;
  world.grazeChain++;
  world.grazeChainTime = 1.6;
  if (world.grazeChain > world.bestGrazeChain) world.bestGrazeChain = world.grazeChain;

  const pts = 60 + Math.min( world.grazeChain * 15, 300);
  addScore(pts);

  world.multiplier = Math.min(4, world.multiplier + 0.05);
  world.multTime = 3.5;

  p.energy = Math.min(p.maxEnergy, p.energy + 3.5);

  addText(x, y - 10, `FRÔLEMENT +${pts}`, color);
  AudioSys.graze();
}

export function explosion(x, y, color = '#38bdf8', size = 30, isBoss = false) {
  const count = isBoss ? 45 : Math.round(size * 0.8);
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(40, isBoss ? 320 : 180);
    world.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: rand(2, isBoss ? 6 : 4),
      color,
      life: rand(0.3, isBoss ? 1.2 : 0.7),
      maxLife: isBoss ? 1.2 : 0.7,
    });
  }

  // Ondes chromatiques avec color / color2 / thick (M4.0quater)
  world.shockwaves.push({
    x,
    y,
    r: 10,
    maxR: isBoss ? size * 4 : size * 2.2,
    color,
    color2: '#ec4899',
    thick: isBoss ? 16 : 10,
    life: isBoss ? 0.8 : 0.45,
    maxLife: isBoss ? 0.8 : 0.45,
  });

  world.shake = Math.min(25, world.shake + (isBoss ? 14 : size * 0.18));
  triggerCamPunch(isBoss ? 0.08 : 0.035, isBoss ? 0.22 : 0.12);
  AudioSys.explosion(isBoss);
}

export function dropPowerup(x, y) {
  const chance = 0.22;
  if (Math.random() < chance) {
    const types = ['hull', 'shield', 'weapon', 'bomb', 'energy'];
    const weights = [0.25, 0.35, 0.2, 0.08, 0.12];
    let r = Math.random(), sum = 0, chosen = 'hull';
    for (let i = 0; i < types.length; i++) {
      sum += weights[i];
      if (r <= sum) { chosen = types[i]; break; }
    }
    world.powerups.push({ x, y, vy: 65, type: chosen, r: 12, t: rand(0, Math.PI * 2) });
  }
}

export function killEnemy(e) {
  world.gameKills++;
  addScore(e.score);

  if (e.type === 'boss') {
    world.runBossKills++;
    explosion(e.x, e.y, e.color || '#f0abfc', 70, true);
    if (e.finalBoss) world.finalDefeated = true;
  } else if (e.type === 'miniboss') {
    world.runBossKills++;
    explosion(e.x, e.y, '#fbbf24', 50, true);
  } else {
    explosion(e.x, e.y, e.elite ? '#fbbf24' : '#38bdf8', e.r * 1.5, false);
  }

  dropPowerup(e.x, e.y);

  const idx = world.enemies.indexOf(e);
  if (idx !== -1) world.enemies.splice(idx, 1);
}

export function damagePlayer(damage) {
  const p = world.player;
  if (!p || !p.alive || p.invuln > 0) return;

  world.hitFlash = 0.35;
  world.shake = Math.min(22, world.shake + 9);
  triggerCamPunch(0.06, 0.18);
  triggerHitStop(0.08);

  let remain = damage;
  if (p.shield > 0) {
    if (p.shield >= remain) {
      p.shield -= remain;
      remain = 0;
    } else {
      remain -= p.shield;
      p.shield = 0;
    }
  }

  if (remain > 0) {
    p.hull -= remain;
    if (p.hull <= 0) {
      p.hull = 0;
      loseLife();
      return;
    }
  }

  p.invuln = 1.2;
  AudioSys.hit();
}

export function loseLife() {
  const p = world.player;
  if (!p) return;

  p.lives--;
  explosion(p.x, p.y, '#60a5fa', 40, false);

  if (p.lives <= 0) {
    p.alive = false;
    gameOver();
  } else {
    p.hull = p.maxHull * 0.7;
    p.shield = p.maxShield;
    p.invuln = 2.5;
    p.x = world.W / 2;
    p.y = world.H * 0.78;
  }
}

export function doBomb() {
  const p = world.player;
  if (!p || !p.alive || p.bombs <= 0) return;

  p.bombs--;
  world.shake = 22;
  world.hitFlash = 0.5;
  triggerCamPunch(0.09, 0.25);

  // Nettoyage des tirs ennemis
  world.eBullets = [];

  // Dégâts à tous les ennemis
  for (let i = world.enemies.length - 1; i >= 0; i--) {
    const e = world.enemies[i];
    e.hp -= 280;
    if (e.hp <= 0) killEnemy(e);
  }

  world.shockwaves.push({
    x: p.x,
    y: p.y,
    r: 10,
    maxR: world.W * 1.2,
    color: '#60a5fa',
    color2: '#a5f3fc',
    thick: 20,
    life: 0.7,
    maxLife: 0.7,
  });

  AudioSys.bomb();
}

export function doSpecial() {
  const p = world.player;
  if (!p || !p.alive || p.energy < p.maxEnergy) return;

  p.energy = 0;
  triggerCamPunch(0.06, 0.2);

  // Vague NOVA de projectiles à tête chercheuse
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    world.pBullets.push({
      x: p.x,
      y: p.y,
      vx: Math.cos(a) * 380,
      vy: Math.sin(a) * 380,
      r: 6,
      homing: true,
    });
  }

  AudioSys.special();
}

export function updateCollisions() {
  const p = world.player;
  if (!p || !p.alive) return;

  // 1. Tirs joueur vs Ennemis
  for (let i = world.pBullets.length - 1; i >= 0; i--) {
    const b = world.pBullets[i];
    for (let j = world.enemies.length - 1; j >= 0; j--) {
      const e = world.enemies[j];
      const dist = Math.hypot(b.x - e.x, b.y - e.y);
      if (dist < b.r + e.r) {
        e.hp -= 18;
        world.pBullets.splice(i, 1);
        if (e.hp <= 0) killEnemy(e);
        break;
      }
    }
  }

  // 2. Tirs ennemis vs Joueur + Frôlements (Graze)
  for (let i = world.eBullets.length - 1; i >= 0; i--) {
    const b = world.eBullets[i];
    const dist = Math.hypot(b.x - p.x, b.y - p.y);

    if (dist < b.r + p.r) {
      world.eBullets.splice(i, 1);
      damagePlayer(18);
    } else if (dist < b.r + p.r + 22 && !b.grazed && p.invuln <= 0) {
      b.grazed = true;
      registerGraze(b.x, b.y, b.color);
    }
  }

  // 3. Ennemis vs Joueur
  for (let i = world.enemies.length - 1; i >= 0; i--) {
    const e = world.enemies[i];
    const dist = Math.hypot(e.x - p.x, e.y - p.y);
    if (dist < e.r + p.r) {
      damagePlayer(35);
      if (e.type !== 'boss' && e.type !== 'miniboss') {
        killEnemy(e);
      }
    }
  }

  // 4. Faisceaux vs Joueur
  for (const beam of world.beams) {
    if (beam.life >= beam.active) {
      const left = beam.x - beam.width / 2;
      const right = beam.x + beam.width / 2;
      if (p.x >= left - p.r && p.x <= right + p.r && p.y >= 100) {
        damagePlayer(45 * 0.016);
      }
    }
  }

  // 5. Powerups vs Joueur (Magnet & Collecte)
  for (let i = world.powerups.length - 1; i >= 0; i--) {
    const pw = world.powerups[i];
    const dist = Math.hypot(pw.x - p.x, pw.y - p.y);
    if (dist < 140) {
      const angle = Math.atan2(p.y - pw.y, p.x - pw.x);
      pw.x += Math.cos(angle) * 320 * 0.016;
      pw.y += Math.sin(angle) * 320 * 0.016;
    }
    if (dist < pw.r + p.r + 6) {
      const type = pw.type;
      world.powerups.splice(i, 1);
      import('./engine.js').then(({ applyPowerup }) => applyPowerup(type));
    }
  }
}
