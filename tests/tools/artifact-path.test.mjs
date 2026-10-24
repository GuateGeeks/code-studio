import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {artifactPath} from '../browser/artifacts.mjs';

test('TEST-ARTIFACT: partial evidence is isolated and the canonical file remains unchanged', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'gg-artifact-path-'));
  try {
    const canonical = artifactPath('f1-portable.json', {root, directory: 'artifacts'});
    writeFileSync(resolve(root, canonical), 'canonical');
    const partial = artifactPath('f1-portable.json', {root, directory: 'artifacts/test-runs/affected-cases'});
    writeFileSync(resolve(root, partial), 'partial');
    assert.equal(canonical, 'artifacts/f1-portable.json');
    assert.equal(readFileSync(resolve(root, canonical), 'utf8'), 'canonical');
    assert.equal(readFileSync(resolve(root, partial), 'utf8'), 'partial');
    assert.throws(() => artifactPath('../secret', {root}), /inválido/);
    assert.throws(() => artifactPath('file.json', {root, directory: '../elsewhere'}), /artifacts/);
  } finally { rmSync(root, {recursive: true, force: true}); }
});
