const CACHE_NAME = 'kurdish-games-pwa-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/images/icon.png',
  '/css/theme.css',
  '/css/loading.css',
  '/css/home.css',
  '/css/games.css',
  '/css/store.css',
  '/css/profile.css',
  '/css/social.css',
  '/games/dama/css/dama.css',
  '/js/translations.js',
  '/js/notifications.js',
  '/js/home.js',
  '/js/playerData.js',
  '/js/profile.js',
  '/js/social.js',
  '/js/store.js',
  '/js/hub_multiplayer.js',
  '/games/dama/js/dama.js',
  '/games/dama/js/multiplayer.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => {
      if (key !== CACHE_NAME) {
        return caches.delete(key);
      }
    }))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then(networkResponse => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      }).catch(() => {
        return caches.match('/index.html');
      });
    })
  );
});
