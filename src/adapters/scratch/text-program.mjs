import {scratchSceneTargetName} from './scene-target-names.mjs';
import {
  textProgramLimits, validateTextProgram, validateTextProgramRPC,
  validateTextProgramNumber, validateTextInvocationResult
} from '../../contracts/text-program.mjs';
import {scene2DStageAllows} from '../../contracts/scene2d-objects.mjs';
import {scene2DObjectIdentifiers} from '../../contracts/scene2d-identifiers.mjs';
import {languageTables} from '../../packs/language-tables.mjs';

// Operations a stage callback may use (scene2d-multi-sprite 2.2): the actions of
// the one stage rule, plus the control calls every object has. A barrier of its
// own: an API1 document could reach here without the translators.
const stageOperations = new Set(['program.setVariable', 'program.changeVariable', 'program.compare', 'program.frame',
  ...languageTables['gg.sprites@0.3.0'].filter(entry => entry.kind === 'call' && scene2DStageAllows(entry.lower.ir)).map(entry => 'program.' + entry.ctx)]);
const singleInput = Object.freeze({
  'program.turnRight': ['motion_turnright', 'DEGREES'], 'program.turnLeft': ['motion_turnleft', 'DEGREES'],
  'program.pointInDirection': ['motion_pointindirection', 'DIRECTION'], 'program.changeX': ['motion_changexby', 'DX'],
  'program.setX': ['motion_setx', 'X'], 'program.changeY': ['motion_changeyby', 'DY'], 'program.setY': ['motion_sety', 'Y'],
  'program.changeSize': ['looks_changesizeby', 'CHANGE'], 'program.setSize': ['looks_setsizeto', 'SIZE']
});
// A native hat suspends on one private Promise primitive. The interpreter owns
// its callback/control flow; Scratch retains targets, variables and scheduling.
// getScene: the sprites ({id, name}) and backdrops ({id, label}) of the loaded
// project, because text names them as the student reads them.
export function createTextProgram({getVM, getRevision, getScene = () => null, onInvocation = () => {}, onCancel = () => {}, onError = () => {}}) {
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
    // Each handler's hats go to its object; every object starts without blocks.
    const stage = runtime.getTargetForStage();
    if (!stage) fail('scene unavailable');
    const targetOf = id => {
      const target = id === 'stage' ? stage : runtime.getSpriteTargetByName(scratchSceneTargetName(id ?? 'hero'));
      if (!target || (target !== stage && !target.isOriginal)) fail('scene unavailable');
      return target;
    };
    // Every object resolves before the VM is touched.
    // Without handlers there may be no hero either (a project can delete it).
    const first = program.handlers.length ? targetOf(program.handlers[0].targetId) : runtime.getSpriteTargetByName('hero') ?? stage;
    for (const item of [...program.handlers, ...program.variables.filter(variable => variable.scope !== 'global')]) targetOf(item.targetId);
    const originals = runtime.targets.filter(target => target === stage || target.isOriginal);
    const replaced = new Map(originals.map(target => [target, new target.blocks.constructor(runtime)]));
    const nextHandlers = new Map();
    for (const [index, handler] of program.handlers.entries()) {
      const hatId = `ggtext-hat-${index}`; const bodyId = `ggtext-callback-${index}`;
      const owner = targetOf(handler.targetId), nextBlocks = replaced.get(owner);
      const opcode = {start: 'event_whenflagclicked', key: 'event_whenkeypressed', click: owner === stage ? 'event_whenstageclicked' : 'event_whenthisspriteclicked',
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
    for (const [target, blocks] of replaced) { target.blocks = blocks; target.sprite.blocks = blocks; target.variables = {}; }
    for (const variable of program.variables) {
      const holder = variable.scope === 'global' ? stage : targetOf(variable.targetId);
      holder.createVariable(variable.id, variable.name, '', false);
      holder.variables[variable.id].value = variable.initialValue;
    }
    for (const [index, message] of [...new Set(program.handlers.filter(handler => handler.event === 'message').map(handler => handler.message))].entries()) {
      let id = `ggtext-message-${index}`;
      while (program.variables.some(variable => variable.id === id)) id += '-';
      stage.createVariable(id, message, 'broadcast_msg', false);
    }
    declarations = new Map(program.variables.map(variable => [variable.id, variable]));
    handlers = nextHandlers; targetIds = new WeakMap();
    revision = getRevision(); active = true;
    targetId(first);
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
    if (record.target.isStage && !stageOperations.has(method)) fail(`stage cannot ${method.slice('program.'.length)}`);
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
      // gg.sprites@0.2.0 (E1): the same VM primitives the blocks lower to.
      case 'program.turnRight': case 'program.turnLeft': case 'program.pointInDirection':
      case 'program.changeX': case 'program.setX': case 'program.changeY': case 'program.setY':
      case 'program.changeSize': case 'program.setSize': {
        const [opcode, input] = singleInput[method];
        runtime._primitives[opcode]({[input]: expression(record, args[1])}, util);
        return state(record.target);
      }
      case 'program.goTo':
        runtime._primitives.motion_gotoxy({X: expression(record, args[1]), Y: expression(record, args[2])}, util);
        return state(record.target);
      case 'program.bounceOnEdge': runtime._primitives.motion_ifonedgebounce({}, util); return state(record.target);
      // gg.sprites@0.3.0: the primitives the blocks lower to (motion_goto, looks_switchbackdropto).
      case 'program.goToObject': runtime._primitives.motion_goto({TO: scratchSceneTargetName(objectOf(args[1]))}, util); return state(record.target);
      case 'program.goToRandom': runtime._primitives.motion_goto({TO: '_random_'}, util); return state(record.target);
      case 'program.setBackdrop': runtime._primitives.looks_switchbackdropto({BACKDROP: backdropOf(args[1])}, util); return {changed: true};
      case 'program.nextBackdrop': runtime._primitives.looks_nextbackdrop({}, util); return {changed: true};
      case 'program.show': case 'program.hide': case 'program.nextCostume':
        runtime._primitives[{'program.show': 'looks_show', 'program.hide': 'looks_hide', 'program.nextCostume': 'looks_nextcostume'}[method]]({}, util);
        return state(record.target);
      case 'program.say': case 'program.think':
        runtime._primitives[method === 'program.say' ? 'looks_say' : 'looks_think']({MESSAGE: message(record, args[1])}, util);
        return {said: true};
      case 'program.sayFor': case 'program.thinkFor': {
        const text = message(record, args[1]);
        return deferred(record, (resolve, reject) => {
          Promise.resolve(runtime._primitives[method === 'program.sayFor' ? 'looks_sayforsecs' : 'looks_thinkforsecs']({MESSAGE: text, SECS: args[2]}, util)).then(() => resolve(null), reject);
        });
      }
      // The VM glide keeps its timer in the stack frame and yields each frame:
      // drive the same primitive once per VM step until it stops yielding.
      case 'program.glide': return deferred(record, resolve => {
        const frame = {target: record.target, stackFrame: {}, yielded: false, yield() { this.yielded = true; }};
        const step = () => { frame.yielded = false; runtime._primitives.motion_glidesecstoxy({SECS: args[1], X: expression(record, args[2]), Y: expression(record, args[3])}, frame); return !frame.yielded; };
        if (step()) { resolve(state(record.target)); return; }
        let seen = runtime._lastStepDoneThreads;
        const check = () => {
          if (runtime._lastStepDoneThreads === seen) return;
          seen = runtime._lastStepDoneThreads;
          if (step()) resolve(state(record.target));
        };
        checks.add(check); ensureTimer();
        return () => checks.delete(check);
      });
      // Core yield of while loops (Scratch loops yield once per frame).
      case 'program.frame': return deferred(record, resolve => {
        const seen = runtime._lastStepDoneThreads;
        const check = () => { if (runtime._lastStepDoneThreads !== seen) resolve(null); };
        checks.add(check); ensureTimer();
        return () => checks.delete(check);
      });
      // «detener todo»: the native stop (clones, threads and these callbacks).
      // true tells the translated text to return right away.
      case 'program.stopAll': runtime.stopAll(); return true;
    }
  }
  // API3 carries a tagged identifier; an API1 string always means a stable ID.
  function objectOf(reference) {
    const sprites = getScene()?.objects ?? [];
    const name = typeof reference === 'string' ? reference : reference.identifier;
    const identifiers = typeof reference === 'string' || !sprites.length ? {} : scene2DObjectIdentifiers({sprites}).targetIds;
    const id = typeof reference === 'string' ? sprites.find(sprite => sprite.id === name)?.id
      : Object.hasOwn(identifiers, name) ? identifiers[name] : undefined;
    if (!id || id === 'stage') fail('no hay ningún objeto llamado «' + name + '»');
    return id;
  }
  function backdropOf(name) {
    const backdrops = getScene()?.backdrops ?? [], found = backdrops.find(item => item.label === name) ?? backdrops.find(item => item.id === name);
    if (!found) fail(`no hay ningún fondo llamado «${name}»`);
    return found.id;
  }
  function state(target) { return {x: target.x, y: target.y, direction: target.direction, size: target.size, visible: target.visible, costume: target.currentCostume}; }
  function message(record, value) { return typeof value === 'string' ? value : String(expression(record, value)); }
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
