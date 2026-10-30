import {loadWorkspace, saveWorkspace, workspaceToIR} from './block-program.mjs';
import {captureNumericInputIdentity, workspaceFromIR} from './workspace-from-ir.mjs';
import {reconcileCodeViewIdentity} from '../code-view-identity.mjs';
import {authorizeProgram} from '../contracts/pack-broker.mjs';
import {generateApi3ProgramSource} from '../generated-program-source.mjs';

const plain = value => value && typeof value === 'object' && !Array.isArray(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));
function blocks(state) {
  const result = new Map();
  const visit = block => {
    if (!block) return;
    result.set(block.id, block);
    for (const input of Object.values(block.inputs ?? {})) { visit(input.shadow); visit(input.block); }
    visit(block.next?.block);
  };
  // An empty workspace (a new object) serializes without `blocks`.
  for (const block of state.blocks?.blocks ?? []) visit(block);
  return result;
}
export function captureCodeViewSnapshot(state, {capabilities = null, resourceView = null, scriptOrder = null} = {}) {
  const workspace = loadWorkspace(structuredClone(state), {capabilities, resourceView});
  try {
    return {state: saveWorkspace(workspace), ir: workspaceToIR(workspace, {capabilities, resourceView, scriptOrder}), scriptOrder: structuredClone(scriptOrder),
      numericInputIdentity: captureNumericInputIdentity(workspace),
      layout: workspace.getTopBlocks(true).map(block => ({sourceBlockId: block.id, ...block.getRelativeToSurfaceXY()})),
      capabilities: structuredClone(capabilities), resourceView: structuredClone(resourceView)};
  } finally { workspace.dispose(); }
}
// `owner` (scene2DTextOwner): the object whose program the snapshot holds (R2).
export function generateCodeViewSource(snapshot, language, {owner} = {}) {
  const generated = generateApi3ProgramSource(snapshot.ir, language, {resourceView: snapshot.resourceView, ...(owner ? {owner} : {})});
  const oldBlocks = blocks(snapshot.state), lines = generated.text.split('\n'), sourceMap = [], output = [], emitted = new Set();
  const commentPrefix = language === 'python' ? '# ' : '// ';
  for (let i = 0; i < lines.length; i++) {
    const ids = generated.sourceMap[i] ?? [];
    for (const id of ids) {
      const text = oldBlocks.get(id)?.icons?.comment?.text;
      if (emitted.has(id) || !text) continue;
      emitted.add(id);
      const indent = lines[i].match(/^\s*/)[0];
      for (const comment of text.split('\n')) { output.push(indent + commentPrefix + comment); sourceMap.push([]); }
    }
    output.push(lines[i]); sourceMap.push(ids);
  }
  return {...generated, text: output.join('\n'), sourceMap,
    variableNames: Object.fromEntries(Object.entries(generated.variableIds).map(([name, id]) => [name,
      snapshot.ir.variables?.find(variable => variable.id === id)?.name ?? name]))};
}
function validateMetadata(parsed) {
  if (!plain(parsed) || !Array.isArray(parsed.sourceLocations) || parsed.sourceLocations.length > 300 ||
      !Array.isArray(parsed.comments) || parsed.comments.length > 300 ||
      new TextEncoder().encode(JSON.stringify(parsed)).length > 262144) throw new Error('Metadatos de conversión inválidos.');
  const expected = new Set(), collect = value => {
    if (!value || typeof value !== 'object') return;
    if (value.sourceBlockId) expected.add(value.sourceBlockId);
    for (const child of Object.values(value)) if (child && typeof child === 'object') collect(child);
  };
  collect(parsed.ir);
  const seen = new Set(), positive = value => Number.isInteger(value) && value > 0 && value <= 65537;
  for (const item of parsed.sourceLocations) {
    if (!plain(item) || Object.keys(item).length !== 5 || !expected.has(item.sourceBlockId) || seen.has(item.sourceBlockId) ||
        !['line', 'column', 'endLine', 'endColumn'].every(key => positive(item[key])) || item.endLine < item.line ||
        item.line === item.endLine && item.endColumn < item.column) throw new Error('Ubicación de conversión inválida.');
    seen.add(item.sourceBlockId);
  }
  if (seen.size !== expected.size) throw new Error('Faltan ubicaciones del programa candidato.');
  let commentBytes = 0;
  for (const item of parsed.comments) {
    if (!plain(item) || Object.keys(item).length !== 5 || typeof item.text !== 'string' ||
        !['line', 'column', 'endLine', 'endColumn'].every(key => positive(item[key])) || item.endLine < item.line ||
        item.line === item.endLine && item.endColumn < item.column) throw new Error('Comentario de conversión inválido.');
    commentBytes += new TextEncoder().encode(item.text).length;
  }
  if (commentBytes > 65536) throw new Error('Los comentarios superan el límite de conversión.');
}

// Prepare in a detached workspace. The caller's authoring and runtime remain
// unchanged until the editor explicitly commits the returned candidate.
export function prepareCodeViewCandidate(snapshot, parsed) {
  if (!plain(parsed)) throw new Error('Metadatos de conversión inválidos.');
  const candidate = authorizeProgram(snapshot.capabilities, parsed.ir, {resourceView: snapshot.resourceView});
  validateMetadata(parsed);
  const result = reconcileCodeViewIdentity(snapshot.ir, candidate, {...snapshot, resourceView: snapshot.resourceView});
  const state = workspaceFromIR(result.ir, {...result, capabilities: snapshot.capabilities, resourceView: snapshot.resourceView});
  const old = blocks(snapshot.state), next = blocks(state);
  for (const [id, block] of next) {
    const original = old.get(id);
    if (!original || original.type !== block.type) continue;
    for (const key of ['collapsed', 'inline']) if (Object.hasOwn(original, key)) block[key] = structuredClone(original[key]);
    if (original.icons?.comment) block.icons = {comment: structuredClone(original.icons.comment)};
  }
  const matched = new Map(result.matches.map(pair => [pair.candidateId, pair.previousId]));
  const locations = parsed.sourceLocations.map(item => ({...item, sourceBlockId: matched.get(item.sourceBlockId) ?? findNewID(parsed.ir, result.ir, item.sourceBlockId)}));
  const commentsByBlock = new Map();
  for (const comment of parsed.comments) {
    // A trailing comment belongs to the statement before it on the same line;
    // otherwise use the next node, or the nearest previous one at end of file.
    const trailing = locations.filter(item => item.endLine === comment.line && item.endColumn <= comment.column)
      .sort((a, b) => b.endColumn - a.endColumn || b.column - a.column)[0];
    const following = locations.filter(item => item.line >= comment.endLine &&
      (item.line > comment.endLine || item.column >= comment.endColumn))
      .sort((a, b) => a.line - b.line || a.column - b.column)[0];
    const previous = [...locations].sort((a, b) => b.line - a.line || b.column - a.column)[0];
    const target = trailing ?? following ?? previous;
    if (!target || !next.has(target.sourceBlockId)) continue;
    if (!commentsByBlock.has(target.sourceBlockId)) commentsByBlock.set(target.sourceBlockId, []);
    commentsByBlock.get(target.sourceBlockId).push(comment.text);
  }
  for (const [id, comments] of commentsByBlock) {
    const block = next.get(id);
    block.icons = {comment: {...(block.icons?.comment ?? {pinned: false, width: 160, height: 80}), text: comments.join('\n')}};
  }
  const workspace = loadWorkspace(state, {capabilities: snapshot.capabilities, resourceView: snapshot.resourceView});
  try {
    return {state: saveWorkspace(workspace), capabilities: structuredClone(snapshot.capabilities),
      resourceView: structuredClone(snapshot.resourceView), ir: workspaceToIR(workspace,
        {capabilities: snapshot.capabilities, resourceView: snapshot.resourceView, scriptOrder: result.scriptOrder}),
      scriptOrder: result.scriptOrder, sourceLocations: locations, identityMatches: result.matches};
  } finally { workspace.dispose(); }
}
function findNewID(before, after, id) {
  if (!before || typeof before !== 'object') return null;
  if (before.sourceBlockId === id) return after.sourceBlockId;
  for (const key of Object.keys(before)) {
    if (before[key] && typeof before[key] === 'object') {
      const result = findNewID(before[key], after[key], id); if (result) return result;
    }
  }
  return null;
}
