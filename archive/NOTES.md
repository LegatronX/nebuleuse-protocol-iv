# Journal de migration

## 2026-07-21 — Mouvement 1 : socle Vite + PixiJS

- Tag `v4.7-freeze` posé sur `main` (commit `7e7c699`) : point de retour absolu vers le
  monolithe Canvas 2D stable, avant toute modification de structure.
- Branche `migration/pixi-v5` créée depuis ce point.
- Réorganisation du dépôt selon le plan de Dolphin :
  - `nebuleuse.html` et `nebuleuse-v4.1.html` → `nebuleuse-v4.7.html` déplacés (`git mv`,
    historique préservé) vers `public/legacy/` — jouables tels quels à `/legacy/`.
  - `build_v41.py` → `build_v47.py` et l'ancien `manifest.json` racine déplacés vers
    `archive/` — obsolètes depuis que `vite-plugin-pwa` régénère le manifest à chaque build.
  - Icônes dupliquées : `public/icons/` (projet moderne, référencé par le plugin PWA) et
    `public/legacy/icons/` (copie autosuffisante pour le monolithe archivé). Cette
    duplication est temporaire et disparaîtra avec `public/legacy/` en fin de migration.
- Scaffold Vite posé à la racine : `package.json`, `vite.config.js`, `index.html` (coquille
  minimale), `src/main.js` (démo), `src/render/PixiRenderer.js`, `src/render/nebula.frag.js`.
- `.github/workflows/deploy.yml` : build Vite → GitHub Pages via Actions. Penser à basculer
  *Settings → Pages → Source* sur « GitHub Actions » une fois la branche fusionnée sur `main`.

### État du contrat de rendu

`src/render/IRenderer.js` (le contrat formel) et `Canvas2DRenderer.js` (le fallback) ne sont
**pas encore écrits** — c'est l'objet du mouvement 3. `docs/IRenderer-notes.txt` ne contient
pour l'instant que des notes d'usage (les verbes attendus du contrat), pas une implémentation.

### Prochaine étape

`npm install && npm run dev` — vérifier que la démo PixiJS (nébuleuse en shader + vaisseau
qui suit le pointeur + tir automatique) se lance correctement. Puis mouvement 3 : écrire
`IRenderer.js` et `Canvas2DRenderer.js` pour rendre le rendu Pixi réversible.
