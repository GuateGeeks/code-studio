import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getLesson, validateLesson, lessonSteps} from '../../src/lessons.mjs';
import {evaluateLesson} from '../../src/lesson-evaluation.mjs';
import {validateLessonProgress} from '../../src/lesson-progress-store.mjs';

const legacy = JSON.parse(readFileSync(new URL('../fixtures/lessons-v1.json',import.meta.url),'utf8'));
const scene = x => ({sprites:[{id:'hero',name:'hero',x,y:0}],variables:[]});
test('E3: actual v1 definitions remain readable; primary starters, IDs, revision and checks are preserved',()=>{
  for(const before of legacy){
    assert.deepEqual(validateLesson(before),before);
    const after=getLesson(before.id+'@'+before.revision);
    assert.equal(after.version,2);assert.equal(after.revision,before.revision);
    assert.deepEqual(after.starter,before.starter);
    assert.deepEqual(after.steps.map(({id,checks})=>({id,checks})),before.steps.map(({id,checks})=>({id,checks})));
    assert.equal(lessonSteps(after,'variant').length,1);
    assert.ok(after.learning.objective&&after.learning.prediction&&after.learning.reflection);
    assert.ok(after.steps.every(step=>step.hints.length===3));
    assert.equal(after.learning.variant.hints.length,3);
  }
  const before=structuredClone(legacy[0]);before.learning={};assert.throws(()=>validateLesson(before));
});
test('E3: educational metadata rejects missing, unsafe, oversized and duplicate variant data',()=>{
  for(const mutate of [
    lesson=>{delete lesson.learning.objective;},lesson=>{lesson.learning.prediction=' ';},
    lesson=>{lesson.learning.prerequisites=Array(1);},lesson=>{lesson.learning.variant.id=lesson.steps[0].id;},
    lesson=>{lesson.learning.variant.checks=[{kind:'eval',source:'true'}];},
    lesson=>{lesson.learning.variant.callback=()=>true;},lesson=>{lesson.learning.variant.hints=Array(4).fill('a');},
    lesson=>{lesson.learning.reflection='a'.repeat(1025);},lesson=>{lesson.version=3;}
  ]){const lesson=getLesson('story');mutate(lesson);assert.throws(()=>validateLesson(lesson),/Actividad:/);}
  assert.throws(()=>lessonSteps(legacy[0],'variant'),/recorrido/);
});
test('E3: variants evaluate only their own real position, score and copy provenance predicates',()=>{
  const story=evaluateLesson(getLesson('story'),{scene:scene(80),mode:'variant'});
  assert.equal(story.passed,true);assert.deepEqual(story.steps.map(step=>step.id),['story-variant']);
  assert.equal(evaluateLesson(getLesson('story'),{scene:scene(60),mode:'variant'}).passed,false);
  const score={scene:scene(40),variables:[{id:'gg-pack-score',name:'Puntos',value:4}],mode:'variant'};
  assert.equal(evaluateLesson(getLesson('score'),score).passed,true);
  assert.equal(evaluateLesson(getLesson('score'),{...score,variables:[{id:'gg-pack-score',name:'Puntos',value:3}]}).passed,false);
  const text={scene:scene(24),mode:'variant',identity:{projectId:'p',documentId:'d',backend:'javascript'},authoring:{blocklyHash:'same'},copyFacts:[{projectId:'p',documentId:'d',language:'javascript',blocklyHashAtCopy:'same'}]};
  assert.equal(evaluateLesson(getLesson('text-transition@1'),text).passed,true);
  assert.equal(evaluateLesson(getLesson('text-transition@1'),{...text,copyFacts:[]}).passed,false);
  assert.equal(evaluateLesson(getLesson('text-transition@1'),{...text,authoring:{blocklyHash:'edited'}}).passed,false);
});
test('E3: legacy progress is unchanged and a variant ID never implies principal completion',()=>{
  const base={version:1,projectId:'old-project',lessonId:'story',lessonRevision:1,completedStepIds:['story-position']};
  assert.deepEqual(validateLessonProgress(base),base);
  assert.deepEqual(validateLessonProgress({...base,completedStepIds:['story-variant']}).completedStepIds,['story-variant']);
  assert.deepEqual(validateLessonProgress({...base,completedStepIds:['story-variant','story-position','story-costume']}).completedStepIds,['story-position','story-costume','story-variant']);
});
