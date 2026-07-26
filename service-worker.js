const CACHE = 'kneset-cache-v1';
const PRECACHE = ['./', './index.html', './config.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const match = url.pathname.endsWith('config.json') ||
                url.pathname.endsWith('.pdf') ||
                /\.(png|jpe?g|gif|webp)$/i.test(url.pathname);
  if (!match) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      const network = fetch(event.request)
        .then((resp) => { cache.put(event.request, resp.clone()); return resp; })
        .catch(() => cached);
      return cached || network;
    })
  );
});
