import {createCodeViewsState} from '../code-views-state.mjs';
import {createCodeViewsUI} from './code-views-ui.mjs';
import {createContextualWorkspace} from './contextual-workspace.mjs';
import {exportStandaloneContext} from '../export/export-context.mjs';
import {createCapabilityContextsUI} from './capability-contexts-ui.mjs';
import {createCapabilityExecution} from './capability-execution.mjs';
import {createProject} from '../project-format.mjs';
import {validateResources2} from '../contracts/resources-v2.mjs';
import {languageRuntimeLimits} from '../contracts/language-runtime.mjs';
import {createGGClient} from '../contracts/gg-client.mjs';
import {createProjectUI} from './project-ui.mjs';
import {createEntryJourneyUI} from './entry-journey-ui.mjs';
import {getLesson} from '../lessons.mjs';
import {createProjectAuthoring} from '../project-authoring.mjs';
import {createDeviceUI} from './device-ui.mjs';
import {createCodeConsoleUI} from './code-console-ui.mjs';
import {createTextDocumentsUI} from './text-documents-ui.mjs';
import {createLanguageController} from './language-controller.mjs';
import {createSceneInspectorUI} from './scene-inspector-ui.mjs';
import {createObjectsUI} from './objects-ui.mjs';
import {projectInitialScene, scene2DObjectsOf} from '../project-format.mjs';
import {createSceneScope} from './scene-scope.mjs';
import {scene2DTextOwner} from '../contracts/scene2d-identifiers.mjs';
import {generateApi3ProgramSource, generateApi3SceneSource} from '../generated-program-source.mjs';
import {createCapabilities, resolveCapabilities, lockedPackVersions} from '../contracts/packs.mjs';
import {availablePackUpdates, migrateProject, describeMigrationSummary} from '../project-migration.mjs';
import {createLessonsUI} from './lessons-ui.mjs';
import {createOfflineController} from '../offline/controller.mjs';
import {createAuthoringContexts} from './authoring-contexts.mjs';
import {validateDeploymentContexts} from '../contracts/deployment-profile.mjs';
import {createResourcesUI} from './resources-ui.mjs';
import {createResourceStore} from '../resource-store.mjs';
import {createAssetProcessor} from '../import/asset-processor.mjs';
import {explainDiagnostic} from './presentation-text.mjs';
const config = await fetch('/config.json').then(response => response.json());
const offline = createOfflineController({config, onChange: renderOffline});
function renderOffline(state) {
  const preparing = state.status === 'preparing';
  document.querySelector('#prepare-offline').disabled = preparing;
  document.querySelector('#cancel-offline').hidden = !preparing;
  document.querySelector('#rollback-offline').hidden = !state.previous;
  document.querySelector('#rollback-offline').disabled = preparing;
  document.querySelector('#offline-status').textContent = preparing ? 'Preparando recursos…' : state.current ? 'Preparación confirmada en este navegador' : 'Sin preparación confirmada';
  document.querySelector('#offline-detail').textContent = state.progress ? `${state.progress.role}: ${state.progress.completed} de ${state.progress.total} recursos verificados` : state.current ? `${state.current.packs.length} paquetes completos · ${(Object.values(state.current.receipts).reduce((total, receipt) => total + receipt.bytes, 0) / 1048576).toFixed(1)} MiB verificados · versión ${state.current.cohort.slice(0, 12)}. La próxima visita usará esta preparación.` : 'Necesitas conexión para preparar los recursos.';
  document.querySelector('#offline-error').textContent = state.error ?? '';
}
function requirePreparedPack(id) {
  const selection = offline.state().current;
  if (config.cohort && selection?.cohort === config.cohort && !offline.hasPack(id)) throw new Error('Falta el paquete preparado ' + id + '. Conecta este equipo y prepara los recursos antes de ejecutar.');
}
function offlineAction(action) { return action().catch(error => { document.querySelector('#offline-error').textContent = error.message; }); }
document.querySelector('#prepare-offline').addEventListener('click', () => offlineAction(() => offline.prepare()));
document.querySelector('#cancel-offline').addEventListener('click', () => offline.cancel());
document.querySelector('#rollback-offline').addEventListener('click', () => offlineAction(() => offline.rollback()));
void offline.init().catch(error => { document.querySelector('#offline-status').textContent = 'Preparación no disponible'; document.querySelector('#offline-error').textContent = error.message; });
const editor = GGEditor.createEditor(document.querySelector('#blockly-editor'), await fetch('/editable.blocks.json').then(response => response.json()));
const copyFacts = new Map();
let lessons = null;
let workspace = null, syncedViews = null, projectForCodeViews = null, inspector = null;
const codeViewsState=createCodeViewsState();
const sceneScope=createSceneScope(editor);
let executionLessonIdentity = null;
const textDocuments = createTextDocumentsUI({onReveal:id=>workspace?.revealText(id),canRun:()=>scene2DEnabled,documentOwner:()=>sceneScope.documentOwner(),onError: record => consoleUI.local(record)});
const consoleUI = createCodeConsoleUI(editor, {listingOwner:()=>sceneScope.listingOwner(),authoringKey:()=>sceneScope.blocksKey(),selectSourceBlock:(id,record)=>['scene3d','webapp'].includes(record.origin)?capabilityUI.selectSource(id,record.origin):record.origin==='device'?(device.setContext('microbit'),deviceEditor.selectSource(id)):(device.setContext('2d'),syncedViews?syncedViews.revealBlock(id):editor.selectSource(id)),selectSourceLocation: location => textDocuments.selectSourceLocation(location), createTextCopy: document => {
  const blocklyHashAtCopy = sceneScope.blocksKey();
  contexts.select('text');
  const created = textDocuments.add(document);
  copyFacts.set(created.id, {documentId: created.id, language: created.language, blocklyHashAtCopy, projectId: project.state().id});
  return created;
},projectCopy:language=>{
  // Single-object scenes keep the text of their view; a project with more
  // objects copies them all in one document (scene2d-multi-sprite 2.2).
  const config=scene2DObjectsOf(editor.captureCapabilities());
  if(!config)return null;
  const program=authoring.sceneProgram(),only=config.sprites[0].id;
  if(config.sprites.length===1&&authoring.mountedObject()===only&&program.scripts.every(script=>script.targetId===only)){
    const owner=scene2DTextOwner(config,only),generated=generateApi3ProgramSource(editor.program(),language,{owner,resourceView:editor.resourceView()});
    return owner.identifier==='hero'&&only==='hero'?generated:{...generated,targetIds:{[owner.identifier]:only}};
  }
  return generateApi3SceneSource(program,language,{config,resourceView:editor.resourceView()});
}});
const runEditorButton = document.querySelector('#run-editor');
const slot = document.querySelector('#runner-slot');
const runButton = document.querySelector('#run');
const compileButton = document.querySelector('#compile');
const simulateButton = document.querySelector('#simulate');
const fixtureSelect = document.querySelector('#fixture');
const status = document.querySelector('#status');
const source = document.querySelector('#source');
const deviceEditor = GGEditor.createDeviceEditor(document.querySelector('#device-blockly-editor'));
const resourceStore=createResourceStore({catalog:await fetch('/project-catalog.json').then(response=>response.json())});
const resourceValidator=createAssetProcessor(),modelProcessor=createAssetProcessor();
let resourceAttempt=0;
const contexts=createAuthoringContexts({selector:document.querySelector('#authoring-context'),heading:document.querySelector('#editor-heading'),status:document.querySelector('#editor-status'),available:validateDeploymentContexts(config.contexts)});
let scene2DEnabled=true;
contexts.register({id:'2d',label:'Escena 2D',title:'Programa 2D',setVisible:value=>{document.querySelector('#scene-blockly-surface').hidden=!value||!scene2DEnabled;document.querySelector('#inactive-2d').hidden=!value||scene2DEnabled;document.querySelector('#scene-stop-link').hidden=!value||!scene2DEnabled;}});
const device = createDeviceUI({contexts,
  editor:deviceEditor,source,getCapabilities:()=>authoring.captureCapabilities(),
  activate:capabilities=>project.useCapabilities(capabilities),request,
  getScope:()=>({sessionId,revision:activeRevision,releaseBase:config.releaseBase??'/'}),
  runTogether:runDeviceTogether,requirePack:requirePreparedPack,
  onDiagnostic:record=>consoleUI.local(record),onInvalidate:()=>consoleUI.invalidateSources('device')
});
contexts.register({id:'text',label:'Texto 2D',title:'Programa textual · 2D',setVisible:()=>{}});
contexts.register({id:'microbit',label:'micro:bit y escena',title:'Programa micro:bit',setVisible:()=>device.refresh()});
const resourcesUI=createResourcesUI({store:resourceStore,contexts,getAuthoring:()=>authoring,getProject:()=>project,editor,stop:reset,runCompatibility,
  exportSb3:payload=>request('export-sb3',payload),getObjects:()=>objectsUI,onDiagnostic:record=>consoleUI.local(record)});
const capabilityUI=createCapabilityContextsUI({contexts,getCapabilities:()=>authoring.captureCapabilities(),activate:capabilities=>project.useCapabilities(capabilities),textDocuments,
  onRun:async id=>{const result=await capabilityExecution.run(id);const mode=capabilityUI.capture(id)?.mode;workspace.result((id==='scene3d'?'escena 3D':'aplicación web')+(mode&&mode!=='blocks'?' · documento '+(mode==='javascript'?'JavaScript':'Python'):' · bloques')+' · activo',{context:id,running:true});return result;},onStop:reset,onExport:id=>exportContext(id),onImportModel:importModel,
  onDiagnostic:record=>consoleUI.local(record)});
const authoring = createProjectAuthoring({editor,textDocuments,codeViews:codeViewsState,source,resourceStore,capabilityEditors:[device.participant,resourcesUI.participant,...capabilityUI.participants]});
sceneScope.connect(authoring);
const renderGuide=()=>{document.querySelector('#creation-guide').textContent=sceneScope.guide();};
editor.subscribe(renderGuide);authoring.subscribe(renderGuide);renderGuide();
const capabilityExecution=createCapabilityExecution({config,getAuthoring:contextId=>({contextConfig:capabilityUI.capture(contextId),resources:resourceStore.capture(),capabilities:authoring.captureExecutionCapabilities(contextId),textDocuments:textDocuments.capture()?.textDocuments??[]}),slot,beforeCommit:()=>reset({preserveContext:true}),requirePack:requirePreparedPack,
  onDiagnostic:record=>consoleUI.local(record),onStatus:message=>{status.textContent=message;document.querySelector('.gg-controls').disabled=Boolean(capabilityExecution.state().contextId);const id=capabilityExecution.state().contextId??contexts.current();const entry=capabilityUI.get(id);if(entry)entry.status.textContent=message;}});
syncedViews=createCodeViewsUI({state:codeViewsState,editor,textDocuments,contexts,config,getProject:()=>projectForCodeViews,
  onRender:()=>workspace?.render(),onDiagnostic:record=>consoleUI.local(record),onSourceChanged:()=>{consoleUI.invalidateSources();lessons?.invalidate();workspace?.authoringChanged();},
  requirePack:requirePreparedPack,
  objects:{current:()=>scene2DObjectsOf(editor.captureCapabilities())?authoring.mountedObject():null,owner:id=>scene2DTextOwner(scene2DObjectsOf(editor.captureCapabilities()),id),mount:(id,options)=>authoring.mountObject(id,options),ownerOf:id=>authoring.objectOfBlock(id)},
  onCopy:document=>copyFacts.set(document.id,{documentId:document.id,language:document.language,blocklyHashAtCopy:sceneScope.blocksKey(),projectId:projectForCodeViews.state().id}),
  canRun:()=>scene2DEnabled&&Boolean(sessionId)&&activeRevision!==null});
const objectsUI=createObjectsUI({authoring,codeViews:syncedViews,contexts,resources:resourceStore,editObjects:edit=>resourcesUI.editObjects(edit),projectId:()=>projectForCodeViews?.state().id??null,
  onChanged:()=>{workspace?.render();inspector?.objectsChanged();resourcesUI.render();renderGGMove();}});
workspace=createContextualWorkspace({contexts,textDocuments,capabilityUI,device,codeViews:syncedViews,is2DEnabled:()=>scene2DEnabled,selectedObject:()=>objectsUI.selectedName(),canRestoreExample:()=>objectsUI.isSingleSprite(),stopResult:()=>reset().then(()=>{document.querySelector('#position').textContent='x = 0';}),getAuthoringKey:contextAuthoringKey,getTextContext:id=>{const state=capabilityExecution.state();return state.sourceDocument===id?state.contextId:null;},onError:showError});
for(const entry of ['scene3d','webapp'].map(id=>capabilityUI.get(id)))entry.participant.subscribe(()=>consoleUI.invalidateSources(entry.contextId));
authoring.subscribe(()=>{resourcesUI.authoringChanged();workspace?.authoringChanged();renderHiddenAuthoring();});
// Pilot profile (pilot-2d-mode): name what the project keeps outside the shown contexts.
function renderHiddenAuthoring(){
  const notice=document.querySelector('#hidden-authoring-notice');
  const kept=[['microbit','micro:bit',()=>device.config()],['sb3','Scratch importado',()=>resourcesUI.reference()],
    ['scene3d','Escena 3D',()=>capabilityUI.capture('scene3d')],['webapp','Aplicación web',()=>capabilityUI.capture('webapp')]]
    .filter(([id,,present])=>!contexts.available(id)&&present()).map(([,name])=>name);
  const names=kept.length>1?kept.slice(0,-1).join(', ')+' y '+kept.at(-1):kept[0];
  const text=kept.length?'Este proyecto también incluye '+names+'. Esta instalación del piloto no '+(kept.length>1?'los muestra, pero se conservan':'lo muestra, pero se conserva')+' al guardar y descargar.':'';
  if(notice.textContent!==text)notice.textContent=text;
}
deviceEditor.subscribe(()=>{lessons?.invalidate();workspace?.authoringChanged();});

const pending = new Map();
let port = null;
let frame = null;
let sequence = 0;
let lastResponseSequence = -1;
let generation = 0;
let sessionId = null;
let resolveReady;
let rejectReady;
let ready = Promise.resolve();
let rejectedMessages = 0;
let lastSnapshot = null;
let activeRevision = null;
let activeSourceIds = new Set();
let activeAuthoring = null;
let textExecution = null;
let compileAttempt = 0;
function updateTextExecutionIdentity() {
  const output = document.querySelector('#text-run-document');
  if (!textExecution) { output.textContent = ''; return; }
  const selected = textDocuments.selected();
  const prefix = textExecution.active ? 'En ejecución: ' : 'Última ejecución: ';
  output.textContent = prefix + textExecution.document.name +
    (selected?.id !== textExecution.document.id ? '. El documento seleccionado aún no se ejecutó.'
      : selected.source !== textExecution.document.source ? ' · versión anterior a tus cambios.' : '');
}
// Choosing an object edits nothing: what ran is still current.
function sameAsRun() { try { return JSON.stringify(authoring.sceneProgram()) === activeAuthoring; } catch { return false; } }
editor.subscribe(() => { if (activeAuthoring !== null && !sameAsRun()) activeAuthoring = null; lessons?.invalidate(); workspace?.authoringChanged(); });
inspector = createSceneInspectorUI({readScene: () => window.GG.scene.get(), getScope: () => ({sessionId, revision: activeRevision}), initialScene: projectInitialScene, objects: () => sceneScope.config(), selected: () => sceneScope.selected(), resources: () => resourceStore.view()});

const language = createLanguageController({
  origin: config.languageOrigin, releaseBase: config.releaseBase ?? '/',
  getScope: () => ({sessionId, revision: activeRevision}),
  getDocument: id => textDocuments.capture()?.textDocuments.find(document => document.id === id),
  rpc: (method, args, scope) => request('gg-call', {method, args, revision: scope.revision}, scope),
  onDiagnostic: record => consoleUI.local(record),
  onComplete: result => { if (textExecution) textExecution.active = false; updateTextExecutionIdentity(); status.textContent = result?.completed === false || result?.error ? 'Error de ejecución de texto' : 'Documento terminado'; document.querySelector('#text-run-status').textContent = status.textContent; inspector.scheduleRefresh(); if (result?.error) request('gg-call', {method: 'program.stop', args: [], revision: activeRevision}, {sessionId, revision: activeRevision}).catch(() => {}); },
  onProgramReady: () => { status.textContent = 'Documento activo · eventos disponibles'; document.querySelector('#text-run-status').textContent = status.textContent; },
  completeInvocation: (payload, scope) => request('text-invocation-result', payload, scope)
});
let textSources = new Map();
textDocuments.subscribe(() => {
  lessons?.invalidate();
  updateTextExecutionIdentity();
  const current = textDocuments.capture()?.textDocuments ?? [];
  for (const document of current) if (textSources.has(document.id) && textSources.get(document.id) !== document.source) consoleUI.invalidateTextSources(document.language);
  textSources = new Map(current.map(document => [document.id, document.source]));
});

function refreshGG() {
  const scope = {sessionId, revision: activeRevision};
  window.GG = createGGClient((method, args) => request('gg-call', {method, args, revision: scope.revision}, scope));
}

function closeRunner(oldPort, oldSession, requestId) {
  if (!oldPort || !oldSession) { oldPort?.close(); return Promise.resolve(); }
  return new Promise(resolve => {
    // Stop must also recover from an unresponsive runner; never wait indefinitely.
    const finish = () => { clearTimeout(timer); oldPort.close(); resolve(); };
    const timer = setTimeout(finish, 150);
    oldPort.onmessage = event => {
      const data = event.data;
      if (data?.protocolVersion === 1 && data.sessionId === oldSession && data.requestId === requestId && data.type === 'result' && data.result?.closed === true) finish();
    };
    oldPort.postMessage({protocolVersion: 1, sessionId: oldSession, seq: requestId, requestId, command: 'shutdown'});
  });
}

async function reset({preserveLanguage,preserveDevice=false,preserveContext=false} = {}) {
  syncedViews?.cancelAnalysis();
  capabilityExecution.stop({preserveCandidate:preserveContext});
  capabilityUI.markStopped();
  resourceAttempt++;modelProcessor.cancel();
  workspace?.result('la escena 2D inicial · sin ejecutar');
  resourcesUI.invalidate();document.querySelector('.gg-controls').disabled=!scene2DEnabled;document.querySelector('#sb3-runtime').textContent='Sin ejecución Scratch activa';
  device.setRunnerReady(false);resourcesUI.setRunnerReady(false);
  device.onReset({preserveRevision:preserveDevice});
  slot.classList.remove('combined');
  compileAttempt++;
  const compileOutput = document.querySelector('#compile-result');
  if (compileOutput.textContent === 'Compilando…') compileOutput.textContent = 'Compilación cancelada.';
  executionLessonIdentity = null; lessons?.invalidate();
  language.stop({preserve: preserveLanguage});
  const textWasRunning = textExecution !== null;
  textExecution = null; updateTextExecutionIdentity();
  const editorStatus = document.querySelector('#editor-status');
  if (editorStatus.textContent.includes('en ejecución')) editorStatus.textContent = 'Bloques detenidos · autoría conservada';
  // «Detenido» only after a document actually ran; otherwise nothing was stopped.
  document.querySelector('#text-run-status').textContent = preserveLanguage ? 'Preparando escena…' : textWasRunning ? 'Detenido' : 'Sin ejecutar';
  const oldSession = sessionId;
  const oldPort = port;
  const oldFrame = frame;
  const shutdownId = sequence + 1;
  rejectReady?.(new Error('Session stopped'));
  sessionId = null; // invalidate before touching the old frame or port
  activeRevision = null;
  activeSourceIds = new Set();
  activeAuthoring = null;
  consoleUI.reset();
  inspector.invalidate();
  port = null;
  frame = null;
  runButton.disabled = compileButton.disabled = simulateButton.disabled = runEditorButton.disabled = true;
  generation++;
  const currentGeneration = generation;
  for (const request of pending.values()) { clearTimeout(request.timer); request.reject(new Error('Session stopped')); }
  pending.clear();
  ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  ready.catch(() => {}); // A superseded bootstrap may have no active caller.
  await closeRunner(oldPort, oldSession, shutdownId);
  oldFrame?.remove();
  if (generation !== currentGeneration) return ready;
  sessionId = crypto.randomUUID();
  sequence = 0;
  lastResponseSequence = -1;
  lastSnapshot = null;
  frame = document.createElement('iframe');
  frame.title = 'Escenario de ejecución';
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  frame.referrerPolicy = 'no-referrer';
  frame.src = `${config.runnerOrigin}${config.releaseBase ?? '/'}?session=${sessionId}`;
  runButton.disabled = compileButton.disabled = simulateButton.disabled = true;
  status.textContent = 'Preparando…';
  slot.replaceChildren(frame);
  return ready;
}

function receive(message, boundSession) {
  if (!message || typeof message !== 'object' || boundSession !== sessionId || message.sessionId !== sessionId || message.protocolVersion !== 1 || !Number.isSafeInteger(message.seq) || message.seq <= lastResponseSequence) { rejectedMessages++; return; }
  lastResponseSequence = message.seq;
  if (message.type === 'ready') {
    lastSnapshot = message.snapshot;
    activeRevision = message.snapshot.revision;
    refreshGG();
    status.textContent = 'Listo';
    compileButton.disabled = simulateButton.disabled = !project.state().ready;
    runButton.disabled = runEditorButton.disabled = !project.state().ready||!scene2DEnabled;
    device.setRunnerReady(true);resourcesUI.setRunnerReady(true);
    resolveReady(message.snapshot);
    inspector.refresh();
    rejectReady = null;
    return;
  }
  if (message.type === 'diagnostic') {
    if (!consoleUI.accept(message, {sessionId, revision: activeRevision, sourceIds: activeSourceIds, sourcesCurrent: activeAuthoring !== null})) rejectedMessages++;
    return;
  }
  if (message.type === 'device-input') { if(!device.acceptInput(message))rejectedMessages++;return; }
  if (message.type === 'text-invocation') { language.invoke(message).catch(showError); return; }
  if (message.type === 'text-cancel') { language.cancelInvocation(message); return; }
  if (message.type === 'scene-state' && Number.isFinite(message.x)) {
    document.querySelector('#position').textContent = `x = ${message.x}`;
    inspector.scheduleRefresh();
    return;
  }
  if (message.type !== 'result' && message.type !== 'error') { rejectedMessages++; return; }
  if (message.type === 'error' && message.requestId === 0) { showError(new Error(message.error)); return; }
  const request = pending.get(message.requestId);
  if (!request) { rejectedMessages++; return; }
  pending.delete(message.requestId);
  clearTimeout(request.timer);
  if (!['load-program', 'load-corpus','commit-compatibility'].includes(request.command) && request.revision !== activeRevision) {
    request.reject(new Error('Program revision replaced'));
    return;
  }
  if (message.type === 'error') request.reject(new Error(message.error));
  else {
    if (['load-program', 'load-corpus','commit-compatibility'].includes(request.command)) {
      activeRevision = message.result.revision;
      activeSourceIds = new Set();
      if (request.command === 'load-program') {
        JSON.stringify(request.ir, (key, value) => { if (key === 'sourceBlockId' && typeof value === 'string') activeSourceIds.add(value); return value; });
      }
      activeAuthoring = null;
      if (request.command === 'load-program') {
        try { if (JSON.stringify(authoring.sceneProgram()) === JSON.stringify(request.ir)) activeAuthoring = JSON.stringify(request.ir); } catch { /* Authoring can become invalid while loading. */ }
      }
      consoleUI.invalidateSources();
      refreshGG();
      inspector.invalidate();
      inspector.scheduleRefresh();
    }
    request.resolve(message.result);
  }
}

window.addEventListener('message', event => {
  const message = event.data;
  if (event.origin !== config.runnerOrigin || event.source !== frame?.contentWindow || message?.type !== 'runner-ready' || message.protocolVersion !== 1 || message.sessionId !== sessionId || port) { rejectedMessages++; return; }
  const channel = new MessageChannel();
  const boundSession = sessionId;
  port = channel.port1;
  port.onmessage = event => receive(event.data, boundSession);
  port.start();
  frame.contentWindow.postMessage({type: 'connect', protocolVersion: 1, sessionId}, config.runnerOrigin, [channel.port2]);
});

async function request(command, payload = {}, expectedScope) {
  const requestedGeneration = generation;
  await ready;
  if (requestedGeneration !== generation) throw new Error('Session stopped');
  if (expectedScope && (expectedScope.sessionId !== sessionId || expectedScope.revision !== activeRevision)) throw new Error('Stale GG session or program revision');
  const requestId = ++sequence;
  return new Promise((resolve, reject) => {
    const timeout = command === 'gg-call' && payload.method?.startsWith('program.') ? languageRuntimeLimits.executionMs + 5000 : 20000;
    const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`Runner timeout: ${command}`)); }, timeout);
    pending.set(requestId, {resolve, reject, timer, command, revision: activeRevision, ...(command === 'load-program' ? {ir: structuredClone(payload.ir)} : {})});
    port.postMessage({protocolVersion: 1, sessionId, seq: requestId, requestId, command, payload});
  });
}

async function run(mode = 'repeat') {
  status.textContent = 'Ejecutando';
  const snapshot = await request('run', {mode});
  lastSnapshot = snapshot;
  document.querySelector('#position').textContent = `x = ${snapshot.x}`;
  status.textContent = mode === 'repeat' ? 'Terminado' : 'Ejecutando';
  workspace.result('ejemplo técnico 2D · '+mode,{context:'fixture',running:true});
  return snapshot;
}

async function compile(program = source.value, native = true) {
  requirePreparedPack('microbit-compiler');
  const output = document.querySelector('#compile-result');
  const attempt = ++compileAttempt;
  output.textContent = 'Compilando…';
  try {
    const result = await request('compile', {source: program, native});
    if (attempt !== compileAttempt) throw new Error('Session stopped');
    output.textContent = result.success ? `Compilación lista\n${Object.keys(result.outfiles).join('\n')}` : result.diagnostics.map(item => `${item.fileName}: ${item.messageText}`).join('\n');
    deviceDiagnostics(result);
    return result;
  } catch (error) {
    if (attempt !== compileAttempt) throw new Error('Session stopped');
    output.textContent = error.message === 'Session stopped' ? 'Compilación cancelada.' : 'No se pudo compilar: ' + error.message;
    throw error;
  }
}

function deviceDiagnostics(result) {
  for (const item of (result.diagnostics ?? []).slice(0, 100)) consoleUI.local({level: 'error', code: 'DEVICE_COMPILE', origin: 'device', message: `${item.fileName ?? 'main.ts'}: ${item.messageText}`});
}
// reported: the origin already logged this failure in Diagnostics, so the shell
// does not add a second, generic entry for the same problem.
function showError(error, {reported = false} = {}) {
  if (['Session stopped', 'Program revision replaced'].includes(error.message)) return;
  // The status line stays short; the full message remains in Diagnostics.
  const technical = /Traceback|SyntaxError|Unexpected|\n/.test(error.message);
  status.textContent = technical ? (explainDiagnostic({code: /SyntaxError|Unexpected|invalid syntax|never closed/i.test(error.message) ? 'LANGUAGE_PREPARE' : 'LANGUAGE_ERROR', message: error.message})?.title ?? 'Error') + ' Detalle en Diagnósticos.' : error.message;
  if (!reported) consoleUI.local({level: 'error', code: 'SHELL_ERROR', origin: 'shell', message: error.message});
}
async function freshRun(preserveLanguage,preserveDevice=false) {
  const resetReady = reset({preserveLanguage,preserveDevice});
  const expectedGeneration = generation;
  await resetReady;
  if (generation !== expectedGeneration) throw new Error('Session stopped');
  return expectedGeneration;
}
async function readCompatibility(){const snapshot=await request('snapshot');document.querySelector('#sb3-runtime').textContent=snapshot.mode==='compatibility'?JSON.stringify({targets:snapshot.targets,globals:snapshot.globalVariables,threads:snapshot.threads,audio:snapshot.audio,pendingAudioStart:snapshot.pendingAudioStart},null,2):'Sin ejecución Scratch activa';return snapshot;}
document.querySelector('#refresh-sb3-runtime').addEventListener('click',()=>readCompatibility().catch(showError));
async function runCompatibility() {
  requirePreparedPack('scratch-2d');const key=authoringKey();
  const prepared=await request('prepare-compatibility',{sourceAssetId:resourcesUI.reference(),resources:resourceStore.captureContext('scratch-2d'),capabilities:authoring.captureExecutionCapabilities('scratch-compatibility'),revision:activeRevision});
  try {
    if(key!==authoringKey())throw new Error('La autoría cambió durante la preparación. Vuelve a ejecutar.');
    const result=await request('commit-compatibility',{id:prepared.id,revision:activeRevision});
    language.stop();device.onReset();textExecution=null;updateTextExecutionIdentity();slot.classList.remove('combined');
    document.querySelector('.gg-controls').disabled=true;
    await request('start-compatibility');workspace.result('Scratch importado · original activo',{context:'sb3',running:true});status.textContent='Proyecto Scratch activo';inspector.invalidate();await readCompatibility();return result;
  }catch(error){request('discard-compatibility',{id:prepared.id}).catch(()=>{});throw error;}
}
async function runEditable() {
  if(syncedViews&&!await syncedViews.applyForRun())return null;
  requirePreparedPack('scratch-2d');
  language.cancelPreparation();
  // gg.sprites 0.3.0: the whole scene as IR 2D v1; earlier profiles: the editor's IR0.
  const ir = authoring.sceneProgram();
  const key = authoringKey();
  const capabilities = authoring.captureExecutionCapabilities('scratch-2d');
  status.textContent = 'Cargando bloques…';
  const expectedGeneration = await freshRun();
  const loaded = await request('load-program', {ir, capabilities,resources:resourceStore.captureContext('scratch-2d')});
  if (generation !== expectedGeneration) throw new Error('Session stopped');
  await request('start-corpus');
  document.querySelector('#editor-error').textContent = '';
  document.querySelector('#editor-status').textContent = `Revisión ${loaded.revision} en ejecución`;
  status.textContent = 'Bloques ejecutados';
  workspace.result('bloques 2D · activo',{context:'2d',running:true});
  executionLessonIdentity = {key, sessionId, revision: loaded.revision, backend: 'blocks', documentId: null};
  inspector.scheduleRefresh();
  return loaded;
}
async function runDeviceTogether(input) {
  // Both targets are validated, and PXT preflight completes, before replacing the live runner.
  let ir;try{ir=authoring.sceneProgram();}catch(error){error.diagnosticOrigin='generation';error.code='SCENE_PREFLIGHT_INVALID';throw error;}
  const key=authoringKey();
  if(device.state().revision!==input.deviceRevision)throw new Error('Device revision replaced');
  let operatingGeneration=null;
  try {
  const preflightScope=device.nextScope();
  const preflight=await request('prepare-device',{capabilities:input.capabilities,deviceSource:input.deviceSource,deviceScope:preflightScope});
  if(device.state().revision!==input.deviceRevision||key!==authoringKey())throw new Error('Device revision replaced');
  if(!preflight.success)return preflight;
  const expectedGeneration=await freshRun(undefined,true);
  operatingGeneration=expectedGeneration;
  if(device.state().revision!==input.deviceRevision||key!==authoringKey())throw new Error('Device revision replaced');
  const loaded=await request('load-program',{ir,capabilities:input.capabilities,resources:resourceStore.captureContext('scratch-2d')});
  if(generation!==expectedGeneration)throw new Error('Session stopped');
  await request('start-corpus');
  const deviceScope={...device.nextScope(),generation:crypto.randomUUID(),sceneRevision:loaded.revision};
  const result=await request('simulate-device',{capabilities:input.capabilities,deviceSource:input.deviceSource,deviceScope,combined:true});
  if(generation!==expectedGeneration||device.state().revision!==input.deviceRevision)throw new Error('Device revision replaced');
  slot.classList.add('combined');
  workspace.result('micro:bit y escena 2D · simulación activa',{context:'microbit',running:true});
  status.textContent=result.success?'Escena y micro:bit activos':'Error de firmware';
  document.querySelector('#editor-status').textContent='Revisión '+loaded.revision+' en ejecución con dispositivo';
  executionLessonIdentity={key,sessionId,revision:loaded.revision,backend:'blocks',documentId:null};
  inspector.scheduleRefresh();
  return result;
  } catch(error) {
    if(device.state().revision!==input.deviceRevision||key!==authoringKey()||(operatingGeneration!==null&&operatingGeneration!==generation))throw new Error('Device revision replaced');
    throw error;
  }
}
async function runTextDocument() {
  language.cancelPreparation();
  const document = textDocuments.selected();
  if (!document) throw new Error('Selecciona un documento de texto.');
  requirePreparedPack(document.language === 'javascript' ? 'javascript-quickjs' : 'python-stdlib');
  // Legacy top-level GG documents may use the project's numeric locals.
  // Copied event programs configure their own declarations; invalid blocks
  // must not prevent an independent textual program from running.
  const variables = authoring.variables().filter(variable => !variable.scope || variable.scope === 'local');
  const key = authoringKey();
  const capabilities = authoring.captureExecutionCapabilities('scratch-2d');
  // gg.sprites 0.3.0: the document runs in the scene of the project, with every
  // sprite on stage and no block scripts (scene2d-multi-sprite 2.2).
  const sceneObjects = scene2DObjectsOf(capabilities);
  // A copy keeps the objects it was written for; the project may have deleted one.
  const gone = !sceneObjects || document.runtime?.api !== 'api3' ? null : Object.entries(document.runtime.targetIds ?? {hero: 'hero'}).find(([, id]) => id !== 'stage' && !sceneObjects.sprites.some(sprite => sprite.id === id));
  if (gone) throw new Error(`Este documento escribe para «${gone[0]}», que ya no está en el proyecto. Crea una copia nueva o cambia su texto.`);
  const ir = sceneObjects ? {version: 1, sprites: sceneObjects.sprites.map(sprite => sprite.id), ...(variables.length ? {variables} : {}), scripts: []}
    : {version: 0, variables, scripts: []};
  status.textContent = 'Preparando ' + (document.language === 'javascript' ? 'JavaScript…' : 'Python…');
  window.document.querySelector('#text-run-status').textContent = status.textContent;
  const candidate = await language.prepare(document);
  const currentDocument = textDocuments.capture()?.textDocuments.find(entry => entry.id === document.id);
  if (JSON.stringify(currentDocument) !== JSON.stringify(document)) { language.stop(); throw new Error('El documento cambió durante la preparación. Vuelve a ejecutarlo.'); }
  const expectedGeneration = await freshRun(candidate);
  const loaded = await request('load-program', {ir, textMode: true, capabilities,resources:resourceStore.captureContext('scratch-2d')});
  if (generation !== expectedGeneration) throw new Error('Session stopped');
  workspace.result('documento 2D · '+document.name+' · activo',{context:'text',running:true});
  textExecution = {document: structuredClone(document), active: true}; updateTextExecutionIdentity();
  executionLessonIdentity = {key, sessionId, revision: loaded.revision, backend: document.language, documentId: document.id};
  await language.execute(candidate, {runnerSessionId: sessionId, revision: loaded.revision, documentId: document.id});
  status.textContent = 'Ejecutando documento';
  window.document.querySelector('#text-run-status').textContent = status.textContent;
  documentQueryTextError('');
  return loaded;
}
function documentQueryTextError(message) { document.querySelector('#text-error').textContent = message; }
document.querySelector('#run-document').addEventListener('click', () => runTextDocument().catch(error => {
  if (error.message !== 'Session stopped') {
    // Interpreter tracebacks stay in Diagnostics; the editor shows cause and next step.
    const technical = /Traceback|SyntaxError|Unexpected|Error:|invalid syntax/.test(error.message);
    const explained = technical && explainDiagnostic({code: /SyntaxError|Unexpected|invalid syntax|never closed|Unterminated/i.test(error.message) ? 'LANGUAGE_PREPARE' : 'LANGUAGE_ERROR', message: error.message});
    documentQueryTextError(explained ? explained.title + ' ' + explained.next + ' El detalle técnico está en Diagnósticos.' : error.message);
    const last = consoleUI.snapshot().entries.at(-1);
    document.querySelector('#text-run-status').textContent = 'No se pudo ejecutar'; showError(error, {reported: last?.level === 'error' && /^LANGUAGE_/.test(last.code ?? '')});
  }
}));
runEditorButton.addEventListener('click', () => runEditable().catch(error => { if (error.message !== 'Session stopped') document.querySelector('#editor-error').textContent = error.message; }));
document.querySelector('#restore-editor').addEventListener('click', () => { editor.restore(); document.querySelector('#editor-error').textContent = ''; });
async function ggAction(action) {
  const output = document.querySelector('#gg-result');
  try { output.textContent = JSON.stringify(await action(), null, 2); }
  catch (error) { output.textContent = error.message; }
  finally { inspector.refresh(); }
}
// This control moves hero, the sprite the GG client can reach (design 27).
function heroName() { const config = sceneScope.config(); return config ? config.sprites.find(sprite => sprite.id === 'hero')?.name ?? null : 'hero'; }
function renderGGMove() { const name = heroName(), several = sceneScope.config()?.sprites.length > 1; document.querySelector('#gg-move').textContent = name && several ? `Mover ${name} +10` : 'Mover +10'; }
document.querySelector('#gg-move').addEventListener('click', () => ggAction(() => { if (!heroName()) throw new Error('Este control mueve a hero, y este proyecto ya no lo tiene.'); return GG.sprite.move('hero', 10); }));
document.querySelector('#gg-set').addEventListener('click', () => ggAction(() => GG.variables.set(editor.captureCapabilities()?.config['gg.score']?.variableId ?? 'gg-score', Number(document.querySelector('#gg-score').value))));
document.querySelector('#gg-emit').addEventListener('click', () => ggAction(() => GG.events.emit('boost')));
document.querySelector('#gg-read').addEventListener('click', () => ggAction(() => GG.scene.get()));
runButton.addEventListener('click', async () => {
  try {
    if (fixtureSelect.value === 'repeat') {
      await freshRun();
      await run();
    } else {
      const expectedGeneration = await freshRun();
      await request('load-corpus', {name: fixtureSelect.value});
      if (generation !== expectedGeneration) throw new Error('Session stopped');
      if (['audio', 'audioStop'].includes(fixtureSelect.value)) status.textContent = 'Pulsa Reproducir sonido en el escenario';
      else {
        await request('start-corpus');
        status.textContent = 'Ejecutando';
      }
    }
    workspace.result('ejemplo técnico 2D · '+fixtureSelect.value,{context:'fixture',running:true});
  } catch (error) { showError(error); }
});
compileButton.addEventListener('click', () => compile().catch(showError));
simulateButton.addEventListener('click', async () => {
  try {
    requirePreparedPack('microbit-compiler'); requirePreparedPack('microbit-simulator');
    await freshRun();
    const result = await request('simulate', {source: source.value});
    deviceDiagnostics(result);
    status.textContent = result.success ? 'Simulador micro:bit' : 'Error de compilación';
    if(result.success)workspace.result('simulador micro:bit · documento TypeScript · activo',{context:'microbit-document',running:true});
    document.querySelector('#compile-result').textContent = result.success ? 'Programa ejecutado en el simulador local' : result.diagnostics.map(item => item.messageText).join('\n');
  } catch (error) { showError(error); }
});
fixtureSelect.addEventListener('change', () => {
  document.querySelector('#scene-help').textContent = {
    repeat: 'Al iniciar → repetir 3 veces → mover 5 pasos',
    events: 'Espera inicial → mover 5. Haz clic en el robot (+11) y pulsa espacio sobre el escenario (+7).',
    messages: 'Mover 1 → enviar y esperar → receptor espera y mueve 10 → emisor mueve 2.',
    clones: 'Un clon avanza 60 pasos, espera y desaparece. El original avanza 2.',
    variables: 'Un contador decide cuánto mover: 4 + 7 + 7 + 3. Espacio resta uno al contador y mueve −2.',
    audio: 'Pulsa Reproducir sonido dentro del escenario: un tono local suena 1,2 s y después el robot avanza 5.',
    audioStop: 'Pulsa Reproducir sonido: el programa inicia el tono, lo detiene antes del final y avanza 3.'
  }[fixtureSelect.value];
});

const project = createProjectUI({editor, source, stop: reset, textDocuments, authoring,
  prepareResources:resources=>[1,2].includes(resources.version)?resourceValidator.process('validate-resources',{resources}):Promise.resolve(),onDiagnostic: record => consoleUI.local(record),
  onApplied: () => { copyFacts.clear(); executionLessonIdentity = null; previousCapabilities = null; previousProjectSnapshot = null; lessons?.invalidate(); renderPacks();resourcesUI.render();capabilityUI.refreshProfiles(authoring);void resourcesUI.refreshReport(); }
});
projectForCodeViews=project;
createEntryJourneyUI({project,
  startCreation: () => project.loadStarter({...getLesson('story').starter, name:'Mi primera creación'}),
  select2D: () => contexts.select('2d')
});
// Presentation key per result context: detects edits made after a run.
// The whole scene, not the object on screen: choosing an object is not a change.
function sceneAuthoring() {
  const {blockly,scene2d}=authoring.capture(),views=codeViewsState.capture();
  if(!scene2d)return {blockly,scriptOrder:editor.codeViewOrder()};
  const orders=[[authoring.mountedObject(),editor.codeViewOrder()],...Object.entries(views?.objects??{}).map(([id,view])=>[id,view.scriptOrder])];
  return {scene2d,orders:orders.filter(([,order])=>order).sort(([a],[b])=>a.localeCompare(b))};
}
function contextAuthoringKey(id) {
  if(id==='2d')return JSON.stringify({...sceneAuthoring(),resources:resourceStore.capture(),pending:syncedViews?.pendingSource('2d')??null});
  if(id==='text')return JSON.stringify({document:textDocuments.selected(),resources:resourceStore.capture()});
  if(id==='microbit')return JSON.stringify({...sceneAuthoring(),resources:resourceStore.capture(),pending:syncedViews?.pendingSource('2d')??null,device:device.config(),deviceSource:source.value});
  if(id==='sb3')return JSON.stringify({scratchSource:resourcesUI.reference()});
  if(id==='scene3d'||id==='webapp')return JSON.stringify({context:capabilityUI.capture(id),documents:textDocuments.capture()});
  return null;
}
function authoringKey() {
  return JSON.stringify({resources:resourceStore.capture(),...sceneAuthoring(),pendingCode:syncedViews?.pendingSource('2d')??null,documents:textDocuments.capture(),deviceSource:source.value,device:device.config(),scene3d:capabilityUI.capture('scene3d'),webapp:capabilityUI.capture('webapp'),scratchSource:resourcesUI.reference()});
}
function lessonIdentity() {
  const selected = textDocuments.selected();
  const executed = executionLessonIdentity;
  const matches = executed?.sessionId === sessionId && executed.revision === activeRevision &&
    (executed.backend === 'blocks' || selected?.id === executed.documentId);
  return {projectId: project.state().id, authoringKey: authoringKey(), sessionId, revision: activeRevision,
    backend: executed?.backend ?? null, documentId: selected?.id ?? null, executedDocumentId: executed?.documentId ?? null,
    executedAuthoringKey: matches ? executed.key : null};
}
lessons = createLessonsUI({
  loadStarter: (starter, options) => project.loadStarter(starter, options),
  readScene: identity => request('gg-call', {method: 'scene.get', args: [], revision: identity.revision}, identity),
  readVariable: (id, identity) => request('gg-call', {method: 'variables.get', args: [id], revision: identity.revision}, identity),
  getIdentity: lessonIdentity, getAuthoring: () => ({ir: authoring.sceneProgram(), resourceView: editor.resourceView(), blocklyHash: sceneScope.blocksKey(), editedInText: codeViewsState.get('2d').editedInText}),
  getCopyFacts: () => [...copyFacts.values()], onError: record => consoleUI.local(record)
});
source.addEventListener('input', () => { lessons?.invalidate();workspace?.authoringChanged();compileAttempt++;if(document.querySelector('#compile-result').textContent==='Compilando…')document.querySelector('#compile-result').textContent='Fuente modificada · compilación anterior descartada'; });
let previousCapabilities = null;
// Whole-project snapshot from the last pack update: block transforms make a
// capabilities-only rollback unsafe, so update rollback restores the project.
let previousProjectSnapshot = null, previousProjectKey = null;
function renderPacks() {
  renderGGMove();
  const capabilities = authoring.captureCapabilities();
  const profile = resolveCapabilities(capabilities);
  scene2DEnabled=profile.packs.some(pack=>pack.id==='gg.sprites');textDocuments.refresh();
  document.querySelector('.gg-controls').disabled=!scene2DEnabled||Boolean(capabilityExecution.state().contextId);
  runEditorButton.disabled=runButton.disabled=!project.state().ready||!scene2DEnabled;
  fixtureSelect.disabled=!scene2DEnabled;
  if(!scene2DEnabled&&contexts.current()==='2d'){const available=['scene3d','webapp'].find(id=>capabilityUI.capture(id));if(available)contexts.select(available);}contexts.render();
  const list = document.querySelector('#packs-list');
  list.replaceChildren(...profile.packs.map(pack => {
    const item = document.createElement('li');
    item.textContent = `${pack.id} · ${pack.version}`;
    return item;
  }));
  const score = capabilities?.locks.find(lock => lock.id === 'gg.score');
  document.querySelector('#enable-score').disabled = Boolean(score) || !project.state().ready;
  document.querySelector('#update-packs').hidden = !availablePackUpdates(capabilities).length;
  document.querySelector('#rollback-packs').hidden = !previousCapabilities && !previousProjectSnapshot;
  document.querySelector('#packs-status').textContent = capabilities ? 'Versiones fijadas en este proyecto' : 'Perfil compatible 2D · archivo original sin actualizar';
}
async function changeCapabilities(capabilities) {
  const before = authoring.captureCapabilities();
  document.querySelector('#packs-error').textContent = '';
  try {
    await project.useCapabilities(capabilities);
    previousCapabilities = before;
    previousProjectSnapshot = null;previousProjectKey = null;
    renderPacks();
    lessons?.invalidate();
  } catch (error) { document.querySelector('#packs-error').textContent = error.message; }
}
document.querySelector('#enable-2d').addEventListener('click',()=>{const current=authoring.captureCapabilities();changeCapabilities(createCapabilities([...new Set([...(current?.locks.map(lock=>lock.id)??[]),'gg.sprites'])],{config:current?.config??{},versions:lockedPackVersions(current)}));});
document.querySelector('#enable-score').addEventListener('click', () => {
  const current = authoring.captureCapabilities();
  const ids = [...new Set([...(current?.locks.map(lock => lock.id) ?? ['gg.sprites']), 'gg.score'])];
  changeCapabilities(createCapabilities(ids, {config: current?.config ?? {}, versions: lockedPackVersions(current)}));
});
// Explicit update of every pack with a registered chain; atomic, never runs.
document.querySelector('#update-packs').addEventListener('click', async () => {
  const errorOutput = document.querySelector('#packs-error');
  errorOutput.textContent = '';
  let before = null, summary = [];
  try {
    await project.replaceAuthoring(async () => {
      before = await project.capture();
      const result = await migrateProject(before, availablePackUpdates(before.capabilities), {catalog: project.catalog()});
      summary = result.summary;
      return result.document;
    }, {notice: () => `Packs actualizados: ${describeMigrationSummary(summary)}. No se ejecutó nada: pulsa Ejecutar cuando quieras ver el resultado.`});
    previousProjectSnapshot = before;
    previousCapabilities = null;
    renderPacks();
    previousProjectKey = JSON.stringify([project.state().id,authoringKey()]);
    lessons?.invalidate();
  } catch (error) { errorOutput.textContent = error.message; }
});
document.querySelector('#rollback-packs').addEventListener('click', async () => {
  if (previousProjectSnapshot) {
    const snapshot = previousProjectSnapshot;
    const unchanged=()=>previousProjectKey===JSON.stringify([project.state().id,authoringKey()]);
    try {
      if(!unchanged())throw new Error('Hay cambios posteriores a la actualización. Se conservó tu trabajo. Guarda una copia antes de volver a una versión anterior.');
      await project.replaceAuthoring(async () => snapshot, {isCurrent:unchanged,notice: 'Se restauraron las versiones anteriores de los packs. No se ejecutó nada.'});
      previousProjectSnapshot = null;previousProjectKey = null;
      renderPacks();
      lessons?.invalidate();
    } catch (error) { document.querySelector('#packs-error').textContent = error.message; }
  } else if (previousCapabilities) changeCapabilities(previousCapabilities);
});

// Explicit diagnostic surface; public language bindings remain experimental.
window.studioProbe = Object.freeze({
  ready: () => ready, request, run, compile, stop: reset, editor, runEditable, runTextDocument, project, textDocuments, language, device, deviceEditor, authoring,
  codeViews:codeViewsState,syncedViews,console: consoleUI, inspector, lessons, offline,resourcesUI,resourceStore,contexts,runCompatibility,capabilityUI,capabilityExecution, // read/accept helpers are diagnostic fixtures, not authoring APIs
  state: () => ({sessionId, revision: activeRevision, generation, rejectedMessages, snapshot: structuredClone(lastSnapshot), source: source.value, status: status.textContent})
});
reset().catch(showError);
project.ready().then(() => {
  if (!['recovered','restored','opened'].includes(project.state().recoveryStatus)) document.querySelector('#editor-status').textContent = 'Listo para editar';
  textDocuments.setReady(project.state().ready);
  syncedViews.setReady(project.state().ready);
  device.setReady(project.state().ready);
  resourcesUI.setReady(project.state().ready);
  capabilityUI.setReady(project.state().ready);
  lessons.setReady(project.state().ready);
  renderPacks();
  if (sessionId && activeRevision !== null){compileButton.disabled = simulateButton.disabled = false;runButton.disabled = runEditorButton.disabled = !scene2DEnabled;}
});

async function importModel(file,contextConfig){
  if(file.size>512*1024)throw new Error('El modelo excede512KiB.');
  const attempt=++resourceAttempt,captured=await project.capture(),key=authoringKey();
  if(!captured.capabilities?.locks.some(lock=>lock.id==='gg.3d-advanced'))throw new Error('Activa jerarquías, modelos y luces antes de importar.');
  const prepared=await modelProcessor.process('prepare-media',{bytes:new Uint8Array(await file.arrayBuffer()),type:'Model',format:'glb'});
  if(attempt!==resourceAttempt||key!==authoringKey())throw new Error('La autoría cambió durante la preparación.');
  const resources=structuredClone(resourceStore.capture());if(resources.version!==2)throw new Error('Se requiere política de recursos2.');
  const targetId='model-'+crypto.randomUUID(),bindingId='model-binding-'+crypto.randomUUID();
  resources.assets[prepared.id]=prepared.asset;resources.integrity[prepared.id]=prepared.integrity;
  resources.bindings.push({id:bindingId,owner:{contextId:'scene3d',documentId:contextConfig.documentId,targetId},role:'mesh.geometry',assetId:prepared.id,name:file.name.slice(0,80),properties:{}});
  const validated=await validateResources2(resources),capabilities=authoring.captureCapabilities();
  capabilities.config['gg.3d-basic'].scene.entities.push({id:targetId,name:file.name.slice(0,80),kind:'model',parentId:null,visible:true,transform:{position:{x:0,y:0,z:0},rotationDegrees:{x:0,y:0,z:0},scale:{x:1,y:1,z:1}},properties:{bindingId,collidable:true}});
  await project.replaceAuthoring(()=>createProject({...captured.project,...authoring.capture(),resources:validated,capabilities,catalog:project.catalog()}),{isCurrent:()=>attempt===resourceAttempt&&key===authoringKey()});
}

async function exportContext(contextId){
  const contextConfig=capabilityUI.capture(contextId);
  if(!contextConfig)throw new Error('Añade el contexto antes de exportar.');
  const bytes=await exportStandaloneContext({config,contextId,authoring:{contextConfig,resources:resourceStore.capture(),capabilities:authoring.captureExecutionCapabilities(contextId),textDocuments:textDocuments.capture()?.textDocuments??[]}});
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/zip'})),link=document.createElement('a');link.href=url;link.download='guategeeks-'+contextId+'.zip';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
