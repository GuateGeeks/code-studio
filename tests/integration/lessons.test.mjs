import test from 'node:test';
import assert from 'node:assert/strict';
import {getLesson, getLessonStarter, lessonCatalog, validateLesson} from '../../src/lessons.mjs';
import {evaluateLesson, validateLessonVariable} from '../../src/lesson-evaluation.mjs';
import {loadWorkspace, workspaceToIR} from '../../src/editor/block-program.mjs';
import {createCapabilities} from '../../src/contracts/packs.mjs';

const scene = (x, variables = []) => ({sprites: [{id: 'hero', name: 'hero', x, y: 0}], variables});
function starterIR(id) {
  const starter = getLessonStarter(id); const capabilities = createCapabilities(starter.packIds);
  const workspace = loadWorkspace(starter.blockly, {capabilities});
  try { return workspaceToIR(workspace, {capabilities}); } finally { workspace.dispose(); }
}
test('GG-LESSON-001: three detached Spanish activities contain real editable starter workspaces and declared pack IDs', () => {
  assert.deepEqual(lessonCatalog.map(lesson => lesson.id), ['story', 'score', 'text-transition']);
  for (const lesson of lessonCatalog) {
    assert.deepEqual(validateLesson(lesson), lesson);
    assert.ok(starterIR(lesson.id).scripts.length > 0);
    assert.ok(lesson.steps.every(step => step.instructions && step.hints.length));
  }
  const score = starterIR('score');
  assert.deepEqual(score.variables.find(variable => variable.id === 'gg-pack-score'), {id: 'gg-pack-score', name: 'Puntos', initialValue: 0, scope: 'global'});
  assert.equal(score.scripts[1].body[0].kind, 'changeVariable');
  assert.equal(score.scripts[1].body[1].steps, 5);
  assert.equal(starterIR('text-transition').scripts[0].body[0].body[0].steps, 4);
  assert.equal(starterIR('story').scripts[0].body[0].steps, 20);
  const detached = getLessonStarter('story'); detached.blockly.blocks.blocks = [];
  assert.equal(getLessonStarter('story').blockly.blocks.blocks.length, 1);
});
test('GG-LESSON-001: schemas reject executable predicates, unreviewed packs, sparse arrays and extra fields', () => {
  for (const mutate of [
    lesson => { lesson.steps[0].checks[0] = {kind: 'eval', source: 'return true'}; },
    lesson => { lesson.steps[0].checks[0].callback = () => true; },
    lesson => { lesson.starter.packIds = ['https://remote.invalid/module.mjs']; },
    lesson => { lesson.steps[0].checks[0].path = 'sprites[*].x'; },
    lesson => { lesson.steps[0].hints = Array(1); },
    lesson => { lesson.steps[0].checks[0].equals = Infinity; },
    lesson => { lesson.steps[1].id = lesson.steps[0].id; },
    lesson => { lesson.starter.blockly.sideEffect = () => {}; }
  ]) { const lesson = getLesson('story'); mutate(lesson); assert.throws(() => validateLesson(lesson), /Actividad:/); }
});
test('GG-LESSON-001: story results distinguish observed position from authored costume without claiming pixel verification', () => {
  const lesson = getLesson('story'); const ir = starterIR('story');
  const result = evaluateLesson(lesson, {scene: scene(60), authoring: {ir}});
  assert.equal(result.passed, true);
  assert.equal(result.steps[0].checks[0].basis, 'execution');
  assert.equal(result.steps[1].checks[0].basis, 'authoring');
  assert.match(result.steps[1].checks[0].message, /No se comprobaron píxeles/);
  const wrongPosition = evaluateLesson(lesson, {scene: scene(40), authoring: {ir}});
  assert.equal(wrongPosition.passed, false);
  assert.equal(wrongPosition.steps[1].passed, true);
  assert.equal(evaluateLesson(lesson, {scene: scene(60), authoring: {ir: {version: 0, scripts: []}}}).passed, false);
});
test('GG-LESSON-001: score checks the separately read unique global ID, never a similarly named local or authoring value', () => {
  const input = {scene: scene(30, [{id: 'gg-score', name: 'Puntos', value: 999}]), variables: [{id: 'gg-pack-score', name: 'Puntos', value: 3}]};
  assert.equal(evaluateLesson(getLesson('score'), input).passed, true);
  assert.equal(evaluateLesson(getLesson('score'), {...input, variables: [{id: 'gg-pack-score', name: 'Puntos', value: 0}]}).passed, false);
  for (const value of [{id: 'wrong', name: 'Puntos', value: 3}, {id: 'gg-pack-score', name: 'Puntos', value: NaN},
    {id: 'gg-pack-score', name: 'Puntos', value: 3, scope: 'global'}]) assert.throws(() => validateLessonVariable(value, 'gg-pack-score'));
});
test('GG-LESSON-001: text completion needs explicit copy provenance, actual text execution and unchanged block authoring', () => {
  for (const language of ['javascript', 'python']) {
    const identity = {projectId: 'project-1', documentId: 'text-doc', backend: language};
    const copyFacts = [{projectId: 'project-1', documentId: 'text-doc', language, blocklyHashAtCopy: 'original-blocks'}];
    const input = {scene: scene(18), identity, copyFacts, authoring: {blocklyHash: 'original-blocks'}};
    assert.equal(evaluateLesson(getLesson('text-transition'), input).passed, true);
    assert.equal(evaluateLesson(getLesson('text-transition'), {...input, copyFacts: []}).passed, false);
    assert.equal(evaluateLesson(getLesson('text-transition'), {...input, authoring: {blocklyHash: 'edited-blocks'}}).passed, false);
    assert.equal(evaluateLesson(getLesson('text-transition'), {...input, identity: {...identity, documentId: 'other'}}).passed, false);
    assert.equal(evaluateLesson(getLesson('text-transition'), {...input, identity: {...identity, projectId: 'another-project'}}).passed, false);
  }
});
