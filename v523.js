      // ============================================================
      // MODULE V5.23 — CANON LOURD À LA DEMANDE
      // Retour de jeu (27/09) : en tir automatique, le canon à rail du TITAN partait à
      // chaque salve (≈ 0,6 s), écrasait les ennemis et son tir devenait lassant.
      // A. Le canon lourd devient une munition rare : des obus, tirés au bouton CANON
      //    (ancien bouton NOVA, touche C), comme la bombe. Une salve de 3 obus perçants
      //    (5 pour le TITAN), avec explosion au niveau 2 du vaisseau.
      // B. Obus gagnés par une capsule « O » : garantie à la chute d'un boss, 30 % sur un
      //    mini-boss, 4 % sur un blindé ou une élite. 3 obus au plus ; 1 au départ (2 pour le TITAN).
      // C. La NOVA n'a plus de bouton : elle se déclenche d'elle-même quand l'énergie est
      //    pleine (frôler les tirs la charge toujours). Missions, succès et prototypes NOVA
      //    restent valables.
      // ============================================================
      (() => {
        const G = window.__NP4;
        const MAX = 3;
        const isTitan = () => (meta.ship || 0) === 2;
        let salvo = 0, salvoT = 0, fired = 0;

        const nova = doSpecial; // chaîne complète (missions, succès, prototypes)

        function doCannon() {
          if (state !== 'playing' || !player || !player.alive || (player.cannon || 0) <= 0 || salvo > 0) return;
          player.cannon--;
          salvo = isTitan() ? 5 : 3;
          salvoT = 0;
          fired++;
          addText(player.x, player.y - 44, 'CANON', '#fdba74');
          vibrate([25, 20, 25]);
          updateHUD();
        }
        function shoot() {
          const sig = window.__np4Sig23;
          if (!sig || !player || !player.alive) { salvo = 0; return; }
          const lvl = sig.level(meta.ship || 0);
          const dmg = (12 + player.weapon * 3) * (isTitan() ? 3 : 2.5);
          const off = salvo % 2 ? 0 : (salvo % 4 === 0 ? -9 : 9);
          sig.rail(player.x + off, player.y - 20, dmg, lvl >= 2 || isTitan() ? 75 : 0);
          shake = Math.max(shake, 0.3);
          if (AudioSys.playSfx) AudioSys.playSfx('subhit', 0.8, 0.9 + Math.random() * 0.2);
          if (AudioSys.tone && AudioSys.ctx) AudioSys.tone({ freq: 120 + Math.random() * 30, slide: -70, dur: 0.22, type: 'sawtooth', gain: 0.07, filterFreq: 900, filterEnd: 180 });
        }
        doSpecial = doCannon;

        // capsule « O » : obus de canon
        const baseKill23 = killEnemy;
        killEnemy = function (index, ...rest) {
          const e = enemies[index];
          const r = baseKill23.call(this, index, ...rest);
          if (!e || !player || enemies[index] === e) return r; // pas réellement détruit
          const p = e.type === 'boss' ? 1 : e.type === 'miniboss' ? 0.3 : e.type === 'tank' || e.type === 'elite' ? 0.04 : 0;
          if (p && Math.random() < p) dropPowerup(e.x, e.y + 16, 'O');
          return r;
        };
        const baseApply23 = applyPowerup;
        applyPowerup = function (p) {
          if (p.type !== 'O') return baseApply23(p);
          AudioSys.power();
          if ((player.cannon || 0) >= MAX) { addScore(500); addText(player.x, player.y - 34, 'OBUS MAX', '#fdba74'); return; }
          player.cannon = (player.cannon || 0) + 1;
          addText(player.x, player.y - 34, 'OBUS +1', '#fdba74');
          updateHUD();
        };
        const basePC23 = powerColor;
        powerColor = function (t) { return t === 'O' ? '#fdba74' : basePC23(t); };

        const baseStart23 = startGame;
        startGame = function (...a) {
          salvo = 0;
          baseStart23.apply(this, a);
          if (player) player.cannon = isTitan() ? 2 : 1;
          updateHUD();
        };

        const baseHUD23 = updateHUD;
        updateHUD = function () {
          baseHUD23();
          if (typeof specialBtn !== 'undefined' && player) specialBtn.classList.toggle('ready', (player.cannon || 0) > 0);
        };

        const baseUpdate23 = update;
        update = function (dt) {
          baseUpdate23(dt);
          if (state !== 'playing' || !player || !player.alive) return;
          if (salvo > 0) {
            salvoT -= dt;
            if (salvoT <= 0) { shoot(); salvo--; salvoT = 0.2; }
          }
          // NOVA automatique à énergie pleine
          if (player.energy >= 100 && enemies.length) nova();
          const n = player.cannon || 0;
          specialBtn.dataset.status = `${n} · C`;
          specialBtn.setAttribute('aria-label', n ? `Canon lourd, ${n} obus, touche C` : 'Canon lourd, aucun obus');
          specialBtn.setAttribute('aria-disabled', String(!n));
        };

        if (G) G.sig = window.__np4Sig23;
        if (G) G.cannon = { caps: () => powerups.filter((p) => p.type === 'O').length, apply: (t) => applyPowerup({ type: t }), fire: () => doCannon(), count: () => (player ? player.cannon || 0 : 0), set: (n) => { player.cannon = n; }, fired: () => fired, salvo: () => salvo, nova: () => nova() };
      })();
