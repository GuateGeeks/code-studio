const VERSION = '__GG_VERSION__';
const PREFIX = 'gg-code-studio-';
const CACHE = `${PREFIX}${VERSION}`;
const BASE = new URL('./', location.href).pathname;
const MANIFEST = 'sw-manifest.json';
const PARALLEL = 6;
const SPACE_MARGIN = 1.2;

const key = path => `${BASE}${path}`;
const hex = buffer => [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, '0')).join('');
const otherCaches = async () => (await caches.keys()).filter(name => name.startsWith(PREFIX) && name !== CACHE);

// The manifest goes in last, so a cache without one is an unfinished install nothing can use.
async function lastComplete() {
  for (const name of await otherCaches()) {
    const cache = await caches.open(name);
    const stored = await cache.match(key(MANIFEST));
    if (stored) return {cache, manifest: await stored.json()};
    await caches.delete(name);
  }
  return null;
}

async function report(done, total) {
  const pages = await self.clients.matchAll({includeUncontrolled: true});
  for (const page of pages) page.postMessage({type: 'gg-offline', done, total});
}

// The hash in the URL gets past HTTP and CDN caches; checking it stops a publish in progress from mixing files.
async function download(cache, path, sha) {
  const response = await fetch(`${key(path)}?v=${sha}`);
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  if (hex(await crypto.subtle.digest('SHA-256', await response.clone().arrayBuffer())) !== sha) throw new Error(`${path}: otro contenido`);
  await cache.put(key(path), response);
}

async function install() {
  const manifest = await (await fetch(`${key(MANIFEST)}?v=${VERSION}`)).json();
  if (manifest.version !== VERSION || !manifest.files.length) throw new Error('Publicación a medias');
  const previous = await lastComplete();
  const {quota, usage} = await navigator.storage.estimate();
  if (quota - usage < manifest.bytes * SPACE_MARGIN) throw new Error('Sin espacio');

  const cache = await caches.open(CACHE);
  const pending = [...manifest.files];
  const total = pending.length;
  let failed = false;
  const fill = async () => {
    while (pending.length && !failed) {
      const path = pending.pop();
      try {
        // An interrupted install resumes: what's already here was checked when it arrived.
        if (await cache.match(key(path))) continue;
        const unchanged = previous?.manifest.sha[path] === manifest.sha[path] && await previous.cache.match(key(path));
        if (unchanged) await cache.put(key(path), unchanged);
        else await download(cache, path, manifest.sha[path]);
      } catch (error) {
        failed = true;
        throw error;
      }
      await report(total - pending.length, total);
    }
  };
  await Promise.all(Array.from({length: PARALLEL}, fill));
  await cache.put(key(MANIFEST), new Response(JSON.stringify(manifest), {headers: {'Content-Type': 'application/json'}}));
}

// No automatic skipWaiting: an open tab keeps its version until the tabs close or the teacher updates.
self.addEventListener('install', event => event.waitUntil(install()));

self.addEventListener('message', ({data}) => {
  if (data === 'gg-update') self.skipWaiting();
});

self.addEventListener('activate', event => event.waitUntil((async () => {
  const stale = await otherCaches();
  await Promise.all(stale.map(name => caches.delete(name)));
  // With no earlier version there is nothing to mix, and the open tab should work offline right away.
  if (!stale.length) await self.clients.claim();
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
