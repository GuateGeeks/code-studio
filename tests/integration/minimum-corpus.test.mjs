import test from 'node:test';
import assert from 'node:assert/strict';
import {corpus} from '../fixtures/corpus.blocks.mjs';
import {loadWorkspace, saveWorkspace, workspaceToIR, toScratchProject} from '../../spikes/block-program.mjs';
import {createScratchSession} from '../../spikes/scratch-adapter.mjs';

function translate(name) {
  const workspace = loadWorkspace(corpus[name]);
  try { const ir = workspaceToIR(workspace); return {ir, ...toScratchProject(ir)}; }
  finally { workspace.dispose(); }
}
const step = vm => { for (let i = 0; i < 6; i++) vm.runtime._step(); };

test('GG-BLOCK-006: explicit global assignment survives Blockly round-trip and separates Stage/local storage', () => {
  const workspace = loadWorkspace(corpus.globalVariables);
  let reopened;
  try {
    const ir = workspaceToIR(workspace);
    reopened = loadWorkspace(JSON.parse(JSON.stringify(saveWorkspace(workspace))));
    assert.deepEqual(workspaceToIR(reopened), ir);
    assert.deepEqual(ir.variables, [
      {id: 'gg-global-score', name: 'globalScore', initialValue: 0, scope: 'global'},
      {id: 'gg-local-score', name: 'localScore', initialValue: 0}
    ]);
    const {project, sourceMap} = toScratchProject(ir);
    assert.deepEqual(project.targets[0].variables, {'gg-global-score': ['globalScore', 0]});
    assert.deepEqual(project.targets[1].variables, {'gg-local-score': ['localScore', 0]});
    assert.equal(project.targets[1].blocks['clone-global-change'].fields.VARIABLE[1], 'gg-global-score');
    assert.equal(sourceMap['global-reset'], 'global-reset');
  } finally { workspace.dispose(); reopened?.dispose(); }
});

test('GG-SCRATCH-014: clone shares Stage global and copies local state without changing the authoring project', async () => {
  const {project} = translate('globalVariables');
  const authoring = structuredClone(project);
  const vm = await createScratchSession(project);
  try {
    vm.greenFlag(); step(vm);
    const original = vm.runtime.getSpriteTargetByName('hero');
    const clone = vm.runtime.targets.find(target => !target.isStage && !target.isOriginal);
    assert.ok(clone);
    assert.equal(vm.runtime.getTargetForStage().variables['gg-global-score'].value, 17);
    assert.equal(Number(original.variables['gg-local-score'].value), 3);
    assert.equal(Number(clone.variables['gg-local-score'].value), 5);
    assert.equal(Object.hasOwn(original.variables, 'gg-global-score'), false);
    assert.equal(clone.lookupVariableById('gg-global-score'), original.lookupVariableById('gg-global-score'));
    assert.deepEqual(project, authoring);
    vm.stopAll();
    assert.equal(vm.runtime.targets.filter(target => !target.isStage).length, 1);
  } finally { vm.quit(); }
});

test('GG-BLOCK-006: costumes use native menu linkage and reject undeclared scope or remote costume names', () => {
  const {ir, project, sourceMap} = translate('costumes');
  assert.equal(project.targets[1].blocks['costume-alt'].opcode, 'looks_switchcostumeto');
  assert.equal(project.targets[1].blocks['costume-alt:menu'].fields.COSTUME[0], 'hero-alt');
  assert.equal(sourceMap['costume-alt:menu'], 'costume-alt');
  const invalidCostume = structuredClone(ir);
  invalidCostume.scripts[0].body[0].costume = 'https://example.invalid/sprite.svg';
  assert.throws(() => toScratchProject(invalidCostume), /unsupported costume/);
  const invalidScope = translate('globalVariables').ir;
  invalidScope.variables[0].scope = 'remote';
  assert.throws(() => toScratchProject(invalidScope), /unsupported variable scope/);
});

test('GG-SCRATCH-015: two start scripts both advance before either wait completes', async () => {
  const {project} = translate('concurrent');
  const vm = await createScratchSession(project);
  try {
    vm.greenFlag(); step(vm);
    const variables = vm.runtime.getSpriteTargetByName('hero').variables;
    assert.equal(Number(variables['gg-long'].value), 1);
    assert.equal(Number(variables['gg-short'].value), 1);
    assert.equal(vm.runtime.threads.length, 2);
    // No assertion depends on which green-flag hat the VM schedules first.
    assert.deepEqual(new Set(vm.runtime.threads.map(thread => thread.topBlock)), new Set(['concurrent-long', 'concurrent-short']));
    vm.stopAll(); step(vm);
    assert.equal(vm.runtime.threads.length, 0);
    assert.equal(Number(variables['gg-long'].value), 1);
    assert.equal(Number(variables['gg-short'].value), 1);
  } finally { vm.quit(); }
});
