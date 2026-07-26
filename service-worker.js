const CONFIG_CACHE = 'kneset-config-v2';
const MEDIA_CACHE = 'kneset-media-v2';
const KNOWN_CACHES = [CONFIG_CACHE, MEDIA_CACHE];
const PRECACHE = ['./', './index.html', './config.json'];
const MEDIA_TTL = 10 * 60 * 1000; // 10 minutes in ms

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CONFIG_CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !KNOWN_CACHES.includes(k)).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  const isConfig = url.pathname.endsWith('config.json');
  const isMedia =
    url.pathname.endsWith('.pdf') ||
    /\.(png|jpe?g|gif|webp)$/i.test(url.pathname);

  if (!isConfig && !isMedia) return;

  if (isConfig) {
    // Stale-while-revalidate, no expiry (Shabbat resilience)
    event.respondWith(
      caches.open(CONFIG_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        const networkPromise = fetch(event.request)
          .then((resp) => {
            cache.put(event.request, resp.clone());
            return resp;
          })
          .catch(() => cached);
        return cached || networkPromise;
      })
    );
    return;
  }

  // Media: TTL-based caching (10 minutes)
  event.respondWith(
    caches.open(MEDIA_CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      let expired = true;

      if (cached) {
        const cachedAt = cached.headers.get('x-sw-cached-at');
        if (cachedAt && Date.now() - Number(cachedAt) < MEDIA_TTL) {
          expired = false;
        }
      }

      if (!expired) {
        // Cache is fresh, return it
        return cached;
      }

      // Cache is expired or missing — prefer network
      try {
        const resp = await fetch(event.request);
        // Clone and stamp with cache time
        const headers = new Headers(resp.headers);
        headers.set('x-sw-cached-at', String(Date.now()));
        const stamped = new Response(await resp.blob(), {
          status: resp.status,
          statusText: resp.statusText,
          headers,
        });
        cache.put(event.request, stamped.clone());
        return stamped;
      } catch (e) {
        // Network failed — fall back to expired cache as safety net
        if (cached) return cached;
        throw e;
      }
    })
  );
});
