import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {localPackCatalog} from '../../src/packs/catalog.mjs';
import {canonicalPackData, createCapabilities, validateCapabilities, resolveCapabilities, migrateCapabilities} from '../../src/contracts/packs.mjs';
import {authorizeProgram, authorizeProjectOperation, createCapabilityBroker} from '../../src/contracts/pack-broker.mjs';
import {loadWorkspace, saveWorkspace, workspaceToIR} from '../../src/editor/block-program.mjs';
import {createContributions} from '../../src/editor/contributions.mjs';
import {toScratchProject} from '../../src/adapters/scratch/scratch-project.mjs';
import {createGGBindings} from '../../src/adapters/scratch/gg-bindings.mjs';
import {createScratchSession} from '../../spikes/scratch-adapter.mjs';
import {generateProgramSource} from '../../src/generated-program-source.mjs';
import {createProject, parseProject, serializeProject, upgradeProject} from '../../src/project-format.mjs';
import {createProjectArchive, parseProjectArchive} from '../../src/project-archive.mjs';
import {buildProjectCatalog} from '../../tools/f1/build-project-catalog.mjs';
import {createTone} from '../../tools/f0/tone.mjs';
import {editableExample} from '../fixtures/corpus.blocks.mjs';

const packs = () => createCapabilities(['gg.sprites', 'gg.score']);
const scoreFixture = {
  "blocks": {
    "languageVersion": 0,
    "blocks": [
      {
        "type": "gg_when_start",
        "id": "pack-start",
        "inputs": {
          "DO": {
            "block": {
              "type": "gg_score_set",
              "id": "pack-set",
              "inputs": {
                "VALUE": {
                  "shadow": {
                    "type": "math_number",
                    "id": "pack-initial",
                    "fields": {
                      "NUM": 3
                    }
                  }
                }
              },
              "next": {
                "block": {
                  "type": "gg_score_change",
                  "id": "pack-change",
                  "inputs": {
                    "DELTA": {
                      "shadow": {
                        "type": "math_number",
                        "id": "pack-delta",
                        "fields": {
                          "NUM": 2
                        }
                      }
                    }
                  },
                  "next": {
                    "block": {
                      "type": "gg_move",
                      "id": "pack-move",
                      "inputs": {
                        "STEPS": {
                          "block": {
                            "type": "gg_score_value",
                            "id": "pack-read"
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    ]
  }
};
const emptyIR = {version: 0, scripts: []};
const variables = [{id: 'gg-pack-score', name: 'Puntos', scope: 'global', initialValue: 0}, {id: 'other', name: 'Other', initialValue: 0}];
const assets = {};
for (const name of ['stage', 'hero', 'hero-alt']) {
  const content = await readFile(new URL('../../src/assets/' + name + '.svg', import.meta.url), 'utf8');
  assets[createHash('md5').update(content).digest('hex')] = content;
}
const tone = createTone().buffer;
assets[createHash('md5').update(tone).digest('hex')] = {type: 'Sound', format: 'wav', encoding: 'base64', data: tone.toString('base64')};
const catalog = await buildProjectCatalog({assets, costumes: [], sounds: []});

test('GG-PACK-001: installed locks cover canonical manifest, editor, translator and permission data and are immutable', () => {
  for (const entry of localPackCatalog) {
    assert.equal(createHash('sha256').update(canonicalPackData(entry.manifest)).digest('hex'), entry.sha256);
    assert.equal(Object.isFrozen(entry.manifest.contributions.blocks), true);
    assert.throws(() => { entry.manifest.permissions.operations.push('network.fetch'); }, TypeError);
    assert.throws(() => { entry.sha256 = '0'.repeat(64); }, TypeError);
  }
  assert.equal(Object.isFrozen(localPackCatalog), true);
});
test('GG-PACK-001/002: resolution is explicit, detached, dependency-complete and rejects foreign locks/config', () => {
  assert.equal(validateCapabilities(null), null);
  assert.equal(resolveCapabilities().legacy, true);
  assert.equal(resolveCapabilities().capabilities, null);
  const capabilities = packs();
  const profile = resolveCapabilities(capabilities);
  // gg.sprites@0.3.0 is the latest and satisfies gg.score's dependency on 0.1.0.
  assert.deepEqual(profile.packs.map(pack => [pack.id, pack.version]), [['gg.score', '0.2.0'], ['gg.sprites', '0.3.0']]);
  assert.deepEqual(resolveCapabilities(createCapabilities(['gg.sprites', 'gg.score'], {versions: {'gg.sprites': '0.1.0'}})).packs.map(pack => [pack.id, pack.version]), [['gg.score', '0.2.0'], ['gg.sprites', '0.1.0']]);
  assert.equal(profile.variables[0].id, 'gg-pack-score');
  profile.variables[0].initialValue = 42;
  assert.equal(resolveCapabilities(capabilities).variables[0].initialValue, 0);
  for (const corrupt of [
    value => { value.locks[0].sha256 = '0'.repeat(64); },
    value => { value.locks[0].version = '99.0.0'; },
    value => { value.locks.push({...value.locks[0]}); },
    value => { value.config['gg.score'].module = 'https://example.invalid/a.js'; },
    value => { value.config['gg.score'].initialValue = Infinity; },
    value => { value.config['gg.score'].variableId = '__proto__'; },
    value => { value.config['gg.sprites'].sprites[0].x = 241; },
    value => { value.config['gg.sprites'].sprites.push(structuredClone(value.config['gg.sprites'].sprites[0])); },
    value => { value.locks = value.locks.filter(lock => lock.id !== 'gg.sprites'); delete value.config['gg.sprites']; },
    value => { value.locks = Array(1); }
  ]) { const value = structuredClone(capabilities); corrupt(value); assert.throws(() => validateCapabilities(value), /GG packs/); }
  // 0.1.0/0.2.0 keep their constant initial scene.
  for (const version of ['0.1.0', '0.2.0']) {
    const value = createCapabilities(['gg.sprites', 'gg.score'], {versions: {'gg.sprites': version}});
    value.config['gg.sprites'].initialScene.x = 3;
    assert.throws(() => validateCapabilities(value), /GG packs/, version);
  }
  assert.throws(() => createCapabilities(['gg.remote']), /no instalado/);
  assert.throws(() => createCapabilities(['gg.sprites'], {config: {'gg.score': {}}}), /no seleccionado/);
});
test('GG-PACK-002: the installed score 0.1→0.2→0.1 migration changes real configuration fields reversibly', () => {
  const old = createCapabilities(['gg.score'], {versions: {'gg.score': '0.1.0'},
    config: {'gg.score': {variableId: 'my-score', label: 'Mi puntuación', initial: 8}}});
  const upgraded = migrateCapabilities(old, {id: 'gg.score', toVersion: '0.2.0'});
  assert.deepEqual(upgraded.config['gg.score'], {variableId: 'my-score', label: 'Mi puntuación', initialValue: 8});
  assert.equal(upgraded.locks.find(lock => lock.id === 'gg.score').version, '0.2.0');
  assert.deepEqual(migrateCapabilities(upgraded, {id: 'gg.score', toVersion: '0.1.0'}), old);
  assert.equal(old.config['gg.score'].initial, 8);
  assert.throws(() => migrateCapabilities(old, {id: 'gg.score', toVersion: '9.0.0'}), /migración/);
  assert.throws(() => migrateCapabilities(null, {id: 'gg.score', toVersion: '0.2.0'}), /explícitas/);
});
test('GG-PACK-001: score is registered data, lowers to existing IR with source IDs and executes in native VM', async () => {
  const capabilities = packs();
  const contribution = createContributions(capabilities);
  assert.ok(contribution.statements.has('gg_score_set'));
  const workspace = loadWorkspace(scoreFixture, {capabilities});
  let ir;
  try {
    ir = workspaceToIR(workspace, {capabilities});
    const restored = loadWorkspace(saveWorkspace(workspace), {capabilities});
    try { assert.deepEqual(workspaceToIR(restored, {capabilities}), ir); } finally { restored.dispose(); }
  } finally { workspace.dispose(); }
  assert.deepEqual(ir.variables, [{id: 'gg-pack-score', name: 'Puntos', scope: 'global', initialValue: 0}]);
  assert.deepEqual(ir.scripts[0].body.map(node => node.kind), ['setVariable', 'changeVariable', 'move']);
  assert.equal(ir.scripts[0].body[2].steps.sourceBlockId, 'pack-read');
  const vm = await createScratchSession(toScratchProject(ir).project);
  try {
    vm.greenFlag();
    for (let index = 0; index < 8; index++) vm.runtime._step();
    assert.equal(vm.runtime.getSpriteTargetByName('hero').x, 5);
    assert.equal(vm.runtime.getTargetForStage().variables['gg-pack-score'].value, 5);
  } finally { vm.quit(); }
  for (const language of ['javascript', 'python']) {
    const generated = generateProgramSource(ir, language);
    assert.match(generated.text, /ctx.changeVariable/);
    assert.match(generated.text, /GG.ref\("gg-pack-score"\)/);
    assert.ok(generated.sourceMap.some(ids => ids.includes('pack-read')));
  }
});
test('GG-PACK-001: editor has no score-specific branch and an inactive contribution is rejected', async () => {
  for (const path of ['src/editor/block-program.mjs', 'src/editor/editor-entry.mjs', 'src/editor/contributions.mjs']) {
    const source = await readFile(new URL('../../' + path, import.meta.url), 'utf8');
    assert.equal(source.includes('gg.score'), false); assert.equal(source.includes('gg_score_'), false);
  }
  const workspace = loadWorkspace(scoreFixture, {capabilities: packs()});
  try { assert.throws(() => workspaceToIR(workspace), /Unsupported block gg_score_set/); }
  finally { workspace.dispose(); }
});
test('GG-PACK-002: defaults complete missing IDs without changing explicit text initial values or legacy variable scope', () => {
  const capabilities = createCapabilities(['gg.score'], {config: {'gg.score': {variableId: 'gg-pack-score', label: 'Puntos', initialValue: 7}}});
  const source = {variables: [{id: 'gg-pack-score', name: 'Nombre en copia', scope: 'global', initialValue: 2}], handlers: []};
  const result = authorizeProjectOperation(capabilities, 'program.start', [source]);
  assert.equal(result.args[0].variables[0].initialValue, 2);
  assert.equal(result.args[0].variables[0].name, 'Nombre en copia');
  assert.equal(source.variables[0].initialValue, 2);
  const legacy = {version: 0, variables: [{id: 'gg-score', name: 'score', initialValue: 4}], scripts: []};
  const enriched = authorizeProgram(capabilities, legacy);
  assert.deepEqual(enriched.variables[0], legacy.variables[0]);
  assert.equal(enriched.variables[1].scope, 'global');
  assert.equal(enriched.variables[1].initialValue, 7);
  assert.deepEqual(legacy.variables.length, 1);
  assert.throws(() => authorizeProgram(capabilities, {version: 0, variables: [{id: 'gg-pack-score', name: 'old local', initialValue: 1}], scripts: []}), /ámbito/);
});
test('GG-PACK-003: project and scoped pack clients enforce operations and resource IDs before real VM mutation', async () => {
  const capabilities = packs();
  const vm = await createScratchSession(toScratchProject({...emptyIR, variables}).project);
  try {
    const gg = createGGBindings(() => vm);
    const broker = createCapabilityBroker({capabilities, call: gg, getContext: () => ({variables})});
    const score = broker.client('gg.score');
    assert.equal(score.invoke('variables.set', ['gg-pack-score', 9]).value, 9);
    assert.equal(score.invoke('variables.get', ['gg-pack-score']).value, 9);
    assert.throws(() => score.invoke('sprite.move', ['hero', 10], {principal: 'gg.sprites'}), /no declarado/);
    assert.throws(() => score.invoke('variables.set', ['other', 99]), /no declarado/);
    assert.equal(gg('sprite.get', ['hero']).x, 0);
    assert.equal(gg('variables.get', ['other']).value, 0);
    assert.equal(broker.invoke('sprite.move', ['hero', 1]).x, 1);
    assert.throws(() => broker.client('gg.remote'), /no seleccionado/);
    assert.throws(() => score.invoke('program.compare', ['context', 'EQ', {variableId: 'other'}, 1]), /no declarado/);
    assert.throws(() => broker.invoke('program.playSound', ['context', 'remote.wav', false]), /unsupported sound/);
  } finally { vm.quit(); }
});
test('GG-PACK-003: failed and pending activation cannot publish new authorization declarations', async () => {
  let rejectNext = false; let finish;
  const broker = createCapabilityBroker({capabilities: packs(), call: (method) => {
    if (method === 'program.start' && rejectNext) return Promise.reject(new Error('adapter refused'));
    return method === 'program.start' && finish === null ? new Promise(resolve => { finish = resolve; }) : true;
  }});
  broker.invoke('program.start', [{variables: [{id: 'previous', name: 'P', initialValue: 0}], handlers: []}]);
  rejectNext = true;
  await assert.rejects(broker.invoke('program.start', [{variables: [{id: 'invalid-new', name: 'N', initialValue: 0}], handlers: []}]), /adapter refused/);
  assert.throws(() => broker.invoke('variables.set', ['invalid-new', 1]), /no declarado/);
  assert.equal(broker.invoke('variables.set', ['previous', 1]), true);
  rejectNext = false; finish = null;
  const pending = broker.invoke('program.start', [{variables: [], handlers: []}]);
  assert.throws(() => broker.invoke('program.start', [{variables: [], handlers: []}]), /pendiente/);
  finish(true); await pending;
});
test('GG-PACK-003: unique numeric IDs resolve original hero or Stage, reject ambiguity/non-numeric/cloud and preserve legacy range', async () => {
  const vm = await createScratchSession(toScratchProject({...emptyIR, variables}).project);
  try {
    const gg = createGGBindings(() => vm); const hero = vm.runtime.getSpriteTargetByName('hero'); const stage = vm.runtime.getTargetForStage();
    assert.equal(gg('variables.set', ['gg-pack-score', 11]).value, 11);
    const detached = gg('variables.get', ['gg-pack-score']); detached.value = 99;
    assert.equal(stage.variables['gg-pack-score'].value, 11);
    assert.equal(gg('scene.get', []).variables.some(item => item.id === 'gg-pack-score'), false);
    hero.createVariable('gg-pack-score', 'collision', '', false);
    assert.throws(() => gg('variables.get', ['gg-pack-score']), /Ambiguous/);
    assert.throws(() => gg('variables.set', ['gg-pack-score', 2]), /Ambiguous/);
    assert.equal(stage.variables['gg-pack-score'].value, 11);
    stage.createVariable('message', 'go', 'broadcast_msg', false);
    stage.createVariable('cloud', 'cloud', '', false); stage.variables.cloud.isCloud = true;
    for (const id of ['missing', 'message', 'cloud', '__proto__']) assert.throws(() => gg('variables.get', [id]), /Unknown/);
    assert.throws(() => gg('variables.set', ['other', 1000001]), /Invalid/);
    assert.equal(hero.variables.other.value, 0);
    stage.variables['gg-pack-score'].value = 1e12; delete hero.variables['gg-pack-score'];
    assert.throws(() => gg('variables.get', ['gg-pack-score']), /Invalid/);
  } finally { vm.quit(); }
});
test('GG-PACK-002: v1/v2 remain exact, explicit promotion owns initial scene only inside v3 capabilities', async () => {
  for (const version of [1, 2]) {
    const legacy = await createProject({name: 'Legado', blockly: editableExample, deviceSource: '',
      catalog, ...(version === 2 ? {textDocuments: [], selectedTextDocumentId: null} : {})});
    const before = structuredClone(legacy);
    assert.equal(legacy.version, version); assert.equal(Object.hasOwn(legacy, 'capabilities'), false);
    assert.deepEqual(await parseProject(serializeProject(legacy), {catalog}), before);
    const upgraded = await upgradeProject(legacy, {capabilities: packs(), catalog});
    assert.equal(upgraded.version, 3); assert.equal(Object.hasOwn(upgraded, 'scene'), false);
    // gg.sprites@0.3.0: the legacy scene is the first (and only) sprite.
    assert.deepEqual(resolveCapabilities(upgraded.capabilities).initialScene, legacy.scene);
    assert.deepEqual(upgraded.capabilities.config['gg.sprites'].sprites, [{id: 'hero', name: 'hero', ...(({spriteId, ...rest}) => rest)(legacy.scene), visible: true}]);
    assert.deepEqual(upgraded.authoring.blockly, legacy.authoring.blockly);
    assert.deepEqual(legacy, before);
    const workspace = loadWorkspace(upgraded.authoring.blockly, {capabilities: upgraded.capabilities});
    try {
      const ir = workspaceToIR(workspace, {capabilities: upgraded.capabilities});
      assert.equal(ir.variables.find(variable => variable.id === 'gg-score').scope, undefined);
      assert.equal(ir.variables.find(variable => variable.id === 'gg-pack-score').scope, 'global');
    } finally { workspace.dispose(); }
  }
});
test('GG-PACK-002: GGPROJ3 JSON and strict ZIP roundtrip fixed locks/config and reject unknown capabilities without mutation', async () => {
  const document = await createProject({name: 'Puntuación', blockly: scoreFixture, deviceSource: '', catalog, capabilities: packs()});
  assert.equal(document.version, 3);
  assert.deepEqual(await parseProject(serializeProject(document), {catalog}), document);
  const bytes = await createProjectArchive(document, {catalog});
  assert.deepEqual(await parseProjectArchive(bytes, {catalog}), document);
  const previous = structuredClone(document);
  const corrupted = structuredClone(document); corrupted.capabilities.locks[0].sha256 = '0'.repeat(64);
  await assert.rejects(parseProject(JSON.stringify(corrupted), {catalog}), /hash/);
  assert.deepEqual(document, previous);
  const duplicated = {...document, scene: {x: 0}};
  await assert.rejects(parseProject(JSON.stringify(duplicated), {catalog}), /propiedades/);
});
