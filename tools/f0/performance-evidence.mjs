import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {projectRoot} from '../../spikes/paths.mjs';

const read = name => JSON.parse(readFileSync(resolve(projectRoot, name), 'utf8'));
const results = read('artifacts/performance-results.json');
if (results.stats.unexpected || results.stats.expected !== 3 || results.stats.skipped || results.stats.flaky) throw new Error('All three independent performance experiments must pass before publishing evidence');
const startup = read('artifacts/performance-startup.json');
const stability = read('artifacts/performance-stability.json');
const sprites = read('artifacts/performance-sprites.json');
const startupRerun = existsSync(resolve(projectRoot, 'artifacts/performance-startup-rerun.json')) ? read('artifacts/performance-startup-rerun.json') : null;
const initialBytes = stability.initialHeap.JSHeapUsedSize;
const finalBytes = stability.cycles.at(-1).shellTargetHeap.JSHeapUsedSize;
const evidence = {
  recordedAt: new Date().toISOString(), command: 'npx playwright test --config=playwright.performance.config.mjs && node tools/f0/performance-evidence.mjs',
  tests: results.stats, startup, stability, sprites,
  startupRerun: startupRerun?.metricRecordedAt === startup.recordedAt ? startupRerun : null,
  observedResources: {cycles: stability.cycles.length, audioContextsObserved: stability.cycles.reduce((sum, cycle) => sum + cycle.contexts.length, 0), audioContextsClosedOrDestroyed: stability.cycles.reduce((sum, cycle) => sum + cycle.contexts.filter(id => cycle.closed.includes(id) || cycle.destroyed.includes(id)).length, 0), workersObserved: stability.workers.length, workersClosed: stability.workers.filter(worker => worker.closed).length, workerTypes: Object.fromEntries([...new Set(stability.workers.map(worker => new URL(worker.url).pathname))].map(path => [path, stability.workers.filter(worker => new URL(worker.url).pathname === path).length]))},
  observedMemoryTrend: {initialShellJsHeapBytes: initialBytes, finalShellJsHeapBytes: finalBytes, growthBytes: finalBytes - initialBytes, growthPercent: (finalBytes - initialBytes) * 100 / initialBytes, domCountersInitial: stability.initialHeap.dom, domCountersFinal: stability.cycles.at(-1).shellTargetHeap.dom, assessment: 'Positive post-GC JS heap growth was observed over ten finite cycles. Stable DOM counters and closed observed resources do not establish zero leaks. Longer controlled soak and production memory budget remain pending.'},
  gates: {
    functionalStability: stability.cycles.length === 10 && stability.cycles.every(cycle => cycle.oldFrameDetached && cycle.remainingWorkers === 0 && cycle.remainingFramesIncludingShell === 2 && cycle.authoringPreserved && cycle.contexts.every(id => cycle.closed.includes(id) || cycle.destroyed.includes(id))),
    proposedLocalStopBudgets: stability.budgetObserved,
    school100Sprites30Fps: 'pending: define hardware/browser/power profile and repeat on representative equipment',
    productionStartupAndMemoryBudgets: 'pending: agree budgets and repeat using optimized build; current measurements are development build and target-scoped JS heap',
    claim: 'Functional finite-run release evidence is measured; the school performance criterion remains unverified. No threshold was weakened to pass.'
  }
};
writeFileSync(resolve(projectRoot, 'docs/phase-0/performance-evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({tests: evidence.tests, startupMs: startup.startupMs, stopMs: stability.stopMs, spriteFps: sprites.completedDrawsPerSecond, gates: evidence.gates}, null, 2));
