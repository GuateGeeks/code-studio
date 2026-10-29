import test from 'node:test';
import assert from 'node:assert/strict';
import {withDeferredAudioContext} from '../../src/editor/deferred-audio.mjs';

// Doble de AudioContext que cuenta construcciones reales. En Chromium cada
// construcción es síncrona contra el servicio de audio y puede bloquear.
function audioScope() {
  const scope = {built: 0};
  scope.AudioContext = class FakeAudioContext {
    constructor() { scope.built++; this.state = 'running'; this.currentTime = 1.5; this.destination = {kind: 'destination'}; this.closed = 0; }
    resume() { return Promise.resolve(); }
    close() { this.closed++; this.state = 'closed'; return Promise.resolve(); }
    createOscillator() { return {kind: 'oscillator'}; }
    createGain() { return {kind: 'gain'}; }
    createBufferSource() { return {kind: 'source'}; }
    decodeAudioData(data, done) { done({kind: 'buffer', data}); }
  };
  return scope;
}
// Reproduce lo que hace el constructor de Blockly.WorkspaceAudio (Blockly 13).
const workspaceAudio = scope => scope.AudioContext && new scope.AudioContext();

test('GG-ENTRY-001 audio diferido: crear editores no construye AudioContext y el global queda restaurado', () => {
  const scope = audioScope(), Native = scope.AudioContext;
  const contexts = withDeferredAudioContext(() => [workspaceAudio(scope), workspaceAudio(scope), workspaceAudio(scope)], scope);
  assert.equal(scope.built, 0);
  assert.equal(scope.AudioContext, Native);
  assert.deepEqual(contexts.map(context => context.state), ['suspended', 'suspended', 'suspended']);
});

test('GG-ENTRY-001 audio diferido: el primer sonido tras un gesto crea un único contexto real y delega', async () => {
  const scope = audioScope();
  const context = withDeferredAudioContext(() => workspaceAudio(scope), scope);
  // WorkspaceAudio.prepareToPlay: reanuda solo si está suspendido y hubo gesto.
  await context.resume();
  assert.equal(scope.built, 1);
  assert.equal(context.state, 'running');
  assert.equal(context.currentTime, 1.5);
  assert.deepEqual(context.destination, {kind: 'destination'});
  assert.deepEqual([context.createOscillator(), context.createGain(), context.createBufferSource()], [{kind: 'oscillator'}, {kind: 'gain'}, {kind: 'source'}]);
  let decoded; context.decodeAudioData('bytes', buffer => { decoded = buffer; });
  assert.deepEqual(decoded, {kind: 'buffer', data: 'bytes'});
  assert.equal(scope.built, 1);
  await context.close();
  assert.equal(context.state, 'closed');
});

test('GG-ENTRY-001 audio diferido: cerrar un editor sin sonido no construye ni reanuda audio', async () => {
  const scope = audioScope();
  const context = withDeferredAudioContext(() => workspaceAudio(scope), scope);
  await context.close();
  assert.equal(context.state, 'closed');
  assert.equal(scope.built, 0);
});

test('GG-ENTRY-001 audio diferido: sin Web Audio no inventa un contexto y una excepción restaura el global', () => {
  const silent = {};
  assert.equal(withDeferredAudioContext(() => workspaceAudio(silent), silent), undefined);
  assert.equal('AudioContext' in silent, false);
  const scope = audioScope(), Native = scope.AudioContext;
  assert.throws(() => withDeferredAudioContext(() => { throw new Error('inject falló'); }, scope), /inject falló/);
  assert.equal(scope.AudioContext, Native);
});
