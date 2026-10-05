      // MODULE V5.20 — RENCONTRES, RELIEF ET DYNAMIQUE DES ENREGISTREMENTS
      (() => {
        const E = window.NebulaEncounters;
        let encounter = null, beat = -1, elapsed = 0, held = 0, depthTime = 0;
        let parallax = 0, musicLevel = 1, musicTick = 0;
        const density = () => window.__NP4.density.level();
        const pressure = () => enemies.reduce((n, e) => n + (e.type === 'boss' ? 0 : E.cost(e.type)), 0);
        // v5.25 : le Réalisateur relève le plafond pendant une déferlante et le baisse pendant le souffle
        const limit = () => E.budget(wave, density(), W) * ((window.__NP4.director && window.__NP4.director.budget()) || 1);
        const canSpawn = (type) => pressure() + E.cost(type) <= limit();

        const start20 = startWave;
        startWave = function (n) {
          start20(n);
          encounter = null; beat = -1; elapsed = 0; held = 0;
          // Daily/tournament rules and all branching-route rewards stay with their original director.
          if (mode !== 'campagne' || n > 14 || !E) return;
          const plan = E.plan(n, density());
          if (!plan) return;
          const special = spawnQueue.filter(q => ['qubit', 'intrigue'].includes(q.type));
          spawnQueue = plan.items.concat(special);
          spawnTimer = spawnQueue[0].delay;
          encounter = plan;
          waveBanner = `VAGUE ${n} — ${plan.title.toUpperCase()}`;
          toast(plan.hint);
        };

        const spawner20 = updateSpawner;
        updateSpawner = function (dt) {
          const q = spawnQueue[0];
          if (encounter && !boss && q) {
            const maxBullets = W < 480 ? 65 : 95;
            if (!canSpawn(q.type) || eBullets.length > maxBullets) { held += dt; return; }
            const before = q;
            spawner20(dt);
            if (spawnQueue[0] !== before && q.encounter) beat = q.beat;
            return;
          }
          spawner20(dt);
        };

        // Spawn placement is read by the core spawner, not inferred from frame timing.
        // This hook is also used by the late-act injector before each reinforcement.
        window.__NP4.pacing = {
          canSpawn,
          stats: () => ({ title: encounter && encounter.title, beat, elapsed, held,
            pressure: pressure(), budget: limit(), remaining: spawnQueue.length,
            packets: encounter ? encounter.packets : 0 }),
          queue: () => spawnQueue.map(q => ({ ...q }))
        };

        const init20 = AudioSys.init;
        AudioSys.init = function () {
          init20.call(this);
          if (!this.ctx || this.studioDynamics20 || !this.studioBus) return;
          // Recorded tracks retain their original timbre/pitch. All ownership/mute/volume
          // controls still sit downstream of this envelope.
          this.studioDynamics20 = this.ctx.createGain();
          this.studioDynamics20.gain.value = 1;
          this.studioDynamics20.connect(this.studioBus);
        };
        function updateMusic(dt) {
          musicTick -= dt;
          if (musicTick > 0 || !AudioSys.studioDynamics20) return;
          musicTick = .2;
          const p = window.__NP4.phen;
          const quiet = p && p.active();
          const target = meta.musicDynamics20 === false || !encounter || boss ? 1 :
            quiet ? .58 : spawnQueue.length === 0 ? .72 : Math.min(1, .72 + pressure() / 42);
          if (Math.abs(target - musicLevel) < .025) return;
          musicLevel = target;
          AudioSys.studioDynamics20.gain.setTargetAtTime(target, AudioSys.ctx.currentTime, 1.4);
        }

        // A dedicated, deterministic decorative field: never consumes gameplay randomness.
        const debris = Array.from({ length: 9 }, (_, i) => ({
          x: ((i * .61803398875 + .13) % 1), y: ((i * .381966 + .07) % 1),
          z: .3 + (i % 3) * .15, angle: i * 1.91, kind: i % 3
        }));
        function drawDepth() {
          if (meta.depth20 === false || wave > 15 || !player ||
              !['playing', 'paused', 'photo', 'route', 'countdown'].includes(state)) return;
          const count = lowQuality || reducedMotion ? 4 : debris.length;
          const route = window.__NP4.routes.active();
          const color = route === 'forge' ? '#a3835e' : route === 'quantum' ? '#8c82ad' : '#6a95a7';
          ctx.save();
          for (let i = 0; i < count; i++) {
            const d = debris[i];
            const size = Math.min(W * .31, 170) * (d.z + .65);
            const travel = reducedMotion ? 0 : depthTime * (8 + d.z * 13);
            const x = d.x * (W + size * 2) - size - parallax * d.z * 22;
            const y = ((d.y * (H + size * 4) + travel) % (H + size * 4)) - size * 2;
            ctx.save(); ctx.translate(x, y); ctx.rotate(d.angle);
            ctx.globalAlpha = .28 + d.z * .18;
            ctx.fillStyle = '#091722'; ctx.strokeStyle = color; ctx.lineWidth = 1.2;
            if (d.kind === 0) {
              // Broken orbital ring: thick dark body with a faint rim and structural ribs.
              ctx.beginPath(); ctx.arc(0, 0, size, .3, 5.3);
              ctx.arc(0, 0, size * .77, 5.3, .3, true); ctx.closePath(); ctx.fill(); ctx.stroke();
              for (let j = 1; j < 8; j++) {
                const a = j * .63;
                ctx.beginPath(); ctx.moveTo(Math.cos(a) * size * .78, Math.sin(a) * size * .78);
                ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size); ctx.stroke();
              }
            } else if (d.kind === 1) {
              // Wreck spine, seen from above. No emissive points resembling hostile shots.
              ctx.beginPath(); ctx.moveTo(-size * .25, -size); ctx.lineTo(size * .18, -size * .65);
              ctx.lineTo(size * .28, size); ctx.lineTo(-size * .22, size * .72); ctx.closePath(); ctx.fill(); ctx.stroke();
              for (let j = -2; j <= 2; j++) {
                ctx.strokeRect(-size * .55, j * size * .3, size * 1.1, size * .12);
              }
            } else {
              ctx.beginPath(); ctx.moveTo(-size, 0); ctx.lineTo(-size * .3, -size * .33);
              ctx.lineTo(size * .8, -size * .15); ctx.lineTo(size, size * .4);
              ctx.lineTo(0, size * .24); ctx.closePath(); ctx.fill(); ctx.stroke();
            }
            ctx.restore();
          }
          ctx.restore();
        }
        const cosmos20 = window.__drawCosmos;
        window.__drawCosmos = function () { if (cosmos20) cosmos20(); drawDepth(); };

        const update20 = update;
        update = function (dt) {
          update20(dt);
          if (state === 'playing') {
            elapsed += dt; depthTime += dt;
            const target = reducedMotion || !player ? 0 : player.x / W - .5;
            parallax += (target - parallax) * Math.min(1, dt * 2);
          }
          updateMusic(dt);
        };
        const game20 = startGame;
        startGame = function (m, c) { depthTime = 0; parallax = 0; game20(m, c); };

        const settings20 = $('settingsOverlay');
        const rows20 = document.createElement('div');
        rows20.innerHTML = `<div class="settings-row"><label for="stDepth20">Relief du décor
          <span class="settings-desc">Épaves et anneaux sous le plan de vol · Acte I</span></label>
          <div class="settings-control"><input id="stDepth20" type="checkbox"></div></div>
          <div class="settings-row"><label for="stMusicDynamics20">Respirations musicales
          <span class="settings-desc">Les morceaux enregistrés s’effacent doucement pendant les accalmies</span></label>
          <div class="settings-control"><input id="stMusicDynamics20" type="checkbox"></div></div>`;
        settings20.querySelector('.btn-row').before(rows20);
        [['stDepth20', 'depth20'], ['stMusicDynamics20', 'musicDynamics20']].forEach(([id, key]) => {
          $(id).checked = meta[key] !== false;
          $(id).addEventListener('change', () => { meta[key] = $(id).checked; saveMeta(); });
        });
        window.__NP4.depth20 = { draw: drawDepth, time: () => depthTime };
      })();
