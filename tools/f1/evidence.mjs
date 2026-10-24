import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, readdirSync, statSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {projectRoot} from '../../spikes/paths.mjs';
import {projectLimits} from '../../src/project-format.mjs';
import {archiveLimits} from '../../src/project-archive.mjs';
import {autosaveByteLimit, autosaveDatabaseName} from '../../src/autosave-store.mjs';

const absolute = file => resolve(projectRoot, file);
const read = file => JSON.parse(readFileSync(absolute(file), 'utf8'));
const fail = message => { throw new Error(`F1 evidence: ${message}`); };
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const fingerprint = file => {
  const data = readFileSync(absolute(file));
  return {file, bytes: data.length, sha256: sha256(data)};
};

const tapFile = 'artifacts/f1-integration.tap';
const tap = readFileSync(absolute(tapFile), 'utf8');
const tapNumber = key => Number(tap.match(new RegExp(`^# ${key} (\\d+(?:\\.\\d+)?)\\s*$`, 'm'))?.[1] ?? NaN);
const nodeIntegration = Object.fromEntries(['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo', 'duration_ms'].map(key => [key, tapNumber(key)]));
if (nodeIntegration.tests !== 44 || nodeIntegration.pass !== 44 || ['fail', 'cancelled', 'skipped', 'todo'].some(key => nodeIntegration[key] !== 0) || !Number.isFinite(nodeIntegration.duration_ms)) {
  fail('se requiere la suite Node completa: 44 aprobadas, cero fallos, cancelaciones, omisiones o pendientes');
}

const browser = read('artifacts/browser-results.json');
if (browser.stats?.expected !== 33 || browser.stats.unexpected !== 0 || browser.stats.skipped !== 0 || browser.stats.flaky !== 0 || browser.errors?.length) {
  fail('se requiere la regresión Chromium completa: 33 aprobadas, cero fallos, omisiones o flaky');
}
const browserStartedAt = Date.parse(browser.stats.startTime);
if (!Number.isFinite(browserStartedAt)) fail('la corrida Chromium no tiene fecha de inicio válida');
const cases = Object.fromEntries(['portable', 'autosave', 'atomic-rejections', 'recovery', 'storage-unavailable', 'quota', 'stop-reopen', 'overlapping-recovery'].map(name => {
  const file = `artifacts/f1-${name}.json`;
  if (statSync(absolute(file)).mtimeMs < browserStartedAt) fail(`${file} es anterior a la corrida completa; no publicar evidencia acotada o vieja`);
  return [name, read(file)];
}));
for (const name of ['portable', 'autosave', 'atomic-rejections', 'stop-reopen', 'overlapping-recovery']) {
  if (cases[name].authoringPreserved !== true) fail(`${name} no registra conservación de autoría`);
}
if (!cases.portable.freshContext || !cases.portable.sourcePreserved || cases.portable.initialX !== 0) fail('la apertura portable no registra contexto limpio, fuente y estado inicial');
if (!cases['atomic-rejections'].originalSessionStillValid || !cases['atomic-rejections'].rejected?.length || !cases['atomic-rejections'].invalidArchives?.length) fail('faltan rechazos atómicos de documento y contenedor');
if (!cases.recovery.backupPreserved || !cases.recovery.corruptRecordsPreserved) fail('falta conservación del respaldo o las copias corruptas');
if (!cases.quota.failedWritePreservedRecords) fail('la escritura fallida no registra conservación de la última copia');
if (!cases['stop-reopen'].previousFrameDetached) fail('falta descarte del ejecutor anterior');
if (!cases['storage-unavailable'].diagnostic || !(cases['storage-unavailable'].portableBytes > 0)) fail('falta diagnóstico/exportación con almacenamiento denegado');
if (!cases['overlapping-recovery'].flushStartedBeforeRecovery || !cases['overlapping-recovery'].outcomes?.every(outcome => outcome.settled)) fail('falta resolución de operaciones solapadas durante recuperación');

const portableFile = fingerprint('artifacts/f1-example.ggproj');
if (portableFile.bytes !== cases.portable.bytes || portableFile.sha256 !== cases.portable.sha256) fail('el archivo GGPROJ guardado no coincide con el descargado en la prueba');

const preservation = read('artifacts/baseline/verification.json');
if (!Array.isArray(preservation) || preservation.length !== 3 || preservation.some(item => item.sameCommit !== true || item.sameTrackedDiff !== true || item.sameLock !== true)) {
  fail('los tres upstreams deben conservar commit, diff versionado y lockfile');
}
const expectedRepositories = ['raspberrypi-blockly', 'xcratch-scratch-editor', 'pxt-microbit'];
if (expectedRepositories.some(name => preservation.filter(item => item.repository === name).length !== 1)) fail('la verificación upstream no contiene los tres repositorios esperados');

const srcFiles = readdirSync(absolute('src')).filter(file => file.endsWith('.mjs')).sort().map(file => `src/${file}`);
const shellFiles = ['spikes/browser/shell/project-ui.mjs', 'spikes/browser/shell/shell.js', 'spikes/browser/shell/index.html', 'spikes/browser/shell/style.css'];
const runnerFiles = ['spikes/browser/runner/runner.js', 'spikes/browser/runner/index.html'];
const sources = [...srcFiles, ...shellFiles, ...runnerFiles, 'spikes/browser/shell/editor-entry.mjs', 'tools/f0/build-browser.mjs', 'tools/f1/build-project-catalog.mjs', 'tools/f1/evidence.mjs'].map(fingerprint);
const copyPairs = [
  ...srcFiles.map(file => [file, `artifacts/browser/shell/project/${file.slice('src/'.length)}`]),
  ...shellFiles.map(file => [file, file.replace('spikes/browser/', 'artifacts/browser/')]),
  ...runnerFiles.map(file => [file, file.replace('spikes/browser/', 'artifacts/browser/')])
];
const builtCopies = copyPairs.map(([source, built]) => {
  const original = fingerprint(source);
  const copy = fingerprint(built);
  if (original.sha256 !== copy.sha256) fail(`${built} no coincide con ${source}; reconstruir y repetir las pruebas afectadas`);
  return {...copy, source, sourceMatches: true};
});
const manifest = read('artifacts/browser/build-manifest.json');
if (!Array.isArray(manifest.files) || !manifest.files.length) fail('falta manifiesto de bundles del build');
for (const file of manifest.files) {
  const path = file.file.startsWith('vendor/') ? `artifacts/browser/runner/${file.file}` : `artifacts/browser/${file.file}`;
  const measured = fingerprint(path);
  if (measured.bytes !== file.bytes || measured.sha256 !== file.sha256) fail(`${path} no coincide con el manifiesto del build`);
}
const catalogFile = 'artifacts/browser/shell/project-catalog.json';
const catalog = read(catalogFile);
if (!catalog.resources?.integrity || !catalog.locks) fail('falta catálogo con hashes y locks');
const browsers = read('node_modules/playwright-core/browsers.json');
const chromium = browsers.browsers.find(item => item.name === 'chromium-headless-shell');
if (!chromium?.browserVersion) fail('falta versión del navegador fijado');

const summary = {
  recordedAt: new Date().toISOString(),
  phase: 'F1: primer corte de persistencia, autosave y recuperación',
  command: 'npm run browser:build && npm test > artifacts/f1-integration.tap && npm run test:browser && node tools/f0/verify-baseline.mjs && node tools/f1/evidence.mjs',
  environment: {playwright: read('node_modules/@playwright/test/package.json').version, browser: chromium.browserVersion, revision: chromium.revision, node: process.version, softwareWebGLFlag: '--enable-unsafe-swiftshader'},
  tests: {node: nodeIntegration, chromium: browser.stats, functionalF0RegressionCount: 25, persistenceBrowserCount: 8, retries: 0},
  reports: [fingerprint(tapFile), fingerprint('artifacts/browser-results.json')],
  cases,
  portableFile,
  format: {document: 'GGPROJ v1 JSON de autoría para IndexedDB', archive: 'GGPROJ v1 ZIP STORE con manifest.json y assets propios', projectLimits, archiveLimits, catalog: {...fingerprint(catalogFile), locks: catalog.locks, integrity: catalog.resources.integrity}},
  persistence: {database: autosaveDatabaseName, version: 1, objectStore: 'snapshots', keys: ['current', 'previous'], record: ['serialized', 'savedAt'], byteLimit: autosaveByteLimit, debounceMs: 400, confirmation: 'Solo después de transaction.complete; revisión actual/anterior atómicas. La cola conserva orden de validación y commit.', recovery: 'Validar current; si falla, previous. Ambas inválidas se conservan sin autosave hasta decisión explícita o importación válida.'},
  staticBuild: {builtAt: manifest.builtAt, files: manifest.files, audioFixture: manifest.audioFixture, catalog: fingerprint(catalogFile), builtCopies},
  sources,
  sourcePreservation: preservation,
  limits: [
    'La garantía de reapertura cubre la última revisión confirmada, no cambios pendientes del debounce al terminar el navegador.',
    'IndexedDB pertenece al origen/perfil del navegador; el archivo GGPROJ permite traslado a otra página o navegador de versión compatible.',
    'ZIP STORE solamente, catálogo propio fijado y locks compatibles; no editor/importador general de assets, SB3, compresión, cifrado o extensiones remotas.',
    'No se valida una segunda visita offline/PWA, fusión de pestañas, otros navegadores ni ausencia de fugas a largo plazo.',
    'Estas pruebas funcionales no repiten ni amplían las mediciones de rendimiento de F0.'
  ],
  physicalBoardValidated: false,
  schoolValidation: false,
  historicalF0EvidenceModified: false
};
mkdirSync(absolute('docs/phase-1'), {recursive: true});
writeFileSync(absolute('docs/phase-1/browser-evidence.json'), JSON.stringify(summary, null, 2) + '\n');
console.log('Evidencia F1 publicada: 44 Node y 33 Chromium aprobadas; F0 histórica conservada.');
