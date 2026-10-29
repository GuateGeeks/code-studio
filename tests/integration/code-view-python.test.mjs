import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {pythonCodeViewReader} from '../../src/targets/text/code-view-python.mjs';
import {parseJavaScriptCodeView,pythonCodeViewVocabulary} from '../../src/targets/text/code-view-parser.mjs';
import {generateApi3ProgramSource} from '../../src/generated-program-source.mjs';
import {codeViewMutationCases,allNodes} from '../fixtures/code-view-mutations.mjs';
import {reconcileCodeViewIdentity} from '../../src/code-view-identity.mjs';
test('CV-PY-AST: 491 corpus mutations use ast, reviewed tables and preserve structural identity',()=>{
 const cases=codeViewMutationCases(),vocabulary=pythonCodeViewVocabulary();
 const sources=cases.map((item,index)=>{
  const lines=generateApi3ProgramSource(item.expected,'python').text.split('\n');
  if(item.kind==='comment-or-blank')lines.splice(index%lines.length,0,index%2?'# comentario del alumno':'');
  return lines.join('\n');
 });
 const script=pythonCodeViewReader+'\nimport sys\npayload=json.loads(sys.stdin.read())\nprint(json.dumps([json.loads(_cv_python_safe(s,json.dumps(payload["vocabulary"]))) for s in payload["sources"]]))\n';
 const output=spawnSync('python3',['-c',script],{input:JSON.stringify({sources,vocabulary}),encoding:'utf8',maxBuffer:8*1024*1024});
 assert.equal(output.status,0,output.stderr);
 const results=JSON.parse(output.stdout);let rejected=0;
 const strip=ir=>JSON.parse(JSON.stringify(ir,(key,value)=>key==='sourceBlockId'?undefined:value));
 for(let i=0;i<cases.length;i++){
  const item=cases[i],translated=results[i];assert.equal(translated.error,undefined,item.name+JSON.stringify(translated.error));
  let parsed;try{parsed=parseJavaScriptCodeView(translated.source,{variableIds:item.metadata.variableIds});}
  catch(error){assert.match(error.message,/shared.*asignación global/);rejected++;continue;}
  const reconciled=reconcileCodeViewIdentity(item.previous,parsed.ir,item.sidecar);
  assert.deepEqual(strip(reconciled.ir),strip(item.expected),item.name);
  const oldIDs=new Set(allNodes(item.previous).map(node=>node.sourceBlockId)),actual=allNodes(reconciled.ir),expected=allNodes(item.expected);
  for(let n=0;n<expected.length;n++)if(oldIDs.has(expected[n].sourceBlockId)&&!item.excluded.includes(expected[n].sourceBlockId))
   assert.equal(actual[n].sourceBlockId,expected[n].sourceBlockId,item.name);
  if(item.kind==='comment-or-blank'&&i%2)assert.equal(translated.comments[0].text,'comentario del alumno');
 }
 assert.equal(rejected,2);
});
test('CV-PY-AST: custom functions, while, imports, syntax and execution payloads are rejected with their original line',()=>{
 const sources=['@on_start\ndef start():\n    while True:\n        pass','\nimport os','\ndef custom():\n    pass','@on_start\ndef start():\n    hero.move('];
 const script=pythonCodeViewReader+'\nimport sys\npayload=json.loads(sys.stdin.read())\nprint(json.dumps([json.loads(_cv_python_safe(s,json.dumps(payload["vocabulary"]))) for s in payload["sources"]]))\n';
 const output=spawnSync('python3',['-c',script],{input:JSON.stringify({sources,vocabulary:pythonCodeViewVocabulary()}),encoding:'utf8'});
 assert.equal(output.status,0,output.stderr);
 const results=JSON.parse(output.stdout);assert.deepEqual(results.map(r=>r.error.lineNumber),[3,2,2,3]);
});
