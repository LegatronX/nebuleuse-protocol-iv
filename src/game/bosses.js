// ============================================================
// Nébuleuse Protocol IV
// © 2026 Christian ROLANDO — Tous droits réservés.
// Voir le fichier LICENSE à la racine du dépôt.
// ============================================================
// IA & Phases des Boss — Catalogue Mouvement 5.2

import { runPattern } from './patterns.js';
import { clamp } from '../util/math.js';

export const BOSS = {
  1: { // LE CRAMOISI — « Le Bélier » : charges + éventails courts
    name: 'BOSS CRAMOISI',
    color: '#f43f5e',
    phases: [
      {
        untilHp: 0.5,
        move: 'descend_hover',
        patterns: [
          { name: 'aimed', every: 1.1, args: { count: 3, spread: 0.22, speed: 250 } },
          { name: 'burst', every: 2.6, args: { count: 6, speed: 190 } },
        ],
      },
      {
        untilHp: 0.0,
        move: 'charge',
        patterns: [
          { name: 'aimed', every: 0.7, args: { count: 5, spread: 0.16, speed: 280 } },
          { name: 'radial', every: 2.2, args: { count: 14, speed: 150 } },
        ],
      },
    ],
  },
  2: { // L'AZUR — « Le Géomètre » : spirales + murs à trous
    name: 'BOSS AZUR',
    color: '#38bdf8',
    phases: [
      {
        untilHp: 0.5,
        move: 'hover_sway',
        patterns: [
          { name: 'spiral', every: 0.18, args: { arms: 3, speed: 150 } },
          { name: 'aimed', every: 1.6, args: { count: 1, speed: 300 } },
        ],
      },
      {
        untilHp: 0.0,
        move: 'hover_sway',
        patterns: [
          { name: 'wall', every: 2.4, args: { gaps: 2, speed: 140, count: 20 } },
          { name: 'ring', every: 1.8, args: { count: 18, speed: 120 } },
        ],
      },
    ],
  },
};

export const BOSS_COUNT = 2; // Jalon 1 (passera à 5 au Jalon 2)

const MOVES = {
  descend_hover(world, e, dt) {
    const targetY = e.stopY || 120;
    if (e.y < targetY) {
      e.y += dt * 70;
    } else {
      MOVES.hover_sway(world, e, dt);
    }
  },

  hover_sway(world, e, dt) {
    const targetY = e.stopY || 120;
    e.y += (targetY - e.y) * dt * 2.0;
    const amplitude = Math.max(80, (world.W / 2) - 80);
    e.x = world.W / 2 + Math.sin(e.t * 0.6) * amplitude;
  },

  charge(world, e, dt) {
    const targetY = e.stopY || 120;
    const p = world.player;
    e.chargeCd = (e.chargeCd || 3.5) - dt;

    if (e.chargeCd <= 0 && (!e.chargeT || e.chargeT <= 0)) {
      e.chargeT = 0.65;
      e.chargeCd = 3.8;
      if (p && p.alive) {
        const angle = Math.atan2(p.y - e.y, p.x - e.x);
        e.chargeVx = Math.cos(angle) * 340;
        e.chargeVy = Math.sin(angle) * 340;
      } else {
        e.chargeVx = 0;
        e.chargeVy = 340;
      }
    }

    if (e.chargeT > 0) {
      e.chargeT -= dt;
      e.x += e.chargeVx * dt;
      e.y += e.chargeVy * dt;
      e.x = clamp(e.x, 40, world.W - 40);
      e.y = clamp(e.y, 60, world.H - 120);
    } else {
      e.y += (targetY - e.y) * dt * 2.5;
      const amplitude = Math.max(80, (world.W / 2) - 80);
      const targetX = world.W / 2 + Math.sin(e.t * 0.6) * amplitude;
      e.x += (targetX - e.x) * dt * 2.0;
    }
  },
};

export function nextBossId(world) {
  world.bossCount = (world.bossCount || 0) + 1;
  return ((world.bossCount - 1) % BOSS_COUNT) + 1;
}

export function updateBossAI(world, e, dt) {
  if (!e) return;

  e.t = (e.t || 0) + dt;
  e.spin = (e.spin || 0) + dt * 1.2;

  if (e.entering) {
    const targetY = e.stopY || 120;
    e.y += (targetY - e.y) * dt * 2.2;
    if (Math.abs(e.y - targetY) < 4) {
      e.y = targetY;
      e.entering = false;
    }
    return;
  }

  const def = BOSS[e.bossId] || BOSS[1];
  let phaseIdx = e.phaseIndex || 0;
  const hpRatio = e.hp / e.maxHp;

  // Phase transition check
  if (hpRatio <= def.phases[phaseIdx].untilHp && (phaseIdx + 1) < def.phases.length) {
    phaseIdx++;
    e.phaseIndex = phaseIdx;
    e.patternCd = def.phases[phaseIdx].patterns.map(() => 0.4);
  }

  const currentPhase = def.phases[phaseIdx];

  // Move update
  const moveFn = MOVES[currentPhase.move] || MOVES.hover_sway;
  moveFn(world, e, dt);

  // Pattern updates
  if (!e.patternCd || e.patternCd.length !== currentPhase.patterns.length) {
    e.patternCd = currentPhase.patterns.map(() => 0.4);
  }

  for (let i = 0; i < currentPhase.patterns.length; i++) {
    const pat = currentPhase.patterns[i];
    e.patternCd[i] -= dt;
    if (e.patternCd[i] <= 0) {
      runPattern(world, e, pat.name, pat.args);
      e.patternCd[i] = pat.every;
    }
  }
}
