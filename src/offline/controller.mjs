import {createOfflineStore} from './store.mjs';
import {createOfflineTransport, readLatestRelease} from './client.mjs';
import {rolesForOrigins, releaseBase, resolvePackSelection, validateReleaseManifest, validateDescriptor, validateSelection} from './contracts.mjs';
export function createOfflineController({config = null, onChange = () => {}, window = globalThis.window,
  store = createOfflineStore(), transport = createOfflineTransport({window}), loadRelease = () => readLatestRelease({window})} = {}) {
  let currentOperation = null;
  let value = {status: 'idle', current: null, previous: null, error: null, progress: null};
  const snapshot = () => structuredClone(value);
  function publish(patch) { value = {...value, ...patch}; onChange(snapshot()); }
  function stop() {
    if (!currentOperation) return false;
    const operation = currentOperation; currentOperation = null;
    operation.controller.abort();
    publish({status: value.current ? 'ready' : 'idle', progress: null, error: null});
    return true;
  }
  async function status() {
    const stored = await store.read();
    publish({current: stored.current, previous: stored.previous,
      ...(currentOperation ? {} : {status: stored.current ? 'ready' : 'idle'})});
    return snapshot();
  }
  async function init() { await transport.init?.(); return status(); }
  function begin() {
    stop();
    const controller = new AbortController();
    const operation = {id: globalThis.crypto.randomUUID(), controller, signal: controller.signal};
    operation.onProgress = progress => { if (currentOperation === operation) publish({progress}); };
    currentOperation = operation;
    publish({status: 'preparing', progress: null, error: null});
    return operation;
  }
  function active(operation) { if (currentOperation !== operation || operation.signal.aborted) throw new Error('Preparacion cancelada.'); }
  async function verify(selection, {signal, operationId = globalThis.crypto.randomUUID(), onProgress = () => {}} = {}) {
    const candidate = validateSelection(selection);
    const receipts = await transport.run('preflight', candidate, {id: operationId, signal, onProgress});
    for (const role of rolesForOrigins(candidate.origins)) if (receipts[role]?.roleManifestHash !== candidate.receipts[role].roleManifestHash) throw new Error('Mismatched role receipt');
    return validateSelection({...candidate, receipts});
  }
  async function run(kind, options) {
    const operation = begin();
    try {
      const original = await store.read(); active(operation);
      let candidate;
      if (kind === 'prepare') {
        const loaded = await loadRelease(); active(operation);
        const descriptor = validateDescriptor(loaded.descriptor), manifest = validateReleaseManifest(loaded.manifest);
        if (descriptor.cohort !== manifest.cohort) throw new Error('Mismatched release descriptor');
        if (config?.shellOrigin && manifest.origins.shellOrigin !== config.shellOrigin) throw new Error('Release de otro despliegue.');
        const packs = resolvePackSelection(manifest, options?.packs);
        const base = {cohort: descriptor.cohort, manifestHash: descriptor.manifestHash, releaseBase: releaseBase(descriptor.cohort), origins: manifest.origins, packs};
        const receipts = await transport.run('prepare', base, {id: operation.id, signal: operation.signal, onProgress: operation.onProgress});
        active(operation);
        for (const role of rolesForOrigins(manifest.origins)) if (receipts[role]?.roleManifestHash !== manifest.roles[role].sha256) throw new Error('Mismatched role receipt');
        candidate = validateSelection({...base, receipts});
      } else {
        if (!original.previous) throw new Error('No hay una version anterior preparada.');
        candidate = await verify(original.previous, {signal: operation.signal, operationId: operation.id, onProgress: operation.onProgress});
      }
      active(operation);
      const committed = await store.commit(candidate, original.generation, {signal: operation.signal});
      active(operation); currentOperation = null;
      publish({status: 'ready', current: committed.current, previous: committed.previous, error: null, progress: null});
      return structuredClone(candidate);
    } catch (error) {
      if (currentOperation === operation) {
        currentOperation = null; operation.controller.abort();
        publish({status: 'error', error: String(error.message).slice(0, 1024), progress: null});
      }
      throw error;
    }
  }
  return Object.freeze({init, status, state: snapshot, prepare: options => run('prepare', options), rollback: () => run('rollback'),
    cancel: stop, verify, hasPack: id => value.current?.packs.includes(id) === true});
}
