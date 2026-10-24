import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, existsSync, mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {localModuleInputs} from '../../tools/build/module-inputs.mjs';
import {dirname, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {classifyFile} from '../../tools/test/impact.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ownRoot = resolve(root, 'src');
const sourceFiles = directory => readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
  const path = resolve(directory, entry.name);
  return entry.isDirectory() ? sourceFiles(path) : /\.(?:mjs|js)$/.test(entry.name) ? [path] : [];
});
// Static import/export and literal dynamic loaders cover the owned source style.
// This deliberately also checks classic worker importScripts dependencies.
function imports(source) {
  return [...source.matchAll(/(?:\b(?:import|export)\s+(?:[^;'"]*?\s+from\s*)?['"]([^'"]+)['"]|\b(?:import|require)\s*\(\s*['"]([^'"]+)['"]|\bimportScripts\s*\(([^)]+)\))/g)]
    .flatMap(match => match[1] || match[2] ? [match[1] ?? match[2]] : [...match[3].matchAll(/['"]([^'"]+)['"]/g)].map(item => item[1]));
}
function issues(path, source) {
  const result = [];
  const plain = source.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, '');
  const ownedModel = path.startsWith('src/contracts/') || path.startsWith('src/packs/') || path.startsWith('src/assets/lessons/') || /^src\/[^/]+\.mjs$/.test(path);
  const scratchAdapter = path.startsWith('src/adapters/scratch/');
  const microbitTarget = path.startsWith('src/targets/microbit/');
  for (const dependency of imports(plain)) {
    if (/(?:^|\/)spikes(?:\/|$)/.test(dependency)) result.push('production import into spikes');
    if (dependency.startsWith('.')) {
      const target = resolve(root, dirname(path), dependency);
      if (!target.startsWith(ownRoot + '/')) result.push('local import escapes src');
      if (!existsSync(target)) result.push('local dependency does not exist');
      const targetPath = relative(root, target).replaceAll('\\', '/');
      if (ownedModel && !/^src\/(?:contracts\/|packs\/|assets\/lessons\/|[^/]+\.mjs$)/.test(targetPath)) result.push('model depends on implementation layer');
      if (path.startsWith('src/editor/') && /^src\/(?:adapters|studio|runtime|targets)\//.test(targetPath)) result.push('editor imports engine or shell layer');
      if (path.startsWith('src/studio/') && /^src\/(?:adapters|runtime|targets)\//.test(targetPath)) result.push('shell imports execution internals');
    } else if (!dependency.startsWith('/') && !path.startsWith('src/editor/') && !path.startsWith('src/targets/text/') && !(path === 'src/targets/assets/pako-entry.mjs' && dependency === 'pako') && !(path === 'src/adapters/babylon/adapter.mjs' && /^@babylonjs\/(?:core|loaders)(?:\/|$)/.test(dependency))) result.push('external package outside editor adapter or text target');
  }
  if (ownedModel && /\bdocument\s*\.\s*(?:querySelector|querySelectorAll|createElement|addEventListener|getElementById|body)\b|\b(?:window|HTMLElement|Blockly|VirtualMachine|ScratchRender|ScratchStorage|ScratchAudio|pxt|pxtc|pxsim)\s*[.(]/.test(plain)) result.push('model knows DOM or engine API');
  if (!scratchAdapter && /\b(?:VirtualMachine|ScratchRender|ScratchStorage|ScratchAudio)\b|\.\s*(?:_primitives|_gl|getSpriteTargetByName)\b/.test(plain)) result.push('Scratch internals outside adapter');
  if (!microbitTarget && /\b(?:pxt|pxtc|pxsim|DalBoard)\s*[.(]/.test(plain)) result.push('PXT internals outside target');
  return [...new Set(result)].map(reason => `${path}: ${reason}`);
}

test('GG-BOUNDARY-001/002: production imports resolve inside src and engine knowledge stays in adapters', () => {
  const failures = sourceFiles(ownRoot).flatMap(path => issues(relative(root, path).replaceAll('\\', '/'), readFileSync(path, 'utf8')));
  assert.deepEqual(failures, []);
  const editor = readFileSync(resolve(ownRoot, 'editor/block-program.mjs'), 'utf8');
  assert.equal(editor.includes('toScratchProject'), false);
  const build = readFileSync(resolve(root, 'tools/f0/build-browser.mjs'), 'utf8');
  assert.equal(/spikes\//.test(build), false);
});

test('GG-BOUNDARY-002: forbidden dependency examples report file and reason', () => {
  assert.match(issues('src/contracts/bad.mjs', "import {x} from '../../spikes/program-contract.mjs';")[0], /src\/contracts\/bad.mjs: production import into spikes/);
  assert.match(issues('src/studio/bad.mjs', "import {x} from '../adapters/scratch/gg-bindings.mjs';").join('\n'), /shell imports execution internals/);
  assert.match(issues('src/editor/bad.mjs', "export {x} from '../adapters/scratch/scratch-project.mjs';").join('\n'), /editor imports engine/);
  assert.match(issues('src/contracts/bad.mjs', 'document.querySelector("body");').join('\n'), /model knows DOM/);
  assert.match(issues('src/packs/gg.example/manifest.mjs', 'document.querySelector("body");').join('\n'), /model knows DOM/);
  assert.match(issues('src/assets/lessons/bad.mjs', "import {x} from '../../studio/shell.js';").join('\n'), /model depends on implementation layer/);
  assert.match(issues('src/runtime/bad.js', 'const vm = new VirtualMachine();').join('\n'), /Scratch internals outside adapter/);
  assert.match(issues('src/runtime/bad.js', 'pxt.setupSimpleCompile({});').join('\n'), /PXT internals outside target/);
  assert.match(issues('src/project-bad.mjs', 'const x = import("../spikes/gg-client.mjs");').join('\n'), /production import into spikes/);
});

test('GG-BOUNDARY-003: moved source paths retain conservative affected selection', () => {
  assert.equal(classifyFile('src/runtime/runner.js').group, 'full');
  assert.equal(classifyFile('src/studio/shell.js').group, 'full');
  assert.equal(classifyFile('src/contracts/program-contract.mjs').group, 'two-dimensional');
  assert.equal(classifyFile('src/editor/editor-entry.mjs').group, 'two-dimensional');
  assert.equal(classifyFile('src/adapters/scratch/browser-scene.mjs').group, 'two-dimensional');
  assert.equal(classifyFile('src/targets/microbit/compiler-worker.js').group, 'pxt');
  assert.equal(classifyFile('src/studio/index.html').browser.includes('tests/browser/scene-inspector.spec.mjs'), true);
  assert.equal(classifyFile('src/scene-inspection.mjs').group, 'scene-inspector');
});

test('GG-BOUNDARY-003: fixture graph tracks local transitive imports, reexports and cycles', t => {
  const directory = mkdtempSync(resolve(tmpdir(), 'gg-owned-imports-'));
  t.after(() => rmSync(directory, {recursive: true, force: true}));
  writeFileSync(resolve(directory, 'entry.mjs'), "import './middle.mjs';");
  writeFileSync(resolve(directory, 'middle.mjs'), "export * from './helper.mjs';");
  writeFileSync(resolve(directory, 'helper.mjs'), "import './entry.mjs'; import 'external-package';");
  assert.deepEqual(localModuleInputs([resolve(directory, 'entry.mjs')]), ['entry.mjs', 'helper.mjs', 'middle.mjs'].map(file => resolve(directory, file)));
});
