import {resolveLanguageProfile,languageProfileMetadata,validateCapabilityInvocation} from '../../contracts/capability-language.mjs';
import {validateTextInvocation, validateTextProgramId} from '../../contracts/text-program.mjs';
import {createLanguageChannelGate, languageRuntimeLimits, validateLanguageDocument, validateLanguageScope, validateLanguageRPC} from '../../contracts/language-runtime.mjs';

const config = await fetch('/config.json').then(response => response.json());
const languageSessionId = new URL(location.href).searchParams.get('session');
const shellGate = createLanguageChannelGate({languageSessionId});
let port = null;
let sequence = 0;
let workerSequence = 0;
let worker = null;
let workerGeneration = 0;
let document = null;
let profile = null;
let scope = null;
let phase = 'idle';
let watchdog = null;
let logs = 0;
let warned = false;
let terminalDiagnostic = false;
const pending = new Set();
const rpcPending = new Set();
const invocations = new Map();
let listening = false;
let initialDeadline = null;
const bytes = value => new TextEncoder().encode(JSON.stringify(value)).length;
function send(message) { port?.postMessage({protocolVersion: 1, languageSessionId, seq: sequence++, ...message}); }
function sameScope(message) {
  return scope && message.runnerSessionId === scope.runnerSessionId && message.revision === scope.revision &&
    message.documentId === scope.documentId;
}
function stopWorker() {
  workerGeneration++;
  worker?.terminate(); worker = null;
  clearTimeout(watchdog); watchdog = null;
  pending.clear(); rpcPending.clear(); invocations.clear(); listening = false; initialDeadline = null;
}
function armWatchdog() {
  clearTimeout(watchdog);
  const deadlines = [...invocations.values()];
  if (!listening && initialDeadline !== null) deadlines.push(initialDeadline);
  if (phase !== 'executing' || !deadlines.length) { watchdog = null; return; }
  watchdog = setTimeout(() => {
    if (phase !== 'executing') return;
    const finishedScope = scope;
    stopWorker(); phase = 'stopped';
    const error = 'El trabajo activo alcanzó el límite de 120 segundos.';
    send({type: 'diagnostic', ...finishedScope, diagnostic: {level: 'error', code: 'LANGUAGE_TIME_LIMIT', origin: document.language, message: error}});
    send({type: 'execution-complete', ...finishedScope, result: {completed: false, error}});
  }, Math.max(0, Math.min(...deadlines) - Date.now()));
}
function forward(command, requestId, payload) {
  if (!worker) throw new Error('El worker de lenguaje no está disponible.');
  worker.postMessage({protocolVersion: 1, languageSessionId, seq: workerSequence++, command, requestId, payload});
}
function diagnostic(record) {
  if (!record || record.origin !== document?.language || !['info', 'warning', 'error'].includes(record.level) ||
      typeof record.code !== 'string' || !record.code.trim() || record.code.length > 64 ||
      typeof record.message !== 'string' || !record.message.trim() || record.message.length > 1024 ||
      Object.keys(record).some(key => !['level', 'code', 'message', 'origin', 'sourceLocation'].includes(key))) return null;
  const next = structuredClone(record);
  if (next.sourceLocation) {
    const item = next.sourceLocation;
    const lines = document.source.replace(/\r\n?/g, '\n').split('\n');
    if (Object.keys(item).some(key => !['documentId', 'line', 'column'].includes(key)) || item.documentId !== document.id ||
        !Number.isSafeInteger(item.line) || item.line < 1 || item.line > lines.length ||
        (item.column !== undefined && (!Number.isSafeInteger(item.column) || item.column < 1 || item.column > lines[item.line - 1].length + 1))) delete next.sourceLocation;
  }
  return next;
}
function startWorker() {
  stopWorker();
  const currentGeneration = workerGeneration;
  const workerGate = createLanguageChannelGate({languageSessionId});
  workerSequence = 0;
  worker = new Worker('/app/targets/text/language-worker.mjs', {type: 'module'});
  worker.onmessage = event => {
    const message = event.data;
    if (currentGeneration !== workerGeneration || !workerGate.accept(message)) return;
    if (message.type === 'result' || message.type === 'error') {
      if (!pending.has(message.requestId)) return;
      pending.delete(message.requestId);
      if (message.type === 'error') {
        const record = diagnostic(message.diagnostic);
        send({type: 'error', requestId: message.requestId, error: String(message.error).slice(0,1024), ...(record ? {diagnostic: record} : {})});
      } else {
        if (message.result?.prepared === true && phase === 'preparing') phase = 'prepared';
        send({type: 'result', requestId: message.requestId, result: message.result});
      }
      return;
    }
    if (phase !== 'executing' || !sameScope(message)) return;
    if (message.type === 'program-ready') {
      listening = true; armWatchdog();
      send({type: 'program-ready', ...scope}); return;
    }
    if (message.type === 'invocation-result') {
      if (!invocations.has(message.invocationId)) return;
      invocations.delete(message.invocationId); armWatchdog();
      if (bytes(message.result ?? null) > languageRuntimeLimits.rpcBytes) return;
      send({type: 'invocation-result', ...scope, invocationId: message.invocationId,
        ...(typeof message.error === 'string' ? {error: message.error.slice(0,1024)} : {result: message.result ?? null})});
      return;
    }
    if (message.type === 'rpc') {
      try {
        if (!Number.isSafeInteger(message.requestId) || message.requestId < 1 || rpcPending.has(message.requestId)) return;
        const call = validateLanguageRPC(message.method, message.args,{profile});
        if (rpcPending.size >= languageRuntimeLimits.pendingRPC) {
          forward('rpc-result', 0, {requestId: message.requestId, error: 'Límite de solicitudes pendientes.'});
          return;
        }
        rpcPending.add(message.requestId);
        send({type: 'rpc', requestId: message.requestId, ...scope, ...call});
      } catch (error) {
        if (Number.isSafeInteger(message.requestId)) forward('rpc-result', 0, {requestId: message.requestId, error: String(error.message).slice(0,1024)});
      }
      return;
    }
    if (message.type === 'diagnostic') {
      const record = diagnostic(message.diagnostic);
      if (!record) return;
      const terminal = record.level === 'error' && ['LANGUAGE_ERROR', 'LANGUAGE_TIME_LIMIT', 'LANGUAGE_WORKER_FAILED'].includes(record.code);
      if (terminal && !terminalDiagnostic) { terminalDiagnostic = true; send({type: 'diagnostic', ...scope, diagnostic: record}); return; }
      if (++logs <= languageRuntimeLimits.logs) send({type: 'diagnostic', ...scope, diagnostic: record});
      else if (!warned) {
        warned = true;
        send({type: 'diagnostic', ...scope, diagnostic: {level: 'warning', code: 'LANGUAGE_LOG_LIMIT', origin: document.language,
          message: 'Se alcanzó el límite de mensajes de esta ejecución.'}});
      }
      return;
    }
    if (message.type === 'execution-complete') {
      const finishedScope = scope;
      const result = message.result?.error ? {completed: false, error: String(message.result.error).slice(0,1024)} : {completed: true};
      stopWorker(); phase = 'completed';
      send({type: 'execution-complete', ...finishedScope, result});
    }
  };
  worker.onerror = event => {
    if (currentGeneration !== workerGeneration) return;
    const error = String(event.message || 'No se pudo cargar el runtime de texto.').slice(0,1024);
    for (const requestId of pending) send({type: 'error', requestId, error});
    if (phase === 'executing') {
      send({type: 'diagnostic', ...scope, diagnostic: {level: 'error', code: 'LANGUAGE_WORKER_FAILED', origin: document.language, message: error}});
      send({type: 'execution-complete', ...scope, result: {completed: false, error}});
    }
    stopWorker(); phase = 'error';
  };
}
function receive(message) {
  if (!shellGate.accept(message) || !Number.isSafeInteger(message.requestId) || message.requestId < 0) return;
  const payload = message.payload ?? {};
  try {
    if (message.command === 'prepare') {
      if (phase !== 'idle') throw new Error('El runtime ya tiene un documento.');
      document = validateLanguageDocument(payload.document);
      profile=payload.profile===undefined?null:resolveLanguageProfile(payload.profile);
      startWorker(); phase = 'preparing';
      pending.add(message.requestId);
      forward('prepare', message.requestId, {document,...(profile?{profile:languageProfileMetadata(profile)}:{})});
    } else if (message.command === 'execute') {
      if (phase !== 'prepared') throw new Error('El documento no está preparado.');
      scope = validateLanguageScope(payload);
      if (scope.documentId !== document.id) throw new Error('Documento sustituido.');
      phase = 'executing'; logs = 0; warned = false; terminalDiagnostic = false;
      pending.add(message.requestId);
      forward('execute', message.requestId, scope);
      initialDeadline = Date.now() + languageRuntimeLimits.executionMs; armWatchdog();
    } else if (message.command === 'invoke') {
      if (phase !== 'executing' || !sameScope(payload)) throw new Error('Stale text invocation');
      const {runnerSessionId,documentId,...capabilityPayload}=payload;
      const invocation = profile?validateCapabilityInvocation(capabilityPayload,profile):validateTextInvocation({invocationId: payload.invocationId, handlerId: payload.handlerId, targetId: payload.targetId, revision: payload.revision});
      if (invocations.size >= 64 || invocations.has(invocation.invocationId)) throw new Error('Cupo de invocaciones agotado.');
      invocations.set(invocation.invocationId, Date.now() + languageRuntimeLimits.executionMs); armWatchdog();
      pending.add(message.requestId);
      forward('invoke', message.requestId, {...scope, ...invocation});
    } else if (message.command === 'cancel-invocation') {
      if (phase !== 'executing' || !sameScope(payload)) throw new Error('Stale text cancellation');
      validateTextProgramId(payload.invocationId);
      invocations.delete(payload.invocationId); armWatchdog();
      pending.add(message.requestId);
      forward('cancel-invocation', message.requestId, {...scope, invocationId: payload.invocationId});
    } else if (message.command === 'rpc-result') {
      const accepted = phase === 'executing' && rpcPending.has(payload.requestId);
      if (accepted) {
        rpcPending.delete(payload.requestId);
        if (typeof payload.error === 'string') forward('rpc-result', 0, {requestId: payload.requestId, error: payload.error.slice(0,1024)});
        else if (bytes(payload.result ?? null) > languageRuntimeLimits.rpcBytes) forward('rpc-result', 0, {requestId: payload.requestId, error: 'Respuesta GG demasiado grande.'});
        else forward('rpc-result', 0, {requestId: payload.requestId, result: payload.result ?? null});
      }
      send({type: 'result', requestId: message.requestId, result: {accepted}});
    } else if (message.command === 'shutdown') {
      stopWorker(); phase = 'stopped'; scope = null;
      send({type: 'result', requestId: message.requestId, result: {closed: true}});
    } else throw new Error('Comando de lenguaje desconocido.');
  } catch (error) { send({type: 'error', requestId: message.requestId, error: String(error.message).slice(0,1024)}); }
}
window.addEventListener('message', event => {
  const message = event.data;
  if (port || event.origin !== config.shellOrigin || event.source !== parent ||
      message?.type !== 'language-connect' || message.protocolVersion !== 1 ||
      message.languageSessionId !== languageSessionId || event.ports.length !== 1) return;
  port = event.ports[0]; port.onmessage = event => receive(event.data); port.start();
});
window.addEventListener('pagehide', stopWorker);
parent.postMessage({type: 'language-ready', protocolVersion: 1, languageSessionId}, config.shellOrigin);
