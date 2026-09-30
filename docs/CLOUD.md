# Reprendre le jeu depuis le Cloud

La branche de référence de Claude est `claude/v5.21-interface` (PR #10). La branche de travail Codex part de son commit `421f179`. Ne pas partir de `main` ni fusionner les PR empilées.

```sh
git fetch origin
git switch codex/v5.25-cloud-validation
npm ci
npm run build
git diff --exit-code -- index.html
npm test
npx playwright install --with-deps chromium
node tests/e2e/photo17.cjs .
node tests/e2e/phenomena16.cjs .
node tests/e2e/routes15.cjs .
node tests/e2e/smoke13.cjs .
node tests/e2e/run.cjs .
```

`npm start` sert le jeu sur `http://127.0.0.1:8179/` avec les réponses HTTP 206 nécessaires aux départs décalés des MP3. Exemple : `curl -I -H 'Range: bytes=100-199' http://127.0.0.1:8179/assets/music/game/<morceau>.mp3` doit indiquer `206` et `Content-Range`.

Depuis l'iPhone, demander une modification dans la PR Codex, puis consulter les contrôles GitHub Actions. La PR vise `claude/v5.21-interface`. Le workflow « Version jouable » publie uniquement le jeu et les 31 MP3 sélectionnés, sans les originaux Suno. L'adresse prévue est `https://legatronx.github.io/nebuleuse-protocol-iv/` ; contrôler la version et une réponse 206 sur un MP3 avant de la considérer à jour. Si Pages refuse le déploiement, choisir **Settings → Pages → Build and deployment → Source → GitHub Actions** dans le dépôt. Les captures et tableaux générés par `run.cjs` restent locaux.

Les tests Chromium automatisent une interface tactile émulée. L'écoute, le confort sur iPhone physique et le plaisir de jeu demandent un essai humain.
