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
 assert.match(d.getElementById('specialBtn').getAttribute('aria-label'),/Canon lourd/);checkErrors(h);
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
test('v5.23 CANON button: limited shells, salvo of 3 (5 for TITAN), key C, shells from the O capsule',()=>{
 for(const [ship,start,shots] of [[0,1,3],[2,2,5]]){
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
  assert.match(css,/#fireBtn\{width:84px!important/);
  const labels=[...d.querySelectorAll('#hud .mid .bar-row span')].map(s=>s.dataset.l);assert.ok(labels.slice(0,3).join('')==='CBÉ',labels.join(''));
  assert.ok(d.querySelector('#fireBtn svg'));checkErrors(h);
 }finally{h.close();}
});
test('v5.24 NOVA lance recharges slowly and only fires on a target in its lane',()=>{
 const h=boot({meta:{autoFire:true}});try{h.w.document.getElementById('modeCampagne').click();h.advance(300);
  assert.ok(h.g.v12.lanceT()>=12);h.g.enemies.length=0;h.advance(16000);assert.ok(h.g.v12.charge()>=0.99,'chargée mais sans cible');
  checkErrors(h);
 }finally{h.close();}
});
