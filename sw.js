const CACHE_NAME = 'guessthegame-v5';
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

self.addEventListener('fetch', e=>{
  if(e.request.method!=='GET') return;
  if(e.request.url.includes('api.github.com')) return; // never cache leaderboard calls
  e.respondWith(
    caches.match(e.request).then(cached=>cached || fetch(e.request).then(res=>{
      const resClone = res.clone();
      caches.open(CACHE_NAME).then(cache=>cache.put(e.request, resClone)).catch(()=>{});
      return res;
    }).catch(()=>cached))
  );
});
