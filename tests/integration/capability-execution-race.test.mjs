import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

// The production module remains unmodified. Only its transport/engine imports
// are replaced, so deferred renderer replies exercise its actual lifecycle.
async function scenario(kind) {
  const frames = [], tokens = [], cancellations = [], executed = [];
  const deferred = () => {
    let resolve, reject;
    const promise = new Promise((yes, no) => {resolve = yes; reject = no;});
    return {promise, resolve, reject};
  };
  let current = null;
  const language = {
    async prepare() {const token = {id: tokens.length, closed: false}; tokens.push(token); current = token; return token;},
    async execute(token) {if (token.closed) throw new Error('New candidate was cancelled'); executed.push(token.id);},
    cancelPreparation() {if (current) {cancellations.push(current.id); current.closed = true;}},
    stop({preserve} = {}) {if (current && current !== preserve) current.closed = true;},
    invoke() {}, cancelInvocation() {}
  };
  const imports = {
    './language-controller.mjs': {createLanguageController: () => language},
    './context-frame.mjs': {createContextFrame: () => {
      const preparation = deferred();
      const frame = {
        sessionId: 'session-' + frames.length, revision: 0, preparation, commands: [], mounted: false, disposed: false,
        async request(command) {
          frame.commands.push(command);
          if (command === 'prepare') return preparation.promise;
          if (frame.disposed) throw new Error('Session stopped');
          return {sessionId: frame.sessionId};
        },
        mount() {if (frame.disposed) throw new Error('Session stopped'); frame.mounted = true;},
        dispose() {frame.disposed = true; preparation.reject(new Error('Old frame disposed'));}
      };
      frames.push(frame); return frame;
    }},
    '../capability-program-host.mjs': {createCapabilityProgramHost: () => ({dispose() {}, stop() {}, state() {return {};}})},
    '../contracts/operations.mjs': {resolveOperationProfile: ({contextId, documentId}) => ({contextId, documentId, profileId: 'test-profile'})},
    '../contracts/program-ir1.mjs': {lowerCapabilityGraph: () => {throw new Error('Unexpected block compilation');}},
    '../generated-capability-source.mjs': {generateCapabilityProgramSource: () => {throw new Error('Unexpected generation');}},
    '../text-documents.mjs': {createTextDocument: () => {throw new Error('Unexpected document creation');}},
    '../contracts/resources-v2.mjs': {validateResources2: async input => input}
  };
  const context = vm.createContext({structuredClone, JSON, Error, Set, Promise});
  const source = await readFile(new URL('../../src/studio/capability-execution.mjs', import.meta.url), 'utf8');
  const production = new vm.SourceTextModule(source, {context});
  await production.link(specifier => {
    const exports = imports[specifier];
    assert.ok(exports, 'Unexpected production dependency: ' + specifier);
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, {context});
  });
  await production.evaluate();
  const authoring = {
    contextConfig: {documentId: 'scene-main', mode: 'javascript', selectedTextDocumentId: 'doc'},
    resources: {}, capabilities: null, textDocuments: [{id: 'doc', language: 'javascript', source: ''}]
  };
  let execution, commits = 0;
  execution = production.namespace.createCapabilityExecution({
    config: {languageOrigin: 'http://language.test', scene3dOrigin: 'http://scene.test'},
    getAuthoring: () => authoring, slot: {},
    beforeCommit: () => {commits++; execution.stop({preserveCandidate: true});}
  });
  const settle = () => new Promise(resolve => setImmediate(resolve));
  const outcome = promise => promise.then(result => ({result}), error => ({error: error.message}));
  const first = outcome(execution.run('scene3d')); await settle();
  assert.equal(frames.length, 1); assert.equal(tokens.length, 1);

  if (kind === 'changed-authoring') {
    authoring.textDocuments[0].source = 'Edited during preparation';
    frames[0].preparation.resolve();
    assert.match((await first).error, /autoría cambió/);
    assert.equal(commits, 0); assert.deepEqual(executed, []);
    assert.deepEqual(frames[0].commands, ['prepare']);
    assert.equal(frames[0].disposed, true); assert.equal(frames[0].mounted, false);
    assert.equal(tokens[0].closed, true); assert.equal(execution.state().preparing, false);
  } else {
    if (kind === 'stop-then-run') execution.stop();
    const second = outcome(execution.run('scene3d')); await settle();
    assert.equal(frames.length, 2); assert.equal(tokens.length, 2);
    assert.match((await first).error, /Old frame disposed/);
    assert.equal(tokens[0].closed, true);
    assert.equal(tokens[1].closed, false, 'old failure must not cancel the newer language candidate');
    assert.equal(cancellations.includes(1), false);
    assert.equal(frames[0].mounted, false); assert.equal(frames[0].disposed, true);
    frames[1].preparation.resolve();
    assert.deepEqual(await second, {result: {sessionId: 'session-1'}});
    assert.deepEqual(executed, [1]); assert.equal(commits, 1);
    assert.equal(frames[1].mounted, true);
    assert.deepEqual(frames[1].commands, ['prepare', 'commit', 'snapshot']);
    assert.equal(execution.state().sessionId, 'session-1');
  }
  execution.stop();
  assert.equal(execution.state().sessionId, null);
  return {frames: frames.length, executed, commits};
}

async function isolatedScenario(kind) {
  // SourceTextModule needs this flag only in the isolated child, not in the
  // normal Node test runner or any product process.
  return new Promise((resolve, reject) => {
    const env = {...process.env}; delete env.NODE_TEST_CONTEXT;
    const child = spawn(process.execPath, ['--experimental-vm-modules', fileURLToPath(import.meta.url), '--race-scenario', kind], {env, stdio: ['ignore', 'pipe', 'pipe']});
    let stdout = '', stderr = '';
    child.stdout.setEncoding('utf8'); child.stdout.on('data', data => {stdout += data;});
    child.stderr.setEncoding('utf8'); child.stderr.on('data', data => {stderr += data;});
    const timer = setTimeout(() => {child.kill(); reject(new Error('Lifecycle regression child timed out'));}, 10000);
    child.on('error', error => {clearTimeout(timer); reject(error);});
    child.on('close', code => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(stderr || stdout || 'Lifecycle child failed: ' + code));
      else {try {resolve(JSON.parse(stdout));} catch (error) {reject(error);}}
    });
  });
}

const childArg = process.argv.indexOf('--race-scenario');
if (childArg !== -1) {
  process.stdout.write(JSON.stringify(await scenario(process.argv[childArg + 1])));
} else {
  test('GG-F6-LIFECYCLE: a late failure from Run A cannot cancel staged Run B', async () => {
    assert.deepEqual(await isolatedScenario('replacement'), {frames: 2, executed: [1], commits: 1});
  });
  test('GG-F6-LIFECYCLE: Stop followed immediately by Run B revokes A without revoking B', async () => {
    assert.deepEqual(await isolatedScenario('stop-then-run'), {frames: 2, executed: [1], commits: 1});
  });
  test('GG-F6-LIFECYCLE: editing authoring during preparation rejects before renderer commit or language execution', async () => {
    assert.deepEqual(await isolatedScenario('changed-authoring'), {frames: 1, executed: [], commits: 0});
  });
}
