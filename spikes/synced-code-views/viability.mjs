import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve, relative} from 'node:path';
import {loadavg} from 'node:os';
import {isDeepStrictEqual} from 'node:util';
import {chromium} from '@playwright/test';
import {corpus} from '../../tests/fixtures/corpus.blocks.mjs';
import {loadWorkspace, workspaceToIR} from '../../src/editor/block-program.mjs';
import {workspaceFromIR, captureNumericInputIdentity} from '../../src/editor/workspace-from-ir.mjs';
import {generateApi3ProgramSource} from '../../src/generated-program-source.mjs';
import {validateProgram} from '../../src/contracts/program-contract.mjs';

// Experimental acceptance probe for synced-code-views 1.1, not a product server.
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
const report = {recordedAt: new Date().toISOString(), kind: 'browser-worker-feasibility', loadavgBeforeBrowser: loadavg(),
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
  for (const [name, fixture] of Object.entries(corpus)) {
    const original = loadWorkspace(fixture);
    let restored;
    try {
      const ir = workspaceToIR(original), generated = generateApi3ProgramSource(ir, 'javascript');
      const result = await parseInWorker({requestId: name, source: generated.text,
        metadata: {sourceMap: generated.sourceMap, variableIds: generated.variableIds}});
      if (result.error) throw new Error(name + ': ' + result.error);
      if (result.origin !== report.languageOrigin || result.executed) throw new Error('El análisis no fue aislado o ejecutó texto.');
      const candidate = validateProgram(result.ir);
      const layout = original.getTopBlocks(true).map(block => ({sourceBlockId: block.id, ...block.getRelativeToSurfaceXY()}));
      const numericInputIdentity = captureNumericInputIdentity(original);
      const state = workspaceFromIR(candidate, {layout, numericInputIdentity});
      restored = loadWorkspace(state);
      const before = identity(original), after = identity(restored);
      const lost = before.filter(block => !after.some(other => other.id === block.id && other.type === block.type));
      const added = after.filter(block => !before.some(other => other.id === block.id && other.type === block.type));
      const exactIR = isDeepStrictEqual(candidate, ir) && isDeepStrictEqual(workspaceToIR(restored), ir);
      const exactBlockIDs = isDeepStrictEqual(before, after);
      const roots = workspace => workspace.getTopBlocks(true).map(block => ({id: block.id, ...block.getRelativeToSurfaceXY()}));
      const exactLayout = isDeepStrictEqual(roots(original), roots(restored));
      report.corpus.push({name, workerOrigin: result.origin, exactIR, exactBlockIDs, exactLayout,
        beforeBlocks: before.length, afterBlocks: after.length, lost, added});
      await writeFile(resolve(output, name + '.json'), JSON.stringify({source: generated.text, sourceMap: generated.sourceMap,
        numericInputIdentity, beforeIR: ir, candidateIR: candidate, restoredIR: workspaceToIR(restored), before, after}, null, 2) + '\n');
      console.log(name + ': IR=' + exactIR + ', todos los IDs=' + exactBlockIDs + ', layout=' + exactLayout + ', IDs perdidos=' + lost.length);
    } finally { restored?.dispose(); original.dispose(); }
  }
  const rejected = await parseInWorker({requestId: 'no-eval', source: 'globalThis.__codeViewExecuted = true;\n',
    metadata: {sourceMap: [['root'], []]}});
  report.rejectsUnsupportedWithoutExecution = Boolean(rejected.error) && rejected.line === 1 && rejected.executed === false;
  const total = report.corpus.length;
  report.summary = {total, sameProgram: report.corpus.filter(item => item.exactIR).length,
    allBlockIDs: report.corpus.filter(item => item.exactBlockIDs).length,
    sameLayout: report.corpus.filter(item => item.exactLayout).length,
    lostIDs: report.corpus.flatMap(item => item.lost).length};
  report.accepted = total === Object.keys(corpus).length && report.corpus.every(item => item.exactIR && item.exactBlockIDs && item.exactLayout) && report.rejectsUnsupportedWithoutExecution;
} finally {
  await browser?.close();
  await Promise.all(servers.map(instance => new Promise((done, reject) => instance.close(error => error ? reject(error) : done()))));
}
await writeFile(resolve(output, 'results.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.summary));
console.log('Viabilidad aceptada:', report.accepted, 'Evidencia:', output);
process.exitCode = report.accepted ? 0 : 1;
