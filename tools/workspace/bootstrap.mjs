// Second half of tools/workspace/bootstrap.sh, run with the pinned Node.
// Each step is idempotent: existing inputs are verified, never overwritten.
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream, createWriteStream, existsSync} from 'node:fs';
import {copyFile, mkdir, readFile, rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pipeline} from 'node:stream/promises';
import {projectRoot, workspaceRoot, xcratchRoot, microbitRoot} from '../paths.mjs';
import {upstreamPlans, upstreamFiles, treeDigest, runtimePackages, packageRoot, runtimePackageFiles} from '../release/source-plan.mjs';

const options = process.argv.slice(2);
if (options.some(option => option !== '--browsers')) throw new Error('Uso: bash tools/workspace/bootstrap.sh [--browsers]');
const lock = JSON.parse(await readFile(resolve(projectRoot, 'release/source-lock.json'), 'utf8'));
const logs = resolve(projectRoot, 'artifacts/bootstrap');
await mkdir(logs, {recursive: true});
const repository = id => lock.repositories.find(item => item.id === id);
const sha256 = async file => { const hash = createHash('sha256'); await pipeline(createReadStream(file), hash); return hash.digest('hex'); };
const step = message => console.log(`· ${message}`);

function run(command, args, {cwd, log, until} = {}) {
  return new Promise((done, reject) => {
    const output = createWriteStream(resolve(logs, log));
    const child = spawn(command, args, {cwd, env: process.env, stdio: ['ignore', 'pipe', 'pipe']});
    let seen = '';
    const watch = chunk => {
      output.write(chunk);
      if (!until) return;
      seen = (seen + chunk).slice(-4096);
      if (until.test(seen)) child.kill('SIGTERM');
    };
    child.stdout.on('data', watch); child.stderr.on('data', watch);
    child.once('error', reject);
    child.once('close', (code, signal) => {
      output.end();
      if (code === 0 || (until && signal === 'SIGTERM' && until.test(seen))) done();
      else reject(new Error(`${command} ${args.join(' ')} falló (${code ?? signal}); revisa artifacts/bootstrap/${log}`));
    });
  });
}
const git = (cwd, args, log) => run('git', args, {cwd, log});
const capture = (cwd, args) => new Promise((done, reject) => {
  const child = spawn('git', args, {cwd, stdio: ['ignore', 'pipe', 'ignore']}); let text = '';
  child.stdout.on('data', chunk => { text += chunk; });
  child.once('close', code => code === 0 ? done(text.trim()) : reject(new Error(`git ${args.join(' ')} (${code})`)));
});

async function checkout(id, root) {
  const {origin, revision} = repository(id);
  if (existsSync(root)) {
    const head = await capture(root, ['rev-parse', 'HEAD']);
    if (head !== revision) throw new Error(`${root} está en ${head}; se esperaba ${revision}. Muévelo o cámbialo de revisión tú mismo.`);
    step(`${id}: ya está en ${revision.slice(0, 12)}`);
    return false;
  }
  step(`${id}: clonando ${origin} en ${revision.slice(0, 12)}`);
  await mkdir(root, {recursive: true});
  await git(root, ['init', '--quiet'], `${id}-git.log`);
  await git(root, ['remote', 'add', 'origin', origin], `${id}-git.log`);
  await git(root, ['fetch', '--quiet', '--depth', '1', 'origin', revision], `${id}-fetch.log`);
  await git(root, ['checkout', '--quiet', '--detach', 'FETCH_HEAD'], `${id}-checkout.log`);
  return true;
}

// Xcratch: VM/render/SVG sources and the two webpack bundles the product loads.
await checkout('xcratch', xcratchRoot);
step('xcratch: npm ci --ignore-scripts');
await run('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], {cwd: xcratchRoot, log: 'xcratch-npm.log'});
for (const name of ['scratch-svg-renderer', 'scratch-render']) {
  step(`xcratch: webpack ${name}`);
  await run('npm', ['exec', `--workspace=@scratch/${name}`, '--', 'webpack', '--mode', 'development'], {cwd: xcratchRoot, log: `xcratch-${name}.log`});
}

// pxt-microbit: upstream has no lockfile, so the pinned one ships here. The
// preserved patch is what pxt serve regenerates; applying it first keeps the
// tree identical even if a later serve is skipped.
const fresh = await checkout('microbit', microbitRoot);
const microbitLock = resolve(microbitRoot, 'package-lock.json');
if (!existsSync(microbitLock)) await copyFile(resolve(projectRoot, 'release/locks/pxt-microbit.package-lock.json'), microbitLock);
step('microbit: npm ci');
await run('npm', ['ci', '--no-audit', '--no-fund'], {cwd: microbitRoot, log: 'microbit-npm.log'});
const patch = resolve(projectRoot, lock.patch.path);
if (await sha256(patch) !== lock.patch.sha256) throw new Error('El parche de micro:bit no coincide con release/source-lock.json');
try {
  await git(microbitRoot, ['apply', '--check', patch], 'microbit-patch-check.log');
  await git(microbitRoot, ['apply', patch], 'microbit-patch.log');
  step('microbit: parche previo aplicado');
} catch {
  await git(microbitRoot, ['apply', '--reverse', '--check', patch], 'microbit-patch-reverse.log');
  step('microbit: el parche previo ya estaba aplicado');
}
const prebuiltsMatch = async () => (await Promise.all(lock.prebuilts.map(async item => existsSync(resolve(workspaceRoot, item.source)) && await sha256(resolve(workspaceRoot, item.source)) === item.sha256))).every(Boolean);
if (fresh || !(await prebuiltsMatch())) {
  // `pxt serve` (not `pxt buildtarget`) produces the locally served target the
  // product pins; stop it once the build has finished and it starts serving.
  step('microbit: compilando el target con pxt serve (unos minutos)');
  await run(process.execPath, ['node_modules/pxt-core/built/pxt.js', 'serve', '--no-browser', '--port', '3290', '--wsport', '3291'],
    {cwd: microbitRoot, log: 'microbit-pxt-serve.log', until: /To launch the editor, open this URL/});
}

// PXT Core source: the original archive, verified by size and hash.
const pxtCore = resolve(workspaceRoot, '.tools/pxt-core-source');
if (!existsSync(pxtCore)) {
  const {origin, sha256: expected, bytes} = lock.originalPxtArchive;
  const archive = resolve(workspaceRoot, '.tools/pxt-core-source.tar.gz');
  if (!existsSync(archive) || await sha256(archive) !== expected) {
    step(`pxt-core: descargando ${Math.round(bytes / 1e6)} MB`);
    await run('curl', ['--fail', '--location', '--retry', '3', '--silent', '--show-error', '--output', archive + '.part', origin], {log: 'pxt-core-download.log'});
    if (await sha256(archive + '.part') !== expected) throw new Error('El archivo de PXT Core no coincide con release/source-lock.json');
    await rename(archive + '.part', archive);
  }
  step('pxt-core: extrayendo');
  await mkdir(pxtCore + '.part', {recursive: true});
  await run('tar', ['-xzf', archive, '-C', pxtCore + '.part', '--strip-components=1'], {log: 'pxt-core-extract.log'});
  await rename(pxtCore + '.part', pxtCore);
} else step('pxt-core: fuente ya presente');

step('producto: npm ci');
await run('npm', ['ci', '--no-audit', '--no-fund'], {cwd: projectRoot, log: 'product-npm.log'});
if (options.includes('--browsers')) {
  step('producto: Chromium de Playwright');
  await run('npx', ['playwright', 'install', 'chromium'], {cwd: projectRoot, log: 'playwright-install.log'});
}

// Same checks the browser build applies, reported together.
const failures = [];
for (const plan of upstreamPlans) {
  const expected = repository(plan.id).treeSha256;
  if (await treeDigest(resolve(workspaceRoot, plan.root), await upstreamFiles(workspaceRoot, plan)) !== expected) failures.push(`árbol ${plan.id}`);
}
for (const item of lock.prebuilts) {
  const file = resolve(workspaceRoot, item.source);
  if (!existsSync(file) || await sha256(file) !== item.sha256) failures.push(`precompilado ${item.source}`);
}
for (const item of runtimePackages) {
  const expected = lock.runtimeSources.find(entry => entry.id === `${item.group}:${item.name}`)?.sha256;
  const options = {projectRoot, workspaceRoot};
  if (await treeDigest(packageRoot(options, item), await runtimePackageFiles(options, item)) !== expected) failures.push(`runtime ${item.group}:${item.name}`);
}
if (failures.length) {
  console.error(`\nEl workspace no coincide con release/source-lock.json:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('\nWorkspace verificado contra release/source-lock.json. Siguiente paso: npm run browser:build');
