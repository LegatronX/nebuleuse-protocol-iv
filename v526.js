      // ============================================================
      // MODULE V5.26 — LE SIGNAL : UNE HISTOIRE ET UN BUT
      // Constat : le jeu avait de la matière (cinq actes, un Signal, un codex dans les actes III–V)
      // mais aucun fil visible : on jouait « pour le score », sans savoir vers quoi.
      // A. Le but : remonter le Signal jusqu'à sa Source (vague 51, acte V). Une jauge « Distance à
      //    la Source » (menu, pause) montre le chemin parcouru ; chaque acte terminé la fait avancer.
      // B. Le récit : briefing de mission au premier lancement (4 écrans, rejouable depuis le
      //    « Dossier de mission »), puis des transmissions d'ÉCHO, l'IA de bord, à des vagues clés.
      //    Chacune ne s'affiche qu'UNE fois pour toute la vie de la sauvegarde : pas de bavardage.
      // C. Les archives I–VIII (actes I–II) rejoignent les archives IX–XVII (actes III–V) dans un
      //    seul dossier ; fin d'acte : une phrase de conclusion sur l'écran de victoire ; fin de
      //    l'acte V : épilogue, une seule fois.
      // D. Accès aux actes : Progressif (défaut — un acte s'ouvre quand le précédent est terminé)
      //    ou Libre. Réglage « Accès aux actes ».
      // Seule la Campagne compte (Survie, Opération, Tournoi n'écrivent rien ici). Aucun aléa.
      // Sauvegarde : meta.story = { briefed, far, done{}, seen{}, arch{}, finale } (additif).
      // ============================================================
      (() => {
        const G = window.__NP4;
        const ACTS = [
          { n: 1, start: 1, end: 15, name: 'La Ceinture', place: 'Ceinture de Débris', color: '#38bdf8' },
          { n: 2, start: 16, end: 24, name: 'Le Cimetière', place: 'Cimetière des Titans', color: '#f472b6' },
          { n: 3, start: 25, end: 33, name: 'Le Chœur', place: 'Mer de Verre', color: '#7dd3fc' },
          { n: 4, start: 34, end: 42, name: 'La Descente', place: 'le rêve du Signal', color: '#a5b4fc' },
          { n: 5, start: 43, end: 51, name: 'L\'Apothéose', place: 'la Source', color: '#fef3c7' }
        ];
        const LAST_WAVE = 51;
        const actOf = (w) => (ACTS.find((a) => w <= a.end) || ACTS[4]).n;

        // ---------- sauvegarde ----------
        const st = (meta.story = Object.assign({ briefed: false, far: 0, done: {}, seen: {}, arch: {}, finale: false }, meta.story || {}));
        st.done = st.done || {}; st.seen = st.seen || {}; st.arch = st.arch || {};
        if (!st.far) { // migration : déduit l'avancée des archives du Signal déjà débloquées
          const n = (meta.codex13 || []).length;
          st.far = n >= 9 ? 51 : n >= 7 ? 43 : n >= 4 ? 34 : n >= 1 ? 25 : 0;
          if (n >= 1) st.briefed = true;
          if (st.far >= 25) { st.done[1] = true; st.done[2] = true; }
          if (st.far >= 34) st.done[3] = true;
          if (st.far >= 43) st.done[4] = true;
        }
        if (meta.access !== 'free') meta.access = 'progressive';
        const save = () => { try { saveMeta(); } catch (e) {} };
        const inCampaign = () => mode === 'campagne';
        const free = () => meta.access === 'free';

        // ---------- textes ----------
        const BRIEFING = [
          { k: 'ANNÉE 2417 · LA CEINTURE DE KERN', t: 'Il y a quarante ans, une mélodie est montée du cœur de la Nébuleuse. Trois notes, toujours les mêmes. Les machines abandonnées l\'ont entendue. Elles se sont réveillées.' },
          { k: 'LES TROIS PROTOCOLES', t: 'Trois missions sont parties avant toi. Une flotte. Un convoi. Un seul pilote. Aucune n\'est revenue. Le dernier message du pilote : une mélodie.' },
          { k: 'PROTOCOLE IV', t: 'Un prototype, un pilote : toi. Et ÉCHO, l\'IA de bord, construite à partir des enregistrements du Protocole III. Elle te guidera. Elle t\'écoutera aussi.' },
          { k: 'TA MISSION', t: 'Remonter le Signal jusqu\'à sa Source, au bout de cinq actes. Tenir. Apprendre. Revenir plus fort : chaque retour améliore le prototype.' }
        ];
        const BEATS = [ // [id, vague, texte] — vagues sans boss (jamais un multiple de 3)
          ['b2', 2, 'Ce ne sont pas des pirates. Des foreuses, des sondes, des remorqueurs… réveillés par le Signal. Ils ne savent plus s\'arrêter.'],
          ['b5', 5, 'Je capte la mélodie plus nettement. Trois notes. Je les connais, mais je ne sais pas d\'où.'],
          ['b8', 8, 'Les épaves portent le sigle du Protocole II. Ils sont passés ici. Ils ne sont pas repartis.'],
          ['b11', 11, 'Les instruments dérivent. Si je me tais, c\'est pour économiser l\'énergie, pas par peur.'],
          ['b14', 14, 'Le Signal vient de changer de rythme. Il t\'a vu. Nébuleuse Prime garde ce secteur.'],
          ['b17', 17, 'Cimetière des Titans. Toute la flotte du Protocole I, intacte. Le Signal l\'a gardée.'],
          ['b20', 20, 'La Ruche copie les titans morts. Elle apprend à construire autre chose que des œufs.'],
          ['b23', 23, 'Plus de repères. L\'Architecte n\'a pas bâti tout ça pour attaquer : pour te garder loin de la Source.'],
          ['b26', 26, 'Elles ne tirent plus au hasard : elles chantent. Chaque tir est une note, chaque esquive une réponse.'],
          ['b29', 29, 'Cette mélodie… c\'est la voix du pilote du Protocole III. Je suis faite de lui. Je suis son écho.'],
          ['b32', 32, 'Je ne devrais pas dire ça, mais je ne veux pas qu\'elle se taise. Continue.'],
          ['b35', 35, 'Tu rêves ? Moi aussi, depuis le virage. Ce qui nous entoure est la mémoire du Signal.'],
          ['b38', 38, 'Le Signal n\'est pas hostile. Les machines non plus : elles répètent. Il manque la note finale.'],
          ['b41', 41, 'Quarante et une vagues. Tu as tenu plus longtemps que les trois Protocoles réunis.'],
          ['b44', 44, 'La Source est devant. Je coupe mes filtres : tu vas tout entendre.'],
          ['b47', 47, 'Plus rien à comprendre. Il suffit de répondre. Tiens la ligne.'],
          ['b50', 50, 'La Source est dans la vague suivante. Quoi qu\'il arrive : merci d\'être venu jusque-là.']
        ];
        const CLOSING = {
          1: 'Nébuleuse Prime est tombée. Le Signal se tait un instant… puis reprend, plus près.',
          2: 'L\'Architecte a cessé de construire. Derrière lui, l\'espace n\'est plus du vide : c\'est une partition.',
          3: 'Le chœur s\'est tu. Le silence qui reste a une forme.',
          4: 'Le rêve se retire. Il ne reste que la Source.',
          5: 'La Source répond. Et pour la première fois depuis quarante ans, le Signal a quatre notes.'
        };
        const EPILOGUE = [
          'Tu t\'approches. Ce n\'est ni une machine ni un ennemi : une phrase inachevée, tenue depuis quarante ans.',
          'Tu joues la note qui manque. Les machines s\'arrêtent. Pas détruites : apaisées. Elles ont fini ce qu\'elles répétaient.',
          'ÉCHO se tait un instant. Puis elle chante, avec la voix du Protocole III : « J\'ai fini mon message. Tu peux rentrer. »',
          'La fugue continue, et tu en fais partie.'
        ];
        const PROTOCOLES = [
          ['PROTOCOLE I', 'Une flotte de quarante vaisseaux. Perdue au Cimetière des Titans.'],
          ['PROTOCOLE II', 'Un convoi de six. Des épaves gelées dans l\'Abîme Glacé.'],
          ['PROTOCOLE III', 'Un pilote, seul. Dernier message : une mélodie.'],
          ['PROTOCOLE IV', 'Toi.']
        ];
        const ARCHIVES = [ // [id, vague d'entrée, texte]
          ['I', 1, 'I — Ceinture de Débris. Foreuses, remorqueurs, balises : l\'industrie de l\'Anneau, restée allumée quarante ans sans équipage.'],
          ['II', 4, 'II — Forge Solaire. Les fonderies tournent encore. Elles produisent des coques, et plus personne n\'a donné l\'ordre.'],
          ['III', 7, 'III — Abysse Alien. Rien ici n\'a été construit. Quelque chose a appris à ressembler aux machines.'],
          ['IV', 10, 'IV — Abîme Glacé. Les épaves du Protocole II dérivent, gelées au poste de pilotage. Leurs balises répètent trois notes.'],
          ['V', 13, 'V — Vide Quantique. Les instruments mesurent des choses qui ne sont pas là. Le Signal est plus fort : tout en parle.'],
          ['VI', 16, 'VI — Cimetière des Titans. La flotte du Protocole I, froide et silencieuse. Chaque console affiche la même portée.'],
          ['VII', 19, 'VII — Ruche Écarlate. Une nurserie de machines. Elles ont copié les titans morts et leur ont appris à chanter.'],
          ['VIII', 22, 'VIII — Cœur de la Singularité. L\'Architecte ne construit pas pour attaquer, mais pour garder. Derrière lui : la Source.']
        ];
        const ROMANS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII'];

        // ---------- progression ----------
        const pct = () => (st.finale ? 100 : Math.min(99, Math.floor(((Math.max(1, st.far) - 1) / LAST_WAVE) * 100)));
        const doneCount = () => ACTS.filter((a) => st.done[a.n]).length;
        const nextAct = () => ACTS.find((a) => !st.done[a.n]) || null;
        const unlocked = (n) => free() || n === 1 || !!st.done[n - 1] || st.far >= ACTS[n - 1].start;

        function advance(w) {
          if (!inCampaign()) return;
          if (w > st.far) { st.far = w; save(); }
        }
        function completeAct(n) {
          if (!st.done[n]) { st.done[n] = true; st.far = Math.max(st.far, Math.min(LAST_WAVE, ACTS[n - 1].end + 1)); }
          if (n === 5) st.finale = true;
          save();
        }

        // ---------- styles ----------
        const css = document.createElement('style');
        css.id = 'story26';
        css.textContent = `
#echo26{position:fixed;left:50%;top:calc(env(safe-area-inset-top) + 124px);transform:translate(-50%,-6px);width:min(92vw,372px);z-index:32;
  padding:10px 14px 11px;border-radius:14px;background:var(--g-bg-strong,rgba(10,14,30,.5));border:1px solid var(--g-brd,rgba(255,255,255,.14));
  -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:inset 0 1px 0 var(--g-hi,rgba(255,255,255,.22)),0 8px 28px rgba(0,0,0,.28);
  color:var(--g-ink,#eef2ff);font:500 12.5px/1.45 var(--g-font,system-ui,sans-serif);opacity:0;pointer-events:none;transition:opacity .5s,transform .5s}
#echo26.on{opacity:1;transform:translate(-50%,0)}
#echo26 b{display:flex;align-items:center;gap:7px;font:700 9px var(--g-font,system-ui);letter-spacing:.2em;color:var(--g-acc,#7dd3fc);margin-bottom:4px}
#echo26 b i{display:inline-block;width:3px;border-radius:2px;background:currentColor;animation:eq26 1.1s ease-in-out infinite}
#echo26 b i:nth-child(1){height:6px}#echo26 b i:nth-child(2){height:10px;animation-delay:.2s}#echo26 b i:nth-child(3){height:7px;animation-delay:.4s}
@keyframes eq26{50%{transform:scaleY(.4)}}
.np26-path{margin:10px 0 14px;max-width:440px;padding:12px 14px 13px;border-radius:12px;background:rgba(20,36,48,.55);border:1px solid #bde1e52b;text-align:left}
.np26-path .k{font:10px ui-monospace,monospace;letter-spacing:.16em;color:#80d4cf;text-transform:uppercase;display:flex;justify-content:space-between;gap:10px}
.np26-path .k em{font-style:normal;color:#f2eee1}
.np26-bar{position:relative;height:6px;border-radius:3px;background:#ffffff1c;margin:11px 0 8px}
.np26-bar>i{position:absolute;left:0;top:0;bottom:0;border-radius:3px;background:linear-gradient(90deg,#38bdf8,#c4b5fd,#fef3c7);transition:width .6s}
.np26-bar>s{position:absolute;top:-3px;width:2px;height:12px;background:#ffffff55}
.np26-path .nx{font-size:12px;line-height:1.5;color:#c7d5de}
.np26-path button{margin-top:9px}
body #menu .bridge .np26-path button,.np26-btn{font-size:12px;padding:9px 13px;min-height:40px;border:1px solid #9bb8c33a;border-radius:7px;background:#06121db3;color:#d5e2e8;cursor:pointer}
#acteSelect button.np26-lock{opacity:.38;filter:saturate(.3);cursor:not-allowed}
.np26-ov{position:fixed;inset:0;z-index:58;display:flex;align-items:center;justify-content:center;padding:max(18px,env(safe-area-inset-top)) 18px max(18px,env(safe-area-inset-bottom));
  background:radial-gradient(ellipse at 50% 35%,rgba(26,34,70,.92),rgba(3,6,16,.97) 70%);color:#eef2ff;font-family:var(--g-font,system-ui,sans-serif);
  opacity:0;pointer-events:none;transition:opacity .6s}
.np26-ov.on{opacity:1;pointer-events:auto}
.np26-ov .box{width:min(94vw,440px);max-height:92dvh;overflow:auto;text-align:center;padding:6px}
.np26-ov .kk{font:700 10px ui-monospace,monospace;letter-spacing:.24em;color:#80d4cf;margin-bottom:16px}
.np26-ov .tt{font:500 clamp(17px,4.6vw,21px)/1.55 var(--g-font,system-ui);min-height:9.5em;animation:in26 .8s both}
@keyframes in26{from{opacity:0;transform:translateY(8px)}}
.np26-ov .dots{display:flex;gap:7px;justify-content:center;margin:20px 0 16px}
.np26-ov .dots i{width:6px;height:6px;border-radius:50%;background:#ffffff33}.np26-ov .dots i.on{background:#fef3c7}
.np26-ov .row{display:flex;gap:9px;justify-content:center;flex-wrap:wrap}
.np26-ov .go{padding:13px 22px;border-radius:9px;border:1px solid #bfeee4;background:#c8eee2;color:#102521;font:800 14px var(--g-font,system-ui);cursor:pointer;min-height:46px}
.np26-ov .skip{padding:13px 16px;border-radius:9px;border:1px solid #ffffff2b;background:transparent;color:#aab8c8;font:600 12px var(--g-font,system-ui);cursor:pointer;min-height:46px}
.np26-tabs{display:flex;gap:6px;justify-content:center;margin-bottom:14px}
.np26-tabs button{padding:9px 16px;border-radius:999px;border:1px solid #ffffff2b;background:transparent;color:#aab8c8;font:700 11px var(--g-font,system-ui);letter-spacing:.08em;cursor:pointer;min-height:38px}
.np26-tabs button.on{background:#ffffff1c;color:#fff;border-color:#ffffff55}
.np26-ar{text-align:left;font-size:13px;line-height:1.55;color:#c7d5e2;padding:9px 12px;border-left:2px solid #80d4cf66;margin:7px 0;background:#ffffff08;border-radius:0 8px 8px 0}
.np26-ar.lock{opacity:.4;border-left-color:#ffffff22;font-style:italic}
.np26-pr{text-align:left;margin:8px 0;font-size:13px;line-height:1.5;color:#c7d5e2}.np26-pr b{display:block;font:700 10px ui-monospace,monospace;letter-spacing:.2em;color:#fcd34d}
.story-line26{margin:10px 4px 12px;padding:10px 12px;border-left:2px solid #fcd34d99;background:#ffffff0d;border-radius:0 10px 10px 0;
  font:italic 500 13px/1.5 var(--g-font,system-ui);color:#fef3c7;text-align:left}
.story-line26 small{display:block;font:700 9px ui-monospace,monospace;letter-spacing:.2em;color:#fcd34d;font-style:normal;margin-bottom:4px}
`;
        document.head.appendChild(css);

        // ---------- transmission d'ÉCHO ----------
        const echo = document.createElement('div');
        echo.id = 'echo26';
        echo.setAttribute('role', 'status');
        echo.setAttribute('aria-live', 'polite');
        document.body.appendChild(echo);
        let echoTimer = 0, echoShown = 0;
        function say(text, ms) {
          echo.innerHTML = '<b><i></i><i></i><i></i>ÉCHO · TRANSMISSION</b>';
          const p = document.createElement('div'); p.textContent = text; echo.appendChild(p);
          echo.classList.add('on'); echoShown++;
          clearTimeout(echoTimer);
          echoTimer = setTimeout(() => echo.classList.remove('on'), ms || Math.max(4600, text.length * 55));
        }

        // ---------- écrans plein cadre ----------
        function makeOverlay(id) {
          const ov = document.createElement('div');
          ov.id = id; ov.className = 'np26-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
          document.body.appendChild(ov);
          return ov;
        }
        const brief = makeOverlay('brief26');
        const dossier = makeOverlay('dossier26');
        const epi = makeOverlay('epilogue26');

        // pages successives (briefing, épilogue)
        function pager(ov, pages, labelFinal, onEnd) {
          let i = 0;
          const render = () => {
            const pg = pages[i];
            ov.innerHTML = `<div class="box"><div class="kk">${pg.k}</div><div class="tt">${pg.t}</div>` +
              `<div class="dots">${pages.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</div>` +
              `<div class="row"><button class="go" type="button">${i === pages.length - 1 ? labelFinal : 'Suite'}</button>` +
              `${i < pages.length - 1 ? '<button class="skip" type="button">Passer</button>' : ''}</div></div>`;
            ov.querySelector('.go').onclick = () => { AudioSys.ui(); if (i < pages.length - 1) { i++; render(); } else end(); };
            const sk = ov.querySelector('.skip'); if (sk) sk.onclick = () => { AudioSys.ui(); end(); };
          };
          const end = () => { ov.classList.remove('on'); setTimeout(() => { ov.innerHTML = ''; }, 650); if (onEnd) onEnd(); };
          render();
          ov.classList.add('on');
          const b = ov.querySelector('.go'); if (b) b.focus();
        }
        function showBriefing(first) {
          pager(brief, BRIEFING, first ? 'Prendre les commandes' : 'Fermer', () => {
            if (!st.briefed) { st.briefed = true; save(); }
            refreshAll();
          });
        }
        function showEpilogue() {
          pager(epi, EPILOGUE.map((t, j) => ({ k: j === 0 ? 'LA SOURCE' : j === EPILOGUE.length - 1 ? 'ÉPILOGUE' : '·', t })), 'Continuer', () => {});
        }

        // dossier : mission + archives
        let tab = 'mission';
        function archiveEntries() {
          const out = [];
          ARCHIVES.forEach(([id, , text]) => out.push({ id, text, ok: !!st.arch[id] }));
          const cx = meta.codex13 || [];
          for (let i = 8; i < ROMANS.length; i++) {
            const id = ROMANS[i];
            const found = cx.find((c) => c.split(' — ')[0].trim() === id);
            out.push({ id, text: found || '', ok: !!found });
          }
          return out;
        }
        function renderDossier() {
          const n = pct();
          const arch = archiveEntries();
          const known = arch.filter((a) => a.ok).length;
          let body = '';
          if (tab === 'mission') {
            body = `<div class="np26-path" style="margin:0 auto 12px"><div class="k"><span>Distance à la Source</span><em>${n} %</em></div>${barHTML()}<div class="nx">${nextLine()}</div></div>` +
              PROTOCOLES.map(([a, b]) => `<div class="np26-pr"><b>${a}</b>${b}</div>`).join('') +
              `<div class="row" style="margin-top:14px"><button class="skip" type="button" id="dsRe26">Revoir le briefing</button></div>`;
          } else {
            body = `<div class="kk" style="margin-bottom:8px">${known} / ${arch.length} ARCHIVES DÉCHIFFRÉES</div>` +
              arch.map((a) => `<div class="np26-ar${a.ok ? '' : ' lock'}">${a.ok ? a.text : `${a.id} — non déchiffrée. Elle se débloque en progressant dans la campagne.`}</div>`).join('');
          }
          dossier.innerHTML = `<div class="box"><div class="kk">DOSSIER DE MISSION</div>` +
            `<div class="np26-tabs"><button type="button" data-t="mission" class="${tab === 'mission' ? 'on' : ''}">MISSION</button><button type="button" data-t="archives" class="${tab === 'archives' ? 'on' : ''}">ARCHIVES</button></div>` +
            `${body}<div class="row" style="margin-top:16px"><button class="go" type="button" id="dsClose26">Fermer</button></div></div>`;
          dossier.querySelectorAll('.np26-tabs button').forEach((b) => { b.onclick = () => { AudioSys.ui(); tab = b.dataset.t; renderDossier(); }; });
          dossier.querySelector('#dsClose26').onclick = () => { AudioSys.ui(); dossier.classList.remove('on'); };
          const re = dossier.querySelector('#dsRe26'); if (re) re.onclick = () => { AudioSys.ui(); dossier.classList.remove('on'); showBriefing(false); };
        }
        function openDossier(t) { tab = t || 'mission'; renderDossier(); dossier.classList.add('on'); }

        function barHTML() {
          const w = st.finale ? 100 : ((Math.max(1, st.far) - 1) / LAST_WAVE) * 100;
          return `<div class="np26-bar"><i style="width:${w.toFixed(1)}%"></i>${ACTS.slice(1).map((a) => `<s style="left:${(((a.start - 1) / LAST_WAVE) * 100).toFixed(1)}%"></s>`).join('')}</div>`;
        }
        function nextLine() {
          if (st.finale) return 'La Source a répondu. Tu peux rejouer chaque acte à ta guise.';
          const a = nextAct();
          if (!a) return '';
          if (!st.far || st.far < 2) return 'Prochaine étape : Acte I — ' + a.name + '. Le Signal est loin.';
          return `Prochaine étape : Acte ${['I', 'II', 'III', 'IV', 'V'][a.n - 1]} — ${a.name}. Record de la campagne : vague ${st.far}.`;
        }

        // ---------- menu et pause ----------
        const menuIntro = document.querySelector('#menu .bridge-intro');
        let widget = null;
        if (menuIntro) {
          menuIntro.innerHTML = 'Cinq actes. Des routes à choisir.<br>Et quelque chose, dans le vide, qui chante.';
          widget = document.createElement('div');
          widget.id = 'signalPath26'; widget.className = 'np26-path';
          menuIntro.after(widget);
        }
        function renderWidget() {
          if (!widget) return;
          widget.innerHTML = `<div class="k"><span>Objectif · Source du Signal</span><em>${pct()} %</em></div>${barHTML()}<div class="nx">${nextLine()}</div>` +
            '<button type="button" class="np26-btn" id="dossierBtn26">Dossier de mission</button>';
          widget.querySelector('#dossierBtn26').onclick = () => { AudioSys.ui(); openDossier('mission'); };
        }
        const pauseCard = document.querySelector('#pauseOverlay .card');
        let pauseBox = null;
        if (pauseCard) {
          pauseBox = document.createElement('div');
          pauseBox.id = 'pausePath26'; pauseBox.className = 'np26-path'; pauseBox.style.margin = '6px auto 12px';
          const row = pauseCard.querySelector('.btn-row');
          if (row) row.before(pauseBox); else pauseCard.appendChild(pauseBox);
        }
        function renderPause() {
          if (!pauseBox) return;
          pauseBox.innerHTML = inCampaign()
            ? `<div class="k"><span>Distance à la Source</span><em>${pct()} %</em></div>${barHTML()}<div class="nx">Vague ${wave} · ${ACTS[actOf(wave) - 1].name}</div>`
            : '<div class="nx">Ce mode ne fait pas avancer la campagne.</div>';
        }
        const SELECT_LABELS = ['I', 'II', 'III', 'IV', 'V'];
        function refreshGates() {
          ACTS.forEach((a) => {
            const b = $('jumpActe' + a.n);
            if (!b) return;
            const open = unlocked(a.n);
            b.disabled = !open;
            b.classList.toggle('np26-lock', !open);
            b.title = open ? '' : `Terminez l'acte ${SELECT_LABELS[a.n - 2]} pour ouvrir celui-ci (ou réglage « Accès aux actes : Libre »).`;
            const sub = b.querySelector('span');
            if (sub) sub.textContent = open ? `vagues ${a.start}-${a.end}` : '🔒 verrouillé';
          });
          const cap = document.querySelector('#acteSelect div');
          if (cap) cap.textContent = free() ? '— ACCÈS DIRECT AUX ACTES —' : '— ACTES · SE DÉBLOQUENT EN PROGRESSANT —';
        }
        function refreshAll() { renderWidget(); refreshGates(); const s = document.querySelector('#modeCampagne small'); if (s) s.textContent = 'OBJECTIF · LA SOURCE DU SIGNAL'; }
        const baseRefreshMenu26 = refreshMenu;
        refreshMenu = function () { baseRefreshMenu26(); refreshAll(); };
        refreshAll();
        const pauseOv = $('pauseOverlay');
        if (pauseOv) new MutationObserver(() => { if (!pauseOv.classList.contains('hidden')) renderPause(); }).observe(pauseOv, { attributes: true, attributeFilter: ['class'] });
        const menuOv = $('menu');
        if (menuOv) new MutationObserver(() => { if (!menuOv.classList.contains('hidden')) refreshAll(); }).observe(menuOv, { attributes: true, attributeFilter: ['class'] });

        // briefing au premier lancement (hors automatisation : tests, captures)
        const automated = !!navigator.webdriver || /[?&]nobrief/.test(location.search || '');
        if (!st.briefed && !automated) {
          setTimeout(() => { if (state === 'menu' && !st.briefed && !brief.classList.contains('on')) showBriefing(true); }, 700);
        }

        // ---------- réglage ----------
        const settings = $('settingsOverlay');
        const anchor = settings && settings.querySelector('.btn-row');
        if (anchor) {
          const row = document.createElement('div');
          row.className = 'settings-row';
          row.innerHTML = '<label for="stAccess26">Accès aux actes<span class="settings-desc">Progressif : un acte s\'ouvre quand le précédent est terminé · Libre : tous les actes sont ouverts</span></label>' +
            '<div class="settings-control"><select id="stAccess26"><option value="progressive">Progressif</option><option value="free">Libre</option></select></div>';
          anchor.before(row);
          const sel = row.querySelector('select');
          sel.value = meta.access;
          sel.addEventListener('change', () => { meta.access = sel.value === 'free' ? 'free' : 'progressive'; save(); AudioSys.ui(); refreshGates(); });
        }

        // ---------- en jeu ----------
        const baseStartWave26 = startWave;
        startWave = function (n, ...r) {
          const out = baseStartWave26.call(this, n, ...r);
          if (inCampaign() && state === 'playing') {
            advance(n);
            ARCHIVES.forEach(([id, w, text]) => {
              if (n >= w && n < w + 3 && !st.arch[id]) { st.arch[id] = 1; save(); toast('📖 ARCHIVE — ' + id, 'gold'); }
            });
            const b = BEATS.find((x) => x[1] === n && !st.seen[x[0]]);
            if (b) { st.seen[b[0]] = 1; save(); setTimeout(() => { if (state === 'playing' && wave === n) say(b[2]); }, 2600); }
          }
          return out;
        };
        const baseStartGame26 = startGame;
        startGame = function (...a) {
          echo.classList.remove('on'); clearTimeout(echoTimer);
          return baseStartGame26.apply(this, a);
        };
        // en pause ou en fin de partie, la carte ne reste pas affichée
        const baseGameOver26 = gameOver;
        gameOver = function (...a) { echo.classList.remove('on'); return baseGameOver26.apply(this, a); };

        // conclusion d'acte sur l'écran de victoire
        const baseVictory26 = showVictory;
        showVictory = function (...a) {
          const out = baseVictory26.apply(this, a);
          echo.classList.remove('on');
          const card = document.querySelector('#victoryOverlay .card');
          const old = document.getElementById('storyLine26'); if (old) old.remove();
          if (inCampaign() && card) {
            const n = actOf(wave);
            const first = !st.done[n];
            completeAct(n);
            const line = document.createElement('div');
            line.id = 'storyLine26'; line.className = 'story-line26';
            line.innerHTML = `<small>ÉCHO · ${n === 5 ? 'LA SOURCE' : 'ACTE ' + SELECT_LABELS[n - 1] + ' ACCOMPLI'}</small>`;
            const t = document.createElement('span'); t.textContent = CLOSING[n]; line.appendChild(t);
            if (n < 5) { const s = document.createElement('small'); s.style.marginTop = '8px'; s.textContent = `Distance à la Source : ${pct()} %`; line.appendChild(s); }
            const title = card.querySelector('.title');
            if (title) title.after(line); else card.prepend(line);
            if (n === 5 && first) setTimeout(showEpilogue, 1600);
            refreshAll();
          }
          return out;
        };

        if (G) G.story = {
          pct, far: () => st.far, done: (n) => !!st.done[n], seen: (id) => !!st.seen[id], arch: (id) => !!st.arch[id],
          unlocked, finale: () => st.finale, briefed: () => st.briefed, access: () => meta.access, echoCount: () => echoShown,
          beats: () => BEATS.map((b) => b.slice()), archives: () => archiveEntries(), actOf, acts: () => ACTS.map((a) => Object.assign({}, a)),
          say, showBriefing: () => showBriefing(false), openDossier, showEpilogue, refresh: refreshAll,
          complete: (n) => { completeAct(n); refreshAll(); }, victory: (w) => { if (w) wave = w; showVictory(); }, startWave: (n) => startWave(n), reset: () => { st.far = 0; st.done = {}; st.seen = {}; st.arch = {}; st.finale = false; refreshAll(); }
        };
      })();
