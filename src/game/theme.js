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
  W: '#67e8f9',
  S: '#60a5fa',
  H: '#34d399',
  B: '#fb7185',
  M: '#fbbf24',
  Z: '#c084fc',
};

export function enemyColor(type) {
  return ENEMY_COLORS[type] || '#ffffff';
}

export function powerColor(type) {
  return POWER_COLORS[type] || '#ffffff';
}
