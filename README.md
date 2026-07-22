> © 2026 Christian ROLANDO — Tous droits réservés. Voir [LICENSE](LICENSE).

# Nébuleuse Protocol IV

Shoot 'em up vertical. **Migration en cours** (branche `migration/pixi-v5`) du monolithe
HTML/CSS/JS autonome vers un projet modulaire Vite + PixiJS (rendu WebGL, shader de
nébuleuse animé). Voir `archive/NOTES.md` pour le journal de migration.

## Jouer maintenant

- **Version stable actuelle (monolithe, Canvas 2D)** : [`public/legacy/nebuleuse-v4.7.html`](public/legacy/nebuleuse-v4.7.html)
  — ouvrable directement dans un navigateur, aucune installation requise. Repère git :
  tag `v4.7-freeze`.
- **Nouveau socle (Vite + PixiJS, en construction)** :
  ```bash
  npm install
  npm run dev
  ```

## Structure du dépôt

- `public/legacy/` — tout l'historique du monolithe (v4.1 à v4.7), conservé et jouable tel
  quel, jamais supprimé.
- `archive/` — outillage Python de build devenu obsolète (`build_v41.py`…`build_v47.py`),
  ancien `manifest.json` racine, journal de migration (`NOTES.md`).
- `src/` — le nouveau code modulaire (Vite). `src/render/` contient le contrat de rendu
  (`IRenderer`, à venir) et ses implémentations (`PixiRenderer.js`, `Canvas2DRenderer.js`
  à venir).
- `docs/` — notes de conception et plan de migration.

## Historique du monolithe (v4.1 → v4.7)

Pour référence — ces fichiers vivent désormais dans `public/legacy/` et `archive/` ; les
chemins ci-dessous sont ceux d'origine, avant réorganisation.

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
  - retours haptiques élargis via la Gamepad Haptics API (manette physique appairée) —
    `navigator.vibrate` reste sans effet sur iPhone (non supporté par Safari iOS, aucune
    page web ne peut le contourner) ; sur iPhone sans manette, le hit-stop et le pulse
    caméra servent de substitut sensoriel visuel
- `build_v45.py` (appliqué sur `nebuleuse-v4.4.html`) → génère `nebuleuse-v4.5.html` — Phase 2 (contenu & profondeur)
  - secteurs visuellement distincts (teinte de fond par tranche de vagues, avec sting audio
    et vibration à chaque transition)
  - 2 nouveaux ennemis : Sentinelle (tir balayant) et Essaim (petit, rapide, en nombre)
  - vaisseaux à débloquer par score (VECTOR à 15 000, TITAN à 60 000) au lieu de tous
    disponibles d'emblée
  - mode Ascension : mutateur de run (Blitz / Coque fragile / Ruée), sélection aléatoire ou
    "défi du jour" à choix déterministe par date
- `build_v46.py` (appliqué sur `nebuleuse-v4.5.html`) → génère `nebuleuse-v4.6.html` — Phase 3 (progression & rétention)
  - traînées de vaisseau cosmétiques (6, achetables avec les nanites)
  - prestige "Surcharge" : une fois tous les talents maxés, réinitialise les talents contre
    un multiplicateur de score permanent (+15 %/niveau)
  - 8 succès avec écran dédié et notification à l'obtention
  - sauvegarde exportable/importable (code texte copiable, indépendant du navigateur)
- `build_v47.py` (appliqué sur `nebuleuse-v4.6.html`) → génère `nebuleuse-v4.7.html` — Phase 4 (production & distribution)
  - manifest PWA + icônes (`icons/`) pour "Ajouter à l'écran d'accueil"
  - menu Réglages unifié (son, difficulté, qualité graphique, sensibilité tactile,
    assistance auto-bombe, palette daltonien) remplaçant les boutons épars du menu
  - palette daltonien via filtre CSS sur le canvas (protanopie / deutéranopie / tritanopie)
  - assistance auto-bombe optionnelle (bombe automatique à coque critique)

Ce build clôt les 4 phases du plan "jeu premium". La variété audio par secteur (item de la
Phase 4) est couverte par le sting/vibration de transition ajouté en v4.5 plutôt que par une
réécriture du moteur audio à stems de la v4.3, dont l'état est privé au patch qui l'a créé.

## Utilisation

Ouvrir `nebuleuse-v4.7.html` (dernière version) directement dans un navigateur — aucune
installation requise. Pour bénéficier du manifest PWA ("Ajouter à l'écran d'accueil"),
héberger le dossier entier (ex. GitHub Pages) plutôt que d'ouvrir le fichier isolément.

Pour régénérer les builds :

```bash
python3 build_v41.py nebuleuse.html
python3 build_v42.py nebuleuse-v4.1.html
python3 build_v43.py nebuleuse-v4.2.html
python3 build_v44.py nebuleuse-v4.3.html
python3 build_v45.py nebuleuse-v4.4.html
python3 build_v46.py nebuleuse-v4.5.html
python3 build_v47.py nebuleuse-v4.6.html
```
