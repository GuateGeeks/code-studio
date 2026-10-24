import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const workspaceRoot = resolve(projectRoot, '..');
export const xcratchRoot = resolve(workspaceRoot, 'xcratch-scratch-editor');
export const microbitRoot = resolve(workspaceRoot, 'pxt-microbit');
