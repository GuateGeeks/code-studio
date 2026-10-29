import test from 'node:test';
import assert from 'node:assert/strict';
import {parseJavaScriptCodeView} from '../../src/targets/text/code-view-parser.mjs';
import {reconcileCodeViewIdentity} from '../../src/code-view-identity.mjs';
import {workspaceFromIR} from '../../src/editor/workspace-from-ir.mjs';
import {loadWorkspace, workspaceToIR} from '../../src/editor/block-program.mjs';
import {codeViewMutationCases} from '../fixtures/code-view-mutations.mjs';
import {localPackCatalog} from '../../src/packs/catalog.mjs';
import {createCapabilities} from '../../src/contracts/packs.mjs';
import {languageTables} from '../../src/packs/language-tables.mjs';

const strip = ir => JSON.parse(JSON.stringify(ir, (key, value) => key === 'sourceBlockId' ? undefined : value));
test('CV-JS-001: generic parser independently parses all 491 property cases and rejects only the two unrepresentable globals', () => {
  let accepted = 0, rejected = 0;
  for (const item of codeViewMutationCases()) {
    const unsupportedGlobal = (item.expected.variables ?? []).some(v => v.scope === 'global') && ['delete', 'replace-type'].includes(item.kind) &&
      !JSON.stringify(item.expected.scripts).includes('"kind":"setVariable","variableId":"gg-global-score"');
    let parsed;
    try { parsed = parseJavaScriptCodeView(item.source, {variableIds: item.metadata.variableIds}); }
    catch (error) {
      assert.ok(unsupportedGlobal, item.name + ': ' + error.message);
      assert.match(error.message, /shared.*asignación global/); assert.ok(error.lineNumber > 0);
      rejected++; continue;
    }
    assert.deepEqual(strip(parsed.ir), strip(item.expected), item.name);
    const result = reconcileCodeViewIdentity(item.previous, parsed.ir, item.sidecar);
    const workspace = loadWorkspace(workspaceFromIR(result.ir, result));
    try { assert.deepEqual(strip(workspaceToIR(workspace)), strip(item.expected), item.name); }
    finally { workspace.dispose(); }
    accepted++;
  }
  assert.equal(accepted, 489); assert.equal(rejected, 2);
});
test('CV-JS-002: spacing, semicolon-free source, multiple declarations and callback forms have the same blockable meaning', () => {
  const source = 'let steps=0, n=0\nonStart(function () { steps=12; n++; for(let counter=0;counter<3;counter++){if(n>0)hero.move(steps);else wait(.5)} })';
  const {ir, sourceLocations} = parseJavaScriptCodeView(source);
  assert.equal(ir.scripts[0].body[0].value, 12);
  assert.equal(ir.scripts[0].body[1].value, 1);
  assert.equal(ir.scripts[0].body[2].body[0].body[0].steps.kind, 'variable');
  assert.equal(ir.variables.length, 2);
  assert.ok(sourceLocations.every(location => location.line >= 1 && location.column >= 1));
  const workspace = loadWorkspace(workspaceFromIR(ir));
  try { assert.deepEqual(strip(workspaceToIR(workspace)), strip(ir)); }
  finally { workspace.dispose(); }
});
test('CV-JS-003: every unsupported construction reports a cause and its actual line without executing it', () => {
  const inside = [
    ['while(true){}', /bucle/], ['do {} while(false)', /bucle/], ['for (const item of []) {}', /bucle/],
    ['function custom() {}', /funciones propias/], ['forever(()=>{})', /no tiene un bloque/],
    ['hero.move(1+2)', /literal/], ['hero.move(score * 2)', /literal/], ['hero.move(...[])', /literal/],
    ['globalThis.__viewParserExecuted = true', /variables numéricas declaradas/], ['eval("x")', /no tiene un bloque/],
    ['hero["move"](2)', /dinámica/], ['if(1===1)hero.move(1)', /==, < o >/],
    ['return 2', /ReturnStatement/], ['let local=0', /VariableDeclaration/],
    ['for(let i=1;i<3;i++)hero.move(1)', /repetición/], ['onStart(()=>{})', /no tiene un bloque/],
    ['hero.move(481)', /límites/], ['wait(61)', /límites/], ['hero.setCostume("missing")', /Elige/],
    ['broadcastAndWait(" padded ")', /espacios/], ['playSound("missing")', /Elige/],
    ['try {} catch(error) {}', /TryStatement/], ['hero.move(1n)', /literal/]
  ];
  for (const [statement, message] of inside) {
    assert.throws(() => parseJavaScriptCodeView('// title\nonStart(()=>{\n  ' + statement + '\n})'),
      error => error.lineNumber === 3 && error.columnNumber >= 1 && message.test(error.message), statement);
  }
  assert.equal(globalThis.__viewParserExecuted, undefined);
  for (const [source, line, message] of [
    ['\nfunction custom() {}', 2, /funciones propias/], ['\nconst value=0', 2, /let/],
    ['\nlet hero=0', 2, /reservadas/], ['\nlet score=1', 2, /inician.*0/],
    ['\nonStart(async()=>{})', 2, /async/], ['\nonStart((x)=>{})', 2, /parámetros/],
    ['\nonKey("Escape",()=>{})', 2, /tecla/], ['\nonStart(()=>{', 2, /sintaxis/]
  ]) assert.throws(() => parseJavaScriptCodeView(source), error => error.lineNumber === line && message.test(error.message), source);
});
test('CV-JS-004: source, node and depth limits reject with located diagnostics', () => {
  assert.throws(() => parseJavaScriptCodeView(' '.repeat(65537)), error => error.code === 'CV_SOURCE_LIMIT' && error.lineNumber === 1);
  assert.throws(() => parseJavaScriptCodeView('onStart(()=>{\n' + 'stopSounds();\n'.repeat(301) + '})'),
    error => error.code === 'CV_NODE_LIMIT' && error.lineNumber > 1);
  assert.throws(() => parseJavaScriptCodeView('onStart(()=>{' + 'for(let i=0;i<1;i++){'.repeat(9) + 'hero.move(1);' + '}'.repeat(9) + '})'),
    error => error.code === 'CV_DEPTH_LIMIT');
});
test('CV-JS-005: changing a reviewed table changes the callable spelling without a parser edit', () => {
  const catalog = structuredClone(localPackCatalog);
  const sprites = catalog.find(item => item.manifest.id === 'gg.sprites');
  sprites.manifest.apiVersion = 2;
  sprites.manifest.language = structuredClone(languageTables['gg.sprites@0.1.0']);
  const entry = sprites.manifest.language.find(item => item.block === 'gg_move');
  entry.js = 'advance'; entry.python = 'advance';
  // The modified table is the 0.1.0 manifest's; 0.2.0 (latest) keeps its own frozen table.
  const capabilities = createCapabilities(['gg.sprites'], {catalog, versions: {'gg.sprites': '0.1.0'}});
  const result = parseJavaScriptCodeView('onStart(()=>{hero.advance(23)})', {capabilities, catalog});
  assert.equal(result.ir.scripts[0].body[0].steps, 23);
  assert.throws(() => parseJavaScriptCodeView('onStart(()=>{hero.move(23)})', {capabilities, catalog}), /no tiene un bloque/);
});
test('CV-JS-006: comments and source locations travel outside the IR; obsolete line maps are not needed', () => {
  const {ir, comments, sourceLocations} = parseJavaScriptCodeView('// evento\nonStart(()=>{\n// avanzar\nhero.move(25); // pasos\n})');
  assert.deepEqual(comments.map(comment => [comment.text, comment.line]), [['evento', 1], ['avanzar', 3], ['pasos', 4]]);
  assert.equal(ir.scripts[0].body[0].steps, 25);
  assert.equal(sourceLocations.find(item => item.sourceBlockId === ir.scripts[0].body[0].sourceBlockId).line, 4);
  assert.ok(!JSON.stringify(ir).includes('coment'));
});
test('CV-JS-007: variable metadata, scope, missing values and nonliteral mutations cannot silently alter semantics', () => {
  for (const metadata of [null, [], {score: ''}, {score: 2}])
    assert.throws(() => parseJavaScriptCodeView('', {variableIds: metadata}), error => error.code === 'CV_METADATA');
  assert.throws(() => parseJavaScriptCodeView('let score=0; onStart(()=>{score -= score})'), /Restar una variable/);
  assert.throws(() => parseJavaScriptCodeView('let score=shared(0); onStart(()=>{score += 1})'), /asignación global/);
  const variables = parseJavaScriptCodeView('let puntos=0; onStart(()=>{puntos=2; hero.move(puntos)})',
    {variableIds: {puntos: 'stable-var'}, variableNames: {puntos: 'Puntos del alumno'}}).ir.variables;
  assert.deepEqual(variables, [{id: 'stable-var', name: 'Puntos del alumno', initialValue: 0}]);
});

test('CV-JS-008: absent initializers keep their source line and new variable IDs avoid metadata collisions', () => {
  assert.throws(() => parseJavaScriptCodeView('// title\nlet n'), error => error.lineNumber === 2 && /inicial/.test(error.message));
  assert.throws(() => parseJavaScriptCodeView('// title\nonStart(()=>{for(let i; i<2; i++){}})'), error => error.lineNumber === 2 && /repetición/.test(error.message));
  const {ir} = parseJavaScriptCodeView('let x=0,y=0; onStart(()=>{x=1;y=2})', {variableIds: {x: 'cv-variable-1'}});
  assert.equal(new Set(ir.variables.map(v => v.id)).size, 2);
});
