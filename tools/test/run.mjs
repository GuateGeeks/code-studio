import {spawn} from 'node:child_process';
import {appendFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadavg} from 'node:os';
import {projectRoot} from '../../spikes/paths.mjs';
import {createPlan, normalizeChangedPath, parseArguments} from './impact.mjs';
import {captureSnapshot, compareSnapshots} from './snapshot.mjs';
import {planPartitions, partitionEnv, readDurations, resolvePartitionCount, availableMemory} from './partitions.mjs';

const json = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const testFiles = (root, directory) => {
  try { return readdirSync(resolve(root, directory)).filter(file => file.endsWith('.test.mjs')).sort().map(file => `${directory}/${file}`); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
};
export function browserSpecFiles(root = projectRoot) {
  try { return readdirSync(resolve(root, 'tests/browser')).filter(file => file.endsWith('.spec.mjs')).sort().map(file => `tests/browser/${file}`); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
// Canonical serial report first; otherwise the latest partition reports.
export function historicalDurations(root = projectRoot) {
  const canonical = readDurations(resolve(root, 'artifacts/browser-results.json'));
  if (Object.keys(canonical).length) return canonical;
  const merged = {};
  for (let index = 0; index <= 8; index++) Object.assign(merged, readDurations(resolve(root, `artifacts/test-runs/partitions/p${index}-browser.json`)));
  return merged;
}
// The full gate defaults to «auto» (two partitions with headroom, else serial);
// `resources` ({free, load}) overrides the measured memory and load.
export function buildCommands(plan, {root = projectRoot, forceBuild = false, partitions: requested = plan.profile === 'full' ? 'auto' : 1, resources = {}, durations} = {}) {
  const partitions = resolvePartitionCount(requested, resources);
  const commands = [];
  const add = (name, args, extra = {}) => commands.push({name, executable: process.execPath, args, ...extra});
  if (plan.node) add('integration', ['--test', ...testFiles(root, 'tests/integration')], {logFile: `artifacts/test-runs/${plan.profile}-integration.tap`});
  const tools = testFiles(root, 'tests/tools');
  if (plan.tools && tools.length) add('tools', ['--test', ...tools], {logFile: `artifacts/test-runs/${plan.profile}-tools.tap`});
  if (plan.build) add('build', ['tools/f0/build-browser.mjs', ...(forceBuild ? ['--force'] : [])]);
  if (plan.quick) add('smoke', ['node_modules/playwright/cli.js', 'test', '--config=playwright.quick.config.mjs', '--reporter=list,json', '--output', `artifacts/test-runs/${plan.profile}-smoke-results`], {env: {GG_TEST_REPORT_FILE: `artifacts/test-runs/${plan.profile === 'full' ? 'full-smoke' : plan.profile}-browser.json`, PLAYWRIGHT_JSON_OUTPUT_FILE: `artifacts/test-runs/${plan.profile === 'full' ? 'full-smoke' : plan.profile}-browser.json`, GG_TEST_EVIDENCE_DIR: `artifacts/test-runs/${plan.profile}-cases`}});
  if (plan.browser.length && partitions > 1) {
    // Same suites as the serial run, split into isolated processes (own ports,
    // release root, outputs). Each file still runs with workers: 1 in order.
    // A full gate partitions every spec on disk, so an uninventoried file can
    // never silently drop out (the serial run covers the whole directory).
    const files = plan.selection === 'full' ? [...new Set([...plan.browser, ...browserSpecFiles(root)])] : plan.browser;
    const planned = planPartitions(files, {count: partitions, durations: durations ?? historicalDurations(root)});
    commands.push({name: 'browser', parallel: planned.map(item => ({name: `browser-p${item.index}`, executable: process.execPath,
      args: ['node_modules/playwright/cli.js', 'test', '--config=playwright.config.mjs', ...item.files],
      env: partitionEnv(item.index, {root}), logFile: `artifacts/test-runs/partitions/p${item.index}.log`, files: item.files, estimateMs: Math.round(item.estimateMs)}))});
  } else if (plan.browser.length) {
    const args = ['node_modules/playwright/cli.js', 'test', '--config=playwright.config.mjs'];
    if (plan.selection !== 'full') args.push(...plan.browser);
    if (plan.profile !== 'full') args.push('--reporter=list,json', '--output', 'artifacts/test-runs/affected-browser-results');
    add('browser', args, plan.profile === 'full' ? {} : {env: {PLAYWRIGHT_JSON_OUTPUT_FILE: 'artifacts/test-runs/affected-browser.json', GG_TEST_EVIDENCE_DIR: 'artifacts/test-runs/affected-cases'}});
  }
  if (plan.validateSpecs) add('specs', ['tools/run-tool.mjs', 'openspec', 'validate', '--all', '--strict']);
  if (plan.verifyBaseline) add('upstream-preservation', ['tools/f0/verify-baseline.mjs']);
  return commands;
}

async function execute(command, root) {
  if (command.parallel) return executeParallel(command, root);
  const startedAt = new Date().toISOString();
  const start = performance.now();
  if (command.logFile) writeFileSync(resolve(root, command.logFile), '');
  console.log(`\n[test:${command.name}] ${command.args.join(' ')}`);
  return new Promise(resolveRun => {
    const env = {...process.env, ...command.env};
    delete env.NODE_TEST_CONTEXT; // Child test runners are independent processes.
    const child = spawn(command.executable, command.args, {cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'], shell: false});
    child.stdout.on('data', chunk => { process.stdout.write(chunk); if (command.logFile) appendFileSync(resolve(root, command.logFile), chunk); });
    child.stderr.on('data', chunk => { process.stderr.write(chunk); if (command.logFile) appendFileSync(resolve(root, command.logFile), chunk); });
    child.on('error', error => resolveRun({name: command.name, startedAt, durationMs: performance.now() - start, exitCode: 1, error: error.message}));
    child.on('close', (code, signal) => resolveRun({name: command.name, startedAt, durationMs: performance.now() - start, exitCode: code ?? 1, ...(signal ? {signal} : {})}));
  });
}

// Runs partitions concurrently; output lines are prefixed and each partition
// keeps its own log. The group fails if any partition fails.
async function executeParallel(group, root) {
  const startedAt = new Date().toISOString();
  const start = performance.now();
  mkdirSync(resolve(root, 'artifacts/test-runs/partitions'), {recursive: true});
  console.log(`\n[test:${group.name}] ${group.parallel.length} particiones: ` + group.parallel.map(item => `${item.name} (${item.files.length} archivos, ~${Math.round(item.estimateMs / 60000)} min)`).join(', '));
  const results = await Promise.all(group.parallel.map(command => new Promise(resolveRun => {
    const childStart = performance.now();
    writeFileSync(resolve(root, command.logFile), '');
    const env = {...process.env, ...command.env};
    delete env.NODE_TEST_CONTEXT;
    const child = spawn(command.executable, command.args, {cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'], shell: false});
    const prefix = `[${command.name.replace('browser-', '')}] `;
    const relay = stream => { let pending = ''; return chunk => {
      appendFileSync(resolve(root, command.logFile), chunk);
      const lines = (pending + chunk).split('\n'); pending = lines.pop();
      for (const line of lines) stream.write(prefix + line + '\n');
    }; };
    child.stdout.on('data', relay(process.stdout));
    child.stderr.on('data', relay(process.stderr));
    const done = extra => resolveRun({name: command.name, files: command.files.length, durationMs: performance.now() - childStart, ...extra});
    child.on('error', error => done({exitCode: 1, error: error.message}));
    child.on('close', (code, signal) => done({exitCode: code ?? 1, ...(signal ? {signal} : {})}));
  })));
  const failed = results.find(item => item.exitCode !== 0);
  return {name: group.name, startedAt, durationMs: performance.now() - start, exitCode: failed ? failed.exitCode : 0, partitions: results};
}

export async function run(argv, {root = projectRoot, executeCommand = execute} = {}) {
  const options = parseArguments(argv);
  const folder = resolve(root, 'artifacts/test-runs');
  mkdirSync(folder, {recursive: true});
  const baselineFile = resolve(folder, 'baseline.json');
  let before;
  let files = options.files.map(path => normalizeChangedPath(path, {root}));
  let source = options.explicit ? 'explicit' : 'snapshot';
  let baselineStatus = 'valid';
  if (options.profile === 'affected' && !options.explicit) {
    before = captureSnapshot(root);
    let previous;
    try { previous = JSON.parse(readFileSync(baselineFile, 'utf8')); }
    catch (error) { baselineStatus = error.code === 'ENOENT' ? 'missing' : 'corrupt'; }
    if (baselineStatus === 'valid') {
      const comparison = compareSnapshots(previous, before);
      baselineStatus = previous?.producer === 'test:full' ? comparison.status : 'corrupt';
      files = comparison.changed;
    }
  }
  const plan = createPlan(options.profile, {files, source, baselineStatus});
  // --partitions wins, then GG_TEST_PARTITIONS, then the profile default (auto for full, serial otherwise).
  const fromEnv = process.env.GG_TEST_PARTITIONS ? (process.env.GG_TEST_PARTITIONS === 'auto' ? 'auto' : Number(process.env.GG_TEST_PARTITIONS) || 1) : undefined;
  const requested = (argv.includes('--partitions') ? options.partitions : fromEnv ?? options.partitions) ?? 1;
  const partitions = resolvePartitionCount(requested);
  if (requested === 'auto') console.log(`[test] --partitions auto → ${partitions} (memoria disponible ${(availableMemory() / 1024 ** 3).toFixed(1)} GB, carga ${loadavg()[0].toFixed(1)})`);
  const commands = buildCommands(plan, {root, forceBuild: options.forceBuild, partitions});
  const published = {...plan, createdAt: new Date().toISOString(), dryRun: options.dryRun, forceBuild: options.forceBuild, partitions, commands};
  json(resolve(folder, `${options.profile}-plan.json`), published);
  console.log(JSON.stringify(published, null, 2));
  if (options.dryRun) return 0;
  if (options.profile === 'full') before = captureSnapshot(root);
  const results = {profile: options.profile, selection: plan.selection, startedAt: new Date().toISOString(), steps: [], baselineWritten: false};
  let exitCode = 0;
  for (const command of commands) {
    const result = await executeCommand(command, root);
    results.steps.push(result);
    if (result.exitCode !== 0) { exitCode = result.exitCode; break; }
  }
  if (exitCode === 0 && options.profile === 'full') {
    const after = captureSnapshot(root);
    const changedDuringRun = compareSnapshots(before, after).changed;
    if (changedDuringRun.length) {
      results.baselineWarning = 'Los archivos cambiaron durante la corrida: se conserva la línea base previa. test:affected ampliará la selección en el próximo intento.';
      results.changedDuringRun = changedDuringRun;
      results.error = 'sourceChanged';
      exitCode = 1;
      console.warn(results.baselineWarning);
    } else {
      json(baselineFile, {...after, recordedAt: new Date().toISOString(), producer: 'test:full'});
      results.baselineWritten = true;
    }
  }
  results.exitCode = exitCode;
  results.finishedAt = new Date().toISOString();
  if (!commands.length) results.note = 'Sin cambios respecto a la última regresión completa confirmada.';
  json(resolve(folder, `${options.profile}-results.json`), results);
  return exitCode;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = await run(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
