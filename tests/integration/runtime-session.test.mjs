import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {once} from 'node:events';
import {RuntimeSession} from '../../spikes/runtime-session.mjs';

test('GG-RUN-003: rejects late, duplicated and reordered commands', async () => {
  const authoring = Object.freeze({source: 'move(5)'});
  const coordinator = new RuntimeSession();
  const sessionA = coordinator.start();
  let x = 0;
  const apply = steps => { x += steps; };
  assert.equal(coordinator.accept({sessionId: sessionA, seq: 1, payload: 5}, apply), true);
  await coordinator.stop();
  assert.equal(coordinator.accept({sessionId: sessionA, seq: 2, payload: 99}, apply), false);
  const sessionB = coordinator.start();
  assert.equal(coordinator.accept({sessionId: sessionA, seq: 3, payload: 99}, apply), false);
  assert.equal(coordinator.accept({sessionId: sessionB, seq: 1, payload: 2}, apply), true);
  assert.equal(coordinator.accept({sessionId: sessionB, seq: 1, payload: 2}, apply), false);
  assert.equal(x, 7);
  assert.equal(authoring.source, 'move(5)');
  await coordinator.stop();
});

test('GG-RUN-004: terminates a non-cooperative worker and preserves source', {timeout: 3000}, async () => {
  const worker = new Worker(new URL('../workers/infinite-loop.mjs', import.meta.url));
  const coordinator = new RuntimeSession();
  const source = {text: 'while (true) {}'};
  try {
    await once(worker, 'message');
    coordinator.start(worker);
    const stoppedAt = performance.now();
    await coordinator.stop();
    assert.ok(performance.now() - stoppedAt < 1000);
    assert.equal(worker.threadId, -1);
    assert.equal(source.text, 'while (true) {}');
    const session = coordinator.start();
    assert.equal(coordinator.accept({sessionId: session, seq: 0, payload: 'ready'}, value => assert.equal(value, 'ready')), true);
    await coordinator.stop();
  } finally { await worker.terminate(); }
});
