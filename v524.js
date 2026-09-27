      // ============================================================
      // MODULE V5.24 — CONFORT DE JEU (retours du 27/09, après la v5.23)
      // A. Bonus moins fréquents : depuis les escadrilles (v5.19), 17 % de chances par ennemi
      //    ordinaire donnaient une pluie de capsules. Capsules aléatoires des ennemis
      //    ordinaires : au plus une toutes les 9 s de jeu (4 s pour une élite) ; boss et
      //    mini-boss inchangés, capsules typées (événements, obus) inchangées.
      // B. Jauges (coque, bouclier, énergie, surcharge) : plus en haut à gauche, où le HUD
      //    fantôme les faisait disparaître ; fines jauges verticales en bas à gauche,
      //    au-dessus du bouton CANON, toujours visibles.
      // C. Bouton TIR (mode manuel) : 84 px pour le pouce, viseur dessiné.
      // (La lance NOVA et le grincement de l'Orgue sont assagis dans le code d'origine.)
      // ============================================================
      (() => {
        const G = window.__NP4;
        const GAP = 9, GAP_ELITE = 4;
        let killType = null, killElite = false, lastRandom = -99, skipped = 0, kept = 0;

        // ---------- A. bonus ----------
        const baseKill24 = killEnemy;
        killEnemy = function (index, ...rest) {
          const e = enemies[index];
          killType = e ? e.type : null;
          killElite = !!(e && e.elite);
          try { return baseKill24.call(this, index, ...rest); } finally { killType = null; killElite = false; }
        };
        const baseDrop24 = dropPowerup;
        dropPowerup = function (x, y, type) {
          const ordinary = !type && killType && killType !== 'boss' && killType !== 'miniboss';
          if (ordinary) {
            const gap = killElite || killType === 'elite' ? GAP_ELITE : GAP;
            if (gameTime - lastRandom < gap) { skipped++; return; }
            lastRandom = gameTime;
            kept++;
          }
          return baseDrop24(x, y, type);
        };
        const baseStart24 = startGame;
        startGame = function (...a) { lastRandom = -99; skipped = 0; kept = 0; return baseStart24.apply(this, a); };

        // ---------- B. jauges verticales, C. bouton TIR ----------
        const css = document.createElement('style');
        css.id = 'hud24';
        css.textContent = `
body.playing #hud .mid .panel.bars{position:fixed!important;top:auto!important;right:auto!important;
  left:calc(env(safe-area-inset-left) + 14px)!important;bottom:calc(env(safe-area-inset-bottom) + 96px)!important;
  width:auto!important;min-width:0!important;display:flex!important;align-items:flex-end;gap:8px;padding:8px 10px 5px!important;
  border-radius:12px!important;pointer-events:none;z-index:20}
body.playing #hud .mid .panel.bars.np-ghost{opacity:.92!important}
body.playing #hud .mid .bar-row{position:relative;display:block!important;width:8px;height:66px;margin:0!important}
body.playing #hud .mid .bar-row span{position:absolute!important;left:50%;bottom:0;transform:translateX(-50%);width:auto!important;
  font-size:0!important;line-height:1}
body.playing #hud .mid .bar-row span::after{content:attr(data-l);font:700 8px var(--g-font,system-ui);letter-spacing:0;color:var(--g-mute,#94a3b8)}
body.playing #hud .mid .bar{position:absolute!important;left:50%;bottom:12px;width:52px!important;height:5px!important;margin:0!important;
  transform-origin:0 50%;transform:rotate(-90deg);flex:none!important}
#fireBtn{width:84px!important;height:84px!important;right:14px!important;bottom:calc(env(safe-area-inset-bottom) + 190px)!important}
#fireBtn svg{width:34px;height:34px;display:block;margin:0 auto}
#fireBtn span{font-size:9px}
`;
        document.head.appendChild(css);
        const LETTERS = { coque: 'C', bouclier: 'B', 'énergie': 'É', surcharge: 'S' };
        function labelBars() {
          document.querySelectorAll('#hud .mid .bar-row').forEach((row) => {
            const s = row.querySelector('span');
            if (!s || s.dataset.l) return;
            const name = s.textContent.trim().toLowerCase();
            s.dataset.l = LETTERS[name] || name.charAt(0).toUpperCase();
            row.title = s.textContent.trim();
          });
        }
        labelBars();
        const fb = $('fireBtn');
        if (fb && !fb.dataset.d24) {
          fb.dataset.d24 = '1';
          fb.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg><span>TIR</span>';
          fb.setAttribute('aria-label', 'Tir, maintenir');
        }
        const baseStartW24 = startWave;
        startWave = function (n) { baseStartW24(n); labelBars(); }; // la jauge de surcharge est ajoutée en cours de route

        if (G) G.comfort = { drops: () => ({ kept, skipped }), gap: () => GAP, labelBars };
      })();
