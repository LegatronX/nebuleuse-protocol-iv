#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Générateur Nébuleuse Protocol IV v4.1

Utilisation :
    python3 build_v41.py nebuleuse.html

Produit :
    nebuleuse-v4.1.html
"""

from pathlib import Path
import sys


def replace_once(text, old, new, label):
    count = text.count(old)

    if count == 0:
        raise RuntimeError(
            f"\nModification impossible : {label}\n"
            "Le bloc recherché n'a pas été trouvé.\n"
            "Vérifie que le fichier source correspond bien au code original."
        )

    if count > 1:
        raise RuntimeError(
            f"\nModification ambiguë : {label}\n"
            f"Le bloc recherché apparaît {count} fois."
        )

    return text.replace(old, new, 1)


def main():
    if len(sys.argv) < 2:
        print("Utilisation : python3 build_v41.py nebuleuse.html")
        raise SystemExit(1)

    source_path = Path(sys.argv[1])

    if not source_path.exists():
        print(f"Fichier introuvable : {source_path}")
        raise SystemExit(1)

    html = source_path.read_text(encoding="utf-8")

    # ============================================================
    # 1. CSS
    # ============================================================

    css_patch = r"""
    /* ==========================================================
       AMÉLIORATIONS V4.1
       ========================================================== */

    button:focus-visible,
    .ship-card:focus-visible,
    .talent:focus-visible {
      outline: 3px solid rgba(103, 232, 249, 0.9);
      outline-offset: 4px;
    }

    #grazeDisplay {
      color: #a5f3fc;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.08em;
      min-height: 15px;
      opacity: 0.6;
      transition: opacity 0.15s ease;
    }

    #countdown {
      position: fixed;
      inset: 0;
      z-index: 60;
      pointer-events: none;
      display: grid;
      place-items: center;
      font-size: clamp(82px, 28vw, 180px);
      font-weight: 900;
      color: #e8feff;
      text-shadow:
        0 0 20px #67e8f9,
        0 0 60px rgba(103, 232, 249, 0.65);
      opacity: 0;
      transform: scale(1.35);
    }

    #countdown.show {
      animation: countdownPulse 0.82s ease both;
    }

    @keyframes countdownPulse {
      0% {
        opacity: 0;
        transform: scale(1.45);
      }

      22% {
        opacity: 1;
        transform: scale(1);
      }

      78% {
        opacity: 1;
        transform: scale(0.92);
      }

      100% {
        opacity: 0;
        transform: scale(0.7);
      }
    }

    body.paused #hud {
      opacity: 0.28;
    }

    body.low-quality .panel,
    body.low-quality .overlay,
    body.low-quality .icon-btn {
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }

    body.low-quality #vignette {
      background:
        radial-gradient(
          circle at center,
          transparent 60%,
          rgba(0, 0, 0, 0.3) 100%
        );
    }

    @media (orientation: landscape) and (max-height: 540px) {
      #hud {
        padding:
          calc(env(safe-area-inset-top) + 7px)
          calc(env(safe-area-inset-right) + 10px)
          calc(env(safe-area-inset-bottom) + 8px)
          calc(env(safe-area-inset-left) + 10px);
      }

      .panel {
        padding: 7px 10px;
        border-radius: 14px;
      }

      .big {
        font-size: 19px;
      }

      .mid {
        padding-top: 4px;
      }

      .bars {
        min-width: 190px;
      }

      #specialBtn {
        width: 62px;
        height: 62px;
        font-size: 11px;
      }

      #bombBtn {
        width: 68px;
        height: 68px;
        font-size: 11px;
      }

      .icon-btn {
        width: 46px;
        height: 46px;
        border-radius: 15px;
      }

      #bossHud {
        top: calc(env(safe-area-inset-top) + 66px);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        scroll-behavior: auto !important;
        animation-duration: 0.001ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001ms !important;
      }
    }
"""

    html = replace_once(
        html,
        "  </style>",
        css_patch + "\n  </style>",
        "ajout du CSS v4.1",
    )

    # ============================================================
    # 2. Éléments HTML
    # ============================================================

    html = replace_once(
        html,
        '        <div id="combo" class="small combo"></div>',
        '''        <div id="combo" class="small combo"></div>
        <div id="grazeDisplay">FRÔLEMENTS 0</div>''',
        "ajout du compteur de frôlements",
    )

    html = replace_once(
        html,
        '''  <canvas id="game"></canvas>
  <div id="vignette"></div>''',
        '''  <canvas id="game"></canvas>
  <div id="vignette"></div>
  <div id="countdown" aria-live="assertive"></div>''',
        "ajout du compte à rebours",
    )

    # ============================================================
    # 3. Variables globales
    # ============================================================

    html = replace_once(
        html,
        '''      let finalDefeated = false;
      let finalBonusAwarded = false;''',
        '''      let finalDefeated = false;
      let finalBonusAwarded = false;

      let grazes = 0;
      let grazeChain = 0;
      let grazeChainTime = 0;

      let runNanitesPaid = 0;
      let hudTimer = 0;
      let countdownToken = 0;

      const reducedMotion = window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

      const lowQuality =
        reducedMotion ||
        (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
        (navigator.deviceMemory && navigator.deviceMemory <= 4);

      document.body.classList.toggle('low-quality', !!lowQuality);''',
        "ajout des variables v4.1",
    )

    html = replace_once(
        html,
        '''      const comboEl = $('combo');
      const hullFill = $('hullFill');''',
        '''      const comboEl = $('combo');
      const grazeDisplay = $('grazeDisplay');
      const countdownEl = $('countdown');
      const hullFill = $('hullFill');''',
        "récupération des nouveaux éléments DOM",
    )

    # ============================================================
    # 4. Fonction vibration
    # ============================================================

    html = replace_once(
        html,
        '''      function isHidden(el) {
        return el.classList.contains('hidden');
      }

      function show(el) {''',
        '''      function isHidden(el) {
        return el.classList.contains('hidden');
      }

      function vibrate(pattern) {
        if (AudioSys.muted) return;
        if (!navigator.vibrate) return;

        try {
          navigator.vibrate(pattern);
        } catch (e) {}
      }

      function show(el) {''',
        "ajout des vibrations",
    )

    # ============================================================
    # 5. Calcul et paiement des nanites
    # ============================================================

    html = replace_once(
        html,
        '''      function computeNanites() {
        const base = Math.floor(score / 4000) + wave + runBossKills * 2 + (finalDefeated && !finalBonusAwarded ? 8 : 0);
        const mult = 1 + (meta.talents.credit || 0) * 0.1;
        return Math.max(1, Math.round(base * mult));
      }''',
        '''      function computeNanites() {
        const base =
          Math.floor(score / 4000) +
          wave +
          runBossKills * 2 +
          (finalDefeated ? 8 : 0);

        const mult = 1 + (meta.talents.credit || 0) * 0.1;

        return Math.max(1, Math.round(base * mult));
      }''',
        "correction du calcul des nanites",
    )

    html = replace_once(
        html,
        '''      function awardRunEnd() {
        const earned = computeNanites();
        meta.nanites += earned;
        if (finalDefeated && !finalBonusAwarded) finalBonusAwarded = true;
        saveMeta();
        refreshMenu();
        return earned;
      }''',
        '''      function awardRunEnd() {
        const totalEarned = computeNanites();
        const earnedNow = Math.max(0, totalEarned - runNanitesPaid);

        runNanitesPaid += earnedNow;
        meta.nanites += earnedNow;

        if (finalDefeated) finalBonusAwarded = true;

        saveMeta();
        refreshMenu();

        return earnedNow;
      }''',
        "correction du paiement multiple des nanites",
    )

    # ============================================================
    # 6. Réinitialisation des statistiques
    # ============================================================

    html = replace_once(
        html,
        '''        finalDefeated = false;
        finalBonusAwarded = false;

        enemies = [];''',
        '''        finalDefeated = false;
        finalBonusAwarded = false;

        grazes = 0;
        grazeChain = 0;
        grazeChainTime = 0;
        runNanitesPaid = 0;
        hudTimer = 0;

        enemies = [];''',
        "réinitialisation des variables v4.1",
    )

    # ============================================================
    # 7. Étoiles et qualité adaptative
    # ============================================================

    html = replace_once(
        html,
        '''      function initStars() {
        stars = [];
        for (let i = 0; i < 180; i++) {
          const z = Math.random();
          stars.push({
            x: Math.random() * W,
            y: Math.random() * H,
            z,
            r: z * 1.7 + 0.3,
            s: 25 + z * 130,
            tw: rand(0, TAU)
          });
        }
      }''',
        '''      function initStars() {
        stars = [];

        const areaFactor = clamp(
          (W * H) / (390 * 844),
          0.75,
          1.8
        );

        const baseCount = lowQuality ? 90 : 170;
        const count = Math.round(baseCount * areaFactor);

        for (let i = 0; i < count; i++) {
          const z = Math.random();

          stars.push({
            x: Math.random() * W,
            y: Math.random() * H,
            z,
            r: z * 1.7 + 0.3,
            s: 25 + z * 130,
            tw: rand(0, TAU)
          });
        }
      }''',
        "qualité adaptative des étoiles",
    )

    html = replace_once(
        html,
        '''        DPR = Math.min(window.devicePixelRatio || 1, 3);''',
        '''        DPR = Math.min(
          window.devicePixelRatio || 1,
          lowQuality ? 1.5 : 2.5
        );''',
        "limitation adaptative du DPR",
    )

    html = replace_once(
        html,
        '''        if (!stars.length) initStars();''',
        '''        initStars();''',
        "réinitialisation des étoiles au redimensionnement",
    )

    # ============================================================
    # 8. Système de frôlement
    # ============================================================

    graze_function = r'''
      function registerGraze(bullet) {
        if (bullet.grazed || !player || !player.alive) return;

        bullet.grazed = true;

        grazes++;
        grazeChain++;
        grazeChainTime = 1.4;

        const reward = 8 + Math.min(42, grazeChain * 2);

        score += Math.round(reward * multiplier * dm().score);
        player.energy = Math.min(100, player.energy + 1.8);

        addParticle(
          player.x,
          player.y,
          rand(-80, 80),
          rand(-100, -20),
          0.22,
          rand(1.5, 3),
          '#a5f3fc'
        );

        if (grazeChain > 0 && grazeChain % 10 === 0) {
          addText(
            player.x,
            player.y - 38,
            `FRÔLEMENT x${grazeChain}`,
            '#a5f3fc'
          );

          AudioSys.playNote(
            1050,
            0.05,
            'sine',
            0.045,
            180
          );

          vibrate(8);
        }

        if (score > best) {
          best = score;
          saveBest(best);
        }
      }

'''

    html = replace_once(
        html,
        "      function updateCollisions() {",
        graze_function + "      function updateCollisions() {",
        "ajout de la fonction de frôlement",
    )

    old_collision = '''        if (player.alive && player.invuln <= 0 && state === 'playing') {
          for (let i = eBullets.length - 1; i >= 0; i--) {
            const b = eBullets[i];
            const rr = (b.r + player.r) * (b.r + player.r);

            if (dist2(b, player) < rr) {
              eBullets.splice(i, 1);
              damagePlayer(b.dmg);
              if (!player.alive || state !== 'playing') break;
            }
          }
        }'''

    new_collision = '''        if (player.alive && player.invuln <= 0 && state === 'playing') {
          for (let i = eBullets.length - 1; i >= 0; i--) {
            const b = eBullets[i];

            const d = dist2(b, player);
            const hitRadius = b.r + player.r;
            const grazeRadius = hitRadius + 22;

            if (d < hitRadius * hitRadius) {
              eBullets.splice(i, 1);
              damagePlayer(b.dmg);

              if (!player.alive || state !== 'playing') break;
            } else if (
              !b.grazed &&
              d < grazeRadius * grazeRadius
            ) {
              registerGraze(b);
            }
          }
        }'''

    html = replace_once(
        html,
        old_collision,
        new_collision,
        "activation des frôlements dans les collisions",
    )

    # ============================================================
    # 9. Vibrations lors des événements importants
    # ============================================================

    html = replace_once(
        html,
        '''        AudioSys.hit();

        for (let i = 0; i < 8; i++) {''',
        '''        AudioSys.hit();
        vibrate(24);

        for (let i = 0; i < 8; i++) {''',
        "vibration lors des dégâts",
    )

    html = replace_once(
        html,
        '''        player.bombs--;
        AudioSys.bomb();
        shake = 1;''',
        '''        player.bombs--;
        AudioSys.bomb();
        vibrate([35, 30, 70]);
        shake = 1;''',
        "vibration de la bombe",
    )

    html = replace_once(
        html,
        '''        player.energy = 0;
        AudioSys.special();
        shake = Math.max(shake, 0.5);''',
        '''        player.energy = 0;
        AudioSys.special();
        vibrate([18, 22, 18]);
        shake = Math.max(shake, 0.5);''',
        "vibration de la NOVA",
    )

    html = replace_once(
        html,
        '''        if (e.type === 'boss') {
          boss = null;''',
        '''        if (e.type === 'boss') {
          vibrate([60, 35, 90]);
          boss = null;''',
        "vibration de destruction du boss",
    )

    # ============================================================
    # 10. HUD des frôlements
    # ============================================================

    html = replace_once(
        html,
        '''        comboEl.textContent = combo >= 2 ? `COMBO x${combo}` : '';
        comboEl.classList.toggle('show', combo >= 2);

        specialBtn.classList.toggle('ready', player.energy >= 100);''',
        '''        comboEl.textContent = combo >= 2 ? `COMBO x${combo}` : '';
        comboEl.classList.toggle('show', combo >= 2);

        grazeDisplay.textContent =
          grazeChain >= 2
            ? `FRÔLEMENTS ${grazes} · CHAÎNE x${grazeChain}`
            : `FRÔLEMENTS ${grazes}`;

        grazeDisplay.style.opacity =
          grazeChain >= 2 ? '1' : '0.6';

        specialBtn.classList.toggle('ready', player.energy >= 100);''',
        "affichage des frôlements dans le HUD",
    )

    # ============================================================
    # 11. Mise à jour du jeu et limitation du HUD à 30 Hz
    # ============================================================

    html = replace_once(
        html,
        '''          if (comboTime > 0) {
            comboTime -= dt;
            if (comboTime <= 0) combo = 0;
          }

          if (shake > 0) shake = Math.max(0, shake - dt * 1.4);''',
        '''          if (comboTime > 0) {
            comboTime -= dt;
            if (comboTime <= 0) combo = 0;
          }

          if (grazeChainTime > 0) {
            grazeChainTime -= dt;

            if (grazeChainTime <= 0) {
              grazeChain = 0;
            }
          }

          if (shake > 0) shake = Math.max(0, shake - dt * 1.4);''',
        "mise à jour de la chaîne de frôlements",
    )

    html = replace_once(
        html,
        '''          if (waveBannerTime > 0) waveBannerTime -= dt;

          updateHUD();
        } else if (state === 'gameover' || state === 'victory') {''',
        '''          if (waveBannerTime > 0) waveBannerTime -= dt;

          hudTimer += dt;

          if (hudTimer >= 1 / 30) {
            hudTimer = 0;
            updateHUD();
          }
        } else if (state === 'gameover' || state === 'victory') {''',
        "limitation du HUD à 30 Hz",
    )

    # ============================================================
    # 12. Pause avec compte à rebours
    # ============================================================

    html = replace_once(
        html,
        '''      function pauseGame() {
        if (state !== 'playing') return;

        state = 'paused';''',
        '''      function pauseGame() {
        if (state !== 'playing') return;

        countdownToken++;
        countdownEl.textContent = '';
        countdownEl.classList.remove('show');

        state = 'paused';''',
        "annulation du compte à rebours lors de la pause",
    )

    old_resume = '''      function resumeGame() {
        if (state !== 'paused') return;

        state = 'playing';
        document.body.classList.remove('paused');

        hide(pauseOverlay);

        AudioSys.resume();
        AudioSys.startMusic();
        AudioSys.ui();
      }'''

    new_resume = '''      function resumeGame() {
        if (state !== 'paused') return;

        hide(pauseOverlay);
        document.body.classList.remove('paused');

        AudioSys.resume();
        AudioSys.ui();

        const token = ++countdownToken;
        let count = 3;

        function displayNext() {
          if (token !== countdownToken) return;

          countdownEl.classList.remove('show');
          void countdownEl.offsetWidth;

          countdownEl.textContent =
            count > 0 ? String(count) : 'GO';

          countdownEl.classList.add('show');

          AudioSys.playNote(
            count > 0
              ? 520 + (3 - count) * 110
              : 880,
            0.08,
            'square',
            0.07
          );

          if (count > 0) {
            count--;
            setTimeout(displayNext, 800);
          } else {
            setTimeout(() => {
              if (token !== countdownToken) return;

              countdownEl.classList.remove('show');
              countdownEl.textContent = '';

              state = 'playing';
              AudioSys.startMusic();
            }, 500);
          }
        }

        state = 'countdown';
        displayNext();
      }'''

    html = replace_once(
        html,
        old_resume,
        new_resume,
        "compte à rebours de reprise",
    )

    html = replace_once(
        html,
        '''      function startGame(selectedMode) {
        mode = selectedMode;
        lastMode = selectedMode;

        AudioSys.init();''',
        '''      function startGame(selectedMode) {
        mode = selectedMode;
        lastMode = selectedMode;

        countdownToken++;
        countdownEl.textContent = '';
        countdownEl.classList.remove('show');

        AudioSys.init();''',
        "annulation du compte à rebours au démarrage",
    )

    html = replace_once(
        html,
        '''      function toMenu() {
        state = 'menu';
        document.body.classList.remove('playing', 'paused', 'cinema');''',
        '''      function toMenu() {
        countdownToken++;
        countdownEl.textContent = '';
        countdownEl.classList.remove('show');

        state = 'menu';
        document.body.classList.remove('playing', 'paused', 'cinema');''',
        "annulation du compte à rebours au menu",
    )

    # ============================================================
    # 13. Frôlements dans les écrans de résultats
    # ============================================================

    html = replace_once(
        html,
        '''          `Vaisseau : ${SHIPS[meta.ship || 0].name}<br>` +
          `Vague : ${wave} · Destructions : ${gameKills}<br>` +
          `Temps : ${formatTime(gameTime)}`;
        victoryEarned.textContent''',
        '''          `Vaisseau : ${SHIPS[meta.ship || 0].name}<br>` +
          `Vague : ${wave} · Destructions : ${gameKills}<br>` +
          `Frôlements : ${grazes}<br>` +
          `Temps : ${formatTime(gameTime)}`;
        victoryEarned.textContent''',
        "frôlements dans les statistiques de victoire",
    )

    html = replace_once(
        html,
        '''          `Vaisseau : ${SHIPS[meta.ship || 0].name}<br>` +
          `Vague : ${wave} · Destructions : ${gameKills}<br>` +
          `Temps : ${formatTime(gameTime)}${mode === 'survie' ? ` · Survie : ${formatTime(survivalTime)}` : ''}`;
        earnedNanites.textContent''',
        '''          `Vaisseau : ${SHIPS[meta.ship || 0].name}<br>` +
          `Vague : ${wave} · Destructions : ${gameKills}<br>` +
          `Frôlements : ${grazes}<br>` +
          `Temps : ${formatTime(gameTime)}${mode === 'survie' ? ` · Survie : ${formatTime(survivalTime)}` : ''}`;
        earnedNanites.textContent''',
        "frôlements dans les statistiques de fin de partie",
    )

    # ============================================================
    # 14. Version du titre
    # ============================================================

    html = html.replace(
        "<title>Nébuleuse Protocol IV</title>",
        "<title>Nébuleuse Protocol IV — v4.1</title>",
        1,
    )

    # ============================================================
    # Écriture du fichier final
    # ============================================================

    output_path = source_path.with_name("nebuleuse-v4.1.html")
    output_path.write_text(html, encoding="utf-8")

    print()
    print("✅ Nébuleuse Protocol IV v4.1 généré avec succès.")
    print(f"📄 Fichier : {output_path.resolve()}")
    print()
    print("Améliorations installées :")
    print("  • système de frôlements")
    print("  • chaîne de frôlements")
    print("  • gain d'énergie NOVA par frôlement")
    print("  • vibrations mobiles")
    print("  • reprise avec compte à rebours")
    print("  • rendu adaptatif pour les appareils modestes")
    print("  • interface paysage améliorée")
    print("  • HUD limité à 30 mises à jour par seconde")
    print("  • correction du paiement multiple des nanites")
    print("  • accessibilité et réduction des animations")
    print()


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(error)
        raise SystemExit(1)
