import test from 'node:test';
import assert from 'node:assert/strict';
import {createLessonController} from '../../src/studio/lesson-controller.mjs';

const scene = x => ({sprites: [{id: 'hero', name: 'hero', x, y: 0}], variables: []});
const authoring = () => ({ir: {version: 0, scripts: [{event: 'start', sourceBlockId: 'hat', body: [{kind: 'setCostume', sourceBlockId: 'costume', costume: 'hero-alt'}]}]}, blocklyHash: 'blocks'});
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return {promise, resolve}; }
async function until(predicate) { for (let i = 0; i < 100 && !predicate(); i++) await new Promise(done => setTimeout(done, 1)); assert.ok(predicate()); }
function harness(t, overrides = {}) {
  const identity = {projectId: 'project-1', authoringKey: 'auth-1', executedAuthoringKey: 'auth-1', sessionId: 'session-1', revision: 1, backend: 'blocks', documentId: null};
  const saved = []; const loaded = []; const reads = []; const notifications = [];
  const progressStore = {load: async () => null, save: async (record, options) => { if (options.isCurrent() && !options.signal.aborted) saved.push(structuredClone(record)); }, close() {}};
  const controller = createLessonController({getIdentity: () => identity, getAuthoring: authoring,
    getCopyFacts: () => [], loadStarter: async (starter, options) => { if (options.isCurrent()) loaded.push(starter); },
    readScene: async scope => { reads.push(scope); return scene(60); }, readVariable: async id => ({id, name: 'Puntos', value: 3}),
    progressStore, onChange: state => notifications.push(state), maxReads: 3, intervalMs: 0, timeoutMs: 200, ...overrides});
  t.after(() => controller.dispose());
  return {controller, identity, saved, loaded, reads, notifications};
}

test('E3: selecting a variant changes no project and grants only its own progress',async t=>{
  const h=harness(t,{readScene:async()=>scene(80)});
  h.controller.selectMode('variant');
  assert.equal(h.loaded.length,0);assert.equal(h.reads.length,0);
  await h.controller.check();
  assert.equal(h.controller.state().phase,'success');
  assert.deepEqual(h.saved[0].completedStepIds,['story-variant']);
  h.controller.selectMode('main');
  assert.deepEqual(h.controller.state().results,[]);
  assert.deepEqual(h.controller.state().historicalStepIds,['story-variant']);
  assert.equal(h.loaded.length,0);
  await h.controller.loadSelected();assert.equal(h.controller.state().mode,'main');
});
test('E3: switching route cancels a late observation without granting any progress',async t=>{
  const pending=deferred();let reading=false;
  const h=harness(t,{readScene:()=>{reading=true;return pending.promise;}});
  const checked=h.controller.check();await until(()=>reading);
  h.controller.selectMode('variant');await checked;pending.resolve(scene(60));
  assert.equal(h.controller.state().mode,'variant');assert.deepEqual(h.saved,[]);
  assert.deepEqual(h.controller.state().results,[]);
});
test('E3: a first variant check preserves durable principal history before the history view loads',async t=>{
  const saved=[];
  const h=harness(t,{readScene:async()=>scene(80),progressStore:{
    load:async()=>({completedStepIds:['story-position','story-costume']}),close(){},
    save:async record=>{saved.push(record);}
  }});
  h.controller.selectMode('variant');await h.controller.check();
  assert.deepEqual(saved[0].completedStepIds,['story-position','story-costume','story-variant']);
  assert.deepEqual(h.controller.state().historicalStepIds,saved[0].completedStepIds);
});
test('E3: switching route aborts the old durable progress write guard',async t=>{
  const pending=deferred();let writing=false;const writes=[];
  const h=harness(t,{progressStore:{load:async()=>null,close(){},async save(record,options){
    writing=true;await pending.promise;if(options.isCurrent()&&!options.signal.aborted)writes.push(record);
  }}});
  const checked=h.controller.check();await until(()=>writing);
  h.controller.selectMode('variant');pending.resolve();await checked;
  assert.deepEqual(writes,[]);assert.deepEqual(h.controller.state().historicalStepIds,[]);
});
test('GG-LESSON-001: selecting instructions is read-only and starter replacement is an explicit guarded callback', async t => {
  const h = harness(t);
  h.controller.select('score');
  assert.equal(h.loaded.length, 0); assert.equal(h.reads.length, 0); assert.equal(h.saved.length, 0);
  await h.controller.loadSelected();
  assert.equal(h.loaded.length, 1);
  assert.deepEqual(h.loaded[0].packIds, ['gg.sprites', 'gg.score']);
  assert.equal(h.controller.state().phase, 'ready');
  assert.match(h.controller.state().message, /sin ejecutar/);
  assert.equal(h.reads.length, 0);
});
test('GG-LESSON-001: source/execution mismatch prevents reading and passing stale authoring', async t => {
  const h = harness(t); h.identity.executedAuthoringKey = null;
  await h.controller.check();
  assert.match(h.controller.state().message, /Ejecuta tus cambios/);
  assert.equal(h.reads.length, 0); assert.equal(h.saved.length, 0);
});
test('GG-LESSON-001: one pending check uses finite sequential reads and records only step IDs', async t => {
  let reads = 0;
  const h = harness(t, {readScene: async () => { reads++; return scene(reads === 1 ? 40 : 60); }});
  const first = h.controller.check(); assert.equal(h.controller.check(), first);
  await first;
  assert.equal(reads, 2); assert.equal(h.controller.state().phase, 'success');
  assert.deepEqual(h.saved[0], {version: 1, projectId: 'project-1', lessonId: 'story', lessonRevision: 1,
    completedStepIds: ['story-position', 'story-costume']});
  assert.equal(JSON.stringify(h.saved).includes('sprites'), false);
});
test('GG-LESSON-001: a revision change during a delayed observation cannot grant progress', async t => {
  const pending = deferred(); let reading = false;
  const h = harness(t, {readScene: () => { reading = true; return pending.promise; }});
  const check = h.controller.check(); await until(() => reading);
  h.identity.revision++; pending.resolve(scene(60)); await check;
  assert.equal(h.controller.state().phase, 'stale'); assert.deepEqual(h.saved, []);
});
test('GG-LESSON-001: Stop invalidates immediately and a late variable reply cannot complete another activity', async t => {
  const pending = deferred(); let reading = false;
  const h = harness(t, {readScene: async () => scene(30), readVariable: () => { reading = true; return pending.promise; }});
  h.controller.select('score');
  const check = h.controller.check(); await until(() => reading);
  h.identity.sessionId = null; h.controller.invalidate(); h.controller.select('story');
  await check; pending.resolve({id: 'gg-pack-score', name: 'Puntos', value: 3});
  await new Promise(done => setTimeout(done, 5));
  assert.equal(h.controller.state().selectedLessonId, 'story'); assert.deepEqual(h.controller.state().results, []); assert.deepEqual(h.saved, []);
});
test('GG-LESSON-001: Stop during a delayed progress write revokes the durable write guard', async t => {
  const gate = deferred(); const writes = []; let writing = false;
  const h = harness(t, {progressStore: {load: async () => null, close() {}, async save(record, options) {
    writing = true; await gate.promise;
    if (!options.isCurrent() || options.signal.aborted) throw new Error('obsolete');
    writes.push(record);
  }}});
  const check = h.controller.check(); await until(() => writing);
  h.identity.sessionId = null; h.controller.invalidate(); gate.resolve(); await check;
  assert.deepEqual(writes, []); assert.deepEqual(h.controller.state().historicalStepIds, []); assert.deepEqual(h.controller.state().results, []);
});
test('GG-LESSON-001: hung reads have a deadline and wrong positions stop at the read limit', async t => {
  const h = harness(t, {readScene: () => new Promise(() => {}), timeoutMs: 20});
  await h.controller.check(); assert.equal(h.controller.state().phase, 'error'); assert.deepEqual(h.saved, []);
  let reads = 0; const finite = harness(t, {readScene: async () => { reads++; return scene(40); }});
  await finite.controller.check(); assert.equal(reads, 3); assert.equal(finite.controller.state().phase, 'not-yet');
});
test('GG-LESSON-001: failed starters leave project identity untouched and disposed candidates lose load authority', async t => {
  const h = harness(t, {loadStarter: async () => { throw new Error('hash inválido'); }});
  const before = structuredClone(h.identity); await h.controller.loadSelected();
  assert.deepEqual(h.identity, before); assert.equal(h.controller.state().phase, 'error');
  let guard; const gate = deferred();
  const late = harness(t, {loadStarter: async (_, options) => { guard = options.isCurrent; await gate.promise; assert.equal(guard(), false); }});
  const loading = late.controller.loadSelected(); await until(() => guard);
  late.controller.dispose(); gate.resolve(); await loading;
});
