import {clickVisible,clickStagePoint,revealPanel,revealControl,settled} from './workspace-controls.mjs';
import {test, expect, chromium} from '@playwright/test';
import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import JSZip from 'jszip';
import {artifactPath} from './artifacts.mjs';
import {ports} from './origins.mjs';
import {crc32} from '../../src/contracts/sb3-archive.mjs';
import {inspectWavPcm16} from '../../src/contracts/media-wav.mjs';
import {decodeResourceAsset} from '../../src/contracts/resources.mjs';

const directory = new URL('../fixtures/sb3/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', directory), 'utf8'));
const fixturePath = file => fileURLToPath(new URL(file, directory));
const snapshot = page => page.evaluate(() => studioProbe.request('snapshot'));
const resources = page => page.evaluate(() => studioProbe.resourceStore.capture());
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
// Controls in menus or consultation panels are revealed as a learner would.
async function click(page,selector){await clickVisible(page,page.locator(selector));}
async function open(page) {
  await page.goto('/');
  await expect(page.locator('#run-editor')).toBeEnabled();
  await page.evaluate(() => studioProbe.project.ready());
  await page.locator('#authoring-context').selectOption('sb3');
  await expect(page.locator('#import-sb3')).toBeEnabled();
}
async function importFixture(page, item) {
  await page.locator('#authoring-context').selectOption('sb3');
  await page.locator('#import-sb3').setInputFiles(fixturePath(item.file));
  await expect(page.locator('#resources-status')).toHaveText('Autoría actualizada · sin ejecutar');
  await expect(page.locator('#resources-error')).toBeEmpty();
  await expect.poll(() => page.evaluate(() => studioProbe.resourcesUI.state().report?.status ?? null)).toBe(item.expected.status);
}
async function runScratch(page) {
  await click(page, '#run-sb3');
  await expect(page.locator('#status')).toHaveText('Proyecto Scratch activo');
}
async function stopScratch(page) {
  const session = await page.evaluate(() => studioProbe.state().sessionId);
  await click(page, '#stop-result');
  await expect(page.locator('#run-editor')).toBeEnabled();
  await expect.poll(() => page.evaluate(() => studioProbe.state().sessionId)).not.toBe(session);
}
async function download(page, selector, file) {
  const event = page.waitForEvent('download');
  await click(page, selector);
  const result = await event, path = artifactPath(file);
  await result.saveAs(path); return path;
}
function pngFixture() {
  const chunk = (type, data = Buffer.alloc(0)) => {
    const result = Buffer.alloc(data.length + 12); result.writeUInt32BE(data.length); result.write(type, 4);
    data.copy(result, 8); result.writeUInt32BE(crc32(result.subarray(4, -4)), result.length - 4); return result;
  };
  const header = Buffer.alloc(13); header.writeUInt32BE(4); header.writeUInt32BE(4, 4); header[8] = 8; header[9] = 6;
  const pixels = Buffer.alloc(4 * 17);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) pixels.set(x === 0 ? [255, 0, 0, 255] : [0, 80, 220, 255], y * 17 + 1 + x * 4);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND')]);
}
async function settleEdit(page) {
  await expect(page.locator('#resources-status')).toHaveText('Autoría actualizada · sin ejecutar');
  await expect(page.locator('#cancel-resource-work')).toBeHidden();
  await expect(page.locator('#resources-error')).toBeEmpty();
}
async function previewPixel(page) {
  return page.locator('#resource-image').evaluate(image => {
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
    return {width: canvas.width, height: canvas.height, pixel: [...context.getImageData(0, 0, 1, 1).data]};
  });
}

for (const mobile of [false, true]) test('GG-SB3/ASSET: real import → run/Stop → original SHA → editable copy → media edits → portable reopen (' + (mobile ? 'mobile' : 'desktop') + ')', async ({page, browser}) => {
  test.setTimeout(120000);
  if (mobile) await page.setViewportSize({width: 390, height: 844});
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await open(page);
  const createdAt = await page.evaluate(async () => (await studioProbe.project.capture()).project.createdAt);
  const item = manifest.fixtures[0], beforeBlocks = await page.evaluate(() => studioProbe.editor.save());
  await importFixture(page, item);
  expect(await page.evaluate(async () => (await studioProbe.project.capture()).project.createdAt)).toBe(createdAt);
  expect(await page.evaluate(() => studioProbe.editor.save())).toEqual(beforeBlocks);
  expect((await snapshot(page)).mode).not.toBe('compatibility');
  await runScratch(page);
  await expect.poll(async () => (await settled(snapshot, page)).targets.find(target => target.name === 'hero')?.x).toBe(10);
  const ran = await snapshot(page); expect(ran.mode).toBe('compatibility'); expect(ran.bluePixels).toBeGreaterThan(0);
  if(!await page.locator('#sb3-coverage-panel').evaluate(panel=>panel.open))await clickVisible(page.locator('#sb3-coverage-panel > summary'));
  await page.locator('#sb3-heading').scrollIntoViewIfNeeded();
  await page.screenshot({path: artifactPath('sb3-coverage-' + (mobile ? 'mobile' : 'desktop') + '.png')});
  await clickVisible(page.locator('#sb3-coverage-panel > summary'));
  const originalPath = await download(page, '#download-original-sb3', 'sb3-original-' + (mobile ? 'mobile' : 'desktop') + '.sb3');
  expect(hash(await readFile(originalPath))).toBe(item.sha256);
  await stopScratch(page);
  await click(page, '#copy-sb3-blocks');
  await expect(page.locator('#authoring-context')).toHaveValue('2d');
  await expect(page.locator('#resources-error')).toBeEmpty();
  expect((await snapshot(page)).x).toBe(0);
  await click(page, '#run-editor'); await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
  await expect.poll(async () => (await settled(snapshot, page)).x).toBe(10);
  await revealPanel(page,page.locator('#resources-panel'));if(!await page.locator('#resources-panel').evaluate(node=>node.open))await clickVisible(page.locator('#resources-panel > summary'));
  await page.locator('#import-media').setInputFiles({name: 'Colores.png', mimeType: 'image/png', buffer: pngFixture()});
  await settleEdit(page);
  const selectedCostume = await page.locator('#resource-list').inputValue();
  await expect.poll(() => page.locator('#resource-image').evaluate(image => image.complete && image.naturalWidth)).toBe(4);
  expect(await previewPixel(page)).toEqual({width: 4, height: 4, pixel: [255, 0, 0, 255]});
  await expect(page.locator('#crop-width')).toHaveValue('4');await expect(page.locator('#crop-height')).toHaveValue('4');
  await revealPanel(page,page.locator('#resource-name'));await page.locator('#resource-name').fill('Disfraz azul propio'); await click(page, '#rename-resource'); await settleEdit(page);
  await revealPanel(page,page.locator('#center-x'));await page.locator('#center-x').fill('2'); await revealPanel(page,page.locator('#center-y'));await page.locator('#center-y').fill('3'); await click(page, '#set-resource-center'); await settleEdit(page);
  await clickVisible(page.getByText('Recortar PNG', {exact: true}));
  for (const [key, value] of Object.entries({x: 1, y: 1, width: 2, height: 2})) await page.locator('#crop-' + key).fill(String(value));
  const beforeCrop = await resources(page), costumeId = selectedCostume.slice('costumes|'.length);
  await click(page, '#crop-resource'); await settleEdit(page);
  await expect.poll(() => page.locator('#resource-image').evaluate(image => image.complete && image.naturalWidth)).toBe(2);
  expect(await previewPixel(page)).toEqual({width: 2, height: 2, pixel: [0, 80, 220, 255]});
  const cropped = await resources(page), costume = cropped.costumes.find(value => value.id === costumeId);
  expect(costume).toMatchObject({name: 'Disfraz azul propio', centerX: 1, centerY: 2});
  expect(costume.assetId).not.toBe(beforeCrop.costumes.find(value => value.id === costumeId).assetId);
  await revealControl(page,page.locator('#resources-panel'));await page.getByRole('heading', {name: 'Disfraces y sonidos', exact: true}).scrollIntoViewIfNeeded();
  await page.screenshot({path: artifactPath('sb3-resource-image-' + (mobile ? 'mobile' : 'desktop') + '.png')});
  const audioZip = await JSZip.loadAsync(await readFile(fixturePath('09-sound.sb3')));
  const wav = await audioZip.file(Object.keys(audioZip.files).find(name => name.endsWith('.wav'))).async('nodebuffer');
  await page.locator('#import-media').setInputFiles({name: 'Pulso.wav', mimeType: 'audio/wav', buffer: wav}); await settleEdit(page);
  const selectedSound = await page.locator('#resource-list').inputValue();
  await expect(page.locator('#resource-audio')).toBeVisible();
  await expect(page.locator('#audio-start')).toHaveValue('0');await expect(page.locator('#audio-end')).toHaveValue('160');await expect(page.locator('#audio-gain')).toHaveValue('1');
  await clickVisible(page.getByText('Recortar o ajustar sonido WAV', {exact: true}));
  await revealPanel(page,page.locator('#audio-start'));await page.locator('#audio-start').fill('0'); await revealPanel(page,page.locator('#audio-end'));await page.locator('#audio-end').fill('80'); await revealPanel(page,page.locator('#audio-gain'));await page.locator('#audio-gain').fill('2');
  await click(page, '#edit-resource-audio'); await settleEdit(page);
  const editedResources = await resources(page), sound = editedResources.sounds.find(value => value.id === selectedSound.slice('sounds|'.length));
  const pcm = decodeResourceAsset(editedResources.assets[sound.assetId]), info = inspectWavPcm16(pcm);
  expect(info).toMatchObject({frames: 80, sampleRate: 8000, channels: 1, duration: 0.01});
  expect(new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength).getInt16(info.dataOffset + 2, true)).toBe(3062);
  expect(hash(decodeResourceAsset(editedResources.assets[item.sha256]))).toBe(item.sha256);
  expect(await page.evaluate(async () => (await studioProbe.project.capture()).project.createdAt)).toBe(createdAt);
  const projectPath = await download(page, '#save-project', 'sb3-resources-' + (mobile ? 'mobile' : 'desktop') + '.ggproj');
  const savedArchive=await JSZip.loadAsync(await readFile(projectPath));
  expect(JSON.parse(await savedArchive.file('manifest.json').async('string')).project.createdAt).toBe(createdAt);
  const editorState = await page.evaluate(() => studioProbe.editor.save());
  await page.screenshot({path: artifactPath('sb3-resources-' + (mobile ? 'mobile' : 'desktop') + '.png')});
  const context = await browser.newContext({viewport: mobile ? {width:390,height:844} : {width:1280,height:900}});
  try {
    const reopened = await context.newPage(); await reopened.goto('/'); await expect(reopened.locator('#open-project')).toBeEnabled();
    await reopened.locator('#open-project').setInputFiles(projectPath); await expect(reopened.locator('#project-status')).toHaveText('Guardado en este navegador');
    expect(await reopened.evaluate(async () => (await studioProbe.project.capture()).project.createdAt)).toBe(createdAt);
    expect(await resources(reopened)).toEqual(editedResources); expect(await reopened.evaluate(() => studioProbe.editor.save())).toEqual(editorState);
    await click(reopened, '#run-editor');
    await expect(reopened.locator('#status')).toHaveText('Bloques ejecutados');
    await expect.poll(async () => (await snapshot(reopened)).x).toBe(10);
    await reopened.locator('#authoring-context').selectOption('sb3'); await expect(reopened.locator('#run-sb3')).toBeEnabled();
    expect(hash(await readFile(await download(reopened, '#download-original-sb3', 'sb3-reopened-original-' + (mobile ? 'mobile' : 'desktop') + '.sb3')))).toBe(item.sha256);
  } finally { await context.close(); }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(mobile ? 390 : 1280);
  expect(errors).toEqual([]);
  await writeFile(artifactPath('sb3-resources-' + (mobile ? 'mobile' : 'desktop') + '.json'), JSON.stringify({ran, originalSha: item.sha256, costume, audio: info, errors}, null, 2));
});

// One test per public fixture (each with its own time budget), sharing one
// browser launched with autoplay enabled. Same assertions as the former single
// 240 s test, which failed under load on the shared machine.
async function runPublicFixture(browser, item, results) {
      // Each complete project starts from a cold, independent authoring store;
      // the corpus is not an attempt to bypass the four-original quota.
      const context = await browser.newContext();
      try {
        const page = await context.newPage(), errors = [], outside = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('request', request => { if (!['127.0.0.1','localhost'].includes(new URL(request.url()).hostname) && /^https?:/.test(request.url())) outside.push(request.url()); });
        await open(page); await importFixture(page, item);
        const report = await page.evaluate(() => studioProbe.resourcesUI.state().report);
        const original = (await resources(page)).assets[item.sha256];
        expect(original.type).toBe('Source'); expect(hash(decodeResourceAsset(original))).toBe(item.sha256);
        expect(report.coverage.length).toBeGreaterThan(0);
        if (item.expected.status === 'unsupported') {
          await expect(page.locator('#run-sb3')).toBeDisabled(); await expect(page.locator('#copy-sb3-blocks')).toBeDisabled();
          await expect(page.locator('#sb3-summary')).toContainText('Ejecución bloqueada');
          expect(report.coverage.some(row => row.status === 'unsupported')).toBe(true);
          const before = await snapshot(page);
          const outcome = await page.evaluate(async () => { try { await studioProbe.runCompatibility(); return 'executed'; } catch (error) { return error.message; } });
          expect(outcome).toMatch(/blocked|bloquead/i);
          const after = await snapshot(page);
          expect({mode: after.mode, revision: after.revision, targets: after.targets}).toEqual({mode: before.mode, revision: before.revision, targets: before.targets});
          const path = await download(page, '#download-original-sb3', 'sb3-corpus-' + item.id + '-original.sb3');
          expect(hash(await readFile(path))).toBe(item.sha256);
          results.push({id: item.id, expected: item.expected, status: report.status, blocked: true, originalSha: item.sha256});
        } else {
          await expect(page.locator('#run-sb3')).toBeEnabled();
          if (item.expected.status === 'vm-compatible') await expect(page.locator('#copy-sb3-blocks')).toBeDisabled();
          await runScratch(page);
          if (item.expected.audio) {
            const pending = await snapshot(page);
            expect(pending.audio.available).toBe(true);
            // A real parent Run gesture may already authorize Chromium audio.
            // Never click again and send a second green flag in that branch.
            if (pending.pendingAudioStart) {
              expect(pending.targets.every(target => target.x === 0)).toBe(true);
              const audioButton = page.frameLocator('#runner-slot iframe').getByRole('button', {name: 'Activar audio e iniciar', exact: true});
              await expect(audioButton).toBeVisible(); await clickVisible(audioButton);
            }
            await expect.poll(async () => (await settled(snapshot, page)).audio.contextState).toBe('running');
          }
          const canvas = page.frameLocator('#runner-slot iframe').locator('#stage');
          if (item.expected.trigger === 'key') { await canvas.focus(); await canvas.press('Space'); }
          if (item.expected.trigger === 'click') {
            // The fixture's opaque 16px costume is anchored at its top-left.
            await clickStagePoint(page,canvas,4,-4);
          }
          if (Object.hasOwn(item.expected, 'x')) await expect.poll(async () => (await settled(snapshot, page)).targets.find(target => target.name === 'hero' && target.isOriginal)?.x).toBe(item.expected.x);
          for (const [name, x] of Object.entries(item.expected.sprites ?? {})) await expect.poll(async () => (await settled(snapshot, page)).targets.find(target => target.name === name && target.isOriginal)?.x).toBe(x);
          for (const [id, value] of Object.entries(item.expected.variables ?? {})) await expect.poll(async () => (await settled(snapshot, page)).targets.find(target => target.name === 'hero')?.variables[id]?.value).toEqual(value);
          for (const [id, value] of Object.entries(item.expected.globalVariables ?? {})) await expect.poll(async () => (await settled(snapshot, page)).globalVariables[id]?.value).toEqual(value);
          for (const [id, value] of Object.entries(item.expected.lists ?? {})) await expect.poll(async () => (await settled(snapshot, page)).targets.find(target => target.name === 'hero')?.variables[id]?.value).toEqual(value);
          if (Object.hasOwn(item.expected, 'visible')) await expect.poll(async () => (await settled(snapshot, page)).targets.find(target => target.name === 'hero')?.visible).toBe(item.expected.visible);
          if (Object.hasOwn(item.expected, 'costume')) await expect.poll(async () => (await settled(snapshot, page)).targets.find(target => target.name === 'hero')?.costume.index).toBe(item.expected.costume);
          const ran = await snapshot(page);
          for (const [effect, value] of Object.entries(item.expected.effects ?? {})) expect(ran.targets.find(target => target.name === 'hero').effects[effect]).toBe(value);
          expect(ran.mode).toBe('compatibility');
          if (item.id === '01-start' || item.id === '17-svg-audio') expect(ran.bluePixels).toBeGreaterThan(0);
          if (item.expected.transparent) { expect(ran.bluePixels).toBe(0); expect(ran.targets.find(target => target.name === 'hero').visible).toBe(true); }
          await stopScratch(page);
          expect((await snapshot(page)).mode).not.toBe('compatibility');
          let copied = null;
          if (item.expected.status === 'gg-editable') {
            await click(page, '#copy-sb3-blocks');
            await expect(page.locator('#authoring-context')).toHaveValue('2d');
            await expect(page.locator('#resources-error')).toBeEmpty();
            expect((await snapshot(page)).x).toBe(0);
            await click(page, '#run-editor'); await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
            const copyStart = await snapshot(page);
            if (item.expected.audio) expect(copyStart.audio.contextState).toBe('running');
            const copiedCanvas = page.frameLocator('#runner-slot iframe').locator('#stage');
            if (item.expected.trigger === 'key') { await copiedCanvas.focus(); await copiedCanvas.press('Space'); }
            if (item.expected.trigger === 'click') {
              await clickStagePoint(page,copiedCanvas,4,-4);
            }
            await expect.poll(async () => (await settled(snapshot, page)).x).toBe(item.expected.x);
            for (const [id,value] of Object.entries(item.expected.variables??{})) await expect.poll(async () => (await settled(snapshot, page)).variables[id]?.value).toEqual(value);
            for (const [id,value] of Object.entries(item.expected.globalVariables??{})) await expect.poll(async () => (await settled(snapshot, page)).globalVariables[id]?.value).toEqual(value);
            copied = await snapshot(page);expect(copied.mode).toBe('native');
            if (item.expected.costume !== undefined) {
              const costumeId=await page.evaluate(()=>studioProbe.editor.program().scripts.flatMap(script=>script.body).find(node=>node.kind==='setCostume').costume);
              expect(copied.costume.name).toBe(costumeId);
            }
          }
          results.push({id: item.id, expected: item.expected, status: report.status, originalSha: item.sha256, ran, copied});
        }
        expect(errors).toEqual([]); expect(outside).toEqual([]);
      } finally { await context.close(); }
}
test.describe('GG-SB3-005: public SB3 corpus', () => {
  let browser;
  const results = [];
  // One green flag per backend. Native "Reproducir sonido" deliberately starts
  // another flag; the separate suspended-context test below covers that gesture.
  test.beforeAll(async () => { browser = await chromium.launch({args: ['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']}); });
  test.afterAll(async () => {
    try { await writeFile(artifactPath('sb3-corpus-browser.json'), JSON.stringify({license: manifest.license, results}, null, 2)); }
    finally { await browser?.close(); }
  });
  test('GG-SB3-005: the corpus declares twenty public files', () => { expect(manifest.fixtures).toHaveLength(20); });
  for (const item of manifest.fixtures) test('GG-SB3-005: ' + item.id + ' · ' + item.title + ' executes its declared native behavior or remains entirely blocked', async () => {
    test.setTimeout(90000);
    await runPublicFixture(browser, item, results);
  });
  test('GG-SB3-005: exactly three public files remain blocked after the whole corpus', () => {
    expect(results).toHaveLength(manifest.fixtures.length);
    expect(results.filter(item => item.blocked)).toHaveLength(3);
  });
});

test('GG-SB3-003: a genuinely suspended AudioContext defers start, Stop revokes it, and a fresh in-frame gesture starts once', async ({browser}) => {
  test.setTimeout(60000);
  const context=await browser.newContext();
  await context.addInitScript(runnerPort=>{
    if(location.port!==runnerPort)return; // Runner origin of this run (partitions use other ports).
    const Native=window.AudioContext,contexts=[];
    window.AudioContext=class extends Native {constructor(...args){super(...args);contexts.push(this);}};
    const post=MessagePort.prototype.postMessage;let suspended=false;
    MessagePort.prototype.postMessage=function(data,...rest){
      // Hold only the first committed compatibility result until the actual
      // native context is suspended. No audio graph, PCM or state is faked.
      if(!suspended&&data?.type==='result'&&data.result?.mode==='compatibility'&&contexts.length){
        suspended=true;const port=this;contexts.at(-1).suspend().then(()=>post.call(port,data,...rest));return;
      }
      return post.call(this,data,...rest);
    };
  }, String(ports.runner));
  try {
    const page=await context.newPage();await open(page);await importFixture(page,manifest.fixtures.find(item=>item.id==='09-sound'));
    await runScratch(page);
    const pending=await snapshot(page);expect(pending.pendingAudioStart).toBe(true);expect(pending.audio.contextState).toBe('suspended');expect(pending.x).toBe(0);expect(pending.audio.events).toEqual([]);
    await stopScratch(page);expect((await snapshot(page)).x).toBe(0);
    await runScratch(page);expect((await snapshot(page)).pendingAudioStart).toBe(true);
    const startAudio=page.frameLocator('#runner-slot iframe').getByRole('button',{name:'Activar audio e iniciar',exact:true});
    await expect(startAudio).toBeVisible();await clickVisible(startAudio);
    await expect.poll(async () => (await settled(snapshot, page)).x).toBe(4);
    const ran=await snapshot(page);expect(ran.audio.contextState).toBe('running');expect(ran.audio.events.filter(event=>event.type==='play')).toHaveLength(1);expect(ran.pendingAudioStart).toBe(false);
    await stopScratch(page);expect((await snapshot(page)).x).toBe(0);
    await writeFile(artifactPath('sb3-audio-deferred.json'),JSON.stringify({pending,ran},null,2));
  } finally {await context.close();}
});

test('GG-ASSET-003: gain-only editing preserves every frame of a long stereo WAV through portable reopen',async({page,browser})=>{
  test.setTimeout(60000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const frames=18000,channels=2,sampleRate=12000;
  const original=Buffer.alloc(44+frames*channels*2);
  original.write('RIFF');original.writeUInt32LE(original.length-8,4);original.write('WAVEfmt ',8);original.writeUInt32LE(16,16);
  original.writeUInt16LE(1,20);original.writeUInt16LE(channels,22);original.writeUInt32LE(sampleRate,24);original.writeUInt32LE(sampleRate*channels*2,28);
  original.writeUInt16LE(channels*2,32);original.writeUInt16LE(16,34);original.write('data',36);original.writeUInt32LE(frames*channels*2,40);
  for(let frame=0;frame<frames;frame++){
    original.writeInt16LE((frame%31-15)*400,44+frame*4);
    original.writeInt16LE((frame%17-8)*600,46+frame*4);
  }
  const expected=Buffer.from(original);
  for(let offset=44;offset<expected.length;offset+=2)expected.writeInt16LE(original.readInt16LE(offset)*2,offset);
  expect(original.length).toBeLessThan(131072);
  await open(page);await revealPanel(page,page.locator('#resources-panel'));if(!await page.locator('#resources-panel').evaluate(node=>node.open))await clickVisible(page.locator('#resources-panel > summary'));
  await page.locator('#import-media').setInputFiles({name:'Estéreo completo.wav',mimeType:'audio/wav',buffer:original});await settleEdit(page);
  const selected=await page.locator('#resource-list').inputValue(),soundId=selected.slice('sounds|'.length);
  await clickVisible(page.getByText('Recortar o ajustar sonido WAV',{exact:true}));
  const description='18000 muestras por canal · 2 canal(es) · 12000 Hz · 1.500 s';
  await expect(page.locator('#resource-audio-info')).toHaveText(description);
  await expect(page.locator('#audio-start')).toHaveValue('0');await expect(page.locator('#audio-end')).toHaveValue('18000');await expect(page.locator('#audio-gain')).toHaveValue('1');
  // Only gain is edited. The untouched defaults must mean the entire sound,
  // including both channels and the samples beyond the old 8000-frame cutoff.
  await revealPanel(page,page.locator('#audio-gain'));await page.locator('#audio-gain').fill('2');await click(page,'#edit-resource-audio');await settleEdit(page);
  const edited=await resources(page),sound=edited.sounds.find(item=>item.id===soundId),bytes=decodeResourceAsset(edited.assets[sound.assetId]);
  const info=inspectWavPcm16(bytes);
  expect(info).toMatchObject({frames,channels,sampleRate,duration:1.5});
  expect(Buffer.from(bytes)).toEqual(expected);
  expect(sound.assetId).not.toBe(hash(original));
  await expect(page.locator('#resource-audio-info')).toHaveText(description);
  await expect(page.locator('#audio-start')).toHaveValue('0');await expect(page.locator('#audio-end')).toHaveValue('18000');
  const projectPath=await download(page,'#save-project','sb3-gain-only-full-wav.ggproj');
  const context=await browser.newContext();
  try{
    const reopened=await context.newPage();reopened.on('pageerror',error=>errors.push(error.message));
    await reopened.goto('/');await expect(reopened.locator('#open-project')).toBeEnabled();await reopened.locator('#open-project').setInputFiles(projectPath);
    await expect(reopened.locator('#project-status')).toHaveText('Guardado en este navegador');
    const restored=await resources(reopened),restoredSound=restored.sounds.find(item=>item.id===soundId);
    expect(Buffer.from(decodeResourceAsset(restored.assets[restoredSound.assetId]))).toEqual(expected);
    await revealPanel(reopened,reopened.locator('#resources-panel'));if(!await reopened.locator('#resources-panel').evaluate(node=>node.open))await clickVisible(reopened.locator('#resources-panel > summary'));await revealPanel(reopened,reopened.locator('#resource-list'));await reopened.locator('#resource-list').selectOption(selected);
    await clickVisible(reopened.getByText('Recortar o ajustar sonido WAV',{exact:true}));
    await expect(reopened.locator('#resource-audio-info')).toHaveText(description);await expect(reopened.locator('#audio-end')).toHaveValue('18000');
  }finally{await context.close();}
  expect(errors).toEqual([]);
  await writeFile(artifactPath('sb3-gain-only-full-wav.json'),JSON.stringify({originalFrames:frames,edited:info,sourceBytes:original.length,editedBytes:bytes.length,sha256:sound.assetId,errors},null,2));
});
