# Nébuleuse Protocol IV — Cas de test (v5.8)

Format : AAA (Arrange / Act / Assert). Priorités : P0 bloquant → P4 mineur.
Exécution : suite automatisée `tests/e2e/run.mjs` (Playwright, viewport iPhone 16 Pro Max 430×932, serveur HTTP local).
Pont de test : `window.__NP4` (état, joueur, ennemis, boss, capsules, audio) exposé par le module v5.6.

Légende exécution : 🤖 automatisé · 🖐 manuel (visuel/ressenti)

## 1. TC-BOOT — Démarrage & menu

| ID | P | Cas | Arrange | Act | Assert | Exéc |
|---|---|---|---|---|---|---|
| TC-BOOT-001 | P0 | Chargement sans erreur | Serveur HTTP actif | Ouvrir index.html | Aucune erreur page/console ; menu visible | 🤖 |
| TC-BOOT-002 | P1 | Habillage menu | Page chargée | Inspecter le menu | Emblème `<img>` présent ; fond `menu-bg.jpg` appliqué ; titre visible | 🤖 |
| TC-BOOT-003 | P0 | Chargement assets studio | Page chargée | Clic Campagne (geste) | `AudioSys.__studioReady === true` en < 15 s ; AudioContext `running` | 🤖 |
| TC-BOOT-004 | P1 | Boutons menu | Page chargée | Inspecter DOM | Campagne, Survie, Opération, Missions, Ascension, Laboratoire, Vaisseaux, Succès, Réglages, Classement présents | 🤖 |
| TC-BOOT-005 | P0 | Repli sans assets | Requêtes `assets/*` bloquées | Démarrer une partie | Aucune erreur fatale ; `__studioReady === false` ; état `playing` ; boucle de jeu active (score évolue possible) | 🤖 |
| TC-BOOT-006 | P2 | Muet | Audio prêt | Activer le mute | `AudioSys.muted === true` ; `master.gain.value === 0` | 🤖 |

## 2. TC-GAME — Boucle de jeu

| ID | P | Cas | Arrange | Act | Assert | Exéc |
|---|---|---|---|---|---|---|
| TC-GAME-001 | P0 | Démarrage Campagne | Menu | Clic Campagne | `state` passe `countdown` → `playing` ; vaisseau `alive` | 🤖 |
| TC-GAME-002 | P0 | Apparition ennemis | Partie en cours | Attendre 10 s | `enemies.length > 0` | 🤖 |
| TC-GAME-003 | P0 | Fin de vague | Vague 1 | Tuer tous les ennemis | `wave` incrémente ; capsules de draft apparaissent (`orbs.length === 3`) | 🤖 |
| TC-GAME-004 | P1 | Score sur destruction | Partie en cours | `killEnemy` sur un ennemi | `score` augmente | 🤖 |
| TC-GAME-005 | P1 | Dégâts joueur | Partie en cours | `hurt(10)` | `player.hp` diminue | 🤖 |
| TC-GAME-006 | P1 | Garde d'invulnérabilité | Partie en cours | `hurt` avec `invuln=1.5` puis `invuln=0` | Dégâts bloqués pendant l'invuln, appliqués après (pas d'invuln post-hit normal : by design) | 🤖 |
| TC-GAME-007 | P0 | Game over | Partie, 0 nanite | Mourir jusqu'à épuisement des vies | `state === 'gameover'` ; overlay visible ; score final affiché | 🤖 |
| TC-GAME-008 | P1 | Rejouer | Écran game over | Clic Rejouer | `state` repasse en jeu ; score remis à 0 | 🤖 |
| TC-GAME-009 | P2 | Mode Survie | Menu | Clic Survie | Partie démarre en mode survie | 🤖 |
| TC-GAME-010 | P2 | Retour menu | Game over | Clic Menu | `state === 'menu'` ; boucle audio `menu` | 🤖 |

## 3. TC-BOSS — Boss

| ID | P | Cas | Arrange | Act | Assert | Exéc |
|---|---|---|---|---|---|---|
| TC-BOSS-001 | P0 | Apparition boss | Partie en cours | `spawnBoss(false)` | `boss` non nul ; classe `bossfight` sur `<body>` | 🤖 |
| TC-BOSS-002 | P1 | HUD assombri | Boss actif | Lire opacité panneaux HUD | Opacité < 1 (attendu ≈ 0.45) | 🤖 |
| TC-BOSS-003 | P0 | Mort du boss | Boss actif | `boss.hp = 0` + tir | Boss retiré ; classe `bossfight` retirée ; aucune erreur (subHit+jackpot) | 🤖 |
| TC-BOSS-004 | P1 | Variété des archétypes | Partie en cours | Tuer 2 boss successifs | `boss.kind` diffère entre les deux | 🤖 |
| TC-BOSS-005 | P1 | Musique boss | Studio prêt | `spawnBoss(false)` | Boucle audio `boss` en < 2 s | 🤖 |
| TC-BOSS-006 | P0 | Boss final | Partie en cours | `spawnBoss(true)` | `boss.finalBoss === true` ; boucle `final` | 🤖 |
| TC-BOSS-007 | P0 | Victoire | Boss final | Le tuer | `state === 'victory'` ; overlay victoire visible | 🤖 |
| TC-BOSS-008 | P2 | Continuer l'infini | Écran victoire | Clic « Continuer l'infini » | `state === 'playing'` | 🤖 |

## 4. TC-DRAFT — Draft en temps réel

| ID | P | Cas | Arrange | Act | Assert | Exéc |
|---|---|---|---|---|---|---|
| TC-DRAFT-001 | P0 | Pas de pause au draft | Fin de vague | Observer `state` | Reste `playing` pendant l'apparition des capsules | 🤖 |
| TC-DRAFT-002 | P1 | Survol des capsules | Capsules présentes | Lire positions sur 1 s | Les capsules planent (vy ≈ 0 près de H×0.34) | 🤖 |
| TC-DRAFT-003 | P0 | Ramassage | Capsules présentes | Déplacer le vaisseau sur une capsule | `orbs.length === 0` ; aucune erreur | 🤖 |
| TC-DRAFT-004 | P2 | Variété des offres | 2 fins de vague | Comparer les noms proposés | Au moins 2 drafts distincts sur 6 offres | 🤖 |
| TC-DRAFT-005 | P3 | Capsules prototype | Boss tué (vague ≥ 3) | Observer | Des capsules violettes prototype peuvent apparaître | 🖐 |

## 5. TC-SYS — Systèmes (fièvre, bullet-time, astéroïdes, quotidien)

| ID | P | Cas | Arrange | Act | Assert | Exéc |
|---|---|---|---|---|---|---|
| TC-SYS-001 | P1 | Astéroïdes apparaissent | Vague 1, ~20 s | Observer | ≥ 1 ennemi `type === 'asteroid'` apparaît | 🤖 |
| TC-SYS-002 | P1 | Astéroïde destructible | Astéroïde présent | `killEnemy(asteroid)` | Retiré sans erreur ; score augmente | 🤖 |
| TC-SYS-003 | P1 | Bullet-time à la mort | Partie en cours | Perdre une vie | Jeu ralenti puis respawn avec `invuln > 0` ; `state` reste `playing` | 🤖 |
| TC-SYS-004 | P2 | Surcharge (fever) | Enchaîner destructions sans dégât | Tuer ~15 ennemis vite | Classe `fever` sur body OU multiplicateur ×2 (si atteint) ; aucune erreur sinon | 🤖 |
| TC-SYS-005 | P1 | Coffre quotidien | Profil vierge | Clic « Ouvrir » | Nanites crédités (texte menu augmente) ; aucune erreur | 🤖 |
| TC-SYS-006 | P2 | Missions affichées | Menu Missions | Ouvrir l'écran missions | ≥ 3 missions listées | 🤖 |
| TC-SYS-007 | P2 | Fantôme enregistré | Fin d'un run | Lire `localStorage` | `nebula4_meta` contient un `ghost` | 🤖 |
| TC-SYS-008 | P3 | Opération du jour | Menu | Ouvrir « Opération du jour » | L'écran s'affiche sans erreur | 🤖 |

## 6. TC-LB — Classement en ligne

| ID | P | Cas | Arrange | Act | Assert | Exéc |
|---|---|---|---|---|---|---|
| TC-LB-001 | P0 | Publication auto | Alias enregistré, run terminé | Game over | Statut `🏆 Rang mondial : #n` ou « Score publié » | 🤖 |
| TC-LB-002 | P1 | Top 10 | Scores en base | Ouvrir Classement | ≥ 1 ligne ; médailles 🥇🥈🥉 ; ma ligne surlignée (`lb-me`) | 🤖 |
| TC-LB-003 | P1 | Formulaire pseudo | Aucun alias | Game over | Champ pseudo + bouton « Publier » visibles | 🤖 |
| TC-LB-004 | P1 | Hors ligne gracieux | Requêtes Supabase bloquées | Game over | Statut « indisponible » ; aucune erreur fatale | 🤖 |
| TC-LB-005 | P0 | XSS via pseudo | Alias `<img onerror>` | Publier + ouvrir Top 10 | Aucune exécution de script ; balise échappée | 🤖 |
| TC-LB-006 | P3 | Fermeture overlay | Top 10 ouvert | Clic Fermer | Overlay masqué | 🤖 |

## 7. TC-AUDIO — Moteur audio

| ID | P | Cas | Arrange | Act | Assert | Exéc |
|---|---|---|---|---|---|---|
| TC-AUDIO-001 | P0 | Boucle combat | Studio prêt, partie | Lire `__currentLoop()` | `combat` | 🤖 |
| TC-AUDIO-002 | P0 | Fondu boss → combat | Boss tué | Attendre 2 s | Boucle repasse `combat` (ou `menu` si victoire finale) | 🤖 |
| TC-AUDIO-003 | P1 | Boucle menu | Retour menu | Lire `__currentLoop()` | `menu` | 🤖 |
| TC-AUDIO-004 | P1 | SFX échantillonnés | Studio prêt | Appeler `jackpot`, `subHit`, `explosion(true)`, `bossAlert`, `power` | Aucune erreur ; `playSfx` retourne true | 🤖 |
| TC-AUDIO-005 | P2 | Synth de secours | Assets bloqués | Démarrer une partie | `startMusic` synth actif sans erreur ; aucune boucle studio | 🤖 |

## 8. TC-SEC — Sécurité (OWASP)

| ID | P | Cas | Arrange | Act | Assert | Exéc |
|---|---|---|---|---|---|---|
| TC-SEC-001 | P0 | UPDATE interdit (A01) | Clé anon | PATCH sur `nebuleuse_scores` | Rejet (4xx) | 🤖 |
| TC-SEC-002 | P0 | DELETE interdit (A01) | Clé anon | DELETE sur `nebuleuse_scores` | Rejet (4xx) | 🤖 |
| TC-SEC-003 | P1 | Bornes CHECK (A03) | Clé anon | INSERT alias 30 car. / score < 0 | Rejet 400 | 🤖 |
| TC-SEC-004 | P0 | XSS pseudo (A03) | = TC-LB-005 | — | Couvert par TC-LB-005 | 🤖 |
| TC-SEC-005 | P2 | Pas de secret côté client (A05) | Code source | Grep clés | Seule la clé anon publique est présente (pas de service_role) | 🤖 |

## 9. TC-FTUE — Première session (v5.9)

| ID | P | Cas | Arrange | Act | Assert | Exéc |
|---|---|---|---|---|---|---|
| TC-FTUE-001 | P1 | Indice étape 1 | Profil vierge | Clic Campagne | Bulle « Glisse pour déplacer » visible | 🤖 |
| TC-FTUE-002 | P2 | Progression tutoriel | Étape 1 affichée | Déplacer le vaisseau | Étape suivante | 🤖 |

## 10. TC-RR — Rapport de fin de run (v5.9)

| ID | P | Cas | Arrange | Act | Assert | Exéc |
|---|---|---|---|---|---|---|
| TC-RR-001 | P1 | Rapport complet | Run terminé | Game over | Grade + 3 objectifs + stats affichés | 🤖 |

## 11. TC-TOUR — Tournoi hebdomadaire (v5.9)

| ID | P | Cas | Arrange | Act | Assert | Exéc |
|---|---|---|---|---|---|---|
| TC-TOUR-001 | P1 | Overlay tournoi | Menu | Clic « Tournoi » | Semaine + mutateur affichés | 🤖 |
| TC-TOUR-002 | P0 | Participation | Overlay | Clic « Participer » | Run démarre avec badge mutateur | 🤖 |
| TC-TOUR-003 | P0 | Publication | Run tournoi terminé | Game over | Statut « Rang tournoi : #n » | 🤖 |

---

## 12. V5.10 — SECTEURS · PIÈCES · PORTAILS · QUANTIQUE (TC-V10-001 à 009)

### TC-V10-001 — Assets v5.10 servis (P1)
**Arrange** : serveur local. **Act** : HEAD sur 4 décors (bg-forge/alien/frozen/quantum.png) + 4 SFX (sfx-coin/coinburst/portal/overdrive.mp3). **Assert** : 8/8 HTTP 200.

### TC-V10-002 — Pièces d'or : aimant + collecte + HUD (P0)
**Arrange** : run campagne. **Act** : `__NP4.v10.dropCoins(8)` près du joueur, attente 2,6 s. **Assert** : `coinTotal() >= 5`, `#coinHud` visible avec compteur > 0.

### TC-V10-003 — Surcharge quantique (P0)
**Act** : `v10.overdrive()` puis `hurt(50)`. **Assert** : `od() > 6`, `player.fireMul === 0.35`, coque+bouclier inchangés (intangibilité).

### TC-V10-004 — Qubit : superposition + décohérence (P1)
**Act** : spawn qubit, `hp -= 10`. **Assert** : `baseX` téléporté (effondrement de la fonction d'onde).

### TC-V10-005 — Intrication : mort simultanée (P0)
**Act** : spawn paire `intrigue`, `v10.kill(a)`. **Assert** : même `linkId`, plus aucun ennemi intriqué vivant.

### TC-V10-006 — Portail de secteur (P1)
**Act** : `v10.portal('sector')` puis `v10.nextSector()`. **Assert** : portail ouvert, `sector() === 1` (thème Forge Solaire).

### TC-V10-007 — Dimension secrète : pluie d'or (P1)
**Act** : `v10.enterSecret()`, attente 1,3 s. **Assert** : `secret() === true`, pièces à l'écran > 0.

### TC-V10-008 — Rapport : pièces + nanites bonus (P1)
**Act** : fin de run (vies à 1, hit létal). **Assert** : `#finalStats` contient « pièces d'or » et « nanites bonus ».

### TC-V10-009 — Décors de secteurs (P2, MANUEL)
Vérifier visuellement les 5 thèmes (nébuleuse, forge solaire, abysse alien, abîme glacé, vide quantique) et la bannière auto-ajustée.

---

## 13. V5.11 — COSMOS VIVANT · GÂCHETTE · VITRINE VAISSEAUX (TC-V11-001 à 007)

### TC-V11-001 — Schémas vaisseaux servis (P1)
**Act** : HEAD sur ship-pulse/vector/titan/mirage.png. **Assert** : 4/4 HTTP 200.

### TC-V11-002 — Vitrine vaisseaux (P1)
**Act** : ouverture du hangar. **Assert** : 4 cartes, 4 schémas uniques, 4 cadrans SVG, 3 silhouettes verrouillées (score 0), 4 barres de stats pour PULSE.

### TC-V11-003 — Tir manuel par défaut (P0)
**Assert** : en jeu, `autoFire === false`, `__fireWanted() === false`, bouton TIR visible.

### TC-V11-004 — Gâchette (P0)
**Act** : `pressFire(true)` puis `pressFire(false)`. **Assert** : `__fireWanted()` suit l'état de la gâchette.

### TC-V11-005 — Réglage tir automatique persistant (P1)
**Act** : activer l'auto-fire, recharger la page. **Assert** : `autoFire === true` après reload.

### TC-V11-006 — Cosmos vivant (P1)
**Act** : transitions secteurs 0→4, échantillonnage 3× par secteur. **Assert** : particules cosmos > 0 dans les 5 secteurs (étoiles filantes, volcans, méduses, givre, trou noir).

### TC-V11-007 — Cosmos & vitrine (P2, MANUEL)
Vérifier visuellement : volcans de la forge, trou noir du vide quantique, aurores de l'abîme glacé, inclinaison 3D des schémas au toucher.

---

## 14. V5.12 — ACTE II : 3 NIVEAUX · 3 BOSS · ARMES · AUDIO SPATIAL (TC-V12-001 à 011)

### TC-V12-001 — Assets Acte II (P1)
**Act** : HEAD sur 3 décors + 3 musiques + 4 SFX. **Assert** : 10/10 HTTP 200.

### TC-V12-002 — Démarrage Acte II (P0)
**Act** : `v12.startActe2()`. **Assert** : `acte2`, `sec2=5`, `wave=16`, état playing.

### TC-V12-003 — Léviathan (P0)
**Act** : spawn, entrée, kill via chaîne complète. **Assert** : boss custom actif, mort → `sec2=6` (Ruche), état playing (pas de victoire parasite).

### TC-V12-004 — Matriarche (P0)
**Act** : spawn, attente 7,7 s, kill. **Assert** : ponte d'œufs et/ou éclosions en guêpes, mort → `sec2=7` (Singularité).

### TC-V12-005 — Architecte : mécaniques quantiques (P0)
**Act** : spawn (tir coupé), 9 s, hp→60 % puis 30 %. **Assert** : téléportation, OCTAÈDRE + 2 clones, SPHÈRE + fracture de réalité.

### TC-V12-006 — Victoire absolue (P0)
**Act** : kill de l'Architecte. **Assert** : état victory, `acte2Done`, titre « VICTOIRE ABSOLUE », fracture désactivée.

### TC-V12-007 — Nova-charge (P0)
**Act** : gâchette maintenue 3,2 s. **Assert** : charge retombée (lance partie), son blast émis (pan compté).

### TC-V12-008 — Foudre en chaîne (P1)
**Act** : `giveTesla()`, 2,2 s. **Assert** : durée active décrémentée, arcs émis avec panoramique stéréo (≥1).

### TC-V12-009 — Lames orbitales (P1)
**Act** : `giveBlades()`. **Assert** : `blades > 20`.

### TC-V12-010 — Buffers audio (P1)
**Assert** : 7/7 buffers Acte II décodés (4 SFX + 3 musiques).

### TC-V12-011 — Spectacle Acte II (P2, MANUEL)
Explosions en chaîne des boss, fracture de réalité, rendu des 3 gardiens, arcs tesla, lueur de charge.

## 14. Catégorie V13 — Actes III·IV·V (v5.13)

| ID | Priorité | Test | Statut |
|----|----------|------|--------|
| TC-V13-001 | P1 | 32 assets Actes III-V servis (9 décors, 9 musiques, 14 SFX) | ✅ |
| TC-V13-002 | P0 | Acte III démarre (secteur VIII, vague 25) | ✅ |
| TC-V13-003 | P0 | Orgue : mort → Secteur IX + accalmie (directeur de tension) | ✅ |
| TC-V13-004 | P0 | Cantatrice → X, Diapason → fin Acte III + bouton ACTE IV | ✅ |
| TC-V13-005 | P0 | Acte IV : 3 boss → secteurs XII/XIII + fin d'acte | ✅ |
| TC-V13-006 | P0 | Acte V : Matrice → XV, Chœur des Mille (corps) → XVI | ✅ |
| TC-V13-007 | P0 | Premier Signal : 4 mouvements → unisson → APOTHÉOSE | ✅ |
| TC-V13-008 | P0 | 6 armes : R·P·D·K·C·N appliquées, harpons tirés | ✅ |
| TC-V13-009 | P0 | Ennemis : prisme → 3 éclats ; rêveur phasé | ✅ |
| TC-V13-010 | P1 | Tension pilotée + climax → accalmie | ✅ |
| TC-V13-011 | P1 | Codex ≥ 3 entrées + 23 buffers audio décodés | ✅ |
| TC-V13-012 | P2 | Spectacle Actes III-V (visuel) | MANUEL |

Correctifs de robustesse : TC-V12-005 (téléportation forcée, fps bridé), TC-V12-006 (titre évolué : porte Acte III), TC-DRAFT-004 (3ᵉ tirage RNG).
