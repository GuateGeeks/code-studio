import {gzipSync,gunzipSync} from 'node:zlib';
const maxArchive=64*1024*1024,maxExpanded=256*1024*1024,maxFile=32*1024*1024;
export function safeSourcePath(path){
 if(typeof path!=='string'||!path||Buffer.byteLength(path)>240||!/^[\x21-\x7e]+$/.test(path)||/[\\%?#:]/.test(path)||path.startsWith('/')||path.split('/').some(p=>!p||p==='.'||p==='..'||['node_modules','.git','.codegraph','artifacts','test-results','playwright-report','.cache','.codex','.ssh','.npmrc','.netrc','id_rsa','id_ed25519'].includes(p))||path.split('/').some(p=>/^\.env(?:\.|$)/.test(p)||/\.(?:pem|key|p12|pfx|sqlite|db)$/i.test(p)))throw new Error('Unsafe source path: '+String(path));
 return path;
}
function octal(header,start,length,value){const text=value.toString(8);if(text.length>length-1)throw new Error('Tar field overflow');header.write(text.padStart(length-1,'0')+'\0',start,length,'ascii');}
function headerFor(path,size){
 const header=Buffer.alloc(512),split=path.lastIndexOf('/');
 if(Buffer.byteLength(path)<=100)header.write(path,0,100,'ascii');
 else{const prefix=path.slice(0,split),name=path.slice(split+1);if(Buffer.byteLength(prefix)>155||Buffer.byteLength(name)>100)throw new Error('Tar path too long');header.write(name,0,100,'ascii');header.write(prefix,345,155,'ascii');}
 octal(header,100,8,0o644);octal(header,108,8,0);octal(header,116,8,0);octal(header,124,12,size);octal(header,136,12,0);
 header.fill(32,148,156);header[156]=48;header.write('ustar\0',257,6,'ascii');header.write('00',263,2,'ascii');
 octal(header,148,8,header.reduce((sum,n)=>sum+n,0));return header;
}
export function createSourceArchive(files){
 if(!Array.isArray(files)||files.length>30000||Array.from({length:files.length},(_,i)=>i).some(i=>!Object.hasOwn(files,i)))throw new Error('Invalid source inventory');
 const sorted=[...files].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0),parts=[];let previous='',expandedBytes=1024;
 for(const file of sorted){safeSourcePath(file.path);if(file.path===previous)throw new Error('Duplicate source path');previous=file.path;
  if(!(file.bytes instanceof Uint8Array)||file.bytes.length>maxFile)throw new Error('Source file limit exceeded');
  const bytes=Buffer.from(file.bytes),padding=(512-bytes.length%512)%512;expandedBytes+=512+bytes.length+padding;if(expandedBytes>maxExpanded)throw new Error('Source expansion limit exceeded');
  parts.push(headerFor(file.path,bytes.length),bytes,Buffer.alloc(padding));
 }parts.push(Buffer.alloc(1024));const bytes=gzipSync(Buffer.concat(parts),{level:9,mtime:0});
 if(bytes.length>maxArchive)throw new Error('Source archive exceeds 64 MiB');
 return {bytes,expandedBytes};
}
function number(header,start,length){const text=header.subarray(start,start+length).toString('ascii').replace(/\0.*$/,'').trim();if(!/^[0-7]+$/.test(text))throw new Error('Invalid tar numeric field');const n=parseInt(text,8);if(!Number.isSafeInteger(n))throw new Error('Invalid tar number');return n;}
function string(header,start,length){const bytes=header.subarray(start,start+length),zero=bytes.indexOf(0),end=zero<0?bytes.length:zero;if(zero>=0&&bytes.subarray(zero).some(n=>n!==0))throw new Error('Invalid tar string');return bytes.subarray(0,end).toString('ascii');}
export function readSourceArchive(input,{expandedBytes}={}){
 if(!(input instanceof Uint8Array)||input.length>maxArchive)throw new Error('Invalid source archive');
 const tar=gunzipSync(input,{maxOutputLength:maxExpanded});if(tar.length%512||tar.length<1024||expandedBytes!==undefined&&tar.length!==expandedBytes)throw new Error('Source expansion mismatch');
 const files=new Map();let offset=0,previous='';
 for(;offset<tar.length;){
  const header=tar.subarray(offset,offset+512);
  if(header.every(n=>n===0)){if(tar.length-offset!==1024||tar.subarray(offset).some(n=>n!==0))throw new Error('Invalid tar terminator');offset=tar.length;break;}
  if(files.size>=30000||string(header,257,6)!=='ustar'||string(header,263,2)!=='00'||header[156]!==48)throw new Error('Unsupported tar entry');
  const checksum=number(header,148,8),copy=Buffer.from(header);copy.fill(32,148,156);if(copy.reduce((sum,n)=>sum+n,0)!==checksum)throw new Error('Tar checksum mismatch');
  if(number(header,100,8)!==0o644||number(header,108,8)!==0||number(header,116,8)!==0||number(header,136,12)!==0)throw new Error('Non-deterministic tar metadata');
  const name=string(header,0,100),prefix=string(header,345,155),path=safeSourcePath(prefix?prefix+'/'+name:name),size=number(header,124,12);
  if(path<=previous||size>maxFile)throw new Error('Duplicate/unsorted/oversized source entry');previous=path;
  if(!header.equals(headerFor(path,size)))throw new Error('Non-canonical tar header');
  const end=offset+512+size,next=end+(512-size%512)%512;
  if(next>tar.length-1024||tar.subarray(end,next).some(n=>n!==0))throw new Error('Invalid tar body');
  files.set(path,Uint8Array.from(tar.subarray(offset+512,end)));offset=next;
 }
 if(offset!==tar.length||files.size===0)throw new Error('Truncated source archive');return files;
}
