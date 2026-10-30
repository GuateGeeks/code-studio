import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {createProjectUI} from '../../src/studio/project-ui.mjs';
import {createTextDocumentsUI} from '../../src/studio/text-documents-ui.mjs';
import {createTextDocument} from '../../src/text-documents.mjs';
import {createProject, serializeProject} from '../../src/project-format.mjs';
import {createCapabilities, newProjectCapabilities} from '../../src/contracts/packs.mjs';
import {buildProjectCatalog} from '../../tools/f1/build-project-catalog.mjs';

const markup = await readFile(new URL('../../src/studio/index.html', import.meta.url), 'utf8');
const svg = await readFile(new URL('../../src/assets/stage.svg', import.meta.url), 'utf8');
const catalog = await buildProjectCatalog({assets: {[createHash('md5').update(svg).digest('hex')]: svg}, costumes: [], sounds: []});
function installDOM(t) {
  const dom = new JSDOM(markup, {url: 'http://127.0.0.1:4173/'});
  // This controller fixture mounts the textual editor without the shell registry.
  dom.window.document.querySelector('.text-authoring').hidden = false;
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
function input(dom, id, value) {
  const control = dom.window.document.querySelector(id); control.value = value;
  control.dispatchEvent(new dom.window.Event('input', {bubbles: true}));
}
test('GG-PROJECT: opaque checkpoints restore incomplete text drafts exactly and cannot be manufactured or imported', t => {
  const dom = installDOM(t); const texts = createTextDocumentsUI(); texts.setReady(true);
  const legacy = texts.checkpoint(); texts.add({language: 'javascript', source: 'console.log(1)'});
  texts.restoreDraft(legacy); assert.equal(texts.capture(), null);
  texts.commit({textDocuments: [], selectedTextDocumentId: null});
  const emptyV2 = texts.checkpoint(); texts.add({language: 'python', source: 'print(1)'});
  texts.restoreDraft(emptyV2); assert.deepEqual(texts.capture(), {textDocuments: [], selectedTextDocumentId: null});
  texts.add({language: 'javascript', name: 'Draft', source: 'original'});
  input(dom, '#text-name', ''); input(dom, '#text-source', 'x'.repeat(65537));
  const source = document.querySelector('#text-source'); source.focus(); source.setSelectionRange(3, 9, 'backward');
  source.scrollTop = 14; source.scrollLeft = 20;
  const before = texts.capture(); const checkpoint = texts.checkpoint();
  assert.deepEqual(Object.keys(checkpoint), []);
  assert.equal(Object.isFrozen(checkpoint), true);
  assert.throws(() => texts.prepare(before), /nombre de documento inválido/);
  for (const fake of [{}, JSON.parse(JSON.stringify(checkpoint)), structuredClone(checkpoint), null]) assert.throws(() => texts.restoreDraft(fake), /no pertenece/);
  texts.commit({textDocuments: [], selectedTextDocumentId: null}); texts.restoreDraft(checkpoint);
  assert.deepEqual(texts.capture(), before);
  assert.equal(source.value.length, 65537);
  assert.deepEqual([source.selectionStart, source.selectionEnd, source.selectionDirection], [3, 9, 'backward']);
  assert.equal(document.activeElement, source);
  assert.deepEqual([source.scrollTop, source.scrollLeft], [14, 20]);
  const detached = texts.capture(); detached.textDocuments[0].source = 'caller mutation';
  input(dom, '#text-source', 'another edit'); texts.restoreDraft(checkpoint);
  assert.deepEqual(texts.capture(), before);
  const foreign = createTextDocumentsUI();
  assert.throws(() => foreign.restoreDraft(checkpoint), /no pertenece/);
});
test('GG-PROJECT: an import commit failure restores an invalid editable draft, selected ID, editor profile and project identity', async t => {
  const dom = installDOM(t); const texts = createTextDocumentsUI(); texts.setReady(true);
  let blockly = {blocks: {languageVersion: 0, blocks: []}}; let capabilities = null;
  const listeners = new Set();
  // The editor is an injected transaction participant. Its internals and IR
  // translation are tested separately; these tests run both real UI modules.
  const editor = {
    save: () => structuredClone(blockly), captureCapabilities: () => structuredClone(capabilities),
    prepare: (state, {capabilities: profile = null} = {}) => ({state: structuredClone(state), capabilities: structuredClone(profile)}),
    commit(candidate) { blockly = structuredClone(candidate.state); capabilities = structuredClone(candidate.capabilities); for (const listener of listeners) listener(); },
    subscribe(callback) { listeners.add(callback); return () => listeners.delete(callback); }
  };
  const source = document.querySelector('#source'); source.value = 'original device source';
  document.querySelector('#project-name').value = 'Original project';
  let stops = 0; const applied = [], diagnostics = [];
  const project = createProjectUI({editor, source, textDocuments: texts, stop: async () => { stops++; }, onApplied: model => applied.push(model), onDiagnostic: record => diagnostics.push(record)});
  await project.ready();
  // Start from an ordinary new project (R1): its startup profile is installed,
  // so the profile to restore is explicit and differs from the imported one.
  // The incomplete draft is edited after start, as a learner would.
  assert.deepEqual(diagnostics, []);
  const profile = editor.captureCapabilities();
  assert.deepEqual(profile, newProjectCapabilities());
  const appliedBefore = applied.length;
  const original = texts.add({language: 'javascript', name: 'Original draft', source: 'const unfinished ='});
  input(dom, '#text-name', '');
  const draft = texts.capture();
  const previous = project.state();
  let fail = true;
  texts.subscribe(() => { if (fail) { fail = false; throw new Error('subscriber failed after applying imported text'); } });
  const imported = createTextDocument({language: 'python', name: 'Imported document', source: 'print(2)'});
  const model = await createProject({name: 'Imported project', blockly: {blocks: {languageVersion: 0, blocks: []}},
    deviceSource: 'imported device source', textDocuments: [imported], selectedTextDocumentId: imported.id,
    capabilities: createCapabilities(['gg.score']), catalog});
  await assert.rejects(project.open(serializeProject(model)), /subscriber failed/);
  assert.deepEqual(texts.capture(), draft);
  assert.equal(texts.selected().id, original.id);
  assert.equal(document.querySelector('#text-name').value, '');
  assert.equal(document.querySelector('#text-source').value, 'const unfinished =');
  assert.notDeepEqual(model.capabilities, profile);
  assert.deepEqual(editor.captureCapabilities(), profile);
  assert.equal(project.state().id, previous.id); assert.equal(project.state().name, previous.name);
  assert.equal(project.state().revision, previous.revision);
  assert.equal(source.value, 'original device source');
  assert.equal(stops, 0); assert.equal(applied.length, appliedBefore);
  assert.throws(() => texts.prepare(draft), /nombre de documento inválido/);
});
