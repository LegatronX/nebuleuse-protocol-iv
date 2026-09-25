      // MODULE V5.18 — POSTE DE PILOTAGE ET PARTITION ÉVOLUTIVE
      // Embedded by tools/build-experience.py; edit this source, then rebuild.
      (() => {
        'use strict';
        const G = window.__NP4;
        if (!['evolving', 'studio'].includes(meta.musicStyle)) meta.musicStyle = 'evolving';
        if (typeof meta.softShots !== 'boolean') meta.softShots = true;
        let score18 = null, musicTimer = null, mixKey = '';
        const aliveScene = () => ['playing', 'paused', 'photo', 'countdown', 'route'].includes(state);
        function scene() {
          const v13 = G.v13, act = v13.acte();
          const sector = act >= 3 ? v13.sec3() : G.v12.acte2() ? G.v12.sec2() : G.v10.sector();
          return { playing: aliveScene(), boss: !!boss && aliveScene(), sector,
            rest: aliveScene() && v13.interlude() > 0,
            threat: Math.min(1, enemies.length * 0.035 + eBullets.length * 0.008 +
              (player && player.hull < player.maxHull * 0.3 ? 0.25 : 0)) };
        }
        function syncMix() {
          if (!score18) return;
          const advanced = aliveScene() && !!((AudioSys.__act12Music && AudioSys.__act12Music()) ||
            (AudioSys.__act13Music && AudioSys.__act13Music()));
          const evolving = meta.musicStyle === 'evolving';
          const audible = !document.hidden && !AudioSys.muted;
          const quiet = state === 'paused' || state === 'photo' || state === 'route';
          const key = [evolving, advanced, audible, quiet].join(':');
          if (key !== mixKey) {
            const t = AudioSys.ctx.currentTime, level = audible && !evolving ? (quiet ? 0.38 : 1) : 0;
            AudioSys.studioBus.gain.setTargetAtTime(advanced ? 0 : level, t, 0.35);
            AudioSys.actMusicBus.gain.setTargetAtTime(advanced ? level : 0, t, 0.35);
            score18.setActive(evolving && audible, quiet);
            mixKey = key;
          }
          score18.setScene(scene());
          score18.tick();
        }
        const baseInit18 = AudioSys.init;
        AudioSys.init = function () {
          baseInit18.call(this);
          if (!this.ctx || score18 || !window.NebulaScore) return;
          this.studioBus = this.ctx.createGain(); this.studioBus.gain.value = 0;
          this.actMusicBus = this.ctx.createGain(); this.actMusicBus.gain.value = 0;
          this.studioBus.connect(this.musicGain); this.actMusicBus.connect(this.musicGain);
          this.musicReverb18 = this.ctx.createConvolver(); this.musicReverb18.buffer = this.reverb.buffer;
          const musicWet = this.ctx.createGain(); musicWet.gain.value = 0.5;
          this.musicReverb18.connect(musicWet); musicWet.connect(this.studioBus);
          this.reverbGain.disconnect(); this.reverbGain.connect(this.sfxBus);
          this.delayOut.disconnect(); this.delayOut.connect(this.studioBus);
          score18 = new window.NebulaScore(this.ctx, this.musicGain);
          // A final gate also protects mute from legacy boss gain automation.
          this.muteGate18 = this.ctx.createGain();
          this.comp.disconnect(); this.comp.connect(this.muteGate18); this.muteGate18.connect(this.ctx.destination);
          this.muteGate18.gain.value = this.muted || document.hidden ? 0 : 1;
          musicTimer = setInterval(syncMix, 25);
          syncMix();
        };
        const baseStart18 = AudioSys.startMusic;
        AudioSys.startMusic = function () {
          if (meta.musicStyle === 'evolving' && window.NebulaScore) {
            if (this.__stopSequencer) this.__stopSequencer();
            syncMix();
          } else baseStart18.call(this);
        };
        const baseMute18 = AudioSys.setMuted;
        AudioSys.setMuted = function (muted) {
          baseMute18.call(this, muted);
          if (this.muteGate18) this.muteGate18.gain.setTargetAtTime(muted || document.hidden ? 0 : 1, this.ctx.currentTime, 0.015);
          syncMix();
        };
        const baseShoot18 = AudioSys.shoot;
        AudioSys.shoot = function () {
          if (!meta.softShots || !score18) return baseShoot18.call(this);
          if (!this.muted) score18.shot(meta.ship || 0, this.sfxBus, player ? player.x / W * 1.2 - 0.6 : 0);
        };
        document.addEventListener('visibilitychange', () => {
          if (AudioSys.muteGate18) AudioSys.muteGate18.gain.setTargetAtTime(document.hidden || AudioSys.muted ? 0 : 1, AudioSys.ctx.currentTime, 0.03);
          syncMix();
        });
        window.addEventListener('pagehide', () => { if (musicTimer) clearInterval(musicTimer); musicTimer = null; });
        window.addEventListener('pageshow', () => { if (score18 && !musicTimer) musicTimer = setInterval(syncMix, 25); });

        function setMusicStyle(style) {
          meta.musicStyle = style === 'studio' ? 'studio' : 'evolving'; saveMeta();
          AudioSys.init();
          if (AudioSys.ctx) AudioSys.ctx.resume().catch(() => {});
          if (AudioSys.__stopSequencer) AudioSys.__stopSequencer();
          mixKey = ''; AudioSys.startMusic(); syncMix();
        }
        const settings = $('settingsOverlay');
        const audioOptions = document.createElement('div');
        audioOptions.innerHTML = `<div class="settings-row"><label for="scoreStyle18">Bande-son
          <span class="settings-desc">Une partition originale qui suit le danger et les accalmies</span></label>
          <div class="settings-control"><select id="scoreStyle18" class="experience-select">
          <option value="evolving">Évolutive · nouvelle</option><option value="studio">Studio · originale</option></select></div></div>
          <div class="settings-row"><label for="shotsStyle18">Signature des tirs
          <span class="settings-desc">Timbres distincts par vaisseau, aigus adoucis</span></label>
          <div class="settings-control"><select id="shotsStyle18"><option value="soft">Feutrée</option><option value="arcade">Arcade</option></select></div></div>`;
        settings.querySelector('.btn-row').before(audioOptions);
        $('scoreStyle18').value = meta.musicStyle;
        $('shotsStyle18').value = meta.softShots ? 'soft' : 'arcade';
        $('scoreStyle18').addEventListener('change', e => setMusicStyle(e.target.value));
        $('shotsStyle18').addEventListener('change', e => { meta.softShots = e.target.value === 'soft'; saveMeta(); });
        ['stMusicVol', 'stSfxVol', 'stSens'].forEach(id => {
          const el = $(id), label = el && el.closest('.settings-row').querySelector('label');
          if (label) label.htmlFor = id;
        });

        // Reparent original controls: saves, unlocks and all existing handlers survive.
        const card = document.querySelector('#menu .card');
        card.classList.add('bridge');
        const title = card.querySelector('.title'), subtitle = card.querySelector('.subtitle');
        title.innerHTML = 'NÉBULEUSE<span class="bridge-title-sub">PROTOCOL IV</span>';
        subtitle.hidden = true;
        card.querySelector('.instructions').hidden = true;
        $('menuEmblem').hidden = true; $('menuEmblem').style.display = 'none';
        const oldRow = card.querySelector('.btn-row'); oldRow.classList.add('bridge-legacy');
        const layout = document.createElement('div');
        layout.innerHTML = `<header class="bridge-topline"><span class="bridge-brand">NP / IV &nbsp; · &nbsp; EXPLORATION & COMBAT</span><span class="bridge-version">5.18 · APERÇU</span></header>
          <div class="bridge-main"><section><p class="bridge-eyebrow">Aux frontières du signal</p><div id="bridgeTitle18"></div>
          <p class="bridge-intro">Cinq actes. Des routes à choisir.<br>Et quelque chose, dans le vide, qui vous attend.</p>
          <div class="bridge-launch" id="bridgeLaunch18"></div><div id="bridgeActs18"></div></section>
          <aside class="bridge-loadout" aria-label="Vaisseau équipé"><div class="bridge-radar"></div>
          <img class="bridge-ship" id="bridgeShip18" src="assets/ship-pulse.webp" alt="">
          <div class="bridge-ship-label"><strong id="bridgeShipName18">PULSE</strong><span>Prototype équipé</span></div>
          <p class="bridge-ship-desc" id="bridgeShipDesc18"></p></aside></div>
          <div class="bridge-stats" id="bridgeStats18"></div>
          <p class="bridge-section-label">Choisir une autre trajectoire</p><div class="bridge-modes" id="bridgeModes18"></div>
          <nav class="bridge-nav" aria-label="Préparation du vol" id="bridgeNav18"></nav>
          <details class="bridge-collection"><summary>Journal de bord, missions & collections</summary><div class="bridge-tools" id="bridgeTools18"></div></details>
          <footer class="bridge-footer"><span class="bridge-music" id="bridgeMusic18">Audio au premier contact</span><span>Glisser pour piloter · Flèches / ZQSD</span></footer>`;
        card.prepend(layout);
        const move = (id, parent) => { const el = $(id); if (el) $(parent).append(el); };
        $('bridgeTitle18').append(title);
        move('routeResumeBtn', 'bridgeLaunch18'); move('modeCampagne', 'bridgeLaunch18');
        $('modeCampagne').innerHTML = '<span>Lancer la campagne<small>ACTE I · LA CEINTURE DE DÉBRIS</small></span><span class="bridge-arrow" aria-hidden="true">↗</span>';
        move('acteSelect', 'bridgeActs18');
        [...card.querySelectorAll('.high-line')].forEach(el => $('bridgeStats18').append(el));
        const modes = { modeSurvie: 'Tenir aussi longtemps que possible', operationBtn: 'Un défi commun chaque jour',
          modeAscension: 'Gravir les paliers de difficulté', tourneyBtn: 'Le défi de la semaine' };
        Object.entries(modes).forEach(([id, hint]) => { move(id, 'bridgeModes18'); if ($(id)) $(id).dataset.hint = hint; });
        ['shipBtn', 'labBtn', 'settingsBtn'].forEach(id => move(id, 'bridgeNav18'));
        ['missionsBtn', 'achBtn', 'carnetBtn', 'leaderboardBtn'].forEach(id => move(id, 'bridgeTools18'));
        const helpBtn = document.createElement('button'); helpBtn.className = 'btn secondary';
        helpBtn.id = 'flightHelpBtn18'; helpBtn.textContent = 'Commandes'; $('bridgeNav18').append(helpBtn);
        const names = ['pulse', 'vector', 'titan', 'mirage'];
        function refreshBridge() {
          const i = Math.min(3, Math.max(0, meta.ship | 0)), ship = SHIPS[i];
          $('bridgeShip18').src = `assets/ship-${names[i]}.webp`;
          $('bridgeShipName18').textContent = ship.name;
          $('bridgeShipDesc18').textContent = ship.desc;
        }
        const baseRefresh18 = refreshMenu;
        refreshMenu = function () { baseRefresh18(); refreshBridge(); };
        new MutationObserver(() => { if (!isHidden(menuOverlay)) refreshBridge(); }).observe(menuOverlay, { attributes: true, attributeFilter: ['class'] });
        refreshBridge();

        // A reusable, keyboard accessible flight manual available before AND during play.
        const help = document.createElement('div'); help.className = 'flight-help'; help.hidden = true;
        help.setAttribute('role', 'dialog'); help.setAttribute('aria-modal', 'true'); help.setAttribute('aria-labelledby', 'flightHelpTitle18');
        help.innerHTML = `<article><p class="bridge-eyebrow">Manuel de vol / 01</p><h2 id="flightHelpTitle18">Prenez les commandes.</h2>
          <p>Frôlez les projectiles pour charger votre NOVA. Le dash vous rend brièvement invulnérable ; la bombe nettoie l’écran quand la situation se referme.</p>
          <dl><div><dt>Piloter</dt><dd>Glisser · Flèches · ZQSD / WASD</dd></div>
          <div><dt>Tirer</dt><dd>Maintenir TIR ou <kbd>F</kbd></dd></div>
          <div><dt>Dash</dt><dd><kbd>Maj</kbd> ou <kbd>V</kbd></dd></div>
          <div><dt>NOVA, énergie pleine</dt><dd><kbd>C</kbd></dd></div>
          <div><dt>Bombe</dt><dd><kbd>Espace</kbd> ou <kbd>X</kbd></dd></div>
          <div><dt>Pause / reprendre</dt><dd><kbd>P</kbd> · <kbd>Échap</kbd></dd></div>
          <div><dt>Mode photo</dt><dd><kbd>O</kbd>, aussi depuis la pause</dd></div></dl>
          <p>Le tir automatique peut être activé dans les réglages ou en pause. Après un boss, comparez le risque et la récompense de chaque route.</p>
          <button id="closeFlightHelp18" class="btn">Prêt à voler</button></article>`;
        document.body.append(help);
        let focusBeforeHelp = null;
        function openHelp() { focusBeforeHelp = document.activeElement; help.hidden = false; $('closeFlightHelp18').focus(); }
        function closeHelp() { help.hidden = true; if (focusBeforeHelp) focusBeforeHelp.focus(); }
        helpBtn.addEventListener('click', openHelp); $('closeFlightHelp18').addEventListener('click', closeHelp);
        help.addEventListener('click', e => { if (e.target === help) closeHelp(); });
        const pauseCard = pauseOverlay.querySelector('.card');
        const readout = document.createElement('div'); readout.className = 'flight-readout'; readout.id = 'pauseReadout18';
        pauseCard.querySelector('.title').after(readout);
        const pauseHelp = document.createElement('button'); pauseHelp.className = 'btn secondary'; pauseHelp.textContent = 'Commandes';
        pauseHelp.addEventListener('click', openHelp); pauseCard.querySelector('.btn-row').append(pauseHelp);
        const auto = document.createElement('button'); auto.id = 'pauseAuto18'; auto.className = 'btn secondary';
        auto.addEventListener('click', () => { G.v11.setAutoFire(!G.v11.autoFire()); refreshPause(); });
        pauseCard.querySelector('.btn-row').append(auto);
        function refreshPause() {
          if (!player) return;
          readout.textContent = `${SHIPS[meta.ship || 0].name} · Vague ${wave} · ${score.toLocaleString('fr-FR')} pts — Coque ${Math.max(0, Math.round(player.hull / player.maxHull * 100))} %`;
          auto.textContent = `Tir automatique : ${G.v11.autoFire() ? 'activé' : 'désactivé'}`;
          auto.setAttribute('aria-pressed', String(G.v11.autoFire()));
        }
        const basePause18 = pauseGame;
        pauseGame = function () { basePause18(); refreshPause(); syncMix(); };
        // Let native controls own their keys. Earlier global handlers must not launch
        // a run when Enter is pressed in a select, input, summary or menu button.
        window.addEventListener('keydown', e => {
          if (!help.hidden) {
            e.stopImmediatePropagation();
            if (e.code === 'Escape') { e.preventDefault(); closeHelp(); }
            if (e.code === 'Tab') { e.preventDefault(); $('closeFlightHelp18').focus(); }
            return;
          }
          if (e.target.closest && e.target.closest('input,select,textarea,button,summary')) {
            if (e.target.matches('input,select,textarea') || (state !== 'playing' && !['Escape', 'KeyP'].includes(e.code))) {
              e.stopImmediatePropagation(); return;
            }
          }
          if (e.code === 'Escape' && state === 'playing') {
            e.preventDefault(); e.stopImmediatePropagation(); pauseGame();
          } else if (e.code === 'Escape' && state === 'paused' && !isHidden(pauseOverlay)) {
            e.preventDefault(); e.stopImmediatePropagation(); resumeGame();
          }
        }, true);

        let uiTime = 0;
        const baseUpdate18 = update;
        update = function (dt) {
          baseUpdate18(dt);
          uiTime += dt; if (uiTime < 0.2) return; uiTime = 0;
          if (state === 'playing' && player) {
            const ready = player.energy >= 100;
            specialBtn.dataset.status = ready ? 'PRÊTE · C' : `${Math.floor(player.energy)} %`;
            specialBtn.setAttribute('aria-label', ready ? 'NOVA prête, touche C' : `NOVA en charge, ${Math.floor(player.energy)} pour cent`);
            specialBtn.setAttribute('aria-disabled', String(!ready));
            bombBtn.dataset.status = `${player.bombs} · ESPACE`;
            bombBtn.setAttribute('aria-label', `Bombe, ${player.bombs} disponibles, touche Espace`);
            bombBtn.setAttribute('aria-disabled', String(player.bombs <= 0));
          }
          if (!isHidden(menuOverlay)) {
            const info = score18 && score18.info();
            $('bridgeMusic18').textContent = AudioSys.muted ? 'Son coupé · Réglages' : !info ? 'Audio au premier contact' :
              meta.musicStyle === 'studio' ? 'Bande-son studio' : `${info.title} · ${info.section}`;
          }
        };
        G.experience = { audio: () => score18 && score18.info(), style: () => meta.musicStyle,
          setStyle: setMusicStyle, help: openHelp, scene };
      })();
