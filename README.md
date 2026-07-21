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

## Utilisation

Ouvrir `nebuleuse-v4.2.html` (dernière version) directement dans un navigateur — aucune installation requise.

Pour régénérer les builds :

```bash
python3 build_v41.py nebuleuse.html
python3 build_v42.py nebuleuse-v4.1.html
```
