/**
 * IRenderer — le contrat de rendu de Nébuleuse Protocol IV.
 *
 * Toute la logique de jeu ne connaît QUE ces verbes. Deux implémentations
 * l'honorent : Canvas2DRenderer (fidèle à l'existant, fallback) et
 * PixiRenderer (WebGL, cible). On bascule de l'une à l'autre d'un interrupteur.
 *
 * NOTE : les structures de données en paramètre (PlayerState, EnemyState, …)
 * sont des ESQUISSES. Leurs champs exacts seront arrêtés à la lecture du
 * corps des fonctions draw* (docs/render-source-extract.js).
 */

/**
 * @typedef {Object} PlayerState   — CHAMPS À CONFIRMER (x, y, angle, thrust, hull, …)
 * @typedef {Object} EnemyState    — CHAMPS À CONFIRMER (x, y, type, hull, …)
 * @typedef {Object} BossState     — CHAMPS À CONFIRMER
 * @typedef {Object} BulletState   — CHAMPS À CONFIRMER (x, y, vx, vy, fromPlayer, …)
 * @typedef {Object} BeamState     — CHAMPS À CONFIRMER
 * @typedef {Object} PowerupState  — CHAMPS À CONFIRMER
 * @typedef {Object} ParticleState — CHAMPS À CONFIRMER
 * @typedef {Object} ShockwaveState— CHAMPS À CONFIRMER
 * @typedef {Object} FloatingText  — CHAMPS À CONFIRMER
 */

export class IRenderer {
  /** Monte le rendu dans un conteneur DOM. @param {HTMLElement} host */
  mount(host) { this._abstract('mount'); }

  /** Redimensionne le rendu. @param {number} w @param {number} h */
  resize(w, h) { this._abstract('resize'); }

  /** Efface la frame courante. */
  clear() { this._abstract('clear'); }

  /** Fond : nébuleuse + étoiles en parallaxe. @param {Object} bgState */
  drawBackground(bgState) { this._abstract('drawBackground'); }

  /** @param {PlayerState} p */
  drawPlayer(p) { this._abstract('drawPlayer'); }
  /** @param {EnemyState} e */
  drawEnemy(e) { this._abstract('drawEnemy'); }
  /** @param {BossState} b */
  drawBoss(b) { this._abstract('drawBoss'); }
  /** @param {BulletState} b */
  drawBullet(b) { this._abstract('drawBullet'); }
  /** @param {BeamState} beam */
  drawBeam(beam) { this._abstract('drawBeam'); }
  /** @param {PowerupState} p */
  drawPowerup(p) { this._abstract('drawPowerup'); }
  /** @param {ParticleState} p */
  drawParticle(p) { this._abstract('drawParticle'); }
  /** @param {ShockwaveState} s */
  drawShockwave(s) { this._abstract('drawShockwave'); }
  /** @param {FloatingText} t */
  drawFloatingText(t) { this._abstract('drawFloatingText'); }
  /** Bannière de vague / d'alerte boss. */
  drawBanner(bannerState) { this._abstract('drawBanner'); }

  /** Secousse d'écran. @param {number} intensity */
  setShake(intensity) { this._abstract('setShake'); }

  /** Renvoie la frame composée. */
  present() { this._abstract('present'); }

  /** @private */
  _abstract(name) {
    throw new Error(`IRenderer.${name}() n'est pas implémenté — ` +
                    `utilisez Canvas2DRenderer ou PixiRenderer.`);
  }
}