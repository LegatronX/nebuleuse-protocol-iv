// ============================================================
// Nébuleuse Protocol IV
// © 2026 Christian ROLANDO — Tous droits réservés.
// Voir le fichier LICENSE à la racine du dépôt.
// ============================================================

import { clamp } from '../util/math.js';
import { AudioSys } from '../audio/audio.stub.js';
import { loadMeta, saveMeta, saveBest, formatTime, isShipUnlocked } from '../game/meta.js';
import { SHIPS, TALENTS, DIFF } from '../game/waves.js';
import { startGame, pauseGame, resumeGame, resetGame, toMenu } from '../game/engine.js';
import { doBomb, doSpecial } from '../game/combat.js';

const CB_FILTERS = {
  none: 'none',
  protanopia: 'url(#protanopia-filter)',
  deuteranopia: 'url(#deuteranopia-filter)',
  tritanopia: 'url(#tritanopia-filter)',
};

let domCreated = false;
let currentWorld = null;

export function ensureDOM(world) {
  if (domCreated) return;
  domCreated = true;
  currentWorld = world;

  // Injection des filtres SVG Daltons s'ils n'existent pas
  if (!document.getElementById('cb-svg-filters')) {
    const svgDiv = document.createElement('div');
    svgDiv.id = 'cb-svg-filters';
    svgDiv.style.cssText = 'height:0; width:0; overflow:hidden; position:absolute;';
    svgDiv.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg">
        <filter id="protanopia-filter">
          <feColorMatrix type="matrix" values="0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0"/>
        </filter>
        <filter id="deuteranopia-filter">
          <feColorMatrix type="matrix" values="0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0"/>
        </filter>
        <filter id="tritanopia-filter">
          <feColorMatrix type="matrix" values="0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0"/>
        </filter>
      </svg>
    `;
    document.body.appendChild(svgDiv);
  }

  // Conteneur HUD
  let hud = document.getElementById('hud');
  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'hud';
    hud.innerHTML = `
      <div class="top">
        <div class="panel score-panel">
          <div class="label">Score</div>
          <div id="score" class="big">0</div>
          <div id="high" class="small">Record 0</div>
        </div>

        <div class="panel wave-panel">
          <div class="label">Vague</div>
          <div id="wave" class="big">1</div>
          <div id="lives" class="small lives">♥</div>
          <div id="combo" class="small combo"></div>
          <div id="grazeDisplay">FRÔLEMENTS 0</div>
        </div>

        <button id="pauseBtn" class="icon-btn" aria-label="Pause">⏸</button>
      </div>

      <div id="bossHud">
        <div id="bossLabel">BOSS</div>
        <div id="bossBarWrap"><div id="bossBar"></div></div>
      </div>

      <div class="bottom">
        <div class="panel status-panel">
          <div class="status-head">
            <span id="weapon">Arme 1</span>
            <span id="bombs" class="bombs">💣 3</span>
            <span id="multiplier">x1.0</span>
          </div>
          <div class="bars-compact">
            <div class="bar-row-compact">
              <span class="bar-lbl">COQUE</span>
              <div class="bar"><div id="hullFill" class="fill hull"></div></div>
            </div>
            <div class="bar-row-compact">
              <span class="bar-lbl">BOUCLIER</span>
              <div class="bar"><div id="shieldFill" class="fill shield"></div></div>
            </div>
            <div class="bar-row-compact">
              <span class="bar-lbl">NOVA</span>
              <div class="bar"><div id="energyFill" class="fill energy"></div></div>
            </div>
          </div>
        </div>

        <div class="action-buttons">
          <button id="specialBtn" aria-label="Nova">NOVA</button>
          <button id="bombBtn" aria-label="Bombe">BOMBE</button>
        </div>
      </div>
    `;
    document.body.appendChild(hud);
  }

  // Écran Menu
  let menu = document.getElementById('menu');
  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'menu';
    menu.className = 'overlay';
    menu.innerHTML = `
      <div class="card">
        <div class="title">NÉBULEUSE<br>PROTOCOL IV</div>
        <div class="subtitle">Progression permanente · Mini-boss · Élites · Boss final</div>
        <div class="high-line">Record : <strong id="menuHigh">0</strong></div>
        <div class="high-line">Nanites : <strong id="menuNanites" class="nano">0⬡</strong></div>
        <div class="instructions">
          Glissez pour piloter · Tir automatique · NOVA : missiles guidés<br>
          Gagnez des nanites à chaque run et améliorez votre prototype au Laboratoire.
        </div>
        <div class="btn-row">
          <button id="modeCampagne" class="btn">Campagne</button>
          <button id="modeSurvie" class="btn secondary">Survie</button>
          <button id="labBtn" class="btn secondary">Laboratoire</button>
          <button id="shipBtn" class="btn secondary">Vaisseaux</button>
          <button id="settingsBtn" class="btn secondary">⚙ Réglages</button>
        </div>
      </div>
    `;
    document.body.appendChild(menu);
  }

  // Écran Laboratoire
  let lab = document.getElementById('labOverlay');
  if (!lab) {
    lab = document.createElement('div');
    lab.id = 'labOverlay';
    lab.className = 'overlay hidden';
    lab.innerHTML = `
      <div class="card">
        <div class="title small-title">Laboratoire</div>
        <div class="high-line">Nanites : <strong id="labNanites" class="nano">0⬡</strong></div>
        <div id="labList" class="grid"></div>
        <div class="btn-row">
          <button id="closeLabBtn" class="btn">Retour</button>
        </div>
      </div>
    `;
    document.body.appendChild(lab);
  }

  // Écran Vaisseaux
  let ship = document.getElementById('shipOverlay');
  if (!ship) {
    ship = document.createElement('div');
    ship.id = 'shipOverlay';
    ship.className = 'overlay hidden';
    ship.innerHTML = `
      <div class="card">
        <div class="title small-title">Vaisseaux</div>
        <div id="shipList" class="grid"></div>
        <div class="btn-row">
          <button id="closeShipBtn" class="btn">Retour</button>
        </div>
      </div>
    `;
    document.body.appendChild(ship);
  }

  // Écran Pause
  let pause = document.getElementById('pauseOverlay');
  if (!pause) {
    pause = document.createElement('div');
    pause.id = 'pauseOverlay';
    pause.className = 'overlay hidden';
    pause.innerHTML = `
      <div class="card">
        <div class="title small-title">Pause</div>
        <div class="btn-row">
          <button id="resumeBtn" class="btn">Reprendre</button>
          <button id="pauseRestartBtn" class="btn secondary">Recommencer</button>
          <button id="pauseMenuBtn" class="btn secondary">Menu</button>
        </div>
      </div>
    `;
    document.body.appendChild(pause);
  }

  // Écran Game Over
  let gameover = document.getElementById('gameoverOverlay');
  if (!gameover) {
    gameover = document.createElement('div');
    gameover.id = 'gameoverOverlay';
    gameover.className = 'overlay hidden';
    gameover.innerHTML = `
      <div class="card">
        <div class="title small-title" id="endTitle">Mission terminée</div>
        <div id="newRecord" class="new-record hidden">Nouveau record !</div>
        <div class="score-line">Score final</div>
        <div id="finalScore" class="final-score">0</div>
        <div id="finalStats" class="final-stats"></div>
        <div id="earnedNanites" class="earned"></div>
        <div class="high-line">Record : <strong id="finalHigh">0</strong></div>
        <div class="btn-row">
          <button id="retryBtn" class="btn">Rejouer</button>
          <button id="shareBtn" class="btn secondary">Partager</button>
          <button id="gameoverMenuBtn" class="btn secondary">Menu</button>
        </div>
      </div>
    `;
    document.body.appendChild(gameover);
  }

  // Écran Victoire
  let victory = document.getElementById('victoryOverlay');
  if (!victory) {
    victory = document.createElement('div');
    victory.id = 'victoryOverlay';
    victory.className = 'overlay hidden';
    victory.innerHTML = `
      <div class="card">
        <div class="title small-title">Nébuleuse Prime vaincue</div>
        <div class="score-line">Score</div>
        <div id="victoryScore" class="final-score">0</div>
        <div id="victoryStats" class="final-stats"></div>
        <div id="victoryEarned" class="earned"></div>
        <div class="btn-row">
          <button id="victoryContinueBtn" class="btn">Continuer l’infini</button>
          <button id="victoryShareBtn" class="btn secondary">Partager</button>
          <button id="victoryMenuBtn" class="btn secondary">Menu</button>
        </div>
      </div>
    `;
    document.body.appendChild(victory);
  }

  // Écran Réglages (patch v4.7)
  let settings = document.getElementById('settingsOverlay');
  if (!settings) {
    settings = document.createElement('div');
    settings.id = 'settingsOverlay';
    settings.className = 'overlay hidden';
    settings.innerHTML = `
      <div class="card">
        <div class="title small-title">Réglages</div>

        <div class="settings-row">
          <label>Son<span class="settings-desc">Effets et musique</span></label>
          <div class="settings-control"><button id="stSound" class="toggle-switch"></button></div>
        </div>

        <div class="settings-row">
          <label>Difficulté<span class="settings-desc">Normale ou Cauchemar</span></label>
          <div class="settings-control"><button id="stDiff" class="toggle-switch"></button></div>
        </div>

        <div class="settings-row">
          <label>Qualité graphique<span class="settings-desc">Auto détecte votre appareil</span></label>
          <div class="settings-control">
            <select id="stQuality">
              <option value="auto">Auto</option>
              <option value="high">Élevée</option>
              <option value="low">Réduite</option>
            </select>
          </div>
        </div>

        <div class="settings-row">
          <label>Sensibilité tactile<span class="settings-desc" id="stSensLabel">1.35</span></label>
          <div class="settings-control"><input type="range" id="stSens" min="0.7" max="2.2" step="0.05"></div>
        </div>

        <div class="settings-row">
          <label>Assistance auto-bombe<span class="settings-desc">Bombe automatique à coque critique</span></label>
          <div class="settings-control"><button id="stAssist" class="toggle-switch"></button></div>
        </div>

        <div class="settings-row">
          <label>Palette daltonien<span class="settings-desc">Ajuste les couleurs à l'écran</span></label>
          <div class="settings-control">
            <select id="stColorblind">
              <option value="none">Désactivée</option>
              <option value="protanopia">Protanopie</option>
              <option value="deuteranopia">Deutéranopie</option>
              <option value="tritanopia">Tritanopie</option>
            </select>
          </div>
        </div>

        <div class="btn-row">
          <button id="closeSettingsBtn" class="btn">Retour</button>
        </div>
      </div>
    `;
    document.body.appendChild(settings);
  }

  attachListeners(world);
}

export function show(idOrEl) {
  const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
  if (el) el.classList.remove('hidden');
}

export function hide(idOrEl) {
  const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
  if (el) el.classList.add('hidden');
}

export function isHidden(idOrEl) {
  const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
  return el ? el.classList.contains('hidden') : true;
}

export function updateHUD(world) {
  if (!domCreated) return;
  const p = world.player;

  // Score & High
  const scoreEl = document.getElementById('score');
  const highEl = document.getElementById('high');
  if (scoreEl) scoreEl.textContent = world.score.toLocaleString('fr-FR');
  if (highEl) highEl.textContent = `Record ${world.best.toLocaleString('fr-FR')}`;

  // Vague & Vies & Combo
  const waveEl = document.getElementById('wave');
  const livesEl = document.getElementById('lives');
  const comboEl = document.getElementById('combo');
  const grazeDisplay = document.getElementById('grazeDisplay');

  if (waveEl) waveEl.textContent = world.wave;
  if (livesEl && p) livesEl.textContent = '♥'.repeat(Math.max(0, p.lives));
  if (comboEl) comboEl.textContent = world.combo > 1 ? `Combo x${world.combo}` : '';
  if (grazeDisplay) grazeDisplay.textContent = `FRÔLEMENTS ${world.grazes}`;

  // Boss HUD
  const bossHud = document.getElementById('bossHud');
  const bossLabel = document.getElementById('bossLabel');
  const bossBar = document.getElementById('bossBar');
  if (world.boss) {
    if (bossHud) bossHud.style.opacity = '1';
    if (bossLabel) bossLabel.textContent = world.boss.name;
    if (bossBar) bossBar.style.width = `${Math.max(0, (world.boss.hp / world.boss.maxHp) * 100)}%`;
  } else if (bossHud) {
    bossHud.style.opacity = '0';
  }

  // Jauges Coque / Bouclier / Énergie
  const hullFill = document.getElementById('hullFill');
  const shieldFill = document.getElementById('shieldFill');
  const energyFill = document.getElementById('energyFill');

  if (p) {
    if (hullFill) hullFill.style.width = `${clamp((p.hull / p.maxHull) * 100, 0, 100)}%`;
    if (shieldFill) shieldFill.style.width = `${clamp((p.shield / p.maxShield) * 100, 0, 100)}%`;
    if (energyFill) energyFill.style.width = `${clamp((p.energy / p.maxEnergy) * 100, 0, 100)}%`;
  }

  // Statut Bas
  const weaponEl = document.getElementById('weapon');
  const bombsEl = document.getElementById('bombs');
  const multiplierEl = document.getElementById('multiplier');

  if (weaponEl && p) weaponEl.textContent = `Arme ${p.weapon}`;
  if (bombsEl && p) bombsEl.textContent = `💣 ${p.bombs}`;
  if (multiplierEl) multiplierEl.textContent = `x${world.multiplier.toFixed(1)}`;
}

export function refreshMenu(world) {
  const menuHigh = document.getElementById('menuHigh');
  const menuNanites = document.getElementById('menuNanites');
  const meta = world.meta;

  if (menuHigh) menuHigh.textContent = world.best.toLocaleString('fr-FR');
  if (menuNanites) menuNanites.textContent = `${meta.nanites}⬡`;
}

export function renderLab(world) {
  const labNanites = document.getElementById('labNanites');
  const labList = document.getElementById('labList');
  const meta = world.meta;

  if (labNanites) labNanites.textContent = `${meta.nanites}⬡`;
  if (!labList) return;

  labList.innerHTML = '';
  TALENTS.forEach((t) => {
    const curLevel = (meta.talents && meta.talents[t.key]) || 0;
    const isMax = curLevel >= t.max;
    const cost = t.cost(curLevel);

    const item = document.createElement('div');
    item.className = 'grid-item';
    item.innerHTML = `
      <div class="item-info">
        <div class="item-name">${t.name} (Rang ${curLevel}/${t.max})</div>
        <div class="item-desc">${t.desc}</div>
      </div>
      <button class="btn ${isMax ? 'secondary' : ''}" ${isMax ? 'disabled' : ''}>
        ${isMax ? 'MAX' : `${cost}⬡`}
      </button>
    `;

    const btn = item.querySelector('button');
    if (!isMax) {
      btn.addEventListener('click', () => {
        if (meta.nanites >= cost) {
          meta.nanites -= cost;
          meta.talents[t.key] = curLevel + 1;
          saveMeta(meta);
          renderLab(world);
          refreshMenu(world);
          AudioSys.power();
        }
      });
    }
    labList.appendChild(item);
  });
}

export function renderShips(world) {
  const shipList = document.getElementById('shipList');
  const meta = world.meta;
  if (!shipList) return;

  shipList.innerHTML = '';
  SHIPS.forEach((s, idx) => {
    const unlocked = isShipUnlocked(idx, world.best);
    const selected = (meta.ship || 0) === idx;

    const item = document.createElement('div');
    item.className = 'grid-item';
    item.innerHTML = `
      <div class="item-info">
        <div class="item-name">${s.name} ${selected ? '✓' : ''}</div>
        <div class="item-desc">${s.desc}</div>
      </div>
      <button class="btn ${!unlocked ? 'secondary' : selected ? 'secondary' : ''}" ${!unlocked ? 'disabled' : ''}>
        ${!unlocked ? 'Verrouillé' : selected ? 'Sélectionné' : 'Choisir'}
      </button>
    `;

    const btn = item.querySelector('button');
    if (unlocked && !selected) {
      btn.addEventListener('click', () => {
        meta.ship = idx;
        saveMeta(meta);
        renderShips(world);
        AudioSys.ui();
      });
    }
    shipList.appendChild(item);
  });
}

export function renderSettings(world) {
  const settingsOverlay = document.getElementById('settingsOverlay');
  if (!settingsOverlay) return;

  const stSound = settingsOverlay.querySelector('#stSound');
  const stDiff = settingsOverlay.querySelector('#stDiff');
  const stQuality = settingsOverlay.querySelector('#stQuality');
  const stSens = settingsOverlay.querySelector('#stSens');
  const stSensLabel = settingsOverlay.querySelector('#stSensLabel');
  const stAssist = settingsOverlay.querySelector('#stAssist');
  const stColorblind = settingsOverlay.querySelector('#stColorblind');

  const meta = world.meta;

  if (stSound) stSound.classList.toggle('on', !AudioSys.muted);
  if (stDiff) stDiff.classList.toggle('on', world.difficulty === 'cauchemar');
  if (stQuality) stQuality.value = meta.qualityOverride || 'auto';
  if (stSens) stSens.value = String(meta.sensitivity || 1.35);
  if (stSensLabel) stSensLabel.textContent = (meta.sensitivity || 1.35).toFixed(2);
  if (stAssist) stAssist.classList.toggle('on', !!meta.assist);
  if (stColorblind) stColorblind.value = meta.colorblind || 'none';
}

function attachListeners(world) {
  // Menu
  document.getElementById('modeCampagne')?.addEventListener('click', () => {
    hide('menu');
    startGame('campagne');
  });

  document.getElementById('modeSurvie')?.addEventListener('click', () => {
    hide('menu');
    startGame('survie');
  });

  document.getElementById('labBtn')?.addEventListener('click', () => {
    renderLab(world);
    hide('menu');
    show('labOverlay');
  });

  document.getElementById('shipBtn')?.addEventListener('click', () => {
    renderShips(world);
    hide('menu');
    show('shipOverlay');
  });

  document.getElementById('closeLabBtn')?.addEventListener('click', () => {
    hide('labOverlay');
    show('menu');
  });

  document.getElementById('closeShipBtn')?.addEventListener('click', () => {
    hide('shipOverlay');
    show('menu');
  });

  document.getElementById('settingsBtn')?.addEventListener('click', () => {
    renderSettings(world);
    hide('menu');
    show('settingsOverlay');
  });

  // Pause
  document.getElementById('pauseBtn')?.addEventListener('click', () => {
    pauseGame();
  });

  document.getElementById('resumeBtn')?.addEventListener('click', () => {
    resumeGame();
  });

  document.getElementById('pauseRestartBtn')?.addEventListener('click', () => {
    hide('pauseOverlay');
    resetGame();
    show('menu'); // ou startGame
    startGame(world.mode);
  });

  document.getElementById('pauseMenuBtn')?.addEventListener('click', () => {
    toMenu();
  });

  // GameOver & Victory
  document.getElementById('retryBtn')?.addEventListener('click', () => {
    hide('gameoverOverlay');
    startGame(world.mode);
  });

  document.getElementById('gameoverMenuBtn')?.addEventListener('click', () => {
    toMenu();
  });

  document.getElementById('victoryContinueBtn')?.addEventListener('click', () => {
    hide('victoryOverlay');
    world.state = 'playing';
  });

  document.getElementById('victoryMenuBtn')?.addEventListener('click', () => {
    toMenu();
  });

  // Buttons Bomb & Special dans le HUD
  document.getElementById('bombBtn')?.addEventListener('click', () => {
    doBomb();
  });

  document.getElementById('specialBtn')?.addEventListener('click', () => {
    doSpecial();
  });

  // Settings listeners
  const settingsOverlay = document.getElementById('settingsOverlay');
  if (settingsOverlay) {
    const stSound = settingsOverlay.querySelector('#stSound');
    const stDiff = settingsOverlay.querySelector('#stDiff');
    const stQuality = settingsOverlay.querySelector('#stQuality');
    const stSens = settingsOverlay.querySelector('#stSens');
    const stSensLabel = settingsOverlay.querySelector('#stSensLabel');
    const stAssist = settingsOverlay.querySelector('#stAssist');
    const stColorblind = settingsOverlay.querySelector('#stColorblind');
    const meta = world.meta;

    stSound?.addEventListener('click', () => {
      AudioSys.init();
      AudioSys.setMuted(!AudioSys.muted);
      renderSettings(world);
      AudioSys.ui();
    });

    stDiff?.addEventListener('click', () => {
      world.difficulty = world.difficulty === 'normal' ? 'cauchemar' : 'normal';
      meta.diff = world.difficulty;
      saveMeta(meta);
      renderSettings(world);
      AudioSys.ui();
    });

    stQuality?.addEventListener('change', () => {
      meta.qualityOverride = stQuality.value === 'auto' ? null : stQuality.value;
      saveMeta(meta);
      AudioSys.ui();
    });

    stSens?.addEventListener('input', () => {
      const v = parseFloat(stSens.value);
      meta.sensitivity = v;
      if (stSensLabel) stSensLabel.textContent = v.toFixed(2);
    });

    stSens?.addEventListener('change', () => saveMeta(meta));

    stAssist?.addEventListener('click', () => {
      meta.assist = !meta.assist;
      saveMeta(meta);
      renderSettings(world);
      AudioSys.ui();
    });

    stColorblind?.addEventListener('change', () => {
      meta.colorblind = stColorblind.value;
      const host = document.getElementById('game-host') || document.body;
      host.style.filter = CB_FILTERS[meta.colorblind] || 'none';
      saveMeta(meta);
      AudioSys.ui();
    });

    settingsOverlay.querySelector('#closeSettingsBtn')?.addEventListener('click', () => {
      hide('settingsOverlay');
      show('menu');
      AudioSys.ui();
    });
  }

  refreshMenu(world);
}
