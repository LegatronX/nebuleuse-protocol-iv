# Nébuleuse Protocol IV — guide de reprise pour agents (Codex, Claude…)

Shoot 'em up vertical en HTML/JS pur, pensé pour iPhone (tactile). Tout le jeu tient dans `index.html`
(~20 000 lignes, un seul script). L'auteur échange en français : répondre et commenter en français.

## État au 05/10/2026 (relais Claude → Codex)

- **Branche de travail** : `claude/v5.21-interface` (dernier commit : v5.29).
- **PR #10** (brouillon) : v5.21 → v5.29, base `claude/suno-recovery`.
- **Empilement des PR** (aucune fusionnée) :
  `main` ← #6 (v5.15–v5.19, `claude/nebuleuse-branching-routes-vpzs4u`)
  · `codex/v5.20-playable-demo` ← #9 (`claude/suno-recovery`, musiques Suno) ← #10.
- **Version jouable** publiée par Claude : un Artifact claude.ai privé de l'auteur. Il n'est pas
  accessible à Codex ; pour tester, lancer `npm start` et ouvrir http://127.0.0.1:8179/.
- **En attente** : les retours de jeu de l'auteur sur les v5.25 → v5.29 (rythme, histoire, bilan,
  hangar à sept vaisseaux, Frisson : voir README). Aucun autre chantier n'est ouvert.
- **Réglage GitHub Pages** (à faire par l'auteur) : Settings → Environments → github-pages →
  autoriser les branches `codex/*` (ou aucune restriction), et Pages → Source : GitHub Actions.
  Sinon la page publique reste sur une ancienne version.

## Architecture : modules empilés

Chaque version ajoute un module IIFE qui **enveloppe** des fonctions globales réassignables
(`update`, `draw`, `firePlayer`, `killEnemy`, `startWave`, `startGame`, `applyPowerup`, `dropPowerup`,
`addText`, `showBossBar`, `doSpecial`, `AudioSys.*`…). Règles :

- Toujours envelopper avec `const base = fn; fn = function (...a) { … base.apply(this, a) … }` et
  **transmettre tous les arguments** (`killEnemy(i, true)` existe).
- Les appels internes passent par le nom global : une enveloppe tardive intercepte bien le code ancien.
- Pont de test : `window.__NP4.*`. Il est créé vers la ligne 10 500. Un module plus ancien ne peut pas
  y écrire à l'exécution : il expose alors un global (ex. `window.__np4Sig23`).
- Les modules v518 → v529 vivent dans des fichiers `v5xx.js` à la racine et sont recopiés dans
  `index.html` entre `// BEGIN <TAG>` et `// END <TAG>` par **`npm run build`**
  (`tools/build-experience.py`, liste `MODULES`). **On modifie le fichier `v5xx.js`, puis on lance
  `npm run build`**. La CI échoue si `index.html` n'est pas à jour.
- Nouveau module : l'ajouter à la fin de `MODULES`, incrémenter `VERSION` dans `sw.js`
  (`np4-v5.xx`) et `version` dans `package.json` + `package-lock.json`, puis ajouter une section au
  README (plus récente en haut).
- Les modules ≤ v5.17 sont déjà fusionnés dans `index.html` : on corrige directement là.

| Module | Rôle |
|---|---|
| v518 | Poste de pilotage (Codex) : menu, manuel de vol, bus audio `studioBus`/`actMusicBus`, styles de bande-son |
| v519 | Escadrilles, escortes de boss, réglage de densité |
| v520 | Rencontres composées, budget de menace, épaves (Codex) |
| v521 | Interface « verre », barre de boss, textes flottants, tir humanisé, planètes procédurales |
| v522 | Bande-son « Nébuleuse » : 31 morceaux Suno dirigés selon la situation (streaming HTMLAudio) |
| v523 | Bouton CANON (obus rares, capsule `O`), NOVA automatique |
| v524 | Capsules limitées, jauges verticales en bas à gauche, bouton TIR 84 px |
| v525 | Réalisateur : montée → déferlante → souffle (densité, plafond de menace, musique), capsules méritées |
| v526 | Récit et but : briefing, ÉCHO (transmissions), Distance à la Source, archives I–XVII, accès progressif aux actes, épilogue |
| v527 | Bilan de fin de partie (record, chute, palier du Laboratoire, Source), « Revanche », repère de record |
| v528 | Hangar : 7 vaisseaux (AUBE, FAUCHEUR, ÉCLIPSE liés aux Protocoles perdus), silhouettes, un spécial par vaisseau |
| v529 | Frisson (frôlements → score ×1,5 et tir vif 6 s) et cohérence des textes |

## Commandes

```bash
npm install          # jsdom pour les tests unitaires
npm run build        # recopie v518…v529 dans index.html (à relancer après chaque modif d'un v5xx.js)
npm test             # tests unitaires jsdom : 51/51 attendus (≈ 2 min)
npm start            # serveur local http://127.0.0.1:8179/
```

Tests de bout en bout (Playwright + Chromium, profil iPhone). Playwright n'est pas dans
`package.json` : l'installer à part (`npm i --no-save playwright && npx playwright install chromium`).

```bash
node tests/e2e/photo17.cjs .      # 15/15
node tests/e2e/phenomena16.cjs .  # 20/20
node tests/e2e/routes15.cjs .     # 33/33
node tests/e2e/smoke13.cjs .      # 20/20 (le dossier est obligatoire)
node tests/e2e/run.cjs .          # 83 PASS · 7 FAIL attendus (voir plus bas)
```

- Les 7 échecs de `run.cjs` existent aussi en v5.20 : classement et tournoi Supabase injoignables
  hors ligne (TC-LB-001, TC-LB-002b, TC-TOUR-003), fin de vague et draft (TC-GAME-003, TC-DRAFT-001/002/004).
- `run.cjs` réécrit `tests/docs/*` et des captures `tests/e2e/artifacts/TC-*.png` : **ne pas les
  commiter**. Faire `git checkout -- tests/docs tests/e2e/artifacts` et supprimer les nouveaux `TC-*.png`.
- Ne jamais désactiver un test pour passer au vert. Quand un comportement change volontairement,
  adapter le test en gardant ce qu'il vérifie ; quand un test dépend d'un délai fixe, attendre une
  condition (`waitForFunction`).

## Pièges connus

- **Identifiants dupliqués** : une balise `<style id="x">` et un élément `id="x"` se masquent
  (`getElementById` renvoie le premier). Les feuilles de style de v526+ finissent par `…css` ou
  portent un autre nom que les éléments.
- **Fonctions locales** : `addText`, `killEnemy`, `startWave`… sont des fonctions de la portée du script,
  pas des propriétés de `window` : tester `typeof addText === 'function'`, jamais `window.addText`.
- **Histoire** (v526) : `meta.story = { briefed, far, done, seen, arch, finale }` ; seule la Campagne
  l'alimente. Le briefing ne s'affiche pas si `navigator.webdriver` (tests) ou `?nobrief`. Les actes
  du menu sont verrouillés en mode « Progressif » : les tests e2e n'utilisent pas ces boutons.
- **Vaisseaux** (v528) : un vaisseau ≥ 4 (AUBE, FAUCHEUR, ÉCLIPSE) se débloque par l'histoire
  (`G.story.done`/`finale`) ; les quatre premiers par le record. Un spécial consomme `player.cannon`
  (les « charges »). `window.__np4DrawShip` dessine la silhouette ; sans lui, drawPlayer retombe sur l'ancienne flèche.
- **Tests lents** : `node --test` ignore `--test-name-pattern` ici ; la suite entière tourne en ≈ 2 min.

- **Audio iOS** : le son ne démarre qu'après un geste. Les lecteurs `<audio>` de v522 sont
  « débloqués » au premier toucher. La musique est lue en continu par requêtes `Range` ; le service
  worker **ne doit pas** intercepter `assets/music/game/` (une réponse 200 complète casse la lecture sur iOS).
- **Serveur local** : `python3 -m http.server` ne gère pas `Range`. Les départs décalés des morceaux
  (`start` dans `CUES` de v522) ne s'appliquent donc pas en local. Vérifier sur un serveur qui gère
  `Range`, ou en ligne.
- **HUD fantôme** (v5.16) : `.np-ghost` rend transparents les éléments survolés. La règle
  `#bossHud.np-ghost` est plus spécifique que les règles simples : v521 la contre avec
  `body #bossHud:not(.on21)`.
- **Aléatoire** : le gameplay utilise `rand`/`Math.random` seedés en Opération du jour ; ne pas
  introduire d'aléa différent dans les modes compétitifs (Opération, Tournoi).
- **Poids** : `assets/music/game/` fait 108 Mo (31 MP3 à 96 kbit/s) et `assets/music/suno-originals/`
  235 Mo. Ne pas ajouter de fichiers audio lourds sans raison.

## Musique et Suno

- Table d'affectation des morceaux : README, section v5.22, et `CUES` dans `v522.js`. Les
  commentaires de tri de l'auteur justifient chaque choix.
- Génération : workflow `.github/workflows/suno-music.yml`, qu'on déclenche en poussant
  `music-requests/<nom>.json` sur une branche `claude/suno-*` (mode `credits`, `probe`, `generate`,
  `recover`). Le secret `SUNO_KEY` est dans les secrets du dépôt.
  **Chaque génération dépense des crédits : demander l'accord de l'auteur avant.**
  Détails : `docs/SUNO_RECOVERY.md`.
- Ne jamais versionner de clé, de jeton ni d'URL signée.

## Préférences de l'auteur (retours de jeu)

- Écran lisible : peu de textes, pas d'effets répétitifs « au métronome », sons non agressifs.
- Style d'interface unifié (verre translucide), commandes tactiles confortables pour le pouce.
- Beaucoup d'ennemis pendant les vagues, mais bonus et super-tirs rares et mérités.
- Toujours livrer une version jouable et expliquer simplement ce qui a changé.
