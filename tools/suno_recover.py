#!/usr/bin/env python3
"""Récupère des morceaux Suno déjà générés (sunoapi.org) sans lancer de génération.

Lecture seule : un GET /generate/record-info par identifiant de tâche, puis le
téléchargement des fichiers audio. Rien d'autre n'est appelé.

Usage :
    export SUNO_KEY=...             # jamais versionné (voir docs/SUNO_RECOVERY.md)
    python3 tools/suno_recover.py tasks.txt
    python3 tools/suno_recover.py --task ID1 --task ID2

tasks.txt : un identifiant de tâche par ligne (les lignes vides et « # » sont ignorées).
Sortie : assets/music/suno-originals/<slug>--<id8>.<ext> + manifest.json (fusionné).
"""
import argparse
import datetime as dt
import hashlib
import json
import os
import re
import subprocess
import sys
import time
import unicodedata
import urllib.parse
import urllib.request

BASE_URL = "https://api.sunoapi.org/api/v1"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "assets", "music", "suno-originals")
MANIFEST = os.path.join(OUT_DIR, "manifest.json")
UNKNOWN = "inconnu"
# signatures des formats audio attendus
MAGIC = {b"ID3": "mp3", b"RIFF": "wav", b"fLaC": "flac", b"OggS": "ogg"}
RIGHTS_NOTE = ("Droits commerciaux non vérifiés par ce script : dépendent de l'abonnement "
               "Suno / sunoapi.org actif au moment de la génération. À confirmer dans le "
               "tableau de bord du fournisseur.")


def api_get(path, params, key):
    url = f"{BASE_URL}{path}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {key}"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def slug(text):
    text = unicodedata.normalize("NFKD", text or "sans-titre").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:48] or "sans-titre"


def sniff(path):
    with open(path, "rb") as f:
        head = f.read(12)
    for sig, fmt in MAGIC.items():
        if head.startswith(sig):
            return fmt
    if head[:2] in (b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"):
        return "mp3"
    if head[4:8] == b"ftyp":
        return "m4a"
    return None


def probe(path):
    """Durée via ffprobe si disponible (et preuve que le fichier se décode)."""
    try:
        out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                              "-of", "default=nw=1:nk=1", path],
                             capture_output=True, text=True, timeout=60)
        return round(float(out.stdout.strip()), 2) if out.returncode == 0 else None
    except (FileNotFoundError, ValueError, subprocess.TimeoutExpired):
        return None


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def download(url, dest):
    tmp = dest + ".part"
    with urllib.request.urlopen(url, timeout=120) as r, open(tmp, "wb") as f:
        while True:
            chunk = r.read(1 << 20)
            if not chunk:
                break
            f.write(chunk)
    os.replace(tmp, dest)


def clean_url(url):
    """Ne garde jamais la query (jetons, signatures) dans le manifeste."""
    if not url:
        return None
    p = urllib.parse.urlsplit(url)
    return urllib.parse.urlunsplit((p.scheme, p.netloc, p.path, "", ""))


def load_manifest():
    if os.path.exists(MANIFEST):
        with open(MANIFEST, encoding="utf-8") as f:
            return json.load(f)
    return {"schema": 1, "tracks": [], "failures": []}


def recover_task(task_id, key, manifest, known_hashes):
    res = api_get("/generate/record-info", {"taskId": task_id}, key)
    data = res.get("data") or {}
    status = data.get("status", UNKNOWN)
    clips = (data.get("response") or {}).get("sunoData") or []
    if not clips:
        manifest["failures"].append({"taskId": task_id, "status": status,
                                     "reason": res.get("msg") or "aucun morceau dans la réponse"})
        return 0
    params = data.get("param")
    if isinstance(params, str):
        try:
            params = json.loads(params)
        except ValueError:
            params = {"raw": params}
    params = params or {}
    n = 0
    for c in clips:
        url = c.get("sourceAudioUrl") or c.get("audioUrl")
        cid = c.get("id") or UNKNOWN
        if not url:
            manifest["failures"].append({"taskId": task_id, "id": cid, "reason": "pas d'URL audio"})
            continue
        ext = os.path.splitext(urllib.parse.urlsplit(url).path)[1].lstrip(".") or "mp3"
        name = f"{slug(c.get('title'))}--{cid[:8]}.{ext}"
        dest = os.path.join(OUT_DIR, name)
        try:
            if not os.path.exists(dest):
                download(url, dest)
        except Exception as e:  # URL expirée, réseau…
            manifest["failures"].append({"taskId": task_id, "id": cid, "reason": f"téléchargement : {e}"})
            continue
        fmt = sniff(dest)
        if not fmt:
            os.remove(dest)
            manifest["failures"].append({"taskId": task_id, "id": cid, "reason": "fichier non audio"})
            continue
        probed = probe(dest)
        digest = sha256(dest)
        dup = known_hashes.get(digest)
        created = c.get("createTime") or data.get("createTime")
        if isinstance(created, (int, float)):
            created = dt.datetime.fromtimestamp(created / (1000 if created > 1e11 else 1), dt.timezone.utc).isoformat()
        entry = {
            "title": c.get("title") or UNKNOWN,
            "path": f"assets/music/suno-originals/{name}",
            "trackId": cid,
            "taskId": task_id,
            "provider": "sunoapi.org (Suno)",
            "model": c.get("modelName") or params.get("model") or UNKNOWN,
            "createdAt": created or UNKNOWN,
            "duration_s": c.get("duration") or probed or UNKNOWN,
            "decodable": True if probed is not None else "non vérifié (ffprobe absent ou échec)",
            "format": fmt,
            "bytes": os.path.getsize(dest),
            "prompt": c.get("prompt") or params.get("prompt") or UNKNOWN,
            "style": c.get("tags") or params.get("style") or UNKNOWN,
            "instrumental": params.get("instrumental", UNKNOWN),
            "sha256": digest,
            "duplicateOf": dup,
            "sourceHost": clean_url(url),
            "rights": {"status": UNKNOWN, "source": RIGHTS_NOTE},
            "recoveredAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        }
        manifest["tracks"] = [t for t in manifest["tracks"] if t.get("trackId") != cid] + [entry]
        known_hashes.setdefault(digest, entry["path"])
        n += 1
    return n


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("file", nargs="?", help="fichier d'identifiants de tâches")
    ap.add_argument("--task", action="append", default=[], help="identifiant de tâche (répétable)")
    args = ap.parse_args()
    key = os.environ.get("SUNO_KEY")
    if not key:
        sys.exit("SUNO_KEY absente de l'environnement (voir docs/SUNO_RECOVERY.md).")
    tasks = list(args.task)
    if args.file:
        with open(args.file, encoding="utf-8") as f:
            tasks += [l.strip() for l in f if l.strip() and not l.startswith("#")]
    if not tasks:
        sys.exit("Aucun identifiant de tâche fourni.")
    os.makedirs(OUT_DIR, exist_ok=True)
    manifest = load_manifest()
    manifest["failures"] = []
    known = {t["sha256"]: t["path"] for t in manifest["tracks"] if t.get("sha256")}
    total = 0
    for tid in dict.fromkeys(tasks):
        try:
            total += recover_task(tid, key, manifest, known)
        except Exception as e:
            manifest["failures"].append({"taskId": tid, "reason": f"API : {e}"})
        time.sleep(0.5)  # courtoisie envers l'API
    manifest["generatedAt"] = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"{total} morceau(x) récupéré(s), {len(manifest['failures'])} échec(s). Manifeste : {MANIFEST}")


if __name__ == "__main__":
    main()
