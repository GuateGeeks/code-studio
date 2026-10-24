export const offlineRoles = Object.freeze(['shell', 'runner', 'simulator', 'language']);
export const installedOfflineRoles = Object.freeze([...offlineRoles, 'scene3d', 'webapp']);
export function rolesForOrigins(origins) { return Object.hasOwn(origins ?? {}, 'scene3dOrigin') || Object.hasOwn(origins ?? {}, 'webappOrigin') ? installedOfflineRoles : offlineRoles; }
export const offlinePackIds = Object.freeze(['studio-core', 'scratch-2d', 'javascript-quickjs', 'python-stdlib', 'microbit-compiler', 'microbit-simulator']);
export const installedOfflinePackIds = Object.freeze([...offlinePackIds, 'scene3d-babylon', 'webapp-dom']);
export const offlineLimits = Object.freeze({manifestBytes: 1048576, entries: 10000, fileBytes: 67108864, totalBytes: 268435456});
export const offlineRootPaths = Object.freeze(['/offline-sw.js', '/offline/service-worker.mjs', '/offline/cache-engine.mjs', '/offline/store.mjs', '/offline/contracts.mjs']);
const hashPattern = /^[a-f0-9]{64}$/;
const cohortPath = /^\/releases\/([a-f0-9]{64})\/$/;
const fail = message => { throw new Error(message); };
export function exact(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype ||
      Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) fail('Invalid offline ' + label);
}
function denseArray(value, min, max) {
  if (!Array.isArray(value) || value.length < min || value.length > max || Object.keys(value).length !== value.length) return false;
  for (let index = 0; index < value.length; index++) if (!Object.hasOwn(value, index)) return false;
  return true;
}
function packIds(value, min = 1) {
  return denseArray(value, min, installedOfflinePackIds.length) && new Set(value).size === value.length &&
    value.every(id => typeof id === 'string' && installedOfflinePackIds.includes(id));
}
export function validateHash(value) { if (typeof value !== 'string' || !hashPattern.test(value)) fail('Invalid offline hash'); return value; }
export function validateCohort(value) { return validateHash(value); }
export function validateOrigins(value) {
  const roles = rolesForOrigins(value);
  exact(value, roles.map(role => role + 'Origin'), 'origins');
  const values = roles.map(role => {
    const raw = value[role + 'Origin'];
    let url; try { url = new URL(raw); } catch { fail('Invalid offline origin'); }
    if (url.origin !== raw || !['http:', 'https:'].includes(url.protocol)) fail('Invalid offline origin');
    return raw;
  });
  if (new Set(values).size !== roles.length) fail('Offline roles require distinct origins');
  return structuredClone(value);
}
export function releaseBase(cohort) { return '/releases/' + validateCohort(cohort) + '/'; }
export function validateBase(value, cohort) { if (!cohortPath.test(value) || value !== releaseBase(cohort)) fail('Invalid release base'); return value; }
export function validatePath(value) {
  if (typeof value !== 'string' || !value || value.length > 512 || /[\\?#%\u0000-\u0020\u007f]/.test(value) ||
      value.startsWith('/') || value.split('/').some(part => !part || part === '.' || part === '..')) fail('Invalid release resource path');
  return value;
}
function fileEntry(value, root = false) {
  exact(value, root ? ['path', 'bytes', 'sha256', 'contentType'] : ['path', 'bytes', 'sha256', 'contentType', 'packs'], 'file');
  if (root) { if (!offlineRootPaths.includes(value.path)) fail('Unknown offline bootstrap resource'); }
  else validatePath(value.path);
  if (!Number.isSafeInteger(value.bytes) || value.bytes < 0 || value.bytes > offlineLimits.fileBytes) fail('Invalid resource size');
  validateHash(value.sha256);
  if (typeof value.contentType !== 'string' || !value.contentType || value.contentType.length > 100 || /[\r\n]/.test(value.contentType)) fail('Invalid resource type');
  if (!root && !packIds(value.packs)) fail('Invalid resource packs');
}
export function validateRoleManifest(value, role, cohort) {
  exact(value, ['schemaVersion', 'cohort', 'role', 'entries', 'bootstrap', 'totalBytes'], 'role manifest');
  if (![1,2].includes(value.schemaVersion) || value.role !== role || !(value.schemaVersion === 2 ? installedOfflineRoles : offlineRoles).includes(role) || value.cohort !== cohort) fail('Wrong role manifest');
  validateCohort(cohort);
  if (!denseArray(value.entries, 0, offlineLimits.entries) ||
      !denseArray(value.bootstrap, offlineRootPaths.length, offlineRootPaths.length)) fail('Invalid manifest entries');
  let total = 0;
  for (const entry of value.entries) { fileEntry(entry); total += entry.bytes; }
  for (const entry of value.bootstrap) { fileEntry(entry, true); total += entry.bytes; }
  if (new Set(value.entries.map(entry => entry.path)).size !== value.entries.length ||
      new Set(value.bootstrap.map(entry => entry.path)).size !== value.bootstrap.length ||
      value.totalBytes !== total || total > offlineLimits.totalBytes) fail('Invalid manifest inventory');
  return structuredClone(value);
}
export function validateReleaseManifest(value) {
  exact(value, ['schemaVersion', 'cohort', 'rewriteVersion', 'origins', 'roles', 'packs'], 'release manifest');
  if (![1,2].includes(value.schemaVersion) || value.rewriteVersion !== 1) fail('Unsupported offline manifest');
  validateCohort(value.cohort); validateOrigins(value.origins);
  const roles = rolesForOrigins(value.origins), packs = value.schemaVersion === 2 ? installedOfflinePackIds : offlinePackIds;
  if ((value.schemaVersion === 2) !== (roles.length === 6)) fail('Mismatched offline schema/roles');
  exact(value.roles, [...roles], 'roles');
  for (const role of roles) {
    exact(value.roles[role], ['path', 'sha256'], 'role reference');
    if (value.roles[role].path !== 'manifest.json') fail('Invalid role manifest URL');
    validateHash(value.roles[role].sha256);
  }
  if (!denseArray(value.packs, packs.length, packs.length)) fail('Invalid release packs');
  const ids = new Set();
  for (const pack of value.packs) {
    exact(pack, ['id', 'version', 'contentHash', 'dependencies'], 'pack');
    if (!packs.includes(pack.id) || ids.has(pack.id) || typeof pack.version !== 'string' || !pack.version || pack.version.length > 80) fail('Invalid release pack');
    ids.add(pack.id); validateHash(pack.contentHash);
    if (!packIds(pack.dependencies, 0) || pack.dependencies.includes(pack.id)) fail('Invalid pack dependencies');
  }
  resolvePackSelection(value, packs);
  return structuredClone(value);
}
export function resolvePackSelection(manifest, requested = manifest.packs.map(pack => pack.id)) {
  if (!packIds(requested)) fail('Invalid offline pack selection');
  const chosen = new Set(), visiting = new Set();
  function visit(id) {
    if (visiting.has(id)) fail('Cyclic offline pack dependencies');
    if (chosen.has(id)) return;
    const pack = manifest.packs.find(item => item.id === id);
    if (!pack) fail('Missing offline pack');
    visiting.add(id); for (const dependency of pack.dependencies) visit(dependency); visiting.delete(id); chosen.add(id);
  }
  visit('studio-core');
  for (const id of requested) visit(id);
  return manifest.packs.map(pack => pack.id).filter(id => chosen.has(id));
}
export function selectedEntries(manifest, packs) { return manifest.entries.filter(entry => entry.packs.some(id => packs.includes(id))); }
export async function sha256(bytes, cryptoImpl = globalThis.crypto) {
  return Array.from(new Uint8Array(await cryptoImpl.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function checkedResponse(response, expected, {crypto = globalThis.crypto, maxBytes = offlineLimits.fileBytes} = {}) {
  if (!response || !response.ok || response.type === 'opaque' || response.redirected) fail('Offline resource unavailable');
  if (expected?.contentType && response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== expected.contentType.split(';')[0].trim().toLowerCase()) fail('Offline resource type mismatch');
  const declared = response.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) fail('Offline resource too large');
  const reader = response.body?.getReader();
  const chunks = []; let total = 0;
  if (reader) {
    try {
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes || (expected?.bytes !== undefined && total > expected.bytes)) { await reader.cancel(); fail('Offline resource size mismatch'); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
  } else { const bytes = new Uint8Array(await response.arrayBuffer()); total = bytes.length; chunks.push(bytes); }
  if (total > maxBytes || (expected?.bytes !== undefined && total !== expected.bytes)) fail('Offline resource size mismatch');
  const bytes = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  if (expected?.sha256 && await sha256(bytes, crypto) !== expected.sha256) fail('Offline resource integrity mismatch');
  return bytes;
}
export function parseJSON(bytes) { try { return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes)); } catch { fail('Invalid offline JSON'); } }
export function validateDescriptor(value) { exact(value, ['cohort', 'manifestHash'], 'descriptor'); validateCohort(value.cohort); validateHash(value.manifestHash); return structuredClone(value); }
export function validateSelection(value) {
  exact(value, ['cohort', 'manifestHash', 'releaseBase', 'origins', 'packs', 'receipts'], 'selection');
  validateCohort(value.cohort); validateHash(value.manifestHash); validateBase(value.releaseBase, value.cohort); validateOrigins(value.origins);
  if (!packIds(value.packs)) fail('Invalid selected packs');
  const roles = rolesForOrigins(value.origins);
  exact(value.receipts, [...roles], 'receipts');
  for (const role of roles) {
    const item = value.receipts[role];
    exact(item, ['role', 'cohort', 'manifestHash', 'roleManifestHash', 'packs', 'bytes'], 'receipt');
    if (item.role !== role || item.cohort !== value.cohort || item.manifestHash !== value.manifestHash ||
        !packIds(item.packs) || JSON.stringify(item.packs) !== JSON.stringify(value.packs) ||
        !Number.isSafeInteger(item.bytes) || item.bytes < 0 || item.bytes > offlineLimits.totalBytes) fail('Mismatched offline receipt');
    validateHash(item.roleManifestHash);
  }
  return structuredClone(value);
}

export function validateWorkerRequest(data, {role, origin, sourceURL, sourceType}) {
  exact(data, ['protocolVersion','command','operationId','cohort','manifestHash','packs'], 'worker request');
  const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
  if (!installedOfflineRoles.includes(role) || data.protocolVersion !== 1 || !['prepare','preflight'].includes(data.command) ||
      typeof data.operationId !== 'string' || !uuid.test(data.operationId) || sourceType !== 'window') fail('Invalid offline worker caller');
  validateDescriptor({cohort:data.cohort,manifestHash:data.manifestHash});
  if (!packIds(data.packs)) fail('Invalid offline requested packs');
  const source = new URL(sourceURL);
  if (source.origin !== origin) fail('Cross-origin offline caller');
  if (role === 'shell') {
    if (source.pathname !== '/' && !/^\/releases\/[a-f0-9]{64}\/(?:index.html|offline-bootstrap.html)?$/.test(source.pathname)) fail('Unknown offline shell caller');
  } else {
    if (source.pathname !== releaseBase(data.cohort) + 'offline-preparer.html' || !uuid.test(source.searchParams.get('nonce')??'') ||
        source.searchParams.get('parentRole') !== (role === 'simulator' ? 'runner' : 'shell') ||
        [...source.searchParams.keys()].some(key=>!['nonce','parentRole'].includes(key))) fail('Unknown offline preparation agent');
  }
  return structuredClone(data);
}
