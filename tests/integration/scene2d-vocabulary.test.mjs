import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {localPackCatalog, latestPackVersions, localPackMigrations, localPackCompatibility} from '../../src/packs/catalog.mjs';
import {languageTables, coreLanguageEntries, spriteLanguage02} from '../../src/packs/language-tables.mjs';
import {validateLanguageTables, languageCoverage, offeredCoreStructures} from '../../src/contracts/language-table.mjs';
import {createCapabilities, resolveCapabilities, validateCapabilities, canonicalPackData, migrateCapabilities} from '../../src/contracts/packs.mjs';
import {validateProgram} from '../../src/contracts/program-contract.mjs';
import {authorizeProgram} from '../../src/contracts/pack-broker.mjs';
import {isScene2DLoweringOpcode, e1ReviewedOpcodes} from '../../src/contracts/scene2d-opcodes.mjs';
import {sb3OpcodeDefinitions} from '../../src/contracts/sb3-program.mjs';
import {loadWorkspace, saveWorkspace, workspaceToIR} from '../../src/editor/block-program.mjs';
import {workspaceFromIR} from '../../src/editor/workspace-from-ir.mjs';
import {toScratchProject} from '../../src/adapters/scratch/scratch-project.mjs';
import {generateApi3ProgramSource} from '../../src/generated-program-source.mjs';
import {parseJavaScriptCodeView, pythonCodeViewVocabulary} from '../../src/targets/text/code-view-parser.mjs';
import {pythonCodeViewReader} from '../../src/targets/text/code-view-python.mjs';
import {reconcileCodeViewIdentity} from '../../src/code-view-identity.mjs';
import {availablePackUpdates} from '../../src/project-migration.mjs';
import {createScratchSession} from '../../spikes/scratch-adapter.mjs';
import {vocabularyCases, structureCases, singleBlockWorkspace, singleBlockSource} from '../fixtures/scene2d-vocabulary.mjs';

const v2 = () => createCapabilities(['gg.sprites']);
const v1 = () => createCapabilities(['gg.sprites'], {versions: {'gg.sprites': '0.1.0'}});
const strip = value => JSON.parse(JSON.stringify(value, (key, item) => key === 'sourceBlockId' ? undefined : item));
function irOf(state, capabilities = v2()) {
  const workspace = loadWorkspace(structuredClone(state), {capabilities});
  try { return workspaceToIR(workspace, {capabilities}); } finally { workspace.dispose(); }
}
function roundtrip(ir, capabilities = v2()) {
  const state = workspaceFromIR(ir, {capabilities});
  return {state, ir: irOf(state, capabilities)};
}
const programLines = (ir, language) => generateApi3ProgramSource(ir, language).text.split('\n').slice(1).filter((line, index, lines) => index < lines.length - 1 || line);
const opcodes = project => Object.values(project.targets[1].blocks).map(block => block.opcode);

test('VOC-001: gg.sprites@0.2.0 is a new frozen apiVersion 2 manifest; 0.1.0 keeps its hash', () => {
  const sprites = localPackCatalog.filter(item => item.manifest.id === 'gg.sprites');
  assert.deepEqual(sprites.map(item => [item.manifest.version, item.manifest.apiVersion]), [['0.1.0', 1], ['0.2.0', 2]]);
  assert.equal(sprites[0].sha256, '225d6c992253966ac0645d9e73360c13da853787c0b02ff23c6cc9bdad6072d2');
  for (const item of sprites) assert.equal(createHash('sha256').update(canonicalPackData(item.manifest)).digest('hex'), item.sha256);
  assert.equal(sprites[1].manifest.language, spriteLanguage02);
  assert.equal(languageTables['gg.sprites@0.2.0'], spriteLanguage02);
  assert.deepEqual(languageCoverage(localPackCatalog, {tables: languageTables}), {missing: [], orphan: [], core: []});
  validateLanguageTables({core: coreLanguageEntries, 'gg.sprites@0.2.0': spriteLanguage02, 'gg.score@0.2.0': languageTables['gg.score@0.2.0'], 'gg.assets@0.2.0': languageTables['gg.assets@0.2.0']});
  // 0.2.0 keeps every 0.1.0 block, rule and toolbox block, and only adds.
  const [old, next] = sprites.map(item => item.manifest);
  for (const definition of old.contributions.blocks) assert.deepEqual(next.contributions.blocks.find(block => block.type === definition.type), definition);
  for (const [type, rule] of Object.entries(old.contributions.statements)) assert.deepEqual(next.contributions.statements[type], rule);
  assert.deepEqual(next.contributions.hats, old.contributions.hats);
  assert.deepEqual(next.configSchema, old.configSchema); assert.deepEqual(next.defaults, old.defaults);
  for (const operation of old.permissions.operations) assert.ok(next.permissions.operations.includes(operation));
  for (const entry of languageTables['gg.sprites@0.1.0']) assert.deepEqual(spriteLanguage02.find(item => item.block === entry.block), entry);
});

test('VOC-002: new and activity projects lock 0.2.0, legacy projects keep 0.1.0 and dependants on 0.1.0 are satisfied', () => {
  assert.equal(latestPackVersions['gg.sprites'], '0.2.0');
  assert.equal(resolveCapabilities(null).packs.find(pack => pack.id === 'gg.sprites').version, '0.1.0');
  assert.equal(v2().locks[0].version, '0.2.0');
  for (const ids of [['gg.sprites', 'gg.score'], ['gg.score', 'gg.sprites'], ['gg.score'], ['gg.sprites', 'gg.microbit']]) {
    const locks = createCapabilities(ids).locks;
    assert.equal(locks.find(lock => lock.id === 'gg.sprites').version, ids.includes('gg.sprites') ? '0.2.0' : '0.1.0', ids.join());
  }
  assert.deepEqual(localPackCompatibility, [{id: 'gg.sprites', version: '0.2.0', satisfies: ['0.1.0']}]);
  // Compatibility is one-way: a dependant of 0.2.0 is not satisfied by 0.1.0.
  const sprites02 = localPackCatalog.find(item => item.manifest.id === 'gg.sprites' && item.manifest.version === '0.2.0');
  const dependant = {manifest: {...structuredClone(localPackCatalog.find(item => item.manifest.id === 'gg.score' && item.manifest.version === '0.2.0').manifest), dependencies: [{id: 'gg.sprites', version: '0.2.0'}]}, sha256: 'a'.repeat(64)};
  const catalog = localPackCatalog.filter(item => !(item.manifest.id === 'gg.score')).concat(dependant);
  assert.throws(() => createCapabilities(['gg.sprites', 'gg.score'], {versions: {'gg.sprites': '0.1.0'}, catalog}), /dependencias en conflicto/);
  assert.equal(createCapabilities(['gg.sprites', 'gg.score'], {catalog}).locks.length, 2);
  void sprites02;
});

test('VOC-003: the declared migration takes 0.1.0 to 0.2.0 without block transforms and is offered by «Actualizar packs»', () => {
  assert.ok(localPackMigrations.some(record => record.id === 'gg.sprites' && record.fromVersion === '0.1.0' && record.toVersion === '0.2.0' && !record.blocks));
  const old = createCapabilities(['gg.sprites', 'gg.score'], {versions: {'gg.sprites': '0.1.0'}});
  assert.deepEqual(availablePackUpdates(old), [{id: 'gg.sprites', fromVersion: '0.1.0', toVersion: '0.2.0'}]);
  const migrated = migrateCapabilities(old, {id: 'gg.sprites', toVersion: '0.2.0'});
  assert.deepEqual(migrated.config, old.config);
  assert.equal(migrated.locks.find(lock => lock.id === 'gg.sprites').version, '0.2.0');
  assert.deepEqual(availablePackUpdates(migrated), []);
  assert.deepEqual(availablePackUpdates(null), [], 'legacy projects are updated only through explicit capabilities');
});

test('VOC-004: core structures are offered only by packs that list them (0.2.0), never by 0.1.0 or legacy projects', () => {
  assert.deepEqual([...offeredCoreStructures(resolveCapabilities(v2()).packs)].sort(), ['forever', 'repeatUntil', 'stopScript', 'waitUntil']);
  assert.deepEqual([...offeredCoreStructures(resolveCapabilities(v1()).packs)], []);
  assert.deepEqual([...offeredCoreStructures(resolveCapabilities(null).packs)], []);
  for (const item of structureCases) {
    irOf(item.workspace, v2());
    assert.throws(() => irOf(item.workspace, v1()), /Unsupported block gg_/, item.name);
    assert.throws(() => irOf(item.workspace, null), /Unsupported block gg_/, item.name);
  }
  for (const item of vocabularyCases) {
    irOf(singleBlockWorkspace(item), v2()); // registers the 0.2.0 definitions in this Blockly instance
    assert.throws(() => irOf(singleBlockWorkspace(item), v1()), /Unsupported block gg_/, item.name);
  }
});

for (const item of vocabularyCases) test(`VOC-005: «${item.name}» lowers from its table entry to IR, a reviewed opcode, readable text and back`, () => {
  const capabilities = v2();
  const ir = irOf(singleBlockWorkspace(item), capabilities);
  assert.deepEqual(strip(ir.scripts[0].body), [item.ir]);
  assert.equal(ir.scripts[0].body[0].sourceBlockId, item.block.id);
  const project = toScratchProject(ir).project;
  assert.ok(opcodes(project).includes(item.opcode));
  for (const opcode of opcodes(project)) assert.ok(isScene2DLoweringOpcode(opcode), opcode);
  assert.deepEqual(strip(roundtrip(ir, capabilities).ir), strip(ir));
  assert.deepEqual(roundtrip(ir, capabilities).ir, ir, 'IDs survive IR → Blockly');
  assert.deepEqual(programLines(ir, 'javascript'), ['', 'onStart(() => {', '  ' + item.js, '});']);
  assert.deepEqual(programLines(ir, 'python'), ['', '@on_start', 'def al_iniciar():', '    ' + item.python]);
  const parsed = parseJavaScriptCodeView(singleBlockSource(item, 'javascript'), {capabilities});
  assert.deepEqual(strip(parsed.ir), strip(ir));
  const reconciled = reconcileCodeViewIdentity(ir, parsed.ir, {});
  assert.deepEqual(reconciled.ir, ir, 'unchanged text keeps every block ID');
  const entry = spriteLanguage02.find(candidate => candidate.block === item.block.type);
  assert.equal(entry.lower.ir, item.ir.kind);
  assert.throws(() => parseJavaScriptCodeView(singleBlockSource(item, 'javascript'), {capabilities: v1()}), /no tiene un bloque instalado/);
});

for (const item of structureCases) test(`VOC-006: «${item.name}» is a core structure with text forms, reviewed opcodes and exact roundtrip`, () => {
  const capabilities = v2();
  const ir = irOf(item.workspace, capabilities);
  assert.ok(JSON.stringify(ir).includes(`"kind":"${item.kind}"`));
  for (const opcode of item.opcodes) assert.ok(opcodes(toScratchProject(ir).project).includes(opcode));
  for (const opcode of opcodes(toScratchProject(ir).project)) assert.ok(isScene2DLoweringOpcode(opcode), opcode);
  assert.deepEqual(roundtrip(ir, capabilities).ir, ir);
  assert.deepEqual(programLines(ir, 'javascript'), item.js);
  assert.deepEqual(programLines(ir, 'python'), item.python);
  const parsed = parseJavaScriptCodeView(item.js.join('\n'), {capabilities, variableIds: ir.variables ? {n: 'e1-n'} : {}});
  assert.deepEqual(strip(parsed.ir), strip(ir));
  assert.deepEqual(reconcileCodeViewIdentity(ir, parsed.ir, {}).ir, ir);
  assert.throws(() => parseJavaScriptCodeView(item.js.join('\n'), {capabilities: v1(), variableIds: ir.variables ? {n: 'e1-n'} : {}}), /bloque/);
});

test('VOC-007: Python views of every E1 block and structure read back to the same IR through ast (CPython)', () => {
  const capabilities = v2();
  const programs = [
    ...vocabularyCases.map(item => ({name: item.name, ir: irOf(singleBlockWorkspace(item), capabilities), variableIds: {}})),
    ...structureCases.map(item => ({name: item.name, ir: irOf(item.workspace, capabilities), variableIds: {n: 'e1-n'}}))
  ];
  const sources = programs.map(item => generateApi3ProgramSource(item.ir, 'python').text);
  const run = vocabulary => {
    const script = pythonCodeViewReader + '\nimport sys\npayload=json.loads(sys.stdin.read())\nprint(json.dumps([json.loads(_cv_python_safe(s,json.dumps(payload["vocabulary"]))) for s in payload["sources"]]))\n';
    const output = spawnSync('python3', ['-c', script], {input: JSON.stringify({sources, vocabulary}), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024});
    assert.equal(output.status, 0, output.stderr);
    return JSON.parse(output.stdout);
  };
  const results = run(pythonCodeViewVocabulary({capabilities}));
  programs.forEach((item, index) => {
    assert.equal(results[index].error, undefined, item.name + JSON.stringify(results[index].error));
    const parsed = parseJavaScriptCodeView(results[index].source, {capabilities, variableIds: item.variableIds});
    assert.deepEqual(reconcileCodeViewIdentity(item.ir, parsed.ir, {}).ir, item.ir, item.name);
  });
  // 0.1.0: the Python reader rejects the structures itself, on their own line.
  const old = run(pythonCodeViewVocabulary({capabilities: v1()}));
  structureCases.forEach((item, index) => {
    const result = old[vocabularyCases.length + index];
    if (item.kind === 'repeatUntil' || item.kind === 'forever') assert.match(result.error?.message ?? '', /bucle/, item.name);
  });
});

test('VOC-008: the IR contract bounds every E1 literal, message and terminal block', () => {
  const program = (...body) => ({version: 0, scripts: [{event: 'start', sourceBlockId: 'start', body: body.map((node, index) => ({sourceBlockId: 'n' + index, ...node}))}]});
  for (const [node, message] of [
    [{kind: 'goTo', x: 241, y: 0}, /x outside/], [{kind: 'goTo', x: 0, y: -181}, /y outside/], [{kind: 'setX', x: -241}, /x outside/],
    [{kind: 'glide', seconds: 61, x: 0, y: 0}, /numeric/], [{kind: 'glide', seconds: -1, x: 0, y: 0}, /negative/],
    [{kind: 'turnRight', degrees: 3601}, /degrees/], [{kind: 'pointDirection', direction: -3601}, /direction/],
    [{kind: 'changeX', dx: 481}, /dx/], [{kind: 'setSize', size: -1}, /size/], [{kind: 'changeSize', delta: 1001}, /size change/],
    [{kind: 'say', message: 'x'.repeat(331)}, /message/], [{kind: 'say', message: 'a\nb'}, /message/], [{kind: 'say', message: 3}, /message/],
    [{kind: 'sayFor', message: 'a', seconds: 61}, /numeric/], [{kind: 'show', extra: 1}, /unexpected/],
    [{kind: 'waitUntil', condition: 3}, /expression/], [{kind: 'repeatUntil', condition: {kind: 'compare', operator: 'LE', left: 1, right: 2, sourceBlockId: 'c'}, body: []}, /comparison/]
  ]) assert.throws(() => validateProgram(program(node)), message, JSON.stringify(node));
  for (const kind of ['stopAll', 'stopScript']) assert.throws(() => validateProgram(program({kind}, {kind: 'show'})), /last statement/);
  assert.throws(() => validateProgram(program({kind: 'forever', body: []}, {kind: 'show'})), /last statement/);
  validateProgram(program({kind: 'say', message: ''}, {kind: 'goTo', x: -240, y: 180}, {kind: 'forever', body: [{kind: 'stopScript', sourceBlockId: 'inner'}]}));
  // Nesting counts towards the existing depth limit.
  let body = [{kind: 'show', sourceBlockId: 'deep'}];
  for (let level = 0; level < 9; level++) body = [{kind: 'forever', sourceBlockId: 'f' + level, body}];
  assert.throws(() => validateProgram({version: 0, scripts: [{event: 'start', sourceBlockId: 's', body}]}), /depth/);
  // Permissions: 0.1.0 projects cannot run the new operations even from a crafted IR.
  assert.throws(() => authorizeProgram(v1(), program({kind: 'show'})), /no declarado/);
  authorizeProgram(v2(), program({kind: 'show'}));
});

test('VOC-009: the E1 lowering adds only reviewed core opcodes, kept out of the SB3 import allowlist', () => {
  assert.deepEqual(Object.keys(e1ReviewedOpcodes).sort(), ['control_stop', 'looks_say', 'looks_sayforsecs', 'looks_think', 'looks_thinkforsecs', 'motion_glidesecstoxy', 'motion_ifonedgebounce']);
  for (const opcode of Object.keys(e1ReviewedOpcodes)) assert.equal(Object.hasOwn(sb3OpcodeDefinitions, opcode), false, opcode);
  for (const item of vocabularyCases) assert.ok(Object.hasOwn(sb3OpcodeDefinitions, item.opcode) || Object.hasOwn(e1ReviewedOpcodes, item.opcode), item.opcode);
});

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function runHeadless(ir, ms = 500) {
  const {project} = toScratchProject(ir);
  const blank = project.targets[1].costumes[0];
  project.targets[1].costumes = [blank, {...blank, name: 'alt'}];
  const vm = await createScratchSession(project);
  try {
    vm.greenFlag();
    await delay(ms);
    const hero = vm.runtime.getSpriteTargetByName('hero'), bubble = hero.getCustomState('Scratch.looks');
    const variables = Object.fromEntries(Object.values(hero.variables).map(model => [model.name, Number(model.value)]));
    return {x: hero.x, y: hero.y, direction: hero.direction, size: hero.size, visible: hero.visible, costume: hero.currentCostume,
      bubble: bubble?.text ? {type: bubble.type, text: bubble.text} : null, threads: vm.runtime.threads.length, ...variables};
  } finally { vm.quit(); }
}
test('VOC-010: each E1 block has its Scratch effect in the local VM (renderer-free cases)', async () => {
  for (const item of vocabularyCases.filter(candidate => candidate.effect)) {
    const state = await runHeadless(irOf(singleBlockWorkspace(item)));
    for (const [key, value] of Object.entries(item.effect)) assert.deepEqual(state[key], value, `${item.name}: ${key}`);
  }
  for (const item of structureCases) {
    const state = await runHeadless(irOf(item.workspace), 600);
    for (const [key, value] of Object.entries(item.effect)) {
      if (key === 'minimumX') assert.ok(state.x >= value, `${item.name}: x=${state.x}`);
      else assert.equal(state[key], value, `${item.name}: ${key}`);
    }
  }
  // «detener todo» stops every script, including the others.
  const stopAll = {version: 0, scripts: [
    {event: 'start', sourceBlockId: 'a', body: [{kind: 'forever', sourceBlockId: 'loop', body: [{kind: 'changeX', dx: 1, sourceBlockId: 'step'}]}]},
    {event: 'start', sourceBlockId: 'b', body: [{kind: 'wait', seconds: 0.1, sourceBlockId: 'w'}, {kind: 'stopAll', sourceBlockId: 'stop'}]}]};
  const stopped = await runHeadless(stopAll, 500);
  assert.equal(stopped.threads, 0);
  // Without a renderer nothing requests a redraw, so the loop runs many times per frame (Scratch semantics).
  assert.ok(stopped.x > 0, 'forever ran before «detener todo»');
});

test('VOC-011: editing one E1 value in the JavaScript view keeps every other block, shadow, comment and position', async () => {
  const {captureCodeViewSnapshot, generateCodeViewSource, prepareCodeViewCandidate} = await import('../../src/editor/code-view-conversion.mjs');
  const capabilities = v2();
  const chain = blocks => blocks.reduceRight((next, block) => next ? {...structuredClone(block), next: {block: next}} : structuredClone(block), null);
  const forever = structureCases.find(item => item.kind === 'forever').workspace.blocks.blocks[0].inputs.DO.block;
  const body = chain([...vocabularyCases.filter(item => item.ir.kind !== 'stopAll').map(item => item.block), forever]);
  body.icons = {comment: {text: 'Presentación', pinned: false, width: 160, height: 80}};
  const state = {blocks: {languageVersion: 0, blocks: [{type: 'gg_when_start', id: 'hero-start', x: 40, y: 60, inputs: {DO: {block: body}}}]}};
  const snapshot = captureCodeViewSnapshot(state, {capabilities});
  const generated = generateCodeViewSource(snapshot, 'javascript');
  assert.match(generated.text, /\/\/ Presentación/);
  const edited = generated.text.replace('hero.goTo(30, -20);', 'hero.goTo(31, -20);').replace('hero.say("¡Hola!");', 'hero.say("¡Buenas!");');
  assert.notEqual(edited, generated.text);
  const parsed = parseJavaScriptCodeView(edited, {capabilities, variableIds: generated.variableIds, variableNames: generated.variableNames});
  const candidate = prepareCodeViewCandidate(snapshot, parsed);
  const ids = value => { const out = []; const visit = block => { if (!block) return; out.push(block.id); for (const input of Object.values(block.inputs ?? {})) { visit(input.shadow); visit(input.block); } visit(block.next?.block); }; value.blocks.blocks.forEach(visit); return out.sort(); };
  assert.deepEqual(ids(candidate.state), ids(snapshot.state));
  const workspace = loadWorkspace(candidate.state, {capabilities});
  try {
    assert.equal(workspace.getBlockById('go-to-x').getFieldValue('NUM'), 31);
    assert.equal(workspace.getBlockById('say').getFieldValue('MESSAGE'), '¡Buenas!');
    assert.equal(workspace.getBlockById(vocabularyCases[0].block.id).getCommentText(), 'Presentación');
    assert.deepEqual({...workspace.getBlockById('hero-start').getRelativeToSurfaceXY()}, {x: 40, y: 60});
  } finally { workspace.dispose(); }
});
