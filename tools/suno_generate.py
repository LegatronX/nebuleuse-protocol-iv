#!/usr/bin/env python3
"""Crée des musiques pour Nébuleuse Protocol IV via sunoapi.org, puis les range dans le jeu.

Dépense des crédits : par défaut, n'affiche que la requête (essai à blanc).
Il faut --confirm pour lancer réellement la génération.

Usage :
    python3 tools/suno_generate.py --cue combat                 # essai à blanc
    python3 tools/suno_generate.py --cue combat --confirm       # génère, attend, télécharge
    python3 tools/suno_generate.py --title "Acte VI" --style "…" --prompt "…" --confirm
    python3 tools/suno_generate.py --list-cues

Authentification : SUNO_KEY dans l'environnement, ou identifiant « Suno API »
injecté par le proxy de l'environnement cloud (aucune clé visible).
Les morceaux obtenus vont dans assets/music/suno-originals/ avec leur entrée de
manifeste (même format que tools/suno_recover.py). Le jeu n'est pas modifié :
l'intégration d'une piste se décide ensuite.
"""
import argparse
import json
import os
import sys
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import suno_recover as rec  # noqa: E402

# Palette sonore commune : cohérente avec la bande-son studio actuelle du jeu.
HOUSE_STYLE = "cinematic space synthwave, orchestral hybrid, deep sub bass, wide stereo, seamless loop"
NEGATIVE = ("vocals, lyrics, singing, bad quality, distortion, noise, clipping, muddy, thin, harsh, "
            "artifacts, fade out")

# Préréglages par usage dans le jeu (toujours instrumentaux, pensés pour boucler).
CUES = {
    "menu": ("Nébuleuse — Menu", "ambient, slow, 80 bpm, pads, distant choir texture",
             "Calm, mysterious theme for a space shooter title screen; evolving pads, gentle arpeggio."),
    "combat": ("Nébuleuse — Combat", "driving, 140 bpm, synth bass, tight drums, heroic lead",
               "Energetic space-shooter combat loop with constant momentum, no build-down."),
    "boss": ("Nébuleuse — Boss", "epic, 150 bpm, brass hits, choir, pounding drums, minor key",
             "Menacing boss battle theme, relentless, big orchestral-synth hybrid."),
    "final": ("Nébuleuse — Boss final", "apocalyptic, 160 bpm, full orchestra, choir, industrial synths",
              "Final confrontation with a cosmic entity, grandiose and desperate."),
    "phenomene": ("Nébuleuse — Phénomène", "ethereal, no drums, shimmering pads, whale-like drones",
                  "Awe-struck ambient cue while a rare cosmic phenomenon crosses the sky."),
    "victoire": ("Nébuleuse — Victoire", "triumphant, 120 bpm, brass fanfare, soaring strings",
                 "Short victory theme after defeating the final boss."),
}


def api_post(path, payload, key):
    req = urllib.request.Request(
        f"{rec.BASE_URL}{path}", data=json.dumps(payload).encode("utf-8"), method="POST",
        headers={"Content-Type": "application/json", **({"Authorization": f"Bearer {key}"} if key else {})})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def build(args):
    if args.cue:
        title, style, prompt = CUES[args.cue]
    else:
        title, style, prompt = args.title, args.style, args.prompt
    if not (title and style and prompt):
        sys.exit("Indiquer --cue, ou bien --title, --style et --prompt.")
    return {
        "model": args.model,
        "customMode": True,
        "instrumental": True,
        "title": title[:80],
        "style": f"{style}, {HOUSE_STYLE}"[:1000],
        "prompt": prompt,
        "negativeTags": NEGATIVE,
        # obligatoire pour l'API ; le résultat est lu par interrogation, pas par rappel
        "callBackUrl": "https://example.com",
    }


def wait(task_id, key, timeout_s):
    deadline = time.time() + timeout_s
    delay = 10
    while time.time() < deadline:
        res = rec.api_get("/generate/record-info", {"taskId": task_id}, key)
        status = (res.get("data") or {}).get("status", "?")
        print(f"  état : {status}")
        if status == "SUCCESS":
            return True
        if status.endswith("FAILED") or status in ("SENSITIVE_WORD_ERROR", "CREATE_TASK_FAILED"):
            return False
        time.sleep(delay)
        delay = min(30, delay + 5)
    return False


def credits(key):
    """Lecture seule : crédits restants (aucune dépense)."""
    for path in ("/generate/credit", "/account/credits", "/credits"):
        try:
            res = rec.api_get(path, {}, key)
        except Exception as e:  # endpoint absent
            print(f"  {path} : {e}")
            continue
        print(f"  {path} : {json.dumps(res, ensure_ascii=False)}")
        return res
    return None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--cue", choices=sorted(CUES))
    ap.add_argument("--title")
    ap.add_argument("--style")
    ap.add_argument("--prompt")
    ap.add_argument("--model", default="V5")
    ap.add_argument("--confirm", action="store_true", help="lance réellement la génération (dépense des crédits)")
    ap.add_argument("--timeout", type=int, default=900, help="attente maximale en secondes")
    ap.add_argument("--list-cues", action="store_true")
    ap.add_argument("--credits", action="store_true", help="affiche les crédits restants (lecture seule)")
    args = ap.parse_args()
    if args.list_cues:
        for k, (t, s, p) in CUES.items():
            print(f"{k:10} {t} — {s}")
        return
    if args.credits:
        sys.exit(0 if credits(os.environ.get("SUNO_KEY")) is not None else 1)
    payload = build(args)
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if not args.confirm:
        print("\nEssai à blanc : rien n'a été envoyé. Ajouter --confirm pour générer (dépense des crédits).")
        return
    key = os.environ.get("SUNO_KEY")
    res = api_post("/generate", payload, key)
    task_id = (res.get("data") or {}).get("taskId")
    if not task_id:
        sys.exit(f"Génération refusée : {res.get('msg') or res}")
    print(f"Tâche créée : {task_id} (à conserver : elle permet de relire le résultat plus tard)")
    ok = wait(task_id, key, args.timeout)
    if not ok:
        sys.exit(f"Tâche non terminée. Relancer plus tard : python3 tools/suno_recover.py --task {task_id}")
    os.makedirs(rec.OUT_DIR, exist_ok=True)
    manifest = rec.load_manifest()
    manifest.setdefault("failures", [])
    known = {t["sha256"]: t["path"] for t in manifest["tracks"] if t.get("sha256")}
    n = rec.recover_task(task_id, key, manifest, known)
    for t in manifest["tracks"]:
        if t.get("taskId") == task_id:
            t["cue"] = args.cue or "libre"
            t["generatedBy"] = "tools/suno_generate.py"
    manifest.pop("status", None)
    with open(rec.MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"{n} morceau(x) ajouté(s) dans {rec.OUT_DIR}")


if __name__ == "__main__":
    main()
