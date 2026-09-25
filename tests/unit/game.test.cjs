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
 assert.equal(h.g.state,'playing');assert.equal(h.g.experience.style(),'evolving');assert.ok(h.g.experience.audio().scheduled>0);
 assert.match(d.getElementById('specialBtn').getAttribute('aria-label'),/NOVA/);checkErrors(h);
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
 const h=boot({meta:{musicStyle:'studio',softShots:false,ship:2,musicVol:.35}});try{const d=h.w.document;
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
 const h=boot({assets:true});try{h.w.document.getElementById('modeCampagne').click();h.g.v13.startActe(3);
 await h.flush();h.advance(100);assert.ok(h.g.audio.__act13Music());
 h.g.audio.setMuted(true);h.g.v13.climaxAt(200);h.advance(100);
 assert.equal(h.g.audio.muteGate18.gain.value,0);assert.equal(h.g.experience.audio().active,false);
 h.g.audio.setMuted(false);h.advance(100);assert.equal(h.g.audio.muteGate18.gain.value,1);assert.ok(h.g.experience.audio().active);checkErrors(h);
 }finally{h.close();}
});
test('missing audio assets and absent AudioContext leave gameplay working',async()=>{
 for(const audio of [true,false]){const h=boot({assets:false,audio});try{h.w.document.getElementById('modeCampagne').click();await h.flush();h.advance(1000);
 assert.equal(h.g.state,'playing');if(audio)assert.ok(h.g.experience.audio().scheduled>0);checkErrors(h);
 }finally{h.close();}}
});
test('new source module equals embedded artifact and PWA precaches every new dependency',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');const mod=fs.readFileSync(path.join(root,'v518.js'),'utf8');
 assert.ok(html.includes('// BEGIN EXPERIENCE V5.18\n'+mod+'\n      // END EXPERIENCE V5.18'));
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');assert.ok(sw.includes("'np4-v5.18'"));
 for(const f of ['experience/score.js','experience/bridge.css']){assert.ok(html.includes(f));assert.ok(sw.includes(f));assert.ok(fs.statSync(path.join(root,f)).size>0);}
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
