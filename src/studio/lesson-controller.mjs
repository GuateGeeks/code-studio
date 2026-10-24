import {getLesson, getLessonStarter, lessonCatalog, lessonSteps} from '../lessons.mjs';
import {evaluateLesson, validateLessonVariable} from '../lesson-evaluation.mjs';
import {createLessonProgressStore} from '../lesson-progress-store.mjs';

const stale = () => Object.assign(new Error('La ejecución o la autoría cambió. Vuelve a comprobar tus cambios.'), {code: 'LESSON_STALE'});
function identityOf(getIdentity) {
  const value = getIdentity() ?? {};
  return {projectId: value.projectId ?? null, authoringKey: value.authoringKey ?? null,
    executedAuthoringKey: value.executedAuthoringKey ?? null, sessionId: value.sessionId ?? null,
    revision: value.revision ?? null, backend: value.backend ?? null, documentId: value.documentId ?? null};
}
export function createLessonController({loadStarter, readScene, readVariable, getIdentity, getAuthoring, getCopyFacts = () => [],
  progressStore = createLessonProgressStore(), onChange = () => {}, onError = () => {},
  maxReads = 8, intervalMs = 120, timeoutMs = 2500} = {}) {
  for (const callback of [loadStarter, readScene, getIdentity, getAuthoring]) if (typeof callback !== 'function') throw new TypeError('La actividad necesita sus conexiones de proyecto y lectura.');
  if (!Number.isInteger(maxReads) || maxReads < 1 || maxReads > 10 || !Number.isFinite(intervalMs) || intervalMs < 0 || intervalMs > 500 ||
      !Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 5000) throw new Error('Límites de comprobación inválidos.');
  let value = {selectedLessonId: lessonCatalog[0].id, mode: 'main', phase: 'idle', message: 'Selecciona una actividad. Sus instrucciones no cambian tu proyecto.',
    results: [], historicalStepIds: [], progressWarning: ''};
  let attempt = null; let pendingCheck = null; let loading = false; let closed = false; let generation = 0; let historyKey = null; let historyGeneration = 0;
  const state = () => structuredClone(value);
  const notify = () => { if (!closed) onChange(state()); return state(); };
  function report(error) { onError({level: 'error', code: 'LESSON_ERROR', origin: 'shell', message: String(error?.message ?? error).slice(0, 1024)}); }
  function cancelCheck() { generation++; if (attempt) { attempt.cancel(stale()); attempt = null; } }
  function stillCurrent(token) {
    return !closed && attempt === token && token.generation === generation && token.lessonId === value.selectedLessonId && token.mode === value.mode &&
      JSON.stringify(identityOf(getIdentity)) === token.identityKey;
  }
  async function bounded(action, token, deadline) {
    if (!stillCurrent(token)) throw stale();
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('La lectura no llegó a tiempo. Puedes volver a comprobar.');
    let timer;
    try {
      return await Promise.race([Promise.resolve().then(action), token.cancelled,
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('La lectura no llegó a tiempo. Puedes volver a comprobar.')), remaining); })]);
    } finally { clearTimeout(timer); }
  }
  async function history() {
    const lesson = getLesson(value.selectedLessonId); const identity = identityOf(getIdentity);
    const key = JSON.stringify([identity.projectId, lesson.id, lesson.revision]);
    if (key === historyKey || !identity.projectId || closed) return;
    const historyToken = ++historyGeneration;
    historyKey = key; value.historicalStepIds = []; value.progressWarning = '';
    try {
      const record = await progressStore.load(identity.projectId, lesson.id);
      if (closed || historyKey !== key || historyToken !== historyGeneration) return;
      value.historicalStepIds = record?.completedStepIds ?? []; notify();
    } catch (error) {
      if (closed || historyKey !== key || historyToken !== historyGeneration) return;
      value.progressWarning = String(error.message); notify();
    }
  }
  function invalidate() {
    cancelCheck(); value.results = [];
    if (!loading) { value.phase = 'idle'; value.message = 'Cambios sin comprobar. Ejecuta tu programa y pulsa Comprobar.'; }
    notify(); void history();
  }
  function select(id) {
    getLesson(id);
    if (closed || loading || id === value.selectedLessonId) return state();
    cancelCheck(); value = {...value, selectedLessonId: id, mode: 'main', phase: 'idle', results: [], historicalStepIds: [], progressWarning: '',
      message: 'Instrucciones seleccionadas. Tu proyecto no cambió.'};
    historyKey = null; notify(); void history(); return state();
  }
  function selectMode(mode) {
    lessonSteps(getLesson(value.selectedLessonId), mode);
    if (closed || loading || mode === value.mode) return state();
    cancelCheck(); value.mode = mode; value.results = []; value.phase = 'idle';
    value.message = 'Recorrido seleccionado. Tu proyecto y su ejecución no cambiaron.';
    return notify();
  }
  async function loadSelected() {
    if (closed || loading) return state();
    cancelCheck(); loading = true; value.mode = 'main'; const lessonId = value.selectedLessonId;
    const loadGeneration = generation;
    const previousIdentity = JSON.stringify(identityOf(getIdentity));
    const isCurrent = () => !closed && loading && generation === loadGeneration && value.selectedLessonId === lessonId && JSON.stringify(identityOf(getIdentity)) === previousIdentity;
    value.phase = 'loading'; value.message = 'Preparando y validando el ejemplo antes de reemplazar el proyecto…'; value.results = []; notify();
    try {
      await loadStarter(getLessonStarter(lessonId), {isCurrent});
      if (!closed) { value.phase = 'ready'; value.message = 'Ejemplo cargado sin ejecutar. Modifica el programa y ejecútalo cuando quieras.'; historyKey = null; }
    } catch (error) {
      if (!closed) { value.phase = 'error'; value.message = `No se cargó el ejemplo: ${error.message}`; report(error); }
    } finally { loading = false; notify(); void history(); }
    return state();
  }
  async function performCheck() {
    const lesson = getLesson(value.selectedLessonId); const mode = value.mode;
    const selectedSteps = lessonSteps(lesson, mode); const captured = identityOf(getIdentity);
    if (!captured.projectId || !captured.sessionId || !Number.isSafeInteger(captured.revision) || captured.revision < 0 ||
        !captured.authoringKey || captured.authoringKey !== captured.executedAuthoringKey) {
      value.phase = 'not-yet'; value.results = []; value.message = 'Ejecuta tus cambios antes de comprobar.'; return notify();
    }
    if (lesson.id === 'text-transition' && !['javascript', 'python'].includes(captured.backend)) {
      value.phase = 'not-yet'; value.results = []; value.message = 'Crea una copia JavaScript o Python y ejecuta el documento seleccionado.'; return notify();
    }
    let cancel;
    const abort = new AbortController();
    const cancelled = new Promise((_, reject) => { cancel = error => { abort.abort(); reject(error); }; }); cancelled.catch(() => {});
    const token = {generation: ++generation, lessonId: lesson.id, mode, identityKey: JSON.stringify(captured), cancelled, cancel, abort};
    attempt = token; value.phase = 'checking'; value.message = 'Comprobando lecturas de esta ejecución…'; value.results = []; notify();
    const deadline = Date.now() + timeoutMs;
    try {
      const authoring = structuredClone(await bounded(getAuthoring, token, deadline));
      const copyFacts = structuredClone(await bounded(getCopyFacts, token, deadline));
      const variableIds = [...new Set(selectedSteps.flatMap(step => step.checks.filter(check => check.kind === 'variable').map(check => check.variableId)))];
      let result;
      for (let read = 0; read < maxReads; read++) {
        const scene = await bounded(() => readScene(structuredClone(captured)), token, deadline);
        const variables = [];
        for (const id of variableIds) {
          if (typeof readVariable !== 'function') throw new Error('La lectura de Puntos no está disponible.');
          variables.push(validateLessonVariable(await bounded(() => readVariable(id, structuredClone(captured)), token, deadline), id));
        }
        if (!stillCurrent(token)) throw stale();
        result = evaluateLesson(lesson, {scene, variables, authoring, identity: captured, copyFacts, mode});
        if (result.passed || read === maxReads - 1) break;
        // Only retry conditions that can change in this execution. Missing
        // authored operations or copy provenance need an explicit user action.
        if (result.steps.some(step => step.checks.some(check => !check.passed && check.basis !== 'execution'))) break;
        await bounded(() => new Promise(resolve => setTimeout(resolve, intervalMs)), token, deadline);
      }
      if (!stillCurrent(token)) throw stale();
      value.results = result.steps; value.phase = result.passed ? 'success' : 'not-yet';
      value.message = result.passed ? 'Comprobación completada. Cada paso indica qué se observó.' : 'Aún faltan metas. Revisa las lecturas indicadas y vuelve a intentarlo.';
      notify();
      const completedStepIds = [...new Set([...value.historicalStepIds, ...result.steps.filter(step => step.passed).map(step => step.id)])];
      if (completedStepIds.length) {
        try {
          // The history view may still be loading. Preserve durable principal
          // IDs before saving a first successful variant (and vice versa).
          const previous = await bounded(() => progressStore.load(captured.projectId, lesson.id), token, deadline);
          const mergedIds = [...new Set([...(previous?.completedStepIds ?? []), ...completedStepIds])];
          await progressStore.save({version: 1, projectId: captured.projectId, lessonId: lesson.id, lessonRevision: lesson.revision, completedStepIds: mergedIds},
            {isCurrent: () => stillCurrent(token), signal: token.abort.signal});
          if (stillCurrent(token)) { historyGeneration++; value.historicalStepIds = mergedIds; value.progressWarning = ''; notify(); }
        } catch (error) { if (stillCurrent(token)) { value.progressWarning = String(error.message); notify(); } }
      }
    } catch (error) {
      if (attempt !== token || closed) return state();
      const obsolete = error.code === 'LESSON_STALE' || !stillCurrent(token);
      value.phase = obsolete ? 'stale' : 'error'; value.results = [];
      value.message = obsolete ? stale().message : String(error.message);
      if (!obsolete) report(error); notify();
    } finally { if (attempt === token) attempt = null; }
    return state();
  }
  function check() {
    if (closed || loading) return Promise.resolve(state());
    if (pendingCheck) return pendingCheck;
    pendingCheck = performCheck().finally(() => { pendingCheck = null; });
    return pendingCheck;
  }
  return Object.freeze({state, select, selectMode, loadSelected, check, invalidate,
    refreshProgress: history,
    dispose() { cancelCheck(); closed = true; progressStore.close?.(); }
  });
}
