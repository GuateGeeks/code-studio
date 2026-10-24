import {releaseMaterialNames,validateReleaseMaterialSet} from '../contracts/release-materials.mjs';
import {createStoredPackage,readStoredPackage,packageLimits} from './stored-package.mjs';
import {checkedResponse,sha256,validateReleaseManifest,validateRoleManifest,releaseBase,offlineLimits} from '../offline/contracts.mjs';
import {validateResources2} from '../contracts/resources-v2.mjs';
import {lowerCapabilityGraph} from '../contracts/program-ir1.mjs';
import {resolveOperationProfile} from '../contracts/operations.mjs';
import {validateLanguageDocument} from '../contracts/language-runtime.mjs';
const encode=new TextEncoder(),decode=new TextDecoder('utf-8',{fatal:true});
const fail=message=>{throw new Error('Runtime autónomo: '+message);};
function exact(value,keys,label){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype||
  Object.keys(value).length!==keys.length||keys.some(key=>!Object.hasOwn(value,key)))fail(label+' inválido');
}
function parseJSON(bytes){try{return JSON.parse(decode.decode(bytes));}catch{fail('JSON inválido');}}
function runtimeEntrySelected(role,path,language){
 if(path==='config.json'||path.startsWith('app/offline/')||path.startsWith('offline-'))return false;
 if(role==='shell'&&!path.startsWith('app/')&&!path.startsWith('export-templates/'))return false;
 if(role==='language'&&path.startsWith('vendor/')&&(language==='javascript'?path.startsWith('vendor/pyodide/'):!path.startsWith('vendor/pyodide/')))return false;
 return true;
}
async function verifiedRuntimeEntries(bytes,{release,cohort,contextId,language}){
 const entries=readStoredPackage(bytes),files=new Map(entries),allowed=new Set(),sources=[],base=releaseBase(cohort),templates=new Map();
 async function checked(path,expected){
  const bytes=files.get(path);if(!bytes)fail('archivo ausente: '+path);
  if(expected&&(bytes.length!==expected.bytes||await sha256(bytes)!==expected.sha256))fail('integridad incorrecta: '+path);
  allowed.add(path);return bytes;
 }
 for(const role of ['shell','language',contextId]){
  const raw=await checked('source-manifests/'+role+'.json');
  if(await sha256(raw)!==release.roles[role].sha256)fail('hash del manifiesto de origen incorrecto');
  const manifest=validateRoleManifest(parseJSON(raw),role,cohort);
  if(manifest.schemaVersion!==release.schemaVersion)fail('versión de manifiesto mezclada');
  for(const entry of manifest.entries){
   if(!runtimeEntrySelected(role,entry.path,language))continue;
   if(entry.path.startsWith('export-templates/')){
    const name=entry.path.slice('export-templates/'.length);
    if(role!=='shell'||templates.has(name)||!['index.html','export.css','serve.mjs.txt','notices.json',...releaseMaterialNames.map(name=>'release/'+name)].includes(name))fail('plantilla de origen no permitida');templates.set(name,{entry,bytes:await checked('source-templates/'+name,entry)});
    continue;
   }
   const path='roles/'+role+base+entry.path;
   await checked(path,entry);
   sources.push({path,bytes:entry.bytes,sha256:entry.sha256,role,sourcePath:entry.path});
  }
 }
 for(const name of ['index.html','export.css','serve.mjs.txt','notices.json'])if(!templates.has(name))fail('plantilla de origen ausente: '+name);
 const materials=await validateReleaseMaterialSet(new Map(releaseMaterialNames.map(name=>[name,templates.get('release/'+name)?.bytes])));
 const source=parseJSON(await checked('source-runtime.json'));
 exact(source,['schemaVersion','cohort','contextId','language','sourceOrigins','files'],'inventario de origen');
 if(source.schemaVersion!==1||source.cohort!==cohort||source.contextId!==contextId||source.language!==language||
  JSON.stringify(source.sourceOrigins)!==JSON.stringify(release.origins)||!Array.isArray(source.files)||source.files.length!==sources.length)fail('cohort, contexto, lenguaje o inventario mezclado');
 const expectedSources=new Map(sources.map(entry=>[entry.path,entry])),seen=new Set();
 for(const entry of source.files){
  exact(entry,['path','bytes','sha256','role','sourcePath'],'archivo de origen');
  const expected=expectedSources.get(entry.path);
  if(!expected||seen.has(entry.path)||Object.keys(expected).some(key=>expected[key]!==entry[key]))fail('inventario de origen alterado');
  seen.add(entry.path);
 }
 const index=decode.decode(templates.get('index.html').bytes).replace('__BOOTSTRAP__',base+'app/export/bootstrap.mjs');
 const noticesInventory=parseJSON(templates.get('notices.json').bytes);
 let notices='GuateGeeks Code Studio · runtime autónomo\nFuentes y versiones incluidas según source-runtime.json.\nFuente correspondiente local: release/index.html.\n\n';
 for(const name of [contextId==='scene3d'?'@babylonjs/core':null,contextId==='scene3d'?'@babylonjs/loaders':null,language==='javascript'?'quickjs-emscripten-core':'pyodide',language==='javascript'?'@jitl/quickjs-wasmfile-release-sync':null,'pako'].filter(Boolean)){
  const pkg=noticesInventory?.[name];
  if(!pkg||typeof pkg.version!=='string'||typeof pkg.license!=='string'||!Array.isArray(pkg.texts))fail('avisos de runtime incompletos');
  notices+=name+' '+pkg.version+' · '+pkg.license+'\n';
  for(const file of pkg.texts){if(typeof file?.text!=='string')fail('aviso inválido');notices+=file.text+'\n';}
 }
 for(const [path,expected]of [['index.html',encode.encode(index)],['export.css',templates.get('export.css').bytes],['serve.mjs',templates.get('serve.mjs.txt').bytes],['RUNTIME_NOTICES.txt',encode.encode(notices)]]){
  const raw=await checked(path);
  if(raw.length!==expected.length||await sha256(raw)!==await sha256(expected))fail('ejecutable/aviso derivado alterado: '+path);
 }
 if(files.size!==allowed.size||[...files.keys()].some(path=>!allowed.has(path)))fail('archivo adicional fuera del inventario verificado');
 // Verified source bytes move to their public location only once. Keeping the
 // intermediate tar too would double a possible 64 MiB file inside a 128 MiB ZIP.
 const result=entries.filter(([path])=>!path.startsWith('source-templates/release/'));
 for(const name of releaseMaterialNames)result.push(['release/'+name,materials.files.get(name)]);
 return result;
}
let exporting=false;
export async function exportStandaloneContext({config,contextId,authoring,fetchImpl=fetch}){
 if(exporting)throw new Error('Espera a que termine la exportación.');
 if(!['scene3d','webapp'].includes(contextId)||!/^[a-f0-9]{64}$/.test(config.cohort??''))throw new Error('Recarga Studio para exportar su versión verificada.');
 const selected=structuredClone(authoring),contextConfig=selected.contextConfig;
 const profile=resolveOperationProfile({contextId,documentId:contextConfig.documentId,capabilities:selected.capabilities});
 const language=contextConfig.mode==='blocks'?'javascript':contextConfig.mode;
 if(contextConfig.mode==='blocks')lowerCapabilityGraph(contextConfig.workspace,{contextId,documentId:contextConfig.documentId,profile});
 else{
  const document=selected.textDocuments.find(d=>d.id===contextConfig.selectedTextDocumentId&&d.language===language);
  validateLanguageDocument(document);selected.textDocuments=[document];
 }
 if(contextConfig.mode==='blocks')selected.textDocuments=[];
 let resources=await validateResources2(selected.resources);
 resources=structuredClone(resources);resources.bindings=resources.bindings.filter(b=>b.owner.contextId===contextId&&b.owner.documentId===contextConfig.documentId);
 const ids=new Set(resources.bindings.map(b=>b.assetId));
 resources.assets=Object.fromEntries(Object.entries(resources.assets).filter(([id])=>ids.has(id)));
 resources.integrity=Object.fromEntries(Object.entries(resources.integrity).filter(([id])=>ids.has(id)));
 selected.resources=await validateResources2(resources);
 exporting=true;
 try{
  const releaseResponse=await fetchImpl(releaseBase(config.cohort)+'release.json',{cache:'no-store'});
  const release=validateReleaseManifest(parseJSON(await checkedResponse(releaseResponse,{contentType:'application/json'},{maxBytes:offlineLimits.manifestBytes})));
  if(release.schemaVersion!==2||release.cohort!==config.cohort)fail('release de origen incompatible');
  const response=await fetchImpl('/standalone-runtime/'+config.cohort+'/'+contextId+'/'+language+'.zip',{cache:'no-store'});
  const runtime=await checkedResponse(response,{contentType:'application/zip'},{maxBytes:packageLimits.bytes});
  const entries=await verifiedRuntimeEntries(runtime,{release,cohort:config.cohort,contextId,language});
  const deployment={shellOrigin:'http://127.0.0.1:4211',languageOrigin:'http://127.0.0.1:4212',scene3dOrigin:'http://127.0.0.1:'+(contextId==='scene3d'?4213:4216),webappOrigin:'http://127.0.0.1:'+(contextId==='webapp'?4213:4216),runnerOrigin:'http://127.0.0.1:4214',simulatorOrigin:'http://127.0.0.1:4215',cohort:config.cohort,releaseBase:'/releases/'+config.cohort+'/'};
  entries.push(['standalone.json',JSON.stringify({schemaVersion:1,contextId,authoring:selected})],['deployment.json',JSON.stringify(deployment)],['README.txt',[
   'Aplicación autónoma de GuateGeeks Code Studio',
   'Requiere Node.js22 o superior y un navegador moderno con WebGL2 para3D.',
   'Descomprime toda la carpeta y ejecuta: node serve.mjs',
   'Abre http://127.0.0.1:4211/ y pulsa Ejecutar. No necesita Studio, cuenta ni internet.',
   'El servidor escucha solamente127.0.0.1:4211–4213 y solo sirve archivos incluidos con hashes verificados.',
   'Runtime incluido: '+(language==='python'?'Pyodide314.0.7+stdlib en worker, bindingsGG; sin paquetes externos':'QuickJS0.32.0 en worker, bindingsGG'),
   'Renderer incluido: '+(contextId==='scene3d'?'Babylon9.32.0+loaderGLB estático limitado':'DOM propio con componentes nativos y eventos locales'),
   'Se incluye únicamente el contexto seleccionado con su autoría inicial; el estado mutable de ejecución no se exporta.',
   'Cohort fuente: '+config.cohort+'. source-runtime.json enumera hashes originales; deployment.json adapta los orígenes locales.',
   'Para detener pulsa Detener. El paquete no guarda cambios de ejecución ni usa almacenamiento de alumnos.',
   'Abre release/index.html para descargar fuente, manifiesto, LICENSE, avisos y SBOM locales del mismo cohort.',
   'source.tar.gz se incluye en release/. Sus bytes/SHA y las fuentes/recetas/precompilados se describen en release/source-manifest.json.',
   'Consulta RUNTIME_NOTICES.txt y release/THIRD_PARTY_NOTICES.txt. No se promete reconstrucción nativa C++ de los precompilados PXT.'
  ].join('\n')]);
  const files=[];for(const [path,value]of entries){const bytes=typeof value==='string'?new TextEncoder().encode(value):value;files.push({path,bytes:bytes.length,sha256:await sha256(bytes)});}
  entries.push(['package-manifest.json',JSON.stringify({schemaVersion:1,contextId,language,sourceCohort:config.cohort,files},null,2)]);
  return createStoredPackage(entries);
 }finally{exporting=false;}
}
