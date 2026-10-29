import {test,expect} from '@playwright/test';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {clickVisible,selectContext,settled} from './workspace-controls.mjs';

// Canonical projects (FEATURE-MATURATION-PLAN §3): open without running,
// reach the declared final state with an explicit Run, and Stop restores it.
const root=resolve(import.meta.dirname,'../fixtures/canonical');
const contexts={scene2d:{select:'2d',run:'#run-editor',ran:'Bloques ejecutados'}};
const fixtures=readdirSync(root,{withFileTypes:true}).filter(entry=>entry.isDirectory()).flatMap(context=>
  readdirSync(resolve(root,context.name),{withFileTypes:true}).filter(entry=>entry.isDirectory()).map(project=>({id:context.name+'/'+project.name,dir:resolve(root,context.name,project.name)})));
const snapshot=page=>page.evaluate(()=>studioProbe.request('snapshot'));
// Expected keys may name nested snapshot fields with dots (`hero.size`).
const read=(value,key)=>key.split('.').reduce((item,part)=>item?.[part],value);

test('CANONICAL: the fixture folder declares at least one project per supported context',()=>{
  for(const context of Object.keys(contexts))expect(fixtures.some(item=>item.id.startsWith(context+'/')),context).toBe(true);
});

for(const fixture of fixtures)test('CANONICAL: '+fixture.id+' opens without running, reaches its final state and stops',async({page})=>{
  const project=JSON.parse(readFileSync(resolve(fixture.dir,'project.json'),'utf8'));
  const expected=JSON.parse(readFileSync(resolve(fixture.dir,'expect.json'),'utf8'));
  expect(project.format).toBe('gg-canonical-fixture');expect(project.version).toBe(1);
  const context=contexts[project.context];expect(context,'contexto sin ejecutor: '+project.context).toBeTruthy();
  await page.goto('/');await expect(page.locator('#run-editor')).toBeEnabled();await page.evaluate(()=>studioProbe.project.ready());
  await page.evaluate(starter=>studioProbe.project.loadStarter(starter),{name:project.name,packIds:project.packIds,blockly:project.blockly});
  for(const [key,value] of Object.entries(expected.initial))expect(read(await settled(snapshot,page),key),'abrir no ejecuta: '+key).toEqual(value);
  await selectContext(page,context.select);
  await clickVisible(page.locator(context.run));await expect(page.locator('#status')).toHaveText(context.ran);
  for(const [key,value] of Object.entries(expected.final))await expect.poll(async()=>read(await settled(snapshot,page),key),{message:'final: '+key}).toEqual(value);
  await clickVisible(page.locator('#stop-result'));
  for(const [key,value] of Object.entries(expected.initial))await expect.poll(async()=>read(await settled(snapshot,page),key),{message:'Detener: '+key}).toEqual(value);
});
