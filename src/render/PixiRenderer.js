import {
  Application, Container, Sprite, Texture, Graphics, Text, Filter, BLEND_MODES,
} from 'pixi.js';
import { IRenderer } from './IRenderer.js';
import { NEBULA_FRAGMENT } from './nebula.frag.js';
import { TAU, rand, clamp } from '../util/math.js';
import { enemyColor, powerColor } from '../game/theme.js';

/* ---- Géométries locales (mêmes formes que le monolithe) ---- */
const TRI = (s) => [[0, -s], [s * 0.82, s * 0.72], [-s * 0.82, s * 0.72]];
const DIA = (s) => [[0, -s], [s * 0.72, 0], [0, s], [-s * 0.72, 0]];
const ARR = (s) => [[0, -s], [s * 0.7, s * 0.5], [0, s * 0.18], [-s * 0.7, s * 0.5]];
function HEX(s) {
  const p = [];
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + Math.PI / 6; p.push([Math.cos(a) * s, Math.sin(a) * s]); }
  return p;
}
function STAR(s) {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? s * 0.45 : s;
    const a = (i / 10) * TAU - Math.PI / 2;
    p.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return p;
}

function makeGradientTexture(w, h, stops, direction = 'horizontal') {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(w));
  c.height = Math.max(2, Math.round(h));
  const g = c.getContext('2d');
  const grad = direction === 'horizontal'
    ? g.createLinearGradient(0, 0, c.width, 0)
    : g.createLinearGradient(0, 0, 0, c.height);
  for (const s of stops) grad.addColorStop(s.offset, s.color);
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  return Texture.from(c);
}

function makeShipTexture(c1, c2) {
  const pad = 4, w = 28 + pad * 2, h = 40 + pad * 2;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.translate(w / 2, 22 + pad);
  const body = g.createLinearGradient(0, -22, 0, 18);
  body.addColorStop(0, c1); body.addColorStop(1, c2);
  g.beginPath();
  g.moveTo(0, -22); g.lineTo(14, 12); g.lineTo(6, 18); g.lineTo(-6, 18); g.lineTo(-14, 12);
  g.closePath();
  g.fillStyle = body; g.fill();
  g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,255,255,0.65)'; g.stroke();
  g.beginPath(); g.ellipse(0, -4, 4, 7, 0, 0, Math.PI * 2);
  g.fillStyle = 'rgba(8,47,73,0.9)'; g.fill();
  return Texture.from(c);
}

function beamAlpha(t) {
  if (t < 0.2) return 0.95 + (0.72 - 0.95) * (t / 0.2);
  return 0.72 + (0.05 - 0.72) * ((t - 0.2) / 0.8);
}

/**
 * PixiRenderer — implémentation WebGL du contrat IRenderer (PixiJS v7).
 * Cible de la migration ; produit un rendu comparable à Canvas2DRenderer.
 * Le ticker Pixi est arrêté : c'est le requestAnimationFrame de main.js
 * qui pilote, via renderFrame() hérité et present() qui rend le stage.
 */
export class PixiRenderer extends IRenderer {
  constructor({ lowQuality = false } = {}) {
    super();
    this.lowQuality = lowQuality;
    this.W = 0; this.H = 0;
    this._floatTextPool = []; this._floatTextIdx = 0;
    this._powerTextPool = []; this._powerTextIdx = 0;
  }

  /* ---- Cycle de vie ---- */
  mount(host) {
    this.app = new Application({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, this.lowQuality ? 1.5 : 2.5),
      autoDensity: true,
    });
    this.app.ticker.stop();                 // une seule horloge : le rAF de main.js
    host.appendChild(this.app.view);
    this.app.view.style.display = 'block';

    this.glowTex = this._makeGlowTexture(64);

    // Vaisseau pré-rendu (corps + cockpit en dégradé), affiché en Sprite
    this.shipSprite = new Sprite();
    this.shipSprite.anchor.set(0.5, 26 / 48);
    this._shipTex = null;
    this._shipTexKey = null;

    // Calques, dans l'ordre du z-order (hérité de draw()).
    this.bgLayer = new Container();
    this.worldLayer = new Container();      // reçoit la secousse
    this.starG = new Graphics();
    this.powerupGlowG = new Graphics(); this.powerupGlowG.blendMode = BLEND_MODES.ADD;
    this.powerupG = new Graphics();
    this.powerupTextLayer = new Container();
    this.bossHalo = new Sprite(this.glowTex);
    this.bossHalo.anchor.set(0.5); this.bossHalo.blendMode = BLEND_MODES.ADD; this.bossHalo.visible = false;
    this.enemyG = new Graphics();
    this.beamG = new Graphics(); this.beamG.blendMode = BLEND_MODES.ADD;
    this.reactorSprite = new Sprite(this.glowTex);
    this.reactorSprite.anchor.set(0.5); this.reactorSprite.blendMode = BLEND_MODES.ADD;
    this.reactorSprite.tint = 0x50c8ff; this.reactorSprite.width = 52; this.reactorSprite.height = 52;
    this.reactorSprite.visible = false;
    this.playerG = new Graphics();
    this.bulletG = new Graphics(); this.bulletG.blendMode = BLEND_MODES.ADD;
    this.particleG = new Graphics(); this.particleG.blendMode = BLEND_MODES.ADD;
    this.shockG = new Graphics(); this.shockG.blendMode = BLEND_MODES.ADD;
    this.textLayer = new Container();

    this.worldLayer.addChild(
      this.starG, this.powerupGlowG, this.powerupG, this.powerupTextLayer,
      this.bossHalo, this.enemyG, this.beamG, this.reactorSprite, this.shipSprite, this.playerG,
      this.bulletG, this.particleG, this.shockG, this.textLayer
    );

    this.overlayG = new Graphics();
    this.bannerLayer = new Container();
    this.bannerText = new Text('', {
      fontFamily: 'sans-serif', fontSize: 40, fontWeight: '900',
      fill: '#ffffff', align: 'center',
    });
    this.bannerText.anchor.set(0.5);
    const bannerGradTex = makeGradientTexture(400, 100, [
      { offset: 0,   color: '#a5f3fc' },
      { offset: 0.5, color: '#818cf8' },
      { offset: 1,   color: '#f0abfc' },
    ], 'horizontal');
    this.bannerGradient = new Sprite(bannerGradTex);
    this.bannerGradient.anchor.set(0.5);
    this.bannerGradient.width = 400;
    this.bannerGradient.height = 100;
    this.bannerGradient.mask = this.bannerText;
    this.bannerLayer.addChild(this.bannerText, this.bannerGradient);
    this.bannerLayer.visible = false;

    this.app.stage.addChild(this.bgLayer, this.worldLayer, this.overlayG, this.bannerLayer);

    // Fond : shader de nébuleuse (vTextureCoord déclaré explicitement dans le fragment).
    this.bgSprite = new Sprite(Texture.WHITE);
    this.nebula = new Filter(null, NEBULA_FRAGMENT, { uTime: 0, uResolution: [window.innerWidth, window.innerHeight] });
    this.bgSprite.filters = [this.nebula];
    this.bgLayer.addChild(this.bgSprite);
  }

  resize(w, h) {
    this.W = w; this.H = h;
    this.app.renderer.resize(w, h);
    this.bgSprite.width = w; this.bgSprite.height = h;
    this.nebula.uniforms.uResolution = [w, h];
    this.bannerText.style.fontSize = clamp(w * 0.09, 30, 64);
    this._initStars();
    const p = this.world && this.world.player;
    if (p) { p.x = clamp(p.x, 20, w - 20); p.y = clamp(p.y, 70, h - 40); }
  }

  present() { this.app.renderer.render(this.app.stage); }

  /* ---- Verbes de calque ---- */
  drawBackground() {
    this.bannerLayer.visible = false;       // état persistant Pixi : on réinitialise
    this.nebula.uniforms.uTime = this.world.globalTime;
  }

  beginShake() {
    const s = this.world.shake;
    if (s > 0) { const m = s * 9; this.worldLayer.x = rand(-m, m); this.worldLayer.y = rand(-m, m); }
    else { this.worldLayer.x = 0; this.worldLayer.y = 0; }
  }
  endShake() { this.worldLayer.x = 0; this.worldLayer.y = 0; }

  drawStars() {
    const g = this.starG; g.clear();
    const gt = this.world.globalTime;
    for (const s of this.world.stars) {
      const a = clamp(0.25 + s.z * 0.65 + Math.sin(gt * 2 + s.tw) * 0.12, 0, 1);
      g.beginFill(0xdcf5ff, a).drawRect(s.x, s.y, s.r, s.r).endFill();
    }
  }

  drawPowerups() {
    const glow = this.powerupGlowG; glow.clear();
    const g = this.powerupG; g.clear();
    this._powerTextIdx = 0;
    for (const p of this.world.powerups) {
      const c = powerColor(p.type);
      const cn = this._c(c);
      const pulse = Math.sin(p.t * 6) * 2;
      glow.beginFill(cn, 0.18).drawCircle(p.x, p.y, p.r + 10 + pulse).endFill();
      const r = p.r + pulse * 0.3;
      this._poly(g, p.x, p.y, p.t * 1.5, HEX(r), 0x030a14, 0.78, cn, 1, 2);
      const t = this._getPowerText();
      t.text = p.type; t.style.fill = '#ffffff';
      t.x = p.x; t.y = p.y + 1; t.alpha = 1; t.visible = true;
    }
    for (let i = this._powerTextIdx; i < this._powerTextPool.length; i++) this._powerTextPool[i].visible = false;
  }

  drawEnemies() {
    const g = this.enemyG; g.clear();
    let boss = null;
    for (const e of this.world.enemies) {
      if (e.type === 'boss') { boss = e; this._drawBoss(g, e); continue; }
      const cn = this._c(enemyColor(e.type));
      switch (e.type) {
        case 'drone': this._poly(g, e.x, e.y, Math.PI, TRI(14), cn); break;
        case 'zig': this._poly(g, e.x, e.y, e.t * 2, DIA(13), cn); break;
        case 'speeder': this._poly(g, e.x, e.y, Math.PI, ARR(12), cn); break;
        case 'tank': this._poly(g, e.x, e.y, e.t * 0.4, HEX(22), cn); break;
        case 'splitter': this._drawSplitter(g, e.x, e.y, e.t * 1.2, 18, cn); break;
        case 'turret': this._drawTurret(g, e.x, e.y, 16, cn, e); break;
        case 'elite': this._poly(g, e.x, e.y, e.t * 1.5, STAR(17), cn); break;
        case 'mini': this._poly(g, e.x, e.y, Math.PI, TRI(8), cn); break;
        case 'miniboss':
          this._poly(g, e.x, e.y, e.t * 0.8, STAR(30), cn);
          this._poly(g, e.x, e.y, -e.t * 0.8, HEX(16), 0xfff7ed);
          break;
      }
      if (e.elite) { g.lineStyle(2, 0xfbbf24, 0.8); g.drawCircle(e.x, e.y, e.r + 5); }
      if (e.hp < e.maxHp) {
        const w = e.r * 2, ratio = clamp(e.hp / e.maxHp, 0, 1);
        g.lineStyle(0);
        g.beginFill(0xffffff, 0.15).drawRect(e.x - e.r, e.y - e.r - 10, w, 3).endFill();
        g.beginFill(e.type === 'miniboss' ? 0xfbbf24 : 0xf87171, 1).drawRect(e.x - e.r, e.y - e.r - 10, w * ratio, 3).endFill();
      }
    }
    if (boss) {
      this.bossHalo.visible = true;
      this.bossHalo.x = boss.x; this.bossHalo.y = boss.y;
      this.bossHalo.tint = this._c(boss.color);
      this.bossHalo.alpha = 0.3 + 0.2 * Math.sin(this.world.globalTime * 4);
      const d = 180 * (boss.r / 54);
      this.bossHalo.width = d; this.bossHalo.height = d;
    } else {
      this.bossHalo.visible = false;
    }
  }

  drawBeams() {
    const g = this.beamG; g.clear();
    const H = this.H;
    for (const b of this.world.beams) {
      const active = b.life <= b.active;
      const x = b.x - b.width / 2;
      const cn = this._c(b.color);
      if (active) {
        const segs = 24;
        const segH = (H - b.y) / segs;
        for (let i = 0; i < segs; i++) {
          g.beginFill(cn, beamAlpha(i / segs)).drawRect(x, b.y + i * segH, b.width, segH + 1).endFill();
        }
        g.beginFill(0xffffff, 0.8).drawRect(b.x - 3, b.y, 6, H - b.y).endFill();
      } else {
        const t = (b.life - b.active) / (b.total - b.active);
        g.beginFill(cn, 0.08 + 0.14 * (1 - t)).drawRect(x, b.y, b.width, H - b.y).endFill();
      }
    }
  }

  drawPlayer() {
    const g = this.playerG; g.clear();
    const p = this.world.player;
    if (!p || !p.alive) {
      this.shipSprite.visible = false;
      this.reactorSprite.visible = false;
      return;
    }
    const gt = this.world.globalTime;
    const blink = p.invuln > 0 && Math.floor(gt * 12) % 2 === 0;
    const alpha = blink ? 0.35 : 1;

    // Texture du vaisseau, mise en cache par paire de couleurs (prépare les skins du Laboratoire)
    const c1 = p.colors ? p.colors[0] : '#dffcff';
    const c2 = p.colors ? p.colors[1] : '#2b7fff';
    const key = c1 + '|' + c2;
    if (this._shipTexKey !== key) {
      if (this._shipTex) this._shipTex.destroy(true);
      this._shipTex = makeShipTexture(c1, c2);
      this._shipTexKey = key;
      this.shipSprite.texture = this._shipTex;
    }
    this.shipSprite.visible = true;
    this.shipSprite.x = p.x;
    this.shipSprite.y = p.y;
    this.shipSprite.rotation = p.tilt * 0.4;
    this.shipSprite.alpha = alpha;

    // Réacteur (halo additif, derrière le corps)
    const rot = p.tilt * 0.4, cos = Math.cos(rot), sin = Math.sin(rot);
    this.reactorSprite.visible = true;
    this.reactorSprite.x = p.x - 18 * sin;
    this.reactorSprite.y = p.y + 18 * cos;
    this.reactorSprite.alpha = 0.8 * alpha;

    // Bouclier
    if (p.shield > 0) {
      g.lineStyle(3, 0x60a5fa, (0.15 + (p.shield / p.maxShield) * 0.45) * alpha);
      g.drawCircle(p.x, p.y, 26);
    }
  }

  drawBullets() {
    const g = this.bulletG; g.clear();
    for (const b of this.world.pBullets) {
      g.beginFill(b.homing ? 0xfbbf24 : 0x67e8f9, 0.28).drawCircle(b.x, b.y, b.r * 2.2).endFill();
      g.beginFill(b.homing ? 0xfde68a : 0xe8feff, 1).drawEllipse(b.x, b.y, b.r * 0.75, b.r * 1.8).endFill();
    }
    for (const b of this.world.eBullets) {
      g.beginFill(this._c(b.color), 0.28).drawCircle(b.x, b.y, b.r * 2.1).endFill();
      g.beginFill(0xffffff, 1).drawCircle(b.x, b.y, b.r * 0.82).endFill();
    }
  }

  drawParticles() {
    const g = this.particleG; g.clear();
    for (const p of this.world.particles) {
      g.beginFill(this._c(p.color), clamp(p.life / p.maxLife, 0, 1)).drawCircle(p.x, p.y, p.size).endFill();
    }
  }

  drawShockwaves() {
    const g = this.shockG; g.clear();
    for (const s of this.world.shockwaves) {
      const a = s.life / s.maxLife;
      g.lineStyle(8 * a + 2, 0xffffff, a * 0.7).drawCircle(s.x, s.y, s.r);
      g.lineStyle(16 * a + 4, 0x67e8f9, a * 0.4).drawCircle(s.x, s.y, s.r * 0.92);
    }
  }

  drawTexts() {
    this._floatTextIdx = 0;
    for (const t of this.world.texts) {
      const txt = this._getFloatText();
      txt.text = t.str; txt.style.fill = t.color;
      txt.x = t.x; txt.y = t.y;
      txt.alpha = clamp(t.life / t.maxLife, 0, 1);
      txt.visible = true;
    }
    for (let i = this._floatTextIdx; i < this._floatTextPool.length; i++) this._floatTextPool[i].visible = false;
  }

  drawBanner() {
    const total = 2.3, t = this.world.waveBannerTime;
    let a = 1;
    if (t > total - 0.4) a = (total - t) / 0.4;
    else if (t < 0.6) a = t / 0.6;
    this.bannerText.text = this.world.waveBanner;
    this.bannerLayer.position.set(this.W / 2, this.H * 0.3);
    this.bannerLayer.alpha = clamp(a, 0, 1);
    this.bannerLayer.visible = true;
  }

  flashOverlay() {
    const g = this.overlayG; g.clear();
    const f = this.world.hitFlash;
    if (f > 0) g.beginFill(0xff5078, f * 0.4).drawRect(0, 0, this.W, this.H).endFill();
  }
  slowOverlay() {
    if (this.world.slowTime > 0) {
      this.overlayG.beginFill(0x50a0ff, 0.06).drawRect(0, 0, this.W, this.H).endFill();
    }
  }

  /* ---- Internes ---- */
  _initStars() {
    const { W, H } = this;
    const areaFactor = clamp((W * H) / (390 * 844), 0.75, 1.8);
    const count = Math.round((this.lowQuality ? 90 : 170) * areaFactor);
    const stars = [];
    for (let i = 0; i < count; i++) {
      const z = Math.random();
      stars.push({ x: Math.random() * W, y: Math.random() * H, z, r: z * 1.7 + 0.3, s: 25 + z * 130, tw: rand(0, TAU) });
    }
    this.world.stars = stars;
  }

  _makeGlowTexture(radius) {
    const size = radius * 2;
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(radius, radius, 0, radius, radius, radius);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(255,255,255,0.5)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, size, size);
    return Texture.from(c);
  }

  _c(hex) { return parseInt(hex.slice(1), 16); }

  _poly(g, cx, cy, rot, pts, fill, fillAlpha = 0.92, stroke = 0xffffff, strokeAlpha = 0.5, strokeWidth = 2) {
    const cos = Math.cos(rot), sin = Math.sin(rot);
    const transformed = pts.map(([x, y]) => [cx + x * cos - y * sin, cy + x * sin + y * cos]);
    g.lineStyle(strokeWidth, stroke, strokeAlpha);
    g.beginFill(fill, fillAlpha);
    g.drawPolygon(transformed.flat());
    g.endFill();
  }

  _drawSplitter(g, cx, cy, rot, size, cn) {
    g.lineStyle(2, 0xffffff, 0.5);
    g.beginFill(cn, 0.82); g.drawCircle(cx, cy, size); g.endFill();
    const cos = Math.cos(rot), sin = Math.sin(rot);
    g.lineStyle(2, 0xffffff, 0.65);
    g.moveTo(cx - size * 0.6 * cos, cy - size * 0.6 * sin);
    g.lineTo(cx + size * 0.6 * cos, cy + size * 0.6 * sin);
  }

  _drawTurret(g, cx, cy, size, cn, e) {
    const p = this.world.player;
    const a = p ? Math.atan2(p.y - cy, p.x - cx) : Math.PI / 2;
    const rot = a + Math.PI / 2, cos = Math.cos(rot), sin = Math.sin(rot);
    const pts = [[-4, -size * 1.2], [4, -size * 1.2], [4, 0], [-4, 0]]
      .map(([x, y]) => [cx + x * cos - y * sin, cy + x * sin + y * cos]);
    g.lineStyle(0);
    g.beginFill(0x475569, 1).drawPolygon(pts.flat()).endFill();
    g.lineStyle(2, 0xffffff, 0.5);
    g.beginFill(cn, 0.92); g.drawCircle(cx, cy, size * 0.8); g.endFill();
    g.lineStyle(0);
    g.beginFill(0xffffff, 0.75); g.drawCircle(cx, cy, size * 0.35); g.endFill();
  }

  _drawBoss(g, e) {
    const sc = e.r / 54;
    const ratio = clamp(e.hp / e.maxHp, 0, 1);
    const wobble = Math.sin(e.spin * 0.7) * 0.06;
    const cos = Math.cos(wobble), sin = Math.sin(wobble);
    const T = (x, y) => [e.x + (x * cos - y * sin) * sc, e.y + (x * sin + y * cos) * sc];
    const body = [[0, -52], [58, -8], [74, 34], [24, 22], [0, 52], [-24, 22], [-74, 34], [-58, -8]].map(([x, y]) => T(x, y));
    g.lineStyle(2, this._c(e.color), 1);
    g.beginFill(0x111827, 1); g.drawPolygon(body.flat()); g.endFill();
    for (let i = 0; i < 4; i++) {
      const rt = wobble + e.spin + (i * TAU) / 4;
      const c2 = Math.cos(rt), s2 = Math.sin(rt);
      const rect = [[30, -6], [56, -6], [56, 6], [30, 6]].map(([x, y]) => {
        const lx = x * sc, ly = y * sc;
        return [e.x + lx * c2 - ly * s2, e.y + lx * s2 + ly * c2];
      });
      g.lineStyle(1, this._c(e.color), 0.55);
      g.beginFill(0xffffff, 0.08); g.drawPolygon(rect.flat()); g.endFill();
    }
    g.lineStyle(1, 0xffffff, 0.8);
    g.beginFill(this._c(e.color), ratio > 0.5 ? 0.85 : 1);
    g.drawCircle(e.x, e.y, 20 * sc);
    g.endFill();
  }

  _getFloatText() {
    let t = this._floatTextPool[this._floatTextIdx];
    if (!t) {
      t = new Text('', { fontFamily: 'sans-serif', fontSize: 16, fontWeight: '700', fill: '#ffffff', align: 'center' });
      t.anchor.set(0.5);
      this.textLayer.addChild(t);
      this._floatTextPool.push(t);
    }
    this._floatTextIdx++;
    return t;
  }
  _getPowerText() {
    let t = this._powerTextPool[this._powerTextIdx];
    if (!t) {
      t = new Text('', { fontFamily: 'sans-serif', fontSize: 13, fontWeight: '900', fill: '#ffffff', align: 'center' });
      t.anchor.set(0.5);
      this.powerupTextLayer.addChild(t);
      this._powerTextPool.push(t);
    }
    this._powerTextIdx++;
    return t;
  }
}