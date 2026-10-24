import {validateSelection} from './contracts.mjs';
const empty = () => ({generation: 0, current: null, previous: null});
function validateState(value) {
  if (!value || !Number.isSafeInteger(value.generation) || value.generation < 0) throw new Error('Invalid offline state');
  return {generation: value.generation, current: value.current ? validateSelection(value.current) : null, previous: value.previous ? validateSelection(value.previous) : null};
}
export function createOfflineStore({indexedDB = globalThis.indexedDB, name = 'gg-offline-selections-v1'} = {}) {
  let connection;
  async function db() {
    if (!indexedDB) throw new Error('IndexedDB no disponible para preparar sin conexion.');
    connection ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('state');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
    });
    return connection;
  }
  async function read() {
    const database = await db();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction('state', 'readonly');
      const request = transaction.objectStore('state').get('selection');
      let value;
      request.onsuccess = () => { try { value = request.result ? validateState(request.result) : empty(); } catch (error) { reject(error); } };
      transaction.oncomplete = () => resolve(value);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error('Offline storage aborted'));
    });
  }
  async function commit(selection, expectedGeneration, {signal} = {}) {
    const candidate = validateSelection(selection);
    if (signal?.aborted) throw new Error('Preparacion cancelada.');
    const database = await db();
    if (signal?.aborted) throw new Error('Preparacion cancelada.');
    return new Promise((resolve, reject) => {
      const transaction = database.transaction('state', 'readwrite');
      const abort = () => { try { transaction.abort(); } catch {} };
      signal?.addEventListener('abort', abort, {once:true});
      const cleanup = () => signal?.removeEventListener('abort', abort);
      const store = transaction.objectStore('state'), request = store.get('selection');
      let result, conflict = false;
      request.onsuccess = () => {
        try {
          const current = request.result ? validateState(request.result) : empty();
          if (current.generation !== expectedGeneration) { conflict = true; transaction.abort(); return; }
          result = {generation: current.generation + 1, current: candidate, previous: current.current};
          store.put(result, 'selection');
        } catch (error) { reject(error); transaction.abort(); }
      };
      transaction.oncomplete = () => { cleanup(); resolve(structuredClone(result)); };
      transaction.onerror = () => { cleanup(); reject(transaction.error); };
      transaction.onabort = () => { cleanup(); reject(conflict ? new Error('Otra pestana cambio la seleccion sin conexion.') : transaction.error ?? new Error('Offline commit aborted')); };
    });
  }
  return Object.freeze({read, commit});
}
export function createMemoryOfflineStore(initial) {
  let value = initial ? validateState(initial) : empty();
  return Object.freeze({
    read: async () => structuredClone(value),
    async commit(selection, expectedGeneration, {signal} = {}) {
      if (signal?.aborted) throw new Error('Preparacion cancelada.');
      const candidate = validateSelection(selection);
      if (value.generation !== expectedGeneration) throw new Error('Otra pestana cambio la seleccion sin conexion.');
      value = {generation: value.generation + 1, current: candidate, previous: value.current};
      return structuredClone(value);
    }
  });
}
