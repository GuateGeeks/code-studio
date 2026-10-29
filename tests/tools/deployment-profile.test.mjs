import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createReleaseSnapshot} from '../../tools/build/release-snapshot.mjs';
import {offlineRoles} from '../../src/offline/contracts.mjs';
import {deploymentContexts, validateDeploymentContexts, parseDeploymentContexts} from '../../src/contracts/deployment-profile.mjs';
import {createAuthoringContexts} from '../../src/studio/authoring-contexts.mjs';
import {offlineFixture} from '../helpers/offline-fixture.mjs';

test('PILOT-001: the deployment profile is a closed, ordered list that always includes 2D', () => {
  assert.deepEqual(deploymentContexts, ['2d', 'text', 'microbit', 'sb3', 'scene3d', 'webapp']);
  assert.equal(validateDeploymentContexts(null), null);
  assert.equal(parseDeploymentContexts(undefined), null);
  assert.equal(parseDeploymentContexts('  '), null);
  assert.deepEqual(parseDeploymentContexts('text, 2d'), ['2d', 'text']);
  for (const value of [[], ['text'], ['2d', '2d'], ['2d', 'arduino'], '2d', ['2d', '__proto__']])
    assert.throws(() => validateDeploymentContexts(value), /Perfil de despliegue inválido/);
  assert.throws(() => parseDeploymentContexts('2d,unknown'), /Perfil de despliegue inválido/);
});

test('PILOT-002: a release publishes the profile only when declared; the default config keeps its shape', async t => {
  const f = await offlineFixture(); t.after(f.cleanup);
  const pilot = await createReleaseSnapshot({browserRoot: f.browserRoot, releaseRoot: f.releaseRoot, origins: f.origins, contexts: ['text', '2d']});
  assert.notEqual(pilot.cohort, f.snapshot.cohort);
  assert.deepEqual(pilot.contexts, ['2d', 'text']);
  assert.equal(f.snapshot.contexts, null);
  for (const role of offlineRoles) {
    const config = JSON.parse(await readFile(pilot.resolveRoute(role, pilot.releaseBase + 'config.json').filePath));
    assert.deepEqual(config, {...f.origins, offlineProtocolVersion: 1, cohort: pilot.cohort, releaseBase: pilot.releaseBase, contexts: ['2d', 'text']});
    const plain = JSON.parse(await readFile(f.snapshot.resolveRoute(role, f.snapshot.releaseBase + 'config.json').filePath));
    assert.equal(Object.hasOwn(plain, 'contexts'), false);
  }
  const again = await createReleaseSnapshot({browserRoot: f.browserRoot, releaseRoot: f.releaseRoot, origins: f.origins});
  assert.equal(again.cohort, f.snapshot.cohort);
  await assert.rejects(createReleaseSnapshot({browserRoot: f.browserRoot, releaseRoot: f.releaseRoot, origins: f.origins, contexts: ['microbit']}), /inválido/);
});

function selector() {
  const element = {options: [], value: '', listeners: [],
    ownerDocument: {createElement: () => ({value: '', textContent: ''})},
    replaceChildren() { this.options = []; }, append(option) { this.options.push(option); },
    addEventListener(type, listener) { this.listeners.push(listener); }};
  element.options.push({value: '2d'}, {value: 'microbit'});
  return element;
}
test('PILOT-003: hidden contexts stay registered for authoring but are never listed or selected', () => {
  const picker = selector(), visible = [];
  const contexts = createAuthoringContexts({selector: picker, heading: {}, status: {}, available: ['2d', 'text']});
  for (const id of ['2d', 'text', 'microbit', 'sb3', 'scene3d', 'webapp'])
    contexts.register({id, label: id, title: id, setVisible: value => { if (value) visible.push(id); }});
  assert.deepEqual(picker.options.map(option => option.value), ['2d', 'text']);
  assert.equal(contexts.current(), '2d');
  assert.equal(contexts.select('microbit'), false);
  assert.equal(contexts.current(), '2d');
  assert.equal(contexts.select('text'), true);
  assert.equal(contexts.current(), 'text');
  assert.equal(contexts.available('scene3d'), false);
  assert.ok(!visible.includes('microbit') && !visible.includes('scene3d'));
  assert.throws(() => contexts.select('arduino'), /no instalado/);
  const all = createAuthoringContexts({selector: selector(), heading: {}, status: {}});
  for (const id of ['2d', 'microbit']) all.register({id, label: id, title: id, setVisible() {}});
  assert.equal(all.select('microbit'), true);
  assert.equal(all.available('microbit'), true);
});
