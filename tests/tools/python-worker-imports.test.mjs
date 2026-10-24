import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname, relative, resolve} from 'node:path';

// The Python engine is served unbundled to its worker: every static import it
// reaches must be a relative module path. A bare specifier (e.g. 'acorn')
// only resolves inside the webpack-bundled QuickJS path and breaks Python.
const root = resolve(import.meta.dirname, '../..');
test('PY-WORKER: the unbundled Python engine reaches only relative static imports', () => {
  const pending = [resolve(root, 'src/targets/text/python-engine.mjs')], seen = new Set(), bare = [];
  while (pending.length) {
    const file = pending.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/^\s*(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]/gm)) {
      const specifier = match[1];
      if (!specifier.startsWith('./') && !specifier.startsWith('../')) bare.push(`${relative(root, file)} → ${specifier}`);
      else pending.push(resolve(dirname(file), specifier));
    }
  }
  assert.deepEqual(bare, []);
  assert.ok([...seen].some(file => file.endsWith('api-v3-vocabulary.mjs')), 'the API v3 vocabulary is part of the Python worker graph');
});
