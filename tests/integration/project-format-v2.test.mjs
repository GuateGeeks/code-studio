import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import JSZip from 'jszip';
import {buildProjectCatalog} from '../../tools/f1/build-project-catalog.mjs';
import {createTone} from '../../tools/f0/tone.mjs';
import {createProject, parseProject, serializeProject, validateProject, projectLimits} from '../../src/project-format.mjs';
import {createProjectArchive, parseProjectArchive, archiveLimits} from '../../src/project-archive.mjs';
import {createTextDocument} from '../../src/text-documents.mjs';
import {editableExample} from '../fixtures/corpus.blocks.mjs';

const assets = {};
for (const name of ['stage', 'hero', 'hero-alt']) {
  const content = await readFile(new URL(`../../src/assets/${name}.svg`, import.meta.url), 'utf8');
  assets[createHash('md5').update(content).digest('hex')] = content;
}
const tone = createTone().buffer;
assets[createHash('md5').update(tone).digest('hex')] = {type: 'Sound', format: 'wav', encoding: 'base64', data: tone.toString('base64')};
const catalog = await buildProjectCatalog({assets, costumes: [], sounds: []});
const metadata = {id: 'f2937842-f45a-4575-84f8-b544da3b7b11', revision: 7, createdAt: '2026-10-22T00:00:00.000Z', updatedAt: '2026-10-22T00:00:01.000Z'};
const args = () => ({name: 'Documentos independientes', blockly: editableExample, deviceSource: 'basic.showNumber(7)', catalog, ...metadata});
const documents = () => [
  createTextDocument({language: 'javascript', name: 'Mi JS', source: 'for (let i = 0; i < 3; i++) {\n  await GG.sprite.move("hero", 4);\n}\n'}),
  createTextDocument({language: 'python', name: 'Python incompleto', source: 'async def unfinished(\n# Aún en edición\n'})
];
const valid = async () => {
  const textDocuments = documents();
  return createProject({...args(), textDocuments, selectedTextDocumentId: textDocuments[1].id});
};

test('GG-TEXT-001: V1 remains exact and V2 is opt-in even for an empty document array', async () => {
  const v1 = await createProject(args());
  assert.equal(v1.version, 1);
  assert.deepEqual(Object.keys(v1.authoring), ['blockly', 'deviceSource']);
  assert.deepEqual(v1.project, {id: metadata.id, name: 'Documentos independientes', revision: metadata.revision, createdAt: metadata.createdAt, updatedAt: metadata.updatedAt});
  assert.deepEqual(await parseProject(serializeProject(v1), {catalog}), v1);
  const v2 = await createProject({...args(), textDocuments: [], selectedTextDocumentId: null});
  assert.equal(v2.version, 2);
  assert.deepEqual(Object.keys(v2.authoring), ['blockly', 'deviceSource', 'textDocuments', 'selectedTextDocumentId']);
  assert.deepEqual(v2.authoring.textDocuments, []);
  assert.equal(v2.authoring.selectedTextDocumentId, null);
  assert.deepEqual(await parseProject(serializeProject(v2), {catalog}), v2);
  assert.equal((await parseProjectArchive(await createProjectArchive(v2, {catalog}), {catalog})).version, 2);
  assert.equal((await createProject({...args(), textDocuments: []})).authoring.selectedTextDocumentId, null);
  assert.deepEqual(v2.resources, v1.resources);
  assert.deepEqual(v2.locks, v1.locks);
});

test('GG-TEXT-001: V2 JSON round-trip retains IDs, source errors, selected document, metadata and 2D authoring', async () => {
  const textDocuments = documents();
  const input = structuredClone(textDocuments);
  const document = await createProject({...args(), textDocuments, selectedTextDocumentId: textDocuments[1].id});
  const original = structuredClone(document);
  assert.equal(document.version, 2);
  assert.deepEqual(document.authoring.textDocuments, input);
  assert.deepEqual(document.authoring.blockly, editableExample);
  assert.equal(document.authoring.deviceSource, 'basic.showNumber(7)');
  const reopened = await parseProject(serializeProject(document), {catalog});
  assert.deepEqual(reopened, document);
  reopened.authoring.textDocuments[0].source = 'changed';
  reopened.authoring.textDocuments[1].runtime.version = 'changed';
  textDocuments[0].source = 'changed input';
  assert.deepEqual(document, original);
  assert.equal(document.scene.x, 0);
  assert.equal(document.scene.costume, 'hero');
});

test('GG-TEXT-001: V2 ZIP STORE interoperates independently with JSZip, preserving exactly the supported authoring', async () => {
  for (const document of [await createProject(args()), await valid()]) {
    const before = structuredClone(document);
    const archive = await createProjectArchive(document, {catalog});
    const zip = await JSZip.loadAsync(archive, {checkCRC32: true});
    assert.equal(Object.keys(zip.files).length, 5);
    const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
    assert.equal(manifest.version, document.version);
    assert.deepEqual(manifest.authoring, document.authoring);
    assert.deepEqual(await parseProjectArchive(archive, {catalog}), before);
    const independent = new JSZip();
    for (const [name, file] of Object.entries(zip.files)) independent.file(name, await file.async('uint8array'), {createFolders: false});
    const rewritten = await independent.generateAsync({type: 'uint8array', compression: 'STORE'});
    assert.deepEqual(await parseProjectArchive(rewritten, {catalog}), before);
    assert.deepEqual(document, before);
  }
});

test('GG-TEXT-001: versions require their exact authoring schema and invalid imports never mutate the active model', async () => {
  const active = await valid();
  const before = structuredClone(active);
  const mutations = [
    value => { value.version = 1; }, value => { value.version = 3; },
    value => { delete value.authoring.textDocuments; },
    value => { delete value.authoring.selectedTextDocumentId; },
    value => { value.authoring.textDocuments[0].runtime.version = 'latest'; },
    value => { value.authoring.textDocuments[0].runtime.engine = 'pyodide'; },
    value => { value.authoring.textDocuments[1].language = 'javascript'; },
    value => { value.authoring.textDocuments.push(structuredClone(value.authoring.textDocuments[0])); },
    value => { value.authoring.selectedTextDocumentId = 'text-unknown'; },
    value => { value.authoring.generatedCode = 'compiled code'; },
    value => { value.authoring.textDocuments[0].compiled = 'binary.js'; },
    value => { value.authoring.textDocuments[0].logs = ['runtime']; },
    value => { value.locks.quickjs = '0.32.0'; },
    value => { value.resources.assets.foreign = 'remote'; },
    value => { value.scene.x = 22; }
  ];
  for (const [index, mutate] of mutations.entries()) {
    const candidate = structuredClone(active); mutate(candidate);
    const unchangedCandidate = structuredClone(candidate);
    await assert.rejects(parseProject(JSON.stringify(candidate), {catalog}), /GGPROJ/);
    // serializeProject checks structure; catalog membership is checked by parse/validate/archive.
    if (![12, 13].includes(index)) assert.throws(() => serializeProject(candidate), /GGPROJ/);
    await assert.rejects(createProjectArchive(candidate, {catalog}), /GGPROJ/);
    assert.deepEqual(candidate, unchangedCandidate);
    assert.deepEqual(active, before);
  }
  const v1 = await createProject(args());
  v1.authoring.selectedTextDocumentId = null;
  await assert.rejects(validateProject(v1, {catalog}), /propiedades/);
  assert.deepEqual(active, before);
});

test('GG-TEXT-001: invalid textual manifest is rejected after independent ZIP rewrite without changing source model', async () => {
  const active = await valid();
  const before = structuredClone(active);
  const archive = await createProjectArchive(active, {catalog});
  const zip = await JSZip.loadAsync(archive);
  const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
  manifest.authoring.textDocuments[0].runtime.version = '0.0.0';
  zip.file('manifest.json', JSON.stringify(manifest));
  const invalid = await zip.generateAsync({type: 'uint8array', compression: 'STORE'});
  await assert.rejects(parseProjectArchive(invalid, {catalog}), /runtime o versión/);
  assert.deepEqual(active, before);
  assert.deepEqual(await parseProjectArchive(archive, {catalog}), before);
});

test('GG-TEXT-001: total project and unchanged ZIP manifest budgets override individual document allowances', async () => {
  const large = Array.from({length: 8}, () => createTextDocument({language: 'javascript', source: 'a'.repeat(65536)}));
  const document = await createProject({...args(), textDocuments: large, selectedTextDocumentId: null});
  assert.ok(new TextEncoder().encode(serializeProject(document)).length < projectLimits.bytes);
  assert.equal(archiveLimits.manifestBytes, 512 * 1024);
  await assert.rejects(createProjectArchive(document, {catalog}), /entrada demasiado grande/);
  const validArchive = await createProjectArchive(await valid(), {catalog});
  const zip = await JSZip.loadAsync(validArchive);
  const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
  manifest.authoring.textDocuments = large;
  manifest.authoring.selectedTextDocumentId = null;
  zip.file('manifest.json', JSON.stringify(manifest));
  const oversizedManifest = await zip.generateAsync({type: 'uint8array', compression: 'STORE'});
  await assert.rejects(parseProjectArchive(oversizedManifest, {catalog}), /límite de expansión o entrada/);
  const expandedJSON = Array.from({length: 8}, () => createTextDocument({language: 'python', source: '\u0000'.repeat(65536)}));
  await assert.rejects(createProject({...args(), textDocuments: expandedJSON, selectedTextDocumentId: null}), /archivo demasiado grande/);
});
