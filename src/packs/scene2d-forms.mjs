import {spritesPack03} from './gg.sprites/manifest.mjs';
import {spriteLanguage03} from './language-tables.mjs';

// API v3 call forms of the 2D sprite vocabulary, joined with the installed
// lowering rules: each argument slot of the table names the IR field that
// carries it. The generator reads these data instead of a hand-written switch.
const rules = spritesPack03.contributions.statements;
export const scene2DCallForms = Object.freeze(spriteLanguage03.filter(entry => entry.kind === 'call' && entry.lower.ir).map(entry => {
  const rule = rules[entry.block];
  if (!rule || rule.kind !== entry.lower.ir) throw new Error('GG tabla 2D: la bajada de ' + entry.block + ' no coincide con su regla');
  const args = entry.args.map(slot => {
    const found = Object.entries(rule.values ?? {}).find(([, binding]) => (binding.input ?? binding.field) === slot);
    if (!found) throw new Error('GG tabla 2D: ' + entry.block + ' no declara ' + slot);
    return Object.freeze({slot, field: found[0], type: found[1].type ?? (found[1].enum ? 'enum' : 'text')});
  });
  return Object.freeze({block: entry.block, kind: entry.lower.ir, target: entry.target ?? null, js: entry.js, python: entry.python,
    ...(entry.append !== undefined ? {append: entry.append} : {}), ...(entry.stops ? {stops: true} : {}), args: Object.freeze(args)});
}));
// IR kind → Blockly numeric input → IR field, for numeric-shadow identity.
export const scene2DNumericSlots = Object.freeze(Object.fromEntries(Object.values(rules).filter(rule => rule.values).map(rule => [rule.kind,
  Object.freeze(Object.fromEntries(Object.entries(rule.values).filter(([, binding]) => binding.input && ['expression', 'number'].includes(binding.type)).map(([field, binding]) => [binding.input, field])))])));
