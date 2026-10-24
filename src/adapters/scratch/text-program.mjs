import {
  textProgramLimits, validateTextProgram, validateTextProgramRPC,
  validateTextProgramNumber, validateTextInvocationResult
} from '../../contracts/text-program.mjs';

// A native hat suspends on one private Promise primitive. The interpreter owns
// its callback/control flow; Scratch retains targets, variables and scheduling.
export function createTextProgram({getVM, getRevision, onInvocation = () => {}, onCancel = () => {}, onError = () => {}}) {
  let runtime = null;
  let active = false;
  let revision = null;
  let sequence = 0;
  let targetSequence = 0;
  let timer = null;
  let pendingOperations = 0;
  let declarations = new Map();
  let handlers = new Map();
  let targetIds = new WeakMap();
  const invocations = new Map();
  const checks = new Set();
  const fail = message => { throw new Error(`GG text program: ${message}`); };
  const targetId = target => {
    if (!targetIds.has(target)) targetIds.set(target, `text-target-${++targetSequence}`);
    return targetIds.get(target);
  };
  const isLive = record => active && revision === getRevision() && invocations.get(record.id) === record &&
    runtime.targets.includes(record.target) && runtime.isActiveThread(record.thread);
  function ensureTimer() {
    if (!timer && (invocations.size || checks.size)) {
      timer = setInterval(sweep, 16);
      timer.unref?.();
    }
  }
  function clearTimerIfIdle() {
    if (timer && !invocations.size && !checks.size) { clearInterval(timer); timer = null; }
  }
  function retire(record, reason, notify = true) {
    if (invocations.get(record.id) !== record) return;
    invocations.delete(record.id);
    for (const cancel of [...record.waits]) cancel(reason);
    record.resolve();
    if (notify) onCancel({invocationId: record.id, reason, revision: record.revision});
    clearTimerIfIdle();
  }
  function sweep() {
    for (const record of [...invocations.values()]) {
      if (!isLive(record)) retire(record,
        revision !== getRevision() ? 'scope-changed' : !runtime.targets.includes(record.target) ? 'target-deleted' : 'restarted');
    }
    for (const check of [...checks]) check();
    clearTimerIfIdle();
  }
  function requireInvocation(id) {
    sweep();
    const record = invocations.get(id);
    if (!record || !isLive(record)) fail('stale invocation');
    return record;
  }
  function cancelAll(reason) {
    for (const record of [...invocations.values()]) retire(record, reason);
    checks.clear();
    if (timer) clearInterval(timer);
    timer = null;
  }
  const onStopAll = () => cancelAll('stopped');
  const onTargetRemoved = target => {
    for (const record of [...invocations.values()]) if (record.target === target) retire(record, 'target-deleted');
  };
  function attach() {
    const nextRuntime = getVM()?.runtime;
    if (!nextRuntime) fail('scene unavailable');
    if (runtime === nextRuntime) return;
    if (runtime) {
      runtime.removeListener('PROJECT_STOP_ALL', onStopAll);
      runtime.removeListener('targetWasRemoved', onTargetRemoved);
      if (runtime._primitives.ggtext_callback === dispatch) delete runtime._primitives.ggtext_callback;
    }
    runtime = nextRuntime;
    runtime._primitives.ggtext_callback = dispatch;
    runtime.on('PROJECT_STOP_ALL', onStopAll);
    runtime.on('targetWasRemoved', onTargetRemoved);
  }
  function dispatch(args, util) {
    if (!active || revision !== getRevision() || !handlers.has(args.HANDLER)) return;
    sweep();
    if (invocations.size >= textProgramLimits.invocations) {
      onError('TEXT_INVOCATION_LIMIT', 'Se alcanzó el límite de 64 callbacks activos.');
      return;
    }
    const id = `text-invocation-${++sequence}`;
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    const record = {id, revision, target: util.target, thread: util.thread, resolve, waits: new Set()};
    invocations.set(id, record);
    ensureTimer();
    try {
      onInvocation({invocationId: id, handlerId: args.HANDLER, targetId: targetId(util.target), revision});
    } catch (error) {
      retire(record, 'delivery-failed');
      onError('TEXT_CALLBACK_FAILED', String(error?.message ?? error));
    }
    return promise;
  }
  function block(id, opcode, {next = null, parent = null, fields = {}, topLevel = false} = {}) {
    return {id, opcode, next, parent, inputs: {}, fields, shadow: false, topLevel, x: 20, y: 20};
  }
  function start(descriptor) {
    // Finish validation and construct the replacement block containers before
    // touching active threads or mutable VM data.
    const program = validateTextProgram(descriptor);
    attach();
    const hero = runtime.getSpriteTargetByName('hero');
    const stage = runtime.getTargetForStage();
    if (!hero?.isOriginal || !stage) fail('scene unavailable');
    const nextBlocks = new hero.blocks.constructor(runtime);
    const nextStageBlocks = new stage.blocks.constructor(runtime);
    const nextHandlers = new Map();
    for (const [index, handler] of program.handlers.entries()) {
      const hatId = `ggtext-hat-${index}`; const bodyId = `ggtext-callback-${index}`;
      const opcode = {start: 'event_whenflagclicked', key: 'event_whenkeypressed', click: 'event_whenthisspriteclicked',
        message: 'event_whenbroadcastreceived', clone: 'control_start_as_clone'}[handler.event];
      const fields = handler.event === 'key' ? {KEY_OPTION: {name: 'KEY_OPTION', value: handler.key}} :
        handler.event === 'message' ? {BROADCAST_OPTION: {name: 'BROADCAST_OPTION', value: handler.message}} : {};
      nextBlocks.createBlock(block(hatId, opcode, {next: bodyId, fields, topLevel: true}));
      nextBlocks.createBlock(block(bodyId, 'ggtext_callback', {parent: hatId,
        fields: {HANDLER: {name: 'HANDLER', value: handler.id}}}));
      nextHandlers.set(handler.id, handler);
    }
    active = false;
    cancelAll('reconfigured');
    getVM().stopAll();
    hero.blocks = nextBlocks; hero.sprite.blocks = nextBlocks;
    stage.blocks = nextStageBlocks; stage.sprite.blocks = nextStageBlocks;
    hero.variables = {}; stage.variables = {};
    for (const variable of program.variables) {
      const owner = variable.scope === 'global' ? stage : hero;
      owner.createVariable(variable.id, variable.name, '', false);
      owner.variables[variable.id].value = variable.initialValue;
    }
    for (const [index, message] of [...new Set(program.handlers.filter(handler => handler.event === 'message').map(handler => handler.message))].entries()) {
      let id = `ggtext-message-${index}`;
      while (program.variables.some(variable => variable.id === id)) id += '-';
      stage.createVariable(id, message, 'broadcast_msg', false);
    }
    declarations = new Map(program.variables.map(variable => [variable.id, variable]));
    handlers = nextHandlers; targetIds = new WeakMap();
    revision = getRevision(); active = true;
    targetId(hero);
    getVM().greenFlag();
    return {started: true};
  }
  function model(record, id) {
    const declaration = declarations.get(id);
    if (!declaration) fail('unknown variable');
    const owner = declaration.scope === 'global' ? runtime.getTargetForStage() : record.target;
    const variable = owner.variables[id];
    if (!variable || variable.type !== '') fail('variable unavailable');
    return variable;
  }
  function expression(record, value) {
    return validateTextProgramNumber(typeof value === 'number' ? value : Number(model(record, value.variableId).value));
  }
  function deferred(record, setup) {
    if (pendingOperations >= textProgramLimits.pendingEvents) fail('pending operation limit');
    return new Promise((resolve, reject) => {
      let settled = false; let cleanup = null;
      const finish = (error, value) => {
        if (settled) return;
        settled = true; pendingOperations--; record.waits.delete(cancel);
        cleanup?.();
        if (error) reject(error); else resolve(value);
        clearTimerIfIdle();
      };
      const cancel = reason => finish(new Error(`GG text program: invocation cancelled (${reason})`));
      record.waits.add(cancel); pendingOperations++;
      try {
        cleanup = setup(value => finish(null, value), error => finish(error)) ?? null;
        if (settled) cleanup?.();
      } catch (error) { finish(error); }
    });
  }
  function call(method, rawArgs, requestRevision) {
    const {args} = validateTextProgramRPC(method, rawArgs);
    if (requestRevision !== getRevision()) fail('stale revision');
    if (method === 'program.start') return start(args[0]);
    if (method === 'program.stop') { stop(); getVM()?.stopAll(); return {stopped: true}; }
    const record = requireInvocation(args[0]);
    const util = {target: record.target};
    switch (method) {
      case 'program.move': {
        const steps = expression(record, args[1]);
        runtime._primitives.motion_movesteps({STEPS: steps}, util);
        return {x: record.target.x, y: record.target.y};
      }
      case 'program.wait': return deferred(record, resolve => {
        const timeout = setTimeout(() => resolve(null), args[1] * 1000);
        return () => clearTimeout(timeout);
      });
      case 'program.setVariable': case 'program.changeVariable': {
        const variable = model(record, args[1]); const value = expression(record, args[2]);
        // Resolve both operands and validate the result before committing a write.
        const result = method === 'program.setVariable' ? value : validateTextProgramNumber(Number(variable.value)) + value;
        validateTextProgramNumber(result); variable.value = result;
        return result;
      }
      case 'program.compare': {
        const left = expression(record, args[2]); const right = expression(record, args[3]);
        return args[1] === 'EQ' ? left === right : args[1] === 'LT' ? left < right : left > right;
      }
      case 'program.broadcastAndWait': return deferred(record, resolve => {
        // Match the native primitive's captured-thread membership semantics.
        // A restarted receiver is a different Thread and does not prolong an
        // earlier broadcast's wait. Never wait on a global active-thread count.
        const started = runtime.startHats('event_whenbroadcastreceived', {BROADCAST_OPTION: args[1]});
        sweep();
        if (!isLive(record)) return;
        if (!started.length) { resolve(null); return; }
        const check = () => {
          if (!started.some(thread => runtime.threads.includes(thread))) resolve(null);
        };
        checks.add(check); ensureTimer(); check();
        return () => checks.delete(check);
      });
      case 'program.createClone': {
        if (runtime.targets.filter(target => !target.isOriginal && !target.isStage).length >= textProgramLimits.clones) fail('clone limit');
        const before = new Set(runtime.targets);
        runtime._primitives.control_create_clone_of({CLONE_OPTION: '_myself_'}, util);
        const clone = runtime.targets.find(target => !before.has(target) && target.sprite === record.target.sprite);
        if (!clone) fail('clone unavailable');
        return {created: true, targetId: targetId(clone)};
      }
      case 'program.deleteClone': {
        if (record.target.isOriginal) return false;
        // The deleting callback receives true so native generated code can
        // return. Its token is already dead; every later command is rejected.
        retire(record, 'target-deleted', false);
        for (const other of [...invocations.values()]) if (other.target === record.target) retire(other, 'target-deleted');
        runtime._primitives.control_delete_this_clone({}, util);
        return true;
      }
      case 'program.setCostume': {
        if (!record.target.getCostumes().some(costume => costume.name === args[1])) fail('costume unavailable');
        runtime._primitives.looks_switchcostumeto({COSTUME: args[1]}, util);
        return {costume: args[1]};
      }
      case 'program.playSound': {
        if (!record.target.sprite.sounds.some(sound => sound.name === args[1]) || !record.target.sprite.soundBank) fail('sound unavailable');
        if (!args[2]) { runtime._primitives.sound_play({SOUND_MENU: args[1]}, util); return {started: true}; }
        return deferred(record, (resolve, reject) => {
          Promise.resolve(runtime._primitives.sound_playuntildone({SOUND_MENU: args[1]}, util)).then(() => resolve(null), reject);
        });
      }
      case 'program.stopSounds': runtime._primitives.sound_stopallsounds({}, util); return {stopped: true};
    }
  }
  function complete(payload) {
    const result = validateTextInvocationResult(payload);
    if (result.revision !== getRevision() || result.revision !== revision) return {accepted: false};
    sweep();
    const record = invocations.get(result.invocationId);
    if (!record || !isLive(record)) return {accepted: false};
    retire(record, 'completed', false);
    return {accepted: true};
  }
  function stop(reason = 'stopped') { active = false; cancelAll(reason); }
  function dispose() {
    stop();
    if (runtime) {
      runtime.removeListener('PROJECT_STOP_ALL', onStopAll);
      runtime.removeListener('targetWasRemoved', onTargetRemoved);
      if (runtime._primitives.ggtext_callback === dispatch) delete runtime._primitives.ggtext_callback;
    }
    runtime = null;
  }
  return Object.freeze({call, complete, stop, dispose});
}
