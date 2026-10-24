import test from 'node:test';
import assert from 'node:assert/strict';
import {releaseMaterialsFixture} from '../helpers/standalone-fixture.mjs';
import {releaseMaterialNames,releaseMaterialLimits,validateSourceManifest,validateReleaseSourcePath,validateReleaseMaterialSet} from '../../src/contracts/release-materials.mjs';
const manifest=files=>JSON.parse(new TextDecoder().decode(files.get('source-manifest.json')));
test('GG-RELEASE-MATERIALS: complete inert files authenticate their source archive and produce detached snapshots',async()=>{
 const input=releaseMaterialsFixture(),before=manifest(input),pending=validateReleaseMaterialSet(input);input.get('source.tar.gz')[0]=0;
 const result=await pending;assert.deepEqual(result.manifest,before);assert.equal(result.files.get('source.tar.gz')[0],31);assert.deepEqual([...result.files.keys()],releaseMaterialNames);
 result.manifest.provenance.toolchain.node='changed';assert.notEqual(before.provenance.toolchain.node,'changed');
});
test('GG-RELEASE-MATERIALS: metadata is closed, bounded, dense and references real typed inventory entries',()=>{
 const original=manifest(releaseMaterialsFixture());
 const cases=[
 value=>value.extra=true,value=>value.entries=Array(1),value=>value.entries.push(value.entries[0]),value=>value.entries[0].path='../escape',
 value=>value.sourceArchive.path='https://example.invalid/source.tar.gz',value=>value.sourceArchive.expandedBytes=1024,
 value=>value.sourceArchive.expandedBytes=releaseMaterialLimits.expandedBytes+512,value=>value.sourceArchive.bytes=releaseMaterialLimits.archiveBytes+1,
 value=>value.entries[0].bytes=releaseMaterialLimits.fileBytes+1,value=>value.entries[0].kind='module',
 value=>value.provenance.repositories[0].origin='https://user:secret@example.invalid/repo',value=>value.provenance.repositories[0].origin='https://example.invalid/repo?token=secret',
 value=>value.provenance.repositories[0].sourcePath='absent',value=>value.provenance.repositories[0].patches[0].sha256='0'.repeat(64),
 value=>value.provenance.prebuilts[0].recipe='absent.md',value=>value.provenance.locks[0].bytes++,
 value=>value.provenance.product.license='MIT',value=>value.limitations=Array(1),value=>value.limitations=['a'.repeat(4097)]
 ];
 for(const mutate of cases){const value=structuredClone(original);mutate(value);assert.throws(()=>validateSourceManifest(value));}
 let touched=false;const accessor=structuredClone(original);Object.defineProperty(accessor,'license',{enumerable:true,get(){touched=true;return'AGPL-3.0-only';}});assert.throws(()=>validateSourceManifest(accessor));assert.equal(touched,false);
});
test('GG-RELEASE-MATERIALS: safe source prefixes include reviewed workspace tool sources, never traversal or authority URLs',()=>{
 for(const path of ['workspace/.tools/pxt-core-source/main.ts','workspace/guategeeks-code-studio/LICENSE','BUILD.md'])assert.equal(validateReleaseSourcePath(path),path);
 for(const path of ['/root/source','C:/source','a/../b','a//b','a/./b','a/b/','a\\b','a%2fb','a?b','a#b','á','a\0b','a'.repeat(241)])assert.throws(()=>validateReleaseSourcePath(path));
});
test('GG-RELEASE-MATERIALS: missing, extra, invalid or altered transport files are rejected before publication',async()=>{
 for(const mutate of [files=>files.delete('LICENSE'),files=>files.set('evil.mjs',new Uint8Array([1])),files=>files.get('source.tar.gz')[0]^=1,files=>files.set('SBOM.json',new TextEncoder().encode('[]')),files=>files.set('LICENSE',new Uint8Array([255])),files=>files.set('source-manifest.json',new TextEncoder().encode('{}'))]){
  const files=releaseMaterialsFixture();mutate(files);await assert.rejects(()=>validateReleaseMaterialSet(files));
 }
});
