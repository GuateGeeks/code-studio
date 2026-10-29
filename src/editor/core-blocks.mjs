// Core control structures of the 2D language (scene2d-vocabulary-v2, E1).
// They belong to the core, not to a pack (block-language: «las estructuras de
// control pertenecen al núcleo»). A context offers them only when one of its
// active packs lists them in its toolbox (offeredCoreStructures), so projects
// locked to gg.sprites@0.1.0 keep exactly their previous vocabulary.
export const coreBlockDefinitions = Object.freeze([
  // «por siempre» and «detener este programa» end their stack, as in Scratch.
  {type: 'gg_forever', message0: 'por siempre %1', args0: [{type: 'input_statement', name: 'DO'}], previousStatement: null, colour: 45},
  {type: 'gg_repeat_until', message0: 'repetir hasta que %1 %2', args0: [{type: 'input_value', name: 'CONDITION', check: 'Boolean'}, {type: 'input_statement', name: 'DO'}], previousStatement: null, nextStatement: null, colour: 45},
  {type: 'gg_wait_until', message0: 'esperar hasta que %1', args0: [{type: 'input_value', name: 'CONDITION', check: 'Boolean'}], previousStatement: null, nextStatement: null, colour: 45},
  {type: 'gg_stop_script', message0: 'detener este programa', previousStatement: null, colour: 45}
].map(definition => Object.freeze(definition)));

const registered = new WeakSet();
export function registerCoreBlocks(Blockly) {
  if (registered.has(Blockly.Blocks)) return;
  for (const definition of coreBlockDefinitions) if (Blockly.Blocks[definition.type]) throw new Error('Core block already defined: ' + definition.type);
  Blockly.defineBlocksWithJsonArray(structuredClone([...coreBlockDefinitions]));
  registered.add(Blockly.Blocks);
}
