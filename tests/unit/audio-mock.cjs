class Param {
  constructor(value = 0) { this.value = value; this.events = []; }
  setValueAtTime(v, t) { if (!Number.isFinite(v)) throw Error('Nonfinite AudioParam'); this.value = v; this.events.push(['set',v,t]); }
  linearRampToValueAtTime(v,t) { this.setValueAtTime(v,t); }
  exponentialRampToValueAtTime(v,t) { if(v <= 0) throw Error('Nonpositive exponential target'); this.setValueAtTime(v,t); }
  setTargetAtTime(v,t,c) { if(c <= 0) throw Error('Invalid time constant'); this.setValueAtTime(v,t); }
  cancelScheduledValues() {}
}
class Node {
  constructor(ctx,kind) {
    this.ctx=ctx; this.kind=kind; this.connections=[];
    for(const p of ['gain','frequency','Q','pan','detune','playbackRate','delayTime','threshold','knee','ratio','attack','release']) this[p]=new Param();
    ctx.nodes.push(this);
  }
  connect(n) { if(!n) throw Error('Missing destination'); this.connections.push(n); return n; }
  disconnect() { this.connections=[]; }
  start(t=0) { this.started=t; }
  stop(t=this.ctx.currentTime) { this.ends=t; }
}
class AudioContext {
  constructor() { this.nodes=[]; this.currentTime=0; this.sampleRate=8000; this.state='running'; this.destination=new Node(this,'destination'); }
  createGain(){return new Node(this,'gain');} createOscillator(){return new Node(this,'oscillator');}
  createBiquadFilter(){return new Node(this,'filter');} createDelay(){return new Node(this,'delay');}
  createStereoPanner(){return new Node(this,'pan');} createBufferSource(){return new Node(this,'source');}
  createDynamicsCompressor(){return new Node(this,'compressor');} createConvolver(){return new Node(this,'convolver');}
  createWaveShaper(){return new Node(this,'shaper');}
  createBuffer(ch,len,rate) { const a=Array.from({length:ch},()=>new Float32Array(len));return {getChannelData:n=>a[n],duration:len/rate,length:len}; }
  decodeAudioData() { return Promise.resolve(this.createBuffer(2,800,8000)); }
  resume() { this.state='running'; return Promise.resolve(); }
  suspend() { this.state='suspended'; return Promise.resolve(); }
  advance(t) { this.currentTime=t; for(const n of this.nodes) if(!n.ended && n.ends <= t) { n.ended=true; n.onended?.(); } }
}
module.exports={AudioContext};
