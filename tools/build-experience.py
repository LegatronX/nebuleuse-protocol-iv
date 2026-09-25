"""Synchronize the v5.18 source module into the historical single-scope engine."""
from pathlib import Path
import re
root = Path(__file__).resolve().parents[1]
p = root / 'index.html'
html = p.read_text()
start = '      // BEGIN EXPERIENCE V5.18\n'
end = '      // END EXPERIENCE V5.18\n'
block = start + (root / 'v518.js').read_text() + '\n' + end
if start in html:
    html = re.sub(re.escape(start) + r'.*?' + re.escape(end), lambda _: block, html, count=1, flags=re.S)
else:
    anchor = '      let last = performance.now();'
    assert html.count(anchor) == 1
    html = html.replace(anchor, block + '\n' + anchor)
p.write_text(html)
