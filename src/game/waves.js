// ============================================================
// Nébuleuse Protocol IV
// © 2026 Christian ROLANDO — Tous droits réservés.
// Voir le fichier LICENSE à la racine du dépôt.
// ============================================================

import { TAU, rand, clamp, pick } from '../util/math.js';

export const SHIPS = [
  {
    name: 'PULSE',
    desc: 'Vaisseau équilibré. Polyvalent, fiable, sans faiblesse majeure.',
    speed: 380,
    hull: 100,
    shield: 100,
    bombs: 3,
    fireMul: 1,
    weapon: 1,
    colors: ['#dffcff', '#2b7fff'],
  },
  {
    name: 'VECTOR',
    desc: 'Intercepteur très rapide, mais coque fragile. Tir plus rapide.',
    speed: 470,
    hull: 78,
    shield: 82,
    bombs: 2,
    fireMul: 0.84,
    weapon: 1,
    colors: ['#fae8ff', '#a21caf'],
  },
  {
    name: 'TITAN',
    desc: 'Blindé lourd, plus lent, mais très résistant et déjà armé.',
    speed: 310,
    hull: 145,
    shield: 130,
    bombs: 4,
    fireMul: 1.22,
    weapon: 2,
    colors: ['#d1fae5', '#047857'],
  },
];

export const DIFF = {
  normal: { hp: 1, bullet: 1, fire: 1, score: 1, playerHull: 1 },
  cauchemar: { hp: 1.6, bullet: 1.18, fire: 0.78, score: 1.6, playerHull: 0.82 },
};

export const TALENTS = [
  { key: 'armor', name: 'Blindage nanite', desc: '+12 coque max par niveau', max: 5, cost: (l) => 40 + l * 30 },
  { key: 'regen', name: 'Régénération', desc: '+2 bouclier/s par niveau', max: 4, cost: (l) => 45 + l * 35 },
  { key: 'weapon', name: 'Armement initial', desc: '+1 arme de départ par niveau', max: 2, cost: (l) => 90 + l * 80 },
  { key: 'nova', name: 'Réacteur NOVA', desc: '+2 énergie/s par niveau', max: 4, cost: (l) => 40 + l * 30 },
  { key: 'bombs', name: 'Soute à bombes', desc: '+1 bombe par niveau', max: 2, cost: (l) => 70 + l * 60 },
  { key: 'credit', name: 'Extracteur de nanites', desc: '+10% nanites gagnés par niveau', max: 5, cost: (l) => 50 + l * 40 },
  { key: 'life', name: 'Noyau de survie', desc: '+1 vie', max: 1, cost: () => 180 },
];

export const SECTORS = [
  { name: 'Secteur 01 — La ceinture de débris', startWave: 1, bg1: '#020617', bg2: '#090d26', accent: '#38bdf8' },
  { name: 'Secteur 02 — Champ de mines ioniques', startWave: 5, bg1: '#050518', bg2: '#1a072b', accent: '#c084fc' },
  { name: 'Secteur 03 — La frontière morte', startWave: 10, bg1: '#120309', bg2: '#260614', accent: '#fb7185' },
];

export const SECTOR_PALETTES = [
  { nebula1: 'rgba(99,102,241,0.08)', nebula2: 'rgba(14,165,233,0.08)', star: '#dcf5ff' },
  { nebula1: 'rgba(192,132,252,0.11)', nebula2: 'rgba(236,72,153,0.09)', star: '#f5d0fe' },
  { nebula1: 'rgba(251,113,133,0.12)', nebula2: 'rgba(244,63,94,0.09)', star: '#fecdd3' },
];

export const MUTATORS = {
  speed: { name: 'Vitesse Lumière', desc: 'Vitesse des tirs et ennemis +30%. Score +25%.', score: 1.25, hp: 1, fire: 0.77 },
  glass: { name: 'Canon de Verre', desc: 'Dégâts infligés et subis doublés. Score +40%.', score: 1.4, hp: 0.5, fire: 1 },
  nanite_rain: { name: 'Pluie de Nanites', desc: 'Nanites quadruplés, ennemis +50% PV.', score: 1, hp: 1.5, fire: 1 },
  boss_rush: { name: 'Boss Rush', desc: 'Des boss plus fréquents et plus coriaces. Score +50%.', score: 1.5, hp: 1.3, fire: 0.85 },
  bullet_hell: { name: 'Enfer de Projectiles', desc: 'Densité des tirs augmentée. Score +35%.', score: 1.35, hp: 1.1, fire: 0.7 },
  pacifist_challenge: { name: 'Défi de Frôlement', desc: 'Frôlements rapportent 3x plus de points.', score: 1, hp: 1, fire: 1 },
};

export const TRAILS = [
  { id: 'cyan', name: 'Plasma Cyan', color: '#38bdf8' },
  { id: 'magenta', name: 'Néon Violet', color: '#c084fc' },
  { id: 'amber', name: 'Énergie Ambre', color: '#fbbf24' },
  { id: 'emerald', name: 'Matrice Émeraude', color: '#34d399' },
  { id: 'fire', name: 'Surchauffe', color: '#f43f5e' },
];

export const ACHIEVEMENTS = [
  { id: 'first_kill', name: 'Premier Sang', desc: 'Détruire votre premier ennemi.', icon: '💥' },
  { id: 'wave_5', name: 'Vétéran du Secteur 1', desc: 'Atteindre la vague 5.', icon: '🛡️' },
  { id: 'wave_10', name: 'Explorateur de l\'Abysse', desc: 'Atteindre la vague 10.', icon: '🌌' },
  { id: 'boss_1', name: 'Tueur de Titants', desc: 'Vaincre un boss.', icon: '👑' },
  { id: 'graze_master', name: 'Maître du Frôlement', desc: 'Effectuer un enchaînement de 20 frôlements.', icon: '⚡' },
  { id: 'score_100k', name: 'As du Pilotage', desc: 'Atteindre un score de 100 000 points.', icon: '🏆' },
];

export function getWaveTypes(n) {
  const a = ['drone', 'drone', 'zig', 'speeder'];
  if (n >= 2) a.push('tank', 'zig', 'sentinel');
  if (n >= 4) a.push('splitter', 'turret', 'swarmer');
  if (n >= 5) a.push('elite', 'speeder');
  if (n >= 6) a.push('tank', 'elite');
  return a;
}

export function currentSectorIndex(wave) {
  if (wave >= 10) return 2;
  if (wave >= 5) return 1;
  return 0;
}
