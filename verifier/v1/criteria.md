# Verifier v1 — Critères d'acceptation Acte II (v5.12)

Mesurés par la suite QA automatisée (tests/e2e/run.cjs, catégorie V12) + vérifications fichiers.

| # | Critère | Mesure | Seuil |
|---|---------|--------|-------|
| A1 | 3 nouveaux décors de secteurs générés | HTTP HEAD sur 3 PNG | 3/3 → 200 |
| A2 | Campagne étendue à l'Acte II (vagues 16-24, secteurs V-VII) | `__NP4.v12` : sector max 7, acte II démarrable après victoire | PASS |
| A3 | 3 boss inédits à mécaniques distinctes | Léviathan (résurrection de débris), Matriarche (œufs/drones), Architecte (téléportation/clones) | 3 tests PASS |
| A4 | ≥ 2 nouvelles armes joueur | Canon-nova à charge (lié à la gâchette), tesla à chaîne, lames orbitales | tests PASS |
| A5 | ≥ 3 musiques + ≥ 3 SFX générés ; panoramique stéréo | fichiers assets ; `sfx12` avec pan par position x | 6+ fichiers, test PASS |
| A6 | Effets spéciaux inédits | arcs électriques, lueur de charge, distorsion d'écran boss 7 | test + manuel |
| A7 | Régression QA | suite complète | 100 % PASS hors manuels |
| A8 | Livraison GitHub | commit + tag + release v5.12 avec ZIP | publié |
