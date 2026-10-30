export {createCapabilityProgramSession} from './capability-session.mjs';
import {validateTextProgram, validateTextProgramTarget, textProgramLimits} from '../../contracts/text-program.mjs';

// Callback registrations and cancellation tokens are control data, never scene state.
export function createTextProgramSession({rpc, invoke, cancel = () => {}, release = () => {}, onReady = () => {}}) {
  let variables = [];
  let handlers = [];
  let currentObject;
  let started = false;
  let alive = true;
  let closeRun = null;
  const active = new Map();
  const ensureOpen = () => { if (!alive) throw new Error('Session stopped'); };
  function configure(config) {
    ensureOpen();
    if (started || handlers.length || !config || Object.keys(config).join(',') !== 'variables') throw new Error('Configura el programa antes de registrar eventos.');
    variables = validateTextProgram({variables: config.variables, handlers: []}).variables;
  }
  // The object of the next registrations (scene2d-multi-sprite 2.2); hero until set.
  function object(id) {
    ensureOpen();
    if (started) throw new Error('Los eventos ya están activos.');
    currentObject = validateTextProgramTarget(id);
  }
  function register(event, options, callback) {
    ensureOpen();
    if (started) throw new Error('Los eventos ya están activos.');
    const id = 'handler-' + handlers.length;
    const descriptor = {id, event, ...options, ...(currentObject === undefined || currentObject === 'hero' ? {} : {targetId: currentObject})};
    validateTextProgram({variables, handlers: [...handlers.map(item => item.descriptor), descriptor]});
    handlers.push({descriptor, callback});
    return id;
  }
  async function run() {
    ensureOpen();
    if (started) throw new Error('El programa ya se inició.');
    started = true;
    const result = await rpc('program.start', [{variables, handlers: handlers.map(item => item.descriptor)}]);
    ensureOpen();
    if (!handlers.length) return result;
    onReady();
    return new Promise((resolve, reject) => { closeRun = reject; });
  }
  function call(invocationId, method, args) {
    ensureOpen();
    if (!active.has(invocationId)) throw new Error('Text invocation cancelled');
    return rpc('program.' + method, [invocationId, ...args]);
  }
  async function dispatch(data) {
    ensureOpen();
    if (!started || !data || typeof data.invocationId !== 'string' || data.invocationId.length > 128 ||
        typeof data.targetId !== 'string' || data.targetId.length > 128 || active.has(data.invocationId) ||
        active.size >= (textProgramLimits.invocations ?? 64)) throw new Error('Invocación de texto no válida o cupo agotado.');
    const handler = handlers.find(item => item.descriptor.id === data.handlerId);
    if (!handler) throw new Error('Handler de texto desconocido.');
    let cancelPromise;
    const cancelled = new Promise(resolve => { cancelPromise = resolve; });
    active.set(data.invocationId, {cancelPromise});
    try {
      return await Promise.race([
        Promise.resolve().then(() => { if (!active.has(data.invocationId)) return; return invoke(handler.callback, data); }).then(() => ({completed: true})),
        cancelled.then(() => ({cancelled: true}))
      ]);
    } catch (error) {
      if (!active.has(data.invocationId) || !alive || error?.name === 'CancelledError' || /Text invocation cancelled/.test(String(error?.message))) return {cancelled: true};
      throw error;
    } finally { active.delete(data.invocationId); }
  }
  function cancelInvocation(id) {
    const invocation = active.get(id);
    if (!invocation) return;
    active.delete(id);
    cancel(id);
    invocation.cancelPromise();
  }
  function dispose() {
    if (!alive) return;
    alive = false;
    for (const id of active.keys()) cancelInvocation(id);
    closeRun?.(new Error('Session stopped'));
    for (const handler of handlers) release(handler.callback);
    handlers = [];
  }
  return Object.freeze({configure, object, register, run, call, dispatch, cancelInvocation, dispose,
    target: () => currentObject ?? 'hero',
    assertLegacyAllowed: method => { if (started && !['scene.get', 'sprite.get', 'variables.get'].includes(method)) throw new Error('Usa el contexto ctx para modificar un programa de eventos.'); },
    listening: () => alive && started && handlers.length > 0});
}

export const contextOperations = Object.freeze({
  move: 1, wait: 1, setVariable: 2, changeVariable: 2, compare: 3,
  broadcastAndWait: 1, createClone: 0, deleteClone: 0, playSound: 2,
  stopSounds: 0, setCostume: 1,
  // gg.sprites@0.2.0 (E1); frame is the core yield inserted in while loops.
  turnRight: 1, turnLeft: 1, pointInDirection: 1, goTo: 2, glide: 3, changeX: 1, setX: 1, changeY: 1, setY: 1,
  bounceOnEdge: 0, say: 1, think: 1, sayFor: 2, thinkFor: 2, nextCostume: 0, changeSize: 1, setSize: 1,
  show: 0, hide: 0, stopAll: 0, frame: 0
});
export function variableReference(id) {
  if (typeof id !== 'string' || !id.trim() || id.length > 128 || ['__proto__', 'constructor', 'prototype'].includes(id)) throw new Error('ID de variable no válido.');
  return {variableId: id};
}
