import {selectContext,clickVisible,clickStagePoint,revealPanel} from './workspace-controls.mjs';
import {test, expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {corpus} from '../fixtures/corpus.blocks.mjs';
import {artifactPath} from './artifacts.mjs';

test.setTimeout(120000);
// Compare one execution per backend with audio already permitted. Native
// "Reproducir sonido" restarts the green flag; text "Activar audio" only resumes
// audio, so clicking both after Run is not an equivalent execution sequence.
// Default autoplay and genuinely suspended contexts have separate browser tests.
test.use({launchOptions:{args:['--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']}});
const backends = ['blocks', 'javascript', 'python'];
const names = ['events', 'messages', 'clones', 'variables', 'globalVariables', 'concurrent', 'costumes', 'audio', 'audioStop'];
const snapshot = page => page.evaluate(() => studioProbe.request('snapshot'));
const canvas = page => page.frameLocator('#runner-slot iframe').locator('#stage');
const audioButton = page => page.frameLocator('#runner-slot iframe').getByRole('button', {name: /^(Reproducir sonido|Activar audio)$/});
const number = model => Number(model?.value);
const poll = {intervals: [10, 20, 40, 80], timeout: 15000};

function comparable(state) {
  const numericVariables = variables => Object.fromEntries(Object.entries(variables)
    .filter(([, model]) => typeof model.value === 'number' || model.value !== '' && Number.isFinite(Number(model.value)))
    .map(([id, model]) => [id, {name: model.name, value: Number(model.value)}]));
  return {
    x: state.x, costume: state.costume.name, redPixels: state.pixels.count, bluePixels: state.bluePixels,
    variables: numericVariables(state.variables), globalVariables: numericVariables(state.globalVariables),
    targets: state.targets.map(target => ({x: target.x, y: target.y, isOriginal: target.isOriginal, variables: numericVariables(target.variables)}))
  };
}
function observe(page) {
  let active = true;
  const entries = [];
  const task = (async () => {
    while (active && !page.isClosed()) {
      try {
        const state = await page.evaluate(() => studioProbe.state().revision >= 2 ? studioProbe.request('snapshot') : null);
        if (active && state) {
          entries.push({at: Date.now(), state});
          if (entries.length > 256) entries.shift();
        }
      } catch {
        // A real Run closes/replaces the previous runner and rejects its old
        // pending snapshot. No state from that retired session is reused.
      }
      if (active) await new Promise(resolve => setTimeout(resolve, 20));
    }
  })();
  return {entries, stop: async () => { active = false; await task; }};
}
async function startBackend(page, backend, name, {copy = true} = {}) {
  if (backend !== 'blocks' && copy) {
    await revealPanel(page,page.locator('#generated-language'));await revealPanel(page,page.locator('#generated-language'));await page.locator('#generated-language').selectOption(backend);
    await expect(page.locator('#generated-code')).toHaveJSProperty('readOnly', true);
    await expect(page.locator('#generated-code')).toHaveValue(/GG\.program\.configure/);
    await selectContext(page,'2d');
    await clickVisible(page.locator('#copy-' + backend));
    await expect(page.locator('#text-source')).toHaveValue(/await GG\.events\.run\(\)/);
  }
  const startedAt = Date.now();
  const observations = observe(page);
  try {
  await selectContext(page,backend==='blocks'?'2d':'text');
  await clickVisible(page.getByRole('button', {name: backend === 'blocks' ? 'Ejecutar bloques' : 'Ejecutar documento 2D', exact: true}));
  if (name === 'audio' || name === 'audioStop') {
    // The permission is granted for this equivalence profile. Keep the real
    // control visible, but do not start a second native execution with it.
    await expect(audioButton(page)).toBeVisible();
  }
  if (backend === 'blocks') await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
  else await expect(page.locator('#text-run-status')).toHaveText('Documento activo · eventos disponibles', {timeout: 60000});
  return {startedAt, readyAt: Date.now(), observations};
  } catch (error) { await observations.stop(); throw error; }
}
async function stopBackend(page, backend) {
  const oldFrame = page.frames().find(frame => frame.url().startsWith('http://127.0.0.1:4174/'));
  await selectContext(page,backend==='blocks'?'2d':'text');
  await clickVisible(page.getByRole('button', {name: backend === 'blocks' ? 'Detener' : 'Detener', exact: true}));
  await expect(page.locator('#run-editor')).toBeEnabled();
  expect(oldFrame.isDetached()).toBe(true);
  const stopped = await snapshot(page);
  expect(stopped.x).toBe(0); expect(stopped.targets).toHaveLength(1); expect(stopped.threads).toBe(0);
  return stopped;
}
async function key(page) { await canvas(page).focus(); await canvas(page).press('Space'); }
async function clickHero(page, x) {
  await clickStagePoint(page,canvas(page),x);
}
async function inspect(page, name, backend, before, timing) {
  const evidence = {before, startedAt: timing.startedAt, readyAt: timing.readyAt};
  const revision = (await snapshot(page)).revision;
  async function sample(predicate) {
    let found;
    await expect.poll(() => {
      found = timing.observations.entries.find(entry => entry.state.revision === revision && predicate(entry.state));
      return Boolean(found);
    }, poll).toBe(true);
    return found;
  }
  if (name === 'events') {
    const waiting = await sample(state => state.x === 0);
    const firstMove = await sample(state => state.x === 5);
    evidence.firstMoveAt = firstMove.at;
    evidence.observedWaitMilliseconds = firstMove.at - waiting.at;
    expect(evidence.observedWaitMilliseconds).toBeGreaterThan(0);
    await key(page);
    await expect.poll(async () => (await snapshot(page)).x, poll).toBe(12);
    await clickHero(page, 12);
    await expect.poll(async () => (await snapshot(page)).x, poll).toBe(23);
    const after = await snapshot(page);
    expect(after.moves).toEqual([5, 12, 23]);
    expect(after.pixels.centerX - before.pixels.centerX).toBeCloseTo(23, 0);
    evidence.during = waiting.state;
  } else if (name === 'messages') {
    const sender = await sample(state => state.x === 1);
    evidence.during = sender.state;
    expect(evidence.during.moves).toEqual([1]);
    // Receiver and sender can both finish in one native tick; x=11 is
    // represented by the movement trace, not a separately observable frame.
    const finished = await sample(state => state.x === 13);
    evidence.observedWaitMilliseconds = finished.at - sender.at;
    expect(evidence.observedWaitMilliseconds).toBeGreaterThan(0);
    await expect.poll(async () => (await snapshot(page)).x, poll).toBe(13);
    expect((await snapshot(page)).moves).toEqual([1, 11, 13]);
  } else if (name === 'clones') {
    evidence.during = (await sample(state => state.targets.length === 2 &&
      state.targets.find(target => target.isOriginal)?.x === 2 &&
      state.targets.find(target => !target.isOriginal)?.x === 60)).state;
    expect(evidence.during.pixels.count).toBe(2 * before.pixels.count);
    await page.screenshot({path: artifactPath('textual-clones-' + backend + '.png')});
    await expect.poll(async () => (await snapshot(page)).targets.length, poll).toBe(1);
    const after = await snapshot(page);
    expect(after.x).toBe(2); expect(after.pixels.count).toBe(before.pixels.count);
  } else if (name === 'variables') {
    evidence.during = (await sample(state => state.x === 21)).state;
    expect(number(evidence.during.variables['gg-score'])).toBe(3);
    expect(evidence.during.moves).toEqual([4, 11, 18, 21]);
    expect(evidence.during.pixels.centerX - before.pixels.centerX).toBeCloseTo(21, 0);
    await key(page);
    await expect.poll(async () => (await snapshot(page)).x, poll).toBe(19);
    expect(number((await snapshot(page)).variables['gg-score'])).toBe(2);
  } else if (name === 'globalVariables') {
    evidence.during = (await sample(state => number(state.globalVariables['gg-global-score']) === 17 &&
      number(state.targets.find(target => !target.isOriginal)?.variables['gg-local-score']) === 5)).state;
    expect(number(evidence.during.targets.find(target => target.isOriginal).variables['gg-local-score'])).toBe(3);
    for (const target of evidence.during.targets) expect(target.variables['gg-global-score']).toBeUndefined();
    await expect.poll(async () => (await snapshot(page)).targets.length, poll).toBe(1);
    const after = await snapshot(page);
    expect(number(after.globalVariables['gg-global-score'])).toBe(17);
    expect(number(after.variables['gg-local-score'])).toBe(3);
  } else if (name === 'concurrent') {
    evidence.overlap = (await sample(state => number(state.variables['gg-long']) === 1 &&
      number(state.variables['gg-short']) === 1 && state.threads === 2)).state;
    evidence.during = (await sample(state => number(state.variables['gg-short']) === 2 &&
      number(state.variables['gg-long']) === 1)).state;
    expect(number(evidence.during.variables['gg-long'])).toBe(1);
    expect(evidence.during.threads).toBeGreaterThan(0);
    await expect.poll(async () => number((await snapshot(page)).variables['gg-long']), poll).toBe(2);
    expect(number((await snapshot(page)).variables['gg-short'])).toBe(2);
  } else if (name === 'costumes') {
    evidence.during = (await sample(state => state.costume.name === 'hero-alt')).state;
    expect(evidence.during.bluePixels).toBeGreaterThan(300);
    expect(evidence.during.pixels.count).toBe(0);
    expect(evidence.during.x).toBe(before.x);
    await page.screenshot({path: artifactPath('textual-costumes-' + backend + '.png')});
    await expect.poll(async () => (await snapshot(page)).costume.name, poll).toBe('hero');
    const after = await snapshot(page);
    expect(after.pixels.count).toBe(before.pixels.count); expect(after.bluePixels).toBe(0);
  } else if (name === 'audio' || name === 'audioStop') {
    evidence.during = (await sample(state => state.audio.rms > 0.01)).state;
    expect(evidence.during.audio.contextState).toBe('running');
    expect(evidence.during.audio.sounds[0].playing).toBe(true);
    expect(evidence.during.audio.sounds[0].duration).toBeCloseTo(1.2, 2);
    expect(evidence.during.audio.sounds[0].channels).toBe(1);
    expect(evidence.during.audio.peakHz).toBeGreaterThan(400);
    expect(evidence.during.audio.peakHz).toBeLessThan(480);
    expect(evidence.during.x).toBe(0);
    await expect.poll(async () => (await snapshot(page)).x, poll).toBe(name === 'audio' ? 5 : 3);
    await expect.poll(async () => (await snapshot(page)).audio.rms, poll).toBeLessThan(0.0001);
    const after = await snapshot(page);
    expect(after.audio.sounds[0].playing).toBe(false);
    expect(after.audio.events.filter(event => event.type === 'play')).toHaveLength(1);
    // Measure the actual single playback and its real stop/natural completion.
    const finalStop = after.audio.events.findLast(event => event.type === 'stop');
    const finalPlay = after.audio.events.findLast(event => event.type === 'play' && event.at <= finalStop.at);
    evidence.playbackSeconds = finalStop.at - finalPlay.at;
    expect(evidence.playbackSeconds).toBeGreaterThan(name === 'audio' ? 1.1 : 0.3);
    if (name === 'audioStop') expect(evidence.playbackSeconds).toBeLessThan(0.8);
  }
  await expect.poll(async () => (await snapshot(page)).threads, poll).toBe(0);
  evidence.after = await snapshot(page);
  evidence.observedStates = timing.observations.entries.filter(entry => entry.state.revision === revision);
  evidence.comparable = comparable(evidence.after);
  return evidence;
}

for (const name of names) {
  test('GG-COPY-002: shared corpus ' + name + ' agrees across blocks, JavaScript and Python', async ({page}) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.studioProbe?.project));
    await page.evaluate(() => studioProbe.project.ready());
    await expect(page.locator('#run-editor')).toBeEnabled();
    const authoring = await page.evaluate(fixture => {
      const candidate = studioProbe.editor.prepare(fixture);
      studioProbe.editor.commit(candidate);
      return studioProbe.editor.save();
    }, corpus[name]);
    const runs = {};
    for (const backend of backends) await test.step(backend, async () => {
      const before = await snapshot(page);
      const timing = await startBackend(page, backend, name);
      let evidence;
      try { evidence = await inspect(page, name, backend, before, timing); }
      finally { await timing.observations.stop(); }
      expect(await page.evaluate(() => studioProbe.editor.save())).toEqual(authoring);
      evidence.diagnostics = await page.evaluate(() => studioProbe.console.snapshot().entries);
      expect(evidence.diagnostics.filter(entry => entry.level === 'error')).toEqual([]);
      expect(await page.locator('#editor-error').textContent()).toBe('');
      if (backend !== 'blocks') expect(await page.locator('#text-error').textContent()).toBe('');
      evidence.stopped = await stopBackend(page, backend);
      if (name === 'audio') {
        // Exercise Stop during another real pending waveform in each backend,
        // then outlast the original wait to detect a late movement.
        const stoppedTiming = await startBackend(page, backend, name, {copy: false});
        await stoppedTiming.observations.stop();
        await expect.poll(async () => (await snapshot(page)).audio.rms, poll).toBeGreaterThan(0.01);
        evidence.activeStop = {playing: await snapshot(page)};
        evidence.activeStop.stopped = await stopBackend(page, backend);
        await page.waitForTimeout(1300);
        expect((await snapshot(page)).x).toBe(0);
        expect((await snapshot(page)).audio.available).toBe(false);
      }
      runs[backend] = evidence;
      await writeFile(artifactPath('textual-corpus-' + name + '.json'), JSON.stringify({fixture: name, runs, errors}, null, 2));
    });
    expect(runs.javascript.comparable).toEqual(runs.blocks.comparable);
    expect(runs.python.comparable).toEqual(runs.blocks.comparable);
    expect(errors).toEqual([]);
  });
}
