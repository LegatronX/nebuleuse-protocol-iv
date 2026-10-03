"""Prépare la distribution statique sans embarquer les masters Suno."""
from pathlib import Path
import hashlib
import json
import shutil

root = Path(__file__).resolve().parent.parent
out = root / 'dist'
if out.exists():
    shutil.rmtree(out)
out.mkdir()
for name in ('index.html', 'sw.js', 'manifest.json', 'icons', 'experience', 'assets'):
    src = root / name
    dst = out / name
    if src.is_dir():
        shutil.copytree(src, dst, ignore=shutil.ignore_patterns('suno-originals'))
    else:
        shutil.copy2(src, dst)
tracks = list((out / 'assets/music/game').glob('*.mp3'))
assert len(tracks) == 31, f'31 morceaux attendus, trouvé : {len(tracks)}'
print(json.dumps({'distribution': str(out), 'tracks': len(tracks),
                  'index_sha256': hashlib.sha256((out / 'index.html').read_bytes()).hexdigest(),
                  'bytes': sum(p.stat().st_size for p in out.rglob('*') if p.is_file())}))
