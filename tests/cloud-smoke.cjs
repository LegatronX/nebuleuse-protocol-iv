// Vérifie la distribution réelle sur un écran tactile et les fichiers audio servis par Range.
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname,'..');
const origin = 'http://127.0.0.1:8184';
async function main() {
  const server = spawn(process.execPath,['tools/serve-cloud.cjs','dist','8184'],{cwd:root,stdio:'ignore'});
  let browser;
  const errors = [];
  try {
    for(let i=0;i<50;i++) {
      try {if((await fetch(origin)).ok)break;}catch{}
      await new Promise(r=>setTimeout(r,100));
    }
    const audioPath='/assets/music/game/les-balises-oubliees--142ca66c.mp3';
    const part=await fetch(origin+audioPath,{headers:{Range:'bytes=100-199'}});
    assert.equal(part.status,206); assert.equal((await part.arrayBuffer()).byteLength,100);
    const head=await fetch(origin+audioPath,{method:'HEAD'});
    assert.equal(head.status,200); assert.equal(head.headers.get('content-type'),'audio/mpeg');
    browser=await chromium.launch();
    const page=await browser.newPage({viewport:{width:430,height:932},deviceScaleFactor:3,isMobile:true,hasTouch:true});
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin,{waitUntil:'domcontentloaded'});
    await page.evaluate(()=>localStorage.setItem('nebula4_meta',JSON.stringify({tuto:true,autoFire:true})));
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.__NP4?.suno);
    await page.evaluate(()=>document.querySelectorAll('.overlay:not(#menu)').forEach(e=>e.classList.add('hidden')));
    await page.tap('#modeCampagne');
    await page.waitForFunction(()=>window.__NP4.state==='playing');
    await page.evaluate(()=>window.__NP4.player.invuln=999);
    await page.waitForFunction(()=>window.__NP4.suno.now()?.t>1,{},{timeout:20000});
    const before=await page.evaluate(()=>window.__NP4.suno.now());
    await page.waitForTimeout(1500);
    const after=await page.evaluate(()=>({now:window.__NP4.suno.now(),live:window.__NP4.suno.live(),
      state:window.__NP4.state,viewport:document.documentElement.scrollWidth<=innerWidth,
      enemies:window.__NP4.enemies.length,gpuTier:window.__NP4.fx.tier()}));
    assert.equal(after.live,true);assert.equal(after.state,'playing');assert.equal(after.viewport,true);
    assert.equal(after.now.key,before.key); assert.ok(after.now.t>before.t,'La lecture doit progresser');
    await page.waitForFunction(()=>window.__NP4.enemies.length>0,{},{timeout:20000});
    if(process.argv[2])await page.screenshot({path:path.resolve(process.argv[2])});
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({result:'PASS',range:206,tracks:await page.evaluate(()=>window.__NP4.suno.tracks().length),...after}));
  } finally {
    if(browser)await browser.close();
    server.kill();
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
