import {createOfflineStore} from './store.mjs';
import {createOfflineCache} from './cache-engine.mjs';
import {offlineRootPaths, releaseBase, validateDescriptor, offlinePackIds, validateWorkerRequest} from './contracts.mjs';
export function installOfflineWorker(role, scope = globalThis) {
  const origin = scope.location.origin;
  const store = createOfflineStore({indexedDB:scope.indexedDB});
  const engine = createOfflineCache({role, origin, cacheStorage: scope.caches, fetchImpl: scope.fetch.bind(scope), crypto: scope.crypto});
  scope.addEventListener('install', event => { event.waitUntil(Promise.resolve(scope.skipWaiting?.())); });
  scope.addEventListener('activate', event => { event.waitUntil(Promise.resolve(scope.clients?.claim?.())); });
  scope.addEventListener('message', event => {
    const data = event.data, port = event.ports?.[0];
    if (!port || event.ports.length !== 1 || !event.source?.url) return;
    try { validateWorkerRequest(data, {role, origin, sourceURL:event.source.url, sourceType:event.source.type}); }
    catch { return; }
    let stopped = false;
    port.onmessage = message => { if (message.data?.type === 'cancel' && message.data.operationId === data.operationId) stopped = true; };
    port.start();
    const work = data.command === 'prepare'
      ? engine.prepare(data, {cancelled: () => stopped, progress: progress => { if (!stopped) port.postMessage({type: 'progress', operationId: data.operationId, progress}); }})
      : engine.preflight(data);
    event.waitUntil(work.then(result => { if (!stopped) port.postMessage({type: 'result', operationId: data.operationId, result}); },
      error => { if (!stopped) port.postMessage({type: 'error', operationId: data.operationId, error: String(error.message).slice(0, 1024)}); }));
  });
  scope.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET' || new URL(request.url).origin !== origin) return;
    event.respondWith((async () => {
      const url = new URL(request.url);
      try {
        // Explicit document entries are online navigations, never resource fallbacks.
        if(role==='shell'&&request.mode==='navigate'&&['/latest','/device-transfer.html'].includes(url.pathname))return scope.fetch(request);
        if (role === 'shell' && url.pathname === '/' && request.mode === 'navigate') {
          const state = await store.read();
          for (const selection of [state.current, state.previous].filter(Boolean)) {
            try { const boot = await engine.matchRelease(origin + selection.releaseBase + 'offline-bootstrap.html'); if (boot) return boot; } catch {}
          }
          return scope.fetch(request);
        }
        const runtimeExport=role==='shell'&&/^\/standalone-runtime\/([a-f0-9]{64})\/(scene3d|webapp)\/(javascript|python)\.zip$/.exec(url.pathname);
        if(runtimeExport){
          const client=event.clientId?await scope.clients.get(event.clientId):null;
          if(url.search||!client||client.type!=='window'||new URL(client.url).origin!==origin||!new URL(client.url).pathname.startsWith(releaseBase(runtimeExport[1])))throw new Error('Export caller must belong to its immutable cohort');
          return scope.fetch(request);
        }
        if (offlineRootPaths.includes(url.pathname)) {
          return scope.fetch(request);
        }
        if (url.pathname === '/latest-release.json') return scope.fetch(request);
        if (url.pathname.startsWith('/releases/')) {
          const cached = await engine.matchRelease(request);
          return cached ?? scope.fetch(request);
        }
        const client = event.clientId ? await scope.clients.get(event.clientId) : null;
        const from = client?.url || request.referrer;
        if (from && new URL(from).pathname.startsWith('/releases/')) throw new Error('Unversioned resource blocked');
        return scope.fetch(request);
      } catch (error) {
        return new Response('Offline: ' + String(error.message).slice(0, 160), {status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff'}});
      }
    })());
  });
}
