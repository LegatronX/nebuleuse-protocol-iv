// src/main.js
import { PixiRenderer } from './render/PixiRenderer.js';

const host = document.getElementById('game-host');   // <div id="game-host">
const W = 420, H = 740;
const R = new PixiRenderer(host, { width: W, height: H });

// état de démo (sera remplacé par votre logique via IRenderer)
const ship = { x: W/2, y: H*0.8 };
const bullets = [];
let fireCd = 0;

host.addEventListener('pointermove', (e) => {
  const r = R.app.view.getBoundingClientRect();
  ship.x = (e.clientX - r.left) * (W / r.width);
  ship.y = (e.clientY - r.top)  * (H / r.height);
});

let last = performance.now();
R.app.ticker.add(() => {
  const now = performance.now();
  const dt = Math.min((now - last) / 1000, 0.05);   // clamp anti-spirale
  last = now;

  R.tick(dt);
  // tir automatique de démo
  if ((fireCd -= dt) <= 0) { fireCd = 0.12; bullets.push({ x: ship.x, y: ship.y, life: 1.4 }); }
  // on reconstruit la couche tirs via le contrat (pooled)
  R.fxLayer.children.forEach(s => { if (s.visible) R.release(s, 'bullet'); });
  for (const b of bullets) { b.y -= 520 * dt; b.life -= dt; R.drawBullet(b.x, b.y); }
  for (let i = bullets.length - 1; i >= 0; i--) if (bullets[i].life <= 0 || bullets[i].y < -20) bullets.splice(i,1);
});