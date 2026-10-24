import {extname} from 'node:path';

export function browserConfiguration(env = process.env) {
  const shellPort = Number(env.GG_SHELL_PORT ?? 4173);
  const ports = {
    shell: shellPort,
    runner: Number(env.GG_RUNNER_PORT ?? 4174),
    simulator: Number(env.GG_SIMULATOR_PORT ?? 4175),
    language: Number(env.GG_LANGUAGE_PORT ?? shellPort + 3),
    scene3d: Number(env.GG_SCENE3D_PORT ?? (shellPort === 4183 ? 4191 : shellPort === 4193 ? 4201 : shellPort === 4177 ? 4188 : 4181)),
    webapp: Number(env.GG_WEBAPP_PORT ?? (shellPort === 4183 ? 4192 : shellPort === 4193 ? 4202 : shellPort === 4177 ? 4189 : 4182))
  };
  if (Object.values(ports).some(port => !Number.isSafeInteger(port) || port < 1 || port > 65535) ||
      new Set(Object.values(ports)).size !== Object.keys(ports).length) throw new Error('Browser origins require six distinct valid ports.');
  return {ports, origins: Object.fromEntries(Object.entries(ports).map(([role, port]) => [`${role}Origin`, `http://127.0.0.1:${port}`]))};
}

export function browserPolicy(role, {shellOrigin, runnerOrigin, simulatorOrigin, languageOrigin, scene3dOrigin, webappOrigin}) {
  if (!['shell', 'runner', 'simulator', 'language', 'scene3d', 'webapp'].includes(role)) throw new Error('Unknown browser role');
  const script = role === 'language' ? "'self' 'unsafe-eval' 'wasm-unsafe-eval'"
    : role === 'simulator' ? "'self' 'unsafe-eval'" : "'self'";
  const style = role === 'simulator' || role === 'shell' ? "'self' 'unsafe-inline'" : "'self'";
  const frames = role === 'shell' ? [runnerOrigin, languageOrigin, scene3dOrigin, webappOrigin].filter(Boolean).join(' ') : role === 'runner' ? simulatorOrigin : "'none'";
  const ancestors = role === 'simulator' ? `${shellOrigin} ${runnerOrigin}`
    : ['runner','language','scene3d','webapp'].includes(role) ? shellOrigin : "'none'";
  return `default-src 'none'; script-src ${script}; style-src ${style}; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self'; frame-src ${frames}; frame-ancestors ${ancestors}; base-uri 'none'; form-action 'none'; object-src 'none'`;
}

export function browserContentType(file) {
  const mime = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
    '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.zip': 'application/zip'};
  const type = mime[extname(file)] ?? 'application/octet-stream';
  return type.startsWith('text/') || type === 'application/json' || type === 'image/svg+xml' ? `${type}; charset=utf-8` : type;
}
