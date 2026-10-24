import {readFile,mkdir,lstat,writeFile,mkdtemp,rename,rm} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {validateSourceManifest} from '../../src/contracts/release-materials.mjs';
import {readSourceArchive} from './tar.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function verifyReleaseSource(bytes,value){
 const manifest=validateSourceManifest(value);
 if(bytes.length!==manifest.sourceArchive.bytes||hash(bytes)!==manifest.sourceArchive.sha256)throw new Error('Source archive integrity mismatch');
 const files=readSourceArchive(bytes,{expandedBytes:manifest.sourceArchive.expandedBytes});
 if(files.size!==manifest.entries.length)throw new Error('Source inventory mismatch');
 for(const entry of manifest.entries){const file=files.get(entry.path);if(!file||file.length!==entry.bytes||hash(file)!==entry.sha256)throw new Error('Source entry integrity mismatch: '+entry.path);}
 return {manifest,files};
}
export async function restoreReleaseSource(bytes,{manifest,directory}){
 const verified=verifyReleaseSource(bytes,manifest),target=resolve(directory);
 try{await lstat(target);throw new Error('Restore destination already exists');}catch(error){if(error.code!=='ENOENT')throw error;}
 await mkdir(dirname(target),{recursive:true});const staging=await mkdtemp(resolve(dirname(target),'.gg-release-source-'));
 try{
  for(const [path,file] of verified.files){const destination=resolve(staging,path);await mkdir(dirname(destination),{recursive:true});await writeFile(destination,file,{flag:'wx',mode:0o644});}
  await rename(staging,target);
 }catch(error){await rm(staging,{recursive:true,force:true});throw error;}
 return {directory:target,workspaceRoot:resolve(target,'workspace'),projectRoot:resolve(target,'workspace/guategeeks-code-studio')};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [archive,manifest,directory]=process.argv.slice(2);if(!archive||!manifest||!directory)throw new Error('Usage: node restore.mjs source.tar.gz source-manifest.json NEW_DIRECTORY');
 const result=await restoreReleaseSource(await readFile(archive),{manifest:JSON.parse(await readFile(manifest,'utf8')),directory});console.log(JSON.stringify(result));
}
