import {validateCopyRecord} from './project-continuity.mjs';
// Studio-owned persistence boundary. IndexedDB transactions commit whole snapshots;
// validation is deliberately completed before a read/write transaction is opened.
export const autosaveDatabaseName = 'gg-studio-projects';
export const autosaveByteLimit = 2 * 1024 * 1024;
const storeName = 'snapshots';

export class AutosaveError extends Error {
  constructor(message, code, cause) {
    super(message, cause ? {cause} : undefined);
    this.name = 'AutosaveError';
    this.code = code;
  }
}

const unavailable = cause => new AutosaveError('No se pudo acceder al guardado local. Puedes seguir editando y exportar GGPROJ.', 'unavailable', cause);
function assertSerialized(serialized) {
  if (typeof serialized !== 'string' || !serialized || new TextEncoder().encode(serialized).length > autosaveByteLimit) {
    throw new AutosaveError('La copia de recuperación está vacía o excede el límite de 2 MiB.', 'invalid');
  }
}
const sameRecord = (left, right) => left === right || (
  left && right && typeof left === 'object' && typeof right === 'object' &&
  left.serialized === right.serialized && left.savedAt === right.savedAt
);

export function createAutosaveStore({indexedDB = globalThis.indexedDB, dbName = autosaveDatabaseName, validate} = {}) {
  if (typeof validate !== 'function') throw new TypeError('Autosave requires an asynchronous project validator');
  let connection = null;
  let opening = null;
  let disposed = false;
  let queue = Promise.resolve();

  function enqueue(operation) {
    const result = queue.then(operation);
    // One rejected write must not prevent a later retry or read.
    queue = result.catch(() => {});
    return result;
  }

  async function database() {
    if (disposed || !indexedDB?.open) throw unavailable();
    if (connection) return connection;
    if (opening) return opening;
    opening = new Promise((resolve, reject) => {
      let request;
      let settled = false;
      let timer;
      const fail = error => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      };
      try { request = indexedDB.open(dbName, 1); }
      catch (error) { fail(unavailable(error)); return; }
      timer = setTimeout(() => fail(new AutosaveError('El guardado local no respondió. Cierra otras pestañas del proyecto y vuelve a intentarlo.', 'timeout')), 3000);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName);
      };
      request.onerror = () => fail(unavailable(request.error));
      request.onblocked = () => fail(new AutosaveError('Otra pestaña bloquea el guardado local. Ciérrala y vuelve a intentarlo.', 'blocked'));
      request.onsuccess = () => {
        const db = request.result;
        if (settled || disposed) { db.close(); fail(unavailable()); return; }
        settled = true;
        clearTimeout(timer);
        connection = db;
        db.onversionchange = () => { db.close(); if (connection === db) connection = null; };
        resolve(db);
      };
    });
    try { return await opening; }
    finally { opening = null; }
  }

  function transactionError(transaction, fallback) {
    const cause = fallback ?? transaction.error;
    const quota = cause?.name === 'QuotaExceededError';
    return new AutosaveError(quota ? 'No hay espacio para guardar. La última copia confirmada se conserva; exporta GGPROJ.' : 'El guardado local no se confirmó. La última copia confirmada se conserva.', quota ? 'quota' : 'transaction', cause);
  }

  async function readRecords() {
    const db = await database();
    return new Promise((resolve, reject) => {
      let transaction;
      try {
        transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const current = store.get('current');
        const previous = store.get('previous');
        transaction.oncomplete = () => resolve({current: current.result, previous: previous.result});
        transaction.onabort = () => reject(transactionError(transaction, current.error ?? previous.error));
        transaction.onerror = () => {}; // Default IndexedDB behavior aborts the transaction.
      } catch (error) { reject(unavailable(error)); }
    });
  }

  async function isValid(record) {
    try {
      if (!record || typeof record !== 'object' || typeof record.savedAt !== 'string') return false;
      assertSerialized(record.serialized);
      await validate(record.serialized);
      return true;
    } catch { return false; }
  }

  async function load() {
    try {
      const {current, previous} = await readRecords();
      if (current === undefined && previous === undefined) return {status: 'empty'};
      if (await isValid(current)) return {status: 'available', serialized: current.serialized, savedAt: current.savedAt};
      if (await isValid(previous)) return {status: 'recovered', serialized: previous.serialized, savedAt: previous.savedAt, warning: 'La copia más reciente estaba dañada. Se recuperó la revisión anterior.'};
      return {status: 'corrupt', warning: 'No se pudo recuperar una copia válida. Las copias locales se conservaron; puedes abrir un archivo GGPROJ.'};
    } catch (error) {
      return {status: 'unavailable', warning: error.message};
    }
  }

  async function save(serialized) {
    assertSerialized(serialized);
    await validate(serialized);
    for (let attempt = 0; attempt < 3; attempt++) {
      const records = await readRecords();
      const currentIsValid = await isValid(records.current);
      const db = await database();
      const result = await new Promise((resolve, reject) => {
        let transaction;
        let conflict = false;
        let failure;
        const savedAt = new Date().toISOString();
        let outcome = {status: 'saved', savedAt};
        try {
          transaction = db.transaction(storeName, 'readwrite');
          const store = transaction.objectStore(storeName);
          const current = store.get('current');
          current.onsuccess = () => {
            try {
              // Validation above can yield. Do not rotate a different revision if
              // another connection committed while validation was in flight.
              if (!sameRecord(current.result, records.current)) { conflict = true; transaction.abort(); return; }
              if (currentIsValid && records.current.serialized === serialized) {
                outcome = {status: 'unchanged', savedAt: records.current.savedAt};
                return;
              }
              if (currentIsValid) store.put(records.current, 'previous');
              // If current was corrupt, leave previous untouched until this whole
              // transaction commits. A failed recovery save cannot destroy it.
              store.put({serialized, savedAt}, 'current');
            } catch (error) {
              failure = error;
              transaction.abort();
            }
          };
          transaction.oncomplete = () => resolve(outcome);
          transaction.onerror = event => { failure = event.target?.error; };
          transaction.onabort = () => conflict ? resolve({status: 'conflict'}) : reject(transactionError(transaction, failure));
        } catch (error) { try { transaction?.abort(); } catch {} reject(unavailable(error)); }
      });
      if (result.status !== 'conflict') return result;
    }
    throw new AutosaveError('Otra pestaña sigue cambiando el proyecto. No se confirmó el guardado; exporta GGPROJ o cierra esa pestaña.', 'conflict');
  }

  // Optional metadata shares the transaction queue, never snapshot rotation.
  async function loadCopyRecord(projectId) {
    try {
      const db = await database();
      const value = await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const request = tx.objectStore(storeName).get('continuity:' + projectId);
        tx.oncomplete = () => resolve(request.result);
        tx.onabort = () => reject(transactionError(tx));
        tx.onerror = () => {};
      });
      const record = validateCopyRecord(value, projectId);
      return {status: record ? 'available' : value === undefined ? 'missing' : 'invalid', record};
    } catch (error) { return {status: 'unavailable', record: null, warning: error.message}; }
  }
  async function saveCopyRecord(value) {
    const record = validateCopyRecord(value);
    if (!record) throw new AutosaveError('El registro de la copia no es válido.', 'invalid-copy-record');
    const db = await database();
    return new Promise((resolve, reject) => {
      let tx;
      try {
        tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(record, 'continuity:' + record.projectId);
        tx.oncomplete = () => resolve({status: 'saved', record});
        tx.onabort = () => reject(transactionError(tx));
        tx.onerror = () => {};
      } catch (error) { try { tx?.abort(); } catch {} reject(unavailable(error)); }
    });
  }

  async function clear() {
    const db = await database();
    return new Promise((resolve, reject) => {
      let transaction;
      try {
        transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        store.delete('current');
        store.delete('previous');
        const cursor = store.openCursor();
        cursor.onsuccess = () => {
          const entry = cursor.result;
          if (!entry) return;
          if (typeof entry.key === 'string' && entry.key.startsWith('continuity:')) entry.delete();
          entry.continue();
        };
        transaction.oncomplete = () => resolve({status: 'cleared'});
        transaction.onerror = () => {};
        transaction.onabort = () => reject(transactionError(transaction));
      } catch (error) { try { transaction?.abort(); } catch {} reject(unavailable(error)); }
    });
  }

  return Object.freeze({
    save: serialized => enqueue(() => save(serialized)),
    load: () => enqueue(load),
    clear: () => enqueue(clear),
    loadCopyRecord: projectId => enqueue(() => loadCopyRecord(projectId)),
    saveCopyRecord: record => enqueue(() => saveCopyRecord(record)),
    close: () => { disposed = true; connection?.close(); connection = null; }
  });
}
