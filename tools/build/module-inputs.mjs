import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

// Follow local, literal module dependencies used by the build-owned ESM graph.
// External packages remain covered by locks and the stage's resolved dependency inventory.
export function localModuleInputs(entries) {
  const visited = new Set();
  function visit(file) {
    file = resolve(file);
    if (visited.has(file)) return;
    visited.add(file);
    if (!/\.(?:mjs|js|cjs)$/.test(file)) return;
    const source = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, '');
    for (const match of source.matchAll(/(?:\b(?:import|export)\s+(?:[^;'"]*?\s+from\s*)?['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\))/g)) {
      const specifier = match[1] ?? match[2];
      if (specifier.startsWith('.')) visit(resolve(dirname(file), specifier));
    }
  }
  for (const entry of entries) visit(entry);
  return [...visited].sort();
}
