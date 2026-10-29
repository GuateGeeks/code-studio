import {corpus} from './corpus.blocks.mjs';
import {loadWorkspace, workspaceToIR} from '../../src/editor/block-program.mjs';
import {captureNumericInputIdentity} from '../../src/editor/workspace-from-ir.mjs';
import {generateApi3ProgramSource} from '../../src/generated-program-source.mjs';

export function temporaryMetadata(source, variableIds) {
  return {sourceMap: source.split('\n').map((_, line) => Array.from({length: 8}, (_, slot) => 'candidate-' + line + '-' + slot)), variableIds};
}
function allNodes(value, out = []) {
  if (!value || typeof value !== 'object') return out;
  if (value.sourceBlockId) out.push(value);
  for (const child of Object.values(value)) if (child && typeof child === 'object') allNodes(child, out);
  return out;
}
function lists(ir) {
  const result = [];
  const walk = body => { result.push(body); for (const n of body) { if (n.body) walk(n.body); if (n.elseBody) walk(n.elseBody); } };
  for (const script of ir.scripts) walk(script.body);
  return result;
}
export function codeViewMutationCases() {
  const cases = [];
  let random = 0x5eed25;
  const pick = maximum => { random ^= random << 13; random ^= random >>> 17; random ^= random << 5; return (random >>> 0) % maximum; };
  for (const [name, fixture] of Object.entries(corpus)) {
    const workspace = loadWorkspace(fixture);
    try {
      const previous = workspaceToIR(workspace), generated = generateApi3ProgramSource(previous, 'javascript');
      const sidecar = {numericInputIdentity: captureNumericInputIdentity(workspace),
        layout: workspace.getTopBlocks(true).map(b => ({sourceBlockId: b.id, ...b.getRelativeToSurfaceXY()}))};
      const add = (kind, expected, excluded = [], source = generateApi3ProgramSource(expected, 'javascript').text) => {
        cases.push({name: name + ':' + kind + ':' + cases.length, kind, previous, expected, excluded, source,
          metadata: temporaryMetadata(source, generated.variableIds), sidecar});
      };
      add('identity', structuredClone(previous));
      // Every numeric input, with seeded values kept within its own contract.
      for (const entry of sidecar.numericInputIdentity) for (let sample = 0; sample < 5; sample++) {
        const expected = structuredClone(previous), node = allNodes(expected).find(n => n.sourceBlockId === entry.parentId);
        const field = {STEPS: 'steps', SECONDS: 'seconds', TIMES: 'count', VALUE: 'value', DELTA: 'value', A: 'left', B: 'right'}[entry.inputName];
        node[field] = entry.inputName === 'SECONDS' ? (pick(50) + 1) / 10 : pick(20) + 1;
        add('numeric', expected);
      }
      // Single-line insertion/deletion/type replacement at every leaf slot,
      // including both arms of conditionals and repeated event types.
      const baselineLists = lists(previous);
      for (let l = 0; l < baselineLists.length; l++) {
        for (let index = 0; index <= baselineLists[l].length; index++) {
          const expected = structuredClone(previous);
          lists(expected)[l].splice(index, 0, {kind: 'move', steps: 97, sourceBlockId: 'oracle-new'});
          add('insert', expected);
        }
        for (let index = 0; index < baselineLists[l].length; index++) {
          const old = baselineLists[l][index]; if (old.body || old.elseBody) continue;
          const deleted = allNodes(old).map(n => n.sourceBlockId);
          let expected = structuredClone(previous); lists(expected)[l].splice(index, 1); add('delete', expected, deleted);
          expected = structuredClone(previous); lists(expected)[l][index] = old.kind === 'stopSounds'
            ? {kind: 'move', steps: 97, sourceBlockId: 'oracle-new'} : {kind: 'stopSounds', sourceBlockId: 'oracle-new'};
          add('replace-type', expected, deleted);
        }
      }
      // A comment/blank line changes source positions but no IR node.
      for (let line = 0; line < generated.text.split('\n').length; line++) {
        const source = generated.text.split('\n'); source.splice(line, 0, line % 2 ? '// comentario del alumno' : '');
        add('comment-or-blank', structuredClone(previous), [], source.join('\n'));
      }
      for (const script of previous.scripts) if (script.event === 'key' || script.event === 'message') {
        const expected = structuredClone(previous), node = expected.scripts.find(n => n.sourceBlockId === script.sourceBlockId);
        if (script.event === 'key') node.key = 'a'; else node.message = 'otro';
        add('event-option', expected);
      }
    } finally { workspace.dispose(); }
  }
  return cases;
}
export {allNodes};
