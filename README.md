# Nébuleuse Protocol IV

Petit shoot 'em up vertical en HTML/CSS/JS pur (aucune dépendance), jouable directement dans un navigateur.

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

## Utilisation

Ouvrir `nebuleuse-v4.4.html` (dernière version) directement dans un navigateur — aucune installation requise.

Pour régénérer les builds :

```bash
python3 build_v41.py nebuleuse.html
python3 build_v42.py nebuleuse-v4.1.html
python3 build_v43.py nebuleuse-v4.2.html
python3 build_v44.py nebuleuse-v4.3.html
```
