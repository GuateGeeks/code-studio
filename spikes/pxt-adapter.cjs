const fs = require('node:fs');
const path = require('node:path');
const workspaceRoot = path.resolve(__dirname, '../..');
const microbitRoot = path.join(workspaceRoot, 'pxt-microbit');
require(path.join(microbitRoot, 'node_modules/pxt-core/built/pxt.js'));
const {pxt, pxtc} = global;
pxt.debug = () => {};
const targetBundle = JSON.parse(fs.readFileSync(path.join(microbitRoot, 'built/target.json'), 'utf8'));
const localTargetConfig = JSON.parse(fs.readFileSync(path.join(microbitRoot, 'targetconfig.json'), 'utf8'));

// PXT uses process-global target state. Call sequentially in a dedicated process.
async function compile(source, {native = false, hexCache = path.join(microbitRoot, 'built/hexcache')} = {}) {
  const networkAttempts = [];
  const localRequests = [];
  const hexRequests = [];
  pxt.setAppTarget(structuredClone(targetBundle));
  pxt.webConfig = {...pxt.webConfig, isStatic: true, relprefix: ''};
  pxt.setupSimpleCompile({
    cacheGet: async () => '', cacheSet: async () => {},
    httpRequestAsync: async options => {
      if (options.url === 'targetconfig.json') {
        localRequests.push(options.url);
        return {statusCode: 200, json: localTargetConfig, text: JSON.stringify(localTargetConfig), headers: {}};
      }
      networkAttempts.push(options.url);
      throw new Error(`External request blocked: ${options.url}`);
    },
    pkgOverrideAsync: async id => {
      const files = pxt.appTarget.bundledpkgs[id];
      if (!files) throw new Error(`Local package unavailable: ${id}`);
      return files;
    }
  });
  const files = {
    'pxt.json': JSON.stringify({name: 'gg-heart-probe', dependencies: {core: '*', radio: '*', microphone: '*'}, files: ['main.ts'], preferredEditor: 'tsprj', targetVersions: {...pxt.appTarget.versions, targetId: pxt.appTarget.id}}),
    'main.ts': source
  };
  class LocalHost extends pxt.SimpleHost {
    async getHexInfoAsync(info) {
      if (!/^[a-f0-9]{64}$/.test(info.sha)) throw new Error('Invalid native runtime hash');
      const file = path.join(hexCache, `${info.sha}.hex`);
      hexRequests.push({sha: info.sha, variant: info.appVariant, available: fs.existsSync(file)});
      if (!fs.existsSync(file)) throw new Error(`Missing native runtime: ${info.sha} (${info.appVariant})`);
      return {hex: fs.readFileSync(file, 'utf8').trim().split(/\r?\n/)};
    }
  }
  try {
    const host = new LocalHost(files);
    const mainPackage = new pxt.MainPackage(host);
    await mainPackage.loadAsync();
    const target = mainPackage.getTargetOptions();
    if (target.hasHex) target.isNative = native;
    const options = await mainPackage.getCompileOptionsAsync(target);
    pxt.patchTS(mainPackage.targetVersion(), options);
    const result = pxtc.compile(options);
    return {
      success: result.success,
      diagnostics: result.diagnostics.map(item => ({code: item.code, fileName: item.fileName, line: item.line, messageText: item.messageText})),
      outfiles: result.outfiles,
      networkAttempts, localRequests, hexRequests,
      physicalBoardValidated: false
    };
  } catch (error) {
    error.evidence = {networkAttempts, localRequests, hexRequests, physicalBoardValidated: false};
    throw error;
  }
}

module.exports = {compile};
