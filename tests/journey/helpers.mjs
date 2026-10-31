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

export async function escribir(page, editor, code) {
  await editor.locator('.javascript-menuitem').first().click();
  await page.waitForTimeout(4000);
  const frame = page.frames().find(f => /ws=iframe/.test(f.url()));
  await frame.evaluate(text => window.monaco.editor.getModels().find(m => /main\.ts/.test(m.uri.path)).setValue(text), code);
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
