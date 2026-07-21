import { IRenderer } from './IRenderer.js';
import { TAU, rand, clamp, pick } from '../util/math.js';
import { hexToRgba } from '../util/color.js';
import { enemyColor, powerColor } from '../game/theme.js';

/**
 * Canvas2DRenderer — transposition fidèle du moteur de rendu de nebuleuse-v4.6.
 * Sert de RÉFÉRENCE visuelle (test comparatif) et de FALLBACK sans WebGL.
 */
export class Canvas2DRenderer extends IRenderer {
  constructor({ lowQuality = false } = {}) {
    super();
    this.lowQuality = lowQuality;
    this.canvas = null; this.ctx = null;
    this.bg = null;     this.bctx = null;
    this.W = 0; this.H = 0; this.DPR = 1;
  }

  mount(host) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'game';
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.bg = document.createElement('canvas');
    this.bctx = this.bg.getContext('2d');
    host.appendChild(this.canvas);
  }

  resize(w, h) {
    this.W = w; this.H = h;
    this.DPR = Math.min(window.devicePixelRatio || 1, this.lowQuality ? 1.5 : 2.5);
    this.canvas.width  = Math.floor(this.W * this.DPR);
    this.canvas.height = Math.floor(this.H * this.DPR);
    this.canvas.style.width  = this.W + 'px';
    this.canvas.style.height = this.H + 'px';
    this.ctx.setTransform(this.DPR, 0, 0, this.DPR, 0, 0);
    this._makeBackground();
    this._initStars();
    const p = this.world && this.world.player;
    if (p) { p.x = clamp(p.x, 20, this.W - 20); p.y = clamp(p.y, 70, this.H - 40); }
  }

  /* ---- Fond (pré-rendu une fois dans le canvas hors-écran bg) ---- */
  _makeBackground() {
    const { bctx, W, H, DPR } = this;
    this.bg.width  = Math.floor(W * DPR);
    this.bg.height = Math.floor(H * DPR);
    bctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const g = bctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#030711'); g.addColorStop(0.45, '#060b1c'); g.addColorStop(1, '#0a0618');
    bctx.fillStyle = g; bctx.fillRect(0, 0, W, H);
    const colors = ['rgba(56, 189, 248, 0.10)', 'rgba(129, 140, 248, 0.12)',
                    'rgba(217, 70, 239, 0.08)', 'rgba(16, 185, 129, 0.06)'];
    for (let i = 0; i < 9; i++) {
      const x = rand(0, W), y = rand(0, H);
      const r = rand(Math.min(W, H) * 0.18, Math.min(W, H) * 0.55);
      const rg = bctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, pick(colors)); rg.addColorStop(1, 'rgba(0, 0, 0, 0)');
      bctx.fillStyle = rg; bctx.beginPath(); bctx.arc(x, y, r, 0, TAU); bctx.fill();
    }
  }

  _initStars() {
    const { W, H } = this;
    const areaFactor = clamp((W * H) / (390 * 844), 0.75, 1.8);
    const baseCount = this.lowQuality ? 90 : 170;
    const count = Math.round(baseCount * areaFactor);
    const stars = [];
    for (let i = 0; i < count; i++) {
      const z = Math.random();
      stars.push({ x: Math.random() * W, y: Math.random() * H, z,
                   r: z * 1.7 + 0.3, s: 25 + z * 130, tw: rand(0, TAU) });
    }
    this.world.stars = stars;   // les étoiles appartiennent au monde (animées par la logique)
  }

  /* ---- Verbes de calque ---- */
  drawBackground() { this.ctx.drawImage(this.bg, 0, 0, this.W, this.H); }

  beginShake() {
    const ctx = this.ctx, s = this.world.shake;
    ctx.save();
    if (s > 0) { const m = s * 9; ctx.translate(rand(-m, m), rand(-m, m)); }
  }
  endShake() { this.ctx.restore(); }

  drawStars() {
    const ctx = this.ctx, gt = this.world.globalTime;
    for (const s of this.world.stars) {
      const a = 0.25 + s.z * 0.65 + Math.sin(gt * 2 + s.tw) * 0.12;
      ctx.fillStyle = `rgba(220, 245, 255, ${clamp(a, 0, 1)})`;
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
  }

  drawPowerups() {
    const ctx = this.ctx;
    for (const p of this.world.powerups) {
      const c = powerColor(p.type);
      const pulse = Math.sin(p.t * 6) * 2;
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.t * 1.5);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = c; ctx.globalAlpha = 0.18;
      ctx.beginPath(); ctx.arc(0, 0, p.r + 10 + pulse, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      const r = p.r + pulse * 0.3;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU, px = Math.cos(a) * r, py = Math.sin(a) * r;
        if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(3, 10, 20, 0.78)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = c; ctx.stroke();
      ctx.rotate(-p.t * 1.5);
      ctx.fillStyle = '#ffffff'; ctx.font = '900 13px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.type, 0, 1);
      ctx.restore();
    }
  }

  drawEnemies() {
    const ctx = this.ctx;
    for (const e of this.world.enemies) {
      if (e.type === 'boss') { this._drawBoss(e); continue; }
      const c = enemyColor(e.type);
      ctx.save(); ctx.translate(e.x, e.y);
      switch (e.type) {
        case 'drone':    ctx.rotate(Math.PI);   this._drawTriangle(14, c); break;
        case 'zig':      ctx.rotate(e.t * 2);   this._drawDiamond(13, c);  break;
        case 'speeder':  ctx.rotate(Math.PI);   this._drawArrow(12, c);    break;
        case 'tank':     ctx.rotate(e.t * 0.4); this._drawHexagon(22, c);  break;
        case 'splitter': ctx.rotate(e.t * 1.2); this._drawSplitter(18, c); break;
        case 'turret':   this._drawTurret(16, c, e); break;
        case 'elite':    ctx.rotate(e.t * 1.5); this._drawStar(17, c);     break;
        case 'mini':     ctx.rotate(Math.PI);   this._drawTriangle(8, c);  break;
        case 'miniboss':
          ctx.rotate(e.t * 0.8); this._drawStar(30, c);
          ctx.rotate(-e.t * 0.8); this._drawHexagon(16, '#fff7ed'); break;
      }
      ctx.restore();
      if (e.elite) {
        ctx.save();
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 5, 0, TAU); ctx.stroke();
        ctx.restore();
      }
      if (e.hp < e.maxHp) {
        const w = e.r * 2, ratio = clamp(e.hp / e.maxHp, 0, 1);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(e.x - e.r, e.y - e.r - 10, w, 3);
        ctx.fillStyle = e.type === 'miniboss' ? '#fbbf24' : '#f87171';
        ctx.fillRect(e.x - e.r, e.y - e.r - 10, w * ratio, 3);
      }
    }
  }

  _drawBoss(e) {
    const ctx = this.ctx, gt = this.world.globalTime;
    ctx.save(); ctx.translate(e.x, e.y);
    const sc = e.r / 54; ctx.scale(sc, sc);
    const ratio = clamp(e.hp / e.maxHp, 0, 1);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 90);
    g.addColorStop(0, hexToRgba(e.color, 0.3 + 0.2 * Math.sin(gt * 4)));
    g.addColorStop(1, hexToRgba(e.color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 90, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.rotate(Math.sin(e.spin * 0.7) * 0.06);
    ctx.beginPath();
    ctx.moveTo(0, -52); ctx.lineTo(58, -8); ctx.lineTo(74, 34); ctx.lineTo(24, 22);
    ctx.lineTo(0, 52); ctx.lineTo(-24, 22); ctx.lineTo(-74, 34); ctx.lineTo(-58, -8);
    ctx.closePath();
    ctx.fillStyle = '#111827'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = e.color; ctx.stroke();
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.rotate(e.spin + (i * TAU) / 4);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'; ctx.fillRect(30, -6, 26, 12);
      ctx.strokeStyle = hexToRgba(e.color, 0.55); ctx.strokeRect(30, -6, 26, 12);
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, TAU);
    ctx.fillStyle = ratio > 0.5 ? hexToRgba(e.color, 0.85) : e.color; ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; ctx.stroke();
    ctx.restore();
  }

  drawBeams() {
    const ctx = this.ctx, H = this.H;
    for (const b of this.world.beams) {
      const active = b.life <= b.active;
      const x = b.x - b.width / 2;
      ctx.save();
      if (active) {
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(0, b.y, 0, H);
        g.addColorStop(0, hexToRgba(b.color, 0.95));
        g.addColorStop(0.2, hexToRgba(b.color, 0.72));
        g.addColorStop(1, hexToRgba(b.color, 0.05));
        ctx.fillStyle = g; ctx.fillRect(x, b.y, b.width, H - b.y);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; ctx.fillRect(b.x - 3, b.y, 6, H - b.y);
      } else {
        const t = (b.life - b.active) / (b.total - b.active);
        ctx.fillStyle = hexToRgba(b.color, 0.08 + 0.14 * (1 - t));
        ctx.fillRect(x, b.y, b.width, H - b.y);
      }
      ctx.restore();
    }
  }

  drawPlayer() {
    const ctx = this.ctx, player = this.world.player, gt = this.world.globalTime;
    if (!player || !player.alive) return;
    ctx.save();
    ctx.translate(player.x, player.y); ctx.rotate(player.tilt * 0.4);
    if (player.invuln > 0 && Math.floor(gt * 12) % 2 === 0) ctx.globalAlpha = 0.35;
    ctx.globalCompositeOperation = 'lighter';
    const eg = ctx.createRadialGradient(0, 18, 0, 0, 18, 26);
    eg.addColorStop(0, 'rgba(80, 200, 255, 0.8)'); eg.addColorStop(1, 'rgba(80, 200, 255, 0)');
    ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(0, 18, 26, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    const c1 = player.colors ? player.colors[0] : '#dffcff';
    const c2 = player.colors ? player.colors[1] : '#2b7fff';
    const body = ctx.createLinearGradient(0, -22, 0, 18);
    body.addColorStop(0, c1); body.addColorStop(1, c2);
    ctx.beginPath();
    ctx.moveTo(0, -22); ctx.lineTo(14, 12); ctx.lineTo(6, 18); ctx.lineTo(-6, 18); ctx.lineTo(-14, 12);
    ctx.closePath();
    ctx.fillStyle = body; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -4, 4, 7, 0, 0, TAU);
    ctx.fillStyle = 'rgba(8, 47, 73, 0.9)'; ctx.fill();
    if (player.shield > 0) {
      ctx.beginPath(); ctx.arc(0, 0, 26, 0, TAU);
      ctx.strokeStyle = `rgba(96, 165, 250, ${0.15 + (player.shield / player.maxShield) * 0.45})`;
      ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.restore();
  }

  drawBullets() {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of this.world.pBullets) {
      ctx.fillStyle = b.homing ? 'rgba(251, 191, 36, 0.3)' : 'rgba(103, 232, 249, 0.28)';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 2.2, 0, TAU); ctx.fill();
      ctx.fillStyle = b.homing ? '#fde68a' : '#e8feff';
      ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r * 0.75, b.r * 1.8, 0, 0, TAU); ctx.fill();
    }
    for (const b of this.world.eBullets) {
      ctx.globalAlpha = 0.28; ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 2.1, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.82, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  drawParticles() {
    const ctx = this.ctx;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of this.world.particles) {
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  drawShockwaves() {
    const ctx = this.ctx;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const s of this.world.shockwaves) {
      const a = s.life / s.maxLife;
      ctx.strokeStyle = `rgba(255, 255, 255, ${a * 0.7})`; ctx.lineWidth = 8 * a + 2;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = `rgba(103, 232, 249, ${a * 0.4})`; ctx.lineWidth = 16 * a + 4;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.92, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }

  drawTexts() {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = '700 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const t of this.world.texts) {
      ctx.globalAlpha = clamp(t.life / t.maxLife, 0, 1);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.restore();
  }

  drawBanner() {
    const ctx = this.ctx, W = this.W, H = this.H;
    const total = 2.3, t = this.world.waveBannerTime;
    let a = 1;
    if (t > total - 0.4) a = (total - t) / 0.4;
    else if (t < 0.6) a = t / 0.6;
    a = clamp(a, 0, 1);
    ctx.save();
    ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const size = clamp(W * 0.09, 30, 64);
    ctx.font = `900 ${size}px sans-serif`;
    const g = ctx.createLinearGradient(W / 2 - 160, 0, W / 2 + 160, 0);
    g.addColorStop(0, '#a5f3fc'); g.addColorStop(0.5, '#818cf8'); g.addColorStop(1, '#f0abfc');
    ctx.fillStyle = g;
    ctx.fillText(this.world.waveBanner, W / 2, H * 0.3);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)'; ctx.lineWidth = 1;
    ctx.strokeText(this.world.waveBanner, W / 2, H * 0.3);
    ctx.restore();
  }

  flashOverlay() {
    const f = this.world.hitFlash;
    if (f > 0) {
      this.ctx.fillStyle = `rgba(255, 80, 120, ${f * 0.4})`;
      this.ctx.fillRect(0, 0, this.W, this.H);
    }
  }
  slowOverlay() {
    if (this.world.slowTime > 0) {
      this.ctx.fillStyle = 'rgba(80, 160, 255, 0.06)';
      this.ctx.fillRect(0, 0, this.W, this.H);
    }
  }

  present() { /* le canvas s'affiche de lui-même : rien à faire */ }

  /* ---- Primitives géométriques (moyens internes, hors contrat) ---- */
  _fillStroke(color, alpha = 0.92) {
    const ctx = this.ctx;
    ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.fill();
    ctx.globalAlpha = 1; ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; ctx.stroke();
  }
  _drawTriangle(size, color) {
    const ctx = this.ctx; ctx.beginPath();
    ctx.moveTo(0, -size); ctx.lineTo(size * 0.82, size * 0.72); ctx.lineTo(-size * 0.82, size * 0.72);
    ctx.closePath(); this._fillStroke(color);
  }
  _drawDiamond(size, color) {
    const ctx = this.ctx; ctx.beginPath();
    ctx.moveTo(0, -size); ctx.lineTo(size * 0.72, 0); ctx.lineTo(0, size); ctx.lineTo(-size * 0.72, 0);
    ctx.closePath(); this._fillStroke(color);
  }
  _drawArrow(size, color) {
    const ctx = this.ctx; ctx.beginPath();
    ctx.moveTo(0, -size); ctx.lineTo(size * 0.7, size * 0.5);
    ctx.lineTo(0, size * 0.18); ctx.lineTo(-size * 0.7, size * 0.5);
    ctx.closePath(); this._fillStroke(color);
  }
  _drawHexagon(size, color) {
    const ctx = this.ctx; ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + Math.PI / 6, px = Math.cos(a) * size, py = Math.sin(a) * size;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath(); this._fillStroke(color);
  }
  _drawStar(size, color) {
    const ctx = this.ctx; ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? size * 0.45 : size;
      const a = (i / 10) * TAU - Math.PI / 2, px = Math.cos(a) * r, py = Math.sin(a) * r;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath(); this._fillStroke(color);
  }
  _drawSplitter(size, color) {
    const ctx = this.ctx;
    ctx.beginPath(); ctx.arc(0, 0, size, 0, TAU); this._fillStroke(color, 0.82);
    ctx.beginPath(); ctx.moveTo(-size * 0.6, 0); ctx.lineTo(size * 0.6, 0);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)'; ctx.lineWidth = 2; ctx.stroke();
  }
  _drawTurret(size, color, e) {
    const ctx = this.ctx, player = this.world.player;
    const a = player ? Math.atan2(player.y - e.y, player.x - e.x) : Math.PI / 2;
    ctx.save(); ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = '#475569'; ctx.fillRect(-4, -size * 1.2, 8, size * 1.2);
    ctx.restore();
    ctx.beginPath(); ctx.arc(0, 0, size * 0.8, 0, TAU); this._fillStroke(color);
    ctx.beginPath(); ctx.arc(0, 0, size * 0.35, 0, TAU);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)'; ctx.fill();
  }
}