import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve, relative} from 'node:path';
import {loadavg} from 'node:os';
import {isDeepStrictEqual} from 'node:util';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {codeViewMutationCases, allNodes} from '../../tests/fixtures/code-view-mutations.mjs';
import {reconcileCodeViewIdentity} from '../../src/code-view-identity.mjs';
import {loadWorkspace, workspaceToIR} from '../../src/editor/block-program.mjs';
import {workspaceFromIR, captureNumericInputIdentity} from '../../src/editor/workspace-from-ir.mjs';
import {generateApi3ProgramSource} from '../../src/generated-program-source.mjs';
import {validateProgram} from '../../src/contracts/program-contract.mjs';

// Experimental property gate for synced-code-views 1.2; not a product server.
// The worker receives source + existing sourceMap/variableIds, never the old IR.
const root = resolve(import.meta.dirname, '../..');
const output = resolve(root, process.argv[2] ?? ('artifacts/synced-code-views/viability-' + new Date().toISOString().replace(/[:.]/g, '-')));
if (!relative(resolve(root, 'artifacts/synced-code-views'), output) ||
    relative(resolve(root, 'artifacts/synced-code-views'), output).startsWith('..'))
  throw new Error('La evidencia debe usar una carpeta nueva dentro de artifacts/synced-code-views/.');
await mkdir(output); // Refuse overwriting an earlier attempt.
const require = createRequire(resolve(root, '../xcratch-scratch-editor/package.json'));
const webpack = require('webpack');
await new Promise((done, reject) => {
  const compiler = webpack({mode: 'development', cache: false, devtool: false, target: 'webworker', context: root,
    entry: resolve(root, 'spikes/synced-code-views/feasibility-worker.mjs'),
    experiments: {outputModule: true}, resolve: {modules: [resolve(root, 'node_modules'), 'node_modules']},
    output: {path: output, filename: 'feasibility-worker.bundle.mjs', library: {type: 'module'}}});
  compiler.run((error, stats) => compiler.close(closeError => {
    if (error || closeError || stats?.hasErrors()) reject(error ?? closeError ?? new Error(stats.toString('errors-warnings')));
    else done();
  }));
});
const bundle = await readFile(resolve(output, 'feasibility-worker.bundle.mjs'));
const servers = [];
let browser;
const report = {recordedAt: new Date().toISOString(), kind: 'browser-worker-structural-property', loadavgBeforeBrowser: loadavg(),
  shellOrigin: 'http://127.0.0.1:4173', languageOrigin: 'http://127.0.0.1:4176', corpus: [], accepted: false};
console.log('Carga antes del navegador:', report.loadavgBeforeBrowser.join(' '));
function server(port, language) {
  const instance = createServer((request, response) => {
    response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; worker-src 'self'; frame-src http://127.0.0.1:4176; frame-ancestors http://127.0.0.1:4173");
    response.setHeader('Cache-Control', 'no-store');
    if (language && request.url === '/feasibility-worker.bundle.mjs') {
      response.setHeader('Content-Type', 'text/javascript'); response.end(bundle); return;
    }
    if (request.url !== '/') { response.writeHead(404); response.end(); return; }
    response.setHeader('Content-Type', 'text/html');
    response.end(language ? '<!doctype html><title>Prueba del origen de lenguaje</title><body>Worker de viabilidad</body>'
      : '<!doctype html><title>Prueba de viabilidad</title><iframe id="language" src="http://127.0.0.1:4176/"></iframe>');
  });
  return new Promise((done, reject) => {
    instance.once('error', reject);
    instance.listen(port, '127.0.0.1', () => { servers.push(instance); done(); });
  });
}
function identity(workspace) {
  return workspace.getAllBlocks(false).map(block => ({id: block.id, type: block.type, shadow: block.isShadow()})).sort((a, b) => a.id.localeCompare(b.id));
}
try {
  await server(4173, false); await server(4176, true);
  browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(report.shellOrigin);
  await page.frameLocator('#language').locator('body').waitFor();
  const frame = page.frames().find(item => item.url() === report.languageOrigin + '/');
  if (!frame) throw new Error('No se encontró el origen aislado del lenguaje.');
  async function parseInWorker(payload) {
    return frame.evaluate(payload => new Promise((done, reject) => {
      const worker = new Worker('/feasibility-worker.bundle.mjs', {type: 'module'});
      const timeout = setTimeout(() => { worker.terminate(); reject(new Error('El worker no respondió.')); }, 15000);
      worker.onerror = error => { clearTimeout(timeout); worker.terminate(); reject(new Error(error.message)); };
      worker.onmessage = ({data}) => { clearTimeout(timeout); worker.terminate(); done(data); };
      worker.postMessage(payload);
    }), payload);
  }
  const strip = ir => JSON.parse(JSON.stringify(ir, (key, value) => key === 'sourceBlockId' ? undefined : value));
  const cases = codeViewMutationCases();
  for (const fixture of cases) {
    const {name, kind, previous, expected, source, metadata, sidecar, excluded} = fixture;
    const parsed = await parseInWorker({requestId: name, source, metadata});
    assert.equal(parsed.origin, report.languageOrigin); assert.equal(parsed.executed, false);
    assert.ok(!parsed.error, name + ': ' + parsed.error);
    const candidate = validateProgram(parsed.ir);
    const result = reconcileCodeViewIdentity(previous, candidate, sidecar);
    assert.deepEqual(strip(result.ir), strip(expected), name);
    const oldIDs = new Set(allNodes(previous).map(node => node.sourceBlockId));
    const actual = allNodes(result.ir), oracle = allNodes(expected);
    let retainedNodes = 0;
    for (let i = 0; i < actual.length; i++) if (oldIDs.has(oracle[i].sourceBlockId) && !excluded.includes(oracle[i].sourceBlockId)) {
      assert.equal(actual[i].sourceBlockId, oracle[i].sourceBlockId, name + ': ' + oracle[i].sourceBlockId); retainedNodes++;
    }
    const missingGlobalDeclaration = (expected.variables ?? []).some(variable => variable.scope === 'global' &&
      !oracle.some(node => node.kind === 'setVariable' && node.variableId === variable.id));
    if (missingGlobalDeclaration) {
      assert.throws(() => workspaceFromIR(result.ir, result), /roundtrip exacto/);
      report.corpus.push({name, kind, workerOrigin: parsed.origin, propertyPassed: true, retainedNodes,
        conversion: 'rejected-before-application', reason: 'Declaración global sin bloque de asignación global.'});
      continue;
    }
    const workspace = loadWorkspace(workspaceFromIR(result.ir, result));
    try {
      assert.deepEqual(strip(workspaceToIR(workspace)), strip(expected), name);
      const numeric = captureNumericInputIdentity(workspace);
      for (const entry of result.numericInputIdentity) assert.deepEqual(numeric.find(item => item.id === entry.id), entry, name);
      for (const point of result.layout) assert.deepEqual({...workspace.getBlockById(point.sourceBlockId).getRelativeToSurfaceXY()}, {x: point.x, y: point.y}, name);
      report.corpus.push({name, kind, workerOrigin: parsed.origin, propertyPassed: true, retainedNodes,
        numericInputs: numeric.length, conversion: 'reconstructed-exactly', layoutPreserved: true});
    } finally { workspace.dispose(); }
  }
  await writeFile(resolve(output, 'mutation-inputs.json'), JSON.stringify(cases, null, 2) + '\n');
  const rejected = await parseInWorker({requestId: 'no-eval', source: 'globalThis.__codeViewExecuted = true;\n',
    metadata: {sourceMap: [['root'], []]}});
  report.rejectsUnsupportedWithoutExecution = Boolean(rejected.error) && rejected.line === 1 && rejected.executed === false;
  const total = report.corpus.length;
  report.summary = {total, propertiesPassed: report.corpus.filter(item => item.propertyPassed).length,
    reconstructed: report.corpus.filter(item => item.conversion === 'reconstructed-exactly').length,
    rejectedBeforeApplication: report.corpus.filter(item => item.conversion === 'rejected-before-application').length,
    unchangedNodesVerified: report.corpus.reduce((sum, item) => sum + item.retainedNodes, 0)};
  report.accepted = total === cases.length && report.corpus.every(item => item.propertyPassed) && report.rejectsUnsupportedWithoutExecution;
} finally {
  await browser?.close();
  await Promise.all(servers.map(instance => new Promise((done, reject) => instance.close(error => error ? reject(error) : done()))));
}
await writeFile(resolve(output, 'results.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.summary));
console.log('Viabilidad aceptada:', report.accepted, 'Evidencia:', output);
process.exitCode = report.accepted ? 0 : 1;
