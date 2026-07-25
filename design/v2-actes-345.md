# NÉBULEUSE PROTOCOL IV — ACTES III · IV · V (v5.13)
## Document de conception directeur

---

## 0. PROMPT AMÉLIORÉ (version exécutoire)

> Poursuivre le développement de Nébuleuse Protocol IV avec **trois actes complets supplémentaires (III, IV, V)**, soit 27 vagues inédites (25-51) réparties en 9 secteurs, chacun avec décor, musique, faune ennemie et boss propres.
>
> **Difficulté** : courbe ascendante maîtrisée — densité, vitesse, PV et patterns croissent d'acte en acte ; chaque acte introduit une mécanique qui remet en question les réflexes acquis (ennemis insaisissables, tirs réfléchis, armes copiées).
>
> **Disruption** : un **directeur de tension** pilote en continu la musique, le spawn et les effets — la pression monte par paliers (pulsation sub-basse, nappes qui s'empilent, riser type Shepard) jusqu'à un **paroxysme audiovisuel** à la mort de chaque boss (flash de bloom, accord orchestral, hit-stop), suivi d'une **accalmie méditative** (ralenti, pad ambiant, particules flottantes) avant la remontée suivante. Alternance tension/relâchement = structure dramatique du jeu.
>
> **Nouveauté permanente** : 9 décors, 9 musiques, ≥10 effets sonores complexes et futuristes, 9 boss à mécaniques distinctes, 6 armes nouvelles, 8 types d'ennemis inédits — un élément nouveau au moins toutes les 2 vagues.
>
> **Scénario** : un arc narratif complet « Le Premier Signal » qui donne du sens à chaque acte — intros d'acte en bannières narratives, archives codex déblocables secteur par secteur, révélations progressives, fin double (victoire + épilogue).
>
> **Son** : expérience sonore travaillée — panoramique stéréo positionnel (déjà en place), couches génératives Web Audio (pads détunés, pulsation cardiaque, risers), SFX surprenants et psychédéliques générés par IA, moments quasi méditatifs entre les tempêtes.
>
> **Plugins** : image_generation (9 décors 2:3 1K), audio_generation (9 musiques 20-22s + SFX 2-8s, descriptions en anglais).
>
> **Process** : verifier v2 (critères B1-B11), QA automatisée étendue (catégorie V13), commits GitHub à chaque étape, release v5.13 finale.

---

## 1. SCÉNARIO — « LE PREMIER SIGNAL »

### Prémisse (révélée au fil des actes)
La Nébuleuse n'est pas un ennemi : c'est une **partition**. Une intelligence primordiale — le **Premier Signal** — compose l'univers comme une fugue, et chaque forme de vie en est une note. L'humanité a capté un fragment de cette mélodie (le « Signal ») et l'a armé. Les vagues d'ennemis ne sont pas une invasion : ce sont les **anticorps de la partition**, envoyés pour faire taire la dissonance que le vaisseau du joueur — le *Diapason* — introduit en jouant « faux ».

### Arc par acte
- **Actes I-II (existant)** : la menace, la traversée de l'Au-delà. Le joueur croit combattre une invasion.
- **Acte III — LE CHŒUR DES MACHINES** (vagues 25-33) : au-delà de la Singularité, le vaisseau capte un **chant** — des machines cathédrales accordées entre elles. Le joueur comprend que tout est musique. Les machines ne combattent pas : elles **accordent**. Thème : la révélation.
- **Acte IV — LA DESCENTE (RÊVE)** (vagues 34-42) : touché par l'aria de la Cantatrice, le pilote sombre dans le **rêve du Signal** — un espace psychédélique où les lois physiques se dissolvent. Les ennemis y sont des pensées : certains dorment, d'autres imitent. Thème : l'introspection, le psychédélisme, les accalmies longues.
- **Acte V — APOTHÉOSE** (vagues 43-51) : le pilote atteint le **Cœur du Premier Signal**. Il ne s'agit plus de détruire mais de **s'accorder** : le boss final n'est pas tué, il est rejoint — le vaisseau devient une note juste dans la fugue. Thème : la fusion, le paroxysme, la résolution.

### Narration en jeu
- **Bannières d'acte** : texte cinématique (machine à écrire) à l'entrée de chaque acte, 2-3 phrases.
- **Archives du Signal (codex)** : 1 entrée déblocée par secteur (9 nouvelles), consultable depuis l'écran titre — fragments poétiques de 2-3 lignes qui révèlent l'histoire.
- **Micro-bannières** : à chaque boss, une ligne de « dialogue » du Signal (« TU JOUES FAUX. », « ÉCOUTE. », « RESTE. »).
- **Épilogue** : écran final unique après la vague 51.

---

## 2. STRUCTURE DES TROIS ACTES

Convention existante : 3 vagues par secteur, boss à la 3ᵉ vague de chaque secteur.

### ACTE III — LE CHŒUR DES MACHINES (vagues 25-33)
| Secteur | Nom | Décor | Musique | Boss (vague) |
|---|---|---|---|---|
| IX | Mer de Verre | plaines vitrifiées réfléchissant un ciel d'aurores, stalagmites de cristal | ambient cristallin, carillons | **L'ORGUE PÉTRIFIÉ** (27) |
| X | Cathédrale Fractale | arches gothiques fractales dorées, vitraux stellaires | choral sacré + pulsations | **LA CANTATRICE** (30) |
| XI | Jardin des Échos | sphères flottantes, anneaux de résonance, brume argentée | nappes méditatives + gongs | **LE DIAPASON OMEGA** (33) |

### ACTE IV — LA DESCENTE (vagues 34-42)
| Secteur | Nom | Décor | Musique | Boss (vague) |
|---|---|---|---|---|
| XII | Labyrinthe de Nacre | couloirs nacrés irisés, lumière liquide | ambient aqueux, gouttes | **LE RÊVEUR ENDORMI** (36) |
| XIII | Mer de Méthane | océan turquin ondulant, îles de brume | drone profond psychédélique | **LE CAUCHEMAR CHROMATIQUE** (39) |
| XIV | L'Œil du Rêve | kaléidoscope géant, géométries impossibles façon Escher | nappe kaléidoscopique, reverse | **L'INSOMNIAQUE** (42) |

### ACTE V — APOTHÉOSE (vagues 43-51)
| Secteur | Nom | Décor | Musique | Boss (vague) |
|---|---|---|---|---|
| XV | Nurserie de Soleils | berceaux d'étoiles naissantes, jets de plasma doré | orchestral montant, cuivres | **LA MATRICE DES ÉCHOS** (45) |
| XVI | L'Horizon des Événements | disque d'accrétion monumental, lumière étirée | drone épique + heartbeat | **LE CHŒUR DES MILLE** (48) |
| XVII | Le Cœur du Premier Signal | mandala de lumière pure, géométrie vivante | fugue synthétique complète | **LE PREMIER SIGNAL** (51) |

---

## 3. LES 9 BOSS (difficulté et complexité croissantes)

### Acte III
1. **L'ORGUE PÉTRIFIÉ** (27) — orgue à tuyaux cristallin. Tire des **anneaux soniques** (ondes expansives qu'il faut traverser par le trou), pulsations qui **ondulent l'écran** (distorsion sinusoïdale). Rage <40% : tuyaux se brisent un à un en explosant (chaîne).
2. **LA CANTATRICE** (30) — diva machine. Invoque 4 **choristes** qui la soignent tant qu'ils vivent (il faut les prioriser). Son **aria** = laser chantant qui balaie l'écran en glissando (son montant/descendant). Rage <40% : aria double, choristes kamikazes.
3. **LE DIAPASON OMEGA** (33) — fourche géante. Protégé par un **bouclier de résonance** qui tombe seulement quand ses deux branches vibrent (les toucher alternativement). Lance des **silences** : zones où le son du jeu se coupe (sourdine radicale, perturbant). Rage <35% : vibrations mortelles en croix.

### Acte IV (psychédélisme, mécaniques qui jouent avec la perception)
4. **LE RÊVEUR ENDORMI** (36) — boss **méditatif** : lent, paisible, orbes de rêve flottants. Le toucher trop vite le « réveille » par à-coups. Ses attaques sont des **vagues lentes de sérénité** — beau et dangereux. Bullet-time permanent pendant ce combat (ralenti élégant). Rage <50% : cauchemar éveillé, orbes deviennent des larmes rapides.
5. **LE CAUCHEMAR CHROMATIQUE** (39) — **inverse les couleurs** par vagues (effet kaleidoscope + inversion), tire des **spirales kaléidoscopiques** de balles, se **dédouble en mirages** (une seule vraie cible, les fausses renvoient les tirs).
6. **L'INSOMNIAQUE** (42) — deux phases alternées : **SOMMEIL** (immobile, invulnérable, invoque des pensées-ennemis) / **VEILLE** (hyper-agressif, **copie l'arme équipée du joueur** et la retourne contre lui). Rythme bascule toutes les 12s. Le joueur doit doser : attaquer en veille, survivre au sommeil.

### Acte V (sommet de complexité)
7. **LA MATRICE DES ÉCHOS** (45) — enregistre les **mouvements du joueur** pendant 8s puis invoque un **fantôme** qui les rejoue en tirant. Jusqu'à 3 fantômes simultanés : il faut se battre contre soi-même. Rage <40% : rejoue à vitesse x1,3.
8. **LE CHŒUR DES MILLE** (48) — **essaim de 12 corps** partageant une barre de vie ; les corps forment des figures (cercle, vague, croix) et chantent des salves synchronisées. Tuer un corps désaccorde le chœur (pitch descend = feedback sonore). Rage <50% : figures frénétiques.
9. **LE PREMIER SIGNAL** (51) — boss final en **4 mouvements** (comme une symphonie) : I. *Dissonance* (toutes les mécaniques de projectiles), II. *Silence* (le son du jeu s'éteint par couches — combat dans un silence croissant, glaçant), III. *Fugue* (invoque des échos des 8 boss précédents en version réduite, un par un), IV. *Unisson* (le joueur ne tire plus pour tuer : il doit **tenir la note** — rester dans le faisceau d'accord en mouvement pendant 20s, paroxysme audiovisuel total, puis épilogue). Jamais vu dans le jeu : la victoire sans tir final.

---

## 4. NOUVEAUX ENNEMIS (8 types)

| Type | Acte | Comportement |
|---|---|---|
| `prisme` | III | se **scinde en 3 éclats** à la mort (explosion de verre, son cristallin) |
| `choriste` | III | **lie** les ennemis proches (+50% vitesse de tir) ; s'il est seul, fuit ; priorisation tactique |
| `sangsue` | III | file vers le joueur et **s'accroche** : draine le bouclier jusqu'à ce qu'on la secoue (mouvement rapide gauche-droite) |
| `reveur` | IV | **phase in/out** : insaisissable 50% du temps (translucide, immatériel), son de shimmer |
| `tisseuse` | IV | tisse des **toiles** (lignes) qui ralentissent le vaisseau au contact |
| `comete` | IV | kamikaze en clair-obscur : fonce en ligne avec traînée, **explose en gerbe** à impact ou à mort |
| `miroirEnnemi` | V | **renvoie les tirs** du joueur (balles retournées) ; vulnérable seulement dans le dos — il faut le contourner |
| `psyche` | V | papillon psychédélique : à sa mort, **burst chromatique + micro bullet-time** gratifiant (300ms) |

---

## 5. NOUVELLES ARMES (6 — lettres libres : R, P, D, K, C, N)

| Lettre | Arme | Acte d'obtention | Effet |
|---|---|---|---|
| **R** | HARPE DE RÉSONANCE | III (25) | harpon **perforant** qui traverse et **détonne en accord** au 2ᵉ ennemi touché (dégâts de zone + accord de harpe) |
| **P** | ORBE PRISME | III (28) | chaque tir se **réfracte en 5 rayons** au premier impact (couverture en éventail) |
| **D** | BERCEUSE | IV (34) | champ d'**hypnose** : endort les ennemis proches (immobiles 3s, teinte bleutée) — crowd control, clé vs essaims |
| **K** | MIROIR D'AION | IV (37) | **barrière frontale** qui renvoie les balles ennemies (3 charges, se régénère) |
| **C** | CANON-CHŒUR | V (43) | **3 faisceaux désaccordés** qui convergent : au point de convergence, accord parfait = dégâts x3 |
| **N** | FAILLE | V (46) | grenade de **singularité** : aspire les ennemis et balles dans un mini-trou noir puis implose |

---

## 6. DIRECTEUR DE TENSION (cœur disruptif)

Variable globale `tension` ∈ [0,1], pilotée par : progression de vague, ennemis à l'écran, PV du boss, morts récentes.

| Palier | Tension | Couches audio | Visuel |
|---|---|---|---|
| CALME | 0-0.25 | pad ambiant seul (génératif, détuné lent) | particules flottantes, lenteur |
| MONTEE | 0.25-0.5 | + nappe musicale du secteur (fondu) | cosmos standard |
| PRESSION | 0.5-0.75 | + **pulsation cardiaque** sub-basse (60 BPM→90 BPM) + filtre qui s'ouvre | léger vignettage pulsé |
| PAROXYSME | 0.75-1 | + **riser Shepard** + toutes couches à fond | saturation, tremblement |
| CLIMAX (mort de boss) | 1 → drop | accord orchestral généré + hit-stop + **silence d'une frame** | flash bloom plein écran |
| ACCALMIE (post-boss) | 0 | pad seul, 8-12s de répit, bullet-time léger | dérive lente, couleurs lavées |

Le directeur pilote aussi le **rythme de spawn** (les vagues respirent : pics et creux) — jamais de saturation constante, toujours des vagues de pression suivies de creux méditatifs.

---

## 7. DESIGN SONORE (expérience psychédélique)

### Musiques générées (9 × 20-22s, boucles)
1. `music-glass` — "Crystalline ambient soundscape, glass harmonica, delicate chimes, ethereal pads, serene and luminous" (Mer de Verre)
2. `music-cathedral` — "Sacred machine choir, deep organ drones, haunting synthetic voices, slow reverent pulse" (Cathédrale)
3. `music-echoes` — "Meditative gongs, soft resonant bells, deep ambient wash, tranquil garden of sound" (Jardin des Échos)
4. `music-nacre` — "Aquatic ambient, liquid droplets, warm underwater pads, gentle dreamlike shimmer" (Nacre)
5. `music-methane` — "Deep psychedelic drone, slow turquin waves, detuned analog synths, hypnotic trance-inducing" (Méthane)
6. `music-dream` — "Kaleidoscopic ambient, reversed melodies, sparkling glissandi, surreal floating lullaby" (Œil du Rêve)
7. `music-suns` — "Rising orchestral synthwave, golden brass swells, triumphant cosmic energy, building crescendo" (Nurserie)
8. `music-horizon` — "Epic deep space drone, heartbeat sub-bass, stretched light choirs, overwhelming awe" (Horizon)
9. `music-signal` — "Complete synthetic fugue, interweaving arpeggios, celestial choir, final transcendence" (Cœur du Signal)

### SFX générés (14, anglais, durées 2-8s)
- `sfx-climax` (6s) — "Massive orchestral hit with sub-bass drop, triumphant chord stack, cinematic bloom, overwhelming release" — **le paroxysme** à chaque mort de boss
- `sfx-interlude` (8s) — "Deep meditative breathing pad, warm analog drone, soft heartbeat, peaceful resolution" — accalmie post-boss
- `sfx-riser` (6s) — "Shepard tone rising endlessly, tension building, hypnotic ascending spiral" — montée de tension
- `sfx-glass-shatter` (2s) — "Crystalline prism shattering into harmonic shards, bright musical glass"
- `sfx-aria` (5s) — "Haunting operatic female vocalise, machine-diva glissando, melancholic synthetic voice" — aria de la Cantatrice
- `sfx-harpoon` (1.5s) — "Resonant harp string pluck with metallic whoosh, harmonic detonation tail"
- `sfx-hypnosis` (4s) — "Slow hypnotic lullaby pulse, sleepy dreamy chimes, consciousness fading"
- `sfx-mirror` (1s) — "Bright reflective ping, metallic shimmer, reversed echo"
- `sfx-singularity` (3s) — "Deep gravitational vortex, sucking warp, implosion rumble"
- `sfx-phase` (1.5s) — "Ethereal phasing shimmer, ghost materializing, dreamlike whoosh"
- `sfx-chord` (2s) — "Perfect harmonic chord resolution, three detuned beams converging into unison"
- `sfx-heartbeat` (3s) — "Deep sub-bass heartbeat, slow ominous pulse, cinematic tension"
- `sfx-unison` (8s) — "Transcendent unison note building to cosmic orgasm, all frequencies aligning, pure light sound" — combat final, mouvement IV
- `sfx-silence-pop` (0.5s) — "Sudden vacuum pop, sound being sucked away, pressure drop" — zones de silence du Diapason

### Couches génératives (Web Audio procédural, sans asset)
- **Pad** : 2-3 oscillateurs détunés (±6 cents) + LFO de filtre, accord du secteur (gamme pentatonique par acte : III=lydien, IV=hirajoshi, V=majeur ouvert)
- **Pulsation** : sinus 45Hz + enveloppe, BPM lié à la tension
- **Riser spectral** : bruit filtré montant + glissando
- **Gouttes/arpèges** : notes aléatoires de la gamme du secteur pendant les accalmies (pluie de notes méditative)

---

## 8. DIFFICULTÉ — COURBE

| Vagues | Multiplicateurs | Nouveautés |
|---|---|---|
| 25-33 | PV ×2.2, vitesse ×1.15, densité +25% | prisme, choriste, sangsue, armes R/P, anneaux soniques |
| 34-42 | PV ×3.4, vitesse ×1.25, densité +35% | reveur, tisseuse, comete, armes D/K, perception (phase, inversion) |
| 43-51 | PV ×5, vitesse ×1.4, densité +50%, élites fréquentes | miroirEnnemi, psyche, armes C/N, fantômes, essaims, final en 4 mouvements |

Garde-fous : drop de bouclier garanti après chaque boss, récupération +80 coque/bouclier à chaque début d'acte, accalmies = répit réel (peu de spawns).

---

## 9. IMPLÉMENTATION TECHNIQUE

- Module `v513.js` injecté avant l'ancre `let last = performance.now();`, chaîne de wraps (même architecture que v511/v512)
- Pont `window.__NP4.v13` : `{ acte, sec3, tension, layers, codex, startActe(acte), spawnBossX…, give(letter), setTension(v), … }`
- `startActe` wrappe les fins d'acte : boutons « ACTE IV », « ACTE V » sur les écrans de victoire intermédiaires (après vague 33 et 42), victoire absolue + épilogue après 51
- Cosmos animés pour secteurs 8-16 (remplace `window.__drawCosmos`, délègue à la chaîne précédente pour 0-7)
- Lettres powerup existantes prises : W,S,H,B,M,Z,T,L → nouvelles : **R,P,D,K,C,N**
- `finalDefeated = true` posé à chaque `startActe` (garde victoire)
- QA : catégorie V13 dans run.cjs (≥15 tests), patterns god-mode + fire-off réutilisés

---

## 10. MANIFESTE ASSETS (23 fichiers)

**Images (9)** : bg-glass.png, bg-cathedral.png, bg-echoes.png, bg-nacre.png, bg-methane.png, bg-dream.png, bg-suns.png, bg-horizon.png, bg-signal.png — 2:3, 1K, opaque.

**Musiques (9)** : music-glass/cathedral/echoes/nacre/methane/dream/suns/horizon/signal.mp3 — 20-22s.

**SFX (14)** : cf. §7 — sfx-climax, sfx-interlude, sfx-riser, sfx-glass-shatter, sfx-aria, sfx-harpoon, sfx-hypnosis, sfx-mirror, sfx-singularity, sfx-phase, sfx-chord, sfx-heartbeat, sfx-unison, sfx-silence-pop.

Total : 32 fichiers dans `/mnt/agents/output/app/assets/`.
EOF