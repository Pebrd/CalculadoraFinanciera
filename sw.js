/**
 * Pampa Finance — Service Worker
 * Estrategia:
 *   - Navegación, HTML, CSS y JS propios: network-first (siempre la última versión).
 *   - Fuentes externas y logos: cache-first (los datos los maneja api-service.js).
 *   - No hay archivos de datos: cada API se pide desde el navegador y se
 *     guarda en el cache del dispositivo (Cache API, ver api-service.js).
 */
const CACHE = 'pampa-v7';
const SHELL = [
    './',
    'index.html',
    'tasas.html',
    'plazo-fijo.html',
    'calculadoras.html',
    'Graficos historicos.html',
    'Hacienda.html',
    'ScreenerArgy.html',
    'noticias.html',
    'styles.css',
    'app.js',
    'api-service.js',
    'data-sources.js',
    'manifest.json',
    'icono.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE)
            .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => null))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

async function networkFirst(request, cacheKey) {
    const cache = await caches.open(CACHE);
    try {
        const response = await fetch(request);
        if (response && response.ok) cache.put(cacheKey || request, response.clone());
        return response;
    } catch (err) {
        const cached = await cache.match(cacheKey || request, { ignoreSearch: true });
        if (cached) return cached;
        throw err;
    }
}

async function cacheFirst(request) {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response && (response.ok || response.type === 'opaque')) {
        cache.put(request, response.clone());
    }
    return response;
}

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request, 'index.html').catch(() => caches.match('index.html')));
        return;
    }

    if (url.origin === self.location.origin) {
        if (/\.(?:css|js|html)$/.test(url.pathname)) {
            event.respondWith(networkFirst(request));
            return;
        }
        event.respondWith(cacheFirst(request).catch(() => caches.match(request)));
        return;
    }

    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
        event.respondWith(cacheFirst(request).catch(() => fetch(request)));
        return;
    }

    // Logos e íconos de terceros: se cachean para no repedirlos en cada visita.
    if (/\.(?:png|jpe?g|svg|webp|ico)$/i.test(url.pathname)) {
        event.respondWith(cacheFirst(request).catch(() => fetch(request)));
    }
});
