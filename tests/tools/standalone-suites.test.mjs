import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {projectRoot} from '../../tools/paths.mjs';
import {standaloneSuites, workspaceSuites} from '../../tools/test/standalone.mjs';

test('CI-STANDALONE: the workspace-only list names existing suites and the rest run standalone', () => {
  for (const file of workspaceSuites) assert.ok(existsSync(resolve(projectRoot, file)), `${file} no existe; actualiza tools/test/standalone.mjs`);
  const suites = standaloneSuites();
  assert.ok(suites.includes('tests/tools/standalone-suites.test.mjs'));
  assert.ok(suites.length > 50);
  for (const file of suites) assert.ok(!workspaceSuites.has(file));
});
