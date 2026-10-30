import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {localPackCatalog, latestPackVersions, localPackMigrations, localPackCompatibility} from '../../src/packs/catalog.mjs';
import {languageTables, spriteLanguage02} from '../../src/packs/language-tables.mjs';
import {languageCoverage, offeredCoreStructures} from '../../src/contracts/language-table.mjs';
import {canonicalPackData, createCapabilities, validateCapabilities, resolveCapabilities, migrateCapabilities, newProjectCapabilities, lockedPackVersions} from '../../src/contracts/packs.mjs';
import {findMigrationChain, validateMigrationRecord} from '../../src/contracts/pack-migrations.mjs';
import {scene2DObjectLimits, validateScene2DObjects, scene2DObjectsFromInitialScene} from '../../src/contracts/scene2d-objects.mjs';
import {availablePackUpdates, migrateProject} from '../../src/project-migration.mjs';
import {createProject, parseProject, serializeProject, projectInitialScene, projectBlocklyWorkspace} from '../../src/project-format.mjs';
import {loadWorkspace, workspaceToIR} from '../../src/editor/block-program.mjs';
import {createContributions} from '../../src/editor/contributions.mjs';
import {toScratchProject} from '../../src/adapters/scratch/scratch-project.mjs';
import {createScratchSession} from '../../spikes/scratch-adapter.mjs';
import {buildProjectCatalog} from '../../tools/f1/build-project-catalog.mjs';
import {editableExample} from '../fixtures/corpus.blocks.mjs';

// scene2d-multi-sprite tareas 1.1–1.2 (E2, 29/10/2026): gg.sprites@0.3.0 holds
// the stage and a list of 1–8 sprites; the 0.2.0 → 0.3.0 catalog migration
// (chain from 0.1.0) turns initialScene into sprites[0] «hero» without changing
// block IDs or behavior. Multi-sprite execution comes later (Task 4).
const sprites = version => createCapabilities(['gg.sprites'], {versions: {'gg.sprites': version}});
const spritesConfig = capabilities => capabilities.config['gg.sprites'];
const spritesLock = capabilities => capabilities.locks.find(lock => lock.id === 'gg.sprites');
const hero = {id: 'hero', name: 'hero', x: 0, y: 0, direction: 90, size: 100, visible: true, costume: 'hero'};
const defaults = {stage: {backdrop: 'stage'}, sprites: [hero]};
const sprite = (index, extra = {}) => ({...hero, id: 'sprite-' + index, name: 'Objeto ' + index, ...extra});
const withSprites = list => ({stage: {backdrop: 'stage'}, sprites: list});
const v3With = config => ({locks: [spritesLock(sprites('0.3.0'))], config: {'gg.sprites': config}});
const heroPresents = JSON.parse(await readFile(new URL('../fixtures/canonical/scene2d/hero-presents/project.json', import.meta.url), 'utf8'));
const svg = await readFile(new URL('../../src/assets/stage.svg', import.meta.url), 'utf8');
const catalog = await buildProjectCatalog({assets: {[createHash('md5').update(svg).digest('hex')]: svg}, costumes: [], sounds: []});
function irOf(blockly, capabilities) {
  const workspace = loadWorkspace(structuredClone(blockly), {capabilities});
  try { return workspaceToIR(workspace, {capabilities}); } finally { workspace.dispose(); }
}

test('MS-001: gg.sprites@0.3.0 is a frozen apiVersion 2 manifest that keeps the whole 0.2.0 vocabulary', () => {
  const entries = localPackCatalog.filter(item => item.manifest.id === 'gg.sprites');
  assert.deepEqual(entries.map(item => [item.manifest.version, item.manifest.apiVersion]), [['0.1.0', 1], ['0.2.0', 2], ['0.3.0', 2]]);
  assert.equal(entries[0].sha256, '225d6c992253966ac0645d9e73360c13da853787c0b02ff23c6cc9bdad6072d2');
  assert.equal(entries[1].sha256, '70475dfae3921d1ac28e862d30c2c31e815da2b2f1133060038f37c24c4e366a');
  for (const item of entries) assert.equal(createHash('sha256').update(canonicalPackData(item.manifest)).digest('hex'), item.sha256);
  const [, previous, next] = entries.map(item => item.manifest);
  // Same language table, blocks, rules, toolbox, resources and permissions: only the configuration changes.
  assert.equal(next.language, spriteLanguage02);
  assert.equal(languageTables['gg.sprites@0.3.0'], spriteLanguage02);
  assert.deepEqual(languageCoverage(localPackCatalog, {tables: languageTables}), {missing: [], orphan: [], core: []});
  assert.deepEqual(next.contributions, previous.contributions);
  assert.deepEqual(next.permissions, previous.permissions);
  assert.deepEqual(next.resources, previous.resources);
  assert.deepEqual(next.dependencies, []);
  assert.deepEqual(next.defaults, defaults);
  assert.deepEqual(offeredCoreStructures(resolveCapabilities(sprites('0.3.0')).packs), offeredCoreStructures(resolveCapabilities(sprites('0.2.0')).packs));
  const contributions = version => (({blocks, toolbox, variableFlyout, statements, hats}) => ({blocks, toolbox, variableFlyout,
    statements: [...statements.keys()], hats: [...hats.keys()]}))(createContributions(sprites(version)));
  assert.deepEqual(contributions('0.3.0'), contributions('0.2.0'));
});

test('MS-002: the 0.3.0 configuration admits 1–8 sprites with stable unique IDs and unique names', () => {
  assert.equal(scene2DObjectLimits.sprites, 8);
  assert.deepEqual(validateCapabilities(v3With(defaults)).config['gg.sprites'], defaults);
  const eight = withSprites([hero, ...Array.from({length: 7}, (_, index) => sprite(index + 2))]);
  assert.deepEqual(validateCapabilities(v3With(eight)).config['gg.sprites'], eight);
  const rejects = (config, pattern, label) => {
    assert.throws(() => validateCapabilities(v3With(config)), pattern, label);
    assert.throws(() => validateScene2DObjects(config), pattern, label);
  };
  const invalid = [
    [withSprites([]), 'sin sprites'],
    [withSprites([hero, ...Array.from({length: 8}, (_, index) => sprite(index + 2))]), 'nueve sprites'],
    [withSprites([hero, {...sprite(2), id: 'hero'}]), 'ID repetido'],
    [withSprites([hero, {...sprite(2), name: 'hero'}]), 'nombre repetido'],
    [withSprites([hero, {...sprite(2), name: 'HERO'}]), 'nombre repetido sin distinguir mayúsculas'],
    [withSprites([{...hero, id: 'stage'}]), 'ID reservado del escenario'],
    [withSprites([{...hero, id: 'con espacio'}]), 'ID con espacio'],
    [withSprites([{...hero, id: ''}]), 'ID vacío'],
    [withSprites([{...hero, name: ''}]), 'nombre vacío'],
    [withSprites([{...hero, name: ' hero'}]), 'nombre con espacios alrededor'],
    [withSprites([{...hero, name: 'he\u0007ro'}]), 'nombre con control'],
    [withSprites([{...hero, name: 'x'.repeat(scene2DObjectLimits.nameLength + 1)}]), 'nombre largo'],
    [withSprites([{...hero, x: 241}]), 'x fuera del escenario'],
    [withSprites([{...hero, y: -181}]), 'y fuera del escenario'],
    [withSprites([{...hero, direction: 181}]), 'dirección fuera de rango'],
    [withSprites([{...hero, size: 1001}]), 'tamaño grande'],
    [withSprites([{...hero, visible: 'yes'}]), 'visible no booleano'],
    [withSprites([{...hero, costume: 'a b'}]), 'disfraz inválido'],
    [withSprites([hero, {...sprite(2), id: '__proto__'}]), 'ID __proto__'],
    [withSprites([{...hero, costume: '__proto__'}]), 'disfraz __proto__'],
    [{stage: {backdrop: '__proto__'}, sprites: [hero]}, 'fondo __proto__'],
    [withSprites([(({visible, ...rest}) => rest)(hero)]), 'falta visible'],
    [withSprites([{...hero, layer: 1}]), 'propiedad extra'],
    [{...defaults, extra: true}, 'propiedad extra en la raíz'],
    [{sprites: [hero]}, 'falta el escenario'],
    [{stage: {backdrop: 'stage', color: 1}, sprites: [hero]}, 'propiedad extra en el escenario'],
    [{stage: {backdrop: ''}, sprites: [hero]}, 'fondo vacío'],
    [{initialScene: projectInitialScene}, 'forma de 0.2.0']
  ];
  for (const [config, label] of invalid) rejects(config, /GG packs/, label);
  // 0.2.0 and 0.1.0 keep their constant initialScene.
  assert.throws(() => validateCapabilities({locks: [spritesLock(sprites('0.2.0'))], config: {'gg.sprites': defaults}}), /GG packs/);
});

test('MS-003: the declared 0.2.0 → 0.3.0 migration turns initialScene into sprites[0] hero; the chain starts at 0.1.0', () => {
  const record = localPackMigrations.find(item => item.id === 'gg.sprites' && item.fromVersion === '0.2.0');
  assert.deepEqual(record, {id: 'gg.sprites', fromVersion: '0.2.0', toVersion: '0.3.0', rename: {}, config: 'scene2d-objects-from-initial-scene-v1'});
  assert.equal(record.blocks, undefined, 'no block transforms: IDs and types stay');
  assert.throws(() => validateMigrationRecord({...record, config: 'not-installed'}), /GG migraciones/);
  assert.deepEqual(findMigrationChain('gg.sprites', '0.1.0', '0.3.0', {catalog: localPackCatalog, records: localPackMigrations}).map(step => step.toVersion), ['0.2.0', '0.3.0']);
  // Pure: the input stays as it was.
  const before = {initialScene: {...projectInitialScene}};
  const copy = structuredClone(before);
  assert.deepEqual(scene2DObjectsFromInitialScene(before), defaults);
  assert.deepEqual(before, copy);
  assert.throws(() => scene2DObjectsFromInitialScene(defaults), /GG/);
  for (const version of ['0.1.0', '0.2.0']) {
    const old = createCapabilities(['gg.sprites', 'gg.score'], {versions: {'gg.sprites': version}});
    assert.deepEqual(availablePackUpdates(old), [{id: 'gg.sprites', fromVersion: version, toVersion: '0.3.0'}]);
    const migrated = migrateCapabilities(old, {id: 'gg.sprites', toVersion: '0.3.0'});
    assert.equal(spritesLock(migrated).version, '0.3.0');
    assert.deepEqual(spritesConfig(migrated), defaults);
    assert.deepEqual(migrated.config['gg.score'], old.config['gg.score']);
    assert.deepEqual(resolveCapabilities(migrated).initialScene, resolveCapabilities(old).initialScene);
    assert.deepEqual(availablePackUpdates(migrated), []);
  }
});

test('MS-004: 0.3.0 satisfies the exact dependencies of frozen packs on 0.1.0, one way only', () => {
  assert.deepEqual(localPackCompatibility.find(item => item.version === '0.3.0'), {id: 'gg.sprites', version: '0.3.0', satisfies: ['0.1.0']});
  for (const [ids, versions] of [[['gg.sprites', 'gg.score'], {}], [['gg.sprites', 'gg.microbit'], {}], [['gg.sprites', 'gg.assets'], {'gg.assets': '0.1.0'}],
    [['gg.sprites', 'gg.sb3'], {'gg.sb3': '0.2.0'}]]) {
    const capabilities = createCapabilities(ids, {versions: {...versions, 'gg.sprites': '0.3.0'}});
    assert.equal(spritesLock(capabilities).version, '0.3.0', ids.join());
    assert.deepEqual(validateCapabilities(capabilities), capabilities);
  }
  // A dependant without gg.sprites selected still gets the exact version it names.
  assert.equal(spritesLock(createCapabilities(['gg.score'])).version, '0.1.0');
  const score = localPackCatalog.find(item => item.manifest.id === 'gg.score' && item.manifest.version === '0.2.0');
  const dependant = {manifest: {...structuredClone(score.manifest), dependencies: [{id: 'gg.sprites', version: '0.3.0'}]}, sha256: 'b'.repeat(64)};
  const custom = localPackCatalog.filter(item => item.manifest.id !== 'gg.score').concat(dependant);
  assert.throws(() => createCapabilities(['gg.sprites', 'gg.score'], {versions: {'gg.sprites': '0.2.0'}, catalog: custom}), /dependencias en conflicto/);
});

test('MS-005: new projects lock 0.3.0 with sprites[0] = hero; they save, reopen and keep the single-sprite contract', async () => {
  assert.equal(latestPackVersions['gg.sprites'], '0.3.0');
  const capabilities = newProjectCapabilities();
  assert.equal(spritesLock(capabilities).version, '0.3.0');
  assert.deepEqual(spritesConfig(capabilities), defaults);
  assert.deepEqual(resolveCapabilities(capabilities).initialScene, {...projectInitialScene});
  assert.equal(resolveCapabilities(null).packs.find(pack => pack.id === 'gg.sprites').version, '0.1.0');
  assert.deepEqual(lockedPackVersions(capabilities), {'gg.sprites': '0.3.0'});
  const document = await createProject({name: 'Nuevo', blockly: heroPresents.blockly, deviceSource: '', catalog, capabilities});
  // Tarea 1.3: gg.sprites@0.3.0 is GGPROJ v6 with hero's workspace in authoring.scene2d (scene2d-authoring.test.mjs).
  assert.equal(document.version, 6);
  assert.deepEqual(document.authoring.scene2d, {stage: {}, sprites: {hero: heroPresents.blockly}});
  assert.equal(Object.hasOwn(document, 'scene'), false);
  const reopened = await parseProject(serializeProject(document), {catalog});
  assert.deepEqual(reopened, document);
  assert.deepEqual(spritesConfig(reopened.capabilities), defaults);
});

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
// Runs the lowered program in the local VM until the canonical final bubble
// («¡Mira cómo reboto!») and returns the stable part of the hero state.
async function runToFinal(ir) {
  const {project} = toScratchProject(ir);
  const blank = project.targets[1].costumes[0];
  project.targets[1].costumes = [blank, {...blank, name: 'alt'}];
  const vm = await createScratchSession(project);
  try {
    const state = () => {
      const target = vm.runtime.getSpriteTargetByName('hero'), bubble = target.getCustomState('Scratch.looks');
      return {size: target.size, visible: target.visible, costume: target.currentCostume, bubble: bubble?.text ? {type: bubble.type, text: bubble.text} : null};
    };
    const initial = {...state(), x: vm.runtime.getSpriteTargetByName('hero').x, threads: vm.runtime.threads.length};
    vm.greenFlag();
    for (let waited = 0; state().bubble?.text !== '¡Mira cómo reboto!' && waited < 10000; waited += 50) await delay(50);
    const final = state();
    vm.stopAll();
    return {initial, final, stopped: vm.runtime.threads.length};
  } finally { vm.quit(); }
}

test('MS-006: a migrated single-sprite project keeps its blocks and IDs and runs exactly like before', {timeout: 60000}, async () => {
  for (const [version, blockly] of [['0.2.0', heroPresents.blockly], ['0.1.0', editableExample]]) {
    const before = sprites(version);
    const document = await createProject({name: 'Antes', blockly, deviceSource: '', catalog, capabilities: before});
    const original = structuredClone(document);
    const {document: migrated, summary} = await migrateProject(document, availablePackUpdates(before), {catalog});
    assert.deepEqual(document, original, 'copy-on-write');
    assert.deepEqual(summary, [{id: 'gg.sprites', fromVersion: version, toVersion: '0.3.0', steps: version === '0.1.0' ? 2 : 1, changedBlocks: 0}]);
    // Tarea 1.3: the single workspace becomes hero's in GGPROJ v6; the rest of the authoring is unchanged.
    const {blockly: single, ...rest} = document.authoring;
    assert.deepEqual(migrated.authoring, {scene2d: {stage: {}, sprites: {hero: single}}, ...rest}, 'same blocks, IDs, shadows and positions');
    assert.deepEqual(migrated.resources, document.resources);
    assert.deepEqual(spritesConfig(migrated.capabilities), defaults);
    assert.deepEqual(await parseProject(serializeProject(migrated), {catalog}), migrated);
    const irBefore = irOf(blockly, before), irAfter = irOf(projectBlocklyWorkspace(migrated), migrated.capabilities);
    assert.deepEqual(irAfter, irBefore);
    assert.deepEqual(toScratchProject(irAfter), toScratchProject(irBefore));
  }
  // Execution: the same program, lowered from both profiles, reaches the same final state in the VM and stops.
  const before = sprites('0.2.0');
  const after = migrateCapabilities(before, {id: 'gg.sprites', toVersion: '0.3.0'});
  const [old, next] = [await runToFinal(irOf(heroPresents.blockly, before)), await runToFinal(irOf(heroPresents.blockly, after))];
  assert.deepEqual(next.initial, old.initial);
  assert.equal(next.initial.threads, 0, 'loading does not run anything');
  // Without a renderer the VM does not apply size changes, so size is compared between runs only.
  assert.deepEqual((({size, ...rest}) => rest)(old.final), {visible: true, costume: 1, bubble: {type: 'say', text: '¡Mira cómo reboto!'}});
  assert.deepEqual(next.final, old.final);
  assert.equal(next.stopped, 0);
  assert.equal(old.stopped, 0);
});
