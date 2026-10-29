import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {createPlan, normalizeChangedPath, normalBrowserFiles, parseArguments} from '../../tools/test/impact.mjs';
import {captureSnapshot, compareSnapshots} from '../../tools/test/snapshot.mjs';
import {buildCommands, run} from '../../tools/test/run.mjs';

test('TEST-IMPACT: persistence, UI and PXT select their observable integration boundaries', () => {
  const persistence = createPlan('affected', {files: ['src/project-format.mjs', 'src/autosave-store.mjs']});
  assert.deepEqual(persistence.browser, ['tests/browser/device-integration.spec.mjs', 'tests/browser/language-runtime.spec.mjs', 'tests/browser/offline-recovery.spec.mjs', 'tests/browser/packs-lessons.spec.mjs', 'tests/browser/project-persistence.spec.mjs', 'tests/browser/textual-corpus.spec.mjs', 'tests/browser/textual-equivalence.spec.mjs']);
  assert.equal(persistence.node, true);
  const controls = createPlan('affected', {files: ['spikes/browser/shell/index.html', 'spikes/browser/shell/style.css']});
  assert.deepEqual(new Set(controls.browser), new Set(['tests/browser/device-integration.spec.mjs', 'tests/browser/device-transfer.spec.mjs', 'tests/browser/packs-lessons.spec.mjs', 'tests/browser/offline-recovery.spec.mjs', 'tests/browser/textual-corpus.spec.mjs', 'tests/browser/textual-equivalence.spec.mjs', 'tests/browser/language-runtime.spec.mjs', 'tests/browser/project-persistence.spec.mjs', 'tests/browser/bindings-editor.spec.mjs', 'tests/browser/audio-variables.spec.mjs', 'tests/browser/code-console.spec.mjs']));
  assert.equal(controls.browser.some(file => /pxt|simulator/.test(file)), false);
  const pxt = createPlan('affected', {files: ['spikes/browser/runner/compiler-worker.js']});
  assert.deepEqual(new Set(pxt.browser), new Set(['tests/browser/device-integration.spec.mjs', 'tests/browser/device-transfer.spec.mjs', 'tests/browser/pxt-worker.spec.mjs', 'tests/browser/simulator.spec.mjs']));
  const joint = createPlan('affected', {files: ['src/project-archive.mjs', 'spikes/browser/runner/compiler-worker.js']});
  assert.equal(joint.browser.length, 10);
});

test('TEST-IMPACT: Studio HTML and CSS include the entry journey and real accessibility while preserving shared full selection', () => {
  for (const file of ['src/studio/index.html', 'src/studio/style.css']) {
    const plan = createPlan('affected', {files:[file]});
    assert.equal(plan.selection, 'affected');
    for (const name of ['educational-activities', 'studio-contextual-workspace', 'studio-entry-journey', 'accessibility-shell', 'accessibility-runner', 'accessibility-zoom', 'project-persistence']) {
      assert.ok(plan.browser.includes(`tests/browser/${name}.spec.mjs`), `${file} must select ${name}`);
    }
    assert.equal(plan.baselineMayAdvance, false);
  }
  assert.equal(createPlan('affected', {files:['src/studio/shell.js']}).selection, 'full');
});

test('TEST-IMPACT: every unknown or shared boundary expands to full coverage', () => {
  for (const file of ['some-new-module.mjs', 'src/new-domain.mjs', 'spikes/browser/runner/runner.js', 'spikes/browser/shell/shell.js', 'tools/f0/build-browser.mjs', 'tools/test/run.mjs', 'package-lock.json', 'playwright.config.mjs', '../xcratch-scratch-editor/packages/scratch-vm/src/index.js', '../pxt-microbit/README.md']) {
    const plan = createPlan('affected', {files: [file]});
    assert.equal(plan.selection, 'full', file);
    assert.deepEqual(new Set(plan.browser), new Set(normalBrowserFiles), file);
    assert.equal(plan.quick, true, file);
    assert.equal(plan.baselineMayAdvance, false, file);
  }
});

test('TEST-IMPACT: documentation validates specs and missing/corrupt baselines never skip runtime tests', () => {
  const docs = createPlan('affected', {files: ['README.md', 'openspec/changes/x/specs/y/spec.md', '../docs/architecture/PLAN.md']});
  assert.equal(docs.selection, 'documentation');
  assert.equal(docs.validateSpecs, true);
  assert.equal(docs.build, false);
  assert.equal(docs.node, false);
  assert.deepEqual(buildCommands(docs).map(command => command.name), ['specs']);
  for (const status of ['missing', 'corrupt']) {
    const plan = createPlan('affected', {files: [], source: 'snapshot', baselineStatus: status});
    assert.equal(plan.selection, 'full');
    assert.equal(plan.browser.length, normalBrowserFiles.length);
    assert.equal(plan.node, true);
  }
  const none = createPlan('affected', {files: []});
  assert.equal(none.selection, 'unchanged');
  assert.deepEqual(buildCommands(none), []);
});

test('TEST-IMPACT: portable path normalization accepts WSL and rejects traversal outside the workspace', () => {
  const root = '/home/user/work/studio';
  assert.equal(normalizeChangedPath('src/project-format.mjs', {root}), 'src/project-format.mjs');
  assert.equal(normalizeChangedPath('\\\\wsl.localhost\\Ubuntu\\home\\user\\work\\studio\\src\\project-format.mjs', {root}), 'src/project-format.mjs');
  assert.equal(normalizeChangedPath('/home/user/work/studio/src/project-format.mjs', {root}), 'src/project-format.mjs');
  assert.equal(normalizeChangedPath('../pxt-microbit/built/target.json', {root}), '../pxt-microbit/built/target.json');
  assert.throws(() => normalizeChangedPath('../../secret', {root}), /fuera/);
  assert.throws(() => normalizeChangedPath('C:\\Users\\secret', {root}), /fuera/);
  assert.throws(() => normalizeChangedPath('src/bad\npath', {root}), /inválida/);
});

test('TEST-IMPACT: CLI rejects ambiguous or unsupported options rather than silently dropping paths', () => {
  assert.deepEqual(parseArguments(['affected', '--files', 'a.mjs', 'b.mjs', '--list']), {profile: 'affected', files: ['a.mjs', 'b.mjs'], explicit: true, dryRun: true, forceBuild: false});
  assert.equal(parseArguments(['full', '--force-build', '--dry-run']).forceBuild, true);
  for (const args of [['affected', '--files'], ['quick', '--files', 'a'], ['full', '--unknown'], ['fake']]) assert.throws(() => parseArguments(args));
});

test('TEST-IMPACT: full fails fast through smoke before canonical browser coverage and partial runs isolate reports', () => {
  const full = buildCommands(createPlan('full'), {forceBuild: true});
  assert.ok(full.findIndex(command => command.name === 'smoke') < full.findIndex(command => command.name === 'browser'));
  assert.ok(full.find(command => command.name === 'build').args.includes('--force'));
  assert.equal(full.find(command => command.name === 'browser').env, undefined);
  assert.match(full.find(command => command.name === 'smoke').env.PLAYWRIGHT_JSON_OUTPUT_FILE, /full-smoke-browser\.json$/);
  const partial = buildCommands(createPlan('affected', {files: ['src/project-format.mjs']}));
  assert.match(partial.find(command => command.name === 'browser').env.PLAYWRIGHT_JSON_OUTPUT_FILE, /affected-browser\.json$/);
  assert.equal(partial.find(command => command.name === 'browser').args.includes('tests/browser/project-persistence.spec.mjs'), true);
  const quick = buildCommands(createPlan('quick'));
  assert.equal(quick.some(command => command.name === 'browser'), false);
  assert.match(quick.find(command => command.name === 'smoke').env.GG_TEST_EVIDENCE_DIR, /quick-cases$/);
});

test('TEST-IMPACT: content snapshots detect new, renamed, deleted and same-length changed files without Git', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'gg-test-impact-'));
  try {
    mkdirSync(resolve(root, 'src')); mkdirSync(resolve(root, 'artifacts'));
    writeFileSync(resolve(root, 'src/a.mjs'), 'first');
    const first = captureSnapshot(root, {includeUpstreams: false});
    writeFileSync(resolve(root, 'src/a.mjs'), 'other');
    writeFileSync(resolve(root, 'artifacts/ignored.json'), 'changed');
    assert.deepEqual(compareSnapshots(first, captureSnapshot(root, {includeUpstreams: false})).changed, ['src/a.mjs']);
    renameSync(resolve(root, 'src/a.mjs'), resolve(root, 'src/b.mjs'));
    assert.deepEqual(compareSnapshots(first, captureSnapshot(root, {includeUpstreams: false})).changed, ['src/a.mjs', 'src/b.mjs']);
    assert.equal(compareSnapshots({version: 1, root, files: {'src/a.mjs': 'not-a-hash'}}, first).status, 'corrupt');
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('TEST-IMPACT: consumed installed storage chunks invalidate snapshots despite general dependency exclusion', () => {
  const workspace = mkdtempSync(resolve(tmpdir(), 'gg-test-chunks-'));
  const root = resolve(workspace, 'studio');
  const chunks = resolve(workspace, 'xcratch-scratch-editor/node_modules/scratch-storage/dist/web/chunks');
  try {
    mkdirSync(root); mkdirSync(chunks, {recursive: true});
    writeFileSync(resolve(root, 'README.md'), 'project');
    writeFileSync(resolve(chunks, 'storage.js'), 'first');
    const first = captureSnapshot(root);
    writeFileSync(resolve(chunks, 'storage.js'), 'other');
    const changed = compareSnapshots(first, captureSnapshot(root)).changed;
    assert.deepEqual(changed, ['../xcratch-scratch-editor/node_modules/scratch-storage/dist/web/chunks/storage.js']);
    assert.equal(createPlan('affected', {files: changed, source: 'snapshot'}).selection, 'full');
    rmSync(resolve(chunks, 'storage.js'));
    assert.deepEqual(compareSnapshots(first, captureSnapshot(root)).changed, changed);
  } finally { rmSync(workspace, {recursive: true, force: true}); }
});

test('TEST-IMPACT: dry-run writes an explainable plan and cannot establish a successful-full baseline', async () => {
  const root = mkdtempSync(resolve(tmpdir(), 'gg-test-plan-'));
  try {
    mkdirSync(resolve(root, 'tests/integration'), {recursive: true});
    writeFileSync(resolve(root, 'tests/integration/sample.test.mjs'), '');
    const result = await run(['affected', '--files', 'src/project-format.mjs', '--dry-run'], {root});
    assert.equal(result, 0);
    const plan = JSON.parse(readFileSync(resolve(root, 'artifacts/test-runs/affected-plan.json')));
    assert.equal(plan.source, 'explicit');
    assert.equal(plan.reasons[0].group, 'persistence');
    assert.equal(plan.commands.some(command => command.name === 'build'), true);
    assert.throws(() => readFileSync(resolve(root, 'artifacts/test-runs/baseline.json')), /ENOENT/);
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('TEST-IMPACT: incomplete, modified and foreign baselines expand conservatively', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'gg-test-integrity-'));
  try {
    writeFileSync(resolve(root, 'a.mjs'), 'one'); writeFileSync(resolve(root, 'b.mjs'), 'two');
    const current = captureSnapshot(root, {includeUpstreams: false});
    assert.equal(compareSnapshots(current, current).status, 'valid');
    const incomplete = structuredClone(current); delete incomplete.files['a.mjs'];
    const changed = structuredClone(current); changed.files['a.mjs'] = '0'.repeat(64);
    const checksum = structuredClone(current); checksum.integrity = '0'.repeat(64);
    const foreign = structuredClone(current); foreign.root = '/different/project';
    for (const previous of [incomplete, changed, checksum, foreign]) {
      const comparison = compareSnapshots(previous, current);
      assert.equal(comparison.status, 'corrupt');
      assert.equal(createPlan('affected', {baselineStatus: comparison.status}).selection, 'full');
    }
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('TEST-IMPACT: failed real child stops the profile without changing baseline or canonical browser report', async () => {
  const root = mkdtempSync(resolve(tmpdir(), 'gg-test-failure-'));
  try {
    mkdirSync(resolve(root, 'tests/integration'), {recursive: true});
    mkdirSync(resolve(root, 'artifacts/test-runs'), {recursive: true});
    writeFileSync(resolve(root, 'tests/integration/fails.test.mjs'), "import test from 'node:test'; test('intentional child failure', () => { throw new Error('expected verifier failure'); });\n");
    const baselinePath = resolve(root, 'artifacts/test-runs/baseline.json');
    const canonicalPath = resolve(root, 'artifacts/browser-results.json');
    writeFileSync(baselinePath, '{"keep":"baseline"}'); writeFileSync(canonicalPath, '{"keep":"canonical"}');
    assert.notEqual(await run(['full'], {root}), 0);
    const result = JSON.parse(readFileSync(resolve(root, 'artifacts/test-runs/full-results.json')));
    assert.equal(result.steps.length, 1);
    assert.equal(result.steps[0].name, 'integration');
    assert.equal(result.baselineWritten, false);
    assert.equal(readFileSync(baselinePath, 'utf8'), '{"keep":"baseline"}');
    assert.equal(readFileSync(canonicalPath, 'utf8'), '{"keep":"canonical"}');
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('TEST-IMPACT: changing source during a full run is not certified even when every child succeeds', async () => {
  const root = mkdtempSync(resolve(tmpdir(), 'gg-test-race-'));
  try {
    mkdirSync(resolve(root, 'tests/integration'), {recursive: true});
    mkdirSync(resolve(root, 'artifacts/test-runs'), {recursive: true});
    writeFileSync(resolve(root, 'tests/integration/stable.test.mjs'), 'initial');
    const baselinePath = resolve(root, 'artifacts/test-runs/baseline.json');
    writeFileSync(baselinePath, '{"keep":"prior"}');
    const code = await run(['full'], {root, executeCommand: async command => {
      if (command.name === 'integration') writeFileSync(resolve(root, 'tests/integration/stable.test.mjs'), 'changed during execution');
      return {name: command.name, exitCode: 0};
    }});
    assert.equal(code, 1);
    const result = JSON.parse(readFileSync(resolve(root, 'artifacts/test-runs/full-results.json')));
    assert.equal(result.error, 'sourceChanged');
    assert.deepEqual(result.changedDuringRun, ['tests/integration/stable.test.mjs']);
    assert.equal(result.baselineWritten, false);
    assert.equal(readFileSync(baselinePath, 'utf8'), '{"keep":"prior"}');
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('TEST-IMPACT: syntactically valid but unusable JSON baselines fall back to a complete plan', async () => {
  const root = mkdtempSync(resolve(tmpdir(), 'gg-test-corrupt-baseline-'));
  try {
    mkdirSync(resolve(root, 'artifacts/test-runs'), {recursive: true});
    writeFileSync(resolve(root, 'README.md'), 'a project');
    for (const content of ['null', '[]', '{"version":1,"producer":"someone-else"}']) {
      writeFileSync(resolve(root, 'artifacts/test-runs/baseline.json'), content);
      assert.equal(await run(['affected', '--list'], {root}), 0);
      const plan = JSON.parse(readFileSync(resolve(root, 'artifacts/test-runs/affected-plan.json')));
      assert.equal(plan.selection, 'full');
      assert.equal(plan.commands.some(command => command.name === 'browser'), true);
    }
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('TEST-IMPACT: code-view parsing and authenticated transport include the real conversion browser gate', () => {
  for (const file of ['src/targets/text/code-view-parser.mjs','src/studio/code-view-service.mjs','src/contracts/code-view-conversion.mjs']) {
    const plan=createPlan('affected',{files:[file]});
    assert.equal(plan.selection,'affected');
    assert.ok(plan.browser.includes('tests/browser/code-view-conversion.spec.mjs'),file);
    assert.ok(plan.browser.includes('tests/browser/project-persistence.spec.mjs'),file);
  }
  assert.ok(createPlan('affected',{files:['src/code-view-identity.mjs']}).browser.includes('tests/browser/code-view-conversion.spec.mjs'));
});
