import {mkdirSync, writeFileSync, existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {projectRoot} from '../spikes/paths.mjs';

// Run inside WSL with --windows for the desktop host, or without it for WSL Codex.
const windows = process.argv.includes('--windows');
const command = windows ? 'wsl.exe' : 'bash';
const script = resolve(projectRoot, 'tools/codegraph.sh');
const tail = [script, 'serve', '--mcp', '--path', projectRoot, '--no-watch'];
const args = windows ? ['-d', 'Ubuntu', '--', 'bash', ...tail] : tail;
const config = `[mcp_servers.codegraph]\ncommand = ${JSON.stringify(command)}\nargs = ${JSON.stringify(args)}\nstartup_timeout_sec = 30\ntool_timeout_sec = 60\n`;
const directory = resolve(projectRoot, '.codex');
const file = resolve(directory, 'config.toml');
mkdirSync(directory, {recursive: true});
if (existsSync(file)) {
  if (readFileSync(file, 'utf8') !== config) throw new Error('Existing MCP configuration differs; merge it explicitly');
} else writeFileSync(file, config, {flag: 'wx'});
console.log(`Configured project-local CodeGraph MCP for ${windows ? 'Windows desktop + WSL' : 'WSL/Linux'}: ${file}`);
