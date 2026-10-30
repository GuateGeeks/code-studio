// Pure pack migrations (ADR-011): reviewed data records, chain lookup and
// block transforms over both workspace shapes. No Blockly, DOM or storage.
import {scene2DObjectsFromInitialScene} from './scene2d-objects.mjs';
const fail = message => { throw new Error(`GG migraciones: ${message}`); };
const identifier = /^[A-Za-z_][A-Za-z0-9_:-]{0,127}$/;
const version = /^\d+\.\d+\.\d+$/;
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
function plain(value) { return value && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value)); }
function names(map, label) {
  if (!plain(map)) fail(label + ': se esperaba un objeto');
  const targets = new Set();
  for (const [from, to] of Object.entries(map)) {
    if (forbidden.has(from) || forbidden.has(to) || !identifier.test(from) || typeof to !== 'string' || !identifier.test(to)) fail(label + ': nombre inválido');
    if (targets.has(to)) fail(label + ': dos nombres convergen en ' + to);
    targets.add(to);
  }
  return map;
}
function perType(map, label, check) {
  if (!plain(map)) fail(label + ': se esperaba un objeto');
  for (const [type, inner] of Object.entries(map)) { if (forbidden.has(type) || !identifier.test(type)) fail(label + ': tipo inválido'); check(inner, label + ' ' + type); }
  return map;
}
function scalarMap(map, label) {
  if (!plain(map)) fail(label + ': se esperaba un objeto');
  for (const [field, values] of Object.entries(map)) {
    if (forbidden.has(field) || !identifier.test(field) || !plain(values)) fail(label + ': campo inválido');
    for (const [from, to] of Object.entries(values)) if (forbidden.has(from) || !['string', 'number', 'boolean'].includes(typeof to)) fail(label + ': valor inválido');
  }
  return map;
}

// Reviewed configuration transforms a record may name in `config` (pure, data
// in → data out). Like the pack config validators, records only name installed
// code; a project file never brings its own.
export const packConfigMigrations = Object.freeze({'scene2d-objects-from-initial-scene-v1': scene2DObjectsFromInitialScene});
export function migratePackConfig(name, config) {
  if (typeof name !== 'string' || !Object.hasOwn(packConfigMigrations, name)) fail('transformación de configuración no instalada');
  return packConfigMigrations[name](structuredClone(config));
}

// `fields`, `inputs` and `values` are keyed by the block type after renaming.
export function validateMigrationRecord(record) {
  if (!plain(record)) fail('registro inválido');
  const allowed = ['id', 'fromVersion', 'toVersion', 'rename', 'blocks', 'config'];
  if (Object.keys(record).some(key => !allowed.includes(key))) fail('propiedad no permitida en registro');
  if (typeof record.id !== 'string' || !/^gg\.[a-z0-9][a-z0-9.-]{0,63}$/.test(record.id)) fail('ID de pack inválido');
  if (!version.test(record.fromVersion ?? '') || !version.test(record.toVersion ?? '') || record.fromVersion === record.toVersion) fail('versiones inválidas');
  if (!plain(record.rename)) fail('rename inválido');
  for (const [from, to] of Object.entries(record.rename)) if (forbidden.has(from) || forbidden.has(to) || typeof to !== 'string' || !to) fail('rename inválido');
  if (record.config !== undefined && (typeof record.config !== 'string' || !Object.hasOwn(packConfigMigrations, record.config))) fail('transformación de configuración no instalada');
  if (record.blocks !== undefined) {
    if (!plain(record.blocks) || Object.keys(record.blocks).some(key => !['types', 'fields', 'inputs', 'values'].includes(key))) fail('transformación de bloques inválida');
    if (record.blocks.types) names(record.blocks.types, 'tipos');
    if (record.blocks.fields) perType(record.blocks.fields, 'campos', names);
    if (record.blocks.inputs) perType(record.blocks.inputs, 'entradas', names);
    if (record.blocks.values) perType(record.blocks.values, 'valores', scalarMap);
  }
  return structuredClone(record);
}

// Edges come from the catalog's standalone records and from installed manifests
// (`migrations` with `toVersion`). Catalog records come first: manifests are
// frozen by their hash, so a corrected migration can only live in the catalog.
// Breadth-first, so the shortest chain wins.
export function migrationEdges(id, {catalog, records = []}) {
  const edges = [];
  for (const record of records) if (record.id === id) edges.push(validateMigrationRecord(record));
  for (const item of catalog) if (item.manifest.id === id) for (const migration of item.manifest.migrations ?? []) edges.push(validateMigrationRecord({id, fromVersion: item.manifest.version, ...migration}));
  return edges;
}
export function findMigrationChain(id, fromVersion, toVersion, {catalog, records = []}) {
  if (fromVersion === toVersion) return [];
  const edges = migrationEdges(id, {catalog, records});
  const installed = new Set(catalog.filter(item => item.manifest.id === id).map(item => item.manifest.version));
  const queue = [[fromVersion, []]], seen = new Set([fromVersion]);
  while (queue.length) {
    const [current, path] = queue.shift();
    for (const edge of edges.filter(item => item.fromVersion === current && installed.has(item.toVersion))) {
      if (edge.toVersion === toVersion) return [...path, edge];
      if (!seen.has(edge.toVersion)) { seen.add(edge.toVersion); queue.push([edge.toVersion, [...path, edge]]); }
    }
  }
  fail(`migración no instalada: ${id} ${fromVersion} → ${toVersion}`);
}

function transformBlock(block, transforms, changed) {
  let touched = false;
  const type = transforms.types?.[block.type];
  if (type) { block.type = type; touched = true; }
  const fieldNames = transforms.fields?.[block.type], inputNames = transforms.inputs?.[block.type], values = transforms.values?.[block.type];
  if (fieldNames && plain(block.fields)) {
    for (const [from, to] of Object.entries(fieldNames)) if (Object.hasOwn(block.fields, from)) {
      if (Object.hasOwn(block.fields, to)) fail(`campo ${to} ya existe en el bloque ${block.id}`);
      block.fields[to] = block.fields[from]; delete block.fields[from]; touched = true;
    }
  }
  if (values && plain(block.fields)) {
    for (const [field, mapping] of Object.entries(values)) {
      const current = block.fields[field];
      if (Object.hasOwn(block.fields, field) && (typeof current === 'string' || typeof current === 'number' || typeof current === 'boolean') && Object.hasOwn(mapping, String(current))) { block.fields[field] = mapping[String(current)]; touched = true; }
    }
  }
  if (inputNames && plain(block.inputs)) {
    for (const [from, to] of Object.entries(inputNames)) if (Object.hasOwn(block.inputs, from)) {
      if (Object.hasOwn(block.inputs, to)) fail(`entrada ${to} ya existe en el bloque ${block.id}`);
      block.inputs[to] = block.inputs[from]; delete block.inputs[from]; touched = true;
    }
  }
  if (touched) changed.add(block.id);
}
// Nested Blockly serialization: inputs/next hold {block, shadow} children.
function walkNested(block, transforms, changed, depth = 0) {
  if (!plain(block)) return;
  if (depth > 256) fail('workspace demasiado profundo');
  transformBlock(block, transforms, changed);
  for (const connection of [...Object.values(plain(block.inputs) ? block.inputs : {}), block.next]) {
    if (!plain(connection)) continue;
    walkNested(connection.block, transforms, changed, depth + 1);
    walkNested(connection.shadow, transforms, changed, depth + 1);
  }
}
function hasTransforms(transforms) { return Boolean(transforms && Object.values(transforms).some(map => map && Object.keys(map).length)); }
// Returns a copy; IDs, positions, connections and unmapped values never change.
export function transformWorkspace(workspace, transforms) {
  const result = structuredClone(workspace);
  const changed = new Set();
  if (!hasTransforms(transforms) || !plain(result)) return {workspace: result, changed: []};
  if (Array.isArray(result.nodes)) for (const node of result.nodes) transformBlock(node, transforms, changed); // flat graph: inputs map to node IDs
  else if (plain(result.blocks) && Array.isArray(result.blocks.blocks)) for (const block of result.blocks.blocks) walkNested(block, transforms, changed);
  return {workspace: result, changed: [...changed]};
}
export function combineBlockTransforms(chain) { return chain.map(edge => edge.blocks).filter(hasTransforms); }
export function applyBlockTransforms(workspace, transformList) {
  let current = workspace; const changed = new Set();
  for (const transforms of transformList) { const step = transformWorkspace(current, transforms); current = step.workspace; step.changed.forEach(id => changed.add(id)); }
  return {workspace: current, changed: [...changed]};
}
