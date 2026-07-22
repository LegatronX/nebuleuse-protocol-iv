// ============================================================
// Nébuleuse Protocol IV
// © 2026 Christian ROLANDO — Tous droits réservés.
// Voir le fichier LICENSE à la racine du dépôt.
// ============================================================

# Plan de Migration M4.1 — Cœur du Jeu

> **JALONS D'ARRÊT : après M4.1a et après M4.1c**

## Sous-étapes & Statut

- [ ] **M4.1a** : world réel, meta, boucle, spawner (`src/game/engine.js`, `src/game/meta.js`, `src/game/waves.js`, orchestration `main.js`, HUD DOM minimal).
- [ ] **M4.1b** : ennemis, tirs, faisceaux (comportements de tous les types d'ennemis, tirs, faisceaux boss).
- [ ] **M4.1c** : collisions, graze, score, bombe, NOVA (collisions, frôlements, score, bombe, NOVA, game over).
- [ ] **M4.1d** : joueur complet (pilotage, tir, bouclier, coque, invulnérabilité, tilt, talents meta).
- [ ] **M4.1e** : bonus, particules, textes, ondes (powerups, particules, float texts, ondes chromatiques, polish final).

## Jalons d'arrêt & Validation

- **Jalon 1 (après M4.1a)** : Commit `mvt4: M4.1a — world, meta, boucle, spawner`, push, et arrêt pour validation Dolphin.
- **Jalon 2 (après M4.1c)** : Commit `mvt4: M4.1c — collisions, graze, score, bombe, NOVA`, push, et arrêt pour validation Dolphin.
