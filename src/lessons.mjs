import {lessonDefinitions} from './assets/lessons/catalog.mjs';

export const lessonLimits = Object.freeze({lessons: 8, steps: 8, checks: 8, hints: 3, bytes: 131072});
const fail = message => { throw new Error(`Actividad: ${message}`); };
const id = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value);
function text(value, maximum = 1024) { if (typeof value !== 'string' || !value.trim() || value.length > maximum) fail('texto inválido'); }
function object(value, fields) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value)) ||
      Object.keys(value).length !== fields.length || fields.some(field => !Object.hasOwn(value, field))) fail('propiedades no admitidas');
}
function json(value, depth = 0) {
  if (depth > 64) fail('datos demasiado profundos');
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return;
  if (!value || typeof value !== 'object' || (!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value)))) fail('se requieren datos JSON');
  if (Array.isArray(value) && (Object.keys(value).length !== value.length || Array.from({length: value.length}, (_, index) => index).some(index => !Object.hasOwn(value, index)))) fail('array disperso o con metadatos');
  for (const [key, child] of Object.entries(value)) { if (['__proto__', 'constructor', 'prototype'].includes(key)) fail('propiedad peligrosa'); json(child, depth + 1); }
}
export function validateLessonCheck(check) {
  switch (check?.kind) {
    case 'position':
      object(check, ['kind', 'axis', 'equals', 'tolerance']);
      if (!['x', 'y'].includes(check.axis) || !Number.isFinite(check.equals) || Math.abs(check.equals) > 1e6 ||
          !Number.isFinite(check.tolerance) || check.tolerance < 0 || check.tolerance > 1) fail('posición inválida');
      break;
    case 'variable':
      object(check, ['kind', 'variableId', 'equals']); text(check.variableId, 128);
      if (['__proto__', 'constructor', 'prototype'].includes(check.variableId) || !Number.isFinite(check.equals) || Math.abs(check.equals) > 1e6) fail('variable inválida');
      break;
    case 'authored-operation':
      if (check.operation === 'move') {
        object(check, ['kind', 'operation', 'steps']);
        if (!Number.isFinite(check.steps) || Math.abs(check.steps) > 1e6) fail('operación de autoría no admitida');
        break;
      }
      object(check, ['kind', 'operation', 'costume']);
      if (check.operation !== 'setCostume' || !['hero', 'hero-alt'].includes(check.costume)) fail('operación de autoría no admitida');
      break;
    case 'text-copy': case 'blocks-unchanged': case 'edited-in-text': object(check, ['kind']); break;
    default: fail('predicado no admitido');
  }
  return structuredClone(check);
}
export function validateLesson(lesson) {
  json(lesson);
  object(lesson, ['version', 'id', 'revision', 'title', 'introduction', 'starter', 'steps', ...(lesson?.version === 2 ? ['learning'] : [])]);
  if (![1, 2].includes(lesson.version) || !id(lesson.id) || !Number.isSafeInteger(lesson.revision) || lesson.revision < 1) fail('identidad inválida');
  text(lesson.title, 100); text(lesson.introduction);
  object(lesson.starter, ['name', 'packIds', 'blockly']); text(lesson.starter.name, 80);
  if (!Array.isArray(lesson.starter.packIds) || !lesson.starter.packIds.length || lesson.starter.packIds.length > 2 ||
      new Set(lesson.starter.packIds).size !== lesson.starter.packIds.length ||
      lesson.starter.packIds.some(pack => !['gg.sprites', 'gg.score'].includes(pack))) fail('pack de actividad no admitido');
  if (!lesson.starter.blockly || typeof lesson.starter.blockly !== 'object' || Array.isArray(lesson.starter.blockly) ||
      new TextEncoder().encode(JSON.stringify(lesson.starter.blockly)).length > 65536) fail('ejemplo Blockly inválido');
  if (!Array.isArray(lesson.steps) || !lesson.steps.length || lesson.steps.length > lessonLimits.steps) fail('límite de pasos');
  const ids = new Set();
  for (const step of lesson.steps) {
    object(step, ['id', 'title', 'instructions', 'hints', 'checks']);
    validateStep(step, ids);
  }
  if (lesson.version === 2) {
    const learning = lesson.learning;
    object(learning, ['objective', 'prerequisites', 'prediction', 'reflection', 'variant']);
    text(learning.objective); text(learning.prediction); text(learning.reflection);
    if (!Array.isArray(learning.prerequisites) || !learning.prerequisites.length || learning.prerequisites.length > 4) fail('conocimientos previos inválidos');
    for (const prerequisite of learning.prerequisites) text(prerequisite, 256);
    object(learning.variant, ['id', 'title', 'instructions', 'prediction', 'reflection', 'hints', 'checks']);
    text(learning.variant.prediction); text(learning.variant.reflection);
    validateStep(learning.variant, ids);
  }
  if (new TextEncoder().encode(JSON.stringify(lesson)).length > lessonLimits.bytes) fail('actividad demasiado grande');
  return structuredClone(lesson);
}
function validateStep(step, ids) {
  if (!id(step.id) || ids.has(step.id)) fail('ID de paso inválido o duplicado'); ids.add(step.id);
  text(step.title, 100); text(step.instructions);
  if (!Array.isArray(step.hints) || step.hints.length > lessonLimits.hints) fail('límite de pistas');
  for (const hint of step.hints) text(hint);
  if (!Array.isArray(step.checks) || !step.checks.length || step.checks.length > lessonLimits.checks) fail('límite de predicados');
  for (const check of step.checks) validateLessonCheck(check);
}
export function lessonSteps(lesson, mode = 'main') {
  if (mode === 'main') return lesson.steps;
  if (mode === 'variant' && lesson.version === 2) return [lesson.learning.variant];
  fail('recorrido no admitido');
}
function freeze(value) { if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value); } return value; }
export const lessonCatalog = freeze(lessonDefinitions.map(validateLesson));
if (new Set(lessonCatalog.map(lesson => lesson.id + '@' + lesson.revision)).size !== lessonCatalog.length || lessonCatalog.length > lessonLimits.lessons) fail('revisiones duplicadas');
const latest = id => lessonCatalog.filter(item => item.id === id).sort((a, b) => b.revision - a.revision)[0];
// A key names an activity: `id` is its latest revision and `id@N` an earlier
// one that remains readable with its own progress (e.g. text-transition@1).
export function lessonKey(lesson) { return latest(lesson.id).revision === lesson.revision ? lesson.id : lesson.id + '@' + lesson.revision; }
export function getLesson(key) {
  const [lessonId, revision] = typeof key === 'string' ? key.split('@') : [];
  const lesson = revision === undefined ? latest(lessonId) : lessonCatalog.find(item => item.id === lessonId && String(item.revision) === revision);
  if (!lesson) fail('actividad desconocida');
  return structuredClone(lesson);
}
export function earlierRevisions(key) {
  const lesson = getLesson(key);
  return lessonCatalog.filter(item => item.id === lesson.id && item.revision < lesson.revision).map(item => structuredClone(item));
}
export function getLessonStarter(key) {
  return {lessonId: getLesson(key).id, ...getLesson(key).starter};
}
