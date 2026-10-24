import test from 'node:test';
import assert from 'node:assert/strict';
import * as Blockly from 'blockly';
import {JSDOM} from 'jsdom';
import {captureDeviceGraph, deviceGraphToBlocklyState, createDeviceEditor} from '../../src/editor/device-editor.mjs';
import {defaultDeviceGraph, lowerDeviceGraph, generateDeviceSource, validateDeviceGraph} from '../../src/contracts/device-program.mjs';

function load(graph) {
  const workspace = new Blockly.Workspace();
  Blockly.serialization.workspaces.load(deviceGraphToBlocklyState(graph), workspace);
  return workspace;
}
function canonical(graph) { return {...graph, nodes: [...graph.nodes].sort((a, b) => a.id.localeCompare(b.id))}; }
test('GG-DEVICE-EDITOR: real Blockly round-trip preserves IDs, fields, connections, layout and firmware semantics', t => {
  const graph = structuredClone(defaultDeviceGraph);
  graph.nodes.find(node => node.id === 'device-start').x = 112;
  graph.nodes.find(node => node.id === 'device-start').y = 94;
  const workspace = load(graph); t.after(() => workspace.dispose());
  assert.deepEqual(captureDeviceGraph(workspace), canonical(graph));
  assert.deepEqual(lowerDeviceGraph(captureDeviceGraph(workspace)), lowerDeviceGraph(graph));
  assert.equal(generateDeviceSource(lowerDeviceGraph(captureDeviceGraph(workspace))).source, generateDeviceSource(lowerDeviceGraph(graph)).source);
  const detached = captureDeviceGraph(workspace); detached.nodes[0].fields.BUTTON = 'B';
  assert.equal(workspace.getBlockById('device-button-a').getFieldValue('BUTTON'), 'A');
});

test('GG-DEVICE-EDITOR: real connections and edits stay independent of another workspace and preserve incomplete drafts', t => {
  const device = load(defaultDeviceGraph); const other = new Blockly.Workspace();
  t.after(() => {device.dispose(); other.dispose();});
  const originalOther = Blockly.serialization.workspaces.save(other);
  const pause = device.newBlock('gg_mb_pause', 'added-pause'); pause.setFieldValue(250, 'MS');
  device.getBlockById('device-heart').nextConnection.connect(pause.previousConnection);
  const graph = captureDeviceGraph(device);
  assert.equal(graph.nodes.find(node => node.id === 'device-heart').next, 'added-pause');
  assert.match(generateDeviceSource(lowerDeviceGraph(graph)).source, /basic.pause\(250\)/);
  const matrix = device.newBlock('gg_mb_show_leds', 'unfinished-matrix'); matrix.setFieldValue('010', 'LEDS');
  const draft = captureDeviceGraph(device);
  assert.equal(draft.nodes.find(node => node.id === matrix.id).fields.LEDS, '010');
  assert.throws(() => lowerDeviceGraph(draft), error => error.sourceBlockId === matrix.id);
  assert.deepEqual(Blockly.serialization.workspaces.save(other), originalOther);
  matrix.dispose(); pause.unplug();
  const loose = captureDeviceGraph(device);
  assert.doesNotThrow(() => validateDeviceGraph(loose));
  assert.throws(() => lowerDeviceGraph(loose), error => error.sourceBlockId === 'added-pause' && error.code === 'DEVICE_LOOSE_BLOCK');
});

test('GG-DEVICE-EDITOR: firmware bridge rejects 2D blocks by original ID and maps all twelve definitions', t => {
  assert.throws(() => deviceGraphToBlocklyState({version: 1, nodes: [{id: 'wrong-context', type: 'gg_move', fields: {}, inputs: {}, next: null, x: 0, y: 0}], roots: ['wrong-context']}), error => error.sourceBlockId === 'wrong-context' && error.code === 'DEVICE_TARGET_OPERATION');
  const nodes = [
    ['gg_mb_start', {}, {DO: null}], ['gg_mb_forever', {}, {DO: null}], ['gg_mb_on_button', {BUTTON: 'AB'}, {DO: null}],
    ['gg_mb_show_icon', {ICON: 'SmallHeart'}, {}], ['gg_mb_show_number', {NUMBER: -2.5}, {}], ['gg_mb_show_leds', {LEDS: '1010101010101010101010101'}, {}],
    ['gg_mb_plot', {X: 4, Y: 3}, {}], ['gg_mb_unplot', {X: 1, Y: 2}, {}], ['gg_mb_clear', {}, {}],
    ['gg_mb_pause', {MS: 500}, {}], ['gg_mb_repeat', {COUNT: 7}, {DO: null}], ['gg_mb_if_button', {BUTTON: 'B'}, {DO: null, ELSE: null}]
  ].map(([type, fields, inputs], index) => ({id: 'block-' + index, type, fields, inputs, next: null, x: index * 20, y: index * 30}));
  const graph = {version: 1, nodes, roots: nodes.map(node => node.id)};
  const workspace = load(graph); t.after(() => workspace.dispose());
  assert.deepEqual(captureDeviceGraph(workspace), canonical(graph));
});

// JSDOM provides DOM event/focus behavior. Geometry shims only supply missing
// SVG/canvas measurements; these tests make no claim about visual rendering.
function installDOM(t) {
  const dom = new JSDOM('<!doctype html><html><body><div id="device" style="width:600px;height:440px"></div><button id="outside">Outside</button></body></html>', {pretendToBeVisual: true});
  const previous = new Map();
  const values = {window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    Element: dom.window.Element, HTMLElement: dom.window.HTMLElement, SVGElement: dom.window.SVGElement,
    Node: dom.window.Node, DOMParser: dom.window.DOMParser, XMLSerializer: dom.window.XMLSerializer,
    HTMLInputElement: dom.window.HTMLInputElement, HTMLTextAreaElement: dom.window.HTMLTextAreaElement,
    KeyboardEvent: dom.window.KeyboardEvent, PointerEvent: dom.window.MouseEvent, FocusEvent: dom.window.FocusEvent,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window), cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
    ResizeObserver: class {observe() {} disconnect() {}}};
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {configurable: true, writable: true, value});
  }
  dom.window.SVGElement.prototype.getBBox = function () {return {x: 0, y: 0, width: 100, height: 20};};
  dom.window.SVGElement.prototype.getComputedTextLength = function () {return (this.textContent?.length ?? 0) * 8;};
  dom.window.HTMLCanvasElement.prototype.getContext = () => ({font: '', measureText: text => ({width: String(text).length * 8})});
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  Blockly.utils.xml.injectDependencies(dom.window);
  t.after(async () => {
    dom.beforeClose?.();
    await new Promise(resolve => setTimeout(resolve, 0));
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  });
  return dom;
}
test('GG-DEVICE-EDITOR: opaque rollback restores an invalid live Blockly draft and selection without accepting imported tokens', t => {
  const dom = installDOM(t);
  const editor = createDeviceEditor(document.querySelector('#device')); dom.beforeClose = () => editor.dispose();
  assert.equal(editor.selectSource('device-heart'), true);
  const selected = Blockly.common.getSelected();
  const workspace = selected.workspace;
  const matrix = workspace.newBlock('gg_mb_show_leds', 'draft-matrix'); matrix.initSvg(); matrix.render(); matrix.setFieldValue('010', 'LEDS');
  assert.equal(editor.selectSource(matrix.id), true);
  workspace.setScale(1.1); workspace.scroll(-30, -45);
  const field = matrix.getField('LEDS'); Blockly.getFocusManager().focusNode(field); field.showEditor();
  const input = document.activeElement;
  assert.equal(input.tagName, 'INPUT');
  input.value = 'draft typing'; input.setSelectionRange(2, 7, 'backward'); input.scrollLeft = 12;
  const viewport = {scale: workspace.scale, x: workspace.scrollX, y: workspace.scrollY};
  const before = editor.captureGraph(); const token = editor.checkpoint();
  assert.throws(() => editor.program(), error => error.sourceBlockId === matrix.id);
  assert.throws(() => editor.prepare(before), error => error.sourceBlockId === matrix.id);
  editor.commit(editor.prepare(defaultDeviceGraph));
  for (const fake of [{}, structuredClone(token), null]) assert.throws(() => editor.restoreDraft(fake), /no pertenece/);
  editor.restoreDraft(token);
  assert.deepEqual(editor.captureGraph(), before);
  assert.equal(editor.selectedSource(), 'draft-matrix');
  assert.equal(Blockly.getFocusManager().getFocusedNode().getSourceBlock().id, 'draft-matrix');
  assert.equal(document.activeElement.tagName, 'INPUT');
  assert.equal(document.activeElement.value, 'draft typing');
  assert.deepEqual([document.activeElement.selectionStart, document.activeElement.selectionEnd, document.activeElement.selectionDirection], [2, 7, 'backward']);
  assert.equal(document.activeElement.scrollLeft, 12);
  assert.equal(workspace.scale, viewport.scale);
  assert.equal(workspace.scrollX, viewport.x); assert.equal(workspace.scrollY, viewport.y);
  const clone = editor.captureGraph(); clone.nodes[0].fields.ICON = 'No';
  editor.restoreDraft(token); assert.deepEqual(editor.captureGraph(), before);
  editor.setReady(false); assert.equal(workspace.isReadOnly(), true);
  editor.setReady(true); assert.equal(workspace.isReadOnly(), false);
  editor.setVisible(false); editor.setVisible(true);
  assert.equal(editor.selectSource('absent'), false);
  assert.equal(dom.window.document.querySelector('#device').getAttribute('aria-disabled'), 'false');
});

test('GG-DEVICE-EDITOR: first activation refreshes existing readonly fields without replacing blocks or changing authoring', t => {
  const dom = installDOM(t);
  const editor = createDeviceEditor(document.querySelector('#device')); dom.beforeClose = () => editor.dispose();
  editor.setReady(false);
  editor.commit(editor.prepare(defaultDeviceGraph));
  editor.selectSource('device-number');
  const block = Blockly.common.getSelected();
  const field = block.getField('NUMBER');
  const element = field.getFocusableElement();
  const before = editor.captureGraph();
  assert.equal(block.workspace.isReadOnly(), true);
  assert.equal(field.isClickable(), false);
  assert.equal(element.classList.contains('blocklyNonEditableField'), true);
  assert.equal(element.getAttribute('aria-label'), 'number: 1');
  let changes = 0; editor.subscribe(() => changes++);
  editor.setReady(true);
  assert.equal(field.isClickable(), true);
  assert.equal(element.classList.contains('blocklyEditableField'), true);
  assert.equal(element.classList.contains('blocklyNonEditableField'), false);
  assert.equal(element.getAttribute('aria-label'), 'Edit number: 1');
  assert.equal(element.getAttribute('role'), 'button');
  assert.equal(block.workspace.getBlockById(block.id), block);
  assert.equal(field.getFocusableElement(), element);
  assert.equal(editor.selectedSource(), 'device-number');
  assert.deepEqual(editor.captureGraph(), before);
  assert.equal(changes, 0);
  editor.setReady(false);
  assert.equal(field.isClickable(), false);
  assert.equal(element.classList.contains('blocklyNonEditableField'), true);
  assert.equal(element.getAttribute('aria-label'), 'number: 1');
  editor.setReady(true);
  assert.equal(field.isClickable(), true);
  assert.equal(element.getAttribute('aria-label'), 'Edit number: 1');
  assert.deepEqual(editor.captureGraph(), before);
});
