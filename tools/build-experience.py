"""Synchronize the source modules (v5.18+) into the historical single-scope engine."""
from pathlib import Path
import re
root = Path(__file__).resolve().parents[1]
p = root / 'index.html'
html = p.read_text()
anchor = '      let last = performance.now();'
# (source file, marker tag) — order matters: each module wraps the previous ones.
MODULES = [('v518.js', 'EXPERIENCE V5.18'), ('v519.js', 'ESCADRILLES V5.19')]
for src, tag in MODULES:
    start = f'      // BEGIN {tag}\n'
    end = f'      // END {tag}\n'
    block = start + (root / src).read_text() + '\n' + end
    if start in html:
        html = re.sub(re.escape(start) + r'.*?' + re.escape(end), lambda _: block, html, count=1, flags=re.S)
    else:
        assert html.count(anchor) == 1
        html = html.replace(anchor, block + '\n' + anchor)
p.write_text(html)
