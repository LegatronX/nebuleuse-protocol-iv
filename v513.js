      // ============ MODULE V5.13 — ACTES III·IV·V : LE PREMIER SIGNAL ============
      (function () {
        // ================= 0. ÉTAT, SECTEURS, CODEX =================
        let acte = 0; // 0 = actes I-II, sinon 3/4/5
        let sec3 = 7; // 8..16 quand acte >= 3
        let signalDown = false;
        const acteDone = { 3: false, 4: false, 5: false };
        const deaths13 = { 3: 0, 4: 0, 5: 0 };
        let cosmo13T = 0;

        const SECTORS3 = [
          { name: 'Mer de Verre', img: 'assets/bg-glass.webp', accent: '#7dd3fc', tint: 'rgba(4,14,22,.42)', music: 'glass',
            codex: "IX — Sous le verre, quelque chose résonne. Les machines ne dorment pas : elles écoutent." },
          { name: 'Cathédrale Fractale', img: 'assets/bg-cathedral.webp', accent: '#fbbf24', tint: 'rgba(20,12,2,.40)', music: 'cathedral',
            codex: "X — Chaque arche est une note. Chaque vitrail, une mémoire. Le Chœur t'a entendu arriver." },
          { name: 'Jardin des Échos', img: 'assets/bg-echoes.webp', accent: '#c4b5fd', tint: 'rgba(10,8,20,.42)', music: 'echoes',
            codex: "XI — Ici, tes propres tirs te reviennent en chanson. Le Signal apprend ta voix." },
          { name: 'Labyrinthe de Nacre', img: 'assets/bg-nacre.webp', accent: '#f9a8d4', tint: 'rgba(16,6,14,.42)', music: 'nacre',
            codex: "XII — Tu n'es plus dans l'espace. Tu es dans ce qu'il rêve." },
          { name: 'Mer de Méthane', img: 'assets/bg-methane.webp', accent: '#2dd4bf', tint: 'rgba(2,14,16,.44)', music: 'methane',
            codex: "XIII — Le rêve a des profondeurs. Ce qui y nage porte ton visage." },
          { name: "L'Œil du Rêve", img: 'assets/bg-dream.webp', accent: '#a5b4fc', tint: 'rgba(8,6,24,.42)', music: 'dream',
            codex: "XIV — Ne te fie plus aux couleurs. Le rêve les mélange pour te désorienter." },
          { name: 'Nurserie de Soleils', img: 'assets/bg-suns.webp', accent: '#fdba74', tint: 'rgba(20,10,2,.40)', music: 'suns',
            codex: "XV — Chaque soleil naissant est une note tenue depuis des milliards d'années." },
          { name: "L'Horizon des Événements", img: 'assets/bg-horizon.webp', accent: '#94a3b8', tint: 'rgba(4,4,8,.46)', music: 'horizon',
            codex: "XVI — Au bord du gouffre, la lumière elle-même ralentit pour écouter." },
          { name: 'Cœur du Premier Signal', img: 'assets/bg-signal.webp', accent: '#fef3c7', tint: 'rgba(14,10,2,.36)', music: 'signal',
            codex: "XVII — Tu n'es pas venu détruire. Tu es venu t'accorder." }
        ];
        const ROMANS3 = ['IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII'];
        const codex13 = (meta.codex13 = meta.codex13 || []);
        function unlockCodex(secIdx) {
          const entry = SECTORS3[secIdx].codex;
          const key = entry.slice(0, 4);
          if (!codex13.find(c => c.slice(0, 4) === key)) {
            codex13.push(entry);
            saveMeta();
            toast('📖 ARCHIVE DU SIGNAL — ' + key.trim(), 'gold');
          }
        }

        const bgImgs3 = [];
        SECTORS3.forEach((s, i) => {
          const im = new Image();
          im.onload = () => { if (acte >= 3 && sec3 === i + 8) makeBackground(); };
          im.src = s.img;
          bgImgs3.push(im);
        });

        const baseMB13 = makeBackground;
        makeBackground = function acte3Background() {
          const im = acte >= 3 && sec3 >= 8 && sec3 <= 16 ? bgImgs3[sec3 - 8] : null;
          if (im && im.complete && im.naturalWidth) {
            bg.width = W;
            bg.height = H;
            bctx.setTransform(1, 0, 0, 1, 0, 0);
            const sc = Math.max(W / im.naturalWidth, H / im.naturalHeight);
            const dw = im.naturalWidth * sc;
            const dh = im.naturalHeight * sc;
            bctx.drawImage(im, (W - dw) / 2, (H - dh) / 2, dw, dh);
            bctx.fillStyle = SECTORS3[sec3 - 8].tint;
            bctx.fillRect(0, 0, W, H);
            const vg = bctx.createRadialGradient(
              W / 2, H * 0.42, Math.min(W, H) * 0.3,
              W / 2, H * 0.5, Math.max(W, H) * 0.82
            );
            vg.addColorStop(0, 'rgba(0,0,0,0)');
            vg.addColorStop(1, 'rgba(0,0,0,.52)');
            bctx.fillStyle = vg;
            bctx.fillRect(0, 0, W, H);
          } else {
            baseMB13();
          }
        };

        // ================= 1. AUDIO : BUFFERS, PAN, MUSIQUES =================
        const SFX13_URLS = {
          climax: 'assets/sfx-climax.mp3', interlude: 'assets/sfx-interlude.mp3',
          riser: 'assets/sfx-riser.mp3', glass: 'assets/sfx-glass-shatter.mp3',
          aria: 'assets/sfx-aria.mp3', harpoon: 'assets/sfx-harpoon.mp3',
          hypnosis: 'assets/sfx-hypnosis.mp3', mirror: 'assets/sfx-mirror.mp3',
          singularity: 'assets/sfx-singularity.mp3', phase: 'assets/sfx-phase.mp3',
          chord: 'assets/sfx-chord.mp3', heartbeat: 'assets/sfx-heartbeat.mp3',
          unison: 'assets/sfx-unison.mp3', silence: 'assets/sfx-silence-pop.mp3'
        };
        const MUS13_URLS = {
          glass: 'assets/music-glass.mp3', cathedral: 'assets/music-cathedral.mp3',
          echoes: 'assets/music-echoes.mp3', nacre: 'assets/music-nacre.mp3',
          methane: 'assets/music-methane.mp3', dream: 'assets/music-dream.mp3',
          suns: 'assets/music-suns.mp3', horizon: 'assets/music-horizon.mp3',
          signal: 'assets/music-signal.mp3'
        };
        const buf13 = {};
        let sfx13Loading = false;
        async function loadSfx13() {
          if (sfx13Loading || !AudioSys.ctx) return;
          sfx13Loading = true;
          const ctx = AudioSys.ctx;
          await Promise.all(Object.entries({ ...SFX13_URLS, ...MUS13_URLS }).map(([k, url]) =>
            fetch(url)
              .then(r => { if (!r.ok) throw new Error('http'); return r.arrayBuffer(); })
              .then(ab => ctx.decodeAudioData(ab))
              .then(b => { buf13[k] = b; if (mus13Name === k && !mus13) playMusic13(k); })
              .catch(() => {})));
        }
        let panUsed13 = 0;
        function sfxPan13(name, x, gain, rate, loop) {
          if (!buf13[name] || !AudioSys.ctx || AudioSys.muted) return null;
          const ctx = AudioSys.ctx;
          const src = ctx.createBufferSource();
          src.buffer = buf13[name];
          if (rate) src.playbackRate.value = rate;
          if (loop) src.loop = true;
          const g = ctx.createGain();
          g.gain.value = gain == null ? 1 : gain;
          let node = g;
          if (ctx.createStereoPanner && typeof x === 'number') {
            const pan = ctx.createStereoPanner();
            pan.pan.value = clamp((x / W) * 2 - 1, -1, 1) * 0.8;
            g.connect(pan);
            node = pan;
            panUsed13++;
          }
          src.connect(g);
          node.connect(loop ? (AudioSys.actMusicBus || AudioSys.musicGain) : (AudioSys.sfxBus || AudioSys.master));
          src.start(ctx.currentTime);
          return { src, g };
        }

        let mus13 = null, mus13Name = null, mus13GainNode = null;
        AudioSys.__act13Music = () => !!mus13;
        function playMusic13(name) {
          if (!AudioSys.ctx) return;
          if (!buf13[name]) { mus13Name = name; return; }
          stopMusic13();
          if (window.__NP4 && window.__NP4.v12 && window.__NP4.v12.stop12) window.__NP4.v12.stop12();
          AudioSys.stopMusic();
          mus13Name = name;
          const ctx = AudioSys.ctx;
          const src = ctx.createBufferSource();
          src.buffer = buf13[name];
          src.loop = true;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.72, ctx.currentTime + 1.8);
          src.connect(g);
          g.connect(AudioSys.actMusicBus || AudioSys.musicGain);
          src.start(ctx.currentTime);
          mus13 = { src, g };
          mus13GainNode = g;
        }
        function stopMusic13() {
          if (!mus13 || !AudioSys.ctx) { mus13 = null; mus13Name = null; return; }
          try {
            mus13.g.gain.setTargetAtTime(0.0001, AudioSys.ctx.currentTime, 0.25);
            mus13.src.stop(AudioSys.ctx.currentTime + 0.9);
          } catch (e) {}
          mus13 = null;
          mus13Name = null;
        }
        if (AudioSys.playMusic) {
          const basePM13 = AudioSys.playMusic;
          AudioSys.playMusic = function (...a) { if (mus13) return; return basePM13.apply(this, a); };
        }
        if (AudioSys.nextTrack) {
          const baseNT13 = AudioSys.nextTrack;
          AudioSys.nextTrack = function (...a) { if (mus13) return; return baseNT13.apply(this, a); };
        }
        const baseInit13 = AudioSys.init;
        AudioSys.init = function () {
          baseInit13.call(this);
          if (this.ctx) loadSfx13();
        };

        // ================= 2. COUCHES GÉNÉRATIVES (pad · pulsation · riser) =================
        const ACTE_SCALES = {
          3: [1, 1.25, 1.5, 2],       // lydien clair
          4: [1, 1.2, 1.5, 1.875],    // hirajoshi adapté
          5: [1, 1.333, 1.5, 2]       // majeur ouvert
        };
        let pad = null, heart = null, riser13 = null, padArpT = 0;
        function startPad() {
          if (!AudioSys.ctx || pad || acte < 3) return;
          const ctx = AudioSys.ctx;
          const scale = ACTE_SCALES[acte] || ACTE_SCALES[3];
          const base = 82.4; // Mi grave
          const g = ctx.createGain();
          g.gain.value = 0;
          const flt = ctx.createBiquadFilter();
          flt.type = 'lowpass';
          flt.frequency.value = 420;
          flt.Q.value = 0.8;
          const lfo = ctx.createOscillator();
          lfo.frequency.value = 0.07;
          const lfoG = ctx.createGain();
          lfoG.gain.value = 180;
          lfo.connect(lfoG);
          lfoG.connect(flt.frequency);
          const oscs = scale.map((r, i) => {
            const o = ctx.createOscillator();
            o.type = i === 0 ? 'sine' : 'triangle';
            o.frequency.value = base * r;
            o.detune.value = i % 2 ? 6 : -6;
            const og = ctx.createGain();
            og.gain.value = i === 0 ? 0.5 : 0.22;
            o.connect(og);
            og.connect(flt);
            o.start(ctx.currentTime);
            return o;
          });
          flt.connect(g);
          g.connect(AudioSys.actMusicBus || AudioSys.musicGain);
          lfo.start(ctx.currentTime);
          pad = { g, oscs, lfo };
        }
        function stopPad() {
          if (!pad || !AudioSys.ctx) { pad = null; return; }
          try {
            pad.g.gain.setTargetAtTime(0.0001, AudioSys.ctx.currentTime, 0.3);
            pad.oscs.forEach(o => o.stop(AudioSys.ctx.currentTime + 1.2));
            pad.lfo.stop(AudioSys.ctx.currentTime + 1.2);
          } catch (e) {}
          pad = null;
        }
        function layersActive() {
          let n = 0;
          if (pad) n++;
          if (heart) n++;
          if (riser13) n++;
          if (mus13) n++;
          return n;
        }
        // pluie de notes méditative pendant les accalmies
        function padArp(dt) {
          if (interlude <= 0 || !AudioSys.ctx || AudioSys.muted) return;
          padArpT -= dt;
          if (padArpT <= 0) {
            padArpT = rand(0.4, 1.1);
            const ctx = AudioSys.ctx;
            const scale = ACTE_SCALES[acte] || ACTE_SCALES[3];
            const f = 220 * scale[Math.floor(rand(0, scale.length))] * (Math.random() < 0.3 ? 2 : 1);
            const o = ctx.createOscillator();
            o.type = 'sine';
            o.frequency.value = f;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.05);
            g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.8);
            const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
            o.connect(g);
            if (pan) { pan.pan.value = rand(-0.7, 0.7); g.connect(pan); pan.connect(AudioSys.actMusicBus || AudioSys.musicGain); panUsed13++; }
            else g.connect(AudioSys.actMusicBus || AudioSys.musicGain);
            o.start(ctx.currentTime);
            o.stop(ctx.currentTime + 2);
          }
        }

        // ================= 3. DIRECTEUR DE TENSION =================
        let tension = 0, interlude = 0, bloom = 0, pendInterlude = 0, silenceDuck = 0;
        function computeTension(dt) {
          let target = 0.15;
          if (state === 'playing' && acte >= 3) {
            target = 0.3 + Math.min(0.3, enemies.length * 0.022);
            if (boss && boss.maxHp) target = Math.max(target, 0.58 + (1 - clamp(boss.hp / boss.maxHp, 0, 1)) * 0.42);
            if (interlude > 0) target = 0.04;
          }
          tension += (target - tension) * Math.min(1, dt * 1.6);
          // couches audio pilotées par la tension
          if (AudioSys.ctx && !AudioSys.muted && acte >= 3 && state === 'playing') {
            if (pad) pad.g.gain.setTargetAtTime(0.16 * (1 - tension * 0.6), AudioSys.ctx.currentTime, 0.4);
            if (tension > 0.5 && !heart && buf13.heartbeat) {
              heart = sfxPan13('heartbeat', W / 2, 0.0001, 1, true);
              if (heart) heart.g.gain.setTargetAtTime(0.5 * tension, AudioSys.ctx.currentTime, 0.6);
            }
            if (heart) {
              heart.src.playbackRate.value = 0.9 + tension * 0.45;
              heart.g.gain.setTargetAtTime(tension > 0.5 ? 0.55 * tension : 0.0001, AudioSys.ctx.currentTime, 0.5);
              if (tension <= 0.35 && heart) { try { heart.src.stop(); } catch (e) {} heart = null; }
            }
            if (tension > 0.78 && !riser13 && buf13.riser) {
              riser13 = sfxPan13('riser', W / 2, 0.0001, 1, true);
              if (riser13) riser13.g.gain.setTargetAtTime(0.4, AudioSys.ctx.currentTime, 0.8);
            }
            if (riser13 && tension <= 0.7) { try { riser13.src.stop(); } catch (e) {} riser13 = null; }
            if (mus13GainNode) mus13GainNode.gain.setTargetAtTime(0.72 * (0.45 + tension * 0.55), AudioSys.ctx.currentTime, 0.5);
          }
          if (interlude > 0) interlude -= dt;
          if (pendInterlude > 0) {
            pendInterlude -= dt;
            if (pendInterlude <= 0) sfxPan13('interlude', W / 2, 0.65, 1);
          }
          if (bloom > 0) bloom = Math.max(0, bloom - dt * 1.1);
          padArp(dt);
        }
        // paroxysme : mort d'un boss = climax sonore + flash + hit-stop, puis accalmie
        function climaxAt(x) {
          sfxPan13('climax', x, 1, 1);
          bloom = 1;
          shake = Math.max(shake, 0.8);
          vibrate([60, 40, 80]);
          if (typeof triggerHitStop === 'function') triggerHitStop(0.32);
          if (AudioSys.ctx && AudioSys.master) {
            const m = AudioSys.master.gain;
            m.setTargetAtTime(0.15, AudioSys.ctx.currentTime, 0.02); // frame de silence
            m.setTargetAtTime(1, AudioSys.ctx.currentTime + 0.25, 0.3);
          }
          interlude = 9;
          pendInterlude = 1.4;
          slowTime = Math.max(slowTime, 1.1); // bullet-time d'accalmie
          tension = 0.05;
          if (heart) { try { heart.src.stop(); } catch (e) {} heart = null; }
          if (riser13) { try { riser13.src.stop(); } catch (e) {} riser13 = null; }
        }

        // ================= 4. NOUVELLES ARMES (R · P · D · K · C · N) =================
        let harpe = 0, prisme = 0, berceuse = 0, miroir = 0, miroirCh = 0, miroirRegen = 0, choeur = 0, choeurSfx = 0, choeurTick = 0;
        let harpeCd = 0, prismeCd = 0, berceuseCd = 0;
        const harpoons = [], orbs = [], rays = [], reflected = [], singularities = [], webs13 = [];

        function hurtAt(x, y, r, dmg, color) {
          for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            if (e.ghostNow) continue;
            if (Math.hypot(e.x - x, e.y - y) < r + e.r) {
              e.hp -= dmg;
              for (let k = 0; k < 3; k++) addParticle(e.x, e.y, rand(-70, 70), rand(-70, 70), 0.3, 2.5, color);
              if (e.hp <= 0) killEnemy(i);
            }
          }
        }

        function updateWeapons13(dt) {
          // --- R : HARPE DE RÉSONANCE ---
          if (harpe > 0 && player.alive) {
            harpe -= dt;
            harpeCd -= dt;
            if (harpeCd <= 0) {
              harpeCd = 0.55;
              harpoons.push({ x: player.x, y: player.y - 22, vy: -900, hits: 0, t: 0 });
            }
            if (harpe <= 0) toast('Harpe rangée');
          }
          for (let i = harpoons.length - 1; i >= 0; i--) {
            const h = harpoons[i];
            h.t += dt;
            h.y += h.vy * dt;
            let dead = h.y < -30;
            for (const e of enemies) {
              if (e.ghostNow || e.harpHit === h) continue;
              if (Math.hypot(e.x - h.x, e.y - h.y) < e.r + 8) {
                h.hits++;
                if (h.hits >= 2) {
                  e.harpHit = h;
                  sfxPan13('harpoon', e.x, 0.9, rand(0.95, 1.1));
                  hurtAt(e.x, e.y, 105, 140, '#f87171');
                  shockwaves.push({ x: e.x, y: e.y, r: 10, max: 120, life: 0.4, maxLife: 0.4 });
                  dead = true;
                  break;
                } else {
                  e.harpHit = h;
                  e.hp -= 30;
                  if (e.hp <= 0) killEnemy(enemies.indexOf(e));
                }
              }
            }
            if (dead) harpoons.splice(i, 1);
          }
          // --- P : ORBE PRISME ---
          if (prisme > 0 && player.alive) {
            prisme -= dt;
            prismeCd -= dt;
            if (prismeCd <= 0) {
              prismeCd = 1.25;
              orbs.push({ x: player.x, y: player.y - 24, vy: -430, t: 0 });
            }
            if (prisme <= 0) toast('Prisme éteint');
          }
          for (let i = orbs.length - 1; i >= 0; i--) {
            const o = orbs[i];
            o.t += dt;
            o.y += o.vy * dt;
            let boom = o.y < H * 0.3;
            for (const e of enemies) {
              if (Math.hypot(e.x - o.x, e.y - o.y) < e.r + 10) { boom = true; break; }
            }
            if (boom) {
              orbs.splice(i, 1);
              sfxPan13('glass', o.x, 0.85, rand(0.9, 1.15));
              for (let k = -2; k <= 2; k++) {
                const a = -Math.PI / 2 + k * 0.38;
                rays.push({ x: o.x, y: o.y, a, life: 0.3 });
                // dégâts en ligne
                for (let s = 30; s < 560; s += 26) {
                  hurtAt(o.x + Math.cos(a) * s, o.y + Math.sin(a) * s, 12, 46, '#a5f3fc');
                }
              }
              for (let k = 0; k < 10; k++) addParticle(o.x, o.y, rand(-160, 160), rand(-160, 160), 0.4, 3, '#a5f3fc');
            } else if (o.y < -30) orbs.splice(i, 1);
          }
          for (let i = rays.length - 1; i >= 0; i--) { rays[i].life -= dt; if (rays[i].life <= 0) rays.splice(i, 1); }
          // --- D : BERCEUSE (champ d'hypnose) ---
          if (berceuse > 0 && player.alive) {
            berceuse -= dt;
            berceuseCd -= dt;
            if (berceuseCd <= 0) {
              berceuseCd = 3.4;
              let slept = 0;
              for (const e of enemies) {
                if (e.type === 'boss') continue;
                if (Math.hypot(e.x - player.x, e.y - player.y) < 240) { e.sleepT = 3; slept++; }
              }
              if (slept) {
                sfxPan13('hypnosis', player.x, 0.6, 1);
                addText(player.x, player.y - 56, 'SOMMEIL…', '#93c5fd');
                shockwaves.push({ x: player.x, y: player.y, r: 30, max: 240, life: 0.8, maxLife: 0.8 });
              }
            }
            if (berceuse <= 0) toast('Berceuse terminée');
          }
          // --- K : MIROIR D'AION ---
          if (miroir > 0 && player.alive) {
            miroir -= dt;
            miroirRegen -= dt;
            if (miroirRegen <= 0) { miroirRegen = 5; miroirCh = Math.min(3, miroirCh + 1); }
            if (miroirCh > 0) {
              for (let i = eBullets.length - 1; i >= 0; i--) {
                const b = eBullets[i];
                if (b.vy > 0 && b.y < player.y - 26 && b.y > player.y - 110 && Math.abs(b.x - player.x) < 82) {
                  eBullets.splice(i, 1);
                  reflected.push({ x: b.x, y: b.y, vy: -560, vx: b.vx * -0.3, life: 1.6 });
                  miroirCh -= 0.34;
                  sfxPan13('mirror', b.x, 0.5, rand(0.9, 1.2));
                }
              }
            }
            if (miroir <= 0) toast('Miroir dissous');
          }
          for (let i = reflected.length - 1; i >= 0; i--) {
            const r = reflected[i];
            r.life -= dt;
            r.y += r.vy * dt;
            r.x += r.vx * dt;
            for (const e of enemies) {
              if (Math.hypot(e.x - r.x, e.y - r.y) < e.r + 6) {
                e.hp -= 20;
                if (e.hp <= 0) killEnemy(enemies.indexOf(e));
                r.life = 0;
                break;
              }
            }
            if (r.life <= 0 || r.y < -20) reflected.splice(i, 1);
          }
          // --- C : CANON-CHŒUR ---
          if (choeur > 0 && player.alive) {
            choeur -= dt;
            choeurSfx -= dt;
            const cvx = player.x, cvy = player.y - 260;
            if (choeurSfx <= 0) { choeurSfx = 0.9; sfxPan13('chord', cvx, 0.4, rand(0.98, 1.05)); }
            choeurTick -= dt;
            if (choeurTick <= 0) {
              choeurTick = 0.12; // dégâts cadencés, pas par frame
              for (const a of [-0.21, 0, 0.21]) {
                for (let s = 30; s < 300; s += 24) {
                  const px = player.x + Math.sin(a) * s;
                  const py = player.y - 18 - Math.cos(a) * s * 0.92;
                  hurtAt(px, py, 10, 8, '#fde68a');
                }
              }
              hurtAt(cvx, cvy, 44, 30, '#fef3c7'); // point de convergence : accord parfait ×3
            }
            if (choeur <= 0) toast('Chœur dissipé');
          }
          // --- N : FAILLE (singularités) ---
          for (let i = singularities.length - 1; i >= 0; i--) {
            const s = singularities[i];
            s.t += dt;
            s.life -= dt;
            for (const e of enemies) {
              if (e.type === 'boss') continue;
              const d = Math.hypot(e.x - s.x, e.y - s.y);
              if (d < 260 && d > 4) {
                e.x += ((s.x - e.x) / d) * 190 * dt;
                e.y += ((s.y - e.y) / d) * 190 * dt;
              }
            }
            for (let j = eBullets.length - 1; j >= 0; j--) {
              if (Math.hypot(eBullets[j].x - s.x, eBullets[j].y - s.y) < 150) eBullets.splice(j, 1);
            }
            if (s.life <= 0) {
              singularities.splice(i, 1);
              hurtAt(s.x, s.y, 140, 220, '#c4b5fd');
              explosion(s.x, s.y, '#c4b5fd', 30, 260);
              shockwaves.push({ x: s.x, y: s.y, r: 16, max: 200, life: 0.5, maxLife: 0.5 });
              sfxPan13('singularity', s.x, 1, 1.4);
              shake = Math.max(shake, 0.4);
            }
          }
          // toiles de tisseuses : contact = drain + entrave visuelle
          for (let i = webs13.length - 1; i >= 0; i--) {
            const w = webs13[i];
            w.life -= dt;
            if (w.life <= 0) { webs13.splice(i, 1); continue; }
            if (player.alive && Math.abs(player.y - w.y) < 12 && player.x > w.x1 && player.x < w.x2) {
              player.shield = Math.max(0, player.shield - 5 * dt);
              player.webbed = 0.3;
            }
          }
          if (player.webbed > 0) player.webbed -= dt;
        }

        const baseApply13 = applyPowerup;
        applyPowerup = function (p) {
          const T = p.type;
          if (T === 'R') { harpe = 20; toast('🎻 HARPE DE RÉSONANCE — 20s', 'gold'); addText(player.x, player.y - 48, 'HARPE DE RÉSONANCE', '#f87171'); sfxPan13('harpoon', player.x, 0.7, 0.7); return; }
          if (T === 'P') { prisme = 20; toast('💎 ORBE PRISME — 20s', 'gold'); addText(player.x, player.y - 48, 'ORBE PRISME', '#a5f3fc'); sfxPan13('glass', player.x, 0.7, 1.3); return; }
          if (T === 'D') { berceuse = 18; toast('🌙 BERCEUSE — 18s', 'gold'); addText(player.x, player.y - 48, 'BERCEUSE', '#93c5fd'); sfxPan13('hypnosis', player.x, 0.7, 1); return; }
          if (T === 'K') { miroir = 20; miroirCh = 3; miroirRegen = 5; toast('🪞 MIROIR D\'AION — 20s', 'gold'); addText(player.x, player.y - 48, "MIROIR D'AION", '#e5e7eb'); sfxPan13('mirror', player.x, 0.7, 0.8); return; }
          if (T === 'C') { choeur = 22; toast('🎼 CANON-CHŒUR — 22s', 'gold'); addText(player.x, player.y - 48, 'CANON-CHŒUR', '#fde68a'); sfxPan13('chord', player.x, 0.8, 0.9); return; }
          if (T === 'N') {
            toast('🕳️ FAILLE — singularité déployée', 'gold');
            addText(player.x, player.y - 48, 'FAILLE', '#c4b5fd');
            if (!singularities.length) {
              singularities.push({ x: player.x, y: Math.max(120, player.y - 300), t: 0, life: 2.6 });
              sfxPan13('singularity', player.x, 0.9, 0.8);
            }
            return;
          }
          baseApply13(p);
        };
        const basePC13 = powerColor;
        powerColor = function (t) {
          const m = { R: '#f87171', P: '#a5f3fc', D: '#93c5fd', K: '#e5e7eb', C: '#fde68a', N: '#c4b5fd' };
          return m[t] || basePC13(t);
        };

        // ================= 5. NOUVEAUX ENNEMIS =================
        function hpScale13() { return (acte === 3 ? 2.2 : acte === 4 ? 3.4 : 5) * dm().hp; }
        const NEW_TYPES = ['prisme', 'eclat', 'choriste', 'sangsue', 'reveur', 'tisseuse', 'comete', 'miroirE', 'psyche', 'pensee', 'echo', 'mirage', 'mille', 'echoBoss'];
        const baseSpawn13 = spawnEnemy;
        spawnEnemy = function (type, x, y) {
          const e = baseSpawn13(type, x, y);
          if (!e) return e;
          const hs = hpScale13();
          switch (type) {
            case 'prisme': e.r = 15; e.hp = e.maxHp = 40 * hs; e.vy = 58; e.score = 200; break;
            case 'eclat': e.r = 8; e.hp = e.maxHp = 12 * hs; e.vy = 150; e.score = 60; break;
            case 'choriste': e.r = 13; e.hp = e.maxHp = 34 * hs; e.vy = 38; e.score = 220; break;
            case 'sangsue': e.r = 10; e.hp = e.maxHp = 24 * hs; e.vy = 0; e.score = 180; e.attached = false; e.shakeOff = 0; e.reattach = 0; break;
            case 'reveur': e.r = 14; e.hp = e.maxHp = 46 * hs; e.vy = 34; e.score = 240; e.lastHp = e.hp; break;
            case 'tisseuse': e.r = 15; e.hp = e.maxHp = 52 * hs; e.vy = 28; e.score = 260; e.webCd = 1.6; break;
            case 'comete': e.r = 11; e.hp = e.maxHp = 20 * hs; e.vy = 0; e.score = 160; e.vx = 0; break;
            case 'miroirE': e.r = 16; e.hp = e.maxHp = 56 * hs; e.vy = 44; e.score = 280; break;
            case 'psyche': e.r = 12; e.hp = e.maxHp = 30 * hs; e.vy = 48; e.score = 300; break;
            case 'pensee': e.r = 11; e.hp = e.maxHp = 20 * hs; e.vy = 66; e.score = 120; break;
            case 'echo': e.r = 14; e.hp = e.maxHp = 60 * hs; e.vy = 0; e.score = 400; break;
            case 'mirage': e.r = 16; e.hp = e.maxHp = 30 * hs; e.vy = 0; e.score = 100; break;
            case 'mille': e.r = 15; e.hp = e.maxHp = 30 * hs; e.vy = 0; e.score = 500; e.mille = true; break;
            case 'echoBoss': e.r = 26; e.hp = e.maxHp = 150 * hs; e.vy = 0; e.score = 900; break;
          }
          return e;
        };

        function updateEnemies13(dt) {
          for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            if (e.sleepT > 0) { e.sleepT -= dt; continue; } // hypnotisé : immobile et muet
            if (e.buffT > 0) { e.buffT -= dt; e.fireCd -= dt * 0.6; }
            switch (e.type) {
              case 'prisme':
                e.y += e.vy * dt;
                e.x = e.baseX + Math.sin(e.t * 1.8) * 40;
                e.spin = (e.spin || 0) + dt * 2;
                break;
              case 'eclat':
                e.y += e.vy * dt;
                e.x += (e.vx || 0) * dt;
                e.spin = (e.spin || 0) + dt * 6;
                break;
              case 'choriste': {
                e.y += e.vy * dt * 0.6;
                let best = null, bd = 230;
                for (const o of enemies) {
                  if (o === e || o.type === 'choriste' || o.type === 'boss') continue;
                  const d = Math.hypot(o.x - e.x, o.y - e.y);
                  if (d < bd) { bd = d; best = o; }
                }
                e.link = best;
                if (best) {
                  best.buffT = 0.5;
                  e.x += clamp(best.x - e.x, -60, 60) * dt * 0.6;
                } else {
                  e.x += (e.x < W / 2 ? -50 : 50) * dt; // seul : il fuit
                }
                break;
              }
              case 'sangsue':
                if (e.reattach > 0) e.reattach -= dt;
                if (!e.attached) {
                  const dx = player.x - e.x, dy = player.y - e.y;
                  const d = Math.hypot(dx, dy) || 1;
                  e.vx = (e.vx || 0) + (dx / d) * 420 * dt;
                  e.vy = (e.vy || 0) + (dy / d) * 420 * dt;
                  const sp = Math.hypot(e.vx, e.vy);
                  if (sp > 210) { e.vx = e.vx / sp * 210; e.vy = e.vy / sp * 210; }
                  e.x += e.vx * dt;
                  e.y += e.vy * dt;
                  if (d < 24 && e.reattach <= 0 && player.alive) {
                    e.attached = true;
                    e.shakeOff = 0;
                    e.px = player.x;
                    sfxPan13('phase', e.x, 0.6, 0.6);
                    addText(player.x, player.y - 44, 'SANGSUE !', '#fb7185');
                  }
                } else {
                  e.shakeOff += Math.abs(player.x - e.px);
                  e.px = player.x;
                  e.x = player.x + 16;
                  e.y = player.y - 6;
                  player.shield = Math.max(0, player.shield - 7 * dt);
                  if (e.shakeOff > 130) {
                    e.attached = false;
                    e.reattach = 1.6;
                    e.vy = 90;
                    e.vx = rand(-90, 90);
                    addText(player.x, player.y - 44, 'SECOUÉ !', '#34d399');
                  }
                }
                break;
              case 'reveur': {
                e.y += e.vy * dt;
                e.x = e.baseX + Math.sin(e.t * 1.2) * 55;
                const ghost = (e.t % 4) > 2;
                e.ghostNow = ghost;
                if (ghost && e.hp < e.lastHp) e.hp = e.lastHp; // les tirs le traversent
                e.lastHp = e.hp;
                break;
              }
              case 'tisseuse':
                e.y += e.vy * dt * 0.5;
                e.x = e.baseX + Math.sin(e.t * 1.5) * 70;
                e.webCd -= dt;
                if (e.webCd <= 0 && e.y > 40 && e.y < H * 0.6) {
                  e.webCd = 2.4;
                  webs13.push({ x1: clamp(e.x - 75, 0, W), x2: clamp(e.x + 75, 0, W), y: e.y + 10, life: 6 });
                }
                break;
              case 'comete': {
                const dx = player.x - e.x, dy = player.y - e.y;
                const d = Math.hypot(dx, dy) || 1;
                e.vx = (e.vx || 0) + (dx / d) * 300 * dt;
                e.vy = (e.vy || 0) + (dy / d) * 300 * dt;
                const sp = Math.hypot(e.vx, e.vy);
                if (sp > 300) { e.vx = e.vx / sp * 300; e.vy = e.vy / sp * 300; }
                e.x += e.vx * dt;
                e.y += e.vy * dt;
                if (Math.random() < 0.5) addParticle(e.x, e.y, -e.vx * 0.15, -e.vy * 0.15, 0.3, 2.5, '#fdba74');
                if (d < 22 && player.alive) killEnemy(i); // impact
                break;
              }
              case 'miroirE': {
                e.y += e.vy * dt;
                e.spin = (e.spin || 0) + dt;
                // renvoie les tirs du joueur
                for (let j = pBullets.length - 1; j >= 0; j--) {
                  const b = pBullets[j];
                  if (b.vy < 0 && b.y > e.y && Math.hypot(b.x - e.x, b.y - e.y) < e.r + 14) {
                    pBullets.splice(j, 1);
                    fireEnemyBullet(b.x, e.y + e.r, b.vx * 0.3, 230, 5, 10, '#e5e7eb');
                    sfxPan13('mirror', e.x, 0.35, rand(1.1, 1.4));
                  }
                }
                break;
              }
              case 'psyche':
                e.y += e.vy * dt;
                e.x = e.baseX + Math.sin(e.t * 3) * 60;
                e.spin = (e.spin || 0) + dt * 3;
                break;
              case 'pensee':
                e.y += e.vy * dt;
                e.x = e.baseX + Math.sin(e.t * 2) * 46;
                break;
              case 'echo': {
                if (!e.path || !e.path.length) break;
                e.pidx = Math.min(e.path.length - 1, (e.pidx || 0) + dt * 10 * (e.replaySpeed || 1));
                const p = e.path[Math.floor(e.pidx)];
                e.x = p.x;
                e.y = p.y;
                e.fireCd -= dt;
                if (e.fireCd <= 0) { e.fireCd = 1.5; fireAimed(e, 240, 5, 11, '#fda4af'); }
                break;
              }
              case 'mirage': {
                e.y += 20 * dt;
                e.spin = (e.spin || 0) + dt * 2;
                for (let j = pBullets.length - 1; j >= 0; j--) {
                  const b = pBullets[j];
                  if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + 10) {
                    pBullets.splice(j, 1);
                    fireEnemyBullet(b.x, e.y + e.r, b.vx * 0.2, 210, 5, 9, '#fda4af');
                  }
                }
                break;
              }
            }
          }
        }

        // injecteur de vagues : garantit la nouveauté toutes les quelques secondes
        let spawnT13 = 2;
        const POOLS = {
          3: ['prisme', 'choriste', 'sangsue', 'zig', 'drone'],
          4: ['reveur', 'tisseuse', 'comete', 'prisme', 'sangsue', 'zig'],
          5: ['miroirE', 'psyche', 'reveur', 'comete', 'choriste', 'tank']
        };
        function spawnInjector13(dt) {
          if (acte < 3 || boss || state !== 'playing') return;
          spawnT13 -= dt * (interlude > 0 ? 0.22 : 1); // les accalmies respirent
          if (spawnT13 > 0) return;
          spawnT13 = clamp(2.7 - (wave - 24) * 0.06, 0.95, 2.7);
          const pool = POOLS[acte] || POOLS[3];
          const n = interlude > 0 ? 1 : (acte === 5 ? 4 : acte === 4 ? 3 : 2);
          for (let k = 0; k < n; k++) {
            const t = pool[Math.floor(rand(0, pool.length))];
            const e = spawnEnemy(t, rand(50, W - 50), -30 - k * 34);
            if (e && acte === 5 && Math.random() < 0.2) e.elite = true;
          }
        }

        // ================= 6. LES NEUF BOSS =================
        function makeBossBase13(name, color, r, hp, score2) {
          const e = {
            type: 'boss', custom13: true, kind: 0, finalBoss: false, phase: 1,
            name, color,
            x: W / 2, y: -180,
            targetY: clamp(H * 0.19, 100, 230),
            r,
            hp: Math.round(hp * dm().hp),
            maxHp: Math.round(hp * dm().hp),
            t: 0, spin: 0, fireCd: 2, minionCd: 5,
            score: score2, entering: true
          };
          enemies.push(e);
          boss = e;
          bossLabel.textContent = name;
          showBossBar(true);
          if (AudioSys.subHit) AudioSys.subHit(1.8);
          return e;
        }
        function signalLine(txt) { toast('📡 ' + txt, 'gold'); }

        function spawnOrgue() { const e = makeBossBase13("L'ORGUE PÉTRIFIÉ", '#7dd3fc', 66, 9000 + wave * 320, 30000); e.orgue = { ringCd: 2.6, pipeCd: 1.2, wave: 0 }; signalLine('« TU JOUES FAUX. »'); return e; }
        function spawnCantatrice() { const e = makeBossBase13('LA CANTATRICE', '#fbbf24', 58, 10500 + wave * 300, 36000); e.cantatrice = { chorCd: 1.5, ariaCd: 8, aria: 0, ariaA: 0, hurtCd: 0 }; signalLine('« ÉCOUTE-MOI. »'); return e; }
        function spawnDiapason() { const e = makeBossBase13('LE DIAPASON OMEGA', '#c4b5fd', 60, 12000 + wave * 300, 42000); e.diapason = { vibL: 0, vibR: 0, shield: true, shieldT: 0, silCd: 9, lastHp: 0 }; e.diapason.lastHp = e.hp; signalLine('« ACCORDE-TOI OU TAIS-TOI. »'); return e; }
        function spawnReveur() { const e = makeBossBase13('LE RÊVEUR ENDORMI', '#f9a8d4', 70, 14000 + wave * 300, 48000); e.reveurB = { orbCd: 2.6, wake: 0 }; signalLine('« CHHH… IL RÊVE. »'); return e; }
        function spawnCauchemar() { const e = makeBossBase13('LE CAUCHEMAR CHROMATIQUE', '#a5b4fc', 56, 15500 + wave * 300, 54000); e.cauchemar = { invCd: 7, inv: 0, mirCd: 6 }; signalLine('« TES COULEURS M\'APPARTIENNENT. »'); return e; }
        function spawnInsomniaque() { const e = makeBossBase13("L'INSOMNIAQUE", '#2dd4bf', 62, 17000 + wave * 300, 60000); e.insomnie = { mode: 'sommeil', modeT: 12, lastHp: 0, minCd: 2 }; e.insomnie.lastHp = e.hp; signalLine('« JE NE DORS PLUS. JAMAIS. »'); return e; }
        function spawnMatrice() { const e = makeBossBase13('LA MATRICE DES ÉCHOS', '#fdba74', 60, 19000 + wave * 300, 70000); e.matrice = { ghCd: 7 }; signalLine('« COMBATS-TOI. »'); return e; }
        function spawnChoeurMille() {
          const e = makeBossBase13('LE CHŒUR DES MILLE', '#94a3b8', 40, 22000 + wave * 300, 80000);
          e.choeurM = { formT: 5, form: 0, salveCd: 2.4, bodies: [] };
          for (let k = 0; k < 11; k++) {
            const b = spawnEnemy('mille', e.x, e.y);
            if (b) { b.choir = e; b.ang = (k / 11) * TAU; e.choeurM.bodies.push(b); }
          }
          signalLine('« NOUS SOMMES LÉGION. »');
          return e;
        }
        function spawnSignal() { const e = makeBossBase13('LE PREMIER SIGNAL', '#fef3c7', 74, 26000 + wave * 300, 120000); e.signal = { movement: 1, minCd: 3, beamX: W / 2, accord: 0, unisonOn: false }; signalLine('« RESTE. »'); return e; }

        const baseSpawnBoss13 = spawnBoss;
        spawnBoss = function (isFinal) {
          if (acte >= 3) {
            if (wave === 27) return spawnOrgue();
            if (wave === 30) return spawnCantatrice();
            if (wave === 33) return spawnDiapason();
            if (wave === 36) return spawnReveur();
            if (wave === 39) return spawnCauchemar();
            if (wave === 42) return spawnInsomniaque();
            if (wave === 45) return spawnMatrice();
            if (wave === 48) return spawnChoeurMille();
            if (wave === 51) return spawnSignal();
          }
          return baseSpawnBoss13(isFinal);
        };

        // enregistrement des mouvements du joueur (Matrice des Échos)
        const recBuf = [];
        let recT = 0;
        function recordPlayer(dt) {
          if (state !== 'playing' || !player.alive) return;
          recT -= dt;
          if (recT <= 0) {
            recT = 0.1;
            recBuf.push({ x: player.x, y: player.y });
            if (recBuf.length > 36) recBuf.shift();
          }
        }

        function bossEnter(e, dt) {
          e.y += (e.targetY - e.y) * Math.min(1, 2 * dt);
          if (Math.abs(e.y - e.targetY) < 4) { e.entering = false; sfxPan13('climax', e.x, 0.35, 1.6); }
        }

        function updateOrgue(e, dt, ratio) {
          const O = e.orgue;
          e.x = W / 2 + Math.sin(e.t * 0.4) * (W * 0.2);
          e.y = e.targetY + Math.sin(e.t * 0.8) * 10;
          O.wave = Math.max(0, O.wave - dt);
          O.ringCd -= dt;
          if (O.ringCd <= 0) {
            O.ringCd = ratio < 0.4 ? 1.9 : 2.8;
            O.wave = 2.2;
            const gap = rand(0, TAU);
            for (let i = 0; i < 12; i++) {
              const a = (i / 12) * TAU;
              let da = Math.abs(((a - gap + Math.PI * 3) % TAU) - Math.PI);
              if (da > Math.PI * 0.72) continue; // le trou de l'anneau
              fireEnemyBullet(e.x, e.y, Math.cos(a) * 135, Math.sin(a) * 135, 6, 12, '#7dd3fc');
            }
            sfxPan13('chord', e.x, 0.5, 0.6);
          }
          if (ratio < 0.4 && e.phase === 1) { e.phase = 2; e.color = '#38bdf8'; toast('🎹 LES TUYAUX SE BRISENT !'); }
          if (e.phase === 2) {
            O.pipeCd -= dt;
            if (O.pipeCd <= 0) {
              O.pipeCd = 1.1;
              explosion(e.x + rand(-e.r, e.r), e.y + rand(-e.r * 0.6, e.r * 0.6), '#7dd3fc', 14, 200);
              sfxPan13('glass', e.x, 0.5, rand(0.7, 1));
            }
          }
        }

        function updateCantatrice(e, dt, ratio) {
          const C = e.cantatrice;
          e.x = W / 2 + Math.sin(e.t * 0.7) * (W * 0.26);
          e.y = e.targetY + Math.sin(e.t * 1.4) * 18;
          // ses choristes la soignent
          let chor = 0;
          for (const o of enemies) if (o.type === 'choriste') chor++;
          if (chor > 0) e.hp = Math.min(e.maxHp, e.hp + 42 * dt);
          C.chorCd -= dt;
          if (C.chorCd <= 0 && chor < 3) {
            C.chorCd = ratio < 0.4 ? 8 : 11;
            for (let k = 0; k < 2; k++) spawnEnemy('choriste', rand(60, W - 60), -30);
            toast('🎶 La Cantatrice appelle son chœur…');
          }
          // aria : laser chantant en glissando
          C.ariaCd -= dt;
          if (C.ariaCd <= 0 && C.aria <= 0) {
            C.aria = ratio < 0.4 ? 3.2 : 2.6;
            C.ariaCd = ratio < 0.4 ? 6 : 9;
            C.ariaA = Math.PI / 2 - 0.9;
            sfxPan13('aria', e.x, 0.9, 1);
          }
          if (C.aria > 0) {
            C.aria -= dt;
            C.ariaA += dt * (ratio < 0.4 ? 0.9 : 0.68); // balayage
            C.hurtCd -= dt;
            const bx = e.x + Math.cos(C.ariaA) * 900, by = e.y + Math.sin(C.ariaA) * 900;
            // distance du joueur à la ligne de l'aria
            const dx = bx - e.x, dy = by - e.y;
            const len = Math.hypot(dx, dy);
            const t2 = clamp(((player.x - e.x) * dx + (player.y - e.y) * dy) / (len * len), 0, 1);
            const px = e.x + dx * t2, py = e.y + dy * t2;
            if (player.alive && Math.hypot(player.x - px, player.y - py) < 18 && C.hurtCd <= 0) {
              C.hurtCd = 0.25;
              damagePlayer(14);
            }
          }
          if (ratio < 0.4 && e.phase === 1) { e.phase = 2; e.color = '#f59e0b'; toast('🎤 ARIA FINALE !'); }
          e.fireCd -= dt;
          if (e.fireCd <= 0) { e.fireCd = 2.2; fireBurst(e, 5, 200); }
        }

        function updateDiapason(e, dt, ratio) {
          const D = e.diapason;
          e.x = W / 2 + Math.sin(e.t * 0.5) * (W * 0.16);
          D.vibL = Math.max(0, D.vibL - dt);
          D.vibR = Math.max(0, D.vibR - dt);
          // les tirs du joueur font vibrer les branches
          for (let j = pBullets.length - 1; j >= 0; j--) {
            const b = pBullets[j];
            if (Math.hypot(b.x - (e.x - 46), b.y - e.y) < 34) { D.vibL = 1.6; pBullets.splice(j, 1); sfxPan13('chord', e.x - 46, 0.3, 0.8); }
            else if (Math.hypot(b.x - (e.x + 46), b.y - e.y) < 34) { D.vibR = 1.6; pBullets.splice(j, 1); sfxPan13('chord', e.x + 46, 0.3, 1.1); }
          }
          if (D.vibL > 0 && D.vibR > 0 && D.shield) {
            D.shield = false;
            D.shieldT = 4;
            toast('🔓 RÉSONANCE — LE BOUCLIER TOMBE !');
            sfxPan13('chord', e.x, 0.9, 1.4);
          }
          if (!D.shield) {
            D.shieldT -= dt;
            if (D.shieldT <= 0) { D.shield = true; D.vibL = 0; D.vibR = 0; toast('Le bouclier se reforme…'); }
          }
          if (D.shield && e.hp < D.lastHp) e.hp = D.lastHp; // invulnérable tant que le bouclier tient
          D.lastHp = e.hp;
          // zones de silence
          D.silCd -= dt;
          if (D.silCd <= 0) {
            D.silCd = ratio < 0.35 ? 7 : 10;
            silenceDuck = 4;
            sfxPan13('silence', W / 2, 0.9, 1);
            toast('🤫 LE SILENCE', 'gold');
          }
          // salves en croix
          e.fireCd -= dt;
          if (e.fireCd <= 0) {
            e.fireCd = ratio < 0.35 ? 1.3 : 2;
            for (let k = 0; k < 4; k++) {
              const a = k * Math.PI / 2 + e.spin * 0.4;
              for (let s = 1; s <= 3; s++) fireEnemyBullet(e.x, e.y, Math.cos(a) * (110 + s * 30), Math.sin(a) * (110 + s * 30), 5, 12, '#c4b5fd');
            }
          }
          if (ratio < 0.35 && e.phase === 1) { e.phase = 2; e.color = '#a78bfa'; toast('⚡ VIBRATIONS MORTELLES'); }
        }

        function updateReveur(e, dt, ratio) {
          const R = e.reveurB;
          slowTime = Math.max(slowTime, 0.25); // bullet-time élégant permanent
          e.x = W / 2 + Math.sin(e.t * 0.25) * (W * 0.22);
          e.y = e.targetY + Math.sin(e.t * 0.5) * 16;
          R.orbCd -= dt;
          if (R.orbCd <= 0) {
            R.orbCd = R.wake ? 1.1 : 2.4;
            const n = R.wake ? 5 : 3;
            for (let k = 0; k < n; k++) {
              const a = Math.PI / 2 + (k - (n - 1) / 2) * 0.4;
              fireEnemyBullet(e.x, e.y, Math.cos(a) * (R.wake ? 250 : 95), Math.sin(a) * (R.wake ? 250 : 95), R.wake ? 5 : 9, 10, R.wake ? '#fb7185' : '#f9a8d4');
            }
            if (!R.wake && Math.random() < 0.4) sfxPan13('hypnosis', e.x, 0.25, 1.3);
          }
          if (ratio < 0.5 && !R.wake) {
            R.wake = 1;
            e.phase = 2;
            e.color = '#fb7185';
            toast('😱 LE RÊVE SE RÉVEILLE !');
            sfxPan13('climax', e.x, 0.5, 0.7);
          }
        }

        function updateCauchemar(e, dt, ratio) {
          const C = e.cauchemar;
          e.x = W / 2 + Math.sin(e.t * 1.1) * (W * 0.3);
          e.y = e.targetY + Math.sin(e.t * 2.2) * 24;
          e.spin += dt * 3;
          C.invCd -= dt;
          if (C.invCd <= 0) {
            C.invCd = ratio < 0.45 ? 6 : 8.5;
            C.inv = 2.4;
            sfxPan13('phase', W / 2, 0.8, 0.5);
            toast('🌈 INVERSION CHROMATIQUE');
          }
          C.inv = Math.max(0, C.inv - dt);
          C.mirCd -= dt;
          if (C.mirCd <= 0) {
            C.mirCd = 7;
            let mcount = 0;
            for (const o of enemies) if (o.type === 'mirage') mcount++;
            if (mcount < 2) for (const dx of [-W * 0.24, W * 0.24]) {
              const m = spawnEnemy('mirage', clamp(e.x + dx, 50, W - 50), e.y + 30);
              if (m) m.color = '#fda4af';
            }
          }
          e.fireCd -= dt;
          if (e.fireCd <= 0) {
            e.fireCd = ratio < 0.45 ? 0.95 : 1.35;
            for (let s = 0; s < 2; s++) {
              for (let i = 0; i < 10; i++) {
                const a = e.spin + s * 0.31 + (i / 10) * TAU;
                fireEnemyBullet(e.x, e.y, Math.cos(a) * 140, Math.sin(a) * 140, 5, 11, s ? '#a5b4fc' : '#f0abfc');
              }
            }
          }
          if (ratio < 0.45 && e.phase === 1) { e.phase = 2; e.color = '#f0abfc'; toast('🌀 LE CAUCHEMAR S\'INTENSIFIE'); }
        }

        function updateInsomniaque(e, dt, ratio) {
          const I = e.insomnie;
          I.modeT -= dt;
          if (I.modeT <= 0) {
            I.mode = I.mode === 'sommeil' ? 'veille' : 'sommeil';
            I.modeT = ratio < 0.4 ? 8 : 12;
            sfxPan13('phase', e.x, 0.6, I.mode === 'veille' ? 1.4 : 0.6);
            toast(I.mode === 'veille' ? '👁️ VEILLE — IL IMITE TON ARME !' : '😴 SOMMEIL — survis…');
          }
          if (I.mode === 'sommeil') {
            e.x += (W / 2 - e.x) * dt;
            if (e.hp < I.lastHp) e.hp = I.lastHp; // invulnérable endormi
            I.minCd -= dt;
            if (I.minCd <= 0) {
              I.minCd = 2.2;
              let pn = 0;
              for (const o of enemies) if (o.type === 'pensee') pn++;
              if (pn < 6) spawnEnemy('pensee', rand(60, W - 60), -30);
            }
          } else {
            // VEILLE : dashes + copie de l'arme du joueur
            e.x += Math.sin(e.t * 3) * 160 * dt;
            e.x = clamp(e.x, 60, W - 60);
            e.fireCd -= dt;
            if (e.fireCd <= 0) {
              e.fireCd = clamp(0.6 - player.weapon * 0.04, 0.28, 0.6);
              for (let k = 0; k < player.weapon + 1; k++) fireAimed(e, 300 + player.weapon * 20, 5, 12, '#2dd4bf');
            }
          }
          I.lastHp = e.hp;
          if (ratio < 0.4 && e.phase === 1) { e.phase = 2; e.color = '#14b8a6'; toast('⚡ INSOMNIE TERMINALE'); }
        }

        function updateMatrice(e, dt, ratio) {
          const M = e.matrice;
          e.x = W / 2 + Math.sin(e.t * 0.6) * (W * 0.24);
          e.y = e.targetY + Math.sin(e.t * 1.1) * 14;
          M.ghCd -= dt;
          if (M.ghCd <= 0) {
            M.ghCd = 8;
            let gn = 0;
            for (const o of enemies) if (o.type === 'echo') gn++;
            if (gn < 3 && recBuf.length > 8) {
              const g = spawnEnemy('echo', recBuf[0].x, recBuf[0].y);
              if (g) {
                g.path = recBuf.slice();
                g.replaySpeed = ratio < 0.4 ? 1.3 : 1;
                g.fireCd = 1.2;
                sfxPan13('phase', g.x, 0.6, 0.9);
                addText(g.x, g.y - 24, 'ÉCHO DE TOI', '#fda4af');
              }
            }
          }
          e.fireCd -= dt;
          if (e.fireCd <= 0) { e.fireCd = 1.8; fireBurst(e, 6, 220); }
          if (ratio < 0.4 && e.phase === 1) { e.phase = 2; e.color = '#fb923c'; toast('⏩ LES ÉCHOS ACCÉLÈRENT'); }
        }

        function updateChoeurMille(e, dt, ratio) {
          const C = e.choeurM;
          C.bodies = C.bodies.filter(b => enemies.includes(b));
          // corps principal suit une dérive lente ; les corps forment des figures
          e.x = W / 2 + Math.sin(e.t * 0.35) * (W * 0.2);
          e.y = e.targetY + Math.sin(e.t * 0.7) * 12;
          C.formT -= dt;
          if (C.formT <= 0) { C.formT = ratio < 0.5 ? 4 : 6; C.form = (C.form + 1) % 3; sfxPan13('chord', e.x, 0.5, 0.9 + C.form * 0.15); }
          const all = [e, ...C.bodies];
          all.forEach((b, k) => {
            const f = k / all.length;
            let tx, ty;
            if (C.form === 0) { // cercle
              tx = e.x + Math.cos(f * TAU + e.t * 0.5) * 95;
              ty = e.y + Math.sin(f * TAU + e.t * 0.5) * 70;
            } else if (C.form === 1) { // vague
              tx = W * (0.12 + f * 0.76);
              ty = e.y + Math.sin(f * Math.PI * 2 + e.t * 1.6) * 55;
            } else { // croix
              const arm = k % 4, dd = 40 + (k % 3) * 34;
              tx = e.x + (arm === 0 ? dd : arm === 1 ? -dd : 0);
              ty = e.y + (arm === 2 ? dd : arm === 3 ? -dd * 0.7 : 0);
            }
            if (b !== e) { b.x += (tx - b.x) * Math.min(1, 3 * dt); b.y += (ty - b.y) * Math.min(1, 3 * dt); }
          });
          C.salveCd -= dt;
          if (C.salveCd <= 0) {
            C.salveCd = ratio < 0.5 ? 1.6 : 2.3;
            for (const b of all) fireAimed(b, 235, 5, 11, '#94a3b8');
            sfxPan13('aria', e.x, 0.35, 0.7 + (all.length / 12) * 0.5);
          }
          if (ratio < 0.5 && e.phase === 1) { e.phase = 2; e.color = '#e2e8f0'; toast('🎼 FIGURES FRÉNÉTIQUES'); }
          // la mort des corps se gère dans killEnemy (transfert de dégâts)
        }

        function updateSignal(e, dt, ratio) {
          const S = e.signal;
          e.x = W / 2 + Math.sin(e.t * 0.3) * (W * 0.14);
          e.y = e.targetY + Math.sin(e.t * 0.6) * 10;
          // changements de mouvement
          if (ratio < 0.66 && S.movement === 1) {
            S.movement = 2;
            e.phase = 2;
            e.color = '#cbd5e1';
            sfxPan13('silence', W / 2, 1, 1);
            silenceDuck = 12;
            toast('🤫 II. SILENCE — le son meurt…', 'gold');
          } else if (ratio < 0.33 && S.movement === 2) {
            S.movement = 3;
            e.phase = 3;
            e.color = '#f0abfc';
            silenceDuck = 0;
            if (AudioSys.master) AudioSys.master.gain.setTargetAtTime(1, AudioSys.ctx.currentTime, 0.5);
            S.minCd = 0.5;
            toast('🎼 III. FUGUE — les anciens reviennent…', 'gold');
          } else if (ratio < 0.12 && S.movement === 3) {
            S.movement = 4;
            e.phase = 4;
            e.color = '#fef3c7';
            S.lastHp4 = e.hp;
            S.unisonOn = sfxPan13('unison', W / 2, 0.0001, 1, true);
            if (S.unisonOn) S.unisonOn.g.gain.setTargetAtTime(0.7, AudioSys.ctx.currentTime, 2);
            eBullets.length = 0;
            toast('✦ IV. UNISSON — TIENS LA NOTE ✦', 'gold');
          }
          if (S.movement === 1) {
            e.fireCd -= dt;
            if (e.fireCd <= 0) {
              e.fireCd = 1.5;
              for (let i = 0; i < 14; i++) {
                const a = e.spin + (i / 14) * TAU;
                fireEnemyBullet(e.x, e.y, Math.cos(a) * 150, Math.sin(a) * 150, 5, 12, '#fde68a');
              }
              fireBurst(e, 4, 230);
            }
          } else if (S.movement === 2) {
            // silence : vagues lentes, glaçantes
            e.fireCd -= dt;
            if (e.fireCd <= 0) {
              e.fireCd = 2.6;
              for (let i = 0; i < 8; i++) {
                const a = Math.PI / 2 + (i - 3.5) * 0.22;
                fireEnemyBullet(e.x, e.y, Math.cos(a) * 90, Math.sin(a) * 90, 8, 13, '#cbd5e1');
              }
            }
          } else if (S.movement === 3) {
            // fugue : échos des anciens boss
            S.minCd -= dt;
            if (S.minCd <= 0) {
              S.minCd = 7;
              let eb = 0;
              for (const o of enemies) if (o.type === 'echoBoss') eb++;
              if (eb < 1) {
                const g = spawnEnemy('echoBoss', rand(W * 0.3, W * 0.7), H * 0.2);
                if (g) { g.echoKind = Math.floor(rand(0, 3)); g.fireCd = 1; toast('👁️ Un ancien te reconnaît…'); }
              }
            }
            e.fireCd -= dt;
            if (e.fireCd <= 0) { e.fireCd = 2; fireBurst(e, 5, 210); }
          } else {
            // UNISSON : on ne tire plus pour tuer — on tient la note
            if (e.hp < S.lastHp4) e.hp = S.lastHp4; // invulnérable : l'accord seul achève
            S.beamX = W / 2 + Math.sin(e.t * 0.5) * (W * 0.28);
            const inside = player.alive && Math.abs(player.x - S.beamX) < 55;
            S.accord = clamp(S.accord + (inside ? dt : -dt * 1.4), 0, 12);
            if (S.unisonOn) S.unisonOn.g.gain.setTargetAtTime(0.4 + (S.accord / 12) * 0.6, AudioSys.ctx.currentTime, 0.3);
            bloom = Math.max(bloom, (S.accord / 12) * 0.35);
            if (inside && Math.random() < 0.3) addParticle(player.x, player.y - 20, rand(-40, 40), rand(-90, -40), 0.5, 3, '#fef3c7');
            if (S.accord >= 12) {
              e.hp = 0;
              killEnemy(enemies.indexOf(e));
            }
          }
          S.lastHp4 = S.movement === 4 ? S.lastHp4 : e.hp;
        }

        function updateEchoBoss(e, dt) {
          // écho réduit des boss passés (fugue du Signal)
          e.spin = (e.spin || 0) + dt * 2;
          e.x += Math.sin(e.t * 1.2) * 40 * dt;
          e.y += Math.sin(e.t * 0.7) * 14 * dt;
          e.fireCd -= dt;
          if (e.fireCd <= 0) {
            if (e.echoKind === 0) { // léviathan : spirale
              e.fireCd = 2;
              for (let i = 0; i < 8; i++) {
                const a = e.spin + (i / 8) * TAU;
                fireEnemyBullet(e.x, e.y, Math.cos(a) * 140, Math.sin(a) * 140, 5, 11, '#fb923c');
              }
            } else if (e.echoKind === 1) { // matriarche : éventail
              e.fireCd = 1.7;
              fireBurst(e, 5, 200);
            } else { // architecte : téléportation
              e.fireCd = 3.5;
              for (let k = 0; k < 8; k++) addParticle(e.x, e.y, rand(-120, 120), rand(-120, 120), 0.3, 3, '#e2e8f0');
              e.x = rand(70, W - 70);
              e.y = rand(H * 0.12, H * 0.3);
              sfxPan13('phase', e.x, 0.5, 1.4);
            }
          }
        }

        function updateBoss13Custom(e, dt) {
          if (e.entering) { bossEnter(e, dt); return; }
          e.t += dt;
          e.spin += dt * 1.1;
          const ratio = clamp(e.hp / e.maxHp, 0, 1);
          if (e.orgue) updateOrgue(e, dt, ratio);
          else if (e.cantatrice) updateCantatrice(e, dt, ratio);
          else if (e.diapason) updateDiapason(e, dt, ratio);
          else if (e.reveurB) updateReveur(e, dt, ratio);
          else if (e.cauchemar) updateCauchemar(e, dt, ratio);
          else if (e.insomnie) updateInsomniaque(e, dt, ratio);
          else if (e.matrice) updateMatrice(e, dt, ratio);
          else if (e.choeurM) updateChoeurMille(e, dt, ratio);
          else if (e.signal) updateSignal(e, dt, ratio);
        }
        const baseBoss13 = updateBoss;
        updateBoss = function (e, dt, d) {
          if (e.custom13) { updateBoss13Custom(e, dt); return; }
          baseBoss13(e, dt, d);
        };
        // silence du Diapason / du Signal : le mix s'éteint littéralement
        function updateSilenceDuck(dt) {
          if (!AudioSys.ctx || !AudioSys.master) { silenceDuck = 0; return; }
          if (silenceDuck > 0) {
            silenceDuck -= dt;
            AudioSys.master.gain.setTargetAtTime(0.05, AudioSys.ctx.currentTime, 0.4);
            if (silenceDuck <= 0) AudioSys.master.gain.setTargetAtTime(1, AudioSys.ctx.currentTime, 0.6);
          }
        }

        // ================= 7. FLUX DES ACTES =================
        const ACTE_INTROS = {
          3: '« Au-delà de la singularité, un chant. Les machines t\'attendaient. »',
          4: '« L\'aria t\'a touché. Tu tombes dans le rêve du Signal. »',
          5: '« Tu connais la mélodie, maintenant. Va t\'accorder. »'
        };
        const ACTE_TITLES = {
          3: '🎹 ACTE III — LE CHŒUR DES MACHINES',
          4: '🌙 ACTE IV — LA DESCENTE',
          5: '✦ ACTE V — APOTHÉOSE'
        };
        let pendingDrops13 = [];

        function acteTransition13(newSec) {
          sec3 = newSec;
          makeBackground();
          playMusic13(SECTORS3[sec3 - 8].music);
          const S = SECTORS3[sec3 - 8];
          waveBanner = `SECTEUR ${ROMANS3[sec3 - 8]} — ${S.name.toUpperCase()}`;
          waveBannerTime = 3.2;
          toast(`🌀 ${S.name}`, 'gold');
          unlockCodex(sec3 - 8);
          player.shield = Math.min(player.maxShield, player.shield + 40);
          shockwaves.push({ x: W / 2, y: H * 0.3, r: 20, max: Math.max(W, H) * 0.8, life: 0.9, maxLife: 0.9 });
          if (window.__NP4 && window.__NP4.v10) window.__NP4.v10.dropCoins(10);
        }

        function actVictory(e, n) {
          chainBoom13(e);
          acteDone[n] = true;
          if (typeof triggerHitStop === 'function') triggerHitStop(0.45);
          showVictory();
        }
        function chainBoom13(e) {
          for (let k = 0; k < 8; k++) {
            setTimeout(() => {
              explosion(e.x + rand(-e.r * 1.5, e.r * 1.5), e.y + rand(-e.r, e.r), pick(['#fbbf24', '#f87171', '#a5f3fc', '#fef3c7']), 30, 280);
              AudioSys.explosion(k % 2 === 0);
            }, 220 * k);
          }
        }

        function startActe(n) {
          acte = n;
          sec3 = 8 + (n - 3) * 3;
          deaths13[n] = 0;
          finalDefeated = true; // verrouille la victoire générique
          hide(victoryOverlay);
          state = 'playing';
          document.body.classList.add('playing');
          player.alive = true;
          player.hull = Math.min(player.maxHull, player.hull + 80);
          player.shield = Math.min(player.maxShield, player.shield + 80);
          const ch = document.getElementById('coinHud');
          if (ch) ch.style.display = 'block';
          makeBackground();
          playMusic13(SECTORS3[sec3 - 8].music);
          startPad();
          tension = 0.08;
          interlude = 4; // ouverture méditative
          pendInterlude = 0.5;
          waveBanner = ACTE_TITLES[n];
          waveBannerTime = 4;
          signalLine(ACTE_INTROS[n]);
          unlockCodex(sec3 - 8);
          pendingDrops13 = n === 3 ? [['R', 3], ['P', 9]] : n === 4 ? [['D', 3], ['K', 9]] : [['C', 3], ['N', 8]];
          updateHUD();
          startWave(n === 3 ? 25 : n === 4 ? 34 : 43);
        }

        function addActeButton(n) {
          const ov = $('victoryOverlay');
          if (!ov || ov.querySelector('#acte' + n + 'Btn')) return;
          const btn = document.createElement('button');
          btn.id = 'acte' + n + 'Btn';
          btn.className = 'btn';
          btn.textContent = ACTE_TITLES[n];
          const grad = n === 3 ? '#7c3aed,#0369a1' : n === 4 ? '#0f766e,#4c1d95' : '#b45309,#7c2d12';
          btn.style.cssText = `background:linear-gradient(135deg,${grad});margin:10px 0 4px;box-shadow:0 0 24px rgba(196,181,253,.4);width:100%`;
          btn.addEventListener('click', () => { AudioSys.ui(); startActe(n); });
          const btnRow = ov.querySelector('.btn-row');
          if (btnRow) btnRow.before(btn);
          else ov.appendChild(btn);
        }

        function addArchivesPanel() {
          const ov = $('victoryOverlay');
          if (!ov || ov.querySelector('#archivesBtn') || !codex13.length) return;
          const btn = document.createElement('button');
          btn.id = 'archivesBtn';
          btn.className = 'btn';
          btn.textContent = `📖 ARCHIVES DU SIGNAL (${codex13.length})`;
          btn.style.cssText = 'background:rgba(30,27,75,.85);margin:6px 0 2px;width:100%;font-size:13px';
          const panel = document.createElement('div');
          panel.id = 'archivesPanel';
          panel.style.cssText = 'display:none;max-height:180px;overflow-y:auto;text-align:left;font-size:12px;line-height:1.5;color:#c7d2fe;background:rgba(10,10,26,.7);border-radius:10px;padding:10px;margin:6px 0';
          btn.addEventListener('click', () => {
            AudioSys.ui();
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            panel.innerHTML = codex13.map(c => `<div style="margin:4px 0">${c}</div>`).join('');
          });
          const btnRow = ov.querySelector('.btn-row');
          if (btnRow) { btnRow.before(btn); btnRow.before(panel); }
          else { ov.appendChild(btn); ov.appendChild(panel); }
        }

        const baseVictory13 = showVictory;
        showVictory = function () {
          baseVictory13();
          const title = document.querySelector('#victoryOverlay .title');
          const ve = $('victoryEarned');
          if (signalDown) {
            if (title) title.textContent = '✦ APOTHÉOSE — TU ES LA NOTE JUSTE ✦';
            if (ve) ve.textContent += ' · ÉPILOGUE : LA FUGUE CONTINUE, ET TU EN FAIS PARTIE';
            if (deaths13[5] === 0) {
              if (ve) ve.textContent += ' · 👑 PERFECT ACTE V +1000 ⬡';
              meta.nanites = (meta.nanites || 0) + 1000;
              saveMeta();
            }
          } else if (acteDone[4] && acte === 4) {
            if (title) title.textContent = 'LE RÊVE SE TERMINE';
            if (deaths13[4] === 0 && ve) { ve.textContent += ' · 👑 PERFECT ACTE IV +750 ⬡'; meta.nanites = (meta.nanites || 0) + 750; saveMeta(); }
            addActeButton(5);
          } else if (acteDone[3] && acte === 3) {
            if (title) title.textContent = "LE CHŒUR S'EST TU";
            if (deaths13[3] === 0 && ve) { ve.textContent += ' · 👑 PERFECT ACTE III +750 ⬡'; meta.nanites = (meta.nanites || 0) + 750; saveMeta(); }
            addActeButton(4);
          } else if (window.__NP4 && window.__NP4.v12 && window.__NP4.v12.acte2Done() && acte < 3 && !acteDone[3]) {
            if (title) title.textContent = "L'AU-DELÀ EST FRANCHI";
            addActeButton(3);
          }
          addArchivesPanel();
        };

        const baseDmgP13 = damagePlayer;
        damagePlayer = function (amount) {
          const wasAlive = player.alive;
          baseDmgP13(amount);
          if (acte >= 3 && wasAlive && !player.alive) deaths13[acte]++;
        };

        // ================= 8. MORTS & DROPS =================
        const baseKill13 = killEnemy;
        killEnemy = function (index, award) {
          const e = (typeof index === 'number') ? enemies[index] : index;
          if (e && e.custom13 && e.type === 'boss') {
            const wasFinal = e.finalBoss;
            e.finalBoss = true; // neutralise le portail v5.10 / la victoire parasite
            baseKill13(index, award);
            e.finalBoss = wasFinal;
            climaxAt(e.x);
            if (e.signal && e.signal.unisonOn) { try { e.signal.unisonOn.src.stop(); } catch (err) {} }
            if (e.orgue) acteTransition13(9);
            else if (e.cantatrice) acteTransition13(10);
            else if (e.diapason) actVictory(e, 3);
            else if (e.reveurB) acteTransition13(12);
            else if (e.cauchemar) acteTransition13(13);
            else if (e.insomnie) actVictory(e, 4);
            else if (e.matrice) acteTransition13(15);
            else if (e.choeurM) {
              for (const b of e.choeurM.bodies.slice()) {
                const bi = enemies.indexOf(b);
                if (bi >= 0) { b.milleDead = true; baseKill13(bi, false); }
              }
              acteTransition13(16);
            }
            else if (e.signal) { signalDown = true; actVictory(e, 5); }
            return;
          }
          const ex = e ? e.x : 0, ey = e ? e.y : 0;
          const type = e ? e.type : null;
          const choir = e && e.mille ? e.choir : null;
          baseKill13(index, award);
          if (choir && enemies.includes(choir)) {
            choir.hp -= 600;
            sfxPan13('glass', ex, 0.5, 0.5 + clamp(choir.hp / choir.maxHp, 0, 1));
            addText(ex, ey - 18, 'DÉSACCORD', '#94a3b8');
            if (choir.hp <= 0) {
              const ci = enemies.indexOf(choir);
              if (ci >= 0) killEnemy(ci);
            }
          }
          if (type === 'prisme') {
            sfxPan13('glass', ex, 0.7, rand(0.9, 1.2));
            for (let k = 0; k < 3; k++) {
              const s = spawnEnemy('eclat', ex, ey);
              if (s) s.vx = (k - 1) * 90;
            }
          } else if (type === 'comete') {
            explosion(ex, ey, '#fdba74', 26, 260);
            hurtAt(ex, ey, 95, 70, '#fdba74'); // la gerbe emporte les autres
          } else if (type === 'psyche') {
            sfxPan13('phase', ex, 0.7, 1.5);
            for (let k = 0; k < 16; k++) addParticle(ex, ey, rand(-200, 200), rand(-200, 200), 0.5, 3.5, pick(['#f0abfc', '#a5f3fc', '#fde68a', '#f9a8d4']));
            slowTime = Math.max(slowTime, 0.35); // micro bullet-time gratifiant
            bloom = Math.max(bloom, 0.25);
          }
          if (e && acte >= 3 && (e.elite || e.type === 'miniboss') && Math.random() < 0.24) {
            const pool = acte === 3 ? ['R', 'P'] : acte === 4 ? ['D', 'K'] : ['C', 'N'];
            dropPowerup(ex, ey, pool[Math.floor(rand(0, pool.length))]);
          }
        };

        // ================= 9. COSMOS DES SECTEURS VIII–XVII =================
        const baseCosmos13 = window.__drawCosmos;
        const cp13 = [];
        let ring13T = 2, kalA = 0;
        function updateCosmos13(dt) {
          if (acte < 3 || sec3 < 8) return;
          const s = sec3;
          kalA += dt * 0.1;
          if (s === 8 && cp13.filter(o => o.k === 'spark').length < 14 && Math.random() < dt * 4) {
            cp13.push({ k: 'spark', x: rand(0, W), y: H + 8, vy: rand(-26, -10), tw: rand(0, TAU), t: 0, life: rand(8, 14) });
          } else if (s === 9 && cp13.filter(o => o.k === 'dust').length < 16 && Math.random() < dt * 3.4) {
            cp13.push({ k: 'dust', x: rand(0, W), y: -8, vy: rand(8, 20), sw: rand(0, TAU), r: rand(1, 2.6), t: 0, life: rand(10, 18) });
          } else if (s === 10) {
            ring13T -= dt;
            if (ring13T <= 0) { ring13T = rand(2, 4.5); cp13.push({ k: 'ring', x: rand(W * 0.2, W * 0.8), y: rand(H * 0.2, H * 0.7), r: 6, t: 0, life: 2.4 }); }
          } else if (s === 11 && cp13.filter(o => o.k === 'bubble').length < 12 && Math.random() < dt * 2.6) {
            cp13.push({ k: 'bubble', x: rand(0, W), y: H + 10, vy: rand(-34, -16), r: rand(3, 9), ph: rand(0, TAU), t: 0, life: rand(8, 14) });
          } else if (s === 12 && cp13.filter(o => o.k === 'blob').length < 6 && Math.random() < dt * 0.8) {
            cp13.push({ k: 'blob', x: rand(0, W), y: rand(H * 0.3, H), vx: rand(-14, 14), r: rand(16, 40), ph: rand(0, TAU), t: 0, life: rand(10, 16) });
          } else if (s === 13 && cp13.filter(o => o.k === 'shard').length < 8 && Math.random() < dt * 1.4) {
            cp13.push({ k: 'shard', x: rand(0, W), y: -20, vy: rand(14, 30), rot: rand(0, TAU), vr: rand(-1, 1), s2: rand(8, 22), t: 0, life: rand(9, 15) });
          } else if (s === 14 && cp13.filter(o => o.k === 'ember').length < 18 && Math.random() < dt * 5) {
            cp13.push({ k: 'ember', x: rand(0, W), y: H + 6, vy: rand(-46, -20), sw: rand(0, TAU), t: 0, life: rand(6, 11) });
          } else if (s === 15 && cp13.filter(o => o.k === 'streak').length < 7 && Math.random() < dt * 1.8) {
            cp13.push({ k: 'streak', x: rand(0, W), y: rand(0, H * 0.8), len: rand(40, 130), vx: rand(60, 160), t: 0, life: rand(1.5, 3) });
          } else if (s === 16 && cp13.filter(o => o.k === 'glyph').length < 9 && Math.random() < dt * 1.6) {
            cp13.push({ k: 'glyph', a: rand(0, TAU), rr: rand(60, 190), cy: rand(H * 0.25, H * 0.75), va: rand(0.2, 0.5), t: 0, life: rand(8, 14) });
          }
          for (let i = cp13.length - 1; i >= 0; i--) {
            const o = cp13[i];
            o.t += dt;
            o.life -= dt;
            if (o.vy) o.y += o.vy * dt;
            if (o.vx) o.x += o.vx * dt;
            if (o.k === 'ring') o.r += 60 * dt;
            if (o.k === 'shard') o.rot += o.vr * dt;
            if (o.k === 'glyph') o.a += o.va * dt;
            if (o.life <= 0 || o.y < -60 || o.y > H + 60 || o.x > W + 160) cp13.splice(i, 1);
          }
          if (cp13.length > 90) cp13.splice(0, cp13.length - 90);
        }
        function drawCosmos13() {
          if (meta.qualityOverride === 'low') return;
          ctx.save();
          const s = sec3;
          if (s === 13) {
            // voile kaléidoscopique de l'Œil du Rêve
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.05 + Math.sin(cosmo13T * 0.7) * 0.02;
            for (let k = 0; k < 6; k++) {
              ctx.save();
              ctx.translate(W / 2, H * 0.4);
              ctx.rotate(kalA + (k * Math.PI) / 3);
              ctx.strokeStyle = k % 2 ? '#a5b4fc' : '#f0abfc';
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(Math.cos(kalA) * W * 0.4, Math.sin(kalA) * H * 0.3);
              ctx.stroke();
              ctx.restore();
            }
            ctx.globalAlpha = 1;
          }
          if (s === 16) {
            // halo de mandala respirant
            ctx.globalCompositeOperation = 'lighter';
            const br = 0.04 + Math.sin(cosmo13T * 1.1) * 0.02;
            const g = ctx.createRadialGradient(W / 2, H * 0.32, 0, W / 2, H * 0.32, W * 0.55);
            g.addColorStop(0, `rgba(254,243,199,${br})`);
            g.addColorStop(1, 'rgba(254,243,199,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
          }
          for (const o of cp13) {
            ctx.globalCompositeOperation = 'lighter';
            if (o.k === 'spark') {
              ctx.fillStyle = `rgba(125,211,252,${0.4 + Math.sin(o.t * 6 + o.tw) * 0.3})`;
              ctx.fillRect(o.x, o.y, 2, 2);
            } else if (o.k === 'dust') {
              ctx.fillStyle = `rgba(251,191,36,${0.25 + Math.sin(o.t * 2 + o.sw) * 0.15})`;
              ctx.beginPath(); ctx.arc(o.x + Math.sin(o.t + o.sw) * 8, o.y, o.r, 0, TAU); ctx.fill();
            } else if (o.k === 'ring') {
              ctx.strokeStyle = `rgba(196,181,253,${clamp(o.life / 2.4, 0, 1) * 0.3})`;
              ctx.lineWidth = 1.4;
              ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, TAU); ctx.stroke();
            } else if (o.k === 'bubble') {
              const a = 0.3 + Math.sin(o.t * 2 + o.ph) * 0.12;
              ctx.strokeStyle = `rgba(249,168,212,${a})`;
              ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, TAU); ctx.stroke();
              ctx.strokeStyle = `rgba(165,243,252,${a * 0.6})`;
              ctx.beginPath(); ctx.arc(o.x + 1.5, o.y - 1.5, o.r * 0.7, 0, Math.PI); ctx.stroke();
            } else if (o.k === 'blob') {
              const g2 = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
              g2.addColorStop(0, 'rgba(45,212,191,.07)');
              g2.addColorStop(1, 'rgba(45,212,191,0)');
              ctx.fillStyle = g2;
              ctx.beginPath(); ctx.arc(o.x, o.y + Math.sin(o.t + o.ph) * 10, o.r, 0, TAU); ctx.fill();
            } else if (o.k === 'shard') {
              ctx.save();
              ctx.translate(o.x, o.y);
              ctx.rotate(o.rot);
              ctx.strokeStyle = 'rgba(165,180,252,.4)';
              ctx.strokeRect(-o.s2 / 2, -o.s2 / 2, o.s2, o.s2);
              ctx.restore();
            } else if (o.k === 'ember') {
              ctx.fillStyle = `rgba(253,186,116,${0.4 + Math.sin(o.t * 5 + o.sw) * 0.25})`;
              ctx.beginPath(); ctx.arc(o.x + Math.sin(o.t * 2) * 6, o.y, 1.6, 0, TAU); ctx.fill();
            } else if (o.k === 'streak') {
              const a = clamp(o.life / 2, 0, 1) * 0.35;
              const g3 = ctx.createLinearGradient(o.x, o.y, o.x - o.len, o.y);
              g3.addColorStop(0, `rgba(148,163,184,${a})`);
              g3.addColorStop(1, 'rgba(148,163,184,0)');
              ctx.fillStyle = g3;
              ctx.fillRect(o.x - o.len, o.y, o.len, 1.4);
            } else if (o.k === 'glyph') {
              const gx = W / 2 + Math.cos(o.a) * o.rr;
              const gy = o.cy + Math.sin(o.a) * o.rr * 0.4;
              ctx.fillStyle = `rgba(254,243,199,${clamp(o.life / 8, 0, 1) * 0.5})`;
              ctx.beginPath(); ctx.arc(gx, gy, 2.4, 0, TAU); ctx.fill();
              ctx.fillRect(gx, gy - 8, 1.2, 8);
            }
          }
          ctx.restore();
        }
        window.__drawCosmos = function () {
          if (acte < 3 || sec3 < 8) {
            if (baseCosmos13) baseCosmos13();
            return;
          }
          drawCosmos13();
        };

        // ================= 10. RENDU =================
        const baseDrawBoss13 = drawBoss;
        drawBoss = function (e) {
          if (e.custom13) return; // rendus dédiés dans drawActe3
          baseDrawBoss13(e);
        };

        function drawOrgue(e) {
          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.strokeStyle = e.color;
          ctx.lineWidth = 2.5;
          for (let k = -3; k <= 3; k++) {
            const h = e.r * (0.5 + (3 - Math.abs(k)) * 0.22) * (1 + Math.sin(e.t * 3 + k) * 0.05);
            ctx.fillStyle = 'rgba(20,40,60,.9)';
            ctx.fillRect(k * 16 - 6, -h, 12, h + e.r * 0.4);
            ctx.strokeRect(k * 16 - 6, -h, 12, h + e.r * 0.4);
          }
          ctx.globalCompositeOperation = 'lighter';
          const g = ctx.createRadialGradient(0, e.r * 0.2, 0, 0, e.r * 0.2, 20);
          g.addColorStop(0, 'rgba(125,211,252,.9)');
          g.addColorStop(1, 'rgba(125,211,252,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(0, e.r * 0.2, 20, 0, TAU); ctx.fill();
          ctx.restore();
        }
        function drawCantatrice(e) {
          ctx.save();
          ctx.translate(e.x, e.y);
          const br = 1 + Math.sin(e.t * 2.6) * 0.04;
          ctx.strokeStyle = e.color;
          ctx.lineWidth = 2.5;
          ctx.fillStyle = 'rgba(60,40,6,.92)';
          ctx.beginPath();
          ctx.moveTo(0, -e.r * br);
          ctx.quadraticCurveTo(e.r * 0.7, 0, 0, e.r * br);
          ctx.quadraticCurveTo(-e.r * 0.7, 0, 0, -e.r * br);
          ctx.fill(); ctx.stroke();
          for (let k = 0; k < 5; k++) { // couronne
            const a = -Math.PI / 2 + (k - 2) * 0.4;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * e.r * 0.5, -e.r * 0.4 + Math.sin(a) * e.r * 0.3);
            ctx.lineTo(Math.cos(a) * e.r * 0.9, -e.r * 0.85 + Math.sin(a) * e.r * 0.4);
            ctx.stroke();
          }
          ctx.globalCompositeOperation = 'lighter';
          const g = ctx.createRadialGradient(0, -e.r * 0.2, 0, 0, -e.r * 0.2, 16);
          g.addColorStop(0, 'rgba(251,191,36,.95)');
          g.addColorStop(1, 'rgba(251,191,36,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(0, -e.r * 0.2, 16, 0, TAU); ctx.fill();
          ctx.restore();
          // faisceau de l'aria
          const C = e.cantatrice;
          if (C && C.aria > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const bx = e.x + Math.cos(C.ariaA) * 900, by = e.y + Math.sin(C.ariaA) * 900;
            const grad = ctx.createLinearGradient(e.x, e.y, bx, by);
            grad.addColorStop(0, 'rgba(251,191,36,.8)');
            grad.addColorStop(1, 'rgba(251,191,36,.05)');
            ctx.strokeStyle = grad;
            ctx.lineWidth = 14 + Math.sin(cosmo13T * 18) * 4;
            ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(bx, by); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,.7)';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(bx, by); ctx.stroke();
            ctx.restore();
          }
        }
        function drawDiapason(e) {
          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.strokeStyle = e.color;
          ctx.lineWidth = 5;
          const D = e.diapason;
          const vL = D.vibL > 0 ? Math.sin(cosmo13T * 40) * 4 : 0;
          const vR = D.vibR > 0 ? Math.sin(cosmo13T * 40) * 4 : 0;
          ctx.beginPath(); // fourche
          ctx.moveTo(-46 + vL, -e.r);
          ctx.lineTo(-46 + vL, e.r * 0.2);
          ctx.quadraticCurveTo(0, e.r * 0.9, 46 + vR, e.r * 0.2);
          ctx.lineTo(46 + vR, -e.r);
          ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, e.r * 0.62); ctx.lineTo(0, e.r * 1.2); ctx.stroke();
          if (D.shield) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = `rgba(196,181,253,${0.4 + Math.sin(cosmo13T * 4) * 0.2})`;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, e.r * 1.35, 0, TAU); ctx.stroke();
          }
          ctx.restore();
        }
        function drawReveur(e) {
          ctx.save();
          ctx.translate(e.x, e.y);
          const breathe = 1 + Math.sin(e.t * 1.4) * 0.06;
          ctx.fillStyle = e.reveurB.wake ? 'rgba(80,16,26,.92)' : 'rgba(50,26,54,.92)';
          ctx.strokeStyle = e.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.ellipse(0, 0, e.r * breathe, e.r * 0.8 * breathe, 0, 0, TAU); ctx.fill(); ctx.stroke();
          // œil fermé / ouvert
          ctx.strokeStyle = e.reveurB.wake ? '#fb7185' : '#f9a8d4';
          ctx.lineWidth = 3;
          ctx.beginPath();
          if (e.reveurB.wake) {
            ctx.arc(0, 0, 16, 0, TAU);
            ctx.stroke();
            ctx.fillStyle = '#fb7185';
            ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill();
          } else {
            ctx.arc(0, -6, 18, 0.3, Math.PI - 0.3);
            ctx.stroke();
          }
          ctx.restore();
        }
        function drawCauchemar(e) {
          ctx.save();
          // triple corps RGB séparé
          for (const [dx, col] of [[-4, '#f43f5e'], [4, '#22d3ee'], [0, e.color]]) {
            ctx.save();
            ctx.translate(e.x + dx, e.y);
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = col;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let k = 0; k < 6; k++) {
              const a = e.spin + (k / 6) * TAU;
              ctx.moveTo(0, 0);
              ctx.lineTo(Math.cos(a) * e.r, Math.sin(a) * e.r);
            }
            ctx.stroke();
            ctx.beginPath(); ctx.arc(0, 0, e.r * 0.5, 0, TAU); ctx.stroke();
            ctx.restore();
          }
          ctx.restore();
        }
        function drawInsomniaque(e) {
          ctx.save();
          ctx.translate(e.x, e.y);
          const I = e.insomnie;
          ctx.strokeStyle = e.color;
          ctx.lineWidth = 2.5;
          ctx.fillStyle = I.mode === 'sommeil' ? 'rgba(8,40,40,.92)' : 'rgba(40,8,20,.92)';
          ctx.beginPath(); ctx.arc(0, 0, e.r, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.arc(0, 0, e.r, -Math.PI / 2, Math.PI / 2); // moitié veille
          ctx.strokeStyle = I.mode === 'veille' ? '#f43f5e' : '#2dd4bf';
          ctx.stroke();
          // œil gauche fermé, œil droit ouvert
          ctx.strokeStyle = '#2dd4bf';
          ctx.beginPath(); ctx.arc(-e.r * 0.35, -e.r * 0.2, 8, 0.2, Math.PI - 0.2); ctx.stroke();
          ctx.fillStyle = I.mode === 'veille' ? '#f43f5e' : '#164e46';
          ctx.beginPath(); ctx.arc(e.r * 0.35, -e.r * 0.2, 8, 0, TAU); ctx.fill();
          ctx.restore();
        }
        function drawMatrice(e) {
          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.rotate(e.spin * 0.6);
          ctx.strokeStyle = e.color;
          ctx.lineWidth = 2.5;
          ctx.globalCompositeOperation = 'lighter';
          for (let k = 0; k < 3; k++) {
            ctx.save();
            ctx.rotate((k * Math.PI) / 3);
            ctx.strokeRect(-e.r * 0.6, -e.r * 0.6, e.r * 1.2, e.r * 1.2);
            ctx.restore();
          }
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, e.r * 0.4);
          g.addColorStop(0, 'rgba(253,186,116,.9)');
          g.addColorStop(1, 'rgba(253,186,116,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(0, 0, e.r * 0.4, 0, TAU); ctx.fill();
          ctx.restore();
        }
        function drawMilleBody(b) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = 'rgba(226,232,240,.9)';
          ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
          ctx.fillRect(2, -16, 2, 16); // note de musique
          ctx.strokeStyle = 'rgba(148,163,184,.6)';
          ctx.beginPath(); ctx.arc(0, 0, 13 + Math.sin(cosmo13T * 3 + b.ang) * 3, 0, TAU); ctx.stroke();
          ctx.restore();
        }
        function drawSignal(e) {
          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.globalCompositeOperation = 'lighter';
          for (let k = 0; k < 5; k++) {
            ctx.save();
            ctx.rotate(e.spin * (0.3 + k * 0.14) + (k * Math.PI) / 5);
            ctx.strokeStyle = e.color;
            ctx.globalAlpha = 0.5 + Math.sin(cosmo13T * 2 + k) * 0.2;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, e.r * (0.4 + k * 0.18), 0, TAU); ctx.stroke();
            ctx.restore();
          }
          ctx.globalAlpha = 1;
          const pulse = e.signal && e.signal.movement === 4 ? 1 + Math.sin(cosmo13T * 6) * 0.15 : 1;
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, e.r * 0.5 * pulse);
          g.addColorStop(0, 'rgba(254,243,199,.95)');
          g.addColorStop(1, 'rgba(254,243,199,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(0, 0, e.r * 0.5 * pulse, 0, TAU); ctx.fill();
          ctx.restore();
          // faisceau d'accord (mouvement IV)
          if (e.signal && e.signal.movement === 4) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const g2 = ctx.createLinearGradient(e.signal.beamX - 55, 0, e.signal.beamX + 55, 0);
            g2.addColorStop(0, 'rgba(254,243,199,0)');
            g2.addColorStop(0.5, 'rgba(254,243,199,.16)');
            g2.addColorStop(1, 'rgba(254,243,199,0)');
            ctx.fillStyle = g2;
            ctx.fillRect(e.signal.beamX - 55, 0, 110, H);
            // jauge d'accord
            ctx.fillStyle = 'rgba(254,243,199,.85)';
            ctx.fillRect(W * 0.2, H - 30, (W * 0.6) * (e.signal.accord / 12), 5);
            ctx.strokeStyle = 'rgba(254,243,199,.5)';
            ctx.strokeRect(W * 0.2, H - 30, W * 0.6, 5);
            ctx.restore();
          }
        }

        function drawNewEnemies() {
          for (const e of enemies) {
            ctx.save();
            if (e.sleepT > 0) ctx.globalAlpha = 0.55;
            if (e.ghostNow) ctx.globalAlpha = 0.16;
            switch (e.type) {
              case 'prisme':
                ctx.translate(e.x, e.y);
                ctx.rotate(e.spin || 0);
                ctx.strokeStyle = '#a5f3fc';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, -e.r); ctx.lineTo(e.r * 0.8, e.r * 0.6); ctx.lineTo(-e.r * 0.8, e.r * 0.6);
                ctx.closePath(); ctx.stroke();
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = 'rgba(165,243,252,.2)'; ctx.fill();
                break;
              case 'eclat':
                ctx.translate(e.x, e.y);
                ctx.rotate(e.spin || 0);
                ctx.fillStyle = '#a5f3fc';
                ctx.fillRect(-3, -5, 6, 10);
                break;
              case 'choriste':
                ctx.translate(e.x, e.y);
                if (e.link) {
                  ctx.globalCompositeOperation = 'lighter';
                  ctx.strokeStyle = 'rgba(253,224,71,.35)';
                  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(e.link.x - e.x, e.link.y - e.y); ctx.stroke();
                }
                ctx.strokeStyle = '#fde047';
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(0, 0, e.r * 0.8, 0, TAU); ctx.stroke();
                ctx.beginPath(); ctx.arc(0, 0, e.r * 0.4, 0, TAU); ctx.stroke();
                break;
              case 'sangsue':
                ctx.translate(e.x, e.y);
                ctx.fillStyle = e.attached ? '#fb7185' : '#f43f5e';
                ctx.beginPath(); ctx.ellipse(0, 0, e.r * 0.6, e.r, e.attached ? cosmo13T * 8 : 0, 0, TAU); ctx.fill();
                ctx.fillStyle = '#fecdd3';
                ctx.beginPath(); ctx.arc(0, -e.r * 0.5, 3, 0, TAU); ctx.fill();
                break;
              case 'reveur':
                ctx.translate(e.x, e.y);
                ctx.strokeStyle = '#f9a8d4';
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(0, 0, e.r, 0, TAU); ctx.stroke();
                ctx.beginPath(); ctx.arc(0, 0, e.r * 0.55, cosmo13T, cosmo13T + Math.PI * 1.4); ctx.stroke();
                break;
              case 'tisseuse':
                ctx.translate(e.x, e.y);
                ctx.strokeStyle = '#2dd4bf';
                ctx.lineWidth = 2;
                for (let k = 0; k < 4; k++) {
                  const a = (k / 4) * TAU + e.t;
                  ctx.beginPath();
                  ctx.moveTo(Math.cos(a) * e.r * 0.3, Math.sin(a) * e.r * 0.3);
                  ctx.lineTo(Math.cos(a) * e.r, Math.sin(a) * e.r);
                  ctx.stroke();
                }
                ctx.beginPath(); ctx.arc(0, 0, e.r * 0.35, 0, TAU); ctx.stroke();
                break;
              case 'comete':
                ctx.translate(e.x, e.y);
                ctx.globalCompositeOperation = 'lighter';
                {
                  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, e.r * 1.4);
                  g.addColorStop(0, 'rgba(253,186,116,.95)');
                  g.addColorStop(1, 'rgba(253,186,116,0)');
                  ctx.fillStyle = g;
                  ctx.beginPath(); ctx.arc(0, 0, e.r * 1.4, 0, TAU); ctx.fill();
                }
                break;
              case 'miroirE':
                ctx.translate(e.x, e.y);
                ctx.rotate(Math.sin(e.spin || 0) * 0.3);
                ctx.strokeStyle = '#e5e7eb';
                ctx.lineWidth = 2.5;
                ctx.beginPath(); ctx.ellipse(0, 0, e.r * 0.7, e.r, 0, 0, TAU); ctx.stroke();
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = 'rgba(229,231,235,.14)';
                ctx.beginPath(); ctx.ellipse(0, 0, e.r * 0.7, e.r, 0, 0, TAU); ctx.fill();
                break;
              case 'psyche':
                ctx.translate(e.x, e.y);
                ctx.rotate(Math.sin(e.t * 2) * 0.4);
                ctx.globalCompositeOperation = 'lighter';
                for (const [sx, col] of [[-1, '#f0abfc'], [1, '#a5f3fc']]) {
                  ctx.fillStyle = col;
                  ctx.globalAlpha = 0.75;
                  ctx.beginPath(); ctx.ellipse(sx * e.r * 0.5, 0, e.r * 0.55, e.r * 0.85, sx * 0.4, 0, TAU); ctx.fill();
                }
                ctx.globalAlpha = 1;
                break;
              case 'pensee':
                ctx.translate(e.x, e.y);
                ctx.strokeStyle = 'rgba(45,212,191,.7)';
                ctx.lineWidth = 1.6;
                ctx.beginPath(); ctx.arc(0, 0, e.r * (0.7 + Math.sin(e.t * 3) * 0.15), 0, TAU); ctx.stroke();
                break;
              case 'echo':
                ctx.translate(e.x, e.y);
                ctx.globalCompositeOperation = 'lighter';
                ctx.strokeStyle = 'rgba(253,164,175,.8)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, -e.r); ctx.lineTo(e.r * 0.7, e.r * 0.8); ctx.lineTo(-e.r * 0.7, e.r * 0.8);
                ctx.closePath(); ctx.stroke();
                break;
              case 'mirage':
                ctx.translate(e.x, e.y);
                ctx.globalAlpha = 0.5 + Math.sin(e.t * 4) * 0.2;
                ctx.strokeStyle = '#fda4af';
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(0, 0, e.r, 0, TAU); ctx.stroke();
                break;
              case 'echoBoss':
                ctx.translate(e.x, e.y);
                ctx.globalCompositeOperation = 'lighter';
                ctx.strokeStyle = ['#fb923c', '#fb7185', '#e2e8f0'][e.echoKind || 0];
                ctx.lineWidth = 2.5;
                ctx.save(); ctx.rotate(e.spin || 0);
                ctx.strokeRect(-e.r * 0.6, -e.r * 0.6, e.r * 1.2, e.r * 1.2);
                ctx.restore();
                ctx.beginPath(); ctx.arc(0, 0, e.r * 0.3, 0, TAU); ctx.stroke();
                break;
            }
            ctx.restore();
          }
        }

        function drawActe3() {
          if (acte < 3) return;
          drawNewEnemies();
          // boss custom13
          for (const e of enemies) {
            if (!e.custom13) continue;
            if (e.orgue) drawOrgue(e);
            else if (e.cantatrice) drawCantatrice(e);
            else if (e.diapason) drawDiapason(e);
            else if (e.reveurB) drawReveur(e);
            else if (e.cauchemar) drawCauchemar(e);
            else if (e.insomnie) drawInsomniaque(e);
            else if (e.matrice) drawMatrice(e);
            else if (e.choeurM) {
              ctx.save(); ctx.translate(e.x, e.y);
              ctx.globalCompositeOperation = 'lighter';
              ctx.strokeStyle = e.color;
              ctx.lineWidth = 2;
              ctx.beginPath(); ctx.arc(0, 0, e.r * 0.8, 0, TAU); ctx.stroke();
              ctx.restore();
              for (const b of e.choeurM.bodies) if (enemies.includes(b)) drawMilleBody(b);
            }
            else if (e.signal) drawSignal(e);
          }
          // toiles
          ctx.save();
          for (const w of webs13) {
            ctx.strokeStyle = `rgba(45,212,191,${clamp(w.life / 6, 0, 1) * 0.5})`;
            ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.moveTo(w.x1, w.y); ctx.lineTo(w.x2, w.y); ctx.stroke();
            for (let k = 0; k < 4; k++) {
              const wx = w.x1 + (k + 0.5) * (w.x2 - w.x1) / 4;
              ctx.beginPath(); ctx.moveTo(wx, w.y); ctx.lineTo(wx + 3, w.y + 8); ctx.stroke();
            }
          }
          ctx.restore();
          // harpons
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          for (const h of harpoons) {
            ctx.strokeStyle = '#f87171';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(h.x, h.y + 26); ctx.stroke();
            ctx.fillStyle = '#fecaca';
            ctx.beginPath(); ctx.arc(h.x, h.y, 3, 0, TAU); ctx.fill();
          }
          // orbes & rayons prisme
          for (const o of orbs) {
            const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, 12);
            g.addColorStop(0, 'rgba(165,243,252,.95)');
            g.addColorStop(1, 'rgba(165,243,252,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(o.x, o.y, 12, 0, TAU); ctx.fill();
          }
          for (const r of rays) {
            ctx.strokeStyle = `rgba(165,243,252,${clamp(r.life / 0.3, 0, 1) * 0.8})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(r.x, r.y);
            ctx.lineTo(r.x + Math.cos(r.a) * 560, r.y + Math.sin(r.a) * 560);
            ctx.stroke();
          }
          // tirs réfléchis
          for (const r of reflected) {
            ctx.fillStyle = '#e5e7eb';
            ctx.beginPath(); ctx.arc(r.x, r.y, 4, 0, TAU); ctx.fill();
          }
          // berceuse : aura
          if (berceuse > 0 && player.alive) {
            ctx.strokeStyle = `rgba(147,197,253,${0.2 + Math.sin(cosmo13T * 2) * 0.08})`;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(player.x, player.y, 240, 0, TAU); ctx.stroke();
          }
          // miroir : barrière
          if (miroir > 0 && miroirCh > 0 && player.alive) {
            ctx.strokeStyle = `rgba(229,231,235,${0.5 + Math.sin(cosmo13T * 5) * 0.2})`;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(player.x, player.y - 30, 80, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
          }
          // canon-chœur : 3 faisceaux
          if (choeur > 0 && player.alive) {
            for (const a of [-0.21, 0, 0.21]) {
              ctx.strokeStyle = 'rgba(253,230,138,.5)';
              ctx.lineWidth = 5;
              ctx.beginPath();
              ctx.moveTo(player.x, player.y - 18);
              ctx.lineTo(player.x + Math.sin(a) * 300, player.y - 18 - Math.cos(a) * 276);
              ctx.stroke();
            }
            const g = ctx.createRadialGradient(player.x, player.y - 260, 0, player.x, player.y - 260, 30);
            g.addColorStop(0, 'rgba(254,243,199,.8)');
            g.addColorStop(1, 'rgba(254,243,199,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(player.x, player.y - 260, 30, 0, TAU); ctx.fill();
          }
          // singularités
          for (const s of singularities) {
            const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 46);
            g.addColorStop(0, 'rgba(0,0,0,.9)');
            g.addColorStop(0.6, 'rgba(196,181,253,.5)');
            g.addColorStop(1, 'rgba(196,181,253,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(s.x, s.y, 46, 0, TAU); ctx.fill();
            ctx.strokeStyle = 'rgba(196,181,253,.7)';
            ctx.beginPath(); ctx.arc(s.x, s.y, 20 + Math.sin(s.t * 8) * 5, 0, TAU); ctx.stroke();
          }
          ctx.restore();
          // vignettage de tension (pulsation cardiaque visuelle)
          if (tension > 0.5 && state === 'playing') {
            ctx.save();
            const a = (tension - 0.5) * 0.34 * (0.7 + Math.sin(cosmo13T * (4 + tension * 4)) * 0.3);
            const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.75);
            g.addColorStop(0, 'rgba(120,0,20,0)');
            g.addColorStop(1, `rgba(120,0,20,${a})`);
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
          }
          // onde de l'Orgue : l'écran ondule
          if (boss && boss.orgue && boss.orgue.wave > 0 && state === 'playing') {
            ctx.save();
            for (let k = 0; k < 3; k++) {
              const sy = (cosmo13T * 300 + k * H / 3) % H;
              ctx.drawImage(canvas, 0, sy, W, 26, Math.sin(cosmo13T * 8 + k) * 8, sy, W, 26);
            }
            ctx.restore();
          }
          // inversion chromatique du Cauchemar
          if (boss && boss.cauchemar && boss.cauchemar.inv > 0 && state === 'playing') {
            ctx.save();
            ctx.globalCompositeOperation = 'difference';
            ctx.fillStyle = 'rgba(255,255,255,.92)';
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
          }
          // voile de silence
          if (silenceDuck > 0 && state === 'playing') {
            ctx.save();
            ctx.fillStyle = 'rgba(2,4,10,.28)';
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
          }
          // flash du paroxysme
          if (bloom > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = `rgba(255,244,214,${bloom * 0.8})`;
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
          }
        }

        // ================= 11. WRAPS PRINCIPAUX =================
        function reset13() {
          acte = 0;
          sec3 = 7;
          signalDown = false;
          acteDone[3] = acteDone[4] = acteDone[5] = false;
          deaths13[3] = deaths13[4] = deaths13[5] = 0;
          tension = 0;
          interlude = 0;
          bloom = 0;
          pendInterlude = 0;
          silenceDuck = 0;
          harpe = prisme = berceuse = miroir = miroirCh = choeur = 0;
          spawnT13 = 2;
          pendingDrops13 = [];
          harpoons.length = orbs.length = rays.length = reflected.length = singularities.length = webs13.length = 0;
          cp13.length = 0;
          recBuf.length = 0;
          stopMusic13();
          stopPad();
          if (heart) { try { heart.src.stop(); } catch (e) {} heart = null; }
          if (riser13) { try { riser13.src.stop(); } catch (e) {} riser13 = null; }
        }
        const baseStartGame13 = startGame;
        startGame = function (m, c) { reset13(); baseStartGame13(m, c); };
        const baseGameOver13 = gameOver;
        gameOver = function () { stopMusic13(); stopPad(); baseGameOver13(); };
        const baseReset13 = resetGame;
        resetGame = function () { stopMusic13(); stopPad(); baseReset13(); };

        const baseUpdate13 = update;
        update = function (dt) {
          baseUpdate13(dt);
          cosmo13T += dt;
          if (state === 'playing' && acte >= 3) {
            computeTension(dt);
            updateSilenceDuck(dt);
            recordPlayer(dt);
            updateWeapons13(dt);
            updateEnemies13(dt);
            spawnInjector13(dt);
            updateCosmos13(dt);
            for (const e of enemies) if (e.type === 'echoBoss') updateEchoBoss(e, dt);
            for (let i = pendingDrops13.length - 1; i >= 0; i--) {
              pendingDrops13[i][1] -= dt;
              if (pendingDrops13[i][1] <= 0) {
                dropPowerup(W / 2, H * 0.5, pendingDrops13[i][0]);
                pendingDrops13.splice(i, 1);
              }
            }
          }
        };
        const baseDraw13 = draw;
        draw = function () {
          baseDraw13();
          if (acte >= 3) drawActe3();
        };

        // ================= PONT DEBUG / TESTS =================
        if (window.__NP4) {
          window.__NP4.v13 = {
            acte: () => acte,
            sec3: () => sec3,
            tension: () => tension,
            interlude: () => interlude,
            layers: () => layersActive(),
            codex: () => codex13.length,
            panUsed: () => panUsed13,
            mus13: () => mus13Name,
            buf13: (k) => !!buf13[k],
            acteDone: (n) => acteDone[n],
            signalDown: () => signalDown,
            startActe: (n) => startActe(n),
            spawnOrgue: () => spawnOrgue(),
            spawnCantatrice: () => spawnCantatrice(),
            spawnDiapason: () => spawnDiapason(),
            spawnReveur: () => spawnReveur(),
            spawnCauchemar: () => spawnCauchemar(),
            spawnInsomniaque: () => spawnInsomniaque(),
            spawnMatrice: () => spawnMatrice(),
            spawnChoeurMille: () => spawnChoeurMille(),
            spawnSignal: () => spawnSignal(),
            spawnType: (t) => spawnEnemy(t, W / 2, H * 0.3),
            give: (t) => applyPowerup({ type: t, x: player.x, y: player.y }),
            setTension: (v) => { tension = v; },
            accord: () => (boss && boss.signal ? boss.signal.accord : 0),
            climaxAt: (x) => climaxAt(x == null ? W / 2 : x)
          };
        }
      })();
