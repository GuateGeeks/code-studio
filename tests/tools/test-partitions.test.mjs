import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {defaultPortSuites, exclusiveSuites, findPortLiterals, partitionEnv, planPartitions, portLiteralExceptions, readDurations} from '../../tools/test/partitions.mjs';
import {auxiliaryServer, configuredOrigins} from '../browser/origins.mjs';
import {createPlan, normalBrowserFiles, parseArguments} from '../../tools/test/impact.mjs';
import {buildCommands, run} from '../../tools/test/run.mjs';

const root = resolve(import.meta.dirname, '../..');

test('TEST-PARTITION: every browser suite runs exactly once and exclusive suites share one partition', () => {
  assert.deepEqual(defaultPortSuites, [], 'no suite depends on the default ports any more');
  assert.ok(exclusiveSuites.length > 0, 'standalone-contexts is exclusive');
  for (const item of exclusiveSuites) assert.ok(normalBrowserFiles.includes(item.file) && item.reason.length > 20, `${item.file} is inventoried and has a reason`);
  const exclusive = exclusiveSuites.map(item => item.file);
  const durations = Object.fromEntries(normalBrowserFiles.map((file, index) => [file, (index % 7 + 1) * 10000]));
  for (const count of [1, 2, 3, 4]) {
    const planned = planPartitions(normalBrowserFiles, {count, durations});
    const all = planned.flatMap(item => item.files);
    assert.equal(all.length, normalBrowserFiles.length, `count ${count}`);
    assert.deepEqual([...all].sort(), [...normalBrowserFiles].sort());
    for (const file of exclusive) assert.ok(planned.find(item => item.index === 0).files.includes(file), file);
  }
  // Two exclusive suites would share the same fixed ports: never split them across partitions.
  const synthetic = ['tests/browser/x1.spec.mjs', 'tests/browser/x2.spec.mjs', 'tests/browser/y.spec.mjs', 'tests/browser/z.spec.mjs'];
  const grouped = planPartitions(synthetic, {count: 3, durations: {}, exclusive: ['tests/browser/x1.spec.mjs', 'tests/browser/x2.spec.mjs']});
  assert.deepEqual(grouped.find(item => item.files.includes('tests/browser/x1.spec.mjs')).files.filter(file => file.includes('/x')), ['tests/browser/x1.spec.mjs', 'tests/browser/x2.spec.mjs']);
  assert.deepEqual(grouped.flatMap(item => item.files).sort(), synthetic);
  const balanced = planPartitions(['tests/browser/a.spec.mjs', 'tests/browser/b.spec.mjs', 'tests/browser/c.spec.mjs'], {count: 2, durations: {'tests/browser/a.spec.mjs': 9, 'tests/browser/b.spec.mjs': 5, 'tests/browser/c.spec.mjs': 4}});
  assert.deepEqual(balanced.map(item => item.files), [['tests/browser/a.spec.mjs'], ['tests/browser/b.spec.mjs', 'tests/browser/c.spec.mjs']]);
  for (const count of [0, 9, 1.5]) assert.throws(() => planPartitions(normalBrowserFiles, {count}), /particiones/);
});

test('TEST-PARTITION: partition ports, with their suites\' own servers, are distinct and avoid package and preview ports', () => {
  // 4211–4216: exported packages (serve.mjs, deployment.json); 5083/5183/5283/5383: the user's previews; 4183/4202: manual and performance servers.
  const reserved = new Set();
  for (const [from, to] of [[4211, 4216], [5083, 5092], [5183, 5192], [5283, 5292], [5383, 5392], [4183, 4183], [4202, 4202]]) for (let port = from; port <= to; port++) reserved.add(port);
  const used = new Set();
  assert.equal(partitionEnv(0).GG_SHELL_PORT, undefined, 'partition 0 keeps the defaults');
  for (let index = 0; index <= 8; index++) {
    const env = Object.fromEntries(Object.entries(partitionEnv(index)).filter(([key]) => /^GG_\w+_PORT$/.test(key)));
    const blocks = [configuredOrigins(env).ports, ...['offline', 'pilot', 'standalone'].map(slot => auxiliaryServer(slot, env).ports)];
    for (const [role, port] of blocks.flatMap(block => Object.entries(block))) {
      assert.equal(reserved.has(port), false, `p${index} ${role} ${port}`);
      assert.equal(used.has(port), false, `p${index} ${role} ${port} reused`);
      used.add(port);
    }
    assert.match(partitionEnv(index).GG_BROWSER_REPORT, new RegExp(`p${index}-browser\\.json$`));
  }
  assert.equal(used.size, 9 * 24);
  assert.throws(() => partitionEnv(9));
});

test('TEST-PARTITION: browser specs and test helpers carry no port literals', () => {
  assert.deepEqual(findPortLiterals(root), [], 'use tests/browser/origins.mjs (origins, ports, auxiliaryServer) instead of fixed ports');
  for (const item of portLiteralExceptions) {
    assert.ok(readFileSync(resolve(root, item.file), 'utf8').length > 0, item.file);
    assert.ok(item.reason.length > 20 && item.literals.length > 0, item.file);
  }
  const folder = mkdtempSync(resolve(tmpdir(), 'gg-port-literals-'));
  try {
    mkdirSync(resolve(folder, 'tests/browser'), {recursive: true}); mkdirSync(resolve(folder, 'tests/quick'), {recursive: true});
    writeFileSync(resolve(folder, 'tests/browser/clean.spec.mjs'), "import {origins} from './origins.mjs';\nawait page.goto(origins.shellOrigin);\n");
    assert.deepEqual(findPortLiterals(folder), []);
    writeFileSync(resolve(folder, 'tests/browser/helper.mjs'), "export const runner = 'http://127.0.0.1:4174';\n");
    writeFileSync(resolve(folder, 'tests/quick/smoke.spec.mjs'), "for (const port of [4173, 4174]) {}\nif (location.port !== '4175') throw 0;\n");
    writeFileSync(resolve(folder, 'tests/browser/notes.txt'), "'http://127.0.0.1:4174'\n");
    const found = findPortLiterals(folder, {exceptions: []});
    assert.deepEqual(found.map(item => `${item.file}:${item.line}`), ['tests/browser/helper.mjs:1', 'tests/quick/smoke.spec.mjs:1', 'tests/quick/smoke.spec.mjs:2']);
    assert.equal(found[0].text, '127.0.0.1:4174');
    // An exception covers only its own file and its own literals.
    const exceptions = [{file: 'tests/browser/helper.mjs', literals: ['127.0.0.1:4211'], reason: 'fixed by the exported package format'}];
    writeFileSync(resolve(folder, 'tests/browser/helper.mjs'), "export const shell = 'http://127.0.0.1:4211/';\n");
    assert.deepEqual(findPortLiterals(folder, {exceptions}).map(item => item.file), ['tests/quick/smoke.spec.mjs', 'tests/quick/smoke.spec.mjs']);
    writeFileSync(resolve(folder, 'tests/browser/helper.mjs'), "export const shell = 'http://127.0.0.1:4211/';\nexport const runner = 'http://127.0.0.1:4174';\n");
    assert.deepEqual(findPortLiterals(folder, {exceptions}).filter(item => item.file === 'tests/browser/helper.mjs').map(item => item.text), ['127.0.0.1:4174']);
    // Every spelling of a fixed port is caught: quote styles, bare hosts, env maps, fallbacks and port lists.
    const forms = {
      "export const a = ':4174/';": "':4174/",
      "if (new URL(u).port === '4175') throw 0;": ".port === '4175",
      'if (url.port !== "4175") throw 0;': '.port !== "4175',
      "env({GG_SHELL_PORT:'4177'});": "GG_SHELL_PORT:'4177",
      "process.env.GG_RUNNER_PORT = '4178';": "GG_RUNNER_PORT = '4178",
      "const u = 'http://127.0.0.1:' + 4174;": ":' + 4174",
      'const u = "http://127.0.0.1:" + 4174;': ':" + 4174',
      'const u = `localhost:4174`;': 'localhost:4174',
      'const u = "http://localhost:4174";': 'localhost:4174',
      'for (const port of [4211, 4212]) {}': '[4211,',
      "for (const port of ['4211', '4212']) {}": "['4211',",
      "const port = process.env.GG_RUNNER_PORT ?? '4174';": "?? '4174'"
    };
    rmSync(resolve(folder, 'tests/browser/helper.mjs')); rmSync(resolve(folder, 'tests/quick/smoke.spec.mjs'));
    for (const [index, [source, text]] of Object.entries(forms).entries()) {
      writeFileSync(resolve(folder, `tests/browser/form-${String(index).padStart(2, '0')}.mjs`), `${source}\n`);
      const hits = findPortLiterals(folder, {exceptions: []}).filter(item => item.file.endsWith(`form-${String(index).padStart(2, '0')}.mjs`));
      assert.ok(hits.length >= 1, `not detected: ${source}`);
      assert.ok(hits.some(item => item.text === text), `${source} -> ${hits.map(item => item.text).join(' | ')}`);
    }
  } finally { rmSync(folder, {recursive: true, force: true}); }
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

test('TEST-PARTITION: --partitions builds one isolated parallel group; --partitions 1 stays serial', () => {
  assert.equal(parseArguments(['full', '--partitions', '3']).partitions, 3);
  for (const value of ['0', '9', 'x']) assert.throws(() => parseArguments(['full', '--partitions', value]), /--partitions/);
  const serial = buildCommands(createPlan('full'), {partitions: 1});
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

test('PARTITION-DEFAULT: the full gate uses --partitions auto unless --partitions is given', async () => {
  assert.equal(parseArguments(['full']).partitions, 'auto');
  assert.equal(parseArguments(['full', '--partitions', '1']).partitions, 1);
  assert.equal(Object.hasOwn(parseArguments(['affected']), 'partitions'), false, 'affected keeps its serial default');
  assert.equal(Object.hasOwn(parseArguments(['quick']), 'partitions'), false);
  const gb = 1024 ** 3;
  const roomy = buildCommands(createPlan('full'), {durations: {}, resources: {free: 8 * gb, load: 2}}).find(command => command.name === 'browser');
  assert.equal(roomy.parallel.length, 2, 'with headroom the full gate splits in two');
  const tight = buildCommands(createPlan('full'), {durations: {}, resources: {free: 3 * gb, load: 2}}).find(command => command.name === 'browser');
  assert.equal(tight.parallel, undefined, 'without headroom it stays serial');
  const affected = buildCommands(createPlan('affected', {files: ['src/project-format.mjs']}), {resources: {free: 8 * gb, load: 2}}).find(command => command.name === 'browser');
  assert.equal(affected.parallel, undefined, 'affected stays serial by default');
  const folder = mkdtempSync(resolve(tmpdir(), 'gg-partition-default-'));
  try {
    mkdirSync(resolve(folder, 'artifacts/test-runs'), {recursive: true});
    writeFileSync(resolve(folder, 'README.md'), 'project');
    assert.equal(await run(['full', '--partitions', '1', '--dry-run'], {root: folder}), 0);
    const plan = JSON.parse(readFileSync(resolve(folder, 'artifacts/test-runs/full-plan.json'), 'utf8'));
    assert.equal(plan.partitions, 1, 'npm run test:full -- --partitions 1 forces the serial gate');
    assert.equal(plan.commands.find(command => command.name === 'browser').parallel, undefined);
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
