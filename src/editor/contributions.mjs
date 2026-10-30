import {resolveCapabilities, canonicalPackData} from '../contracts/packs.mjs';
import {registerObjectMenus,registerResourceMenus} from './resource-menus.mjs';

const installed = new Map();
export function createContributions(capabilities = null, {context = 'scratch-2d'} = {}) {
  const plan = resolveCapabilities(capabilities);
  const result = {plan, blocks: [], toolbox: [], hats: new Map(), statements: new Map(), expressions: new Map(), variableFlyout: [], fieldMenus: [], objectMenus: []};
  const types = new Set();
  for (const pack of plan.packs) {
    if ((pack.manifest.context ?? 'scratch-2d') !== context) continue;
    const contribution = pack.manifest.contributions;
    for (const definition of contribution.blocks) {
      if (types.has(definition.type)) throw new Error('Duplicate pack block contribution: ' + definition.type);
      types.add(definition.type); result.blocks.push(structuredClone(definition));
    }
    for (const menu of contribution.fieldMenus ?? []) {
      if (!contribution.blocks.some(block => block.type === menu.type)) throw new Error('Pack menu must belong to its own block');
      result.fieldMenus.push(structuredClone(menu));
    }
    result.objectMenus.push(...structuredClone(contribution.objectMenus ?? []));
    result.toolbox.push(...structuredClone(contribution.toolbox));
    result.variableFlyout.push(...structuredClone(contribution.variableFlyout ?? []));
    for (const kind of ['hats', 'statements', 'expressions']) for (const [type, rule] of Object.entries(contribution[kind])) {
      if (result[kind].has(type)) throw new Error('Duplicate pack translator: ' + type);
      result[kind].set(type, {rule: structuredClone(rule), config: structuredClone(pack.config), packId: pack.manifest.id});
    }
  }
  return result;
}
export function registerContributions(Blockly, contributions) {
  for (const definition of contributions.blocks) {
    const encoded = canonicalPackData(definition);
    if (installed.has(definition.type)) {
      if (installed.get(definition.type) !== encoded) throw new Error('Incompatible installed block: ' + definition.type);
    } else {
      if (Blockly.Blocks[definition.type]) throw new Error('Pack cannot replace an existing block: ' + definition.type);
      Blockly.defineBlocksWithJsonArray([definition]);
      installed.set(definition.type, encoded);
    }
  }
  registerResourceMenus(Blockly,contributions.fieldMenus);
  registerObjectMenus(Blockly,contributions.objectMenus);
  return contributions;
}
