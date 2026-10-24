import {createHash} from 'node:crypto';
import {lstatSync, readFileSync, readdirSync, readlinkSync} from 'node:fs';
import {relative, resolve, sep} from 'node:path';

const excluded = new Set(['node_modules', '.git', '.codegraph', '.cache', '.codex', 'artifacts', 'test-results', 'playwright-report', 'dist', 'built', 'coverage', '.turbo']);
const sourceRepositories = ['raspberrypi-blockly', 'xcratch-scratch-editor', 'pxt-microbit', '.tools/pxt-core-source'];
const consumed = [
  'pxt-microbit/built/target.json', 'pxt-microbit/built/compiler.js', 'pxt-microbit/built/common-sim.js', 'pxt-microbit/built/sim.js', 'pxt-microbit/built/hexcache',
  'pxt-microbit/node_modules/pxt-core/built/web/typescript.js', 'pxt-microbit/node_modules/pxt-core/built/web/pxtworker.js', 'pxt-microbit/node_modules/pxt-core/built/web/pxtsim.js',
  'pxt-microbit/node_modules/lzma/src/lzma_worker.js', 'pxt-microbit/node_modules/.package-lock.json',
  'xcratch-scratch-editor/packages/scratch-render/dist/web/scratch-render.js', 'xcratch-scratch-editor/node_modules/scratch-storage/dist/web/scratch-storage.js', 'xcratch-scratch-editor/node_modules/scratch-storage/dist/web/chunks',
  'xcratch-scratch-editor/node_modules/scratch-audio/src', 'xcratch-scratch-editor/node_modules/scratch-svg-renderer/src', 'xcratch-scratch-editor/node_modules/.package-lock.json'
];
const sha = buffer => createHash('sha256').update(buffer).digest('hex');
const integrity = snapshot => sha(JSON.stringify([snapshot.version, snapshot.root, Object.entries(snapshot.files).sort(([a], [b]) => a.localeCompare(b))]));
export function captureSnapshot(root, {includeUpstreams = true} = {}) {
  const files = {};
  const workspace = resolve(root, '..');
  function walk(path, allowExcluded = false) {
    let info;
    try { info = lstatSync(path); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
    const key = relative(root, path).split(sep).join('/');
    if (info.isSymbolicLink()) { files[key] = sha(`symlink:${readlinkSync(path)}`); return; }
    if (info.isDirectory()) {
      for (const entry of readdirSync(path, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
        if (excluded.has(entry.name) && !allowExcluded) continue;
        walk(resolve(path, entry.name), allowExcluded);
      }
    } else if (info.isFile() && !/\.(?:log|tmp)$/.test(path)) files[key] = sha(readFileSync(path));
  }
  walk(root);
  if (includeUpstreams) {
    for (const repo of sourceRepositories) walk(resolve(workspace, repo));
    for (const file of consumed) walk(resolve(workspace, file), true);
    walk(resolve(workspace, 'scripts'));
  }
  const snapshot = {version: 1, root: resolve(root), files, fileCount: Object.keys(files).length};
  return {...snapshot, integrity: integrity(snapshot)};
}
export function compareSnapshots(previous, current) {
  if (!previous || previous.version !== 1 || previous.root !== current.root || !previous.files || typeof previous.files !== 'object' || Array.isArray(previous.files) || !Object.keys(previous.files).length || previous.fileCount !== Object.keys(previous.files).length || Object.entries(previous.files).some(([key, digest]) => !key || typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest)) || previous.integrity !== integrity(previous)) return {status: 'corrupt', changed: []};
  return {status: 'valid', changed: [...new Set([...Object.keys(previous.files), ...Object.keys(current.files)])].filter(path => previous.files[path] !== current.files[path]).sort()};
}
