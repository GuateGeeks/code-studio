import {test, expect} from '@playwright/test';
import {readFile, writeFile, readdir, stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {cpus, totalmem, release, platform} from 'node:os';

const save = (name, value) => writeFile(`artifacts/f7-performance-${name}.json`, JSON.stringify(value, null, 2) + '\n');
const runnerFrame = page => page.frames().find(frame => frame.url().startsWith('http://127.0.0.1:4194/'));
const snapshot = page => page.evaluate(() => studioProbe.request('snapshot'));
const open = async page => { await page.goto('/'); await expect(page.locator('#run')).toBeEnabled(); await page.waitForFunction(()=>window.studioProbe?.project.state().ready); };
const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.ceil(values.length * p) - 1)];
const distribution = values => ({samples: values, median: percentile(values, 0.5), p95: percentile(values, 0.95), max: Math.max(...values)});

async function heap(page, frame = page) {
  const cdp = await page.context().newCDPSession(frame);
  await cdp.send('Performance.enable');
  await cdp.send('HeapProfiler.collectGarbage');
  const {metrics} = await cdp.send('Performance.getMetrics');
  const dom = await cdp.send('Memory.getDOMCounters');
  await cdp.detach();
  return {...Object.fromEntries(metrics.filter(metric => ['JSHeapUsedSize', 'JSHeapTotalSize'].includes(metric.name)).map(metric => [metric.name, metric.value])), dom};
}

test('F7-PERF-001: context-cold and warm reload startup, bundle bytes and scoped JS heap', async ({browser}) => {
  const cold = [];
  const warm = [];
  const memory = [];
  for (let sample = 0; sample < 3; sample++) {
    const context = await browser.newContext({viewport: {width: 1280, height: 900}});
    await context.addInitScript(() => {
      const observer = new MutationObserver(() => {
        const run = document.querySelector('#run');
        if (run && !run.disabled && window.studioProbe?.project.state().ready && window.__runnerReadyAt === undefined) {
          window.__runnerReadyAt = performance.now();
          observer.disconnect();
        }
      });
      observer.observe(document, {subtree: true, childList: true, attributes: true, attributeFilter: ['disabled']});
    });
    const page = await context.newPage();
    await open(page);
    cold.push(await page.evaluate(() => window.__runnerReadyAt));
    memory.push({shellTarget: await heap(page), runnerTarget: await heap(page, runnerFrame(page))});
    await page.reload();
    await expect(page.locator('#run')).toBeEnabled();
    warm.push(await page.evaluate(() => window.__runnerReadyAt));
    await context.close();
  }
  expect(cold.every(value => Number.isFinite(value) && value > 0)).toBe(true);
  expect(warm.every(value => Number.isFinite(value) && value > 0)).toBe(true);
  const manifest = JSON.parse(await readFile('artifacts/browser/build-manifest.json', 'utf8'));
  async function payloadBytes(root) {
    let bytes=0,files=0;
    for(const entry of await readdir(root,{withFileTypes:true})) {
      const path=resolve(root,entry.name);
      if(entry.isDirectory()){const nested=await payloadBytes(path);bytes+=nested.bytes;files+=nested.files;}
      else if(entry.isFile()){bytes+=(await stat(path)).size;files++;}
    }
    return {bytes,files};
  }
  const rolePayloads={};
  for(const role of ['shell','runner','simulator','language','scene3d','webapp'])rolePayloads[role]=await payloadBytes(resolve('artifacts/browser',role));
  const packBytes = (await stat('artifacts/browser/runner/compiler-pack.json')).size;
  const cdp = await browser.newBrowserCDPSession();
  const gpu = await cdp.send('SystemInfo.getInfo');
  await cdp.detach();
  await save('startup', {
    recordedAt: new Date().toISOString(),
    environment: {browser: browser.version(), node: process.version, platform: platform(), osRelease: release(), cpu: cpus()[0]?.model, logicalCpus: cpus().length, reportedSystemRamBytes: totalmem(), gpu: gpu.gpu, flag: '--enable-unsafe-swiftshader', schoolHardware: false},
    startupMs: {contextCold: distribution(cold), warmReload: distribution(warm)},
    startupMethod: 'Navigation start to rendered runner Run enabled and authoring project ready, recorded by MutationObserver in page. Three fresh contexts in one browser, each followed by one same-context reload. Cache-Control:no-store means both fetch assets again. This is context-cold / OS-and-engine-warm reload, not cold OS/browser process, offline cache, or production bundle startup.',
    memory, memoryScope: 'Post-GC CDP Performance.getMetrics per shell and runner target. Targets can share an isolate; do not sum their heaps. Excludes worker heaps, WebGL/GPU, audio native allocations and browser/OS process RSS.',
    rolePayloads, rolePayloadScope: 'Raw six browser trees including corresponding source archive/notices in shell, no compression or transfer measurement.',
    staticBuild: {builtAt: manifest.builtAt, files: manifest.files, listedBundleBytes: manifest.files.reduce((sum, file) => sum + file.bytes, 0), compilerPackBytes: packBytes, compression: 'Raw on-disk bytes from development build, not gzip/brotli transfer bytes.'}
  });
});

test('F7-PERF-002: ten Run/Stop cycles release frames, audio and workers and preserve edited authoring', async ({page}, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const workers = [];
  const workerObjects = new Map(), workerCheckpoints = [], frameHistory = [];
  let workerPhase = 'opening';
  page.on('frameattached', frame => frameHistory.push({event:'attached', phase:workerPhase, url:frame.url(), at:performance.now()}));
  page.on('framenavigated', frame => frameHistory.push({event:'navigated', phase:workerPhase, url:frame.url(), at:performance.now()}));
  page.on('framedetached', frame => frameHistory.push({event:'detached', phase:workerPhase, url:frame.url(), at:performance.now()}));
  page.on('worker', worker => {
    const tracked = {id:workers.length+1, url:worker.url(), closed:false, createdPhase:workerPhase, createdAt:performance.now()};
    workers.push(tracked); workerObjects.set(worker,tracked);
    worker.on('close', () => { tracked.closed=true; tracked.closedPhase=workerPhase; tracked.closedAt=performance.now(); });
  });
  async function workerCheckpoint(phase) {
    workerPhase=phase;
    const cdp=await page.context().newCDPSession(page);
    const {targetInfos}=await cdp.send('Target.getTargets');
    await cdp.detach();
    const checkpoint={phase,at:performance.now(),active:page.workers().map(worker=>({id:workerObjects.get(worker)?.id??null,url:worker.url()})),
      frames:page.frames().map(frame=>({url:frame.url(),parentURL:frame.parentFrame()?.url()??null})),
      targets:targetInfos.filter(target=>['worker','iframe','page'].includes(target.type)).map(({targetId,type,url,openerId,openerFrameId})=>({targetId,type,url,openerId,openerFrameId}))};
    workerCheckpoints.push(checkpoint);
    return checkpoint;
  }
  await open(page);
  // Scratch Storage 5.0.3 constructs one module-scoped FetchWorkerTool when
  // each runner starts. A fresh ready runner therefore has one idle fetch
  // worker; compare that exact observed role, not all dedicated workers to 0.
  await expect.poll(()=>page.workers().length).toBe(1);
  const bootstrapWorkers=await workerCheckpoint('bootstrap-ready');
  const idleWorkerURLs=bootstrapWorkers.active.map(worker=>worker.url).sort();
  expect(idleWorkerURLs).toHaveLength(1);
  expect(new URL(idleWorkerURLs[0]).pathname).toMatch(/\/vendor\/chunks\/fetch-worker\.[a-f0-9]+\.js$/);
  const field = page.locator('#blockly-editor [data-id="editable-move-n"] .blocklyText');
  await field.dblclick();
  await page.locator('.blocklyHtmlInput').fill('6');
  await page.locator('.blocklyHtmlInput').press('Enter');
  await expect(field).toHaveText('6');
  await page.locator('#source').fill('basic.showNumber(7)');
  const authoring = await page.evaluate(() => studioProbe.editor.save());
  const cycles = [];
  const initialHeap = await heap(page);
  for (let cycle = 1; cycle <= 10; cycle++) {
    workerPhase=`cycle-${cycle}-run`;
    await page.getByRole('button', {name: 'Ejecutar bloques', exact: true}).click();
    await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
    await expect.poll(async () => (await snapshot(page)).x).toBe(18);
    await page.evaluate(() => studioProbe.request('load-corpus', {name: 'audio'}));
    const oldFrame = runnerFrame(page);
    const cdp = await page.context().newCDPSession(oldFrame);
    const contexts = []; const closed = []; const destroyed = [];
    cdp.on('WebAudio.contextCreated', event => contexts.push(event.context.contextId));
    cdp.on('WebAudio.contextChanged', event => { if (event.context.contextState === 'closed') closed.push(event.context.contextId); });
    cdp.on('WebAudio.contextWillBeDestroyed', event => destroyed.push(event.contextId));
    await cdp.send('WebAudio.enable');
    await expect.poll(() => contexts.length).toBeGreaterThan(0);
    await page.evaluate(() => studioProbe.request('start-loop-worker'));
    // Exercise both worker types during the experiment without recompiling 10 times.
    if (cycle === 1 || cycle === 10) await page.evaluate(() => studioProbe.request('prepare-compiler'));
    await page.locator('#runner-slot').scrollIntoViewIfNeeded();
    await page.frameLocator('#runner-slot iframe').getByRole('button', {name: 'Reproducir sonido', exact: true}).click();
    await expect.poll(async () => (await snapshot(page)).audio.rms).toBeGreaterThan(0.01);
    const playing = await snapshot(page);
    const activeWorkers = workers.filter(worker => !worker.closed).map(worker => worker.url);
    const oldWorkers=workers.filter(worker=>!worker.closed);
    await workerCheckpoint(`cycle-${cycle}-before-stop`);
    expect(activeWorkers.some(url => url.endsWith('/loop-worker.js'))).toBe(true);
    await page.evaluate(() => {
      window.__stopMeasurement = new Promise(resolve => {
        const button = document.querySelector('#stop-result');
        let start; let removedMs; let feedback; let observer;
        document.addEventListener('click', event => {
          if (event.target !== button) return;
          start = performance.now();
          const oldFrame = document.querySelector('#runner-slot iframe');
          observer = new MutationObserver(() => {
            if (!oldFrame.isConnected && removedMs === undefined) removedMs = performance.now() - start;
          });
          observer.observe(document.querySelector('#runner-slot'), {childList: true});
          feedback = new Promise(done => requestAnimationFrame(() => done({feedbackMs: performance.now() - start, disabled: document.querySelector('#run').disabled})));
        }, {once: true, capture: true});
        // Registered after the product's button listener: reset has already
        // invalidated the session and assigned the new ready promise here.
        button.addEventListener('click', async () => {
            const sessionInvalidated = studioProbe.state().sessionId === null;
            await studioProbe.ready();
            const readyMs = performance.now() - start;
            const firstFrame = await feedback;
            observer.disconnect();
            resolve({...firstFrame, sessionInvalidated, removedMs, readyMs});
        }, {once: true});
      });
    });
    await page.getByRole('button', {name:'Detener',exact:true}).click();
    const stop = await page.evaluate(() => window.__stopMeasurement);
    await expect(page.locator('#run')).toBeEnabled();
    expect(oldFrame.isDetached()).toBe(true);
    await expect.poll(() => contexts.every(id => closed.includes(id) || destroyed.includes(id))).toBe(true);
    await workerCheckpoint(`cycle-${cycle}-fresh-ready`);
    try {
      await expect.poll(()=>oldWorkers.every(worker=>worker.closed)).toBe(true);
      await expect.poll(()=>page.workers().map(worker=>worker.url()).sort()).toEqual(idleWorkerURLs);
      expect(workers.filter(worker=>!worker.closed).map(worker=>worker.url).sort()).toEqual(idleWorkerURLs);
      expect(page.workers().every(worker=>!oldWorkers.includes(workerObjects.get(worker)))).toBe(true);
      expect(page.workers().filter(worker=>/\/(loop-worker|compiler-worker)\.js$/.test(worker.url()))).toHaveLength(0);
    } catch(error) {
      await workerCheckpoint(`cycle-${cycle}-worker-lifecycle-failed`);
      const diagnostic={idleWorkerURLs,workers,workerCheckpoints,frameHistory};
      await save('worker-diagnostic',diagnostic);
      await testInfo.attach('worker-lifecycle',{body:JSON.stringify(diagnostic,null,2),contentType:'application/json'});
      console.log('F7-PERF-002 worker lifecycle',JSON.stringify(diagnostic));
      throw error;
    }
    expect(page.frames()).toHaveLength(2);
    expect(await page.evaluate(() => studioProbe.editor.save())).toEqual(authoring);
    expect(await page.locator('#source').inputValue()).toBe('basic.showNumber(7)');
    expect(stop.disabled).toBe(true);
    expect(stop.sessionInvalidated).toBe(true);
    const after = await snapshot(page);
    expect(after.threads).toBe(0);
    expect(after.audio.available).toBe(false);
    cycles.push({cycle, stop, playing: {rms: playing.audio.rms, contextState: playing.audio.contextState}, contexts, closed, destroyed, oldFrameDetached: oldFrame.isDetached(), remainingFramesIncludingShell: page.frames().length, activeWorkersBeforeStop: activeWorkers, oldWorkerIds:oldWorkers.map(worker=>worker.id), allOldWorkersClosed:oldWorkers.every(worker=>worker.closed), remainingWorkers:workers.filter(worker=>!worker.closed).map(worker=>({id:worker.id,url:worker.url})), remainingProgramWorkers:0, afterStop: {threads: after.threads, audioAvailable: after.audio.available}, authoringPreserved: true, shellTargetHeap: await heap(page)});
  }
  expect(errors).toEqual([]);
  await save('stability', {
    recordedAt: new Date().toISOString(), cycles, workers, idleWorkerURLs, workerCheckpoints, frameHistory, errors, initialHeap,
    stopMs: {feedback: distribution(cycles.map(cycle => cycle.stop.feedbackMs)), frameRemoved: distribution(cycles.map(cycle => cycle.stop.removedMs)), freshRunnerReady: distribution(cycles.map(cycle => cycle.stop.readyMs))},
    proposedBudgets: {feedbackMs: 100, forcedCancellationMs: 1000},
    budgetObserved: {feedbackUnder100ms: cycles.every(cycle => cycle.stop.feedbackMs < 100), oldFrameRemovedUnder1000ms: cycles.every(cycle => cycle.stop.removedMs < 1000)},
    memoryScope: 'Shell CDP target post forced GC each cycle; target/isolate scope can include co-resident frame contexts. Does not include dedicated workers/native audio/GPU/RSS. Ten finite cycles do not prove absence of all leaks.',
    stopMethod: 'Real Stop click capture timestamp; next rAF checks disabled Run and invalidated session. MutationObserver timestamps old iframe removal (upper bound for forced cancellation); ready measures new rendered runner ready, separately from cancellation.',
    resourceMethod: 'Real WebAudio CDP context lifecycle on old iframe, Playwright dedicated-worker object identity and close events, detached frame, one fresh runner, zero fresh VM threads, no fresh audio context. Every worker active before Stop must close, including old storage fetch worker. Fresh runner workers must equal the observed bootstrap baseline exactly: one new Scratch Storage fetch-worker, zero loop/compiler workers. Worker/frame histories and CDP targets are recorded; no growth is allowed across ten cycles. Audio signal observed before each Stop; loop worker every cycle; PXT compiler worker in cycles 1 and 10.'
  });
});

test('F7-PERF-003: measure completed native WebGL draws for 100 sprites', async ({page}) => {
  await open(page);
  const samples = [];
  for (let index = 0; index < 3; index++) {
    const sample = await page.evaluate(() => studioProbe.request('measure-performance', {spriteCount: 100, durationMs: 2000}));
    expect(sample.spriteCount).toBe(100);
    expect(sample.nativeTargetCount).toBe(100);
    expect(sample.frames).toBeGreaterThan(0);
    expect(sample.durationMs).toBeGreaterThanOrEqual(2000);
    samples.push(sample);
    expect((await snapshot(page)).targets).toHaveLength(1);
  }
  await save('sprites', {recordedAt: new Date().toISOString(), samples, completedDrawsPerSecond: distribution(samples.map(sample => sample.completedDrawsPerSecond)), proposedSchoolBudgetFps: 30, localSamplesMeet30Fps: samples.every(sample => sample.completedDrawsPerSecond >= 30), schoolHardwareValidated: false, schoolPerformanceGate: 'pending; WSL headless software WebGL is not the agreed school hardware profile. Do not treat this smoke benchmark as acceptance of the school >=30 FPS requirement.'});
});

test('F7-PERF-004: native keyboard event to observed scene state, ten samples',async({page})=>{
  await open(page);
  await page.locator('#fixture').selectOption('events');
  await page.locator('#run').click();
  await expect.poll(async()=>(await snapshot(page)).x).toBe(5);
  const canvas=page.frameLocator('#runner-slot iframe').locator('#stage');
  await page.locator('#runner-slot').scrollIntoViewIfNeeded();await canvas.scrollIntoViewIfNeeded();await canvas.focus();
  const samples=[];
  for(let index=0;index<10;index++){
    const before=(await snapshot(page)).x,start=performance.now();
    await canvas.press('Space');
    let after;
    do {after=await snapshot(page);if(after.x===before+7)break;await new Promise(done=>setTimeout(done,10));}while(performance.now()-start<5000);
    expect(after.x).toBe(before+7);samples.push(performance.now()-start);
  }
  await page.locator('#stop-result').click();await expect(page.locator('#run')).toBeEnabled();
  await save('event-latency',{recordedAt:new Date().toISOString(),eventToObservedStateMs:distribution(samples),method:'Node monotonic timestamp before real Playwright Space key input to native stage; shell snapshot RPC polling at nominal 10ms until x changes by 7. Includes automation, scheduler, MessagePort and observation overhead; upper-bound end-to-end observation, not display latency or internal VM-only time.',schoolHardwareValidated:false});
});
