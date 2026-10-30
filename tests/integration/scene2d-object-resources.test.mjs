import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createCapabilities} from '../../src/contracts/packs.mjs';
import {localPackCatalog} from '../../src/packs/catalog.mjs';
import * as edits from '../../src/contracts/scene2d-object-edits.mjs';
import {prepareAsset, promoteLegacyResources, validateResources, createResourceView} from '../../src/contracts/resources.mjs';
import {sanitizeSvg} from '../../src/contracts/media-svg.mjs';
import {applyStarterLibraryEntry, decodeStarterLibraryEntry, starterLibraryMedia, validateStarterLibrary} from '../../src/contracts/starter-library.mjs';
import {buildStarterLibrary} from '../../tools/resources/starter-library.mjs';
import {authorizeProgram, authorizeProjectOperation} from '../../src/contracts/pack-broker.mjs';
import {composeScene2DProgram, validateProgram} from '../../src/contracts/program-contract.mjs';
import {scene2DTextOwner} from '../../src/contracts/scene2d-identifiers.mjs';
import * as blockProgram from '../../src/editor/block-program.mjs';
const {loadWorkspace, workspaceToIR, validateWorkspaceResources} = blockProgram;
import {captureCodeViewSnapshot, generateCodeViewSource, prepareCodeViewCandidate} from '../../src/editor/code-view-conversion.mjs';
import {workspaceFromIR} from '../../src/editor/workspace-from-ir.mjs';
import {parseJavaScriptCodeView} from '../../src/targets/text/code-view-parser.mjs';
import {generateApi3ProgramSource} from '../../src/generated-program-source.mjs';
import {generateCode} from '../../src/generated-code.mjs';
import {toScratchSceneProject} from '../../src/adapters/scratch/scratch-project.mjs';
import {createGGBindings} from '../../src/adapters/scratch/gg-bindings.mjs';
import {createProjectAuthoring} from '../../src/project-authoring.mjs';
import {createProject} from '../../src/project-format.mjs';
import {lessonCatalog, validateLessonCheck, validateLesson, getLesson} from '../../src/lessons.mjs';
import {lessonDefinitions} from '../../src/assets/lessons/catalog.mjs';
import {evaluateLesson} from '../../src/lesson-evaluation.mjs';
import {buildProjectCatalog} from '../../tools/f1/build-project-catalog.mjs';
import {createTone} from '../../tools/f0/tone.mjs';

// scene2d-multi-sprite tarea 3.2 (E2, 30/10/2026): each object's resources work
// in blocks, text and runs. gg.assets stays frozen and names `hero`;
// gg.sprites@0.3.0 declares that, in a scene, that owner is the object whose
// script it is. Activities gain an optional targetId; the starter library adds
// a sprite as a new object.
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
const cestaSprite = {...heroSprite, id: 'cesta', name: 'Cesta', costume: 'cesta:c0'};
const config = (...sprites) => ({stage: {backdrop: 'stage'}, sprites});
const base = await promoteLegacyResources(catalog);
const owned = (kind, id, ownerId, name) => ({...structuredClone(base[kind].find(item => item.ownerId === 'hero')), id, ownerId, name});
const resources = await validateResources({...structuredClone(base),
  costumes: [...base.costumes, owned('costumes', 'cesta:c0', 'cesta', 'Cesta llena'), owned('costumes', 'cesta:c1', 'cesta', 'Cesta vacía')],
  sounds: [...base.sounds, owned('sounds', 'cesta:s0', 'cesta', 'Cuac'), owned('sounds', 'stage:s0', 'stage', 'Viento')]});
const view = createResourceView(resources);
const profile = (sprites = [heroSprite, cestaSprite]) => {
  const capabilities = createCapabilities(['gg.sprites', 'gg.assets']);
  capabilities.config['gg.sprites'] = config(...sprites);
  return capabilities;
};
const two = profile();
const node = (kind, sourceBlockId, fields = {}) => ({kind, sourceBlockId, ...fields});
const script = (targetId, sourceBlockId, body) => ({targetId, event: 'start', sourceBlockId, body});
const scene = scripts => ({version: 1, sprites: ['hero', 'cesta'], scripts});
const start = (id, first) => ({type: 'gg_when_start', id, x: 20, y: 20, inputs: {DO: {block: first}}});
const assetsWorkspace = (prefix, costume, sound) => ({blocks: {languageVersion: 0, blocks: [start(prefix + '-start', {type: 'gg_assets_set_costume', id: prefix + '-costume', fields: {COSTUME: costume},
  next: {block: {type: 'gg_assets_play_sound', id: prefix + '-sound', fields: {SOUND: sound}}}})]}});
const blocksOf = state => { const list = []; const walk = value => { if (!value || typeof value !== 'object') return; if (value.type && value.id) list.push(value); Object.values(value).forEach(walk); }; walk(state.blocks); return list; };

test('MS-048: gg.sprites@0.3.0 grants each object its own resources; the frozen manifests and earlier profiles do not change', () => {
  const entries = localPackCatalog.filter(item => item.manifest.id === 'gg.sprites');
  assert.equal(entries[0].sha256, '225d6c992253966ac0645d9e73360c13da853787c0b02ff23c6cc9bdad6072d2');
  assert.equal(entries[1].sha256, '70475dfae3921d1ac28e862d30c2c31e815da2b2f1133060038f37c24c4e366a');
  assert.equal(entries[2].manifest.permissions.objectResources, true);
  assert.equal(Object.hasOwn(entries[1].manifest.permissions, 'objectResources'), false);
  const costume = (target, value) => scene([script(target, target + '-s', [node('setCostume', target + '-c', {costume: value})])]);
  const sound = (target, value) => scene([script(target, target + '-s', [node('playSound', target + '-p', {sound: value, wait: false})])]);
  assert.doesNotThrow(() => authorizeProgram(two, costume('hero', 'hero-alt'), {objects: true, resourceView: view}));
  assert.doesNotThrow(() => authorizeProgram(two, costume('cesta', 'cesta:c1'), {objects: true, resourceView: view}));
  assert.doesNotThrow(() => authorizeProgram(two, sound('cesta', 'cesta:s0'), {objects: true, resourceView: view}));
  assert.doesNotThrow(() => authorizeProgram(two, sound('stage', 'stage:s0'), {objects: true, resourceView: view}), 'the stage has sounds too');
  // Owning it is what counts: another object's resource stays refused.
  assert.throws(() => authorizeProgram(two, costume('cesta', 'hero-alt'), {objects: true, resourceView: view}), /unsupported costume/);
  assert.throws(() => authorizeProgram(two, sound('hero', 'cesta:s0'), {objects: true, resourceView: view}), /unsupported sound/);
  // One workspace of a sprite, on its own.
  const ir0 = {version: 0, scripts: [{event: 'start', sourceBlockId: 's', body: [node('setCostume', 'c', {costume: 'cesta:c1'})]}]};
  assert.doesNotThrow(() => authorizeProgram(two, ir0, {resourceView: view, ownerId: 'cesta'}));
  assert.throws(() => authorizeProgram(two, ir0, {resourceView: view}), /unsupported costume/, 'without owner, hero as ever');
  // A profile without the declaration keeps hero only.
  const older = createCapabilities(['gg.sprites', 'gg.assets'], {versions: {'gg.sprites': '0.2.0', 'gg.assets': '0.2.0'}});
  assert.throws(() => authorizeProgram(older, ir0, {resourceView: view, ownerId: 'cesta'}), /no declarado/);
  // Text: the RPC names no object. Any object's resource passes here, and the
  // scene refuses another object's at the call (`costume unavailable`, MS-BROWSER-019).
  assert.doesNotThrow(() => authorizeProjectOperation(two, 'program.setCostume', ['ctx', 'cesta:c1'], {resourceView: view}));
  assert.doesNotThrow(() => authorizeProjectOperation(two, 'program.playSound', ['ctx', 'stage:s0', false], {resourceView: view}));
  assert.doesNotThrow(() => authorizeProjectOperation(two, 'program.setCostume', ['ctx', 'hero-alt'], {resourceView: view}));
  assert.throws(() => authorizeProjectOperation(two, 'program.setCostume', ['ctx', 'nadie'], {resourceView: view}), /no declarado/);
  assert.throws(() => authorizeProjectOperation(older, 'program.setCostume', ['ctx', 'cesta:c1'], {resourceView: view}), /no declarado/);
});

test('MS-049: blocks read the resources of their object, in menus, validation and lowering', async () => {
  const state = assetsWorkspace('c', 'cesta:c1', 'cesta:s0');
  assert.throws(() => validateWorkspaceResources(state, {capabilities: two, resourceView: view}), /Recurso no disponible en este objeto/, 'without owner, hero as ever');
  assert.doesNotThrow(() => validateWorkspaceResources(state, {capabilities: two, resourceView: view, ownerId: 'cesta'}));
  const workspace = loadWorkspace(structuredClone(state), {capabilities: two, resourceView: view, ownerId: 'cesta'});
  try {
    const block = workspace.getBlockById('c-costume'), sound = workspace.getBlockById('c-sound');
    assert.deepEqual(block.getField('COSTUME').getOptions(false).map(([label]) => label), ['Cesta llena', 'Cesta vacía']);
    assert.deepEqual(sound.getField('SOUND').getOptions(false).map(([label]) => label), ['Cuac']);
    assert.equal(block.getFieldValue('COSTUME'), 'cesta:c1');
    const ir = workspaceToIR(workspace, {capabilities: two, resourceView: view, ownerId: 'cesta'});
    assert.equal(ir.scripts[0].body[0].costume, 'cesta:c1');
    assert.equal(validateProgram(ir, {resourceView: view, resourceOwnerId: 'cesta'}), ir);
  } finally { workspace.dispose(); }
  // Hero's resource does not load on Cesta, and the failure names the block.
  assert.throws(() => loadWorkspace(assetsWorkspace('x', 'hero-alt', 'cesta:s0'), {capabilities: two, resourceView: view, ownerId: 'cesta'}),
    error => /Recurso no disponible en este objeto/.test(error.message) && error.sourceBlockId === 'x-costume');
  // An object with nothing to list can take the block: it still opens, and only
  // lowering it stops, there. Refusing to load it would lock the object out.
  const empty = {blocks: {languageVersion: 0, blocks: [start('e-start', {type: 'gg_assets_play_sound', id: 'e-sound', fields: {SOUND: '__gg_missing_resource__'}})]}};
  const opened = loadWorkspace(empty, {capabilities: two, resourceView: createResourceView(await validateResources({...structuredClone(resources), sounds: resources.sounds.filter(item => item.ownerId !== 'cesta')})), ownerId: 'cesta'});
  try {
    assert.throws(() => workspaceToIR(opened, {capabilities: two, resourceView: view, ownerId: 'cesta'}),
      error => /aún no tiene ese recurso/.test(error.message) && error.sourceBlockId === 'e-sound');
  } finally { opened.dispose(); }
  // A fixed block of hero pasted on another object says the same, with its block.
  const pasted = {blocks: {languageVersion: 0, blocks: [start('p-start', {type: 'gg_set_costume', id: 'p-costume', fields: {COSTUME: 'hero-alt'}})]}};
  const other = loadWorkspace(pasted, {capabilities: two, resourceView: view, ownerId: 'cesta'});
  try {
    assert.throws(() => workspaceToIR(other, {capabilities: two, resourceView: view, ownerId: 'cesta'}),
      error => /Recurso no disponible en este objeto/.test(error.message) && error.sourceBlockId === 'p-costume');
  } finally { other.dispose(); }
});

test('MS-050: the text view of an object reads, writes and converts its own resources', () => {
  const ir = {version: 0, scripts: [{event: 'start', sourceBlockId: 's', body: [node('setCostume', 'c', {costume: 'cesta:c1'}), node('playSound', 'p', {sound: 'cesta:s0', wait: false})]}]};
  const owner = scene2DTextOwner(config(heroSprite, cestaSprite), 'cesta');
  const {text} = generateApi3ProgramSource(ir, 'javascript', {owner, resourceView: view});
  assert.match(text, /cesta\.setCostume\("cesta:c1"\)/);
  const parsed = parseJavaScriptCodeView(text, {capabilities: two, resourceView: view, owner});
  assert.equal(parsed.ir.scripts[0].body[0].costume, 'cesta:c1');
  assert.throws(() => parseJavaScriptCodeView('onStart(() => {\n  cesta.setCostume("hero-alt");\n});\n', {capabilities: two, resourceView: view, owner}),
    error => error.code === 'CV_PROGRAM' && error.lineNumber === 2);
  // Blocks ↔ text, through the same path the editor uses.
  const state = assetsWorkspace('c', 'cesta:c0', 'cesta:s0');
  const snapshot = captureCodeViewSnapshot(state, {capabilities: two, resourceView: view, ownerId: 'cesta'});
  assert.equal(snapshot.ownerId, 'cesta');
  const generated = generateCodeViewSource(snapshot, 'javascript', {owner});
  const next = parseJavaScriptCodeView(generated.text.replace('cesta:c0', 'cesta:c1'), {capabilities: two, resourceView: view, owner, variableIds: generated.variableIds, variableNames: generated.variableNames});
  const candidate = prepareCodeViewCandidate(snapshot, next, {targetId: 'cesta'});
  assert.deepEqual(blocksOf(candidate.state).filter(block => block.type === 'gg_assets_set_costume').map(block => block.fields.COSTUME), ['cesta:c1']);
  assert.deepEqual(blocksOf(workspaceFromIR(snapshot.ir, {capabilities: two, resourceView: view, ownerId: 'cesta'})).map(block => block.type), ['gg_when_start', 'gg_assets_set_costume', 'gg_assets_play_sound']);
  // The derived listing validates against the same object.
  assert.match(generateCode(ir, {resourceView: view, resourceOwnerId: 'cesta'}).text, /cesta:c1/);
  assert.throws(() => generateCode(ir, {resourceView: view}), /unsupported costume/);
});

test('MS-051: a duplicate keeps working: hero\'s fixed blocks become its own resource blocks, also before gg.assets is in the profile', async () => {
  const hero = {blocks: {languageVersion: 0, blocks: [start('h-start', {type: 'gg_set_costume', id: 'h-fixed', fields: {COSTUME: 'hero-alt'},
    next: {block: {type: 'gg_play_sound', id: 'h-tone', fields: {SOUND: 'tone'},
      next: {block: {type: 'gg_play_sound_wait', id: 'h-wait', fields: {SOUND: 'tone'},
        next: {block: {type: 'gg_assets_set_costume', id: 'h-menu', fields: {COSTUME: 'hero'},
          next: {block: {type: 'gg_assets_play_sound_wait', id: 'h-menu-sound', fields: {SOUND: 'tone'}}}}}}}}}})]}};
  const scene2d = {stage: {}, sprites: {hero}};
  const state = {config: config(heroSprite), scene2d, codeViews: null, resources: base, mounted: 'hero'};
  const fixedOnly = {blocks: {languageVersion: 0, blocks: [start('f-start', {type: 'gg_set_costume', id: 'f-fixed', fields: {COSTUME: 'hero-alt'}, next: {block: {type: 'gg_play_sound', id: 'f-tone', fields: {SOUND: 'tone'}}}})]}};
  // Without gg.assets the project can only hold the fixed blocks.
  const plain = await edits.duplicateSceneObject({...state, scene2d: {stage: {}, sprites: {hero: fixedOnly}}}, {id: 'sprite-8', name: 'hero 2', sourceId: 'hero', rules: edits.scene2DObjectRules(createCapabilities(['gg.sprites']))});
  assert.deepEqual(blocksOf(plain.scene2d.sprites['sprite-8']).map(block => block.type), ['gg_when_start', 'gg_assets_set_costume', 'gg_assets_play_sound']);
  for (const capabilities of [createCapabilities(['gg.sprites', 'gg.assets'])]) {
    const after = await edits.duplicateSceneObject(state, {id: 'sprite-9', name: 'hero 2', sourceId: 'hero', rules: edits.scene2DObjectRules(capabilities)});
    const copy = after.scene2d.sprites['sprite-9'], mapped = kind => Object.fromEntries(after.resources[kind].filter(item => item.ownerId === 'sprite-9').map(item => [item.name, item.id]));
    assert.deepEqual(blocksOf(copy).map(block => block.type), ['gg_when_start', 'gg_assets_set_costume', 'gg_assets_play_sound', 'gg_assets_play_sound_wait', 'gg_assets_set_costume', 'gg_assets_play_sound_wait']);
    assert.deepEqual(blocksOf(copy).slice(1).map(block => block.fields.COSTUME ?? block.fields.SOUND),
      [mapped('costumes')['hero-alt'], mapped('sounds').tone, mapped('sounds').tone, mapped('costumes').hero, mapped('sounds').tone]);
    // The source is not touched.
    assert.deepEqual(after.scene2d.sprites.hero, hero);
    // The transaction locks gg.assets; with it the copy loads, composes and becomes a Scratch target.
    const locked = createCapabilities(['gg.sprites', 'gg.assets']);
    locked.config['gg.sprites'] = after.config;
    const copyView = createResourceView(await validateResources(after.resources));
    const lower = (workspace, ownerId) => { const loaded = loadWorkspace(structuredClone(workspace), {capabilities: locked, resourceView: copyView, ownerId}); try { return workspaceToIR(loaded, {capabilities: locked, resourceView: copyView, ownerId}); } finally { loaded.dispose(); } };
    const program = composeScene2DProgram(after.config, {sprites: {hero: lower(hero, 'hero'), 'sprite-9': lower(copy, 'sprite-9')}});
    assert.doesNotThrow(() => authorizeProgram(locked, program, {objects: true, resourceView: copyView}));
    const {project} = toScratchSceneProject(program, {scene: after.config, resourceView: copyView});
    assert.equal(project.targets.length, 3);
    assert.ok(project.targets[2].costumes.some(item => item.name === mapped('costumes')['hero-alt']));
  }
});

test('MS-052: a program that cannot be lowered names its object; the export reads the scene, not the object on screen', async () => {
  const hero = {variables: [], blocks: {blocks: [{type: 'gg_when_start', id: 'h'}]}}, broken = {blocks: {blocks: [{type: 'gg_when_start', id: 'b'}]}};
  const capabilities = profile([heroSprite, {...heroSprite, id: 'rota', name: 'Rota', costume: 'hero'}]);
  const live = {saved: hero, order: null};
  const editor = {
    save: () => live.saved, prepare: (state, options) => ({state, ...options}), commit: () => {}, subscribe: () => () => {}, captureCapabilities: () => capabilities,
    program: () => ({version: 0, scripts: [{event: 'start', sourceBlockId: 'h', body: []}]}),
    programOf(state, {ownerId} = {}) { if (ownerId === 'rota') throw Object.assign(new Error('Recurso no disponible en este objeto: x'), {sourceBlockId: 'b'}); return {version: 0, scripts: []}; }
  };
  const authoring = createProjectAuthoring({editor, source: {value: ''}, initialCapabilities: capabilities});
  const model = await createProject({name: 'P', scene2d: {stage: {}, sprites: {hero, rota: broken}}, deviceSource: '', catalog, capabilities});
  authoring.commit(authoring.prepare(model));
  assert.throws(() => authoring.sceneProgram(), error => error.message.startsWith('«Rota»:') && error.sourceBlockId === 'b' && error.targetId === 'rota');
  assert.equal(typeof authoring.exportProgram, 'function');
  assert.throws(() => authoring.exportProgram(), /un solo objeto/);
  // hero alone: its program, whichever object is on screen.
  const one = profile([heroSprite]);
  const single = createProjectAuthoring({editor: {...editor, captureCapabilities: () => one, program: () => ({version: 0, scripts: []}), programOf: () => ({version: 0, scripts: [{event: 'start', sourceBlockId: 'hero-script', body: []}]})}, source: {value: ''}, initialCapabilities: one});
  single.commit(single.prepare(await createProject({name: 'S', scene2d: {stage: {}, sprites: {hero}}, deviceSource: '', catalog, capabilities: one})));
  single.mountObject('stage');
  assert.equal(single.exportProgram().scripts[0].sourceBlockId, 'hero-script');
  // A stage with scripts, or hero gone, cannot travel in the one-sprite export.
  const staged = createProjectAuthoring({editor: {...editor, captureCapabilities: () => one, programOf: state => ({version: 0, scripts: (state.blocks?.blocks ?? []).map(block => ({event: 'start', sourceBlockId: block.id, body: []}))})}, source: {value: ''}, initialCapabilities: one});
  staged.commit(staged.prepare(await createProject({name: 'E', scene2d: {stage: {blocks: {blocks: [{type: 'gg_when_start', id: 'e'}]}}, sprites: {hero}}, deviceSource: '', catalog, capabilities: one})));
  assert.throws(() => staged.exportProgram(), /escenario/);
});

const library = validateStarterLibrary(JSON.parse(buildStarterLibrary().bytes.toString('utf8')));
async function preparedOf(entry) {
  const safe = sanitizeSvg(await decodeStarterLibraryEntry(entry));
  return {...await prepareAsset(safe.bytes, starterLibraryMedia(entry)), width: safe.width, height: safe.height};
}
test('MS-053: the library adds to the selected object, and a sprite as a new object with a free name', async () => {
  const entry = library.entries.find(item => item.id === 'gato'), prepared = await preparedOf(entry);
  const added = await applyStarterLibraryEntry(base, entry, prepared, {ownerId: 'cesta'});
  assert.equal(added.resources.costumes.find(item => item.id === added.descriptorId).ownerId, 'cesta');
  const heroDefault = await applyStarterLibraryEntry(base, entry, prepared);
  assert.equal(heroDefault.resources.costumes.find(item => item.id === heroDefault.descriptorId).ownerId, 'hero');
  assert.equal(heroDefault.descriptorId, 'gato');
  assert.equal(typeof edits.addLibrarySceneObject, 'function');
  const state = {config: config(heroSprite, {...heroSprite, id: 'otro', name: 'Gato', costume: 'hero'}), scene2d: {stage: {}, sprites: {hero: {}, otro: {}}}, codeViews: null, resources: base, mounted: 'hero'};
  const after = await edits.addLibrarySceneObject(state, {id: 'sprite-7', entry, prepared, rules: edits.scene2DObjectRules(two)});
  const sprite = after.config.sprites.at(-1);
  assert.equal(sprite.id, 'sprite-7');
  assert.equal(sprite.name, 'Gato 2', 'names stay unique');
  assert.deepEqual(after.scene2d.sprites['sprite-7'], {});
  const costume = after.resources.costumes.find(item => item.ownerId === 'sprite-7');
  assert.equal(sprite.costume, costume.id);
  assert.equal(costume.assetId, entry.sha256);
  assert.equal(costume.name, 'Gato');
  assert.equal(after.resources.costumes.filter(item => item.ownerId === 'hero').length, base.costumes.filter(item => item.ownerId === 'hero').length, 'nothing goes to hero');
  const full = {...state, config: config(...Array.from({length: 8}, (_, index) => ({...heroSprite, id: 's' + index, name: 'S' + index})))};
  await assert.rejects(edits.addLibrarySceneObject(full, {id: 'x', entry, prepared, rules: edits.scene2DObjectRules(two)}), /hasta 8/);
  // A name longer than a sprite's limit is shortened, not refused.
  const long = await edits.addLibrarySceneObject(state, {id: 'sprite-8', entry: {...entry, id: 'largo', name: 'Un nombre de la biblioteca largo de verdad'}, prepared, rules: edits.scene2DObjectRules(two)});
  assert.ok(long.config.sprites.at(-1).name.length <= 32);
});

const reading = (sprites, variables = []) => ({sprites, variables});
const lessonWith = checks => ({...structuredClone(lessonCatalog[0]), steps: [{id: 'paso', title: 'Paso', instructions: 'Haz algo.', hints: [], checks}]});
test('MS-054: activity checks accept a targetId, default to hero, and the stored activities stay as they are', () => {
  for (const check of [{kind: 'position', axis: 'x', equals: 1, tolerance: 0, targetId: 'cesta'}, {kind: 'variable', variableId: 'v', equals: 1, targetId: 'cesta'},
    {kind: 'authored-operation', operation: 'move', steps: 10, targetId: 'cesta'}, {kind: 'authored-operation', operation: 'setCostume', costume: 'cesta:c1', targetId: 'cesta'}])
    assert.deepEqual(validateLessonCheck(check), check);
  for (const targetId of ['', '__proto__', 'con espacio', 7]) assert.throws(() => validateLessonCheck({kind: 'position', axis: 'x', equals: 1, tolerance: 0, targetId}), /Actividad/);
  assert.throws(() => validateLessonCheck({kind: 'position', axis: 'x', equals: 1, tolerance: 0, targetId: 'stage'}), /Actividad/, 'the stage has no position');
  assert.throws(() => validateLessonCheck({kind: 'authored-operation', operation: 'setCostume', costume: 'cesta:c1'}), /Actividad/, 'a free costume needs its object');
  // Catalog: validation hands back each stored activity unchanged.
  for (const lesson of lessonDefinitions) assert.equal(JSON.stringify(validateLesson(lesson)), JSON.stringify(lesson));
  const two = reading([{id: 'cesta', name: 'Cesta', x: 40, y: 0}, {id: 'hero', name: 'hero', x: 15, y: 0}], [{id: 'pasos', name: 'pasos', value: 3, targetId: 'cesta'}]);
  // hero is not the first sprite: the default reads hero.
  assert.equal(evaluateLesson(lessonWith([{kind: 'position', axis: 'x', equals: 15, tolerance: 0}]), {scene: two}).passed, true);
  assert.equal(evaluateLesson(lessonWith([{kind: 'position', axis: 'x', equals: 40, tolerance: 0, targetId: 'cesta'}]), {scene: two}).passed, true);
  // Without its object the check explains, and does not pass.
  const gone = evaluateLesson(lessonWith([{kind: 'position', axis: 'x', equals: 15, tolerance: 0}]), {scene: reading([{id: 'cesta', name: 'Cesta', x: 15, y: 0}])});
  assert.equal(gone.passed, false);
  assert.match(gone.steps[0].checks[0].message, /hero/);
  // A variable with an owner is that object's.
  assert.equal(evaluateLesson(lessonWith([{kind: 'variable', variableId: 'pasos', equals: 3, targetId: 'cesta'}]), {scene: two, variables: [{id: 'pasos', name: 'pasos', value: 3}]}).passed, true);
  assert.equal(evaluateLesson(lessonWith([{kind: 'variable', variableId: 'pasos', equals: 3, targetId: 'hero'}]), {scene: two, variables: [{id: 'pasos', name: 'pasos', value: 3}]}).passed, false);
  // Authored checks read the scene, whichever object is on screen.
  const program = scene([script('cesta', 'c-s', [node('move', 'c-m', {steps: 10})]), script('hero', 'h-s', [node('move', 'h-m', {steps: 25})])]);
  const authored = (check, ir = program) => evaluateLesson(lessonWith([check]), {scene: two, authoring: {ir}}).passed;
  assert.equal(authored({kind: 'authored-operation', operation: 'move', steps: 25}), true);
  assert.equal(authored({kind: 'authored-operation', operation: 'move', steps: 10}), false, 'by default, hero\'s scripts');
  assert.equal(authored({kind: 'authored-operation', operation: 'move', steps: 10, targetId: 'cesta'}), true);
  const costume = scene([script('cesta', 'c-s', [node('setCostume', 'c-c', {costume: 'cesta:c1'})])]);
  assert.equal(evaluateLesson(lessonWith([{kind: 'authored-operation', operation: 'setCostume', costume: 'cesta:c1', targetId: 'cesta'}]), {scene: two, authoring: {ir: costume, resourceView: view}}).passed, true);
  // IR0 keeps working, as hero's.
  const ir0 = {version: 0, scripts: [{event: 'start', sourceBlockId: 's', body: [node('move', 'm', {steps: 5})]}]};
  assert.equal(authored({kind: 'authored-operation', operation: 'move', steps: 5}, ir0), true);
  assert.equal(authored({kind: 'authored-operation', operation: 'move', steps: 5, targetId: 'cesta'}, ir0), false);
  assert.ok(getLesson('story'));
});

test('MS-055: GG reads a local variable of any sprite; hero and the stage stay as they were', () => {
  const target = (variables, isOriginal = true) => ({isOriginal, variables});
  const hero = target({'h': {name: 'vidas', type: '', value: '2'}}), cesta = target({'c': {name: 'pasos', type: '', value: '3'}}), stage = target({'g': {name: 'puntos', type: '', value: '9'}});
  const vm = {runtime: {getSpriteTargetByName: name => ({hero, cesta})[name], getTargetForStage: () => stage}};
  const call = createGGBindings(() => vm, () => [{id: 'hero', name: 'hero'}, {id: 'cesta', name: 'Cesta'}]);
  assert.deepEqual(call('variables.get', ['h']), {id: 'h', name: 'vidas', value: 2});
  assert.deepEqual(call('variables.get', ['g']), {id: 'g', name: 'puntos', value: 9});
  assert.deepEqual(call('variables.get', ['c']), {id: 'c', name: 'pasos', value: 3});
  const single = createGGBindings(() => vm);
  assert.throws(() => single('variables.get', ['c']), /Unknown GG numeric variable/, 'a single hero sees what it always saw');
});

test('MS-056: object profiles do not lower on project transactions; legacy ones do; prepare checks the blocks of every object', async () => {
  const hero = {blocks: {blocks: [{type: 'gg_when_start', id: 'h'}]}}, seen = [];
  const editorFor = capabilities => ({save: () => ({}), program: () => ({version: 0, scripts: []}), commit() {}, subscribe: () => () => {}, captureCapabilities: () => capabilities,
    prepare(state, options) { seen.push(options.lower); return {state, ...options}; }, validateBlocks(state, options) { blockProgram.validateWorkspaceBlocks?.(state, options); }});
  const objects = profile([heroSprite]), legacy = createCapabilities(['gg.sprites'], {versions: {'gg.sprites': '0.2.0'}});
  const scene = createProjectAuthoring({editor: editorFor(objects), source: {value: ''}, initialCapabilities: objects});
  scene.prepare(await createProject({name: 'O', scene2d: {stage: {}, sprites: {hero}}, deviceSource: '', catalog, capabilities: objects}));
  assert.equal(seen.at(-1), false, 'only Run asks an object profile to finish');
  const old = createProjectAuthoring({editor: editorFor(legacy), source: {value: ''}, initialCapabilities: legacy});
  old.prepare(await createProject({name: 'L', blockly: hero, deviceSource: '', catalog, capabilities: legacy}));
  assert.notEqual(seen.at(-1), false, 'a single-workspace profile stays as it was');
  // The guard: what the profile offers, finished or not, and nothing else.
  assert.equal(typeof blockProgram.validateWorkspaceBlocks, 'function');
  const of = (...blocks) => ({blocks: {languageVersion: 0, blocks}});
  const check = (state, capabilities) => blockProgram.validateWorkspaceBlocks(state, {capabilities});
  assert.doesNotThrow(() => check(of({type: 'gg_when_start', id: 's', inputs: {DO: {block: {type: 'controls_if', id: 'i'}}}}, {type: 'gg_move', id: 'loose'}), two));
  assert.throws(() => check(of({type: 'gg_score_set', id: 'x'}), two), error => /gg_score_set/.test(error.message) && error.sourceBlockId === 'x');
  assert.throws(() => check(of({type: 'gg_when_start', id: 's', inputs: {DO: {block: {type: 'gg_score_set', id: 'nested'}}}}), two), /gg_score_set/);
  assert.throws(() => check(of({type: 'gg_forever', id: 'f'}), createCapabilities(['gg.sprites'], {versions: {'gg.sprites': '0.1.0'}})), /gg_forever/, 'a core structure only where a pack offers it');
  assert.doesNotThrow(() => check(of({type: 'gg_forever', id: 'f'}), two));
  // Saving, opening and changing share the rule: every object, not the one on screen.
  const foreign = await createProject({name: 'F', scene2d: {stage: of({type: 'gg_score_set', id: 'x'}), sprites: {hero}}, deviceSource: '', catalog, capabilities: objects});
  assert.throws(() => scene.prepare(foreign), /gg_score_set/);
  const clean = await createProject({name: 'C', scene2d: {stage: {}, sprites: {hero}}, deviceSource: '', catalog, capabilities: objects});
  assert.doesNotThrow(() => scene.prepare(clean));
});

test('MS-057: a profile change that leaves blocks without a pack is refused, naming the object; what the profile keeps passes', async () => {
  const withScore = createCapabilities(['gg.sprites', 'gg.assets', 'gg.score']);
  withScore.config['gg.sprites'] = config(heroSprite, cestaSprite);
  const live = {saved: {blocks: {languageVersion: 0, blocks: [{type: 'gg_when_start', id: 'h'}]}}};
  const editor = {save: () => live.saved, prepare: (state, options) => ({state, ...options}), commit() {}, subscribe: () => () => {}, captureCapabilities: () => withScore,
    program: () => ({version: 0, scripts: []}), validateBlocks: (state, options) => blockProgram.validateWorkspaceBlocks(state, options)};
  const authoring = createProjectAuthoring({editor, source: {value: ''}, initialCapabilities: withScore});
  const score = {blocks: {languageVersion: 0, blocks: [{type: 'gg_score_set', id: 'score'}]}};
  authoring.commit(authoring.prepare(await createProject({name: 'P', scene2d: {stage: {}, sprites: {hero: live.saved, cesta: score}}, deviceSource: '', catalog, capabilities: withScore})));
  // A non-mounted object, by its visible name.
  assert.throws(() => authoring.prepareCapabilities(two), error => /«Cesta»/.test(error.message) && !/gg_score_set|Unsupported/.test(error.message));
  assert.doesNotThrow(() => authoring.prepareCapabilities(withScore));
  // The mounted object is read live, not from what is stored.
  const scoreless = createProjectAuthoring({editor, source: {value: ''}, initialCapabilities: withScore});
  scoreless.commit(scoreless.prepare(await createProject({name: 'Q', scene2d: {stage: {}, sprites: {hero: live.saved, cesta: {}}}, deviceSource: '', catalog, capabilities: withScore})));
  assert.doesNotThrow(() => scoreless.prepareCapabilities(two));
  live.saved = score;
  assert.throws(() => scoreless.prepareCapabilities(two), /«hero»/);
  // A whole-project transaction (allowRemoval) is not a profile change.
  assert.doesNotThrow(() => scoreless.prepareCapabilities(two, {allowRemoval: true}));
  assert.equal(typeof blockProgram.isOfferedBlock, 'function');
});
