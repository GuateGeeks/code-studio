import {api3LanguageKeywords} from './api3-names.mjs';
import {operationDescriptors, capabilityBlockDefinitions, operationBlockType} from './operations.mjs';

// Blockable rules for language tables (ADR-011). A table is data: one entry
// per block, with its text forms and lowering. Installation rejects a table
// that would make text → blocks ambiguous.
const fail = message => { throw new Error(`GG tabla de lenguaje: ${message}`); };
const kinds = new Set(['call', 'event', 'assign', 'change', 'read', 'control', 'value']);
const identifier = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;
const argument = /^[A-Z][A-Z0-9_]{0,31}$|^[a-z][A-Za-z0-9]{0,63}(?:\.[a-z][A-Za-z0-9]{0,63})*$/;
const blockType = /^[a-z][A-Za-z0-9_]{0,63}$/;
function plain(value) { return value && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value)); }
const allowedFields = ['block', 'kind', 'target', 'js', 'python', 'typescript', 'register', 'option', 'ctx', 'args', 'append', 'stops', 'supersedes', 'variable', 'format', 'lower'];

export function validateLanguageEntry(entry, label = 'entrada') {
  if (!plain(entry)) fail(`${label}: se esperaba un objeto`);
  for (const key of Object.keys(entry)) if (!allowedFields.includes(key)) fail(`${label}: propiedad no permitida ${key}`);
  if (typeof entry.block !== 'string' || !blockType.test(entry.block)) fail(`${label}: tipo de bloque inválido`);
  if (!kinds.has(entry.kind)) fail(`${entry.block}: tipo de entrada desconocido`);
  if (entry.args !== undefined && (!Array.isArray(entry.args) || entry.args.some(name => typeof name !== 'string' || !argument.test(name)) || new Set(entry.args).size !== entry.args.length)) fail(`${entry.block}: argumentos inválidos`);
  for (const language of ['js', 'python']) if (entry[language] !== undefined) {
    if (typeof entry[language] !== 'string' || !identifier.test(entry[language])) fail(`${entry.block}: nombre ${language} inválido`);
    if (api3LanguageKeywords.has(entry[language])) fail(`${entry.block}: «${entry[language]}» es una palabra reservada`);
  }
  if ((entry.js === undefined) !== (entry.python === undefined)) fail(`${entry.block}: cada bloque declara forma JavaScript y Python, o ninguna`);
  if (entry.typescript !== undefined) {
    if (typeof entry.typescript !== 'string' || entry.typescript.length > 256) fail(`${entry.block}: plantilla TypeScript inválida`);
    const placeholders = [...entry.typescript.matchAll(/\{([A-Z][A-Z0-9_]*)\}/g)].map(match => match[1]).filter(name => !['BODY', 'ELSE'].includes(name));
    if ([...new Set(placeholders)].sort().join() !== [...(entry.args ?? [])].sort().join()) fail(`${entry.block}: la plantilla debe usar exactamente sus argumentos`);
  }
  if (entry.target !== undefined && entry.target !== 'sprite') fail(`${entry.block}: objetivo desconocido`);
  if (!plain(entry.lower) || !Object.keys(entry.lower).length) fail(`${entry.block}: falta la bajada a ejecución`);
  return entry;
}

// A set of tables active together in one context (core + packs).
export function validateLanguageTables(tables) {
  const blocks = new Map(), forms = new Map();
  for (const [owner, entries] of Object.entries(tables)) {
    if (!Array.isArray(entries)) fail(`${owner}: la tabla debe ser una lista`);
    for (const entry of entries) {
      validateLanguageEntry(entry, owner);
      if (blocks.has(entry.block)) fail(`${entry.block} aparece en ${blocks.get(entry.block)} y en ${owner}`);
      blocks.set(entry.block, owner);
    }
  }
  const all = Object.values(tables).flat();
  for (const entry of all) for (const language of ['js', 'python', 'typescript']) {
    if (entry[language] === undefined || entry.kind === 'control') continue;
    const key = `${language}:${entry.target ?? ''}:${entry[language]}`;
    const other = forms.get(key);
    if (other && other.supersedes !== entry.block && entry.supersedes !== other.block) fail(`${entry.block} y ${other.block} tienen la misma forma ${language}; una forma canónica por bloque`);
    if (!other || entry.supersedes === other.block) forms.set(key, entry);
  }
  for (const entry of all) if (entry.supersedes && !blocks.has(entry.supersedes)) fail(`${entry.block} reemplaza a ${entry.supersedes}, que no está en las tablas`);
  return tables;
}

// 3D/web: entries derived from the operation descriptors and the capability
// control blocks, so those packs need no hand-written table.
export function capabilityLanguageEntries(contextId) {
  const operations = operationDescriptors.filter(item => item.contexts.includes(contextId)).map(operation => {
    const name = operation.id.split('.').at(-1);
    return {block: operationBlockType(operation.id), kind: 'call', js: name, python: name.replace(/[A-Z]/g, letter => '_' + letter.toLowerCase()), ctx: operation.publicPath.join('.'), lower: {operation: operation.id}};
  });
  const control = capabilityBlockDefinitions.filter(definition => !definition.type.startsWith('gg_scene3d_') && !definition.type.startsWith('gg_webapp_')).map(definition => {
    const event = definition.type.replace('gg_cap_', '');
    const kind = ['start', 'click', 'input', 'submit', 'key'].includes(event) ? 'event' : ['setVariable'].includes(event) ? 'assign' : event === 'changeVariable' ? 'change' : event === 'variable' ? 'value' : 'control';
    return {block: definition.type, kind, lower: {capability: event}};
  });
  return [...control, ...operations];
}

// Readable languages of one context («Disponibilidad de lenguajes por contexto»).
// A pack makes a language unavailable when one of its actions or events for
// this lowering has no form in it. Core structures (assignments, reads,
// control and capability events) use the core syntax and never count.
const languageFields = Object.freeze({javascript: 'js', python: 'python'});
const languageNames = Object.freeze({javascript: 'JavaScript', python: 'Python'});
export function languageAvailability(tables, {lowering}) {
  const result = {};
  for (const [language, field] of Object.entries(languageFields)) {
    const packs = Object.entries(tables)
      .filter(([, entries]) => entries.some(entry => entry.lower?.[lowering] !== undefined && ['call', 'event'].includes(entry.kind) && entry[field] === undefined))
      .map(([owner]) => owner);
    const name = languageNames[language];
    result[language] = Object.freeze({available: packs.length === 0, packs: Object.freeze(packs),
      reason: packs.length ? `${name} no está disponible: ${packs.join(', ')} no declara forma ${name} para sus bloques.` : null});
  }
  return Object.freeze(result);
}
// Tables of the packs a project locks: apiVersion 2 manifests carry their
// own table; published versions use the catalog tables keyed `pack@version`.
export function tablesForLocks(locks, tables, manifests = {}) {
  const active = {};
  for (const lock of locks ?? []) {
    const key = `${lock.id}@${lock.version}`;
    const table = manifests[key]?.language ?? tables[key];
    if (table) active[key] = table;
  }
  return active;
}

// Every installed block has exactly one entry, and every entry names an installed block.
export function languageCoverage(catalog, {tables, core = []}) {
  const missing = [], orphan = [];
  for (const item of catalog) {
    const key = `${item.manifest.id}@${item.manifest.version}`;
    const declared = item.manifest.apiVersion === 2 ? item.manifest.language : item.manifest.context === 'scene3d' || item.manifest.context === 'webapp' ? null : tables[key];
    const contributed = (item.manifest.contributions?.blocks ?? []).map(block => block.type);
    if (declared === null) continue; // derived from operations (capabilityLanguageEntries)
    if (!declared) { if (contributed.length) missing.push(`${key}: sin tabla`); continue; }
    const covered = new Set(declared.map(entry => entry.block));
    for (const type of contributed) if (!covered.has(type)) missing.push(`${key}: ${type}`);
    for (const type of covered) if (!contributed.includes(type)) orphan.push(`${key}: ${type}`);
  }
  return {missing, orphan, core: core.map(entry => entry.block)};
}

// Core control structures that a context offers only when an active pack lists
// their block in its toolbox (scene2d-vocabulary-v2 E1). Blocks, parser and
// translators share this gate, so gg.sprites@0.1.0 projects keep exactly
// their previous vocabulary. Existing core structures (repeat, if) are always on.
export const gatedCoreStructures = Object.freeze({gg_forever: 'forever', gg_repeat_until: 'repeatUntil', gg_wait_until: 'waitUntil', gg_stop_script: 'stopScript'});
export function offeredCoreStructures(packs, {context = 'scratch-2d'} = {}) {
  const types = new Set();
  const visit = items => { for (const item of items ?? []) { if (item?.kind === 'block' && typeof item.type === 'string') types.add(item.type); if (Array.isArray(item?.contents)) visit(item.contents); } };
  for (const pack of packs ?? []) if ((pack.manifest.context ?? 'scratch-2d') === context) visit(pack.manifest.contributions?.toolbox);
  return new Set(Object.entries(gatedCoreStructures).filter(([block]) => types.has(block)).map(([, kind]) => kind));
}
