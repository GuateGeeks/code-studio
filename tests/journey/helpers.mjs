export const LOCAL = 'http://127.0.0.1:5310';
export const REMOTE = 'http://gg-class.test:5310';

// Minimal host for tests before the real portal exists; answers the workspace protocol.
const HOST = `<!doctype html><title>host</title><script>window.saves = [];</script><style>html,body,iframe{margin:0;width:100%;height:100%;border:0}</style>
<iframe id="e" src="/code-studio/editor.html?nosandbox=1&ws=iframe&editorlayout=ide"></iframe><script>
addEventListener('message', ({data: m}) => {
  if (!m || m.type !== 'pxthost') return;
  const reply = extra => e.contentWindow.postMessage({...m, success: true, ...extra}, '*');
  if (m.action === 'workspacesync') reply({projects: [], editor: {}, controllerId: 'test'});
  else if (m.action === 'workspaceloaded') { reply(); e.contentWindow.postMessage({type: 'pxteditor', id: 'new', action: 'newproject'}, '*'); }
  else if (m.action === 'workspacesave') saves.push(m.project.text['main.ts']);
  else if (m.response) reply();
});</script>`;

// Watches the whole session, including sockets and anything a running game tries.
export function vigilarRed(page, origin) {
  const salidas = [];
  page.on('request', r => { if (/^https?:/.test(r.url()) && !r.url().startsWith(origin)) salidas.push(r.url()); });
  page.on('websocket', ws => salidas.push(ws.url()));
  return salidas;
}

export async function abrirEditor(page, origin = LOCAL) {
  await page.route('**/__host.html', route => route.fulfill({contentType: 'text/html', body: HOST}));
  await page.goto(`${origin}/code-studio/__host.html`);
  const editor = page.frameLocator('#e');
  await editor.locator('.blocklyDraggable').first().waitFor({state: 'attached', timeout: 45000});
  await page.waitForTimeout(2500);
  await page.keyboard.press('Escape');
  await page.mouse.click(816, 345);
  await page.waitForTimeout(600);
  return editor;
}

export async function escribirSinEsperar(page, editor, code) {
  const vista = editor.locator('.javascript-menuitem').first();
  if (!(await vista.getAttribute('class')).includes('active')) await vista.click();
  await page.waitForTimeout(4000);
  const frame = page.frames().find(f => /ws=iframe/.test(f.url()));
  await frame.evaluate(text => window.monaco.editor.getModels().find(m => /main\.ts/.test(m.uri.path)).setValue(text), code);
}

export async function escribir(page, editor, code) {
  await escribirSinEsperar(page, editor, code);
  await page.waitForTimeout(3500);
}

export const simulador = page => page.frames().find(f => /srcdoc/.test(f.url()));

export async function ejecutar(page, editor) {
  await editor.locator('.play-button').first().click();
  await page.waitForFunction(() => true);
  for (let i = 0; i < 80; i++) {
    const listo = await simulador(page)?.evaluate(() => {
      const canvas = document.getElementById('game-screen');
      return canvas && !canvas.classList.contains('hidden');
    }).catch(() => false);
    if (listo) return;
    await page.waitForTimeout(250);
  }
  throw new Error('El juego no arrancó');
}


export const portada = origin => `${origin}/code-studio/`;
export const editorDe = page => page.frameLocator('#editor-frame');

export async function entrarComo(page, nombre, origin = LOCAL) {
  if (!page.url().includes('/code-studio/')) await page.goto(portada(origin));
  const boton = page.getByRole('button', {name: nombre, exact: true});
  await page.waitForTimeout(300);
  if (await boton.count()) await boton.click();
  else {
    await page.getByLabel('Tu nombre').fill(nombre);
    await page.getByRole('button', {name: 'Entrar'}).click();
  }
}

export async function abrirProyecto(page) {
  const existente = page.locator('.project');
  await page.waitForTimeout(300);
  if (await existente.count()) await existente.first().click();
  else await page.getByRole('button', {name: 'Nuevo proyecto'}).click();
  const editor = editorDe(page);
  // A project reopens in the view the student left it in.
  await editor.locator('.blocklyDraggable, .monaco-editor').first().waitFor({state: 'attached', timeout: 45000});
  await page.waitForTimeout(1500);
  return editor;
}

export const leerCodigo = page => page.frames().find(f => /ws=iframe/.test(f.url())).evaluate(() => window.monaco.editor.getModels().find(m => /main\.ts/.test(m.uri.path)).getValue());

export const registros = (page, estudiante) => page.evaluate(async nombre => {
  const {openStore} = await import('./store.mjs');
  return (await openStore()).list(nombre);
}, estudiante);

const TECLAS = {A: 'Space', der: 'ArrowRight', izq: 'ArrowLeft', arr: 'ArrowUp', aba: 'ArrowDown'};

// Opens a game on its own page and waits for the game itself to report that it runs.
export async function abrirJuego(page, id, origin = LOCAL) {
  await page.goto(`${origin}/code-studio/player.html?juego=${id}`);
  await page.locator('body[data-estado=jugando]').waitFor({state: 'attached', timeout: 30000});
}

export const estadoJuego = page => page.evaluate(() => ({...document.body.dataset}));

// A press shorter than the game's polling is lost, so the key stays down a human-like moment.
export async function pulsar(page, tecla) {
  const codigo = TECLAS[tecla] ?? tecla;
  await page.keyboard.down(codigo);
  await page.waitForTimeout(120);
  await page.keyboard.up(codigo);
  await page.waitForTimeout(80);
}

const ENTRADAS = ['eleccion', 'confirmar', 'final'];

// Presses A through dialogs until the game waits for the student. `despuesDe` is the step of the
// previous wait: a state older than that is the one just answered, not the next one.
export async function pasarDialogos(page, despuesDe = -1) {
  const limite = Date.now() + 15000;
  let ultimo = {paso: -1, hora: 0};
  while (Date.now() < limite) {
    const estado = await estadoJuego(page);
    const paso = Number(estado.paso);
    if (paso > despuesDe && ENTRADAS.includes(estado.espera)) return estado;
    // A long text has several pages under the same step, so the same dialog may need another A.
    if (paso > despuesDe && estado.espera === 'dialogo' && (paso !== ultimo.paso || Date.now() - ultimo.hora > 700)) {
      ultimo = {paso, hora: Date.now()};
      await pulsar(page, 'A');
      continue;
    }
    await page.waitForTimeout(50);
  }
  throw new Error(`El juego no llegó a una entrada: ${JSON.stringify(await estadoJuego(page))}`);
}

// Plays the rounds of a solution file: each round is the keys for one moment the game waits for the student.
export async function jugar(page, rondas) {
  let paso = -1;
  for (const teclas of rondas) {
    const estado = await pasarDialogos(page, paso);
    paso = Number(estado.paso);
    for (const tecla of teclas) await pulsar(page, tecla);
  }
  return pasarDialogos(page, paso);
}

export const todosLosRegistros = page => page.evaluate(async () => {
  const {openStore} = await import('./store.mjs');
  return (await openStore()).all();
});

// «Ver cómo está hecho»: from the player to the editor. A first copy is shown in blocks; one reopened
// reopens in the view the student left it in, so `bloques: false` accepts either editor.
export async function verCopia(page, {bloques = true} = {}) {
  await page.locator('#player-code').click();
  await editorDe(page).locator(bloques ? '.blocklyDraggable' : '.blocklyDraggable, .monaco-editor').first().waitFor({state: 'attached', timeout: 60000});
  await page.waitForTimeout(1500);
}

// Student -> catalog -> game: the way a student gets to the player.
export async function abrirJuegoDesdePortada(page, estudiante, titulo) {
  await entrarComo(page, estudiante);
  await page.locator('#open-catalog').click();
  await page.locator('#catalog').getByRole('button', {name: titulo}).click();
  await page.locator('body[data-estado=jugando]').waitFor({state: 'attached', timeout: 30000});
}

export const bloquesDe = page => editorDe(page).locator('.blocklyDraggable').count();
