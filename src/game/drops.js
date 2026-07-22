// ============================================================
// Nébuleuse Protocol IV
// © 2026 Christian ROLANDO — Tous droits réservés.
// Voir le fichier LICENSE à la racine du dépôt.
// ============================================================
// Récompenses variables, Coffres de fin de vague & Aimant

import { rand, pick, clamp } from '../util/math.js';
import { AudioSys } from '../audio/audio.js';
import { addText } from './engine.js';

export const DROP_TABLE = [
  { type: 'W', w: 3 },
  { type: 'S', w: 3 },
  { type: 'H', w: 3 },
  { type: 'B', w: 2 },
  { type: 'M', w: 2 },
  { type: 'Z', w: 2 },
  { type: 'MAGNET', w: 1 }, // Rare : aimant-à-gemmes
];

export function rollDrop() {
  const total = DROP_TABLE.reduce((s, d) => s + d.w, 0);
  let r = Math.random() * total;
  for (const d of DROP_TABLE) {
    if ((r -= d.w) <= 0) return d.type;
  }
  return DROP_TABLE[0].type;
}

export function spawnChest(world) {
  world.powerups.push({
    x: world.W / 2,
    y: -30,
    t: 0,
    r: 14,
    type: 'CHEST',
    vy: 75,
    vx: 0,
  });
}

const CHEST_LOOT = [
  { type: 'W', w: 3 },
  { type: 'S', w: 3 },
  { type: 'H', w: 3 },
  { type: 'B', w: 2 },
  { type: 'M', w: 2 },
  { type: 'Z', w: 2 },
  { type: 'NANITES', w: 3 },
  { type: 'LIFE', w: 1 },
];

function rollLoot() {
  const total = CHEST_LOOT.reduce((s, d) => s + d.w, 0);
  let r = Math.random() * total;
  for (const d of CHEST_LOOT) {
    if ((r -= d.w) <= 0) return d.type;
  }
  return CHEST_LOOT[0].type;
}

export function openChest(world, x, y) {
  AudioSys.chest(x);
  addText(x, y - 20, 'COFFRE !', '#fbbf24');

  for (let i = 0; i < 3; i++) {
    const type = rollLoot();
    const a = -Math.PI / 2 + rand(-0.7, 0.7);
    const speed = rand(140, 200);
    world.powerups.push({
      x,
      y,
      t: 0,
      r: 12,
      type,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      loot: true,
    });
  }
}
