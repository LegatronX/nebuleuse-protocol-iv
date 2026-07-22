# Plan Mouvement 5 — Donner une âme au jeu

## Feuille de route
- [x] **M5.1 — La voix du jeu (AudioSys réel)**
  - Extraction du synthétiseur FM Web Audio API, générateur 3-stems, mastering et SFX depuis `docs/logic-source-extract.js`.
  - Intégration dans `src/audio/audio.js` avec initialisation idempotente au premier geste utilisateur.
  - Persistance du mute dans `meta.muted` (`nebula4_mute`) et liaisons de la musique aux transitions d'état.
  - Le stub silencieux `audio.stub.js` est retiré et n'a plus aucun import actif.
- [~] **M5.2 — La variété (Boss & Drops)** — Jalon 1 fait (patterns, drops pondérés, coffres, magnet, 2 boss : Cramoisi & Azur) ; Jalon 2 en attente (3 boss restants + vagues à thème).
- [ ] **M5.3 — La puissance et le risque (Power Fantasy & Score)**
  - Armes transformatives, aimant-à-gemmes et système de score axé sur le frôlement (graze).
- [ ] **M5.4 — L'attachement (Narration, Succès & Externalisation JSON)**
  - Narration fragmentaire, succès et externalisation complète des données en JSON.

## Statut courant
- **M5.2 Jalon 1 atteint** : Langage de patterns réutilisable (`patterns.js`), catalogue d'IA de boss (`bosses.js`), 2 premiers boss (Cramoisi & Azur), coffres de fin de vague (`CHEST`), aimant-à-gemmes (`MAGNET`), pluie de 3 loots et drops pondérés (`drops.js`).
- **Prochaine étape** : Jalon 2 M5.2 (3 boss restants + vagues à thème).
