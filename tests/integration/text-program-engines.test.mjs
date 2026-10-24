import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createCapabilities} from '../../src/contracts/packs.mjs';
import {authorizeProjectOperation} from '../../src/contracts/pack-broker.mjs';
import {createQuickJSEngine} from '../../src/targets/text/quickjs-engine.mjs';
import {contextOperations} from '../../src/targets/text/program-session.mjs';
import {validateTextProgramRPC, validateTextInvocation, textProgramLimits} from '../../src/contracts/text-program.mjs';
import {validateLanguageRPC, languageDiagnostic, languageRuntimeLimits} from '../../src/contracts/language-runtime.mjs';

const require = createRequire(import.meta.url);
const wasmLocation = require.resolve('@jitl/quickjs-wasmfile-release-sync/wasm');
const documentId = 'text-12345678-1234-4234-8234-123456789abc';
const document = source => ({id: documentId, name: 'Programa de prueba', language: 'javascript', source,
  runtime: {engine: 'quickjs', version: '0.32.0'}});
function deferred() { let resolve; let reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return {promise, resolve, reject}; }
async function until(predicate) {
  const deadline = Date.now() + 2000;
  while (!predicate()) {
    if (Date.now() > deadline) assert.fail('El motor no alcanzó el estado esperado.');
    await new Promise(resolve => setTimeout(resolve, 1));
  }
}
async function harness(t, source, {holdWaits = false,policy = null} = {}) {
  const calls = [];
  const logs = [];
  const waits = new Map();
  const waitReplies = [];
  const ready = deferred();
  let program = null;
  let execution = null;
  let settled = false;
  const engine = await createQuickJSEngine({wasmLocation,
    onDiagnostic: record => logs.push(record), onProgramReady: ready.resolve,
    rpc: async (method, args) => {
      let call = method.startsWith('program.') ? validateTextProgramRPC(method, args) : validateLanguageRPC(method, args);
      if(policy)call=authorizeProjectOperation(policy.capabilities,method,args,{variables:program?.variables??[],resourceView:policy.resourceView});
      calls.push(call);
      if (method === 'program.start') { program = call.args[0]; return {started: true}; }
      if (method === 'program.wait' && holdWaits) {
        const pending = deferred(); waits.set(args[0], pending); waitReplies.push(pending); return pending.promise;
      }
      if (method === 'program.compare') return true;
      if (method === 'program.deleteClone') return false;
      if (method === 'scene.get') return {sprites: [], variables: []};
      return {accepted: true};
    }
  });
  t.after(async () => {
    engine.dispose();
    for (const wait of waitReplies) wait.resolve(null);
    if (execution) await execution.catch(() => {});
  });
  await engine.prepare(document(source));
  function execute() {
    execution = engine.execute();
    execution.then(() => { settled = true; }, () => { settled = true; });
    return execution;
  }
  function invoke(invocationId, handlerId = 'handler-0', targetId = 'hero') {
    return engine.invoke(validateTextInvocation({invocationId, handlerId, targetId, revision: 3}));
  }
  return {engine, calls, logs, waits, waitReplies, ready, execute, invoke, program: () => program, settled: () => settled};
}

test('GG-TEXT-PROGRAM-001: QuickJS preflight has no registration effects and source declarations reach program.start only on Run', {timeout: 5000}, async t => {
  const run = await harness(t, `GG.program.configure({variables:[{id:"shared",name:"globalScore",scope:"global",initialValue:10},{id:"local",name:"localScore",initialValue:3}]});
GG.events.onStart(async ctx => { await ctx.move(GG.ref("local")); });
GG.events.onKey("space", async ctx => {});
GG.events.onClick("hero", async ctx => {});
GG.events.onMessage("go", async ctx => {});
GG.events.onClone("hero", async ctx => {});
await GG.events.run();`);
  assert.deepEqual(run.calls, []);
  assert.deepEqual(run.logs, []);
  assert.equal(run.program(), null);
  const execution = run.execute();
  await run.ready.promise;
  assert.deepEqual(run.program(), {variables: [
    {id: 'shared', name: 'globalScore', scope: 'global', initialValue: 10},
    {id: 'local', name: 'localScore', initialValue: 3, scope: 'local'}
  ], handlers: [
    {id: 'handler-0', event: 'start'}, {id: 'handler-1', event: 'key', key: 'space'},
    {id: 'handler-2', event: 'click'}, {id: 'handler-3', event: 'message', message: 'go'}, {id: 'handler-4', event: 'clone'}
  ]});
  assert.equal(run.calls.length, 1);
  assert.equal(run.settled(), false);
  assert.deepEqual(await run.invoke('invoke-start'), {completed: true});
  assert.deepEqual(run.calls[1], {method: 'program.move', args: ['invoke-start', {variableId: 'local'}]});
  assert.equal(run.settled(), false);
  run.engine.dispose();
  await assert.rejects(execution, /Session stopped/);
});

test('GG-TEXT-PROGRAM-001/002: two concurrent QuickJS callbacks retain target and token across interleaved awaits', {timeout: 5000}, async t => {
  const run = await harness(t, `GG.events.onStart(async ctx => {
console.log("begin:" + ctx.targetId);
await ctx.wait(1);
await ctx.move(7);
await ctx.changeVariable("shared", GG.ref("local"));
console.log("end:" + ctx.targetId);
});
await GG.events.run();`, {holdWaits: true});
  run.execute(); await run.ready.promise;
  const original = run.invoke('invoke-original', 'handler-0', 'hero');
  const clone = run.invoke('invoke-clone', 'handler-0', 'clone-1');
  await until(() => run.waits.size === 2);
  assert.deepEqual(run.logs.map(record => record.message), ['begin:hero', 'begin:clone-1']);
  run.waits.get('invoke-clone').resolve(null);
  assert.deepEqual(await clone, {completed: true});
  assert.deepEqual(run.calls.filter(call => call.method === 'program.move'), [{method: 'program.move', args: ['invoke-clone', 7]}]);
  assert.equal(run.logs.at(-1).message, 'end:clone-1');
  run.waits.get('invoke-original').resolve(null);
  assert.deepEqual(await original, {completed: true});
  assert.deepEqual(run.calls.filter(call => call.method === 'program.changeVariable'), [
    {method: 'program.changeVariable', args: ['invoke-clone', 'shared', {variableId: 'local'}]},
    {method: 'program.changeVariable', args: ['invoke-original', 'shared', {variableId: 'local'}]}
  ]);
  assert.equal(run.logs.at(-1).message, 'end:hero');
});

test('GG-TEXT-PROGRAM-002: cancelled callbacks cannot use retained ctx operations or legacy mutations after an awaited reply', {timeout: 5000}, async t => {
  const operations = {
    move: [1], wait: [0], setVariable: ['score', 1], changeVariable: ['score', 1], compare: ['EQ', 1, 1],
    broadcastAndWait: ['go'], createClone: [], deleteClone: [], playSound: ['tone', false], stopSounds: [], setCostume: ['hero-alt']
  };
  assert.deepEqual(Object.keys(operations), Object.keys(contextOperations));
  const run = await harness(t, `GG.events.onStart(async ctx => {
await ctx.wait(1);
for (const [name,args] of ${JSON.stringify(Object.entries(operations))}) {
try { await ctx[name](...args); console.log("UNEXPECTED:" + name); }
catch (error) { console.log("cancelled:" + name); }
}
for (const action of [() => GG.sprite.move("hero",1), () => GG.sprite.setPosition("hero",{x:1,y:1}), () => GG.variables.set("score",1), () => GG.events.emit("go")]) {
try { await action(); console.log("UNEXPECTED:legacy"); }
catch (error) { console.log("revoked:legacy"); }
}
console.log("finished");
});
await GG.events.run();`, {holdWaits: true});
  run.execute(); await run.ready.promise;
  const invocation = run.invoke('invoke-cancel');
  await until(() => run.waits.has('invoke-cancel'));
  run.engine.cancelInvocation('invoke-cancel');
  assert.deepEqual(await invocation, {cancelled: true});
  const before = structuredClone(run.calls);
  run.waits.get('invoke-cancel').resolve(null);
  await until(() => run.logs.some(record => record.message === 'finished'));
  assert.deepEqual(run.calls, before);
  assert.deepEqual(run.logs.filter(record => record.message.startsWith('cancelled:')).map(record => record.message.slice(10)), Object.keys(operations));
  assert.equal(run.logs.filter(record => record.message === 'revoked:legacy').length, 4);
  assert.equal(run.logs.some(record => record.message.startsWith('UNEXPECTED')), false);
});

test('GG-TEXT-PROGRAM-002: callback errors retain document line two and both error/return paths revoke their context', {timeout: 5000}, async t => {
  const source = `GG.events.onStart(async ctx => {
throw new Error("fallo callback");
});
let held;
GG.events.onMessage("hold", async ctx => { held = ctx; await ctx.move(2); return; });
GG.events.onMessage("late", async ctx => {
try { await held.move(99); console.log("UNEXPECTED:retained"); }
catch (error) { console.log("retained context revoked"); }
await ctx.move(3);
});
await GG.events.run();`;
  const run = await harness(t, source);
  run.execute(); await run.ready.promise;
  await assert.rejects(run.invoke('invoke-error'), error => {
    const record = languageDiagnostic(error, document(source));
    assert.equal(record.message, 'fallo callback');
    assert.equal(record.sourceLocation.line, 2);
    return true;
  });
  // Reusing the same finished token proves the engine removed its active entry.
  await assert.rejects(run.invoke('invoke-error'), /fallo callback/);
  assert.deepEqual(await run.invoke('invoke-hold', 'handler-1'), {completed: true});
  assert.deepEqual(await run.invoke('invoke-late', 'handler-2'), {completed: true});
  assert.ok(run.logs.some(record => record.message === 'retained context revoked'));
  assert.deepEqual(run.calls.filter(call => call.method === 'program.move').map(call => call.args), [['invoke-hold', 2], ['invoke-late', 3]]);
});

test('GG-TEXT-PROGRAM-001: QuickJS registration enforces sixteen handlers before dispatching program.start', {timeout: 5000}, async t => {
  const run = await harness(t, `for (let i=0;i<${textProgramLimits.handlers + 1};i++) GG.events.onStart(async ctx => {});
await GG.events.run();`);
  await assert.rejects(run.execute(), /handler limit/);
  assert.deepEqual(run.calls, []);
});

test('GG-TEXT-PROGRAM-001/002: invocation quota and duplicate/unknown handlers fail without losing active callbacks', {timeout: 5000}, async t => {
  const run = await harness(t, 'GG.events.onStart(async ctx => { await new Promise(() => {}); });\nawait GG.events.run();');
  run.execute(); await run.ready.promise;
  const invocations = Array.from({length: textProgramLimits.invocations}, (_, index) => run.invoke(`invoke-${index}`));
  await assert.rejects(run.invoke('invoke-overflow'), /cupo agotado/);
  await assert.rejects(run.invoke('invoke-0'), /cupo agotado/);
  run.engine.cancelInvocation('invoke-0');
  assert.deepEqual(await invocations[0], {cancelled: true});
  await assert.rejects(run.invoke('invoke-unknown', 'missing-handler'), /Handler de texto desconocido/);
  const replacement = run.invoke('invoke-replacement');
  for (let index = 1; index < textProgramLimits.invocations; index++) run.engine.cancelInvocation(`invoke-${index}`);
  run.engine.cancelInvocation('invoke-replacement');
  for (const result of await Promise.all([...invocations, replacement])) assert.deepEqual(result, {cancelled: true});
  assert.deepEqual(run.calls.map(call => call.method), ['program.start']);
});

test('GG-TEXT-PROGRAM-001: contextual bindings respect contract arities, resource ID syntax and finite numeric domain', {timeout: 5000}, async t => {
  const run = await harness(t, `GG.events.onStart(async ctx => {
for (const action of [() => ctx.move(1000000000001), () => ctx.wait(61), () => ctx.setVariable("score",Infinity),
() => ctx.compare("BAD",1,1), () => ctx.playSound("remote.wav",true), () => ctx.setCostume("remote.svg"),
() => ctx.move(1,2), () => GG.ref("__proto__")]) {
try { await action(); console.log("UNEXPECTED"); } catch (error) { console.log("rejected"); }
}
await ctx.move(1000000000000);
});
await GG.events.run();`);
  run.execute(); await run.ready.promise;
  assert.deepEqual(await run.invoke('invoke-validation'), {completed: true});
  assert.deepEqual(run.logs.map(record => record.message), Array(8).fill('rejected'));
  assert.deepEqual(run.calls, [
    {method: 'program.start', args: [{variables: [], handlers: [{id: 'handler-0', event: 'start'}]}]},
    {method: 'program.move', args: ['invoke-validation', 1000000000000]}
  ]);
});

test('GG-TEXT-PROGRAM-001: excess outstanding contextual promises fail within the RPC quota and accepted waits still complete', {timeout: 5000}, async t => {
  const run = await harness(t, `GG.events.onStart(async ctx => {
const waits = [];
for (let i=0;i<${languageRuntimeLimits.pendingRPC + 6};i++) {
try { waits.push(ctx.wait(1)); } catch (error) { console.log("bounded"); }
}
await Promise.all(waits);
});
await GG.events.run();`, {holdWaits: true});
  run.execute(); await run.ready.promise;
  const invocation = run.invoke('invoke-rpc-quota');
  await until(() => run.logs.length > 0 && run.calls.some(call => call.method === 'program.wait'));
  const accepted = run.calls.filter(call => call.method === 'program.wait').length;
  assert.ok(accepted > 0 && accepted <= languageRuntimeLimits.pendingRPC);
  assert.equal(run.logs.every(record => record.message === 'bounded'), true);
  for (const reply of run.waitReplies) reply.resolve(null);
  assert.deepEqual(await invocation, {completed: true});
});

test('GG-ASSET-001: contextual bindings forward dynamic IDs while the project broker enforces existence and owner', {timeout:5000},async t=>{
 const resourceView={version:1,assets:[
  {id:'a'.repeat(64),type:'Image',format:'svg',bytes:100,width:4,height:4},
  {id:'b'.repeat(64),type:'Sound',format:'wav',bytes:100}],
  costumes:[
   {id:'GGasset:test-costume',ownerId:'hero',name:'Custom costume',assetId:'a'.repeat(64),centerX:2,centerY:2,bitmapResolution:1},
   {id:'other-owner',ownerId:'second-sprite',name:'Other costume',assetId:'a'.repeat(64),centerX:2,centerY:2,bitmapResolution:1}],
  sounds:[{id:'GGasset:test-sound',ownerId:'hero',name:'Custom sound',assetId:'b'.repeat(64)}]};
 const run=await harness(t, `GG.events.onStart(async ctx => {
await ctx.setCostume("GGasset:test-costume");
await ctx.playSound("GGasset:test-sound",true);
for (const action of [() => ctx.setCostume("missing"), () => ctx.playSound("missing",false), () => ctx.setCostume("other-owner")]) {
try { await action(); console.log("UNEXPECTED"); } catch (error) { console.log("denied by broker"); }
}
});
await GG.events.run();`,{policy:{capabilities:createCapabilities(['gg.assets']),resourceView}});
 run.execute();await run.ready.promise;
 assert.deepEqual(await run.invoke('dynamic-resources'),{completed:true});
 assert.deepEqual(run.logs.map(record=>record.message),Array(3).fill('denied by broker'));
 assert.deepEqual(run.calls.map(call=>call.method),['program.start','program.setCostume','program.playSound']);
 assert.deepEqual(run.calls[1].args,['dynamic-resources','GGasset:test-costume']);
 assert.deepEqual(run.calls[2].args,['dynamic-resources','GGasset:test-sound',true]);
});
