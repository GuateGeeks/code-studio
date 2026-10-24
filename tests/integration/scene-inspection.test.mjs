import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSceneSnapshot, createSceneInspection} from '../../src/scene-inspection.mjs';

const snapshot = (x = 0) => ({sprites: [{id: 'hero', name: 'hero', x, y: 0}], variables: [{id: 'score', name: 'score', value: 1}]});
const scope = () => ({sessionId: 'a', revision: 2});
function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return {promise, resolve, reject};
}

test('GG-INSPECT-001: validated DTO is detached and accepts the declared numeric/text limits', () => {
  const input = snapshot(-1_000_000);
  input.sprites[0].y = 1_000_000;
  input.variables = Array.from({length: 16}, (_, index) => ({id: String(index).padEnd(128, 'i'), name: 'n'.repeat(64), value: index ? 1_000_000 : -1_000_000}));
  const copy = validateSceneSnapshot(input);
  assert.deepEqual(copy, input);
  input.sprites[0].x = 8; input.variables[0].value = 7;
  assert.equal(copy.sprites[0].x, -1_000_000);
  assert.equal(copy.variables[0].value, -1_000_000);
  assert.deepEqual(validateSceneSnapshot({sprites: snapshot().sprites, variables: []}).variables, []);
});

test('GG-INSPECT-002: reject extra metadata, wrong entities, duplicate IDs, holes and invalid values', () => {
  const mutations = [
    value => { value.vm = {}; }, value => { delete value.variables; },
    value => { value.sprites.push({...value.sprites[0]}); },
    value => { value.sprites[0].id = 'clone'; }, value => { value.sprites[0].name = 'enemy'; },
    value => { value.sprites[0].x = '0'; }, value => { value.sprites[0].x = NaN; },
    value => { value.sprites[0].y = Infinity; }, value => { value.sprites[0].x = 1_000_001; },
    value => { value.sprites[0].costume = 'hero'; },
    value => { value.variables[0].type = ''; },
    value => { value.variables[0].id = ''; }, value => { value.variables[0].id = 'i'.repeat(129); },
    value => { value.variables[0].name = ' '; }, value => { value.variables[0].name = 'n'.repeat(65); },
    value => { value.variables[0].value = -1_000_001; }, value => { value.variables[0].value = '1'; },
    value => { value.variables.push({...value.variables[0]}); },
    value => { value.variables = Array(1); },
    value => { value.variables = Array.from({length: 17}, (_, index) => ({id: String(index), name: 'n', value: 0})); }
  ];
  for (const mutate of mutations) {
    const value = snapshot(); mutate(value);
    assert.throws(() => validateSceneSnapshot(value), /Lectura de escena inválida/);
  }
  for (const value of [null, [], {}, 'scene']) assert.throws(() => validateSceneSnapshot(value));
  const inherited = Object.create(snapshot());
  assert.throws(() => validateSceneSnapshot(inherited));
});

test('GG-INSPECT-001: loading and ready notifications and state never expose owned mutable DTOs', async () => {
  const changes = [];
  const input = snapshot(12);
  let receivedScope;
  const inspector = createSceneInspection({
    getScope: scope,
    readScene: async captured => { receivedScope = captured; return input; },
    onChange: state => { changes.push(structuredClone(state)); if (state.snapshot) state.snapshot.sprites[0].x = 99; }
  });
  assert.deepEqual(inspector.state(), {snapshot: null, status: 'empty', error: null});
  const result = await inspector.refresh();
  assert.deepEqual(receivedScope, scope());
  assert.deepEqual(changes.map(change => change.status), ['loading', 'ready']);
  assert.equal(result.snapshot.sprites[0].x, 12);
  result.snapshot.sprites[0].x = 88;
  input.sprites[0].x = 77;
  assert.equal(inspector.state().snapshot.sprites[0].x, 12);
});

test('GG-INSPECT-002: the latest refresh wins even when an earlier result arrives last', async () => {
  const first = deferred(), second = deferred();
  let calls = 0;
  const changes = [];
  const inspector = createSceneInspection({getScope: scope, readScene: () => (++calls === 1 ? first.promise : second.promise), onChange: state => changes.push(state)});
  const earlier = inspector.refresh(), later = inspector.refresh();
  second.resolve(snapshot(20)); await later;
  first.resolve(snapshot(10)); await earlier;
  assert.equal(inspector.state().snapshot.sprites[0].x, 20);
  assert.deepEqual(changes.map(change => change.status), ['loading', 'loading', 'ready']);
});

test('GG-INSPECT-002: old session/revision responses and rejected requests cannot repopulate invalidated state', async () => {
  for (const field of ['sessionId', 'revision']) {
    const pending = deferred();
    let active = scope();
    const inspector = createSceneInspection({getScope: () => active, readScene: () => pending.promise});
    const refresh = inspector.refresh();
    active = {...active, [field]: field === 'sessionId' ? 'b' : 3};
    inspector.invalidate();
    pending.resolve(snapshot(30)); await refresh;
    assert.deepEqual(inspector.state(), {snapshot: null, status: 'empty', error: null});
  }
  const pending = deferred();
  const inspector = createSceneInspection({getScope: scope, readScene: () => pending.promise});
  const refresh = inspector.refresh();
  inspector.invalidate(); pending.reject(new Error('late failure')); await refresh;
  assert.deepEqual(inspector.state(), {snapshot: null, status: 'empty', error: null});
});

test('GG-INSPECT-002: scope comparison independently rejects a response without requiring invalidate', async () => {
  const pending = deferred();
  let active = scope();
  const changes = [];
  const inspector = createSceneInspection({getScope: () => active, readScene: () => pending.promise, onChange: state => changes.push(state)});
  const refresh = inspector.refresh();
  active.revision++;
  pending.resolve(snapshot(90)); await refresh;
  assert.equal(inspector.state().snapshot, null);
  assert.deepEqual(changes.map(change => change.status), ['loading']);
});

test('GG-INSPECT-002: malformed readings and transport errors preserve the last valid DTO and remain recoverable', async () => {
  let answer = snapshot(8), fail = false;
  const inspector = createSceneInspection({getScope: scope, readScene: async () => { if (fail) throw new Error('transport failed'); return answer; }});
  await inspector.refresh();
  answer = {sprites: []};
  await inspector.refresh();
  assert.equal(inspector.state().status, 'error');
  assert.equal(inspector.state().snapshot.sprites[0].x, 8);
  assert.match(inspector.state().error, /Lectura de escena inválida/);
  fail = true;
  await inspector.refresh();
  assert.equal(inspector.state().snapshot.sprites[0].x, 8);
  assert.equal(inspector.state().error, 'transport failed');
  fail = false; answer = snapshot(10);
  await inspector.refresh();
  assert.equal(inspector.state().status, 'ready');
  assert.equal(inspector.state().error, null);
  assert.equal(inspector.state().snapshot.sprites[0].x, 10);
});

test('GG-INSPECT-002: absent or invalid runner scope clears state without requesting execution data', async () => {
  let active = scope(), reads = 0;
  const inspector = createSceneInspection({getScope: () => active, readScene: async () => { reads++; return snapshot(4); }});
  await inspector.refresh();
  for (const invalid of [null, {sessionId: null, revision: 2}, {sessionId: 'a', revision: -1}, {sessionId: 'a', revision: 2.5}]) {
    active = invalid; await inspector.refresh();
    assert.deepEqual(inspector.state(), {snapshot: null, status: 'empty', error: null});
  }
  assert.equal(reads, 1);
});
