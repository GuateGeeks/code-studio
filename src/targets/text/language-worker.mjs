import {resolveLanguageProfile,languageProfileMetadata,validateCapabilityInvocation} from '../../contracts/capability-language.mjs';
import {createInvocationQueue} from './invocation-queue.mjs';
import {validateTextInvocation} from '../../contracts/text-program.mjs';
import {createLanguageChannelGate, languageRuntimeLimits, validateLanguageDocument, validateLanguageScope, validateLanguageRPC, languageDiagnostic} from '../../contracts/language-runtime.mjs';

let languageSessionId = null;
let gate = null;
let sequence = 0;
let document = null;
let profile = null;
let engine = null;
let scope = null;
let phase = 'idle';
let rpcSequence = 0;
let logCount = 0;
let warned = false;
const pending = new Map();
const invocationQueue = createInvocationQueue({
  validate:data=>profile?validateCapabilityInvocation(data,profile):validateTextInvocation(data),
  invoke: data => {
    if (phase !== 'executing' || !engine || data.revision !== scope?.revision) throw new Error('Session stopped');
    return engine.invoke(data);
  },
  cancelInvocation: id => engine?.cancelInvocation(id),
  onResult: (data, result) => {
    if (phase === 'executing' && data.revision === scope?.revision) {
      send({type: 'invocation-result', ...scope, invocationId: data.invocationId, result});
    }
  },
  onError: (data, error) => {
    if (phase !== 'executing' || data.revision !== scope?.revision) return;
    emitDiagnostic(languageDiagnostic(error, document));
    send({type: 'invocation-result', ...scope, invocationId: data.invocationId, error: String(error?.message ?? error).slice(0,1024)});
  }
});
function send(message) { self.postMessage({protocolVersion: 1, languageSessionId, seq: sequence++, ...message}); }
function emitDiagnostic(diagnostic) {
  if (phase !== 'executing') return;
  if (logCount >= languageRuntimeLimits.logs) {
    if (!warned) {
      warned = true;
      send({type: 'diagnostic', ...scope, diagnostic: {level: 'warning', code: 'TEXT_LOG_LIMIT',
        origin: document.language, message: 'Se alcanzó el límite de 100 mensajes de esta ejecución.'}});
    }
    return;
  }
  logCount++;
  send({type: 'diagnostic', ...scope, diagnostic});
}
function rpc(method, args) {
  if (phase !== 'executing' || !scope) return Promise.reject(new Error('Session stopped'));
  const call = validateLanguageRPC(method, args,{profile});
  if (pending.size >= languageRuntimeLimits.pendingRPC) return Promise.reject(new Error('Límite de solicitudes pendientes.'));
  const requestId = ++rpcSequence;
  return new Promise((resolve, reject) => {
    pending.set(requestId, {resolve, reject, invocationId: (method.startsWith('program.')||method==='context.call') && typeof args[0] === 'string' ? args[0] : null});
    send({type: 'rpc', requestId, ...scope, ...call});
  });
}
function dispose() {
  phase = 'stopped';
  invocationQueue.dispose();
  for (const request of pending.values()) request.reject(new Error('Session stopped'));
  pending.clear();
  engine?.dispose(); engine = null; scope = null;
}
async function prepare(payload) {
  if (phase !== 'idle') throw new Error('El ejecutor ya está preparado.');
  document = validateLanguageDocument(payload.document);
  profile=payload.profile===undefined?null:resolveLanguageProfile(payload.profile);
  phase = 'preparing';
  if (document.language === 'javascript') {
    const {createQuickJSEngine} = await import('/vendor/quickjs-engine.bundle.mjs');
    engine = await createQuickJSEngine({rpc, onDiagnostic: emitDiagnostic, onProgramReady: programReady,...(profile?{profile:languageProfileMetadata(profile)}:{})});
  } else {
    const {createPythonEngine} = await import('./python-engine.mjs');
    engine = await createPythonEngine({rpc, onDiagnostic: emitDiagnostic, onProgramReady: programReady,...(profile?{profile:languageProfileMetadata(profile)}:{})});
  }
  if (phase === 'stopped') { engine.dispose(); engine = null; throw new Error('Session stopped'); }
  await engine.prepare(document);
  phase = 'prepared';
  return {prepared: true};
}
function programReady() { if (phase === 'executing') send({type: 'program-ready', ...scope}); }
function invocation(payload) {
  if (phase !== 'executing' || !scope || payload.runnerSessionId !== scope.runnerSessionId || payload.revision !== scope.revision || payload.documentId !== scope.documentId) throw new Error('Stale text invocation');
  const {runnerSessionId,documentId,...capabilityPayload}=payload;
  const data = profile?validateCapabilityInvocation(capabilityPayload,profile):validateTextInvocation({invocationId: payload.invocationId, handlerId: payload.handlerId, targetId: payload.targetId, revision: payload.revision});
  invocationQueue.enqueue(data);
  return {accepted: true};
}
function cancelInvocation(payload) {
  if (phase !== 'executing' || payload.runnerSessionId !== scope.runnerSessionId || payload.revision !== scope.revision || payload.documentId !== scope.documentId || typeof payload.invocationId !== 'string') throw new Error('Stale text cancellation');
  invocationQueue.cancel(payload.invocationId);
  for (const [id, request] of pending) if (request.invocationId === payload.invocationId) {
    pending.delete(id); request.reject(new Error('Text invocation cancelled'));
  }
  return {accepted: true};
}
function execute(payload) {
  if (phase !== 'prepared') throw new Error('El documento no está preparado.');
  scope = validateLanguageScope(payload);
  if (scope.documentId !== document.id) throw new Error('Documento sustituido.');
  phase = 'executing';
  setTimeout(() => {
    if (phase !== 'executing') return;
    engine.execute(scope).then(
      result => finish(result),
      error => {
        if (phase !== 'executing') return;
        send({type: 'diagnostic', ...scope, diagnostic: languageDiagnostic(error, document)});
        finish({completed: false, error: String(error.message).slice(0, languageRuntimeLimits.message)});
      }
    );
  }, 0);
  return {started: true};
}
function finish(result) {
  if (phase !== 'executing') return;
  const finishedScope = scope;
  dispose();
  send({type: 'execution-complete', ...finishedScope, result});
}
self.onmessage = async event => {
  const message = event.data;
  if (!gate) {
    if (message?.command !== 'prepare' || typeof message.languageSessionId !== 'string') return;
    languageSessionId = message.languageSessionId;
    try { gate = createLanguageChannelGate({languageSessionId}); } catch { return; }
  }
  if (!gate.accept(message)) return;
  if (message.command === 'rpc-result') {
    const payload = message.payload;
    const request = pending.get(payload?.requestId);
    if (!request) return;
    pending.delete(payload.requestId);
    if (typeof payload.error === 'string') request.reject(new Error(payload.error));
    else request.resolve(payload.result);
    return;
  }
  if (!Number.isSafeInteger(message.requestId) || message.requestId < 0) return;
  try {
    let result;
    if (message.command === 'prepare') result = await prepare(message.payload ?? {});
    else if (message.command === 'execute') result = execute(message.payload ?? {});
    else if (message.command === 'invoke') result = invocation(message.payload ?? {});
    else if (message.command === 'cancel-invocation') result = cancelInvocation(message.payload ?? {});
    else if (message.command === 'shutdown') { dispose(); result = {closed: true}; }
    else throw new Error('Comando de lenguaje desconocido.');
    send({type: 'result', requestId: message.requestId, result});
  } catch (error) {
    const diagnostic = document ? languageDiagnostic(error, document, phase === 'preparing' ? 'LANGUAGE_PREPARE' : 'LANGUAGE_ERROR') : undefined;
    send({type: 'error', requestId: message.requestId, error: String(error.message).slice(0, languageRuntimeLimits.message), ...(diagnostic ? {diagnostic} : {})});
    if (phase === 'preparing') dispose();
  }
};
