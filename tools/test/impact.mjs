import {isAbsolute, relative, resolve, sep} from 'node:path';

export const normalBrowserFiles = Object.freeze([
  'canonical-projects.spec.mjs',
  'workspace-presentation.spec.mjs',
  'integrated-2d-workspace.spec.mjs',
  'integrated-microbit-workspace.spec.mjs',
  'integrated-scratch-workspace.spec.mjs',
  'integrated-3d-workspace.spec.mjs',
  'integrated-web-workspace.spec.mjs',
  'educational-activities.spec.mjs', 'studio-contextual-workspace.spec.mjs', 'studio-entry-journey.spec.mjs', 'accessibility-shell.spec.mjs', 'accessibility-runner.spec.mjs', 'accessibility-zoom.spec.mjs',
  'audio-variables.spec.mjs', 'bindings-editor.spec.mjs', 'code-console.spec.mjs', 'corpus.spec.mjs',
  'isolation.spec.mjs', 'sb3-resources.spec.mjs', 'resource-safety.spec.mjs', 'capability-contexts.spec.mjs', 'scene3d-advanced.spec.mjs', 'standalone-contexts.spec.mjs', 'minimum-corpus.spec.mjs', 'project-persistence.spec.mjs', 'packs-lessons.spec.mjs', 'offline-recovery.spec.mjs',
  'pxt-worker.spec.mjs', 'device-integration.spec.mjs', 'device-transfer.spec.mjs', 'language-runtime.spec.mjs', 'textual-equivalence.spec.mjs', 'textual-corpus.spec.mjs', 'runner.spec.mjs', 'scene-inspector.spec.mjs', 'simulator.spec.mjs'
].map(file => `tests/browser/${file}`));
const twoD = normalBrowserFiles.filter(file => !/pxt-worker|simulator/.test(file));
const persistence = ['tests/browser/device-integration.spec.mjs', 'tests/browser/packs-lessons.spec.mjs', 'tests/browser/offline-recovery.spec.mjs', 'tests/browser/project-persistence.spec.mjs', 'tests/browser/language-runtime.spec.mjs', 'tests/browser/textual-equivalence.spec.mjs', 'tests/browser/textual-corpus.spec.mjs'];
const controls = ['tests/browser/device-transfer.spec.mjs', 'tests/browser/code-console.spec.mjs', 'tests/browser/audio-variables.spec.mjs', 'tests/browser/bindings-editor.spec.mjs', ...persistence];
const pxt = ['tests/browser/pxt-worker.spec.mjs', 'tests/browser/simulator.spec.mjs', 'tests/browser/device-integration.spec.mjs', 'tests/browser/device-transfer.spec.mjs'];
const bindings = ['tests/browser/bindings-editor.spec.mjs', ...persistence];
// Context groups (test-gate-scaling): a change inside one context runs that
// context's suites plus shared persistence, not the whole gate.
const browserFiles = (...names) => names.map(name => `tests/browser/${name}.spec.mjs`);
const scene3d = browserFiles('integrated-3d-workspace', 'scene3d-advanced', 'capability-contexts', 'standalone-contexts', 'studio-contextual-workspace');
const webapp = browserFiles('integrated-web-workspace', 'capability-contexts', 'standalone-contexts', 'studio-contextual-workspace');
const microbit = [...new Set([...pxt, ...browserFiles('integrated-microbit-workspace')])];
const scratchImport = browserFiles('sb3-resources', 'integrated-scratch-workspace', 'resource-safety');
const compatibility = [...new Set([...persistence, ...browserFiles('packs-lessons', 'educational-activities')])];
export const contextGroups = Object.freeze([
  {group: 'project-compatibility', reason: 'Compatibilidad de proyectos y migraciones de packs', browser: compatibility,
    match: path => ['src/contracts/engine-locks.mjs', 'src/contracts/pack-migrations.mjs', 'src/project-migration.mjs'].includes(path)},
  {group: 'scene3d', reason: 'Contexto 3D propio', browser: scene3d,
    match: path => ['src/contracts/scene3d-program.mjs', 'src/contracts/media-glb.mjs'].includes(path) || /^src\/(?:adapters\/babylon\/|packs\/gg\.3d-)/.test(path)},
  {group: 'webapp', reason: 'Contexto de aplicación web propio', browser: webapp,
    match: path => path === 'src/contracts/webapp-program.mjs' || /^src\/(?:adapters\/webapp\/|packs\/gg\.webapps\/)/.test(path)},
  {group: 'capability', reason: 'Capacidades compartidas por 3D y web', browser: [...new Set([...scene3d, ...webapp])],
    match: path => ['src/contracts/operations.mjs', 'src/contracts/program-ir1.mjs', 'src/contracts/capability-data.mjs', 'src/contracts/capability-language.mjs', 'src/capability-program-host.mjs', 'src/generated-capability-source.mjs'].includes(path) || /^src\/(?:editor|studio)\/capability-[^/]+\.mjs$/.test(path)},
  {group: 'microbit', reason: 'Contexto micro:bit propio', browser: microbit,
    match: path => /^src\/(?:contracts\/device-[^/]+\.mjs|editor\/device-editor\.mjs|studio\/device-ui\.mjs|packs\/gg\.microbit\/|device-transfer\/)/.test(path)},
  {group: 'scratch-import', reason: 'Importación Scratch y recursos', browser: scratchImport,
    match: path => /^src\/(?:contracts\/sb3-[^/]+\.mjs|adapters\/scratch\/sb3\/|import\/|studio\/resources-ui\.mjs|packs\/gg\.sb3\/)/.test(path)}
]);
export function normalizeChangedPath(input, {root, workspace = resolve(root, '..')} = {}) {
  if (typeof input !== 'string' || !input || /[\0\r\n]/.test(input)) throw new Error('Ruta de impacto vacía o inválida');
  let portable = input.replaceAll('\\', '/').replace(/^\/\/wsl(?:\.localhost|\$)\/Ubuntu(?=\/)/i, '');
  if (/^[a-z]:\//i.test(portable) || portable.startsWith('//')) throw new Error(`Ruta fuera del workspace: ${input}`);
  const absolute = isAbsolute(portable) ? resolve(portable) : resolve(root, portable);
  const boundary = relative(workspace, absolute);
  if (boundary === '..' || boundary.startsWith(`..${sep}`) || isAbsolute(boundary)) throw new Error(`Ruta fuera del workspace: ${input}`);
  const result = relative(root, absolute).replaceAll(sep, '/');
  return result || '.';
}

export function classifyFile(path) {
  if (path.startsWith('../docs/')) return {group: 'documentation', reason: 'Documentación del workspace', browser: []};
  if (path.startsWith('../')) return {group: 'full', reason: 'Cambio en un checkout, fuente o paquete upstream', browser: normalBrowserFiles};
  if (/^(?:docs|openspec|\.agents)\//.test(path) || /(?:^|\/)[^/]+\.md$/i.test(path)) return {group: 'documentation', reason: 'Documentación o contrato OpenSpec', browser: []};
  if (path.startsWith('tests/fixtures/canonical/')) return {group: 'canonical', reason: 'Proyecto canónico', browser: ['tests/browser/canonical-projects.spec.mjs']};
  for (const item of contextGroups) if (item.match(path)) return {group: item.group, reason: item.reason, browser: [...item.browser]};
  // Owned sources mirror legacy areas; unknown/new shared code still expands to full.
  if (/^src\/(?:offline\/|contracts\/pack|packs\/|lessons\.mjs|lesson-|studio\/lesson)/.test(path)) return {group: 'packs-lessons-offline', reason: 'Capacidades, actividades y preparación offline', browser: ['tests/browser/educational-activities.spec.mjs', 'tests/browser/packs-lessons.spec.mjs', 'tests/browser/offline-recovery.spec.mjs', ...persistence]};
  if (path === 'src/studio/project-ui.mjs') return {group: 'persistence', reason: 'Controlador propio de proyecto', browser: persistence};
  if (/^src\/studio\/.*\.(?:html|css)$/.test(path)) return {group: 'controls', reason: 'UI propia con controles reales, recorrido, accesibilidad y móvil', browser: [...controls, 'tests/browser/workspace-presentation.spec.mjs', 'tests/browser/integrated-2d-workspace.spec.mjs', 'tests/browser/integrated-microbit-workspace.spec.mjs', 'tests/browser/integrated-scratch-workspace.spec.mjs', 'tests/browser/integrated-3d-workspace.spec.mjs','tests/browser/integrated-web-workspace.spec.mjs', 'tests/browser/educational-activities.spec.mjs', 'tests/browser/studio-contextual-workspace.spec.mjs', 'tests/browser/studio-entry-journey.spec.mjs', 'tests/browser/accessibility-shell.spec.mjs', 'tests/browser/accessibility-runner.spec.mjs', 'tests/browser/accessibility-zoom.spec.mjs', 'tests/browser/scene-inspector.spec.mjs', 'tests/browser/language-runtime.spec.mjs']};
  if (['src/generated-code.mjs', 'src/diagnostic-console.mjs', 'src/studio/code-console-ui.mjs'].includes(path)) return {group: 'code-console', reason: 'Generación y diagnóstico derivados', browser: ['tests/browser/code-console.spec.mjs', 'tests/browser/language-runtime.spec.mjs']};
  if (['src/scene-inspection.mjs', 'src/studio/scene-inspector-ui.mjs'].includes(path)) return {group: 'scene-inspector', reason: 'Lectura de escena y selección accesible', browser: ['tests/browser/scene-inspector.spec.mjs', ...bindings]};
  if (path.startsWith('src/editor/') || path === 'src/contracts/program-contract.mjs' || path.startsWith('src/adapters/scratch/') || path.startsWith('src/assets/')) return {group: 'two-dimensional', reason: 'Editor, IR o adaptación 2D propia', browser: twoD};
  if (path === 'src/contracts/gg-client.mjs') return {group: 'bindings', reason: 'Cliente GG propio y lectura de escena', browser: [...bindings, 'tests/browser/scene-inspector.spec.mjs']};
  if (path.startsWith('src/targets/text/') || path === 'src/contracts/language-runtime.mjs' || path === 'src/text-documents.mjs' || path === 'src/contracts/text-program.mjs' || path === 'src/generated-program-source.mjs' || ['src/studio/language-controller.mjs', 'src/studio/text-documents-ui.mjs'].includes(path)) return {group: 'language-runtime', reason: 'Documentos de texto y runtimes aislados', browser: ['tests/browser/language-runtime.spec.mjs', ...persistence]};
  if (path.startsWith('src/targets/microbit/')) return {group: 'pxt', reason: 'Target micro:bit propio', browser: pxt};
  if (/^src\/(?:project-format|project-archive|autosave-store)\.mjs$/.test(path) || path === 'spikes/browser/shell/project-ui.mjs') return {group: 'persistence', reason: 'Formato, almacenamiento o controlador de proyecto', browser: persistence};
  if (/^spikes\/browser\/shell\/.*\.(?:html|css)$/.test(path)) return {group: 'controls', reason: 'Composición visual y controles reales de UI', browser: controls};
  if (['spikes/browser/shell/editor-entry.mjs', 'spikes/block-program.mjs', 'spikes/program-contract.mjs', 'spikes/scratch-project.mjs'].includes(path) || path.startsWith('tests/fixtures/') || path.startsWith('spikes/browser/assets/')) return {group: 'two-dimensional', reason: 'Traducción, contrato IR, editor o recursos 2D compartidos', browser: twoD};
  if (['spikes/gg-client.mjs', 'spikes/gg-bindings.mjs'].includes(path)) return {group: 'bindings', reason: 'Bindings GG compartidos con la autoría', browser: bindings};
  if (/^spikes\/browser\/simulator\//.test(path) || /^spikes\/browser\/runner\/(?:compiler-worker|pxt-worker)\.js$/.test(path) || path === 'spikes/pxt-adapter.mjs') return {group: 'pxt', reason: 'Compilación o simulación PXT', browser: pxt};
  if (path.startsWith('tests/browser/') && path.endsWith('.spec.mjs')) return normalBrowserFiles.includes(path) ? {group: 'browser-test', reason: 'Prueba de navegador declarada', browser: [path]} : {group: 'full', reason: 'Prueba de navegador no inventariada', browser: normalBrowserFiles};
  if (path.startsWith('tests/quick/') && path.endsWith('.spec.mjs')) return {group: 'quick-test', reason: 'Prueba de humo', browser: [], quick: true};
  if (/^tests\/(?:integration|tools)\/.*\.test\.mjs$/.test(path)) return {group: 'node-test', reason: 'Prueba Node: ejecutar contratos y herramientas', browser: []};
  if (path === 'playwright.quick.config.mjs') return {group: 'quick-test', reason: 'Configuración del smoke', browser: [], quick: true};
  return {group: 'full', reason: 'Frontera compartida, configuración o impacto desconocido', browser: normalBrowserFiles};
}

export function createPlan(profile, {files = [], source = 'explicit', baselineStatus = 'valid'} = {}) {
  if (!['quick', 'affected', 'full'].includes(profile)) throw new Error(`Perfil no soportado: ${profile}`);
  if (profile === 'quick') return {profile, source: 'profile', selection: 'quick', node: true, tools: true, quick: true, browser: [], validateSpecs: false, verifyBaseline: false, build: true, baselineMayAdvance: false, files: [], reasons: [{reason: 'Contratos Node y humo de autoría/persistencia/Stop'}]};
  if (profile === 'full') return {profile, source: 'profile', selection: 'full', node: true, tools: true, quick: true, browser: [...normalBrowserFiles], validateSpecs: true, verifyBaseline: true, build: true, baselineMayAdvance: true, files: [], reasons: [{reason: 'Regresión completa solicitada'}]};
  const unique = [...new Set(files)].sort();
  if (baselineStatus !== 'valid') return {profile, source, selection: 'full', node: true, tools: true, quick: true, browser: [...normalBrowserFiles], validateSpecs: true, verifyBaseline: true, build: true, baselineMayAdvance: false, files: unique, reasons: [{reason: `Línea base ${baselineStatus}: regresión completa conservadora`}]};
  const classified = unique.map(file => ({file, ...classifyFile(file)}));
  const code = classified.filter(item => item.group !== 'documentation');
  const full = code.some(item => item.group === 'full');
  const browser = full ? [...normalBrowserFiles] : [...new Set(code.flatMap(item => item.browser))].sort();
  const quick = full || code.some(item => item.quick);
  return {profile, source, selection: !unique.length ? 'unchanged' : !code.length ? 'documentation' : full ? 'full' : 'affected', node: code.length > 0, tools: code.length > 0, quick, browser, validateSpecs: unique.length > 0, verifyBaseline: full, build: Boolean(browser.length || quick), baselineMayAdvance: false, files: unique, reasons: classified.map(({file, group, reason}) => ({file, group, reason}))};
}

export function parseArguments(argv) {
  const [profile, ...args] = argv;
  if (!['quick', 'affected', 'full'].includes(profile)) throw new Error('Uso: run.mjs quick|affected|full [--files rutas...] [--list|--dry-run] [--force-build] [--partitions N|auto]');
  const options = {profile, files: [], explicit: false, dryRun: false, forceBuild: false};
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--list' || arg === '--dry-run') options.dryRun = true;
    else if (arg === '--force-build') options.forceBuild = true;
    else if (arg === '--partitions') {
      if (args[index + 1] === 'auto') { options.partitions = 'auto'; index++; continue; }
      const value = Number(args[++index]);
      if (!Number.isSafeInteger(value) || value < 1 || value > 8) throw new Error('--partitions requiere un entero entre 1 y 8');
      options.partitions = value;
    }
    else if (arg === '--files') {
      if (profile !== 'affected') throw new Error('--files sólo se admite en test:affected');
      const start = index + 1;
      while (index + 1 < args.length && !args[index + 1].startsWith('--')) options.files.push(args[++index]);
      if (index + 1 === start) throw new Error('--files requiere al menos una ruta');
      options.explicit = true;
    } else throw new Error(`Argumento no reconocido: ${arg}`);
  }
  return options;
}


