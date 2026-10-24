import {spawn} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {projectRoot} from '../../spikes/paths.mjs';

const child = spawn('bash', [resolve(projectRoot, 'tools/codegraph.sh'), 'serve', '--mcp', '--path', projectRoot, '--no-watch'], {
  cwd: projectRoot, detached: true, stdio: ['pipe', 'pipe', 'pipe']
});
let pending = '';
let stderr = '';
const waiting = new Map();
const timeout = setTimeout(() => fail(new Error('MCP handshake timed out')), 15000);
let completed = false;
function cleanup() {
  clearTimeout(timeout);
  try { process.kill(-child.pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
}
function fail(error) {
  if (completed) return;
  completed = true;
  cleanup();
  console.error(error.message, stderr.slice(-1000));
  process.exitCode = 1;
}
function send(message) { child.stdin.write(JSON.stringify(message) + '\n'); }
child.stderr.on('data', data => { stderr += data; });
child.on('error', fail);
child.on('exit', code => { if (!completed) fail(new Error(`MCP server exited early: ${code}`)); });
child.stdout.on('data', data => {
  pending += data;
  let newline;
  while ((newline = pending.indexOf('\n')) !== -1) {
    const line = pending.slice(0, newline);
    pending = pending.slice(newline + 1);
    if (!line.trim()) continue;
    let message;
    try { message = JSON.parse(line); } catch { fail(new Error('Non-JSON output on MCP stdout')); return; }
    waiting.get(message.id)?.(message);
  }
});
waiting.set(1, message => {
  if (message.error) { fail(new Error(JSON.stringify(message.error))); return; }
  send({jsonrpc: '2.0', method: 'notifications/initialized'});
  send({jsonrpc: '2.0', id: 2, method: 'tools/list', params: {}});
});
waiting.set(2, message => {
  if (message.error || !message.result?.tools?.length) { fail(new Error('No MCP tools returned')); return; }
  const tools = message.result.tools.map(tool => tool.name);
  mkdirSync(resolve(projectRoot, 'artifacts/codegraph'), {recursive: true});
  writeFileSync(resolve(projectRoot, 'artifacts/codegraph/mcp-smoke.json'), JSON.stringify({transport: 'stdio', initialized: true, tools}, null, 2) + '\n');
  console.log(`CodeGraph MCP initialized; ${tools.length} tools exposed: ${tools.join(', ')}`);
  completed = true;
  cleanup();
});
send({jsonrpc: '2.0', id: 1, method: 'initialize', params: {protocolVersion: '2024-11-05', capabilities: {}, clientInfo: {name: 'gg-phase-0-check', version: '0.0.0'}}});
