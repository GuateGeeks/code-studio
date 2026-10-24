import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {loadWorkspace, workspaceToIR} from '../../src/editor/block-program.mjs';
import {toScratchProject} from '../../src/adapters/scratch/scratch-project.mjs';
import {corpus, editableExample} from '../../tests/fixtures/corpus.blocks.mjs';
import {createTone} from '../f0/tone.mjs';
import {buildProjectCatalog} from '../f1/build-project-catalog.mjs';
import {writeChanged as writeFileSync} from './stage-cache.mjs';

export async function generateFixtures({projectRoot, xcratchRoot, shell, runner, output}) {
writeFileSync(resolve(shell, 'editable.blocks.json'), JSON.stringify(editableExample));
const fixture = JSON.parse(readFileSync(resolve(projectRoot, 'tests/fixtures/repeat-move.blocks.json'), 'utf8'));
const workspace = loadWorkspace(fixture);
const ir = workspaceToIR(workspace);
const {project, sourceMap} = toScratchProject(ir);
workspace.dispose();
const assets = {};
for (const [index, name] of ['stage', 'hero', 'hero-alt'].entries()) {
  const text = readFileSync(resolve(projectRoot, `src/assets/${name}.svg`), 'utf8');
  const assetId = createHash('md5').update(text).digest('hex');
  assets[assetId] = text;
  const descriptor = {assetId, name, dataFormat: 'svg', md5ext: `${assetId}.svg`, rotationCenterX: index ? 24 : 240, rotationCenterY: index ? 24 : 180};
  if (index === 2) project.targets[1].costumes.push(descriptor);
  else project.targets[index].costumes = [descriptor];
}
const upstreamRequire = createRequire(resolve(xcratchRoot, 'package.json'));
// Validate the build-owned fixture ahead of time: scratch-parser's runtime AJV
// generates functions, which are intentionally forbidden by the runner's CSP.
const validatedProject = await new Promise((done, reject) => upstreamRequire('scratch-parser')(JSON.stringify(project), false, (error, result) => error ? reject(error) : done(result[0])));
writeFileSync(resolve(runner, 'project.json'), JSON.stringify({project: validatedProject, sourceMap, ir, assets, validatedAtBuild: true}));
const corpusFixtures = {};
const tone = createTone();
const toneId = createHash('md5').update(tone.buffer).digest('hex');
writeFileSync(resolve(output, 'tone.wav'), tone.buffer);
for (const [name, state] of Object.entries(corpus)) {
  const workspace = loadWorkspace(state);
  try {
    const ir = workspaceToIR(workspace);
    const {project: scene, sourceMap} = toScratchProject(ir);
    scene.targets.forEach((target, index) => { target.costumes = structuredClone(project.targets[index].costumes); });
    const fixtureAssets = {...assets};
    if (name === 'audio' || name === 'audioStop') {
      fixtureAssets[toneId] = {type: 'Sound', format: 'wav', encoding: 'base64', data: tone.buffer.toString('base64')};
      scene.targets[1].sounds = [{assetId: toneId, name: 'tone', dataFormat: 'wav', md5ext: `${toneId}.wav`, format: '', rate: tone.rate, sampleCount: tone.sampleCount}];
    }
    const validated = await new Promise((done, reject) => upstreamRequire('scratch-parser')(JSON.stringify(scene), false, (error, result) => error ? reject(error) : done(result[0])));
    corpusFixtures[name] = {project: validated, ir, sourceMap, assets: fixtureAssets, validatedAtBuild: true};
  } finally { workspace.dispose(); }
}
writeFileSync(resolve(runner, 'corpus.json'), JSON.stringify(corpusFixtures));
writeFileSync(resolve(runner, 'program-resources.json'), JSON.stringify({assets: corpusFixtures.audio.assets, costumes: project.targets.map(target => target.costumes), sounds: corpusFixtures.audio.project.targets[1].sounds}));
writeFileSync(resolve(shell, 'project-catalog.json'), JSON.stringify(await buildProjectCatalog(JSON.parse(readFileSync(resolve(runner, 'program-resources.json'), 'utf8')))));

return {
  outputs: [resolve(shell, 'editable.blocks.json'), resolve(runner, 'project.json'), resolve(runner, 'corpus.json'), resolve(runner, 'program-resources.json'), resolve(shell, 'project-catalog.json'), resolve(output, 'tone.wav')],
  files: Object.keys(upstreamRequire.cache),
  metadata: {audioFixture: {assetId: toneId, sha256: createHash('sha256').update(tone.buffer).digest('hex'), bytes: tone.buffer.length, rate: tone.rate, sampleCount: tone.sampleCount, frequencyHz: 440}}
};
}
