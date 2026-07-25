# Verifier v2 — Critères d'acceptation Actes III · IV · V (v5.13)

Mesurés par la suite QA automatisée (tests/e2e/run.cjs, catégorie V13) + vérifications fichiers (HTTP HEAD, pont __NP4.v13).

| # | Critère | Mesure | Seuil |
|---|---------|--------|-------|
| B1 | 9 nouveaux décors de secteurs générés (3 par acte) | HTTP HEAD sur 9 PNG | 9/9 → 200 |
| B2 | 9 boucles musicales + ≥10 SFX générés | HTTP HEAD sur mp3 | 9 musiques 200, ≥10 SFX 200 |
| B3 | Campagne étendue : vagues 25-51, secteurs VIII→XVII, 3 actes chaînés | `__NP4.v13` : démarrage Acte III après Acte II, transitions IV, V | PASS |
| B4 | 9 boss inédits à mécaniques distinctes, difficulté croissante | spawn/update/kill des 9 boss via pont | 9 tests PASS |
| B5 | ≥6 nouvelles armes joueur | application des 6 powerups (R,P,D,K,C,N) + effets vérifiables | 6 tests PASS |
| B6 | ≥6 nouveaux types d'ennemis | spawn + comportement (split, phase, lien, kamikaze…) | 6 tests PASS |
| B7 | Directeur de tension : crescendo → paroxysme → accalmie | valeur tension monte en combat, climax à la mort du boss, interlude calme ensuite | PASS |
| B8 | Audio spatial/génératif : couches (pad, pulsation, riser) actives | compteurs pont (layers actifs, pan utilisé) | PASS |
| B9 | Scénario : intros d'acte + archives codex déblocables | bannières narratives affichées, ≥9 entrées codex | PASS |
| B10 | Régression : suite complète PASS, 0 erreur console | run.cjs global | 100% PASS |
| B11 | Version sauvegardée sur GitHub (commit + release + ZIP) | API GitHub | release v5.13 + asset |
