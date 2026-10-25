// API v3 vocabulary (ADR-011). The unbundled Python worker imports it, so it
// reaches only relative data modules (never acorn or any package).
import {scene2DVocabularyFromTables} from '../../packs/language-tables.mjs';

// Statements and events come from the language tables (one source per block).
const derived = scene2DVocabularyFromTables();
export const scene2DApi3 = Object.freeze({
  statements: Object.freeze(derived.statements),
  events: Object.freeze(derived.events),
  shared: 'shared',
  compare: Object.freeze({'==': 'EQ', '===': 'EQ', '<': 'LT', '>': 'GT'})
});
