import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createCapabilities, migrateCapabilities} from '../../src/contracts/packs.mjs';
import {createProject, parseProject, serializeProject, validateProject, upgradeProject, projectBlocklyWorkspace, scene2DAuthoringFromBlockly} from '../../src/project-format.mjs';
import {createProjectArchive, parseProjectArchive} from '../../src/project-archive.mjs';
import {availablePackUpdates, migrateProject} from '../../src/project-migration.mjs';
import {createProjectAuthoring} from '../../src/project-authoring.mjs';
import {emptyCodeView} from '../../src/code-views-state.mjs';
import {validateProgram, programLimits, scene2DProgramLimits, programObjectsFromIR0} from '../../src/contracts/program-contract.mjs';
import {loadWorkspace, workspaceToIR} from '../../src/editor/block-program.mjs';
import {toScratchProject} from '../../src/adapters/scratch/scratch-project.mjs';
import {authorizeProgram} from '../../src/contracts/pack-broker.mjs';
import {createResourceView} from '../../src/contracts/resources.mjs';
import {buildProjectCatalog} from '../../tools/f1/build-project-catalog.mjs';
import {createTone} from '../../tools/f0/tone.mjs';
import {editableExample} from '../fixtures/corpus.blocks.mjs';

// scene2d-multi-sprite tareas 1.3–1.4 (E2, 29/10/2026): GGPROJ v6 stores one
// Blockly workspace per object in authoring.scene2d when gg.sprites@0.3.0 is
// locked, and the 2D IR v1 gives every script its targetId. Earlier formats
// and IR0 stay exactly as they were. Multi-target execution is Task 4.
const assets = {};
for (const name of ['stage', 'hero', 'hero-alt']) {
  const content = await readFile(new URL(`../../src/assets/${name}.svg`, import.meta.url), 'utf8');
  assets[createHash('md5').update(content).digest('hex')] = content;
}
const tone = createTone().buffer;
assets[createHash('md5').update(tone).digest('hex')] = {type: 'Sound', format: 'wav', encoding: 'base64', data: tone.toString('base64')};
const catalog = await buildProjectCatalog({assets, costumes: [], sounds: []});
const heroPresents = JSON.parse(await readFile(new URL('../fixtures/canonical/scene2d/hero-presents/project.json', import.meta.url), 'utf8'));

const hero = {id: 'hero', name: 'hero', x: 0, y: 0, direction: 90, size: 100, visible: true, costume: 'hero'};
const cesta = {...hero, id: 'cesta', name: 'Cesta', x: 120};
const sprites = (version, list) => {
  const capabilities = createCapabilities(['gg.sprites'], {versions: {'gg.sprites': version}});
  if (list) capabilities.config['gg.sprites'] = {stage: {backdrop: 'stage'}, sprites: list};
  return capabilities;
};
const say = (id, text) => ({type: 'gg_say', id, fields: {MESSAGE: text}});
const cestaBlockly = {blocks: {languageVersion: 0, blocks: [{type: 'gg_when_start', id: 'cesta-start', x: 40, y: 60, inputs: {DO: {block: say('cesta-say', 'Hola')}}}]}};
const stageBlockly = {blocks: {languageVersion: 0, blocks: [{type: 'gg_when_start', id: 'stage-start', x: 10, y: 10}]}};
const empty = {};
const parse = document => parseProject(JSON.stringify(document), {catalog});
function irOf(blockly, capabilities) {
  const workspace = loadWorkspace(structuredClone(blockly), {capabilities});
  try { return workspaceToIR(workspace, {capabilities}); } finally { workspace.dispose(); }
}

test('MS-007: gg.sprites@0.3.0 projects are GGPROJ v6 with one workspace per object; earlier shapes keep their version', async () => {
  const capabilities = sprites('0.3.0');
  const document = await createProject({name: 'Nuevo', blockly: heroPresents.blockly, deviceSource: '', catalog, capabilities});
  assert.equal(document.version, 6);
  assert.deepEqual(Object.keys(document.authoring), ['scene2d', 'deviceSource', 'textDocuments', 'selectedTextDocumentId']);
  assert.deepEqual(document.authoring.scene2d, {stage: empty, sprites: {hero: heroPresents.blockly}}, 'same blocks, IDs, shadows and positions');
  assert.equal(Object.hasOwn(document.authoring, 'blockly'), false);
  assert.deepEqual(projectBlocklyWorkspace(document), heroPresents.blockly);
  assert.deepEqual(await parseProject(serializeProject(document), {catalog}), document);
  assert.deepEqual(await parseProjectArchive(await createProjectArchive(document, {catalog}), {catalog}), document);
  // Two sprites and the stage, each with its own scripts.
  const two = sprites('0.3.0', [hero, cesta]);
  const scene2d = {stage: stageBlockly, sprites: {hero: heroPresents.blockly, cesta: cestaBlockly}};
  const multi = await createProject({name: 'Diálogo', scene2d, deviceSource: '', catalog, capabilities: two});
  assert.equal(multi.version, 6);
  assert.deepEqual(multi.authoring.scene2d, scene2d);
  assert.deepEqual(await parse(multi), multi);
  // Saved code views and declared text APIs travel with v6.
  const codeViews = {version: 1, activeContext: '2d', entries: [emptyCodeView('2d')]};
  const withViews = await createProject({name: 'Vistas', blockly: heroPresents.blockly, deviceSource: '', codeViews, catalog, capabilities});
  assert.equal(withViews.version, 6);
  assert.deepEqual(withViews.authoring.codeViews, codeViews);
  assert.deepEqual(await parse(withViews), withViews);
  // Without 0.3.0 nothing changes: v1, v3 and v5 still hold a single authoring.blockly.
  for (const [options, version] of [[{}, 1], [{capabilities: sprites('0.2.0')}, 3], [{capabilities: sprites('0.1.0'), codeViews}, 5]]) {
    const legacy = await createProject({name: 'Antes', blockly: editableExample, deviceSource: '', catalog, ...options});
    assert.equal(legacy.version, version);
    assert.deepEqual(legacy.authoring.blockly, editableExample);
    assert.equal(Object.hasOwn(legacy.authoring, 'scene2d'), false);
    assert.deepEqual(projectBlocklyWorkspace(legacy), editableExample);
    assert.deepEqual(await parse(legacy), legacy);
  }
});

test('MS-008: v6 validation ties the workspaces to the configured objects and rejects unsafe or foreign shapes', async () => {
  const two = sprites('0.3.0', [hero, cesta]);
  const document = await createProject({name: 'Diálogo', scene2d: {stage: empty, sprites: {hero: heroPresents.blockly, cesta: cestaBlockly}}, deviceSource: '', catalog, capabilities: two});
  const eight = sprites('0.3.0', [hero, ...Array.from({length: 7}, (_, index) => ({...hero, id: 'sprite-' + index, name: 'Objeto ' + index}))]);
  const full = await createProject({name: 'Ocho', scene2d: {stage: empty, sprites: Object.fromEntries(eight.config['gg.sprites'].sprites.map(item => [item.id, empty]))}, deviceSource: '', catalog, capabilities: eight});
  assert.equal(Object.keys(full.authoring.scene2d.sprites).length, 8);
  const mutate = edit => { const copy = structuredClone(document); edit(copy); return copy; };
  const invalid = [
    [copy => { delete copy.authoring.scene2d.sprites.cesta; }, /objetos|sprites/, 'falta el workspace de un sprite'],
    [copy => { copy.authoring.scene2d.sprites.ghost = empty; }, /objetos|sprites/, 'workspace de un sprite que no existe'],
    [copy => { copy.authoring.scene2d.sprites.stage = empty; }, /objetos|sprites|ID/, 'el escenario como sprite'],
    [copy => { copy.authoring.scene2d.sprites['con espacio'] = empty; }, /ID|objetos/, 'ID con espacio'],
    [copy => { delete copy.authoring.scene2d.stage; }, /propiedades/, 'sin escenario'],
    [copy => { copy.authoring.scene2d.layers = []; }, /propiedades/, 'propiedad extra'],
    [copy => { copy.authoring.scene2d.sprites.cesta = {...cestaBlockly, comments: []}; }, /metadatos/, 'metadatos de workspace'],
    [copy => { copy.authoring.scene2d.stage = {blocks: {languageVersion: 0, blocks: []}, oversized: 'x'.repeat(65537)}; }, /metadatos|workspace/, 'escenario con metadatos'],
    [copy => { copy.authoring.scene2d.sprites.cesta = {blocks: {languageVersion: 0, blocks: [], pad: 'x'.repeat(65537)}}; }, /demasiado grande/, 'workspace demasiado grande'],
    [copy => { copy.authoring.scene2d.sprites = []; }, /objeto/, 'lista en lugar de mapa'],
    [copy => { copy.authoring.blockly = heroPresents.blockly; }, /propiedades/, 'blockly junto a scene2d'],
    [copy => { copy.authoring.blockly = heroPresents.blockly; delete copy.authoring.scene2d; }, /propiedades/, 'v6 sin scene2d'],
    [copy => { copy.version = 5; copy.authoring.codeViews = null; }, /propiedades|vistas|inválid/, 'scene2d en v5'],
    [copy => { copy.version = 3; }, /propiedades/, 'scene2d en v3'],
    [copy => { copy.capabilities = sprites('0.2.0'); }, /0\.3\.0|objetos/, 'v6 sin gg.sprites@0.3.0'],
    [copy => { copy.capabilities = createCapabilities(['gg.microbit']); }, /0\.3\.0|objetos/, 'v6 sin gg.sprites'],
    [copy => { copy.version = 7; }, /GGPROJ v7 es de una versión más reciente/, 'formato futuro']
  ];
  for (const [edit, pattern, label] of invalid) await assert.rejects(parse(mutate(edit)), pattern, label);
  // JSON.parse keeps "__proto__" as an own key; the reader rejects it before using the map.
  const serialized = serializeProject(document).replace('"cesta": {', '"__proto__": {');
  assert.match(serialized, /"__proto__"/);
  await assert.rejects(parseProject(serialized, {catalog}), /no permitida: __proto__/);
  for (const key of ['prototype', 'constructor']) await assert.rejects(parse(mutate(copy => { copy.authoring.scene2d.sprites[key] = empty; })), /no permitida|ID/, key);
  // createProject never drops another object's scripts silently.
  await assert.rejects(createProject({name: 'Sin cesta', blockly: heroPresents.blockly, deviceSource: '', catalog, capabilities: two}), /cesta/);
});

test('MS-009: updating to 0.3.0 moves authoring.blockly to scene2d.sprites.hero with the same IDs and the same program', async () => {
  const codeViews = {version: 1, activeContext: '2d', entries: [emptyCodeView('2d')]};
  for (const [version, blockly, views] of [['0.1.0', editableExample, null], ['0.2.0', heroPresents.blockly, codeViews]]) {
    const before = sprites(version);
    const document = await createProject({name: 'Antes', blockly, deviceSource: 'basic.showNumber(1)', catalog, capabilities: before, ...(views ? {codeViews: views} : {})});
    assert.equal(document.version, views ? 5 : 3);
    const original = structuredClone(document);
    const {document: migrated, summary} = await migrateProject(document, availablePackUpdates(before), {catalog});
    assert.deepEqual(document, original, 'copy-on-write');
    assert.deepEqual(summary, [{id: 'gg.sprites', fromVersion: version, toVersion: '0.3.0', steps: version === '0.1.0' ? 2 : 1, changedBlocks: 0}]);
    assert.equal(migrated.version, 6);
    assert.deepEqual(migrated.authoring.scene2d, {stage: empty, sprites: {hero: blockly}});
    assert.equal(Object.hasOwn(migrated.authoring, 'blockly'), false);
    for (const key of ['deviceSource', 'textDocuments', 'selectedTextDocumentId', 'codeViews']) assert.deepEqual(migrated.authoring[key], document.authoring[key], key);
    assert.deepEqual(migrated.resources, document.resources);
    assert.deepEqual(migrated.project, document.project);
    assert.deepEqual(await parse(migrated), migrated);
    assert.deepEqual(irOf(projectBlocklyWorkspace(migrated), migrated.capabilities), irOf(blockly, before));
  }
  // Promoting a v1 file straight to 0.3.0 (upgradeProject) gives the same v6 shape.
  const legacy = await createProject({name: 'Alpha', blockly: editableExample, deviceSource: '', catalog});
  const upgraded = await upgradeProject(legacy, {capabilities: sprites('0.3.0'), catalog});
  assert.equal(upgraded.version, 6);
  assert.deepEqual(upgraded.authoring.scene2d, {stage: empty, sprites: {hero: editableExample}});
  assert.equal(legacy.version, 1, 'the legacy document stays exact');
});

test('MS-010: the intermediate v3 + 0.3.0 + authoring.blockly shape still opens unchanged and is saved as v6', async () => {
  // Shape written by this branch before tarea 1.3 (Task 2): GGPROJ v3 with a single workspace.
  const v3 = await createProject({name: 'Intermedio', blockly: heroPresents.blockly, deviceSource: '', catalog, capabilities: sprites('0.2.0')});
  const intermediate = structuredClone(v3);
  intermediate.capabilities = migrateCapabilities(v3.capabilities, {id: 'gg.sprites', toVersion: '0.3.0'});
  const opened = await parse(intermediate);
  assert.deepEqual(opened, intermediate, 'opening never migrates');
  assert.equal(opened.version, 3);
  assert.deepEqual(projectBlocklyWorkspace(opened), heroPresents.blockly);
  assert.deepEqual(availablePackUpdates(opened.capabilities), []);
  const saved = await createProject({...opened.authoring, name: opened.project.name, catalog, capabilities: opened.capabilities, resources: opened.resources});
  assert.equal(saved.version, 6);
  assert.deepEqual(saved.authoring.scene2d, {stage: empty, sprites: {hero: heroPresents.blockly}});
  // A hand-built intermediate with two sprites: its single workspace belongs to sprites[0].
  const twoIntermediate = structuredClone(intermediate);
  twoIntermediate.capabilities = sprites('0.3.0', [hero, cesta]);
  const openedTwo = await parse(twoIntermediate);
  assert.deepEqual(scene2DAuthoringFromBlockly(openedTwo.authoring.blockly, openedTwo.capabilities.config['gg.sprites']), {stage: empty, sprites: {hero: heroPresents.blockly, cesta: empty}});
  // The pure helper does not modify its input or share references.
  const input = structuredClone(heroPresents.blockly), result = scene2DAuthoringFromBlockly(input, openedTwo.capabilities.config['gg.sprites']);
  result.sprites.hero.blocks.blocks.length = 0;
  assert.deepEqual(input, heroPresents.blockly);
});

test('MS-011: leaving 0.3.0 keeps the single workspace only when no other object has scripts', async () => {
  const two = {stage: empty, sprites: {hero: heroPresents.blockly, cesta: cestaBlockly}};
  const single = await createProject({name: 'Uno', scene2d: {stage: empty, sprites: {hero: heroPresents.blockly}}, deviceSource: '', catalog, capabilities: sprites('0.2.0')});
  assert.equal(single.version, 3);
  assert.deepEqual(single.authoring.blockly, heroPresents.blockly);
  await assert.rejects(createProject({name: 'Dos', scene2d: two, deviceSource: '', catalog, capabilities: sprites('0.2.0')}), /descartaría/);
  await assert.rejects(createProject({name: 'Escenario', scene2d: {stage: stageBlockly, sprites: {hero: heroPresents.blockly}}, deviceSource: '', catalog, capabilities: sprites('0.2.0')}), /descartaría/);
  // The single editor's workspace (blockly) is the first sprite's: it replaces that one only.
  const replaced = await createProject({name: 'Dos', scene2d: two, blockly: editableExample, deviceSource: '', catalog, capabilities: sprites('0.3.0', [hero, cesta])});
  assert.deepEqual(replaced.authoring.scene2d, {stage: empty, sprites: {hero: editableExample, cesta: cestaBlockly}});
});

test('MS-012: the authoring coordinator edits the first sprite and keeps the other objects\' workspaces', async () => {
  const capabilities = sprites('0.3.0', [hero, cesta]);
  let blockly = {draft: 'inicial'};
  const prepared = [];
  const editor = {
    save: () => structuredClone(blockly),
    prepare: (state, options) => { prepared.push(structuredClone(state)); return {state: structuredClone(state), capabilities: options.capabilities}; },
    commit(candidate) { blockly = structuredClone(candidate.state); }
  };
  const source = {value: ''};
  const authoring = createProjectAuthoring({editor, source, initialCapabilities: sprites('0.1.0')});
  assert.equal(Object.hasOwn(authoring.capture(), 'scene2d'), false, 'a single-sprite profile captures only blockly');
  const model = await createProject({name: 'Diálogo', scene2d: {stage: stageBlockly, sprites: {hero: heroPresents.blockly, cesta: cestaBlockly}}, deviceSource: '', catalog, capabilities});
  const checkpoint = authoring.checkpoint();
  authoring.commit(authoring.prepare(model));
  assert.deepEqual(prepared.at(-1), heroPresents.blockly);
  blockly = editableExample;
  const captured = authoring.capture();
  assert.deepEqual(captured.blockly, editableExample);
  assert.deepEqual(captured.scene2d, {stage: stageBlockly, sprites: {hero: editableExample, cesta: cestaBlockly}});
  const saved = await createProject({...captured, name: 'Diálogo', catalog});
  assert.deepEqual(saved.authoring.scene2d.sprites.cesta, cestaBlockly);
  // Restoring a draft also restores which objects the coordinator holds.
  authoring.restoreDraft(checkpoint, {silent: true});
  assert.equal(Object.hasOwn(authoring.capture(), 'scene2d'), false);
  // An intermediate multi-sprite file: its workspace is the first sprite's and the others start empty.
  const intermediate = structuredClone(model);
  intermediate.version = 3; intermediate.authoring = {blockly: heroPresents.blockly, deviceSource: '', textDocuments: [], selectedTextDocumentId: null};
  authoring.commit(authoring.prepare(await parse(intermediate)));
  assert.deepEqual(authoring.capture().scene2d, {stage: empty, sprites: {hero: heroPresents.blockly, cesta: empty}});
});

// --- 2D IR v1 -------------------------------------------------------------
const ir0 = irOf(heroPresents.blockly, sprites('0.3.0'));
const legacyView = createResourceView(catalog.resources, {catalog});
const say1 = (id, message = 'Hola') => ({kind: 'say', message, sourceBlockId: id});
const script = (targetId, id, body = [], extra = {}) => ({targetId, event: 'start', sourceBlockId: id, body, ...extra});
const program = (scripts, extra = {}) => ({version: 1, sprites: ['hero', 'cesta'], scripts, ...extra});

test('MS-013: IR v1 lifts IR0 to the hero sprite unchanged and IR0 stays valid as before', () => {
  assert.equal(ir0.version, 0);
  assert.deepEqual(validateProgram(ir0), ir0);
  const lifted = programObjectsFromIR0(ir0);
  assert.equal(lifted.version, 1);
  assert.deepEqual(lifted.sprites, ['hero']);
  assert.deepEqual(lifted.scripts.map(({targetId, ...rest}) => rest), ir0.scripts, 'same scripts, nodes and source IDs');
  assert.ok(lifted.scripts.every(item => item.targetId === 'hero'));
  assert.deepEqual(validateProgram(lifted, {objects: true}), lifted);
  const withVariables = {version: 0, variables: [{id: 'v-local', name: 'vidas', initialValue: 3}, {id: 'v-global', name: 'puntos', initialValue: 0, scope: 'global'}],
    scripts: [{event: 'start', sourceBlockId: 's', body: [{kind: 'setVariable', variableId: 'v-local', name: 'vidas', value: 1, sourceBlockId: 'set'}]}]};
  assert.deepEqual(programObjectsFromIR0(withVariables).variables, [{id: 'v-local', name: 'vidas', initialValue: 3, targetId: 'hero'}, {id: 'v-global', name: 'puntos', initialValue: 0, scope: 'global'}]);
  assert.throws(() => programObjectsFromIR0({...ir0, version: 1}), /version/);
  // IR0 never takes a targetId.
  assert.throws(() => validateProgram({version: 0, scripts: [{...ir0.scripts[0], targetId: 'hero'}]}), /unexpected property targetId/);
});

test('MS-014: IR v1 validates targets, stage rules, per-object limits and variable ownership', () => {
  assert.deepEqual(scene2DProgramLimits, {sprites: 8, scriptsPerObject: programLimits.scripts, nodesPerObject: programLimits.nodes, variablesPerObject: programLimits.variables, bytes: programLimits.bytes * 9});
  const valid = program([
    script('stage', 'stage-start', [{kind: 'broadcastWait', message: 'hola', sourceBlockId: 'stage-broadcast'}, {kind: 'wait', seconds: 1, sourceBlockId: 'stage-wait'}]),
    script('hero', 'hero-start', [say1('hero-say')]),
    {targetId: 'cesta', event: 'message', message: 'hola', sourceBlockId: 'cesta-hat', body: [{kind: 'move', steps: 10, sourceBlockId: 'cesta-move'}]},
    {targetId: 'stage', event: 'click', sourceBlockId: 'stage-click', body: []},
    {targetId: 'cesta', event: 'clone', sourceBlockId: 'cesta-clone', body: [{kind: 'deleteClone', sourceBlockId: 'cesta-delete'}]}
  ], {variables: [{id: 'g', name: 'puntos', initialValue: 0, scope: 'global'}, {id: 'c', name: 'vidas', initialValue: 3, targetId: 'cesta'}]});
  assert.deepEqual(validateProgram(valid, {objects: true}), valid);
  // Per object, not per program: 16 scripts and 300 nodes each.
  const many = id => Array.from({length: programLimits.scripts}, (_, index) => script(id, `${id}-${index}`));
  assert.doesNotThrow(() => validateProgram(program([...many('hero'), ...many('cesta')]), {objects: true}));
  const nodes = (id, count) => script(id, id + '-hat', Array.from({length: count}, (_, index) => ({kind: 'show', sourceBlockId: `${id}-n${index}`})));
  assert.doesNotThrow(() => validateProgram(program([nodes('hero', programLimits.nodes - 1), nodes('cesta', programLimits.nodes - 1)]), {objects: true}));
  const nine = Array.from({length: 9}, (_, index) => 'sprite-' + index);
  const failing = (ir, pattern, label, sourceBlockId, targetId) => {
    let caught;
    try { validateProgram(ir, {objects: true}); } catch (error) { caught = error; }
    assert.ok(caught, label);
    assert.match(caught.message, pattern, label);
    if (sourceBlockId) assert.equal(caught.sourceBlockId, sourceBlockId, label);
    if (targetId) assert.equal(caught.targetId, targetId, label);
  };
  failing(program([...many('hero'), script('hero', 'extra')]), /script limit/, '17 scripts en un objeto', 'extra', 'hero');
  failing(program([nodes('cesta', programLimits.nodes)]), /node\/depth limit/, '301 nodos en un objeto', undefined, 'cesta');
  failing({...program([]), sprites: nine}, /sprite limit/, 'nueve sprites');
  failing({...program([]), sprites: []}, /sprite limit/, 'sin sprites');
  failing({...program([]), sprites: ['hero', 'hero']}, /duplicate sprite/, 'sprite repetido');
  for (const bad of ['stage', '__proto__', 'constructor', 'con espacio', '', 7]) failing({...program([]), sprites: ['hero', bad]}, /invalid sprite/, 'ID de sprite ' + bad);
  failing(program([script('ghost', 'ghost-start')]), /unknown target ghost/, 'objeto desconocido', 'ghost-start');
  failing(program([{event: 'start', sourceBlockId: 'no-target', body: []}]), /missing targetId/, 'sin targetId', 'no-target');
  failing(program([script('stage', 'stage-start', [{kind: 'move', steps: 10, sourceBlockId: 'stage-move'}])]), /stage cannot move/, 'el escenario no se mueve', 'stage-move', 'stage');
  failing(program([script('stage', 'stage-start', [say1('stage-say')])]), /stage cannot say/, 'el escenario no habla', 'stage-say', 'stage');
  failing(program([{targetId: 'stage', event: 'clone', sourceBlockId: 'stage-clone', body: []}]), /stage cannot clone/, 'el escenario no se clona', 'stage-clone', 'stage');
  failing(program([script('hero', 'a', [say1('dup')]), script('cesta', 'b', [say1('dup')])]), /duplicate source ID dup/, 'IDs únicos en todo el programa', 'dup', 'cesta');
  const setLocal = (targetId, id) => script(targetId, id, [{kind: 'setVariable', variableId: 'c', name: 'vidas', value: 1, sourceBlockId: id + '-set'}]);
  const locals = {variables: [{id: 'c', name: 'vidas', initialValue: 3, targetId: 'cesta'}]};
  assert.doesNotThrow(() => validateProgram(program([setLocal('cesta', 'own')], locals), {objects: true}));
  failing(program([setLocal('hero', 'other')], locals), /variable of another object/, 'variable local de otro objeto', 'other-set', 'hero');
  failing(program([setLocal('stage', 'stage')], locals), /variable of another object/, 'el escenario no lee locales', 'stage-set', 'stage');
  failing(program([], {variables: [{id: 'x', name: 'x', initialValue: 0}]}), /variable owner/, 'local sin dueño');
  failing(program([], {variables: [{id: 'x', name: 'x', initialValue: 0, targetId: 'stage'}]}), /variable owner/, 'local del escenario');
  failing(program([], {variables: [{id: 'x', name: 'x', initialValue: 0, scope: 'global', targetId: 'hero'}]}), /variable owner/, 'global con dueño');
  failing(program([], {variables: [{id: 'x', name: 'x', initialValue: 0, targetId: 'ghost'}]}), /variable owner/, 'dueño desconocido');
  const sixteen = id => Array.from({length: programLimits.variables}, (_, index) => ({id: `${id}-v${index}`, name: `${id}${index}`, initialValue: 0, targetId: id}));
  assert.doesNotThrow(() => validateProgram(program([], {variables: [...sixteen('hero'), ...sixteen('cesta')]}), {objects: true}));
  failing(program([], {variables: [...sixteen('hero'), {id: 'over', name: 'over', initialValue: 0, targetId: 'hero'}]}), /variable limit/, '17 variables de un objeto');
  failing({version: 2, scripts: []}, /unsupported version/, 'versión futura');
  failing({...program([]), objects: []}, /unexpected property objects/, 'propiedad extra');
});

test('MS-015: IR v1 checks costumes and sounds against the owner of each script', () => {
  // Without a resource view only the built-in hero costumes and tone exist, for hero.
  assert.doesNotThrow(() => validateProgram(program([script('hero', 'h', [{kind: 'setCostume', costume: 'hero-alt', sourceBlockId: 'h-costume'}])]), {objects: true}));
  assert.throws(() => validateProgram(program([script('cesta', 'c', [{kind: 'setCostume', costume: 'hero-alt', sourceBlockId: 'c-costume'}])]), {objects: true}), /unsupported costume/);
  assert.throws(() => validateProgram(program([script('stage', 's', [{kind: 'setCostume', costume: 'hero', sourceBlockId: 's-costume'}])]), {objects: true}), /stage cannot setCostume/);
  // With a resource view the owner is the script's targetId, the stage included.
  const image = 'a'.repeat(32), sound = 'b'.repeat(32);
  const view = {version: 1, assets: [{id: image, type: 'Image', format: 'svg', bytes: 10}, {id: sound, type: 'Sound', format: 'wav', bytes: 10}],
    costumes: [{id: 'cesta-llena', ownerId: 'cesta', name: 'llena', assetId: image, centerX: 0, centerY: 0, bitmapResolution: 1}],
    sounds: [{id: 'pop', ownerId: 'cesta', name: 'pop', assetId: sound}, {id: 'tambor', ownerId: 'stage', name: 'tambor', assetId: sound}]};
  const step = (targetId, node) => program([script(targetId, targetId + '-start', [{...node, sourceBlockId: targetId + '-node'}])]);
  assert.doesNotThrow(() => validateProgram(step('cesta', {kind: 'setCostume', costume: 'cesta-llena'}), {resourceView: view, objects: true}));
  assert.doesNotThrow(() => validateProgram(step('cesta', {kind: 'playSound', sound: 'pop', wait: false}), {resourceView: view, objects: true}));
  assert.doesNotThrow(() => validateProgram(step('stage', {kind: 'playSound', sound: 'tambor', wait: true}), {resourceView: view, objects: true}));
  assert.throws(() => validateProgram(step('hero', {kind: 'setCostume', costume: 'cesta-llena'}), {resourceView: view, objects: true}), /unsupported costume/);
  assert.throws(() => validateProgram(step('hero', {kind: 'playSound', sound: 'pop', wait: false}), {resourceView: view, objects: true}), /unsupported sound/);
  assert.throws(() => validateProgram(step('cesta', {kind: 'playSound', sound: 'tambor', wait: false}), {resourceView: view, objects: true}), /unsupported sound/);
});

test('MS-016: IR v1 is opt-in; every IR0 consumer rejects it by default until it gains multi-object support', () => {
  // Stage and cesta scripts must never be folded silently into hero.
  const multi = program([script('stage', 'stage-start', [{kind: 'wait', seconds: 1, sourceBlockId: 'stage-wait'}]), script('cesta', 'cesta-start', [{kind: 'move', steps: 10, sourceBlockId: 'cesta-move'}])]);
  const lifted = programObjectsFromIR0(ir0);
  for (const ir of [multi, lifted]) {
    assert.throws(() => validateProgram(ir), /unsupported version/, 'validator default');
    // Simulator boundary (browser-scene load-program): both branches go through toScratchProject.
    assert.throws(() => toScratchProject(ir), /unsupported version/, 'Scratch adapter');
    assert.throws(() => toScratchProject(ir, {resourceView: legacyView}), /unsupported version/, 'Scratch adapter with portable resources');
    assert.throws(() => authorizeProgram(sprites('0.3.0'), ir), /unsupported version/, 'pack broker');
    assert.deepEqual(validateProgram(ir, {objects: true}), ir, 'opted in');
  }
  // IR0 keeps working everywhere, with or without the opt-in.
  assert.deepEqual(validateProgram(ir0), ir0);
  assert.deepEqual(validateProgram(ir0, {objects: true}), ir0);
  assert.doesNotThrow(() => toScratchProject(ir0));
  assert.doesNotThrow(() => authorizeProgram(sprites('0.3.0'), ir0));
});
