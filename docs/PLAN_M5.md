# Plan Mouvement 5 — Donner une âme au jeu

## Feuille de route
- [x] **M5.1 — La voix du jeu (AudioSys réel)**
  - Extraction initiale de l'AudioSys du monolithe et suppression du stub.
- [x] **M5.1b — Composition sonore originale (Chant, Sections & Micro-variations)**
  - Remplacement complet de la musique procédurale par une composition originale (lead chantant A5-C6-A5, accords Synthwave, batterie).
  - Horloge de précision Lookahead Scheduler Web Audio API (zero drift).
  - Transductions de sections (menu ambiant 70 BPM → jeu 120 BPM → boss tendu 138 BPM → jingles 1-shot).
  - Timbres SFX distincts avec micro-variation aléatoire (±1 à 2 demi-tons sur tirs, frôlements).
  - Mix anti-énervement : musique sous les SFX (`musicGain` 0.35), passe-haut master 70Hz, compresseur anti-clipping (-12dB).
- [~] **M5.2 — La variété (Boss & Drops)** — Jalon 1 fait (patterns, drops pondérés, coffres, magnet, 2 boss : Cramoisi & Azur) ; Jalon 2 **suspendu** (en attente de validation à l'oreille par Christian).
- [ ] **M5.3 — La puissance et le risque (Power Fantasy & Score)**
  - Armes transformatives, aimant-à-gemmes et système de score axé sur le frôlement (graze).
- [ ] **M5.4 — L'attachement (Narration, Succès & Externalisation JSON)**
  - Narration fragmentaire, succès et externalisation complète des données en JSON.

## Statut courant
- **M5.1b achevé** : Bande-son originale interactive complète branchée avec sections, timbres distincts et micro-variation.
- **Prochaine étape** : Validation à l'oreille par Christian de la bande-son M5.1b avant de reprendre le Jalon 2 du M5.2 (3 boss restants + vagues à thème).
