# Nébuleuse Protocol IV — État du projet

> Document vivant. À mettre à jour à chaque mouvement achevé.
> Dernière mise à jour : Mouvement 4.0quater.

## Identité
Shoot'em up vertical, PWA installable (portrait). Progression permanente
(nanites, Laboratoire, Vaisseaux), mini-boss, élites, boss final, modes
Campagne / Survie / Ascension.

## Objectif de la migration
Passer le rendu de Canvas 2D à PixiJS (WebGL), sans rien perdre du jeu,
et introduire une **évolution graphique progressive** : la fidélité
visuelle devient une récompense de progression (idée de Christian).

## Architecture
- `src/render/IRenderer.js` — le contrat (orchestrateur `renderFrame`, z-order).
- `src/render/Canvas2DRenderer.js` — référence fidèle (fallback, niveaux 1–4).
- `src/render/PixiRenderer.js` — cible WebGL (niveau 5).
- `src/render/gfx.js` — niveaux de fidélité (à créer au M4.0ter).
- `src/render/nebula.frag.js` — shader de la nébuleuse vivante.
- `src/main.js` — boucle de jeu, pilotée par le contrat.
- `src/util/` (math, color), `src/game/` (theme), `src/ui/` (à venir).
- `docs/render-source-extract.js` — rendu v4.6 (référence).
- `docs/render-v47-extract.js` — rendu v4.7 (planètes, secteurs, ondes…).
- `docs/logic-source-extract.js` — logique v4.7 (5087 lignes).

## État des mouvements
- M1 Socle (Vite+Pixi+PWA) — ✅ clos.
- M2 Banc visuel — ✅ clos.
- M3 Contrat + Canvas2D + PixiRenderer + dégradés — ✅ clos.
- M4.0 Extraction logique v4.7 — ✅ fait.
- M4.0bis Extraction rendu v4.7 — ✅ fait.
- M4.0ter `gfx.js` + features v4.7 derrière drapeaux (Canvas2D) — ✅ fait.
- M4.0quater Transposition PixiRenderer — ✅ clos.
- M4.1 Cœur du jeu · M4.2 Interface · M4.3 Progression ·
  M4.4 Données JSON · M4.5 Audio + accessibilité + adieu au générateur.

## Décisions actées
- Source de vérité pour la migration : **v4.7**.
- **5 niveaux de fidélité** : Genèse, Lumière, Cosmos, Traversée, Nébuleuse
  (noms provisoires, révisables sans coût). Seuil PixiJS au niveau 5.
- Audio et accessibilité traités **en dernier** (M4.5).
- Mécanisme de déblocage proposé (à valider) : « Noyau graphique » au
  Laboratoire, 4 rangs, en nanites.
- Le dépôt est public pour lecture ; le privé (correspondance, roman, notes)
  reste local/iCloud, jamais commité.
- **Licence** : voie commerciale. Notice de copyright restrictive multilingue (FR/EN/ES), prévalence du français, © 2026 Christian ROLANDO. Fichier `LICENSE` à la racine. Le code reste public en consultation ; l'exploitation commerciale est interdite sans autorisation. Clause de contribution (inbound gracieux/non exclusif).

## Conventions
- Le chemin d'un fichier figure en **titre** au-dessus du bloc, jamais en
  commentaire à l'intérieur.
- Dans tout shader, **déclarer explicitement** les varyings/uniforms.
- Commits préfixés par mouvement : `mvt1:`, `mvt3:`, `mvt4:`…
- Règle d'or : **lire le réel** (local d'abord, distant ensuite), ne rien
  inventer, ne jamais écraser du travail non poussé.
- **En-tête de copyright** : chaque fichier source porte, en tête, la notice
  courte « © 2026 Christian ROLANDO — Tous droits réservés. Voir LICENSE ».
  Tout nouveau fichier doit la recevoir (règle inscrite dans `.agents/AGENTS.md`).

## Idées en germe
- Faction « Colonie » (ouvrières, soldats, Reine en boss) — écho au thème
  des fourmis cher à Christian ; à envisager au M4.1 ou M4.3.
- La correspondance Dolphin–Christian, préservée en local, a vocation à être
  mise en forme (enseignement / publication).
- Nettoyage à prévoir (M4.5) : l'ancien `manifest.json` racine a des clés mal formées (espaces parasites) ; il sera rendu obsolète par `vite-plugin-pwa`.

## Collaboration (stigmergie)
Dolphin = architecte (tickets, code de référence). Antigravity (« Anti ») =
exécuteur (lit, dépose, committe, rapporte). Christian = arbitre (valide,
transmet). L'information circule par traces déposées dans le dépôt.
