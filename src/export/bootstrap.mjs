import {createCapabilityExecution} from '../studio/capability-execution.mjs';
const input=await fetch('/standalone.json').then(r=>r.json()),config=await fetch('/config.json').then(r=>r.json());
const status=document.querySelector('#status'),slot=document.querySelector('#preview'),diagnostics=document.querySelector('#diagnostics');
const execution=createCapabilityExecution({config,getAuthoring:()=>input.authoring,slot,beforeCommit:async()=>{},onStatus:text=>{status.textContent=text;},
 onDiagnostic:record=>{while(diagnostics.children.length>=100)diagnostics.firstChild.remove();const li=document.createElement('li');li.textContent=record.code+': '+record.message;diagnostics.append(li);}});
document.querySelector('#run').addEventListener('click',()=>execution.run(input.contextId).catch(error=>{status.textContent=error.message;}));
document.querySelector('#stop').addEventListener('click',()=>{execution.stop();slot.replaceChildren();status.textContent='Detenido';});
window.addEventListener('pagehide',()=>execution.stop());
window.standaloneProbe=Object.freeze({snapshot:execution.snapshot,state:execution.state});
