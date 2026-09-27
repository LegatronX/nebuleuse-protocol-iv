# Récupération des musiques Suno

Récupérer des morceaux **déjà générés** avec l'API Suno de `LegatronX/suno-creator` et les ranger dans le jeu, **sans relancer de génération**.

## Où sont (et ne sont pas) les créations — constaté le 2026-09-27

| Emplacement | Contenu |
|---|---|
| Dépôt `suno-creator`, toutes branches | Aucun fichier audio (branche principale et quatre branches annexes vérifiées). |
| Application Streamlit déployée (Streamlit Community Cloud) | L'historique vit dans `st.session_state["history"]` : il est perdu à la fermeture de la session. Ce n'est pas une archive. |
| `pipeline.py` → `output/` | Écrit `<clip_id>.mp3`, `<clip_id>_cover.jpg` et `<clip_id>_metadata.txt` **sur la machine qui exécute l'application**. Sur Streamlit Cloud, ce disque est éphémère : il est effacé au redémarrage. En exécution locale, regarder `suno-creator/output/`. |
| Fournisseur sunoapi.org | Source faisant foi. L'API ne propose **pas** de liste des générations : il faut l'identifiant de tâche (`taskId`) pour lire une génération via `GET /generate/record-info`. Les identifiants se trouvent dans le tableau de bord sunoapi.org (journal des tâches), dans la réponse de `POST /generate` (`data.taskId`) ou dans `output/*_metadata.txt`. |
| URLs audio renvoyées (`audioUrl`, `sourceAudioUrl`) | Hébergées temporairement par le fournisseur. **Leur durée de vie n'a pas pu être vérifiée** : récupérer les fichiers sans attendre. La doc du dépôt indique 3 jours pour les fichiers *uploadés* (`downloadUrl`). |

## Secrets

- Application : secrets Streamlit, clé `SUNO_KEY` (menu *Settings → Secrets* de l'application sur share.streamlit.io, ou `.streamlit/secrets.toml` en local, non versionné).
- Environnement cloud Claude Code : identifiant d'API « Suno API » pour `api.sunoapi.org`, injecté par le proxy. Aucune clé n'est visible dans la session. Un identifiant ajouté en cours de session n'est pris en compte que dans une **nouvelle** session : le 27/09, l'injection a échoué dans la session ouverte avant son ajout (réponse HTTP 502 « injection failed »).
- Script de récupération ailleurs : variable d'environnement `SUNO_KEY`. Ne jamais la mettre dans un fichier du dépôt, un manifeste ou une conversation.

## Procédure

1. **Lister les identifiants de tâches.** Les copier depuis le tableau de bord sunoapi.org (journal des générations), un par ligne, dans un fichier hors dépôt, par exemple `~/suno-tasks.txt`.
2. **Autoriser le réseau** (environnement cloud uniquement) : `api.sunoapi.org` (autorisé au 27/09 ; `sunoapi.org` et `docs.sunoapi.org` restent bloqués, ce qui n'empêche pas la récupération) et les hôtes des fichiers audio renvoyés par l'API, visibles dans le champ `sourceHost` du manifeste après un premier essai.
3. **Lancer la récupération** depuis la racine du jeu :
   ```sh
   export SUNO_KEY=…            # depuis le gestionnaire de secrets, jamais dans l'historique partagé
   python3 tools/suno_recover.py ~/suno-tasks.txt
   # ou : python3 tools/suno_recover.py --task <taskId> --task <taskId>
   ```
   Pour chaque tâche, le script :
   - fait **uniquement** des lectures (`GET /generate/record-info?taskId=…`) ;
   - télécharge l'original (`sourceAudioUrl`, sinon `audioUrl`) sans le réencoder ;
   - vérifie la signature du fichier (MP3, WAV, FLAC, OGG ou M4A) et le décode avec `ffprobe` s'il est installé ;
   - calcule le SHA-256 et signale les doublons (`duplicateOf`) ;
   - range le fichier dans `assets/music/suno-originals/<titre>--<id8>.<ext>` ;
   - complète `assets/music/suno-originals/manifest.json`, **en retirant les paramètres d'URL** (jetons, signatures).

   Le script est relançable sans risque : un fichier déjà présent n'est pas retéléchargé.
4. **Vérifier** : `failures` vide dans le manifeste, et écoute des morceaux.
5. **Versionner** : `git add assets/music/suno-originals` et commit. Les musiques actuelles du jeu (`assets/music-*.mp3`) ne sont pas touchées ; le choix et l'intégration se font ensuite.

## Manifeste (`assets/music/suno-originals/manifest.json`)

Par morceau :
- titre et chemin relatif ;
- `trackId` et `taskId` ;
- fournisseur et modèle ;
- date de génération ;
- durée, format et taille en octets ;
- prompt, style et indicateur instrumental ;
- `sha256` et `duplicateOf` ;
- hôte source, sans paramètres ;
- droits.

Toute valeur absente vaut `"inconnu"`. **Droits commerciaux** : l'API ne les renvoie pas ; ils dépendent de l'abonnement actif au moment de la génération. À confirmer dans le compte sunoapi.org / Suno et à reporter dans `rights`.

## Volume

Un morceau fait environ 3 à 8 Mo en MP3. Jusqu'à une centaine de fichiers, Git suffit (les pistes actuelles du jeu sont déjà versionnées). Au-delà, utiliser Git LFS (`git lfs track "assets/music/suno-originals/*"`) ou une Release GitHub, et noter l'emplacement dans ce document.

## Créer de nouvelles musiques pour le jeu

`tools/suno_generate.py` lance une génération, attend le résultat par interrogation de `record-info`, télécharge les originaux et les ajoute au manifeste (champ `cue`).

```sh
python3 tools/suno_generate.py --list-cues            # préréglages : menu, combat, boss, final, phenomene, victoire
python3 tools/suno_generate.py --cue boss             # essai à blanc : affiche la requête, n'envoie rien
python3 tools/suno_generate.py --cue boss --confirm   # génère (dépense des crédits), attend, télécharge
python3 tools/suno_generate.py --title "…" --style "…" --prompt "…" --confirm
```

- Les morceaux sont toujours instrumentaux et pensés pour boucler. Une palette commune (`HOUSE_STYLE`) assure la cohérence avec la bande-son studio.
- **Sans `--confirm`, rien n'est envoyé.** Une génération produit en général deux variantes.
- Le `taskId` est affiché et conservé dans le manifeste. En cas d'expiration de l'attente, relancer `tools/suno_recover.py --task <taskId>`.
- Le jeu n'est pas modifié : le choix et l'intégration d'une piste se font ensuite.

**Prérequis de l'environnement cloud :**
- `api.sunoapi.org` autorisé dans l'accès réseau ;
- l'identifiant d'API « Suno API », pris en compte dans une **nouvelle** session ;
- l'hôte des fichiers audio renvoyés par l'API autorisé lui aussi (visible dans `sourceHost` après le premier essai).
