#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Générateur Nébuleuse Protocol IV v4.2

Applique par-dessus nebuleuse-v4.1.html :
  - Dash (Maj/V, ou auto-directionnel loin du danger sur mobile)
  - Aimant à bonus
  - Formations d'ennemis (V, mur, pince)
  - Cap de particules adaptatif basé sur la perf réelle
  - Vignette d'alerte coque basse

Note : la portion "frôlement" du patch original a été retirée car
v4.1 possède déjà un système de frôlement complet (compteur, chaîne,
HUD, son, vibration) ; la garder aurait créé un second système de
score invisible et redondant.

Utilisation :
    python3 build_v42.py nebuleuse-v4.1.html

Produit :
    nebuleuse-v4.2.html
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
      // PATCH NÉBULEUSE PROTOCOL IV.2
      // Dash · Aimant à bonus · Formations · Perf adaptative
      // (frôlement retiré : déjà géré nativement par v4.1)
      // ============================================================
      (() => {
        const plusStyle = document.createElement('style');
        plusStyle.textContent = `
          #dashBtn {
            pointer-events: auto;
            width: 68px;
            height: 68px;
            border-radius: 50%;
            appearance: none;
            -webkit-appearance: none;
            border: 2px solid rgba(255,255,255,0.28);
            color: #e0f2fe;
            font-size: 13px;
            font-weight: 900;
            letter-spacing: 0.08em;
            background:
              radial-gradient(circle at 30% 25%, rgba(224,242,254,0.95), rgba(14,165,233,0.9) 38%, rgba(30,64,175,0.95) 100%);
            box-shadow:
              0 12px 28px rgba(56,189,248,0.20),
              inset 0 2px 12px rgba(255,255,255,0.25);
            opacity: 0.45;
            cursor: pointer;
            transition: opacity .18s ease, transform .1s ease, box-shadow .18s ease;
          }

          #dashBtn.ready {
            opacity: 1;
            box-shadow:
              0 0 30px rgba(56,189,248,0.42),
              0 12px 28px rgba(56,189,248,0.24),
              inset 0 2px 12px rgba(255,255,255,0.28);
          }

          #dashBtn:active {
            transform: scale(0.93);
          }

          #dashBtn:disabled {
            opacity: 0.32;
            filter: grayscale(0.4);
          }

          body.playing.low-hull #vignette {
            background:
              radial-gradient(circle at center, rgba(251,113,133,0.04) 0%, transparent 44%, rgba(251,113,133,0.22) 100%),
              radial-gradient(circle at center, transparent 52%, rgba(0,0,0,0.38) 100%);
            animation: hullPulse .72s ease-in-out infinite alternate;
          }

          @keyframes hullPulse {
            from { opacity: 1; }
            to { opacity: .78; }
          }

          @media (max-width: 390px) {
            .bottom {
              gap: 8px;
            }

            #specialBtn {
              width: 66px;
              height: 66px;
              font-size: 12px;
            }

            #dashBtn {
              width: 60px;
              height: 60px;
              font-size: 11px;
            }

            #bombBtn {
              width: 76px;
              height: 76px;
              font-size: 12px;
            }

            .status {
              padding-left: 8px;
              padding-right: 8px;
            }
          }
        `;
        document.head.appendChild(plusStyle);

        const bottomHud = document.querySelector('#hud .bottom');
        const dashBtn = document.createElement('button');
        dashBtn.id = 'dashBtn';
        dashBtn.type = 'button';
        dashBtn.setAttribute('aria-label', 'Dash');
        dashBtn.textContent = 'DASH';

        if (bottomHud) {
          bottomHud.insertBefore(dashBtn, bottomHud.querySelector('.status'));
        }

        function dashVector() {
          let kx = 0;
          let ky = 0;

          if (keys.ArrowLeft || keys.KeyA) kx -= 1;
          if (keys.ArrowRight || keys.KeyD) kx += 1;
          if (keys.ArrowUp || keys.KeyW) ky -= 1;
          if (keys.ArrowDown || keys.KeyS) ky += 1;

          if (kx || ky) {
            const len = Math.hypot(kx, ky) || 1;
            return { x: kx / len, y: ky / len };
          }

          // Sur mobile, si aucune direction n'est donnée,
          // le dash part automatiquement loin du danger le plus proche.
          let vx = 0;
          let vy = -1;
          let weight = 0;

          for (const b of eBullets) {
            const dx = player.x - b.x;
            const dy = player.y - b.y;
            const d2 = dx * dx + dy * dy;

            if (d2 < 260 * 260) {
              const w = 1 / Math.max(900, d2);
              vx += dx * w;
              vy += dy * w;
              weight += w;
            }
          }

          for (const e of enemies) {
            if (e.y < 0 || e.y > H) continue;

            const dx = player.x - e.x;
            const dy = player.y - e.y;
            const d2 = dx * dx + dy * dy;

            if (d2 < 220 * 220) {
              const w = 0.65 / Math.max(1600, d2);
              vx += dx * w;
              vy += dy * w;
              weight += w;
            }
          }

          if (weight > 0) {
            const len = Math.hypot(vx, vy) || 1;
            return { x: vx / len, y: vy / len };
          }

          return { x: 0, y: -1 };
        }

        function tryDash() {
          if (state !== 'playing' || !player || !player.alive) return;
          if ((player.dashCd || 0) > 0 || (player.dashTime || 0) > 0) return;

          const v = dashVector();

          player.dashTime = 0.16;
          player.dashCd = 1.65;
          player.dashVx = v.x * 980;
          player.dashVy = v.y * 980;
          player.invuln = Math.max(player.invuln, 0.22);

          shake = Math.max(shake, 0.12);

          addText(player.x, player.y - 42, 'DASH', '#a5f3fc');

          for (let i = 0; i < 24; i++) {
            addParticle(
              player.x + rand(-8, 8),
              player.y + rand(-8, 8),
              -v.x * rand(80, 260) + rand(-60, 60),
              -v.y * rand(80, 260) + rand(-60, 60),
              rand(0.16, 0.34),
              rand(1.4, 3.2),
              '#7dd3fc'
            );
          }

          if (AudioSys.ctx && !AudioSys.muted) {
            AudioSys.playNote(520, 0.08, 'triangle', 0.08, 420);
          }

          updateHUD();
        }

        dashBtn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          tryDash();
        });

        window.addEventListener('keydown', (e) => {
          if (e.repeat) return;

          if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyV') {
            e.preventDefault();
            tryDash();
          }
        });

        const baseResetGame = resetGame;
        resetGame = function enhancedResetGame() {
          baseResetGame();

          if (player) {
            player.dashCd = 0;
            player.dashTime = 0;
            player.dashVx = 0;
            player.dashVy = 0;
          }

          updateHUD();
        };

        const baseUpdatePlayer = updatePlayer;
        updatePlayer = function enhancedUpdatePlayer(dt) {
          if (player) {
            player.dashCd = Math.max(0, (player.dashCd || 0) - dt);
          }

          baseUpdatePlayer(dt);

          if (!player || !player.alive || state !== 'playing') return;

          if ((player.dashTime || 0) > 0) {
            const remain = player.dashTime;
            const ease = 0.35 + 0.65 * clamp(remain / 0.16, 0, 1);

            player.x += (player.dashVx || 0) * dt * ease;
            player.y += (player.dashVy || 0) * dt * ease;

            player.x = clamp(player.x, 20, W - 20);
            player.y = clamp(player.y, 70, H - 40);

            player.invuln = Math.max(player.invuln, 0.06);
            player.dashTime = Math.max(0, player.dashTime - dt);

            for (let i = 0; i < 3; i++) {
              addParticle(
                player.x - (player.dashVx || 0) * 0.012 + rand(-6, 6),
                player.y - (player.dashVy || 0) * 0.012 + rand(-6, 6),
                rand(-35, 35),
                rand(-35, 35),
                0.22,
                rand(1.2, 2.6),
                '#38bdf8'
              );
            }
          }
        };

        const baseGameOver = gameOver;
        gameOver = function enhancedGameOver() {
          document.body.classList.remove('low-hull');
          baseGameOver();
        };

        const baseShowVictory = showVictory;
        showVictory = function enhancedShowVictory() {
          document.body.classList.remove('low-hull');
          baseShowVictory();
        };

        updatePowerups = function enhancedUpdatePowerups(dt) {
          const hasPlayer = player && player.alive;
          const magnet =
            hasPlayer
              ? 110 + (meta.talents.credit || 0) * 8 + (player.weapon >= 5 ? 18 : 0)
              : 0;

          for (let i = powerups.length - 1; i >= 0; i--) {
            const p = powerups[i];

            p.t += dt;

            let attracted = false;

            if (hasPlayer) {
              const dx = player.x - p.x;
              const dy = player.y - p.y;
              const d = Math.hypot(dx, dy) || 1;

              if (d < magnet) {
                const pull = 1 - d / magnet;
                const speed = 240 + pull * 680;

                p.x += (dx / d) * speed * dt;
                p.y += (dy / d) * speed * dt;
                attracted = true;

                if (Math.random() < 0.45) {
                  addParticle(
                    p.x,
                    p.y,
                    rand(-20, 20),
                    rand(-20, 20),
                    0.2,
                    1.3,
                    powerColor(p.type)
                  );
                }
              }
            }

            if (!attracted) {
              p.y += p.vy * dt;
              p.x += Math.sin(p.t * 3) * 12 * dt;
            } else {
              p.y += Math.min(20, p.vy) * dt * 0.25;
            }

            if (p.y > H + 40) {
              powerups.splice(i, 1);
              continue;
            }

            if (hasPlayer) {
              const rr = (p.r + player.r + 18) * (p.r + player.r + 18);

              if (dist2(p, player) < rr) {
                applyPowerup(p);
                powerups.splice(i, 1);
              }
            }
          }
        };

        function spawnFormation(kind) {
          const safeX = (x) => clamp(x, 40, Math.max(41, W - 40));

          const make = (type, x, y) => {
            const e = spawnEnemy(type, safeX(x), y);
            e.fireCd += 0.25;
            return e;
          };

          if (kind === 'vee') {
            const step = Math.min(52, Math.max(34, W * 0.12));
            const offsets = [-2, -1, 0, 1, 2];

            offsets.forEach((o, i) => {
              const type =
                i === 2 && wave >= 5
                  ? 'elite'
                  : Math.abs(o) === 2
                    ? 'speeder'
                    : wave >= 4
                      ? 'zig'
                      : 'drone';

              make(type, W / 2 + o * step, -45 - Math.abs(o) * 22);
            });
          } else if (kind === 'wall') {
            const n = W < 430 ? 4 : 5;

            for (let i = 0; i < n; i++) {
              const x = (W / (n + 1)) * (i + 1);
              const type =
                wave >= 6 && i === Math.floor(n / 2)
                  ? 'tank'
                  : wave >= 4 && i % 2
                    ? 'zig'
                    : 'drone';

              make(type, x, -50 - i * 10);
            }
          } else {
            make(wave >= 5 ? 'zig' : 'drone', 48, -50);
            make(wave >= 5 ? 'zig' : 'drone', W - 48, -76);
            make(wave >= 4 ? 'turret' : 'drone', W / 2, -118);
          }
        }

        const baseStartWave = startWave;
        startWave = function enhancedStartWave(n) {
          baseStartWave(n);

          const bossWave = mode === 'survie' ? n % 5 === 0 : n % 3 === 0;
          const finalWave = n === 15 && !finalDefeated;

          if (!finalWave && !bossWave && n >= 2 && spawnQueue.length > 5) {
            const forms = ['vee', 'wall', 'pincer'];
            const count = n >= 8 ? 2 : 1;

            for (let i = 0; i < count; i++) {
              const pos = Math.min(spawnQueue.length, 2 + i * 6);

              spawnQueue.splice(pos, 0, {
                delay: 0.65 + i * 0.15,
                formation: pick(forms)
              });
            }
          }
        };

        updateSpawner = function enhancedUpdateSpawner(dt) {
          if (spawnQueue.length) {
            spawnTimer -= dt;

            if (spawnTimer <= 0) {
              const item = spawnQueue.shift();

              if (item.formation) {
                spawnFormation(item.formation);
              } else if (item.type === 'boss') {
                spawnBoss(item.final);
              } else {
                spawnEnemy(item.type);
              }

              if (spawnQueue.length) {
                spawnTimer = Math.max(0.08, spawnQueue[0].delay || 0.45);
              }
            }
          } else if (enemies.length === 0 && waveBannerTime <= 0) {
            endWave();
          }
        };

        const baseUpdateHUD = updateHUD;
        updateHUD = function enhancedUpdateHUD() {
          baseUpdateHUD();

          if (!player) {
            document.body.classList.remove('low-hull');
            dashBtn.disabled = true;
            return;
          }

          const cd = player.dashCd || 0;
          const dashReady = state === 'playing' && player.alive && cd <= 0;

          dashBtn.disabled = state !== 'playing' || !player.alive;
          dashBtn.classList.toggle('ready', dashReady);
          dashBtn.textContent = cd <= 0 ? 'DASH' : cd.toFixed(1);

          document.body.classList.toggle(
            'low-hull',
            state === 'playing' && player.hull / player.maxHull < 0.28
          );
        };

        let perfAvg = 1 / 60;

        const baseUpdate = update;
        update = function enhancedUpdate(dt) {
          perfAvg = perfAvg * 0.97 + dt * 0.03;
          baseUpdate(dt);
        };

        const baseAddParticle = addParticle;
        addParticle = function enhancedAddParticle(x, y, vx, vy, life, size, color) {
          const cap = perfAvg > 0.025 ? 360 : 650;

          if (particles.length > cap) return;

          baseAddParticle(x, y, vx, vy, life, size, color);
        };

        const baseStartGame = startGame;
        startGame = function enhancedStartGame(selectedMode) {
          document.body.classList.remove('low-hull');
          baseStartGame(selectedMode);
          updateHUD();
        };
      })();

"""


def main():
    if len(sys.argv) < 2:
        print("Utilisation : python3 build_v42.py nebuleuse-v4.1.html")
        raise SystemExit(1)

    source_path = Path(sys.argv[1])

    if not source_path.exists():
        print(f"Fichier introuvable : {source_path}")
        raise SystemExit(1)

    html = source_path.read_text(encoding="utf-8")

    anchor = '''      resize();
      initStars();
      refreshSoundButtons();
      refreshMenu();

      let last = performance.now();'''

    replacement = (
        '''      resize();
      initStars();
      refreshSoundButtons();
      refreshMenu();
'''
        + PATCH_JS
        + '''
      let last = performance.now();'''
    )

    html = replace_once(html, anchor, replacement, "insertion du patch v4.2")

    html = html.replace(
        "<title>Nébuleuse Protocol IV — v4.1</title>",
        "<title>Nébuleuse Protocol IV — v4.2</title>",
        1,
    )

    output_path = source_path.with_name("nebuleuse-v4.2.html")
    output_path.write_text(html, encoding="utf-8")

    print()
    print("✅ Nébuleuse Protocol IV v4.2 généré avec succès.")
    print(f"📄 Fichier : {output_path.resolve()}")
    print()
    print("Améliorations ajoutées par rapport à v4.1 :")
    print("  • dash (Maj/V, ou auto-directionnel sur mobile)")
    print("  • aimant à bonus")
    print("  • formations d'ennemis (V, mur, pince)")
    print("  • cap de particules adaptatif basé sur la perf réelle")
    print("  • vignette d'alerte coque basse")
    print()


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(error)
        raise SystemExit(1)
