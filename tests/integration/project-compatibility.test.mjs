import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {localPackCatalog} from '../../src/packs/catalog.mjs';
import {createCapabilities, validateCapabilities, migrateCapabilities, supportedPackApiVersions} from '../../src/contracts/packs.mjs';
import {operationPermissionGrantsByVersion, resolveOperationProfile} from '../../src/contracts/operations.mjs';
import {currentEngineLocks, engineLockHistory, isCompatibleEngineLocks} from '../../src/contracts/engine-locks.mjs';
import {validateMigrationRecord, findMigrationChain, transformWorkspace} from '../../src/contracts/pack-migrations.mjs';
import {createProject, parseProject, serializeProject} from '../../src/project-format.mjs';
import {createProjectArchive, parseProjectArchive} from '../../src/project-archive.mjs';
import {availablePackUpdates, migrateProject, describeMigrationSummary} from '../../src/project-migration.mjs';
import {createTextDocument, resolveTextDocumentApi} from '../../src/text-documents.mjs';
import {buildProjectCatalog} from '../../tools/f1/build-project-catalog.mjs';
import {createTone} from '../../tools/f0/tone.mjs';

const assets = {};
for (const name of ['stage', 'hero', 'hero-alt']) {
  const content = await readFile(new URL(`../../src/assets/${name}.svg`, import.meta.url), 'utf8');
  assets[createHash('md5').update(content).digest('hex')] = content;
}
const tone = createTone().buffer;
assets[createHash('md5').update(tone).digest('hex')] = {type: 'Sound', format: 'wav', encoding: 'base64', data: tone.toString('base64')};
const catalog = await buildProjectCatalog({assets, costumes: [], sounds: []});

const number = (id, value) => ({shadow: {type: 'math_number', id, fields: {NUM: value}}});
const scoreBlockly = {blocks: {languageVersion: 0, blocks: [{type: 'gg_when_start', id: 'compat-start', x: 10, y: 20, inputs: {DO: {block: {
  type: 'gg_score_set', id: 'compat-set', inputs: {VALUE: number('compat-initial', 1)},
  next: {block: {type: 'gg_score_change', id: 'compat-change', inputs: {DELTA: number('compat-delta', 2)}}}}}}}]}};
const oldScore = () => createCapabilities(['gg.sprites', 'gg.score'], {versions: {'gg.score': '0.1.0'},
  config: {'gg.score': {variableId: 'gg-pack-score', label: 'Puntos', initial: 0}}});
const scoreProject = () => createProject({name: 'Compatibilidad', blockly: scoreBlockly, deviceSource: '', catalog, capabilities: oldScore()});

test('GG-COMPAT-001: engine locks accept registered earlier sets in any key order and reject unknown engines by name', async () => {
  assert.deepEqual(catalog.locks, currentEngineLocks);
  assert.ok(engineLockHistory.some(item => JSON.stringify(item) === JSON.stringify(currentEngineLocks)));
  const document = await scoreProject();
  const reordered = structuredClone(document); reordered.locks = Object.fromEntries(Object.entries(document.locks).reverse());
  assert.deepEqual(await parseProject(JSON.stringify(reordered), {catalog}), document);
  const earlier = {...currentEngineLocks, blockly: '13.3.0'};
  const old = structuredClone(document); old.locks = earlier;
  await assert.rejects(parseProject(JSON.stringify(old), {catalog}), /blockly "13\.3\.0".*más reciente/);
  const opened = await parseProject(JSON.stringify(old), {catalog, engineHistory: [currentEngineLocks, earlier]});
  assert.deepEqual(opened.locks, earlier, 'opening keeps the declared set');
  const resaved = await createProject({...opened.authoring, name: opened.project.name, catalog, capabilities: opened.capabilities, resources: opened.resources});
  assert.deepEqual(resaved.locks, currentEngineLocks, 'saving declares the current set');
  assert.equal(isCompatibleEngineLocks({...currentEngineLocks, blockly: '999.0.0'}), false);
});

test('GG-COMPAT-002: operation grants derive from pack@version data and manifest API versions come from a declared list', () => {
  for (const item of localPackCatalog.filter(entry => ['gg.3d-basic', 'gg.3d-advanced', 'gg.webapps'].includes(entry.manifest.id))) {
    assert.deepEqual(operationPermissionGrantsByVersion[`${item.manifest.id}@${item.manifest.version}`], item.manifest.permissions.operations, item.manifest.id);
  }
  const profile = resolveOperationProfile({contextId: 'scene3d', documentId: 'scene-main', capabilities: createCapabilities(['gg.3d-basic'])});
  assert.deepEqual(profile.operations.map(op => op.id).sort(), [...operationPermissionGrantsByVersion['gg.3d-basic@0.1.0']].sort());
  assert.deepEqual(supportedPackApiVersions, [1, 2]);
  const future = structuredClone(localPackCatalog.find(entry => entry.manifest.id === 'gg.sprites'));
  future.manifest.apiVersion = 3;
  const syntheticCatalog = localPackCatalog.filter(entry => entry.manifest.id !== 'gg.sprites').concat(future);
  assert.throws(() => createCapabilities(['gg.sprites'], {catalog: syntheticCatalog}), /hash\/API incompatible/);
  future.manifest.apiVersion = 2;
  assert.throws(() => createCapabilities(['gg.sprites'], {catalog: syntheticCatalog}), /tabla de lenguaje ausente/);
});

test('GG-COMPAT-003: block transforms rename types, fields, inputs and values in nested Blockly and flat graphs keeping IDs', () => {
  const transforms = {types: {gg_score_change: 'gg_score_add'}, fields: {math_number: {NUM: 'VALUE'}}, inputs: {gg_score_add: {DELTA: 'AMOUNT'}}, values: {math_number: {VALUE: {'2': 5}}}};
  const {workspace, changed} = transformWorkspace(scoreBlockly, transforms);
  const start = workspace.blocks.blocks[0], set = start.inputs.DO.block, change = set.next.block;
  assert.equal(change.type, 'gg_score_add'); assert.equal(change.id, 'compat-change');
  assert.deepEqual(Object.keys(change.inputs), ['AMOUNT']);
  assert.deepEqual(change.inputs.AMOUNT.shadow, {type: 'math_number', id: 'compat-delta', fields: {VALUE: 5}});
  assert.deepEqual(set.inputs.VALUE.shadow.fields, {VALUE: 1});
  assert.deepEqual([start.id, start.x, start.y], ['compat-start', 10, 20]);
  assert.deepEqual(changed.sort(), ['compat-change', 'compat-delta', 'compat-initial']);
  assert.equal(scoreBlockly.blocks.blocks[0].inputs.DO.block.next.block.type, 'gg_score_change', 'input is not mutated');
  assert.deepEqual(transformWorkspace(scoreBlockly, {types: {gg_unrelated: 'gg_other'}}).workspace, scoreBlockly);
  const graph = {version: 1, nodes: [{id: 'n1', type: 'gg_mb_show_leds', fields: {LEDS: '1'}, inputs: {}, next: 'n2', x: 0, y: 0}, {id: 'n2', type: 'gg_mb_clear', fields: {}, inputs: {}, next: null, x: 0, y: 0}], roots: ['n1']};
  const migrated = transformWorkspace(graph, {types: {gg_mb_show_leds: 'gg_mb_show_image'}, fields: {gg_mb_show_image: {LEDS: 'IMAGE'}}});
  assert.deepEqual(migrated.workspace.nodes[0], {id: 'n1', type: 'gg_mb_show_image', fields: {IMAGE: '1'}, inputs: {}, next: 'n2', x: 0, y: 0});
  assert.deepEqual(migrated.workspace.nodes[1], graph.nodes[1]);
  assert.throws(() => transformWorkspace({blocks: {languageVersion: 0, blocks: [{type: 'a', id: 'x', fields: {A: 1, B: 2}}]}}, {fields: {a: {A: 'B'}}}), /ya existe/);
});

test('GG-COMPAT-003: migration records are validated data and chains are found breadth-first over installed versions', () => {
  for (const record of [{id: 'gg.x', fromVersion: '0.1.0', toVersion: '0.1.0', rename: {}}, {id: 'gg.x', fromVersion: '0.1.0', toVersion: '0.2.0', rename: {}, code: 'x'},
    {id: 'gg.x', fromVersion: '0.1.0', toVersion: '0.2.0', rename: {}, blocks: {types: {a: 'c', b: 'c'}}}, '{"id":"gg.x","fromVersion":"0.1.0","toVersion":"0.2.0","rename":{},"blocks":{"types":{"__proto__":"x"}}}']) {
    assert.throws(() => validateMigrationRecord(typeof record === 'string' ? JSON.parse(record) : structuredClone(record)), /GG migraciones/);
  }
  const manifest = version => ({manifest: {id: 'gg.x', version, migrations: []}});
  const synthetic = [manifest('0.1.0'), manifest('0.2.0'), manifest('0.3.0')];
  const records = [{id: 'gg.x', fromVersion: '0.1.0', toVersion: '0.2.0', rename: {a: 'b'}}, {id: 'gg.x', fromVersion: '0.2.0', toVersion: '0.3.0', rename: {}, blocks: {types: {gg_x_old: 'gg_x_new'}}}];
  assert.deepEqual(findMigrationChain('gg.x', '0.1.0', '0.3.0', {catalog: synthetic, records}).map(step => step.toVersion), ['0.2.0', '0.3.0']);
  assert.throws(() => findMigrationChain('gg.x', '0.3.0', '0.1.0', {catalog: synthetic, records}), /migración no instalada/);
  assert.deepEqual(findMigrationChain('gg.score', '0.1.0', '0.2.0', {catalog: localPackCatalog}).map(step => step.rename), [{initial: 'initialValue'}]);
});

test('GG-COMPAT-004: project migration is explicit, atomic, keeps block IDs and reports a summary', async () => {
  const document = await scoreProject();
  const before = structuredClone(document);
  assert.deepEqual(availablePackUpdates(document.capabilities), [{id: 'gg.score', fromVersion: '0.1.0', toVersion: '0.2.0'}]);
  const records = [{id: 'gg.score', fromVersion: '0.1.0', toVersion: '0.2.0', rename: {initial: 'initialValue'}, blocks: {values: {math_number: {NUM: {'2': 4}}}}}];
  const {document: migrated, summary} = await migrateProject(document, [{id: 'gg.score', toVersion: '0.2.0'}], {catalog, records});
  assert.deepEqual(document, before, 'original untouched');
  assert.equal(migrated.capabilities.locks.find(lock => lock.id === 'gg.score').version, '0.2.0');
  assert.equal(migrated.capabilities.config['gg.score'].initialValue, 0);
  const delta = migrated.authoring.blockly.blocks.blocks[0].inputs.DO.block.next.block.inputs.DELTA.shadow;
  assert.deepEqual(delta, {type: 'math_number', id: 'compat-delta', fields: {NUM: 4}});
  assert.deepEqual(summary, [{id: 'gg.score', fromVersion: '0.1.0', toVersion: '0.2.0', steps: 1, changedBlocks: 1}]);
  assert.equal(describeMigrationSummary(summary), 'gg.score 0.1.0 → 0.2.0 (1 bloque actualizado)');
  assert.deepEqual(await parseProject(serializeProject(migrated), {catalog}), migrated);
  assert.deepEqual(availablePackUpdates(migrated.capabilities), []);
  const plain = await migrateProject(document, [{id: 'gg.score', toVersion: '0.2.0'}], {catalog});
  assert.deepEqual(plain.document.authoring.blockly, document.authoring.blockly, 'installed migration renames config only');
  await assert.rejects(migrateProject(document, [{id: 'gg.score', toVersion: '9.0.0'}], {catalog}), /migración no instalada/);
  await assert.rejects(migrateProject(document, [{id: 'gg.webapps', toVersion: '0.2.0'}], {catalog}), /no seleccionado/);
  assert.deepEqual(document, before);
  assert.deepEqual(migrateCapabilities(oldScore(), {id: 'gg.score', toVersion: '0.2.0'}).config['gg.score'], {variableId: 'gg-pack-score', label: 'Puntos', initialValue: 0});
});

test('GG-COMPAT-005: text documents declare an API only in GGPROJ v4, accept compatible interpreters and resolve context APIs', async () => {
  const copy = createTextDocument({language: 'javascript', name: 'Copia', source: 'hero.move(1)'});
  const v3 = await createProject({name: 'Texto', blockly: scoreBlockly, deviceSource: '', catalog, capabilities: oldScore(), textDocuments: [copy], selectedTextDocumentId: copy.id});
  assert.equal(v3.version, 3);
  assert.equal(Object.hasOwn(v3.authoring.textDocuments[0].runtime, 'api'), false);
  assert.equal(resolveTextDocumentApi(v3.authoring.textDocuments[0], v3.capabilities), 'api1');
  const declared = {...copy, runtime: {...copy.runtime, api: 'api1'}};
  const v4 = await createProject({name: 'Texto', blockly: scoreBlockly, deviceSource: '', catalog, capabilities: oldScore(), textDocuments: [declared], selectedTextDocumentId: copy.id});
  assert.equal(v4.version, 4);
  assert.deepEqual(await parseProject(serializeProject(v4), {catalog}), v4);
  assert.deepEqual(await parseProjectArchive(await createProjectArchive(v4, {catalog}), {catalog}), v4);
  assert.equal(v4.authoring.textDocuments[0].source, 'hero.move(1)');
  const downgraded = structuredClone(v4); downgraded.version = 3;
  await assert.rejects(parseProject(JSON.stringify(downgraded), {catalog}), /requiere GGPROJ v4/);
  const unknownApi = structuredClone(v4); unknownApi.authoring.textDocuments[0].runtime.api = 'api9';
  await assert.rejects(parseProject(JSON.stringify(unknownApi), {catalog}), /API textual no soportada/);
  const oldInterpreter = structuredClone(v3); oldInterpreter.authoring.textDocuments[0].runtime.version = '0.0.1';
  await assert.rejects(parseProject(JSON.stringify(oldInterpreter), {catalog}), /runtime o versión no soportados.*más reciente/);
  const sceneCapabilities = {config: {'gg.3d-basic': {documentId: 'scene-main', mode: 'javascript', selectedTextDocumentId: copy.id, workspace: {}, scene: {}}}};
  assert.equal(resolveTextDocumentApi(copy, sceneCapabilities), 'api2');
  assert.equal(resolveTextDocumentApi(declared, sceneCapabilities), 'api1', 'a declared API wins');
});

test('GG-COMPAT-006: newer formats and missing packs explain what is needed and leave nothing mutated', async () => {
  const document = await scoreProject();
  const newer = structuredClone(document); newer.version = 5;
  await assert.rejects(parseProject(JSON.stringify(newer), {catalog}), /GGPROJ v5 es de una versión más reciente/);
  const missing = structuredClone(document);
  missing.capabilities.locks.push({id: 'gg.microbit', version: '0.9.0', sha256: '0'.repeat(64)});
  missing.capabilities.config['gg.microbit'] = {};
  await assert.rejects(parseProject(JSON.stringify(missing), {catalog}), /no instalado.*gg\.microbit 0\.9\.0.*más reciente/);
  assert.equal(validateCapabilities(document.capabilities).locks.length, 2);
});

test('GG-COMPAT-007: a project without explicit capabilities keeps its v2 shape and becomes v4 when a copy declares its API', async () => {
  const copy = createTextDocument({language: 'python', name: 'Copia', source: '@on_start\ndef inicio():\n    hero.move(1)\n', api: 'api3', variableIds: {}});
  const legacy = await createProject({name: 'Legado', blockly: scoreBlockly, deviceSource: '', catalog, textDocuments: [copy], selectedTextDocumentId: copy.id});
  assert.equal(legacy.version, 4);
  assert.equal(Object.hasOwn(legacy, 'capabilities'), false);
  assert.ok(legacy.scene, 'v2 scene shape is kept');
  assert.deepEqual(await parseProject(serializeProject(legacy), {catalog}), legacy);
  assert.deepEqual(await parseProjectArchive(await createProjectArchive(legacy, {catalog}), {catalog}), legacy);
  const plain = await createProject({name: 'Legado', blockly: scoreBlockly, deviceSource: '', catalog, textDocuments: [], selectedTextDocumentId: null});
  assert.equal(plain.version, 2, 'without a declared API the legacy version is unchanged');
});
