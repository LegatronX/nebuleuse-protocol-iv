// ============================================================
// Nébuleuse Protocol IV
// © 2026 Christian ROLANDO — Tous droits réservés.
// Voir le fichier LICENSE à la racine du dépôt.
// ============================================================
// src/game/theme.js
// Palettes de couleurs par type, identiques au monolithe (nebuleuse-v4.6.html).

const ENEMY_COLORS = {
  drone: '#f87171',
  zig: '#fbbf24',
  speeder: '#f472b6',
  tank: '#c084fc',
  splitter: '#34d399',
  turret: '#94a3b8',
  elite: '#fb7185',
  mini: '#f87171',
  miniboss: '#fbbf24',
  boss: '#f43f5e',
};

const POWER_COLORS = {
  W: '#67e8f9', weapon: '#67e8f9',
  S: '#60a5fa', shield: '#60a5fa',
  H: '#34d399', hull: '#34d399',
  B: '#fb7185', bomb: '#fb7185',
  M: '#fbbf24', energy: '#fbbf24',
  Z: '#c084fc',
  CHEST: '#fbbf24',
  MAGNET: '#f472b6',
  NANITES: '#67e8f9',
  LIFE: '#fb7185',
};

export function enemyColor(type) {
  return ENEMY_COLORS[type] || '#ffffff';
}

export function powerColor(type) {
  return POWER_COLORS[type] || '#ffffff';
}
