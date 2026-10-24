import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import JSZip from 'jszip';
import {buildProjectCatalog} from '../../tools/f1/build-project-catalog.mjs';
import {createTone} from '../../tools/f0/tone.mjs';
import {createProject, parseProject, serializeProject, validateProject, projectLimits} from '../../src/project-format.mjs';
import {createProjectArchive, parseProjectArchive, archiveLimits} from '../../src/project-archive.mjs';
import {editableExample} from '../fixtures/corpus.blocks.mjs';
import {loadWorkspace, workspaceToIR} from '../../spikes/block-program.mjs';

const assets = {};
for (const name of ['stage', 'hero', 'hero-alt']) {
  const content = await readFile(new URL(`../../spikes/browser/assets/${name}.svg`, import.meta.url), 'utf8');
  assets[createHash('md5').update(content).digest('hex')] = content;
}
const tone = createTone().buffer;
assets[createHash('md5').update(tone).digest('hex')] = {type: 'Sound', format: 'wav', encoding: 'base64', data: tone.toString('base64')};
const catalog = await buildProjectCatalog({assets, costumes: [], sounds: []});
const valid = () => createProject({name: 'Mi proyecto de prueba', blockly: editableExample, deviceSource: 'basic.showNumber(7)', catalog});
const id = Object.keys(assets)[0];
const parse = document => parseProject(JSON.stringify(document), {catalog});
async function rewritten(archive, edit) {
  const zip = await JSZip.loadAsync(archive, {checkCRC32: true});
  await edit(zip);
  return zip.generateAsync({type: 'uint8array', compression: 'STORE'});
}
const central = archive => new DataView(archive.buffer, archive.byteOffset).getUint32(archive.length - 6, true);
const bytesView = bytes => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

test('GG-PROJ-001: JSON authoring round-trip preserves source IDs, assets, initial state and ownership', async () => {
  const document = await valid();
  const reopened = await parseProject(serializeProject(document), {catalog});
  assert.deepEqual(reopened, document);
  assert.equal(reopened.scene.x, 0);
  const originalWorkspace = loadWorkspace(editableExample);
  const reopenedWorkspace = loadWorkspace(reopened.authoring.blockly);
  try { assert.deepEqual(workspaceToIR(reopenedWorkspace), workspaceToIR(originalWorkspace)); }
  finally { originalWorkspace.dispose(); reopenedWorkspace.dispose(); }
  reopened.authoring.blockly.variables[0].name = 'copia';
  reopened.resources.assets[id] = 'alterado';
  assert.equal(document.authoring.blockly.variables[0].name, 'score');
  assert.equal(catalog.resources.assets[id], assets[id]);
});

test('GG-PROJ-002: truncated JSON and unsupported format/version fail explicitly', async () => {
  const document = await valid();
  await assert.rejects(parseProject('{"format":', {catalog}), /truncado/);
  for (const change of [{version: 2}, {format: 'scratch'}, {extensionURLs: ['https://example.invalid/x.js']}]) {
    await assert.rejects(parse({...document, ...change}), /GGPROJ/);
  }
});

test('GG-PROJ-002: resource mutations, unknown assets, locks and extension metadata are rejected', async () => {
  const mutations = [
    document => { delete document.resources.assets[id]; },
    document => { document.resources.assets[id] = 'https://example.invalid/asset.svg'; },
    document => { document.resources.integrity[id].sha256 = '0'.repeat(64); },
    document => { document.resources.assets['f'.repeat(32)] = '<svg />'; },
    document => { document.locks.blockly = '999.0.0'; },
    document => { document.authoring.blockly.extensions = {remote: 'https://example.invalid'}; }
  ];
  for (const mutate of mutations) { const document = await valid(); mutate(document); await assert.rejects(parse(document), /GGPROJ/); }
  const invalidCatalog = structuredClone(catalog);
  invalidCatalog.resources.integrity[id].sha256 = '0'.repeat(64);
  const document = await valid(); document.resources = structuredClone(invalidCatalog.resources);
  await assert.rejects(validateProject(document, {catalog: invalidCatalog}), /hash/);
});

test('GG-PROJ-002: UTF-8 size budgets and project metadata reject invalid imports', async () => {
  await assert.rejects(parseProject('x'.repeat(projectLimits.bytes + 1), {catalog}), /grande/);
  for (const mutate of [
    document => { document.authoring.blockly = {blocks: {padding: 'á'.repeat(32769)}}; },
    document => { document.authoring.deviceSource = 'á'.repeat(32769); },
    document => { document.project.name = ' '; },
    document => { document.project.revision = -1; },
    document => { document.project.updatedAt = '2026-02-31T00:00:00.000Z'; },
    document => { document.scene.x = 10; }
  ]) { const document = await valid(); mutate(document); await assert.rejects(parse(document), /GGPROJ/); }
  const poisoned = JSON.parse(JSON.stringify(await valid()));
  poisoned.authoring.blockly.blocks = JSON.parse('{"__proto__":{"polluted":true}}');
  await assert.rejects(parse(poisoned), /propiedad no permitida/);
  assert.equal({}.polluted, undefined);
});

test('GG-PROJ-001: property order has no semantic effect on supported catalogs', async () => {
  const document = await valid();
  document.locks = Object.fromEntries(Object.entries(document.locks).reverse());
  document.resources = Object.fromEntries(Object.entries(document.resources).reverse());
  assert.deepEqual((await parse(document)).resources.assets, catalog.resources.assets);
});

test('GG-PROJ-001: GGPROJ ZIP exports validate with independent JSZip CRC32 checks', async () => {
  const document = await valid();
  const archive = await createProjectArchive(document, {catalog});
  const zip = await JSZip.loadAsync(archive, {checkCRC32: true});
  assert.equal(Object.keys(zip.files).length, 5);
  const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
  assert.equal(manifest.resources.assets[id].entry, `assets/${id}.svg`);
  assert.equal(await zip.file(`assets/${id}.svg`).async('string'), assets[id]);
  assert.deepEqual(await parseProjectArchive(archive, {catalog}), document);
});

test('GG-PROJ-001: GGPROJ ZIP created independently with JSZip STORE reopens exactly', async () => {
  const document = await valid();
  const original = await JSZip.loadAsync(await createProjectArchive(document, {catalog}));
  const independent = new JSZip();
  for (const [name, file] of Object.entries(original.files)) independent.file(name, await file.async('uint8array'), {createFolders: false});
  const archive = await independent.generateAsync({type: 'uint8array', compression: 'STORE'});
  assert.deepEqual(await parseProjectArchive(archive, {catalog}), document);
});

test('GG-PROJ-002: ZIP truncation, traversal, duplicate entries and declared expansion are rejected before reading data', async () => {
  const archive = await createProjectArchive(await valid(), {catalog});
  await assert.rejects(parseProjectArchive(archive.slice(0, -5), {catalog}), /ZIP/);
  const traversal = await rewritten(archive, async zip => { zip.file('../evil.svg', 'evil', {createFolders: false}); });
  await assert.rejects(parseProjectArchive(traversal, {catalog}), /ruta no permitida/);
  const duplicate = archive.slice();
  const d = bytesView(duplicate); const cd = central(duplicate);
  const firstNameLength = d.getUint16(cd + 28, true);
  const second = cd + 46 + firstNameLength;
  // Two fixed asset filenames have identical byte lengths.
  const third = second + 46 + d.getUint16(second + 28, true);
  duplicate.set(duplicate.subarray(second + 46, second + 46 + d.getUint16(second + 28, true)), third + 46);
  await assert.rejects(parseProjectArchive(duplicate, {catalog}), /duplicada/);
  const bomb = archive.slice(); const b = bytesView(bomb); const bcd = central(bomb);
  b.setUint32(bcd + 20, archiveLimits.expandedBytes + 1, true); b.setUint32(bcd + 24, archiveLimits.expandedBytes + 1, true);
  await assert.rejects(parseProjectArchive(bomb, {catalog}), /límite de expansión/);
  await assert.rejects(parseProjectArchive(new Uint8Array(archiveLimits.bytes + 1), {catalog}), /demasiado grande/);
});

test('GG-PROJ-002: ZIP CRC and local/central discrepancies reject corrupted archive content', async () => {
  const archive = await createProjectArchive(await valid(), {catalog});
  const corrupted = archive.slice(); corrupted[50] ^= 1;
  await assert.rejects(parseProjectArchive(corrupted, {catalog}), /CRC32/);
  const mismatch = archive.slice(); bytesView(mismatch).setUint32(18, 0, true);
  await assert.rejects(parseProjectArchive(mismatch, {catalog}), /no coinciden/);
});

test('GG-PROJ-002: ZIP assets and manifest must agree with pinned resource contents and references', async () => {
  const archive = await createProjectArchive(await valid(), {catalog});
  const missing = await rewritten(archive, async zip => { zip.remove(`assets/${id}.svg`); });
  await assert.rejects(parseProjectArchive(missing, {catalog}), /ausentes/);
  const foreign = await rewritten(archive, async zip => { zip.file(`assets/${id}.svg`, '<svg>foreign</svg>', {createFolders: false}); });
  await assert.rejects(parseProjectArchive(foreign, {catalog}), /recursos desconocidos/);
  const reference = await rewritten(archive, async zip => {
    const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
    manifest.resources.assets[id].entry = 'https://example.invalid/hero.svg';
    zip.file('manifest.json', JSON.stringify(manifest));
  });
  await assert.rejects(parseProjectArchive(reference, {catalog}), /referencia de asset/);
});

test('GG-PROJ-002: unsupported ZIP compression, encryption and symlinks fail explicitly', async () => {
  const archive = await createProjectArchive(await valid(), {catalog});
  const zip = await JSZip.loadAsync(archive);
  const compressed = await zip.generateAsync({type: 'uint8array', compression: 'DEFLATE'});
  await assert.rejects(parseProjectArchive(compressed, {catalog}), /requiere STORE/);
  for (const kind of ['encrypted', 'symlink']) {
    const changed = archive.slice(); const data = bytesView(changed); const cd = central(changed);
    if (kind === 'encrypted') data.setUint16(cd + 8, 1, true);
    else data.setUint32(cd + 38, 0xa1ff0000, true);
    await assert.rejects(parseProjectArchive(changed, {catalog}), /cifrado, enlaces/);
  }
});
