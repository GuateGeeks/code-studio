import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {writeChanged} from './stage-cache.mjs';

export async function compileStage(name, {projectRoot, xcratchRoot, shell, vendor, language, output}) {
  const require = createRequire(resolve(xcratchRoot, 'package.json'));
  const originalCwd = process.cwd();
  // Babel presets in the pinned upstream config resolve relative to cwd.
  process.chdir(xcratchRoot);
  try {
    const webpack = require('webpack');
    let config;
    if (name === 'webpack-vm') {
      config = require(resolve(xcratchRoot, 'packages/scratch-vm/webpack.config.js'))[1];
      config.context = resolve(xcratchRoot, 'packages/scratch-vm');
      config.entry = {'scratch-vm': resolve(config.context, 'src/index.js')};
      config.mode = 'development'; config.devtool = false;
      config.output = {...config.output, clean: false, path: vendor, filename: '[name].js', publicPath: '/vendor/'};
    } else if (name === 'webpack-audio') {
      config = {mode: 'development', devtool: false, target: 'web',
        entry: resolve(xcratchRoot, 'node_modules/scratch-audio/src/index.js'),
        output: {path: vendor, filename: 'scratch-audio.js', library: 'ScratchAudio', libraryTarget: 'umd', globalObject: 'self'},
        resolve: {fallback: {events: require.resolve('events/')}}};
    } else if (name === 'webpack-editor') {
      config = {mode: 'development', devtool: false, target: 'web', context: projectRoot,
        entry: resolve(projectRoot, 'src/editor/editor-entry.mjs'),
        resolve: {modules: [resolve(projectRoot, 'node_modules'), 'node_modules']},
        output: {path: shell, filename: 'editor.bundle.js', library: 'GGEditor', libraryTarget: 'umd', globalObject: 'self'}};
    } else if (name === 'webpack-language') {
      config = {mode: 'development', devtool: false, target: 'webworker', context: projectRoot,
        entry: resolve(projectRoot, 'src/targets/text/quickjs-engine.mjs'),
        experiments: {outputModule: true},
        // Preserve the real browser module URL; webpack's default replacement
        // would embed the build machine's file:/// path in this ESM runtime.
        module: {rules: [{test: /emscripten-module\.browser\.mjs$/, parser: {importMeta: false}}]},
        resolve: {modules: [resolve(projectRoot, 'node_modules'), 'node_modules'], conditionNames: ['browser', 'import', 'default']},
        output: {path: resolve(language, 'vendor'), filename: 'quickjs-engine.bundle.mjs',
          chunkFilename: 'quickjs-[id].chunk.mjs', publicPath: '/vendor/', library: {type: 'module'}, chunkFormat: 'module'}};
    } else if (name === 'webpack-code-view-parser') {
      config = {mode: 'development', devtool: false, target: 'webworker', context: projectRoot,
        entry: resolve(projectRoot, 'src/targets/text/code-view-parser.mjs'), experiments: {outputModule: true},
        resolve: {modules: [resolve(projectRoot, 'node_modules'), 'node_modules']},
        output: {path: resolve(language, 'vendor'), filename: 'code-view-parser.bundle.mjs', library: {type: 'module'}}};
    } else if (name === 'webpack-babylon') {
      config = {mode:'production', devtool:false, target:'web', context:projectRoot,
        entry:resolve(projectRoot,'src/adapters/babylon/browser-entry.mjs'), experiments:{outputModule:true},
        resolve:{modules:[resolve(projectRoot,'node_modules'),'node_modules']},
        output:{path:resolve(output,'scene3d/vendor'),filename:'babylon-adapter.bundle.mjs',chunkFilename:'babylon-[id].chunk.mjs',publicPath:'auto',library:{type:'module'},chunkFormat:'module'}};
    } else if (name === 'webpack-assets') {
      config = {mode:'production',devtool:false,target:'webworker',context:projectRoot,
        entry:resolve(projectRoot,'src/targets/assets/pako-entry.mjs'),experiments:{outputModule:true},
        resolve:{modules:[resolve(projectRoot,'node_modules'),'node_modules']},
        output:{path:vendor,filename:'pako.bundle.mjs',library:{type:'module'},chunkFormat:'module'}};
    } else if (name === 'webpack-device-transfer') {
      config = {mode: 'production', devtool: false, target: 'web', context: projectRoot,
        entry: resolve(projectRoot, 'node_modules/dapjs/dist/dap.esm.js'),
        experiments: {outputModule: true},
        output: {path: resolve(shell, 'vendor'), filename: 'dapjs.bundle.mjs', library: {type: 'module'}, chunkFormat: 'module'}};
    } else throw new Error(`Unknown webpack stage: ${name}`);
    return await new Promise((done, reject) => {
      const compiler = webpack(config);
      compiler.run((error, stats) => {
        compiler.close(closeError => {
          if (error || closeError) return reject(error ?? closeError);
          const report = stats.toString({preset: 'errors-warnings', colors: false});
          // Log is diagnostic, not a required executable output/cache input.
          writeFileSync(resolve(output, `${name}-build.txt`), report + '\n');
          if (stats.hasErrors()) return reject(new Error(report));
          console.log(`${name}: ${report.trim()}`);
          const compilation = stats.compilation;
          const dependencies = new Set([...compilation.fileDependencies, ...compilation.buildDependencies, ...Object.keys(require.cache)]);
          const collectChildren = parent => {
            for (const child of parent.children ?? []) {
              for (const file of child.fileDependencies) dependencies.add(file);
              collectChildren(child);
            }
          };
          collectChildren(compilation);
          done({
            outputs: compilation.getAssets().map(asset => resolve(config.output.path, asset.name)),
            files: [...dependencies],
            contexts: [...compilation.contextDependencies],
            missing: [...compilation.missingDependencies]
          });
        });
      });
    });
  } finally { process.chdir(originalCwd); }
}
