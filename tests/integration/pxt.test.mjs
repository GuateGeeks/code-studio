import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {projectRoot} from '../../spikes/paths.mjs';
const require = createRequire(import.meta.url);
const {compile} = require('../../spikes/pxt-adapter.cjs');
const source = 'basic.showIcon(IconNames.Heart)\n';

test('GG-PXT-001: local PXT compiles a heart to simulator JS without editor or external HTTP', async () => {
  const result = await compile(source);
  assert.equal(result.success, true);
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.networkAttempts, []);
  assert.match(result.outfiles['binary.js'], /showIcon/);
});

test('GG-PXT-002: invalid API yields diagnostics linked to main.ts', async () => {
  const result = await compile('basic.functionThatDoesNotExist()\n');
  assert.equal(result.success, false);
  assert.ok(result.diagnostics.length > 0);
  assert.ok(result.diagnostics.some(item => item.fileName === 'main.ts'));
  assert.deepEqual(result.networkAttempts, []);
});

function assertHexRecords(contents) {
  const lines = contents.trim().split(/\r?\n/);
  assert.ok(lines.length > 100);
  for (const line of lines) {
    assert.match(line, /^:[0-9a-f]+$/i);
    const bytes = Buffer.from(line.slice(1), 'hex');
    assert.equal(bytes.length, bytes[0] + 5, 'record length');
    assert.equal(bytes.reduce((sum, byte) => sum + byte, 0) % 256, 0, 'record checksum');
  }
}

test('GG-PXT-003: exact standard pack produces V1/V2 HEX using cached native runtimes', async () => {
  const result = await compile(source, {native: true});
  assert.equal(result.success, true);
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.networkAttempts, []);
  assert.equal(result.hexRequests.length, 2);
  assert.ok(result.hexRequests.every(item => item.available));
  assertHexRecords(result.outfiles['mbdal-binary.hex']);
  assertHexRecords(result.outfiles['mbcodal-binary.hex']);
  assert.ok(result.outfiles['binary.hex'].length > 1000);
  assert.equal(result.physicalBoardValidated, false);
});

test('GG-PXT-003: a missing native runtime fails explicitly without cloud fallback', async () => {
  await assert.rejects(
    compile(source, {native: true, hexCache: resolve(projectRoot, 'artifacts/intentionally-missing-cache')}),
    error => {
      assert.match(error.message, /Missing native runtime/);
      assert.deepEqual(error.evidence.networkAttempts, []);
      assert.equal(error.evidence.physicalBoardValidated, false);
      return true;
    }
  );
});
