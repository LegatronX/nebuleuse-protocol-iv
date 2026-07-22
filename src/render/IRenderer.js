import { gfxFlags } from './gfx.js';

/**
 * IRenderer — le contrat de rendu de Nébuleuse Protocol IV.
 *
 * La logique de jeu ne connaît QUE ce contrat. Elle transmet l'état du monde
 * (bindWorld) puis appelle renderFrame() à chaque image. Le z-order est figé
 * ici, dans renderFrame(), et hérité par les deux implémentations :
 *   - Canvas2DRenderer : référence fidèle (fallback, niveaux 1–4) ;
 *   - PixiRenderer     : WebGL (cible).
 * On bascule de l'une à l'autre d'un interrupteur, à monde identique.
 */

/**
 * @typedef {Object} World  — l'état du jeu, lu par le rendu.
 * @property {number} W @property {number} H
 * @property {number} globalTime @property {string} state
 * @property {number} shake @property {number} hitFlash @property {number} slowTime
 * @property {string} waveBanner @property {number} waveBannerTime
 * @property {Array}  stars      @property {Object|null} player
 * @property {Array}  enemies    @property {Array} pBullets
 * @property {Array}  eBullets   @property {Array} beams
 * @property {Array}  powerups   @property {Array} particles
 * @property {Array}  shockwaves @property {Array} texts
 * @property {Array}  planets
 */

export class IRenderer {
  constructor() {
    /** @type {World|null} */
    this.world = null;
    this.gfx = gfxFlags(1);
  }

  /** Définit le profil de fidélité partagé. */
  setGfx(gfxObject) { this.gfx = gfxObject; }

  /** Monte le rendu dans un conteneur DOM. @param {HTMLElement} host */
  mount(host) { this._abstract('mount'); }

  /** Redimensionne le rendu. @param {number} w @param {number} h */
  resize(w, h) { this._abstract('resize'); }

  /** Lie l'état du jeu au renderer (appelé une fois, avant resize). @param {World} world */
  bindWorld(world) { this.world = world; }

  /**
   * Orchestrateur — LE z-order du jeu, défini une fois pour toutes.
   * Hérité tel quel par Canvas2DRenderer et PixiRenderer.
   */
  renderFrame() {
    const w = this.world;
    this.drawBackground();
    this.beginCamera();
    this.drawNebulae();
    this.drawPlanets();
    this.drawStars();
    this.drawPowerups();
    this.drawEnemies();
    this.drawBeams();
    this.drawPlayer();
    this.drawBullets();
    this.drawParticles();
    this.drawShockwaves();
    this.drawTexts();
    this.endCamera();
    this.flashOverlay();
    this.slowOverlay();
    if (w.waveBannerTime > 0 && w.state === 'playing') this.drawBanner();
    this.present();
  }

  /* ---- Verbes de calque (à implémenter par chaque renderer) ---- */
  drawBackground() { this._abstract('drawBackground'); }
  regenerateBackground() { this._abstract('regenerateBackground'); }
  beginCamera() { this._abstract('beginCamera'); }
  endCamera() { this._abstract('endCamera'); }
  drawNebulae() { this._abstract('drawNebulae'); }
  drawPlanets() { this._abstract('drawPlanets'); }
  drawStars() { this._abstract('drawStars'); }
  drawPowerups() { this._abstract('drawPowerups'); }
  drawEnemies() { this._abstract('drawEnemies'); }
  drawBeams() { this._abstract('drawBeams'); }
  drawPlayer() { this._abstract('drawPlayer'); }
  drawBullets() { this._abstract('drawBullets'); }
  drawParticles() { this._abstract('drawParticles'); }
  drawShockwaves() { this._abstract('drawShockwaves'); }
  drawTexts() { this._abstract('drawTexts'); }
  drawBanner() { this._abstract('drawBanner'); }
  flashOverlay() { this._abstract('flashOverlay'); }
  slowOverlay() { this._abstract('slowOverlay'); }
  present() { this._abstract('present'); }

  /** @private */
  _abstract(name) {
    throw new Error(`IRenderer.${name}() n'est pas implémenté — ` +
      `utilisez Canvas2DRenderer ou PixiRenderer.`);
  }
}