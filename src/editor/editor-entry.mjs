import * as Blockly from 'blockly';
import * as Es from 'blockly/msg/es';
import {workspaceToIR, saveWorkspace, loadWorkspace, validateWorkspaceResources} from './block-program.mjs';
import {validateProgram} from '../contracts/program-contract.mjs';
import {validateCapabilities} from '../contracts/packs.mjs';
import {createContributions, registerContributions} from './contributions.mjs';
import {setWorkspaceResourceView} from './resource-menus.mjs';

export function createEditor(container, example) {
  Blockly.setLocale(Es);
  const listeners = new Set();
  const notify = () => { for (const callback of listeners) callback(); };
  let capabilities = null, resourceView = null;
  const checkpoints = new WeakMap();
  let contributions = registerContributions(Blockly, createContributions());
  const shadow = (name, value) => ({[name]: {shadow: {type: 'math_number', fields: {NUM: value}}}});
  const block = (type, inputs) => ({kind: 'block', type, ...(inputs ? {inputs} : {})});
  const workspace = Blockly.inject(container, {
    renderer: 'zelos', media: '/blockly-media/', sounds: false, trashcan: true,
    scrollbars: true, move: {scrollbars: true, drag: true, wheel: true},
    zoom: {controls: true, wheel: false, startScale: 0.85, maxScale: 1.5, minScale: 0.5},
    toolbox: {kind: 'categoryToolbox', contents: contributions.toolbox}
  });
  workspace.registerToolboxCategoryCallback('GG_VARIABLE', current => {
    const entries = Blockly.Variables.flyoutCategory(current);
    const model = current.getVariableMap().getAllVariables().find(variable => variable.type === '');
    if (model) for (const item of contributions.variableFlyout) entries.push({...block(item.type, shadow(item.input, item.initial)), fields: {[item.field]: {id: model.getId()}}});
    return entries;
  });
  function load(state, profile = capabilities, nextResourceView = resourceView) {
    const nextCapabilities = validateCapabilities(profile);
    const nextContributions = registerContributions(Blockly, createContributions(nextCapabilities));
    if (new TextEncoder().encode(JSON.stringify(state)).length > 65536) throw new Error('Workspace exceeds size limit');
    validateWorkspaceResources(state,{capabilities:nextCapabilities,resourceView:nextResourceView});
    const previous = saveWorkspace(workspace);
    const previousCapabilities = capabilities; const previousContributions = contributions;
    const previousResourceView = resourceView;
    Blockly.Events.disable();
    try {
      setWorkspaceResourceView(workspace,nextResourceView);
      workspace.clear();
      Blockly.serialization.workspaces.load(structuredClone(state), workspace);
      workspace.updateToolbox({kind: 'categoryToolbox', contents: nextContributions.toolbox});
      capabilities = nextCapabilities; contributions = nextContributions; resourceView = nextResourceView;
    } catch (error) {
      setWorkspaceResourceView(workspace,previousResourceView);
      workspace.clear();
      Blockly.serialization.workspaces.load(previous, workspace);
      capabilities = previousCapabilities; contributions = previousContributions; resourceView = previousResourceView;
      workspace.updateToolbox({kind: 'categoryToolbox', contents: contributions.toolbox});
      throw error;
    } finally { Blockly.Events.enable(); }
    Blockly.svgResize(workspace);
    if (container.clientWidth < 500) workspace.zoomToFit();
    notify();
  }
  function prepare(state, {capabilities: profile = null,resourceView: nextResourceView = null} = {}) {
    const nextCapabilities = validateCapabilities(profile);
    if (new TextEncoder().encode(JSON.stringify(state)).length > 65536) throw new Error('Workspace exceeds size limit');
    const candidate = loadWorkspace(structuredClone(state), {capabilities: nextCapabilities,resourceView:nextResourceView});
    try { return {state: saveWorkspace(candidate), capabilities: nextCapabilities, resourceView:nextResourceView,
      ir: structuredClone(validateProgram(workspaceToIR(candidate, {capabilities: nextCapabilities,resourceView:nextResourceView}),{resourceView:nextResourceView}))}; }
    finally { candidate.dispose(); }
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
      scale:workspace.scale,scrollX:workspace.scrollX,scrollY:workspace.scrollY,
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
    load(saved.state,saved.capabilities,saved.resourceView);
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
  workspace.addChangeListener(event => {
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
    program: () => structuredClone(validateProgram(workspaceToIR(workspace, {capabilities,resourceView}),{resourceView})),
    resourceView: () => resourceView == null ? null : structuredClone(resourceView),
    captureCapabilities: () => capabilities == null ? null : structuredClone(capabilities),
    restore: () => load(example),
    prepare,
    commit: candidate => load(candidate.state, candidate.capabilities ?? null, candidate.resourceView ?? null),
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
