import {checkedResponse, parseJSON, validateReleaseManifest, validateRoleManifest, validateDescriptor, resolvePackSelection, selectedEntries, releaseBase, validateHash, sha256} from './contracts.mjs';
export function createOfflineCache({role, origin, cacheStorage = globalThis.caches, fetchImpl = globalThis.fetch, crypto = globalThis.crypto}) {
  const queues = new Map();
  const bootName = cohort => 'gg-offline:bootstrap:v1:' + role + ':' + cohort;
  const name = cohort => 'gg-offline:release:v1:' + role + ':' + cohort;
  const url = (cohort, path) => origin + releaseBase(cohort) + path;
  const markerURL = cohort => url(cohort, '__offline_ready__.json');
  const cancelled = operation => { if (operation?.cancelled?.()) throw new Error('Offline preparation cancelled'); };
  async function readJSON(cache, key) { const item = await cache.match(key); return item ? item.json() : null; }
  async function assertIdentity(data, cache) {
    validateDescriptor({cohort: data.cohort, manifestHash: data.manifestHash});
    let marker;
    try { marker = await readJSON(cache, markerURL(data.cohort)); } catch {}
    let knownHash;
    try { knownHash = validateHash(marker?.manifestHash); } catch {}
    if (knownHash && knownHash !== data.manifestHash) throw new Error('Immutable offline cohort identity mismatch');
    const existing = await cache.match(url(data.cohort, 'release.json'));
    if (!existing) return;
    let existingHash;
    try {
      const bytes = await checkedResponse(existing, null, {crypto, maxBytes: 1048576});
      const manifest = validateReleaseManifest(parseJSON(bytes));
      if (manifest.cohort === data.cohort && manifest.origins[role + 'Origin'] === origin) existingHash = await sha256(bytes, crypto);
    } catch {} // Invalid cached metadata can be repaired; known valid metadata is immutable.
    if (existingHash && existingHash !== data.manifestHash) throw new Error('Immutable offline cohort identity mismatch');
  }
  async function metadata(data, cache, network) {
    validateDescriptor({cohort: data.cohort, manifestHash: data.manifestHash});
    async function get(path, expected, validate) {
      const key = url(data.cohort, path);
      if (network) {
        try {
          const response = await fetchImpl(key, {cache: 'no-store', redirect: 'error', credentials: 'omit'});
          const bytes = await checkedResponse(response.clone(), expected, {crypto, maxBytes: 1048576});
          const value = validate(parseJSON(bytes));
          await cache.put(key, response);
          return value;
        } catch (error) {
          const cached = await cache.match(key);
          if (!cached) throw error;
          return validate(parseJSON(await checkedResponse(cached, expected, {crypto, maxBytes: 1048576})));
        }
      }
      const response = await cache.match(key);
      if (!response) throw new Error('Offline manifest missing');
      return validate(parseJSON(await checkedResponse(response, expected, {crypto, maxBytes: 1048576})));
    }
    const manifest = await get('release.json', {sha256: data.manifestHash}, value => {
      const valid = validateReleaseManifest(value);
      if (valid.cohort !== data.cohort || valid.origins[role + 'Origin'] !== origin) throw new Error('Wrong offline deployment');
      return valid;
    });
    const reference = manifest.roles[role];
    const local = await get(reference.path, {sha256: reference.sha256}, value => validateRoleManifest(value, role, data.cohort));
    return {manifest, local, packs: resolvePackSelection(manifest, data.packs)};
  }
  function receipt(data, local, packs) {
    return {role, cohort: data.cohort, manifestHash: data.manifestHash, roleManifestHash: data.roleManifestHash,
      packs: [...packs], bytes: [...selectedEntries(local, packs), ...local.bootstrap].reduce((sum, entry) => sum + entry.bytes, 0)};
  }
  async function check(data) {
    const cache = await cacheStorage.open(name(data.cohort));
    const marker = await readJSON(cache, markerURL(data.cohort));
    if (!marker || marker.manifestHash !== data.manifestHash) throw new Error('Offline release is not ready');
    const {manifest, local, packs} = await metadata(data, cache, false);
    if (packs.some(pack => !marker.packs.includes(pack))) throw new Error('Offline pack is not prepared');
    for (const entry of selectedEntries(local, packs)) {
      const response = await cache.match(url(data.cohort, entry.path));
      await checkedResponse(response, entry, {crypto});
    }
    const boot = await cacheStorage.open(bootName(data.cohort));
    for (const entry of local.bootstrap) await checkedResponse(await boot.match(origin + entry.path), entry, {crypto});
    return receipt({...data, roleManifestHash: manifest.roles[role].sha256}, local, packs);
  }
  async function perform(data, operation) {
    cancelled(operation);
    const cache = await cacheStorage.open(name(data.cohort));
    await assertIdentity(data, cache);
    const {manifest, local, packs: requested} = await metadata(data, cache, true);
    const old = await readJSON(cache, markerURL(data.cohort));
    const packs = resolvePackSelection(manifest, [...new Set([...requested, ...(old?.manifestHash === data.manifestHash ? old.packs : [])])]);
    const entries = [...selectedEntries(local, packs), ...local.bootstrap];
    const boot = await cacheStorage.open(bootName(data.cohort));
    let completed = 0;
    for (const entry of entries) {
      cancelled(operation);
      const root = entry.path.startsWith('/');
      const key = root ? origin + entry.path : url(data.cohort, entry.path);
      const target = root ? boot : cache;
      const existing = await target.match(key);
      let valid = false;
      if (existing) { try { await checkedResponse(existing, entry, {crypto}); valid = true; } catch {} }
      if (!valid) {
        const download = root ? url(data.cohort, '__control' + entry.path) : key;
        const response = await fetchImpl(download, {cache: 'no-store', redirect: 'error', credentials: 'omit'});
        await checkedResponse(response.clone(), entry, {crypto});
        cancelled(operation);
        await target.put(key, response);
      }
      operation?.progress?.({role, completed: ++completed, total: entries.length});
    }
    cancelled(operation);
    await cache.put(markerURL(data.cohort), new Response(JSON.stringify({manifestHash: data.manifestHash, packs}), {headers: {'Content-Type': 'application/json'}}));
    // Verify stored bytes too: quota/eviction failures must not publish a receipt.
    const verified = await check({...data, packs: requested});
    cancelled(operation);
    return verified;
  }
  function prepare(data, operation) {
    const previous = queues.get(data.cohort) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(() => perform(data, operation));
    queues.set(data.cohort, next);
    next.finally(() => { if (queues.get(data.cohort) === next) queues.delete(data.cohort); }).catch(() => {});
    return next;
  }
  async function matchRelease(request) {
    const requested = new URL(request.url ?? request);
    const matched = /^\/releases\/([a-f0-9]{64})\/(.*)$/.exec(requested.pathname);
    if (!matched) return null;
    const cohort = matched[1], path = matched[2] || 'index.html';
    const cache = await cacheStorage.open(name(cohort));
    const marker = await readJSON(cache, markerURL(cohort));
    if (!marker) return null;
    if (requested.search && !(['index.html', 'offline-preparer.html'].includes(path) && [...requested.searchParams.keys()].every(key => (path === 'index.html' ? ['session'] : ['nonce','parentRole']).includes(key)))) throw new Error('Unknown release query');
    const {local, manifest, packs} = await metadata({cohort, manifestHash: marker.manifestHash, packs: marker.packs}, cache, false);
    if (path === 'release.json') return cache.match(url(cohort, path));
    if (path === 'manifest.json') return cache.match(url(cohort, path));
    const entry = selectedEntries(local, packs).find(entry => entry.path === path);
    if (!entry) throw new Error('Resource is not in the prepared selection');
    const response = await cache.match(url(cohort, path));
    await checkedResponse(response?.clone(), entry, {crypto});
    return response;
  }
  async function matchBootstrap(path, cohort) { return (await cacheStorage.open(bootName(cohort))).match(origin + path); }
  return Object.freeze({prepare, preflight: check, matchRelease, matchBootstrap});
}
