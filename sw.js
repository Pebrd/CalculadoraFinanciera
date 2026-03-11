const CACHE_NAME = 'pampa-finance-v1';
const ASSETS = [
  './',
  './index.html',
  './calculadoras.html',
  './Hacienda.html',
  './tasas.html',
  './plazo-fijo.html',
  './noticias.html',
  './shared-styles.css',
  './shared-scripts.js',
  './api-service.js',
  './modern-navigation.js',
  './manifest.json',
  './icono.png'
];

// Install: Cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: Cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
});

// Fetch: Smart caching strategy
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Strategy for Data (JSON): Network First, then Cache
  if (url.pathname.includes('/data/') || url.hostname.includes('api.')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clonedRes = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clonedRes));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Strategy for Assets: Cache First, then Network
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
