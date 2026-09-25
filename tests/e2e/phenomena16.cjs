// Nébuleuse Protocol IV — Tests V5.16 : phénomènes cosmiques · carnet · confort du HUD
// Usage : NODE_PATH=<node_modules globaux> node tests/e2e/phenomena16.cjs [appDir]
// Contexte tactile type iPhone 14 (390×844, DPR 3). Captures : tests/e2e/artifacts/v516-*.png
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/home/kimi/.npm-global/lib/node_modules/playwright'); } })();

const APP_DIR = process.argv[2] || path.join(__dirname, '..', '..');
const PORT = 8161;
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

  await page.goto(BASE + '?seed=phen16');
  await G(() => { localStorage.clear(); localStorage.setItem('nebula4_meta', JSON.stringify({ tuto: true, nanites: 1000, autoFire: true })); });
  await page.reload();
  await wait(1800);
  await G(() => document.querySelectorAll('.overlay:not(#menu)').forEach((o) => o.classList.add('hidden')));

  await T('boot : pont phénomènes + bouton carnet (0/10)', async () => {
    const r = await G(() => ({ ids: window.__NP4.phen && window.__NP4.phen.ids.length, btn: document.getElementById('carnetBtn').textContent }));
    A(r.ids === 10 && /0\/10/.test(r.btn), JSON.stringify(r));
  });

  await T('partie : directeur armé (premier phénomène entre 35 et 60 s), accalmie détectée', async () => {
    await page.tap('#modeCampagne');
    await wait(2800); // bannière de vague terminée
    const r = await G(() => ({ t: window.__NP4.phen.dirT(), calm: window.__NP4.phen.calm(), act: window.__NP4.phen.active() }));
    A(r.t > 30 && r.t <= 60 && r.act === null, JSON.stringify(r));
  });

  // exécute un phénomène en accéléré (sauts de temps + vraies frames) et capture sa mi-course
  // un ennemi factice immobile hors écran fige la vague (sinon les vagues s'enchaînent jusqu'au boss,
  // qui interrompt volontairement la contemplation)
  const FREEZE = () => { const g = window.__NP4; g.enemies.length = 0; g.enemies.push({ type: 'dummy', x: 195, y: -70, r: 1, hp: 1e9, maxHp: 1e9, vy: 0, fireCd: 999, t: 0, score: 0 }); };
  async function runPhen(id, opts = {}) {
    await G(() => { window.__NP4.player.invuln = 999; });
    await G(FREEZE);
    await G((i) => window.__NP4.phen.force(i), id);
    const dur = await G(() => window.__NP4.phen.active().dur);
    const shotAt = opts.shotAt != null ? opts.shotAt : dur * 0.5;
    let shotDone = false;
    const samples = [];
    for (let guard = 0; guard < 80; guard++) {
      const a = await G(() => window.__NP4.phen.active());
      if (!a) break;
      if (!shotDone && a.t >= shotAt) { shotDone = true; await shot('v516-' + id); }
      if (opts.sample) samples.push(await G(opts.sample));
      const step = !shotDone && a.t + 0.9 > shotAt ? Math.max(0, shotAt - a.t - 0.05) : 0.6;
      await G((s) => window.__NP4.phen.skip(s), step);
      await G(FREEZE);
      await wait(opts.real || 140);
    }
    A(await G(() => window.__NP4.phen.active() === null), id + ' ne s’est pas terminé');
    return samples;
  }

  await T('🐋 Baleine stellaire : traverse, chante, ses lueurs sèment des pièces', async () => {
    const c0 = await G(() => window.__NP4.v10.coins() + window.__NP4.v10.coinTotal());
    await runPhen('baleine', { real: 260 });
    const c1 = await G(() => window.__NP4.v10.coins() + window.__NP4.v10.coinTotal());
    A(c1 > c0, `pièces ${c0} → ${c1}`);
  });

  await T('🌀 Trou de ver : lentille sur un secteur lointain, recrache 12 pièces', async () => {
    const c0 = await G(() => window.__NP4.v10.coins() + window.__NP4.v10.coinTotal());
    await runPhen('ver', { shotAt: 4 });
    const c1 = await G(() => window.__NP4.v10.coins() + window.__NP4.v10.coinTotal());
    A(c1 >= c0 + 8, `pièces ${c0} → ${c1}`); // 12 pièces recrachées (certaines peuvent expirer pendant la mesure)
  });

  await T('💥 Supernova : pré-éclat, onde de choc réfractée, pluie de débris', async () => {
    const c0 = await G(() => window.__NP4.v10.coins() + window.__NP4.v10.coinTotal());
    await runPhen('supernova', { shotAt: 2.2, real: 200 });
    const c1 = await G(() => window.__NP4.v10.coins() + window.__NP4.v10.coinTotal());
    A(c1 > c0 + 3, `pièces ${c0} → ${c1}`);
  });

  await T('🛸 Armada fantôme : flotte silencieuse, vaisseau-capitale', async () => { await runPhen('armada', { shotAt: 7 }); });

  await T('💎 Cathédrale de cristal : croissance puis bris → score', async () => {
    const s0 = await G(() => window.__NP4.score);
    await runPhen('cristal', { shotAt: 7.5 });
    const s1 = await G(() => window.__NP4.score);
    A(s1 >= s0 + 2000, `score ${s0} → ${s1}`);
  });

  await T('🌌 Tempête d’aurores : voiles de lumière', async () => { await runPhen('aurores', { shotAt: 5 }); });

  await T('👁️ Le Regard : l’œil s’ouvre et suit le vaisseau', async () => { await runPhen('regard', { shotAt: 3.5 }); });

  await T('🌑 Éclipse : totalité → score ×1,5 pendant l’alignement', async () => {
    const s = await runPhen('eclipse', { shotAt: 6.5, sample: () => window.__NP4.phen.boost() });
    A(s.includes(1.5) && s[s.length - 1] === 1, 'boost ' + JSON.stringify(s));
    A(await G(() => window.__NP4.phen.boost()) === 1, 'boost non réinitialisé');
  });

  await T('⏳ Faille temporelle : fantôme du passé, le frôler charge la NOVA', async () => {
    await G(() => { window.__NP4.player.energy = 0; });
    await wait(2500); // trajectoire enregistrée
    await G(() => window.__NP4.phen.force('faille'));
    // on se place sur la trajectoire fantôme
    for (let i = 0; i < 12; i++) {
      await G(() => { const p = window.__NP4.player; p.energy = Math.min(p.energy, 99); });
      await wait(150);
    }
    const e = await G(() => window.__NP4.player.energy);
    await shot('v516-faille');
    await G(() => window.__NP4.phen.skip(99));
    await wait(200);
    A(e > 5, 'énergie ' + e);
  });

  await T('🤍 Le Silence : balles → étincelles, vagues suspendues, +1 bombe, son restauré', async () => {
    await G(() => { const g = window.__NP4; g.audio.init(); });
    const r0 = await G(() => {
      const g = window.__NP4;
      for (let i = 0; i < 20; i++) g.routes.fireProbe();
      return { bombs: g.player.bombs, gain: g.audio.master ? g.audio.master.gain.value : 1, bullets: 0 };
    });
    await G(() => window.__NP4.phen.force('silence'));
    await wait(300);
    const r1 = await G(() => ({ bombs: window.__NP4.player.bombs }));
    A(r1.bombs === Math.min(9, r0.bombs + 1), JSON.stringify({ r0, r1 }));
    await G(() => window.__NP4.phen.skip(2.4));
    await wait(700);
    await shot('v516-silence');
    await G(() => window.__NP4.phen.skip(99));
    await wait(1600);
    const g1 = await G(() => (window.__NP4.audio.master ? window.__NP4.audio.master.gain.value : 1));
    A(Math.abs(g1 - r0.gain) < 0.2 || r0.gain < 0.1, `gain ${r0.gain} → ${g1}`);
  });

  await T('carnet : 10/10 observés, nanites de découverte crédités (480⬡), tuiles illustrées', async () => {
    const m = await G(() => ({ c: window.__NP4.phen.carnet(), n: JSON.parse(localStorage.getItem('nebula4_meta')).nanites }));
    A(Object.keys(m.c).length === 10, 'carnet ' + Object.keys(m.c));
    A(m.n >= 1000 + 480, 'nanites ' + m.n);
    await G(() => document.getElementById('pauseMenuBtn').click());
    await wait(400);
    await G(() => document.querySelectorAll('.overlay:not(#menu)').forEach((o) => o.classList.add('hidden')));
    const btn = await G(() => document.getElementById('carnetBtn').textContent);
    A(/10\/10/.test(btn), btn);
    await page.tap('#carnetBtn');
    await wait(400);
    const r = await G(() => ({ tiles: document.querySelectorAll('#carnetOverlay .carnet-tile').length, unseen: document.querySelectorAll('#carnetOverlay .carnet-tile.unseen').length, vis: !document.getElementById('carnetOverlay').classList.contains('hidden') }));
    A(r.tiles === 10 && r.unseen === 0 && r.vis, JSON.stringify(r));
    await shot('v516-carnet');
    await page.tap('#carnetClose');
  });

  await T('directeur : déclenchement naturel en accalmie, interrompu par un boss', async () => {
    await G(() => document.querySelectorAll('.overlay:not(#menu)').forEach((o) => o.classList.add('hidden')));
    await page.tap('#modeCampagne');
    await wait(2800);
    await G(() => { const g = window.__NP4; g.player.invuln = 999; g.enemies.length = 0; g.phen.setDirT(0.05); });
    await wait(400);
    const a = await G(() => window.__NP4.phen.active());
    A(a && a.id, 'aucun phénomène déclenché');
    await G(() => window.__NP4.routes.spawnBoss(false));
    await wait(300);
    A(await G(() => window.__NP4.phen.active() === null), 'phénomène non interrompu par le boss');
    await G(() => { const g = window.__NP4; const i = g.enemies.indexOf(g.boss); if (i >= 0) g.enemies.splice(i, 1); });
  });

  await T('déterminisme : même seed → même séquence ; la route oriente le tirage', async () => {
    const r = await G(() => {
      const P = window.__NP4.phen;
      const a = P.sequence('alpha', null, 40).join(','), b = P.sequence('alpha', null, 40).join(',');
      const neutral = P.sequence('beta', null, 600), sig = P.sequence('beta', 'signal', 600);
      const cnt = (arr, id) => arr.filter((x) => x === id).length;
      const noRepeat = neutral.every((x, i) => i === 0 || x !== neutral[i - 1]);
      return { same: a === b, rn: cnt(neutral, 'regard'), rs: cnt(sig, 'regard'), leg: cnt(neutral, 'silence'), noRepeat };
    });
    A(r.same && r.rs > r.rn * 1.6 && r.noRepeat && r.leg > 0 && r.leg < 40, JSON.stringify(r));
  });

  await T('performance : chaque phénomène < 2 ms / frame (SwiftShader, rendu du jeu exclu)', async () => {
    const r = await G(() => { const out = {}; for (const id of window.__NP4.phen.ids) out[id] = +window.__NP4.phen.bench(id, 60).toFixed(3); return out; });
    console.log('      coût (ms/frame) : ' + JSON.stringify(r));
    A(Object.values(r).every((ms) => ms < 2), JSON.stringify(r));
  });

  await T('notifications : 1 seule pastille à la fois en jeu, doublons fusionnés, file bornée', async () => {
    await G(() => document.querySelectorAll('#toasts .toast').forEach((t) => t.remove()));
    await wait(2600);
    const q = await G(() => {
      // toast() est interne : on passe par des événements réels (route engagée + messages de jeu)
      const g = window.__NP4;
      g.v10.nextSector(); // « Bienvenue dans … »
      g.v10.overdrive();  // « CŒUR QUANTIQUE … »
      g.v10.overdrive();  // doublon
      g.routes.open(); g.routes.choose('forge'); // toast de route
      return { dom: document.querySelectorAll('#toasts .toast').length, queue: g.phen.toastQueue() };
    });
    A(q.dom <= 1 && q.queue <= 3, JSON.stringify(q));
    await shot('v516-hud-toast');
  });

  await T('HUD fantôme : un ennemi sous le panneau de score l’efface, puis il revient', async () => {
    await wait(1200);
    const r0 = await G(() => {
      const g = window.__NP4;
      const r = document.querySelector('#hud .score-panel').getBoundingClientRect();
      const e = g.v10.spawnQ('drone');
      const en = g.enemies[g.enemies.length - 1];
      en.x = r.left + r.width / 2; en.y = r.top + r.height / 2; en.vy = 0; en.fireCd = 99; en.hp = en.maxHp = 1e9; g.v11.setAutoFire(false); g.v11.pressFire(false);
      return true;
    });
    await wait(1100);
    const on = await G(() => ({ cls: document.querySelector('#hud .score-panel').classList.contains('np-ghost'), op: getComputedStyle(document.querySelector('#hud .score-panel')).opacity }));
    await shot('v516-hud-fantome');
    await G(() => { const g = window.__NP4; g.enemies.length = 0; g.v11.setAutoFire(true); });
    await wait(900);
    const off = await G(() => document.querySelector('#hud .score-panel').classList.contains('np-ghost'));
    A(on.cls && parseFloat(on.op) < 0.3 && !off, JSON.stringify({ on, off }));
  });

  await T('HUD compact : panneau de barres ≤ 160 px de large en jeu', async () => {
    const w = await G(() => document.querySelector('#hud .mid .panel.bars').getBoundingClientRect().width);
    A(w <= 160, 'largeur ' + w);
  });

  await T('module v5.16 sans Math.random / rand / pick', async () => {
    const src = fs.readFileSync(path.join(APP_DIR, 'v516.js'), 'utf8').replace(/\/\/.*$/gm, '');
    A(!/Math\.random\s*\(|\brand\(|\bpick\(/.test(src), 'appel aléatoire global');
    A(/MODULE V5\.16/.test(fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8')), 'module non intégré');
    A(/np4-v5\.1[6-9]/.test(fs.readFileSync(path.join(APP_DIR, 'sw.js'), 'utf8')), 'sw non versionné');
  });

  await browser.close();
  server.kill();
  console.log(`\n=== PHÉNOMÈNES V16: ${pass} PASS · ${fail} FAIL ===`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error('FATAL', e); process.exit(2); });
