import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createWebAppAdapter} from '../../src/adapters/webapp/dom-adapter.mjs';
import {defaultWebAppConfig} from '../../src/contracts/webapp-program.mjs';

function harness(t) {
  const dom = new JSDOM('<!doctype html><main></main>');
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'AbortController');
  // Native DOM EventTargets require the AbortSignal belonging to their realm.
  Object.defineProperty(globalThis, 'AbortController', {value: dom.window.AbortController, configurable: true, writable: true});
  const events = [], container = dom.window.document.querySelector('main');
  const adapter = createWebAppAdapter({container, onEvent: event => events.push(event)});
  t.after(() => {
    adapter.dispose(); dom.window.close();
    if (previous) Object.defineProperty(globalThis, 'AbortController', previous);
    else delete globalThis.AbortController;
  });
  return {dom, adapter, container, events, get: id => container.querySelector(`[data-target-id="${id}"]`)};
}

test('GG-F6-DOM: native labels and text APIs retain literal text without creating executable markup', async t => {
  const {adapter, container, get} = harness(t), config = defaultWebAppConfig();
  config.app.nodes.find(node => node.id === 'web-input').props.label = 'Nombre <img src=x onerror=alert(1)>';
  config.app.nodes.push({id: 'message', type: 'text', parentId: 'web-form', props: {text: '<script>bad()</script>'}});
  const candidate = await adapter.prepare(config);
  assert.equal(container.children.length, 0, 'preparation must not publish DOM');
  adapter.commit(candidate);
  assert.equal(get('web-input').labels.length, 1);
  assert.equal(get('web-input').labels[0].textContent, config.app.nodes[1].props.label);
  assert.equal(get('message').textContent, '<script>bad()</script>');
  adapter.call('webapp.setText', {targetId: 'message', text: '<img src=x onerror=bad()>'});
  adapter.call('webapp.appendItem', {targetId: 'web-list', text: '<script>bad()</script>'});
  assert.equal(get('message').textContent, '<img src=x onerror=bad()>');
  assert.equal(get('web-list').firstElementChild.textContent, '<script>bad()</script>');
  assert.equal(container.querySelector('img,script'), null);
  adapter.call('webapp.setVisible', {targetId: 'web-input', visible: false});
  assert.equal(get('web-input').hidden, true);
  assert.equal(get('web-input').labels[0].hidden, true);
});

test('GG-F6-DOM: a button inside a group inside a form performs one native submit with strict event DTOs', async t => {
  const {adapter, events, get} = harness(t), config = defaultWebAppConfig();
  config.app.nodes.push({id: 'controls', type: 'group', parentId: 'web-form', props: {}});
  config.app.nodes.find(node => node.id === 'web-add').parentId = 'controls';
  adapter.commit(await adapter.prepare(config));
  get('web-input').value = 'Ada';
  assert.equal(get('web-add').type, 'submit');
  get('web-add').click();
  assert.deepEqual(events.filter(event => event.type === 'submit'), [{type: 'submit', targetId: 'web-form', values: {'web-input': 'Ada'}}]);
  assert.deepEqual(events.filter(event => event.type === 'click'), [
    {type: 'click', targetId: 'web-add'}, {type: 'click', targetId: 'controls'}, {type: 'click', targetId: 'web-form'}
  ]);
});

test('GG-F6-DOM: input and global key DTOs expose only their contract and preserve browser navigation keys', async t => {
  const {dom, adapter, events, get} = harness(t);
  adapter.commit(await adapter.prepare(defaultWebAppConfig()));
  const input = get('web-input'); input.value = 'x'.repeat(1025);
  input.dispatchEvent(new dom.window.Event('input', {bubbles: true}));
  input.dispatchEvent(new dom.window.KeyboardEvent('keydown', {key: ' ', bubbles: true, cancelable: true}));
  assert.deepEqual(events, [
    {type: 'input', targetId: 'web-input', value: 'x'.repeat(1024)},
    {type: 'key', targetId: null, key: 'space'}
  ]);
  for (const init of [{key: 'Tab'}, {key: 'Escape'}, {key: 's', ctrlKey: true}, {key: 's', metaKey: true}, {key: 's', altKey: true}]) {
    const event = new dom.window.KeyboardEvent('keydown', {...init, bubbles: true, cancelable: true});
    assert.equal(input.dispatchEvent(event), true);
    assert.equal(event.defaultPrevented, false);
  }
  assert.equal(events.length, 2);
  input.dispatchEvent(new dom.window.KeyboardEvent('keydown', {key: 'ArrowLeft', bubbles: true}));
  assert.deepEqual(events.at(-1), {type: 'key', targetId: null, key: 'ArrowLeft'});
});

test('GG-F6-DOM: aborting a staged candidate rejects commit and preserves the published application', async t => {
  const {adapter, container, get} = harness(t);
  adapter.commit(await adapter.prepare(defaultWebAppConfig()));
  const published = get('web-input'); published.value = 'Existing draft';
  const before = adapter.snapshot(), controller = new AbortController();
  const candidate = await adapter.prepare(defaultWebAppConfig(), {signal: controller.signal});
  controller.abort();
  assert.throws(() => adapter.commit(candidate), /candidate|cancelled/);
  assert.deepEqual(adapter.snapshot(), before);
  assert.equal(get('web-input'), published);
  assert.equal(container.querySelectorAll('form').length, 1);
  await assert.rejects(adapter.prepare(defaultWebAppConfig(), {signal: controller.signal}), /cancelled/);
});

test('GG-F6-DOM: Stop disposes live and staged DOM listeners, rejects old handles and revokes calls', async t => {
  const {dom, adapter, container, events, get} = harness(t);
  adapter.commit(await adapter.prepare(defaultWebAppConfig()));
  const input = get('web-input'), form = get('web-form'), button = get('web-add');
  const staged = await adapter.prepare(defaultWebAppConfig());
  adapter.dispose();
  input.value = 'After Stop';
  input.dispatchEvent(new dom.window.Event('input', {bubbles: true}));
  input.dispatchEvent(new dom.window.KeyboardEvent('keydown', {key: 'a', bubbles: true}));
  button.dispatchEvent(new dom.window.Event('click', {bubbles: true}));
  form.dispatchEvent(new dom.window.Event('submit', {bubbles: true, cancelable: true}));
  assert.deepEqual(events, []);
  assert.equal(container.children.length, 0);
  assert.equal(adapter.snapshot(), null);
  assert.throws(() => adapter.commit(staged), /candidate/);
  assert.throws(() => adapter.call('webapp.setValue', {targetId: 'web-input', value: 'bad'}), /stopped/);
  await assert.rejects(adapter.prepare(defaultWebAppConfig()), /cancelled/);
});

test('GG-F6-DOM: replacement removes old listeners and consumes candidate handles exactly once', async t => {
  const {dom, adapter, events, get} = harness(t);
  const first = await adapter.prepare(defaultWebAppConfig()); adapter.commit(first);
  const oldInput = get('web-input');
  const second = await adapter.prepare(defaultWebAppConfig()); adapter.commit(second);
  oldInput.dispatchEvent(new dom.window.Event('input', {bubbles: true}));
  assert.deepEqual(events, []);
  get('web-input').value = 'Live';
  get('web-input').dispatchEvent(new dom.window.Event('input', {bubbles: true}));
  assert.deepEqual(events, [{type: 'input', targetId: 'web-input', value: 'Live'}]);
  assert.throws(() => adapter.commit(first), /candidate/);
  assert.throws(() => adapter.commit(second), /candidate/);
});

test('GG-F6-DOM: list item 129 is rejected atomically, and clear permits a new item', async t => {
  const {adapter, get} = harness(t), config = defaultWebAppConfig();
  config.app.nodes.find(node => node.id === 'web-list').props.items = Array.from({length: 127}, (_, i) => String(i));
  adapter.commit(await adapter.prepare(config));
  adapter.call('webapp.appendItem', {targetId: 'web-list', text: '128'});
  const full = adapter.snapshot();
  assert.equal(get('web-list').children.length, 128);
  assert.throws(() => adapter.call('webapp.appendItem', {targetId: 'web-list', text: '129'}), /list limit/);
  assert.deepEqual(adapter.snapshot(), full);
  assert.equal(get('web-list').children.length, 128);
  adapter.call('webapp.clearItems', {targetId: 'web-list'});
  adapter.call('webapp.appendItem', {targetId: 'web-list', text: 'After clear'});
  assert.deepEqual([...get('web-list').children].map(li => li.textContent), ['After clear']);
});
