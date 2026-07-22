// ============================================================
// Nébuleuse Protocol IV
// © 2026 Christian ROLANDO — Tous droits réservés.
// Voir le fichier LICENSE à la racine du dépôt.
// ============================================================
// Langage de patterns de tir (bullet patterns) — primitives pures.

import { TAU } from '../util/math.js';

const push = (world, x, y, a, speed, r, color) =>
  world.eBullets.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r, color });

// Tir visé vers le joueur, en éventail (PRESSION).
export function aimed(world, x, y, { speed = 240, count = 1, spread = 0, r = 5, color = '#f87171' } = {}) {
  const p = world.player;
  if (!p || !p.alive) return;
  const base = Math.atan2(p.y - y, p.x - x);
  for (let i = 0; i < count; i++) {
    push(world, x, y, base + (i - (count - 1) / 2) * spread, speed, r, color);
  }
}

// Anneau uniforme dans toutes les directions (OBSTACLE).
export function radial(world, x, y, { count = 12, speed = 180, offset = 0, r = 5, color = '#f87171' } = {}) {
  for (let i = 0; i < count; i++) {
    push(world, x, y, offset + (i / count) * TAU, speed, r, color);
  }
}

// Spirale tournante (offset = angle accumulé, géré par le boss via e.spin).
export function spiral(world, x, y, { arms = 3, speed = 160, offset = 0, r = 5, color = '#f87171' } = {}) {
  for (let k = 0; k < arms; k++) {
    push(world, x, y, offset + (k / arms) * TAU, speed, r, color);
  }
}

// Anneau lent qui sert de mur circulaire.
export function ring(world, x, y, { count = 16, speed = 110, offset = 0, r = 6, color = '#f87171' } = {}) {
  radial(world, x, y, { count, speed, offset, r, color });
}

// Rafale d'angles aléatoires (FRAÎCHEUR).
export function burst(world, x, y, { count = 8, speed = 200, r = 5, color = '#f87171' } = {}) {
  for (let i = 0; i < count; i++) {
    push(world, x, y, Math.random() * TAU, speed * (0.8 + Math.random() * 0.4), r, color);
  }
}

// Mur horizontal descendant depuis y, avec `gaps` trous répartis (OBSTACLE à traverser).
export function wall(world, x, y, { gaps = 2, speed = 150, count = 22, r = 6, color = '#f87171', W } = {}) {
  const width = W || world.W || 400;
  const holes = [];
  for (let g = 0; g < gaps; g++) {
    holes.push(Math.floor(((g + 0.5) / gaps) * count));
  }
  for (let i = 0; i < count; i++) {
    if (holes.includes(i)) continue;
    const bx = ((i + 0.5) / count) * width;
    world.eBullets.push({ x: bx, y, vx: 0, vy: speed, r, color });
  }
}

// Dispatcher : exécute un pattern par son nom (utilisé par la data des bosses).
const TABLE = { aimed, radial, spiral, ring, burst, wall };
export function runPattern(world, e, name, args) {
  const fn = TABLE[name];
  if (fn) fn(world, e.x, e.y, { color: e.color, ...args });
}
