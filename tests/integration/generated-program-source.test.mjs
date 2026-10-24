import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {parse} from 'acorn';
import {generateProgramSource} from '../../src/generated-program-source.mjs';
import {loadWorkspace, workspaceToIR} from '../../src/editor/block-program.mjs';
import {corpus, editableExample} from '../fixtures/corpus.blocks.mjs';

function irOf(state) {
  const workspace = loadWorkspace(state);
  try { return workspaceToIR(workspace); } finally { workspace.dispose(); }
}
function sourceIds(value, ids = []) {
  if (!value || typeof value !== 'object') return ids;
  if (value.sourceBlockId) ids.push(value.sourceBlockId);
  for (const child of Object.values(value)) if (typeof child === 'object') sourceIds(child, ids);
  return ids;
}
const repeat = JSON.parse(readFileSync(new URL('../fixtures/repeat-move.blocks.json', import.meta.url)));
const fixtures = {repeat, editableExample, ...corpus};
const empty = () => ({version: 0, scripts: []});
function pythonCompile(source, extra = '') {
  const script = 'import ast, sys, json\nsource = sys.stdin.read()\ncompile(source, "generated.py", "exec", flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)\n' + extra;
  const result = spawnSync('python3', ['-c', script], {input: source, encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return result.stdout;
}

test('GG-COPY-001: both pure generators preserve complete corpus IDs, authoring and deterministic source', () => {
  for (const [name, state] of Object.entries(fixtures)) {
    const ir = irOf(state);
    const before = structuredClone(ir);
    for (const language of ['javascript', 'python']) {
      const generated = generateProgramSource(ir, language);
      assert.deepEqual(generateProgramSource(ir, language), generated, `${name}/${language}`);
      assert.deepEqual(ir, before);
      assert.equal(generated.sourceMap.length, generated.text.split('\n').length);
      assert.deepEqual(new Set(generated.sourceMap.flat()), new Set(sourceIds(ir)), `${name}/${language}`);
      assert.ok(new TextEncoder().encode(generated.text).length <= 65536);
      assert.doesNotMatch(generated.text, /\bimport\b|GG\.runIR|eval\(|new Function/);
      if (language === 'javascript') parse(generated.text, {ecmaVersion: 2022, sourceType: 'module'});
      else pythonCompile(generated.text);
    }
  }
});

test('GG-COPY-002: source uses native functions/loops/branches and atomic contextual references', () => {
  for (const language of ['javascript', 'python']) {
    const {text, sourceMap} = generateProgramSource(irOf(corpus.variables), language);
    assert.match(text, /GG\.program\.configure\(/);
    assert.match(text, /await ctx\.setVariable\("gg-score", 0\)/);
    assert.match(text, /await ctx\.changeVariable\("gg-score", 1\)/);
    assert.match(text, /await ctx\.compare\("LT", GG\.ref\("gg-score"\), 2\)/);
    assert.match(text, /await ctx\.move\(GG\.ref\("gg-score"\)\)/);
    assert.doesNotMatch(text, /GG\.variables\.get|GG\.variables\.set|\bscore\s*=/);
    assert.deepEqual(sourceMap[text.split('\n').findIndex(line => line.includes('ctx.compare("LT"'))],
      ['branch-loop', 'branch-loop-compare', 'branch-loop-read']);
    assert.deepEqual(sourceMap[text.split('\n').findIndex(line => line.includes('ctx.move(GG.ref'))],
      ['move-score', 'move-score-read']);
    assert.match(text, language === 'javascript' ? /async function gg_handler_0\(ctx\)/ : /async def gg_handler_0\(ctx\):/);
    assert.match(text, language === 'javascript' ? /for \(let gg_repeat_0 = 0;/ : /for gg_repeat_0 in range\(3\):/);
    assert.match(text, /GG\.events\.onStart\(gg_handler_0\)/);
    assert.match(text, /GG\.events\.onKey\("space", gg_handler_1\)/);
    assert.match(text, /await GG\.events\.run\(\)/);
  }
});

test('GG-COPY-002: every hat registers once in IR order after handler definitions', () => {
  const ir = {version: 0, scripts: [
    {event: 'start', sourceBlockId: 'hat-start', body: []},
    {event: 'key', key: 'space', sourceBlockId: 'hat-key', body: []},
    {event: 'click', sourceBlockId: 'hat-click', body: []},
    {event: 'message', message: 'go', sourceBlockId: 'hat-message', body: []},
    {event: 'clone', sourceBlockId: 'hat-clone', body: []}
  ]};
  for (const language of ['javascript', 'python']) {
    const {text, sourceMap} = generateProgramSource(ir, language);
    const lines = text.split('\n');
    const registrations = lines.filter(line => line.startsWith('GG.events.on'));
    assert.deepEqual(registrations.map(line => line.replace(/;$/, '')), [
      'GG.events.onStart(gg_handler_0)', 'GG.events.onKey("space", gg_handler_1)',
      'GG.events.onClick("hero", gg_handler_2)', 'GG.events.onMessage("go", gg_handler_3)',
      'GG.events.onClone("hero", gg_handler_4)'
    ]);
    for (const [index, registration] of registrations.entries()) assert.deepEqual(sourceMap[lines.indexOf(registration)], [ir.scripts[index].sourceBlockId]);
    assert.ok(text.indexOf('gg_handler_4(ctx)') < text.indexOf('GG.events.onStart'));
    if (language === 'python') { assert.equal(lines.filter(line => line.trim() === 'pass').length, 5); pythonCompile(text); }
  }
});

test('GG-COPY-002: waits, messages, clone termination, audio and costumes use the agreed contextual API', () => {
  for (const language of ['javascript', 'python']) {
    const clone = generateProgramSource(irOf(corpus.clones), language).text;
    assert.match(clone, /await ctx\.createClone\(\)/);
    assert.match(clone, language === 'python' ? /if await ctx\.deleteClone\(\):\n    return/ : /if \(await ctx\.deleteClone\(\)\) return;/);
    assert.match(clone, /await ctx\.wait\(0\.8\)/);
    assert.match(generateProgramSource(irOf(corpus.messages), language).text, /await ctx\.broadcastAndWait\("go"\)/);
    const audio = generateProgramSource(irOf(corpus.audio), language);
    assert.match(audio.text, language === 'python' ? /ctx\.playSound\("tone", True\)/ : /ctx\.playSound\("tone", true\)/);
    assert.deepEqual(audio.requirements, {apiVersion: 1, resources: {audio: ['tone'], costumes: ['hero']}});
    const stopped = generateProgramSource(irOf(corpus.audioStop), language).text;
    assert.match(stopped, language === 'python' ? /ctx\.playSound\("tone", False\)/ : /ctx\.playSound\("tone", false\)/);
    assert.match(stopped, /await ctx\.stopSounds\(\)/);
    const costumes = generateProgramSource(irOf(corpus.costumes), language);
    assert.match(costumes.text, /await ctx\.setCostume\("hero-alt"\)/);
    assert.deepEqual(costumes.requirements.resources.costumes, ['hero', 'hero-alt']);
  }
});

test('GG-COPY-001: copied source contains exact variable declarations and safe strings, with names kept as data', () => {
  const id = 'id"\\\n\u2028';
  const name = 'class"\n<svg>\u0085\u2029\ud800';
  const message = 'go"\nGG.events.run()\u2028';
  const ir = {version: 0, variables: [{id, name, initialValue: 42}, {id: 'global-id', name: 'for', initialValue: -3, scope: 'global'}], scripts: [
    {event: 'message', message, sourceBlockId: 'hat', body: [
      {kind: 'setVariable', variableId: id, name, value: 4, sourceBlockId: 'set'}
    ]}
  ]};
  const javascript = generateProgramSource(ir, 'javascript');
  const ast = parse(javascript.text, {ecmaVersion: 2022, sourceType: 'module'});
  const declarations = ast.body[0].expression.arguments[0].properties[0].value.elements.map(element =>
    Object.fromEntries(element.properties.map(property => [property.key.value, property.value.type === 'UnaryExpression' ? -property.value.argument.value : property.value.value])));
  assert.deepEqual(declarations, [{id, name, scope: 'local', initialValue: 42}, {id: 'global-id', name: 'for', scope: 'global', initialValue: -3}]);
  const python = generateProgramSource(ir, 'python');
  const recovered = JSON.parse(pythonCompile(python.text,
    'tree = ast.parse(source)\nprint(json.dumps(ast.literal_eval(tree.body[0].value.args[0])))\n'));
  assert.deepEqual(recovered.variables, declarations);
  assert.ok(!javascript.text.includes('\u2028') && !javascript.text.includes('\u2029'));
  assert.ok(!python.text.includes('\u2028') && !python.text.includes('\u2029') && !python.text.includes('\u0085'));
  for (const listing of [javascript, python]) {
    assert.equal(listing.text.split('\n').filter(line => line.includes('onMessage(')).length, 1);
    assert.deepEqual(listing.sourceMap.flat().filter(value => value === 'set'), ['set']);
  }
});

test('GG-COPY-002: empty Python suites compile and nested loops have unique deterministic identifiers', () => {
  const ir = {version: 0, scripts: [{event: 'start', sourceBlockId: 'start', body: [
    {kind: 'repeat', count: 0, sourceBlockId: 'outer', body: [
      {kind: 'repeat', count: 1, sourceBlockId: 'inner', body: []}
    ]},
    {kind: 'if', sourceBlockId: 'if', condition: {kind: 'compare', operator: 'EQ', left: 1, right: 2, sourceBlockId: 'compare'}, body: [], elseBody: []}
  ]}]};
  for (const language of ['javascript', 'python']) {
    const source = generateProgramSource(ir, language).text;
    assert.match(source, /gg_repeat_0/); assert.match(source, /gg_repeat_1/);
    if (language === 'python') { assert.match(source, /for gg_repeat_1 in range\(1\):\n      pass/); pythonCompile(source); }
    else parse(source, {ecmaVersion: 2022, sourceType: 'module'});
  }
});

test('GG-COPY-001/002: invalid IR/language and expanded UTF-8 output fail without mutating inputs', () => {
  assert.throws(() => generateProgramSource(empty(), 'typescript'), /Unsupported generated language/);
  const invalid = {version: 0, scripts: [{event: 'start', sourceBlockId: 'start', body: [{kind: 'unknown', sourceBlockId: 'bad'}]}]};
  const before = structuredClone(invalid);
  assert.throws(() => generateProgramSource(invalid, 'javascript'), error => error.sourceBlockId === 'bad');
  assert.deepEqual(invalid, before);
  const expanded = {version: 0, scripts: [{event: 'start', sourceBlockId: 'hat', body:
    Array.from({length: 170}, (_, index) => ({kind: 'broadcastWait', message: 'x' + '\u2028'.repeat(63), sourceBlockId: `n${index}`}))
  }]};
  assert.ok(new TextEncoder().encode(JSON.stringify(expanded)).length < 65536);
  for (const language of ['javascript', 'python']) assert.throws(() => generateProgramSource(expanded, language), /exceeds 65536 UTF-8 bytes/);
  const allowed = {version: 0, variables: [{id: 'v', name: 'v', initialValue: 1000000}], scripts: [{event: 'start', sourceBlockId: 'hat', body: [
    {kind: 'move', sourceBlockId: 'move', steps: {kind: 'variable', sourceBlockId: 'ref', variableId: 'v', name: 'v'}}
  ]}]};
  const source = generateProgramSource(allowed, 'javascript').text;
  assert.match(source, /Dominio contextual: números finitos entre -1e12 y 1e12/);
  assert.match(source, /ctx\.move\(GG\.ref\("v"\)\)/);
});

test('GG-COPY-002: key identifiers require strings before generation with original source attribution', () => {
  const ir = {version:0,scripts:[{event:'key',key:1,sourceBlockId:'numeric-key',body:[]}]};
  const before=structuredClone(ir);
  for (const language of ['javascript','python']) assert.throws(()=>generateProgramSource(ir,language),error=>error.sourceBlockId==='numeric-key');
  assert.deepEqual(ir,before);
});
