import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {createCapabilities} from '../../src/contracts/packs.mjs';
import {createProject} from '../../src/project-format.mjs';
import {createProjectAuthoring} from '../../src/project-authoring.mjs';
import {validateProgram, programObjectsFromIR0, composeScene2DProgram} from '../../src/contracts/program-contract.mjs';
import {authorizeProgram} from '../../src/contracts/pack-broker.mjs';
import {createResourceView, promoteLegacyResources, copyResourceOwner} from '../../src/contracts/resources.mjs';
import {loadWorkspace, workspaceToIR} from '../../src/editor/block-program.mjs';
import {toScratchProject, toScratchSceneProject, ownerResources} from '../../src/adapters/scratch/scratch-project.mjs';
import {createGGBindings} from '../../src/adapters/scratch/gg-bindings.mjs';
import {validateSceneSnapshot} from '../../src/scene-inspection.mjs';
import {generateCode} from '../../src/generated-code.mjs';
import {createScratchSession} from '../../spikes/scratch-adapter.mjs';
import {buildProjectCatalog} from '../../tools/f1/build-project-catalog.mjs';
import {createTone} from '../../tools/f0/tone.mjs';
import {editableExample, corpus} from '../fixtures/corpus.blocks.mjs';

// scene2d-multi-sprite tarea 2.1 (E2, 29/10/2026): the Scratch adapter creates
// one VM target per sprite of gg.sprites@0.3.0 with its own costumes and sounds
// (ownerId) and the stage with its backdrops. Messages and global variables
// are shared on the stage (Scratch semantics); Stop stops every object. A
// 0.3.0 project runs as IR 2D v1; 0.1.0/0.2.0 keep IR0 and the old adapter.
// The build catalog as the runner ships it: the stage backdrop, hero's two costumes and the tone.
const assets = {}, costumes = [[], []];
for (const [index, name] of ['stage', 'hero', 'hero-alt'].entries()) {
  const content = await readFile(new URL(`../../src/assets/${name}.svg`, import.meta.url), 'utf8');
  const id = createHash('md5').update(content).digest('hex');
  assets[id] = content;
  costumes[index ? 1 : 0].push({assetId: id, name, dataFormat: 'svg', md5ext: id + '.svg', rotationCenterX: index ? 24 : 240, rotationCenterY: index ? 24 : 180});
}
const tone = createTone().buffer, toneId = createHash('md5').update(tone).digest('hex');
assets[toneId] = {type: 'Sound', format: 'wav', encoding: 'base64', data: tone.toString('base64')};
const catalog = await buildProjectCatalog({assets, costumes, sounds: [{assetId: toneId, name: 'tone', dataFormat: 'wav', md5ext: toneId + '.wav', format: '', rate: 22050, sampleCount: 26460}]});
const heroPresents = JSON.parse(await readFile(new URL('../fixtures/canonical/scene2d/hero-presents/project.json', import.meta.url), 'utf8'));
// Portable (v1) resources with stage, hero and a copy of hero's costumes and sound for cesta.
const promoted = await promoteLegacyResources(catalog);
const {resources} = await copyResourceOwner(promoted, 'hero', 'cesta', {idPrefix: 'cesta', firstCostumeId: 'cesta'});
const view = createResourceView(resources);
const legacyView = createResourceView(catalog.resources, {catalog});

const hero = {id: 'hero', name: 'hero', x: 0, y: 0, direction: 90, size: 100, visible: true, costume: 'hero'};
const cesta = {id: 'cesta', name: 'Cesta', x: 120, y: -40, direction: -90, size: 60, visible: false, costume: 'cesta:c1'};
const scene = (list = [hero, cesta], backdrop = 'stage') => ({stage: {backdrop}, sprites: list});
const sprites = (version, list) => {
  const capabilities = createCapabilities(['gg.sprites'], {versions: {'gg.sprites': version}});
  if (list) capabilities.config['gg.sprites'] = scene(list);
  return capabilities;
};
function irOf(blockly, capabilities, resourceView) {
  const workspace = loadWorkspace(structuredClone(blockly), {capabilities, resourceView});
  try { return workspaceToIR(workspace, {capabilities, resourceView}); } finally { workspace.dispose(); }
}
const target = (project, name) => project.targets.find(item => item.name === name);

// --- Corpus: IR v1 programs and their hand-written native Scratch references ---
const n = value => [1, [4, String(value)]];
const text = value => [1, [10, value]];
const global = {id: 'turnos', name: 'turnos', initialValue: 0, scope: 'global'};
const node = (kind, id, extra = {}) => ({kind, sourceBlockId: id, ...extra});
const script = (targetId, id, body, extra = {}) => ({targetId, event: 'start', sourceBlockId: id, body, ...extra});
const onMessage = (targetId, id, message, body) => script(targetId, id, body, {event: 'message', message});
const change = (id, variable, value) => node('changeVariable', id, {variableId: variable.id, name: variable.name, value});
const set = (id, variable, value) => node('setVariable', id, {variableId: variable.id, name: variable.name, value});
const heroSteps = {id: 'hero-pasos', name: 'pasos', initialValue: 0, targetId: 'hero'};
const cestaSteps = {id: 'cesta-pasos', name: 'pasos', initialValue: 0, targetId: 'cesta'};
const programs = {
  // «Diálogo»: hero greets and waits for the message; cesta and the stage answer; one global variable.
  dialogo: {version: 1, sprites: ['hero', 'cesta'], variables: [global], scripts: [
    script('hero', 'h-start', [node('say', 'h-say', {message: 'Hola, Cesta'}), node('broadcastWait', 'h-send', {message: 'saluda'}), change('h-turn', global, 1), node('say', 'h-done', {message: 'Listo'})]),
    onMessage('cesta', 'c-hear', 'saluda', [node('show', 'c-show'), node('move', 'c-move', {steps: 50}), change('c-turn', global, 10), node('say', 'c-say', {message: '¡Hola, hero!'})]),
    onMessage('stage', 's-hear', 'saluda', [change('s-turn', global, 100)])
  ]},
  // Locals with the same name on two sprites never mix; the message reaches only its receivers.
  locales: {version: 1, sprites: ['hero', 'cesta'], variables: [cestaSteps, heroSteps], scripts: [
    script('hero', 'hl-start', [set('hl-set', heroSteps, 3), node('repeat', 'hl-repeat', {count: 2, body: [change('hl-add', heroSteps, 1)]}), node('broadcastWait', 'hl-send', {message: 'contar'})]),
    onMessage('cesta', 'cl-hear', 'contar', [set('cl-set', cestaSteps, 7), node('turnRight', 'cl-turn', {degrees: 45})])
  ]},
  // Stop: both sprites loop forever; «detener todo» in the stage stops every object.
  detener: {version: 1, sprites: ['hero', 'cesta'], scripts: [
    script('hero', 'hd-start', [node('forever', 'hd-loop', {body: [node('changeX', 'hd-step', {dx: 1})]})]),
    script('cesta', 'cd-start', [node('forever', 'cd-loop', {body: [node('turnRight', 'cd-turn', {degrees: 5})]})]),
    script('stage', 'sd-start', [node('wait', 'sd-wait', {seconds: 0.2}), node('stopAll', 'sd-stop')])
  ]},
  // External Stop: the same loops without the stage script; the shell's Detener (vm.stopAll) stops both.
  bucles: {version: 1, sprites: ['hero', 'cesta'], scripts: [
    script('hero', 'hb-start', [node('forever', 'hb-loop', {body: [node('changeX', 'hb-step', {dx: 1})]})]),
    script('cesta', 'cb-start', [node('forever', 'cb-loop', {body: [node('turnRight', 'cb-turn', {degrees: 5})]})])
  ]}
};
// Native Scratch 3 project JSON written by hand (not by the adapter): the
// reference semantics for the same programs.
function chain(blocks, hat, statements) {
  const ids = Object.keys(statements);
  blocks[hat.id] = {opcode: hat.opcode, next: ids[0] ?? null, parent: null, inputs: {}, fields: hat.fields ?? {}, shadow: false, topLevel: true, x: 0, y: 0};
  ids.forEach((id, index) => { blocks[id] = {next: ids[index + 1] ?? null, parent: index ? ids[index - 1] : hat.id, inputs: {}, fields: {}, shadow: false, topLevel: false, ...statements[id]}; });
}
const flag = id => ({id, opcode: 'event_whenflagclicked'});
const hear = (id, message) => ({id, opcode: 'event_whenbroadcastreceived', fields: {BROADCAST_OPTION: [message, 'msg-' + message]}});
const variableField = (id, name) => ({VARIABLE: [name, id]});
function nativeProject(build) {
  const blank = {assetId: 'cd21514d0531fdffb22204e0ec5ed84a', name: 'blank', md5ext: 'cd21514d0531fdffb22204e0ec5ed84a.svg', dataFormat: 'svg', rotationCenterX: 0, rotationCenterY: 0};
  const base = {lists: {}, comments: {}, costumes: [blank], sounds: [], volume: 100};
  const stage = {...structuredClone(base), isStage: true, name: 'Stage', variables: {}, broadcasts: {}, blocks: {}, currentCostume: 0, layerOrder: 0, tempo: 60, videoTransparency: 50, videoState: 'off', textToSpeechLanguage: null};
  const sprite = (name, layerOrder, state) => ({...structuredClone(base), isStage: false, name, variables: {}, broadcasts: {}, blocks: {}, currentCostume: 0, layerOrder, draggable: false, rotationStyle: 'all around', ...state});
  const targets = {stage, hero: sprite('hero', 1, {x: 0, y: 0, size: 100, direction: 90, visible: true}), cesta: sprite('cesta', 2, {x: 120, y: -40, size: 60, direction: -90, visible: false})};
  build(targets);
  return {targets: [targets.stage, targets.hero, targets.cesta], monitors: [], extensions: [], meta: {semver: '3.0.0', vm: '12.3.1', agent: 'reference'}};
}
const references = {
  dialogo: nativeProject(({stage, hero, cesta}) => {
    stage.variables.turnos = ['turnos', 0]; stage.broadcasts['msg-saluda'] = 'saluda';
    chain(hero.blocks, flag('h-start'), {'h-say': {opcode: 'looks_say', inputs: {MESSAGE: text('Hola, Cesta')}},
      'h-send': {opcode: 'event_broadcastandwait', inputs: {BROADCAST_INPUT: [1, [11, 'saluda', 'msg-saluda']]}},
      'h-turn': {opcode: 'data_changevariableby', inputs: {VALUE: n(1)}, fields: variableField('turnos', 'turnos')},
      'h-done': {opcode: 'looks_say', inputs: {MESSAGE: text('Listo')}}});
    chain(cesta.blocks, hear('c-hear', 'saluda'), {'c-show': {opcode: 'looks_show'}, 'c-move': {opcode: 'motion_movesteps', inputs: {STEPS: n(50)}},
      'c-turn': {opcode: 'data_changevariableby', inputs: {VALUE: n(10)}, fields: variableField('turnos', 'turnos')},
      'c-say': {opcode: 'looks_say', inputs: {MESSAGE: text('¡Hola, hero!')}}});
    chain(stage.blocks, hear('s-hear', 'saluda'), {'s-turn': {opcode: 'data_changevariableby', inputs: {VALUE: n(100)}, fields: variableField('turnos', 'turnos')}});
  }),
  locales: nativeProject(({stage, hero, cesta}) => {
    hero.variables['hero-pasos'] = ['pasos', 0]; cesta.variables['cesta-pasos'] = ['pasos', 0]; stage.broadcasts['msg-contar'] = 'contar';
    chain(hero.blocks, flag('hl-start'), {'hl-set': {opcode: 'data_setvariableto', inputs: {VALUE: n(3)}, fields: variableField('hero-pasos', 'pasos')},
      'hl-repeat': {opcode: 'control_repeat', inputs: {TIMES: n(2), SUBSTACK: [2, 'hl-add']}},
      'hl-send': {opcode: 'event_broadcastandwait', inputs: {BROADCAST_INPUT: [1, [11, 'contar', 'msg-contar']]}}});
    hero.blocks['hl-add'] = {opcode: 'data_changevariableby', next: null, parent: 'hl-repeat', inputs: {VALUE: n(1)}, fields: variableField('hero-pasos', 'pasos'), shadow: false, topLevel: false};
    chain(cesta.blocks, hear('cl-hear', 'contar'), {'cl-set': {opcode: 'data_setvariableto', inputs: {VALUE: n(7)}, fields: variableField('cesta-pasos', 'pasos')},
      'cl-turn': {opcode: 'motion_turnright', inputs: {DEGREES: n(45)}}});
  }),
  detener: nativeProject(({stage, hero, cesta}) => {
    const loop = (blocks, prefix, body) => {
      chain(blocks, flag(prefix + '-start'), {[prefix + '-loop']: {opcode: 'control_forever', inputs: {SUBSTACK: [2, prefix + '-body']}}});
      blocks[prefix + '-body'] = {next: null, parent: prefix + '-loop', inputs: {}, fields: {}, shadow: false, topLevel: false, ...body};
    };
    loop(hero.blocks, 'h', {opcode: 'motion_changexby', inputs: {DX: n(1)}});
    loop(cesta.blocks, 'c', {opcode: 'motion_turnright', inputs: {DEGREES: n(5)}});
    chain(stage.blocks, flag('s-start'), {'s-wait': {opcode: 'control_wait', inputs: {DURATION: n(0.2)}},
      's-stop': {opcode: 'control_stop', fields: {STOP_OPTION: ['all', null]}, mutation: {tagName: 'mutation', children: [], hasnext: 'false'}}});
  })
};
references.bucles = structuredClone(references.detener);
references.bucles.targets[0].blocks = {};

// Scalar variables only (the stage also holds the broadcast messages).
const numeric = owner => Object.values(owner.variables).filter(variable => variable.type === '').map(variable => [variable.name, Number(variable.value)]);
async function observe(project, {until, stop = false} = {}) {
  const vm = await createScratchSession(project);
  try {
    const state = () => {
      const sprite = name => {
        const item = vm.runtime.getSpriteTargetByName(name), bubble = item.getCustomState('Scratch.looks');
        return {x: item.x, y: item.y, direction: item.direction, visible: item.visible, costume: item.currentCostume,
          bubble: bubble?.text ? bubble.text : null, locals: numeric(item)};
      };
      return {hero: sprite('hero'), cesta: sprite('cesta'), globals: numeric(vm.runtime.getTargetForStage())};
    };
    const initial = {...state(), threads: vm.runtime.threads.length};
    vm.greenFlag();
    for (let waited = 0; !until(state(), vm) && waited < 10000; waited += 20) await delay(20);
    if (stop) vm.stopAll();
    await delay(100);
    const final = {...state(), threads: vm.runtime.threads.length};
    await delay(100);
    return {initial, final, frozen: JSON.stringify(state()) === JSON.stringify((({threads, ...rest}) => rest)(final))};
  } finally { vm.quit(); }
}

test('MS-017: the adapter creates one target per sprite with its own initial state, costumes and sounds, and the stage with its backdrops', () => {
  const {project, sourceMap, objects} = toScratchSceneProject(programs.dialogo, {scene: scene(), resourceView: view});
  assert.deepEqual(project.targets.map(item => [item.name, item.isStage, item.layerOrder]), [['Stage', true, 0], ['hero', false, 1], ['cesta', false, 2]]);
  assert.deepEqual(objects, [{id: 'hero', name: 'hero'}, {id: 'cesta', name: 'Cesta'}], 'VM targets are named by sprite ID; visible names travel aside');
  const [stage, first, second] = project.targets;
  // Initial state from the configuration: position, direction, size, visibility and costume.
  assert.deepEqual((({x, y, direction, size, visible, currentCostume}) => ({x, y, direction, size, visible, currentCostume}))(second),
    {x: 120, y: -40, direction: -90, size: 60, visible: false, currentCostume: 1});
  assert.deepEqual((({x, y, direction, size, visible, currentCostume}) => ({x, y, direction, size, visible, currentCostume}))(first),
    {x: 0, y: 0, direction: 90, size: 100, visible: true, currentCostume: 0});
  // Costumes and sounds by ownerId; the stage holds its backdrops.
  assert.deepEqual(stage.costumes.map(item => item.name), ['stage']);
  assert.deepEqual(first.costumes.map(item => item.name), ['hero', 'hero-alt']);
  assert.deepEqual(second.costumes.map(item => item.name), ['cesta', 'cesta:c1']);
  assert.deepEqual(first.sounds.map(item => item.name), ['tone']);
  assert.deepEqual(second.sounds.map(item => item.name), ['cesta:s0']);
  assert.deepEqual(stage.sounds, []);
  const costume = view.costumes.find(item => item.id === 'cesta:c1');
  assert.deepEqual(second.costumes[1], {name: 'cesta:c1', assetId: costume.assetId, md5ext: costume.assetId + '.svg', dataFormat: 'svg',
    rotationCenterX: costume.centerX, rotationCenterY: costume.centerY, bitmapResolution: costume.bitmapResolution});
  // Messages and global variables are shared on the stage; each script lives in its own object.
  assert.deepEqual(stage.broadcasts, {'gg-message:saluda': 'saluda'});
  assert.deepEqual(stage.variables, {turnos: ['turnos', 0]});
  assert.deepEqual([first.variables, second.variables, first.broadcasts, second.broadcasts], [{}, {}, {}, {}]);
  assert.deepEqual(Object.keys(stage.blocks).sort(), ['s-hear', 's-turn']);
  assert.equal(first.blocks['h-send'].inputs.BROADCAST_INPUT[1][2], 'gg-message:saluda');
  assert.equal(second.blocks['c-hear'].fields.BROADCAST_OPTION[1], 'gg-message:saluda');
  assert.deepEqual(Object.keys(sourceMap).sort(), ['c-hear', 'c-move', 'c-say', 'c-show', 'c-turn', 'h-done', 'h-say', 'h-send', 'h-start', 'h-turn', 's-hear', 's-turn']);
  // Locals belong to their sprite only.
  const locals = toScratchSceneProject(programs.locales, {scene: scene(), resourceView: view}).project;
  assert.deepEqual([target(locals, 'hero').variables, target(locals, 'cesta').variables, target(locals, 'Stage').variables],
    [{'hero-pasos': ['pasos', 0]}, {'cesta-pasos': ['pasos', 0]}, {}]);
  // Stage click is Scratch's stage hat; a backdrop that is not first is selected.
  const backdrops = {...view, costumes: [...view.costumes, {...view.costumes.find(item => item.ownerId === 'stage'), id: 'noche', name: 'noche'}]};
  const clicked = toScratchSceneProject({version: 1, sprites: ['hero', 'cesta'], scripts: [script('stage', 'st-click', [node('wait', 'st-wait', {seconds: 0})], {event: 'click'})]},
    {scene: scene([hero, cesta], 'noche'), resourceView: backdrops}).project;
  assert.equal(target(clicked, 'Stage').blocks['st-click'].opcode, 'event_whenstageclicked');
  assert.equal(target(clicked, 'Stage').currentCostume, 1);
  // A configured costume or backdrop missing from the resources falls back to the first, as the single-sprite adapter always did.
  const missing = toScratchSceneProject({version: 1, sprites: ['hero', 'cesta'], scripts: []}, {scene: scene([hero, {...cesta, costume: 'borrado'}], 'borrado'), resourceView: view}).project;
  assert.deepEqual([target(missing, 'cesta').currentCostume, target(missing, 'Stage').currentCostume], [0, 0]);
  // Without a resource view (headless) every target has the blank costume, as before.
  const headless = toScratchSceneProject(programs.dialogo, {scene: scene()}).project;
  assert.deepEqual(headless.targets.map(item => item.costumes.map(entry => entry.name)), [['blank'], ['blank'], ['blank']]);
  // Owner assets can also come from a host fixture (the runner's built-in resources).
  const hosted = toScratchSceneProject(programs.dialogo, {scene: scene(), ownerAssets: owner => ({costumes: [{name: owner + '-a'}, {name: 'cesta:c1'}], sounds: []})}).project;
  assert.deepEqual(hosted.targets.map(item => item.currentCostume), [0, 0, 1]);
});

test('MS-018: the scene adapter opts in to IR v1 explicitly and rejects what it cannot run faithfully', () => {
  const ir0 = irOf(heroPresents.blockly, sprites('0.2.0'));
  assert.throws(() => toScratchSceneProject(ir0, {scene: scene([hero])}), /IR 2D v1/);
  assert.throws(() => toScratchSceneProject(programs.dialogo, {}), /GG packs|objetos 2D/);
  assert.throws(() => toScratchSceneProject(programs.dialogo, {scene: scene([hero])}), /no coinciden/);
  assert.throws(() => toScratchSceneProject(programs.dialogo, {scene: scene([cesta, hero])}), /no coinciden/, 'same order as the configuration');
  assert.throws(() => toScratchSceneProject(programs.dialogo, {scene: {stage: {backdrop: 'stage'}, sprites: [hero, {...cesta, id: 'stage'}]}}), /GG packs/);
  assert.throws(() => toScratchSceneProject({...programs.dialogo, scripts: [script('cesta', 'x', [node('setCostume', 'x-c', {costume: 'hero-alt'})])]}, {scene: scene(), resourceView: view}), /unsupported costume/);
  // The configured scene is never modified.
  const config = scene();
  toScratchSceneProject(programs.dialogo, {scene: config, resourceView: view});
  assert.deepEqual(config, scene());
  // IR0 consumers keep rejecting v1 even if a caller forwards `objects` by accident (explicit option filtering).
  assert.throws(() => toScratchProject(programs.dialogo, {objects: true}), /unsupported version/);
  assert.throws(() => toScratchProject(programs.dialogo, {resourceView: legacyView, objects: true}), /unsupported version/);
  assert.throws(() => generateCode(programs.dialogo, {objects: true}), /unsupported version/);
});

test('MS-019: a hero-only 0.3.0 project builds exactly the same Scratch project as its IR0 program on the old adapter', () => {
  const capabilities = sprites('0.3.0');
  const fixtures = [heroPresents.blockly, editableExample, ...Object.values(corpus)];
  for (const blockly of fixtures) {
    const ir0 = irOf(blockly, sprites('0.2.0'));
    for (const resourceView of [view, legacyView, undefined]) {
      const old = toScratchProject(ir0, resourceView ? {resourceView} : {});
      // The runner places owner resources on the IR0 targets (stage, hero) with the same adapter helper.
      if (resourceView) old.project.targets.forEach((item, index) => Object.assign(item, ownerResources(resourceView, index === 0 ? 'stage' : 'hero')));
      const lifted = composeScene2DProgram(capabilities.config['gg.sprites'], {stage: {version: 0, scripts: []}, sprites: {hero: ir0}});
      const next = toScratchSceneProject(lifted, {scene: capabilities.config['gg.sprites'], ...(resourceView ? {resourceView} : {})});
      assert.deepEqual(next.project, old.project);
      assert.deepEqual(next.sourceMap, old.sourceMap);
    }
  }
});

test('MS-020: a scene program is composed from one IR0 per object: stage first, configuration order, shared globals', () => {
  const config = scene();
  const ir0 = irOf(heroPresents.blockly, sprites('0.2.0'));
  const none = {version: 0, scripts: []};
  // Lifting a single workspace is the composition of hero alone.
  assert.deepEqual(composeScene2DProgram(scene([hero]), {stage: none, sprites: {hero: ir0}}), programObjectsFromIR0(ir0));
  const turn = id => ({kind: 'changeVariable', variableId: 'turnos', name: 'turnos', value: 1, sourceBlockId: id});
  const globalVar = {id: 'turnos', name: 'turnos', initialValue: 0, scope: 'global'};
  const localVar = {id: 'turnos', name: 'turnos', initialValue: 0};
  const start = (id, body) => ({event: 'start', sourceBlockId: id, body});
  const composed = composeScene2DProgram(config, {
    stage: {version: 0, variables: [localVar], scripts: [start('s', [turn('s-t')])]},
    sprites: {cesta: {version: 0, variables: [localVar, {id: 'mio', name: 'mio', initialValue: 0}], scripts: [start('c', [turn('c-t')])]},
      hero: {version: 0, variables: [globalVar], scripts: [start('h', [turn('h-t')])]}}
  });
  assert.deepEqual(composed, {version: 1, sprites: ['hero', 'cesta'],
    variables: [{id: 'mio', name: 'mio', initialValue: 0, targetId: 'cesta'}, globalVar],
    scripts: [{targetId: 'stage', ...start('s', [turn('s-t')])}, {targetId: 'hero', ...start('h', [turn('h-t')])}, {targetId: 'cesta', ...start('c', [turn('c-t')])}]});
  assert.deepEqual(validateProgram(composed, {objects: true}), composed);
  // A missing object counts as empty; inputs are not modified.
  const input = {stage: none, sprites: {hero: ir0}};
  const before = structuredClone(input);
  assert.equal(composeScene2DProgram(config, input).scripts.every(item => item.targetId === 'hero'), true);
  assert.deepEqual(input, before);
  // Conflicts are rejected instead of guessed.
  const variables = (...list) => ({version: 0, variables: list, scripts: []});
  assert.throws(() => composeScene2DProgram(config, {stage: none, sprites: {hero: variables(localVar), cesta: variables(localVar)}}), /local de varios objetos/);
  assert.throws(() => composeScene2DProgram(config, {stage: none, sprites: {hero: variables(globalVar), cesta: variables({...globalVar, name: 'otro'})}}), /nombres distintos/);
  assert.throws(() => composeScene2DProgram(config, {stage: none, sprites: {intruso: ir0}}), /objeto desconocido/);
  assert.throws(() => composeScene2DProgram(config, {stage: programObjectsFromIR0(ir0), sprites: {}}), /IR0/);
});

test('MS-021: multi-sprite execution matches native Scratch: messages, a global variable, locals and Stop', {timeout: 60000}, async () => {
  const run = (name, options) => observe(toScratchSceneProject(programs[name], {scene: scene()}).project, options);
  const reference = (name, options) => observe(references[name], options);
  // Two sprites talk through a message; the stage answers too; the global variable is shared.
  const done = state => state.hero.bubble === 'Listo';
  const [dialogo, dialogoRef] = [await run('dialogo', {until: done}), await reference('dialogo', {until: done})];
  assert.equal(dialogo.initial.threads, 0, 'loading runs nothing');
  assert.deepEqual(dialogo.initial, dialogoRef.initial);
  assert.deepEqual(dialogo.final, dialogoRef.final);
  assert.deepEqual(dialogo.final.globals, [['turnos', 111]]);
  assert.deepEqual([dialogo.final.cesta.x, dialogo.final.cesta.visible, dialogo.final.cesta.bubble, dialogo.final.threads], [70, true, '¡Hola, hero!', 0]);
  // Same-named locals of two sprites stay separate.
  const counted = state => state.cesta.direction !== -90;
  const [locales, localesRef] = [await run('locales', {until: counted}), await reference('locales', {until: counted})];
  assert.deepEqual(locales.final, localesRef.final);
  assert.deepEqual([locales.final.hero.locals, locales.final.cesta.locals, locales.final.globals], [[['pasos', 5]], [['pasos', 7]], []]);
  // «detener todo» in the stage stops both sprites' loops.
  const stopped = (state, vm) => vm.runtime.threads.length === 0 && state.hero.x > 0;
  const [detener, detenerRef] = [await run('detener', {until: stopped}), await reference('detener', {until: stopped})];
  for (const result of [detener, detenerRef]) {
    assert.equal(result.final.threads, 0);
    assert.equal(result.frozen, true, 'nothing moves after Stop');
    assert.ok(result.final.hero.x > 0 && result.final.cesta.direction !== -90, 'both objects ran before Stop');
  }
  // The shell's single Detener (vm.stopAll) stops every object.
  const running = state => state.hero.x > 5 && state.cesta.direction !== -90;
  const [bucles, buclesRef] = [await run('bucles', {until: running, stop: true}), await reference('bucles', {until: running, stop: true})];
  for (const result of [bucles, buclesRef]) assert.deepEqual([result.final.threads, result.frozen], [0, true]);
});

test('MS-022: a migrated 0.2.0 project runs the same through the multi-target path as through IR0', {timeout: 60000}, async () => {
  const ir0 = irOf(heroPresents.blockly, sprites('0.2.0'));
  const config = sprites('0.3.0').config['gg.sprites'];
  const lifted = composeScene2DProgram(config, {stage: {version: 0, scripts: []}, sprites: {hero: ir0}});
  const withCostumes = project => { const item = target(project, 'hero'); item.costumes = [item.costumes[0], {...item.costumes[0], name: 'hero-alt'}]; return project; };
  // Independent paths: toScratchProject (IR0) against toScratchSceneProject (IR v1 + configured scene).
  const previous = await observeHero(withCostumes(toScratchProject(ir0).project));
  const next = await observeHero(withCostumes(toScratchSceneProject(lifted, {scene: config}).project));
  assert.equal(next.initial.threads, 0);
  assert.deepEqual(next.initial, previous.initial);
  assert.deepEqual(next.final, previous.final);
  assert.deepEqual((({size, ...rest}) => rest)(next.final), {visible: true, costume: 1, bubble: '¡Mira cómo reboto!'});
  assert.equal(next.stopped, 0);
});
async function observeHero(project) {
  const vm = await createScratchSession(project);
  try {
    const state = () => { const item = vm.runtime.getSpriteTargetByName('hero'), bubble = item.getCustomState('Scratch.looks');
      return {size: item.size, visible: item.visible, costume: item.currentCostume, bubble: bubble?.text ?? null}; };
    const initial = {...state(), x: vm.runtime.getSpriteTargetByName('hero').x, threads: vm.runtime.threads.length};
    vm.greenFlag();
    for (let waited = 0; state().bubble !== '¡Mira cómo reboto!' && waited < 10000; waited += 50) await delay(50);
    const final = state(); vm.stopAll();
    return {initial, final, stopped: vm.runtime.threads.length};
  } finally { vm.quit(); }
}

test('MS-023: the broker authorizes IR v1 only on explicit opt-in, for the configured objects and each owner\'s resources', async () => {
  const two = sprites('0.3.0', [hero, cesta]);
  assert.throws(() => authorizeProgram(two, programs.dialogo), /unsupported version/, 'default stays IR0');
  assert.deepEqual(authorizeProgram(two, programs.dialogo, {objects: true}), programs.dialogo);
  // The objects must be the configured ones, in order, and the profile must have objects.
  assert.throws(() => authorizeProgram(sprites('0.3.0'), programs.dialogo, {objects: true}), /objetos/);
  assert.throws(() => authorizeProgram(sprites('0.2.0'), programs.dialogo, {objects: true}), /objetos/);
  assert.throws(() => authorizeProgram(sprites('0.3.0', [cesta, hero]), programs.dialogo, {objects: true}), /objetos/);
  // IR0 still authorizes with the opt-in (text documents run IR0 on 0.3.0 profiles).
  const ir0 = irOf(heroPresents.blockly, sprites('0.2.0'));
  assert.deepEqual(authorizeProgram(two, ir0, {objects: true}), authorizeProgram(two, ir0));
  // Resources are authorized against the script's owner: each object has its own, and no other's (3.2).
  const assetsProfile = createCapabilities(['gg.sprites', 'gg.assets'], {versions: {'gg.sprites': '0.3.0', 'gg.assets': '0.2.0'}});
  assetsProfile.config['gg.sprites'] = scene();
  const costume = (targetId, value) => ({version: 1, sprites: ['hero', 'cesta'], scripts: [script(targetId, targetId + '-s', [node('setCostume', targetId + '-c', {costume: value})])]});
  assert.doesNotThrow(() => authorizeProgram(assetsProfile, costume('hero', 'hero-alt'), {objects: true, resourceView: view}));
  assert.doesNotThrow(() => authorizeProgram(assetsProfile, costume('cesta', 'cesta:c1'), {objects: true, resourceView: view}));
  assert.throws(() => authorizeProgram(assetsProfile, costume('cesta', 'hero-alt'), {objects: true, resourceView: view}), /unsupported costume/);
});

test('MS-024: scene readings list every sprite; the single-sprite reading of hero stays exactly as before', async () => {
  // Legacy DTO: a single hero.
  const legacy = {sprites: [{id: 'hero', name: 'hero', x: 1, y: 2}], variables: [{id: 'v', name: 'v', value: 3}]};
  assert.deepEqual(validateSceneSnapshot(legacy), legacy);
  // Objects DTO: every sprite with its visible name; each local variable names its sprite.
  const multi = {sprites: [{id: 'hero', name: 'hero', x: 0, y: 0}, {id: 'cesta', name: 'Cesta', x: 120, y: -40}],
    variables: [{id: 'hero-pasos', name: 'pasos', value: 5, targetId: 'hero'}, {id: 'cesta-pasos', name: 'pasos', value: 7, targetId: 'cesta'}]};
  assert.deepEqual(validateSceneSnapshot(multi), multi);
  assert.deepEqual(validateSceneSnapshot({sprites: [{id: 'cesta', name: 'Cesta', x: 0, y: 0}], variables: []}).sprites[0].id, 'cesta');
  for (const mutate of [
    value => { value.sprites.push({...value.sprites[0]}); }, value => { value.variables[0].targetId = 'nadie'; },
    value => { delete value.variables[0].targetId; }, value => { value.sprites[1].id = 'stage'; }, value => { value.sprites[1].id = '__proto__'; },
    value => { value.sprites[1].name = ''; }, value => { value.sprites[1].name = 'n'.repeat(33); },
    value => { value.sprites = Array.from({length: 9}, (_, index) => ({id: 's' + index, name: 'S' + index, x: 0, y: 0})); value.variables = []; }
  ]) {
    const value = structuredClone(multi); mutate(value);
    assert.throws(() => validateSceneSnapshot(value), /Lectura de escena inválida/);
  }
  // GG scene.get from a multi-target VM.
  const {project, objects} = toScratchSceneProject(programs.locales, {scene: scene()});
  const vm = await createScratchSession(project);
  try {
    const gg = createGGBindings(() => vm, () => objects);
    assert.deepEqual(validateSceneSnapshot(gg('scene.get', [])), {sprites: [{id: 'hero', name: 'hero', x: 0, y: 0}, {id: 'cesta', name: 'Cesta', x: 120, y: -40}],
      variables: [{id: 'hero-pasos', name: 'pasos', value: 0, targetId: 'hero'}, {id: 'cesta-pasos', name: 'pasos', value: 0, targetId: 'cesta'}]});
    assert.deepEqual(gg('sprite.get', ['hero']), {id: 'hero', name: 'hero', x: 0, y: 0});
    assert.throws(() => gg('sprite.get', ['cesta']), /Unknown GG sprite/, 'per-object GG calls arrive with API v3 per object (2.2)');
  } finally { vm.quit(); }
  // A hero-only scene keeps the single-sprite DTO, with or without explicit objects.
  const single = toScratchSceneProject(programObjectsFromIR0({version: 0, variables: [{id: 'v', name: 'v', initialValue: 0}], scripts: []}), {scene: scene([hero])});
  const heroVM = await createScratchSession(single.project);
  try {
    for (const gg of [createGGBindings(() => heroVM, () => single.objects), createGGBindings(() => heroVM)])
      assert.deepEqual(gg('scene.get', []), {sprites: [{id: 'hero', name: 'hero', x: 0, y: 0}], variables: [{id: 'v', name: 'v', value: 0}]});
  } finally { heroVM.quit(); }
});

test('MS-025: the authoring coordinator gives 0.3.0 projects their scene program (IR v1) and leaves earlier profiles on IR0', async () => {
  const two = sprites('0.3.0', [hero, cesta]);
  const say = (id, message) => ({type: 'gg_say', id, fields: {MESSAGE: message}});
  const cestaBlockly = {blocks: {languageVersion: 0, blocks: [{type: 'gg_when_start', id: 'cesta-start', x: 40, y: 60, inputs: {DO: {block: say('cesta-say', 'Hola')}}}]}};
  const stageBlockly = {blocks: {languageVersion: 0, blocks: [{type: 'gg_when_start', id: 'stage-start', x: 10, y: 10}]}};
  let blockly = heroPresents.blockly, capabilities = sprites('0.2.0');
  const converted = [];
  const editor = {
    save: () => structuredClone(blockly),
    program: () => irOf(blockly, capabilities),
    programOf: state => { converted.push(state); return irOf(state, capabilities); },
    prepare: (state, options) => ({state: structuredClone(state), capabilities: options.capabilities}),
    commit(candidate) { blockly = structuredClone(candidate.state); capabilities = candidate.capabilities; }
  };
  const authoring = createProjectAuthoring({editor, source: {value: ''}, initialCapabilities: sprites('0.2.0')});
  // Earlier profiles: the editor's IR0, unchanged.
  assert.deepEqual(authoring.sceneProgram(), editor.program());
  const model = await createProject({name: 'Diálogo', scene2d: {stage: stageBlockly, sprites: {hero: heroPresents.blockly, cesta: cestaBlockly}}, deviceSource: '', catalog, capabilities: two});
  authoring.commit(authoring.prepare(model));
  const program = authoring.sceneProgram();
  assert.equal(program.version, 1);
  assert.deepEqual(program.sprites, ['hero', 'cesta']);
  assert.deepEqual(program.scripts.map(item => [item.targetId, item.sourceBlockId]), [['stage', 'stage-start'], ...editor.program().scripts.map(item => ['hero', item.sourceBlockId]), ['cesta', 'cesta-start']]);
  assert.deepEqual(converted, [stageBlockly, cestaBlockly], 'only the stored workspaces are converted; the mounted one is the editor\'s');
  assert.deepEqual(authoring.sceneProgram(), program, 'reading the program changes nothing');
  // The single editor holds sprites[0] — also when it is not hero — and its IR is that sprite's (initialSceneOfObjects).
  const first = sprites('0.3.0', [cesta, hero]);
  const swapped = await createProject({name: 'Cesta primero', scene2d: {stage: {}, sprites: {cesta: heroPresents.blockly, hero: {}}}, deviceSource: '', catalog, capabilities: first});
  authoring.commit(authoring.prepare(swapped));
  const cestaFirst = authoring.sceneProgram();
  assert.deepEqual(cestaFirst.sprites, ['cesta', 'hero']);
  assert.equal(cestaFirst.scripts.every(item => item.targetId === 'cesta'), true);
  // Without a headless converter a stored workspace with blocks cannot be run silently without its scripts.
  const bare = createProjectAuthoring({editor: {...editor, programOf: undefined}, source: {value: ''}, initialCapabilities: sprites('0.2.0')});
  bare.commit(bare.prepare(model));
  assert.throws(() => bare.sceneProgram(), /objetos/);
});
