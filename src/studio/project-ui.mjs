import {projectContentHash, deriveContinuity} from '../project-continuity.mjs';
import {createProject, parseProject, serializeProject, projectLimits, projectBlocklyWorkspace} from '../project-format.mjs';
import {createProjectArchive, parseProjectArchive} from '../project-archive.mjs';
import {createAutosaveStore} from '../autosave-store.mjs';
import {promoteLegacyResources,promoteResources2} from '../contracts/resources.mjs';
import {resolveResourcePolicy} from '../contracts/packs.mjs';
import {createCapabilities, validateCapabilities, newProjectCapabilities} from '../contracts/packs.mjs';
import {createProjectAuthoring} from '../project-authoring.mjs';
import {createResourceValidationQueue} from './resource-validation.mjs';

export function createProjectUI({editor, source, stop, textDocuments, authoring: injectedAuthoring, prepareResources = async () => {}, onDiagnostic = () => {}, onApplied = () => {}}) {
  const authoring = injectedAuthoring ?? createProjectAuthoring({editor,source,textDocuments});
  const validateResources = createResourceValidationQueue(prepareResources);
  const name = document.querySelector('#project-name');
  const status = document.querySelector('#project-status');
  const errorOutput = document.querySelector('#project-error');
  const recovery = document.querySelector('#recovery-notice');
  const download = document.querySelector('#save-project');
  const fileInput = document.querySelector('#open-project');
  const newCopy = document.querySelector('#save-new-copy');
  let catalog;
  let metadata = {id: crypto.randomUUID(), name: name.value, revision: 0, createdAt: new Date().toISOString()};
  let changes = 0;
  let savedChanges = -1;
  let timer;
  let suppress = false;
  let booted = false;
  let recoveryBlocked = false;
  let lastSaved = null;
  let recoveryStatus = 'pending';
  let localPhase = 'recovering';
  let contentHash = null, copyRecord = null, copyPersisted = true, copyWarning = '';
  let projectEpoch = 0, copyGeneration = 0, beforeUnloadInstalled = false, reminderDismissed = false;
  const sessionCopies = new Map();
  const memoryCopyWarning = 'No se pudo guardar el registro de la copia. Solo se recuerda en esta sesión.';
  const copyStatus = document.querySelector('#project-copy-status');
  const copyWarningOutput = document.querySelector('#project-copy-warning');
  const retryCopy = document.querySelector('#retry-copy-record');
  const retrySave = document.querySelector('#retry-project-save');
  const reminder = document.querySelector('#continuity-reminder');
  const continuity = () => deriveContinuity({local: localPhase, projectId: metadata.id, contentHash, record: copyRecord, persisted: copyPersisted});
  const beforeUnload = event => { event.preventDefault(); event.returnValue = ''; };
  function renderContinuity() {
    const value = continuity();
    const text = (element, message) => { if (element && element.textContent !== message) element.textContent = message; };
    text(status, value.localMessage);
    text(copyStatus, value.portableSummary);
    text(copyWarningOutput, copyWarning);
    if (copyStatus) copyStatus.dataset.state = value.portable;
    if (retryCopy) retryCopy.hidden = copyPersisted || !copyRecord;
    if (retrySave) retrySave.hidden = !booted || recoveryBlocked || localPhase !== 'failed';
    if (reminder) reminder.hidden = !value.reminder || reminderDismissed;
    const pending = booted && changes > 0 && savedChanges !== changes;
    if (pending !== beforeUnloadInstalled) {
      window[pending ? 'addEventListener' : 'removeEventListener']('beforeunload', beforeUnload);
      beforeUnloadInstalled = pending;
    }
  }
  async function refreshContent() {
    const epoch = projectEpoch, generation = changes;
    try {
      const model = await capture();
      const hash = await projectContentHash(model);
      if (epoch !== projectEpoch || generation !== changes) return;
      contentHash = hash;
      notify();
    } catch {
      // An incomplete draft has no current content identity. It stays editable;
      // ordinary save/export validation owns actionable diagnostics.
    }
  }
  async function loadPortableRecord() {
    const epoch = projectEpoch, generation = ++copyGeneration, id = metadata.id;
    const result = await store.loadCopyRecord(id);
    if (epoch !== projectEpoch || generation !== copyGeneration) return;
    const remembered = sessionCopies.get(id);
    const memoryIsNewer = remembered && !remembered.persisted &&
      (!result.record || remembered.record.requestedAt >= result.record.requestedAt);
    let selected;
    if (remembered && result.status !== 'invalid' && (result.status === 'unavailable' || memoryIsNewer))
      selected = {...remembered, persisted: false, warning: memoryCopyWarning};
    else selected = {record: result.record, persisted: true,
      warning: result.status === 'invalid' ? 'El registro de copia no es válido. Puedes solicitar otra copia.' : ''};
    copyRecord = selected.record; copyPersisted = selected.persisted; copyWarning = selected.warning;
    if (copyRecord) sessionCopies.set(id, selected); else sessionCopies.delete(id);
    notify();
  }
  async function persistPortableRecord(record, epoch, generation) {
    const item = {record, persisted: false, warning: ''};
    sessionCopies.set(record.projectId, item);
    try { await store.saveCopyRecord(record); item.persisted = true; }
    catch { item.warning = memoryCopyWarning; }
    // A late result remains useful on returning to A, even with no IndexedDB.
    // It cannot publish into B or supersede a newer request from A.
    if (sessionCopies.get(record.projectId) !== item || epoch !== projectEpoch || generation !== copyGeneration) return;
    copyRecord = item.record; copyPersisted = item.persisted; copyWarning = item.warning;
    notify();
  }
  const listeners = new Set();
  const state = () => ({ready: booted, name: name.value, id: metadata.id, revision: metadata.revision,
    dirty: savedChanges !== changes, savedAt: lastSaved, recoveryBlocked, recoveryStatus, available: Boolean(catalog),
    continuity: continuity(), contentHash, beforeUnloadPending: beforeUnloadInstalled});
  const notify = () => { renderContinuity(); for (const listener of listeners) listener(state()); };
  let actions = Promise.resolve();
  let saveQueue = Promise.resolve();
  const exclusive = action => { const result = actions.then(action); actions = result.catch(() => {}); return result; };
  function report(error) {
    errorOutput.textContent = error.message;
    onDiagnostic({level: 'error', code: 'PROJECT_ERROR', origin: 'shell', message: error.message});
  }
  async function validate(serialized) {
    const model = await parseProject(serialized, {catalog});
    await validateResources(model.resources);
    authoring.prepare(model,{allowRemoval:true});
    return model;
  }
  const store = createAutosaveStore({validate});
  function changed() {
    if (suppress) return;
    changes++;
    contentHash = null;
    if (!booted) return;
    queueMicrotask(() => { if (booted) void refreshContent(); });
    // Corrupt snapshots block autosave, not continuity of the editable draft.
    // Its portable identity and complementary exit warning still invalidate.
    if (!recoveryBlocked) {
      localPhase = 'pending';
      status.textContent = 'Cambios pendientes de guardar';
      clearTimeout(timer);
      timer = setTimeout(() => flush().catch(report), 400);
    }
    notify();
  }
  authoring.subscribe(changed);
  name.addEventListener('input', changed);

  async function capture() {
    return createProject({
      ...authoring.capture(), name:name.value.trim(), catalog,
      id:metadata.id,revision:metadata.revision+1,createdAt:metadata.createdAt
    });
  }
  async function flush() {
    // Do not enqueue a promise waiting for boot: recovery may await saveQueue.
    await ready;
    clearTimeout(timer);
    const operation = async () => {
      if (recoveryBlocked) throw new Error('Las copias locales están dañadas. Abre un archivo o guarda este proyecto como copia nueva.');
      if (savedChanges === changes) return lastSaved;
      const capturedChanges = changes;
      localPhase = 'saving';
      status.textContent = 'Guardando…';
      notify();
      try {
        const model = await capture();
        authoring.prepare(model,{allowRemoval:true});
        const serialized = serializeProject(model);
        const committed = await store.save(serialized);
        metadata = {...model.project};
        lastSaved = committed.savedAt;
        if (capturedChanges === changes) {
          savedChanges = capturedChanges;
          localPhase = 'saved';
          status.textContent = 'Guardado en este navegador';
        } else { localPhase = 'pending'; status.textContent = 'Cambios pendientes de guardar'; }
        errorOutput.textContent = '';
        notify();
        return committed;
      } catch (error) {
        localPhase = 'failed';
        status.textContent = 'Sin guardar en este navegador';
        report(error);
        notify();
        throw error;
      }
    };
    const result = saveQueue.then(operation);
    saveQueue = result.catch(() => {});
    return result;
  }
  async function apply(model, {recovered = false, startup = false, notice = null, beforeCommit = () => {}, resetHistory = true} = {}) {
    // All fallible import validation is finished before authoring or runtime change.
    await validateResources(model.resources);
    const candidate = authoring.prepare(model,{allowRemoval:true,resetHistory});
    clearTimeout(timer);
    await saveQueue;
    beforeCommit();
    const previous = {
      checkpoint:authoring.checkpoint(), source:source.value, name:name.value,
      metadata: {...metadata}, changes, savedChanges
    };
    suppress = true;
    try {
      authoring.commit(candidate);
      name.value = model.project.name;
      metadata = {...model.project};
      changes++;
      savedChanges = startup ? changes : -1;
      recoveryBlocked = false;
      newCopy.hidden = true;
      errorOutput.textContent = '';
      document.querySelector('#editor-error').textContent = '';
      document.querySelector('#editor-status').textContent = 'Proyecto abierto · sin ejecutar';
      document.querySelector('#position').textContent = 'x = 0';
    } catch (error) {
      // Commits are synchronous: restore all authoring before reporting a failure.
      const failures = [];
      try { authoring.restoreDraft(previous.checkpoint,{silent:true}); } catch (failure) { failures.push(failure); }
      source.value = previous.source; name.value = previous.name;
      metadata = previous.metadata; changes = previous.changes; savedChanges = previous.savedChanges;
      if (failures.length) throw new AggregateError([error, ...failures], 'Falló la aplicación del proyecto. Revisa los diagnósticos de restauración antes de continuar.');
      throw error;
    } finally { suppress = false; }
    projectEpoch++; copyGeneration++;
    contentHash = null; copyRecord = null; copyPersisted = true; copyWarning = ''; reminderDismissed = false;
    localPhase = startup ? 'saved' : 'pending';
    try { await stop(); }
    catch (error) {
      // A second Stop can supersede this bootstrap. Authoring is already valid;
      // keep its import/save while the coordinator prepares the latest runner.
      if (error.message !== 'Session stopped') throw error;
    }
    onApplied(model);
    recovery.textContent = notice ?? (recovered ? 'Se recuperó la revisión anterior: la copia más reciente estaba dañada.' : startup ? 'Proyecto recuperado del guardado local. Elige el contexto y pulsa su botón Ejecutar para continuar.' : 'Proyecto abierto. Elige el contexto y pulsa su botón Ejecutar para continuar.');
    status.textContent = startup ? 'Proyecto recuperado de este navegador' : 'Proyecto abierto';
    recoveryStatus = startup ? (recovered ? 'restored' : 'recovered') : 'opened';
    notify();
    void refreshContent();
    await loadPortableRecord();
  }
  async function openDocument(serialized) {
    await ready;
    try {
      return await exclusive(async () => {
        const model = await validate(serialized);
        await apply(model);
        await flush().catch(report);
        return model;
      });
    } catch (error) { report(error); throw error; }
  }
  async function openArchive(bytes) {
    await ready;
    try {
      return await exclusive(async () => {
        const model = await parseProjectArchive(bytes, {catalog});
        authoring.prepare(model,{allowRemoval:true});
        await apply(model);
        await flush().catch(report);
        return model;
      });
    } catch (error) { report(error); throw error; }
  }
  async function replacePrepared(makeModel, isCurrent = () => true, notice = null) {
    await ready;
    return exclusive(async () => {
      const expectedChanges = changes;
      const model = await makeModel();
      authoring.prepare(model,{allowRemoval:true});
      await flush();
      await apply(model, {resetHistory:false,notice: typeof notice === 'function' ? notice(model) : notice, beforeCommit: () => {
        if (changes !== expectedChanges || !isCurrent()) throw new Error('El proyecto cambió durante la preparación. No se reemplazó tu trabajo.');
      }});
      await flush().catch(report);
      return model;
    });
  }
  function loadStarter(starter, {isCurrent = () => true} = {}) {
    return replacePrepared(async () => {
      if (!starter || typeof starter.name !== 'string' || !Array.isArray(starter.packIds)) throw new Error('Actividad no disponible en el catálogo local.');
      return createProject({name: starter.name, blockly: starter.blockly, deviceSource: 'basic.showIcon(IconNames.Heart)',
        textDocuments: [], selectedTextDocumentId: null, catalog, capabilities: createCapabilities(starter.packIds)});
    }, isCurrent).catch(error => { report(error); throw error; });
  }
  function useCapabilities(capabilities) {
    return replacePrepared(async () => {
      const captured = await capture();
      let resources=captured.resources;
      if(resolveResourcePolicy(capabilities)==='gg-resources-v2'&&resources.version!==2)resources=await promoteResources2(resources.version===1?resources:await promoteLegacyResources(catalog));
      return createProject({...captured.project, name: captured.project.name, blockly: projectBlocklyWorkspace(captured),
        ...(captured.authoring.scene2d ? {scene2d: captured.authoring.scene2d} : {}), deviceSource: captured.authoring.deviceSource, ...(captured.version >= 2 ? {textDocuments: captured.authoring.textDocuments, selectedTextDocumentId: captured.authoring.selectedTextDocumentId} : {}),
        ...(captured.authoring.codeViews?{codeViews:captured.authoring.codeViews}:{}),
        resources, catalog, capabilities: authoring.prepareCapabilities(validateCapabilities(capabilities))});
    }, undefined, 'Capacidades del proyecto actualizadas. No se ejecutó nada: pulsa Ejecutar cuando quieras ver el resultado.').catch(error => { report(error); throw error; });
  }
  // R1 (29/10/2026): with nothing saved to recover, the draft on screen is a
  // new project. It takes explicit capabilities at the latest catalog version
  // (same blocks, IDs and positions) before the editor is enabled. It is not
  // an edit (no autosave until the learner edits) and nothing is stopped or
  // run. Saved v1/v2 files never pass here: they keep their legacy profile.
  // Its inputs are the built-in example and controls that stay disabled until
  // start, so a failure means an inconsistent build: the draft is kept as it
  // was (compatible 2D profile), nothing runs and the message says so.
  async function startNewProject() {
    let model;
    try {
      model = await createProject({...authoring.capture(), name: name.value.trim(), catalog, capabilities: newProjectCapabilities(),
        id: metadata.id, revision: metadata.revision, createdAt: metadata.createdAt, updatedAt: metadata.createdAt});
      const candidate = authoring.prepare(model, {allowRemoval: true});
      suppress = true;
      try { authoring.commit(candidate); } finally { suppress = false; }
    } catch (error) {
      // Preparation changes nothing and a failed commit restores the draft.
      report(new Error(`No se pudo preparar el proyecto nuevo con los bloques más recientes. Puedes seguir editando con los bloques de siempre; no se ejecutó nada. (${error.message})`));
      return;
    }
    onApplied(model);
  }
  const ready = (async () => {
    download.disabled = fileInput.disabled = name.disabled = true;
    for (const area of document.querySelectorAll('.authoring, .scene-inspector, .code-console')) area.inert = true;
    source.disabled = true;
    try {
      const response = await fetch('/project-catalog.json');
      if (!response.ok) throw new Error('No se pudo cargar el catálogo del proyecto. Recarga para reintentar.');
      catalog = await response.json();
      const saved = await store.load();
      if (!saved.serialized) await startNewProject();
      if (saved.serialized) {
        const model = await validate(saved.serialized);
        await apply(model, {startup: true, recovered: saved.status === 'recovered'});
        lastSaved = saved.savedAt;
      } else if (saved.status === 'corrupt') {
        recoveryStatus = 'corrupt';
        localPhase = 'blocked';
        recoveryBlocked = true;
        newCopy.hidden = false;
        recovery.textContent = saved.warning;
        errorOutput.textContent = saved.warning;
        status.textContent = 'No se pudo recuperar el guardado local';
      } else if (saved.status === 'unavailable') {
        recoveryStatus = 'unavailable';
        localPhase = 'failed';
        status.textContent = 'Guardado local no disponible';
        errorOutput.textContent = saved.warning;
      } else { localPhase = 'new'; recoveryStatus = 'new'; status.textContent = 'Proyecto nuevo · guardado automático al editar'; }
    } catch (error) { localPhase = 'failed'; recoveryStatus = 'error'; report(error); status.textContent = 'No se pudo preparar la recuperación'; }
    finally {
      booted = true;
      download.disabled = fileInput.disabled = name.disabled = !catalog;
      for (const area of document.querySelectorAll('.authoring, .scene-inspector, .code-console')) area.inert = false;
      source.disabled = false;
      notify();
      if (catalog) void refreshContent();
    }
  })();

  async function requestPortableCopy() {
    await ready;
    const epoch = projectEpoch;
    const model = await capture();
    authoring.prepare(model,{allowRemoval:true});
    // Exactly one detached capture feeds all three outputs. Later authoring is
    // neither recaptured nor replaced, even when preparation finishes in B.
    const [archive, hash] = await Promise.all([createProjectArchive(model, {catalog}), projectContentHash(model)]);
    const url = URL.createObjectURL(new Blob([archive], {type: 'application/zip'}));
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = `${model.project.name.replace(/[\\/:*?"<>|]/g, '-').slice(0, 80)}.ggproj`;
      link.click();
    } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
    const record = {version: 1, projectId: model.project.id, contentHash: hash, requestedAt: new Date().toISOString()};
    // Persist A's record for a later return, without publishing it into B.
    const generation = epoch === projectEpoch && record.projectId === metadata.id ? ++copyGeneration : -1;
    if (generation !== -1) {
      copyRecord = record; copyPersisted = false; copyWarning = '';
      notify();
    }
    await persistPortableRecord(record, epoch, generation);
    return record;
  }
  download.addEventListener('click', () => { requestPortableCopy().catch(report); });
  retryCopy?.addEventListener('click', () => {
    if (copyRecord) void persistPortableRecord(copyRecord, projectEpoch, ++copyGeneration);
  });
  retrySave?.addEventListener('click', () => { flush().catch(report); });
  document.querySelector('#continuity-continue')?.addEventListener('click', () => {
    reminderDismissed = true; renderContinuity();
    const menu = document.querySelector('#project-menu');
    if (menu) menu.open = false;
    document.querySelector('#authoring-context')?.focus({preventScroll: true});
  });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      if (file.size > projectLimits.bytes) throw new Error('El archivo GGPROJ excede el límite de 2 MiB.');
      await openArchive(new Uint8Array(await file.arrayBuffer()));
    } catch (error) { report(error); }
    finally { fileInput.value = ''; }
  });
  newCopy.addEventListener('click', () => {
    recoveryBlocked = false;
    recoveryStatus = 'new';
    newCopy.hidden = true;
    changed();
    flush().catch(report);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && booted && savedChanges !== changes && !recoveryBlocked) flush().catch(report);
  });
  window.addEventListener('pagehide', () => {
    if (booted && savedChanges !== changes && !recoveryBlocked) flush().catch(() => {});
  });
  return Object.freeze({
    ready: () => ready,
    export: async () => { await ready; const model = await capture(); authoring.prepare(model,{allowRemoval:true}); return serializeProject(model); },
    exportArchive: async () => { await ready; return createProjectArchive(await capture(), {catalog}); },
    open: openDocument, openArchive, flush, loadStarter, useCapabilities,
    replaceAuthoring:(makeModel,{isCurrent=()=>true,notice=null}={})=>replacePrepared(async()=>parseProject(serializeProject(await makeModel()),{catalog}),isCurrent,notice),
    capture, catalog:()=>structuredClone(catalog),
    capabilities: () => authoring.captureCapabilities(),
    state,
    subscribe(listener) { listeners.add(listener); listener(state()); return () => listeners.delete(listener); }
  });
}
