# Nébuleuse Protocol IV

Petit shoot 'em up vertical en HTML/CSS/JS pur (aucune dépendance), jouable directement dans un navigateur.

## v5.19 — Escadrilles et bande-son studio

- **Plus d'ennemis** (`v519.js`). Mesuré sur 70 s d'Acte I avec la même seed : 2,9 ennemis à l'écran hors boss en mode Classique, 6,6 en Intense (défaut), 7,8 en Déchaînée. Le jeu était clairsemé depuis la v5.14, pas seulement depuis la v5.18.
  - Les ennemis légers (drone, zig, speeder) arrivent avec 1 à 3 ailiers en formation. Leurs tirs sont décalés pour éviter les rafales synchronisées.
  - La cadence des vagues est resserrée.
  - Les Actes II à V, déjà plus denses, reçoivent un renfort modéré.
  - Pendant un boss (hors boss final), des escortes entrent régulièrement. Elles se désintègrent quand le boss tombe, sans retarder la fin de vague ni la bifurcation.
  - Réglage « Densité des vagues » : Classique (comportement d'avant), Intense ou Déchaînée. L'Opération du jour et le Tournoi restent en Intense, pour que les scores restent comparables.
  - Pendant un phénomène v5.16, aucun ailier n'est ajouté.
- **Musique** : la bande-son **studio**, c'est-à-dire les pistes enregistrées de chaque acte, redevient la bande-son par défaut. L'aperçu v5.18 imposait la partition synthétisée « Évolutive » et coupait aussi les musiques des Actes II à V. La partition évolutive reste disponible dans les Réglages. Une sauvegarde passée en « Évolutive » par défaut revient au studio ; un choix fait explicitement par le joueur est conservé.
- `tools/build-experience.py` synchronise maintenant `v518.js` et `v519.js`.

## v5.18 — Poste de pilotage (aperçu)

Cette branche part de la **v5.17** (`5ed5fbf`, branche `claude/nebuleuse-branching-routes-vpzs4u`). Les routes, phénomènes, collections et le mode photo sont conservés.

- **Accueil repensé** : lancement prioritaire, aperçu du vaisseau équipé, accès aux cinq actes, modes accompagnés d'une description, journal de bord repliable. Mise en page adaptée au mobile et au bureau, sans police externe.
- **Partition évolutive originale** : cinq palettes harmoniques, quatre sections, phrases mélodiques avec silences, variation de l'orchestration, tension du combat et tempo des boss. Changements à la mesure, voix limitées et nettoyage des nœuds. Aucune modification du hasard du gameplay.
- **Choix audio** : bande-son évolutive ou studio, tirs feutrés propres à chaque vaisseau ou tirs arcade. Réglages sauvegardés et aucune ressource audio supplémentaire à télécharger pour la nouvelle partition.
- **Mixage corrigé** : une seule bande musicale audible, volume musique appliqué aux actes II–V et à leurs ambiances, reprise du chargement lors d'un accès direct à un acte, coupure du son respectée même pendant un climax et dans un onglet masqué.
- **Confort** : manuel de vol accessible avant la partie et depuis la pause, résumé de la situation en pause, bascule du tir automatique, charge NOVA et stock de bombes lisibles, Échap pour mettre en pause. Les touches utilisées dans les réglages ne démarrent plus une partie par inadvertance.

### Essayer et vérifier

Le jeu livré reste statique, sans dépendance JavaScript à installer pour jouer. Servir le dossier avec `python3 -m http.server 8178 --bind 127.0.0.1`, puis ouvrir `http://127.0.0.1:8178`.

Pour le développement (Node 20+, Python 3) :

```sh
npm ci
npm run build
npm test
node tools/render-score.cjs /tmp/nebuleuse-extrait.wav
```

`experience/score.js` contient le compositeur indépendant ; `experience/bridge.css` l'habillage ; `v518.js` l'intégration dans le jeu. Après modification de `v518.js`, `npm run build` synchronise son bloc dans `index.html`. Les nouveaux fichiers sont préchargés par le service worker v5.18.

Les tests couvrent le son, les transitions et les commandes avec un DOM et des interfaces audio simulés. Le rendu audio hors navigateur vérifie également des échantillons réels. **Le rendu graphique, WebGL, les gestes tactiles et le mixage final sur appareils restent à vérifier avant publication.** Voir `verifier/runs/2026-09-25-v518-preview.md`.

**▶ Jouer : https://legatronx.github.io/nebuleuse-protocol-iv/** — installable sur l'écran d'accueil (iPhone : Partager → « Sur l'écran d'accueil »), jouable hors ligne après la première visite.

## Fichiers

- `nebuleuse.html` — version source d'origine
- `build_v41.py` → génère `nebuleuse-v4.1.html`
  - système de frôlements (score + chaîne + énergie NOVA)
  - vibrations mobiles
  - reprise avec compte à rebours
  - rendu adaptatif (bas de gamme / réduction des animations)
  - HUD limité à 30 Hz
  - correction du paiement multiple des nanites en fin de run
- `build_v42.py` (appliqué sur `nebuleuse-v4.1.html`) → génère `nebuleuse-v4.2.html`
  - dash (Maj/V, ou auto-directionnel loin du danger sur mobile)
  - aimant à bonus
  - formations d'ennemis (V, mur, pince)
  - cap de particules adaptatif basé sur la perf réelle
  - vignette d'alerte coque basse
- `build_v43.py` (appliqué sur `nebuleuse-v4.2.html`) → génère `nebuleuse-v4.3.html`
  - nébuleuses procédurales animées et dérive de planètes en parallaxe
  - ondes de choc visuelles chromatiques d'expansion rapide (Heavy, Boss & Bombes)
  - synthesizer BGM avec basse synthwave 16th arpeggiée et accélération BPM Boss
- `build_v44.py` (appliqué sur `nebuleuse-v4.3.html`) → génère `nebuleuse-v4.4.html` — Phase 1 du plan premium (feel & résilience)
  - hit-stop (freeze-frame) sur boss/mini-boss tués, vie perdue, bombe, NOVA
  - pulse de zoom caméra sur ces mêmes moments (désactivé si `prefers-reduced-motion`)
  - carte d'intro de boss
  - récap combo/chaîne de frôlement en fin de run
  - écran de récupération anti-crash (plus de freeze silencieux en cas d'erreur moteur)
- `build_v45.py` → `nebuleuse-v4.5.html` — Phase 2 (contenu & progression)
- `build_v46.py` → `nebuleuse-v4.6.html` — Phase 3 (succès & sauvegarde exportable)
- `build_v47.py` → `nebuleuse-v4.7.html` — Phase 4 (PWA, réglages unifiés, palette daltonien, auto-bombe)

## v5 — Édition Premium (nouvelle architecture)

`index.html` + dossier `assets/` : le jeu n'est plus mono-fichier depuis la v5.7, afin d'utiliser une **bande-son studio** (vrais échantillons audio générés par IA) à la place du synthétiseur temps réel.

### Nouveautés v5

- **Audio premium v5.1** : compresseur master, reverb à convolution, délai sync tempo, séquenceur à lookahead, voix supersaw/sub, couches adaptatives
- **Pack addiction v5.3** : draft roguelite (12 upgrades), missions quotidiennes seedées, coffre quotidien à série, surcharge + bullet-time, XP vaisseaux, fantôme rival
- **Musique V3 v5.4** : mélodies classiques libres de droits (Grieg, Beethoven, Dies Irae) — conservées en repli si les assets sont absents
- **Boss & armes v5.5** : 4 archétypes de boss + boss final hybride, armes signature par vaisseau (pierce VECTOR, rail TITAN, homing MIRAGE, bonus PULSE), 6 prototypes
- **Impacts & flow v5.6** : sub-hits graves, salves casino, astéroïdes à esquiver, draft en temps réel (capsules à survoler), HUD assombri pendant les boss
- **Bande-son studio v5.7** : 4 boucles musicales échantillonnées (menu/combat/boss/final) avec fondus enchaînés pilotés par l'état du jeu, SFX premium échantillonnés, fond de menu + emblème générés par IA
- **Classement mondial v5.8** : scores en ligne via Supabase (table `nebuleuse_scores`, RLS lecture/insertion publiques), publication auto en fin de run avec pseudo sauvegardé, écran Top 10 mondial, rang estimé après publication

- **Rendu GPU v5.14** : pipeline de post-traitement WebGL2 superposé au canvas 2D (`v514.js`, intégré à `index.html`) — bloom HDR multi-échelles (seuil doux, moyenne de Karis, chaîne dual-filter), halos anamorphiques, réfraction des ondes de choc avec dispersion chromatique, éclairage dynamique (explosions, réacteur, boss éclairent le décor), aberration à l'impact, flou radial en bullet-time, adaptation d'exposition automatique, épaule filmique et dithering. Réglage *Effets GPU* (Auto / Cinéma / Désactivés) ; le mode Auto rétrograde seul si la frame dépasse le budget, respecte « réduire les animations » et se replie sur le canvas 2D si WebGL2 est absent ou le contexte perdu.

- **Routes ramifiées v5.15** : après chaque boss non final (Acte I, Survie, Opération du jour, Tournoi), le portail linéaire laisse place à une **bifurcation** de 2 ou 3 destinations, chacune annonçant son risque et sa récompense avant le choix ; la route reste active jusqu'au boss suivant (`v515.js`, intégré à `index.html`).
  - 🔥 *Forge solaire* — ennemis agressifs (cadence +35 %, vitesse +20 %) → pièces ×2, score +25 %
  - ⚛️ *Anomalie quantique* — projectiles ennemis ondulants → prototypes rares sur les mini-boss, surcharge Q
  - 🌑 *Vide profond* — visibilité réduite → réparation complète, +1 vie et bouclier max +20 en sortie
  - 📡 *Signal inconnu* (rare, jamais avant le boss final) — boss alternatif « Écho de la Prime » → butin massif, prototype garanti, archive narrative
  - Déterministe : offres tirées d'un PRNG dédié (seed de l'Opération du jour, du Tournoi ou `?seed=…`), sans consommer `Math.random`.
  - Sauvegarde : statistiques additives dans `meta.routes` ; point de reprise à chaque bifurcation (`nebula4_route`, Campagne/Survie, consommé à la reprise) → bouton « ⏯ Reprendre la route » au menu.
  - Tests : `tests/e2e/routes15.cjs` (parcours complet sur contexte tactile iPhone).
  - Visuels : cartes illustrées par le décor du secteur de destination (travelling lent, entrée échelonnée, reflet à la sélection, halo teinté), saut hyperspatial à l'engagement, ambiances par route (braises et ennemis incandescents dans la Forge, fantômes de superposition des projectiles quantiques, sonar et étoiles scintillantes dans le Vide, lignes de balayage et interférences du Signal, halo doré de l'Écho), éclairs de lumière GPU via `__NP4.fx.light`. Coût mesuré < 0,05 ms/frame ; désactivé ou allégé avec « réduire les animations » / qualité basse ; aucun appel à `Math.random`.

- **Phénomènes cosmiques v5.16** (`v516.js`) : un *directeur de l'imprévu* déclenche, pendant les accalmies (sans boss, peu d'ennemis), des scènes rares à contempler — 🐋 Baleine stellaire, 🌀 Trou de ver (lentille sur un secteur lointain), 💥 Supernova, 🛸 Armada fantôme, 💎 Cathédrale de cristal, 🌌 Tempête d'aurores, 👁️ Le Regard, 🌑 Éclipse (totalité : score ×1,5), ⏳ Faille temporelle (frôler son passé charge la NOVA), 🤍 Le Silence (légendaire). Raretés commun / rare / légendaire, pondérées par la route v5.15 ; tirages déterministes (seed de run), jamais `Math.random`. **Carnet des phénomènes** au menu (silhouettes « ??? », nanites à la découverte, `meta.phen` additif).
  - Confort : notifications en file (une seule pastille fine à la fois en jeu, doublons fusionnés, messages périmés abandonnés) ; **HUD fantôme** (score, vague, barres, pièces, badges s'effacent quand un ennemi, une balle ou le vaisseau passe dessous) ; panneau de barres compact.
  - Tests : `tests/e2e/phenomena16.cjs` (20 tests, captures de chaque scène).

- **Instantané cosmique v5.17** (`v517.js`, placé après le pipeline GPU) : mode photo. Un obturateur 📷 apparaît pendant un phénomène (aussi « 📷 Mode photo » dans la pause, touche O) : l'action se fige, le HUD, les commandes, les notifications et les textes flottants disparaissent, la musique continue. L'image est prélevée après le post-traitement WebGL2 (bloom, halos, ondes).
  - Chambre noire : glisser pour cadrer, pincer ou double-tap pour zoomer (×1 à ×3), 5 filtres (Brut, Nébuleuse, Noir & Or, Infrarouge, Argentique : matrices de couleur, vignettage, grain déterministe ; aperçu identique au tirage), 4 formats (plein écran, 4:5, 1:1, cinéma 2:1), cartouche titré (phénomène, rareté, secteur, date, seed).
  - Tirage JPEG (petit côté ≥ 1080 px) → feuille de partage iOS (« Enregistrer l'image ») ou téléchargement. La vignette du phénomène devient le fond de sa tuile dans le Carnet (`meta.phen[id].photo`, additif), +20 ⬡ au premier cliché de chaque phénomène.
  - Reprise avec le compte à rebours habituel ; depuis la pause, retour à la pause.
  - Tests : `tests/e2e/photo17.cjs` (15 tests).

### Fichiers v5

- `index.html` — jeu complet (moteur + modules v5). **Binaires `assets/` non versionnés** (mp3/png/jpg) : distribués via le ZIP `nebuleuse-v5.8.zip` joint à la release. Sans eux, le jeu fonctionne en repli synthétique.

### Utilisation (v5)

Héberger le dossier complet (`index.html` + `assets/`) sur n'importe quel serveur statique (GitHub Pages, Netlify…). Dégradation gracieuse : sans `assets/`, le jeu reste jouable (audio synthétique, classement désactivé hors ligne).
