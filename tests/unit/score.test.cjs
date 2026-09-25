const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Score}=require('../../experience/score.js');
const {AudioContext}=require('./audio-mock.cjs');
const create=()=>{const c=new AudioContext();return {c,s:new Score(c,c.destination)};};
function advance(c,s,seconds) { const end=c.currentTime+seconds; for(let t=c.currentTime;t<end;t+=.025){c.advance(t);s.tick();} }
test('a two-minute score changes sections and keeps voice count bounded',()=>{
 const {c,s}=create();s.setScene({playing:true,threat:.7,sector:2});s.setActive(true);
 const sections=new Set();let max=0;
 for(let i=0;i<120;i++){advance(c,s,1);sections.add(s.info().section);max=Math.max(max,s.voices.size);}
 assert.equal(sections.size,4);assert.ok(s.scheduled>400);assert.ok(max<64);
 s.dispose();c.advance(c.currentTime+8);assert.equal(s.voices.size,0);
});
test('boss transition is quantized and quiet scenes drop rhythm',()=>{
 const {c,s}=create();s.setScene({playing:true,sector:1,threat:.2});s.setActive(true);advance(c,s,.1);
 const initial=s.info().bpm;s.setScene({playing:true,boss:true,sector:1});advance(c,s,.1);
 assert.equal(s.info().bpm,initial);advance(c,s,4);assert.equal(s.info().bpm,116);assert.equal(s.info().energy,1);
 s.setScene({playing:true,rest:true,sector:3});advance(c,s,3);assert.equal(s.info().bpm,74);assert.equal(s.info().energy,0);
});
test('suspended audio schedules nothing and resume never replays missed beats',()=>{
 const {c,s}=create();s.setScene({playing:true});s.setActive(true);advance(c,s,1);
 c.state='suspended';let count=s.scheduled;advance(c,s,300);assert.equal(s.scheduled,count);
 c.state='running';s.tick();assert.ok(s.scheduled-count<15);
 s.setActive(false);count=s.scheduled;advance(c,s,3);assert.equal(s.scheduled,count);
});
test('musical and shot randomness are isolated from gameplay and each other',()=>{
 const {c,s}=create(),b=create();let calls=0;const rng=Math.random;
 try { Math.random=()=>{calls++;return .5;};s.setScene({playing:true,threat:1});b.s.setScene({playing:true,threat:1});
 s.setActive(true);b.s.setActive(true);
 for(let i=0;i<100;i++){c.advance(i*.1);b.c.advance(i*.1);s.shot(i%4,c.destination);s.tick();b.s.tick();}
 assert.equal(calls,0);assert.equal(s.seed,b.s.seed);
 }finally{Math.random=rng;}
});
test('shot voices are throttled and four ships have different frequencies',()=>{
 const {c,s}=create();const pitches=[];
 for(let i=0;i<4;i++){c.advance(i);s.shot(i,c.destination);pitches.push(c.nodes.filter(n=>n.kind==='oscillator').at(-1).frequency.events[0][1]);}
 assert.equal(new Set(pitches).size,4);
 const count=s.scheduled;for(let i=0;i<100;i++)s.shot(0,c.destination);assert.equal(s.scheduled,count);
});
test('works without stereo panner support and all sends terminate in music volume',()=>{
 const c=new AudioContext();c.createStereoPanner=undefined;const dest=c.createGain(),s=new Score(c,dest);
 s.setScene({playing:true,sector:0});s.setActive(true);advance(c,s,5);
 assert.equal(s.input.connections[0],dest);assert.equal(s.wet.connections[0],s.filter);assert.equal(s.filter.connections[0],s.input);
 assert.ok(s.scheduled>10);
});
