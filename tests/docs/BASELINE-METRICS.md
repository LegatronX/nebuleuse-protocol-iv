# Baseline Metrics — Nébuleuse Protocol IV v5.8

Date : 2026-07-24 · QA : automatisée (Playwright, iPhone 16 Pro Max 430×932, Chromium headless)

## Périmètre

- 53 cas de test (`tests/docs/01-GAME-TEST-CASES.md`), 8 catégories : BOOT, GAME, BOSS, DRAFT, SYS, LB, AUDIO, SEC
- 52 automatisés (`tests/e2e/run.cjs`), 1 manuel (visuel : capsules prototype)
- Sécurité OWASP : RLS (UPDATE/DELETE sans effet), CHECK (bornes), XSS pseudo, secrets client

## Résultats de la campagne (après corrections)

| Indicateur | Valeur |
|---|---|
| Tests automatisés exécutés | 52/52 (100 %) |
| Pass rate | **100 %** (52/52) |
| Bugs ouverts | **0** |
| Bugs trouvés et corrigés pendant la campagne | 1 P0 (killEnemy signature) + 2 P0 documentés (corrigés avant campagne) |
| Cas manuel | 1 (TC-DRAFT-005, visuel) |
| Quality gates | Pass rate ✅ · P0 bugs ✅ · Exécution 98,1 % (cas manuel) |

## Bugs marquants résolus (voir BUG-TRACKING-TEMPLATE.csv)

- **BUG-001 (P0)** : `killEnemy(index)` — le wrap audio testait `.type` sur un index → sons de mort (sub-hit, jackpot, changement de partition) jamais joués en jeu réel ; contact astéroïde ne détruisait pas le rocher. **Corrigé** (wrap bi-signature).
- **BUG-002 (P0)** : séquenceur synthétique jamais arrêté au chargement de la bande-son studio → deux musiques superposées. **Corrigé** avant la campagne.
- **BUG-003 (P0)** : closure `drawChoiceOrbs` inaccessible → moteur gelé à la frame 1. **Corrigé** avant la campagne.

## Rejouer la suite

```bash
node tests/e2e/run.cjs [chemin/vers/app]   # sert index.html + assets/ sur :8124
# produit tests/docs/TEST-EXECUTION-TRACKING.csv + BUG-TRACKING-TEMPLATE.csv + artifacts/
```
