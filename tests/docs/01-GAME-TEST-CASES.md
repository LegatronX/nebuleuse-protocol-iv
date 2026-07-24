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
