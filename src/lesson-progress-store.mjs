import {getLesson} from './lessons.mjs';

export const lessonProgressDatabaseName = 'gg-studio-lesson-progress';
const storeName = 'completed-steps';
function projectId(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 128 || /[\u0000-\u001f\u007f]/.test(value)) throw new Error('ID de proyecto inválido para el progreso.');
  return value;
}
export function validateLessonProgress(record) {
  const fields = ['version', 'projectId', 'lessonId', 'lessonRevision', 'completedStepIds'];
  if (!record || typeof record !== 'object' || Array.isArray(record) || ![Object.prototype, null].includes(Object.getPrototypeOf(record)) ||
      Object.keys(record).length !== fields.length || fields.some(field => !Object.hasOwn(record, field)) || record.version !== 1) throw new Error('Progreso de actividad inválido.');
  projectId(record.projectId);
  if (typeof record.lessonId !== 'string' || record.lessonId.includes('@') || !Number.isSafeInteger(record.lessonRevision)) throw new Error('Progreso de actividad inválido.');
  const lesson = getLesson(record.lessonId + '@' + record.lessonRevision);
  const steps = [...lesson.steps, ...(lesson.learning ? [lesson.learning.variant] : [])];
  if (record.lessonRevision !== lesson.revision || !Array.isArray(record.completedStepIds) ||
      Object.keys(record.completedStepIds).length !== record.completedStepIds.length ||
      record.completedStepIds.length > steps.length || new Set(record.completedStepIds).size !== record.completedStepIds.length ||
      record.completedStepIds.some(id => !steps.some(step => step.id === id))) throw new Error('Pasos o revisión de progreso inválidos.');
  return {version: 1, projectId: record.projectId, lessonId: lesson.id, lessonRevision: lesson.revision,
    completedStepIds: steps.filter(step => record.completedStepIds.includes(step.id)).map(step => step.id)};
}
export function createLessonProgressStore({indexedDB = globalThis.indexedDB, dbName = lessonProgressDatabaseName} = {}) {
  let connection = null; let opening = null; let closed = false; let queue = Promise.resolve();
  const unavailable = () => new Error('El progreso local no está disponible. Puedes continuar con la actividad.');
  async function database() {
    if (closed || !indexedDB?.open) throw unavailable();
    if (connection) return connection;
    if (opening) return opening;
    opening = new Promise((resolve, reject) => {
      let request; let settled = false;
      const timer = setTimeout(() => fail(unavailable()), 2000);
      function fail(error) { if (settled) return; settled = true; clearTimeout(timer); reject(error); }
      try { request = indexedDB.open(dbName, 1); } catch { fail(unavailable()); return; }
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName); };
      request.onerror = () => fail(unavailable());
      request.onblocked = () => fail(unavailable());
      request.onsuccess = () => {
        if (closed || settled) { request.result.close(); fail(unavailable()); return; }
        settled = true; clearTimeout(timer); connection = request.result;
        connection.onversionchange = () => { connection?.close(); connection = null; };
        resolve(connection);
      };
    });
    try { return await opening; } finally { opening = null; }
  }
  async function transaction(mode, key, value, {isCurrent = () => true, signal} = {}) {
    const db = await database();
    const valid = () => !signal?.aborted && isCurrent();
    if (!valid()) throw new Error('La comprobación cambió antes de guardar su progreso.');
    return new Promise((resolve, reject) => {
      let tx; let request; let settled = false;
      const timer = setTimeout(() => { try { tx?.abort(); } catch {} finish(unavailable()); }, 2000);
      function finish(error, result) {
        if (settled) return; settled = true; clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        if (error) reject(error); else resolve(result);
      }
      function abort() { try { tx?.abort(); } catch {} finish(new Error('La comprobación cambió antes de guardar su progreso.')); }
      try {
        if (!valid()) { abort(); return; }
        tx = db.transaction(storeName, mode);
        signal?.addEventListener('abort', abort, {once: true});
        if (!valid()) { abort(); return; }
        request = mode === 'readonly' ? tx.objectStore(storeName).get(key) : tx.objectStore(storeName).put(value, key);
        tx.oncomplete = () => finish(null, mode === 'readonly' ? request.result : structuredClone(value));
        tx.onabort = () => finish(unavailable()); tx.onerror = () => {};
      } catch { finish(unavailable()); }
    });
  }
  function keyFor(id, lesson) { return JSON.stringify([projectId(id), lesson.id, lesson.revision]); }
  return Object.freeze({
    async load(id, key) {
      const lesson = getLesson(key);
      const record = await transaction('readonly', keyFor(id, lesson));
      if (record === undefined) return null;
      const validated = validateLessonProgress(record);
      if (validated.projectId !== id || validated.lessonId !== lesson.id || validated.lessonRevision !== lesson.revision) throw new Error('El progreso no corresponde a este proyecto.');
      return validated;
    },
    save(record, options = {}) {
      let validated;
      try { validated = validateLessonProgress(record); } catch (error) { return Promise.reject(error); }
      const operation = () => transaction('readwrite', keyFor(validated.projectId, getLesson(validated.lessonId + '@' + validated.lessonRevision)), validated, options);
      const result = queue.then(operation); queue = result.catch(() => {}); return result;
    },
    close() { closed = true; connection?.close(); connection = null; }
  });
}
