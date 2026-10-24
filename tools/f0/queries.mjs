import {execFileSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {projectRoot, workspaceRoot} from '../../spikes/paths.mjs';

const cli = resolve(projectRoot, 'node_modules/.bin/codegraph');
const output = resolve(projectRoot, 'artifacts/codegraph/queries');
mkdirSync(output, {recursive: true});
const queries = [
  ['blockly-serialization', 'raspberrypi-blockly', 'workspaces'],
  ['blockly-zelos', 'raspberrypi-blockly', 'Renderer'],
  ['scratch-load', 'xcratch-scratch-editor', 'loadProject'],
  ['scratch-schedule', 'xcratch-scratch-editor', 'stepThreads'],
  ['scratch-stop', 'xcratch-scratch-editor', 'stopAll'],
  ['scratch-extension', 'xcratch-scratch-editor', 'loadExtensionURL'],
  ['scratch-render', 'xcratch-scratch-editor', 'RenderWebGL'],
  ['scratch-paint', 'xcratch-scratch-editor', 'PaintEditorWrapper'],
  ['microbit-sim', 'pxt-microbit', 'Board'],
  ['pxt-simple-driver', '.tools/pxt-core-source', 'simpleCompileAsync'],
  ['pxt-native-host', '.tools/pxt-core-source', 'getHexInfoAsync'],
  ['pxt-config', '.tools/pxt-core-source', 'targetConfigAsync']
];
const index = [];
for (const [name, repo, symbol] of queries) {
  const data = execFileSync(cli, ['query', '--path', resolve(workspaceRoot, repo), symbol, '--json'], {
    env: {...process.env, CODEGRAPH_TELEMETRY: '0', CODEGRAPH_NO_DOWNLOAD: '1', DO_NOT_TRACK: '1'}, maxBuffer: 8 * 1024 * 1024
  });
  const matches = JSON.parse(data);
  writeFileSync(resolve(output, `${name}.json`), data);
  index.push({name, repo, symbol, count: matches.length, matches: matches.map(({node}) => ({name: node.name, file: node.filePath, line: node.startLine}))});
}
writeFileSync(resolve(output, 'index.json'), JSON.stringify(index, null, 2) + '\n');
console.log(JSON.stringify(index.map(({name, count}) => ({name, count})), null, 2));
