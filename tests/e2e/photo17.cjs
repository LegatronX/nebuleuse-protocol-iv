// Nébuleuse Protocol IV — Tests V5.17 : Instantané cosmique (mode photo)
// Usage : NODE_PATH=<node_modules globaux> node tests/e2e/photo17.cjs [appDir]
// Contexte tactile type iPhone 14 (390×844, DPR 3). Captures : tests/e2e/artifacts/v517-*.png
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/home/kimi/.npm-global/lib/node_modules/playwright'); } })();

const APP_DIR = process.argv[2] || path.join(__dirname, '..', '..');
const PORT = 8171;
const BASE = `http://localhost:${PORT}/index.html`;
const ART_DIR = path.join(__dirname, 'artifacts');
fs.mkdirSync(ART_DIR, { recursive: true });
const IPHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

let pass = 0, fail = 0;
const errors = [];

async function main() {
  const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: APP_DIR, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 1200));
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext(IPHONE);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text().split('\n')[0];
    if (/Failed to load resource|net::ERR/i.test(t)) return;
    errors.push('CONSOLE: ' + t);
  });
  const G = (fn, arg) => page.evaluate(fn, arg);
  const wait = (ms) => page.waitForTimeout(ms);
  const shot = (n) => page.screenshot({ path: path.join(ART_DIR, n + '.png') }).catch(() => {});
  const T = async (name, fn) => {
    const mark = errors.length;
    try {
      await fn();
      const ne = errors.slice(mark);
      if (ne.length) { fail++; console.log(`FAIL ${name} — ${ne[0].slice(0, 160)}`); }
      else { pass++; console.log(`PASS ${name}`); }
    } catch (e) { fail++; console.log(`FAIL ${name} — ${e.message.slice(0, 200)}`); }
  };
  const A = (c, m) => { if (!c) throw new Error(m || 'assert'); };
  // un ennemi factice immobile hors écran fige la vague (pas de boss pendant la contemplation)
  const FREEZE = () => { const g = window.__NP4; g.enemies.length = 0; g.enemies.push({ type: 'dummy', x: 195, y: -70, r: 1, hp: 1e9, maxHp: 1e9, vy: 0, fireCd: 999, t: 0, score: 0 }); };

  await page.goto(BASE + '?seed=photo17');
  await G(() => { localStorage.clear(); localStorage.setItem('nebula4_meta', JSON.stringify({ tuto: true, nanites: 1000, autoFire: true })); });
  await page.reload();
  await wait(1800);
  await G(() => document.querySelectorAll('.overlay:not(#menu)').forEach((o) => o.classList.add('hidden')));

  await T('boot : pont photo, bouton « Mode photo » dans la pause, obturateur masqué', async () => {
    const r = await G(() => ({
      br: !!window.__NP4.photo,
      pause: !!document.querySelector('#pauseOverlay #photoPauseBtn'),
      btn: window.__NP4.photo.btnVisible(),
      filters: window.__NP4.photo.filters.length,
      formats: window.__NP4.photo.formats.length
    }));
    A(r.br && r.pause && !r.btn && r.filters === 5 && r.formats === 4, JSON.stringify(r));
  });

  await T('pendant un phénomène : l’obturateur 📷 apparaît (≥ 44 px, dans l’écran)', async () => {
    await page.tap('#modeCampagne');
    await wait(2800);
    await G(() => { window.__NP4.player.invuln = 999; });
    await G(FREEZE);
    await G(() => window.__NP4.phen.force('baleine'));
    await G(() => window.__NP4.phen.skip(6));
    await G(FREEZE);
    await wait(500);
    const r = await G(() => { const b = document.getElementById('photoBtn').getBoundingClientRect(); return { on: window.__NP4.photo.btnVisible(), w: b.width, h: b.height, r: b.right, t: b.top }; });
    A(r.on && r.w >= 44 && r.h >= 44 && r.r <= 390 && r.t > 150, JSON.stringify(r));
  });

  let frozen = null;
  await T('tap 📷 : action gelée, HUD masqué, image prélevée après le pipeline GPU', async () => {
    await page.tap('#photoBtn');
    await wait(700);
    const r = await G(() => {
      const g = window.__NP4;
      return {
        state: g.state, ready: g.photo.ready(), shot: g.photo.shot(), gpu: g.photo.gpu(), tier: g.fx.tier(), phen: g.photo.phen(),
        hud: getComputedStyle(document.getElementById('hud')).visibility,
        t: g.phen.active() && g.phen.active().t, score: g.score, px: g.player.x
      };
    });
    frozen = r;
    A(r.state === 'photo' && r.ready && r.phen === 'baleine' && r.hud === 'hidden', JSON.stringify(r));
    A(r.shot && r.shot.w > 300 && r.shot.h > 600, 'image ' + JSON.stringify(r.shot));
    A(r.tier === 0 || r.gpu, 'prélèvement hors pipeline GPU');
    await wait(800);
    const r2 = await G(() => ({ t: window.__NP4.phen.active() && window.__NP4.phen.active().t, score: window.__NP4.score, state: window.__NP4.state }));
    A(r2.t === r.t && r2.score === r.score && r2.state === 'photo', 'le jeu a continué : ' + JSON.stringify(r2));
    await shot('v517-chambre-noire');
  });

  await T('filtres : chaque filtre change réellement l’image (Noir & Or désature, Infrarouge inverse les dominantes)', async () => {
    const m = await G(() => {
      const p = window.__NP4.photo, o = {};
      for (const f of p.filters) { p.set({ filter: f, card: false }); o[f] = p.mean(); }
      return o;
    });
    const d = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
    A(d(m.brut, m.nebuleuse) > 3 && d(m.brut, m.noiror) > 3 && d(m.brut, m.argentique) > 3 && d(m.brut, m.infrarouge) > 3, JSON.stringify(m));
    A(m.noiror[2] < m.noiror[0], 'Noir & Or doit tirer vers l’or ' + JSON.stringify(m.noiror));
  });

  await T('formats et cadrage : 1:1 carré, Cinéma 2:1, zoom ×2 = moitié du champ, cadre borné', async () => {
    const r = await G(() => {
      const p = window.__NP4.photo;
      p.set({ format: 'carre', zoom: 1, cx: 0.5, cy: 0.5 }); const sq = p.crop();
      p.set({ format: 'cinema' }); const ci = p.crop();
      p.set({ format: 'plein', zoom: 1 }); const full = p.crop();
      p.set({ zoom: 2 }); const z2 = p.crop();
      p.set({ zoom: 9, cx: -3, cy: 5 }); const out = p.crop(); const sh = p.shot();
      return { sq, ci, full, z2, out, sh };
    });
    A(Math.abs(r.sq.w - r.sq.h) < 1, 'carré ' + JSON.stringify(r.sq));
    A(Math.abs(r.ci.w / r.ci.h - 2) < 0.01, 'cinéma ' + JSON.stringify(r.ci));
    A(Math.abs(r.z2.w - r.full.w / 2) < 1, 'zoom ' + JSON.stringify(r.z2));
    A(r.out.x >= 0 && r.out.y >= 0 && r.out.x + r.out.w <= r.sh.w + 0.5 && r.out.y + r.out.h <= r.sh.h + 0.5 && Math.abs(r.out.w - r.full.w / 3) < 1, 'bornes ' + JSON.stringify(r));
  });

  await T('geste : glisser déplace le cadre (zoom ×2)', async () => {
    await G(() => window.__NP4.photo.set({ zoom: 2, cx: 0.5, cy: 0.5, format: 'plein' }));
    const c0 = await G(() => window.__NP4.photo.crop());
    const b = await G(() => { const r = document.getElementById('photoCanvas').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await page.mouse.move(b.x, b.y);
    await page.mouse.down();
    await page.mouse.move(b.x + 60, b.y + 80, { steps: 6 });
    await page.mouse.up();
    await wait(200);
    const c1 = await G(() => window.__NP4.photo.crop());
    A(c1.x < c0.x - 10 && c1.y < c0.y - 10, JSON.stringify({ c0, c1 }));
  });

  let nano0 = 0;
  await T('capture : tirage JPEG HD (petit côté ≥ 1080 px), vignette rangée dans le Carnet, +20 ⬡ au premier cliché', async () => {
    await G(() => window.__NP4.photo.set({ zoom: 1, cx: 0.5, cy: 0.5, format: 'portrait', filter: 'nebuleuse', card: true }));
    await wait(200);
    await shot('v517-cadrage-4-5');
    nano0 = await G(() => JSON.parse(localStorage.getItem('nebula4_meta')).nanites);
    await page.tap('#photoShoot');
    await wait(900);
    const r = await G(() => {
      const meta = JSON.parse(localStorage.getItem('nebula4_meta'));
      const e = meta.phen && meta.phen.baleine;
      return { blob: window.__NP4.photo.blob(), res: !document.getElementById('photoResult').classList.contains('hidden'), photo: e && e.photo && e.photo.slice(0, 22), len: e && e.photo && e.photo.length, shots: e && e.shots, nano: meta.nanites, txt: document.getElementById('photoResultTxt').textContent, img: (() => { const i = document.getElementById('photoImg'); return { w: i.naturalWidth, h: i.naturalHeight }; })() };
    });
    A(r.res && r.blob && r.blob.type === 'image/jpeg' && r.blob.size > 20000 && /^np4-baleine-\d{8}-\d{6}\.jpg$/.test(r.blob.name), JSON.stringify(r.blob));
    A(Math.min(r.img.w, r.img.h) >= 1080 && Math.abs(r.img.w / r.img.h - 0.8) < 0.01, 'tirage ' + JSON.stringify(r.img));
    A(r.photo === 'data:image/jpeg;base64' && r.len < 40000 && r.shots === 1, 'vignette ' + JSON.stringify({ p: r.photo, l: r.len }));
    A(r.nano === nano0 + 20 && /\+20/.test(r.txt), `nanites ${nano0} → ${r.nano}`);
    await shot('v517-tirage');
  });

  await T('partage : feuille de partage iOS avec le fichier JPEG (repli téléchargement sinon)', async () => {
    await G(() => {
      window.__shared = null;
      navigator.canShare = (d) => !!(d && d.files && d.files.length);
      navigator.share = async (d) => { window.__shared = { name: d.files[0].name, type: d.files[0].type, size: d.files[0].size }; };
    });
    await page.tap('#photoShare');
    await wait(300);
    const s = await G(() => window.__shared);
    A(s && /\.jpg$/.test(s.name) && s.type === 'image/jpeg' && s.size > 20000, JSON.stringify(s));
    // repli : pas d'API de partage → téléchargement
    await G(() => { navigator.canShare = undefined; });
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 4000 }), page.tap('#photoShare')]);
    A(/^np4-baleine-.*\.jpg$/.test(dl.suggestedFilename()), dl.suggestedFilename());
  });

  await T('second cliché : pas de double bonus, compteur de clichés incrémenté', async () => {
    await page.tap('#photoAgain');
    await G(() => window.__NP4.photo.set({ filter: 'noiror', format: 'carre' }));
    await page.tap('#photoShoot');
    await wait(700);
    const m = await G(() => JSON.parse(localStorage.getItem('nebula4_meta')));
    A(m.nanites === nano0 + 20 && m.phen.baleine.shots === 2 && m.photos === 2, JSON.stringify({ n: m.nanites, s: m.phen.baleine.shots, p: m.photos }));
  });

  await T('reprendre : compte à rebours puis jeu, HUD de retour, phénomène reprend où il était', async () => {
    await page.tap('#photoDone');
    await wait(300);
    const mid = await G(() => ({ state: window.__NP4.state, ov: document.getElementById('photoOverlay').classList.contains('hidden'), cls: document.body.classList.contains('photo-mode') }));
    await wait(3600);
    const r = await G(() => ({ state: window.__NP4.state, hud: getComputedStyle(document.getElementById('hud')).visibility, t: window.__NP4.phen.active() && window.__NP4.phen.active().t }));
    A(mid.ov && !mid.cls && mid.state !== 'photo', JSON.stringify(mid));
    A(r.state === 'playing' && r.hud === 'visible', JSON.stringify(r));
    A(r.t == null || r.t >= frozen.t, 'le phénomène a reculé');
  });

  await T('depuis la pause : 📷 Mode photo → Retour revient à la pause (sans relancer le jeu)', async () => {
    await G(() => window.__NP4.phen.end && window.__NP4.phen.end());
    await page.tap('#pauseBtn');
    await wait(300);
    await page.tap('#photoPauseBtn');
    await wait(600);
    const r1 = await G(() => ({ state: window.__NP4.state, ready: window.__NP4.photo.ready(), phen: window.__NP4.photo.phen(), pause: document.getElementById('pauseOverlay').classList.contains('hidden') }));
    A(r1.state === 'photo' && r1.ready && r1.phen === null && r1.pause, JSON.stringify(r1));
    await G(() => window.__NP4.photo.set({ filter: 'argentique', card: true }));
    await shot('v517-sans-phenomene');
    await page.tap('#photoBack');
    await wait(300);
    const r2 = await G(() => ({ state: window.__NP4.state, pause: !document.getElementById('pauseOverlay').classList.contains('hidden') }));
    A(r2.state === 'paused' && r2.pause, JSON.stringify(r2));
    await page.tap('#resumeBtn');
    await wait(3400);
    A(await G(() => window.__NP4.state) === 'playing', 'reprise');
  });

  await T('hors phénomène : pas d’obturateur (le HUD ne se charge pas d’un bouton inutile)', async () => {
    await wait(300);
    A(!(await G(() => window.__NP4.photo.btnVisible())), 'bouton visible hors phénomène');
  });

  await T('Carnet : la tuile de la Baleine affiche le cliché du joueur', async () => {
    await page.tap('#pauseBtn');
    await wait(300);
    await page.tap('#pauseMenuBtn');
    await wait(600);
    await G(() => document.querySelectorAll('.overlay:not(#menu)').forEach((o) => o.classList.add('hidden')));
    A(await G(() => window.__NP4.state) === 'menu', 'retour menu');
    await G(() => document.getElementById('carnetBtn').click());
    await wait(400);
    const r = await G(() => { const t = document.querySelector('#carnetGrid .has-photo'); return t ? { bg: getComputedStyle(t).backgroundImage.slice(0, 26), n: document.querySelectorAll('#carnetGrid .has-photo').length } : null; });
    A(r && r.n === 1 && /url\("data:image\/jpeg/.test(r.bg), JSON.stringify(r));
    await shot('v517-carnet');
    await G(() => document.getElementById('carnetClose').click());
  });

  await T('touche O au clavier et Échap pour sortir', async () => {
    await G(() => { document.querySelectorAll('.overlay:not(#menu)').forEach((o) => o.classList.add('hidden')); document.getElementById('menu').classList.remove('hidden'); });
    await page.tap('#modeCampagne');
    await wait(2800);
    await page.keyboard.press('KeyO');
    await wait(500);
    const a = await G(() => window.__NP4.state);
    await page.keyboard.press('Escape');
    await wait(300);
    const b = await G(() => window.__NP4.state);
    A(a === 'photo' && b !== 'photo', a + ' → ' + b);
    await wait(3500);
  });

  await T('module v5.17 sans Math.random / rand / pick · intégré · SW versionné', async () => {
    const src = fs.readFileSync(path.join(APP_DIR, 'v517.js'), 'utf8').replace(/\/\/.*$/gm, '');
    A(!/Math\.random\s*\(|\brand\(|\bpick\(/.test(src), 'appel aléatoire global');
    const html = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');
    A(html.indexOf('MODULE V5.17') > html.indexOf('MODULE V5.14 — PIPELINE'), 'v5.17 doit suivre le pipeline GPU');
    A(/np4-v5\.1[7-9]/.test(fs.readFileSync(path.join(APP_DIR, 'sw.js'), 'utf8')), 'sw non versionné');
  });

  await browser.close();
  server.kill();
  console.log(`\n=== MODE PHOTO V17: ${pass} PASS · ${fail} FAIL ===`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error('FATAL', e); process.exit(2); });
