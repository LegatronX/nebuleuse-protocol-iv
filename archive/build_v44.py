#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Générateur Nébuleuse Protocol IV v4.4 — Feel & Résilience

Applique par-dessus nebuleuse-v4.3.html :
  - hit-stop (freeze-frame) sur gros impacts : boss/mini-boss tués,
    vie perdue, bombe, NOVA
  - pulse de zoom caméra sur ces mêmes moments (désactivé si
    prefers-reduced-motion)
  - carte d'intro de boss (nom + halo dramatique) à l'apparition
  - récap "faits marquants" (meilleur combo, meilleure chaîne de
    frôlement) sur les écrans de fin de run
  - filet de sécurité anti-crash : si une exception survient dans la
    boucle de jeu, un écran de récupération apparaît au lieu d'un
    freeze silencieux
  - retours haptiques élargis : la Gamepad Haptics API (manette
    physique appairée) est déclenchée en plus de navigator.vibrate.
    navigator.vibrate n'est pas supporté par Safari iOS (choix
    délibéré d'Apple, aucune page web ne peut le contourner) — sur
    iPhone sans manette, le hit-stop + le pulse caméra servent de
    substitut sensoriel visuel à la vibration.

Utilisation :
    python3 build_v44.py nebuleuse-v4.3.html

Produit :
    nebuleuse-v4.4.html
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
      let hitStopTimer = 0;

      let camPunchMag = 0;
      let camPunchTime = 0;
      let camPunchDuration = 0.001;

      let maxCombo = 0;
      let bestGrazeChain = 0;

      let bossIntroTimer = 0;
      let bossIntroName = '';
"""

PATCH_JS = r"""
      // ============================================================
      // PATCH NÉBULEUSE PROTOCOL IV.4
      // Feel (hit-stop, camera punch, intro de boss, récap de fin)
      // Résilience (écran de récupération anti-crash)
      // Haptique élargie (Gamepad Rumble API en plus de vibrate())
      // ============================================================
      (() => {
        // --- 1. STYLE ---
        const plusStyle = document.createElement('style');
        plusStyle.textContent = `
          #bossIntroCard {
            position: fixed;
            left: 50%;
            top: 30%;
            transform: translate(-50%, -50%) scale(0.92);
            z-index: 55;
            pointer-events: none;
            text-align: center;
            opacity: 0;
            padding: 14px 34px;
            border-radius: 20px;
            background: linear-gradient(180deg, rgba(4,12,25,0.55), rgba(4,12,25,0.22));
            border: 1px solid rgba(244, 63, 94, 0.4);
            box-shadow: 0 0 40px rgba(244, 63, 94, 0.25);
            font-weight: 900;
            font-size: clamp(20px, 6vw, 34px);
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: #fecdd3;
            text-shadow: 0 0 22px rgba(244, 63, 94, 0.55);
          }

          #bossIntroCard.show {
            animation: bossIntroPulse 2.1s cubic-bezier(.16,.9,.2,1) both;
          }

          @keyframes bossIntroPulse {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.85); }
            12% { opacity: 1; transform: translate(-50%, -50%) scale(1.04); }
            20% { transform: translate(-50%, -50%) scale(1); }
            82% { opacity: 1; }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(0.94); }
          }

          #crashOverlay {
            position: fixed;
            inset: 0;
            z-index: 90;
            display: none;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 16px;
            padding: 24px;
            text-align: center;
            background: rgba(2, 4, 9, 0.94);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
          }

          #crashOverlay.show {
            display: flex;
          }

          #crashOverlay h2 {
            font-size: 22px;
            font-weight: 900;
            color: #fecdd3;
          }

          #crashOverlay p {
            font-size: 14px;
            color: rgba(234, 246, 255, 0.72);
            max-width: 380px;
            line-height: 1.5;
          }

          @media (prefers-reduced-motion: reduce) {
            #bossIntroCard.show {
              animation-duration: 1.4s;
            }
          }
        `;
        document.head.appendChild(plusStyle);

        // --- 2. DOM ---
        const bossIntroEl = document.createElement('div');
        bossIntroEl.id = 'bossIntroCard';
        document.body.appendChild(bossIntroEl);

        const crashOverlay = document.createElement('div');
        crashOverlay.id = 'crashOverlay';
        crashOverlay.innerHTML = `
          <h2>Turbulence détectée</h2>
          <p>Le moteur de jeu a rencontré une erreur inattendue. Votre progression et vos nanites sont déjà sauvegardés — un rechargement suffit à repartir.</p>
        `;
        const crashReloadBtn = document.createElement('button');
        crashReloadBtn.className = 'btn';
        crashReloadBtn.style.pointerEvents = 'auto';
        crashReloadBtn.textContent = 'Recharger';
        crashReloadBtn.addEventListener('click', () => location.reload());
        crashOverlay.appendChild(crashReloadBtn);
        document.body.appendChild(crashOverlay);

        let crashShown = false;

        function showCrashOverlay(err) {
          if (crashShown) return;
          crashShown = true;

          try {
            console.error('Nébuleuse Protocol IV — erreur moteur de jeu', err);
          } catch (e) {}

          crashOverlay.classList.add('show');
        }

        // --- 3. HIT-STOP & CAMERA PUNCH ---
        function triggerHitStop(duration) {
          hitStopTimer = Math.max(hitStopTimer, duration);
        }

        function triggerCamPunch(mag, duration) {
          if (reducedMotion) return;

          camPunchMag = Math.max(camPunchMag, mag);
          camPunchTime = duration;
          camPunchDuration = duration;
        }

        // --- 4. HAPTIQUE ÉLARGIE : GAMEPAD RUMBLE ---
        // navigator.vibrate() n'existe simplement pas sous Safari iOS
        // (aucune page web ne peut le contourner). La Gamepad Haptics
        // API fonctionne en revanche sur iPhone dès qu'une manette
        // physique (MFi/Bluetooth) est appairée — c'est la seule vraie
        // vibration disponible sur iPhone depuis le web.
        function gamepadRumble(pattern) {
          if (!navigator.getGamepads) return;

          let duration = 0;

          if (Array.isArray(pattern)) {
            for (let i = 0; i < pattern.length; i += 2) {
              duration += pattern[i] || 0;
            }
          } else {
            duration = pattern || 0;
          }

          duration = clamp(duration, 20, 260);

          const strong = Array.isArray(pattern)
            ? Math.min(1, 0.35 + pattern.length * 0.08)
            : 0.4;

          try {
            const pads = navigator.getGamepads();

            for (const gp of pads) {
              if (gp && gp.vibrationActuator && gp.vibrationActuator.playEffect) {
                gp.vibrationActuator
                  .playEffect('dual-rumble', {
                    startDelay: 0,
                    duration,
                    weakMagnitude: strong * 0.6,
                    strongMagnitude: strong
                  })
                  .catch(() => {});
              }
            }
          } catch (e) {}
        }

        const baseVibrate = vibrate;
        vibrate = function hapticVibrate(pattern) {
          baseVibrate(pattern);
          gamepadRumble(pattern);
        };

        // --- 5. IMPACTS : boss/mini-boss tués, vie perdue, bombe, NOVA ---
        const baseKillEnemy = killEnemy;
        killEnemy = function enhancedKillEnemy(index) {
          const e = enemies[index];
          const wasBoss = !!e && e.type === 'boss';
          const wasMiniboss = !!e && e.type === 'miniboss';

          baseKillEnemy(index);

          if (combo > maxCombo) maxCombo = combo;

          if (wasBoss) {
            triggerHitStop(0.09);
            triggerCamPunch(0.06, 0.5);
          } else if (wasMiniboss) {
            triggerHitStop(0.05);
            triggerCamPunch(0.035, 0.35);
          }
        };

        const baseRegisterGraze = registerGraze;
        registerGraze = function trackedRegisterGraze(bullet) {
          baseRegisterGraze(bullet);
          if (grazeChain > bestGrazeChain) bestGrazeChain = grazeChain;
        };

        const baseLoseLife = loseLife;
        loseLife = function enhancedLoseLife() {
          baseLoseLife();
          triggerHitStop(0.07);
          triggerCamPunch(0.045, 0.4);
        };

        const baseDoBomb = doBomb;
        doBomb = function enhancedDoBomb() {
          const before = player ? player.bombs : 0;
          baseDoBomb();

          if (player && player.bombs < before) {
            triggerHitStop(0.05);
            triggerCamPunch(0.04, 0.4);
          }
        };

        const baseDoSpecial = doSpecial;
        doSpecial = function enhancedDoSpecial() {
          const before = player ? player.energy : 0;
          baseDoSpecial();

          if (player && before >= 100 && player.energy === 0) {
            triggerCamPunch(0.03, 0.35);
          }
        };

        // --- 6. INTRO DE BOSS ---
        const baseSpawnBoss = spawnBoss;
        spawnBoss = function enhancedSpawnBoss(isFinal) {
          baseSpawnBoss(isFinal);

          if (!boss) return;

          bossIntroName = boss.name;
          bossIntroTimer = 2.1;

          triggerHitStop(0.12);

          bossIntroEl.textContent = bossIntroName;
          bossIntroEl.classList.remove('show');
          void bossIntroEl.offsetWidth;
          bossIntroEl.classList.add('show');

          vibrate([15, 40, 15, 40, 15]);
        };

        // --- 7. RÉCAP DE FIN DE RUN ---
        function appendHighlights(el) {
          const parts = [];

          if (maxCombo >= 2) parts.push(`Meilleur combo : x${maxCombo}`);
          if (bestGrazeChain >= 2) parts.push(`Meilleure chaîne de frôlement : x${bestGrazeChain}`);

          if (parts.length) el.innerHTML += `<br>${parts.join(' · ')}`;
        }

        const baseGameOver = gameOver;
        gameOver = function highlightsGameOver() {
          baseGameOver();
          appendHighlights(finalStats);
        };

        const baseShowVictory = showVictory;
        showVictory = function highlightsShowVictory() {
          baseShowVictory();
          appendHighlights(victoryStats);
        };

        const baseResetGame = resetGame;
        resetGame = function freshResetGame() {
          baseResetGame();

          maxCombo = 0;
          bestGrazeChain = 0;
          hitStopTimer = 0;
          camPunchTime = 0;
          bossIntroTimer = 0;

          bossIntroEl.classList.remove('show');
        };

        // --- 8. BOUCLE : hit-stop, décompte de l'intro, dt effectif ---
        const baseUpdate = update;
        update = function resilientUpdate(dt) {
          if (camPunchTime > 0) {
            camPunchTime = Math.max(0, camPunchTime - dt);
          }

          if (bossIntroTimer > 0) {
            bossIntroTimer = Math.max(0, bossIntroTimer - dt);
            if (bossIntroTimer === 0) bossIntroEl.classList.remove('show');
          }

          let effDt = dt;

          if (hitStopTimer > 0) {
            hitStopTimer = Math.max(0, hitStopTimer - dt);
            effDt = dt * 0.08;
          }

          baseUpdate(effDt);
        };

        // --- 9. RENDU : pulse de zoom caméra ---
        const baseDraw = draw;
        draw = function punchedDraw() {
          if (camPunchTime > 0 && camPunchMag > 0) {
            const t = camPunchTime / camPunchDuration;
            const s = 1 + camPunchMag * t;

            ctx.save();
            ctx.translate(W / 2, H / 2);
            ctx.scale(s, s);
            ctx.translate(-W / 2, -H / 2);

            baseDraw();

            ctx.restore();
          } else {
            baseDraw();
          }
        };

        // --- 10. FILET ANTI-CRASH ---
        const baseFrame = frame;
        frame = function safeFrame(t) {
          try {
            baseFrame(t);
          } catch (err) {
            showCrashOverlay(err);
          }
        };

        window.addEventListener('error', (e) => showCrashOverlay(e.error || e.message));
        window.addEventListener('unhandledrejection', (e) => showCrashOverlay(e.reason));
      })();

"""


def main():
    if len(sys.argv) < 2:
        print("Utilisation : python3 build_v44.py nebuleuse-v4.3.html")
        raise SystemExit(1)

    source_path = Path(sys.argv[1])

    if not source_path.exists():
        print(f"Fichier introuvable : {source_path}")
        raise SystemExit(1)

    html = source_path.read_text(encoding="utf-8")

    vars_anchor = """      let runNanitesPaid = 0;
      let hudTimer = 0;
      let countdownToken = 0;"""

    html = replace_once(
        html,
        vars_anchor,
        vars_anchor + "\n" + NEW_VARS,
        "ajout des variables v4.4",
    )

    end_anchor = "      let last = performance.now();"

    html = replace_once(
        html,
        end_anchor,
        PATCH_JS + "\n" + end_anchor,
        "insertion du patch v4.4",
    )

    html = html.replace(
        "<title>Nébuleuse Protocol IV — v4.3</title>",
        "<title>Nébuleuse Protocol IV — v4.4</title>",
        1,
    )

    output_path = source_path.with_name("nebuleuse-v4.4.html")
    output_path.write_text(html, encoding="utf-8")

    print()
    print("✅ Nébuleuse Protocol IV v4.4 généré avec succès.")
    print(f"📄 Fichier : {output_path.resolve()}")
    print()
    print("Améliorations ajoutées par rapport à v4.3 :")
    print("  • hit-stop sur boss/mini-boss tués, vie perdue, bombe, NOVA")
    print("  • pulse de zoom caméra (respecte prefers-reduced-motion)")
    print("  • carte d'intro de boss")
    print("  • récap combo/chaîne de frôlement en fin de run")
    print("  • écran de récupération anti-crash")
    print("  • retours haptiques élargis via Gamepad Haptics API")
    print()


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(error)
        raise SystemExit(1)
