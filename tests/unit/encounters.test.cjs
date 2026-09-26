const {test}=require('node:test');
const assert=require('node:assert/strict');
const {boot}=require('./game-harness.cjs');
const E=require('../../experience/encounters.js');

test('campaign encounters introduce enemy families progressively and scale density without unbounded waves',()=>{
 const names=new Set();
 for(const n of E.waves){
  const normal=E.plan(n,'intense'), calm=E.plan(n,'classique'), dense=E.plan(n,'dechaine');
  names.add(normal.title);
  assert.ok(normal.items.length>calm.items.length);
  assert.ok(dense.items.length>normal.items.length);
  assert.ok(normal.items.length<100);
  assert.ok(normal.items.every(q=>q.lane>=.1&&q.lane<=.9&&q.delay>0));
  assert.ok(normal.items.some(q=>q.delay>3),'breathing interval');
  assert.ok(normal.items.every(q=>E.cost(q.type)<=E.budget(n,'classique',320)));
 }
 assert.equal(names.size,E.waves.length);
 assert.ok(E.plan(1,'intense').items.every(q=>['drone','zig','speeder'].includes(q.type)));
 for(const n of [3,6,9,12,15,16]) assert.equal(E.plan(n,'intense'),null);
});

test('authored spawn lanes are applied and a saturated screen holds then resumes the same queue',()=>{
 const h=boot();try{
  h.w.document.getElementById('modeCampagne').click();h.advance(100);h.g.player.invuln=999;
  h.g.enemies.length=0;
  for(let i=0;i<10;i++)h.g.v13.spawnType('tank');
  const before=h.g.pacing.stats().remaining;
  h.advance(2100);
  assert.equal(h.g.pacing.stats().remaining,before);
  assert.ok(h.g.pacing.stats().held>1);
  h.g.enemies.length=0;h.advance(1900);
  assert.ok(h.g.pacing.stats().remaining<before);
  assert.ok(h.g.enemies.some(e=>e.encounterBeat===0));
  assert.deepEqual(h.errors.map(e=>e.message),[]);
 }finally{h.close();}
});

test('escort addition respects its remaining slots, including the formerly failing 4-to-8 case',()=>{
 const h=boot();try{
  h.w.document.getElementById('modeCampagne').click();h.advance(100);h.g.player.invuln=999;
  h.g.density.startWave(6);h.advance(3000);assert.ok(h.g.boss);h.g.boss.entering=false;
  for(let i=h.g.enemies.length-1;i>=0;i--)if(h.g.enemies[i].type!=='boss')h.g.enemies.splice(i,1);
  for(let i=0;i<4;i++)h.g.v13.spawnType('drone');
  h.g.density.escortIn(0);h.step(1);
  assert.equal(h.g.enemies.filter(e=>e.type!=='boss').length,5);
  h.g.density.escortIn(0);h.step(1);
  assert.equal(h.g.enemies.filter(e=>e.type!=='boss').length,5);
  assert.deepEqual(h.errors.map(e=>e.message),[]);
 }finally{h.close();}
});

test('recorded-music envelope stays behind the studio owner and depth freezes while paused',async()=>{
 const h=boot({assets:true});try{
  const d=h.w.document;d.getElementById('modeCampagne').click();await h.flush();h.advance(800);
  const g=h.g.audio.studioDynamics20;
  assert.equal(g.connections[0],h.g.audio.studioBus);
  assert.ok(g.gain.value>=.58&&g.gain.value<=1);
  h.key('Escape');const t=h.g.depth20.time();h.advance(1000);assert.equal(h.g.depth20.time(),t);
  const random=h.w.Math.random;h.w.Math.random=()=>{throw Error('visual consumed gameplay RNG')};
  h.g.depth20.draw();h.w.Math.random=random;
  d.getElementById('stMusicDynamics20').checked=false;
  d.getElementById('stMusicDynamics20').dispatchEvent(new h.w.Event('change'));h.advance(400);
  assert.equal(g.gain.value,1);
  assert.equal(JSON.parse(h.w.localStorage.getItem('nebula4_meta')).musicDynamics20,false);
  h.g.audio.setMuted(true);assert.equal(h.g.audio.muteGate18.gain.value,0);
  assert.deepEqual(h.errors.map(e=>e.message),[]);
 }finally{h.close();}
});

test('later-act injector cannot extend a drained wave indefinitely',()=>{
 const h=boot();try{
  h.w.document.getElementById('modeCampagne').click();h.advance(100);h.g.player.invuln=999;
  h.g.v13.startActe(3);
  // Drain the real queue while keeping a stationary harmless survivor. The injector
  // must stop once drained instead of repopulating the wave forever.
  for(let i=0;i<9000&&h.g.pacing.stats().remaining;i++){
   h.g.enemies.length=0;h.step(33);
  }
  assert.equal(h.g.pacing.stats().remaining,0);
  const survivor=h.g.v13.spawnType('tank');survivor.vy=0;survivor.fireCd=999;survivor.hp=1e9;
  h.g.enemies.splice(0,h.g.enemies.length,survivor);
  h.advance(12000);
  // Asteroids have a separate ambient timer; they are not injector reinforcements.
  const combat=Array.from(h.g.enemies).filter(e=>e.type!=='asteroid');
  assert.equal(combat.length,1);
  assert.equal(combat[0],survivor);
  assert.deepEqual(h.errors.map(e=>e.message),[]);
 }finally{h.close();}
});

test('recorded effects throttle bursts without falling back to synthesis or consuming gameplay randomness',async()=>{
 const h=boot({assets:true});try{
  h.w.document.getElementById('modeCampagne').click();await h.flush();h.advance(100);
  const ctx=h.g.audio.ctx;
  const before=ctx.nodes.filter(n=>n.kind==='source').length;
  const random=h.w.Math.random;h.w.Math.random=()=>{throw Error('sound consumed gameplay RNG')};
  for(let i=0;i<50;i++)assert.equal(h.g.audio.playSfx('powerup',.5),true);
  h.w.Math.random=random;
  assert.equal(ctx.nodes.filter(n=>n.kind==='source').length-before,1);
  assert.deepEqual(h.errors.map(e=>e.message),[]);
 }finally{h.close();}
});
