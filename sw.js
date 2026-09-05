/* Beat Buddies service worker — makes the app work with no internet. */
const CACHE = 'beat-buddies-v5';
const MATCH = { ignoreSearch: true, ignoreVary: true };
const ASSETS = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
];

/* Store a clean copy: the server may hand us a gzipped response, and replaying
   one of those straight from the cache can make the browser choke. Rebuilding
   the response from its decoded body keeps playback rock solid. */
async function store(url) {
  const res = await fetch(url, { cache: 'reload' });
  if (!res || !res.ok) throw new Error('bad response for ' + url);
  const body = await res.blob();
  const type = res.headers.get('Content-Type') || 'application/octet-stream';
  const c = await caches.open(CACHE);
  await c.put(url, new Response(body, { status: 200, headers: { 'Content-Type': type } }));
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    await Promise.allSettled(ASSETS.map(store));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // navigations: serve the cached app shell (works with zero network),
  // then quietly refresh it for next time
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const hit = await caches.match('index.html', MATCH);
      if (hit) { store('index.html').catch(() => {}); return hit; }
      try { return await fetch(req); }
      catch (err) {
        return (await caches.match('./', MATCH)) ||
          new Response('<h1>Beat Buddies is offline</h1>', { headers: { 'Content-Type': 'text/html' } });
      }
    })());
    return;
  }

  // everything else: cache first, then network (fonts get cached as they arrive)
  e.respondWith((async () => {
    const hit = await caches.match(req, MATCH);
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res && res.type === 'opaque') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      } else if (res && res.ok) {
        store(req.url).catch(() => {});
      }
      return res;
    } catch (err) {
      return Response.error();
    }
  })());
});
