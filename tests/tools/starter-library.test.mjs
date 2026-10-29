import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {buildStarterLibrary,starterLibraryLock,readStarterLibraryLock,starterLibraryDefinitions} from '../../tools/resources/starter-library.mjs';
import {sanitizeSvg} from '../../src/contracts/media-svg.mjs';
import {inspectWavPcm16} from '../../src/contracts/media-wav.mjs';
import {validateStarterLibrary} from '../../src/contracts/starter-library.mjs';
import {createReleaseSnapshot} from '../../tools/build/release-snapshot.mjs';
import {offlineRoles} from '../../src/offline/contracts.mjs';
import {offlineFixture} from '../helpers/offline-fixture.mjs';

test('GG-LIB-001: generation is byte-identical and reproduces the versioned lock',()=>{
  const first=buildStarterLibrary(),second=buildStarterLibrary();
  assert.ok(first.bytes.equals(second.bytes));
  assert.deepEqual(starterLibraryLock(first),readStarterLibraryLock());
  assert.deepEqual(readStarterLibraryLock().counts,{costume:20,backdrop:8,sound:10});
  assert.equal(starterLibraryDefinitions.length,38);
});

test('GG-LIB-001/003: every medium is passive canonical SVG or short PCM16 WAV, with Spanish names',()=>{
  const {bundle}=buildStarterLibrary(),library=validateStarterLibrary(bundle);
  for(const entry of library.entries){
    const bytes=Buffer.from(entry.data,'base64');
    assert.match(entry.name,/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ ]+$/,entry.id);
    if(entry.format==='svg'){
      const safe=sanitizeSvg(new Uint8Array(bytes));
      assert.ok(Buffer.from(safe.bytes).equals(bytes),entry.id+' canónico');
      assert.doesNotMatch(bytes.toString('utf8'),/href|url\(|<text|<image|<script/i,entry.id);
    } else {
      const info=inspectWavPcm16(new Uint8Array(bytes));
      assert.deepEqual([info.channels,info.sampleRate],[1,22050],entry.id);assert.ok(info.duration<=1.5,entry.id);
    }
  }
});

test('GG-LIB-004: the release snapshot publishes the bundle once, in the Studio offline pack',async t=>{
  const fixture=await offlineFixture();t.after(fixture.cleanup);
  const built=buildStarterLibrary();
  await writeFile(join(fixture.browserRoot,'shell','starter-library.json'),built.bytes);
  const snapshot=await createReleaseSnapshot({browserRoot:fixture.browserRoot,releaseRoot:fixture.releaseRoot,origins:fixture.origins});
  for(const role of offlineRoles){
    const manifest=JSON.parse(await readFile(snapshot.resolveRoute(role,snapshot.releaseBase+'manifest.json').filePath));
    const entry=manifest.entries.find(item=>item.path==='starter-library.json');
    if(role!=='shell'){assert.equal(entry,undefined,role);continue;}
    assert.deepEqual(entry,{path:'starter-library.json',bytes:built.bytes.length,sha256:built.sha256,contentType:'application/json; charset=utf-8',packs:['studio-core']});
    const served=await readFile(snapshot.resolveRoute('shell',snapshot.releaseBase+'starter-library.json').filePath);
    assert.ok(served.equals(built.bytes),'publicado sin reescritura');
  }
  const gzip=gzipSync(built.bytes,{level:9}).length;
  t.diagnostic(`starter-library.json: ${built.bytes.length} bytes sin comprimir, ${gzip} con gzip -9`);
  assert.ok(built.bytes.length<1024*1024&&gzip<built.bytes.length);
});
