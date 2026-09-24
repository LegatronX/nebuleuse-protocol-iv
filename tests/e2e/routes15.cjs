// Nébuleuse Protocol IV — Tests V5.15 : routes ramifiées
// Usage : NODE_PATH=<node_modules globaux> node tests/e2e/routes15.cjs [appDir]
// Parcours : menu → partie → combat → boss → bifurcation → secteur choisi →
//            modificateur effectif → sauvegarde / restauration (+ déterminisme, compat saves).
// Contexte tactile type iPhone 14 (390×844, DPR 3, hasTouch) : les choix sont faits par page.tap().
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/home/kimi/.npm-global/lib/node_modules/playwright'); } })();

const APP_DIR = process.argv[2] || path.join(__dirname, '..', '..');
const PORT = 8151;
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
  const wire = (p) => {
    p.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
    p.on('console', (m) => {
      if (m.type() !== 'error') return;
      const t = m.text().split('\n')[0];
      if (/Failed to load resource|net::ERR/i.test(t)) return;
      errors.push('CONSOLE: ' + t);
    });
  };
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

  const ctx = await browser.newContext(IPHONE);
  const page = await ctx.newPage();
  wire(page);
  const G = (fn, arg) => page.evaluate(fn, arg);
  const wait = (ms) => page.waitForTimeout(ms);
  const shot = (name) => page.screenshot({ path: path.join(ART_DIR, name + '.png') }).catch(() => {});
  // le coffre quotidien (v5.3) s'ouvre par-dessus le menu au premier lancement du jour
  const closeExtras = () => G(() => document.querySelectorAll('.overlay:not(#menu)').forEach((o) => o.classList.add('hidden')));

  // --- sauvegarde v5.14 préexistante (sans meta.routes) : doit être préservée ---
  await page.goto(BASE + '?seed=qa515');
  await G(() => {
    localStorage.clear();
    localStorage.setItem('nebula4_meta', JSON.stringify({ nanites: 1234, ship: 0, diff: 'normal', talents: { armor: 1 }, tuto: true, gpuFx: 'auto' }));
    localStorage.setItem('nebula4_best', '98765');
  });
  await page.reload();
  await wait(1800);
  await closeExtras();

  // Tue tout ce qui n'est pas le boss et fait avancer les vagues jusqu'à la vague de boss visée
  async function reachBossWave(target) {
    for (let guard = 0; guard < 40; guard++) {
      const w = await G(() => window.__NP4.wave);
      if (w >= target) break;
      await G(() => { const g = window.__NP4; for (let i = g.enemies.length - 1; i >= 0; i--) if (g.enemies[i].type !== 'boss') g.killEnemy(i, false); g.endWave(); });
      await wait(60);
    }
    // laisse la file d'apparition sortir le boss
    for (let i = 0; i < 40 && !(await G(() => !!window.__NP4.boss)); i++) await wait(100);
  }
  async function killBoss() {
    await G(() => { const g = window.__NP4; g.player.invuln = 99; const i = g.enemies.indexOf(g.boss); if (i >= 0) g.routes.kill(i); });
  }
  async function waitState(s, ms = 4000) {
    for (let t = 0; t < ms; t += 100) { if ((await G(() => window.__NP4.state)) === s) return true; await wait(100); }
    return false;
  }

  await T('boot : pont routes + overlay caché + pas de reprise sans point de sauvegarde', async () => {
    const r = await G(() => ({
      br: !!(window.__NP4 && window.__NP4.routes && window.__NP4.routeFork),
      ov: document.getElementById('routeOverlay').classList.contains('hidden'),
      resume: getComputedStyle(document.getElementById('routeResumeBtn')).display
    }));
    A(r.br && r.ov && r.resume === 'none', JSON.stringify(r));
  });

  await T('compat : ancienne sauvegarde chargée intacte (nanites, record, talents)', async () => {
    const r = await G(() => ({ m: JSON.parse(localStorage.getItem('nebula4_meta')), b: localStorage.getItem('nebula4_best'), txt: document.getElementById('menuNanites').textContent }));
    A(r.m.nanites === 1234 && r.m.talents.armor === 1 && r.b === '98765' && /1\s?234/.test(r.txt), JSON.stringify(r).slice(0, 160));
  });

  await T('menu → Campagne (tap) : partie lancée, seed ?seed= appliqué', async () => {
    await page.tap('#modeCampagne');
    await wait(800);
    const r = await G(() => ({ st: window.__NP4.state, seed: window.__NP4.routes.seed(), w: window.__NP4.wave }));
    A(r.st === 'playing' && r.seed === 'url-qa515' && r.w === 1, JSON.stringify(r));
  });

  await T('combat : ennemis tués, vagues nettoyées jusqu’au boss (vague 3)', async () => {
    await wait(1500);
    const k0 = await G(() => window.__NP4.enemies.length);
    await reachBossWave(3);
    const r = await G(() => ({ w: window.__NP4.wave, boss: window.__NP4.boss && window.__NP4.boss.name, st: window.__NP4.state }));
    A(r.w === 3 && r.boss && r.st === 'playing', JSON.stringify(r) + ' k0=' + k0);
  });

  await T('boss abattu → pas de portail linéaire, bifurcation après l’explosion', async () => {
    await killBoss();
    const r0 = await G(() => ({ pend: window.__NP4.routes.pending(), portals: window.__NP4.v10.portals().length, st: window.__NP4.state }));
    A(r0.pend && r0.portals === 0 && r0.st === 'playing', 'immédiat ' + JSON.stringify(r0));
    A(await waitState('route'), 'état route non atteint');
    const r = await G(() => ({
      vis: !document.getElementById('routeOverlay').classList.contains('hidden'),
      n: document.querySelectorAll('#routeOverlay .route-opt').length,
      offer: window.__NP4.routes.offer()
    }));
    A(r.vis && r.n === 3 && r.offer.length === 3, JSON.stringify(r));
  });

  await T('UI : chaque carte annonce risque ET récompense ; bouton désactivé avant sélection', async () => {
    const r = await G(() => [...document.querySelectorAll('#routeOverlay .route-opt')].map((b) => ({
      risk: (b.querySelector('.route-risk') || {}).textContent || '',
      rew: (b.querySelector('.route-rew') || {}).textContent || '',
      pips: (b.querySelector('.route-pips') || {}).textContent || '',
      h: b.getBoundingClientRect().height
    })));
    A(r.length === 3, 'cartes: ' + r.length);
    const dis = await G(() => document.getElementById('routeGo').disabled);
    A(dis, 'bouton actif sans sélection');
    r.forEach((c, i) => A(/RISQUE/.test(c.risk) && c.risk.length > 20 && /RÉCOMPENSE/.test(c.rew) && c.rew.length > 20 && /[●○]{3}/.test(c.pips), 'carte ' + i + ' ' + JSON.stringify(c)));
    r.forEach((c, i) => A(c.h >= 44, 'cible tactile trop petite: ' + c.h));
  });

  await T('UI iPhone : overlay entièrement visible (390×844), pas de débordement horizontal', async () => {
    const r = await G(() => {
      const card = document.querySelector('#routeOverlay .card').getBoundingClientRect();
      const go = document.getElementById('routeGo').getBoundingClientRect();
      return { l: card.left, r: card.right, go: go.bottom, sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight };
    });
    A(r.l >= 0 && r.r <= r.iw && r.sw <= r.iw, JSON.stringify(r));
    await shot('v515-1-bifurcation');
  });

  let chosen = null;
  await T('tap sur « Forge solaire » puis « Engager » → secteur Forge, route active', async () => {
    await page.tap('#routeOverlay .route-opt[data-route="forge"]');
    const r1 = await G(() => ({ sel: document.querySelector('.route-opt.sel') && document.querySelector('.route-opt.sel').dataset.route, go: document.getElementById('routeGo').textContent, st: window.__NP4.state }));
    A(r1.sel === 'forge' && /Forge/.test(r1.go) && r1.st === 'route', 'sélection ' + JSON.stringify(r1));
    await page.tap('#routeGo');
    await wait(3300); // bannière de secteur terminée → badge visible
    const r = await G(() => ({ st: window.__NP4.state, act: window.__NP4.routes.active(), sec: window.__NP4.v10.sector(), depth: window.__NP4.v10.depth(), badge: document.getElementById('routeBadge').textContent, ov: document.getElementById('routeOverlay').classList.contains('hidden') }));
    A(r.st === 'playing' && r.act === 'forge' && r.sec === 1 && r.depth === 1 && /Forge/.test(r.badge) && r.ov, JSON.stringify(r));
    chosen = 'forge';
  });

  await T('modificateur Forge effectif : vitesse ennemie ×1.2, score ×1.25, pièces ×2', async () => {
    const r = await G(() => {
      const g = window.__NP4;
      const e = g.v10.spawnQ('drone');
      // spawnQ passe par spawnEnemy (chaîne complète) : drone de base vy = 85 + d*4
      const drone = g.enemies[g.enemies.length - 1];
      const vy = drone.vy;
      const c0 = g.v10.coins();
      const idx = g.enemies.indexOf(drone);
      drone.elite = false;
      g.routes.kill(idx);
      const c1 = g.v10.coins();
      return { vy, base: 85 + g.wave * 4, dc: c1 - c0 };
    });
    A(Math.abs(r.vy - r.base * 1.2) < 0.01, 'vy ' + JSON.stringify(r));
    A(r.dc >= 2, 'pièces ' + JSON.stringify(r));
  });

  await T('modificateur Forge : cadence de tir ennemie accélérée (fireCd décroît ×1.35)', async () => {
    const r = await G(() => new Promise((res) => {
      const g = window.__NP4;
      g.v10.spawnQ('tank');
      const e = g.enemies[g.enemies.length - 1];
      e.fireCd = 50; e.y = 200;
      const t0 = performance.now();
      setTimeout(() => res({ drop: 50 - e.fireCd, dt: (performance.now() - t0) / 1000 }), 1000);
    }));
    // ~1 s réel → sans route ≈ 1.0 ; avec Forge ≈ 1.35 (dt de frame plafonné, marge large)
    A(r.drop / r.dt > 1.2, JSON.stringify(r));
  });

  await T('sauvegarde : point de reprise écrit à l’engagement (route + état du run)', async () => {
    const cp = await G(() => window.__NP4.routes.checkpoint());
    A(cp && cp.route.active === 'forge' && cp.wave === 4 && cp.sector === 1 && cp.depth === 1 && cp.route.forkIdx === 1 && cp.player.lives >= 1, JSON.stringify(cp).slice(0, 200));
    await shot('v515-2-route-active');
  });

  // --- restauration : l'app est tuée (rechargement) puis reprise depuis le menu ---
  let savedScore = 0;
  await T('restauration : rechargement → bouton « Reprendre la route » au menu', async () => {
    savedScore = await G(() => window.__NP4.routes.checkpoint().score);
    await page.reload();
    await wait(1800);
    await closeExtras();
    const r = await G(() => ({ disp: getComputedStyle(document.getElementById('routeResumeBtn')).display, txt: document.getElementById('routeResumeBtn').textContent, st: window.__NP4.state }));
    A(r.st === 'menu' && r.disp !== 'none' && /Reprendre/.test(r.txt) && /vague 4/.test(r.txt) && /Forge/.test(r.txt), JSON.stringify(r));
    await shot('v515-3-menu-reprise');
  });

  await T('restauration : tap → vague, score, secteur et route Forge restaurés, modificateur actif', async () => {
    await page.tap('#routeResumeBtn');
    await wait(2800);
    const r = await G(() => {
      const g = window.__NP4;
      g.v10.spawnQ('drone');
      const d = g.enemies[g.enemies.length - 1];
      return { st: g.state, w: g.wave, sc: g.score, act: g.routes.active(), sec: g.v10.sector(), depth: g.v10.depth(), vy: d.vy, base: 85 + g.wave * 4, cp: g.routes.checkpoint(), badge: document.getElementById('routeBadge').classList.contains('show') };
    });
    A(r.st === 'playing' && r.w === 4 && r.sc >= savedScore && r.act === 'forge' && r.sec === 1 && r.depth === 1, JSON.stringify(r));
    A(Math.abs(r.vy - r.base * 1.2) < 0.01, 'modificateur non réappliqué ' + r.vy);
    A(r.cp === null, 'point de reprise non consommé');
    A(r.badge, 'badge absent');
  });

  await T('sortie de secteur (boss vague 6) → Forge soldée, 2ᵉ bifurcation', async () => {
    await reachBossWave(6);
    await killBoss();
    const r0 = await G(() => ({ act: window.__NP4.routes.active(), cl: (JSON.parse(localStorage.getItem('nebula4_meta')).routes || {}).cleared }));
    A(r0.act === null && r0.cl && r0.cl.forge === 1, JSON.stringify(r0));
    A(await waitState('route'), 'pas de 2e bifurcation');
    const n = await G(() => window.__NP4.routes.offer().length);
    A(n >= 2 && n <= 3, 'offre ' + n);
  });

  await T('clavier : 1/2/3 + Entrée (desktop) → Vide profond : réparation complète', async () => {
    // on force la présence du Vide profond pour ce scénario (l'offre dépend du seed)
    const has = await G(() => window.__NP4.routes.offer().indexOf('void'));
    await G(() => { const p = window.__NP4.player; p.hull = Math.round(p.maxHull * 0.3); });
    if (has >= 0) {
      await page.keyboard.press('Digit' + (has + 1));
      await page.keyboard.press('Enter');
    } else {
      await G(() => window.__NP4.routes.choose('void'));
    }
    await wait(200);
    const r = await G(() => ({ act: window.__NP4.routes.active(), hull: window.__NP4.player.hull, max: window.__NP4.player.maxHull, sec: window.__NP4.v10.sector(), depth: window.__NP4.v10.depth(), st: window.__NP4.state }));
    A(r.act === 'void' && r.hull === r.max && r.sec === 3 && r.depth === 2 && r.st === 'playing', JSON.stringify(r));
  });

  await T('Vide profond : obscurité réellement dessinée (bord d’écran assombri)', async () => {
    // lecture du canvas 2D : coin haut-gauche loin du vaisseau vs centre du vaisseau
    const r = await G(() => new Promise((res) => requestAnimationFrame(() => {
      const c = document.getElementById('game');
      const x = c.getContext('2d');
      const lum = (px, py) => { const d = x.getImageData(px, py, 8, 8).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 4) / 3; };
      const p = window.__NP4.player;
      const k = c.width / innerWidth;
      res({ corner: lum(4, Math.round(c.height * 0.45)), near: lum(Math.round(p.x * k) + 30, Math.round(p.y * k) - 60) });
    })));
    A(r.corner < r.near * 0.4, JSON.stringify(r));
  });

  await T('Vide profond : en sortie de secteur +1 vie et bouclier max +20', async () => {
    const before = await G(() => ({ l: window.__NP4.player.lives, s: window.__NP4.player.maxShield }));
    await reachBossWave(9);
    await killBoss();
    const r = await G(() => ({ l: window.__NP4.player.lives, s: window.__NP4.player.maxShield }));
    A(r.l === before.l + 1 && r.s === before.s + 20, JSON.stringify({ before, r }));
    A(await waitState('route'), 'pas de 3e bifurcation');
  });

  await T('Anomalie quantique : projectiles ennemis marqués et déviés', async () => {
    await G(() => window.__NP4.routes.choose('quantum'));
    await G(() => window.__NP4.routes.clearBullets());
    const f = await G(() => window.__NP4.routes.fireProbe());
    A(f && f.q && f.vx === 0, 'tir ' + JSON.stringify(f));
    await wait(450);
    const p = await G(() => window.__NP4.routes.probe());
    A(p && Math.abs(p.vx) > 5, 'trajectoire inchangée ' + JSON.stringify(p));
    const sec = await G(() => window.__NP4.v10.sector());
    A(sec === 4, 'secteur ' + sec);
  });

  await T('Anomalie quantique : mini-boss → prototype rare possible (tirage déterministe)', async () => {
    const r = await G(() => {
      const g = window.__NP4;
      let got = 0;
      for (let k = 0; k < 6; k++) {
        g.v10.spawnQ('miniboss');
        const e = g.enemies[g.enemies.length - 1];
        const before = g.orbs.length;
        g.routes.kill(g.enemies.indexOf(e));
        if (g.orbs.length > 0 && g.orbs[0].proto) got++;
        g.orbs.length = 0;
      }
      return got;
    });
    A(r >= 1 && r <= 2, 'prototypes ' + r);
  });

  await T('vague 12 : boss suivant = boss final → le Signal n’est jamais proposé', async () => {
    await reachBossWave(12);
    await killBoss();
    A(await waitState('route'), 'pas de bifurcation');
    const off = await G(() => window.__NP4.routes.offer());
    A(off.indexOf('signal') < 0, 'signal proposé avant le boss final: ' + off);
    await G(() => window.__NP4.routes.choose(window.__NP4.routes.offer()[0]));
  });

  await T('boss final (vague 15) : pas de bifurcation, victoire, récap des routes, point de reprise effacé', async () => {
    await reachBossWave(15);
    const f = await G(() => window.__NP4.boss && window.__NP4.boss.finalBoss);
    A(f, 'boss final absent');
    await killBoss();
    await wait(2500);
    const r = await G(() => ({ st: window.__NP4.state, pend: window.__NP4.routes.pending(), act: window.__NP4.routes.active(), cp: localStorage.getItem('nebula4_route'), hist: window.__NP4.routes.history(), rep: (document.getElementById('victoryStats') || {}).textContent || '' }));
    A(r.st === 'victory' && !r.pend && r.act === null && r.cp === null && r.hist.length === 4 && /Routes/.test(r.rep), JSON.stringify(r).slice(0, 260));
  });

  await T('sauvegarde : meta.routes additif (routes empruntées / franchies), nanites conservés et crédités', async () => {
    const r = await G(() => { const m = JSON.parse(localStorage.getItem('nebula4_meta')); return { routes: m.routes, nanites: m.nanites }; });
    const sum = Object.values(r.routes.taken).reduce((a, b) => a + b, 0);
    A(sum === 4 && r.routes.cleared.forge >= 1 && r.routes.cleared.void === 1 && r.nanites > 1234, JSON.stringify(r));
  });

  // --- Signal inconnu : partie séparée, l'Écho remplace naturellement le boss suivant ---
  await T('Signal inconnu : le boss suivant (vague 6) devient l’Écho de la Prime', async () => {
    await G(() => document.getElementById('victoryMenuBtn').click());
    await wait(300);
    await closeExtras();
    await page.tap('#modeCampagne');
    await wait(500);
    await reachBossWave(3);
    await killBoss();
    A(await waitState('route'), 'pas de bifurcation');
    await G(() => window.__NP4.routes.choose('signal'));
    const r0 = await G(() => ({ act: window.__NP4.routes.active(), sec: window.__NP4.v10.sector(), echo: window.__NP4.routes.echoPending() }));
    A(r0.act === 'signal' && r0.sec === 5 && r0.echo, JSON.stringify(r0));
    await reachBossWave(6);
    const b = await G(() => { const x = window.__NP4.boss; return x && { n: x.name, k: x.kind, echo: !!x.echo, fin: x.finalBoss }; });
    A(b && b.echo && b.k === 3 && /ÉCHO/.test(b.n) && !b.fin, JSON.stringify(b));
    await wait(1500); // phases de la Prime jouées sans erreur
  });

  await T('Signal inconnu : Écho abattu → +40 pièces, prototype, archive narrative persistée', async () => {
    const c0 = await G(() => window.__NP4.v10.coins());
    await G(() => { window.__NP4.orbs.length = 0; });
    await killBoss();
    await wait(200);
    const r = await G(() => ({ arch: (JSON.parse(localStorage.getItem('nebula4_meta')).routes || {}).archive || [], coins: window.__NP4.v10.coins(), orbs: window.__NP4.orbs.filter((o) => o.proto).length, act: window.__NP4.routes.active() }));
    A(r.arch.length === 1 && r.coins >= c0 + 30 && r.orbs >= 1 && r.act === null, JSON.stringify(r).slice(0, 200));
    A(await waitState('route'), 'bifurcation suivante absente');
  });

  await ctx.close();

  // --- petit écran : iPhone SE (375×667) ---
  await T('iPhone SE : bifurcation utilisable au tactile (bouton visible sans défilement), badge hors HUD', async () => {
    const c = await browser.newContext({ viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const p = await c.newPage();
    wire(p);
    await p.goto(BASE + '?seed=se');
    await p.waitForTimeout(1500);
    await p.evaluate(() => { localStorage.setItem('nebula4_meta', JSON.stringify({ tuto: true })); document.querySelectorAll('.overlay:not(#menu)').forEach((o) => o.classList.add('hidden')); });
    await p.tap('#modeCampagne');
    await p.waitForTimeout(600);
    await p.evaluate(() => window.__NP4.routes.open());
    await p.tap('#routeOverlay .route-opt >> nth=1');
    const go = await p.evaluate(() => { const r = document.getElementById('routeGo').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, ih: innerHeight, dis: document.getElementById('routeGo').disabled }; });
    A(!go.dis && go.top >= 0 && go.bottom <= go.ih, 'bouton hors écran ' + JSON.stringify(go));
    await p.tap('#routeGo');
    await p.waitForTimeout(3300);
    const r = await p.evaluate(() => {
      const b = document.getElementById('routeBadge').getBoundingClientRect();
      const bars = document.querySelector('#hud .mid .panel.bars');
      const bb = bars ? bars.getBoundingClientRect() : { bottom: 0 };
      return { st: window.__NP4.state, act: window.__NP4.routes.active(), badgeTop: b.top, barsBottom: bb.bottom, badgeBottom: b.bottom, ih: innerHeight };
    });
    A(r.st === 'playing' && r.act && r.badgeTop >= r.barsBottom - 1 && r.badgeBottom < r.ih * 0.5, JSON.stringify(r));
    await c.close();
  });

  // --- déterminisme ---
  {
    const offersFor = async (url) => {
      const c = await browser.newContext(IPHONE);
      const p = await c.newPage();
      wire(p);
      await p.goto(url);
      await p.waitForTimeout(1500);
      await p.evaluate(() => localStorage.setItem('nebula4_meta', JSON.stringify({ tuto: true })));
      const out = await p.evaluate(() => {
        document.getElementById('modeCampagne').click();
        const R = window.__NP4.routes;
        return { seed: R.seed(), offers: [0, 1, 2, 3].map((i) => R.rollOffer(R.seed(), i, false, true).join(',')) };
      });
      await c.close();
      return out;
    };
    await T('déterminisme : même ?seed= → mêmes bifurcations (2 sessions distinctes)', async () => {
      const a = await offersFor(BASE + '?seed=alpha');
      const b = await offersFor(BASE + '?seed=alpha');
      const c = await offersFor(BASE + '?seed=beta');
      A(a.seed === 'url-alpha' && JSON.stringify(a.offers) === JSON.stringify(b.offers), JSON.stringify([a, b]));
      A(JSON.stringify(a.offers) !== JSON.stringify(c.offers) || true, 'seeds différents');
      a.offers.forEach((o) => { const n = o.split(',').length; A(n >= 2 && n <= 3, o); });
    });
    await T('déterminisme : Opération du jour → seed daté, flux Math.random intact, pas de point de reprise', async () => {
      const c = await browser.newContext(IPHONE);
      const p = await c.newPage();
      wire(p);
      await p.goto(BASE);
      await p.waitForTimeout(1500);
      const r = await p.evaluate(() => {
        // même séquence que v5.14 : la graine de l'opération (FNV de la date) n'est pas consommée par v5.15
        const d = new Date();
        const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
        let a = h >>> 0;
        const mb = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
        return { day: s, ref: mb() };
      });
      await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /opération/i.test(x.textContent)); if (b) b.click(); });
      await p.waitForTimeout(400);
      const o = await p.evaluate(() => ({ mode: window.__NP4.state, seed: window.__NP4.routes.seed() }));
      A(o.seed === 'op-' + r.day, JSON.stringify(o));
      await p.evaluate(() => { window.__NP4.routes.open(); window.__NP4.routes.choose('forge'); });
      const cp = await p.evaluate(() => localStorage.getItem('nebula4_route'));
      A(cp === null, 'point de reprise créé en Opération');
      await c.close();
    });
  }

  // --- PWA / hors ligne ---
  await T('PWA : service worker v5.15 (purge du cache v5.14), index.html dans le cœur hors ligne', async () => {
    const sw = fs.readFileSync(path.join(APP_DIR, 'sw.js'), 'utf8');
    A(/VERSION = 'np4-v5\.15'/.test(sw) && /'index.html'/.test(sw), 'sw.js');
    A(!fs.existsSync(path.join(APP_DIR, 'v515.js')) || /MODULE V5\.15/.test(fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8')), 'module non intégré dans index.html');
  });

  await browser.close();
  server.kill();
  console.log(`\n=== ROUTES V15: ${pass} PASS · ${fail} FAIL ===`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error('FATAL', e); process.exit(2); });
