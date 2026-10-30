import * as Blockly from 'blockly';
import * as Es from 'blockly/msg/es';
import {workspaceToIR, isOfferedBlock, orderedRoots, saveWorkspace, loadWorkspace, sceneSprites, validateWorkspaceBlocks, validateWorkspaceResources} from './block-program.mjs';
import {validateProgram, scene2DStageOffers} from '../contracts/program-contract.mjs';
import {validateCapabilities} from '../contracts/packs.mjs';
import {createContributions, registerContributions} from './contributions.mjs';
import {withDeferredAudioContext} from './deferred-audio.mjs';
import {setWorkspaceObjects,setWorkspaceResourceOwner,setWorkspaceResourceView} from './resource-menus.mjs';
import {captureCodeViewSnapshot, prepareCodeViewCandidate} from './code-view-conversion.mjs';

export function createEditor(container, example) {
  Blockly.setLocale(Es);
  const listeners = new Set();
  const notify = () => { for (const callback of listeners) callback(); };
  // resourceOwner: the object in the editor (scene2d-multi-sprite 3.2), null in a
  // single-workspace profile. Menus, validation and the toolbox follow it.
  let capabilities = null, resourceView = null, loadGeneration = 0, scriptOrder = null, resourceOwner = null;
  const checkpoints = new WeakMap(), codeViewSnapshots = new WeakMap(), codeViewCandidates = new WeakMap();
  const codeViewKey = () => JSON.stringify([loadGeneration, saveWorkspace(workspace), capabilities, resourceView, scriptOrder, resourceOwner]);
  let contributions = registerContributions(Blockly, createContributions());
  const shadow = (name, value) => ({[name]: {shadow: {type: 'math_number', fields: {NUM: value}}}});
  const block = (type, inputs) => ({kind: 'block', type, ...(inputs ? {inputs} : {})});
  const workspace = withDeferredAudioContext(() => Blockly.inject(container, {
    renderer: 'zelos', media: '/blockly-media/', sounds: false, trashcan: true,
    scrollbars: true, move: {scrollbars: true, drag: true, wheel: true},
    zoom: {controls: true, wheel: false, startScale: 0.85, maxScale: 1.5, minScale: 0.5},
    toolbox: {kind: 'categoryToolbox', contents: contributions.toolbox}
  }));
  // Each object offers what it can do: empty categories go, and blocks already
  // in its workspace stay as they are. The stage has its own list (3.1). The
  // fixed menus name hero's built-in resources, so another object offers only
  // the blocks whose menus list its own (3.2).
  const fixedResource = rule => ['setCostume', 'playSound'].includes(rule.kind) && !Object.values(rule.values ?? {}).some(source => source.resource);
  function toolboxOf(current, owner) {
    if (owner === null || owner === 'hero') return {kind: 'categoryToolbox', contents: current.toolbox};
    const offered = rule => !fixedResource(rule) && (owner !== 'stage' || scene2DStageOffers.statements.has(rule.kind));
    const allowed = item => item.kind !== 'block' || (current.hats.has(item.type) ? owner !== 'stage' || scene2DStageOffers.events.has(current.hats.get(item.type).rule.event)
      : !current.statements.has(item.type) || offered(current.statements.get(item.type).rule));
    const contents = current.toolbox.map(category => category.contents ? {...category, contents: category.contents.filter(allowed)} : category).filter(category => !category.contents || category.contents.length);
    return {kind: 'categoryToolbox', contents};
  }
  workspace.registerToolboxCategoryCallback('GG_VARIABLE', current => {
    const entries = Blockly.Variables.flyoutCategory(current);
    const model = current.getVariableMap().getAllVariables().find(variable => variable.type === '');
    if (model) for (const item of contributions.variableFlyout) entries.push({...block(item.type, shadow(item.input, item.initial)), fields: {[item.field]: {id: model.getId()}}});
    return entries;
  });
  function load(state, profile = capabilities, nextResourceView = resourceView, nextScriptOrder = null, nextOwner = resourceOwner) {
    const nextCapabilities = validateCapabilities(profile);
    const nextContributions = registerContributions(Blockly, createContributions(nextCapabilities));
    if (new TextEncoder().encode(JSON.stringify(state)).length > 65536) throw new Error('Workspace exceeds size limit');
    validateWorkspaceResources(state,{capabilities:nextCapabilities,resourceView:nextResourceView,ownerId:nextOwner});
    const previous = saveWorkspace(workspace);
    const previousCapabilities = capabilities; const previousContributions = contributions;
    const previousResourceView = resourceView, previousScriptOrder = scriptOrder, previousOwner = resourceOwner;
    Blockly.Events.disable();
    try {
      setWorkspaceResourceView(workspace,nextResourceView);
      setWorkspaceResourceOwner(workspace,nextOwner);
      setWorkspaceObjects(workspace,sceneSprites(nextCapabilities));
      workspace.clear();
      Blockly.serialization.workspaces.load(structuredClone(state), workspace);
      orderedRoots(workspace, nextScriptOrder);
      workspace.updateToolbox(toolboxOf(nextContributions, nextOwner));
      capabilities = nextCapabilities; contributions = nextContributions; resourceView = nextResourceView; scriptOrder = structuredClone(nextScriptOrder); resourceOwner = nextOwner;
    } catch (error) {
      setWorkspaceResourceView(workspace,previousResourceView);
      setWorkspaceResourceOwner(workspace,previousOwner);
      setWorkspaceObjects(workspace,sceneSprites(previousCapabilities));
      workspace.clear();
      Blockly.serialization.workspaces.load(previous, workspace);
      capabilities = previousCapabilities; contributions = previousContributions; resourceView = previousResourceView; scriptOrder = previousScriptOrder; resourceOwner = previousOwner;
      workspace.updateToolbox(toolboxOf(contributions, resourceOwner));
      throw error;
    } finally { Blockly.Events.enable(); }
    loadGeneration++; // Even identical imports replace the authoring generation.
    Blockly.svgResize(workspace);
    if (container.clientWidth < 500) workspace.zoomToFit();
    notify();
  }
  const ownerOption = owner => owner ? {resourceOwnerId: owner} : {};
  // A candidate is lowered as a final check. `lower: false` skips it: a project
  // with objects keeps unfinished work, and only running asks it to be complete.
  function prepare(state, {capabilities: profile = null,resourceView: nextResourceView = null, scriptOrder: nextScriptOrder = null, ownerId = null, lower = true} = {}) {
    const nextCapabilities = validateCapabilities(profile);
    if (new TextEncoder().encode(JSON.stringify(state)).length > 65536) throw new Error('Workspace exceeds size limit');
    const candidate = loadWorkspace(structuredClone(state), {capabilities: nextCapabilities,resourceView:nextResourceView,ownerId});
    try {
      orderedRoots(candidate, nextScriptOrder);
      const ir = lower ? structuredClone(validateProgram(workspaceToIR(candidate, {capabilities: nextCapabilities,resourceView:nextResourceView,scriptOrder:nextScriptOrder,ownerId}),{resourceView:nextResourceView,...ownerOption(ownerId)})) : null;
      return {state: saveWorkspace(candidate), capabilities: nextCapabilities, resourceView:nextResourceView, ownerId, ir, scriptOrder:structuredClone(nextScriptOrder)};
    } finally { candidate.dispose(); }
  }
  function checkpoint() {
    const manager=Blockly.getFocusManager(),focused=manager.getFocusedNode(),tree=manager.getFocusedTree();
    const ownsFocus=tree===workspace || Boolean(focused?.getFocusableElement && container.contains(focused.getFocusableElement()));
    const block=tree===workspace && focused ? workspace.getNavigator().getSourceBlockFromNode(focused) : null;
    const active=container.ownerDocument.activeElement;
    const input=active?.tagName==='INPUT'||active?.tagName==='TEXTAREA'?active:null;
    const editableFields = input && block ? Array.from(block.getFields()).filter(field => field.EDITABLE && field.name) : [];
    const fieldName = focused?.name ?? (editableFields.length === 1 ? editableFields[0].name : undefined);
    const token=Object.freeze({});
    checkpoints.set(token,{state:saveWorkspace(workspace),capabilities:structuredClone(capabilities),resourceView:structuredClone(resourceView),
      scriptOrder:structuredClone(scriptOrder),ownerId:resourceOwner,scale:workspace.scale,scrollX:workspace.scrollX,scrollY:workspace.scrollY,
      selected:Blockly.common.getSelected()?.workspace===workspace?Blockly.common.getSelected().id:null,
      focused:ownsFocus,blockId:block?.id,fieldName,fieldFocused:focused!==block&&Boolean(focused?.name),
      auxiliary:ownsFocus && tree!==workspace?focused??tree?.getRootFocusableNode():null,
      input:input&&block?{value:input.value,start:input.selectionStart,end:input.selectionEnd,direction:input.selectionDirection,
        scrollTop:input.scrollTop,scrollLeft:input.scrollLeft}:null});
    return token;
  }
  function restoreDraft(token) {
    const saved=checkpoints.get(token);
    if(!saved)throw new Error('El borrador no pertenece a este editor2D.');
    load(saved.state,saved.capabilities,saved.resourceView,saved.scriptOrder,saved.ownerId);
    workspace.setScale(saved.scale);workspace.scroll(saved.scrollX,saved.scrollY);
    const selected=saved.selected&&workspace.getBlockById(saved.selected);if(selected)selected.select();
    if(saved.focused) {
      const block=workspace.getBlockById(saved.blockId);
      const field=block&&saved.fieldName?block.getField(saved.fieldName):null;
      const auxiliary=saved.auxiliary?.getFocusableElement();
      Blockly.getFocusManager().focusNode((saved.fieldFocused?field??block:block??field)??(auxiliary?.isConnected?saved.auxiliary:workspace));
      if(field&&saved.input) {
        field.showEditor();const input=container.ownerDocument.activeElement;
        if(input?.tagName==='INPUT'||input?.tagName==='TEXTAREA') {
          input.value=saved.input.value;
          if(saved.input.start!==null)input.setSelectionRange?.(saved.input.start,saved.input.end,saved.input.direction);
          input.scrollTop=saved.input.scrollTop;input.scrollLeft=saved.input.scrollLeft;
        }
      }
    }
  }
  load(example);
  const observer = new ResizeObserver(() => Blockly.svgResize(workspace));
  observer.observe(container);
  // Blockly's clipboard and undo history outlive a project and a profile: a block
  // of a pack this project does not lock could come back through them and leave
  // a project that cannot save. It goes right away. After a paste, the removal joins
  // that step: Blockly 13 pastes with no group, so the step gets one here, or Undo
  // would need two presses and bring the block and the message back in between. A
  // block brought back by Undo or Redo is removed outside the history: recording
  // it would clear Redo and catch Undo on this block forever. Blockly restores
  // recordUndo before this listener runs, so the event says which case this is.
  workspace.addChangeListener(event => {
    if (event.type !== Blockly.Events.BLOCK_CREATE || resourceOwner === null) return;
    const foreign = event.ids.map(id => workspace.getBlockById(id)).filter(block => block && !isOfferedBlock(contributions, block.type));
    if (!foreign.length) return;
    const group = Blockly.Events.getGroup(), recording = Blockly.Events.getRecordUndo();
    if (event.recordUndo && !event.group) event.group = Blockly.utils.idGenerator.genUid();
    Blockly.Events.setGroup(event.group);
    Blockly.Events.setRecordUndo(recording && event.recordUndo);
    try { for (const block of foreign) if (!block.isDeadOrDying()) block.dispose(true); }
    finally { Blockly.Events.setRecordUndo(recording); Blockly.Events.setGroup(group); }
    document.querySelector('#editor-error').textContent = 'Ese bloque no está disponible en este proyecto, así que se quitó.';
  });
  workspace.addChangeListener(event => {
    if (!event.isUiEvent && scriptOrder !== null) {
      const visualOrder = workspace.getTopBlocks(true).map(block => block.id);
      const changedRoots = visualOrder.length !== scriptOrder.length || visualOrder.some(id => !scriptOrder.includes(id));
      if (changedRoots || event.type === Blockly.Events.BLOCK_MOVE && visualOrder.includes(event.blockId) && event.newCoordinate)
        scriptOrder = visualOrder;
    }
    if (!event.isUiEvent) { document.querySelector('#editor-status').textContent = 'Cambios sin ejecutar'; notify(); }
  });
  return Object.freeze({
    save: () => saveWorkspace(workspace),
    selectSource: id => {
      const block = workspace.getBlockById(id);
      if (!block) return false;
      workspace.centerOnBlock(id);
      Blockly.getFocusManager().focusNode(block);
      block.select();
      container.scrollIntoView({block: 'nearest'});
      return true;
    },
    selectedSource: () => Blockly.common.getSelected()?.id ?? null,
    program: () => structuredClone(validateProgram(workspaceToIR(workspace, {capabilities,resourceView,scriptOrder,ownerId:resourceOwner}),{resourceView,...ownerOption(resourceOwner)})),
    // IR0 of a stored (not mounted) workspace with the mounted profile and
    // resources: the stage and other sprites of a 0.3.0 scene (2.1), each
    // with its own resources (3.2).
    programOf: (state, {ownerId = null} = {}) => {
      if (new TextEncoder().encode(JSON.stringify(state)).length > 65536) throw new Error('Workspace exceeds size limit');
      const stored = loadWorkspace(structuredClone(state), {capabilities, resourceView, ownerId});
      try { return structuredClone(validateProgram(workspaceToIR(stored, {capabilities, resourceView, ownerId}), {resourceView, ...ownerOption(ownerId)})); } finally { stored.dispose(); }
    },
    resourceView: () => resourceView == null ? null : structuredClone(resourceView),
    resourceOwner: () => resourceOwner,
    validateBlocks: validateWorkspaceBlocks,
    // History and camera of the workspace on screen, live for this session only.
    // Each object keeps its own: replaying one object's events on another would
    // bring its blocks here. Blockly has no public accessor for the stacks.
    sessionState: () => ({undo: [...workspace.undoStack_], redo: [...workspace.redoStack_], scale: workspace.scale, scrollX: workspace.scrollX, scrollY: workspace.scrollY}),
    restoreSessionState(session) {
      workspace.clearUndo();
      if (!session) { workspace.scrollCenter(); return; }
      workspace.undoStack_.push(...session.undo);workspace.redoStack_.push(...session.redo);
      workspace.setScale(session.scale);workspace.scroll(session.scrollX, session.scrollY);
    },
    captureCapabilities: () => capabilities == null ? null : structuredClone(capabilities),
    restore: () => load(example),
    prepare,
    commit: candidate => {
      if (codeViewCandidates.has(candidate) && codeViewCandidates.get(candidate) !== codeViewKey())
        throw new Error('La autoría cambió mientras se preparaba la conversión; conserva el texto y vuelve a intentarlo.');
      load(candidate.state, candidate.capabilities ?? null, candidate.resourceView ?? null, candidate.scriptOrder ?? null, candidate.ownerId === undefined ? resourceOwner : candidate.ownerId);
      if (codeViewCandidates.has(candidate)) codeViewCandidates.set(candidate, null);
    },
    isCodeViewCurrent: snapshot => codeViewSnapshots.get(snapshot)?.key === codeViewKey(),
    prepareCodeViewRestore: (point, snapshot) => {
      const stored = codeViewSnapshots.get(snapshot);
      if (!stored || stored.key !== codeViewKey()) throw new Error('La autoría cambió; vuelve a intentar Deshacer.');
      const candidate = prepare(point.workspace, {capabilities: stored.captured.capabilities,
        resourceView: stored.captured.resourceView, scriptOrder: point.scriptOrder, ownerId: stored.captured.ownerId});
      codeViewCandidates.set(candidate, stored.key);
      return candidate;
    },
    codeViewOrder: () => structuredClone(scriptOrder),
    codeViewSnapshot: () => {
      const captured = captureCodeViewSnapshot(saveWorkspace(workspace), {capabilities, resourceView, scriptOrder, ownerId: resourceOwner});
      const snapshot = structuredClone(captured);
      codeViewSnapshots.set(snapshot, {captured, key: codeViewKey()});
      return snapshot;
    },
    prepareCodeView: (parsed, snapshot, options) => {
      const stored = codeViewSnapshots.get(snapshot);
      if (!stored || stored.key !== codeViewKey())
        throw new Error('La autoría cambió mientras se analizaba el texto; conserva el texto y vuelve a intentarlo.');
      const candidate = prepareCodeViewCandidate(stored.captured, parsed, options);
      codeViewCandidates.set(candidate, stored.key);
      return candidate;
    },
    checkpoint,
    restoreDraft,
    subscribe: callback => { listeners.add(callback); return () => listeners.delete(callback); },
    load, // diagnostic fixture hook; user imports use prepare/commit
    dispose: () => { listeners.clear(); observer.disconnect(); workspace.dispose(); }
  });
}

export {workspaceFromIR} from './workspace-from-ir.mjs';
export {createDeviceEditor} from './device-editor.mjs';

export {createCapabilityEditor} from './capability-editor.mjs';

export {generateCodeViewSource} from './code-view-conversion.mjs';
