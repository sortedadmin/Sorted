// Minimal service worker: caches the app shell so the app can install as a
// PWA and still open (even if briefly offline/on a flaky connection).
// It does NOT try to cache API/Firebase calls or third-party CDN scripts —
// only this app's own shell files — so data always stays fresh.
const CACHE_NAME = 'sorted-shell-v1';
const SHELL_FILES = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isShellFile = url.origin === self.location.origin &&
    SHELL_FILES.some((f) => url.pathname.endsWith(f.replace('./', '')));

  if (!isShellFile) return; // let the network handle everything else as normal

  // Network-first for the shell so users get updates promptly, falling
  // back to cache when offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
