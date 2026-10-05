      // ============================================================
      // MODULE V5.29 — FRISSON (le frôlement devient utile) ET COHÉRENCE
      // Constat : frôler un tir rapportait quelques points et un peu d'énergie NOVA (qui part
      // maintenant toute seule) : le geste le plus risqué du jeu n'avait plus d'enjeu lisible.
      // A. Frisson : chaque frôlement remplit une jauge discrète, un arc fin autour du vaisseau.
      //    Pleine, elle déclenche le FRISSON : 6 s de score ×1,5 et de tir 20 % plus vif, puis la jauge
      //    repart de zéro. Sans frôlement pendant 3 s, elle redescend. Danser entre les balles est
      //    récompensé, se cacher en bas de l'écran ne l'est pas.
      //    Équité : désactivé en Opération du jour et en Tournoi (score identique pour tous).
      // B. Cohérence : la version affichée au menu suit la version réelle ; le manuel de vol, la
      //    fiche NOVA du Laboratoire et le bilan décrivent le jeu tel qu'il est (spécial par vaisseau,
      //    NOVA automatique, Frisson).
      // ============================================================
      (() => {
        const G = window.__NP4;
        const VERSION = '5.29';
        const NEED = 100, DUR = 6, GAIN = 3, IDLE = 3, MULT = 1.5, FIRE = 0.8;
        const fixed = () => mode === 'operation' || mode === 'tournoi';
        let meter = 0, active = 0, idle = 0, count = 0, ring = 0;

        // ---------- A. jauge ----------
        const baseGraze29 = registerGraze;
        registerGraze = function (b) {
          const was = !!(b && b.grazed);
          baseGraze29.call(this, b);
          if (was || !b || !b.grazed || fixed() || !player || !player.alive || active > 0) return;
          idle = 0;
          meter = Math.min(NEED, meter + GAIN + Math.min(2, grazeChain * 0.15));
          if (meter >= NEED) trigger();
        };
        function trigger() {
          active = DUR; meter = NEED; count++; ring = 0;
          addText(player.x, player.y - 50, 'FRISSON', '#67e8f9');
          shockwaves.push({ x: player.x, y: player.y, r: 12, max: 120, life: 0.4, maxLife: 0.4 });
          vibrate([20, 30, 20]);
          if (AudioSys.tone && AudioSys.ctx) AudioSys.tone({ freq: 480, slide: 420, dur: 0.38, type: 'sine', gain: 0.05, filterFreq: 2600, filterEnd: 900 });
        }

        const baseScoreMult29 = getScoreMult;
        getScoreMult = function (...a) { return baseScoreMult29.apply(this, a) * (active > 0 ? MULT : 1); };
        const baseFire29 = firePlayer;
        firePlayer = function (...a) {
          baseFire29.apply(this, a);
          if (active > 0 && player) player.fireCd *= FIRE;
        };

        const baseUpdate29 = update;
        update = function (dt) {
          baseUpdate29(dt);
          if (state !== 'playing' || !player || !player.alive) return;
          if (fixed()) { meter = 0; active = 0; return; }
          ring += dt;
          if (active > 0) {
            active = Math.max(0, active - dt);
            meter = NEED * (active / DUR);
          } else {
            idle += dt;
            if (idle > IDLE && meter > 0) meter = Math.max(0, meter - 4 * dt);
          }
        };

        const baseDraw29 = draw;
        draw = function (...a) {
          baseDraw29.apply(this, a);
          if ((state !== 'playing' && state !== 'paused') || !player || !player.alive || fixed() || (meter < 4 && active <= 0)) return;
          const x = player.x, y = player.y;
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.lineCap = 'round';
          if (active > 0) {
            const k = Math.min(1, active / 0.6), p = 0.6 + 0.4 * Math.sin(ring * 9);
            const g = ctx.createRadialGradient(x, y, 6, x, y, 56);
            g.addColorStop(0, `rgba(103,232,249,${0.28 * k})`); g.addColorStop(1, 'rgba(103,232,249,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 56, 0, TAU); ctx.fill();
            ctx.strokeStyle = `rgba(165,243,252,${0.55 * p * k})`; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(x, y, 31 + p * 3, 0, TAU); ctx.stroke();
            ctx.strokeStyle = `rgba(253,230,138,${0.8 * k})`; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(x, y, 36, -Math.PI / 2, -Math.PI / 2 + (active / DUR) * TAU); ctx.stroke();
          } else {
            ctx.strokeStyle = 'rgba(103,232,249,.16)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(x, y, 33, 0, TAU); ctx.stroke();
            ctx.strokeStyle = `rgba(103,232,249,${0.35 + (meter / NEED) * 0.45})`; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(x, y, 33, -Math.PI / 2, -Math.PI / 2 + (meter / NEED) * TAU); ctx.stroke();
          }
          ctx.restore();
        };

        const baseStart29 = startGame;
        startGame = function (...a) { meter = 0; active = 0; idle = 0; count = 0; return baseStart29.apply(this, a); };
        const baseOver29 = gameOver;
        gameOver = function (...a) {
          const out = baseOver29.apply(this, a);
          if (state === 'gameover' && count && typeof finalStats !== 'undefined' && finalStats && !/Frissons/.test(finalStats.innerHTML)) finalStats.innerHTML += `<br>Frissons : ${count}`;
          meter = 0; active = 0;
          return out;
        };
        if (G && G.bilan) G.bilan.addRow(() => (count ? { k: 'FRISSON', v: `${count} Frisson${count > 1 ? 's' : ''} déclenché${count > 1 ? 's' : ''} : la danse a payé.`, cls: 'good' } : null));

        // ---------- B. cohérence ----------
        const ver = document.querySelector('.bridge-version');
        if (ver) ver.textContent = `v${VERSION} · édition Signal`;
        const help = document.querySelector('.flight-help article');
        if (help) {
          const p = help.querySelector('p:not(.bridge-eyebrow)');
          if (p) p.textContent = 'Frôlez les projectiles : l\'arc autour du vaisseau se remplit, et quand il est plein le FRISSON vous embrase 6 s (score ×1,5, tir plus vif). La NOVA part d\'elle-même. Le spécial de votre vaisseau est une charge rare : gardez-la pour les boss. Le dash vous rend brièvement invulnérable ; la bombe nettoie l\'écran quand la situation se referme.';
          const dts = [...help.querySelectorAll('dt')].find((x) => /Canon lourd/.test(x.textContent));
          if (dts) { dts.textContent = 'Spécial du vaisseau'; const dd = dts.nextElementSibling; if (dd) dd.innerHTML = 'SALVE, LANCE, CANON, PHASE, HALO, FAUCHÉE ou SINGULARITÉ · <kbd>C</kbd>'; }
        }
        const nova = TALENTS.find((t) => t.key === 'nova');
        if (nova) nova.desc = '+2 énergie/s par niveau · la NOVA part seule à 100 %';

        if (G) G.frisson = { meter: () => meter, active: () => active, count: () => count, need: () => NEED, dur: () => DUR, mult: () => (active > 0 ? MULT : 1), version: () => VERSION, graze: (n) => { for (let i = 0; i < n; i++) registerGraze({ x: 0, y: 0, r: 3 }); }, set: (m) => { meter = m; if (m >= NEED) trigger(); } };
      })();
