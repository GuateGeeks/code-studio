import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {createProjectUI} from '../../src/studio/project-ui.mjs';
import {createTextDocumentsUI} from '../../src/studio/text-documents-ui.mjs';
import {createProject, serializeProject} from '../../src/project-format.mjs';
import {newProjectCapabilities, resolveCapabilities} from '../../src/contracts/packs.mjs';
import {latestPackVersions, legacyPackVersions} from '../../src/packs/catalog.mjs';
import {offeredCoreStructures} from '../../src/contracts/language-table.mjs';
import {createContributions} from '../../src/editor/contributions.mjs';
import {buildProjectCatalog} from '../../tools/f1/build-project-catalog.mjs';

// R1 (29/10/2026): new projects (unsaved initial project and «Crear mi primera
// escena») start with explicit capabilities at the latest gg.sprites version;
// saved GGPROJ v1/v2 files keep opening unchanged at the legacy 0.1.0 profile.
// «Crear mi primera escena» needs IndexedDB (it saves the current work before
// replacing it): it is covered in Chromium by NP-BROWSER-001 in
// tests/browser/new-project-capabilities.spec.mjs.
const markup = await readFile(new URL('../../src/studio/index.html', import.meta.url), 'utf8');
const svg = await readFile(new URL('../../src/assets/stage.svg', import.meta.url), 'utf8');
const catalog = await buildProjectCatalog({assets: {[createHash('md5').update(svg).digest('hex')]: svg}, costumes: [], sounds: []});
const example = {blocks: {languageVersion: 0, blocks: [{type: 'gg_when_start', id: 'example-start', x: 20, y: 20,
  next: {block: {type: 'gg_move', id: 'example-move', inputs: {STEPS: {shadow: {type: 'math_number', id: 'example-steps', fields: {NUM: 10}}}}}}}]}};
const e1Blocks = ['gg_turn_right', 'gg_go_to', 'gg_glide', 'gg_bounce', 'gg_say', 'gg_think_for', 'gg_set_size', 'gg_next_costume', 'gg_show', 'gg_hide'];
const coreStructures = ['forever', 'repeatUntil', 'stopScript', 'waitUntil'];
const toolboxTypes = capabilities => new Set(JSON.stringify(createContributions(capabilities).toolbox).match(/"type":"[a-z_0-9]+"/g).map(item => item.slice(8, -1)));
const spritesVersion = capabilities => resolveCapabilities(capabilities).packs.find(pack => pack.id === 'gg.sprites').version;

function installDOM(t) {
  const dom = new JSDOM(markup, {url: 'http://127.0.0.1:4173/'});
  const previous = new Map();
  for (const [key, value] of Object.entries({document: dom.window.document, window: dom.window, indexedDB: undefined,
    fetch: async () => ({ok: true, json: async () => structuredClone(catalog)})})) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {configurable: true, writable: true, value});
  }
  t.after(() => {
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  });
  return dom;
}
// The editor is an injected transaction participant (as in project-draft-rollback):
// it starts as the shell does, with the built-in example and no capabilities.
function fakeEditor() {
  let blockly = structuredClone(example), capabilities = null;
  const listeners = new Set(), commits = [];
  return {commits,
    save: () => structuredClone(blockly), captureCapabilities: () => structuredClone(capabilities),
    prepare: (state, {capabilities: profile = null} = {}) => ({state: structuredClone(state), capabilities: structuredClone(profile)}),
    commit(candidate) { commits.push(candidate); blockly = structuredClone(candidate.state); capabilities = structuredClone(candidate.capabilities); for (const listener of listeners) listener(); },
    subscribe(callback) { listeners.add(callback); return () => listeners.delete(callback); }
  };
}
async function boot(t) {
  installDOM(t);
  const texts = createTextDocumentsUI(); texts.setReady(true);
  const editor = fakeEditor(), source = document.querySelector('#source');
  source.value = 'basic.showIcon(IconNames.Heart)';
  let stops = 0; const applied = [], diagnostics = [];
  const project = createProjectUI({editor, source, textDocuments: texts, stop: async () => { stops++; },
    onApplied: model => applied.push(model), onDiagnostic: record => diagnostics.push(record)});
  await project.ready();
  return {project, editor, texts, applied, diagnostics, stops: () => stops};
}

test('NP-001: a new project uses explicit capabilities at the catalog latest gg.sprites with the E1 vocabulary and core structures', () => {
  const capabilities = newProjectCapabilities();
  assert.deepEqual(capabilities.locks.map(lock => [lock.id, lock.version]), [['gg.sprites', latestPackVersions['gg.sprites']]]);
  assert.equal(latestPackVersions['gg.sprites'], '0.3.0', 'today the latest published gg.sprites is 0.3.0 (scene2d-multi-sprite)');
  assert.notEqual(latestPackVersions['gg.sprites'], legacyPackVersions['gg.sprites']);
  const types = toolboxTypes(capabilities);
  for (const type of [...e1Blocks, 'gg_forever', 'gg_repeat_until', 'gg_wait_until', 'gg_stop_all', 'gg_stop_script']) assert.ok(types.has(type), type);
  assert.deepEqual([...offeredCoreStructures(resolveCapabilities(capabilities).packs)].sort(), coreStructures);
  // The legacy profile (saved files without capabilities) still offers neither.
  const legacy = toolboxTypes(null);
  for (const type of [...e1Blocks, 'gg_forever', 'gg_repeat_until', 'gg_wait_until']) assert.equal(legacy.has(type), false, type);
  assert.deepEqual([...offeredCoreStructures(resolveCapabilities(null).packs)], []);
  // Each call returns a fresh validated profile.
  assert.notEqual(newProjectCapabilities(), newProjectCapabilities());
  assert.deepEqual(newProjectCapabilities(), capabilities);
});

test('NP-002: the unsaved initial project starts at the latest version, stays clean and runs nothing', async t => {
  const {project, editor, applied, diagnostics, stops} = await boot(t);
  assert.equal(project.state().recoveryStatus, 'unavailable'); // no IndexedDB here: an unsaved draft
  assert.equal(spritesVersion(editor.captureCapabilities()), '0.3.0');
  assert.deepEqual(editor.captureCapabilities(), newProjectCapabilities());
  assert.deepEqual(project.capabilities(), newProjectCapabilities());
  const exported = JSON.parse(await project.export());
  // gg.sprites@0.3.0 is GGPROJ v6: one workspace per 2D object (scene2d-multi-sprite 1.3).
  assert.equal(exported.version, 6);
  assert.equal(Object.hasOwn(exported, 'scene'), false);
  assert.deepEqual(exported.capabilities.locks.map(lock => [lock.id, lock.version]), [['gg.sprites', '0.3.0']]);
  // gg.sprites@0.3.0: the stage and one sprite «hero» with the same initial state as before.
  assert.deepEqual(exported.capabilities.config['gg.sprites'], {stage: {backdrop: 'stage'},
    sprites: [{id: 'hero', name: 'hero', x: 0, y: 0, direction: 90, size: 100, visible: true, costume: 'hero'}]});
  assert.deepEqual(resolveCapabilities(exported.capabilities).initialScene, {spriteId: 'hero', x: 0, y: 0, direction: 90, size: 100, costume: 'hero'});
  // Same blocks (IDs, shadows, positions) as the built-in example; only the profile changed.
  assert.deepEqual(exported.authoring.scene2d, {stage: {}, sprites: {hero: example}});
  assert.equal(Object.hasOwn(exported.authoring, 'blockly'), false);
  assert.deepEqual(exported.authoring.textDocuments, []);
  assert.equal(stops(), 0, 'installing the new-project profile never stops or runs a session');
  assert.equal(project.state().beforeUnloadPending, false, 'installing the profile is not a pending edit');
  assert.equal(applied.length, 1);
  assert.deepEqual(applied[0].capabilities, newProjectCapabilities());
  assert.deepEqual(diagnostics, [], 'the profile was installed without a project error');
});

test('NP-003: saved GGPROJ v1 and v2 files open identical at the legacy 0.1.0 profile and run nothing', async t => {
  const {project, editor, stops} = await boot(t);
  const stamp = {id: '0b5c2a3e-4f6d-4a7b-8c9d-0e1f2a3b4c5d', createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-01T10:00:00.000Z', revision: 4};
  const v1 = await createProject({name: 'Guardado v1', blockly: example, deviceSource: 'basic.showNumber(1)', catalog, ...stamp});
  const v2 = await createProject({name: 'Guardado v2', blockly: example, deviceSource: 'basic.showNumber(2)', textDocuments: [], selectedTextDocumentId: null, catalog, ...stamp});
  assert.deepEqual([v1.version, v2.version], [1, 2]);
  for (const saved of [v1, v2]) {
    const before = stops();
    await project.open(serializeProject(saved));
    assert.equal(editor.captureCapabilities(), null, 'no capabilities are added on open');
    assert.equal(project.capabilities(), null);
    assert.equal(spritesVersion(project.capabilities()), '0.1.0');
    assert.deepEqual([...offeredCoreStructures(resolveCapabilities(project.capabilities()).packs)], []);
    const reopened = JSON.parse(await project.export());
    const timeless = document => ({...document, project: {...document.project, revision: null, updatedAt: null}});
    assert.deepEqual(timeless(reopened), timeless(saved), 'same format, scene, authoring and resources');
    assert.equal(stops() - before, 1, 'opening only resets the runner');
  }
});

// Not reachable by a learner: the startup install only reads the built-in
// example and controls that stay disabled until start. Fault injection (an
// editor that rejects the new profile) stands in for an inconsistent build.
test('NP-004: if the new-project profile cannot be installed, the draft stays as it was, nothing runs and the message says so', async t => {
  installDOM(t);
  const texts = createTextDocumentsUI(); texts.setReady(true);
  const editor = fakeEditor(), source = document.querySelector('#source');
  source.value = 'basic.showIcon(IconNames.Heart)';
  const prepare = editor.prepare;
  editor.prepare = (state, options = {}) => { if (options.capabilities) throw new Error('perfil no instalado en esta compilación'); return prepare(state, options); };
  let stops = 0; const applied = [], diagnostics = [];
  const project = createProjectUI({editor, source, textDocuments: texts, stop: async () => { stops++; },
    onApplied: model => applied.push(model), onDiagnostic: record => diagnostics.push(record)});
  await project.ready();
  assert.equal(project.state().ready, true);
  assert.deepEqual(editor.commits, [], 'the draft was never replaced');
  assert.equal(editor.captureCapabilities(), null);
  assert.equal(project.capabilities(), null);
  assert.equal(stops, 0); assert.deepEqual(applied, []);
  assert.equal(project.state().beforeUnloadPending, false);
  assert.notEqual(document.querySelector('#project-status').textContent, 'Guardado en este navegador');
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].code, 'PROJECT_ERROR');
  assert.match(diagnostics[0].message, /^No se pudo preparar el proyecto nuevo con los bloques más recientes\. Puedes seguir editando con los bloques de siempre; no se ejecutó nada\. \(perfil no instalado en esta compilación\)$/);
  // The kept draft is still a valid project (legacy profile) that can be exported.
  const exported = JSON.parse(await project.export());
  assert.equal(exported.version, 1);
  assert.deepEqual(exported.authoring.blockly, example);
  assert.deepEqual(exported.scene, {spriteId: 'hero', x: 0, y: 0, direction: 90, size: 100, costume: 'hero'});
});
