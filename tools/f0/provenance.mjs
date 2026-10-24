import {readFileSync, writeFileSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {projectRoot, workspaceRoot, microbitRoot, xcratchRoot} from '../../spikes/paths.mjs';

const baseline = JSON.parse(readFileSync(resolve(projectRoot, 'artifacts/baseline/inventory.json'), 'utf8'));
const sha256 = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const upstream = Object.fromEntries(Object.entries(baseline.repositories).map(([name, item]) => [name, {
  commit: item.commit, packageVersion: item.package, lockSha256: item.lockSha256,
  priorTrackedChanges: item.trackedChangeCount, priorDiffSha256: item.trackedDiffSha256
}]));
const pxtPackage = JSON.parse(readFileSync(resolve(microbitRoot, 'node_modules/pxt-core/package.json'), 'utf8'));
const storage = JSON.parse(readFileSync(resolve(xcratchRoot, 'node_modules/scratch-storage/package.json'), 'utf8'));
const metadata = {
  recordedAt: new Date().toISOString(), node: process.version,
  upstream,
  pxtCore: {version: pxtPackage.version, sourceCommit: 'af4bcc89fd2114b6ec232860ce0458cb9aa0dd28',
    sourceArchiveSha256: sha256(resolve(workspaceRoot, '.tools/pxt-core-source.tar.gz'))},
  scratchStorage: {version: storage.version, sourceCommit: storage.repository.sha},
  scratchAudio: {version: JSON.parse(readFileSync(resolve(xcratchRoot, 'node_modules/scratch-audio/package.json'), 'utf8')).version, entrySha256: sha256(resolve(xcratchRoot, 'node_modules/scratch-audio/src/index.js'))},
  tools: Object.fromEntries(['@fission-ai/openspec', '@colbymchenry/codegraph', '@playwright/test', 'blockly'].map(name => [name,
    JSON.parse(readFileSync(resolve(projectRoot, 'node_modules', name, 'package.json'), 'utf8')).version])),
  assets: Object.fromEntries(['built/target.json', 'built/compiler.js', 'built/sim.js', 'built/common-sim.js', 'node_modules/pxt-core/built/web/pxtsim.js', 'targetconfig.json', ...readdirSync(resolve(microbitRoot, 'built/hexcache')).map(name => `built/hexcache/${name}`)].map(file => [file, sha256(resolve(microbitRoot, file))])),
  sourceArchiveVersion: JSON.parse(readFileSync(resolve(workspaceRoot, '.tools/pxt-core-source/package.json'), 'utf8')).version,
  python: execFileSync('python3', ['--version']).toString().trim()
};
writeFileSync(resolve(projectRoot, 'docs/phase-0/provenance.json'), JSON.stringify(metadata, null, 2) + '\n');
console.log('Saved provenance for pinned upstreams, toolchain and native caches.');
