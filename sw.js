/* Kandoo Service Worker — offline caching for the single-page app.
 * Cache the app shell + mascot images on install; cache-first for everything. */
var CACHE = 'kandoo-v2';
var ASSETS = [
  './',
  './index.html'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      return c.addAll(ASSETS).catch(function() { /* some assets may be missing — fine */ });
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  /* Only handle same-origin (skip cross-origin like CDNs / PayPal / images) */
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(res) {
        if (res && res.status === 200 && (res.type === 'basic' || res.type === 'default')) {
          var copy = res.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function() {
        /* Fully offline: serve the app shell for navigation requests */
        if (e.request.mode === 'navigate') {
          return caches.match('./kline_trainer.html').then(function(shell) {
            return shell || caches.match('./');
          });
        }
      });
    })
  );
});
