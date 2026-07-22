// ============================================================
// Nébuleuse Protocol IV
// © 2026 Christian ROLANDO — Tous droits réservés.
// Voir le fichier LICENSE à la racine du dépôt.
// ============================================================
// STUB — remplacé au M4.2 par les vrais overlays.

const ensure = (idOrEl) => {
  if (!idOrEl) return null;
  if (typeof idOrEl !== 'string') return idOrEl;
  let el = document.getElementById(idOrEl);
  if (!el) {
    el = document.createElement('div');
    el.id = idOrEl;
    el.className = 'overlay hidden';
    document.body.appendChild(el);
  }
  return el;
};

export const show = (idOrEl) => {
  const el = ensure(idOrEl);
  if (el) el.classList.remove('hidden');
};

export const hide = (idOrEl) => {
  const el = ensure(idOrEl);
  if (el) el.classList.add('hidden');
};

export const isHidden = (idOrEl) => {
  const el = ensure(idOrEl);
  return el ? el.classList.contains('hidden') : true;
};

// Ensemble des IDs référencés dans logic-source-extract.js (STUB M4.2)
const STUB_IDS = [
  'menuOverlay', 'menu', 'labOverlay', 'shipOverlay', 'pauseOverlay',
  'gameoverOverlay', 'victoryOverlay', 'achOverlay', 'settingsOverlay',
  'crashOverlay', 'bossIntroCard', 'difficultyBtn', 'achList',
  'closeAchBtn', 'closeSettingsBtn', 'exportBtn', 'importBtn',
  'prestigeBtn', 'prestigeSection', 'saveBox', 'stAssist', 'stColorblind',
  'stDiff', 'stQuality', 'stSens', 'stSensLabel', 'stSound', 'trailGrid',
  'vignette', 'hud', 'mutatorBadge', 'bombBtn', 'dashBtn', 'specialBtn'
];

STUB_IDS.forEach(id => ensure(id));
