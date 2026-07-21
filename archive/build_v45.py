#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Générateur Nébuleuse Protocol IV v4.5 — Contenu & profondeur (Phase 2)

Applique par-dessus nebuleuse-v4.4.html :
  - secteurs visuellement distincts (teinte de fond par tranche de vagues)
  - 2 nouveaux types d'ennemis : Sentinelle (tourelle à tir balayant),
    Essaim (petit, rapide, en nombre)
  - vaisseaux à débloquer par score (au lieu de tous disponibles d'emblée)
  - mode Ascension : mutateur aléatoire par run, variante "défi du jour"
    à sélection déterministe par date (mêmes joueurs = même défi le
    même jour)

Utilisation :
    python3 build_v45.py nebuleuse-v4.4.html

Produit :
    nebuleuse-v4.5.html
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


NEW_VARS = r"""
      let lastSectorIndex = -1;
      let activeMutator = null;
      let dailyMutatorId = null;
"""

PATCH_JS = r"""
      // ============================================================
      // PATCH NÉBULEUSE PROTOCOL IV.5
      // Secteurs visuels · Nouveaux ennemis · Vaisseaux à débloquer
      // Mode Ascension (mutateurs, défi du jour)
      // ============================================================
      (() => {
        // --- 1. STYLE ---
        const plusStyle = document.createElement('style');
        plusStyle.textContent = `
          .ship-card.disabled {
            opacity: 0.42;
            pointer-events: none;
          }

          #mutatorBadge {
            position: absolute;
            top: calc(env(safe-area-inset-top) + 92px);
            left: 14px;
            right: 14px;
            text-align: center;
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #fbbf24;
            text-shadow: 0 0 14px rgba(251, 191, 36, 0.4);
            opacity: 0;
            transition: opacity 0.25s ease;
            pointer-events: none;
          }

          #mutatorBadge.show {
            opacity: 0.85;
          }
        `;
        document.head.appendChild(plusStyle);

        // --- 2. BADGE MUTATEUR ---
        const mutatorBadge = document.createElement('div');
        mutatorBadge.id = 'mutatorBadge';
        document.body.appendChild(mutatorBadge);

        // --- 3. SECTEURS VISUELS ---
        const SECTOR_PALETTES = [
          {
            top: '#030711', mid: '#060b1c', bottom: '#0a0618',
            colors: [
              'rgba(56, 189, 248, 0.10)',
              'rgba(129, 140, 248, 0.12)',
              'rgba(217, 70, 239, 0.08)',
              'rgba(16, 185, 129, 0.06)'
            ]
          },
          {
            top: '#0a0713', mid: '#150a24', bottom: '#1a0a1f',
            colors: [
              'rgba(168, 85, 247, 0.14)',
              'rgba(217, 70, 239, 0.10)',
              'rgba(99, 102, 241, 0.10)',
              'rgba(56, 189, 248, 0.05)'
            ]
          },
          {
            top: '#0d0508', mid: '#1a070a', bottom: '#150306',
            colors: [
              'rgba(244, 63, 94, 0.14)',
              'rgba(251, 146, 60, 0.10)',
              'rgba(217, 70, 239, 0.07)',
              'rgba(251, 191, 36, 0.06)'
            ]
          }
        ];

        function currentSectorIndex() {
          if (wave >= 10) return 2;
          if (wave >= 5) return 1;
          return 0;
        }

        function sectorMakeBackground() {
          const pal = SECTOR_PALETTES[currentSectorIndex()];

          bg.width = Math.floor(W * DPR);
          bg.height = Math.floor(H * DPR);
          bctx.setTransform(DPR, 0, 0, DPR, 0, 0);

          const g = bctx.createLinearGradient(0, 0, 0, H);
          g.addColorStop(0, pal.top);
          g.addColorStop(0.45, pal.mid);
          g.addColorStop(1, pal.bottom);
          bctx.fillStyle = g;
          bctx.fillRect(0, 0, W, H);

          for (let i = 0; i < 9; i++) {
            const x = rand(0, W);
            const y = rand(0, H);
            const r = rand(Math.min(W, H) * 0.18, Math.min(W, H) * 0.55);
            const rg = bctx.createRadialGradient(x, y, 0, x, y, r);
            rg.addColorStop(0, pick(pal.colors));
            rg.addColorStop(1, 'rgba(0, 0, 0, 0)');

            bctx.fillStyle = rg;
            bctx.beginPath();
            bctx.arc(x, y, r, 0, TAU);
            bctx.fill();
          }
        }

        makeBackground = sectorMakeBackground;

        const baseStartWaveSectors = startWave;
        startWave = function sectorStartWave(n) {
          baseStartWaveSectors(n);

          const idx = currentSectorIndex();
          if (idx !== lastSectorIndex) {
            const firstTime = lastSectorIndex === -1;
            lastSectorIndex = idx;
            makeBackground();

            if (!firstTime) {
              vibrate(12);
              AudioSys.playNote(idx === 2 ? 220 : 340, 0.5, 'sine', 0.06, idx === 2 ? -60 : 40);
            }
          }
        };

        // --- 4. NOUVEAUX ENNEMIS : Sentinelle & Essaim ---
        const baseSpawnEnemy = spawnEnemy;
        spawnEnemy = function extendedSpawnEnemy(type, x, y) {
          if (type !== 'sentinel' && type !== 'swarmer') {
            return baseSpawnEnemy(type, x, y);
          }

          const d = getDiff();
          const hpScale = (1 + d * 0.16) * dm().hp;
          const px = x === undefined ? rand(40, Math.max(41, W - 40)) : x;
          const py = y === undefined ? -40 : y;

          const e = {
            type,
            x: px,
            y: py,
            baseX: px,
            t: rand(0, TAU),
            fireCd: rand(0.8, 2.0),
            customFireCd: rand(0.6, 1.4),
            vy: 0,
            r: 14,
            hp: 10,
            maxHp: 10,
            score: 100,
            elite: false
          };

          if (type === 'sentinel') {
            e.r = 15;
            e.hp = e.maxHp = 46 * hpScale;
            e.vy = 30;
            e.score = 260;
          } else {
            e.r = 7;
            e.hp = e.maxHp = 6 * hpScale;
            e.vy = 165;
            e.score = 70;
          }

          enemies.push(e);
          return e;
        };

        const baseUpdateEnemies = updateEnemies;
        updateEnemies = function extendedUpdateEnemies(dt) {
          const d = getDiff();

          for (const e of enemies) {
            if (e.type === 'sentinel') {
              e.y += e.vy * dt;
              e.customFireCd -= dt / dm().fire;

              if (e.customFireCd <= 0 && e.y > 10 && e.y < H * 0.6 && player.alive) {
                const sweepBase = e.t * 1.4;
                for (let k = -1; k <= 1; k++) {
                  const a = sweepBase + k * 0.5;
                  fireEnemyBullet(
                    e.x,
                    e.y,
                    Math.cos(a) * (150 + d * 4),
                    Math.sin(a) * (150 + d * 4) + 60,
                    5,
                    11,
                    '#facc15'
                  );
                }
                e.customFireCd = 1.6 - Math.min(0.5, d * 0.02);
              }
            } else if (e.type === 'swarmer') {
              e.x = e.baseX + Math.sin(e.t * 9) * 26;
              e.y += e.vy * dt;
            }
          }

          baseUpdateEnemies(dt);
        };

        const baseDrawEnemies = drawEnemies;
        drawEnemies = function extendedDrawEnemies() {
          baseDrawEnemies();

          for (const e of enemies) {
            if (e.type === 'sentinel') {
              ctx.save();
              ctx.translate(e.x, e.y);
              ctx.rotate(e.t * 0.6);
              drawHexagon(e.r, '#facc15');
              ctx.rotate(-e.t * 1.2);
              ctx.beginPath();
              ctx.arc(0, 0, e.r * 0.32, 0, TAU);
              ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + 0.4 * Math.sin(e.t * 6)})`;
              ctx.fill();
              ctx.restore();
            } else if (e.type === 'swarmer') {
              ctx.save();
              ctx.translate(e.x, e.y);
              ctx.rotate(Math.PI);
              drawTriangle(e.r, '#fb923c');
              ctx.restore();
            }
          }
        };

        const baseEnemyColor = enemyColor;
        enemyColor = function extendedEnemyColor(type) {
          if (type === 'sentinel') return '#facc15';
          if (type === 'swarmer') return '#fb923c';
          return baseEnemyColor(type);
        };

        const baseGetWaveTypes = getWaveTypes;
        getWaveTypes = function extendedGetWaveTypes(n) {
          const a = baseGetWaveTypes(n);
          if (n >= 3) a.push('sentinel');
          if (n >= 4) a.push('swarmer', 'swarmer');
          return a;
        };

        // --- 5. VAISSEAUX À DÉBLOQUER ---
        const SHIP_UNLOCK_SCORE = [0, 15000, 60000];

        function isShipUnlocked(i) {
          return best >= SHIP_UNLOCK_SCORE[i];
        }

        renderShips = function gatedRenderShips() {
          shipList.innerHTML = SHIPS.map((s, i) => {
            const unlocked = isShipUnlocked(i);
            const need = SHIP_UNLOCK_SCORE[i];

            return `
              <div class="ship-card ${i === meta.ship ? 'selected' : ''} ${unlocked ? '' : 'disabled'}" data-ship="${i}">
                <strong>${s.name}${unlocked ? '' : ' 🔒'}</strong>
                <span>${unlocked ? s.desc : `Débloqué à ${need.toLocaleString('fr-FR')} points de score.`}</span>
                <div class="ship-stats">${unlocked ? `Vitesse ${s.speed} · Coque ${s.hull} · Bouclier ${s.shield} · Bombes ${s.bombs} · Arme ${s.weapon}` : ''}</div>
              </div>
            `;
          }).join('');

          shipList.querySelectorAll('.ship-card:not(.disabled)').forEach((el) => {
            el.addEventListener('click', () => {
              meta.ship = parseInt(el.dataset.ship, 10);
              saveMeta();
              renderShips();
              AudioSys.ui();
            });
          });
        };

        // --- 6. MODE ASCENSION (mutateurs) ---
        const MUTATORS = {
          blitz: { name: 'Blitz', desc: 'Ennemis plus rapides à tirer · Score ×1.5' },
          fragile: { name: 'Coque fragile', desc: 'Une seule vie · Nanites ×1.8' },
          ruee: { name: 'Ruée', desc: '+35% d’ennemis par vague · Nanites ×1.3' }
        };
        const MUTATOR_IDS = Object.keys(MUTATORS);

        function computeDailyMutatorId() {
          const day = new Date().toISOString().slice(0, 10);
          let hash = 0;
          for (let i = 0; i < day.length; i++) {
            hash = (hash * 31 + day.charCodeAt(i)) >>> 0;
          }
          return MUTATOR_IDS[hash % MUTATOR_IDS.length];
        }

        dailyMutatorId = computeDailyMutatorId();

        const baseDm = dm;
        dm = function mutatedDm() {
          const base = baseDm();
          if (activeMutator === 'blitz') {
            return Object.assign({}, base, { fire: base.fire * 0.72, score: base.score * 1.5 });
          }
          return base;
        };

        const baseComputeNanites = computeNanites;
        computeNanites = function mutatedComputeNanites() {
          let n = baseComputeNanites();
          if (activeMutator === 'ruee') n = Math.round(n * 1.3);
          if (activeMutator === 'fragile') n = Math.round(n * 1.8);
          return n;
        };

        const baseStartWaveMutator = startWave;
        startWave = function mutatorStartWave(n) {
          baseStartWaveMutator(n);

          if (activeMutator === 'ruee' && spawnQueue.length > 3) {
            const extra = Math.ceil(spawnQueue.length * 0.35);
            const types = ['drone', 'zig', 'speeder'];

            for (let i = 0; i < extra; i++) {
              spawnQueue.push({ delay: rand(0.3, 0.8), type: pick(types) });
            }
          }
        };

        const baseResetGameMutator = resetGame;
        resetGame = function mutatorResetGame() {
          baseResetGameMutator();

          if (activeMutator === 'fragile' && player) {
            player.lives = 1;
          }

          if (activeMutator) {
            mutatorBadge.textContent = `MUTATEUR : ${MUTATORS[activeMutator].name}`;
            mutatorBadge.classList.add('show');
          } else {
            mutatorBadge.classList.remove('show');
          }
        };

        const baseStartGameMutator = startGame;
        startGame = function mutatorStartGame(selectedMode, mutatorChoice) {
          if (selectedMode === 'ascension') {
            activeMutator = mutatorChoice || dailyMutatorId;
            baseStartGameMutator('campagne');
            toast(`Ascension — ${MUTATORS[activeMutator].name} : ${MUTATORS[activeMutator].desc}`, 'gold');
          } else {
            activeMutator = null;
            baseStartGameMutator(selectedMode);
          }
        };

        function appendMutatorStats(el) {
          if (!activeMutator) return;
          el.innerHTML += `<br>Ascension — ${MUTATORS[activeMutator].name}`;
        }

        const baseGameOverMutator = gameOver;
        gameOver = function mutatorGameOver() {
          baseGameOverMutator();
          appendMutatorStats(finalStats);
        };

        const baseShowVictoryMutator = showVictory;
        showVictory = function mutatorShowVictory() {
          baseShowVictoryMutator();
          appendMutatorStats(victoryStats);
        };

        // --- 7. BOUTON ASCENSION DANS LE MENU ---
        const menuBtnRow = document.querySelector('#menu .btn-row');
        const ascensionBtn = document.createElement('button');
        ascensionBtn.id = 'modeAscension';
        ascensionBtn.className = 'btn secondary';
        ascensionBtn.textContent = 'Ascension (défi du jour)';

        if (menuBtnRow) {
          menuBtnRow.insertBefore(ascensionBtn, menuBtnRow.children[2] || null);
        }

        ascensionBtn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          startGame('ascension');
        });
      })();

"""


def main():
    if len(sys.argv) < 2:
        print("Utilisation : python3 build_v45.py nebuleuse-v4.4.html")
        raise SystemExit(1)

    source_path = Path(sys.argv[1])

    if not source_path.exists():
        print(f"Fichier introuvable : {source_path}")
        raise SystemExit(1)

    html = source_path.read_text(encoding="utf-8")

    vars_anchor = """      let bossIntroTimer = 0;
      let bossIntroName = '';"""

    html = replace_once(
        html,
        vars_anchor,
        vars_anchor + "\n" + NEW_VARS,
        "ajout des variables v4.5",
    )

    end_anchor = "      let last = performance.now();"

    html = replace_once(
        html,
        end_anchor,
        PATCH_JS + "\n" + end_anchor,
        "insertion du patch v4.5",
    )

    html = html.replace(
        "<title>Nébuleuse Protocol IV — v4.4</title>",
        "<title>Nébuleuse Protocol IV — v4.5</title>",
        1,
    )

    output_path = source_path.with_name("nebuleuse-v4.5.html")
    output_path.write_text(html, encoding="utf-8")

    print()
    print("✅ Nébuleuse Protocol IV v4.5 généré avec succès.")
    print(f"📄 Fichier : {output_path.resolve()}")
    print()


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(error)
        raise SystemExit(1)
