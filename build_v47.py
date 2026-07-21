#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Générateur Nébuleuse Protocol IV v4.7 — Production & distribution (Phase 4)

Applique par-dessus nebuleuse-v4.6.html :
  - manifest PWA + icônes (icons/) pour "Ajouter à l'écran d'accueil"
  - menu Réglages unifié (son, difficulté, qualité graphique, sensibilité
    de contrôle, assistance auto-bombe, palette daltonien)
  - palette daltonien via filtre CSS sur le canvas (protanopie,
    deutéranopie, tritanopie)
  - assistance auto-bombe (déclenche une bombe automatiquement à coque
    critique, optionnelle)

Nécessite que le dossier icons/ et manifest.json existent à côté du
fichier de sortie (générés séparément par le script d'icônes).

Utilisation :
    python3 build_v47.py nebuleuse-v4.6.html

Produit :
    nebuleuse-v4.7.html
"""

from pathlib import Path
import sys


def replace_once(text, old, new, label):
    count = text.count(old)

    if count == 0:
        raise RuntimeError(
            f"\nModification impossible : {label}\n"
            "Le bloc recherché n'a pas été trouvé.\n"
            "Vérifie que le fichier source correspond bien au code attendu."
        )

    if count > 1:
        raise RuntimeError(
            f"\nModification ambiguë : {label}\n"
            f"Le bloc recherché apparaît {count} fois."
        )

    return text.replace(old, new, 1)


PATCH_JS = r"""
      // ============================================================
      // PATCH NÉBULEUSE PROTOCOL IV.7
      // Menu Réglages unifié · Accessibilité (daltonien, sensibilité,
      // assistance) · Manifest PWA (liens déjà posés dans le <head>)
      // ============================================================
      (() => {
        // --- 1. STYLE ---
        const plusStyle = document.createElement('style');
        plusStyle.textContent = `
          .settings-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 12px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            text-align: left;
          }

          .settings-row:last-of-type {
            border-bottom: none;
          }

          .settings-row label {
            font-size: 14px;
            font-weight: 700;
            color: #eaf6ff;
          }

          .settings-row .settings-desc {
            display: block;
            margin-top: 2px;
            font-size: 12px;
            font-weight: 400;
            color: rgba(234, 246, 255, 0.6);
          }

          .settings-control {
            pointer-events: auto;
            flex-shrink: 0;
          }

          .settings-control select {
            pointer-events: auto;
            background: rgba(255, 255, 255, 0.08);
            color: #eaf6ff;
            border: 1px solid rgba(255, 255, 255, 0.16);
            border-radius: 10px;
            padding: 8px 10px;
            font-size: 13px;
            font-weight: 700;
          }

          .settings-control input[type="range"] {
            pointer-events: auto;
            width: 130px;
          }

          .toggle-switch {
            pointer-events: auto;
            width: 46px;
            height: 26px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.14);
            border: none;
            position: relative;
            cursor: pointer;
          }

          .toggle-switch::after {
            content: '';
            position: absolute;
            top: 3px;
            left: 3px;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #eaf6ff;
            transition: transform 0.15s ease;
          }

          .toggle-switch.on {
            background: linear-gradient(135deg, #67e8f9, #818cf8);
          }

          .toggle-switch.on::after {
            transform: translateX(20px);
          }
        `;
        document.head.appendChild(plusStyle);

        // --- 2. PALETTE DALTONIEN (filtre canvas) ---
        const CB_FILTERS = {
          none: 'none',
          protanopia: 'saturate(1.4) hue-rotate(-18deg)',
          deuteranopia: 'saturate(1.5) hue-rotate(24deg)',
          tritanopia: 'saturate(1.3) hue-rotate(150deg)'
        };

        if (!meta.colorblind) meta.colorblind = 'none';
        canvas.style.filter = CB_FILTERS[meta.colorblind] || 'none';

        // --- 3. SENSIBILITÉ (variable déjà branchée dans le contrôle tactile) ---
        if (!meta.sensitivity) meta.sensitivity = 1.35;
        controlSensitivity = meta.sensitivity;

        // --- 4. QUALITÉ GRAPHIQUE MANUELLE ---
        if (meta.qualityOverride === undefined) meta.qualityOverride = null;

        function applyQualityOverride() {
          if (meta.qualityOverride === null) {
            document.body.classList.toggle('low-quality', !!lowQuality);
          } else {
            document.body.classList.toggle('low-quality', meta.qualityOverride === 'low');
          }
        }
        applyQualityOverride();

        // --- 5. ASSISTANCE AUTO-BOMBE ---
        if (!meta.assist) meta.assist = false;

        let autoBombCooldown = 0;
        const baseUpdateAssist = update;
        update = function assistUpdate(dt) {
          baseUpdateAssist(dt);

          if (autoBombCooldown > 0) autoBombCooldown -= dt;

          if (
            meta.assist &&
            state === 'playing' &&
            player &&
            player.alive &&
            player.bombs > 0 &&
            autoBombCooldown <= 0 &&
            player.hull / player.maxHull < 0.16
          ) {
            autoBombCooldown = 4;
            doBomb();
          }
        };

        // --- 6. ÉCRAN RÉGLAGES ---
        const settingsOverlay = document.createElement('div');
        settingsOverlay.id = 'settingsOverlay';
        settingsOverlay.className = 'overlay hidden';
        settingsOverlay.innerHTML = `
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
        document.body.appendChild(settingsOverlay);

        const stSound = settingsOverlay.querySelector('#stSound');
        const stDiff = settingsOverlay.querySelector('#stDiff');
        const stQuality = settingsOverlay.querySelector('#stQuality');
        const stSens = settingsOverlay.querySelector('#stSens');
        const stSensLabel = settingsOverlay.querySelector('#stSensLabel');
        const stAssist = settingsOverlay.querySelector('#stAssist');
        const stColorblind = settingsOverlay.querySelector('#stColorblind');

        function renderSettings() {
          stSound.classList.toggle('on', !AudioSys.muted);
          stDiff.classList.toggle('on', difficulty === 'cauchemar');
          stQuality.value = meta.qualityOverride || 'auto';
          stSens.value = String(meta.sensitivity || 1.35);
          stSensLabel.textContent = (meta.sensitivity || 1.35).toFixed(2);
          stAssist.classList.toggle('on', !!meta.assist);
          stColorblind.value = meta.colorblind || 'none';
        }

        stSound.addEventListener('click', () => {
          AudioSys.init();
          AudioSys.setMuted(!AudioSys.muted);
          refreshSoundButtons();
          renderSettings();
          AudioSys.ui();
        });

        stDiff.addEventListener('click', () => {
          difficulty = difficulty === 'normal' ? 'cauchemar' : 'normal';
          meta.diff = difficulty;
          saveMeta();
          refreshDifficulty();
          renderSettings();
          AudioSys.ui();
        });

        stQuality.addEventListener('change', () => {
          meta.qualityOverride = stQuality.value === 'auto' ? null : stQuality.value;
          saveMeta();
          applyQualityOverride();
          AudioSys.ui();
        });

        stSens.addEventListener('input', () => {
          const v = parseFloat(stSens.value);
          controlSensitivity = v;
          meta.sensitivity = v;
          stSensLabel.textContent = v.toFixed(2);
        });

        stSens.addEventListener('change', () => saveMeta());

        stAssist.addEventListener('click', () => {
          meta.assist = !meta.assist;
          saveMeta();
          renderSettings();
          AudioSys.ui();
        });

        stColorblind.addEventListener('change', () => {
          meta.colorblind = stColorblind.value;
          canvas.style.filter = CB_FILTERS[meta.colorblind] || 'none';
          saveMeta();
          AudioSys.ui();
        });

        settingsOverlay.querySelector('#closeSettingsBtn').addEventListener('click', () => {
          hide(settingsOverlay);
          show(menuOverlay);
          AudioSys.ui();
        });

        window.addEventListener('keydown', (e) => {
          if (e.code === 'Escape' && !isHidden(settingsOverlay)) {
            hide(settingsOverlay);
            show(menuOverlay);
          }
        });

        // --- 7. CONSOLIDATION DU MENU ---
        const oldDifficultyBtn = document.getElementById('difficultyBtn');
        const oldMenuSound = document.querySelector('#menu .sound-toggle');
        if (oldDifficultyBtn) oldDifficultyBtn.style.display = 'none';
        if (oldMenuSound) oldMenuSound.style.display = 'none';

        const settingsBtn = document.createElement('button');
        settingsBtn.id = 'settingsBtn';
        settingsBtn.className = 'btn secondary';
        settingsBtn.textContent = '⚙ Réglages';
        const menuBtnRow = document.querySelector('#menu .btn-row');
        if (menuBtnRow) menuBtnRow.appendChild(settingsBtn);

        settingsBtn.addEventListener('click', () => {
          renderSettings();
          hide(menuOverlay);
          show(settingsOverlay);
          AudioSys.ui();
        });
      })();

"""


def main():
    if len(sys.argv) < 2:
        print("Utilisation : python3 build_v47.py nebuleuse-v4.6.html")
        raise SystemExit(1)

    source_path = Path(sys.argv[1])

    if not source_path.exists():
        print(f"Fichier introuvable : {source_path}")
        raise SystemExit(1)

    html = source_path.read_text(encoding="utf-8")

    # 1. Manifest + icônes dans le <head>
    head_anchor = '  <meta name="theme-color" content="#020409">'
    head_insert = (
        head_anchor
        + "\n"
        + '  <link rel="manifest" href="manifest.json">\n'
        + '  <link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n'
        + '  <link rel="icon" type="image/png" href="icons/favicon-32.png">'
    )
    html = replace_once(html, head_anchor, head_insert, "ajout des liens manifest/icônes")

    # 2. Variable de sensibilité de contrôle
    diff_anchor = "      let difficulty = meta.diff || 'normal';"
    html = replace_once(
        html,
        diff_anchor,
        diff_anchor + "\n      let controlSensitivity = meta.sensitivity || 1.35;",
        "ajout de la variable de sensibilité",
    )

    # 3. Branchement de la sensibilité dans le contrôle tactile
    sens_anchor = """        player.x += dx * 1.35;
        player.y += dy * 1.35;"""
    sens_new = """        player.x += dx * controlSensitivity;
        player.y += dy * controlSensitivity;"""
    html = replace_once(html, sens_anchor, sens_new, "branchement de la sensibilité tactile")

    # 4. Patch principal
    end_anchor = "      let last = performance.now();"
    html = replace_once(html, end_anchor, PATCH_JS + "\n" + end_anchor, "insertion du patch v4.7")

    html = html.replace(
        "<title>Nébuleuse Protocol IV — v4.6</title>",
        "<title>Nébuleuse Protocol IV — v4.7</title>",
        1,
    )

    output_path = source_path.with_name("nebuleuse-v4.7.html")
    output_path.write_text(html, encoding="utf-8")

    print()
    print("✅ Nébuleuse Protocol IV v4.7 généré avec succès.")
    print(f"📄 Fichier : {output_path.resolve()}")
    print()


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(error)
        raise SystemExit(1)
