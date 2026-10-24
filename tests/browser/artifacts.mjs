import {mkdirSync} from 'node:fs';
import {isAbsolute, relative, resolve, sep} from 'node:path';

// Profile runs redirect only evidence paths. The assertions and browser inputs
// remain identical to the canonical regression suite.
export function artifactPath(name, {root = process.cwd(), directory = process.env.GG_TEST_EVIDENCE_DIR ?? 'artifacts'} = {}) {
  if (typeof name !== 'string' || !name || name.includes('/') || name.includes('\\') || /[\0\r\n]/.test(name) || name === '.' || name === '..') throw new Error('Nombre de artefacto inválido');
  const artifacts = resolve(root, 'artifacts');
  const target = resolve(root, directory);
  const boundary = relative(artifacts, target);
  if (boundary === '..' || boundary.startsWith(`..${sep}`) || isAbsolute(boundary)) throw new Error('La evidencia debe permanecer dentro de artifacts/');
  mkdirSync(target, {recursive: true});
  return relative(root, resolve(target, name)).split(sep).join('/');
}
