import {readFileSync, writeFileSync, statSync} from 'node:fs';
import {resolve} from 'node:path';
import {projectRoot} from '../../spikes/paths.mjs';
const read = file => JSON.parse(readFileSync(resolve(projectRoot, file), 'utf8'));
const browserResults = read('artifacts/browser-results.json');
if (browserResults.stats.unexpected || browserResults.stats.expected !== 25 || browserResults.stats.skipped || browserResults.stats.flaky) throw new Error('The complete 25-test browser suite must pass before publishing evidence');
const tap = readFileSync(resolve(projectRoot, 'artifacts/integration.tap'), 'utf8');
const tapNumber = key => Number(tap.match(new RegExp(`^# ${key} (\\d+)$`, 'm'))?.[1] ?? NaN);
const nodeIntegration = Object.fromEntries(['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo'].map(key => [key, tapNumber(key)]));
if (nodeIntegration.tests !== 30 || nodeIntegration.pass !== 30 || ['fail', 'cancelled', 'skipped', 'todo'].some(key => nodeIntegration[key] !== 0)) throw new Error('The complete 30-test Node suite must pass before publishing evidence');
const compiler = read('artifacts/browser-pxt-evidence.json');
const offline = read('artifacts/browser-offline-evidence.json');
const browserBuild = read('artifacts/browser/build-manifest.json');
const browsers = read('node_modules/playwright-core/browsers.json');
const chromium = browsers.browsers.find(item => item.name === 'chromium-headless-shell');
const summary = {
  recordedAt: new Date().toISOString(),
  environment: {playwright: read('node_modules/@playwright/test/package.json').version, browser: chromium.browserVersion, revision: chromium.revision, node: process.version, softwareWebGLFlag: '--enable-unsafe-swiftshader'},
  tests: browserResults.stats,
  nodeIntegration,
  render: read('artifacts/browser-render-evidence.json'),
  corpus: Object.fromEntries(['events', 'messages', 'clones', 'stop', 'variables', 'audio', 'audio-block-stop', 'audio-stop', 'global-variables', 'costumes', 'concurrent'].map(name => [name, read(`artifacts/corpus-${name}.json`)])),
  simulator: Object.fromEntries(['heart', 'button', 'stop'].map(name => [name, read(`artifacts/simulator-${name}.json`)])),
  bindings: Object.fromEntries(['editor', 'stale', 'validation'].map(name => [name, read(`artifacts/bindings-${name}.json`)])),
  compiler: {success: compiler.native.success, outfiles: compiler.native.outfiles, worker: compiler.native.environment, hexRequests: compiler.native.hexRequests, networkAttempts: compiler.native.networkAttempts, invalidSourceDiagnostics: compiler.invalid.diagnostics, physicalBoardValidated: false},
  offline,
  staticBuild: {files: browserBuild.files, audioFixture: browserBuild.audioFixture, compilerPackBytes: statSync(resolve(projectRoot, 'artifacts/browser/runner/compiler-pack.json')).size},
  sourcePreservation: read('artifacts/baseline/verification.json')
};
const performance = read('docs/phase-0/performance-evidence.json');
if (!performance.gates.functionalStability) throw new Error('Ten-cycle stability evidence is required for phase-0 closeout');
summary.performance = {file: 'performance-evidence.json', recordedAt: performance.recordedAt, tests: performance.tests, gates: performance.gates};
writeFileSync(resolve(projectRoot, 'docs/phase-0/browser-evidence.json'), JSON.stringify(summary, null, 2) + '\n');
console.log('Saved measured browser evidence; physical firmware validation remains pending.');
