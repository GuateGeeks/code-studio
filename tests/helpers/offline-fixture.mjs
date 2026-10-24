import {mkdtemp, mkdir, writeFile, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createReleaseSnapshot} from '../../tools/build/release-snapshot.mjs';
import {offlineRoles} from '../../src/offline/contracts.mjs';
export async function offlineFixture() {
  const root = await mkdtemp(join(tmpdir(),'gg-offline-')), browserRoot=join(root,'browser'),releaseRoot=join(root,'releases');
  const origins=Object.fromEntries(offlineRoles.map((role,index)=>[role+'Origin','http://127.0.0.1:'+ (4260+index)]));
  const common={'index.html':'<!doctype html><script type="module" src="/runner.js"></script>',
    'runner.js':"const config=await fetch('/config.json');", 'app/example.mjs':"export const slash='/';"};
  for(const role of offlineRoles) {
    for(const [path,content] of Object.entries({...common,...(role==='shell'?{'editor.bundle.js':"const media='/blockly-media/';"}:{}),
      ...(role==='runner'?{'vendor/scratch-vm.js':"var VM='one';",'compiler-pack.json':'{"target":{"versions":{"target":"1"}}}','compiler-worker.js':"importScripts('/vendor/typescript.js');",'vendor/typescript.js':"var ts='one';"}:{}),
      ...(role==='language'?{'vendor/quickjs-engine.bundle.mjs':"export const url='/vendor/quickjs/emscripten-module.wasm';",'vendor/quickjs/emscripten-module.wasm':'wasm','vendor/pyodide/pyodide.mjs':"export const python=true;",'vendor/pyodide/python_stdlib.zip':'stdlib'}:{}),
      ...(role==='simulator'?{'vendor/pxtsim.js':"var sim='one';",'simulator.js':"fetch('/board.json');",'board.json':'{}'}:{})})) {
      const file=join(browserRoot,role,path); await mkdir(join(file,'..'),{recursive:true}); await writeFile(file,content);
    }
  }
  const snapshot=await createReleaseSnapshot({browserRoot,releaseRoot,origins});
  const state={current:snapshot,fail:null,calls:[],quota:false};
  async function fetchImpl(input) {
    const url=new URL(input); state.calls.push(url.href);
    if(state.fail?.(url)) throw new Error('network failure');
    const role=offlineRoles.find(role=>origins[role+'Origin']===url.origin);
    const route=state.current.resolveRoute(role,url.pathname);
    if(!route) return new Response('not found',{status:404});
    try {
      const bytes=route.body??await readFile(route.filePath);
      return new Response(bytes,{headers:{'Content-Type':route.contentType,'Content-Security-Policy':"default-src 'self'",'X-Content-Type-Options':'nosniff'}});
    } catch { return new Response('not found',{status:404}); }
  }
  return {root,browserRoot,releaseRoot,origins,snapshot,state,fetchImpl,cleanup:()=>rm(root,{recursive:true,force:true}),
    async next() { await writeFile(join(browserRoot,'shell','revision.txt'),'two'); state.current=await createReleaseSnapshot({browserRoot,releaseRoot,origins}); return state.current; }};
}
export function memoryCaches({failPut=()=>false}={}) {
  const caches=new Map();
  return {
    caches,
    async open(name) {
      if(!caches.has(name)) caches.set(name,new Map());
      const entries=caches.get(name);
      return {
        async match(key) { return entries.get(typeof key==='string'?key:key.url)?.clone(); },
        async put(key,response) { if(failPut(name,key)) throw new DOMException('quota','QuotaExceededError'); entries.set(typeof key==='string'?key:key.url,response.clone()); },
        async delete(key) { return entries.delete(typeof key==='string'?key:key.url); }
      };
    }
  };
}
