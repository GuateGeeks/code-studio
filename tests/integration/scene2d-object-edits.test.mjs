import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createCapabilities} from '../../src/contracts/packs.mjs';
import {validateScene2DObjects, normalizeScene2DSpriteName, scene2DSpriteNameProblem} from '../../src/contracts/scene2d-objects.mjs';
import {addSceneObject, duplicateSceneObject, renameSceneObject, deleteSceneObject, uniqueScene2DSpriteName, newScene2DObjectId, scene2DObjectRules} from '../../src/contracts/scene2d-object-edits.mjs';
import {scene2DObjectIdentifiers} from '../../src/contracts/scene2d-identifiers.mjs';
import {promoteLegacyResources, validateResources, createResourceView, resourceLimits} from '../../src/contracts/resources.mjs';
import {composeScene2DProgram, validateProgram} from '../../src/contracts/program-contract.mjs';
import {createProject, parseProject, serializeProject} from '../../src/project-format.mjs';
import {createCodeViewsState, validateCodeViews, emptyCodeView} from '../../src/code-views-state.mjs';
import {createProjectAuthoring} from '../../src/project-authoring.mjs';
import {toScratchSceneProject} from '../../src/adapters/scratch/scratch-project.mjs';
import {createTextProgram} from '../../src/adapters/scratch/text-program.mjs';
import {createScratchSession} from '../../spikes/scratch-adapter.mjs';
import {loadWorkspace, workspaceToIR} from '../../src/editor/block-program.mjs';
import {captureCodeViewSnapshot, generateCodeViewSource, prepareCodeViewCandidate} from '../../src/editor/code-view-conversion.mjs';
import {parseJavaScriptCodeView} from '../../src/targets/text/code-view-parser.mjs';
import {scene2DTextOwner} from '../../src/contracts/scene2d-identifiers.mjs';
import {buildProjectCatalog} from '../../tools/f1/build-project-catalog.mjs';
import {createTone} from '../../tools/f0/tone.mjs';

// scene2d-multi-sprite tarea 3.1 (E2, 30/10/2026): what the objects panel does to
// a project, as pure edits. Names are normalized before validation; a new object
// gets a costume of its own; a duplicate gets new IDs for blocks, locals and
// resources but shares the scene's global variables.
const assets = {}, costumes = [[], []];
for (const [index, name] of ['stage', 'hero', 'hero-alt'].entries()) {
  const content = await readFile(new URL(`../../src/assets/${name}.svg`, import.meta.url), 'utf8');
  const assetId = createHash('md5').update(content).digest('hex');
  assets[assetId] = content;
  costumes[index === 0 ? 0 : 1].push({assetId, name, dataFormat: 'svg', md5ext: assetId + '.svg', rotationCenterX: index === 0 ? 240 : 24, rotationCenterY: index === 0 ? 180 : 24});
}
const tone = createTone().buffer, toneId = createHash('md5').update(tone).digest('hex');
assets[toneId] = {type: 'Sound', format: 'wav', encoding: 'base64', data: tone.toString('base64')};
const catalog = await buildProjectCatalog({assets, costumes, sounds: [{assetId: toneId, name: 'tone', dataFormat: 'wav', md5ext: toneId + '.wav', format: '', rate: 22050, sampleCount: 26460}]});
const heroSprite = {id: 'hero', name: 'hero', x: 0, y: 0, direction: 90, size: 100, visible: true, costume: 'hero'};
const capabilities = createCapabilities(['gg.sprites', 'gg.assets']);
const rules = scene2DObjectRules(capabilities);
const resources = await promoteLegacyResources(catalog);
const say = (id, message, next) => ({type: 'gg_say', id, fields: {MESSAGE: message}, ...(next ? {next: {block: next}} : {})});
const workspace = (blocks, variables) => ({blocks: {languageVersion: 0, blocks}, ...(variables ? {variables} : {})});
const heroProgram = workspace([
  {type: 'gg_when_start', id: 'h-start', x: 20, y: 30, inputs: {DO: {block: {type: 'gg_set_global', id: 'h-global', fields: {VAR: {id: 'puntos'}},
    inputs: {VALUE: {shadow: {type: 'math_number', id: 'h-shadow', fields: {NUM: 1}}}},
    next: {block: {type: 'variables_set', id: 'h-local', fields: {VAR: {id: 'pasos'}}, inputs: {VALUE: {shadow: {type: 'math_number', id: 'h-shadow-2', fields: {NUM: 2}}}}, next: {block: say('h-say', 'Hola')}}}}}}}
], [{name: 'puntos', id: 'puntos'}, {name: 'pasos', id: 'pasos'}]);
const scene = (sprites = {hero: heroProgram}, stage = {}) => ({stage, sprites});
const config = (...sprites) => ({stage: {backdrop: 'stage'}, sprites: sprites.length ? sprites : [heroSprite]});
const state = overrides => ({capabilities, config: config(), scene2d: scene(), codeViews: null, resources, mounted: 'hero', ...overrides});

test('MS-036: student names are normalized to the one stored spelling and refused with a clear cause', () => {
  // NFC: two spellings of the same name become one.
  assert.equal(normalizeScene2DSpriteName('N\u0303andu\u0301'), 'Ñandú'.normalize('NFC'));
  // Spaces, control and format characters (emoji ZWJ, bidi, zero width) never reach the file.
  assert.equal(normalizeScene2DSpriteName('  Gato \t Rojo\n'), 'Gato Rojo');
  assert.equal(normalizeScene2DSpriteName('👩‍💻'), '👩💻');
  assert.equal(normalizeScene2DSpriteName('a‮b​ c'), 'ab c');
  assert.equal(normalizeScene2DSpriteName('x\ud83d'), 'x');
  // Whatever survives is valid for the configuration.
  for (const typed of ['Ñandú', '  Gato  Rojo ', '👩‍💻', 'Cohete 🚀', 'á', 'x\u0007y']) {
    const name = normalizeScene2DSpriteName(typed);
    assert.equal(scene2DSpriteNameProblem(name, {config: config()}), null, typed);
    assert.doesNotThrow(() => validateScene2DObjects(config(heroSprite, {...heroSprite, id: 'otro', name})), typed);
  }
  const problem = (typed, options = {}) => scene2DSpriteNameProblem(normalizeScene2DSpriteName(typed), {config: config(), ...options});
  assert.match(problem(''), /Escribe un nombre/);
  assert.match(problem(' ‍ ​'), /Escribe un nombre/);
  assert.match(problem('x'.repeat(33)), /hasta 32 caracteres/);
  assert.match(problem('x'.repeat(33)), /33/);
  assert.match(problem('HERO'), /Ya hay un objeto llamado «hero»/);
  assert.match(problem('escenario'), /nombre del escenario/);
  // Renaming an object to another spelling of its own name is not a collision.
  assert.equal(problem('HERO', {except: 'hero'}), null);
});

test('MS-037: rename changes the name and the identifier, never the ID, and nothing else', () => {
  const before = state({scene2d: scene()});
  const after = renameSceneObject(before, {id: 'hero', name: 'Héroe Rojo'});
  assert.equal(after.config.sprites[0].id, 'hero');
  assert.equal(after.config.sprites[0].name, 'Héroe Rojo');
  assert.equal(scene2DObjectIdentifiers(after.config).identifierOf.hero, 'heroe_rojo');
  assert.deepEqual(after.scene2d, before.scene2d);
  assert.equal(after.resources, null);
  assert.equal(before.config.sprites[0].name, 'hero');
  assert.throws(() => renameSceneObject(before, {id: 'stage', name: 'Otro'}), /objeto desconocido/);
  assert.throws(() => renameSceneObject(before, {id: 'hero', name: 'escenario'}), /nombre del escenario/);
});

test('MS-038: a new object has its own ID and costume, an empty program and the global variables', async () => {
  const stage = workspace([], [{name: 'nivel', id: 'nivel'}]);
  const before = state({scene2d: scene({hero: heroProgram}, stage)});
  const after = await addSceneObject(before, {id: 'sprite-1', name: 'Cesta', sourceId: 'hero', rules});
  const added = after.config.sprites.at(-1);
  assert.deepEqual(after.config.sprites.map(sprite => sprite.id), ['hero', 'sprite-1']);
  assert.equal(after.id, 'sprite-1');
  assert.deepEqual([added.name, added.direction, added.size, added.visible], ['Cesta', 90, 100, true]);
  assert.notDeepEqual([added.x, added.y], [heroSprite.x, heroSprite.y]);
  // Its costume is a copy of the source's, with the same bytes: one is enough to appear.
  const owned = after.resources.costumes.filter(item => item.ownerId === 'sprite-1');
  assert.deepEqual(owned.map(item => item.id), [added.costume]);
  assert.equal(owned[0].assetId, resources.costumes.find(item => item.id === 'hero').assetId);
  assert.equal(after.resources.sounds.filter(item => item.ownerId === 'sprite-1').length, 0);
  assert.equal(Object.keys(after.resources.assets).length, Object.keys(resources.assets).length);
  await validateResources(after.resources);
  validateScene2DObjects(after.config);
  // No scripts; the scene's global variables keep their IDs, locals stay out.
  assert.deepEqual(after.scene2d.sprites['sprite-1'], {variables: [{name: 'nivel', id: 'nivel'}, {name: 'puntos', id: 'puntos'}]});
  assert.deepEqual(after.scene2d.sprites.hero, heroProgram);
  assert.deepEqual(after.scene2d.stage, {...stage, variables: [{name: 'nivel', id: 'nivel'}, {name: 'puntos', id: 'puntos'}]});
  // No globals: the empty workspace is {}, as Blockly saves it.
  const plain = await addSceneObject(state({scene2d: scene({hero: workspace([say('s', 'x')])})}), {id: 'sprite-2', name: 'B', sourceId: 'hero', rules});
  assert.deepEqual(plain.scene2d.sprites['sprite-2'], {});
  // Selecting the stage, the costume comes from the first sprite; positions do not stack.
  const third = await addSceneObject(after, {id: 'sprite-3', name: 'C', sourceId: 'stage', rules});
  assert.equal(third.resources.costumes.find(item => item.ownerId === 'sprite-3').assetId, owned[0].assetId);
  const places = new Set(third.config.sprites.map(sprite => sprite.x + ',' + sprite.y));
  assert.equal(places.size, 3);
  // The limit is explained, the state is not touched.
  const full = config(...Array.from({length: 8}, (_, index) => ({...heroSprite, id: 's' + index, name: 'S' + index})));
  await assert.rejects(addSceneObject(state({config: full}), {id: 'x', name: 'Y', sourceId: 'hero', rules}), /hasta 8/);
  await assert.rejects(addSceneObject(state({resources: {...resources, costumes: resources.costumes.filter(item => item.ownerId === 'stage')}}), {id: 'x', name: 'Y', sourceId: 'hero', rules}), /disfraz/);
  await assert.rejects(addSceneObject(state({resources: {...resources, costumes: Array.from({length: resourceLimits.costumes}, (_, index) => ({...resources.costumes.find(item => item.id === 'hero'), id: 'c' + index}))}}), {id: 'x', name: 'Y', sourceId: 'hero', rules}), /demasiados disfraces/);
});

test('MS-039: a duplicate has new block, local and resource IDs and shares the global variables', async () => {
  const assetsPack = workspace([{type: 'gg_when_start', id: 'a-start', x: 5, y: 6, inputs: {DO: {block: {type: 'gg_assets_set_costume', id: 'a-costume', fields: {COSTUME: 'hero-alt'},
    next: {block: {type: 'gg_assets_play_sound', id: 'a-sound', fields: {SOUND: 'tone'}, next: {block: say('a-say', 'hero-alt')}}}}}}}]);
  const before = state({scene2d: scene({hero: assetsPack})});
  const after = await duplicateSceneObject(before, {id: 'sprite-9', name: 'hero 2', sourceId: 'hero', rules});
  const copy = after.config.sprites.at(-1), program = after.scene2d.sprites['sprite-9'];
  assert.equal(copy.id, 'sprite-9');
  assert.notDeepEqual([copy.x, copy.y], [heroSprite.x, heroSprite.y]);
  assert.deepEqual([copy.direction, copy.size, copy.visible], [90, 100, true]);
  // Every resource of the source, with its own IDs; bytes are shared.
  const costumes = after.resources.costumes.filter(item => item.ownerId === 'sprite-9'), sounds = after.resources.sounds.filter(item => item.ownerId === 'sprite-9');
  assert.equal(costumes.length, resources.costumes.filter(item => item.ownerId === 'hero').length);
  assert.equal(sounds.length, resources.sounds.filter(item => item.ownerId === 'hero').length);
  assert.ok(costumes.some(item => item.id === copy.costume));
  // Field menus follow the copy; a message that happens to read like an ID does not.
  const start = program.blocks.blocks[0], costume = start.inputs.DO.block, sound = costume.next.block, spoken = sound.next.block;
  assert.ok(costumes.some(item => item.id === costume.fields.COSTUME) && costume.fields.COSTUME !== 'hero-alt');
  assert.ok(sounds.some(item => item.id === sound.fields.SOUND) && sound.fields.SOUND !== 'tone');
  assert.equal(spoken.fields.MESSAGE, 'hero-alt');
  assert.deepEqual([start.x, start.y], [5, 6]);
  // The source is intact.
  assert.deepEqual(after.scene2d.sprites.hero, assetsPack);

  const withVariables = await duplicateSceneObject(state({scene2d: scene()}), {id: 'sprite-8', name: 'hero 2', sourceId: 'hero', rules});
  const copied = withVariables.scene2d.sprites['sprite-8'];
  const ids = [];
  const walk = value => {
    if (!value || typeof value !== 'object') return;
    if (value.type && value.id) ids.push(value.id);
    Object.values(value).forEach(walk);
  };
  walk(copied.blocks);
  assert.equal(ids.length, 6);
  assert.equal(new Set(ids).size, 6);
  assert.ok(ids.every(id => !['h-start', 'h-global', 'h-shadow', 'h-local', 'h-shadow-2', 'h-say'].includes(id)), 'block and shadow IDs are new');
  // Globals keep their ID: the copy shares them; the local one gets its own.
  const byName = Object.fromEntries(copied.variables.map(model => [model.name, model.id]));
  assert.equal(byName.puntos, 'puntos');
  assert.notEqual(byName.pasos, 'pasos');
  const body = copied.blocks.blocks[0].inputs.DO.block;
  assert.equal(body.fields.VAR.id, 'puntos');
  assert.equal(body.next.block.fields.VAR.id, byName.pasos);
  assert.equal(body.inputs.VALUE.shadow.fields.NUM, 1);

  // Both objects compose into one valid program: one global, two locals, no shared block ID.
  const view = createResourceView(await validateResources(withVariables.resources));
  const lower = state => { const loaded = loadWorkspace(structuredClone(state), {capabilities: createCapabilities(['gg.sprites'])}); try { return workspaceToIR(loaded, {capabilities: createCapabilities(['gg.sprites'])}); } finally { loaded.dispose(); } };
  const program2 = composeScene2DProgram(withVariables.config, {sprites: {hero: lower(heroProgram), 'sprite-8': lower(copied)}});
  validateProgram(program2, {objects: true, resourceView: view});
  assert.deepEqual(program2.variables.filter(variable => variable.scope === 'global').map(variable => variable.id), ['puntos']);
  assert.equal(program2.variables.filter(variable => variable.targetId).length, 2);
  assert.deepEqual(program2.scripts.map(script => script.targetId), ['hero', 'sprite-8']);
});

test('MS-040: a duplicate keeps the script order of the source and the views stay valid', async () => {
  const two = workspace([{type: 'gg_when_start', id: 'one', x: 0, y: 0}, {type: 'gg_when_clicked', id: 'two', x: 0, y: 90}]);
  const entry = {...emptyCodeView('2d'), scriptOrder: ['two', 'one']};
  const views = {version: 1, activeContext: '2d', entries: [entry]};
  const after = await duplicateSceneObject(state({scene2d: scene({hero: two}), codeViews: views}), {id: 'sprite-5', name: 'hero 2', sourceId: 'hero', rules});
  const [first, second] = after.scene2d.sprites['sprite-5'].blocks.blocks.map(block => block.id);
  validateCodeViews(after.codeViews);
  assert.deepEqual([after.codeViews.version, after.codeViews.objectId], [2, 'hero']);
  assert.deepEqual(after.codeViews.objects['sprite-5'], {scriptOrder: [second, first], restorePoint: null});
  assert.deepEqual(after.codeViews.entries, views.entries);
  // The order of a stored object is used when the source is not the current one.
  const stored = {version: 2, activeContext: '2d', entries: [emptyCodeView('2d')], objectId: 'stage', objects: {hero: {scriptOrder: ['two', 'one'], restorePoint: null}}};
  const fromStored = await duplicateSceneObject(state({scene2d: scene({hero: two}), codeViews: stored, mounted: 'stage'}), {id: 'sprite-6', name: 'hero 2', sourceId: 'hero', rules});
  const [third, fourth] = fromStored.scene2d.sprites['sprite-6'].blocks.blocks.map(block => block.id);
  assert.deepEqual(fromStored.codeViews.objects['sprite-6'].scriptOrder, [fourth, third]);
  assert.deepEqual(fromStored.codeViews.objects.hero, stored.objects.hero);
  // No stored order, nothing to write.
  const none = await duplicateSceneObject(state({scene2d: scene({hero: two})}), {id: 'sprite-7', name: 'hero 2', sourceId: 'hero', rules});
  assert.equal(none.codeViews, null);
  await assert.rejects(duplicateSceneObject(state(), {id: 'x', name: 'hero', sourceId: 'hero', rules}), /Ya hay un objeto/);
  await assert.rejects(duplicateSceneObject(state(), {id: 'x', name: 'Y', sourceId: 'stage', rules}), /objeto desconocido/);
});

test('MS-041: delete removes the object, its program, resources and stored view; other objects stay', async () => {
  const added = await addSceneObject(state(), {id: 'sprite-1', name: 'Cesta', sourceId: 'hero', rules});
  const views = {version: 2, activeContext: '2d', entries: [emptyCodeView('2d')], objectId: 'hero', objects: {'sprite-1': {scriptOrder: null, restorePoint: null}, stage: {scriptOrder: ['x'], restorePoint: null}}};
  const after = deleteSceneObject({...added, codeViews: views, capabilities}, {id: 'sprite-1'});
  assert.deepEqual(after.config.sprites.map(sprite => sprite.id), ['hero']);
  assert.deepEqual(Object.keys(after.scene2d.sprites), ['hero']);
  assert.equal(after.resources.costumes.filter(item => item.ownerId === 'sprite-1').length, 0);
  assert.deepEqual(Object.keys(after.codeViews.objects), ['stage']);
  await validateResources(after.resources);
  // Shared bytes survive while another descriptor uses them; a medium only the object used goes.
  assert.deepEqual(Object.keys(after.resources.assets).sort(), Object.keys(resources.assets).sort());
  const unique = 'f'.repeat(64), own = {...added, capabilities, resources: {...added.resources, assets: {...added.resources.assets, [unique]: Object.values(added.resources.assets)[0]},
    integrity: {...added.resources.integrity, [unique]: Object.values(added.resources.integrity)[0]},
    costumes: added.resources.costumes.map(item => item.ownerId === 'sprite-1' ? {...item, assetId: unique} : item)}};
  assert.equal(Object.hasOwn(deleteSceneObject(own, {id: 'sprite-1'}).resources.assets, unique), false);
  // The first sprite can go: the project keeps the others.
  const first = deleteSceneObject({...added, capabilities, mounted: 'sprite-1'}, {id: 'hero'});
  assert.deepEqual(first.config.sprites.map(sprite => sprite.id), ['sprite-1']);
  assert.equal(first.config.sprites[0].name, 'Cesta');
  // The last sprite and the mounted object cannot; the panel moves first.
  assert.throws(() => deleteSceneObject(state(), {id: 'hero'}), /al menos un objeto/);
  assert.throws(() => deleteSceneObject({...added, capabilities, mounted: 'hero'}, {id: 'hero'}), /objeto seleccionado/);
  assert.throws(() => deleteSceneObject({...added, capabilities}, {id: 'stage'}), /objeto desconocido/);
});

test('MS-042: IDs and names never collide; edited scenes save and reopen with the same IDs', async () => {
  let attempts = 0;
  const id = newScene2DObjectId(config(heroSprite, {...heroSprite, id: 'sprite-a', name: 'A'}), () => attempts++ === 0 ? 'a' : 'b');
  assert.equal(id, 'sprite-b');
  const owned = {costumes: [{ownerId: 'sprite-c'}], sounds: []};
  assert.equal(newScene2DObjectId(config(), () => attempts++ % 2 ? 'c' : 'd', owned), 'sprite-d');
  assert.match(newScene2DObjectId(config()), /^sprite-[a-z0-9-]+$/);

  const named = config(heroSprite, {...heroSprite, id: 'b', name: 'Cesta'}, {...heroSprite, id: 'c', name: 'cesta 2'});
  assert.equal(uniqueScene2DSpriteName('Nueva', named), 'Nueva');
  assert.equal(uniqueScene2DSpriteName('CESTA', named), 'cesta 3'.replace('cesta', 'CESTA'));
  assert.equal(uniqueScene2DSpriteName('Cesta 2', named), 'Cesta 3');
  assert.equal(uniqueScene2DSpriteName('Escenario', named), 'Escenario 2');
  const long = uniqueScene2DSpriteName('h'.repeat(31) + '🚀', config({...heroSprite, name: 'h'.repeat(31) + '🚀'}));
  assert.ok(long.length <= 32 && long.endsWith(' 2') && long === long.normalize('NFC'), long);
  assert.equal(scene2DSpriteNameProblem(long, {config: config()}), null);

  // A whole round: add, duplicate, rename, delete; the document stays valid and IDs hold.
  const start = state();
  const one = await addSceneObject(start, {id: 'sprite-1', name: 'Cesta', sourceId: 'hero', rules});
  const two = await duplicateSceneObject({...start, ...one, resources: await validateResources(one.resources)}, {id: 'sprite-2', name: 'hero 2', sourceId: 'hero', rules});
  const three = renameSceneObject({...start, ...two}, {id: 'sprite-1', name: 'Cesta Roja'});
  const four = deleteSceneObject({...start, ...three, resources: two.resources, mounted: 'sprite-1'}, {id: 'hero'});
  const profile = createCapabilities(['gg.sprites', 'gg.assets']);
  profile.config['gg.sprites'] = four.config;
  const document = await createProject({name: 'Objetos', scene2d: four.scene2d, deviceSource: '', catalog, capabilities: profile, resources: await validateResources(four.resources)});
  const reopened = await parseProject(serializeProject(document), {catalog});
  assert.deepEqual(reopened.capabilities.config['gg.sprites'].sprites.map(sprite => [sprite.id, sprite.name]), [['sprite-1', 'Cesta Roja'], ['sprite-2', 'hero 2']]);
  assert.deepEqual(Object.keys(reopened.authoring.scene2d.sprites).sort(), ['sprite-1', 'sprite-2']);
});

test('MS-043: the hash of a conversion reaches its Undo point after the object was stored', () => {
  const point = {id: '11111111-1111-4111-8111-111111111111', workspace: {}, scriptOrder: null, appliedHash: 'a'.repeat(64)};
  const views = createCodeViewsState({version: 2, activeContext: '2d', entries: [emptyCodeView('2d')], objectId: 'cesta', objects: {hero: {scriptOrder: null, restorePoint: point}}});
  const changes = [];
  views.subscribe(reason => changes.push(reason.type));
  assert.equal(views.correctStoredPoint(point.id, 'b'.repeat(64)), true);
  assert.equal(views.objectView('hero').restorePoint.appliedHash, 'b'.repeat(64));
  assert.deepEqual(changes, ['edit'], 'the corrected hash is saved like any view change');
  // The same hash again is not a change; another point is not touched.
  assert.equal(views.correctStoredPoint(point.id, 'b'.repeat(64)), true);
  assert.equal(views.correctStoredPoint('22222222-2222-4222-8222-222222222222', 'c'.repeat(64)), false);
  assert.equal(changes.length, 1);
  assert.equal(views.objectView('hero').restorePoint.appliedHash, 'b'.repeat(64));
  assert.equal(createCodeViewsState().correctStoredPoint(point.id, 'c'.repeat(64)), false);
});

test('MS-044: each object keeps its session: history and camera follow it, a stage gets its toolbox, another project starts clean', async () => {
  const profile = createCapabilities(['gg.sprites']);
  profile.config['gg.sprites'] = config(heroSprite, {...heroSprite, id: 'cesta', name: 'Cesta'});
  const live = {state: {}, session: null, stage: false, restored: []};
  const editor = {
    save: () => structuredClone(live.state), program: () => ({version: 0, scripts: []}), resourceView: () => null, programOf: () => ({version: 0, scripts: []}),
    captureCapabilities: () => structuredClone(profile),
    prepare: (state, options) => ({state: structuredClone(state), scriptOrder: options.scriptOrder, capabilities: options.capabilities, ownerId: options.ownerId}),
    // The editor offers the toolbox of the object it holds (3.2).
    commit(candidate) { live.state = structuredClone(candidate.state); live.stage = candidate.ownerId === 'stage'; },
    sessionState: () => live.session, restoreSessionState(session) { live.restored.push(session); live.session = session; }
  };
  const authoring = createProjectAuthoring({editor, source: {value: ''}, codeViews: createCodeViewsState(), initialCapabilities: profile});
  const open = async id => authoring.commit(authoring.prepare(await createProject({name: 'Sesión', id, scene2d: {stage: {}, sprites: {hero: {}, cesta: {}}}, deviceSource: '', catalog, capabilities: profile})));
  await open('11111111-1111-4111-8111-111111111111');
  live.session = 'historia de hero';
  authoring.mountObject('cesta');
  assert.deepEqual(live.restored, [null], 'an object seen for the first time has no history');
  live.session = 'historia de cesta';
  authoring.mountObject('stage');
  assert.equal(live.stage, true);
  authoring.mountObject('hero');
  assert.equal(live.stage, false);
  assert.deepEqual(live.restored, [null, null, 'historia de hero']);
  authoring.mountObject('cesta');
  assert.equal(live.restored.at(-1), 'historia de cesta');
  // An edit of the same project (add, rename) keeps them; another project does not.
  authoring.mountObject('stage');
  await open('11111111-1111-4111-8111-111111111111');
  live.restored.length = 0;
  authoring.mountObject('cesta');
  assert.deepEqual(live.restored, ['historia de cesta']);
  await open('22222222-2222-4222-8222-222222222222');
  live.restored.length = 0;
  authoring.mountObject('cesta');
  assert.deepEqual(live.restored, [null]);
});

test('MS-045: a document without handlers starts in a project without hero', {timeout: 60000}, async t => {
  const scene = config({...heroSprite, id: 'cesta', name: 'Cesta'});
  const {project} = toScratchSceneProject({version: 1, sprites: ['cesta'], scripts: []}, {scene});
  const vm = await createScratchSession(project);
  const program = createTextProgram({getVM: () => vm, getRevision: () => 1, onInvocation: () => {}});
  t.after(() => { program.dispose(); vm.quit(); });
  assert.deepEqual(program.call('program.start', [{variables: [{id: 'n', name: 'n', initialValue: 0, targetId: 'cesta'}], handlers: []}], 1), {started: true});
  assert.deepEqual(Object.keys(vm.runtime.getSpriteTargetByName('cesta').variables), ['n']);
  assert.throws(() => program.call('program.start', [{variables: [], handlers: [{id: 'lost', event: 'start'}]}], 1), /scene unavailable/);
});

test('MS-046: scripts written in text on two objects keep unique block and variable IDs', () => {
  const profile = createCapabilities(['gg.sprites']), objects = config(heroSprite, {...heroSprite, id: 'sprite-1', name: 'Cesta'});
  const convert = (id, text) => {
    const owner = scene2DTextOwner(objects, id), snapshot = captureCodeViewSnapshot({}, {capabilities: profile}), generated = generateCodeViewSource(snapshot, 'javascript', {owner});
    const parsed = parseJavaScriptCodeView(text, {capabilities: profile, owner, variableIds: generated.variableIds, variableNames: generated.variableNames});
    return prepareCodeViewCandidate(snapshot, parsed, {targetId: id});
  };
  const hero = convert('hero', 'let pasos = 0;\nonStart(() => {\n  pasos = 1;\n  hero.move(pasos);\n});\n');
  const cesta = convert('sprite-1', 'let vueltas = 0;\nonStart(() => {\n  vueltas = 1;\n  cesta.move(vueltas);\n});\n');
  const stage = convert('stage', 'onStart(() => {\n  broadcastAndWait("hola");\n});\n');
  const program = composeScene2DProgram(objects, {stage: stage.ir, sprites: {hero: hero.ir, 'sprite-1': cesta.ir}});
  assert.doesNotThrow(() => validateProgram(program, {objects: true}));
  assert.equal(program.variables.length, 2);
  // hero keeps the IDs it always had.
  assert.match(hero.ir.scripts[0].sourceBlockId, /^gg-code-view-\d+$/);
});

test('MS-047: a shared variable stays shared when its declaring block or object goes; a project without additions does not change', async () => {
  const profile = createCapabilities(['gg.sprites']);
  const lower = state => { const loaded = loadWorkspace(structuredClone(state), {capabilities: profile}); try { return workspaceToIR(loaded, {capabilities: profile}); } finally { loaded.dispose(); } };
  const compose = ({config: objects, scene2d}) => composeScene2DProgram(objects, {stage: lower(scene2d.stage), sprites: Object.fromEntries(Object.entries(scene2d.sprites).map(([id, state]) => [id, lower(state)]))});
  const globals = program => program.variables.filter(variable => variable.scope === 'global').map(variable => variable.id);
  const withoutBlocks = (edited, ...ids) => ({...edited, scene2d: {...edited.scene2d, sprites: {...edited.scene2d.sprites,
    ...Object.fromEntries(ids.map(id => [id, {variables: edited.scene2d.sprites[id].variables}]))}}});
  const added = await addSceneObject(state(), {id: 'sprite-1', name: 'Cesta', sourceId: 'hero', rules});
  const both = {...added, ...await addSceneObject({...state(), ...added, resources: await validateResources(added.resources)}, {id: 'sprite-2', name: 'Pelota', sourceId: 'hero', rules})};

  // The declaring block goes; one added object is enough, because hero keeps the model.
  assert.doesNotThrow(() => compose(withoutBlocks(added, 'hero')));
  assert.deepEqual(globals(compose(withoutBlocks(added, 'hero'))), ['puntos']);
  // The declaring object goes.
  const deleted = deleteSceneObject({...state(), ...both, mounted: 'sprite-1'}, {id: 'hero'});
  assert.doesNotThrow(() => compose(deleted));
  assert.deepEqual(globals(compose(deleted)), ['puntos']);
  // A duplicate, with the block removed from both.
  const copied = await duplicateSceneObject(state(), {id: 'sprite-3', name: 'hero 2', sourceId: 'hero', rules});
  assert.doesNotThrow(() => compose(withoutBlocks(copied, 'hero', 'sprite-3')));
  assert.deepEqual(globals(compose(withoutBlocks(copied, 'hero', 'sprite-3'))), ['puntos']);

  // The stage holds the shared models, once each; locals stay out and the source does not change.
  assert.deepEqual(both.scene2d.stage, {variables: [{name: 'puntos', id: 'puntos'}]});
  assert.deepEqual(copied.scene2d.stage, {variables: [{name: 'puntos', id: 'puntos'}]});
  assert.deepEqual(state().scene2d.stage, {});

  // Saved and reopened, the stage keeps them.
  const saved = createCapabilities(['gg.sprites', 'gg.assets']);
  saved.config['gg.sprites'] = both.config;
  const document = await createProject({name: 'Global', scene2d: both.scene2d, deviceSource: '', catalog, capabilities: saved, resources: await validateResources(both.resources)});
  const reopened = await parseProject(serializeProject(document), {catalog});
  assert.deepEqual(reopened.authoring.scene2d.stage, {variables: [{name: 'puntos', id: 'puntos'}]});
  assert.deepEqual(compose({config: both.config, scene2d: reopened.authoring.scene2d}), compose(both));

  // The stage's own view still reads back with those IDs.
  const owner = scene2DTextOwner(both.config, 'stage'), snapshot = captureCodeViewSnapshot(both.scene2d.stage, {capabilities: profile});
  const generated = generateCodeViewSource(snapshot, 'javascript', {owner});
  const parsed = parseJavaScriptCodeView(generated.text, {capabilities: profile, owner, variableIds: generated.variableIds, variableNames: generated.variableNames});
  assert.deepEqual(prepareCodeViewCandidate(snapshot, parsed, {targetId: 'stage'}).ir.variables.map(variable => variable.id), ['puntos']);

  // Nothing added: no edit touches the stage, and the program is the same.
  const untouched = {config: config(), scene2d: scene()}, before = compose(untouched);
  const renamed = renameSceneObject(state(), {id: 'hero', name: 'Héroe'});
  assert.deepEqual(renamed.scene2d.stage, {});
  assert.deepEqual(compose(renamed), before);
  // Without shared variables, adding leaves the stage empty.
  const quiet = await addSceneObject(state({scene2d: scene({hero: workspace([say('s', 'x')])})}), {id: 'sprite-4', name: 'B', sourceId: 'hero', rules});
  assert.deepEqual(quiet.scene2d.stage, {});
});
