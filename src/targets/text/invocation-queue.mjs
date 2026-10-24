import {textProgramLimits, validateTextInvocation} from '../../contracts/text-program.mjs';

// Owns only queued/active invocation lifetimes; engines and timers are injected.
export function createInvocationQueue({
  invoke,
  cancelInvocation = () => {},
  onResult = () => {},
  onError = () => {},
  validate = validateTextInvocation,
  schedule = callback => setTimeout(callback, 0),
  cancelTimer = timer => clearTimeout(timer)
}) {
  for (const callback of [invoke, cancelInvocation, onResult, onError, validate, schedule, cancelTimer]) {
    if (typeof callback !== 'function') throw new TypeError('Invocation queue callbacks must be functions');
  }
  const entries = new Map();
  let closed = false;
  const current = entry => !closed && entries.get(entry.data.invocationId) === entry;
  function complete(entry, failed, value) {
    if (!current(entry)) return;
    entries.delete(entry.data.invocationId);
    if (failed) onError({...entry.data}, value);
    else onResult({...entry.data}, value);
  }
  function start(entry) {
    if (!current(entry) || entry.phase !== 'queued') return;
    entry.phase = 'active';
    entry.timer = null;
    // Cancellation can also arrive after the timer but before this microtask.
    Promise.resolve().then(() => {
      if (!current(entry)) return;
      return invoke({...entry.data});
    }).then(result => complete(entry, false, result), error => complete(entry, true, error));
  }
  function enqueue(invocation) {
    if (closed) throw new Error('Session stopped');
    const data = validate(invocation);
    if (entries.has(data.invocationId) || entries.size >= textProgramLimits.invocations) {
      throw new Error('Invocación duplicada o cupo de 64 invocaciones agotado.');
    }
    const entry = {data, phase: 'queued', timer: null};
    // Reserve before scheduling so a later cancellation always finds the entry.
    entries.set(data.invocationId, entry);
    try {
      const timer = schedule(() => start(entry));
      if (entry.phase === 'queued' && current(entry)) entry.timer = timer;
    } catch (error) {
      entries.delete(data.invocationId);
      throw error;
    }
    return true;
  }
  function cancel(id) {
    const entry = entries.get(id);
    if (!entry) return false;
    // Remove first: synchronous engine completion/cancellation cannot publish.
    entries.delete(id);
    if (entry.phase === 'queued') cancelTimer(entry.timer);
    else {
      // Cancellation must not prevent disposal of the remaining invocations.
      try { cancelInvocation(id); } catch { /* The queue is already invalidated. */ }
    }
    return true;
  }
  function dispose() {
    if (closed) return;
    for (const id of [...entries.keys()]) cancel(id);
    closed = true;
  }
  return Object.freeze({enqueue, cancel, dispose});
}
