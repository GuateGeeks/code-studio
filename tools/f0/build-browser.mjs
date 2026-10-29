import {createRequire} from 'node:module';
import {readFileSync, existsSync, mkdirSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {projectRoot, workspaceRoot, xcratchRoot, microbitRoot} from '../paths.mjs';
import {releaseMaterialInputs, buildReleaseMaterials} from '../release/materials.mjs';
import {StageCache, filesUnder, writeChanged, assertWithin, digest} from '../build/stage-cache.mjs';
import {localModuleInputs} from '../build/module-inputs.mjs';

const argumentsList = process.argv.slice(2);
if (argumentsList.some(argument => argument !== '--force')) throw new Error('Usage: npm run browser:build -- [--force]');
const startedAt = performance.now();
const output = resolve(projectRoot, 'artifacts/browser');
const shell = resolve(output, 'shell');
const runner = resolve(output, 'runner');
const vendor = resolve(runner, 'vendor');
const simulator = resolve(output, 'simulator');
const language = resolve(output, 'language');
const scene3d = resolve(output, 'scene3d'), webapp = resolve(output, 'webapp');
for (const directory of [shell, runner, vendor, simulator, resolve(simulator, 'vendor'), language, resolve(language, 'vendor'), scene3d, webapp, resolve(scene3d,'vendor')]) mkdirSync(directory, {recursive: true});
const upstreamRequire = createRequire(resolve(xcratchRoot, 'package.json'));
// Release snapshots run when serving; changing their rewrite does not recompile
// unrelated VM/audio/editor bundles. Track only helpers consumed by these stages.
const commonInputs = ['tools/f0/build-browser.mjs', 'tools/build/stage-cache.mjs', 'tools/build/module-inputs.mjs'].map(file => resolve(projectRoot, file));
const productLocks = ['package.json', 'package-lock.json'].map(file => resolve(projectRoot, file));
const upstreamLocks = ['package.json', 'package-lock.json'].map(file => resolve(xcratchRoot, file));
const cache = new StageCache({cacheRoot: resolve(projectRoot, 'artifacts/build-cache'), outputRoot: output,
  force: argumentsList.includes('--force'), toolchain: JSON.stringify({node: process.version, platform: process.platform, architecture: process.arch, modules: process.versions.modules, openssl: process.versions.openssl})});
const run = (name, options) => cache.run(name, {...options, inputs: [...commonInputs, ...options.inputs]});

function sourceTree(source, destination) {
  return filesUnder(source).map(file => [file, resolve(destination, file.slice(resolve(source).length + 1))]);
}
// Native source layout is mirrored under /app for relative module imports.
// Stable top-level URLs remain entries; historical spikes are not build inputs.
const ownedSource = resolve(projectRoot, 'src');
const mappings = [
  ...[shell, runner, simulator, language, scene3d, webapp].flatMap(destination => sourceTree(ownedSource, resolve(destination, 'app'))),
  ...sourceTree(resolve(projectRoot, 'node_modules/blockly/media'), resolve(shell, 'blockly-media')),
  ...[
    ['studio/index.html', shell, 'index.html'], ['studio/style.css', shell, 'style.css'],
    ['device-transfer/device-transfer.html', shell, 'device-transfer.html'],
    ['runtime/index.html', runner, 'index.html'], ['runtime/stage.css', runner, 'stage.css'],
    ['runtime/loop-worker.js', runner, 'loop-worker.js'],
    ['targets/microbit/compiler-worker.js', runner, 'compiler-worker.js'],
    ['targets/microbit/simulator/index.html', simulator, 'index.html'],
    ['targets/microbit/simulator/simulator.css', simulator, 'simulator.css'],
    ['targets/microbit/simulator/disable-embed.js', simulator, 'disable-embed.js'],
    ['export/standalone-index.html', shell, 'export-templates/index.html'],
    ['export/export.css', shell, 'export-templates/export.css'],
    ['targets/text/index.html', language, 'index.html'],
    ['targets/context/index.html', scene3d, 'index.html'], ['targets/context/index.html', webapp, 'index.html'],
    ['targets/context/style.css', scene3d, 'style.css'], ['targets/context/style.css', webapp, 'style.css']
  ].map(([source, destination, target]) => [resolve(ownedSource, source), resolve(destination, target)])
];
mappings.push([resolve(projectRoot,'tools/export/serve.template.mjs'),resolve(shell,'export-templates/serve.mjs.txt')]);
const entries = [
  [resolve(shell, 'shell.js'), "import './app/studio/shell.js';\n"],
  [resolve(runner, 'runner.js'), "import './app/runtime/runner.js';\n"],
  [resolve(simulator, 'simulator.js'), "import './app/targets/microbit/simulator/simulator.js';\n"]
];
await run('static-sync', {
  inputs: [ownedSource, resolve(projectRoot, 'node_modules/blockly/media'), ...mappings.map(([file]) => file)],
  execute: async () => {
    let copiedFiles = 0;
    for (const [source, target] of mappings) if (writeChanged(assertWithin(output, target), readFileSync(source))) copiedFiles++;
    for (const [target, content] of entries) if (writeChanged(target, content)) copiedFiles++;
    return {outputs: [...mappings.map(([, target]) => target), ...entries.map(([target]) => target)], metadata: {copiedFiles}};
  }
});

await run('runtime-notices',{inputs:[...productLocks,resolve(projectRoot,'docs/licenses'),resolve(projectRoot,'tools/build/runtime-notices.mjs'),...['@babylonjs/core','@babylonjs/loaders','quickjs-emscripten-core','@jitl/quickjs-wasmfile-release-sync','pyodide','pako'].flatMap(name=>filesUnder(resolve(projectRoot,'node_modules',name)).filter(file=>/(?:^|\/)(?:package.json|LICEN[CS]E(?:\.[^/]*)?|NOTICE(?:\.[^/]*)?|COPYING(?:\.[^/]*)?)$/i.test(file)))],execute:async()=>{const {runtimeNotices}=await import('../build/runtime-notices.mjs');const file=resolve(shell,'export-templates/notices.json');writeChanged(file,JSON.stringify(await runtimeNotices(projectRoot)));return {outputs:[file]};}});

await run('release-materials', {
  inputs: await releaseMaterialInputs({projectRoot, workspaceRoot}),
  execute: () => buildReleaseMaterials({projectRoot, workspaceRoot, outputRoot: resolve(shell, 'export-templates/release')})
});

const dapPackage = JSON.parse(readFileSync(resolve(projectRoot, 'node_modules/dapjs/package.json'), 'utf8'));
if(JSON.parse(readFileSync(resolve(projectRoot,'node_modules/pako/package.json'),'utf8')).version!=='2.1.0')throw new Error('pako: expected pinned 2.1.0');
if (dapPackage.version !== '2.3.0') throw new Error('DAPjs: expected pinned 2.3.0');

const languagePackages = [
  ['quickjs-emscripten-core', '0.32.0'],
  ['@jitl/quickjs-wasmfile-release-sync', '0.32.0'],
  ['pyodide', '314.0.7']
];
const languageCopies = [
  [resolve(projectRoot, 'node_modules/@jitl/quickjs-wasmfile-release-sync/dist/emscripten-module.wasm'), resolve(language, 'vendor/quickjs/emscripten-module.wasm')],
  ...['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']
    .map(name => [resolve(projectRoot, 'node_modules/pyodide', name), resolve(language, 'vendor/pyodide', name)])
];
await run('language-assets', {
  inputs: [...productLocks, ...languagePackages.map(([name]) => resolve(projectRoot, 'node_modules', name, 'package.json')), ...languageCopies.map(([file]) => file)],
  execute: async () => {
    for (const [name, version] of languagePackages) {
      const installed = JSON.parse(readFileSync(resolve(projectRoot, 'node_modules', name, 'package.json'), 'utf8'));
      if (installed.version !== version) throw new Error(`Text runtime ${name}: expected ${version}, found ${installed.version}`);
    }
    for (const [source, target] of languageCopies) writeChanged(assertWithin(output, target), readFileSync(source));
    return {outputs: languageCopies.map(([, target]) => target)};
  }
});

const fixtureInputs = [
  ...localModuleInputs([resolve(projectRoot, 'tools/build/fixtures.mjs')]),
  ...['tests/fixtures', 'src/assets'].map(file => resolve(projectRoot, file))
];
const fixtures = await run('fixtures', {
  inputs: [...productLocks, ...upstreamLocks, ...fixtureInputs],
  execute: async () => {
    const {generateFixtures} = await import('../build/fixtures.mjs');
    return generateFixtures({projectRoot, xcratchRoot, shell, runner, output});
  }
});

// Starter library: original media generated from code, verified against its
// versioned lock, published once in the Studio origin (offline studio-core pack).
const starterLibraryGenerator = resolve(projectRoot, 'tools/resources/starter-library.mjs');
const starterLibrary = await run('starter-library', {
  inputs: [...localModuleInputs([starterLibraryGenerator]), resolve(projectRoot, 'tools/resources/starter-library.lock.json')],
  execute: async () => {
    const {buildStarterLibrary, starterLibraryLock, readStarterLibraryLock} = await import('../resources/starter-library.mjs');
    const built = buildStarterLibrary();
    if (JSON.stringify(starterLibraryLock(built)) !== JSON.stringify(readStarterLibraryLock())) throw new Error('Starter library does not match tools/resources/starter-library.lock.json');
    const file = resolve(shell, 'starter-library.json');
    writeChanged(file, built.bytes);
    return {outputs: [file], metadata: {bytes: built.bytes.length, sha256: built.sha256, entries: built.bundle.entries.length}};
  }
});

const core = resolve(microbitRoot, 'node_modules/pxt-core');
const pxtCopies = [
  [resolve(core, 'built/web/pxtsim.js'), resolve(simulator, 'vendor/pxtsim.js')],
  ...['typescript', 'pxtworker'].map(name => [resolve(core, `built/web/${name}.js`), resolve(vendor, `${name}.js`)]),
  [resolve(microbitRoot, 'built/compiler.js'), resolve(vendor, 'microbit-compiler.js')],
  [resolve(microbitRoot, 'node_modules/lzma/src/lzma_worker.js'), resolve(vendor, 'lzma.js')]
];
await run('pxt-pack', {
  inputs: [...pxtCopies.map(([file]) => file), ...['built/target.json', 'built/common-sim.js', 'built/sim.js', 'built/hexcache', 'targetconfig.json', 'package.json', 'package-lock.json'].map(file => resolve(microbitRoot, file))],
  execute: async () => {
    const targetBundle = JSON.parse(readFileSync(resolve(microbitRoot, 'built/target.json'), 'utf8'));
    const normalizeHook = text => text.replace(/\r/g, '').replace(/^var ts;$/m, '').trim();
    if (normalizeHook(targetBundle.compile.compilerExtension) !== normalizeHook(readFileSync(resolve(microbitRoot, 'built/compiler.js'), 'utf8'))) throw new Error('Static compiler hook does not match the target bundle');
    for (const [source, target] of pxtCopies) writeChanged(target, readFileSync(source));
    writeChanged(resolve(simulator, 'vendor/microbit-sim.js'), readFileSync(resolve(microbitRoot, 'built/common-sim.js'), 'utf8') + '\n' + readFileSync(resolve(microbitRoot, 'built/sim.js'), 'utf8'));
    writeChanged(resolve(simulator, 'board.json'), JSON.stringify(targetBundle.simulator.boardDefinition));
    const hexCache = Object.fromEntries(filesUnder(resolve(microbitRoot, 'built/hexcache')).filter(file => file.endsWith('.hex')).map(file => [file.slice(file.lastIndexOf('/') + 1, -4), readFileSync(file, 'utf8').trim().split(/\r?\n/)]));
    writeChanged(resolve(runner, 'compiler-pack.json'), JSON.stringify({target: targetBundle, targetConfig: JSON.parse(readFileSync(resolve(microbitRoot, 'targetconfig.json'), 'utf8')), hexCache}));
    return {outputs: [...pxtCopies.map(([, target]) => target), resolve(simulator, 'vendor/microbit-sim.js'), resolve(simulator, 'board.json'), resolve(runner, 'compiler-pack.json')]};
  }
});
const prebuiltCopies = [
  [resolve(xcratchRoot, 'packages/scratch-render/dist/web/scratch-render.js'), resolve(vendor, 'scratch-render.js')],
  [resolve(xcratchRoot, 'node_modules/scratch-storage/dist/web/scratch-storage.js'), resolve(vendor, 'scratch-storage.js')],
  ...sourceTree(resolve(xcratchRoot, 'node_modules/scratch-storage/dist/web/chunks'), resolve(vendor, 'chunks'))
];
await run('renderer-storage', {
  inputs: [...upstreamLocks, resolve(xcratchRoot, 'node_modules/scratch-storage/dist/web/chunks'), ...prebuiltCopies.map(([file]) => file)],
  execute: async () => {
    for (const [source, target] of prebuiltCopies) writeChanged(target, readFileSync(source));
    return {outputs: prebuiltCopies.map(([, target]) => target)};
  }
});
const babelConfigs = ['babel.config.js', '.babelrc', '.browserslistrc', 'packages/scratch-vm/babel.config.js', 'packages/scratch-vm/.babelrc'].map(file => resolve(xcratchRoot, file));
for (const [name, inputs] of [
  ['webpack-vm', [...upstreamLocks, ...babelConfigs, resolve(xcratchRoot, 'packages/scratch-vm/src'), resolve(xcratchRoot, 'packages/scratch-vm/webpack.config.js'), resolve(xcratchRoot, 'packages/scratch-vm/package.json')]],
  ['webpack-audio', [...upstreamLocks, resolve(xcratchRoot, 'node_modules/scratch-audio/src'), resolve(xcratchRoot, 'node_modules/scratch-audio/package.json')]],
  ['webpack-editor', [...productLocks, ...upstreamLocks, resolve(projectRoot, 'src/editor'), ...localModuleInputs([resolve(projectRoot, 'src/editor/editor-entry.mjs')])]],
  ['webpack-language', [...productLocks, ...upstreamLocks, ...localModuleInputs([resolve(projectRoot, 'src/targets/text/quickjs-engine.mjs')])]],
  ['webpack-code-view-parser', [...productLocks, ...upstreamLocks, ...localModuleInputs([resolve(projectRoot, 'src/targets/text/code-view-parser.mjs')])]],
  ['webpack-babylon', [...productLocks, resolve(projectRoot,'src/adapters/babylon'), resolve(projectRoot,'node_modules/@babylonjs/core/package.json'), resolve(projectRoot,'node_modules/@babylonjs/loaders/package.json')]],
  ['webpack-assets', [...productLocks, resolve(projectRoot,'src/targets/assets/pako-entry.mjs'), resolve(projectRoot,'node_modules/pako/package.json')]],
  ['webpack-device-transfer', [...productLocks, ...upstreamLocks, resolve(projectRoot, 'node_modules/dapjs/package.json'), resolve(projectRoot, 'node_modules/dapjs/dist/dap.esm.js')]]
]) {
  await run(name, {inputs: [...inputs, resolve(projectRoot, 'tools/build/webpack-stage.mjs')], execute: async () => {
    const {compileStage} = await import('../build/webpack-stage.mjs');
    const built = await compileStage(name, {projectRoot, xcratchRoot, shell, vendor, language, output});
    if (name === 'webpack-assets') {
      for(const roleRoot of [shell,scene3d,webapp]){const copy=resolve(roleRoot,'vendor/pako.bundle.mjs');writeChanged(copy,readFileSync(resolve(vendor,'pako.bundle.mjs')));built.outputs.push(copy);}
    }
    return built;
  }});
}

const files = ['typescript.js', 'pxtworker.js', 'microbit-compiler.js', 'lzma.js', 'scratch-vm.js', 'scratch-render.js', 'scratch-storage.js', 'scratch-audio.js'].map(name => {
  const data = readFileSync(resolve(vendor, name));
  return {file: `vendor/${name}`, bytes: data.length, sha256: digest(data)};
});
for (const name of ['pxtsim.js', 'microbit-sim.js']) {
  const data = readFileSync(resolve(simulator, 'vendor', name));
  files.push({file: `simulator/vendor/${name}`, bytes: data.length, sha256: digest(data)});
}
const editorData = readFileSync(resolve(shell, 'editor.bundle.js'));
files.push({file: 'shell/editor.bundle.js', bytes: editorData.length, sha256: digest(editorData)});
for (const file of filesUnder(resolve(language, 'vendor'))) {
  const data = readFileSync(file);
  files.push({file: `language/${file.slice(language.length + 1).replaceAll('\\', '/')}`, bytes: data.length, sha256: digest(data)});
}
for (const role of ['shell','runner']) {
  const file=resolve(output,role,'vendor/pako.bundle.mjs');const data=readFileSync(file);
  files.push({file:role+'/vendor/pako.bundle.mjs',bytes:data.length,sha256:digest(data)});
}
for(const file of filesUnder(resolve(scene3d,'vendor'))){const data=readFileSync(file);files.push({file:'scene3d/'+file.slice(scene3d.length+1).split(String.fromCharCode(92)).join('/'),bytes:data.length,sha256:digest(data)});}
const dapData = readFileSync(resolve(shell, 'vendor/dapjs.bundle.mjs'));
files.push({file: 'shell/vendor/dapjs.bundle.mjs', bytes: dapData.length, sha256: digest(dapData)});
const manifestPath = resolve(output, 'build-manifest.json');
let previousManifest;
try { previousManifest = JSON.parse(readFileSync(manifestPath, 'utf8')); } catch {}
const anyBuilt = cache.reports.some(stage => stage.status === 'built');
writeChanged(manifestPath, JSON.stringify({builtAt: anyBuilt || !previousManifest?.builtAt ? new Date().toISOString() : previousManifest.builtAt, files, audioFixture: fixtures.metadata.audioFixture, starterLibrary: starterLibrary.metadata}, null, 2));
const report = {recordedAt: new Date().toISOString(), forced: cache.force, totalMs: performance.now() - startedAt, stages: cache.reports};
writeChanged(resolve(output, 'build-report.json'), JSON.stringify(report, null, 2) + '\n');
for (const stage of report.stages) console.log(`${stage.name}: ${stage.status} (${stage.reason})`);
console.log(`Static browser harness ready: ${output} (${report.totalMs.toFixed(0)} ms)`);
