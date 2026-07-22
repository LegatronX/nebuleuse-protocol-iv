# Protocole de collaboration — Nébuleuse Protocol IV

## Rôles
- **Dolphin** (architecte) : conçoit, rédige les tickets et le code de
  référence. Lit le dépôt public, n'y écrit pas.
- **Antigravity / Anti** (exécuteur) : lit, dépose les fichiers, committe,
  rapporte. A l'accès local et l'écriture GitHub.
- **Christian** (arbitre) : valide, transmet les tickets et les rapports,
  tranche les choix d'auteur. Human in the loop.

## Règle d'or — le réel d'abord
1. Lire les fichiers du **workspace local**, jamais une copie web.
2. `git status` : repérer le travail non commité (à préserver).
3. `git fetch` puis comparer `@{u}..HEAD` et `HEAD..@{u}` (décalage local/distant).
4. Ne jamais supprimer ni écraser du travail local non poussé.
   En cas de doute, **signaler et attendre**.

## Flux stigmergique
1. Dolphin dépose un ticket (transmis par Christian).
2. Anti lit l'état local, exécute, committe par petits pas (`mvtX:`).
3. Anti rapporte (commits, tests, anomalies) à Christian.
4. Christian valide et transmet le rapport à Dolphin.
5. `docs/ETAT_DU_PROJET.md` est mis à jour à chaque mouvement clos.

## Conventions
- Chemin d'un fichier en titre, pas en commentaire.
- Varyings/uniforms déclarés explicitement dans les shaders.
- Ne modifier que ce que le ticket demande.

## Format des tickets Dolphin
Les tickets de Dolphin sont encadrés par deux bannières :
`============ TICKET DOLPHIN -> ANTIGRAVITY — à exécuter ============` (ouverture)
et `============ FIN DU TICKET ============` (clôture).
**Seul le contenu entre ces bannières est à exécuter.** Ce qui précède ou suit est la conversation Dolphin–Christian (contexte utile, mais sans action requise).

## En-tête de copyright
Tout fichier source **nouvellement créé** dans le projet (`.js`, `.html`, `.css`, et tout format admettant des commentaires) doit porter, en tout début de fichier, l'en-tête de copyright suivant :

```
// ============================================================
// Nébuleuse Protocol IV
// © 2026 Christian ROLANDO — Tous droits réservés.
// Voir le fichier LICENSE à la racine du dépôt.
// ============================================================
```

(format HTML équivalent pour les fichiers `.html`).
Sont exclus : les fichiers `.json` stricts (commentaires impossibles), les fichiers générés (`dist/`, `node_modules/`) et le manifest PWA régénéré. L'en-tête est une notice courte ; il ne reproduit jamais le texte complet de `LICENSE`.


