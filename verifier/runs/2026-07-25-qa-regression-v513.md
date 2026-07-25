# Run — Régression complète v5.13 (2026-07-25)

- Commande : `node tests/e2e/run.cjs /mnt/agents/output/app`
- Résultat : 93 PASS · 0 FAIL · 5 MANUEL (exit 0) — confirmé sur 2 runs
- Suite : 82 tests existants + 11 nouveaux (TC-V13-001..011)

## Critères v2
| # | Critère | Résultat |
|---|---------|----------|
| B1 | 9 décors servis (HEAD 200) | ✅ TC-V13-001 |
| B2 | 9 musiques + 14 SFX servis + décodés | ✅ TC-V13-001/011 |
| B3 | Campagne 25-51 chaînée (3 actes) | ✅ TC-V13-002/004/005/006/007 |
| B4 | 9 boss à mécaniques distinctes | ✅ TC-V13-003..007 |
| B5 | 6 armes joueur | ✅ TC-V13-008 |
| B6 | 6+ types d'ennemis | ✅ TC-V13-009 (+choriste/sangsue/tisseuse/comete/miroirE/psyche en code) |
| B7 | Directeur de tension (crescendo→climax→accalmie) | ✅ TC-V13-003/010 |
| B8 | Couches audio génératives + panoramique | ✅ TC-V13-010/011 (pad, heartbeat, riser, pan) |
| B9 | Scénario : intros + codex + épilogue | ✅ TC-V13-007/011 |
| B10 | Régression complète PASS | ✅ 93/93 |
| B11 | Release GitHub v5.13 | ⏳ en cours |
