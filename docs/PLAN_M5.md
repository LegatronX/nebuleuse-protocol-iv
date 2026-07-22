# Plan Mouvement 5 — Donner une âme au jeu

## Feuille de route
- [ ] **M5.1 — La voix du jeu (AudioSys réel)**
  - Extraction du synthétiseur FM Web Audio API, générateur 3-stems, mastering et SFX depuis `docs/logic-source-extract.js`.
  - Intégration dans `src/audio/audio.js` avec initialisation idempotente au premier geste utilisateur.
  - Persistance du mute dans `meta.muted` et liaisons de la musique aux transitions d'état.
- [ ] **M5.2 — La variété (Boss & Drops)**
  - Langage de patterns de tir et 5 boss aux identités et phases distinctes.
  - Drops aléatoires, coffres de fin de vague et vagues à thème.
- [ ] **M5.3 — La puissance et le risque (Power Fantasy & Score)**
  - Armes transformatives, aimant-à-gemmes et système de score axé sur le frôlement (graze).
- [ ] **M5.4 — L'attachement (Narration, Succès & Externalisation JSON)**
  - Narration fragmentaire, succès et externalisation complète des données en JSON.

## Statut courant
- **Étape active** : M5.1 (La voix du jeu — AudioSys réel).
