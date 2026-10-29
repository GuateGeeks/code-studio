// Captura la hoja de contacto de la biblioteca inicial con Chromium de Playwright.
// Uso: node tools/resources/capture-contact-sheet.mjs <carpeta>
import {spawnSync} from 'node:child_process';
import {resolve, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {chromium} from '@playwright/test';

const folder = resolve(process.argv[2] ?? 'artifacts/stabilization-2d/e4-resources/contact-sheet');
const generator = resolve(dirname(fileURLToPath(import.meta.url)), 'starter-library.mjs');
const generated = spawnSync(process.execPath, [generator, '--contact-sheet', folder], {stdio: 'inherit'});
if (generated.status !== 0) throw new Error('No se generó la hoja de contacto');
const browser = await chromium.launch();
try {
  for (const [name, width, scale] of [['contact-sheet.png', 1280, 1], ['contact-sheet-small.png', 640, 1]]) {
    const page = await browser.newPage({viewport: {width, height: 900}, deviceScaleFactor: scale});
    await page.goto(pathToFileURL(resolve(folder, 'contact-sheet.html')).href);
    await page.screenshot({path: resolve(folder, name), fullPage: true});
    await page.close();
  }
} finally { await browser.close(); }
console.log('Hoja de contacto: ' + folder);
