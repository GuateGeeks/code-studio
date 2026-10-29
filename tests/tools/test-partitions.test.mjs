import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {defaultPortSuites, partitionEnv, planPartitions, readDurations} from '../../tools/test/partitions.mjs';
import {createPlan, normalBrowserFiles, parseArguments} from '../../tools/test/impact.mjs';
import {buildCommands, run} from '../../tools/test/run.mjs';

const root = resolve(import.meta.dirname, '../..');

test('TEST-PARTITION: every browser suite runs exactly once and default-port suites stay in partition 0', () => {
  const durations = Object.fromEntries(normalBrowserFiles.map((file, index) => [file, (index % 7 + 1) * 10000]));
  for (const count of [1, 2, 3, 4]) {
    const planned = planPartitions(normalBrowserFiles, {count, durations});
    const all = planned.flatMap(item => item.files);
    assert.equal(all.length, normalBrowserFiles.length, `count ${count}`);
    assert.deepEqual([...all].sort(), [...normalBrowserFiles].sort());
    for (const file of defaultPortSuites.filter(file => normalBrowserFiles.includes(file))) assert.ok(planned.find(item => item.index === 0).files.includes(file), file);
  }
  const balanced = planPartitions(['tests/browser/a.spec.mjs', 'tests/browser/b.spec.mjs', 'tests/browser/c.spec.mjs'], {count: 2, durations: {'tests/browser/a.spec.mjs': 9, 'tests/browser/b.spec.mjs': 5, 'tests/browser/c.spec.mjs': 4}});
  assert.deepEqual(balanced.map(item => item.files), [['tests/browser/a.spec.mjs'], ['tests/browser/b.spec.mjs', 'tests/browser/c.spec.mjs']]);
  for (const count of [0, 9, 1.5]) assert.throws(() => planPartitions(normalBrowserFiles, {count}), /particiones/);
});

test('TEST-PARTITION: partition ports are distinct and avoid default, helper and preview ports', () => {
  const reserved = new Set();
  for (const [from, to] of [[4173, 4182], [4183, 4236], [4260, 4269], [4360, 4369], [5083, 5092], [5183, 5192]]) for (let port = from; port <= to; port++) reserved.add(port);
  const used = new Set();
  assert.equal(partitionEnv(0).GG_SHELL_PORT, undefined, 'partition 0 keeps the defaults');
  for (let index = 1; index <= 8; index++) {
    const env = partitionEnv(index);
    for (const key of ['GG_SHELL_PORT', 'GG_RUNNER_PORT', 'GG_SIMULATOR_PORT', 'GG_LANGUAGE_PORT', 'GG_SCENE3D_PORT', 'GG_WEBAPP_PORT']) {
      const port = Number(env[key]);
      assert.equal(reserved.has(port), false, `${key} ${port}`);
      assert.equal(used.has(port), false, `${key} ${port} reused`);
      used.add(port);
    }
    assert.match(env.GG_BROWSER_REPORT, new RegExp(`p${index}-browser\\.json$`));
  }
  assert.throws(() => partitionEnv(9));
});

test('TEST-PARTITION: suites naming default origins or starting servers are pinned to partition 0', () => {
  // Also URLs assembled from a default port list (device-transfer, 29/10/2026).
  const pattern = /127\.0\.0\.1:41(?:7[3-9]|8[0-2])|'http:\/\/127\.0\.0\.1:'\s*\+|\[\s*41(?:7[3-9]|8[0-2])\s*,|location\.port\s*[!=]==\s*'41|serve-browser|GG_SHELL_PORT/;
  for (const file of readdirSync(resolve(root, 'tests/browser')).filter(name => name.endsWith('.spec.mjs'))) {
    const path = `tests/browser/${file}`;
    if (pattern.test(readFileSync(resolve(root, path), 'utf8'))) assert.ok(defaultPortSuites.includes(path), `${path} must be listed in defaultPortSuites`);
  }
});

test('TEST-PARTITION: durations come from Playwright JSON reports and missing reports yield none', () => {
  const folder = mkdtempSync(resolve(tmpdir(), 'gg-partition-report-'));
  try {
    const report = resolve(folder, 'report.json');
    writeFileSync(report, JSON.stringify({suites: [{file: 'a.spec.mjs', specs: [{file: 'a.spec.mjs', tests: [{results: [{duration: 1200}]}, {results: [{duration: 300}]}]}],
      suites: [{specs: [{tests: [{results: [{duration: 500}]}]}]}]}]}));
    assert.deepEqual(readDurations(report), {'tests/browser/a.spec.mjs': 2000});
    assert.deepEqual(readDurations(resolve(folder, 'missing.json')), {});
  } finally { rmSync(folder, {recursive: true, force: true}); }
});

test('TEST-PARTITION: --partitions builds one isolated parallel group; the default stays serial', () => {
  assert.equal(parseArguments(['full', '--partitions', '3']).partitions, 3);
  assert.equal(Object.hasOwn(parseArguments(['full']), 'partitions'), false);
  for (const value of ['0', '9', 'x']) assert.throws(() => parseArguments(['full', '--partitions', value]), /--partitions/);
  const serial = buildCommands(createPlan('full'));
  assert.equal(serial.find(command => command.name === 'browser').parallel, undefined);
  const parallel = buildCommands(createPlan('full'), {partitions: 3, durations: {}});
  const group = parallel.find(command => command.name === 'browser');
  assert.equal(group.parallel.length, 3);
  assert.deepEqual(group.parallel.flatMap(item => item.files).sort(), [...normalBrowserFiles].sort());
  assert.equal(new Set(group.parallel.map(item => item.env.GG_BROWSER_REPORT)).size, 3);
  assert.equal(new Set(group.parallel.map(item => item.env.GG_RELEASE_ROOT)).size, 3);
  assert.ok(parallel.findIndex(command => command.name === 'smoke') < parallel.findIndex(command => command.name === 'browser'));
});

test('TEST-PARTITION: a failed partition fails the gate and keeps the previous baseline', async () => {
  const folder = mkdtempSync(resolve(tmpdir(), 'gg-partition-run-'));
  try {
    mkdirSync(resolve(folder, 'artifacts/test-runs'), {recursive: true});
    writeFileSync(resolve(folder, 'README.md'), 'project');
    const baseline = resolve(folder, 'artifacts/test-runs/baseline.json');
    writeFileSync(baseline, '{"keep":"prior"}');
    const code = await run(['full', '--partitions', '2'], {root: folder, executeCommand: async command => command.parallel
      ? {name: command.name, exitCode: 1, partitions: command.parallel.map((item, index) => ({name: item.name, exitCode: index === 1 ? 1 : 0}))}
      : {name: command.name, exitCode: 0}});
    assert.notEqual(code, 0);
    const result = JSON.parse(readFileSync(resolve(folder, 'artifacts/test-runs/full-results.json'), 'utf8'));
    assert.equal(result.baselineWritten, false);
    assert.deepEqual(result.steps.at(-1).partitions.map(item => item.exitCode), [0, 1]);
    assert.equal(readFileSync(baseline, 'utf8'), '{"keep":"prior"}');
    assert.equal(JSON.parse(readFileSync(resolve(folder, 'artifacts/test-runs/full-plan.json'), 'utf8')).partitions, 2);
  } finally { rmSync(folder, {recursive: true, force: true}); }
});

test('TEST-IMPACT-CONTEXT: context modules select their own suites; unknown modules still select the whole gate', async () => {
  const {contextGroups} = await import('../../tools/test/impact.mjs');
  const samples = {
    'project-compatibility': ['src/contracts/engine-locks.mjs', 'src/contracts/pack-migrations.mjs', 'src/project-migration.mjs'],
    scene3d: ['src/contracts/scene3d-program.mjs', 'src/adapters/babylon/adapter.mjs', 'src/packs/gg.3d-basic/manifest.mjs'],
    webapp: ['src/contracts/webapp-program.mjs', 'src/adapters/webapp/dom-adapter.mjs', 'src/packs/gg.webapps/manifest.mjs'],
    capability: ['src/contracts/operations.mjs', 'src/contracts/program-ir1.mjs', 'src/studio/capability-contexts-ui.mjs', 'src/editor/capability-editor.mjs'],
    microbit: ['src/contracts/device-program.mjs', 'src/editor/device-editor.mjs', 'src/studio/device-ui.mjs', 'src/packs/gg.microbit/blocks.mjs', 'src/device-transfer/usb-client.mjs'],
    'scratch-import': ['src/contracts/sb3-program.mjs', 'src/adapters/scratch/sb3/runtime-guards.mjs', 'src/import/asset-processor.mjs', 'src/studio/resources-ui.mjs']
  };
  assert.deepEqual(contextGroups.map(item => item.group).sort(), Object.keys(samples).sort());
  for (const [group, files] of Object.entries(samples)) for (const file of files) {
    const plan = createPlan('affected', {files: [file]});
    assert.equal(plan.selection, 'affected', file);
    assert.equal(plan.reasons[0].group, group, file);
    assert.ok(plan.browser.length > 0 && plan.browser.length < normalBrowserFiles.length, `${file}: ${plan.browser.length}`);
    for (const suite of plan.browser) assert.ok(normalBrowserFiles.includes(suite), `${file} → ${suite}`);
  }
  assert.ok(createPlan('affected', {files: ['src/device-transfer/usb-client.mjs']}).browser.includes('tests/browser/integrated-microbit-workspace.spec.mjs'));
  assert.ok(createPlan('affected', {files: ['src/contracts/operations.mjs']}).browser.includes('tests/browser/integrated-web-workspace.spec.mjs'));
  for (const file of ['src/new-domain.mjs', 'src/contracts/block-language-table.mjs']) assert.equal(createPlan('affected', {files: [file]}).selection, 'full', file);
});

test('TEST-PARTITION: every browser spec on disk is inventoried and a partitioned full gate covers all of them', async () => {
  const {browserSpecFiles} = await import('../../tools/test/run.mjs');
  const onDisk = browserSpecFiles(root);
  assert.deepEqual(onDisk.filter(file => !normalBrowserFiles.includes(file)), [], 'specs missing from normalBrowserFiles');
  const group = buildCommands(createPlan('full'), {partitions: 3, durations: {}}).find(command => command.name === 'browser');
  assert.deepEqual(group.parallel.flatMap(item => item.files).sort(), onDisk);
});

test('TEST-PARTITION: --partitions auto uses two partitions only with memory and CPU headroom', async () => {
  const {resolvePartitionCount, autoPartitionPolicy} = await import('../../tools/test/partitions.mjs');
  assert.equal(parseArguments(['full', '--partitions', 'auto']).partitions, 'auto');
  const gb = 1024 ** 3;
  assert.equal(resolvePartitionCount('auto', {free: 8 * gb, load: 2}), autoPartitionPolicy.partitions);
  assert.equal(resolvePartitionCount('auto', {free: 3 * gb, load: 2}), 1, 'low memory stays serial');
  assert.equal(resolvePartitionCount('auto', {free: 8 * gb, load: 20}), 1, 'high load stays serial');
  assert.equal(resolvePartitionCount(3, {free: 0, load: 99}), 3, 'an explicit count is respected');
  assert.equal(resolvePartitionCount(undefined), 1);
});
