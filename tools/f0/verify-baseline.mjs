import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {projectRoot, workspaceRoot} from '../../spikes/paths.mjs';

const baseline = JSON.parse(readFileSync(resolve(projectRoot, 'artifacts/baseline/inventory.json'), 'utf8'));
const hash = data => createHash('sha256').update(data).digest('hex');
const results = [];
for (const [name, previous] of Object.entries(baseline.repositories)) {
  const cwd = resolve(workspaceRoot, name);
  const git = args => execFileSync('git', args, {cwd, maxBuffer: 64 * 1024 * 1024});
  const sameCommit = git(['rev-parse', 'HEAD']).toString().trim() === previous.commit;
  const sameTrackedDiff = hash(git(['diff', '--binary', '--no-ext-diff', 'HEAD'])) === previous.trackedDiffSha256;
  const sameLock = hash(readFileSync(resolve(cwd, 'package-lock.json'))) === previous.lockSha256;
  results.push({repository: name, sameCommit, sameTrackedDiff, sameLock});
}
writeFileSync(resolve(projectRoot, 'artifacts/baseline/verification.json'), JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
if (results.some(item => !item.sameCommit || !item.sameTrackedDiff || !item.sameLock)) process.exitCode = 1;
