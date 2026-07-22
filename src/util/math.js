// ============================================================
// Nébuleuse Protocol IV
// © 2026 Christian ROLANDO — Tous droits réservés.
// Voir le fichier LICENSE à la racine du dépôt.
// ============================================================
// src/util/math.js
// Petits utilitaires numériques, identiques au monolithe (nebuleuse-v4.6.html).

export const TAU = Math.PI * 2;

export const rand = (a, b) => a + Math.random() * (b - a);

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
