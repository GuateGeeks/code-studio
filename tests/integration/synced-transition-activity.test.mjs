import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getLesson, getLessonStarter, lessonKey, earlierRevisions, lessonSteps, validateLesson} from '../../src/lessons.mjs';
import {evaluateLesson} from '../../src/lesson-evaluation.mjs';
import {validateLessonProgress} from '../../src/lesson-progress-store.mjs';
import {createLessonController} from '../../src/studio/lesson-controller.mjs';

const legacy = JSON.parse(readFileSync(new URL('../fixtures/lessons-v1.json', import.meta.url), 'utf8'));
const scene = x => ({sprites: [{id: 'hero', name: 'hero', x, y: 0}], variables: []});
const program = steps => ({version: 0, scripts: [{event: 'start', sourceBlockId: 'hat', body: [
  {kind: 'repeat', count: 3, sourceBlockId: 'repeat', body: [{kind: 'move', steps, sourceBlockId: 'move'}]}]}]});

test('CV-ACTIVITY-001: text-transition revision 2 is the latest; revision 1 stays readable and unchanged', () => {
  const latest = getLesson('text-transition');
  assert.equal(latest.revision, 2);
  assert.equal(lessonKey(latest), 'text-transition');
  const before = legacy.find(lesson => lesson.id === 'text-transition');
  const previous = getLesson('text-transition@1');
  assert.equal(lessonKey(previous), 'text-transition@1');
  assert.deepEqual(previous.steps.map(({id, checks}) => ({id, checks})), before.steps.map(({id, checks}) => ({id, checks})));
  assert.deepEqual(previous.starter, before.starter);
  assert.deepEqual(earlierRevisions('text-transition').map(lesson => lesson.revision), [1]);
  assert.deepEqual(earlierRevisions('text-transition@1'), []);
  // Same starter program; new step IDs never collide with revision 1.
  assert.deepEqual(latest.starter, previous.starter);
  assert.equal(getLessonStarter('text-transition').lessonId, 'text-transition');
  const ids = [...latest.steps, latest.learning.variant].map(step => step.id);
  assert.ok(ids.every(id => !previous.steps.some(step => step.id === id)));
  for (const step of [...latest.steps, latest.learning.variant]) assert.equal(step.hints.length, 3);
  for (const key of ['text-transition@3', 'text-transition@x', 'missing']) assert.throws(() => getLesson(key), /actividad desconocida/);
});

test('CV-ACTIVITY-002: revision 2 checks the program edited in text, never a copy or the text format', () => {
  const lesson = getLesson('text-transition');
  const edited = {scene: scene(18), authoring: {ir: program(6), editedInText: true}};
  const result = evaluateLesson(lesson, edited);
  assert.equal(result.passed, true);
  assert.deepEqual(result.steps.map(step => step.id), ['synced-edit', 'synced-blocks']);
  assert.ok(result.steps.flatMap(step => step.checks).every(check => check.basis !== 'copy'));
  // Same position from blocks only: the text-edit condition is missing.
  assert.equal(evaluateLesson(lesson, {...edited, authoring: {ir: program(6), editedInText: false}}).steps[0].passed, false);
  assert.equal(evaluateLesson(lesson, {...edited, authoring: {ir: program(6)}}).steps[0].passed, false);
  // The block must hold the new value; an older run position is not enough.
  const unchangedBlocks = evaluateLesson(lesson, {...edited, authoring: {ir: program(4), editedInText: true}});
  assert.equal(unchangedBlocks.steps[1].passed, false);
  assert.equal(evaluateLesson(lesson, {...edited, scene: scene(12)}).steps[0].passed, false);
  const variant = {scene: scene(24), authoring: {ir: program(8), editedInText: true}, mode: 'variant'};
  assert.equal(evaluateLesson(lesson, variant).passed, true);
  assert.equal(evaluateLesson(lesson, {...variant, authoring: {ir: program(8), editedInText: false}}).passed, false);
  assert.deepEqual(lessonSteps(lesson, 'variant').map(step => step.id), ['synced-variant']);
});

test('CV-ACTIVITY-003: progress stays per revision; IDs of one revision never validate in another', () => {
  const old = {version: 1, projectId: 'p', lessonId: 'text-transition', lessonRevision: 1, completedStepIds: ['text-copy', 'text-variant']};
  assert.deepEqual(validateLessonProgress(old), old);
  const next = {...old, lessonRevision: 2, completedStepIds: ['synced-edit']};
  assert.deepEqual(validateLessonProgress(next), next);
  assert.throws(() => validateLessonProgress({...old, completedStepIds: ['synced-edit']}), /inválidos/);
  assert.throws(() => validateLessonProgress({...next, completedStepIds: ['text-copy']}), /inválidos/);
  assert.throws(() => validateLessonProgress({...old, lessonId: 'text-transition@1'}), /inválido/);
  assert.throws(() => validateLessonProgress({...old, lessonRevision: 3}));
});

test('CV-ACTIVITY-004: new check kinds are closed data', () => {
  const lesson = structuredClone(getLesson('text-transition'));
  assert.deepEqual(validateLesson(lesson), lesson);
  for (const check of [{kind: 'edited-in-text', value: true}, {kind: 'authored-operation', operation: 'move', steps: Infinity},
    {kind: 'authored-operation', operation: 'move', steps: 6, costume: 'hero'}, {kind: 'authored-operation', operation: 'eval', steps: 6}]) {
    const mutated = structuredClone(lesson); mutated.steps[0].checks = [check];
    assert.throws(() => validateLesson(mutated), /Actividad:/);
  }
});

test('CV-ACTIVITY-005: revision 2 shows revision 1 progress without merging it and saves under its own revision', async t => {
  const identity = {projectId: 'project-1', authoringKey: 'a', executedAuthoringKey: 'a', sessionId: 's', revision: 1, backend: 'blocks', documentId: null};
  const stored = new Map([[JSON.stringify(['project-1', 'text-transition', 1]),
    {version: 1, projectId: 'project-1', lessonId: 'text-transition', lessonRevision: 1, completedStepIds: ['text-copy', 'text-blocks']}]]);
  const saved = [];
  const progressStore = {
    load: async (projectId, key) => { const lesson = getLesson(key); return structuredClone(stored.get(JSON.stringify([projectId, lesson.id, lesson.revision])) ?? null); },
    save: async record => { saved.push(structuredClone(record)); stored.set(JSON.stringify([record.projectId, record.lessonId, record.lessonRevision]), structuredClone(record)); },
    close() {}
  };
  const controller = createLessonController({getIdentity: () => identity, getAuthoring: () => ({ir: program(6), editedInText: true}),
    loadStarter: async () => {}, readScene: async () => scene(18), progressStore, maxReads: 1, intervalMs: 0, timeoutMs: 200});
  t.after(() => controller.dispose());
  controller.select('text-transition');
  for (let i = 0; i < 50 && !controller.state().earlierProgress.length; i++) await new Promise(done => setTimeout(done, 1));
  assert.deepEqual(controller.state().earlierProgress, [{revision: 1, completed: 2, total: 3}]);
  assert.deepEqual(controller.state().historicalStepIds, []);
  // A blocks execution is enough for revision 2: it does not ask for a copy.
  const result = await controller.check();
  assert.equal(result.phase, 'success');
  assert.deepEqual(saved, [{version: 1, projectId: 'project-1', lessonId: 'text-transition', lessonRevision: 2, completedStepIds: ['synced-edit', 'synced-blocks']}]);
  assert.deepEqual(stored.get(JSON.stringify(['project-1', 'text-transition', 1])).completedStepIds, ['text-copy', 'text-blocks']);
  // Revision 1 remains selectable and still requires its independent copy.
  controller.select('text-transition@1');
  assert.equal((await controller.check()).message, 'Crea una copia JavaScript o Python y ejecuta el documento seleccionado.');
});
