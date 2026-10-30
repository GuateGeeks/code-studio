// API v3 vocabulary (ADR-011). The unbundled Python worker imports it, so it
// reaches only relative data modules (never acorn or any package).
import {scene2DVocabularyFromTables} from '../../packs/language-tables.mjs';
import {isScene2DSpriteId, scene2DStageAllows} from '../../contracts/scene2d-objects.mjs';

// Statements and events come from the language tables (one source per block).
const derived = scene2DVocabularyFromTables();
export const scene2DApi3 = Object.freeze({
  statements: Object.freeze(derived.statements),
  events: Object.freeze(derived.events),
  shared: 'shared',
  waitUntil: 'waitUntil',
  compare: Object.freeze({'==': 'EQ', '===': 'EQ', '<': 'LT', '>': 'GT'})
});

// scene2d-multi-sprite 2.2: runtime.targetIds ({identifier: targetId}) names
// the objects a 2D API3 document programs. None: hero, as every earlier copy.
// One: the text of that object's view (`onStart`, `cesta.move`). Several: a
// copy of the project, where each event names its object (`cesta.onStart`).
export function api3DocumentObjects(targetIds = {}) {
  const entries = Object.entries(Object.keys(targetIds).length ? targetIds : {hero: 'hero'});
  for (const [, targetId] of entries) if (targetId !== 'stage' && !isScene2DSpriteId(targetId)) throw new Error('Objeto desconocido en el documento.');
  return entries.map(([identifier, targetId]) => ({identifier, targetId, stage: targetId === 'stage'}));
}
// The stage rule of the IR (scene2DStageAllows): the same answer in text.
export const api3StageForbids = (key, vocabulary = scene2DApi3) => {
  const action = Object.hasOwn(vocabulary.statements, key ?? '') ? vocabulary.statements[key] : Object.hasOwn(vocabulary.events, key ?? '') ? vocabulary.events[key] : null;
  return action ? !scene2DStageAllows(action.ir) : false;
};
