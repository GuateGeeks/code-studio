import * as Blockly from 'blockly';
import * as Es from 'blockly/msg/es';
import {validateCapabilityGraph, lowerCapabilityGraph} from '../contracts/program-ir1.mjs';
import {capabilityBlockDefinitions as blocks, contextToolbox, operationDescriptors} from '../contracts/operations.mjs';
import {registerContributions} from './contributions.mjs';
import {applyCapabilityLabels} from './capability-labels.mjs';

function registerCapabilityBlocks() {
  registerContributions(Blockly, {blocks});
  applyCapabilityLabels(Blockly, blocks, operationDescriptors);
}

// These converters use Blockly's public serialization API. Neither contains
// firmware semantics; the owned device contract validates and lowers the graph.
export function capabilityGraphToBlocklyState(graph) {
  const validated = validateCapabilityGraph(graph);
  registerCapabilityBlocks();
  const nodes = new Map(validated.nodes.map(node => [node.id, node]));
  function block(id, root = false) {
    const node = nodes.get(id);
    const inputs = Object.fromEntries(Object.entries(node.inputs).filter(([, child]) => child !== null)
      .map(([name, child]) => [name, {block: block(child)}]));
    return {type: node.type, id: node.id, fields: structuredClone(node.fields),
      ...(root ? {x: node.x, y: node.y} : {}),
      ...(Object.keys(inputs).length ? {inputs} : {}),
      ...(node.next === null ? {} : {next: {block: block(node.next)}})};
  }
  return {blocks: {languageVersion: 0, blocks: validated.roots.map(id => block(id, true))}};
}

export function captureCapabilityGraph(workspace) {
  const nodes = workspace.getAllBlocks(false).map(block => {
    const fields = {};
    for (const input of block.inputList) for (const field of input.fieldRow) {
      if (field.name) fields[field.name] = field.getValue();
    }
    const inputs = {};
    for (const input of block.inputList) if (input.connection) inputs[input.name] = input.connection.targetBlock()?.id ?? null;
    const point = block.getRelativeToSurfaceXY();
    return {id: block.id, type: block.type, fields, inputs, next: block.getNextBlock()?.id ?? null,
      x: block.getParent() ? 0 : point.x, y: block.getParent() ? 0 : point.y};
  });
  nodes.sort((a, b) => a.id.localeCompare(b.id));
  return {version: 1, nodes, roots: workspace.getTopBlocks(false).map(block => block.id)};
}

export function createCapabilityEditor(container, {contextId, documentId, initialGraph = {version:1,nodes:[],roots:[]}, onChange = () => {}} = {}) {
  if (!container) throw new Error('Falta el contenedor del editor de contexto.');
  Blockly.setLocale(Es);
  registerCapabilityBlocks();
  const listeners = new Set();
  const checkpoints = new WeakMap();
  let profileCapabilities;
  let disposed = false;
  let ready = true;
  let visible = !container.hidden;
  let applying = false;
  let firstLayout = true;
  const workspace = Blockly.inject(container, {
    renderer: 'zelos', media: '/blockly-media/', sounds: false, trashcan: true,
    scrollbars: true, move: {scrollbars: true, drag: true, wheel: true},
    zoom: {controls: true, wheel: false, startScale: 0.85, maxScale: 1.5, minScale: 0.5},
    toolbox: contextToolbox(contextId)
  });
  function assertLive() { if (disposed) throw new Error('El editor de contexto ya está cerrado.'); }
  function notify() {
    onChange();
    for (const listener of listeners) listener();
  }
  function resize() {
    if (!disposed && visible && container.getBoundingClientRect().width > 0) {
      Blockly.svgResize(workspace);
      if (firstLayout && container.getBoundingClientRect().width < 500) workspace.zoomToFit();
      firstLayout = false;
    }
  }
  function loadState(state) {
    applying = true;
    Blockly.Events.disable();
    try {
      workspace.clear();
      Blockly.serialization.workspaces.load(structuredClone(state), workspace);
    } finally {
      Blockly.Events.enable();
      applying = false;
    }
    resize();
  }
  function captureGraph() { assertLive(); return structuredClone(captureCapabilityGraph(workspace)); }
  function prepare(graph) {
    assertLive();
    const validated = validateCapabilityGraph(graph);
    return {graph: structuredClone(validated), state: capabilityGraphToBlocklyState(validated)};
  }
  function commit(candidate) {
    assertLive();
    const next = prepare(candidate?.graph);
    const previous = Blockly.serialization.workspaces.save(workspace);
    try { loadState(next.state); }
    catch (error) { loadState(previous); throw error; }
    notify();
  }
  function checkpoint() {
    assertLive();
    const manager = Blockly.getFocusManager();
    const focusedTree = manager.getFocusedTree();
    const focused = manager.getFocusedNode();
    const ownsFocus = focusedTree === workspace || Boolean(focused?.getFocusableElement && container.contains(focused.getFocusableElement()));
    const focusedBlock = focusedTree === workspace && focused ? workspace.getNavigator().getSourceBlockFromNode(focused) : null;
    const active = container.ownerDocument.activeElement;
    const input = active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA' ? active : null;
    const token = Object.freeze(Object.create(null));
    checkpoints.set(token, {
      state: structuredClone(Blockly.serialization.workspaces.save(workspace)),
      scale: workspace.scale, scrollX: workspace.scrollX, scrollY: workspace.scrollY,
      selected: selectedSource(), focused: ownsFocus,
      auxiliaryFocus: ownsFocus && focusedTree !== workspace ? focused ?? focusedTree?.getRootFocusableNode() : null,
      blockId: focusedBlock?.id ?? null, fieldName: focused?.name ?? null,
      input: input && focusedBlock ? {value: input.value, start: input.selectionStart, end: input.selectionEnd,
        direction: input.selectionDirection, scrollTop: input.scrollTop, scrollLeft: input.scrollLeft} : null
    });
    return token;
  }
  function restoreDraft(token) {
    assertLive();
    const saved = checkpoints.get(token);
    if (!saved) throw new Error('El checkpoint no pertenece a este editor de contexto.');
    loadState(saved.state);
    workspace.setScale(saved.scale);
    workspace.scroll(saved.scrollX, saved.scrollY);
    const selected = saved.selected && workspace.getBlockById(saved.selected);
    if (selected) selected.select();
    if (saved.focused) {
      const block = workspace.getBlockById(saved.blockId);
      const field = block && saved.fieldName ? block.getField(saved.fieldName) : null;
      const auxiliary = saved.auxiliaryFocus?.getFocusableElement();
      Blockly.getFocusManager().focusNode(field ?? block ?? (auxiliary?.isConnected ? saved.auxiliaryFocus : workspace));
      if (field && saved.input) {
        field.showEditor();
        const input = container.ownerDocument.activeElement;
        if (input?.tagName === 'INPUT' || input?.tagName === 'TEXTAREA') {
          input.value = saved.input.value;
          if (typeof input.setSelectionRange === 'function' && saved.input.start !== null) {
            input.setSelectionRange(saved.input.start, saved.input.end, saved.input.direction);
          }
          input.scrollTop = saved.input.scrollTop;
          input.scrollLeft = saved.input.scrollLeft;
        }
      }
    }
    notify();
  }
  function selectedSource() {
    const selected = Blockly.common.getSelected();
    if (selected?.workspace === workspace) return selected.id;
    const manager = Blockly.getFocusManager();
    return manager.getFocusedTree() === workspace
      ? workspace.getNavigator().getSourceBlockFromNode(manager.getFocusedNode())?.id ?? null : null;
  }
  function selectSource(id) {
    assertLive();
    const block = typeof id === 'string' ? workspace.getBlockById(id) : null;
    if (!block) return false;
    workspace.centerOnBlock(id);
    Blockly.getFocusManager().focusNode(block);
    block.select();
    container.scrollIntoView({block: 'nearest'});
    return true;
  }
  const changed = event => { if (!disposed && !applying && !event.isUiEvent) notify(); };
  loadState(capabilityGraphToBlocklyState(initialGraph));
  workspace.addChangeListener(changed);
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  return Object.freeze({
    save: captureGraph, captureGraph, prepare, commit, checkpoint, restoreDraft,
    program: () => lowerCapabilityGraph(captureGraph(), {contextId,documentId,capabilities:profileCapabilities}),
    setProfile(value,{documentId:nextDocumentId=documentId}={}){profileCapabilities=value;documentId=nextDocumentId;workspace.updateToolbox(contextToolbox(contextId,{capabilities:profileCapabilities}));},
    selectSource, selectedSource,
    subscribe(callback) { assertLive(); listeners.add(callback); return () => listeners.delete(callback); },
    setReady(value) {
      assertLive();
      const next = Boolean(value);
      container.setAttribute('aria-disabled', String(!next));
      if (next === ready) return;
      ready = next;
      workspace.setIsReadOnly(!ready);
      // Blockly's workspace setter only changes the workspace flag. Fields
      // created while readonly retain their styling and accessible labels until
      // refreshed. Preserve each block's own flags and the live graph/focus.
      for (const block of workspace.getAllBlocks(false)) {
        block.setEditable(block.isOwnEditable());
        block.setMovable(block.isOwnMovable());
        for (const field of block.getFields()) field.recomputeAriaContext();
      }
    },
    setVisible(value) { assertLive(); visible = Boolean(value); if (visible) resize(); },
    dispose() {
      if (disposed) return;
      disposed = true; observer.disconnect(); workspace.removeChangeListener(changed); listeners.clear(); workspace.dispose();
    }
  });
}
