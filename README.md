# Nébuleuse Protocol IV

Petit shoot 'em up vertical en HTML/CSS/JS pur (aucune dépendance), jouable directement dans un navigateur.

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

### Fichiers v5

- `index.html` — jeu complet (moteur + modules v5). **Binaires `assets/` non versionnés** (mp3/png/jpg) : distribués via le ZIP `nebuleuse-v5.8.zip` joint à la release. Sans eux, le jeu fonctionne en repli synthétique.

### Utilisation (v5)

Héberger le dossier complet (`index.html` + `assets/`) sur n'importe quel serveur statique (GitHub Pages, Netlify…). Dégradation gracieuse : sans `assets/`, le jeu reste jouable (audio synthétique, classement désactivé hors ligne).
