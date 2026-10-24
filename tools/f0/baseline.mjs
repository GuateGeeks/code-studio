import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, mkdirSync, writeFileSync, existsSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const workspaceRoot = resolve(projectRoot, '..');
const output = resolve(projectRoot, 'artifacts/baseline');
mkdirSync(output, {recursive: true});
if (existsSync(resolve(output, 'inventory.json'))) throw new Error('Baseline already exists. Use tools/f0/verify-baseline.mjs to compare; preserve the original snapshot.');
const hash = data => createHash('sha256').update(data).digest('hex');
const repositories = {};
for (const name of ['raspberrypi-blockly', 'xcratch-scratch-editor', 'pxt-microbit']) {
  const cwd = resolve(workspaceRoot, name);
  const git = args => execFileSync('git', args, {cwd, maxBuffer: 64 * 1024 * 1024});
  const diff = git(['diff', '--binary', '--no-ext-diff', 'HEAD']);
  const status = git(['status', '--porcelain=v1', '--untracked-files=normal']).toString();
  const changedPaths = git(['diff', '--name-only', '-z', 'HEAD']).toString().split('\0').filter(Boolean);
  const changedFiles = Object.fromEntries(changedPaths.map(path => {
    try { return [path, hash(readFileSync(resolve(cwd, path)))]; }
    catch (error) { if (error.code === 'ENOENT') return [path, 'deleted']; throw error; }
  }));
  writeFileSync(resolve(output, `${name}.patch`), diff);
  writeFileSync(resolve(output, `${name}.status.txt`), status);
  repositories[name] = {
    commit: git(['rev-parse', 'HEAD']).toString().trim(),
    branch: git(['branch', '--show-current']).toString().trim(),
    trackedDiffSha256: hash(diff),
    changedFiles,
    package: JSON.parse(readFileSync(resolve(cwd, 'package.json'), 'utf8')).version,
    lockSha256: hash(readFileSync(resolve(cwd, 'package-lock.json'))),
    trackedChangeCount: changedPaths.length,
    statusArtifact: `${name}.status.txt`,
    patchArtifact: `${name}.patch`
  };
}
const inventory = {recordedAt: new Date().toISOString(), node: process.version, repositories};
writeFileSync(resolve(output, 'inventory.json'), JSON.stringify(inventory, null, 2) + '\n');
for (const [name, info] of Object.entries(repositories)) {
  console.log(`${name}: ${info.commit}; ${info.trackedChangeCount} tracked changes`);
}
