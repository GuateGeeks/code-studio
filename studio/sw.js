const VERSION = '__GG_VERSION__';
const CACHE = `gg-${VERSION}`;
const BASE = new URL('./', location.href).pathname;
const PARALLEL = 6;

// The version in the URL gets past every HTTP and CDN cache, so a publish never mixes files.
const fresh = path => fetch(`${BASE}${path}?v=${VERSION}`);

async function install() {
  const manifest = await (await fresh('sw-manifest.json')).json();
  if (manifest.version !== VERSION) throw new Error('Publicación a medias');
  const cache = await caches.open(CACHE);
  const pending = [...manifest.files];
  const worker = async () => {
    while (pending.length) {
      const path = pending.pop();
      const response = await fresh(path);
      if (!response.ok) throw new Error(`${path}: ${response.status}`);
      await cache.put(`${BASE}${path}`, response);
    }
  };
  await Promise.all(Array.from({length: PARALLEL}, worker));
}

// No skipWaiting: an open tab keeps its version until every tab has closed.
self.addEventListener('install', event => event.waitUntil(install()));

self.addEventListener('activate', event => event.waitUntil((async () => {
  const names = await caches.keys();
  await Promise.all(names.filter(name => name.startsWith('gg-') && name !== CACHE).map(name => caches.delete(name)));
})()));

async function respond(request, {pathname}) {
  const cache = await caches.open(CACHE);
  const path = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  return (await cache.match(path)) ?? fetch(request);
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith(BASE)) return;
  event.respondWith(respond(event.request, url));
});
