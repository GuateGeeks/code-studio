// Node suites that run with only this repository and its npm dependencies
// (the CI `standalone` job). The suites listed below load the Xcratch VM, the
// pxt-microbit target or the browser build, so they need the workspace that
// tools/workspace/bootstrap.sh prepares; `npm run test:quick` runs them there.
import {spawn} from 'node:child_process';
import {readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {projectRoot} from '../paths.mjs';

export const workspaceSuites = new Set([
  'tests/integration/bindings.test.mjs',
  'tests/integration/blockly-scratch.test.mjs',
  'tests/integration/minimum-corpus.test.mjs',
  'tests/integration/packs.test.mjs',
  'tests/integration/pxt.test.mjs',
  'tests/integration/resources-v2.test.mjs',
  'tests/integration/sb3-program.test.mjs',
  'tests/integration/scratch-stage-input.test.mjs',
  'tests/integration/text-program.test.mjs',
  'tests/tools/language-origin.test.mjs',
  'tests/tools/release-materials.test.mjs',
  'tests/tools/release-snapshot.test.mjs'
]);

export function standaloneSuites(root = projectRoot) {
  return ['tests/integration', 'tests/tools'].flatMap(directory => readdirSync(resolve(root, directory))
    .filter(file => file.endsWith('.test.mjs')).sort().map(file => `${directory}/${file}`))
    .filter(file => !workspaceSuites.has(file));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const child = spawn(process.execPath, ['--test', ...standaloneSuites()], {cwd: projectRoot, stdio: 'inherit'});
  child.once('close', code => { process.exitCode = code ?? 1; });
}
