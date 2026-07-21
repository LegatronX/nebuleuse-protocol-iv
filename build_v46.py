#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Générateur Nébuleuse Protocol IV v4.6 — Progression & rétention (Phase 3)

Applique par-dessus nebuleuse-v4.5.html :
  - cosmétiques : traînées de vaisseau à débloquer avec les nanites
  - prestige "Surcharge" : une fois tous les talents maxés, réinitialise
    les talents contre un multiplicateur de score permanent
  - succès (8) avec notification et écran dédié
  - sauvegarde exportable / importable (code texte copiable)

Utilisation :
    python3 build_v46.py nebuleuse-v4.5.html

Produit :
    nebuleuse-v4.6.html
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
      // PATCH NÉBULEUSE PROTOCOL IV.6
      // Cosmétiques (traînées) · Prestige · Succès · Sauvegarde export/import
      // ============================================================
      (() => {
        // --- 1. STYLE ---
        const plusStyle = document.createElement('style');
        plusStyle.textContent = `
          .section-label {
            margin-top: 18px;
            margin-bottom: 8px;
            text-align: left;
            font-size: 11px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.14em;
            color: rgba(234, 246, 255, 0.5);
          }

          .trail-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
            gap: 8px;
            margin-bottom: 6px;
          }

          .trail-swatch {
            pointer-events: auto;
            height: 44px;
            border-radius: 12px;
            border: 2px solid rgba(255, 255, 255, 0.12);
            cursor: pointer;
            display: grid;
            place-items: center;
            font-size: 11px;
            font-weight: 900;
            color: rgba(2, 4, 9, 0.75);
          }

          .trail-swatch.selected {
            border-color: #fff;
            box-shadow: 0 0 14px rgba(255, 255, 255, 0.35);
          }

          .trail-swatch.locked {
            opacity: 0.35;
            color: rgba(234, 246, 255, 0.6);
            pointer-events: auto;
          }

          #prestigeSection {
            margin-top: 4px;
          }

          #prestigeBtn {
            width: 100%;
          }

          #prestigeBtn:disabled {
            opacity: 0.35;
            pointer-events: none;
          }

          .ach-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 14px;
            border-radius: 16px;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.09);
            text-align: left;
          }

          .ach-item.locked {
            opacity: 0.4;
          }

          .ach-icon {
            font-size: 22px;
          }

          #saveBox {
            width: 100%;
            min-height: 70px;
            margin-top: 10px;
            padding: 10px;
            border-radius: 12px;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #eaf6ff;
            font-size: 11px;
            font-family: monospace;
            resize: vertical;
            pointer-events: auto;
          }
        `;
        document.head.appendChild(plusStyle);

        // --- 2. COSMÉTIQUES : TRAÎNÉES ---
        const TRAILS = [
          { id: 'default', name: 'Défaut', color: '#38bdf8', cost: 0 },
          { id: 'gold', name: 'Or', color: '#fbbf24', cost: 120 },
          { id: 'violet', name: 'Violet', color: '#a78bfa', cost: 120 },
          { id: 'emerald', name: 'Émeraude', color: '#34d399', cost: 120 },
          { id: 'rose', name: 'Rose', color: '#fb7185', cost: 180 },
          { id: 'blanc', name: 'Blanc', color: '#f8feff', cost: 220 }
        ];

        if (!meta.unlockedTrails) meta.unlockedTrails = ['default'];
        if (!meta.trail) meta.trail = 'default';

        function currentTrailColor() {
          const t = TRAILS.find((t) => t.id === meta.trail) || TRAILS[0];
          return t.color;
        }

        const trailSection = document.createElement('div');
        trailSection.innerHTML = `
          <div class="section-label">Traînées de vaisseau</div>
          <div class="trail-grid" id="trailGrid"></div>
        `;
        labList.insertAdjacentElement('afterend', trailSection);
        const trailGrid = trailSection.querySelector('#trailGrid');

        function renderTrails() {
          trailGrid.innerHTML = TRAILS.map((t) => {
            const owned = meta.unlockedTrails.includes(t.id);
            const selected = meta.trail === t.id;
            return `
              <div class="trail-swatch ${selected ? 'selected' : ''} ${owned ? '' : 'locked'}"
                   style="background:${t.color}" data-trail="${t.id}" title="${t.name}${owned ? '' : ` · ${t.cost}⬡`}">
                ${owned ? '' : '🔒'}
              </div>
            `;
          }).join('');

          trailGrid.querySelectorAll('.trail-swatch').forEach((el) => {
            el.addEventListener('click', () => {
              const id = el.dataset.trail;
              const def = TRAILS.find((t) => t.id === id);
              if (!def) return;

              if (meta.unlockedTrails.includes(id)) {
                meta.trail = id;
                saveMeta();
                renderTrails();
                AudioSys.ui();
              } else if (meta.nanites >= def.cost) {
                meta.nanites -= def.cost;
                meta.unlockedTrails.push(id);
                meta.trail = id;
                saveMeta();
                renderTrails();
                renderLab();
                AudioSys.power();
                toast(`Traînée débloquée : ${def.name}`, 'nano');
              } else {
                toast('Nanites insuffisants', '');
              }
            });
          });
        }

        // trail particles : couche additive indépendante du trail par défaut
        let trailTick = 0;
        const baseUpdatePlayerTrail = updatePlayer;
        updatePlayer = function trailUpdatePlayer(dt) {
          baseUpdatePlayerTrail(dt);

          if (meta.trail !== 'default' && player && player.alive && state === 'playing') {
            trailTick += dt;
            if (trailTick >= 0.02) {
              trailTick = 0;
              addParticle(
                player.x + rand(-3, 3),
                player.y + 16,
                rand(-10, 10),
                rand(70, 140),
                0.3,
                rand(1.4, 3),
                currentTrailColor()
              );
            }
          }
        };

        // --- 3. PRESTIGE : SURCHARGE ---
        if (!meta.prestige) meta.prestige = 0;

        function talentsMaxed() {
          return TALENTS.every((t) => (meta.talents[t.key] || 0) >= t.max);
        }

        const prestigeSection = document.createElement('div');
        prestigeSection.id = 'prestigeSection';
        prestigeSection.innerHTML = `
          <div class="section-label">Prestige</div>
          <button id="prestigeBtn" class="btn secondary">Surcharge</button>
        `;
        trailSection.insertAdjacentElement('afterend', prestigeSection);
        const prestigeBtn = prestigeSection.querySelector('#prestigeBtn');

        function renderPrestige() {
          const maxed = talentsMaxed();
          prestigeBtn.disabled = !maxed;
          prestigeBtn.textContent = maxed
            ? `Surcharge (niveau ${meta.prestige} → ${meta.prestige + 1}) : réinitialise les talents, +15% de score permanent`
            : `Surcharge — débloqué une fois tous les talents maxés (niveau actuel ${meta.prestige})`;
        }

        prestigeBtn.addEventListener('click', () => {
          if (!talentsMaxed()) return;

          meta.prestige += 1;
          Object.keys(meta.talents).forEach((k) => { meta.talents[k] = 0; });
          saveMeta();

          renderLab();
          renderPrestige();
          refreshMenu();
          AudioSys.power();
          toast(`Surcharge niveau ${meta.prestige} — score +${meta.prestige * 15}% permanent`, 'gold');
        });

        const baseGetScoreMult = getScoreMult;
        getScoreMult = function prestigedScoreMult() {
          return baseGetScoreMult() * (1 + (meta.prestige || 0) * 0.15);
        };

        const baseRenderLab = renderLab;
        renderLab = function extendedRenderLab() {
          baseRenderLab();
          renderTrails();
          renderPrestige();
        };

        // --- 4. SUCCÈS ---
        const ACHIEVEMENTS = [
          { id: 'finisher', icon: '🏆', name: 'Première victoire', desc: 'Vaincre Nébuleuse Prime', check: () => finalDefeated },
          { id: 'combo20', icon: '🔥', name: 'Combo x20', desc: 'Atteindre un combo de 20', check: () => (typeof maxCombo !== 'undefined' && maxCombo >= 20) },
          { id: 'graze15', icon: '✨', name: 'Frôleur aguerri', desc: 'Chaîne de frôlement x15', check: () => (typeof bestGrazeChain !== 'undefined' && bestGrazeChain >= 15) },
          { id: 'wave10', icon: '🌊', name: 'Vague 10 atteinte', desc: 'Survivre jusqu’à la vague 10', check: () => wave >= 10 },
          { id: 'nightmare', icon: '💀', name: 'Cauchemar vaincu', desc: 'Battre le boss final en Cauchemar', check: () => (difficulty === 'cauchemar' && finalDefeated) },
          { id: 'collector', icon: '⬡', name: 'Collectionneur', desc: '1000 nanites gagnés au total', check: () => (meta.totalNanitesEarned || 0) >= 1000 },
          { id: 'novaAce', icon: '💫', name: 'As de la NOVA', desc: 'Utiliser NOVA 20 fois', check: () => (meta.novaUses || 0) >= 20 },
          { id: 'bomber', icon: '☄️', name: 'Artificier', desc: 'Utiliser 50 bombes', check: () => (meta.bombUses || 0) >= 50 }
        ];

        if (!meta.achievements) meta.achievements = [];
        if (!meta.totalNanitesEarned) meta.totalNanitesEarned = 0;
        if (!meta.novaUses) meta.novaUses = 0;
        if (!meta.bombUses) meta.bombUses = 0;

        function checkAchievements() {
          let unlockedNew = false;

          for (const a of ACHIEVEMENTS) {
            if (meta.achievements.includes(a.id)) continue;

            let ok = false;
            try { ok = !!a.check(); } catch (e) { ok = false; }

            if (ok) {
              meta.achievements.push(a.id);
              unlockedNew = true;
              toast(`Succès débloqué : ${a.icon} ${a.name}`, 'gold');
              vibrate([20, 30, 20, 30, 40]);
            }
          }

          if (unlockedNew) saveMeta();
        }

        const baseUpdateHUDAch = updateHUD;
        updateHUD = function achUpdateHUD() {
          baseUpdateHUDAch();
          checkAchievements();
        };

        const baseAwardRunEnd = awardRunEnd;
        awardRunEnd = function trackedAwardRunEnd() {
          const earned = baseAwardRunEnd();
          meta.totalNanitesEarned = (meta.totalNanitesEarned || 0) + earned;
          saveMeta();
          return earned;
        };

        const baseDoSpecialAch = doSpecial;
        doSpecial = function achDoSpecial() {
          const before = player ? player.energy : 0;
          baseDoSpecialAch();
          if (player && before >= 100 && player.energy === 0) {
            meta.novaUses = (meta.novaUses || 0) + 1;
            saveMeta();
          }
        };

        const baseDoBombAch = doBomb;
        doBomb = function achDoBomb() {
          const before = player ? player.bombs : 0;
          baseDoBombAch();
          if (player && player.bombs < before) {
            meta.bombUses = (meta.bombUses || 0) + 1;
            saveMeta();
          }
        };

        // écran Succès
        const achOverlay = document.createElement('div');
        achOverlay.id = 'achOverlay';
        achOverlay.className = 'overlay hidden';
        achOverlay.innerHTML = `
          <div class="card">
            <div class="title small-title">Succès</div>
            <div id="achList" class="grid"></div>
            <div class="btn-row">
              <button id="closeAchBtn" class="btn">Retour</button>
            </div>
          </div>
        `;
        document.body.appendChild(achOverlay);

        function renderAchievements() {
          const list = achOverlay.querySelector('#achList');
          list.innerHTML = ACHIEVEMENTS.map((a) => {
            const unlocked = meta.achievements.includes(a.id);
            return `
              <div class="ach-item ${unlocked ? '' : 'locked'}">
                <div class="ach-icon">${unlocked ? a.icon : '🔒'}</div>
                <div>
                  <strong>${a.name}</strong>
                  <span>${a.desc}</span>
                </div>
              </div>
            `;
          }).join('');
        }

        achOverlay.querySelector('#closeAchBtn').addEventListener('click', () => {
          hide(achOverlay);
          show(menuOverlay);
          AudioSys.ui();
        });

        const achBtn = document.createElement('button');
        achBtn.id = 'achBtn';
        achBtn.className = 'btn secondary';
        achBtn.textContent = 'Succès';
        const menuBtnRow = document.querySelector('#menu .btn-row');
        if (menuBtnRow) menuBtnRow.appendChild(achBtn);

        achBtn.addEventListener('click', () => {
          renderAchievements();
          hide(menuOverlay);
          show(achOverlay);
          AudioSys.ui();
        });

        window.addEventListener('keydown', (e) => {
          if (e.code === 'Escape' && !isHidden(achOverlay)) {
            hide(achOverlay);
            show(menuOverlay);
          }
        });

        // --- 5. SAUVEGARDE EXPORTABLE ---
        function exportSave() {
          try {
            const payload = { meta, best, v: 4.6 };
            return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
          } catch (e) {
            return '';
          }
        }

        function importSave(code) {
          try {
            const payload = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
            if (!payload || typeof payload !== 'object' || !payload.meta) return false;

            meta = Object.assign({}, meta, payload.meta);
            if (typeof payload.best === 'number' && payload.best > best) {
              best = payload.best;
              saveBest(best);
            }

            saveMeta();
            return true;
          } catch (e) {
            return false;
          }
        }

        const saveSection = document.createElement('div');
        saveSection.innerHTML = `
          <div class="section-label">Sauvegarde</div>
          <div class="btn-row" style="margin-top:0">
            <button id="exportBtn" class="btn secondary">Exporter</button>
            <button id="importBtn" class="btn secondary">Importer</button>
          </div>
          <textarea id="saveBox" placeholder="Le code de sauvegarde apparaît ici" readonly></textarea>
        `;
        prestigeSection.insertAdjacentElement('afterend', saveSection);

        const saveBox = saveSection.querySelector('#saveBox');

        saveSection.querySelector('#exportBtn').addEventListener('click', () => {
          saveBox.readOnly = true;
          saveBox.value = exportSave();
          saveBox.focus();
          saveBox.select();
          try {
            document.execCommand('copy');
            toast('Sauvegarde copiée dans le presse-papiers', 'nano');
          } catch (e) {
            toast('Sauvegarde générée — copiez le texte manuellement');
          }
        });

        saveSection.querySelector('#importBtn').addEventListener('click', () => {
          saveBox.readOnly = false;
          saveBox.value = '';
          saveBox.placeholder = 'Collez votre code de sauvegarde puis appuyez sur Entrée';
          saveBox.focus();
        });

        saveBox.addEventListener('keydown', (e) => {
          if (e.code === 'Enter' && !saveBox.readOnly) {
            e.preventDefault();
            const ok = importSave(saveBox.value);
            saveBox.readOnly = true;

            if (ok) {
              toast('Sauvegarde importée', 'nano');
              refreshMenu();
              renderLab();
              renderTrails();
              renderPrestige();
            } else {
              toast('Code de sauvegarde invalide');
            }
          }
        });
      })();

"""


def main():
    if len(sys.argv) < 2:
        print("Utilisation : python3 build_v46.py nebuleuse-v4.5.html")
        raise SystemExit(1)

    source_path = Path(sys.argv[1])

    if not source_path.exists():
        print(f"Fichier introuvable : {source_path}")
        raise SystemExit(1)

    html = source_path.read_text(encoding="utf-8")

    end_anchor = "      let last = performance.now();"

    html = replace_once(
        html,
        end_anchor,
        PATCH_JS + "\n" + end_anchor,
        "insertion du patch v4.6",
    )

    html = html.replace(
        "<title>Nébuleuse Protocol IV — v4.5</title>",
        "<title>Nébuleuse Protocol IV — v4.6</title>",
        1,
    )

    output_path = source_path.with_name("nebuleuse-v4.6.html")
    output_path.write_text(html, encoding="utf-8")

    print()
    print("✅ Nébuleuse Protocol IV v4.6 généré avec succès.")
    print(f"📄 Fichier : {output_path.resolve()}")
    print()


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(error)
        raise SystemExit(1)
