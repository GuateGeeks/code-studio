import {test, expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {LOCAL, abrirJuegoDesdePortada, bloquesDe, editorDe, portada, registros, verCopia} from './helpers.mjs';

const catalogo = JSON.parse(readFileSync('dist/site/code-studio/games/catalogo.json', 'utf8'));

// One page for every game: the student list, the catalog and the player are loaded once, and each case
// still opens its own copy in the editor and checks its own blocks.
let page;
test.beforeAll(async ({browser}) => {
  page = await browser.newPage();
});
test.afterAll(async () => {
  await page.close();
});

for (const {id, titulo} of catalogo) {
  test(`${id} se lee en bloques`, async () => {
    test.setTimeout(120000);
    // A case that failed halfway leaves the page elsewhere: the next one starts from the student list.
    if (!(await page.locator('#students').isVisible())) await page.goto(portada(LOCAL));
    await abrirJuegoDesdePortada(page, 'Ana', titulo);
    await verCopia(page);
    // The editor opens in JavaScript and switches to blocks a few seconds later; leaving earlier would save no blocks.
    await expect(editorDe(page).locator('.blocks-menuitem.active')).toHaveCount(1, {timeout: 45000});
    expect(await bloquesDe(page)).toBeGreaterThan(20);
    // Leaving saves what the editor holds, which is what the student would find next time.
    await page.getByRole('button', {name: 'Cambiar de estudiante'}).click();
    await expect(page.locator('#students')).toBeVisible({timeout: 30000});

    const copias = (await registros(page, 'Ana')).filter(registro => registro.project.header.name === titulo);
    expect(copias, `una sola copia de ${id}`).toHaveLength(1);
    const bloques = copias[0].project.text['main.blocks'];
    const grises = bloques.match(/typescript_(statement|expression)/g) ?? [];
    expect(grises, `bloques grises en ${id}`).toEqual([]);
    expect((bloques.match(/<block /g) ?? []).length).toBeGreaterThanOrEqual(20);
  });
}
