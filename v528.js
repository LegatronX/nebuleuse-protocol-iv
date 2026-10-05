      // ============================================================
      // MODULE V5.28 — HANGAR : SEPT VAISSEAUX, SEPT SILHOUETTES, SEPT SPÉCIAUX
      // Constat : les quatre vaisseaux se distinguaient par leurs chiffres (et leurs fiches), mais en
      // jeu c'était la même flèche recolorée ; le bouton CANON (v5.23) n'avait de sens que pour le
      // TITAN. Cette version relie vaisseaux, spéciaux et histoire.
      // A. Silhouettes : chaque vaisseau a sa forme en jeu (crochet window.__np4DrawShip dans
      //    drawPlayer) : PULSE flèche à ailerons, VECTOR dard, TITAN forteresse à canons, MIRAGE
      //    fantôme à double image, AUBE goutte à halo, FAUCHEUR faux, ÉCLIPSE disque à couronne.
      // B. Trois vaisseaux liés à l'histoire (Protocoles perdus, v5.26) :
      //      AUBE      rescapée du Protocole I     — débloquée en terminant l'Acte I
      //      FAUCHEUR  forgé dans le Protocole II  — débloqué en terminant l'Acte III
      //      ÉCLIPSE   le vaisseau du pilote du Protocole III — débloquée en atteignant la Source
      //    Les quatre premiers gardent leurs seuils de score.
      // C. Un spécial par vaisseau, au bouton C (ex-CANON) ; mêmes charges rares (capsule « O »,
      //    1 au départ, 2 pour TITAN et ÉCLIPSE, 3 au plus) :
      //      PULSE SALVE · VECTOR LANCE · TITAN CANON · MIRAGE PHASE
      //      AUBE HALO · FAUCHEUR FAUCHÉE · ÉCLIPSE SINGULARITÉ
      // D. Armes principales distinctes pour les nouveaux vaisseaux (rayons d'or, plombs courts en
      //    éventail, orbes perçants). Hangar refait : sept fiches, spécial et condition d'accès.
      // Équité : aucune différence entre les modes ; pas d'aléa ajouté dans la logique de jeu
      // (seuls des effets visuels tirent au hasard).
      // ============================================================
      (() => {
        const G = window.__NP4;
        const XP = [0, 400, 1200, 2600];
        const SCORE_UNLOCK = [0, 15000, 60000, 120000];
        const story = () => (G && G.story) || null;
        const doneAct = (n) => { const s = story(); return !!(s && s.done(n)); };

        // ---------- vaisseaux ----------
        SHIPS.push(
          { name: 'AUBE', desc: 'Soutien : tirs d\'or en éventail léger, bouclier qui se régénère plus vite.', speed: 400, hull: 92, shield: 120, bombs: 3, fireMul: 1.06, weapon: 1, colors: ['#fff4c2', '#f59e0b'] },
          { name: 'FAUCHEUR', desc: 'Assaut : plombs courts en éventail, ravageur au contact, fragile de loin.', speed: 455, hull: 84, shield: 72, bombs: 2, fireMul: 1.04, weapon: 1, colors: ['#ffd7de', '#e11d48'] },
          { name: 'ÉCLIPSE', desc: 'Écraseur : orbes perçants, lents et lourds ; un trou noir en réserve.', speed: 335, hull: 118, shield: 112, bombs: 3, fireMul: 1.42, weapon: 1, colors: ['#f5e1ff', '#9333ea'] }
        );
        const META = [
          { role: 'ÉQUILIBRÉ', tag: 'La courbe maîtresse — harmonie parfaite des flux.', accent: '#38bdf8', lore: 'Prototype du Protocole IV, nourri de la mémoire des trois autres.',
            sp: { name: 'SALVE', unit: 'SALVE', icon: 'salve', desc: 'Neuf missiles à tête chercheuse, en trois vagues.' } },
          { role: 'INTERCEPTEUR', tag: 'Une lame jetée dans le vide.', accent: '#e879f9', lore: 'Conçu pour passer entre les tirs — et entre les Protocoles.',
            sp: { name: 'LANCE', unit: 'LANCE', icon: 'lance', desc: 'Un rayon perçant droit devant, 0,7 s : tout ce qu\'il touche fond.' } },
          { role: 'FORTERESSE', tag: 'La montagne qui avance.', accent: '#34d399', lore: 'Un blindé de la flotte du Protocole I, remis en service.',
            sp: { name: 'CANON', unit: 'OBUS', icon: 'cannon', desc: 'Cinq obus perçants ; explosifs dès le niveau 2.' } },
          { role: 'FANTÔME', tag: 'Jamais là où on le touche.', accent: '#a78bfa', lore: 'Expérimental : il a vu le Signal avant tout le monde.',
            sp: { name: 'PHASE', unit: 'PHASE', icon: 'phase', desc: 'Intangible 2,6 s : les tirs te traversent, le temps ralentit.' } },
          { role: 'SOUTIEN', tag: 'Elle ne tire pas pour détruire : pour protéger.', accent: '#fbbf24', lore: 'Rescapée du Protocole I : seule de sa flotte à être revenue.',
            passive: 'Bouclier : régénération +50 %.', unlock: 'Terminer l\'Acte I',
            sp: { name: 'HALO', unit: 'HALO', icon: 'halo', desc: 'Une onde d\'or efface les tirs ennemis, blesse, rend 50 de bouclier.' } },
          { role: 'ASSAUT', tag: 'Court, large, impitoyable : il faut s\'approcher.', accent: '#fb7185', lore: 'Forgé dans les épaves du Protocole II, au Cimetière des Titans.',
            unlock: 'Terminer l\'Acte III',
            sp: { name: 'FAUCHÉE', unit: 'FAUCHÉE', icon: 'faux', desc: 'Un arc de faux balaie l\'écran devant toi : efface les tirs, tranche tout.' } },
          { role: 'ÉCRASEUR', tag: 'Quand elle passe, la lumière s\'arrête.', accent: '#c084fc', lore: 'Le vaisseau du pilote du Protocole III. La mélodie venait de son poste.',
            unlock: 'Atteindre la Source (Acte V)', passive: 'Deux singularités au départ.',
            sp: { name: 'SINGULARITÉ', unit: 'SINGULARITÉ', icon: 'hole', desc: 'Un trou noir attire tirs et ennemis 3,4 s, puis s\'effondre.' } }
        ];
        const idx = () => Math.max(0, Math.min(SHIPS.length - 1, meta.ship | 0));
        const unlockedShip = (i) => i < 4 ? best >= SCORE_UNLOCK[i] : i === 4 ? doneAct(1) : i === 5 ? doneAct(3) : !!(story() && story().finale());
        const lockText = (i) => i < 4 ? `${SCORE_UNLOCK[i].toLocaleString('fr-FR')} PTS` : META[i].unlock.toUpperCase();
        const shipLvl = (i) => { const xp = (meta.shipXp && meta.shipXp[i]) || 0; let l = 0; for (let k = 1; k < XP.length; k++) if (xp >= XP[k]) l = k; return l; };

        // ---------- A. silhouettes ----------
        const P = (c, d) => { c.beginPath(); d(c); c.closePath(); };
        const mirror = (c, f) => { f(1); f(-1); };
        function shapeOf(c, i, c1, c2, t, phase, edge) {
          const g = c.createLinearGradient(0, -24, 0, 20);
          g.addColorStop(0, c1); g.addColorStop(1, c2);
          c.fillStyle = g; c.lineWidth = 1.4; c.strokeStyle = edge || 'rgba(255,255,255,.7)'; c.lineJoin = 'round';
          const fillStroke = () => { c.fill(); c.stroke(); };
          const cockpit = (x, y, rx, ry, col) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = col || 'rgba(8,47,73,.9)'; c.fill(); };
          if (i === 0) { // PULSE
            P(c, (k) => { k.moveTo(0, -22); k.lineTo(14, 12); k.lineTo(6, 18); k.lineTo(-6, 18); k.lineTo(-14, 12); }); fillStroke();
            mirror(c, (s) => { P(c, (k) => { k.moveTo(s * 13, 8); k.lineTo(s * 20, 19); k.lineTo(s * 9, 16); }); c.fillStyle = c2; fillStroke(); });
            c.beginPath(); c.moveTo(0, -18); c.lineTo(0, 14); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1; c.stroke();
            cockpit(0, -4, 4, 7);
          } else if (i === 1) { // VECTOR
            mirror(c, (s) => { P(c, (k) => { k.moveTo(s * 4, -4); k.lineTo(s * 20, 18); k.lineTo(s * 15, 20); k.lineTo(s * 5, 10); }); c.fillStyle = c2; fillStroke(); });
            mirror(c, (s) => { P(c, (k) => { k.moveTo(s * 3, -13); k.lineTo(s * 11, -8); k.lineTo(s * 4, -6); }); c.fillStyle = c1; fillStroke(); });
            P(c, (k) => { k.moveTo(0, -28); k.lineTo(5.5, -6); k.lineTo(6, 14); k.lineTo(0, 20); k.lineTo(-6, 14); k.lineTo(-5.5, -6); });
            c.fillStyle = g; fillStroke();
            cockpit(0, -10, 2.2, 6);
          } else if (i === 2) { // TITAN
            mirror(c, (s) => { P(c, (k) => { k.rect(s > 0 ? 9 : -13, -25, 4, 16); }); c.fillStyle = c2; fillStroke(); });
            P(c, (k) => { k.moveTo(-10, -15); k.lineTo(-5, -20); k.lineTo(5, -20); k.lineTo(10, -15); k.lineTo(17, -5); k.lineTo(17, 12); k.lineTo(10, 19); k.lineTo(-10, 19); k.lineTo(-17, 12); k.lineTo(-17, -5); });
            c.fillStyle = g; fillStroke();
            c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1.2;
            c.beginPath(); c.moveTo(-8, -13); c.lineTo(-8, 15); c.moveTo(8, -13); c.lineTo(8, 15); c.stroke();
            c.beginPath(); c.rect(-3.5, -9, 7, 11); c.fillStyle = 'rgba(8,47,73,.9)'; c.fill();
          } else if (i === 3) { // MIRAGE
            const ghost = (dx, a) => { c.save(); c.globalAlpha *= a; c.translate(dx, 0); P(c, (k) => { k.moveTo(0, -24); k.lineTo(9, -6); k.lineTo(15, 8); k.lineTo(4, 4); k.lineTo(0, 19); k.lineTo(-4, 4); k.lineTo(-15, 8); k.lineTo(-9, -6); }); c.fillStyle = c2; c.fill(); c.restore(); };
            const sw = 3 + Math.sin(t * 4) * 1.6; ghost(-sw, 0.28); ghost(sw, 0.28);
            P(c, (k) => { k.moveTo(0, -24); k.lineTo(9, -6); k.lineTo(15, 8); k.lineTo(4, 4); k.lineTo(0, 19); k.lineTo(-4, 4); k.lineTo(-15, 8); k.lineTo(-9, -6); });
            c.fillStyle = g; fillStroke();
            c.strokeStyle = edge || c1; c.lineWidth = 1.3; c.globalAlpha *= 0.7;
            mirror(c, (s) => { c.beginPath(); c.moveTo(s * 15, 8); c.quadraticCurveTo(s * 17, 17, s * 11, 25); c.stroke(); });
            c.globalAlpha /= 0.7;
            cockpit(0, -6, 3, 6, 'rgba(46,16,101,.85)');
          } else if (i === 4) { // AUBE
            mirror(c, (s) => { c.beginPath(); c.moveTo(s * 4, -6); c.bezierCurveTo(s * 21, -12, s * 24, 6, s * 14, 16); c.bezierCurveTo(s * 18, 3, s * 12, -2, s * 4, 1); c.closePath(); c.fillStyle = c2; fillStroke(); });
            c.beginPath(); c.moveTo(0, -21); c.bezierCurveTo(10, -12, 10, 4, 0, 18); c.bezierCurveTo(-10, 4, -10, -12, 0, -21); c.closePath();
            c.fillStyle = g; fillStroke();
            c.save(); c.translate(0, 2); c.rotate(-0.25); c.strokeStyle = 'rgba(253,230,138,.75)'; c.lineWidth = 1.3;
            c.beginPath(); c.ellipse(0, 0, 23, 7, 0, 0, Math.PI * 2); c.stroke();
            c.fillStyle = '#fff'; c.beginPath(); c.arc(Math.cos(t * 2.2) * 23, Math.sin(t * 2.2) * 7, 2, 0, Math.PI * 2); c.fill(); c.restore();
            cockpit(0, -6, 3, 4.5, 'rgba(120,53,15,.85)');
          } else if (i === 5) { // FAUCHEUR
            mirror(c, (s) => { c.beginPath(); c.moveTo(s * 4, 0); c.bezierCurveTo(s * 17, 0, s * 24, -10, s * 21, -27); c.bezierCurveTo(s * 15, -18, s * 10, -13, s * 3, -10); c.closePath(); c.fillStyle = c2; fillStroke(); });
            P(c, (k) => { k.moveTo(0, -15); k.lineTo(5.5, 0); k.lineTo(4.5, 14); k.lineTo(0, 20); k.lineTo(-4.5, 14); k.lineTo(-5.5, 0); });
            c.fillStyle = g; fillStroke();
            cockpit(0, -4, 2.2, 5, 'rgba(76,5,25,.9)');
          } else { // ÉCLIPSE
            mirror(c, (s) => { P(c, (k) => { k.moveTo(s * 11, 2); k.lineTo(s * 21, 17); k.lineTo(s * 9, 13); }); c.fillStyle = c2; fillStroke(); });
            P(c, (k) => { k.moveTo(-4, 15); k.lineTo(0, 23); k.lineTo(4, 15); }); c.fillStyle = c2; fillStroke();
            c.beginPath(); c.arc(0, -1, 14, 0, Math.PI * 2); c.fillStyle = g; c.fill(); c.lineWidth = 1.2; c.stroke();
            c.beginPath(); c.arc(2.6, 1.6, 12, 0, Math.PI * 2); c.fillStyle = '#0b0618'; c.fill();
            c.save(); c.globalAlpha *= 0.55 + 0.25 * Math.sin(t * 3); c.strokeStyle = edge || c1; c.lineWidth = 1.1;
            c.beginPath(); c.arc(0, -1, 17.5, Math.PI * 1.05, Math.PI * 1.75); c.stroke(); c.restore();
          }
          if (phase) { c.save(); c.strokeStyle = 'rgba(196,181,253,.6)'; c.setLineDash([3, 4]); c.lineWidth = 1.4; c.beginPath(); c.arc(0, 0, 25 + Math.sin(t * 9) * 1.5, 0, Math.PI * 2); c.stroke(); c.restore(); }
        }
        // appelé par drawPlayer (index.html) ; renvoie true quand la silhouette est dessinée
        window.__np4DrawShip = function (c, pl, c1, c2) {
          const i = idx();
          if (i > SHIPS.length - 1) return false;
          const ph = phase28 > 0;
          if (ph) c.globalAlpha = Math.min(c.globalAlpha, 0.55);
          shapeOf(c, i, c1, c2, globalTime, ph);
          return true;
        };

        // ---------- visuels du hangar (fiches et menu) ----------
        const artCache = {};
        function art(i) {
          if (i < 4) return `assets/ship-${['pulse', 'vector', 'titan', 'mirage'][i]}.webp`;
          if (artCache[i] !== undefined) return artCache[i];
          let url = '';
          try {
            const cv = document.createElement('canvas'); cv.width = 440; cv.height = 340;
            const c = cv.getContext('2d');
            const m = META[i];
            const bgGrad = c.createRadialGradient(220, 175, 10, 220, 175, 190);
            bgGrad.addColorStop(0, m.accent + '55'); bgGrad.addColorStop(1, 'rgba(0,0,0,0)');
            c.fillStyle = bgGrad; c.fillRect(0, 0, 440, 340);
            c.strokeStyle = m.accent + '55'; c.lineWidth = 1;
            for (const r of [150, 120]) { c.beginPath(); c.arc(220, 175, r, 0, Math.PI * 2); c.stroke(); }
            c.beginPath(); c.moveTo(220, 12); c.lineTo(220, 328); c.moveTo(40, 175); c.lineTo(400, 175); c.setLineDash([3, 7]); c.stroke(); c.setLineDash([]);
            c.save(); c.translate(220, 180); c.scale(6.4, 6.4);
            c.globalCompositeOperation = 'lighter';
            const eg = c.createRadialGradient(0, 16, 0, 0, 16, 24); eg.addColorStop(0, m.accent + 'aa'); eg.addColorStop(1, 'rgba(0,0,0,0)');
            c.fillStyle = eg; c.beginPath(); c.arc(0, 16, 24, 0, Math.PI * 2); c.fill();
            c.globalCompositeOperation = 'source-over';
            c.shadowColor = m.accent; c.shadowBlur = 10;
            shapeOf(c, i, '#344058', '#0a0f1c', 1.2, false, m.accent); // même veine que les schémas des quatre premiers
            c.restore();
            url = cv.toDataURL('image/png');
          } catch (e) { url = ''; }
          return (artCache[i] = url);
        }

        // ---------- B. armes principales des nouveaux vaisseaux ----------
        const shots = []; // orbes perçants de l'ÉCLIPSE
        const baseFire28 = firePlayer;
        firePlayer = function (...a) {
          const before = pBullets.length;
          baseFire28.apply(this, a);
          const i = idx();
          if (i < 4 || !player || !player.alive) return;
          const added = pBullets.slice(before);
          if (!added.length) return;
          const d0 = added[0].dmg;
          if (i === 4) { // AUBE : éventail d'or léger
            for (const b of added) { b.dmg *= 0.86; b.color = '#fde68a'; }
            for (const s of [-1, 1]) pBullets.push({ x: player.x + s * 6, y: player.y - 18, vx: s * 150, vy: -740, dmg: d0 * 0.3, r: 3, color: '#fbbf24', life: 1.5 });
          } else if (i === 5) { // FAUCHEUR : plombs courts en éventail
            pBullets.length = before;
            const n = 4 + player.weapon;
            for (let k = 0; k < n; k++) {
              const f = n === 1 ? 0 : (k / (n - 1) - 0.5) * 2;
              pBullets.push({ x: player.x + f * 6, y: player.y - 16, vx: f * 230, vy: -690 + Math.abs(f) * 60, dmg: d0 * 0.4, r: 3.5, color: '#fda4af', life: 0.62 });
            }
          } else if (i === 6) { // ÉCLIPSE : orbes lourds et perçants
            pBullets.length = before;
            const n = player.weapon >= 3 ? 2 : 1;
            for (let k = 0; k < n; k++) {
              const off = n === 1 ? 0 : (k ? 9 : -9);
              shots.push({ x: player.x + off, y: player.y - 20, vy: -540, dmg: d0 * 2.4, r: 8, pierce: 2, hit: new Set(), life: 2.2 });
            }
          }
        };

        // ---------- C. spécial de chaque vaisseau ----------
        const fx = { salvo: 0, salvoT: 0, lance: 0, halo: 0, haloR: 0, haloHit: null, faux: 0, fauxA: 0, fauxHit: null, hole: null };
        let phase28 = 0, used = 0, lastName = '';
        const cannon = doSpecial; // v5.23 : canon du TITAN
        const sparks = (x, y, col, n) => { for (let k = 0; k < n; k++) addParticle(x, y, rand(-120, 120), rand(-120, 120), rand(0.2, 0.5), rand(1.5, 3), col); };
        const hurtEnemy = (j, d) => { const e = enemies[j]; if (!e) return false; e.hp -= d; if (e.hp <= 0) { killEnemy(j); return true; } return false; };

        const special = {
          0: () => { fx.salvo = 3; fx.salvoT = 0; },
          1: () => { fx.lance = 0.7; },
          3: () => { phase28 = 2.6; player.invuln = Math.max(player.invuln, 2.6); slowTime = Math.max(slowTime, 2.6); clearNear(player.x, player.y, 90); sparks(player.x, player.y, '#c4b5fd', 14); },
          4: () => { fx.halo = 0.75; fx.haloR = 10; fx.haloHit = new Set(); player.shield = Math.min(player.maxShield, player.shield + 50); },
          5: () => { fx.faux = 0.5; fx.fauxA = 0; fx.fauxHit = new Set(); },
          6: () => { fx.hole = { x: player.x, y: Math.max(H * 0.2, player.y - 250), t: 3.4, r: 0 }; }
        };
        function clearNear(x, y, r) {
          for (let k = eBullets.length - 1; k >= 0; k--) if (dist2(eBullets[k], { x, y }) < r * r) eBullets.splice(k, 1);
        }
        const needTarget = { 0: true };
        function useSpecial() {
          if (state !== 'playing' || !player || !player.alive || (player.cannon || 0) <= 0) return;
          const i = idx();
          if (i === 2) return cannon();
          if (needTarget[i] && !enemies.length) return;
          if (i === 3 && phase28 > 0) return;
          if (i === 5 && fx.faux > 0) return;
          if (i === 6 && fx.hole) return;
          if (i === 4 && fx.halo > 0) return;
          if (i === 1 && fx.lance > 0) return;
          if (i === 0 && fx.salvo > 0) return;
          player.cannon--; used++;
          special[i]();
          addText(player.x, player.y - 44, META[i].sp.name, META[i].accent);
          vibrate([25, 20, 25]);
          shake = Math.max(shake, 0.25);
          if (AudioSys.special) AudioSys.special();
          updateHUD();
        }
        doSpecial = useSpecial;

        function runSpecials(dt) {
          const px = player.x, py = player.y;
          if (phase28 > 0) phase28 = Math.max(0, phase28 - dt);
          // SALVE : trois vagues de trois missiles
          if (fx.salvo > 0) {
            fx.salvoT -= dt;
            if (fx.salvoT <= 0) { fireHoming(3); fx.salvo--; fx.salvoT = 0.16; }
          }
          // LANCE : rayon vertical
          if (fx.lance > 0) {
            fx.lance = Math.max(0, fx.lance - dt);
            for (let k = eBullets.length - 1; k >= 0; k--) if (Math.abs(eBullets[k].x - px) < 20 && eBullets[k].y < py) eBullets.splice(k, 1);
            for (let j = enemies.length - 1; j >= 0; j--) {
              const e = enemies[j];
              if (e.y < py && Math.abs(e.x - px) < 14 + e.r) hurtEnemy(j, 520 * dt);
            }
            if (Math.random() < 0.6) sparks(px + rand(-10, 10), rand(0, py), '#e0f2fe', 1);
          }
          // HALO : onde d'or
          if (fx.halo > 0) {
            fx.halo = Math.max(0, fx.halo - dt); fx.haloR += (270 / 0.75) * dt;
            for (let k = eBullets.length - 1; k >= 0; k--) {
              const b = eBullets[k];
              if (Math.sqrt(dist2(b, { x: px, y: py })) < fx.haloR) { eBullets.splice(k, 1); if (Math.random() < 0.3) sparks(b.x, b.y, '#fde68a', 2); }
            }
            for (let j = enemies.length - 1; j >= 0; j--) {
              const e = enemies[j];
              if (!fx.haloHit.has(e) && Math.sqrt(dist2(e, { x: px, y: py })) < fx.haloR + e.r) { fx.haloHit.add(e); hurtEnemy(j, 110); }
            }
          }
          // FAUCHÉE : arc balayé de gauche à droite devant le vaisseau
          if (fx.faux > 0) {
            fx.faux = Math.max(0, fx.faux - dt); fx.fauxA = Math.min(1, fx.fauxA + dt / 0.5);
            const a = Math.PI + fx.fauxA * Math.PI; // de 180° (gauche) à 360° (droite), par le haut
            const inBand = (o) => {
              const dx = o.x - px, dy = o.y - py, d = Math.hypot(dx, dy);
              if (d < 70 || d > 215 || dy > 8) return false;
              let ang = Math.atan2(dy, dx); if (ang < 0) ang += Math.PI * 2;
              return Math.abs(ang - a) < 0.42 || (ang < a && ang > Math.PI);
            };
            for (let k = eBullets.length - 1; k >= 0; k--) if (inBand(eBullets[k])) eBullets.splice(k, 1);
            for (let j = enemies.length - 1; j >= 0; j--) {
              const e = enemies[j];
              if (!fx.fauxHit.has(e) && inBand(e)) { fx.fauxHit.add(e); hurtEnemy(j, e.type === 'boss' ? 260 : 320); sparks(e.x, e.y, '#fda4af', 6); }
            }
          }
          // SINGULARITÉ
          if (fx.hole) {
            const h = fx.hole; h.t -= dt; h.r = Math.min(1, h.r + dt * 3);
            for (let k = eBullets.length - 1; k >= 0; k--) {
              const b = eBullets[k], dx = h.x - b.x, dy = h.y - b.y, d = Math.hypot(dx, dy) || 1;
              if (d < 30) { eBullets.splice(k, 1); continue; }
              if (d < 230) { const pull = 260 * dt * (1 - d / 260); b.x += (dx / d) * pull * 2.2; b.y += (dy / d) * pull * 2.2; }
            }
            for (let j = enemies.length - 1; j >= 0; j--) {
              const e = enemies[j], dx = h.x - e.x, dy = h.y - e.y, d = Math.hypot(dx, dy) || 1;
              if (e.type !== 'boss' && e.type !== 'miniboss' && d < 240) { e.x += (dx / d) * 70 * dt; e.y += (dy / d) * 70 * dt; }
              if (d < 130 + e.r) hurtEnemy(j, 80 * dt);
            }
            if (h.t <= 0) {
              shockwaves.push({ x: h.x, y: h.y, r: 10, max: 190, life: 0.5, maxLife: 0.5 });
              for (let j = enemies.length - 1; j >= 0; j--) if (Math.sqrt(dist2(enemies[j], h)) < 170 + enemies[j].r) hurtEnemy(j, 170);
              for (let k = eBullets.length - 1; k >= 0; k--) if (dist2(eBullets[k], h) < 180 * 180) eBullets.splice(k, 1);
              sparks(h.x, h.y, '#c084fc', 24); shake = Math.max(shake, 0.5);
              fx.hole = null;
            }
          }
          // orbes perçants de l'ÉCLIPSE
          for (let k = shots.length - 1; k >= 0; k--) {
            const s = shots[k]; s.y += s.vy * dt; s.life -= dt;
            let dead = s.life <= 0 || s.y < -30;
            if (!dead) for (let j = enemies.length - 1; j >= 0; j--) {
              const e = enemies[j];
              if (s.hit.has(e) || dist2(s, e) > (s.r + e.r) * (s.r + e.r)) continue;
              s.hit.add(e); hurtEnemy(j, s.dmg);
              if (--s.pierce < 0) { dead = true; break; }
            }
            if (dead) shots.splice(k, 1);
          }
        }

        function resetFx() {
          Object.assign(fx, { salvo: 0, salvoT: 0, lance: 0, halo: 0, haloR: 0, haloHit: null, faux: 0, fauxA: 0, fauxHit: null, hole: null });
          phase28 = 0; shots.length = 0;
        }

        // rendu des effets (au-dessus du jeu, sous l'interface)
        const baseDraw28 = draw;
        draw = function (...a) {
          baseDraw28.apply(this, a);
          if (state !== 'playing' && state !== 'paused') return;
          const px = player ? player.x : 0, py = player ? player.y : 0;
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          for (const s of shots) {
            const g = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, s.r * 2.6);
            g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.35, 'rgba(192,132,252,.8)'); g.addColorStop(1, 'rgba(88,28,135,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 2.6, 0, TAU); ctx.fill();
          }
          if (fx.lance > 0 && player && player.alive) {
            const w = 10 + Math.sin(globalTime * 60) * 2.5, k = Math.min(1, fx.lance / 0.15);
            const g = ctx.createLinearGradient(px - w, 0, px + w, 0);
            g.addColorStop(0, 'rgba(56,189,248,0)'); g.addColorStop(0.5, `rgba(224,242,254,${0.95 * k})`); g.addColorStop(1, 'rgba(56,189,248,0)');
            ctx.fillStyle = g; ctx.fillRect(px - w, 0, w * 2, py - 14);
          }
          if (fx.halo > 0 && player) {
            ctx.strokeStyle = `rgba(253,230,138,${Math.max(0, fx.halo / 0.75)})`; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.arc(px, py, fx.haloR, 0, TAU); ctx.stroke();
            ctx.lineWidth = 2; ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, fx.halo / 0.75)})`;
            ctx.beginPath(); ctx.arc(px, py, fx.haloR - 6, 0, TAU); ctx.stroke();
          }
          if (fx.faux > 0 && player) {
            const a = Math.PI + fx.fauxA * Math.PI;
            for (let k = 0; k < 14; k++) {
              const aa = a - k * 0.045; if (aa < Math.PI) break;
              ctx.strokeStyle = `rgba(253,164,175,${(1 - k / 14) * 0.9})`; ctx.lineWidth = 9 * (1 - k / 14) + 1;
              ctx.beginPath(); ctx.arc(px, py, 150, aa - 0.05, aa + 0.02); ctx.stroke();
            }
          }
          ctx.restore();
          if (fx.hole) {
            const h = fx.hole, r = Math.max(1, 26 * h.r + Math.sin(globalTime * 8) * 1.5); // rayon jamais négatif (createRadialGradient lèverait)
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            const g = ctx.createRadialGradient(h.x, h.y, r * 0.6, h.x, h.y, r * 3.4);
            g.addColorStop(0, 'rgba(192,132,252,.55)'); g.addColorStop(1, 'rgba(88,28,135,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h.x, h.y, r * 3.4, 0, TAU); ctx.fill();
            ctx.strokeStyle = 'rgba(251,191,36,.8)'; ctx.lineWidth = 2;
            for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(h.x, h.y, r * (1.3 + k * 0.5), globalTime * (2 + k) + k * 2, globalTime * (2 + k) + k * 2 + 2.2); ctx.stroke(); }
            ctx.restore();
            ctx.fillStyle = '#05010c'; ctx.beginPath(); ctx.arc(h.x, h.y, r, 0, TAU); ctx.fill();
          }
        };

        // ---------- bouton, charges, annonces ----------
        const ICONS = {
          salve: '<path d="M6 20V9M6 9l-2.5 3M6 9l2.5 3M12 20V4M12 4l-2.5 3M12 4l2.5 3M18 20V9M18 9l-2.5 3M18 9l2.5 3"/>',
          lance: '<path d="M12 21V8M12 2.5l-2.6 5.5h5.2zM7 15l-3 2M17 15l3 2"/>',
          phase: '<circle cx="12" cy="12" r="7.5" stroke-dasharray="2.6 2.6"/><circle cx="12" cy="12" r="2.6"/>',
          halo: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7.5"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3"/>',
          faux: '<path d="M4 20C4 10 10 4 21 4C14 6.5 10 11 10 20"/><path d="M10 20h4"/>',
          hole: '<circle cx="12" cy="12" r="2"/><path d="M12 5a7 7 0 1 1-7 7M12 8.5a3.5 3.5 0 1 1-3.5 3.5"/>'
        };
        function skinButton() {
          const sb = $('specialBtn'); if (!sb) return;
          const i = idx(), key = String(i);
          if (sb.dataset.sk28 !== key) {
            sb.dataset.sk28 = key;
            const sp = META[i].sp;
            if (i === 2) { // CANON : icône d'origine
              const svg = sb.querySelector('svg'); const span = sb.querySelector('span:not(.n21)');
              if (svg) svg.innerHTML = '<rect x="9" y="3" width="6" height="12" rx="1.5"/><path d="M7 15h10l-1.5 4h-7z"/><path d="M12 1v2"/>';
              if (span) span.textContent = 'CANON';
            } else {
              const svg = sb.querySelector('svg'); const span = sb.querySelector('span:not(.n21)');
              if (svg) svg.innerHTML = ICONS[sp.icon]; if (span) span.textContent = sp.name === 'SINGULARITÉ' ? 'TROU NOIR' : sp.name;
            }
            sb.style.setProperty('--sp28', META[i].accent);
          }
          const n = player ? player.cannon || 0 : 0, nm = META[i].sp.name;
          sb.setAttribute('aria-label', n ? `${nm}, ${n} charge${n > 1 ? 's' : ''}, touche C` : `${nm}, aucune charge`);
          sb.dataset.status = `${n} · C`;
          if (nm !== lastName) lastName = nm;
        }
        const baseUpdate28 = update;
        update = function (dt) {
          baseUpdate28(dt);
          if (state !== 'playing' || !player) return;
          skinButton();
          if (!player.alive) return;
          runSpecials(dt);
        };
        const baseStart28 = startGame;
        startGame = function (...a) {
          resetFx(); used = 0;
          const out = baseStart28.apply(this, a);
          const i = idx();
          if (player) {
            if (i === 4) player.shieldRegen *= 1.5;
            if (i === 6) player.cannon = 2;
          }
          const sb = $('specialBtn'); if (sb) delete sb.dataset.sk28;
          skinButton();
          return out;
        };
        const baseOver28 = gameOver;
        gameOver = function (...a) { resetFx(); return baseOver28.apply(this, a); };

        // victoire : annonce d'un vaisseau débloqué
        const announced = (meta.hangar = Object.assign({ seen: {} }, meta.hangar || {}));
        announced.seen = announced.seen || {};
        // les vaisseaux déjà acquis avant cette version ne sont pas « annoncés »
        if (!announced.init) { announced.init = true; for (let i = 0; i < 4; i++) announced.seen[i] = 1; for (let i = 4; i < SHIPS.length; i++) if (unlockedShip(i)) announced.seen[i] = 1; try { saveMeta(); } catch (e) {} }
        function newShips() { const out = []; for (let i = 4; i < SHIPS.length; i++) if (unlockedShip(i) && !announced.seen[i]) out.push(i); return out; }
        const baseVictory28 = showVictory;
        showVictory = function (...a) {
          const out = baseVictory28.apply(this, a);
          const fresh = newShips();
          const card = document.querySelector('#victoryOverlay .card');
          const old = document.getElementById('shipLine28'); if (old) old.remove();
          if (fresh.length && card) {
            fresh.forEach((i) => { announced.seen[i] = 1; });
            try { saveMeta(); } catch (e) {}
            const line = document.createElement('div');
            line.id = 'shipLine28'; line.className = 'story-line26';
            line.innerHTML = '<small>NOUVEAU VAISSEAU</small>';
            const t = document.createElement('span'); t.textContent = fresh.map((i) => `${SHIPS[i].name} — ${META[i].lore}`).join(' · '); line.appendChild(t);
            const anchor = document.getElementById('storyLine26');
            if (anchor) anchor.after(line); else { const ti = card.querySelector('.title'); if (ti) ti.after(line); else card.prepend(line); }
            toast('🚀 Nouveau vaisseau : ' + fresh.map((i) => SHIPS[i].name).join(', '), 'gold');
          }
          return out;
        };
        if (G && G.bilan) G.bilan.addRow(() => {
          const n = (() => { for (let i = 1; i < SHIPS.length; i++) if (!unlockedShip(i)) return i; return -1; })();
          if (n < 0) return null;
          if (n < 4) return { k: 'VAISSEAU', v: `Prochain : ${SHIPS[n].name}, à ${SCORE_UNLOCK[n].toLocaleString('fr-FR')} points (record ${best.toLocaleString('fr-FR')}).` };
          return { k: 'VAISSEAU', v: `Prochain : ${SHIPS[n].name} — ${META[n].unlock.toLowerCase()}.` };
        });

        // ---------- hangar ----------
        const css = document.createElement('style');
        css.id = 'hangar28';
        css.textContent = `
#shipList .sc-sp28{margin:7px 4px 0;padding:7px 9px;border-radius:9px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);text-align:left;font-size:11px;line-height:1.4;color:rgba(226,232,255,.78)}
#shipList .sc-sp28 b{color:var(--acc,#7dd3fc);font:700 9px ui-monospace,monospace;letter-spacing:.16em;display:block;margin-bottom:2px}
#shipList .sc-lore28{margin:6px 6px 0;font:italic 500 10.5px/1.4 system-ui;color:rgba(226,232,255,.5);text-align:center}
#shipList .sc-lv28{margin-top:6px;font:600 10px ui-monospace,monospace;letter-spacing:.06em;color:rgba(226,232,255,.62);text-align:center}
#specialBtn[data-sk28]:not([data-sk28="2"]).ready{box-shadow:inset 0 1px 0 var(--g-hi),0 0 0 2px var(--sp28,#fdba74),0 0 22px var(--sp28,#fdba74)!important}
`;
        document.head.appendChild(css);
        function statBars(s) {
          const pow = Math.round((6 - s.fireMul) * 14 + s.weapon * 10);
          return [['VIT', s.speed, 500], ['COQ', s.hull, 160], ['BLD', s.shield, 150], ['PUI', pow, 100]].map(([l, v, mx]) =>
            `<div class="sc-bar"><span>${l}</span><div class="sc-track"><i style="width:${Math.min(100, Math.round((v / mx) * 100))}%"></i></div><b>${v}</b></div>`).join('');
        }
        function dial() {
          let ticks = '';
          for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ticks += `<line x1="${(50 + Math.cos(a) * 40).toFixed(1)}" y1="${(50 + Math.sin(a) * 40).toFixed(1)}" x2="${(50 + Math.cos(a) * 45).toFixed(1)}" y2="${(50 + Math.sin(a) * 45).toFixed(1)}"/>`; }
          return `<svg class="sc-dial" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/><circle cx="50" cy="50" r="33"/>${ticks}</svg>`;
        }
        renderShips = function hangarRender() {
          shipList.innerHTML = SHIPS.map((s, i) => {
            const m = META[i], ok = unlockedShip(i), lv = shipLvl(i), nxt = lv >= XP.length - 1 ? null : XP[lv + 1];
            const xp = (meta.shipXp && meta.shipXp[i]) || 0;
            return `<div class="ship-card sc-card ${i === meta.ship ? 'selected' : ''} ${ok ? '' : 'disabled'}" data-ship="${i}" style="--acc:${m.accent}">
              <div class="sc-fig">${dial()}<img src="${art(i)}" alt="${s.name}" class="sc-img ${ok ? '' : 'locked'}" draggable="false"></div>
              <div class="sc-name">${s.name}${ok ? '' : ' 🔒'}</div>
              <div class="sc-role">${ok ? m.role : 'VERROUILLÉ — ' + lockText(i)}</div>
              <div class="sc-tag">${ok ? m.tag : s.desc}</div>
              <div class="sc-bars">${ok ? statBars(s) : ''}</div>
              <div class="sc-sp28"><b>SPÉCIAL · ${m.sp.name}</b>${m.sp.desc}${ok && m.passive ? `<br>${m.passive}` : ''}</div>
              <div class="sc-lore28">${m.lore}</div>
              ${ok ? `<div class="sc-lv28">Niveau ${lv}${nxt ? ` · ${xp.toLocaleString('fr-FR')} / ${nxt.toLocaleString('fr-FR')} XP` : ' · MAX'}${lv > 0 ? ' · avantages actifs' : ''}</div>` : ''}
            </div>`;
          }).join('');
          shipList.querySelectorAll('.ship-card').forEach((el) => {
            el.addEventListener('click', () => {
              if (el.classList.contains('disabled')) return;
              meta.ship = parseInt(el.dataset.ship, 10); saveMeta(); renderShips(); AudioSys.ui();
              if (window.__NP4 && window.__NP4.hangar) window.__NP4.hangar.refreshBridge();
            });
            const img = el.querySelector('.sc-img');
            el.addEventListener('pointermove', (ev) => {
              if (!img || el.classList.contains('disabled')) return;
              const r = el.getBoundingClientRect(), nx = (ev.clientX - r.left) / r.width - 0.5, ny = (ev.clientY - r.top) / r.height - 0.5;
              img.style.transform = `rotateY(${nx * 18}deg) rotateX(${-ny * 12}deg) scale(1.05)`;
            });
            el.addEventListener('pointerleave', () => { if (img) img.style.transform = ''; });
          });
        };
        // un vaisseau devenu inaccessible (sauvegarde restaurée) retombe sur PULSE
        if (idx() >= 4 && !unlockedShip(idx())) { meta.ship = 0; try { saveMeta(); } catch (e) {} }

        function refreshBridge() {
          const i = idx(), img = $('bridgeShip18');
          if (!img) return;
          img.src = art(i);
          const n = $('bridgeShipName18'), d = $('bridgeShipDesc18');
          if (n) n.textContent = SHIPS[i].name;
          if (d) d.textContent = `${SHIPS[i].desc} Spécial : ${META[i].sp.name}.`;
        }
        const baseRefreshMenu28 = refreshMenu;
        refreshMenu = function () { baseRefreshMenu28(); refreshBridge(); };
        const menuOv = $('menu');
        if (menuOv) new MutationObserver(() => { if (!menuOv.classList.contains('hidden')) refreshBridge(); }).observe(menuOv, { attributes: true, attributeFilter: ['class'] });
        refreshBridge();

        if (G) G.hangar = {
          ships: () => SHIPS.map((s) => s.name), unlocked: unlockedShip, special: () => ({ name: META[idx()].sp.name, unit: META[idx()].sp.unit, index: idx() }),
          meta: (i) => META[i], art, refreshBridge, use: () => useSpecial(), used: () => used,
          fx: () => ({ salvo: fx.salvo, lance: fx.lance, halo: fx.halo, faux: fx.faux, hole: !!fx.hole, phase: phase28, orbs: shots.length }),
          newShips, lockText, pb: () => pBullets.length, fire: () => { if (player) { player.fireCd = 0; firePlayer(); } }, draw: (c, i, t) => shapeOf(c, i, SHIPS[i].colors[0], SHIPS[i].colors[1], t || 0, false)
        };
      })();
