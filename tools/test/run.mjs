import {spawn} from 'node:child_process';
import {appendFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {projectRoot} from '../../spikes/paths.mjs';
import {createPlan, normalizeChangedPath, parseArguments} from './impact.mjs';
import {captureSnapshot, compareSnapshots} from './snapshot.mjs';

const json = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const testFiles = (root, directory) => {
  try { return readdirSync(resolve(root, directory)).filter(file => file.endsWith('.test.mjs')).sort().map(file => `${directory}/${file}`); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
};
export function buildCommands(plan, {root = projectRoot, forceBuild = false} = {}) {
  const commands = [];
  const add = (name, args, extra = {}) => commands.push({name, executable: process.execPath, args, ...extra});
  if (plan.node) add('integration', ['--test', ...testFiles(root, 'tests/integration')], {logFile: `artifacts/test-runs/${plan.profile}-integration.tap`});
  const tools = testFiles(root, 'tests/tools');
  if (plan.tools && tools.length) add('tools', ['--test', ...tools], {logFile: `artifacts/test-runs/${plan.profile}-tools.tap`});
  if (plan.build) add('build', ['tools/f0/build-browser.mjs', ...(forceBuild ? ['--force'] : [])]);
  if (plan.quick) add('smoke', ['node_modules/playwright/cli.js', 'test', '--config=playwright.quick.config.mjs', '--reporter=list,json', '--output', `artifacts/test-runs/${plan.profile}-smoke-results`], {env: {GG_TEST_REPORT_FILE: `artifacts/test-runs/${plan.profile === 'full' ? 'full-smoke' : plan.profile}-browser.json`, PLAYWRIGHT_JSON_OUTPUT_FILE: `artifacts/test-runs/${plan.profile === 'full' ? 'full-smoke' : plan.profile}-browser.json`, GG_TEST_EVIDENCE_DIR: `artifacts/test-runs/${plan.profile}-cases`}});
  if (plan.browser.length) {
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
  const commands = buildCommands(plan, {root, forceBuild: options.forceBuild});
  const published = {...plan, createdAt: new Date().toISOString(), dryRun: options.dryRun, forceBuild: options.forceBuild, commands};
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
