      // ============================================================
      // MODULE V5.22 — BANDE-SON « NÉBULEUSE » (morceaux Suno choisis par le joueur-auteur)
      // 31 morceaux retenus sur la page d'écoute (tri et commentaires du 27/09), affectés
      // aux situations de jeu : menu, ouverture, combat par palier, transitions, boss par
      // acte, boss final, phénomènes épiques ou contemplatifs, accalmies et routes,
      // pause, triomphe après un boss, défaite, victoire finale, récompenses, jingles.
      // Lecture en continu (HTMLAudioElement → Web Audio) : rien n'est décodé en mémoire,
      // seuls les morceaux joués sont téléchargés. Fondus enchaînés entre deux platines,
      // reprise à la même position au retour d'une pause ou d'un phénomène, rotation dans
      // chaque réservoir pour la variété, volume harmonisé morceau par morceau (mesuré).
      // Hors ligne ou en échec de lecture, la bande-son studio reprend automatiquement.
      // ============================================================
      (() => {
        const G = window.__NP4;
        const DIR = 'assets/music/game/';
        // id → fichier, niveau RMS mesuré (dBFS, mono 8 kHz), point de reprise en boucle (s)
        const T = {
          balisesA: ['les-balises-oubliees--142ca66c', -14.6], balisesB: ['les-balises-oubliees--da151360', -16.2],
          attenteA: ['attente--653e5e67', -16.4], attenteB: ['attente--76cab261', -16.0],
          signalA: ['traversee-du-signal--ba8e8ace', -16.0], signalB: ['traversee-du-signal--d8d0dc5a', -16.7],
          signalC: ['traversee-du-signal--89c06c8b', -17.0], signalD: ['traversee-du-signal--8f157209', -17.6],
          signalE: ['traversee-du-signal--155599ac', -15.4], signalF: ['traversee-du-signal--c3cfb514', -17.5],
          signalG: ['traversee-du-signal--3dd8c00e', -17.3], signalH: ['traversee-du-signal--4a7ea351', -17.9],
          signalI: ['traversee-du-signal--4969bf24', -18.4], signalJ: ['traversee-du-signal--6f103977', -20.0],
          reveA: ['reve-lucide--af7332ca', -16.4], reveB: ['reve-lucide--f70b0c0d', -18.6],
          gardienA: ['le-gardien-de-la-faille-boss--1d673ecc', -17.1], gardienB: ['le-gardien-de-la-faille-boss--693e03f2', -16.2],
          gardienC: ['le-gardien-de-la-faille-boss--a0f1a99e', -16.8], gardienD: ['le-gardien-de-la-faille-boss--d4f4710d', -18.1],
          gardienE: ['le-gardien-de-la-faille-boss--c8ce40e3', -18.3], gardienF: ['le-gardien-de-la-faille-boss--e900b0b5', -18.4],
          victoireA: ['victoire-1--45816c55', -15.4], victoireB: ['victoire-1--fe55fd84', -15.9],
          victoireC: ['victoire-1--84a62922', -15.2], victoireE: ['victoire-1--60b53f6d', -19.4],
          victoireF: ['victoire-1--f40dadb4', -16.8],
          defaiteA: ['defaite-du-joueur--168a5c5c', -17.5], defaiteB: ['defaite-du-joueur--cc77a820', -16.8],
          tresor: ['dudu-didole-didole-dkddn--84a80c47', -22.1], apaisement: ['dudu-didole-didole-dkddn--88f61a1a', -22.4]
        };
        // Réservoirs par situation. start : départ dans le morceau (tous montent en puissance
        // sur 30 à 60 s : les boss et les combats durs démarrent dans la partie déjà dense).
        // seq : ordre imposé (sinon rotation sans répéter le dernier). hold : dernier morceau en boucle.
        const CUES = {
          menu: { pool: ['balisesA', 'balisesB'], start: 0 },               // « Générique/menu »
          reward: { pool: ['victoireC'], start: 45 },                        // « gain de pièces »
          opening: { pool: ['signalC', 'signalD'], start: 0, seq: true },   // « Générique. Plutôt au début » puis combat léger
          combat1: { pool: ['signalD', 'signalC'], start: 0 },              // « Combat simple/léger »
          combat2: { pool: ['signalG', 'signalH'], start: 20 },             // « médium… en transitions entre deux scènes importantes »
          combat3: { pool: ['signalE', 'signalF'], start: 60 },             // « Combat difficile / intense. Nombreux ennemis »
          explore: { pool: ['signalB', 'signalI', 'signalJ'], start: 0 },   // « Exploration/contemplation », « Découverte »
          phenEpic: { pool: ['reveA', 'victoireE'], start: 20 },            // « Contemplation active. Épique. »
          phenCalm: { pool: ['reveB'], start: 0 },                          // « Contemplation. Solitaire. Lente. »
          bossSmall: { pool: ['gardienD'], start: 20 },                     // « Petit boss. Musique épique. »
          boss: { pool: ['gardienA', 'gardienB'], start: 30 },
          bossLate: { pool: ['gardienE', 'victoireA'], start: 45 },
          final: { pool: ['gardienC'], start: 30 },                         // « Fait penser à Inception »
          triumph: { pool: ['victoireB', 'gardienF'], start: 75 },          // rôle « victoire »
          pause: { pool: ['attenteA', 'attenteB', 'balisesB'], start: 0 },  // « musique d'attente »
          defeat: { pool: ['defaiteA'], start: 0 },
          defeatHeavy: { pool: ['defaiteB'], start: 0 },                    // « Défaite écrasante. Ennemis en nombre. »
          ending: { pool: ['victoireF', 'signalA'], start: 0, seq: true, hold: true } // « Cinématique » puis « Générique joyeux »
        };
        const PHEN_EPIC = { supernova: 1, armada: 1, regard: 1, ver: 1, faille: 1, eclipse: 1 };
        const LOOP_AT = 30; // un morceau seul dans son réservoir reprend après son introduction
        const FADE = 1.8;

        if (meta.musicPick !== true) meta.musicStyle = 'suno';
        { const sel = $('scoreStyle18'); if (sel) sel.value = meta.musicStyle; }
        const wanted = () => meta.musicStyle === 'suno';
        let bus = null, decks = [], sting = null, active = null, curCue = '', live = true, fails = 0;
        let unlocked = false, bossSeen = null, triumphT = 0, transT = 0, lastEnemies = 0, prevState = '', heavy = false;
        let prevInterlude = 0, chestSeen = false, failAt = 0;
        const lastIdx = Object.create(null), seqIdx = Object.create(null), left = Object.create(null);
        const played = [];

        const gainOf = (k) => Math.max(0.55, Math.min(1.4, Math.pow(10, (-17.5 - T[k][1]) / 20)));
        const url = (k) => DIR + T[k][0] + '.mp3';

        function makeDeck(ctx) {
          const el = new Audio();
          el.preload = 'none';
          el.crossOrigin = 'anonymous';
          const g = ctx.createGain();
          g.gain.value = 0;
          let src = null;
          try { src = ctx.createMediaElementSource(el); src.connect(g); } catch (e) { return null; }
          g.connect(bus);
          const d = { el, g, key: '', cue: '', want: false, timer: 0 };
          el.addEventListener('ended', () => { if (d === active) onEnded(d); });
          el.addEventListener('playing', () => { d.ok = true; fails = 0; live = true; });
          el.addEventListener('error', () => { if (d.want) failed(d); });
          return d;
        }
        function ensure() {
          if (bus || !AudioSys.ctx || !AudioSys.musicGain) return !!bus;
          const ctx = AudioSys.ctx;
          if (!ctx.createMediaElementSource || typeof Audio === 'undefined') { live = false; return false; }
          bus = ctx.createGain();
          bus.gain.value = 1;
          bus.connect(AudioSys.musicGain);
          decks = [makeDeck(ctx), makeDeck(ctx)];
          sting = makeDeck(ctx);
          if (decks.some((d) => !d) || !sting) { live = false; bus = null; return false; }
          AudioSys.__sunoBus = bus;
          return true;
        }
        const safePlay = (el) => { try { const p = el.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {} };

        // iOS : un élément média ne peut démarrer hors geste qu'après une première lecture dans un geste
        function unlock() {
          if (unlocked || !wanted()) return;
          AudioSys.init();
          if (!ensure()) return;
          unlocked = true;
          for (const d of decks.concat(sting)) {
            if (d.key) continue;
            d.el.src = url('balisesA');
            d.el.muted = true;
            safePlay(d.el);
            d.el.pause();
            d.el.muted = false;
          }
          tick();
        }
        ['pointerdown', 'touchend', 'keydown'].forEach((ev) => window.addEventListener(ev, unlock, { capture: true, passive: true }));

        function ramp(d, v, dur) {
          const t = AudioSys.ctx.currentTime;
          d.g.gain.cancelScheduledValues(t);
          d.g.gain.setValueAtTime(d.g.gain.value, t);
          d.g.gain.linearRampToValueAtTime(v, t + dur);
        }
        function stop(d, dur) {
          if (!d || !d.key) return;
          d.want = false;
          ramp(d, 0, dur);
          clearTimeout(d.timer);
          d.timer = setTimeout(() => { if (!d.want) d.el.pause(); }, dur * 1000 + 120);
        }
        function failed(d) {
          d.want = false;
          if (++fails >= 2) { live = false; failAt = performance.now(); } // la bande-son studio reprend (v518 : syncMix)
          if (d === active) { active = null; curCue = ''; }
        }
        function start(d, key, cueName, at) {
          d.want = true; d.ok = false; d.cue = cueName;
          clearTimeout(d.timer);
          if (d.key !== key) {
            d.key = key;
            d.el.src = url(key);
            d.el.preload = 'auto';
          }
          const seek = () => { try { d.el.currentTime = at; } catch (e) {} };
          if (d.el.readyState >= 1) seek(); else d.el.addEventListener('loadedmetadata', seek, { once: true });
          d.g.gain.value = 0;
          safePlay(d.el);
          ramp(d, gainOf(key), FADE);
          // pas de son au bout de 9 s (réseau coupé, fichier absent) : échec
          d.timer = setTimeout(() => { if (d.want && !d.ok && d.el.paused) failed(d); }, 9000);
          played.push(key);
          if (played.length > 40) played.shift();
        }

        function pickKey(name) {
          const c = CUES[name];
          if (c.seq) {
            const i = seqIdx[name] || 0;
            seqIdx[name] = c.hold ? Math.min(i + 1, c.pool.length - 1) : (i + 1) % c.pool.length;
            return c.pool[i];
          }
          let i = Math.floor(Math.random() * c.pool.length);
          if (c.pool.length > 1 && i === lastIdx[name]) i = (i + 1) % c.pool.length;
          lastIdx[name] = i;
          return c.pool[i];
        }
        function play(name) {
          if (!ensure() || !CUES[name]) return;
          const prev = active;
          if (prev && curCue) left[curCue] = { key: prev.key, t: prev.el.currentTime || 0, at: performance.now() };
          curCue = name;
          const back = left[name];
          let key, at;
          if (back && performance.now() - back.at < 120000) { key = back.key; at = back.t; } // reprise
          else { key = pickKey(name); at = CUES[name].start; }
          if (prev && prev.key === key && prev.want) { prev.cue = name; return; } // même morceau : on continue
          const next = decks[0] === prev ? decks[1] : decks[0];
          stop(prev, FADE);
          start(next, key, name, at);
          active = next;
        }
        function onEnded(d) {
          const c = CUES[d.cue];
          if (!c) return;
          if (c.pool.length > 1 || c.seq) { curCue = ''; delete left[d.cue]; play(d.cue); return; }
          try { d.el.currentTime = LOOP_AT; } catch (e) {}
          safePlay(d.el);
        }
        function jingle(key, dur) {
          if (!ensure() || !unlocked) return;
          for (const d of decks) if (d.want) ramp(d, gainOf(d.key) * 0.35, 0.4);
          start(sting, key, 'jingle', 0);
          clearTimeout(sting.end);
          sting.end = setTimeout(() => {
            stop(sting, 1.5);
            for (const d of decks) if (d.want) ramp(d, gainOf(d.key), 1.5);
          }, dur * 1000);
        }

        // ---------- directeur : situation de jeu → réservoir ----------
        const vis = (id) => { const el = $(id); return !!el && !el.classList.contains('hidden'); };
        function act() { try { return G.v13.acte() || 1; } catch (e) { return 1; } }
        function tier() {
          const a = act();
          let t = mode === 'survie' || mode === 'ascension' ? (wave >= 15 ? 3 : wave >= 6 ? 2 : 1)
            : a >= 4 ? 3 : a >= 2 ? 2 : transT > 0 ? 2 : 1;
          const d = G.density && G.density.level ? G.density.level() : 'intense';
          if (d === 'dechaine') t = Math.min(3, t + 1);
          return t;
        }
        function situation() {
          if (state === 'menu') return vis('chestOverlay') || vis('missionsOverlay') ? 'reward' : vis('carnetOverlay') ? 'explore' : 'menu';
          if (state === 'paused') return 'pause';
          if (state === 'photo') return curCue || 'explore';
          if (state === 'route') return 'explore';
          if (state === 'gameover') return heavy ? 'defeatHeavy' : 'defeat';
          if (state === 'victory') return 'ending';
          if (state !== 'playing' && state !== 'countdown') return curCue || 'menu';
          const b = boss && enemies.includes(boss) ? boss : null;
          if (b) return b.finalBoss ? 'final' : act() >= 4 ? 'bossLate' : act() >= 2 ? 'boss' : wave <= 5 ? 'bossSmall' : 'boss';
          if (triumphT > 0) return 'triumph';
          const ph = G.phen && G.phen.active && G.phen.active();
          if (ph) return PHEN_EPIC[ph.id] ? 'phenEpic' : 'phenCalm';
          if (mode === 'campagne' && act() === 1 && wave <= 2 && transT <= 0) return 'opening';
          return 'combat' + tier();
        }
        let lastTick = performance.now();
        function tick() {
          const now = performance.now(), dt = Math.min(1, (now - lastTick) / 1000);
          lastTick = now;
          if (triumphT > 0) triumphT -= dt;
          if (transT > 0) transT -= dt;
          // événements
          const b = boss && enemies.includes(boss) ? boss : null;
          if (state === 'playing') {
            if (bossSeen && !b && !bossSeen.finalBoss) { triumphT = 22; transT = 110; }
            lastEnemies = enemies.length;
          }
          bossSeen = state === 'playing' ? b : bossSeen && state === 'paused' ? bossSeen : null;
          if (state === 'gameover' && prevState !== 'gameover') heavy = lastEnemies >= 10 || act() >= 3;
          if ((state === 'playing' || state === 'countdown') && prevState === 'menu') { // nouvelle partie
            triumphT = 0; transT = 0; seqIdx.opening = 0; seqIdx.ending = 0;
            for (const k in left) delete left[k];
          }
          prevState = state;
          let inter = 0;
          try { inter = G.v13.interlude(); } catch (e) {}
          if (state === 'playing' && inter > 0 && prevInterlude <= 0 && live && wanted()) jingle('apaisement', 8);
          prevInterlude = inter;
          const chest = vis('chestOverlay');
          if (chest && !chestSeen && live && wanted()) jingle('tresor', 10);
          chestSeen = chest;

          // v5.25 : le Réalisateur fait respirer le volume (souffle plus doux, déferlante pleine)
          if (bus && G && G.director) bus.gain.setTargetAtTime(G.director.musicMul(), AudioSys.ctx.currentTime, 1.2);

          if (!wanted() || !unlocked) { if (active) { stop(active, 0.6); active = null; curCue = ''; } return; }
          const silent = document.hidden || AudioSys.muted;
          if (silent) { for (const d of decks.concat(sting)) if (d.want && !d.el.paused) d.el.pause(); return; }
          for (const d of decks) if (d.want && d.el.paused && d.ok) safePlay(d.el);
          if (!live) {
            // nouvel essai toutes les 90 s (retour du réseau) ; la bande-son studio joue entre-temps
            if (now - failAt > 90000 && navigator.onLine !== false) { live = true; fails = 0; } else return;
          }
          const s = situation();
          if (s !== curCue) play(s);
        }
        setInterval(tick, 400);

        // v518 consulte cet état pour couper la bande-son studio
        AudioSys.__sunoLive = () => wanted() && live && unlocked;

        if (G) G.suno = {
          cues: () => JSON.parse(JSON.stringify(CUES)),
          tracks: () => Object.keys(T).map((k) => ({ key: k, file: url(k), gain: +gainOf(k).toFixed(3) })),
          situation, tick, cue: () => curCue, live: () => live, unlocked: () => unlocked,
          now: () => (active ? { key: active.key, cue: active.cue, t: active.el.currentTime } : null),
          played: () => played.slice(), unlock, setLive: (v) => { live = !!v; fails = 0; },
          triumph: () => triumphT, heavy: () => heavy
        };
      })();
