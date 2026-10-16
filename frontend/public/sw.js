/* Beadsboutique service worker — app-shell caching for installability + offline fallback. */
const CACHE = 'beadsboutique-v2';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/logo.webp'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET' || !request.url.startsWith('http')) return;
  // Never cache API calls — always go to the network for fresh data.
  if (request.method !== 'GET' || request.url.includes('/backend/') || request.url.includes('/api/')) return;

  // Navigation requests: network-first, fall back to cached shell when offline.
  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).catch(async () => {
      const cached = await caches.match('/index.html');
      return cached || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    }));
    return;
  }

  // Static assets: cache-first.
  e.respondWith(
    caches.match(request).then((cached) =>
      cached ||
      fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => { });
        return res;
      }).catch(() => cached || new Response('', { status: 504, statusText: 'Network unavailable' }))
    )
  );
});
