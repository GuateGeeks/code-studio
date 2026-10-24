import test from 'node:test';
import assert from 'node:assert/strict';
import {validateTextProgram, validateTextProgramRPC, validateTextInvocation, validateTextInvocationResult, textProgramLimits} from '../../src/contracts/text-program.mjs';
import {createTextProgram} from '../../src/adapters/scratch/text-program.mjs';
import {toScratchProject} from '../../src/adapters/scratch/scratch-project.mjs';
import {createScratchSession} from '../../spikes/scratch-adapter.mjs';

const start = {id: 'start', event: 'start'};
const variable = (id, scope = 'local', initialValue = 0) => ({id, name: id, scope, initialValue});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(predicate, message = 'condition') {
  for (let count = 0; count < 300; count++) {
    const value = predicate();
    if (value) return value;
    await delay(5);
  }
  throw new Error(`Timed out: ${message}`);
}
async function setup(t, descriptor = {variables: [], handlers: [start]}) {
  const {project} = toScratchProject({version: 0, variables: [], scripts: [{
    sourceBlockId: 'old-hat', event: 'start', body: [{kind: 'move', steps: 99, sourceBlockId: 'old-body'}]
  }]});
  const vm = await createScratchSession(project);
  let revision = 42;
  const invocations = []; const cancellations = []; const errors = [];
  const adapter = createTextProgram({getVM: () => vm, getRevision: () => revision,
    onInvocation: event => invocations.push(event), onCancel: event => cancellations.push(event),
    onError: (code, message) => errors.push({code, message})});
  t.after(() => { adapter.dispose(); vm.quit(); });
  const call = (method, args = [], atRevision = revision) => adapter.call(`program.${method}`, args, atRevision);
  assert.deepEqual(call('start', [descriptor]), {started: true});
  const invocation = await until(() => invocations.find(event => event.handlerId === descriptor.handlers.find(handler => handler.event === 'start')?.id));
  const complete = (event, extra = {}) => adapter.complete({invocationId: event.invocationId, revision: event.revision, ...extra});
  return {vm, adapter, call, invocations, cancellations, errors, invocation, complete, bump: () => ++revision};
}

test('GG-TEXT-PROGRAM-001: strict bounded detached descriptors and enumerated contextual operations', () => {
  const input = {variables: [variable('local')], handlers: [start, {id: 'key', event: 'key', key: 'space'}]};
  const output = validateTextProgram(input);
  output.variables[0].initialValue = 2;
  assert.equal(input.variables[0].initialValue, 0);
  for (const corrupt of [
    value => { value.extra = true; }, value => { value.handlers[0].event = 'timer'; },
    value => { value.variables = Array(1); }, value => { value.handlers = Array(1); },
    value => { value.variables[0].scope = 'cloud'; }, value => { value.variables[0].initialValue = Infinity; },
    value => { value.variables.push({...value.variables[0]}); }, value => { value.handlers.push({...value.handlers[0]}); },
    value => { value.handlers[1].key = 'any'; }, value => { value.handlers[1].key = 1; }, value => { value.variables[0].id = '__proto__'; },
    value => { value.handlers = Array.from({length: 17}, (_, i) => ({id: `h${i}`, event: 'click'})); }
  ]) { const value = structuredClone(input); corrupt(value); assert.throws(() => validateTextProgram(value), /GG text program/); }
  assert.deepEqual(validateTextProgram({variables: [{id: 'a', name: 'A', initialValue: 0}], handlers: []}).variables[0].scope, 'local');
  const names = {variables: [{id: 'a\nb', name: 'A\u0001B', initialValue: 0}], handlers: [{id: 'hat\n1', event: 'message', message: 'go\nnow'}]};
  assert.equal(validateTextProgram(names).handlers[0].message, 'go\nnow');
  assert.deepEqual(validateTextProgramRPC('program.move', ['invocation', {variableId: 'local'}]).args, ['invocation', {variableId: 'local'}]);
  for (const [method, args] of [
    ['program.runIR', ['id', []]], ['program.move', ['id', {variableId: 'x', eval: 'code'}]],
    ['program.move', ['id', 1e12 + 1]], ['program.wait', ['id', -1]], ['program.wait', ['id', 61]],
    ['program.playSound', ['id', 'remote.wav', false]], ['program.setCostume', ['id', 'remote.svg']],
    ['program.compare', ['id', 'LE', 1, 2]], ['program.stop', ['id']]
  ]) assert.throws(() => validateTextProgramRPC(method, args), /GG text program/);
  assert.deepEqual(validateTextProgramRPC('program.stop', []), {method: 'program.stop', args: []});
  assert.throws(() => validateTextInvocation({invocationId: 'i', handlerId: 'h', targetId: 't', revision: -1}), /revision/);
  assert.throws(() => validateTextInvocationResult({invocationId: 'i', revision: 0, result: true, error: 'x'}), /result/);
});

test('GG-TEXT-PROGRAM-001: native hats replace authored bodies without loading or advancing the scene', async t => {
  const session = await setup(t, {variables: [variable('steps', 'local', 700)], handlers: [start]});
  const {vm, call, invocation, complete} = session;
  const hero = vm.runtime.getSpriteTargetByName('hero');
  const nativeTargetId = hero.id;
  assert.equal(invocation.revision, 42);
  assert.equal(hero.x, 0, 'original Blockly move body does not execute');
  assert.deepEqual(call('move', [invocation.invocationId, {variableId: 'steps'}]), {x: 700, y: 0});
  assert.equal(hero.id, nativeTargetId);
  assert.equal(complete(invocation).accepted, true);
  assert.equal(complete(invocation).accepted, false);
  assert.throws(() => call('move', [invocation.invocationId, 1]), /stale invocation/);
});

test('GG-TEXT-PROGRAM-001: contextual variable expressions and writes are atomic with an explicit numeric domain', async t => {
  const {vm, call, invocation} = await setup(t, {variables: [variable('x', 'local', 2), variable('shared', 'global', 3)], handlers: [start]});
  const id = invocation.invocationId;
  const hero = vm.runtime.getSpriteTargetByName('hero');
  const stage = vm.runtime.getTargetForStage();
  assert.equal(call('changeVariable', [id, 'x', {variableId: 'x'}]), 4);
  assert.equal(call('setVariable', [id, 'shared', {variableId: 'x'}]), 4);
  assert.equal(call('compare', [id, 'EQ', {variableId: 'shared'}, {variableId: 'x'}]), true);
  assert.equal(call('compare', [id, 'LT', 3, {variableId: 'x'}]), true);
  call('setVariable', [id, 'x', 1e12]);
  assert.throws(() => call('changeVariable', [id, 'x', 1]), /domain/);
  assert.equal(hero.variables.x.value, 1e12);
  assert.equal(stage.variables.shared.value, 4);
  assert.throws(() => call('setVariable', [id, 'x', {variableId: 'missing'}]), /unknown variable/);
  assert.equal(hero.variables.x.value, 1e12);
  assert.throws(() => call('move', [id, 1], 41), /stale revision/);
});

test('GG-TEXT-PROGRAM-002: broadcast waits only its captured receivers and nested waits retain partial order', async t => {
  const {call, invocations, invocation, complete} = await setup(t, {variables: [], handlers: [
    start, {id: 'receiver', event: 'message', message: 'first'}, {id: 'nested', event: 'message', message: 'second'}
  ]});
  const trace = ['sender.before'];
  const first = call('broadcastAndWait', [invocation.invocationId, 'first']).then(() => trace.push('sender.after'));
  const receiver = await until(() => invocations.find(event => event.handlerId === 'receiver'));
  trace.push('receiver.before');
  const nested = call('broadcastAndWait', [receiver.invocationId, 'second']).then(() => trace.push('receiver.after'));
  const nestedReceiver = await until(() => invocations.find(event => event.handlerId === 'nested'));
  trace.push('nested.done'); complete(nestedReceiver);
  await nested;
  assert.equal(trace.includes('sender.after'), false);
  complete(receiver); await first;
  assert.deepEqual(trace, ['sender.before', 'receiver.before', 'nested.done', 'receiver.after', 'sender.after']);
  assert.equal(await call('broadcastAndWait', [invocation.invocationId, 'no receivers']), null);
});

test('GG-TEXT-PROGRAM-002: native receiver restart cancels its old token and does not extend the earlier broadcast', async t => {
  const {call, invocations, cancellations, invocation, complete} = await setup(t, {variables: [], handlers: [
    start, {id: 'receiver', event: 'message', message: 'restart'}
  ]});
  const first = call('broadcastAndWait', [invocation.invocationId, 'restart']);
  const old = await until(() => invocations.find(event => event.handlerId === 'receiver'));
  let secondDone = false;
  const second = call('broadcastAndWait', [invocation.invocationId, 'restart']).then(() => { secondDone = true; });
  const next = await until(() => invocations.filter(event => event.handlerId === 'receiver')[1]);
  await first;
  assert.equal(secondDone, false);
  assert.ok(cancellations.some(event => event.invocationId === old.invocationId));
  assert.throws(() => call('move', [old.invocationId, 10]), /stale invocation/);
  complete(next); await second;
});

test('GG-TEXT-PROGRAM-002: self broadcast restart cancels a wait instead of deadlocking', async t => {
  const {call, invocations, invocation} = await setup(t, {variables: [], handlers: [
    start, {id: 'receiver', event: 'message', message: 'self'}
  ]});
  const first = call('broadcastAndWait', [invocation.invocationId, 'self']);
  const receiver = await until(() => invocations.find(event => event.handlerId === 'receiver'));
  const rejected = assert.rejects(Promise.resolve().then(() => call('broadcastAndWait', [receiver.invocationId, 'self'])), /cancelled/);
  await rejected;
  await first;
});

test('GG-TEXT-PROGRAM-001: clones copy locals, share globals and bind each asynchronous callback to its own target', async t => {
  const {vm, call, invocations, invocation, complete, cancellations} = await setup(t, {variables: [
    variable('local', 'local', 5), variable('global', 'global', 10)
  ], handlers: [start, {id: 'clone', event: 'clone'}]});
  const result = call('createClone', [invocation.invocationId]);
  const clone = await until(() => invocations.find(event => event.handlerId === 'clone'));
  assert.equal(result.targetId, clone.targetId);
  assert.notEqual(clone.targetId, invocation.targetId);
  await call('wait', [clone.invocationId, 0.01]);
  call('changeVariable', [clone.invocationId, 'local', 2]);
  call('changeVariable', [clone.invocationId, 'global', 3]);
  call('move', [clone.invocationId, {variableId: 'local'}]);
  call('move', [invocation.invocationId, {variableId: 'local'}]);
  const original = vm.runtime.getSpriteTargetByName('hero');
  const target = vm.runtime.targets.find(item => !item.isOriginal);
  assert.equal(original.x, 5); assert.equal(target.x, 7);
  assert.equal(original.variables.local.value, 5); assert.equal(target.variables.local.value, 7);
  assert.equal(vm.runtime.getTargetForStage().variables.global.value, 13);
  assert.equal(call('deleteClone', [invocation.invocationId]), false);
  assert.equal(call('deleteClone', [clone.invocationId]), true);
  assert.equal(vm.runtime.targets.includes(target), false);
  assert.throws(() => call('move', [clone.invocationId, 1]), /stale invocation/);
  assert.equal(complete(clone).accepted, false);
  assert.equal(cancellations.some(event => event.invocationId === clone.invocationId), false, 'deleting callback can receive true and return');
});

test('GG-TEXT-PROGRAM-002: native key hats ignore retrigger, click hats restart, and deleted clones cancel other callbacks', async t => {
  const {vm, call, invocations, invocation, cancellations} = await setup(t, {variables: [], handlers: [
    start, {id: 'key', event: 'key', key: 'space'}, {id: 'click', event: 'click'}, {id: 'clone', event: 'clone'}
  ]});
  const hero = vm.runtime.getSpriteTargetByName('hero');
  vm.runtime.startHats('event_whenkeypressed', {KEY_OPTION: 'space'}, hero);
  const key = await until(() => invocations.find(event => event.handlerId === 'key'));
  vm.runtime.startHats('event_whenkeypressed', {KEY_OPTION: 'space'}, hero);
  await delay(40);
  assert.equal(invocations.filter(event => event.handlerId === 'key').length, 1);
  vm.runtime.startHats('event_whenthisspriteclicked', null, hero);
  const click = await until(() => invocations.find(event => event.handlerId === 'click'));
  vm.runtime.startHats('event_whenthisspriteclicked', null, hero);
  await until(() => invocations.filter(event => event.handlerId === 'click').length === 2);
  assert.ok(cancellations.some(event => event.invocationId === click.invocationId));
  assert.equal(cancellations.some(event => event.invocationId === key.invocationId), false);
  call('createClone', [invocation.invocationId]);
  const clone = await until(() => invocations.find(event => event.handlerId === 'clone'));
  const cloneTarget = vm.runtime.targets.find(target => !target.isOriginal);
  vm.runtime.startHats('event_whenkeypressed', {KEY_OPTION: 'space'}, cloneTarget);
  const cloneKey = await until(() => invocations.find(event => event.handlerId === 'key' && event.targetId === clone.targetId));
  call('deleteClone', [clone.invocationId]);
  assert.ok(cancellations.some(event => event.invocationId === cloneKey.invocationId));
});

test('GG-TEXT-PROGRAM-002: Stop cancels timers and broadcasts, rejects late results, and preserves the scene revision/state', async t => {
  const {vm, adapter, call, invocations, invocation, cancellations} = await setup(t, {variables: [], handlers: [
    start, {id: 'receiver', event: 'message', message: 'wait'}
  ]});
  call('move', [invocation.invocationId, 8]);
  const wait = assert.rejects(call('wait', [invocation.invocationId, 60]), /cancelled/);
  const broadcast = assert.rejects(call('broadcastAndWait', [invocation.invocationId, 'wait']), /cancelled/);
  await until(() => invocations.length === 2);
  assert.deepEqual(call('stop'), {stopped: true});
  await wait; await broadcast;
  assert.equal(vm.runtime.getSpriteTargetByName('hero').x, 8);
  assert.equal(vm.runtime.threads.length, 0);
  assert.equal(cancellations.length, 2);
  assert.deepEqual(adapter.complete({invocationId: invocation.invocationId, revision: 42}), {accepted: false});
  assert.throws(() => call('move', [invocation.invocationId, 1]), /stale invocation/);
});

test('GG-TEXT-PROGRAM-001: invalid configuration preserves active native handlers, state and variable values', async t => {
  const {vm, call, invocation, complete} = await setup(t, {variables: [variable('x', 'local', 6)], handlers: [start]});
  const hero = vm.runtime.getSpriteTargetByName('hero'); const blocks = hero.blocks;
  for (const invalid of [
    {variables: [variable('x')], handlers: [{id: 'bad', event: 'remote'}]},
    {variables: Array(1), handlers: [start]}, {variables: [variable('x')], handlers: Array(1)}
  ]) {
    assert.throws(() => call('start', [invalid]), /invalid event|sparse descriptor/);
    assert.equal(hero.blocks, blocks); assert.equal(hero.variables.x.value, 6);
  }
  call('move', [invocation.invocationId, {variableId: 'x'}]);
  assert.equal(hero.x, 6); assert.equal(complete(invocation).accepted, true);
});

test('GG-TEXT-PROGRAM-002: invocation, clone and pending-operation quotas are bounded and recover on Stop', async t => {
  const {vm, call, invocations, invocation, errors} = await setup(t, {variables: [], handlers: [start, {id: 'clone', event: 'clone'}]});
  const waits = Array.from({length: textProgramLimits.pendingEvents}, () => call('wait', [invocation.invocationId, 60]).catch(error => error));
  assert.throws(() => call('wait', [invocation.invocationId, 60]), /pending operation limit/);
  for (let i = 0; i < textProgramLimits.clones; i++) call('createClone', [invocation.invocationId]);
  assert.throws(() => call('createClone', [invocation.invocationId]), /clone limit/);
  await until(() => errors.length > 0);
  assert.equal(invocations.length, textProgramLimits.invocations);
  assert.equal(errors[0].code, 'TEXT_INVOCATION_LIMIT');
  assert.equal(vm.runtime.targets.filter(target => !target.isOriginal).length, 64);
  call('stop'); await Promise.all(waits);
  assert.equal(vm.runtime.targets.filter(target => !target.isOriginal).length, 0);
});

test('GG-TEXT-PROGRAM-002: revision changes retire old invocation scopes before any late mutation', async t => {
  const {vm, call, invocation, cancellations, bump, adapter} = await setup(t);
  bump();
  assert.throws(() => call('move', [invocation.invocationId, 10]), /stale invocation/);
  assert.equal(vm.runtime.getSpriteTargetByName('hero').x, 0);
  assert.ok(cancellations.some(event => event.reason === 'scope-changed'));
  assert.equal(adapter.complete({invocationId: invocation.invocationId, revision: 42}).accepted, false);
});

test('GG-TEXT-PROGRAM-001: resource commands use native primitives, bounded catalog names and cancellable sound waits', async t => {
  const {vm, call, invocation} = await setup(t);
  const hero = vm.runtime.getSpriteTargetByName('hero');
  hero.sprite.costumes = [
    {...hero.sprite.costumes[0], name: 'hero'}, {...hero.sprite.costumes[0], name: 'hero-alt'}
  ];
  const id = invocation.invocationId;
  assert.deepEqual(call('setCostume', [id, 'hero-alt']), {costume: 'hero-alt'});
  assert.equal(hero.currentCostume, 1);
  assert.throws(() => call('setCostume', [id, 'https://example.invalid/a.svg']), /unsupported costume/);
  assert.throws(() => call('playSound', [id, 'tone', true]), /sound unavailable/);
  // Node has no AudioContext. This fixture records calls at the SoundBank
  // boundary while the actual native sound primitives select/wait/stop it.
  const played = []; const finishes = [];
  hero.sprite.sounds = [{name: 'tone', soundId: 'tone-id'}];
  hero.sprite.soundBank = {
    playSound(target, soundId) {
      played.push({target, soundId});
      return new Promise(resolve => finishes.push(resolve));
    },
    stopAllSounds() { finishes.splice(0).forEach(resolve => resolve()); },
    setEffects() {}, dispose() {}
  };
  assert.deepEqual(call('playSound', [id, 'tone', false]), {started: true});
  const waiting = call('playSound', [id, 'tone', true]);
  assert.equal(played.length, 2);
  assert.equal(played[0].target, hero); assert.equal(played[0].soundId, 'tone-id');
  assert.deepEqual(call('stopSounds', [id]), {stopped: true});
  await waiting;
  const cancelled = assert.rejects(call('playSound', [id, 'tone', true]), /cancelled/);
  call('stop'); await cancelled;
});
