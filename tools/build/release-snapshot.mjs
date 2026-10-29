import {readFile, writeFile, mkdir, readdir, stat} from 'node:fs/promises';
import {resolve, relative, dirname, extname, sep} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {rewriteAsset} from './rewrite-release-paths.mjs';
import {rolesForOrigins, offlinePackIds as legacyPackIds, installedOfflinePackIds, offlineRootPaths, validateOrigins, releaseBase, validateRoleManifest, validateReleaseManifest} from '../../src/offline/contracts.mjs';
const owned = resolve(dirname(fileURLToPath(import.meta.url)), '../../src/offline');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => Buffer.from(JSON.stringify(value));
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml; charset=utf-8','.png':'image/png',
  '.gif':'image/gif','.jpg':'image/jpeg','.woff2':'font/woff2','.wasm':'application/wasm','.zip':'application/zip','.mp3':'audio/mpeg','.wav':'audio/wav'};
function type(path) { return types[extname(path)] ?? 'application/octet-stream'; }
async function walk(root, base = root) {
  const result = [];
  for (const entry of (await readdir(root, {withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))) {
    const file = resolve(root, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Release sources cannot contain symlinks');
    if (entry.isDirectory()) result.push(...await walk(file, base));
    else if (entry.isFile()) result.push([relative(base,file).split(sep).join('/'), await readFile(file)]);
  }
  return result;
}
function packsFor(role, path) {
  if (path.startsWith('app/') || ['index.html','config.json','offline-preparer.html','offline-bootstrap.html'].includes(path)) return ['studio-core'];
  if (role === 'shell') return ['studio-core'];
  if (role === 'scene3d') return ['scene3d-babylon'];
  if (role === 'webapp') return ['webapp-dom'];
  if (role === 'simulator') return ['microbit-simulator'];
  if (role === 'language' && path === 'vendor/code-view-parser.bundle.mjs') return ['javascript-quickjs','python-stdlib'];
  if (role === 'language') return path.startsWith('vendor/pyodide/') ? ['python-stdlib'] : ['javascript-quickjs'];
  if (path === 'compiler-worker.js' || path === 'compiler-pack.json' || /vendor\/(?:typescript|pxtworker|microbit-compiler|lzma)\.js$/.test(path)) return ['microbit-compiler'];
  return ['scratch-2d'];
}
const dependencies = {'studio-core':['scratch-2d'], 'scratch-2d':[], 'javascript-quickjs':['scratch-2d'], 'python-stdlib':['scratch-2d'],
  'microbit-compiler':['studio-core'], 'microbit-simulator':['microbit-compiler'], 'scene3d-babylon':[], 'webapp-dom':[]};
async function immutable(file, bytes) {
  try { const previous = await readFile(file); if (!previous.equals(bytes)) throw new Error('Immutable release collision: ' + file); return; }
  catch(error) { if(error.code !== 'ENOENT') throw error; }
  await mkdir(dirname(file), {recursive:true});
  try { await writeFile(file, bytes, {flag:'wx'}); }
  catch(error) { if(error.code!=='EEXIST' || !(await readFile(file)).equals(bytes)) throw error; }
}
export async function createReleaseSnapshot({browserRoot, releaseRoot, origins}) {
  const deployment = validateOrigins(origins);
  const offlineRoles = rolesForOrigins(deployment), schemaVersion = offlineRoles.length === 6 ? 2 : 1;
  const offlinePackIds = schemaVersion === 2 ? installedOfflinePackIds : legacyPackIds;
  browserRoot = resolve(browserRoot); releaseRoot = resolve(releaseRoot);
  const trees = Object.fromEntries(await Promise.all(offlineRoles.map(async role => [role, await walk(resolve(browserRoot,role))])));
  const controls = Object.fromEntries(await Promise.all(offlineRootPaths.filter(path=>path!=='/offline-sw.js').map(async path=>[path,await readFile(resolve(owned,path.slice('/offline/'.length)))])));
  const preparerHTML = Buffer.from('<!doctype html><html lang="es"><head><meta charset="utf-8"><link rel="icon" href="data:,"><script type="module" src="./app/offline/preparer.mjs"></script><title>Preparacion local</title></head><body><p>Verificando paquetes locales.</p></body></html>');
  const bootstrapTemplate = await readFile(resolve(owned,'bootstrap.html'),'utf8');
  const offlineTree = await walk(owned);
  const before = {tools:await Promise.all([new URL('./release-snapshot.mjs',import.meta.url),new URL('./rewrite-release-paths.mjs',import.meta.url)].map(async file=>hash(await readFile(file)))), offline:offlineTree.map(([path,bytes])=>({path,sha256:hash(bytes)})), rewriteVersion:1, origins:deployment, roles:Object.fromEntries(offlineRoles.map(role=>[role,trees[role].map(([path,bytes])=>({path,sha256:hash(bytes)}))])),
    controls:Object.entries(controls).map(([path,bytes])=>({path,sha256:hash(bytes)})), preparer:hash(preparerHTML), bootstrap:hash(bootstrapTemplate)};
  const cohort = hash(json(before)), base = releaseBase(cohort), roleRoots = {}, localManifests = {};
  const config = json({...deployment, offlineProtocolVersion:schemaVersion, cohort, releaseBase:base});
  for (const role of offlineRoles) {
    const root = resolve(releaseRoot,cohort,role); roleRoots[role] = root;
    const output = new Map();
    for (const [path,bytes] of trees[role]) {
      if (['config.json','release.json','manifest.json','offline-preparer.html','offline-bootstrap.html'].includes(path)) continue;
      output.set(path,rewriteAsset(path,bytes,base));
    }
    // Offline modules remain available even when called against a small fixture build.
    for (const [path,bytes] of offlineTree) output.set('app/offline/'+path,rewriteAsset(path,bytes,base));
    output.set('config.json',config);
    output.set('offline-preparer.html',preparerHTML);
    output.set('offline-bootstrap.html',Buffer.from(bootstrapTemplate.replaceAll('__GG_RELEASE_BASE__',base)));
    const entries = [];
    for (const [path,bytes] of [...output].sort(([a],[b])=>a.localeCompare(b))) {
      await immutable(resolve(root,path),bytes);
      entries.push({path,bytes:bytes.length,sha256:hash(bytes),contentType:type(path),packs:packsFor(role,path)});
    }
    const bootstrap = [];
    const wrapper = Buffer.from("import {installOfflineWorker} from './offline/service-worker.mjs';\ninstallOfflineWorker('"+role+"');\n");
    const files = {...controls,'/offline-sw.js':wrapper};
    for (const path of offlineRootPaths) {
      const bytes=files[path];
      await immutable(resolve(root,'__control',path.slice(1)),bytes);
      bootstrap.push({path,bytes:bytes.length,sha256:hash(bytes),contentType:type(path)});
    }
    const totalBytes=[...entries,...bootstrap].reduce((sum,item)=>sum+item.bytes,0);
    const manifest=validateRoleManifest({schemaVersion,cohort,role,entries,bootstrap,totalBytes},role,cohort);
    localManifests[role]=manifest;
    await immutable(resolve(root,'manifest.json'),json(manifest));
  }
  const packs=offlinePackIds.map(id=>{
    const inventory=offlineRoles.flatMap(role=>localManifests[role].entries.filter(entry=>entry.packs.includes(id)).map(entry=>({role,path:entry.path,sha256:entry.sha256})));
    const contentHash=hash(json(inventory));
    const version=id==='javascript-quickjs'?'0.32.0':id==='python-stdlib'?'314.0.7':'local-'+contentHash.slice(0,16);
    return {id,version,contentHash,dependencies:dependencies[id]};
  });
  const manifest=validateReleaseManifest({schemaVersion,cohort,rewriteVersion:1,origins:deployment,
    roles:Object.fromEntries(offlineRoles.map(role=>[role,{path:'manifest.json',sha256:hash(json(localManifests[role]))}])),packs});
  const manifestBytes=json(manifest),manifestHash=hash(manifestBytes),descriptor={cohort,manifestHash};
  for(const role of offlineRoles) await immutable(resolve(roleRoots[role],'release.json'),manifestBytes);
  function resolveRoute(role,pathname) {
    if(!offlineRoles.includes(role) || typeof pathname!=='string') return null;
    if(pathname==='/latest-release.json') return {body:json(descriptor),contentType:type('x.json'),immutable:false};
    if(offlineRootPaths.includes(pathname)) return {filePath:resolve(roleRoots[role],'__control',pathname.slice(1)),contentType:type(pathname),immutable:false};
    const match=/^\/releases\/([a-f0-9]{64})\/(.*)$/.exec(pathname);
    if(!match) return null;
    const path=match[2]||'index.html';
    if(/[\\%?#\u0000-\u0020]/.test(path) || path.split('/').some(part=>!part||part==='.'||part==='..') || (path.startsWith('__control/') && !offlineRootPaths.includes(path.slice(9)))) return null;
    return {filePath:resolve(releaseRoot,match[1],role,path),contentType:type(path),immutable:true};
  }
  return {cohort,releaseBase:base,manifestHash,manifest,descriptor,roleRoots,releaseRoot,resolveRoute};
}
