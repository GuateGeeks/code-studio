import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {xcratchRoot} from './paths.mjs';

const require = createRequire(import.meta.url);

export function assertLocalProject(project) {
  // This spike accepts only core opcodes. It is not a general-purpose SB3 sanitizer.
  if (project.extensionURLs?.length || Object.keys(project.extensionURLs ?? {}).length) throw new Error('External extension URLs are not allowed');
  if (project.extensions?.length) throw new Error('Extensions require a reviewed local catalog');
  for (const target of project.targets ?? []) {
    if (target.extensionURLs?.length || Object.keys(target.extensionURLs ?? {}).length) throw new Error('External extension URLs are not allowed');
  }
}

export async function createScratchSession(project) {
  assertLocalProject(project);
  const VirtualMachine = require(resolve(xcratchRoot, 'packages/scratch-vm/src/index.js'));
  const vm = new VirtualMachine();
  try {
    await vm.loadProject(structuredClone(project));
    vm.start();
    return vm;
  } catch (error) { vm.quit(); throw error; }
}
