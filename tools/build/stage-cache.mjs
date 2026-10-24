import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync, readdirSync, lstatSync, realpathSync, existsSync, unlinkSync, statSync} from 'node:fs';
import {resolve, relative, dirname, isAbsolute, sep} from 'node:path';

export const digest = data => createHash('sha256').update(data).digest('hex');
export function filesUnder(directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  function visit(path, ancestors) {
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) {
      const actual = realpathSync(path);
      if (!ancestors.has(actual)) visit(actual, new Set([...ancestors, actual]));
    } else if (stat.isDirectory()) {
      for (const name of readdirSync(path).sort()) visit(resolve(path, name), ancestors);
    } else if (stat.isFile()) files.push(resolve(path));
  }
  visit(resolve(directory), new Set([realpathSync(directory)]));
  return [...new Set(files)].sort();
}
export function assertWithin(root, file) {
  const absolute = resolve(file);
  const part = relative(resolve(root), absolute);
  if (!part || part === '..' || part.startsWith(`..${sep}`) || isAbsolute(part)) throw new Error(`Output outside build root: ${file}`);
  // Do not follow an output symlink into another workspace or upstream.
  let parent = dirname(absolute);
  while (parent !== resolve(root)) {
    if (existsSync(parent) && lstatSync(parent).isSymbolicLink()) throw new Error(`Output parent is a symlink: ${parent}`);
    parent = dirname(parent);
  }
  if (existsSync(absolute) && lstatSync(absolute).isSymbolicLink()) throw new Error(`Output is a symlink: ${absolute}`);
  return absolute;
}
export function writeChanged(file, data) {
  const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (existsSync(file) && readFileSync(file).equals(bytes)) return false;
  mkdirSync(dirname(file), {recursive: true});
  writeFileSync(file, bytes);
  return true;
}
function describe(path, membershipOnly = false) {
  path = resolve(path);
  if (!existsSync(path)) return [path, 'missing'];
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) return [path, 'link', realpathSync(path), describe(realpathSync(path), membershipOnly)];
  if (stat.isDirectory()) {
    const files = filesUnder(path);
    return [path, 'directory', files.map(file => membershipOnly ? relative(path, file) : [relative(path, file), digest(readFileSync(file))])];
  }
  return [path, 'file', membershipOnly ? null : digest(readFileSync(path))];
}
function inputsSignature(inputs, contexts = [], missing = [], toolchain = '') {
  const unique = paths => [...new Set(paths.map(path => resolve(path)))].sort();
  const paths = unique(inputs);
  return {hash: digest(JSON.stringify({toolchain, files: paths.map(path => describe(path)), contexts: unique(contexts).map(path => describe(path, true)), missing: unique(missing).map(path => [path, existsSync(path)])})), count: paths.length};
}
function outputRecords(root, files) {
  return [...new Set(files.map(file => assertWithin(root, file)))].sort().map(file => {
    const data = readFileSync(file);
    return {file, bytes: data.length, sha256: digest(data)};
  });
}
function cachePayload(state) {
  return {version: state.version, inputHash: state.inputHash, dependencies: state.dependencies, outputs: state.outputs, metadata: state.metadata};
}
function validSnapshot(state) {
  const paths = value => Array.isArray(value) && value.every(path => typeof path === 'string' && isAbsolute(path));
  if (!state || state.version !== 1 || typeof state.inputHash !== 'string' || !/^[a-f0-9]{64}$/.test(state.inputHash)) return false;
  const deps = state.dependencies;
  if (!deps || !['files', 'contexts', 'missing'].every(key => paths(deps[key]))) return false;
  if (!Array.isArray(state.outputs) || !state.outputs.every(output => output && typeof output.file === 'string' && isAbsolute(output.file) && Number.isSafeInteger(output.bytes) && output.bytes >= 0 && typeof output.sha256 === 'string' && /^[a-f0-9]{64}$/.test(output.sha256))) return false;
  return state.checksum === digest(JSON.stringify(cachePayload(state)));
}

export class StageCache {
  constructor({cacheRoot, outputRoot, force = false, toolchain = process.version}) {
    this.cacheRoot = resolve(cacheRoot); this.outputRoot = resolve(outputRoot); this.force = force; this.toolchain = toolchain; this.reports = [];
    if (existsSync(this.outputRoot) && lstatSync(this.outputRoot).isSymbolicLink()) throw new Error('Build output root must not be a symlink');
    mkdirSync(this.cacheRoot, {recursive: true});
  }
  async run(name, {inputs = [], execute}) {
    if (!/^[a-z0-9-]+$/.test(name)) throw new Error('Invalid build stage name');
    const started = performance.now(); const stateFile = resolve(this.cacheRoot, `${name}.json`);
    let previous;
    try { previous = JSON.parse(readFileSync(stateFile, 'utf8')); } catch {}
    if (!validSnapshot(previous)) previous = undefined;
    const dependencies = previous?.dependencies ?? {};
    const signature = inputsSignature([...inputs, ...(dependencies.files ?? [])], dependencies.contexts, dependencies.missing, this.toolchain);
    let reason = this.force ? 'forced' : !previous || previous.version !== 1 ? 'no-cache' : signature.hash !== previous.inputHash ? 'inputs-changed' : 'unchanged';
    if (reason === 'unchanged') {
      try {
        const outputs = outputRecords(this.outputRoot, previous.outputs.map(item => item.file));
        if (JSON.stringify(outputs) !== JSON.stringify(previous.outputs)) reason = 'outputs-changed';
      } catch { reason = 'outputs-missing-or-invalid'; }
    }
    if (reason === 'unchanged') {
      const report = {name, status: 'reused', reason, durationMs: performance.now() - started, inputsCount: signature.count, outputsCount: previous.outputs.length};
      this.reports.push(report); return {...report, metadata: previous.metadata, outputs: previous.outputs};
    }
    // A failure must never leave this stage marked reusable.
    if (existsSync(stateFile)) unlinkSync(stateFile);
    const executionStartedAt = Date.now();
    const staticBefore = inputsSignature(inputs, [], [], this.toolchain).hash;
    const result = await execute(previous?.version === 1 ? previous : undefined);
    const files = [...new Set(result.files ?? [])].filter(file => existsSync(file) && statSync(file).isFile());
    if (staticBefore !== inputsSignature(inputs, [], [], this.toolchain).hash || files.some(file => statSync(file).mtimeMs > executionStartedAt + 1)) throw new Error(`Build inputs changed during ${name}; run the build again`);
    const nextDependencies = {files, contexts: result.contexts ?? [], missing: result.missing ?? []};
    const nextSignature = inputsSignature([...inputs, ...files], nextDependencies.contexts, nextDependencies.missing, this.toolchain);
    const outputs = outputRecords(this.outputRoot, result.outputs);
    const knownOutputs = new Set(outputs.map(item => item.file));
    for (const old of previous?.outputs ?? []) {
      const file = assertWithin(this.outputRoot, old.file);
      if (!knownOutputs.has(file) && existsSync(file)) unlinkSync(file);
    }
    const state = {version: 1, inputHash: nextSignature.hash, dependencies: nextDependencies, outputs, metadata: result.metadata};
    state.checksum = digest(JSON.stringify(cachePayload(state)));
    writeChanged(stateFile, JSON.stringify(state, null, 2) + '\n');
    const report = {name, status: 'built', reason, durationMs: performance.now() - started, inputsCount: nextSignature.count, outputsCount: outputs.length};
    this.reports.push(report); return {...report, metadata: result.metadata, outputs};
  }
}
