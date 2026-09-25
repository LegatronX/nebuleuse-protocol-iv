// Nébuleuse Protocol IV — service worker (jeu jouable hors ligne)
// Cœur (page, manifest, icônes) pré-mis en cache à l'installation ;
// assets (décors, musiques, SFX) chargés en arrière-plan puis servis depuis le cache.
// Changer VERSION à chaque release pour purger l'ancien cache.
// Liste ASSETS à régénérer si des fichiers sont ajoutés dans assets/.
const VERSION = 'np4-v5.19';
const CORE = ['experience/score.js', 'experience/bridge.css', './', 'index.html', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'];
const ASSETS = [
"assets/bg-alien.webp",
"assets/bg-cathedral.webp",
"assets/bg-dream.webp",
"assets/bg-echoes.webp",
"assets/bg-forge.webp",
"assets/bg-frozen.webp",
"assets/bg-glass.webp",
"assets/bg-graveyard.webp",
"assets/bg-hive.webp",
"assets/bg-horizon.webp",
"assets/bg-methane.webp",
"assets/bg-nacre.webp",
"assets/bg-quantum.webp",
"assets/bg-signal.webp",
"assets/bg-singularity.webp",
"assets/bg-suns.webp",
"assets/emblem.webp",
"assets/menu-bg.jpg",
"assets/music-boss.mp3",
"assets/music-cathedral.mp3",
"assets/music-combat.mp3",
"assets/music-dream.mp3",
"assets/music-echoes.mp3",
"assets/music-final.mp3",
"assets/music-glass.mp3",
"assets/music-graveyard.mp3",
"assets/music-hive.mp3",
"assets/music-horizon.mp3",
"assets/music-menu.mp3",
"assets/music-methane.mp3",
"assets/music-nacre.mp3",
"assets/music-signal.mp3",
"assets/music-singularity.mp3",
"assets/music-suns.mp3",
"assets/sfx-aria.mp3",
"assets/sfx-bossalert.mp3",
"assets/sfx-chord.mp3",
"assets/sfx-climax.mp3",
"assets/sfx-coin.mp3",
"assets/sfx-coinburst.mp3",
"assets/sfx-explosion.mp3",
"assets/sfx-glass-shatter.mp3",
"assets/sfx-harpoon.mp3",
"assets/sfx-hatch.mp3",
"assets/sfx-heartbeat.mp3",
"assets/sfx-hypnosis.mp3",
"assets/sfx-interlude.mp3",
"assets/sfx-jackpot.mp3",
"assets/sfx-mirror.mp3",
"assets/sfx-novablast.mp3",
"assets/sfx-novacharge.mp3",
"assets/sfx-overdrive.mp3",
"assets/sfx-phase.mp3",
"assets/sfx-portal.mp3",
"assets/sfx-powerup.mp3",
"assets/sfx-riser.mp3",
"assets/sfx-silence-pop.mp3",
"assets/sfx-singularity.mp3",
"assets/sfx-subhit.mp3",
"assets/sfx-tesla.mp3",
"assets/sfx-unison.mp3",
"assets/ship-mirage.webp",
"assets/ship-pulse.webp",
"assets/ship-titan.webp",
"assets/ship-vector.webp"
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
    // Préchargement des assets sans bloquer l'activation : un échec isolé n'empêche pas le reste.
    const c = await caches.open(VERSION);
    for (const url of ASSETS) {
      if (!(await c.match(url))) { try { await c.add(url); } catch (err) {} }
    }
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Classement Supabase et autres origines : jamais interceptés.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // Page : réseau d'abord (les mises à jour arrivent), cache en repli hors ligne.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put('index.html', copy));
      return res;
    }).catch(() => caches.match('index.html')));
    return;
  }

  // Assets : cache d'abord, réseau sinon (seules les réponses 200 complètes sont stockées).
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.status === 200) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return res;
  })));
});
