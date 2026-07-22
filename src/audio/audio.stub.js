// ============================================================
// Nébuleuse Protocol IV
// © 2026 Christian ROLANDO — Tous droits réservés.
// Voir le fichier LICENSE à la racine du dépôt.
// ============================================================
// STUB — remplacé au M4.5 par le vrai AudioSys du monolithe.

const noop = () => {};

export const AudioSys = new Proxy(
  {
    muted: true,
    init: noop,
    setMuted: noop,
    ui: noop,
    shoot: noop,
    hit: noop,
    explosion: noop,
    power: noop,
    graze: noop,
    bomb: noop,
    special: noop,
    enemyShoot: noop,
    startMusic: noop,
    stopMusic: noop,
    musicStep: noop,
    stemBattle: noop,
    stemBoss: noop,
    playNote: noop,
    duckingFilter: null,
    ctx: null,
    noise: noop,
    resume: noop,
  },
  {
    get: (target, prop) => (prop in target ? target[prop] : noop),
  }
);
