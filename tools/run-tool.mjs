import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {projectRoot} from '../spikes/paths.mjs';

const [tool, ...args] = process.argv.slice(2);
const entries = {
  openspec: '@fission-ai/openspec/bin/openspec.js',
  codegraph: '@colbymchenry/codegraph/npm-shim.js'
};
if (!Object.hasOwn(entries, tool)) throw new Error(`Unknown tool: ${tool}`);
const result = spawnSync(process.execPath, [resolve(projectRoot, 'node_modules', entries[tool]), ...args], {
  cwd: projectRoot, stdio: 'inherit',
  env: {...process.env, OPENSPEC_TELEMETRY: '0', CODEGRAPH_TELEMETRY: '0', CODEGRAPH_NO_DOWNLOAD: '1', DO_NOT_TRACK: '1'}
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
