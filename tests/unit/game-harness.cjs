// DOM integration only: no browser, network, rendering or actual audio output.
const {JSDOM}=require('jsdom');
const fs=require('node:fs');
const path=require('node:path');
const {AudioContext}=require('./audio-mock.cjs');
const root=path.resolve(__dirname,'../..');
function boot({assets=false,meta={},audio=true}={}) {
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const dom=new JSDOM(html,{url:'https://unit.test/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;const observers=[];const Observer=w.MutationObserver;
 w.MutationObserver=class extends Observer{constructor(fn){super(fn);observers.push(this);}};let raf=null,clock=0,uid=0;const timers=new Map(),errors=[];
 w.addEventListener('error',e=>errors.push(e.error||e.message));
 const gradient={addColorStop(){}};
 const canvas=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h}),measureText:s=>({width:String(s).length*7}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,
  createPattern:()=>({}),getImageData:()=>({data:new Uint8ClampedArray(16)}),getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0})},
  {get:(o,k)=>k in o?o[k]:(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 w.HTMLCanvasElement.prototype.getContext=function(type){return type==='2d'?canvas:null;};
 w.HTMLCanvasElement.prototype.toDataURL=()=>'';
 w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 w.ResizeObserver=class{observe(){} disconnect(){}};
 w.fetch=async()=>({ok:assets,arrayBuffer:async()=>new ArrayBuffer(8),json:async()=>[]});
 w.requestAnimationFrame=fn=>{raf=fn;return 1;};w.cancelAnimationFrame=()=>{};
 w.setTimeout=(fn,delay=0)=>{const id=++uid;timers.set(id,{fn,at:clock+delay,delay:0});return id;};
 w.setInterval=(fn,delay)=>{const id=++uid;timers.set(id,{fn,at:clock+delay,delay});return id;};
 w.clearTimeout=w.clearInterval=id=>timers.delete(id);
 Object.defineProperty(w.performance,'now',{value:()=>clock});
 if(audio)w.AudioContext=AudioContext;
 w.localStorage.setItem('nebula4_meta',JSON.stringify({tuto:1,chest:{lastDate:new Date().toLocaleDateString('en-CA'),streak:1},...meta}));
 w.eval(fs.readFileSync(path.join(root,'experience/score.js'),'utf8'));
 for(const script of w.document.querySelectorAll('script:not([src])')) if(script.textContent.trim())w.eval(script.textContent);
 const g=w.__NP4;
 function step(ms=33){clock+=ms;g?.audio.ctx?.advance(clock/1000);
  for(const [id,t] of [...timers])if(t.at<=clock){if(t.delay)t.at=clock+t.delay;else timers.delete(id);t.fn();}
  const fn=raf;raf=null;if(fn)fn(clock);
 }
 function advance(ms){for(let n=0;n<ms;n+=33)step(Math.min(33,ms-n));}
 function key(code,target=w.document.body){target.dispatchEvent(new w.KeyboardEvent('keydown',{code,bubbles:true,cancelable:true}));}
 return {dom,w,g,step,advance,key,errors,close:()=>{observers.forEach(o=>o.disconnect());dom.window.close();},flush:async()=>{for(let i=0;i<20;i++)await Promise.resolve();}};
}
module.exports={boot,root};
