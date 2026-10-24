import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {resolve, relative, sep} from 'node:path';
import {projectRoot} from '../paths.mjs';
import {browserConfiguration, browserPolicy, browserContentType} from '../build/browser-policy.mjs';
import {createStandaloneRuntime} from '../build/standalone-package.mjs';
import {createReleaseSnapshot} from '../build/release-snapshot.mjs';

const {ports, origins} = browserConfiguration();
// Alternate output roots let isolated release/offline tests use copies of the
// build without editing product sources or disturbing a running Studio.
const browserRoot = resolve(process.env.GG_BROWSER_ROOT ?? resolve(projectRoot, 'artifacts/browser'));
const releaseRoot = resolve(process.env.GG_RELEASE_ROOT ?? resolve(projectRoot, 'artifacts/releases'));
const release = await createReleaseSnapshot({browserRoot, releaseRoot, origins});
const servers = [];
for (const [role, port] of Object.entries(ports)) {
  const root = resolve(browserRoot, role);
  const server = createServer(async (request, response) => {
    const ownOrigin = origins[`${role}Origin`];
    response.setHeader('Content-Security-Policy', browserPolicy(role, origins));
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), usb=(), serial=()');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Origin-Agent-Cluster', '?1');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cache-Control', 'no-store');
    try {
      if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405).end(); return; }
      const pathname = decodeURIComponent(new URL(request.url, ownOrigin).pathname);
      // Only the dedicated top-level shell document may request WebUSB. Its
      // existing frame-ancestors 'none' policy also excludes embedded transfer.
      if (role === 'shell' && /^\/(?:releases\/[a-f0-9]{64}\/)?device-transfer\.html$/.test(pathname)) {
        response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), usb=(self), serial=()');
      }
      if (pathname === '/health') { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify({role})); return; }
      if(role==='shell'&&['/','/latest','/device-transfer.html'].includes(pathname)){
        const destination=release.releaseBase+(pathname==='/device-transfer.html'?'device-transfer.html'+new URL(request.url,ownOrigin).search:'');
        response.writeHead(302,{Location:destination}).end();return;
      }
      if(role==='shell'&&pathname.startsWith('/standalone-runtime/')){
        const match=/^\/standalone-runtime\/([a-f0-9]{64})\/(scene3d|webapp)\/(javascript|python)\.zip$/.exec(pathname);
        if(!match){response.writeHead(404).end();return;}
        const bytes=await createStandaloneRuntime({releaseRoot,cohort:match[1],contextId:match[2],language:match[3]});response.setHeader('Content-Type','application/zip');response.end(request.method==='HEAD'?undefined:bytes);return;
      }
      const released = await release.resolveRoute(role, pathname);
      if (released) {
        response.setHeader('Content-Type', released.contentType);
        if (released.immutable) response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        response.end(request.method === 'HEAD' ? undefined : released.filePath ? await readFile(released.filePath) : released.body);
        return;
      }
      if (pathname.startsWith('/releases/')) { response.writeHead(404).end(); return; }
      if (pathname === '/config.json') { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify({...origins,cohort:release.cohort,releaseBase:release.releaseBase,offlineProtocolVersion:2})); return; }
      const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
      const pathFromRoot = relative(root, file);
      if (pathFromRoot.startsWith(`..${sep}`) || pathFromRoot === '..' || pathFromRoot.startsWith(sep)) { response.writeHead(403).end(); return; }
      if (!(await stat(file)).isFile()) { response.writeHead(404).end(); return; }
      response.setHeader('Content-Type', browserContentType(file));
      response.end(request.method === 'HEAD' ? undefined : await readFile(file));
    } catch (error) { response.writeHead(error.code === 'ENOENT' ? 404 : 500).end(); }
  });
  await new Promise((done, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', done); });
  servers.push(server);
  console.log(`${role}: ${origins[`${role}Origin`]}`);
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  for (const server of servers) {
    server.close();
    // A stopped local server must also release persistent browser connections.
    server.closeAllConnections();
  }
});
