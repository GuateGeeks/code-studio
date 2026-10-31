export const LOCAL = 'http://127.0.0.1:5310';
export const REMOTE = 'http://gg-class.test:5310';

// Minimal host for tests before the real portal exists; answers the workspace protocol.
const HOST = `<!doctype html><title>host</title><style>html,body,iframe{margin:0;width:100%;height:100%;border:0}</style>
<iframe id="e" src="/code-studio/index.html?nosandbox=1&ws=iframe&editorlayout=ide"></iframe><script>
addEventListener('message', ({data: m}) => {
  if (!m || m.type !== 'pxthost') return;
  const reply = extra => e.contentWindow.postMessage({...m, success: true, ...extra}, '*');
  if (m.action === 'workspacesync') reply({projects: [], editor: {}, controllerId: 'test'});
  else if (m.action === 'workspaceloaded') { reply(); e.contentWindow.postMessage({type: 'pxteditor', id: 'new', action: 'newproject'}, '*'); }
  else if (m.response) reply();
});</script>`;

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
