import {createServer} from 'node:http';
import {readFile,realpath} from 'node:fs/promises';
import {dirname,resolve,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=dirname(fileURLToPath(import.meta.url)),manifest=JSON.parse(await readFile(resolve(root,'package-manifest.json'),'utf8'));
const config=JSON.parse(await readFile(resolve(root,'deployment.json'),'utf8'));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const releaseNames=['index.html','source.tar.gz','source-manifest.json','LICENSE','THIRD_PARTY_NOTICES.txt','SBOM.json'],releasePaths=new Set(releaseNames.map(name=>'/release/'+name));
const files=new Map(manifest.files.map(entry=>[entry.path,entry])),payloads=new Map();
if(files.size!==manifest.files.length||manifest.files.length>4096)throw new Error('Invalid package inventory');
let total=0;for(const entry of files.values()){if(!Number.isSafeInteger(entry.bytes)||entry.bytes<0||entry.bytes>64*1024*1024||! /^[a-f0-9]{64}$/.test(entry.sha256)||typeof entry.path!=='string'||/[\\?#%\u0000-\u0020\u007f]/.test(entry.path)||entry.path.split('/').some(part=>!part||part==='.'||part==='..'))throw new Error('Invalid package inventory');total+=entry.bytes;if(total>128*1024*1024)throw new Error('Package quota exceeded');}
for(const name of releaseNames)if(!files.has('release/'+name))throw new Error('Release material absent: '+name);
for(const entry of files.values()){const path=resolve(root,entry.path);if(!path.startsWith(root+sep)||await realpath(path)!==path)throw new Error('Unsafe package path');const bytes=await readFile(path);if(bytes.length!==entry.bytes||digest(bytes)!==entry.sha256)throw new Error('Package integrity mismatch: '+entry.path);payloads.set(entry.path,bytes);}
const source=JSON.parse(payloads.get('release/source-manifest.json').toString('utf8')),archive=payloads.get('release/source.tar.gz');
if(source.sourceArchive?.path!=='source.tar.gz'||source.sourceArchive.bytes!==archive.length||source.sourceArchive.sha256!==digest(archive))throw new Error('Source archive integrity mismatch');
const roles={shell:4211,language:4212,[manifest.contextId]:4213},servers=[];
const releaseMime={'index.html':'text/html; charset=utf-8','source.tar.gz':'application/gzip','source-manifest.json':'application/json; charset=utf-8',LICENSE:'text/plain; charset=utf-8','THIRD_PARTY_NOTICES.txt':'text/plain; charset=utf-8','SBOM.json':'application/json; charset=utf-8'};
const mime={html:'text/html; charset=utf-8',mjs:'text/javascript; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',json:'application/json; charset=utf-8',wasm:'application/wasm',zip:'application/zip',svg:'image/svg+xml',png:'image/png'};
for(const [role,port]of Object.entries(roles)){
 const server=createServer(async(request,response)=>{
  response.setHeader('Content-Security-Policy',role==='shell'?"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-src "+config.languageOrigin+' '+config[manifest.contextId+'Origin']+"; img-src 'self' data: blob:; worker-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; object-src 'none'":"default-src 'none'; script-src 'self'"+(role==='language'?" 'unsafe-eval' 'wasm-unsafe-eval'":"")+"; style-src 'self'; connect-src 'self'; img-src 'self' data: blob:; worker-src 'self'; frame-src 'none'; frame-ancestors "+config.shellOrigin+"; base-uri 'none'; form-action 'none'; object-src 'none'");
  response.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=(), usb=(), serial=()');response.setHeader('X-Content-Type-Options','nosniff');response.setHeader('Origin-Agent-Cluster','?1');response.setHeader('Referrer-Policy','no-referrer');
  try{
   if(!['GET','HEAD'].includes(request.method)){response.writeHead(405).end();return;}
   let path=decodeURIComponent(new URL(request.url,'http://127.0.0.1:'+port).pathname);if(path.includes('\\')||path.includes('\0'))throw new Error('Invalid path');
   if(path==='/config.json'||path===config.releaseBase+'config.json'){response.setHeader('Content-Type',mime.json);response.end(JSON.stringify(config));return;}
   if(path==='/')path='/index.html';else if(/^\/releases\/[a-f0-9]{64}\/$/.test(path))path+='index.html';
   if(role==='shell'&&!path.startsWith('/releases/')&&!['/index.html','/export.css','/standalone.json','/package-manifest.json'].includes(path)&&!releasePaths.has(path)){response.writeHead(404).end();return;}
   const key=(role==='shell'&&!path.startsWith('/releases/')?'':'roles/'+role+'/')+path.slice(1),entry=files.get(key);
   if(!entry){response.writeHead(404).end();return;}
   if(role==='shell'&&path==='/release/source.tar.gz')response.setHeader('Content-Disposition','attachment; filename="source.tar.gz"');
   response.setHeader('Content-Type',role==='shell'&&releasePaths.has(path)?releaseMime[path.slice('/release/'.length)]:mime[path.split('.').at(-1)]??'application/octet-stream');response.end(request.method==='HEAD'?undefined:payloads.get(key));
  }catch{response.writeHead(404).end();}
 });await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});servers.push(server);
}
console.log('Aplicación local: http://127.0.0.1:4211/ · Ctrl+C para cerrar');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{for(const server of servers){server.close();server.closeAllConnections();}});
