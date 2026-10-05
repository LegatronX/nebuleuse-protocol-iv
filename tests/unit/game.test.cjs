const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const {boot,root}=require('./game-harness.cjs');
function checkErrors(h){assert.deepEqual(h.errors.map(e=>e.message),[]);}
test('whole game boots and all original controls retain their IDs and handlers',()=>{
 const h=boot();try{
 const d=h.w.document;assert.ok(h.g.experience);assert.ok(h.g.photo);assert.ok(h.g.routes);assert.ok(h.g.phen);
 for(const id of ['modeCampagne','modeSurvie','operationBtn','modeAscension','tourneyBtn','shipBtn','labBtn','settingsBtn','missionsBtn','achBtn','carnetBtn','leaderboardBtn','routeResumeBtn']){
  assert.equal(d.querySelectorAll('#'+id).length,1,id);assert.ok(d.getElementById('menu').contains(d.getElementById(id)),id);
 }
 d.getElementById('shipBtn').click();assert.ok(!d.getElementById('shipOverlay').classList.contains('hidden'));
 d.getElementById('closeShipBtn').click();d.getElementById('modeCampagne').click();h.advance(500);
 assert.equal(h.g.state,'playing');assert.equal(h.g.experience.style(),'suno');assert.equal(h.g.experience.audio().active,false);
 assert.match(d.getElementById('specialBtn').getAttribute('aria-label'),/SALVE, 1 charge/);checkErrors(h);
 }finally{h.close();}
});
test('help traps focus, Escape closes it, then pauses a run and auto-fire persists',()=>{
 const h=boot();try{const d=h.w.document;
 d.getElementById('flightHelpBtn18').focus();d.getElementById('flightHelpBtn18').click();
 assert.equal(d.activeElement.id,'closeFlightHelp18');h.key('Tab',d.activeElement);assert.equal(d.activeElement.id,'closeFlightHelp18');
 h.key('Escape',d.activeElement);assert.ok(d.querySelector('.flight-help').hidden);assert.equal(d.activeElement.id,'flightHelpBtn18');
 d.getElementById('modeCampagne').click();h.advance(100);h.key('Escape');assert.equal(h.g.state,'paused');
 const before=h.g.v11.autoFire();d.getElementById('pauseAuto18').click();assert.equal(h.g.v11.autoFire(),!before);
 assert.equal(JSON.parse(h.w.localStorage.getItem('nebula4_meta')).autoFire,!before);checkErrors(h);
 }finally{h.close();}
});
test('Enter in settings never starts a game; user preferences survive initialization',()=>{
 const h=boot({meta:{musicStyle:'studio',musicPick:true,softShots:false,ship:2,musicVol:.35}});try{const d=h.w.document;
 d.getElementById('settingsBtn').click();const sel=d.getElementById('scoreStyle18');sel.focus();h.key('Enter',sel);
 assert.equal(h.g.state,'menu');assert.equal(sel.value,'studio');assert.equal(d.getElementById('shotsStyle18').value,'arcade');
 assert.equal(d.getElementById('bridgeShipName18').textContent,'TITAN');
 sel.value='evolving';sel.dispatchEvent(new h.w.Event('change',{bubbles:true}));
 assert.equal(h.g.experience.style(),'evolving');assert.equal(JSON.parse(h.w.localStorage.getItem('nebula4_meta')).musicStyle,'evolving');checkErrors(h);
 }finally{h.close();}
});
test('studio music has one owner and later-act music obeys its volume slider',async()=>{
 const h=boot({assets:true,meta:{musicStyle:'studio'}});try{const d=h.w.document;
 d.getElementById('modeCampagne').click();await h.flush();h.advance(100);
 assert.equal(h.g.audio.studioBus.gain.value,1);assert.equal(h.g.audio.actMusicBus.gain.value,0);
 h.g.v13.startActe(3);await h.flush();h.advance(100);
 assert.equal(h.g.audio.studioBus.gain.value,0);assert.equal(h.g.audio.actMusicBus.gain.value,1);
 assert.equal(h.g.audio.actMusicBus.connections[0],h.g.audio.musicGain);
 const slider=d.getElementById('stMusicVol');slider.value='0';slider.dispatchEvent(new h.w.Event('input',{bubbles:true}));
 assert.equal(h.g.audio.musicGain.gain.value,0);assert.ok(h.g.audio.sfxBus.gain.value>0);
 h.g.experience.setStyle('evolving');h.advance(100);assert.equal(h.g.audio.studioBus.gain.value,0);assert.equal(h.g.audio.actMusicBus.gain.value,0);
 assert.ok(h.g.experience.audio().active);checkErrors(h);
 }finally{h.close();}
});
test('cold-cache act selection retries music after decoding and mute survives a climax',async()=>{
 const h=boot({assets:true,meta:{musicStyle:'evolving',musicPick:true}});try{h.w.document.getElementById('modeCampagne').click();h.g.v13.startActe(3);
 await h.flush();h.advance(100);assert.ok(h.g.audio.__act13Music());
 h.g.audio.setMuted(true);h.g.v13.climaxAt(200);h.advance(100);
 assert.equal(h.g.audio.muteGate18.gain.value,0);assert.equal(h.g.experience.audio().active,false);
 h.g.audio.setMuted(false);h.advance(100);assert.equal(h.g.audio.muteGate18.gain.value,1);assert.ok(h.g.experience.audio().active);checkErrors(h);
 }finally{h.close();}
});
test('missing audio assets and absent AudioContext leave gameplay working',async()=>{
 for(const audio of [true,false]){const h=boot({assets:false,audio,meta:{musicStyle:'evolving',musicPick:true}});try{h.w.document.getElementById('modeCampagne').click();await h.flush();h.advance(1000);
 assert.equal(h.g.state,'playing');if(audio)assert.ok(h.g.experience.audio().scheduled>0);checkErrors(h);
 }finally{h.close();}}
});
test('new source module equals embedded artifact and PWA precaches every new dependency',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');const mod=fs.readFileSync(path.join(root,'v518.js'),'utf8');
 assert.ok(html.includes('// BEGIN EXPERIENCE V5.18\n'+mod+'\n      // END EXPERIENCE V5.18'));
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');assert.match(sw,/'np4-v5\.(1[89]|[2-9]\d)(?:-preview\d+)?'/);
 for(const f of ['experience/score.js','experience/bridge.css','experience/encounters.js']){assert.ok(html.includes(f));assert.ok(sw.includes(f));assert.ok(fs.statSync(path.join(root,f)).size>0);}
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];scripts.forEach(s=>new vm.Script(s[1]));
});
test('v5.15 routes, v5.16 phenomena and v5.17 photo state still compose with the new layer',()=>{
 const h=boot();try{h.w.document.getElementById('modeCampagne').click();h.advance(100);
 h.g.routes.open();assert.equal(h.g.state,'route');const offers=h.g.routes.offer();assert.ok(offers.length>=2);
 h.g.routes.select(0);h.g.routes.confirm();assert.equal(h.g.state,'playing');assert.ok(h.g.routes.active());
 const id=h.g.phen.ids[0];h.g.phen.force(id);assert.equal(h.g.phen.active().id,id);
 h.key('Escape');assert.equal(h.g.state,'paused');assert.ok(h.g.photo.enter());assert.equal(h.g.state,'photo');
 h.g.photo.leave();assert.equal(h.g.state,'paused');checkErrors(h);
 }finally{h.close();}
});
test('act II music and studio ambience cannot bypass volume, and returning to menu restores its owner',async()=>{
 const h=boot({assets:true,meta:{musicStyle:'studio'}});try{h.w.document.getElementById('modeCampagne').click();
 h.g.v12.startActe2();await h.flush();h.advance(100);assert.ok(h.g.audio.__act12Music());
 assert.equal(h.g.audio.actMusicBus.gain.value,1);assert.equal(h.g.audio.studioBus.gain.value,0);
 assert.equal(h.g.audio.delayOut.connections[0],h.g.audio.studioBus);
 assert.equal(h.g.audio.reverbGain.connections[0],h.g.audio.sfxBus);
 h.key('Escape');h.w.document.getElementById('pauseMenuBtn').click();h.advance(100);
 assert.equal(h.g.state,'menu');assert.equal(h.g.audio.studioBus.gain.value,1);assert.equal(h.g.audio.actMusicBus.gain.value,0);checkErrors(h);
 }finally{h.close();}
});
test('keyboard fire is not swallowed when an in-game action button has focus',()=>{
 const h=boot();try{h.w.document.getElementById('modeCampagne').click();h.advance(100);
 const action=h.w.document.getElementById('specialBtn');action.focus();h.key('KeyF',action);
 assert.equal(h.g.v11.fireHeld(),true);checkErrors(h);
 }finally{h.close();}
});
test('Nébuleuse soundtrack is the default (v5.22); unpicked styles follow it; an explicit pick sticks',()=>{
 for(const [meta,want] of [[{},'suno'],[{musicStyle:'evolving'},'suno'],[{musicStyle:'studio'},'suno'],[{musicStyle:'evolving',musicPick:true},'evolving'],[{musicStyle:'studio',musicPick:true},'studio']]){
  const h=boot({meta});try{assert.equal(h.g.experience.style(),want,JSON.stringify(meta));
  assert.equal(h.w.document.getElementById('scoreStyle18').value,want);checkErrors(h);}finally{h.close();}
 }
 const h=boot();try{const sel=h.w.document.getElementById('scoreStyle18');assert.equal(sel.options[0].value,'suno');assert.equal(sel.options[1].value,'studio');
  sel.value='evolving';sel.dispatchEvent(new h.w.Event('change',{bubbles:true}));
  const m=JSON.parse(h.w.localStorage.getItem('nebula4_meta'));assert.equal(m.musicStyle,'evolving');assert.equal(m.musicPick,true);checkErrors(h);
 }finally{h.close();}
});
test('studio default: recorded loops own the music bus in act I, act music in later acts',async()=>{
 const h=boot({assets:true});try{h.w.document.getElementById('modeCampagne').click();await h.flush();h.advance(200);
 assert.equal(h.g.audio.studioBus.gain.value,1);assert.equal(h.g.audio.actMusicBus.gain.value,0);assert.equal(h.g.experience.audio().active,false);
 h.g.v13.startActe(3);await h.flush();h.advance(200);assert.equal(h.g.audio.actMusicBus.gain.value,1);assert.equal(h.g.audio.studioBus.gain.value,0);checkErrors(h);
 }finally{h.close();}
});
test('v5.19 squadrons: wings queued on light enemies, escorts during a boss disband when it falls, Classique restores the old waves',()=>{
 const h=boot();try{const d=h.w.document;assert.equal(h.g.density.level(),'intense');assert.ok(d.getElementById('stDensity19'));
 d.getElementById('modeCampagne').click();h.advance(100);
 h.g.density.setMode('operation'); // Random squadrons remain the daily-mode director.
 let queued=0;for(let n=1;n<=8;n++){if(n%3===0)continue;h.g.density.startWave(n);queued+=h.g.density.queueWings();}
 assert.ok(queued>=8,'ailiers en file : '+queued);
 h.g.density.setMode('campagne');h.g.density.startWave(3);h.advance(3000);assert.ok(h.g.boss,'boss présent');h.g.player.invuln=999;
 h.g.boss.entering=false; // v5.20: escorts wait until the boss has finished entering.
 h.g.density.escortIn(0);h.advance(100);const esc=h.g.enemies.filter(e=>e.escort).length;assert.ok(esc>=3,'escorte '+esc);
 assert.ok(h.g.enemies.filter(e=>e.escort&&e.wing).length>=2);
 h.g.routes.kill(h.g.boss);h.advance(100);assert.equal(h.g.enemies.filter(e=>e.escort).length,0,'escorte dissoute');
 h.g.density.set('classique');h.g.density.startWave(4);assert.equal(h.g.density.queueWings(),0);
 assert.equal(JSON.parse(h.w.localStorage.getItem('nebula4_meta')).density,'classique');checkErrors(h);
 }finally{h.close();}
});
test('v5.19 fairness: daily operation and tournament ignore the density preference',()=>{
 const h=boot({meta:{density:'dechaine'}});try{assert.equal(h.g.density.level(),'dechaine');
 h.g.density.setMode('operation');assert.equal(h.g.density.level(),'intense');h.g.density.setMode('tournoi');assert.equal(h.g.density.level(),'intense');checkErrors(h);
 }finally{h.close();}
});
test('v5.19 module is embedded by the build tool, after v5.18',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');const mod=fs.readFileSync(path.join(root,'v519.js'),'utf8');
 const i=html.indexOf('// BEGIN ESCADRILLES V5.19\n'+mod+'\n      // END ESCADRILLES V5.19');assert.ok(i>0);assert.ok(i>html.indexOf('// END EXPERIENCE V5.18'));
 assert.doesNotMatch(mod.replace(/\/\/.*$/gm,''),/Math\.random\(\)\s*\*\s*1e|localStorage/);
});
test('v5.21 boss bar is hidden without a boss, even under the ghost HUD, and shown during a boss',()=>{
 const h=boot();try{const d=h.w.document;d.getElementById('modeCampagne').click();h.advance(300);
 const bar=d.getElementById('bossHud');bar.classList.add('np-ghost');assert.equal(h.g.hud21.boss(),false);
 h.g.spawnBoss();h.advance(100);assert.equal(h.g.hud21.boss(),true);
 h.g.enemies.length=0;h.g.endWave&&h.g.endWave();h.advance(300);
 assert.match(d.getElementById('hud21').textContent,/#bossHud:not\(\.on21\)\{opacity:0!important/);checkErrors(h);
 }finally{h.close();}
});
test('v5.21 fewer floating texts: graze text removed, quick score gains merged, at most six on screen',()=>{
 const h=boot();try{h.w.document.getElementById('modeCampagne').click();h.advance(200);const H=h.g.hud21;
 const n0=H.texts().length;H.addText(10,10,'FRÔLEMENT x4','#fff');assert.equal(H.texts().length,n0);
 H.addText(10,10,'+20','#fff');H.addText(12,12,'+30','#fff');assert.ok(H.texts().includes('+50'));
 for(let i=0;i<12;i++)H.addText(10,10,'BONUS '+i,'#fff');assert.ok(H.texts().length<=6);checkErrors(h);
 }finally{h.close();}
});
test('v5.21 humanised fire varies the cadence; the Métronome setting restores a fixed rhythm',()=>{
 const h=boot({meta:{ship:0}});try{const d=h.w.document;d.getElementById('modeCampagne').click();h.advance(200);
 const cds=new Set();for(let i=0;i<40;i++)cds.add(h.g.hud21.fire().toFixed(4));assert.ok(cds.size>10,'cadence variable');
 const sel=d.getElementById('stHuman21');sel.value='0';sel.dispatchEvent(new h.w.Event('change',{bubbles:true}));
 const fixed=new Set();for(let i=0;i<20;i++)fixed.add(h.g.hud21.fire().toFixed(4));assert.equal(fixed.size,1);
 assert.equal(JSON.parse(h.w.localStorage.getItem('nebula4_meta')).humanFire,false);checkErrors(h);
 }finally{h.close();}
});
test('v5.21 generated planets: varied kinds, never three in a row the same, delegated by the legacy parallax layer',()=>{
 const h=boot();try{const ps=h.g.planets21.sample(9);const kinds=ps.map(p=>p.kind);
 assert.ok(new Set(kinds).size>=5);for(let i=3;i<kinds.length;i++)assert.ok(!kinds.slice(i-3,i).includes(kinds[i]));
 const p=h.g.planets21.create(390);assert.ok(p.g21&&p.r>0&&p.vy>0);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.match(html,/planets\.push\(window\.__NP4\.planets21\.create\(W\)\)/);
 assert.match(html,/if \(p\.g21\) \{ window\.__NP4\.planets21\.draw\(ctx, p\); continue; \}/);checkErrors(h);
 }finally{h.close();}
});
test('v5.21 module is embedded by the build tool, last',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');const mod=fs.readFileSync(path.join(root,'v521.js'),'utf8');
 const i=html.indexOf('// BEGIN INTERFACE V5.21\n'+mod+'\n      // END INTERFACE V5.21');assert.ok(i>0);assert.ok(i>html.indexOf('// END RENCONTRES V5.20'));
});
test('v5.22 every Nébuleuse track exists, is one of the kept picks, and gains stay bounded',()=>{
 const h=boot();try{const tr=h.g.suno.tracks();assert.equal(tr.length,31);
  for(const t of tr){assert.ok(fs.existsSync(path.join(root,t.file)),t.file);assert.ok(t.gain>=0.55&&t.gain<=1.4,t.key);}
  const cues=h.g.suno.cues();const keys=new Set(tr.map(t=>t.key));
  for(const [n,c] of Object.entries(cues))for(const k of c.pool)assert.ok(keys.has(k),n+':'+k);
  const used=new Set(Object.values(cues).flatMap(c=>c.pool));for(const k of keys)if(!['tresor','apaisement'].includes(k))assert.ok(used.has(k),'inutilisé '+k);
  checkErrors(h);}finally{h.close();}
});
test('v5.22 director: menu, opening, act I boss, triumph, pause resumes the same track, phenomena, defeat',async()=>{
 const h=boot({audio:true});try{const d=h.w.document,S=h.g.suno;
  d.body.dispatchEvent(new h.w.Event('pointerdown',{bubbles:true}));h.advance(900);
  assert.ok(S.unlocked());assert.equal(S.cue(),'menu');assert.ok(['balisesA','balisesB'].includes(S.now().key));
  assert.equal(h.g.audio.studioBus.gain.value,0,'studio coupé quand la bande-son Nébuleuse joue');
  d.getElementById('modeCampagne').click();h.advance(900);assert.equal(S.cue(),'opening');assert.equal(S.now().key,'signalC');
  h.g.spawnBoss();h.advance(900);assert.equal(S.cue(),'bossSmall');assert.equal(S.now().key,'gardienD');assert.equal(S.now().t,20);
  const b=h.g.boss;h.g.enemies.splice(h.g.enemies.indexOf(b),1);h.advance(900);assert.equal(S.cue(),'triumph');
  const tri=S.now().key;h.key('Escape');h.advance(900);assert.equal(h.g.state,'paused');assert.equal(S.cue(),'pause');
  h.key('Escape');h.advance(4500);assert.equal(S.cue(),'triumph');assert.equal(S.now().key,tri,'reprise du morceau interrompu');
  for(let i=0;i<24;i++){h.g.player.invuln=5;h.advance(1000);}assert.equal(S.cue(),'combat2','transition après un boss');
  h.g.phen.force('supernova');assert.equal(S.situation(),'phenEpic');S.tick();assert.equal(S.cue(),'phenEpic');h.g.phen.end();h.advance(900);
  h.g.phen.force('baleine');S.tick();assert.equal(S.cue(),'phenCalm');h.g.phen.end();
  for(let i=0;i<40&&h.g.state==='playing';i++){h.g.player.invuln=0;h.g.hurt(9999);h.advance(100);}h.advance(3000);assert.equal(h.g.state,'gameover');assert.ok(['defeat','defeatHeavy'].includes(S.cue()));checkErrors(h);
 }finally{h.close();}
});
test('v5.22 failed playback falls back to the studio soundtrack',()=>{
 const h=boot();try{const d=h.w.document;d.body.dispatchEvent(new h.w.Event('pointerdown',{bubbles:true}));h.advance(900);
  assert.equal(h.g.audio.studioBus.gain.value,0);h.g.suno.setLive(false);h.advance(300);
  assert.equal(h.g.audio.studioBus.gain.value,1);checkErrors(h);}finally{h.close();}
});
test('v5.22 module is embedded last and the service worker streams the soundtrack without caching it',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');const mod=fs.readFileSync(path.join(root,'v522.js'),'utf8');
 const i=html.indexOf('// BEGIN BANDE-SON V5.22\n'+mod+'\n      // END BANDE-SON V5.22');assert.ok(i>html.indexOf('// END INTERFACE V5.21'));
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');assert.match(sw,/assets\/music\/game\/'\)\) return;/);assert.doesNotMatch(sw,/"assets\/music\/game\//);
});
test('v5.23 TITAN no longer fires its heavy rail on every volley; auto-fire keeps the normal cadence',()=>{
 const h=boot({meta:{ship:2,humanFire:false}});try{h.w.document.getElementById('modeCampagne').click();h.advance(200);
  const cd=h.g.hud21.fire();assert.ok(cd<0.2,'cadence normale '+cd);
  h.advance(3000);assert.equal(h.g.cannon.fired(),0);checkErrors(h);
 }finally{h.close();}
});
test('v5.23 CANON button (TITAN since v5.28): limited shells, salvo of 5, key C, shells from the O capsule',()=>{
 for(const [ship,start,shots] of [[2,2,5]]){
  const h=boot({meta:{ship}});try{const d=h.w.document;d.getElementById('modeCampagne').click();h.advance(300);
   const C=h.g.cannon;assert.equal(C.count(),start);
   h.g.enemies.push({type:'dummy',x:195,y:-70,r:1,hp:1e9,maxHp:1e9,vy:0,fireCd:999,t:0,score:0});
   const btn=d.getElementById('specialBtn');assert.ok(btn.classList.contains('ready'));assert.match(btn.textContent,/CANON/);
   let rails=0;const sig=h.g.sig,orig=sig.rail;sig.rail=(...a)=>{rails++;return orig(...a);};
   btn.dispatchEvent(new h.w.Event('pointerdown',{bubbles:true,cancelable:true}));h.advance(1500);
   assert.equal(rails,shots);assert.equal(C.count(),start-1);
   C.set(0);h.advance(200);assert.ok(!btn.classList.contains('ready'));h.key('KeyC');h.advance(800);assert.equal(rails,shots,'pas d’obus, pas de tir');
   checkErrors(h);}finally{h.close();}
 }
});
test('v5.23 O capsule adds a shell (max 3) and bosses always drop one',()=>{
 const h=boot();try{h.w.document.getElementById('modeCampagne').click();h.advance(300);
  h.g.spawnBoss();h.advance(100);const b=h.g.boss;b.hp=0;h.g.v10.kill(h.g.enemies.indexOf(b));
  assert.equal(h.g.cannon.caps(),1);
  h.g.cannon.set(2);h.g.cannon.apply('O');assert.equal(h.g.cannon.count(),3);
  h.g.cannon.apply('O');assert.equal(h.g.cannon.count(),3,'plafond');checkErrors(h);
 }finally{h.close();}
});
test('v5.23/5.24 NOVA fires by itself when energy is full, at most every 25 s',()=>{
 const h=boot();try{h.w.document.getElementById('modeCampagne').click();h.advance(300);
  for(let i=0;i<5;i++)h.g.enemies.push({type:'dummy',x:40+i*70,y:-70,r:1,hp:1e9,maxHp:1e9,vy:0,fireCd:999,t:0,score:0});
  h.g.player.energy=100;h.advance(100);assert.ok(h.g.player.energy<50,'NOVA déclenchée');
  h.g.player.energy=100;h.advance(3000);assert.ok(h.g.player.energy>=100,'pas avant 25 s');checkErrors(h);
 }finally{h.close();}
});
test('v5.24 random capsules from ordinary enemies are throttled; bosses still drop theirs',()=>{
 const h=boot();try{h.w.document.getElementById('modeCampagne').click();h.advance(300);
  for(let i=0;i<40;i++){h.g.enemies.push({type:'drone',x:100,y:100,r:10,hp:1,maxHp:1,vy:0,fireCd:999,t:0,score:1,elite:true});h.g.v10.kill(h.g.enemies.length-1);}
  const d=h.g.comfort.drops();assert.equal(d.kept,1,'une seule capsule sur 40 élites en rafale');assert.ok(d.skipped>=39);
  h.g.spawnBoss();h.advance(100);const b=h.g.boss;b.hp=0;h.g.v10.kill(h.g.enemies.indexOf(b));
  assert.equal(h.g.cannon.caps(),1,'obus du boss');checkErrors(h);
 }finally{h.close();}
});
test('v5.24 gauges sit at the bottom left, labelled, and ignore the ghost HUD; the fire button is thumb-sized',()=>{
 const h=boot();try{const d=h.w.document;const css=d.getElementById('hud24').textContent;
  assert.match(css,/panel\.bars\{position:fixed!important;top:auto!important/);assert.match(css,/panel\.bars\.np-ghost\{opacity:\.92!important\}/);
  assert.match(css,/#fireBtn\{width:84px!important/);assert.match(css,/#fireBtn:not\(\.show\)\{opacity:0!important/);
  const labels=[...d.querySelectorAll('#hud .mid .bar-row span')].map(s=>s.dataset.l);assert.ok(labels.slice(0,3).join('')==='CBÉ',labels.join(''));
  assert.ok(d.querySelector('#fireBtn svg'));checkErrors(h);
 }finally{h.close();}
});
test('v5.24 NOVA lance recharges slowly and only fires on a target in its lane',()=>{
 const h=boot({meta:{autoFire:true}});try{h.w.document.getElementById('modeCampagne').click();h.advance(300);
  assert.ok(h.g.v12.lanceT()>=12);for(let ms=0;ms<h.g.v12.lanceT()*1000+2500;ms+=300){h.g.enemies.length=0;h.advance(300);}assert.ok(h.g.v12.charge()>=0.99,'chargée mais sans cible');
  checkErrors(h);
 }finally{h.close();}
});
test('v5.25 director: build → peak → breath cycle, spawns held during the breath, classic setting and fixed modes disable it',()=>{
 const h=boot({meta:{autoFire:false}});try{const d=h.w.document,D=h.g.director;d.getElementById('modeCampagne').click();h.advance(300);
  assert.ok(D.enabled());assert.equal(D.phase(),'build');
  D.force('peak',30);assert.equal(D.phase(),'peak');assert.ok(D.k()>1.4);assert.ok(D.budget()>1.2);
  D.force('breath',6);h.g.player.invuln=99;const q0=h.g.pacing.queue().length,e0=h.g.enemies.length;
  h.advance(3000);assert.equal(h.g.pacing.queue().length,q0,'aucune arrivée pendant le souffle');assert.ok(h.g.enemies.length<=e0);
  h.advance(4000);assert.equal(D.phase(),'build','le souffle prend fin');
  h.w.document.getElementById('stRhythm25').value='classic';h.w.document.getElementById('stRhythm25').dispatchEvent(new h.w.Event('change',{bubbles:true}));
  assert.ok(!D.enabled());assert.equal(D.budget(),1);
  h.w.document.getElementById('stRhythm25').value='dynamic';h.w.document.getElementById('stRhythm25').dispatchEvent(new h.w.Event('change',{bubbles:true}));
  assert.ok(D.enabled());h.g.density.setMode('operation');assert.ok(!D.enabled(),'équité : Opération du jour');h.g.density.setMode('tournoi');assert.ok(!D.enabled());
  checkErrors(h);
 }finally{h.close();}
});
test('v5.25 director: a boss suspends the cycle and its fall gives a long breath; a clean peak earns one capsule, a low hull earns a relief capsule',()=>{
 const h=boot({meta:{autoFire:false}});try{const d=h.w.document,D=h.g.director;d.getElementById('modeCampagne').click();h.advance(300);h.g.player.invuln=99;
  h.g.spawnBoss();h.advance(200);assert.equal(D.phase(),'boss');
  const b=h.g.boss;h.g.enemies.splice(h.g.enemies.indexOf(b),1);h.advance(200);assert.equal(D.phase(),'breath');assert.ok(D.dur()>=7.5);
  D.force('build',40);h.advance(100);D.force('peak',30);h.advance(11000);h.g.player.invuln=99;D.force('breath',6);
  assert.equal(D.drops().merits,1,'déferlante sans dégât : capsule méritée');
  D.force('build',40);D.force('peak',30);h.advance(11000);D.force('breath',6);assert.equal(D.drops().merits,1,'au plus une par minute');
  h.g.player.hull=10;h.g.player.shield=0;D.force('build',10);D.force('breath',6);assert.equal(D.drops().reliefs,1,'coque très basse : capsule de secours');
  D.force('build',10);D.force('breath',6);assert.equal(D.drops().reliefs,1,'au plus une par 75 s');
  checkErrors(h);
 }finally{h.close();}
});

test('v5.26 story: first launch shows the briefing once, the mission dossier replays it, acts unlock progressively (or freely by setting)',()=>{
 const h=boot();try{const d=h.w.document,S=h.g.story;
  h.advance(900);assert.ok(d.getElementById('brief26').classList.contains('on'),'briefing au premier lancement');
  for(let i=0;i<3;i++)d.querySelector('#brief26 .go').click();
  assert.match(d.querySelector('#brief26 .go').textContent,/commandes/);d.querySelector('#brief26 .go').click();
  assert.ok(S.briefed());assert.ok(!d.getElementById('brief26').classList.contains('on'));
  assert.equal(JSON.parse(h.w.localStorage.getItem('nebula4_meta')).story.briefed,true);
  assert.equal(d.getElementById('jumpActe1').disabled,false);assert.equal(d.getElementById('jumpActe2').disabled,true);assert.equal(d.getElementById('jumpActe5').disabled,true);
  assert.match(d.getElementById('signalPath26').textContent,/0 %/);
  d.getElementById('dossierBtn26').click();assert.ok(d.getElementById('dossier26').classList.contains('on'));
  assert.match(d.getElementById('dossier26').textContent,/PROTOCOLE III/);
  d.querySelector('#dossier26 [data-t=archives]').click();assert.match(d.getElementById('dossier26').textContent,/0 \/ 17/);
  d.getElementById('dsClose26').click();
  S.complete(1);assert.equal(d.getElementById('jumpActe2').disabled,false,'acte I terminé : acte II ouvert');assert.equal(d.getElementById('jumpActe3').disabled,true);
  const sel=d.getElementById('stAccess26');sel.value='free';sel.dispatchEvent(new h.w.Event('change',{bubbles:true}));
  assert.equal(d.getElementById('jumpActe5').disabled,false);sel.value='progressive';sel.dispatchEvent(new h.w.Event('change',{bubbles:true}));assert.equal(d.getElementById('jumpActe5').disabled,true);
  checkErrors(h);
 }finally{h.close();}
});
test('v5.26 story: ÉCHO speaks once per beat, archives unlock with the waves, only the campaign advances the goal',()=>{
 const h=boot({meta:{story:{briefed:true}}});try{const d=h.w.document,S=h.g.story;
  d.getElementById('modeCampagne').click();h.advance(300);h.g.player.invuln=99;
  S.startWave(2);h.advance(3000);assert.ok(d.getElementById('echo26').classList.contains('on'));assert.match(d.getElementById('echo26').textContent,/pirates/);
  assert.ok(S.seen('b2'));const n=S.echoCount();S.startWave(2);h.advance(3000);assert.equal(S.echoCount(),n,'une transmission ne se répète pas');
  S.startWave(4);assert.ok(S.arch('II'));assert.equal(S.far(),4);assert.ok(S.pct()>0);
  h.g.density.setMode('survie');S.startWave(30);assert.equal(S.far(),4,'la Survie ne fait pas avancer la campagne');
  h.g.density.setMode('campagne');
  S.victory(15);const line=d.getElementById('storyLine26');assert.ok(line);assert.match(line.textContent,/Nébuleuse Prime/);assert.ok(S.done(1));assert.ok(S.unlocked(2));
  assert.ok(!S.finale());checkErrors(h);
 }finally{h.close();}
});
test('v5.26 story: act V ends on the epilogue (once) and fills the goal to 100 %',()=>{
 const h=boot({meta:{story:{briefed:true,far:50}}});try{const d=h.w.document,S=h.g.story;
  d.getElementById('modeCampagne').click();h.advance(300);
  S.victory(51);h.advance(2000);assert.ok(S.finale());assert.equal(S.pct(),100);assert.ok(d.getElementById('epilogue26').classList.contains('on'));
  for(let i=0;i<3;i++)d.querySelector('#epilogue26 .go').click();d.querySelector('#epilogue26 .go').click();assert.ok(!d.getElementById('epilogue26').classList.contains('on'));
  S.victory(51);h.advance(2000);assert.ok(!d.getElementById('epilogue26').classList.contains('on'),'épilogue une seule fois');
  checkErrors(h);
 }finally{h.close();}
});

test('v5.27 bilan: record gap, boss fall with its remaining hull, next lab tier, story progress, folded details; REVANCHE after a boss',()=>{
 const h=boot({meta:{story:{briefed:true},nanites:20}});try{const d=h.w.document,B=h.g.bilan;
  d.getElementById('modeCampagne').click();h.advance(300);h.g.player.invuln=99;
  h.g.spawnBoss();h.advance(300);const b=h.g.boss;b.hp=Math.round(b.maxHp*0.2);
  for(let i=0;i<40&&h.g.state==='playing';i++){h.g.player.invuln=0;h.g.hurt(9999);h.advance(100);}h.advance(3000);
  assert.equal(h.g.state,'gameover');
  const rows=B.rows();assert.equal(rows.map(r=>r.k).slice(0,4).join(),'RECORD,CHUTE,PALIER,SOURCE');
  assert.match(rows[1].v,/20 %/);assert.match(d.getElementById('bilan27').textContent,/Distance à la Source/);
  assert.equal(d.getElementById('retryBtn').textContent,'Revanche');
  assert.ok(d.getElementById('finalStats').classList.contains('np27-fold'),'détails repliés');
  d.getElementById('statsToggle27').click();assert.ok(!d.getElementById('finalStats').classList.contains('np27-fold'));
  assert.ok(B.nextTalent().cost>0);assert.ok(!d.getElementById('labEnd27').classList.contains('on'),'20⬡ : rien d\'achetable');checkErrors(h);
 }finally{h.close();}
});
test('v5.27 bilan: an affordable lab tier gets a shortcut, a normal death says Rejouer, the record marks fire once per run',()=>{
 const h=boot({meta:{story:{briefed:true},nanites:140}});try{const d=h.w.document,B=h.g.bilan;
  d.getElementById('modeCampagne').click();h.advance(300);h.g.player.invuln=99;
  for(let i=0;i<40&&h.g.state==='playing';i++){h.g.player.invuln=0;h.g.hurt(9999);h.advance(100);}h.advance(3000);
  if(h.g.state==='gameover'&&d.getElementById('reviveNo')&&!d.getElementById('reviveOverlay').classList.contains('hidden'))d.getElementById('reviveNo').click();
  assert.equal(h.g.state,'gameover');assert.equal(d.getElementById('retryBtn').textContent,'Rejouer');
  assert.ok(B.rows().some(r=>r.k==='PALIER'&&r.lab));assert.ok(d.getElementById('labEnd27').classList.contains('on'));
  d.getElementById('labEnd27').click();assert.equal(h.g.state,'menu');assert.ok(!d.getElementById('labOverlay').classList.contains('hidden'));
  checkErrors(h);
 }finally{h.close();}
});

const ALL_DONE={briefed:true,far:52,finale:true,done:{1:true,2:true,3:true,4:true,5:true}};
test('v5.28 hangar: seven ships, story unlocks, seven silhouettes drawn without error, the card art falls back safely',()=>{
 const h=boot({meta:{story:{briefed:true}}});try{const d=h.w.document,H=h.g.hangar;
  assert.equal(H.ships().join(),'PULSE,VECTOR,TITAN,MIRAGE,AUBE,FAUCHEUR,ÉCLIPSE');assert.equal(typeof h.w.__np4DrawShip,'function');
  assert.ok(!H.unlocked(4)&&!H.unlocked(5)&&!H.unlocked(6));assert.equal(H.lockText(4),'TERMINER L\'ACTE I');
  d.getElementById('shipBtn').click();assert.equal(d.querySelectorAll('#shipList .ship-card').length,7);
  assert.match(d.querySelectorAll('#shipList .ship-card')[6].textContent,/VERROUILLÉ — ATTEINDRE LA SOURCE/);
  assert.match(d.querySelectorAll('#shipList .ship-card')[4].textContent,/SPÉCIAL · HALO/);
  h.g.story.complete(1);assert.ok(H.unlocked(4));h.g.story.complete(3);assert.ok(H.unlocked(5));assert.ok(!H.unlocked(6));h.g.story.complete(5);assert.ok(H.unlocked(6));
  d.getElementById('shipBtn').click();d.querySelectorAll('#shipList .ship-card')[5].click();assert.equal(JSON.parse(h.w.localStorage.getItem('nebula4_meta')).ship,5);
  assert.equal(d.getElementById('bridgeShipName18').textContent,'FAUCHEUR');assert.match(d.getElementById('bridgeShipDesc18').textContent,/FAUCHÉE/);
  const c=d.createElement('canvas').getContext('2d');for(let i=0;i<7;i++){H.draw(c,i,1.3);H.art(i);}
  checkErrors(h);
 }finally{h.close();}
});
test('v5.28 specials: SALVE, LANCE, PHASE, HALO, FAUCHÉE, SINGULARITÉ each consume a charge and do their job; TITAN keeps CANON',()=>{
 const mk=(ship)=>boot({best:200000,meta:{ship,story:ALL_DONE}});
 const run=(ship,fn)=>{const h=mk(ship);try{const d=h.w.document;d.getElementById('modeCampagne').click();h.advance(300);h.g.player.invuln=99;h.g.player.cannon=2;h.g.enemies.length=0;fn(h,d);checkErrors(h);}finally{h.close();}};
 run(0,(h)=>{assert.equal(h.g.hangar.special().name,'SALVE');h.g.hangar.use();assert.equal(h.g.player.cannon,2,'sans cible, pas de salve');
  const e=h.g.enemies;h.g.v13.spawnType('drone');assert.ok(h.g.enemies.length>0);h.g.hangar.use();assert.equal(h.g.player.cannon,1);h.advance(700);assert.ok(h.g.hangar.fx().salvo===0);});
 run(1,(h)=>{assert.equal(h.g.hangar.special().name,'LANCE');h.g.v13.spawnType('drone');const e=h.g.enemies[0];e.x=h.g.player.x;e.y=200;e.hp=40;h.g.hangar.use();assert.equal(h.g.player.cannon,1);h.advance(300);assert.ok(!h.g.enemies.includes(e),'le rayon fait fondre la cible');h.advance(800);assert.equal(h.g.hangar.fx().lance,0);});
 run(2,(h)=>{assert.equal(h.g.hangar.special().name,'CANON');h.g.hangar.use();assert.equal(h.g.player.cannon,1);assert.ok(h.g.cannon.salvo()>0);});
 run(3,(h)=>{assert.equal(h.g.hangar.special().name,'PHASE');h.g.player.invuln=0;h.g.hangar.use();assert.ok(h.g.player.invuln>=2.5);assert.ok(h.g.hangar.fx().phase>2);h.g.hangar.use();assert.equal(h.g.player.cannon,1,'pas de double phase');});
 run(4,(h)=>{assert.equal(h.g.hangar.special().name,'HALO');h.g.player.shield=10;for(let k=0;k<5;k++)h.g.v13&&h.g.enemies.length;
  h.g.eBullets;h.g.v13.spawnType('drone');h.g.hangar.use();assert.ok(h.g.player.shield>=55);h.advance(900);assert.equal(h.g.hangar.fx().halo,0);});
 run(5,(h)=>{assert.equal(h.g.hangar.special().name,'FAUCHÉE');h.g.v13.spawnType('drone');const e=h.g.enemies[0];e.x=h.g.player.x-60;e.y=h.g.player.y-120;e.hp=30;h.g.hangar.use();h.advance(700);assert.ok(!h.g.enemies.includes(e),'la faux tranche');});
 run(6,(h)=>{assert.equal(h.g.hangar.special().name,'SINGULARITÉ');assert.equal(h.g.player.cannon,2);h.g.v13.spawnType('drone');const e=h.g.enemies[0];e.x=h.g.player.x+120;e.y=h.g.player.y-250;e.hp=5000;const x0=e.x;
  h.g.hangar.use();assert.ok(h.g.hangar.fx().hole);h.advance(1500);assert.ok(e.x<x0,'le trou noir attire');h.advance(2400);assert.ok(!h.g.hangar.fx().hole,'puis il s\'effondre');});
});
test('v5.28 ships: the new main weapons fire their own pattern; AUBE regenerates its shield faster; ÉCLIPSE starts with two charges',()=>{
 const go=(ship,fn)=>{const h=boot({best:200000,meta:{ship,story:ALL_DONE,autoFire:false}});try{h.w.document.getElementById('modeCampagne').click();h.advance(300);h.g.player.invuln=99;fn(h);checkErrors(h);}finally{h.close();}};
 const volley=(h)=>{const n=h.g.hangar.pb(),o=h.g.hangar.fx().orbs;h.g.hangar.fire();return [h.g.hangar.pb()-n,h.g.hangar.fx().orbs-o];};
 go(0,(h)=>{assert.equal(h.g.player.shieldRegen,14);assert.equal(volley(h).join(),'1,0');});
 go(4,(h)=>{assert.equal(h.g.player.shieldRegen,21);assert.equal(h.g.player.cannon,1);assert.equal(volley(h).join(),'3,0','tir central + deux rayons');});
 go(5,(h)=>{assert.equal(volley(h).join(),'5,0','cinq plombs en éventail');});
 go(6,(h)=>{assert.equal(h.g.player.cannon,2);assert.equal(volley(h).join(),'0,1','un orbe perçant, aucune balle ordinaire');});
});
test('v5.28 victory announces a newly unlocked ship once; the bilan names the next one',()=>{
 const h=boot({meta:{story:{briefed:true}}});try{const d=h.w.document,S=h.g.story;
  d.getElementById('modeCampagne').click();h.advance(300);
  S.victory(15);assert.ok(d.getElementById('shipLine28'));assert.match(d.getElementById('shipLine28').textContent,/AUBE/);assert.match(d.getElementById('shipLine28').textContent,/Protocole I/);
  S.victory(15);assert.ok(!d.getElementById('shipLine28'),'annoncé une seule fois');
  assert.equal(h.g.hangar.newShips().length,0);checkErrors(h);
 }finally{h.close();}
});

test('v5.29 Frisson: grazes fill a gauge, a full gauge sets the player ablaze for 6 s (score ×1.5), idle gauge drains, fixed modes ignore it',()=>{
 const h=boot({meta:{story:{briefed:true}}});try{const d=h.w.document,F=h.g.frisson;
  d.getElementById('modeCampagne').click();h.advance(300);h.g.player.invuln=99;
  F.graze(5);assert.ok(F.meter()>10&&F.meter()<40);assert.equal(F.active(),0);
  let n=0;while(F.active()===0&&n<80){F.graze(1);n++;}assert.equal(F.count(),1);assert.ok(n>=15&&n<=40,'plein en '+n+' frôlements');assert.equal(F.mult(),1.5);
  h.advance(3000);assert.ok(F.active()>2&&F.active()<3.5);assert.ok(F.meter()<60,'la jauge se vide en même temps');
  h.advance(3300);assert.equal(F.active(),0);assert.equal(F.meter(),0);assert.equal(F.mult(),1);
  F.graze(8);const m0=F.meter();h.advance(2500);assert.equal(Math.round(F.meter()),Math.round(m0));h.advance(3500);assert.ok(F.meter()<m0,'sans frôlement, elle redescend');
  h.g.density.setMode('operation');F.set(0);F.graze(40);assert.equal(F.meter(),0,'équité : Opération du jour');h.g.density.setMode('campagne');
  assert.match(d.querySelector('.bridge-version').textContent,/5\.29/);assert.match(d.querySelector('.flight-help').textContent,/FRISSON/);assert.match(d.querySelector('.flight-help').textContent,/Spécial du vaisseau/);
  checkErrors(h);
 }finally{h.close();}
});
