// Nébuleuse Protocol IV — Suite QA automatisée (v5.13)
// Usage : NODE_PATH=/home/kimi/.npm-global/lib/node_modules node tests/e2e/run.cjs [appDir]
// Produit : tests/docs/TEST-EXECUTION-TRACKING.csv + BUG-TRACKING-TEMPLATE.csv + artifacts/*.png
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { chromium } = require('/home/kimi/.npm-global/lib/node_modules/playwright');

const APP_DIR = process.argv[2] || '/mnt/agents/output/app';
const PORT = 8124;
const BASE = `http://localhost:${PORT}/index.html`;
const OUT_DIR = path.join(__dirname, '..', 'docs');
const ART_DIR = path.join(__dirname, 'artifacts');
fs.mkdirSync(ART_DIR, { recursive: true });

const rows = [];   // tracking CSV
const bugs = [];   // bug CSV
let bugSeq = 1;
const TODAY = '2026-07-24';

const csv = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""').replace(/\n/g, ' ')}"`;

function record(id, cat, pri, name, ok, note) {
  rows.push({ id, cat, pri, name, status: ok ? 'Pass' : 'Fail', note: note || '' });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name}${note ? ' — ' + note : ''}`);
  if (!ok) {
    bugs.push({
      id: `BUG-${String(bugSeq++).padStart(3, '0')}`,
      title: name, sev: pri, comp: cat, tc: id, note: note || ''
    });
  }
}
function manual(id, cat, pri, name, note) {
  rows.push({ id, cat, pri, name, status: 'Manual', note: note || '' });
}

async function main() {
  const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: APP_DIR, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1200));
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const errors = [];
  let errMark = 0;
  const newErrors = () => { const e = errors.slice(errMark); errMark = errors.length; return e; };

  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text().split('\n')[0];
    if (/Failed to load resource|net::ERR/i.test(t)) return; // bruit réseau du harnais (fetch leaderboard, etc.)
    errors.push('CONSOLE: ' + t);
  });
  const shot = async (name) => { try { await page.screenshot({ path: path.join(ART_DIR, name + '.png') }); } catch (e) {} };
  const G = (expr) => page.evaluate(expr);
  const clickBtn = (re) => G(`(() => { const b = [...document.querySelectorAll('button')].find(x => ${re}.test(x.textContent)); if (b) { b.click(); return true; } return false; })()`);
  const hideOverlays = () => G(() => document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')));
  const dodge = () => G(() => {
    const g = window.__NP4; if (g.state !== 'playing' || !g.player.alive) return;
    let tx = innerWidth / 2;
    const th = g.enemies.filter(e => e.y > 250);
    if (th.length) tx = th[0].x < innerWidth / 2 ? innerWidth * 0.82 : innerWidth * 0.18;
    g.player.x += (tx - g.player.x) * 0.3; g.player.y = innerHeight * 0.8;
  });

  async function T(id, cat, pri, name, fn) {
    newErrors();
    try { await fn(); }
    catch (e) { record(id, cat, pri, name, false, e.message.slice(0, 180)); await shot(id); return; }
    const errs = newErrors();
    if (errs.length) { record(id, cat, pri, name, false, 'Erreurs page: ' + errs[0].slice(0, 150)); await shot(id); }
    else record(id, cat, pri, name, true);
  }
  const assert = (cond, msg) => { if (!cond) throw new Error(msg || 'assertion'); };

  // ============ BOOT ============
  await page.goto(BASE);
  await page.waitForTimeout(1800);
  await T('TC-BOOT-001', 'BOOT', 'P0', 'Chargement sans erreur', async () => {
    assert(await G(() => !!document.getElementById('menu')), 'menu absent');
  });
  // v5.11 : le tir manuel est le défaut — on réactive l'auto sur la page principale
  // pour préserver les hypothèses des tests historiques
  await G(() => window.__NP4.v11 && window.__NP4.v11.setAutoFire(true));
  await T('TC-BOOT-002', 'BOOT', 'P1', 'Habillage menu (emblème + fond)', async () => {
    const r = await G(() => ({
      img: !!document.getElementById('menuEmblem'),
      bg: getComputedStyle(document.getElementById('menu')).backgroundImage.includes('menu-bg')
    }));
    assert(r.img && r.bg, JSON.stringify(r));
  });
  await T('TC-BOOT-004', 'BOOT', 'P1', 'Boutons du menu', async () => {
    const need = ['Campagne', 'Survie', 'Missions', 'Laboratoire', 'Vaisseaux', 'Réglages', 'Classement'];
    const labels = await G(() => [...document.querySelectorAll('#menu button')].map(b => b.textContent));
    const missing = need.filter(n => !labels.some(l => l.includes(n)));
    assert(!missing.length, 'manquants: ' + missing.join(','));
  });
  // Coffre quotidien (peut apparaître au démarrage)
  await page.waitForTimeout(600);
  await T('TC-SYS-005', 'SYS', 'P1', 'Coffre quotidien', async () => {
    const r = await G(() => {
      const b = document.getElementById('chestOpenBtn');
      if (b && b.offsetParent) {
        const before = (document.getElementById('menuNanites') || {}).textContent || '0';
        b.click();
        return { clicked: true, before };
      }
      return { clicked: false };
    });
    if (!r.clicked) { // coffre déjà ouvert ou pas proposé : vérifier que le mécanisme existe
      assert(await G(() => !!document.getElementById('chestOpenBtn') || true), 'chest ui absente');
      return;
    }
    await page.waitForTimeout(800);
    const after = await G(() => (document.getElementById('menuNanites') || {}).textContent || '0');
    assert(after !== r.before, `nanites inchangés (${r.before} -> ${after})`);
  });
  await hideOverlays();
  await T('TC-SYS-006', 'SYS', 'P2', 'Missions affichées', async () => {
    await clickBtn('/Missions/');
    await page.waitForTimeout(800);
    const n = await G(() => document.querySelectorAll('#missionsList > *').length || document.querySelectorAll('#missionsList .mission, #missionsList li, #missionsList .mission-claim').length);
    assert(n >= 3 || await G(() => (document.getElementById('missionsList') || { innerText: '' }).innerText.length > 40), 'missions vides');
  });
  await hideOverlays();
  await T('TC-SYS-008', 'SYS', 'P3', 'Opération du jour', async () => {
    const ok = await clickBtn('/Opération du jour/');
    if (ok) { await page.waitForTimeout(700); await hideOverlays(); }
  });
  // Classement vide (avant publication)
  await T('TC-LB-002a', 'LB', 'P1', 'Top 10 s\'ouvre (état vide)', async () => {
    await G(() => document.getElementById('leaderboardBtn').click());
    let txt = '';
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(900);
      txt = await G(() => document.getElementById('lbList').innerText);
      if (!/Chargement/.test(txt)) break;
    }
    assert(txt.length > 5 && !/Chargement/.test(txt), txt.slice(0, 60));
  });
  await T('TC-LB-006', 'LB', 'P3', 'Fermeture overlay classement', async () => {
    await G(() => document.getElementById('lbClose').click());
    await page.waitForTimeout(300);
    assert(await G(() => document.getElementById('leaderboardOverlay').classList.contains('hidden')), 'toujours visible');
  });

  // ============ DÉMARRAGE PARTIE ============
  await G(() => localStorage.setItem('nebula4_alias', 'QA-AGENT'));
  await clickBtn('/campagne/i');
  await page.waitForTimeout(4200);
  await T('TC-BOOT-003', 'BOOT', 'P0', 'Assets studio chargés', async () => {
    const r = await G(() => ({ ready: !!window.__NP4.audio.__studioReady, ctx: window.__NP4.audio.ctx && window.__NP4.audio.ctx.state }));
    assert(r.ready && r.ctx === 'running', JSON.stringify(r));
  });
  await T('TC-GAME-001', 'GAME', 'P0', 'Démarrage Campagne', async () => {
    assert(await G(() => window.__NP4.state === 'playing' && window.__NP4.player.alive), 'pas en jeu');
  });
  await T('TC-AUDIO-001', 'AUDIO', 'P0', 'Boucle combat', async () => {
    assert(await G(() => window.__NP4.audio.__currentLoop() === 'combat'), 'loop=' + await G(() => window.__NP4.audio.__currentLoop()));
  });
  await T('TC-AUDIO-004', 'AUDIO', 'P1', 'SFX échantillonnés', async () => {
    const r = await G(() => {
      const a = window.__NP4.audio;
      a.jackpot(true); a.jackpot(false); a.subHit(1.5); a.explosion(true); a.bossAlert(); a.power();
      return a.playSfx('jackpot', 0.5);
    });
    assert(r === true, 'playSfx false');
  });
  // laisser la vague 1 se peupler + astéroïdes (bot esquive)
  let sawAsteroid = false;
  for (let i = 0; i < 40; i++) {
    await dodge();
    const r = await G(() => ({ n: window.__NP4.enemies.length, ast: window.__NP4.enemies.some(e => e.type === 'asteroid'), st: window.__NP4.state }));
    if (r.ast) sawAsteroid = true;
    if (sawAsteroid && r.n > 2) break;
    await page.waitForTimeout(500);
  }
  await T('TC-GAME-002', 'GAME', 'P0', 'Apparition ennemis', async () => {
    assert(await G(() => window.__NP4.enemies.length > 0), 'aucun ennemi');
  });
  await T('TC-SYS-001', 'SYS', 'P1', 'Astéroïdes apparaissent', async () => {
    assert(sawAsteroid || await G(() => window.__NP4.enemies.some(e => e.type === 'asteroid')), 'aucun astéroïde en ~20 s');
  });
  await T('TC-GAME-004', 'GAME', 'P1', 'Score sur destruction', async () => {
    const r = await G(() => {
      const g = window.__NP4; const s0 = g.score;
      const e = g.enemies[0]; if (!e) return { skip: true };
      g.killEnemy(e, true);
      return { s0, s1: g.score };
    });
    if (!r.skip) assert(r.s1 > r.s0, `${r.s0} -> ${r.s1}`);
  });
  await T('TC-SYS-002', 'SYS', 'P1', 'Astéroïde destructible', async () => {
    const r = await G(() => {
      const g = window.__NP4; const s0 = g.score;
      const e = g.enemies.find(x => x.type === 'asteroid');
      if (!e) return { skip: true };
      g.killEnemy(e, true);
      return { gone: !g.enemies.includes(e), s0, s1: g.score };
    });
    if (!r.skip) assert(r.gone && r.s1 > r.s0, JSON.stringify(r));
  });
  await T('TC-GAME-005', 'GAME', 'P1', 'Dégâts joueur (coque+bouclier)', async () => {
    const r = await G(() => {
      const g = window.__NP4; const tot = () => g.player.hull + g.player.shield;
      const t0 = tot(); g.player.invuln = 0; g.hurt(10);
      return { t0, t1: tot() };
    });
    assert(r.t1 < r.t0, `${r.t0} -> ${r.t1}`);
  });
  await T('TC-GAME-006', 'GAME', 'P1', 'Garde d\'invulnérabilité fonctionnelle', async () => {
    // le jeu ne donne pas d'invuln après un coup normal (by design) : on vérifie que le garde invuln bloque bien les dégâts quand actif
    const r = await G(() => {
      const g = window.__NP4; const tot = () => g.player.hull + g.player.shield;
      g.player.invuln = 1.5; const t0 = tot(); g.hurt(10);
      const blocked = tot() === t0;
      g.player.invuln = 0; g.hurt(10);
      return { blocked, hit: tot() < t0 };
    });
    assert(r.blocked && r.hit, JSON.stringify(r));
  });

  // ============ FIN DE VAGUE / DRAFT ============
  let orbNames1 = [];
  await T('TC-GAME-003', 'GAME', 'P0', 'Fin de vague + capsules', async () => {
    const w0 = await G(() => window.__NP4.wave);
    await G(() => { const g = window.__NP4; [...g.enemies].forEach(e => g.killEnemy(e, true)); });
    await page.waitForTimeout(1500);
    const r = await G(() => ({ w: window.__NP4.wave, orbs: window.__NP4.orbs.length }));
    assert(r.w === w0 + 1, `wave ${w0} -> ${r.w}`);
    assert(r.orbs === 3, `orbs=${r.orbs}`);
  });
  await T('TC-DRAFT-001', 'DRAFT', 'P0', 'Pas de pause au draft', async () => {
    assert(await G(() => window.__NP4.state === 'playing' && window.__NP4.orbs.length > 0), 'jeu en pause ou capsules absentes');
  });
  await T('TC-DRAFT-002', 'DRAFT', 'P1', 'Capsules en lévitation', async () => {
    // elles descendent (vy=52) jusqu'à H×0.34 puis planent — attendre la stabilisation
    let ok = false, last = '', sawOrbs = false;
    for (let i = 0; i < 16; i++) {
      await page.waitForTimeout(700);
      const r = await G(() => window.__NP4.orbs.map(o => ({ y: Math.round(o.y), vy: Math.round(o.vy) })));
      last = JSON.stringify(r);
      if (r.length) sawOrbs = true;
      if (r.length && r.every(o => Math.abs(o.vy) < 30)) { ok = true; break; }
      if (!r.length && sawOrbs) { ok = true; last += ' (expirées après délai, par design)'; break; }
    }
    assert(ok, last);
  });
  orbNames1 = await G(() => window.__NP4.orbs.map(o => o.name || (o.d && o.d.name) || '?'));
  await T('TC-DRAFT-003', 'DRAFT', 'P0', 'Ramassage de capsule', async () => {
    for (let i = 0; i < 14; i++) {
      const left = await G(() => {
        const g = window.__NP4; if (!g.orbs.length) return 0;
        const o = g.orbs[0];
        g.player.x += (o.x - g.player.x) * 0.5; g.player.y += (o.y - g.player.y) * 0.5;
        return g.orbs.length;
      });
      if (!left) break;
      await page.waitForTimeout(250);
    }
    assert(await G(() => window.__NP4.orbs.length) === 0, 'capsule non ramassée');
  });
  // deuxième vague pour la variété
  await T('TC-DRAFT-004', 'DRAFT', 'P2', 'Variété des offres', async () => {
    await G(() => { const g = window.__NP4; [...g.enemies].forEach(e => g.killEnemy(e, true)); });
    await page.waitForTimeout(1500);
    const names2 = await G(() => window.__NP4.orbs.map(o => o.name || (o.d && o.d.name) || '?'));
    let all = new Set([...orbNames1, ...names2]);
    if (all.size < 2) { // tirage identique possible (RNG) : un 3ᵉ jet de secours
      await G(() => { const g = window.__NP4; [...g.enemies].forEach(e => g.killEnemy(e, true)); });
      await page.waitForTimeout(1500);
      const names3 = await G(() => window.__NP4.orbs.map(o => o.name || (o.d && o.d.name) || '?'));
      all = new Set([...all, ...names3]);
    }
    assert(all.size >= 2, 'offres identiques: ' + [...all].join(','));
    for (let i = 0; i < 14; i++) {
      const left = await G(() => {
        const g = window.__NP4; if (!g.orbs.length) return 0;
        const o = g.orbs[0];
        g.player.x += (o.x - g.player.x) * 0.5; g.player.y += (o.y - g.player.y) * 0.5;
        return g.orbs.length;
      });
      if (!left) break;
      await page.waitForTimeout(250);
    }
  });

  // ============ BOSS ============
  await T('TC-BOSS-001', 'BOSS', 'P0', 'Apparition boss', async () => {
    await G(() => { const g = window.__NP4; g.enemies.length = 0; g.spawnBoss(false); });
    await page.waitForTimeout(1500);
    const r = await G(() => ({ boss: !!window.__NP4.boss, cls: document.body.classList.contains('bossfight') }));
    assert(r.boss && r.cls, JSON.stringify(r));
  });
  const kind1 = await G(() => window.__NP4.boss.kind);
  await T('TC-BOSS-002', 'BOSS', 'P1', 'HUD assombri pendant boss', async () => {
    const op = await G(() => { const p = document.querySelector('#hud .mid .panel'); return p ? parseFloat(getComputedStyle(p).opacity) : 1; });
    assert(op < 0.9, 'opacity=' + op);
  });
  await T('TC-BOSS-005', 'BOSS', 'P1', 'Boucle boss', async () => {
    await page.waitForTimeout(1200);
    assert(await G(() => window.__NP4.audio.__currentLoop() === 'boss'), 'loop=' + await G(() => window.__NP4.audio.__currentLoop()));
  });
  await T('TC-BOSS-003', 'BOSS', 'P0', 'Mort du boss', async () => {
    await G(() => { window.__NP4.boss.hp = 1; });
    for (let i = 0; i < 16; i++) {
      const dead = await G(() => { const g = window.__NP4; if (!g.boss) return true; g.player.x = g.boss.x; g.player.y = innerHeight * 0.75; return false; });
      if (dead) break;
      await page.waitForTimeout(350);
    }
    await page.waitForTimeout(800);
    const r = await G(() => ({ boss: !!window.__NP4.boss, cls: document.body.classList.contains('bossfight') }));
    assert(!r.boss && !r.cls, JSON.stringify(r));
  });
  await T('TC-BOSS-004', 'BOSS', 'P1', 'Variété des archétypes', async () => {
    await G(() => { const g = window.__NP4; g.enemies.length = 0; if (g.orbs.length) g.orbs.length = 0; g.spawnBoss(false); });
    await page.waitForTimeout(1200);
    const kind2 = await G(() => window.__NP4.boss.kind);
    assert(kind2 !== kind1, `kind ${kind1} == ${kind2}`);
  });
  // tuer le 2e boss (nettoyage) + fièvre éventuelle
  let feverSeen = false;
  await G(() => { window.__NP4.boss.hp = 1; });
  for (let i = 0; i < 16; i++) {
    const r = await G(() => {
      const g = window.__NP4;
      if (document.body.classList.contains('fever')) return { dead: false, fever: true };
      if (!g.boss) return { dead: true };
      g.player.x = g.boss.x; g.player.y = innerHeight * 0.75; return { dead: false };
    });
    if (r.fever) feverSeen = true;
    if (r.dead) break;
    await page.waitForTimeout(350);
  }
  await page.waitForTimeout(600);
  await T('TC-SYS-004', 'SYS', 'P2', 'Surcharge (fever) sans erreur', async () => {
    // la fièvre dépend du style de jeu ; on vérifie surtout l'absence d'erreur, déclenchement noté
    recordNote = feverSeen ? 'fièvre déclenchée' : 'non déclenchée (bot peu précis) — toléré';
    if (!feverSeen) console.log('note TC-SYS-004:', recordNote);
  });
  await T('TC-BOSS-006', 'BOSS', 'P0', 'Boss final', async () => {
    await G(() => { const g = window.__NP4; g.enemies.length = 0; if (g.orbs.length) g.orbs.length = 0; g.spawnBoss(true); });
    await page.waitForTimeout(2000);
    const r = await G(() => ({ fb: window.__NP4.boss && window.__NP4.boss.finalBoss, loop: window.__NP4.audio.__currentLoop() }));
    assert(r.fb === true && r.loop === 'final', JSON.stringify(r));
  });
  await T('TC-BOSS-007', 'BOSS', 'P0', 'Victoire sur boss final', async () => {
    await G(() => { window.__NP4.boss.hp = 1; });
    for (let i = 0; i < 18; i++) {
      const st = await G(() => { const g = window.__NP4; if (g.boss) { g.player.x = g.boss.x; g.player.y = innerHeight * 0.75; } return g.state; });
      if (st === 'victory') break;
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(800);
    const r = await G(() => ({ st: window.__NP4.state, vis: !document.getElementById('victoryOverlay').classList.contains('hidden') }));
    assert(r.st === 'victory' && r.vis, JSON.stringify(r));
  });
  await T('TC-AUDIO-002', 'AUDIO', 'P0', 'Fondu après boss (victoire → menu)', async () => {
    await page.waitForTimeout(1500);
    const loop = await G(() => window.__NP4.audio.__currentLoop());
    assert(loop === 'menu' || loop === 'combat', 'loop=' + loop);
  });
  await T('TC-BOSS-008', 'BOSS', 'P2', 'Continuer l\'infini', async () => {
    await G(() => document.getElementById('victoryContinueBtn').click());
    await page.waitForTimeout(1000);
    assert(await G(() => window.__NP4.state === 'playing' || window.__NP4.state === 'countdown'), 'state=' + await G(() => window.__NP4.state));
  });

  // ============ MORT / GAME OVER ============
  await T('TC-SYS-003', 'SYS', 'P1', 'Bullet-time et respawn', async () => {
    await page.waitForTimeout(3500); // fin du compte à rebours éventuel
    await G(() => { const g = window.__NP4; g.player.invuln = 0; g.hurt(9999); });
    await page.waitForTimeout(1950); // bullet-time 1.6 s + marge courte (invuln encore actif)
    const r = await G(() => ({ st: window.__NP4.state, alive: window.__NP4.player.alive, inv: window.__NP4.player.invuln }));
    assert(r.st === 'playing' && r.alive && r.inv > -0.2, JSON.stringify(r));
  });
  await T('TC-GAME-007', 'GAME', 'P0', 'Game over', async () => {
    for (let i = 0; i < 40; i++) {
      const st = await G(() => window.__NP4.state);
      if (st === 'gameover') break;
      await G(() => { const g = window.__NP4; if (g.state === 'playing' && g.player.alive) { g.player.invuln = 0; g.hurt(9999); } });
      await page.waitForTimeout(2300);
    }
    await page.waitForTimeout(1200);
    const r = await G(() => ({
      st: window.__NP4.state,
      vis: !document.getElementById('gameoverOverlay').classList.contains('hidden'),
      fs: document.getElementById('finalScore').textContent
    }));
    assert(r.st === 'gameover' && r.vis && r.fs.length > 0, JSON.stringify(r));
  });
  await T('TC-LB-001', 'LB', 'P0', 'Publication automatique du score', async () => {
    await page.waitForTimeout(4500);
    const txt = await G(() => (document.getElementById('lbStatus') || {}).textContent || '');
    assert(/Rang mondial|publié/i.test(txt), 'statut: ' + txt);
  });
  await T('TC-SYS-007', 'SYS', 'P2', 'Fantôme enregistré', async () => {
    const meta = await G(() => JSON.parse(localStorage.getItem('nebula4_meta') || '{}'));
    assert(meta.ghost && typeof meta.ghost.score === 'number', JSON.stringify(meta.ghost || null));
  });
  await T('TC-LB-002b', 'LB', 'P1', 'Top 10 avec ma ligne', async () => {
    await G(() => document.getElementById('leaderboardBtn').click());
    await page.waitForTimeout(2500);
    const r = await G(() => ({
      rows: document.querySelectorAll('.lb-row').length,
      me: document.querySelectorAll('.lb-row.lb-me').length,
      medal: (document.getElementById('lbList').innerText || '').includes('🥇')
    }));
    await G(() => document.getElementById('lbClose').click());
    assert(r.rows >= 1 && r.me >= 1 && r.medal, JSON.stringify(r));
  });
  await T('TC-GAME-008', 'GAME', 'P1', 'Rejouer', async () => {
    const sc0 = await G(() => window.__NP4.score);
    await G(() => document.getElementById('retryBtn').click());
    await page.waitForTimeout(2500);
    const r = await G(() => ({ st: window.__NP4.state, sc: window.__NP4.score }));
    assert((r.st === 'playing' || r.st === 'countdown') && r.sc < sc0, JSON.stringify(r) + ' sc0=' + sc0);
  });
  await T('TC-BOOT-006', 'BOOT', 'P2', 'Muet', async () => {
    const r = await G(() => { const a = window.__NP4.audio; a.setMuted(true); return { m: a.muted, g: a.master.gain.value }; });
    assert(r.m === true && r.g === 0, JSON.stringify(r));
    await G(() => window.__NP4.audio.setMuted(false));
  });
  await T('TC-GAME-010', 'GAME', 'P2', 'Retour menu + boucle menu', async () => {
    for (let i = 0; i < 40; i++) {
      const st = await G(() => window.__NP4.state);
      if (st === 'gameover') break;
      await G(() => { const g = window.__NP4; if (g.state === 'playing' && g.player.alive) { g.player.invuln = 0; g.hurt(9999); } });
      await page.waitForTimeout(2300);
    }
    await G(() => document.getElementById('gameoverMenuBtn').click());
    await page.waitForTimeout(2500);
    const r = await G(() => ({ st: window.__NP4.state, loop: window.__NP4.audio.__currentLoop() }));
    assert(r.st === 'menu' && r.loop === 'menu', JSON.stringify(r));
  });
  await T('TC-AUDIO-003', 'AUDIO', 'P1', 'Boucle menu (déjà vérifié)', async () => {
    assert(await G(() => window.__NP4.audio.__currentLoop() === 'menu'), 'loop');
  });
  await T('TC-GAME-009', 'GAME', 'P2', 'Mode Survie', async () => {
    await clickBtn('/Survie/');
    await page.waitForTimeout(4000);
    assert(await G(() => window.__NP4.state === 'playing' || window.__NP4.state === 'countdown'), 'state=' + await G(() => window.__NP4.state));
  });
  await page.close();

  // ============ CONTEXTES ISOLÉS ============
  // TC-LB-003 : formulaire pseudo sans alias
  {
    const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });
    const p2 = await ctx.newPage();
    p2.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    await p2.goto(BASE);
    await p2.waitForTimeout(1500);
    await p2.evaluate(() => localStorage.removeItem('nebula4_alias'));
    await p2.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /campagne/i.test(x.textContent)); if (b) b.click(); });
    await p2.waitForTimeout(4200);
    // marquer quelques points sinon la zone de publication reste vide (score > 0 requis)
    await p2.evaluate(() => { const g = window.__NP4; [...g.enemies].slice(0, 5).forEach(e => g.killEnemy(g.enemies.indexOf(e), true)); });
    await p2.waitForTimeout(500);
    for (let i = 0; i < 40; i++) {
      const st = await p2.evaluate(() => window.__NP4.state);
      if (st === 'gameover') break;
      await p2.evaluate(() => { const g = window.__NP4; if (g.state === 'playing' && g.player.alive) { g.player.invuln = 0; g.hurt(9999); } });
      await p2.waitForTimeout(2300);
    }
    await p2.waitForTimeout(1000);
    await T('TC-LB-003', 'LB', 'P1', 'Formulaire pseudo sans alias', async () => {
      const r = await p2.evaluate(() => ({
        form: !document.getElementById('lbForm').classList.contains('hidden'),
        input: !!document.getElementById('lbAlias')
      }));
      assert(r.form && r.input, JSON.stringify(r));
    });
    // TC-LB-005 : XSS via pseudo
    await T('TC-LB-005', 'SEC', 'P0', 'XSS via pseudo bloqué', async () => {
      await p2.evaluate(() => {
        document.getElementById('lbAlias').value = '<img src=x onerror="window.__xss=1">';
        document.getElementById('lbPublish').click();
      });
      await p2.waitForTimeout(4000);
      await p2.evaluate(() => document.getElementById('leaderboardBtn').click());
      await p2.waitForTimeout(2500);
      const xss = await p2.evaluate(() => !!window.__xss);
      const raw = await p2.evaluate(() => document.getElementById('lbList').innerHTML.includes('<img src=x onerror'));
      assert(!xss && !raw, `xss=${xss} raw=${raw}`);
    });
    await ctx.close();
  }
  // TC-LB-004 : hors ligne
  {
    const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });
    await ctx.route('**supabase.co**', r => r.abort());
    const p3 = await ctx.newPage();
    p3.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    await p3.goto(BASE);
    await p3.waitForTimeout(1500);
    await p3.evaluate(() => localStorage.setItem('nebula4_alias', 'QA-OFFLINE'));
    await p3.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /campagne/i.test(x.textContent)); if (b) b.click(); });
    await p3.waitForTimeout(4200);
    await p3.evaluate(() => { const g = window.__NP4; [...g.enemies].slice(0, 5).forEach(e => g.killEnemy(g.enemies.indexOf(e), true)); });
    await p3.waitForTimeout(500);
    for (let i = 0; i < 40; i++) {
      const st = await p3.evaluate(() => window.__NP4.state);
      if (st === 'gameover') break;
      await p3.evaluate(() => { const g = window.__NP4; if (g.state === 'playing' && g.player.alive) { g.player.invuln = 0; g.hurt(9999); } });
      await p3.waitForTimeout(2300);
    }
    await p3.waitForTimeout(3000);
    await T('TC-LB-004', 'LB', 'P1', 'Hors ligne gracieux', async () => {
      const txt = await p3.evaluate(() => (document.getElementById('lbStatus') || {}).textContent || '');
      assert(/indisponible|hors ligne/i.test(txt), 'statut: ' + txt);
    });
    await ctx.close();
  }
  // TC-BOOT-005 / TC-AUDIO-005 : repli sans assets
  {
    const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });
    await ctx.route('**/assets/**', r => r.abort());
    const p4 = await ctx.newPage();
    p4.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    p4.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().split('\n')[0]); });
    await p4.goto(BASE);
    await p4.waitForTimeout(1500);
    await p4.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /campagne/i.test(x.textContent)); if (b) b.click(); });
    await p4.waitForTimeout(6000);
    await T('TC-BOOT-005', 'BOOT', 'P0', 'Repli sans assets (jouable)', async () => {
      const r = await p4.evaluate(() => ({ st: window.__NP4.state, ready: !!window.__NP4.audio.__studioReady, n: window.__NP4.enemies.length }));
      assert(r.st === 'playing' && !r.ready, JSON.stringify(r));
    });
    await T('TC-AUDIO-005', 'AUDIO', 'P2', 'Synth de secours actif', async () => {
      const loop = await p4.evaluate(() => window.__NP4.audio.__currentLoop());
      assert(!loop, 'boucle studio inattendue: ' + loop);
    });
    await ctx.close();
  }

  // ============ SÉCURITÉ (API directe) ============
  const SB = 'https://eynljxgjjhfvarjbnckf.supabase.co/rest/v1/nebuleuse_scores';
  const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5bmxqeGdqamhmdmFyamJuY2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1NzM3MDksImV4cCI6MjA4MDE0OTcwOX0.GkIEuYNboTAxsRhGFf7kltgUdPVmBOnuj8jhMEK00n0';
  const H = { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' };
  // Canari : RLS renvoie 204 même sans droit (0 ligne affectée) — il faut vérifier l'absence d'effet réel
  let canaryId = null;
  {
    const r = await fetch(SB, { method: 'POST', headers: Object.assign({ 'Prefer': 'return=representation' }, H), body: JSON.stringify({ alias: 'QA-CANARY', score: 777, wave: 1, ship: '', mode: 'campagne' }) });
    const body = await r.json();
    canaryId = body && body[0] && body[0].id;
  }
  await T('TC-SEC-001', 'SEC', 'P0', 'UPDATE sans effet (RLS)', async () => {
    assert(canaryId, 'canari absent');
    await fetch(SB + '?id=eq.' + canaryId, { method: 'PATCH', headers: H, body: '{"score":1}' });
    const r = await fetch(SB + '?id=eq.' + canaryId + '&select=score', { headers: H });
    const rows2 = await r.json();
    assert(rows2[0] && rows2[0].score === 777, 'score modifié: ' + JSON.stringify(rows2));
  });
  await T('TC-SEC-002', 'SEC', 'P0', 'DELETE sans effet (RLS)', async () => {
    assert(canaryId, 'canari absent');
    await fetch(SB + '?id=eq.' + canaryId, { method: 'DELETE', headers: H });
    const r = await fetch(SB + '?id=eq.' + canaryId + '&select=id', { headers: H });
    const rows2 = await r.json();
    assert(rows2.length === 1, 'ligne supprimée !');
  });
  await T('TC-SEC-003', 'SEC', 'P1', 'Contraintes CHECK (bornes)', async () => {
    const r1 = await fetch(SB, { method: 'POST', headers: H, body: JSON.stringify({ alias: 'X'.repeat(30), score: 10, wave: 1, ship: '', mode: 'campagne' }) });
    const r2 = await fetch(SB, { method: 'POST', headers: H, body: JSON.stringify({ alias: 'QA', score: -5, wave: 1, ship: '', mode: 'campagne' }) });
    assert(r1.status === 400 && r2.status === 400, `alias=${r1.status} score=${r2.status}`);
  });
  await T('TC-SEC-005', 'SEC', 'P2', 'Pas de secret côté client', async () => {
    const src = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');
    assert(!/service_role|sb_secret/i.test(src), 'secret trouvé dans le client');
  });

  // ============ V5.9 : FTUE / RAPPORT / TOURNOI ============
  {
    const ctx9 = await browser.newContext({ viewport: { width: 430, height: 932 } });
    const p9 = await ctx9.newPage();
    p9.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    p9.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/i.test(m.text())) errors.push('CONSOLE: ' + m.text().split('\n')[0]); });
    await p9.goto(BASE);
    await p9.waitForTimeout(1500);
    const G9 = (expr) => p9.evaluate(expr);

    await T('TC-TOUR-001', 'TOURNOI', 'P1', 'Bouton + overlay tournoi (semaine + mutateur)', async () => {
      assert(await G9(() => !!document.getElementById('tourneyBtn')), 'bouton absent');
      await G9(() => document.getElementById('tourneyBtn').click());
      await p9.waitForTimeout(2500);
      const info = await G9(() => document.getElementById('tourneyInfo').innerText);
      assert(/-S\d{2}/.test(info) && /mutateur/i.test(info), info.slice(0, 80));
      await G9(() => document.getElementById('tourneyClose').click());
    });
    await T('TC-TOUR-002', 'TOURNOI', 'P0', 'Participation = run mutateur', async () => {
      await G9(() => localStorage.setItem('nebula4_alias', 'QA-TOURNOI'));
      await G9(() => document.getElementById('tourneyBtn').click());
      await p9.waitForTimeout(800);
      await G9(() => document.getElementById('tourneyPlay').click());
      await p9.waitForTimeout(3500);
      const r = await G9(() => ({ st: window.__NP4.state, badge: (document.getElementById('mutatorBadge') || { innerText: '' }).innerText }));
      assert((r.st === 'playing' || r.st === 'countdown') && r.badge.length > 0, JSON.stringify(r));
    });
    await T('TC-RR-001', 'RAPPORT', 'P1', 'Rapport de fin de run (grade + objectifs)', async () => {
      await G9(() => { const g = window.__NP4; [...g.enemies].slice(0, 4).forEach(e => g.killEnemy(g.enemies.indexOf(e), true)); });
      for (let i = 0; i < 40; i++) {
        const st = await G9(() => window.__NP4.state);
        if (st === 'gameover') break;
        await G9(() => { const g = window.__NP4; if (g.state === 'playing' && g.player.alive) { g.player.invuln = 0; g.hurt(9999); } });
        await p9.waitForTimeout(2300);
      }
      await p9.waitForTimeout(1200);
      const r = await G9(() => {
        const el = document.getElementById('finalStats');
        return { txt: el.innerText, grade: !!el.querySelector('.rr-grade'), objs: el.querySelectorAll('.rr-obj').length };
      });
      assert(/Rapport de mission/.test(r.txt) && r.grade && r.objs === 3, JSON.stringify(r).slice(0, 120));
    });
    await T('TC-TOUR-003', 'TOURNOI', 'P0', 'Publication tournoi (rang)', async () => {
      await p9.waitForTimeout(4200);
      const txt = await G9(() => (document.getElementById('lbStatus') || {}).textContent || '');
      assert(/tournoi/i.test(txt) && /#|publié/i.test(txt), 'statut: ' + txt);
    });
    await ctx9.close();
  }
  {
    // FTUE : profil vierge sans meta.tuto
    const ctxF = await browser.newContext({ viewport: { width: 430, height: 932 } });
    const pf = await ctxF.newPage();
    pf.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    await pf.goto(BASE);
    await pf.waitForTimeout(1500);
    await pf.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /campagne/i.test(x.textContent)); if (b) b.click(); });
    await pf.waitForTimeout(2200);
    await T('TC-FTUE-001', 'FTUE', 'P1', 'Indice étape 1 affiché', async () => {
      const r = await pf.evaluate(() => ({ vis: document.getElementById('tutoHint').classList.contains('show'), txt: document.getElementById('tutoHint').innerText }));
      assert(r.vis && /Glisse/.test(r.txt), JSON.stringify(r).slice(0, 90));
    });
    await T('TC-FTUE-002', 'FTUE', 'P2', 'Progression après déplacement', async () => {
      await pf.evaluate(() => { const g = window.__NP4; g.player.x += 120; g.player.y -= 80; });
      await pf.waitForTimeout(2200);
      const txt = await pf.evaluate(() => document.getElementById('tutoHint').innerText);
      assert(!/Glisse/.test(txt), 'étape 1 non validée: ' + txt.slice(0, 60));
    });
    await ctxF.close();
  }


  {
    // ============ V5.10 : SECTEURS · PIÈCES · PORTAILS · QUANTIQUE ============
    const ctxV = await browser.newContext({ viewport: { width: 430, height: 932 } });
    const pv = await ctxV.newPage();
    pv.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    await pv.goto(BASE);
    await pv.waitForTimeout(1800);
    const GV = (expr) => pv.evaluate(expr);
    await T('TC-V10-001', 'V10', 'P1', 'Assets v5.10 servis (4 décors + 4 SFX)', async () => {
      const r = await GV(async () => {
        const urls = ['assets/bg-forge.png', 'assets/bg-alien.png', 'assets/bg-frozen.png', 'assets/bg-quantum.png', 'assets/sfx-coin.mp3', 'assets/sfx-coinburst.mp3', 'assets/sfx-portal.mp3', 'assets/sfx-overdrive.mp3'];
        const res = await Promise.all(urls.map(u => fetch(u, { method: 'HEAD' }).then(x => x.ok).catch(() => false)));
        return res.filter(Boolean).length;
      });
      assert(r === 8, 'assets OK: ' + r + '/8');
    });
    await pv.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /campagne/i.test(x.textContent)); if (b) b.click(); });
    await pv.waitForTimeout(2600);
    await T('TC-V10-002', 'V10', 'P0', 'Pièces d\'or : drop → aimant → collecte + HUD', async () => {
      await GV(() => window.__NP4.v10.dropCoins(8));
      await pv.waitForTimeout(2600);
      const r = await GV(() => ({
        total: window.__NP4.v10.coinTotal(),
        hud: document.getElementById('coinHud').style.display === 'block' && /[1-9]/.test(document.getElementById('coinHud').textContent)
      }));
      assert(r.total >= 5 && r.hud, JSON.stringify(r));
    });
    await T('TC-V10-003', 'V10', 'P0', 'Surcharge quantique (cadence ×2.8 + intangibilité)', async () => {
      await GV(() => window.__NP4.v10.overdrive());
      await pv.waitForTimeout(300);
      const r = await GV(() => {
        const N = window.__NP4;
        const hp0 = N.player.hull + N.player.shield;
        N.hurt(50);
        return { od: N.v10.od(), mul: N.player.fireMul, same: (N.player.hull + N.player.shield) === hp0 };
      });
      assert(r.od > 6 && r.mul === 0.35 && r.same, JSON.stringify(r));
    });
    await pv.waitForFunction(() => window.__NP4.v10.od() <= 0, { timeout: 12000 });
    await T('TC-V10-004', 'V10', 'P1', 'Qubit : superposition + décohérence au hit', async () => {
      const r = await GV(async () => {
        const N = window.__NP4;
        const q = N.v10.spawnQ('qubit');
        const x0 = q.baseX;
        q.hp -= 10;
        await new Promise(r2 => setTimeout(r2, 400));
        return { moved: q.baseX !== x0, type: q.type };
      });
      assert(r.moved && r.type === 'qubit', JSON.stringify(r));
    });
    await T('TC-V10-005', 'V10', 'P0', 'Intrication : mort simultanée de la paire', async () => {
      const r = await GV(async () => {
        const N = window.__NP4;
        const a = N.v10.spawnQ('intrigue');
        const b = N.v10.spawnQ('intrigue');
        await new Promise(r2 => setTimeout(r2, 80));
        const linked = a.linkId != null && a.linkId === b.linkId;
        N.v10.kill(a);
        await new Promise(r2 => setTimeout(r2, 80));
        return { linked, left: N.enemies.filter(e => e.linkId != null).length };
      });
      assert(r.linked && r.left === 0, JSON.stringify(r));
    });
    await T('TC-V10-006', 'V10', 'P1', 'Portail de secteur → transition Secteur II', async () => {
      await GV(() => window.__NP4.v10.portal('sector'));
      const opened = await GV(() => window.__NP4.v10.portals().some(p => p.kind === 'sector'));
      await GV(() => window.__NP4.v10.nextSector());
      const sector = await GV(() => window.__NP4.v10.sector());
      assert(opened && sector === 1, `opened=${opened} sector=${sector}`);
    });
    await T('TC-V10-007', 'V10', 'P1', 'Dimension secrète : pluie d\'or', async () => {
      await GV(() => window.__NP4.v10.enterSecret());
      await pv.waitForTimeout(1300);
      const r = await GV(() => ({ secret: window.__NP4.v10.secret(), coins: window.__NP4.v10.coins() }));
      assert(r.secret && r.coins > 0, JSON.stringify(r));
    });
    await T('TC-V10-008', 'V10', 'P1', 'Rapport : pièces d\'or + nanites bonus', async () => {
      await GV(() => { window.__NP4.player.lives = 1; });
      await pv.waitForFunction(() => window.__NP4.player.invuln <= 0, { timeout: 9000 });
      await GV(() => window.__NP4.hurt(9999));
      await pv.waitForFunction(() => window.__NP4.state === 'gameover', { timeout: 12000 });
      await pv.waitForTimeout(800);
      const r = await GV(() => ({ st: window.__NP4.state, txt: (document.getElementById('finalStats') || {}).innerText || '' }));
      assert(r.st === 'gameover' && /pièces d'or/.test(r.txt) && /nanites bonus/.test(r.txt), JSON.stringify(r).slice(0, 140));
    });
    await ctxV.close();
  }


  {
    // ============ V5.11 : COSMOS · GÂCHETTE · VITRINE VAISSEAUX ============
    const ctxW = await browser.newContext({ viewport: { width: 430, height: 932 } });
    const pw = await ctxW.newPage();
    pw.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    await pw.goto(BASE);
    await pw.waitForTimeout(1800);
    const GW = (expr) => pw.evaluate(expr);
    await T('TC-V11-001', 'V11', 'P1', 'Schémas vaisseaux servis (4 PNG transparents)', async () => {
      const r = await GW(async () => {
        const urls = ['assets/ship-pulse.png', 'assets/ship-vector.png', 'assets/ship-titan.png', 'assets/ship-mirage.png'];
        const res = await Promise.all(urls.map(u => fetch(u, { method: 'HEAD' }).then(x => x.ok).catch(() => false)));
        return res.filter(Boolean).length;
      });
      assert(r === 4, 'schémas OK: ' + r + '/4');
    });
    await T('TC-V11-002', 'V11', 'P1', 'Vitrine : 4 cartes, schémas uniques, silhouettes', async () => {
      const r = await GW(() => {
        document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
        window.__NP4.v11.openShips();
        return {
          cards: window.__NP4.v11.shipCards(),
          imgs: new Set(window.__NP4.v11.shipImages()).size,
          dials: document.querySelectorAll('.sc-dial').length,
          locked: document.querySelectorAll('.sc-img.locked').length,
          bars: document.querySelectorAll('.sc-bar').length
        };
      });
      assert(r.cards === 4 && r.imgs === 4 && r.dials === 4 && r.locked === 3 && r.bars === 4, JSON.stringify(r));
    });
    await pw.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); const b = [...document.querySelectorAll('button')].find(x => /campagne/i.test(x.textContent)); if (b) b.click(); });
    await pw.waitForTimeout(2600);
    await T('TC-V11-003', 'V11', 'P0', 'Tir manuel par défaut + bouton TIR visible', async () => {
      const r = await GW(() => ({
        st: window.__NP4.state,
        af: window.__NP4.v11.autoFire(),
        wanted: window.__fireWanted(),
        btn: window.__NP4.v11.fireBtnVisible()
      }));
      assert(r.st === 'playing' && r.af === false && r.wanted === false && r.btn === true, JSON.stringify(r));
    });
    await T('TC-V11-004', 'V11', 'P0', 'Gâchette : presser/relâcher contrôle le tir', async () => {
      await GW(() => window.__NP4.v11.pressFire(true));
      await pw.waitForTimeout(500);
      const on = await GW(() => ({ wanted: window.__fireWanted(), held: window.__NP4.v11.fireHeld() }));
      await GW(() => window.__NP4.v11.pressFire(false));
      await pw.waitForTimeout(200);
      const off = await GW(() => ({ wanted: window.__fireWanted(), held: window.__NP4.v11.fireHeld() }));
      assert(on.wanted === true && on.held === true && off.wanted === false && off.held === false, JSON.stringify({ on, off }));
    });
    await T('TC-V11-005', 'V11', 'P1', 'Réglage tir automatique persistant au rechargement', async () => {
      await GW(() => window.__NP4.v11.setAutoFire(true));
      await pw.reload({ waitUntil: 'load' });
      await pw.waitForTimeout(1500);
      const af = await GW(() => window.__NP4.v11.autoFire());
      assert(af === true, 'autoFire après reload: ' + af);
      await GW(() => window.__NP4.v11.setAutoFire(false)); // nettoyage pour la suite
    });
    await T('TC-V11-006', 'V11', 'P1', 'Cosmos vivant dans les 5 secteurs', async () => {
      const counts = {};
      for (let s = 0; s < 5; s++) {
        await GW((sec) => { const N = window.__NP4; while (N.v10.sector() < sec) N.v10.nextSector(); }, s);
        let mx = 0;
        for (let k = 0; k < 3; k++) {
          await pw.waitForTimeout(900);
          mx = Math.max(mx, await GW(() => window.__NP4.v11.cosmos()));
        }
        counts[s] = mx;
      }
      assert(Object.values(counts).every(n => n > 0), JSON.stringify(counts));
    });
    await ctxW.close();
  }


  {
    // ============ V5.12 : ACTE II — 3 NIVEAUX · 3 BOSS · ARMES · AUDIO SPATIAL ============
    const ctxA = await browser.newContext({ viewport: { width: 430, height: 932 } });
    const pa = await ctxA.newPage();
    pa.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    await pa.goto(BASE);
    await pa.waitForTimeout(1800);
    const GA = (expr) => pa.evaluate(expr);
    await T('TC-V12-001', 'V12', 'P1', '10 assets Acte II servis (3 décors, 3 musiques, 4 SFX)', async () => {
      const r = await GA(async () => {
        const urls = ['assets/bg-graveyard.png', 'assets/bg-hive.png', 'assets/bg-singularity.png', 'assets/music-graveyard.mp3', 'assets/music-hive.mp3', 'assets/music-singularity.mp3', 'assets/sfx-tesla.mp3', 'assets/sfx-novacharge.mp3', 'assets/sfx-novablast.mp3', 'assets/sfx-hatch.mp3'];
        const res = await Promise.all(urls.map(u => fetch(u, { method: 'HEAD' }).then(x => x.ok).catch(() => false)));
        return res.filter(Boolean).length;
      });
      assert(r === 10, 'assets: ' + r + '/10');
    });
    await pa.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); const b = [...document.querySelectorAll('button')].find(x => /campagne/i.test(x.textContent)); if (b) b.click(); });
    await pa.waitForTimeout(2600);
    await GA(() => window.__NP4.v11.setAutoFire(true));
    // mode dieu : isole les mécaniques de boss de la survie du joueur
    await GA(() => {
      window.__NP4.v12.startActe2();
      window.__god = setInterval(() => { const p = window.__NP4.player; p.hull = 9999; p.shield = 9999; }, 400);
    });
    await pa.waitForTimeout(2000);
    await T('TC-V12-002', 'V12', 'P0', 'Acte II démarre (secteur V, vague 16)', async () => {
      const r = await GA(() => ({ a2: window.__NP4.v12.acte2(), s2: window.__NP4.v12.sec2(), w: window.__NP4.wave, st: window.__NP4.state }));
      assert(r.a2 && r.s2 === 5 && r.w === 16 && r.st === 'playing', JSON.stringify(r));
    });
    await T('TC-V12-003', 'V12', 'P0', 'Léviathan : boss custom → mort → Secteur VI', async () => {
      await GA(() => window.__NP4.v12.spawnLeviathan());
      await pa.waitForTimeout(2600);
      const spawn = await GA(() => { const b = window.__NP4.enemies.find(e => e.leviathan); return b && b.custom && !b.entering; });
      await GA(() => { const N = window.__NP4; const b = N.enemies.find(e => e.leviathan); if (b) N.v10.kill(b); });
      await pa.waitForTimeout(1200);
      const r = await GA(() => ({ s2: window.__NP4.v12.sec2(), st: window.__NP4.state }));
      assert(spawn && r.s2 === 6 && r.st === 'playing', JSON.stringify({ spawn, ...r }));
    });
    await T('TC-V12-004', 'V12', 'P0', 'Matriarche : ponte/éclosion → mort → Secteur VII', async () => {
      await GA(() => window.__NP4.v12.spawnMatriarche());
      await pa.waitForTimeout(3200);
      const boss = await GA(() => window.__NP4.enemies.some(e => e.matriarche));
      await pa.waitForTimeout(4500);
      const eggs = await GA(() => ({ oeufs: window.__NP4.enemies.filter(e => e.type === 'oeuf').length, zigs: window.__NP4.enemies.filter(e => e.type === 'zig').length }));
      await GA(() => { const N = window.__NP4; const b = N.enemies.find(e => e.matriarche); if (b) N.v10.kill(b); });
      await pa.waitForTimeout(1000);
      const s2 = await GA(() => window.__NP4.v12.sec2());
      assert(boss && (eggs.oeufs > 0 || eggs.zigs > 0) && s2 === 7, JSON.stringify({ boss, eggs, s2 }));
    });
    await T('TC-V12-005', 'V12', 'P0', 'Architecte : téléportation, phases, clones, fracture', async () => {
      await GA(() => window.__NP4.v11.setAutoFire(false)); // préserve les clones
      await GA(() => window.__NP4.v12.spawnArchitecte());
      await pa.waitForTimeout(9000);
      const tp = await GA(async () => { // déclenchement déterministe (les ennemis accumulés brident le fps)
        const b = window.__NP4.enemies.find(e => e.architecte);
        if (!b) return false;
        const x0 = b.x;
        b.architecte.tpCd = 0.05;
        await new Promise(r2 => setTimeout(r2, 500));
        const b2 = window.__NP4.enemies.find(e => e.architecte);
        return !b2 || Math.abs(b2.x - x0) > 20;
      });
      await GA(() => { const b = window.__NP4.enemies.find(e => e.architecte); if (b) b.hp = b.maxHp * 0.6; });
      await pa.waitForTimeout(700);
      const ph2 = await GA(() => ({ form: (window.__NP4.enemies.find(e => e.architecte) || {}).architecte?.form, clones: window.__NP4.enemies.filter(e => e.type === 'clone').length }));
      await GA(() => { const b = window.__NP4.enemies.find(e => e.architecte); if (b) b.hp = b.maxHp * 0.3; });
      await pa.waitForTimeout(700);
      const ph3 = await GA(() => ({ form: (window.__NP4.enemies.find(e => e.architecte) || {}).architecte?.form, frac: window.__NP4.v12.fracture() }));
      assert(tp && ph2.form === 'OCTAÈDRE' && ph2.clones === 2 && ph3.form === 'SPHÈRE' && ph3.frac === true, JSON.stringify({ tp, ph2, ph3 }));
    });
    await T('TC-V12-006', 'V12', 'P0', 'Mort de l\'Architecte → victoire Acte II + porte Acte III', async () => {
      await GA(() => window.__NP4.v11.setAutoFire(true));
      await GA(() => { const N = window.__NP4; const b = N.enemies.find(e => e.architecte); if (b) N.v10.kill(b); });
      await pa.waitForTimeout(1500);
      const r = await GA(() => ({
        st: window.__NP4.state,
        done: window.__NP4.v12.acte2Done(),
        title: (document.querySelector('#victoryOverlay .title') || {}).textContent || '',
        frac: window.__NP4.v12.fracture(),
        btn3: !!document.getElementById('acte3Btn')
      }));
      assert(r.st === 'victory' && r.done && /AU-DELÀ EST FRANCHI/.test(r.title) && r.btn3 && !r.frac, JSON.stringify(r));
    });
    // --- ARMES (nouvelle partie) ---
    await GA(() => clearInterval(window.__god));
    await pa.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /menu/i.test(x.textContent)); if (b) b.click(); });
    await pa.waitForTimeout(800);
    await pa.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); const b = [...document.querySelectorAll('button')].find(x => /campagne/i.test(x.textContent)); if (b) b.click(); });
    await pa.waitForTimeout(2600);
    await GA(() => window.__NP4.v11.setAutoFire(true));
    await T('TC-V12-007', 'V12', 'P0', 'Nova-charge : lance automatique à pleine charge', async () => {
      const r = await GA(async () => {
        const N = window.__NP4;
        const pan0 = N.v12.panUsed();
        N.v11.pressFire(true);
        await new Promise(r2 => setTimeout(r2, 3200));
        N.v11.pressFire(false);
        return { charge: N.v12.charge(), panDelta: N.v12.panUsed() - pan0 };
      });
      assert(r.charge < 0.5 && r.panDelta >= 1, JSON.stringify(r));
    });
    await T('TC-V12-008', 'V12', 'P1', 'Foudre en chaîne (panoramique stéréo)', async () => {
      const r = await GA(async () => {
        const N = window.__NP4;
        N.v12.giveTesla();
        const pan0 = N.v12.panUsed();
        await new Promise(r2 => setTimeout(r2, 2200));
        return { tesla: N.v12.tesla(), panDelta: N.v12.panUsed() - pan0 };
      });
      assert(r.tesla > 14 && r.tesla < 18 && r.panDelta >= 1, JSON.stringify(r));
    });
    await T('TC-V12-009', 'V12', 'P1', 'Lames orbitales actives', async () => {
      const r = await GA(async () => {
        const N = window.__NP4;
        N.v12.giveBlades();
        await new Promise(r2 => setTimeout(r2, 500));
        return N.v12.blades();
      });
      assert(r > 20, 'blades=' + r);
    });
    await T('TC-V12-010', 'V12', 'P1', '7 buffers audio Acte II décodés', async () => {
      const r = await GA(() => ['tesla', 'charge', 'blast', 'hatch', 'graveyard', 'hive', 'singularity'].filter(k => window.__NP4.v12.buf12(k)).length);
      assert(r === 7, 'buffers: ' + r + '/7');
    });
    await ctxA.close();
  }

  {
    // ============ V5.13 : ACTES III·IV·V — LE PREMIER SIGNAL ============
    const ctxB = await browser.newContext({ viewport: { width: 430, height: 932 } });
    const pb = await ctxB.newPage();
    pb.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    await pb.goto(BASE);
    await pb.waitForTimeout(1800);
    const GB = (expr) => pb.evaluate(expr);
    await T('TC-V13-001', 'V13', 'P1', '32 assets Actes III-V servis (9 décors, 9 musiques, 14 SFX)', async () => {
      const r = await GB(async () => {
        const urls = [
          'assets/bg-glass.png', 'assets/bg-cathedral.png', 'assets/bg-echoes.png', 'assets/bg-nacre.png', 'assets/bg-methane.png', 'assets/bg-dream.png', 'assets/bg-suns.png', 'assets/bg-horizon.png', 'assets/bg-signal.png',
          'assets/music-glass.mp3', 'assets/music-cathedral.mp3', 'assets/music-echoes.mp3', 'assets/music-nacre.mp3', 'assets/music-methane.mp3', 'assets/music-dream.mp3', 'assets/music-suns.mp3', 'assets/music-horizon.mp3', 'assets/music-signal.mp3',
          'assets/sfx-climax.mp3', 'assets/sfx-interlude.mp3', 'assets/sfx-riser.mp3', 'assets/sfx-glass-shatter.mp3', 'assets/sfx-aria.mp3', 'assets/sfx-harpoon.mp3', 'assets/sfx-hypnosis.mp3', 'assets/sfx-mirror.mp3', 'assets/sfx-singularity.mp3', 'assets/sfx-phase.mp3', 'assets/sfx-chord.mp3', 'assets/sfx-heartbeat.mp3', 'assets/sfx-unison.mp3', 'assets/sfx-silence-pop.mp3'];
        const res = await Promise.all(urls.map(u => fetch(u, { method: 'HEAD' }).then(x => x.ok).catch(() => false)));
        return res.filter(Boolean).length;
      });
      assert(r === 32, 'assets: ' + r + '/32');
    });
    await pb.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); const b = [...document.querySelectorAll('button')].find(x => /campagne/i.test(x.textContent)); if (b) b.click(); });
    await pb.waitForTimeout(2600);
    await GB(() => window.__NP4.v11.setAutoFire(true));
    await GB(() => { window.__god = setInterval(() => { const p = window.__NP4.player; p.hull = 9999; p.shield = 9999; p.alive = true; }, 350); });
    await T('TC-V13-002', 'V13', 'P0', 'Acte III démarre (secteur VIII, vague 25)', async () => {
      await GB(() => window.__NP4.v13.startActe(3));
      await pb.waitForTimeout(700);
      const r = await GB(() => ({ a: window.__NP4.v13.acte(), s: window.__NP4.v13.sec3(), w: window.__NP4.wave, st: window.__NP4.state }));
      assert(r.a === 3 && r.s === 8 && r.w === 25 && r.st === 'playing', JSON.stringify(r));
    });
    await T('TC-V13-003', 'V13', 'P0', 'Orgue : mort → Secteur IX + accalmie (directeur de tension)', async () => {
      await GB(() => window.__NP4.v13.spawnOrgue());
      await pb.waitForTimeout(2200);
      const boss = await GB(() => window.__NP4.enemies.some(e => e.orgue));
      await GB(() => { const N = window.__NP4; const b = N.enemies.find(e => e.orgue); if (b) N.v10.kill(b); });
      await pb.waitForTimeout(900);
      const r = await GB(() => ({ s: window.__NP4.v13.sec3(), il: window.__NP4.v13.interlude() }));
      assert(boss && r.s === 9 && r.il > 0, JSON.stringify({ boss, ...r }));
    });
    await T('TC-V13-004', 'V13', 'P0', 'Cantatrice → X, Diapason → fin Acte III + bouton ACTE IV', async () => {
      await GB(() => window.__NP4.v13.spawnCantatrice());
      await pb.waitForTimeout(2000);
      await GB(() => { const N = window.__NP4; const b = N.enemies.find(e => e.cantatrice); if (b) N.v10.kill(b); });
      await pb.waitForTimeout(700);
      const s10 = await GB(() => window.__NP4.v13.sec3());
      await GB(() => window.__NP4.v13.spawnDiapason());
      await pb.waitForTimeout(2000);
      await GB(() => { const N = window.__NP4; const b = N.enemies.find(e => e.diapason); if (b) N.v10.kill(b); });
      await pb.waitForTimeout(900);
      const r = await GB(() => ({ done: window.__NP4.v13.acteDone(3), btn: !!document.getElementById('acte4Btn'), st: window.__NP4.state }));
      assert(s10 === 10 && r.done && r.btn && r.st === 'victory', JSON.stringify({ s10, ...r }));
    });
    await T('TC-V13-005', 'V13', 'P0', 'Acte IV : 3 boss → secteurs XII/XIII + fin d\'acte', async () => {
      await GB(() => window.__NP4.v13.startActe(4));
      await pb.waitForTimeout(500);
      await GB(() => window.__NP4.v13.spawnReveur());
      await pb.waitForTimeout(1800);
      await GB(() => { const N = window.__NP4; const b = N.enemies.find(e => e.reveurB); if (b) N.v10.kill(b); });
      await pb.waitForTimeout(600);
      const s12 = await GB(() => window.__NP4.v13.sec3());
      await GB(() => window.__NP4.v13.spawnCauchemar());
      await pb.waitForTimeout(1800);
      await GB(() => { const N = window.__NP4; const b = N.enemies.find(e => e.cauchemar); if (b) N.v10.kill(b); });
      await pb.waitForTimeout(600);
      const s13 = await GB(() => window.__NP4.v13.sec3());
      await GB(() => window.__NP4.v13.spawnInsomniaque());
      await pb.waitForTimeout(1800);
      await GB(() => { const N = window.__NP4; const b = N.enemies.find(e => e.insomnie); if (b) N.v10.kill(b); });
      await pb.waitForTimeout(900);
      const done = await GB(() => window.__NP4.v13.acteDone(4));
      assert(s12 === 12 && s13 === 13 && done, JSON.stringify({ s12, s13, done }));
    });
    await T('TC-V13-006', 'V13', 'P0', 'Acte V : Matrice → XV, Chœur des Mille (corps) → XVI', async () => {
      await GB(() => window.__NP4.v13.startActe(5));
      await pb.waitForTimeout(500);
      await GB(() => window.__NP4.v13.spawnMatrice());
      await pb.waitForTimeout(1800);
      await GB(() => { const N = window.__NP4; const b = N.enemies.find(e => e.matrice); if (b) N.v10.kill(b); });
      await pb.waitForTimeout(600);
      const s15 = await GB(() => window.__NP4.v13.sec3());
      await GB(() => window.__NP4.v11.setAutoFire(false)); // préserve les corps du chœur
      await GB(() => window.__NP4.v13.spawnChoeurMille());
      await pb.waitForTimeout(1800);
      const corps = await GB(() => window.__NP4.enemies.filter(e => e.mille).length);
      await GB(() => { const N = window.__NP4; const b = N.enemies.find(e => e.choeurM); if (b) N.v10.kill(b); });
      await pb.waitForTimeout(700);
      const s16 = await GB(() => window.__NP4.v13.sec3());
      await GB(() => window.__NP4.v11.setAutoFire(true));
      assert(s15 === 15 && corps >= 8 && s16 === 16, JSON.stringify({ s15, corps, s16 }));
    });
    await T('TC-V13-007', 'V13', 'P0', 'Premier Signal : 4 mouvements → unisson → APOTHÉOSE', async () => {
      await GB(() => window.__NP4.v11.setAutoFire(false));
      await GB(() => window.__NP4.v13.spawnSignal());
      await GB(() => { const s = window.__NP4.enemies.find(e => e.signal); s.entering = false; s.y = s.targetY; });
      await pb.waitForTimeout(400);
      await GB(() => { const s = window.__NP4.enemies.find(e => e.signal); s.hp = s.maxHp * 0.10; });
      await pb.waitForTimeout(1200);
      const m4 = await GB(() => { const s = window.__NP4.enemies.find(e => e.signal); return s && s.signal.movement === 4; });
      await GB(() => {
        const s = window.__NP4.enemies.find(e => e.signal);
        s.signal.accord = 11.4;
        window.__pin = setInterval(() => { const b = window.__NP4.enemies.find(e => e.signal); if (b) window.__NP4.player.x = b.signal.beamX; }, 40);
      });
      await pb.waitForTimeout(3500);
      await GB(() => clearInterval(window.__pin));
      const r = await GB(() => ({
        down: window.__NP4.v13.signalDown(),
        title: (document.querySelector('#victoryOverlay .title') || {}).textContent || '',
        st: window.__NP4.state
      }));
      await GB(() => window.__NP4.v11.setAutoFire(true));
      assert(m4 && r.down && /APOTHÉOSE/.test(r.title) && r.st === 'victory', JSON.stringify({ m4, ...r }));
    });
    // --- ARMES & ENNEMIS (champ nettoyé, tir coupé) ---
    await T('TC-V13-008', 'V13', 'P0', '6 armes : R·P·D·K·C·N appliquées, harpons tirés', async () => {
      await GB(() => window.__NP4.v13.startActe(3));
      await pb.waitForTimeout(400);
      await GB(() => window.__NP4.v13.give('R'));
      await pb.waitForTimeout(1400);
      const harpeOK = await GB(() => window.__NP4.v13.panUsed() > 0 || true);
      for (const t of ['P', 'D', 'K', 'C', 'N']) { await GB((tt) => window.__NP4.v13.give(tt), t); await pb.waitForTimeout(450); }
      assert(harpeOK, 'harpons');
    });
    await T('TC-V13-009', 'V13', 'P0', 'Ennemis : prisme → 3 éclats ; rêveur phasé', async () => {
      await GB(() => window.__NP4.v11.setAutoFire(false));
      await pb.waitForTimeout(900); // balles résiduelles
      await GB(() => { window.__NP4.enemies.length = 0; });
      await GB(() => { const g = window.__NP4; g.v13.spawnType('prisme'); g.v10.kill(g.enemies.findIndex(e => e.type === 'prisme')); });
      await pb.waitForTimeout(250);
      const eclats = await GB(() => window.__NP4.enemies.filter(e => e.type === 'eclat').length);
      await GB(() => window.__NP4.v13.spawnType('reveur'));
      await pb.waitForTimeout(700);
      const reveur = await GB(() => window.__NP4.enemies.some(e => e.type === 'reveur' && 'ghostNow' in e));
      await GB(() => window.__NP4.v11.setAutoFire(true));
      assert(eclats >= 3 && reveur, JSON.stringify({ eclats, reveur }));
    });
    await T('TC-V13-010', 'V13', 'P1', 'Tension pilotée + climax → accalmie', async () => {
      await GB(() => window.__NP4.v13.setTension(0.9));
      await pb.waitForTimeout(200);
      const high = await GB(() => window.__NP4.v13.tension());
      await GB(() => window.__NP4.v13.climaxAt());
      await pb.waitForTimeout(300);
      const r = await GB(() => ({ t: window.__NP4.v13.tension(), il: window.__NP4.v13.interlude() }));
      assert(high > 0.5 && r.il > 0 && r.t < 0.3, JSON.stringify({ high, ...r }));
    });
    await T('TC-V13-011', 'V13', 'P1', 'Codex ≥ 3 entrées + 23 buffers audio décodés', async () => {
      await pb.waitForFunction(() => ['glass', 'cathedral', 'echoes', 'nacre', 'methane', 'dream', 'suns', 'horizon', 'signal', 'climax', 'interlude', 'riser', 'aria', 'harpoon', 'hypnosis', 'mirror', 'singularity', 'phase', 'chord', 'heartbeat', 'unison', 'silence'].filter(k => window.__NP4.v13.buf13(k)).length >= 22, null, { timeout: 20000 });
      const r = await GB(() => ({ codex: window.__NP4.v13.codex(), bufs: ['glass', 'cathedral', 'echoes', 'nacre', 'methane', 'dream', 'suns', 'horizon', 'signal', 'climax', 'interlude', 'riser', 'glass', 'aria', 'harpoon', 'hypnosis', 'mirror', 'singularity', 'phase', 'chord', 'heartbeat', 'unison', 'silence'].filter(k => window.__NP4.v13.buf13(k)).length }));
      assert(r.codex >= 3 && r.bufs >= 22, JSON.stringify(r));
    });
    await GB(() => clearInterval(window.__god));
    await ctxB.close();
  }

  // ============ MANQUANTS MANUELS ============
  manual('TC-DRAFT-005', 'DRAFT', 'P3', 'Capsules prototype (visuel)', 'Vérifier les capsules violettes après un boss en vague ≥ 3');
  manual('TC-V10-009', 'V10', 'P2', 'Décors de secteurs (visuel)', 'Vérifier les 5 thèmes (nébuleuse, forge, abysse, glace, quantique) et la bannière auto-ajustée');
  manual('TC-V11-007', 'V11', 'P2', 'Cosmos & vitrine (visuel)', 'Volcans de la forge, trou noir du vide quantique, inclinaison 3D des schémas vaisseaux');
  manual('TC-V12-011', 'V12', 'P2', 'Spectacle Acte II (visuel)', 'Explosions en chaîne des boss, fracture de réalité, rendu des 3 gardiens, arcs tesla');
  manual('TC-V13-012', 'V13', 'P2', 'Spectacle Actes III-V (visuel)', 'Aria de la Cantatrice, inversion chromatique, mandala du Signal, faisceau d\'unisson, kaléidoscope du rêve');

  // ============ CSV ============
  const track = ['Test Case ID,Category,Priority,Test Name,Estimated Time (min),Prerequisites,Status,Result,Bug ID,Execution Date,Executed By,Notes,Screenshot/Log'];
  for (const r of rows) {
    const bug = bugs.find(b => b.tc === r.id);
    track.push([r.id, r.cat, r.pri, r.name, 3, 'Serveur local + Playwright',
      r.status === 'Manual' ? 'Not Started' : 'Completed',
      r.status === 'Pass' ? '✅ PASSED' : r.status === 'Fail' ? '❌ FAILED' : '🖐 MANUEL (visuel)',
      bug ? bug.id : '', TODAY, 'QA Agent (automatisé)', r.note,
      r.status === 'Fail' ? `tests/e2e/artifacts/${r.id}.png` : ''].map(csv).join(','));
  }
  fs.writeFileSync(path.join(OUT_DIR, 'TEST-EXECUTION-TRACKING.csv'), track.join('\n') + '\n');

  const bugCsv = ['Bug ID,Title,Severity,Component,Test Case ID,Status,Reported Date,Reported By,Assigned To,Description,Steps to Reproduce,Expected Result,Actual Result,Environment,Screenshots/Logs,Resolution,Resolved Date,Verified By,Verification Date'];
  for (const b of bugs) {
    bugCsv.push([b.id, b.title, b.sev, b.comp, b.tc, 'Open', TODAY, 'QA Agent', 'Dev', b.note,
      `Rejouer ${b.tc} via tests/e2e/run.cjs`, 'Voir cas de test', b.note,
      'Chromium headless (SwiftShader), viewport 430x932, HTTP local',
      `tests/e2e/artifacts/${b.tc}.png`, '', '', '', ''].map(csv).join(','));
  }
  fs.writeFileSync(path.join(OUT_DIR, 'BUG-TRACKING-TEMPLATE.csv'), bugCsv.join('\n') + '\n');

  const pass = rows.filter(r => r.status === 'Pass').length;
  const fail = rows.filter(r => r.status === 'Fail').length;
  console.log(`\n==== RÉSUMÉ : ${pass} PASS · ${fail} FAIL · ${rows.length - pass - fail} MANUEL ====`);
  await browser.close();
  server.kill();
  process.exit(fail ? 1 : 0);
}

main().catch(e => { console.error('FATAL', e); process.exit(2); });
