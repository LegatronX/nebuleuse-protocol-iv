// src/render/PixiRenderer.js
import {
  Application, Container, Sprite, Texture, Graphics,
  Filter, BLEND_MODES
} from 'pixi.js';
import { NEBULA_FRAGMENT } from './nebula.frag.js';

/** Génère une texture « cœur blanc + halo radial » : le glow, sans shadowBlur. */
function makeGlowTexture(radius, color) {
  const size = radius * 2;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(radius, radius, 0, radius, radius, radius);
  grad.addColorStop(0.0, '#ffffff');
  grad.addColorStop(0.25, color);
  grad.addColorStop(1.0, 'rgba(0,0,0,0)');   // falloff additif
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return Texture.from(c);                       // v7 ; idem en v8
}

export class PixiRenderer {
  constructor(parent, { width, height }) {
    this.app = new Application({
      width, height,
      backgroundAlpha: 0,                       // on laisse le fond CSS transparaître si besoin
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    parent.appendChild(this.app.view);          // v8 : this.app.canvas

    // Couches : l'ordre d'ajout = l'ordre de composition (z-order).
    this.bgLayer   = new Container();           // nébuleuse en shader
    this.gameLayer = new Container();           // vaisseau, ennemis (net)
    this.fxLayer   = new Container();           // tirs, particules (additif)
    this.app.stage.addChild(this.bgLayer, this.gameLayer, this.fxLayer);

    // Textures de glow réutilisables (une par teinte).
    this.tex = {
      bullet: makeGlowTexture(24, 'rgba(103,232,249,1)'),
      spark:  makeGlowTexture(40, 'rgba(192,132,252,1)'),
    };

    this._initBackground(width, height);
    this._pools = { bullet: [], fx: [] };       // object pooling de sprites
  }

  /* ---- Fond nébuleuse : un shader de fragment animé (impossible en Canvas 2D) ---- */
  _initBackground(w, h) {
    const bg = new Sprite(Texture.WHITE);       // surface pleine écran
    bg.width = w; bg.height = h;
    this.nebula = new Filter(null, NEBULA_FRAGMENT, {
      uTime: 0, uResolution: [w, h],
    });
    bg.filters = [this.nebula];
    this.bgLayer.addChild(bg);
    this.bgSprite = bg;
  }

  /* ---- Verbes du contrat de rendu (extraits) ---- */
  drawBullet(x, y) {
    const s = this._acquire('bullet', this.tex.bullet);
    s.x = x; s.y = y; s.blendMode = BLEND_MODES.ADD; s.visible = true;
    return s;
  }
  spawnSpark(x, y) {
    const s = this._acquire('fx', this.tex.spark);
    s.x = x; s.y = y; s.alpha = 1; s.scale.set(1);
    s.blendMode = BLEND_MODES.ADD; s.visible = true;
    return s;
  }
  release(sprite, pool) { sprite.visible = false; this._pools[pool].push(sprite); }

  _acquire(pool, texture) {
    const s = this._pools[pool].pop() || new Sprite(texture);
    s.anchor.set(0.5);
    if (!s.parent) (pool === 'bullet' ? this.fxLayer : this.fxLayer).addChild(s);
    return s;
  }

  /* ---- La frame : on avance le temps du shader ---- */
  tick(dtSeconds) {
    this.nebula.uniforms.uTime += dtSeconds;
  }

  resize(w, h) {
    this.app.renderer.resize(w, h);
    this.bgSprite.width = w; this.bgSprite.height = h;
    this.nebula.uniforms.uResolution = [w, h];
  }
}