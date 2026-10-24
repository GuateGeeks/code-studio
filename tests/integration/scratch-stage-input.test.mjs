import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createRequire} from 'node:module';
import {JSDOM} from 'jsdom';
import {createStageInput, stagePointerCoordinates} from '../../src/adapters/scratch/stage-input.mjs';

function target(id, {name = id, stage = false, original = true, visible = true, key = 'space', click = true} = {}) {
  const blocks = [{id: 'key', opcode: 'event_whenkeypressed', fields: {KEY_OPTION: {value: key}}}, ...(click ? [{id: 'click', opcode: stage ? 'event_whenstageclicked' : 'event_whenthisspriteclicked', fields: {}}] : [])];
  return {id, isStage: stage, isOriginal: original, visible, getName: () => name,
    blocks: {getScripts: () => blocks.map(block => block.id), getBlock: id => blocks.find(block => block.id === id)}};
}
function harness(t) {
  const dom = new JSDOM('<canvas width="480" height="360"></canvas><div id="controls"></div><input id="after">', {pretendToBeVisual: true});
  const canvas = dom.window.document.querySelector('canvas'), container = dom.window.document.querySelector('#controls');
  const runtime = new EventEmitter(), io = [], activations = []; runtime.targets = [target('hero')];
  runtime.startHats = (...args) => activations.push(args);
  const vm = {runtime, postIOData: (...args) => io.push(args)}; let current = true;
  const input = createStageInput({canvas, container, vm, isCurrent: () => current});
  t.after(() => {input.dispose(); dom.window.close();});
  return {dom, canvas, container, runtime, io, activations, input, stale: () => {current = false;},
    select: () => container.querySelector('select'), action: () => container.querySelector('button')};
}
function key(h, type, init = {}) {
  const event = new h.dom.window.KeyboardEvent(type, {key: ' ', code: 'Space', bubbles: true, cancelable: true, ...init});
  h.canvas.dispatchEvent(event); return event;
}

test('GG-F7-INPUT: pointer mapping uses the rendered image inside horizontal and vertical letterbox', () => {
  const canvas = {width: 480, height: 360, getBoundingClientRect: () => ({left: 100, top: 50, width: 400, height: 200})};
  assert.equal(stagePointerCoordinates(canvas, 110, 100), null, 'left letterbox is not Stage');
  const hit = stagePointerCoordinates(canvas, 300, 150);
  assert.equal(hit.canvasWidth, 400); assert.equal(hit.canvasHeight, 200);
  assert.ok(Math.abs(hit.x / hit.canvasWidth - .5) < 1e-6); assert.equal(hit.y / hit.canvasHeight, .5);
  canvas.getBoundingClientRect = () => ({left: 20, top: 40, width: 240, height: 300});
  assert.equal(stagePointerCoordinates(canvas, 140, 60), null, 'top letterbox is not Stage');
  assert.deepEqual(stagePointerCoordinates(canvas, 200, 160), {x: 180, y: 100, canvasWidth: 240, canvasHeight: 300});
});

test('GG-F7-INPUT: the actual Scratch Mouse and renderer client-space conversion pick the same off-centre target through letterbox', () => {
  const require = createRequire(import.meta.url);
  const Mouse = require('../../../xcratch-scratch-editor/packages/scratch-vm/src/io/mouse.js');
  const canvas = {width: 480, height: 360, clientWidth: 528, clientHeight: 280,
    getBoundingClientRect: () => ({left: 20, top: 50, width: 528, height: 280})};
  const original = {drawableID: 42, draggable: false}, stage = {id: 'Stage'}, hats = [];
  const runtime = {targets: [original], getTargetForStage: () => stage, startHats: (...args) => hats.push(args), renderer: {
    // This is the installed RenderWebGL.clientSpaceToScratchBounds conversion:
    // it always uses the full canvas client dimensions before native picking.
    pick: (x, y) => Math.abs(480 * (x / canvas.clientWidth - .5) - 100) < 2 && Math.abs(-360 * (y / canvas.clientHeight - .5) - 60) < 2 ? 42 : -1
  }};
  const imageHeight = 280, imageWidth = imageHeight * 4 / 3;
  const point = stagePointerCoordinates(canvas, 20 + (528 - imageWidth) / 2 + imageWidth * 340 / 480, 50 + imageHeight * 120 / 360);
  const mouse = new Mouse(runtime); mouse.postData({...point, isDown: true});
  assert.equal(mouse.getScratchX(), 100); assert.equal(mouse.getScratchY(), 60);
  assert.deepEqual(hats, [['event_whenthisspriteclicked', null, original], ['event_whenstageclicked', null, original]]);
});

test('GG-F7-INPUT: only declared keys are consumed; browser shortcuts, navigation and IME remain native', t => {
  const h = harness(t);
  for (const init of [{key: 'Tab'}, {key: 'Tab', shiftKey: true}, {key: 'Escape'}, {key: '+' , ctrlKey: true}, {key: '0', metaKey: true}, {key: ' ', altKey: true}, {key: ' ', isComposing: true}, {key: 'q'}]) {
    assert.equal(key(h, 'keydown', init).defaultPrevented, false);
  }
  assert.deepEqual(h.io, []);
  assert.equal(key(h, 'keydown').defaultPrevented, true);
  assert.deepEqual(h.io, [['keyboard', {key: ' ', isDown: true}]]);
  key(h, 'keyup', {ctrlKey: true});
  assert.deepEqual(h.io.at(-1), ['keyboard', {key: ' ', isDown: false}]);
  assert.match(h.canvas.getAttribute('aria-label'), /programa 2D/);
  assert.match(h.container.querySelector('p').textContent, /espacio.*Tab sale/);
});

test('GG-F7-INPUT: held keys and pointer state release on blur and disposal without sending fresh key hats', t => {
  const h = harness(t);
  key(h, 'keydown'); h.canvas.dispatchEvent(new h.dom.window.Event('blur'));
  assert.deepEqual(h.io.slice(-2), [['keyboard', {key: ' ', isDown: true}], ['keyboard', {key: ' ', isDown: false}]]);
  key(h, 'keydown'); h.dom.window.dispatchEvent(new h.dom.window.Event('blur'));
  assert.deepEqual(h.io.at(-1), ['keyboard', {key: ' ', isDown: false}]);
  key(h, 'keydown'); h.input.dispose();
  const before = structuredClone(h.io); key(h, 'keydown'); key(h, 'keyup');
  assert.deepEqual(h.io, before); assert.equal(h.io.at(-1)[1].isDown, false);
  assert.equal(h.container.children.length, 0);
  assert.equal(h.runtime.eventNames().length, 0);
});

test('GG-F7-INPUT: select activates the exact original, clone and Stage through both native click opcodes', async t => {
  const h = harness(t), clone = target('clone', {name: '<img onerror=bad()>', original: false}), stage = target('stage', {name: 'Stage', stage: true});
  h.runtime.emit('targetWasCreated', clone, h.runtime.targets[0]);
  assert.equal(h.select().options.length, 1, 'created callback precedes native addTarget');
  h.runtime.targets.push(clone, stage); await Promise.resolve();
  assert.equal(h.select().options.length, 3);
  assert.equal(h.container.querySelector('img'), null);
  for (const selected of h.runtime.targets) {
    h.select().value = selected.id; h.select().dispatchEvent(new h.dom.window.Event('change')); h.action().click();
    assert.deepEqual(h.activations.slice(-2), [['event_whenthisspriteclicked', null, selected], ['event_whenstageclicked', null, selected]]);
  }
  h.select().value = clone.id; h.select().dispatchEvent(new h.dom.window.Event('change'));
  h.runtime.emit('targetWasRemoved', clone); h.runtime.targets = h.runtime.targets.filter(item => item !== clone);
  const count = h.activations.length; h.action().click(); await Promise.resolve();
  assert.equal(h.activations.length, count, 'deleted target cannot start hats during deferred refresh');
  assert.equal(h.select().options.length, 2);
});

test('GG-F7-INPUT: program stop leaves native click restart available; external Stop revokes old controls across resume', t => {
  const h = harness(t); h.runtime.emit('PROJECT_STOP_ALL'); h.action().click();
  assert.equal(h.activations.length, 2);
  const old = h.action(); h.input.stop(); old.click();
  assert.equal(h.activations.length, 2); assert.equal(old.disabled, true);
  h.runtime.emit('PROJECT_START'); key(h, 'keydown'); assert.deepEqual(h.io, []);
  h.input.resume(); old.click(); assert.equal(h.activations.length, 2);
  h.action().click(); assert.equal(h.activations.length, 4);
  h.stale(); h.action().click(); key(h, 'keydown'); assert.equal(h.activations.length, 4); assert.deepEqual(h.io, []);
});

test('GG-F7-INPUT: native target refresh retains select focus, updates hidden clones and follows textual replacement hats', t => {
  const h = harness(t), clone = target('clone', {original: false}); h.runtime.targets.push(clone); h.input.refresh();
  h.select().value = clone.id; h.select().focus(); clone.visible = false; h.input.refresh();
  assert.equal(h.dom.window.document.activeElement, h.select()); assert.equal(h.action().disabled, true);
  clone.visible = true; h.input.refresh(); assert.equal(h.action().disabled, false);
  const replacement = target('hero', {key: 'right arrow'}).blocks; h.runtime.targets[0].blocks = replacement;
  h.input.setMode('text'); h.input.resume();
  assert.match(h.canvas.getAttribute('aria-label'), /documento de texto/);
  assert.match(h.container.querySelector('p').textContent, /flecha derecha/);
  key(h, 'keydown', {key: 'ArrowRight', code: 'ArrowRight'});
  assert.deepEqual(h.io.at(-1), ['keyboard', {key: 'ArrowRight', isDown: true}]);
});

test('GG-F7-INPUT: pointer outside the image never activates; pointer cancellation clears the pressed state', t => {
  const h = harness(t); h.canvas.getBoundingClientRect = () => ({left: 100, top: 50, width: 400, height: 200});
  const pointer = (type, x, y) => h.canvas.dispatchEvent(new h.dom.window.MouseEvent(type, {button: 0, clientX: x, clientY: y, bubbles: true}));
  pointer('pointerdown', 110, 100); assert.deepEqual(h.io, []);
  pointer('pointerdown', 300, 150); assert.equal(h.io.at(-1)[0], 'mouse'); assert.equal(h.io.at(-1)[1].isDown, true);
  pointer('pointerup', 110, 100); assert.deepEqual(h.io.at(-1), ['mouse', {x: -1, y: -1, canvasWidth: 480, canvasHeight: 360, isDown: false}]);
  const before = h.io.length; h.canvas.dispatchEvent(new h.dom.window.Event('pointercancel')); assert.equal(h.io.length, before);
});
