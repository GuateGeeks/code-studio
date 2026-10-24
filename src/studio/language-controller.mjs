import {resolveLanguageProfile,languageProfileMetadata,validateCapabilityInvocation} from '../contracts/capability-language.mjs';
import {validateTextInvocation, validateTextInvocationResult} from '../contracts/text-program.mjs';
import {createLanguageChannelGate, validateLanguageDocument, validateLanguageRPC, validateLanguageScope, languageRuntimeLimits} from '../contracts/language-runtime.mjs';

// The shell owns only authenticated DTO transport. Engines stay in another origin.
export function createLanguageController({origin, releaseBase = '/', getScope, getDocument, rpc, onDiagnostic, onComplete = () => {}, onProgramReady = () => {}, completeInvocation = () => {}}) {
  let candidate = null;
  let active = null;
  let rejected = 0;
  function dispose(run) {
    if (!run || run.closed) return;
    run.closed = true;
    for (const pending of run.pending.values()) { clearTimeout(pending.timer); pending.reject(new Error('Session stopped')); }
    run.pending.clear();
    try { run.port?.postMessage({protocolVersion: 1, languageSessionId: run.id, seq: ++run.sequence, command: 'shutdown', requestId: ++run.requestId, payload: {}}); } catch {}
    run.port?.close();
    run.frame.remove(); // destroys its worker even when the interpreter cannot cooperate
    run.rejectReady(new Error('Session stopped'));
  }
  function stop({preserve} = {}) {
    if (active !== preserve) dispose(active);
    if (candidate !== preserve) dispose(candidate);
    active = active === preserve ? active : null;
    candidate = candidate === preserve ? candidate : null;
  }
  function current(run) {
    const scope = getScope();
    return !run.closed && !run.completed && active === run && run.scope &&
      scope.sessionId === run.scope.runnerSessionId && scope.revision === run.scope.revision;
  }
  function diagnostic(run, record, preparing = false) {
    if (run.closed || (!preparing && !current(run)) || (preparing && candidate !== run) ||
        !record || record.origin !== run.document.language ||
        !['info', 'warning', 'error'].includes(record.level) ||
        typeof record.code !== 'string' || !record.code.trim() || record.code.length > 64 ||
        typeof record.message !== 'string' || !record.message.trim() || record.message.length > 1024 ||
        Object.keys(record).some(key => !['level', 'code', 'message', 'origin', 'sourceLocation'].includes(key))) { rejected++; return; }
    const next = structuredClone(record);
    if (next.sourceLocation) {
      const location = next.sourceLocation;
      const document = getDocument(run.document.id);
      const lines = document?.source.replace(/\r\n?/g, '\n').split('\n');
      if (!location || Object.keys(location).some(key => !['documentId', 'line', 'column'].includes(key)) ||
          location.documentId !== run.document.id || !Number.isSafeInteger(location.line) || location.line < 1 ||
          !lines || location.line > lines.length || document.source !== run.document.source ||
          (location.column !== undefined && (!Number.isSafeInteger(location.column) || location.column < 1 || location.column > lines[location.line - 1].length + 1))) delete next.sourceLocation;
    }
    const terminal = next.level === 'error' && ['LANGUAGE_ERROR', 'LANGUAGE_TIME_LIMIT', 'LANGUAGE_WORKER_FAILED'].includes(next.code) && !run.terminalError;
    if (terminal) run.terminalError = true;
    if (++run.logs > languageRuntimeLimits.logs && !terminal) {
      if (run.logs === languageRuntimeLimits.logs + 1) onDiagnostic({level: 'warning', code: 'LANGUAGE_LOG_LIMIT', origin: run.document.language, message: 'Se alcanzó el límite de mensajes de esta ejecución.'});
      return;
    }
    onDiagnostic(next);
  }
  function send(run, command, payload, timeout = 60000) {
    if (run.closed || !run.port) return Promise.reject(new Error('Session stopped'));
    const requestId = ++run.requestId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { run.pending.delete(requestId); reject(new Error('El runtime de texto no respondió a tiempo.')); }, timeout);
      run.pending.set(requestId, {resolve, reject, timer});
      run.port.postMessage({protocolVersion: 1, languageSessionId: run.id, seq: ++run.sequence, requestId, command, payload});
    });
  }
  async function receive(run, message) {
    if (run.closed || !run.gate.accept(message)) { rejected++; return; }
    if (message.type === 'result' || message.type === 'error') {
      const pending = run.pending.get(message.requestId);
      if (!pending) { rejected++; return; }
      run.pending.delete(message.requestId); clearTimeout(pending.timer);
      if (message.type === 'error') {
        if (message.diagnostic) diagnostic(run, message.diagnostic, candidate === run && !run.scope);
        pending.reject(new Error(typeof message.error === 'string' ? message.error.slice(0,1024) : 'Error del runtime de texto'));
      } else pending.resolve(message.result);
      return;
    }
    if (message.type === 'diagnostic') {
      const preparing = !run.scope && candidate === run;
      if (!preparing && (!current(run) || message.runnerSessionId !== run.scope.runnerSessionId ||
          message.revision !== run.scope.revision || message.documentId !== run.document.id)) { rejected++; return; }
      if (message.documentId !== run.document.id) { rejected++; return; }
      diagnostic(run, message.diagnostic, preparing);
      return;
    }
    if (!current(run) || message.runnerSessionId !== run.scope.runnerSessionId ||
        message.revision !== run.scope.revision || message.documentId !== run.document.id) { rejected++; return; }
    if (message.type === 'program-ready') { onProgramReady(); return; }
    if (message.type === 'invocation-result') {
      if (!run.invocations.has(message.invocationId)) { rejected++; return; }
      const payload = validateTextInvocationResult({invocationId: message.invocationId, revision: run.scope.revision,
        ...(typeof message.error === 'string' ? {error: message.error} : {result: message.result ?? null})});
      run.invocations.delete(message.invocationId);
      await completeInvocation(payload, {sessionId: run.scope.runnerSessionId, revision: run.scope.revision}); return;
    }
    if (message.type === 'execution-complete') { run.completed = true; run.invocations.clear(); onComplete(message.result); return; }
    if (message.type !== 'rpc' || !Number.isSafeInteger(message.requestId) || run.inFlight >= languageRuntimeLimits.pendingRPC) { rejected++; return; }
    run.inFlight++;
    try {
      const {method, args} = validateLanguageRPC(message.method, message.args,{profile:run.profile});
      const result = await rpc(method, args, {sessionId: run.scope.runnerSessionId, revision: run.scope.revision});
      if (!current(run)) return;
      if (new TextEncoder().encode(JSON.stringify(result ?? null)).length > languageRuntimeLimits.rpcBytes) throw new Error('Respuesta GG demasiado grande');
      await send(run, 'rpc-result', {requestId: message.requestId, result});
    } catch (error) {
      if (current(run)) await send(run, 'rpc-result', {requestId: message.requestId, error: String(error.message).slice(0,1024)}).catch(() => {});
    } finally { run.inFlight--; }
  }
  window.addEventListener('message', event => {
    const run = candidate;
    const message = event.data;
    if (!run || run.closed || run.port || event.origin !== origin || event.source !== run.frame.contentWindow ||
        message?.type !== 'language-ready' || message.protocolVersion !== 1 || message.languageSessionId !== run.id) return;
    const channel = new MessageChannel();
    run.port = channel.port1;
    run.port.onmessage = event => { receive(run, event.data).catch(() => { rejected++; }); };
    run.port.start();
    run.frame.contentWindow.postMessage({type: 'language-connect', protocolVersion: 1, languageSessionId: run.id}, origin, [channel.port2]);
    run.resolveReady();
  });
  async function prepare(document,{profile=null}={}) {
    profile=profile===null?null:resolveLanguageProfile(profile);
    const validated = validateLanguageDocument(document);
    dispose(candidate);
    const run = {id: crypto.randomUUID(), profile, document: validated, pending: new Map(), sequence: 0, requestId: 0, logs: 0, inFlight: 0, closed: false, invocations: new Set()};
    run.gate = createLanguageChannelGate({languageSessionId: run.id});
    run.ready = new Promise((resolve, reject) => { run.resolveReady = resolve; run.rejectReady = reject; });
    run.ready.catch(() => {});
    run.frame = window.document.createElement('iframe');
    run.frame.title = 'Runtime de documento de texto';
    run.frame.hidden = true;
    run.frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    run.frame.referrerPolicy = 'no-referrer';
    run.frame.src = origin + releaseBase + '?session=' + run.id;
    candidate = run;
    window.document.body.append(run.frame);
    const timer = setTimeout(() => run.rejectReady(new Error('No se pudo cargar el runtime de texto.')), 15000);
    try {
      await run.ready;
      await send(run, 'prepare', {document: validated,...(profile?{profile:languageProfileMetadata(profile)}:{})});
      if (candidate !== run || run.closed) throw new Error('Session stopped');
      return run;
    } catch (error) {
      dispose(run);
      if (candidate === run) candidate = null;
      throw error;
    } finally { clearTimeout(timer); }
  }
  async function execute(run, scope) {
    validateLanguageScope(scope);
    if (candidate !== run || run.closed || scope.documentId !== run.document.id) throw new Error('Session stopped');
    dispose(active);
    candidate = null; active = run; run.scope = {...scope};
    return send(run, 'execute', scope);
  }
  async function invoke(message) {
    const run = active;
    if (!run || !current(run) || message.sessionId !== run.scope.runnerSessionId || message.revision !== run.scope.revision) return false;
    const invocation = run.profile?validateCapabilityInvocation({version:message.version,invocationId:message.invocationId,handlerId:message.handlerId,targetId:message.targetId,revision:message.revision,event:message.event},run.profile):validateTextInvocation({invocationId: message.invocationId, handlerId: message.handlerId, targetId: message.targetId, revision: message.revision});
    if (run.invocations.size >= 64 || run.invocations.has(invocation.invocationId)) return false;
    run.invocations.add(invocation.invocationId);
    try { await send(run, 'invoke', {...run.scope, ...invocation}); }
    catch (error) {
      if (current(run) && run.invocations.delete(invocation.invocationId)) await completeInvocation({invocationId: invocation.invocationId, revision: run.scope.revision, error: String(error.message).slice(0,1024)}, {sessionId: run.scope.runnerSessionId, revision: run.scope.revision});
    }
    return true;
  }
  function cancelInvocation(message) {
    const run = active;
    if (!run || !current(run) || message.sessionId !== run.scope.runnerSessionId || message.revision !== run.scope.revision || !run.invocations.delete(message.invocationId)) return false;
    send(run, 'cancel-invocation', {...run.scope, invocationId: message.invocationId}).catch(() => {}); return true;
  }
  function cancelPreparation() { dispose(candidate); candidate = null; }
  return Object.freeze({prepare, execute, stop, cancelPreparation, invoke, cancelInvocation, document:id=>{const run=[candidate,active].find(item=>item&&!item.closed&&item.document.id===id);return run?structuredClone(run.document):null;}, state: () => ({active: active?.id ?? null, candidate: candidate?.id ?? null, rejected})});
}
