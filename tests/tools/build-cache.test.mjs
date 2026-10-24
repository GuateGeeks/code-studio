import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, utimesSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {StageCache, assertWithin} from '../../tools/build/stage-cache.mjs';

function setup(t) {
  const root = mkdtempSync(join(tmpdir(), 'gg-build-cache-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const output = join(root, 'out'); mkdirSync(output);
  const input = join(root, 'source.js'); writeFileSync(input, 'first');
  const cache = options => new StageCache({cacheRoot: join(root, 'cache'), outputRoot: output, toolchain: 'test-runtime', ...options});
  return {root, output, input, cache};
}

test('content signatures reuse a stage even when source mtimes change', async t => {
  const {output, input, cache} = setup(t); let executions = 0;
  const target = join(output, 'bundle.js');
  const execute = async () => { executions++; writeFileSync(target, readFileSync(input)); return {outputs: [target]}; };
  assert.equal((await cache().run('bundle', {inputs: [input], execute})).status, 'built');
  utimesSync(input, new Date(0), new Date(0));
  assert.equal((await cache().run('bundle', {inputs: [input], execute})).status, 'reused');
  assert.equal(executions, 1);
});

test('transitive content changes invalidate unchanged entries, even preserving mtime', async t => {
  const {root, output, input, cache} = setup(t);
  const dependency = join(root, 'dependency.js'); writeFileSync(dependency, 'dependency v1');
  const target = join(output, 'bundle.js');
  const execute = async () => { writeFileSync(target, readFileSync(dependency)); return {outputs: [target], files: [dependency]}; };
  await cache().run('bundle', {inputs: [input], execute});
  writeFileSync(dependency, 'dependency v2'); utimesSync(dependency, new Date(0), new Date(0));
  const result = await cache().run('bundle', {inputs: [input], execute});
  assert.equal(result.reason, 'inputs-changed');
  assert.equal(readFileSync(target, 'utf8'), 'dependency v2');
});

test('missing and tampered chunks invalidate the bundle that owns them', async t => {
  const {output, input, cache} = setup(t);
  const bundle = join(output, 'bundle.js'); const chunk = join(output, 'worker.chunk.js');
  const execute = async () => { writeFileSync(bundle, 'bundle'); writeFileSync(chunk, 'worker'); return {outputs: [bundle, chunk]}; };
  await cache().run('bundle', {inputs: [input], execute});
  writeFileSync(chunk, 'changed');
  assert.equal((await cache().run('bundle', {inputs: [input], execute})).reason, 'outputs-changed');
  rmSync(chunk);
  assert.equal((await cache().run('bundle', {inputs: [input], execute})).reason, 'outputs-missing-or-invalid');
  assert.equal(readFileSync(chunk, 'utf8'), 'worker');
});

test('context membership and previously missing resolution candidates invalidate dependencies', async t => {
  const {root, output, input, cache} = setup(t);
  const context = join(root, 'dynamic'); mkdirSync(context); writeFileSync(join(context, 'one.js'), 'one');
  const missing = join(root, 'optional.js'); const target = join(output, 'bundle.js');
  const execute = async () => { writeFileSync(target, 'bundle'); return {outputs: [target], contexts: [context], missing: [missing]}; };
  await cache().run('bundle', {inputs: [input], execute});
  writeFileSync(join(context, 'two.js'), 'two');
  assert.equal((await cache().run('bundle', {inputs: [input], execute})).reason, 'inputs-changed');
  writeFileSync(missing, 'now resolves');
  assert.equal((await cache().run('bundle', {inputs: [input], execute})).reason, 'inputs-changed');
});

test('a failed build cannot reuse its previous success record', async t => {
  const {output, input, cache} = setup(t); const target = join(output, 'bundle.js');
  const good = async () => { writeFileSync(target, 'bundle'); return {outputs: [target]}; };
  await cache().run('bundle', {inputs: [input], execute: good});
  await assert.rejects(cache({force: true}).run('bundle', {inputs: [input], execute: async () => { throw new Error('compile failed'); }}), /compile failed/);
  assert.equal((await cache().run('bundle', {inputs: [input], execute: good})).reason, 'no-cache');
});

test('removed static sources retire only their previously owned outputs', async t => {
  const {output, input, cache} = setup(t); const old = join(output, 'old.js'); const keep = join(output, 'keep.js');
  await cache().run('static', {inputs: [input], execute: async () => { writeFileSync(old, 'old'); return {outputs: [old]}; }});
  writeFileSync(keep, 'other stage'); writeFileSync(input, 'changed');
  await cache().run('static', {inputs: [input], execute: async () => ({outputs: []})});
  assert.equal(existsSync(old), false);
  assert.equal(readFileSync(keep, 'utf8'), 'other stage');
});

test('force, runtime changes and corrupt state force regeneration', async t => {
  const {root, output, input, cache} = setup(t); const target = join(output, 'bundle.js');
  const execute = async () => { writeFileSync(target, 'bundle'); return {outputs: [target]}; };
  await cache().run('bundle', {inputs: [input], execute});
  assert.equal((await cache({force: true}).run('bundle', {inputs: [input], execute})).reason, 'forced');
  assert.equal((await cache({toolchain: 'new-runtime'}).run('bundle', {inputs: [input], execute})).reason, 'inputs-changed');
  writeFileSync(join(root, 'cache/bundle.json'), '{');
  assert.equal((await cache().run('bundle', {inputs: [input], execute})).reason, 'no-cache');
});

test('cache cleanup never accepts an output outside its declared root', t => {
  const {root, output} = setup(t);
  assert.throws(() => assertWithin(output, join(root, 'upstream.js')), /outside/);
  assert.throws(() => assertWithin(output, output), /outside/);
});

test('valid JSON with malformed cache shape or changed metadata rebuilds conservatively', async t => {
  const {root, output, input, cache} = setup(t); const target = join(output, 'bundle.js');
  const execute = async () => { writeFileSync(target, 'bundle'); return {outputs: [target], metadata: {catalogVersion: 1}}; };
  await cache().run('bundle', {inputs: [input], execute});
  const original = JSON.parse(readFileSync(join(root, 'cache/bundle.json'), 'utf8'));
  for (const state of [{version: 1}, {...original, dependencies: {files: 'not-an-array', contexts: [], missing: []}}, {...original, metadata: {catalogVersion: 999}}, {...original, outputs: [{file: '../unsafe'}]}]) {
    writeFileSync(join(root, 'cache/bundle.json'), JSON.stringify(state));
    assert.equal((await cache().run('bundle', {inputs: [input], execute})).reason, 'no-cache');
  }
});
