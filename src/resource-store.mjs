import {cloneValidatedResources,createResourceView,projectContextResources,mergeContextResources} from './contracts/resources.mjs';

// Single live owner. Candidates/checkpoints carry no public mutable state.
export function createResourceStore({catalog,resources=catalog?.resources}={}) {
 const candidates=new WeakMap(),checkpoints=new WeakMap(),subscribers=new Set();
 let current=resources;
 createResourceView(current,{catalog});current=cloneValidatedResources(current);
 function capture(){return cloneValidatedResources(current);}
 function emit(){for(const callback of subscribers)callback();}
 function prepare(value) {
  createResourceView(value,{catalog});const copy=cloneValidatedResources(value);
  const token=Object.freeze(Object.create(null));candidates.set(token,copy);return token;
 }
 function commit(token) {
  const value=candidates.get(token);if(!value)throw new TypeError('Candidato de recursos ajeno');
  current=cloneValidatedResources(value);emit();
 }
 function checkpoint(){const token=Object.freeze(Object.create(null));checkpoints.set(token,capture());return token;}
 function restoreDraft(token,{silent=false}={}) {
  const value=checkpoints.get(token);if(!value)throw new TypeError('Checkpoint de recursos ajeno');
  current=cloneValidatedResources(value);if(!silent)emit();
 }
 return Object.freeze({capture,prepare,commit,checkpoint,restoreDraft,view:(options)=>createResourceView(current,options),
  captureContext:(contextId='scratch-2d',options={})=>projectContextResources(current,{contextId,...options}),
  mergeContext:edited=>mergeContextResources(current,edited),
  candidateView:(token,options)=>{const value=candidates.get(token);if(!value)throw new TypeError('Candidato de recursos ajeno');return createResourceView(value,options);},
  candidateResources:token=>{const value=candidates.get(token);if(!value)throw new TypeError('Candidato de recursos ajeno');return cloneValidatedResources(value);},
  subscribe:callback=>{subscribers.add(callback);return()=>subscribers.delete(callback);}});
}
