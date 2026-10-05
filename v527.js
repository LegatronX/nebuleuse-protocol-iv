      // ============================================================
      // MODULE V5.27 — BILAN DE FIN DE PARTIE
      // Constat : l'écran de fin ne donnait qu'une pile de chiffres, sans dire quoi faire ensuite.
      // Une partie perdue doit donner envie d'en refaire une. Le bilan répond à quatre questions :
      //   RECORD   à combien de points du record (ou de combien on le bat), avec « presque ! » dès 85 %
      //   CHUTE    où et face à quoi : si un boss était en vie, ce qu'il lui restait de coque
      //   PALIER   la prochaine amélioration du Laboratoire et ce qu'il manque de nanites (ou : achetable
      //            tout de suite, avec un raccourci vers le Laboratoire)
      //   SOURCE   la progression vers la Source du Signal (v5.26) et ce que la partie a fait avancer
      // Le bouton « Rejouer » devient « Revanche » quand un boss a eu raison du joueur. Les détails
      // chiffrés restent disponibles derrière « Détails de la partie » (repliés par défaut).
      // En cours de partie : un repère discret quand le record personnel approche (90 %), puis quand
      // il est battu — une fois chacun par partie.
      // D'autres modules peuvent ajouter une ligne : __NP4.bilan.addRow(() => ({ k, v })).
      // ============================================================
      (() => {
        const G = window.__NP4;
        const fmt = (n) => Math.round(n).toLocaleString('fr-FR');
        const extra = [];
        let farStart = 0, markNear = false, markPassed = false, lastRows = [];

        const css = document.createElement('style');
        css.id = 'bilan27css';
        css.textContent = `
#bilan27{margin:10px 0 12px;display:grid;gap:6px;text-align:left}
#bilan27 .r27{display:grid;grid-template-columns:62px 1fr;gap:10px;align-items:baseline;padding:8px 11px;border-radius:11px;
  background:var(--g-bg,rgba(10,14,30,.34));border:1px solid var(--g-brd,rgba(255,255,255,.14));box-shadow:inset 0 1px 0 var(--g-hi,rgba(255,255,255,.22))}
#bilan27 .r27 b{font:700 9px ui-monospace,monospace;letter-spacing:.18em;color:var(--g-mute,rgba(226,232,255,.62))}
#bilan27 .r27 span{font:500 13px/1.4 var(--g-font,system-ui,sans-serif);color:var(--g-ink,#eef2ff)}
#bilan27 .r27.good span{color:#a7f3d0}#bilan27 .r27.near span{color:#fde68a}#bilan27 .r27.hot span{color:#fda4af}
#bilan27 .r27 u{text-decoration:none;color:var(--g-gold,#fcd34d);font-weight:700}
#statsToggle27{display:block;margin:2px auto 6px;background:none;border:0;color:var(--g-mute,#94a3b8);font:600 11px var(--g-font,system-ui);letter-spacing:.08em;padding:8px 14px;min-height:38px;cursor:pointer}
#finalStats.np27-fold{display:none}
#labEnd27{display:none}#labEnd27.on{display:inline-block}
`;
        document.head.appendChild(css);

        const bossAlive = () => !!(boss && enemies.includes(boss));
        function nextTalent() {
          let pick = null;
          for (const t of TALENTS) {
            const lvl = (meta.talents && meta.talents[t.key]) || 0;
            if (lvl >= t.max) continue;
            const c = t.cost(lvl);
            if (!pick || c < pick.c) pick = { t, lvl, c };
          }
          return pick;
        }

        function buildRows(wasBoss) {
          const rows = [];
          // RECORD
          const prev = sessionBest;
          if (score > 0 && score > prev) {
            rows.push({ k: 'RECORD', v: `Nouveau record ! <u>+${fmt(score - prev)}</u> points`, cls: 'good' });
          } else if (prev > 0) {
            const gap = prev - score, ratio = score / prev;
            rows.push({ k: 'RECORD', v: ratio >= 0.85 ? `Presque ! À <u>${fmt(gap)}</u> points du record` : `À ${fmt(gap)} points du record (${fmt(prev)})`, cls: ratio >= 0.85 ? 'near' : '' });
          } else rows.push({ k: 'RECORD', v: 'Première marque posée : à battre.' });
          // CHUTE
          if (wasBoss) {
            const left = Math.max(1, Math.round((wasBoss.hp / wasBoss.maxHp) * 100));
            rows.push({ k: 'CHUTE', v: `Vague ${wave}, face à ${wasBoss.name}. Il lui restait <u>${left} %</u> de coque.`, cls: left <= 35 ? 'hot' : '' });
          } else rows.push({ k: 'CHUTE', v: `Vague ${wave}${mode === 'survie' ? ` · ${typeof formatTime === 'function' ? formatTime(survivalTime) : ''} de survie` : ''}.` });
          // PALIER
          const nt = nextTalent();
          if (nt) {
            const gap = nt.c - meta.nanites;
            rows.push(gap <= 0
              ? { k: 'PALIER', v: `<u>${nt.t.name}</u> (niv. ${nt.lvl + 1}) est achetable : ${nt.c}⬡.`, cls: 'good', lab: true }
              : { k: 'PALIER', v: `Prochaine amélioration : ${nt.t.name}, il manque <u>${gap}⬡</u>.` });
          }
          // SOURCE
          const S = G && G.story;
          if (S && mode === 'campagne') {
            const adv = Math.max(0, S.far() - farStart);
            rows.push({ k: 'SOURCE', v: `Distance à la Source : <u>${S.pct()} %</u>${adv ? ` · +${adv} vague${adv > 1 ? 's' : ''} gagnée${adv > 1 ? 's' : ''}` : ''}.` });
          }
          extra.forEach((fn) => { try { const r = fn(); if (r) rows.push(r); } catch (e) {} });
          return rows;
        }

        function render(wasBoss) {
          const card = document.querySelector('#gameoverOverlay .card');
          if (!card) return;
          const rows = buildRows(wasBoss);
          lastRows = rows;
          let box = document.getElementById('bilan27');
          if (!box) {
            box = document.createElement('div'); box.id = 'bilan27';
            const fs = document.getElementById('finalScore');
            if (fs) fs.after(box); else card.prepend(box);
          }
          box.innerHTML = rows.map((r) => `<div class="r27 ${r.cls || ''}"><b>${r.k}</b><span>${r.v}</span></div>`).join('');
          // détails repliés
          const st = document.getElementById('finalStats');
          let tg = document.getElementById('statsToggle27');
          if (st && !tg) {
            tg = document.createElement('button'); tg.id = 'statsToggle27'; tg.type = 'button';
            st.before(tg);
            tg.addEventListener('click', () => { const f = st.classList.toggle('np27-fold'); tg.textContent = f ? 'Détails de la partie ▾' : 'Masquer les détails ▴'; AudioSys.ui(); });
          }
          if (st && tg) { st.classList.add('np27-fold'); tg.textContent = 'Détails de la partie ▾'; }
          // revanche, raccourci Laboratoire
          const retry = document.getElementById('retryBtn');
          if (retry) retry.textContent = wasBoss ? 'Revanche' : 'Rejouer';
          const row = card.querySelector('.btn-row');
          let lab = document.getElementById('labEnd27');
          if (row && !lab) {
            lab = document.createElement('button'); lab.id = 'labEnd27'; lab.className = 'btn secondary'; lab.textContent = 'Laboratoire';
            lab.addEventListener('click', () => { toMenu(); openLab(); });
            row.insertBefore(lab, row.children[1] || null);
          }
          if (lab) lab.classList.toggle('on', rows.some((r) => r.lab));
        }

        const baseGameOver27 = gameOver;
        gameOver = function (...a) {
          const b = bossAlive() ? { name: boss.name, hp: boss.hp, maxHp: boss.maxHp || 1 } : null;
          const out = baseGameOver27.apply(this, a);
          if (state === 'gameover') render(b);
          return out;
        };

        const baseStart27 = startGame;
        startGame = function (...a) {
          markNear = markPassed = false;
          const r = baseStart27.apply(this, a);
          const S = G && G.story; farStart = S ? S.far() : 0;
          return r;
        };

        // repère en cours de partie
        const baseUpdate27 = update;
        update = function (dt) {
          baseUpdate27(dt);
          if (state !== 'playing' || !player || !player.alive || !sessionBest || mode === 'operation' || mode === 'tournoi') return;
          if (!markNear && score >= sessionBest * 0.9 && score < sessionBest) {
            markNear = true;
            addText(W / 2, H * 0.36, 'RECORD À ' + fmt(sessionBest - score) + ' POINTS', '#fde68a');
          } else if (!markPassed && score > sessionBest) {
            markPassed = true; markNear = true;
            addText(W / 2, H * 0.36, 'NOUVEAU RECORD', '#fcd34d');
            if (AudioSys.power) AudioSys.power();
          }
        };

        if (G) G.bilan = { rows: () => lastRows.map((r) => Object.assign({}, r)), addRow: (fn) => { extra.push(fn); }, nextTalent: () => { const n = nextTalent(); return n ? { name: n.t.name, level: n.lvl, cost: n.c } : null; }, marks: () => ({ near: markNear, passed: markPassed }) };
      })();
