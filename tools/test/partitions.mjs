import {readFileSync} from 'node:fs';
import {freemem, loadavg} from 'node:os';
import {resolve} from 'node:path';

// Suites that assert the default origins (4173–4182) or start their own
// servers/global state stay in partition 0, which keeps the default ports.
// tests/tools/test-partitions.test.mjs fails if a suite outside this list
// starts naming default origins, so the list cannot silently go stale.
export const defaultPortSuites = Object.freeze([
  'accessibility-zoom', 'audio-variables', 'code-console', 'device-integration', 'isolation', 'language-runtime',
  'offline-recovery', 'project-persistence', 'pxt-worker', 'runner', 'scene-inspector', 'simulator',
  'standalone-contexts', 'textual-corpus'
].map(name => `tests/browser/${name}.spec.mjs`));

// Partition i ≥ 1 uses 4400 + 100·i. 4183–4236, 4260 and 4360 belong to the
// offline/standalone helpers; 5083 and 5183 to the user's open previews.
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
// with its pinned suites. Unknown durations count as one minute.
export function planPartitions(files, {count, durations = {}} = {}) {
  if (!Number.isSafeInteger(count) || count < 1 || count > 8) throw new Error('Número de particiones inválido (1–8)');
  const unique = [...new Set(files)].sort();
  const cost = file => durations[file] ?? 60000;
  const partitions = Array.from({length: count}, (_, index) => ({index, files: [], estimateMs: 0}));
  for (const file of unique.filter(file => defaultPortSuites.includes(file))) { partitions[0].files.push(file); partitions[0].estimateMs += cost(file); }
  const free = count === 1 ? unique.filter(file => !defaultPortSuites.includes(file)) : unique.filter(file => !defaultPortSuites.includes(file)).sort((a, b) => cost(b) - cost(a) || a.localeCompare(b));
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
