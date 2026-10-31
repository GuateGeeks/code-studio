import {createReadStream, existsSync, statSync} from 'node:fs';
import http from 'node:http';
import {extname, join, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.wasm': 'application/wasm'};

export function createServer(root) {
  const base = resolve(root);
  return http.createServer((request, response) => {
    let path = decodeURIComponent(request.url.split(/[?#]/)[0]);
    if (path === '/') { response.writeHead(302, {Location: '/code-studio/'}); return response.end(); }
    if (path.endsWith('/')) path += 'index.html';
    const file = resolve(join(base, path));
    if (!file.startsWith(base + sep) || !existsSync(file) || statSync(file).isDirectory()) { response.writeHead(404); return response.end(); }
    response.writeHead(200, {'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store'});
    createReadStream(file).pipe(response);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.GG_PORT ?? 5310);
  const root = resolve(fileURLToPath(new URL('../dist/site', import.meta.url)));
  const server = createServer(root);
  server.on('error', error => {
    console.error(error.code === 'EADDRINUSE' ? `El puerto ${port} está ocupado. Cierra el otro proceso e inténtalo de nuevo.` : error.message);
    process.exit(1);
  });
  server.listen(port, '127.0.0.1', () => console.log(`Code Studio en http://127.0.0.1:${port}/code-studio/`));
}
