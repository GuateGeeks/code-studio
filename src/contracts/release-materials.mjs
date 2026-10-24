// Installed release metadata is inert data. No filesystem, archive inflater,
// engine or DOM dependencies are needed to authenticate its transport.
export const releaseMaterialNames=Object.freeze(['index.html','source.tar.gz','source-manifest.json','LICENSE','THIRD_PARTY_NOTICES.txt','SBOM.json']);
export const releaseMaterialLimits=Object.freeze({archiveBytes:64*1024*1024,expandedBytes:256*1024*1024,fileBytes:32*1024*1024,jsonBytes:8*1024*1024,entries:30000,repositories:16,locks:16,prebuilts:64,stringBytes:4096,pathBytes:240});
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const fail=message=>{throw new Error('Materiales de release: '+message);};
function exact(value,required,label){if(value===null||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value))||Reflect.ownKeys(value).length!==required.length||required.some(key=>!Object.hasOwn(value,key))||Reflect.ownKeys(value).some(key=>typeof key!=='string'||!required.includes(key)||!Object.hasOwn(Object.getOwnPropertyDescriptor(value,key),'value')))fail(label+' inválido');}
function dense(value,max,label){if(!Array.isArray(value)||value.length>max||Reflect.ownKeys(value).length!==value.length+1)fail(label+' inválido');for(let i=0;i<value.length;i++)if(!Object.hasOwn(value,i)||!Object.hasOwn(Object.getOwnPropertyDescriptor(value,String(i)),'value'))fail(label+' disperso');}
function text(value,max=releaseMaterialLimits.stringBytes){if(typeof value!=='string'||!value.trim()||encoder.encode(value).length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))fail('texto inválido');return value;}
function count(value,max,min=0){if(!Number.isSafeInteger(value)||value<min||value>max)fail('tamaño/cuota inválido');return value;}
function hash(value){if(typeof value!=='string'||! /^[a-f0-9]{64}$/.test(value))fail('SHA256 inválido');return value;}
export function validateReleaseSourcePath(value){if(typeof value!=='string'||value.length>releaseMaterialLimits.pathBytes||!value.length||/[^\x21-\x7e]|[\\%?#]/.test(value)||value.startsWith('/')||/^[A-Za-z]:/.test(value)||value.split('/').some(part=>!part||part==='.'||part==='..'))fail('ruta de fuente inválida');return value;}
function origin(value){text(value);let url;try{url=new URL(value);}catch{fail('procedencia URL inválida');}if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)fail('procedencia URL no permitida');return value;}
function metadata(value){exact(value,['path','bytes','sha256'],'referencia');validateReleaseSourcePath(value.path);count(value.bytes,releaseMaterialLimits.fileBytes);hash(value.sha256);}
export function validateSourceManifest(input){
 exact(input,['schemaVersion','license','sourceArchive','entries','provenance','limitations'],'manifiesto');
 if(input.schemaVersion!==1||input.license!=='AGPL-3.0-only')fail('versión/licencia no soportada');
 exact(input.sourceArchive,['path','bytes','sha256','expandedBytes'],'archivo fuente');
 if(input.sourceArchive.path!=='source.tar.gz')fail('nombre de archivo fuente inválido');
 count(input.sourceArchive.bytes,releaseMaterialLimits.archiveBytes,1);hash(input.sourceArchive.sha256);
 count(input.sourceArchive.expandedBytes,releaseMaterialLimits.expandedBytes,1024);if(input.sourceArchive.expandedBytes%512)fail('tamaño tar no alineado');
 dense(input.entries,releaseMaterialLimits.entries,'inventario');if(!input.entries.length)fail('inventario vacío');
 const entries=new Map();let total=0;
 for(const item of input.entries){
  exact(item,['path','bytes','sha256','kind'],'entrada');validateReleaseSourcePath(item.path);count(item.bytes,releaseMaterialLimits.fileBytes);hash(item.sha256);
  if(entries.has(item.path)||!['source','license','lock','patch','recipe','prebuilt'].includes(item.kind)||item.path==='source-manifest.json'||item.path==='release/source-manifest.json')fail('entrada duplicada/no permitida');
  if(item.kind!=='source'&&!item.bytes)fail('material requerido vacío');
  entries.set(item.path,item);total+=item.bytes;if(total>releaseMaterialLimits.expandedBytes)fail('expansión agregada excedida');
 }
 // Each regular file needs at least one header, padded payload and two final blocks.
 const minimumTar=1024+input.entries.reduce((bytes,item)=>bytes+512+Math.ceil(item.bytes/512)*512,0);
 if(minimumTar>input.sourceArchive.expandedBytes)fail('inventario no cabe en tar declarado');
 exact(input.provenance,['product','toolchain','repositories','locks','prebuilts'],'procedencia');
 exact(input.provenance.product,['name','version','license'],'producto');text(input.provenance.product.name,128);text(input.provenance.product.version,128);if(input.provenance.product.license!=='AGPL-3.0-only')fail('licencia propia incompatible');
 exact(input.provenance.toolchain,['node','npm','platform','arch'],'toolchain');for(const value of Object.values(input.provenance.toolchain))text(value,128);
 const reference=(item,kind)=>{metadata(item);const entry=entries.get(item.path);if(!entry||entry.kind!==kind||entry.bytes!==item.bytes||entry.sha256!==item.sha256)fail('referencia fuera del inventario');};
 const ids=new Set(),seenLocks=new Set(),seenPrebuilts=new Set();
 dense(input.provenance.repositories,releaseMaterialLimits.repositories,'repositorios');
 for(const repository of input.provenance.repositories){
  exact(repository,['id','origin','revision','version','sourcePath','patches'],'repositorio');text(repository.id,128);if(ids.has(repository.id))fail('repositorio duplicado');ids.add(repository.id);
  origin(repository.origin);text(repository.revision,128);text(repository.version,128);validateReleaseSourcePath(repository.sourcePath);
  if(![...entries.keys()].some(path=>path===repository.sourcePath||path.startsWith(repository.sourcePath+'/')))fail('fuentes de repositorio ausentes');
  dense(repository.patches,releaseMaterialLimits.entries,'parches');const patches=new Set();
  for(const patch of repository.patches){reference(patch,'patch');if(patches.has(patch.path))fail('parche duplicado');patches.add(patch.path);}
 }
 dense(input.provenance.locks,releaseMaterialLimits.locks,'locks');
 for(const lock of input.provenance.locks){reference(lock,'lock');if(seenLocks.has(lock.path))fail('lock duplicado');seenLocks.add(lock.path);}
 dense(input.provenance.prebuilts,releaseMaterialLimits.prebuilts,'precompilados');
 for(const prebuilt of input.provenance.prebuilts){
  exact(prebuilt,['path','bytes','sha256','origin','recipe','limitation'],'precompilado');
  reference({path:prebuilt.path,bytes:prebuilt.bytes,sha256:prebuilt.sha256},'prebuilt');if(seenPrebuilts.has(prebuilt.path))fail('precompilado duplicado');seenPrebuilts.add(prebuilt.path);
  origin(prebuilt.origin);validateReleaseSourcePath(prebuilt.recipe);if(entries.get(prebuilt.recipe)?.kind!=='recipe')fail('receta ausente');text(prebuilt.limitation);
 }
 dense(input.limitations,64,'limitaciones');for(const limitation of input.limitations)text(limitation);
 if(encoder.encode(JSON.stringify(input)).length>releaseMaterialLimits.jsonBytes)fail('manifiesto demasiado grande');
 return structuredClone(input);
}
async function digest(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');}
export async function validateReleaseMaterialSet(input){
 if(!(input instanceof Map)||input.size!==releaseMaterialNames.length||[...input.keys()].some(name=>!releaseMaterialNames.includes(name)))fail('conjunto de archivos incompleto/no permitido');
 const files=new Map();
 for(const name of releaseMaterialNames){const bytes=input.get(name);if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.length>(name==='source.tar.gz'?releaseMaterialLimits.archiveBytes:releaseMaterialLimits.jsonBytes))fail('archivo de release inválido: '+name);files.set(name,Uint8Array.from(bytes));}
 let value;try{value=JSON.parse(decoder.decode(files.get('source-manifest.json')));}catch{fail('JSON de fuente inválido');}
 const manifest=validateSourceManifest(value),archive=files.get('source.tar.gz');
 if(archive.length!==manifest.sourceArchive.bytes||await digest(archive)!==manifest.sourceArchive.sha256)fail('integridad de archivo fuente incorrecta');
 for(const name of ['index.html','LICENSE','THIRD_PARTY_NOTICES.txt'])try{if(!decoder.decode(files.get(name)).trim())fail('texto de release vacío');}catch{fail('texto de release inválido');}
 try{const sbom=JSON.parse(decoder.decode(files.get('SBOM.json')));if(!sbom||typeof sbom!=='object'||Array.isArray(sbom))fail('SBOM inválido');}catch{fail('SBOM inválido');}
 return {manifest,files};
}
