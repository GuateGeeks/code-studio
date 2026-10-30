import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {createCapabilities, validateCapabilities} from '../../src/contracts/packs.mjs';
import {localPackCatalog} from '../../src/packs/catalog.mjs';
import {languageTables, spriteLanguage02} from '../../src/packs/language-tables.mjs';
import * as objectsContract from '../../src/contracts/scene2d-objects.mjs';
import * as edits from '../../src/contracts/scene2d-object-edits.mjs';
import {promoteLegacyResources, validateResources, createResourceView, prepareAsset} from '../../src/contracts/resources.mjs';
import {applyStarterLibraryEntry, decodeStarterLibraryEntry, restoreInitialBackdrop, starterLibraryMedia, validateStarterLibrary} from '../../src/contracts/starter-library.mjs';
import {buildStarterLibrary} from '../../tools/resources/starter-library.mjs';
import {authorizeProgram, authorizeProjectOperation} from '../../src/contracts/pack-broker.mjs';
import {composeScene2DProgram, scene2DStageOffers, validateProgram} from '../../src/contracts/program-contract.mjs';
import {validateTextProgramRPC} from '../../src/contracts/text-program.mjs';
import {isScene2DLoweringOpcode} from '../../src/contracts/scene2d-opcodes.mjs';
import {scene2DTextOwner, scene2DReservedIdentifiers} from '../../src/contracts/scene2d-identifiers.mjs';
import {loadWorkspace, saveWorkspace, validateWorkspaceBlocks, workspaceToIR} from '../../src/editor/block-program.mjs';
import {workspaceFromIR} from '../../src/editor/workspace-from-ir.mjs';
import {generateApi3ProgramSource, generateApi3SceneSource} from '../../src/generated-program-source.mjs';
import {generateCode} from '../../src/generated-code.mjs';
import {parseJavaScriptCodeView, pythonCodeViewVocabulary} from '../../src/targets/text/code-view-parser.mjs';
import {pythonCodeViewReader} from '../../src/targets/text/code-view-python.mjs';
import {api3StageForbids, scene2DApi3} from '../../src/targets/text/api-v3-vocabulary.mjs';
import {compileApi3JavaScript} from '../../src/targets/text/api-v3.mjs';
import {contextOperations} from '../../src/targets/text/program-session.mjs';
import {reconcileCodeViewIdentity} from '../../src/code-view-identity.mjs';
import {toScratchSceneProject} from '../../src/adapters/scratch/scratch-project.mjs';
import {createTextProgram} from '../../src/adapters/scratch/text-program.mjs';
import {createGGBindings} from '../../src/adapters/scratch/gg-bindings.mjs';
import {createScratchSession} from '../../spikes/scratch-adapter.mjs';
import {buildProjectCatalog} from '../../tools/f1/build-project-catalog.mjs';
import {createTone} from '../../tools/f0/tone.mjs';
import * as presentation from '../../src/studio/presentation-text.mjs';
import {createCodeViewsUI} from '../../src/studio/code-views-ui.mjs';
import {createCodeViewsState} from '../../src/code-views-state.mjs';

// scene2d-multi-sprite tarea 4.1 (E2, 30/10/2026): «ir a objeto», «ir a una
// posición aleatoria», «cambiar fondo a» and «siguiente fondo» through every layer
// of gg.sprites@0.3.0, and the canonical project «Diálogo». 0.1.0 and 0.2.0 stay
// frozen; their projects never gain these blocks.
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
const fixture = JSON.parse(await readFile(new URL('../fixtures/canonical/scene2d/dialogo/project.json', import.meta.url), 'utf8'));
const base = await promoteLegacyResources(catalog);
const firstOf = ownerId => base.costumes.find(item => item.ownerId === ownerId);
// The fixture's resources: copies of the catalog's, so that it needs no bytes of its own.
const resources = await validateResources({...structuredClone(base), costumes: [...base.costumes, ...fixture.resources.map(({from, ...item}) => ({...firstOf(from), ...item}))]});
const view = createResourceView(resources);
const config = structuredClone(fixture.objects);
const profile = (objects = config) => { const capabilities = createCapabilities(['gg.sprites', 'gg.assets']); capabilities.config['gg.sprites'] = structuredClone(objects); return capabilities; };
const two = profile();
const strip = value => JSON.parse(JSON.stringify(value, (key, item) => key === 'sourceBlockId' ? undefined : item));
const onStart = (id, ...blocks) => ({blocks: {languageVersion: 0, blocks: [{type: 'gg_when_start', id, x: 20, y: 20,
  inputs: {DO: {block: blocks.reduceRight((next, block) => ({...block, ...(next ? {next: {block: next}} : {})}), null)}}}]}});
const irOf = (state, {capabilities = two, ownerId = 'hero', resourceView = view} = {}) => {
  const workspace = loadWorkspace(structuredClone(state), {capabilities, resourceView, ownerId});
  try { return workspaceToIR(workspace, {capabilities, resourceView, ownerId}); } finally { workspace.dispose(); }
};
function runPython(sources, vocabulary) {
  const script = pythonCodeViewReader + '\nimport sys\npayload=json.loads(sys.stdin.read())\nprint(json.dumps([json.loads(_cv_python_safe(s,json.dumps(payload["vocabulary"]))) for s in payload["sources"]]))\n';
  const output = spawnSync('python3', ['-c', script], {input: JSON.stringify({sources, vocabulary}), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024});
  assert.equal(output.status, 0, output.stderr);
  return JSON.parse(output.stdout);
}
const types = ['gg_go_to_object', 'gg_go_to_random', 'gg_set_backdrop', 'gg_next_backdrop'];
const heroOwner = scene2DTextOwner(config, 'hero'), cestaOwner = scene2DTextOwner(config, 'cesta'), stageOwner = scene2DTextOwner(config, 'stage');
const cases = [
  {name: 'ir a objeto', block: {type: 'gg_go_to_object', id: 'b-goto', fields: {TARGET: 'cesta'}}, ir: {kind: 'goToObject', target: 'cesta'}, opcodes: ['motion_goto', 'motion_goto_menu'], js: 'hero.goToObject(cesta);', python: 'hero.go_to_object(cesta)'},
  {name: 'ir a una posición aleatoria', block: {type: 'gg_go_to_random', id: 'b-random'}, ir: {kind: 'goToRandom'}, opcodes: ['motion_goto', 'motion_goto_menu'], js: 'hero.goToRandom();', python: 'hero.go_to_random()'},
  {name: 'cambiar fondo a', block: {type: 'gg_set_backdrop', id: 'b-backdrop', fields: {BACKDROP: 'fondo-noche'}}, ir: {kind: 'setBackdrop', backdrop: 'fondo-noche'}, opcodes: ['looks_switchbackdropto', 'looks_backdrops'], js: 'setBackdrop("Noche");', python: 'set_backdrop("Noche")'},
  {name: 'siguiente fondo', block: {type: 'gg_next_backdrop', id: 'b-next'}, ir: {kind: 'nextBackdrop'}, opcodes: ['looks_nextbackdrop'], js: 'nextBackdrop();', python: 'next_backdrop()'}
];

test('MS-058: the four blocks exist only in gg.sprites@0.3.0; 0.1.0 and 0.2.0 keep their hashes and their projects never gain them', () => {
  const entries = localPackCatalog.filter(item => item.manifest.id === 'gg.sprites');
  assert.equal(entries[0].sha256, '225d6c992253966ac0645d9e73360c13da853787c0b02ff23c6cc9bdad6072d2');
  assert.equal(entries[1].sha256, '70475dfae3921d1ac28e862d30c2c31e815da2b2f1133060038f37c24c4e366a');
  const contributed = manifest => manifest.contributions.blocks.map(block => block.type);
  for (const type of types) {
    assert.ok(contributed(entries[2].manifest).includes(type), type);
    assert.ok(languageTables['gg.sprites@0.3.0'].some(entry => entry.block === type), type);
    assert.ok(!contributed(entries[1].manifest).includes(type) && !contributed(entries[0].manifest).includes(type), type);
    assert.ok(!spriteLanguage02.some(entry => entry.block === type), type);
    assert.ok(!languageTables['gg.sprites@0.1.0'].some(entry => entry.block === type), type);
  }
  assert.equal(entries[2].manifest.language, languageTables['gg.sprites@0.3.0']);
  for (const operation of ['program.goToObject', 'program.goToRandom', 'program.setBackdrop', 'program.nextBackdrop']) {
    assert.ok(entries[2].manifest.permissions.operations.includes(operation), operation);
    assert.ok(!entries[1].manifest.permissions.operations.includes(operation), operation);
  }
  const toolbox = name => entries[2].manifest.contributions.toolbox.find(category => category.name === name).contents.map(block => block.type);
  assert.ok(toolbox('Movimiento').includes('gg_go_to_object') && toolbox('Movimiento').includes('gg_go_to_random'));
  assert.ok(toolbox('Apariencia').includes('gg_set_backdrop') && toolbox('Apariencia').includes('gg_next_backdrop'));
  for (const version of ['0.1.0', '0.2.0']) {
    const capabilities = createCapabilities(['gg.sprites'], {versions: {'gg.sprites': version}});
    for (const item of cases) {
      assert.throws(() => validateWorkspaceBlocks(onStart('s', item.block), {capabilities}), /Unsupported block/, version + ' ' + item.name);
      assert.throws(() => parseJavaScriptCodeView(`onStart(() => {\n  ${item.js}\n});\n`, {capabilities}), /no tiene un bloque instalado/, version + ' ' + item.name);
    }
    // The translator knows the names for every project; the broker refuses them here.
    assert.throws(() => authorizeProjectOperation(capabilities, 'program.goToRandom', ['context']), /no declarado/, version);
    assert.throws(() => authorizeProjectOperation(capabilities, 'program.setBackdrop', ['context', 'Noche']), /no declarado/, version);
  }
  for (const name of ['setBackdrop', 'nextBackdrop', 'set_backdrop', 'next_backdrop']) assert.ok(scene2DReservedIdentifiers.has(name), name);
});

for (const item of cases) test(`MS-059: «${item.name}» goes from its block to IR, reviewed opcodes, readable text and back with its IDs`, () => {
  const state = onStart('s', item.block), ir = irOf(state);
  assert.deepEqual(strip(ir.scripts[0].body), [item.ir]);
  assert.equal(ir.scripts[0].body[0].sourceBlockId, item.block.id);
  // IR → blocks → IR keeps every ID.
  const back = workspaceFromIR(ir, {capabilities: two, resourceView: view, ownerId: 'hero'});
  assert.deepEqual(irOf(back), ir);
  // Reviewed opcodes, on the object that owns the script.
  const scene = composeScene2DProgram(config, {sprites: {hero: ir}});
  validateProgram(scene, {resourceView: view, objects: true});
  authorizeProgram(two, scene, {resourceView: view, objects: true});
  const {project} = toScratchSceneProject(scene, {scene: config, resourceView: view});
  const hero = project.targets.find(target => target.name === 'hero'), opcodes = Object.values(hero.blocks).map(block => block.opcode);
  for (const opcode of item.opcodes) assert.ok(opcodes.includes(opcode), opcode);
  for (const opcode of opcodes) assert.ok(isScene2DLoweringOpcode(opcode), opcode);
  // Readable text, in the view of its object.
  const options = {resourceView: view, owner: heroOwner};
  assert.deepEqual(generateApi3ProgramSource(ir, 'javascript', options).text.split('\n').slice(1, -1), ['', 'onStart(() => {', '  ' + item.js, '});']);
  const python = generateApi3ProgramSource(ir, 'python', options);
  assert.deepEqual(python.text.split('\n').slice(1, -1), ['', '@on_start', 'def al_iniciar():', '    ' + item.python]);
  // And back from both languages, with the same IDs.
  const parseOptions = {capabilities: two, resourceView: view, owner: heroOwner};
  const parsed = parseJavaScriptCodeView(generateApi3ProgramSource(ir, 'javascript', options).text, parseOptions);
  assert.deepEqual(strip(parsed.ir), strip(ir));
  assert.deepEqual(reconcileCodeViewIdentity(ir, parsed.ir, {resourceView: view, ownerId: 'hero'}).ir, ir);
  const [read] = runPython([python.text], pythonCodeViewVocabulary({capabilities: two, owner: heroOwner}));
  assert.equal(read.error, undefined, JSON.stringify(read.error));
  assert.deepEqual(strip(parseJavaScriptCodeView(read.source, parseOptions).ir), strip(ir));
});

test('MS-060: one stage rule: backdrops are the stage\'s and any sprite\'s, the object blocks are sprites\' only, in every layer', () => {
  const body = kind => ({version: 1, sprites: ['hero', 'cesta'], scripts: [{targetId: 'stage', event: 'start', sourceBlockId: 's', body: [{sourceBlockId: 'n', ...kind}]}]});
  const allowed = [{kind: 'setBackdrop', backdrop: 'fondo-noche'}, {kind: 'nextBackdrop'}], refused = [{kind: 'goToObject', target: 'hero'}, {kind: 'goToRandom'}];
  assert.ok(scene2DStageOffers.statements.has('setBackdrop') && scene2DStageOffers.statements.has('nextBackdrop'));
  for (const node of allowed) {
    validateProgram(body(node), {resourceView: view, objects: true});
    assert.match(generateApi3ProgramSource({version: 0, scripts: [{event: 'start', sourceBlockId: 's', body: [{sourceBlockId: 'n', ...node}]}]}, 'javascript', {resourceView: view, owner: stageOwner}).text, /ackdrop\(/);
  }
  for (const node of refused) {
    assert.throws(() => validateProgram(body(node), {resourceView: view, objects: true}), new RegExp('stage cannot ' + node.kind));
    assert.throws(() => generateApi3ProgramSource({version: 0, scripts: [{event: 'start', sourceBlockId: 's', body: [{sourceBlockId: 'n', ...node}]}]}, 'javascript', {resourceView: view, owner: stageOwner}), /El escenario no puede usar/);
  }
  const stageOptions = {capabilities: two, resourceView: view, owner: stageOwner};
  assert.equal(parseJavaScriptCodeView('onStart(() => {\n  setBackdrop("Noche");\n  nextBackdrop();\n});\n', stageOptions).ir.scripts[0].body.length, 2);
  for (const line of ['stage.goToRandom();', 'goToRandom();', 'stage.goToObject(hero);'])
    assert.throws(() => parseJavaScriptCodeView(`onStart(() => {\n  ${line}\n});\n`, stageOptions), error => error.code === 'CV_STAGE' && error.lineNumber === 2, line);
  // The same answer from the IR rule for every action and event of the language.
  const offered = new Set([...scene2DStageOffers.statements, ...scene2DStageOffers.events]);
  for (const entry of languageTables['gg.sprites@0.3.0'].filter(item => ['call', 'event'].includes(item.kind))) {
    const key = (entry.target === 'sprite' ? 'hero.' : '') + entry.js;
    assert.equal(api3StageForbids(key), !offered.has(entry.lower.ir), key);
    assert.equal(objectsContract.scene2DStageAllows?.(entry.lower.ir), offered.has(entry.lower.ir), key);
  }
  // Translators: the same rule on the text a student runs.
  assert.equal(compileApi3JavaScript('onStart(() => { setBackdrop("Noche"); });', {targetIds: {stage: 'stage'}}).translated, true);
  assert.throws(() => compileApi3JavaScript('onStart(() => { stage.goToRandom(); });', {targetIds: {stage: 'stage'}}), /El escenario no se mueve/);
});

test('MS-061: the object menu shows names and never IDs; a rename keeps it and a deleted object leaves a readable block that saves', () => {
  const three = {...config, sprites: [...config.sprites, {...config.sprites[1], id: 'sprite-1234-abcd', name: 'Nube', costume: 'cesta:c0'}]};
  const capabilities = profile(three);
  const state = onStart('s', {type: 'gg_go_to_object', id: 'b', fields: {TARGET: 'sprite-1234-abcd'}});
  const field = workspace => workspace.getBlockById('b').getField('TARGET');
  let workspace = loadWorkspace(structuredClone(state), {capabilities, resourceView: view, ownerId: 'hero'});
  assert.deepEqual(field(workspace).getOptions(false).map(([label]) => label), ['Cesta', 'Nube'], 'names, without the object itself');
  assert.equal(field(workspace).getText(), 'Nube');
  assert.equal(field(workspace).getValue(), 'sprite-1234-abcd');
  workspace.dispose();
  // Renaming changes the name it shows, not the ID it keeps.
  const renamed = profile({...three, sprites: three.sprites.map(sprite => sprite.name === 'Nube' ? {...sprite, name: 'Niebla'} : sprite)});
  workspace = loadWorkspace(structuredClone(state), {capabilities: renamed, resourceView: view, ownerId: 'hero'});
  assert.equal(field(workspace).getText(), 'Niebla');
  assert.equal(workspaceToIR(workspace, {capabilities: renamed, resourceView: view, ownerId: 'hero'}).scripts[0].body[0].target, 'sprite-1234-abcd');
  workspace.dispose();
  // Deleted: the block loads, reads as unfinished, saves, and only lowering refuses it, on its block.
  workspace = loadWorkspace(structuredClone(state), {capabilities: two, resourceView: view, ownerId: 'hero'});
  assert.equal(field(workspace).getText(), 'elige un objeto');
  assert.deepEqual(field(workspace).getOptions(false).map(([label]) => label), ['Cesta', 'elige un objeto']);
  assert.doesNotThrow(() => saveWorkspace(workspace));
  assert.throws(() => workspaceToIR(workspace, {capabilities: two, resourceView: view, ownerId: 'hero'}), error => /Elige uno en su menú/.test(error.message) && error.sourceBlockId === 'b');
  // Choosing another object mends it, and the placeholder leaves the menu.
  field(workspace).setValue('cesta');
  assert.deepEqual(field(workspace).getOptions(false).map(([label]) => label), ['Cesta']);
  assert.equal(workspaceToIR(workspace, {capabilities: two, resourceView: view, ownerId: 'hero'}).scripts[0].body[0].target, 'cesta');
  workspace.dispose();
  // A new block starts on the first other object, so that it runs as it comes.
  workspace = loadWorkspace(onStart('s', {type: 'gg_go_to_object', id: 'b'}), {capabilities: two, resourceView: view, ownerId: 'hero'});
  assert.equal(field(workspace).getText(), 'Cesta');
  workspace.dispose();
  // With no other object the menu says what to do.
  const alone = profile({...config, sprites: [config.sprites[0]]});
  workspace = loadWorkspace(onStart('s', {type: 'gg_go_to_object', id: 'b'}), {capabilities: alone, resourceView: view, ownerId: 'hero'});
  assert.deepEqual(field(workspace).getOptions(false).map(([label]) => label), ['añade otro objeto']);
  assert.throws(() => workspaceToIR(workspace, {capabilities: alone, resourceView: view, ownerId: 'hero'}), /Elige uno en su menú/);
  workspace.dispose();
  // A pasted block naming its own object is refused the same way.
  workspace = loadWorkspace(onStart('s', {type: 'gg_go_to_object', id: 'b', fields: {TARGET: 'hero'}}), {capabilities: two, resourceView: view, ownerId: 'hero'});
  assert.equal(field(workspace).getText(), 'elige un objeto');
  workspace.dispose();
});

test('MS-062: the backdrop menu lists the stage\'s backdrops by readable names, whichever object asks', () => {
  const labels = objectsContract.scene2DBackdrops?.(view);
  assert.deepEqual(labels, [{id: 'stage', label: 'Fondo inicial'}, {id: 'fondo-noche', label: 'Noche'}]);
  for (const ownerId of ['hero', 'cesta', 'stage']) {
    const workspace = loadWorkspace(onStart('s', {type: 'gg_set_backdrop', id: 'b', fields: {BACKDROP: 'fondo-noche'}}), {capabilities: two, resourceView: view, ownerId});
    const field = workspace.getBlockById('b').getField('BACKDROP');
    assert.deepEqual(field.getOptions(false), [['Fondo inicial', 'stage'], ['Noche', 'fondo-noche']], ownerId);
    assert.equal(field.getText(), 'Noche');
    assert.equal(workspaceToIR(workspace, {capabilities: two, resourceView: view, ownerId}).scripts[0].body[0].backdrop, 'fondo-noche');
    workspace.dispose();
  }
  // Two backdrops with one name stay two choices, in the menu and in text.
  const twins = {...structuredClone(view), costumes: [...view.costumes, {...view.costumes.find(item => item.id === 'fondo-noche'), id: 'GGasset:1234', name: 'noche'}]};
  assert.deepEqual(objectsContract.scene2DBackdrops?.(twins).map(item => item.label), ['Fondo inicial', 'Noche', 'noche 2']);
  assert.deepEqual(objectsContract.scene2DBackdrops?.(null), [{id: 'stage', label: 'Fondo inicial'}]);
});

const blank = name => ({assetId: 'cd21514d0531fdffb22204e0ec5ed84a', name, md5ext: 'cd21514d0531fdffb22204e0ec5ed84a.svg', dataFormat: 'svg', rotationCenterX: 0, rotationCenterY: 0});
const ownerAssets = owner => ({costumes: owner === 'stage' ? [blank('stage'), blank('fondo-noche')] : [blank(owner === 'cesta' ? 'cesta:c0' : 'hero')], sounds: []});
function nativeDialogo() {
  const n = value => [1, [4, String(value)]], text = value => [1, [10, value]];
  const base = {lists: {}, comments: {}, sounds: [], volume: 100, variables: {}};
  const sprite = (name, layerOrder, costume, state, blocks) => ({...structuredClone(base), isStage: false, name, broadcasts: {}, blocks, costumes: [blank(costume)], currentCostume: 0, layerOrder, draggable: false, rotationStyle: 'all around', size: 100, visible: true, ...state});
  const step = (next, parent, extra) => ({next, parent, inputs: {}, fields: {}, shadow: false, topLevel: false, ...extra});
  return {targets: [{...structuredClone(base), isStage: true, name: 'Stage', broadcasts: {'msg-responde': 'responde'}, blocks: {}, costumes: [blank('stage'), blank('fondo-noche')], currentCostume: 0, layerOrder: 0, tempo: 60, videoTransparency: 50, videoState: 'off', textToSpeechLanguage: null},
    sprite('hero', 1, 'hero', {x: -120, y: 0, direction: 90}, {
      start: {opcode: 'event_whenflagclicked', next: 'hola', parent: null, inputs: {}, fields: {}, shadow: false, topLevel: true, x: 0, y: 0},
      hola: step('envia', 'start', {opcode: 'looks_sayforsecs', inputs: {MESSAGE: text('¡Hola, Cesta!'), SECS: n(0.2)}}),
      envia: step('fondo', 'hola', {opcode: 'event_broadcastandwait', inputs: {BROADCAST_INPUT: [1, [11, 'responde', 'msg-responde']]}}),
      fondo: step('noche', 'envia', {opcode: 'looks_switchbackdropto', inputs: {BACKDROP: [1, 'fondo-menu']}}),
      'fondo-menu': step(null, 'fondo', {opcode: 'looks_backdrops', fields: {BACKDROP: ['fondo-noche', null]}, shadow: true}),
      noche: step(null, 'fondo', {opcode: 'looks_say', inputs: {MESSAGE: text('¡Ya es de noche!')}})}),
    sprite('cesta', 2, 'cesta:c0', {x: 120, y: -60, direction: -90}, {
      oye: {opcode: 'event_whenbroadcastreceived', next: 'hola', parent: null, inputs: {}, fields: {BROADCAST_OPTION: ['responde', 'msg-responde']}, shadow: false, topLevel: true, x: 0, y: 0},
      hola: step('va', 'oye', {opcode: 'looks_sayforsecs', inputs: {MESSAGE: text('¡Hola, hero!'), SECS: n(0.2)}}),
      va: step('llega', 'hola', {opcode: 'motion_goto', inputs: {TO: [1, 'va-menu']}}),
      'va-menu': step(null, 'va', {opcode: 'motion_goto_menu', fields: {TO: ['hero', null]}, shadow: true}),
      llega: step(null, 'va', {opcode: 'looks_say', inputs: {MESSAGE: text('Aquí estoy')}})})],
    monitors: [], extensions: [], meta: {semver: '3.0.0', vm: '12.3.1', agent: 'reference'}};
}
async function finalState(project, {random = null} = {}) {
  const vm = await createScratchSession(project), original = Math.random;
  try {
    if (random !== null) Math.random = () => random;
    const sprite = name => { const item = vm.runtime.getSpriteTargetByName(name), bubble = item.getCustomState('Scratch.looks'); return {x: item.x, y: item.y, bubble: bubble?.text ?? null}; };
    vm.greenFlag();
    for (let waited = 0; vm.runtime.threads.length && waited < 5000; waited += 20) await delay(20);
    return {hero: sprite('hero'), cesta: sprite('cesta'), backdrop: vm.runtime.getTargetForStage().getCostumes()[vm.runtime.getTargetForStage().currentCostume].name, threads: vm.runtime.threads.length};
  } finally { Math.random = original; vm.quit(); }
}
const dialogo = () => composeScene2DProgram(config, {sprites: {hero: irOf(fixture.scene2d.sprites.hero), cesta: irOf(fixture.scene2d.sprites.cesta, {ownerId: 'cesta'})}});

test('MS-063: «Diálogo» from its fixture does what a hand-written Scratch project does, in the same VM', async () => {
  const scene = dialogo();
  validateProgram(scene, {resourceView: view, objects: true});
  authorizeProgram(two, scene, {resourceView: view, objects: true});
  const adapted = await finalState(toScratchSceneProject(scene, {scene: config, resourceView: view, ownerAssets}).project);
  assert.deepEqual(adapted, await finalState(nativeDialogo()));
  assert.deepEqual(adapted, {hero: {x: -120, y: 0, bubble: '¡Ya es de noche!'}, cesta: {x: -120, y: 0, bubble: 'Aquí estoy'}, backdrop: 'fondo-noche', threads: 0});
});

test('MS-064: «ir a una posición aleatoria» stays on stage, and «siguiente fondo» goes round the backdrops, from blocks', async () => {
  const hero = irOf(onStart('s', {type: 'gg_next_backdrop', id: 'one'}, {type: 'gg_go_to_random', id: 'two'}));
  const {project} = toScratchSceneProject(composeScene2DProgram(config, {sprites: {hero}}), {scene: config, resourceView: view, ownerAssets});
  const state = await finalState(project, {random: 0.9});
  assert.deepEqual([state.hero.x, state.hero.y, state.backdrop], [192, 144, 'fondo-noche']);
  const {project: twice} = toScratchSceneProject(composeScene2DProgram(config, {sprites: {hero: irOf(onStart('s', {type: 'gg_next_backdrop', id: 'one'}, {type: 'gg_next_backdrop', id: 'two'}))}}), {scene: config, resourceView: view, ownerAssets});
  assert.equal((await finalState(twice)).backdrop, 'stage');
});

test('MS-065: text names objects by identifier and backdrops by name, and refuses what has no block, with a reason', () => {
  const ir = irOf(onStart('s', {type: 'gg_go_to_object', id: 'a', fields: {TARGET: 'hero'}}, {type: 'gg_set_backdrop', id: 'b', fields: {BACKDROP: 'fondo-noche'}}), {ownerId: 'cesta'});
  const text = generateApi3ProgramSource(ir, 'javascript', {resourceView: view, owner: cestaOwner}).text;
  assert.match(text, /cesta\.goToObject\(hero\);/);
  assert.match(text, /setBackdrop\("Noche"\);/);
  assert.doesNotMatch(text, /fondo-noche/);
  // A rename changes the identifier, never the block.
  const renamed = {...config, sprites: config.sprites.map(sprite => sprite.id === 'hero' ? {...sprite, name: 'Ana María'} : sprite)};
  assert.match(generateApi3ProgramSource(ir, 'javascript', {resourceView: view, owner: scene2DTextOwner(renamed, 'cesta')}).text, /cesta\.goToObject\(ana_maria\);/);
  // The project copy, which names every object.
  const copy = generateApi3SceneSource(dialogo(), 'javascript', {config, resourceView: view});
  assert.match(copy.text, /cesta\.goToObject\(hero\);/);
  assert.match(copy.text, /setBackdrop\("Noche"\);/);
  // The listing of the program reads names too.
  assert.match(generateCode(ir, {resourceView: view, resourceOwnerId: 'cesta', objectNames: {hero: 'hero'}}).text, /ir a "hero"[\s\S]*cambiar fondo a "Noche"/);
  const parse = (line, owner = heroOwner) => parseJavaScriptCodeView(`onStart(() => {\n  ${line}\n});\n`, {capabilities: two, resourceView: view, owner});
  assert.equal(parse('hero.goToObject(cesta);').ir.scripts[0].body[0].target, 'cesta');
  for (const [line, reason] of [['hero.goToObject("cesta");', /sin comillas/], ['hero.goToObject(hero);', /a sí mismo/], ['hero.goToObject(fantasma);', /no hay ningún objeto/i], ['hero.goToObject(stage);', /no hay ningún objeto/i],
    ['setBackdrop("Playa");', /Fondo inicial, Noche/], ['setBackdrop("fondo-noche");', /Fondo inicial, Noche/], ['setBackdrop(3);', /texto entre comillas/]])
    assert.throws(() => parse(line), error => reason.test(error.message) && error.lineNumber === 2, line);
  // The translator of a text document, before it reaches the scene.
  const compiled = compileApi3JavaScript('onStart(() => {\n  hero.goToObject(cesta);\n  setBackdrop("Noche");\n  hero.goToRandom();\n  nextBackdrop();\n});\n').source;
  for (const expected of ['await ctx.goToObject({"identifier":"cesta"})', 'await ctx.setBackdrop({"label":"Noche"})', 'await ctx.goToRandom()', 'await ctx.nextBackdrop()']) assert.ok(compiled.includes(expected), expected);
  assert.throws(() => compileApi3JavaScript('onStart(() => {\n  hero.goToObject(3);\n});\n'), error => /nombre de un objeto/.test(error.message) && error.lineNumber === 2);
  assert.throws(() => compileApi3JavaScript('let x = 0;\nonStart(() => {\n  hero.goToObject(x);\n});\n'), error => /nombre de un objeto/.test(error.message) && error.lineNumber === 3);
  for (const [name, arity] of Object.entries({goToObject: 1, goToRandom: 0, setBackdrop: 1, nextBackdrop: 0})) assert.equal(contextOperations[name], arity, name);
  assert.throws(() => validateTextProgramRPC('program.goToObject', ['i', '__proto__']), /unsupported object/);
  assert.throws(() => validateTextProgramRPC('program.setBackdrop', ['i', 'a\nb']), /unsupported backdrop/);
  assert.doesNotThrow(() => validateTextProgramRPC('program.setBackdrop', ['i', 'Fondo inicial']));
});

test('MS-066: in text mode the scene resolves identifiers and backdrop names, and explains the ones it does not know', async t => {
  const scene = {version: 1, sprites: ['hero', 'cesta'], scripts: []};
  const fixture2 = toScratchSceneProject(scene, {scene: config, resourceView: view, ownerAssets});
  const vm = await createScratchSession(fixture2.project);
  const invocations = [];
  const adapter = createTextProgram({getVM: () => vm, getRevision: () => 1, onInvocation: event => invocations.push(event),
    getScene: () => ({objects: [{id: 'hero', name: 'Ana María'}, {id: 'cesta', name: 'Cesta'}], backdrops: objectsContract.scene2DBackdrops?.(view) ?? []})});
  t.after(() => { adapter.dispose(); vm.quit(); });
  const call = (method, args) => adapter.call('program.' + method, args, 1);
  call('start', [{variables: [], handlers: [{id: 'c', event: 'start', targetId: 'cesta'}, {id: 's', event: 'start', targetId: 'stage'}]}]);
  for (let i = 0; i < 100 && invocations.length < 2; i++) await delay(5);
  const [fromCesta, fromStage] = [invocations.find(item => item.handlerId === 'c').invocationId, invocations.find(item => item.handlerId === 's').invocationId];
  const cesta = vm.runtime.getSpriteTargetByName('cesta'), stage = vm.runtime.getTargetForStage();
  // By the identifier text writes, and by the ID API1 writes.
  call('goToObject', [fromCesta, {identifier: 'ana_maria'}]);
  assert.deepEqual([cesta.x, cesta.y], [-120, 0]);
  cesta.setXY(5, 5);
  call('goToObject', [fromCesta, 'hero']);
  assert.deepEqual([cesta.x, cesta.y], [-120, 0]);
  assert.throws(() => call('goToObject', [fromCesta, 'fantasma']), /«fantasma»/);
  call('setBackdrop', [fromCesta, {label: 'Noche'}]);
  assert.equal(stage.getCostumes()[stage.currentCostume].name, 'fondo-noche');
  call('setBackdrop', [fromStage, {label: 'Fondo inicial'}]);
  assert.equal(stage.currentCostume, 0);
  call('nextBackdrop', [fromStage]);
  assert.equal(stage.currentCostume, 1);
  assert.throws(() => call('setBackdrop', [fromCesta, 'Playa']), /«Playa»/);
  assert.throws(() => call('goToRandom', [fromStage]), /stage cannot goToRandom/);
  call('goToRandom', [fromCesta]);
  assert.ok(Math.abs(cesta.x) <= 240 && Math.abs(cesta.y) <= 180);
});

const library = validateStarterLibrary(JSON.parse(buildStarterLibrary().bytes.toString('utf8')));
const preparedOf = async entry => { const bytes = await decodeStarterLibraryEntry(entry); return prepareAsset(bytes, starterLibraryMedia(entry)); };

test('MS-067: with objects a backdrop joins the stage\'s list and becomes the one it starts with; others and blocks stay', async () => {
  const entry = library.entries.find(item => item.kind === 'backdrop'), prepared = await preparedOf(entry);
  const applied = await applyStarterLibraryEntry(resources, entry, prepared, {keepBackdrops: true});
  const stageItems = applied.resources.costumes.filter(item => item.ownerId === 'stage');
  assert.deepEqual(stageItems.map(item => item.id), ['stage', 'fondo-noche', applied.descriptorId]);
  assert.equal(stageItems.at(-1).name, entry.name);
  const edited = edits.chooseSceneBackdrop?.({config, scene2d: fixture.scene2d, codeViews: null}, {resources: applied.resources, backdrop: applied.descriptorId});
  assert.equal(edited?.config.stage.backdrop, applied.descriptorId);
  assert.equal(edited.resources, applied.resources);
  assert.deepEqual(edited.config.sprites, config.sprites);
  // Choosing it again changes nothing in the list.
  assert.equal((await applyStarterLibraryEntry(applied.resources, entry, prepared, {keepBackdrops: true})).status, 'present');
  // Single-workspace profiles keep their one backdrop.
  assert.equal((await applyStarterLibraryEntry(resources, entry, prepared)).resources.costumes.filter(item => item.ownerId === 'stage').length, 2);
  // Back to the catalog's backdrop: it is in the list, so it is only chosen again.
  assert.equal((await restoreInitialBackdrop(applied.resources, base, {keepBackdrops: true})).status, 'present');
  assert.equal((await restoreInitialBackdrop(applied.resources, base, {keepBackdrops: true})).descriptorId, 'stage');
  // A project that lost it gets it back without losing the rest.
  const replaced = (await applyStarterLibraryEntry(base, entry, prepared)).resources;
  const restored = await restoreInitialBackdrop(replaced, base, {keepBackdrops: true});
  assert.equal(restored.resources.costumes.filter(item => item.ownerId === 'stage').length, 2);
  assert.equal(objectsContract.scene2DBackdrops?.(createResourceView(restored.resources)).find(item => item.id === restored.descriptorId).label, 'Fondo inicial');
});

test('MS-068: the guide above the blocks says what is true of the object on screen', () => {
  const guide = presentation.creationGuide;
  assert.equal(typeof guide, 'function');
  assert.match(guide({owner: 'stage', name: 'Escenario', blocks: []}), /fondo/);
  assert.doesNotMatch(guide({owner: 'stage', name: 'Escenario', blocks: []}), /Mover/);
  assert.match(guide({owner: 'cesta', name: 'Cesta', blocks: []}), /Cesta/);
  assert.doesNotMatch(guide({owner: 'cesta', name: 'Cesta', blocks: []}), /Mover/);
  assert.match(guide({owner: 'hero', name: 'hero', blocks: ['gg_when_start', 'gg_move']}), /Mover/);
  assert.doesNotMatch(guide({owner: 'hero', name: 'hero', blocks: ['gg_when_start', 'gg_say']}), /Mover/);
  assert.match(guide({owner: null, name: null, blocks: ['gg_move']}), /Mover/);
  assert.doesNotMatch(guide({owner: 'stage', name: 'Escenario', blocks: ['gg_when_start', 'gg_wait']}), /Mover/);
});

test('MS-069: «Diálogo» validates as a project: its blocks, menus and resources are the ones the profile offers', () => {
  const capabilities = validateCapabilities(two);
  for (const [ownerId, state] of [['hero', fixture.scene2d.sprites.hero], ['cesta', fixture.scene2d.sprites.cesta]]) {
    validateWorkspaceBlocks(state, {capabilities});
    assert.ok(irOf(state, {ownerId}).scripts.length);
  }
  const kinds = JSON.stringify(dialogo());
  for (const kind of ['sayFor', 'say', 'broadcastWait', 'setBackdrop', 'goToObject']) assert.ok(kinds.includes(`"kind":"${kind}"`), kind);
});


// A valid project ID must not turn into Scratch's mouse/random destination.
for (const id of ['_mouse_', '_random_']) {
  test('MS-070: blocks go to the sprite whose stable ID is ' + id, async t => {
    const scene = {stage: {backdrop: 'stage'}, sprites: [
      {...config.sprites[0], x: 0, y: 0},
      {...config.sprites[1], id, name: 'Destino', x: 73, y: 81, direction: 90}
    ]};
    const program = {version: 1, sprites: ['hero', id], scripts: [
      {targetId: 'hero', event: 'start', sourceBlockId: 'start', body: [{kind: 'goToObject', target: id, sourceBlockId: 'go'}]}
    ]};
    const before = structuredClone(scene);
    const fixture = toScratchSceneProject(program, {scene});
    assert.deepEqual(scene, before, 'lowering keeps the stored object IDs and state');
    const vm = await createScratchSession(fixture.project);
    t.after(() => vm.quit());
    vm.greenFlag();
    for (let i = 0; i < 100 && vm.runtime.threads.length; i++) await delay(5);
    const sender = vm.runtime.getSpriteTargetByName('hero');
    assert.deepEqual([sender.x, sender.y], [73, 81]);
  });
  test('MS-071: text can target and program the sprite whose stable ID is ' + id, async t => {
    const scene = {stage: {backdrop: 'stage'}, sprites: [
      {...config.sprites[0], x: 0, y: 0},
      {...config.sprites[1], id, name: 'Destino', x: 73, y: 81, direction: 90}
    ]};
    const fixture = toScratchSceneProject({version: 1, sprites: ['hero', id], scripts: []}, {scene});
    const vm = await createScratchSession(fixture.project), invocations = [];
    const adapter = createTextProgram({getVM: () => vm, getRevision: () => 1, getScene: () => fixture,
      onInvocation: event => invocations.push(event)});
    t.after(() => {adapter.dispose(); vm.quit();});
    const call = (method, args) => adapter.call('program.' + method, args, 1);
    call('start', [{variables: [], handlers: [{id: 'sender', event: 'start'}, {id: 'destination', event: 'start', targetId: id}]}]);
    for (let i = 0; i < 100 && invocations.length < 2; i++) await delay(5);
    assert.equal(invocations.length, 2, 'the reserved-ID sprite receives its own callback');
    call('goToObject', [invocations.find(item => item.handlerId === 'sender').invocationId, id]);
    const sender = vm.runtime.getSpriteTargetByName('hero');
    assert.deepEqual([sender.x, sender.y], [73, 81]);
    call('move', [invocations.find(item => item.handlerId === 'destination').invocationId, 2]);
    const state = createGGBindings(() => vm, () => fixture.objects)('scene.get', []);
    assert.deepEqual(state.sprites.map(item => [item.id, item.name, item.x, item.y]),
      [['hero', config.sprites[0].name, 73, 81], [id, 'Destino', 75, 81]]);
  });
}

test('MS-073: synchronized help teaches a usable backdrop action only in the locked vocabulary and active language', () => {
  const original = globalThis.document;
  try {
    const nodes = new Map();
    globalThis.document = {
      querySelector(selector) {
        if (!nodes.has(selector)) nodes.set(selector, {textContent: '', addEventListener() {},
          append(child) { child.parentElement = this; }, removeAttribute() {}, setAttribute() {}});
        return nodes.get(selector);
      },
      querySelectorAll() { return []; }
    };
    for (const version of ['0.1.0', '0.2.0', '0.3.0']) for (const language of ['javascript', 'python']) {
      for (const resourceView of [createResourceView(base), {...structuredClone(view), costumes: view.costumes.filter(item => item.id === 'fondo-noche') }]) {
        const capabilities = createCapabilities(['gg.sprites'], {versions: {'gg.sprites': version}});
        const state = createCodeViewsState();
        state.set({...state.get('2d'), language});
        const ui = createCodeViewsUI({state, editor: {subscribe() {}, captureCapabilities: () => capabilities, resourceView: () => resourceView, codeViewSnapshot() { throw new Error("unfinished condition must not be lowered by help"); }},
          textDocuments: {}, contexts: {current: () => '2d', subscribe() {}}, config: {languageOrigin: 'http://localhost:5703'},
          getProject: () => null});
        const help = ui.presentation('2d').help;
        const snippet = help.match(/set(?:Backdrop|_backdrop)\("[^"]*"\)/)?.[0];
        if (version !== '0.3.0') {
          assert.equal(snippet, undefined, language + ' ' + version + ' has no backdrop block');
          continue;
        }
        const backdrop = resourceView.costumes.find(item => item.ownerId === 'stage');
        const label = backdrop.name === 'stage' ? 'Fondo inicial' : 'Noche';
        assert.equal(snippet, (language === 'python' ? 'set_backdrop' : 'setBackdrop') + '(' + JSON.stringify(label) + ')');
        const options = {capabilities, resourceView};
        const source = language === 'javascript' ? 'onStart(() => { ' + snippet + '; });' : '@on_start\ndef go():\n    ' + snippet;
        const translated = language === 'javascript' ? source : runPython([source], pythonCodeViewVocabulary({capabilities}))[0].source;
        assert.deepEqual(strip(parseJavaScriptCodeView(translated, options).ir.scripts[0].body),
          [{kind: 'setBackdrop', backdrop: backdrop.id}], 'following the help yields a valid installed block');
      }
    }
  } finally { globalThis.document = original; }
});
