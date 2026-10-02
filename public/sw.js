// ============================================================
// Service worker — Catatan Bersama
// Bump VERSION saat deploy update biar cache lama ter-invalidate.
// ============================================================
const VERSION = 'v2';
const CACHE = `catatan-${VERSION}`;
const PRECACHE = ['/', '/room.html', '/css/style.css', '/manifest.json', '/vendor/qrcode.min.js', '/vendor/jsQR.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(PRECACHE.map((u) => c.add(new Request(u)))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // Navigasi HTML: network-first, fallback cache (offline tetap bisa buka)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.open(CACHE).then((c) =>
          c.match(e.request).then((r) => r || c.match('/room.html') || c.match('/'))
        ))
    );
    return;
  }

  // Font Google: cache-first
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    e.respondWith(
      caches.open(CACHE)
        .then((c) => c.match(e.request))
        .then((res) => res || fetch(e.request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        }))
    );
    return;
  }

  // Aset statis same-origin: cache-first
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.open(CACHE)
        .then((c) => c.match(e.request))
        .then((res) => res || fetch(e.request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        }))
    );
  }
});