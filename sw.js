const CACHE_NAME = 'guessthegame-v9';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './characters.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
  );
  self.clients.claim();
});

// Network-first for the app shell (HTML/CSS/JS): always try to fetch the
// latest version when online, and only fall back to the cached copy if the
// network request fails (offline support). This avoids ever getting stuck
// on an outdated cached version after a deploy.
self.addEventListener('fetch', e=>{
  if(e.request.method!=='GET') return;
  if(e.request.url.includes('api.github.com')) return; // never cache leaderboard calls

  e.respondWith(
    fetch(e.request, {cache:'no-store'}).then(res=>{
      const resClone = res.clone();
      caches.open(CACHE_NAME).then(cache=>cache.put(e.request, resClone)).catch(()=>{});
      return res;
    }).catch(()=>caches.match(e.request))
  );
});
