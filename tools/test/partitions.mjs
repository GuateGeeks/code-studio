import {readFileSync, readdirSync} from 'node:fs';
import {freemem, loadavg} from 'node:os';
import {resolve} from 'node:path';

// Empty: no suite depends on the default ports any more. Suites read their
// origins from tests/browser/origins.mjs and derive their own servers from the
// base (auxiliaryServer), so they run in any partition. The export stays
// because plans in progress cite it; the port-literal test in
// tests/tools/test-partitions.test.mjs keeps fixed ports from coming back.
export const defaultPortSuites = Object.freeze([]);

// Exclusive suites bind ports that do not derive from the base, so they must
// never run in two concurrent runs (e.g. agents in other worktrees). Within a
// run they all share one partition (partition 0) and therefore run serially.
export const exclusiveSuites = Object.freeze([
  {file: 'tests/browser/standalone-contexts.spec.mjs', reason: 'arranca el serve.mjs de los paquetes exportados, que escucha en 4211–4213 fijados por el formato de exportación'}
].map(item => Object.freeze(item)));

// Port literals forbidden in browser/quick specs and helpers. An exception
// covers only its own file and the literals it lists, never other ports.
export const portLiteralPatterns = Object.freeze([
  /127\.0\.0\.1:\d{4}/g, // http://127.0.0.1:4174
  /localhost:\d{4}/g, // http://localhost:4174
  /['"`]:\d{4}\//g, // ':4174/'
  /:['"`]\s*\+\s*\d{4}/g, // 'http://127.0.0.1:' + 4174
  /\.port\s*[!=]==?\s*['"`]\d{4}/g, // new URL(u).port === '4175'
  /GG_[A-Z0-9]+_PORT['"]?\s*[:=]\s*['"`]?\d{4}/g, // {GG_SHELL_PORT: '4177'}
  /\?\?\s*['"`]\d{4}['"`]/g, // process.env.X ?? '4174'
  /\[\s*['"]?4\d{3}['"]?\s*,/g // [4211, … or ['4211', …
]);
export const portLiteralExceptions = Object.freeze([
  {file: 'tests/browser/standalone-contexts.spec.mjs', literals: ['127.0.0.1:4211', '127.0.0.1:4212', '127.0.0.1:4213', "['4211',"],
    reason: 'puertos de serve.mjs fijados por el formato de exportación (src/export/export-context.mjs, tools/export/serve.template.mjs); la suite es exclusiva'}
].map(item => Object.freeze(item)));
export function findPortLiterals(root = '.', {directories = ['tests/browser', 'tests/quick'], exceptions = portLiteralExceptions} = {}) {
  const found = [];
  for (const directory of directories) {
    let names;
    try { names = readdirSync(resolve(root, directory)).filter(name => name.endsWith('.mjs')).sort(); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    for (const name of names) {
      const file = `${directory}/${name}`;
      const allowed = new Set(exceptions.filter(item => item.file === file).flatMap(item => item.literals));
      readFileSync(resolve(root, file), 'utf8').split('\n').forEach((content, index) => {
        for (const pattern of portLiteralPatterns) for (const match of content.matchAll(pattern)) {
          if (!allowed.has(match[0])) found.push({file, line: index + 1, text: match[0]});
        }
      });
    }
  }
  return found;
}

// Partition i ≥ 1 uses 4400 + 100·i; its suites' own servers sit at +50…+79
// inside the same hundred (tests/browser/origins.mjs). 4211–4213 belong to
// the exported packages; 5083, 5183, 5283 and 5383 to the user's previews.
export function partitionEnv(index, {root = '.'} = {}) {
  if (!Number.isSafeInteger(index) || index < 0 || index > 8) throw new Error('Índice de partición inválido');
  const folder = `artifacts/test-runs/partitions/p${index}`;
  const env = {GG_RELEASE_ROOT: resolve(root, folder, 'releases'), GG_TEST_OUTPUT_DIR: `${folder}/results`,
    GG_BROWSER_REPORT: `artifacts/test-runs/partitions/p${index}-browser.json`, GG_TEST_EVIDENCE_DIR: `${folder}/cases`};
  if (index === 0) return env;
  const base = 4400 + 100 * index;
  return {...env, GG_SHELL_PORT: String(base), GG_RUNNER_PORT: String(base + 1), GG_SIMULATOR_PORT: String(base + 2),
    GG_LANGUAGE_PORT: String(base + 3), GG_SCENE3D_PORT: String(base + 8), GG_WEBAPP_PORT: String(base + 9)};
}

// Milliseconds per spec file from a Playwright JSON report (the canonical
// artifacts/browser-results.json or a partition report).
export function readDurations(reportFile) {
  const durations = {};
  let report;
  try { report = JSON.parse(readFileSync(reportFile, 'utf8')); } catch { return durations; }
  const visit = suite => {
    for (const spec of suite.specs ?? []) for (const test of spec.tests ?? []) for (const result of test.results ?? []) {
      const file = `tests/browser/${(spec.file ?? suite.file ?? '').split('/').pop()}`;
      durations[file] = (durations[file] ?? 0) + (result.duration ?? 0);
    }
    for (const child of suite.suites ?? []) visit({...child, file: child.file ?? suite.file});
  };
  for (const suite of report?.suites ?? []) visit(suite);
  return durations;
}

// Longest-processing-time first over every partition, partition 0 starting
// with the pinned suites: every exclusive suite together, so two of them never
// share their fixed ports at once. Unknown durations count as one minute.
export function planPartitions(files, {count, durations = {}, exclusive = exclusiveSuites.map(item => item.file)} = {}) {
  if (!Number.isSafeInteger(count) || count < 1 || count > 8) throw new Error('Número de particiones inválido (1–8)');
  const unique = [...new Set(files)].sort();
  const cost = file => durations[file] ?? 60000;
  const pinned = new Set([...defaultPortSuites, ...exclusive]);
  const partitions = Array.from({length: count}, (_, index) => ({index, files: [], estimateMs: 0}));
  for (const file of unique.filter(file => pinned.has(file))) { partitions[0].files.push(file); partitions[0].estimateMs += cost(file); }
  const free = count === 1 ? unique.filter(file => !pinned.has(file)) : unique.filter(file => !pinned.has(file)).sort((a, b) => cost(b) - cost(a) || a.localeCompare(b));
  for (const file of free) {
    const target = partitions.reduce((best, item) => item.estimateMs < best.estimateMs ? item : best);
    target.files.push(file); target.estimateMs += cost(file);
  }
  for (const item of partitions) item.files.sort();
  return partitions.filter(item => item.files.length);
}

// Measured on the shared 16-core/15 GB machine (test-gate-scaling, 24/10):
// three partitions drove free memory to 0.7 GB and load to 36, and four
// time-budgeted tests failed. «auto» uses two partitions only with headroom.
// MemAvailable counts reclaimable cache; os.freemem() alone would almost never allow partitions.
export function availableMemory() {
  try { const match = /^MemAvailable:\s+(\d+) kB/m.exec(readFileSync('/proc/meminfo', 'utf8')); if (match) return Number(match[1]) * 1024; } catch {}
  return freemem();
}
export const autoPartitionPolicy = Object.freeze({partitions: 2, minFreeBytes: 6 * 1024 ** 3, maxLoad: 8});
export function resolvePartitionCount(requested, {free = availableMemory(), load = loadavg()[0], policy = autoPartitionPolicy} = {}) {
  if (requested !== 'auto') return requested ?? 1;
  return free >= policy.minFreeBytes && load < policy.maxLoad ? policy.partitions : 1;
}
