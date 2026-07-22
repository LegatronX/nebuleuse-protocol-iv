// ============================================================
// Nébuleuse Protocol IV
// © 2026 Christian ROLANDO — Tous droits réservés.
// Voir le fichier LICENSE à la racine du dépôt.
// ============================================================

export function loadMeta() {
  const defaults = {
    nanites: 0,
    ship: 0,
    diff: 'normal',
    talents: {
      armor: 0,
      regen: 0,
      weapon: 0,
      nova: 0,
      bombs: 0,
      credit: 0,
      life: 0,
    },
  };

  try {
    const raw = JSON.parse(localStorage.getItem('nebula4_meta') || '{}');
    const talents = Object.assign({}, defaults.talents, raw.talents || {});
    return Object.assign({}, defaults, raw, { talents });
  } catch (e) {
    return defaults;
  }
}

export function saveMeta(meta) {
  try {
    localStorage.setItem('nebula4_meta', JSON.stringify(meta));
  } catch (e) {}
}

export function loadBest() {
  try {
    return parseInt(localStorage.getItem('nebula4_best') || '0', 10) || 0;
  } catch (e) {
    return 0;
  }
}

export function saveBest(v) {
  try {
    localStorage.setItem('nebula4_best', String(v));
  } catch (e) {}
}

export function loadMuted() {
  try {
    return localStorage.getItem('nebula4_mute') === '1';
  } catch (e) {
    return false;
  }
}

export function saveMuted(m) {
  try {
    localStorage.setItem('nebula4_mute', m ? '1' : '0');
  } catch (e) {}
}

export function formatTime(t) {
  const s = Math.floor(t || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function isShipUnlocked(index, bestScore) {
  const SHIP_UNLOCK_SCORE = [0, 45000, 110000];
  return (bestScore || 0) >= (SHIP_UNLOCK_SCORE[index] || 0);
}

export function computeDailyMutatorId() {
  const day = Math.floor(Date.now() / 86400000);
  let hash = day;
  hash = (hash ^ (hash >> 16)) * 0x45d9f3b;
  hash = (hash ^ (hash >> 16)) * 0x45d9f3b;
  hash = hash ^ (hash >> 16);
  const MUTATOR_IDS = ['speed', 'glass', 'nanite_rain', 'boss_rush', 'bullet_hell', 'pacifist_challenge'];
  return MUTATOR_IDS[Math.abs(hash) % MUTATOR_IDS.length];
}
