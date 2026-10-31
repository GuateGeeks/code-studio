import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyTarball, SIM_SHA256} from '../../tools/build.mjs';

test('acepta el tarball cuyo sha256 coincide', () => {
  assert.doesNotThrow(() => verifyTarball(Buffer.from('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'));
});
test('rechaza un tarball con otro hash', () => {
  assert.throws(() => verifyTarball(Buffer.from('abc'), SIM_SHA256), /sha256/);
});
