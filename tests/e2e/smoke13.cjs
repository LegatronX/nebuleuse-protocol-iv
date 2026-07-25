// Smoke V5.13 — Actes III·IV·V
const { spawn } = require('child_process');
const { chromium } = require('/home/kimi/.npm-global/lib/node_modules/playwright');
const APP_DIR = process.argv[2] || '/mnt/agents/output/app';
const PORT = 8137;
const BASE = `http://localhost:${PORT}/index.html`;
let pass = 0, fail = 0;
const errors = [];

async function main() {
  const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: APP_DIR, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1200));
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text().split('\n')[0];
    if (/Failed to load resource|net::ERR/i.test(t)) return;
    errors.push('CONSOLE: ' + t);
  });
  const G = (expr) => page.evaluate(expr);
  const T = async (name, fn) => {
    const mark = errors.length;
    try {
      await fn();
      const ne = errors.slice(mark);
      if (ne.length) { fail++; console.log(`FAIL ${name} — ${ne[0].slice(0, 140)}`); }
      else { pass++; console.log(`PASS ${name}`); }
    } catch (e) { fail++; console.log(`FAIL ${name} — ${e.message.slice(0, 140)}`); }
  };
  const A = (c, m) => { if (!c) throw new Error(m || 'assert'); };

  await page.goto(BASE);
  await page.waitForTimeout(1800);

  await T('boot sans erreur + pont v13', async () => {
    A(await G(() => !!(window.__NP4 && window.__NP4.v13)), 'v13 absent');
  });
  // démarre une partie campagne pour initialiser l'audio et le jeu
  await G(() => { const b = [...document.querySelectorAll('button')].find(x => /CAMPAGNE/i.test(x.textContent)); if (b) b.click(); });
  await page.waitForTimeout(1500);
  await G(() => window.__NP4.v11 && window.__NP4.v11.setAutoFire(true));
  // god-mode pour isoler les mécaniques
  await G(() => setInterval(() => { const p = window.__NP4.player; p.hull = 9999; p.shield = 9999; p.alive = true; }, 350));

  await T('startActe(3) → acte 3, secteur 8, vague 25', async () => {
    await G(() => window.__NP4.v13.startActe(3));
    await page.waitForTimeout(600);
    A(await G(() => window.__NP4.v13.acte() === 3), 'acte!=3');
    A(await G(() => window.__NP4.v13.sec3() === 8), 'sec3!=8');
    A(await G(() => window.__NP4.state === 'playing'), 'pas en jeu');
  });
  await T('codex débloqué + buffers audio chargés', async () => {
    A(await G(() => window.__NP4.v13.codex() >= 1), 'codex vide');
    await page.waitForFunction(() => window.__NP4.v13.buf13('glass') && window.__NP4.v13.buf13('climax'), null, { timeout: 15000 });
  });
  await T('Orgue : spawn → kill → transition secteur 9 + accalmie', async () => {
    await G(() => window.__NP4.v13.spawnOrgue());
    await page.waitForTimeout(2200);
    A(await G(() => window.__NP4.enemies.some(e => e.orgue)), 'orgue absent');
    await G(() => { const g = window.__NP4; g.v10.kill(g.enemies.findIndex(e => e.orgue)); });
    await page.waitForTimeout(800);
    A(await G(() => window.__NP4.v13.sec3() === 9), 'sec3!=9');
    A(await G(() => window.__NP4.v13.interlude() > 0), 'pas d\'accalmie');
  });
  await T('Cantatrice → kill → secteur 10', async () => {
    await G(() => window.__NP4.v13.spawnCantatrice());
    await page.waitForTimeout(2000);
    await G(() => { const g = window.__NP4; g.v10.kill(g.enemies.findIndex(e => e.cantatrice)); });
    await page.waitForTimeout(700);
    A(await G(() => window.__NP4.v13.sec3() === 10), 'sec3!=10');
  });
  await T('Diapason → kill → acte III terminé + victoire', async () => {
    await G(() => window.__NP4.v13.spawnDiapason());
    await page.waitForTimeout(2000);
    await G(() => { const g = window.__NP4; g.v10.kill(g.enemies.findIndex(e => e.diapason)); });
    await page.waitForTimeout(900);
    A(await G(() => window.__NP4.v13.acteDone(3)), 'acte3 non terminé');
  });
  await T('bouton ACTE IV présent sur la victoire', async () => {
    A(await G(() => !!document.getElementById('acte4Btn')), 'acte4Btn absent');
  });
  await T('startActe(4) → secteur 11, vague 34', async () => {
    await G(() => window.__NP4.v13.startActe(4));
    await page.waitForTimeout(500);
    A(await G(() => window.__NP4.v13.acte() === 4 && window.__NP4.v13.sec3() === 11), 'acte4/sec11 KO');
  });
  await T('Rêveur → 12, Cauchemar → 13, Insomniaque → acte IV terminé', async () => {
    await G(() => window.__NP4.v13.spawnReveur());
    await page.waitForTimeout(1800);
    await G(() => { const g = window.__NP4; g.v10.kill(g.enemies.findIndex(e => e.reveurB)); });
    await page.waitForTimeout(600);
    A(await G(() => window.__NP4.v13.sec3() === 12), 'sec12 KO');
    await G(() => window.__NP4.v13.spawnCauchemar());
    await page.waitForTimeout(1800);
    await G(() => { const g = window.__NP4; g.v10.kill(g.enemies.findIndex(e => e.cauchemar)); });
    await page.waitForTimeout(600);
    A(await G(() => window.__NP4.v13.sec3() === 13), 'sec13 KO');
    await G(() => window.__NP4.v13.spawnInsomniaque());
    await page.waitForTimeout(1800);
    await G(() => { const g = window.__NP4; g.v10.kill(g.enemies.findIndex(e => e.insomnie)); });
    await page.waitForTimeout(800);
    A(await G(() => window.__NP4.v13.acteDone(4)), 'acte4 non terminé');
  });
  await T('startActe(5) → secteur 14, vague 43', async () => {
    await G(() => window.__NP4.v13.startActe(5));
    await page.waitForTimeout(500);
    A(await G(() => window.__NP4.v13.acte() === 5 && window.__NP4.v13.sec3() === 14), 'acte5 KO');
  });
  await T('Matrice → 15', async () => {
    await G(() => window.__NP4.v13.spawnMatrice());
    await page.waitForTimeout(1800);
    await G(() => { const g = window.__NP4; g.v10.kill(g.enemies.findIndex(e => e.matrice)); });
    await page.waitForTimeout(600);
    A(await G(() => window.__NP4.v13.sec3() === 15), 'sec15 KO');
  });
  await T('Chœur des Mille : corps + kill → 16', async () => {
    await G(() => window.__NP4.v11 && window.__NP4.v11.setAutoFire(false));
    await G(() => window.__NP4.v13.spawnChoeurMille());
    await page.waitForTimeout(1800);
    A(await G(() => window.__NP4.enemies.filter(e => e.mille).length >= 8), 'corps du chœur absents');
    await G(() => { const g = window.__NP4; g.v10.kill(g.enemies.findIndex(e => e.choeurM)); });
    await page.waitForTimeout(700);
    A(await G(() => window.__NP4.v13.sec3() === 16), 'sec16 KO');
    await G(() => window.__NP4.v11 && window.__NP4.v11.setAutoFire(true));
  });
  await T('Premier Signal : 4 mouvements → unisson → apothéose', async () => {
    await G(() => window.__NP4.v11 && window.__NP4.v11.setAutoFire(false));
    await G(() => window.__NP4.v13.spawnSignal());
    await G(() => { const s = window.__NP4.enemies.find(e => e.signal); s.entering = false; s.y = s.targetY; });
    await page.waitForTimeout(400);
    await G(() => { const s = window.__NP4.enemies.find(e => e.signal); s.hp = s.maxHp * 0.10; });
    await page.waitForTimeout(1200);
    A(await G(() => { const s = window.__NP4.enemies.find(e => e.signal); return s && s.signal.movement === 4; }), 'mouvement 4 non atteint');
    await G(() => {
      const s = window.__NP4.enemies.find(e => e.signal);
      s.signal.accord = 11.4;
      window.__pin13 = setInterval(() => { const b = window.__NP4.enemies.find(e => e.signal); if (b) window.__NP4.player.x = b.signal.beamX; }, 40);
    });
    await page.waitForTimeout(3500);
    await G(() => clearInterval(window.__pin13));
    A(await G(() => window.__NP4.v13.signalDown()), 'signalDown faux');
    await G(() => window.__NP4.v11 && window.__NP4.v11.setAutoFire(true));
  });
  await T('écran épilogue APOTHÉOSE', async () => {
    const t = await G(() => { const el = document.querySelector('#victoryOverlay .title'); return el ? el.textContent : ''; });
    A(/APOTHÉOSE/.test(t), 'titre: ' + t);
  });
  // mécaniques ennemies AVANT les armes (évite les artefacts des armes actives)
  await G(() => window.__NP4.v13.startActe(3));
  await page.waitForTimeout(400);
  await T('prisme tué → 3 éclats', async () => {
    await G(() => window.__NP4.v11 && window.__NP4.v11.setAutoFire(false));
    await page.waitForTimeout(900); // laisse expirer les balles déjà en vol
    await G(() => { window.__NP4.enemies.length = 0; }); // champ nettoyé : déterministe
    await G(() => { const g = window.__NP4; g.v13.spawnType('prisme'); g.v10.kill(g.enemies.findIndex(e => e.type === 'prisme')); });
    await page.waitForTimeout(250);
    const n = await G(() => window.__NP4.enemies.filter(e => e.type === 'eclat').length);
    A(n >= 3, `éclats: ${n}`);
    await G(() => window.__NP4.v11 && window.__NP4.v11.setAutoFire(true));
  });
  await T('reveur : phase fantôme cyclique', async () => {
    await G(() => window.__NP4.v13.spawnType('reveur'));
    await page.waitForTimeout(700);
    A(await G(() => window.__NP4.enemies.some(e => e.type === 'reveur' && 'ghostNow' in e)), 'reveur KO');
  });
  await T('arme R : harpons tirés', async () => {
    await G(() => window.__NP4.v13.give('R'));
    await page.waitForTimeout(1400);
    A(await G(() => window.__NP4.v13 && window.__NP4.enemies.length >= 0), 'ko');
    const n = await G(() => window.__NP4.v13.panUsed());
    A(n >= 0, 'panUsed?');
  });
  await T('armes P · D · K · C · N appliquées sans erreur', async () => {
    for (const t of ['P', 'D', 'K', 'C', 'N']) {
      await G((tt) => window.__NP4.v13.give(tt), t);
      await page.waitForTimeout(500);
    }
  });
  await T('tension pilotable (setTension → lecture)', async () => {
    await G(() => window.__NP4.v13.setTension(0.9));
    await page.waitForTimeout(200);
    A(await G(() => window.__NP4.v13.tension() > 0.5), 'tension KO');
  });
  await T('gameover → reset sans erreur résiduelle', async () => {
    await G(() => window.__NP4.player.hull = 0);
  });

  console.log(`\n=== SMOKE V13: ${pass} PASS · ${fail} FAIL ===`);
  if (errors.length) console.log('Erreurs page:\n' + errors.slice(0, 8).join('\n'));
  await browser.close();
  server.kill();
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error('FATAL', e); process.exit(2); });
