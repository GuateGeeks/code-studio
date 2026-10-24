import test from 'node:test';
import assert from 'node:assert/strict';
import {createInvocationQueue} from '../../src/targets/text/invocation-queue.mjs';

const invocation = (id = 'invoke-1') => ({invocationId: id, handlerId: 'handler', targetId: 'target', revision: 4});
function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return {promise, resolve, reject};
}
function scheduler() {
  let next = 0;
  const timers = new Map();
  return {
    timers,
    schedule: callback => { const id = ++next; timers.set(id, callback); return id; },
    cancelTimer: id => { timers.delete(id); },
    flush() { for (const [id, callback] of [...timers]) { timers.delete(id); callback(); } }
  };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('GG-TEXT-PROGRAM-002: reserve and detach before scheduling; duplicate queued IDs never invoke twice', async () => {
  const timer = scheduler(), calls = [], results = [];
  const queue = createInvocationQueue({...timer, invoke: data => { calls.push(data); return {ok: true}; }, onResult: (data, result) => results.push({data, result})});
  const input = invocation();
  assert.equal(queue.enqueue(input), true);
  input.targetId = 'changed';
  assert.equal(calls.length, 0);
  assert.throws(() => queue.enqueue(invocation()), /duplicada/);
  assert.equal(timer.timers.size, 1);
  timer.flush(); await settle();
  assert.deepEqual(calls, [invocation()]);
  assert.deepEqual(results, [{data: invocation(), result: {ok: true}}]);
  queue.dispose();
});

test('GG-TEXT-PROGRAM-002: cancellation before the timer prevents dispatch even if a cancelled timer fires', async () => {
  const timer = scheduler(), calls = [], cancelled = [], results = [];
  const queue = createInvocationQueue({...timer, invoke: data => calls.push(data), cancelInvocation: id => cancelled.push(id), onResult: data => results.push(data)});
  queue.enqueue(invocation());
  const staleTimer = [...timer.timers.values()][0];
  assert.equal(queue.cancel('invoke-1'), true);
  assert.equal(timer.timers.size, 0);
  staleTimer(); await settle();
  assert.deepEqual(calls, []);
  assert.deepEqual(cancelled, []);
  assert.deepEqual(results, []);
  assert.equal(queue.cancel('invoke-1'), false);
  queue.dispose();
});

test('GG-TEXT-PROGRAM-002: cancellation between timer and dispatch microtask prevents callback execution', async () => {
  const timer = scheduler(), calls = [], results = [];
  const queue = createInvocationQueue({...timer, invoke: data => calls.push(data), onResult: data => results.push(data)});
  queue.enqueue(invocation());
  timer.flush();
  queue.cancel('invoke-1');
  await settle();
  assert.deepEqual(calls, []);
  assert.deepEqual(results, []);
  queue.dispose();
});

test('GG-TEXT-PROGRAM-002: active cancellation reaches the engine once and suppresses late success and failure', async () => {
  for (const failed of [false, true]) {
    const timer = scheduler(), work = deferred(), cancelled = [], results = [], errors = [];
    const queue = createInvocationQueue({...timer, invoke: () => work.promise, cancelInvocation: id => cancelled.push(id),
      onResult: (...args) => results.push(args), onError: (...args) => errors.push(args)});
    queue.enqueue(invocation()); timer.flush(); await settle();
    assert.equal(queue.cancel('invoke-1'), true);
    assert.equal(queue.cancel('invoke-1'), false);
    assert.deepEqual(cancelled, ['invoke-1']);
    if (failed) work.reject(new Error('late error')); else work.resolve('late result');
    await settle();
    assert.deepEqual(results, []);
    assert.deepEqual(errors, []);
    queue.dispose();
  }
});

test('GG-TEXT-PROGRAM-002: disposal cancels queued/active work, suppresses results and closes the queue', async () => {
  const timer = scheduler(), work = deferred(), calls = [], cancelled = [], results = [], errors = [];
  const queue = createInvocationQueue({...timer, invoke: data => { calls.push(data.invocationId); return work.promise; },
    cancelInvocation: id => cancelled.push(id), onResult: data => results.push(data), onError: error => errors.push(error)});
  queue.enqueue(invocation('active')); timer.flush(); await settle();
  queue.enqueue(invocation('queued'));
  const staleTimer = [...timer.timers.values()][0];
  queue.dispose(); queue.dispose();
  staleTimer(); work.reject(new Error('after dispose')); await settle();
  assert.deepEqual(calls, ['active']);
  assert.deepEqual(cancelled, ['active']);
  assert.equal(timer.timers.size, 0);
  assert.deepEqual(results, []);
  assert.deepEqual(errors, []);
  assert.throws(() => queue.enqueue(invocation('new')), /Session stopped/);
});

test('GG-TEXT-PROGRAM-002: the 64 quota covers queued and active work and frees capacity on cancellation/completion', async () => {
  const timer = scheduler(), work = deferred();
  const queue = createInvocationQueue({...timer, invoke: () => work.promise});
  for (let id = 0; id < 64; id++) queue.enqueue(invocation('id-' + id));
  assert.throws(() => queue.enqueue(invocation('over-quota')), /64/);
  timer.flush(); await settle();
  assert.throws(() => queue.enqueue(invocation('over-quota')), /64/);
  queue.cancel('id-0');
  assert.equal(queue.enqueue(invocation('replacement')), true);
  timer.flush(); work.resolve('done'); await settle();
  assert.equal(queue.enqueue(invocation('id-0')), true);
  queue.dispose();
});

test('GG-TEXT-PROGRAM-002: malformed DTOs and scheduling failures do not occupy a slot; actual callback errors publish once', async () => {
  const timer = scheduler(), errors = [], expected = new Error('callback failed');
  let scheduleFails = true;
  const queue = createInvocationQueue({...timer, schedule: callback => {
    if (scheduleFails) throw new Error('timer failed');
    return timer.schedule(callback);
  }, invoke: () => { throw expected; }, onError: (data, error) => errors.push({data, error})});
  assert.throws(() => queue.enqueue({...invocation(), revision: -1}), /revision/);
  assert.throws(() => queue.enqueue(invocation()), /timer failed/);
  scheduleFails = false;
  queue.enqueue(invocation()); timer.flush(); await settle();
  assert.equal(errors.length, 1);
  assert.deepEqual(errors[0].data, invocation());
  assert.equal(errors[0].error, expected);
  queue.dispose();
});

test('GG-TEXT-PROGRAM-002: non-Error rejections cannot be mistaken for successful results', async () => {
  const timer = scheduler(), errors = [], results = [];
  const queue = createInvocationQueue({...timer, invoke: () => Promise.reject(null),
    onError: (data, error) => errors.push({data, error}), onResult: value => results.push(value)});
  queue.enqueue(invocation()); timer.flush(); await settle();
  assert.deepEqual(errors, [{data: invocation(), error: null}]);
  assert.deepEqual(results, []);
  queue.dispose();
});
