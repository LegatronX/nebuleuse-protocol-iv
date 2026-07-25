      // ============ MODULE V5.13.1 — SÉLECTEUR D'ACTES (accès direct) ============
      (function () {
        const ACTES = [
          { n: 1, label: 'ACTE I', sub: 'vagues 1-15', color: '#38bdf8' },
          { n: 2, label: 'ACTE II', sub: '16-24', color: '#f472b6' },
          { n: 3, label: 'ACTE III', sub: '25-33', color: '#7dd3fc' },
          { n: 4, label: 'ACTE IV', sub: '34-42', color: '#a5b4fc' },
          { n: 5, label: 'ACTE V', sub: '43-51', color: '#fef3c7' }
        ];
        function jumpToActe(n) {
          AudioSys.ui();
          startGame('campagne');
          setTimeout(() => {
            if (n === 2 && window.__NP4 && window.__NP4.v12) window.__NP4.v12.startActe2();
            else if (n >= 3 && window.__NP4 && window.__NP4.v13) window.__NP4.v13.startActe(n);
          }, 80);
        }
        function buildActeSelect() {
          const menu = document.getElementById('menu');
          if (!menu || menu.querySelector('#acteSelect')) return;
          const wrap = document.createElement('div');
          wrap.id = 'acteSelect';
          wrap.style.cssText = 'margin-top:10px;border-top:1px solid rgba(148,163,184,.18);padding-top:8px';
          const cap = document.createElement('div');
          cap.textContent = '— ACCÈS DIRECT AUX ACTES —';
          cap.style.cssText = 'font-size:10px;letter-spacing:2px;color:#94a3b8;margin-bottom:6px';
          wrap.appendChild(cap);
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;gap:5px;justify-content:center;flex-wrap:wrap';
          for (const a of ACTES) {
            const b = document.createElement('button');
            b.className = 'btn secondary';
            b.id = 'jumpActe' + a.n;
            b.innerHTML = `${a.label}<br><span style="font-size:9px;opacity:.75">${a.sub}</span>`;
            b.style.cssText = `padding:6px 8px;font-size:10px;line-height:1.3;border-color:${a.color}66;color:${a.color};min-width:62px`;
            b.addEventListener('click', () => jumpToActe(a.n));
            row.appendChild(b);
          }
          wrap.appendChild(row);
          const card = menu.querySelector('.card');
          if (card) card.appendChild(wrap);
          else menu.appendChild(wrap);
        }
        buildActeSelect();
        // reconstruit si le menu est re-rendu
        const baseShowMenu131 = typeof showMenu === 'function' ? showMenu : null;
        if (baseShowMenu131) {
          showMenu = function () { baseShowMenu131(); buildActeSelect(); };
        }
        if (window.__NP4) window.__NP4.jumpToActe = jumpToActe;
      })();
