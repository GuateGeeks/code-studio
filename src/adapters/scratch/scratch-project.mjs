import {validateProgram} from '../../contracts/program-contract.mjs';

export function toScratchProject(ir, options = {}) {
  validateProgram(ir, options);
  const blocks = {};
  const sourceMap = {};
  const broadcasts = {};
  const variables = Object.fromEntries((ir.variables ?? []).map(model => [model.id, [model.name, model.initialValue]]));
  const scopedVariables = scope => Object.fromEntries((ir.variables ?? []).filter(model => (model.scope ?? 'local') === scope).map(model => [model.id, variables[model.id]]));
  const messageId = name => { const id = `gg-message:${name}`; broadcasts[id] = name; return id; };
  const reserve = (id, block) => {
    if (Object.hasOwn(blocks, id)) throw new Error(`Duplicate source block ID: ${id}`);
    blocks[id] = block;
    sourceMap[id] = id;
    return id;
  };
  function variableFields(node) {
    if (!Object.hasOwn(variables, node.variableId) || variables[node.variableId][0] !== node.name) throw new Error(`Unknown variable at ${node.sourceBlockId}`);
    return {VARIABLE: [node.name, node.variableId]};
  }
  function valueInput(value, parent) {
    if (typeof value === 'number') return [1, [4, String(value)]];
    const id = value.sourceBlockId;
    const block = {opcode: '', next: null, parent, inputs: {}, fields: {}, shadow: false, topLevel: false};
    if (value.kind === 'variable') {
      block.opcode = 'data_variable';
      block.fields = variableFields(value);
    } else if (value.kind === 'compare') {
      block.opcode = {EQ: 'operator_equals', LT: 'operator_lt', GT: 'operator_gt'}[value.operator];
      if (!block.opcode) throw new Error(`Unsupported comparison at ${id}`);
      block.inputs.OPERAND1 = valueInput(value.left, id);
      block.inputs.OPERAND2 = valueInput(value.right, id);
    } else throw new Error(`Unsupported expression at ${id}`);
    reserve(id, block);
    return [2, id];
  }
  function stack(nodes, parent) {
    let first = null;
    let previous = null;
    for (const node of nodes) {
      const id = node.sourceBlockId;
      const block = {opcode: '', next: null, parent: previous ?? parent, inputs: {}, fields: {}, shadow: false, topLevel: false};
      if (node.kind === 'repeat') {
        block.opcode = 'control_repeat';
        block.inputs.TIMES = [1, [4, String(node.count)]];
        reserve(id, block);
        const substack = stack(node.body, id);
        if (substack) block.inputs.SUBSTACK = [2, substack];
      } else if (node.kind === 'move') {
        block.opcode = 'motion_movesteps';
        block.inputs.STEPS = valueInput(node.steps, id);
        reserve(id, block);
      } else if (node.kind === 'wait') {
        block.opcode = 'control_wait';
        block.inputs.DURATION = [1, [4, String(node.seconds)]];
        reserve(id, block);
      } else if (node.kind === 'broadcastWait') {
        block.opcode = 'event_broadcastandwait';
        block.inputs.BROADCAST_INPUT = [1, [11, node.message, messageId(node.message)]];
        reserve(id, block);
      } else if (node.kind === 'createClone') {
        block.opcode = 'control_create_clone_of';
        const menuId = `${id}:menu`;
        block.inputs.CLONE_OPTION = [1, menuId];
        reserve(id, block);
        reserve(menuId, {opcode: 'control_create_clone_of_menu', next: null, parent: id, inputs: {}, fields: {CLONE_OPTION: ['_myself_', null]}, shadow: true, topLevel: false});
        sourceMap[menuId] = id;
      } else if (node.kind === 'deleteClone') {
        block.opcode = 'control_delete_this_clone';
        reserve(id, block);
      } else if (['setVariable', 'changeVariable'].includes(node.kind)) {
        block.opcode = node.kind === 'setVariable' ? 'data_setvariableto' : 'data_changevariableby';
        block.fields = variableFields(node);
        block.inputs.VALUE = valueInput(node.value, id);
        reserve(id, block);
      } else if (node.kind === 'if') {
        block.opcode = node.elseBody.length ? 'control_if_else' : 'control_if';
        block.inputs.CONDITION = valueInput(node.condition, id);
        reserve(id, block);
        const yes = stack(node.body, id);
        const no = stack(node.elseBody, id);
        if (yes) block.inputs.SUBSTACK = [2, yes];
        if (no) block.inputs.SUBSTACK2 = [2, no];
      } else if (node.kind === 'playSound') {
        block.opcode = node.wait ? 'sound_playuntildone' : 'sound_play';
        const menuId = `${id}:menu`;
        block.inputs.SOUND_MENU = [1, menuId];
        reserve(id, block);
        reserve(menuId, {opcode: 'sound_sounds_menu', next: null, parent: id, inputs: {}, fields: {SOUND_MENU: [node.sound, null]}, shadow: true, topLevel: false});
        sourceMap[menuId] = id;
      } else if (node.kind === 'setCostume') {
        block.opcode = 'looks_switchcostumeto';
        const menuId = `${id}:menu`;
        block.inputs.COSTUME = [1, menuId];
        reserve(id, block);
        reserve(menuId, {opcode: 'looks_costume', next: null, parent: id, inputs: {}, fields: {COSTUME: [node.costume, null]}, shadow: true, topLevel: false});
        sourceMap[menuId] = id;
      } else if (node.kind === 'stopSounds') {
        block.opcode = 'sound_stopallsounds';
        reserve(id, block);
      } else throw new Error(`Unsupported IR node: ${node.kind}`);
      if (previous) blocks[previous].next = id;
      first ??= id;
      previous = id;
    }
    return first;
  }
  for (const script of ir.scripts) {
    const opcode = {start: 'event_whenflagclicked', key: 'event_whenkeypressed', click: 'event_whenthisspriteclicked', message: 'event_whenbroadcastreceived', clone: 'control_start_as_clone'}[script.event];
    if (!opcode) throw new Error(`Unsupported event: ${script.event}`);
    const id = script.sourceBlockId;
    const fields = script.event === 'key' ? {KEY_OPTION: [script.key, null]} : script.event === 'message' ? {BROADCAST_OPTION: [script.message, messageId(script.message)]} : {};
    reserve(id, {opcode, next: null, parent: null, inputs: {}, fields, shadow: false, topLevel: true, x: 20, y: 20});
    blocks[id].next = stack(script.body, id);
  }
  // The headless fixture has no renderer; SB3 still requires a costume descriptor.
  const costume = {assetId: 'cd21514d0531fdffb22204e0ec5ed84a', name: 'blank', md5ext: 'cd21514d0531fdffb22204e0ec5ed84a.svg', dataFormat: 'svg', rotationCenterX: 0, rotationCenterY: 0};
  const common = {variables: {}, lists: {}, broadcasts: {}, comments: {}, currentCostume: 0, costumes: [costume], sounds: [], volume: 100};
  return {
    sourceMap,
    project: {
      targets: [
        {...structuredClone(common), variables: scopedVariables('global'), broadcasts, isStage: true, name: 'Stage', blocks: {}, layerOrder: 0, tempo: 60, videoTransparency: 50, videoState: 'off', textToSpeechLanguage: null},
        {...structuredClone(common), variables: scopedVariables('local'), isStage: false, name: 'hero', blocks, layerOrder: 1, visible: true, x: 0, y: 0, size: 100, direction: 90, draggable: false, rotationStyle: 'all around'}
      ],
      monitors: [], extensions: [], meta: {semver: '3.0.0', vm: '12.3.1', agent: 'GuateGeeks phase-0'}
    }
  };
}
