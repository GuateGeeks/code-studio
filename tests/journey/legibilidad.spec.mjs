import {test, expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {abrirJuegoDesdePortada, bloquesDe, registros, verCopia} from './helpers.mjs';

const catalogo = JSON.parse(readFileSync('dist/site/code-studio/games/catalogo.json', 'utf8'));

for (const {id, titulo} of catalogo) {
  test(`${id} se lee en bloques`, async ({page}) => {
    test.setTimeout(120000);
    await abrirJuegoDesdePortada(page, 'Ana', titulo);
    await verCopia(page);
    expect(await bloquesDe(page)).toBeGreaterThan(20);
    // Leaving saves what the editor holds, which is what the student would find next time.
    await page.getByRole('button', {name: 'Cambiar de estudiante'}).click();
    await expect(page.locator('#students')).toBeVisible({timeout: 30000});

    const [copia] = await registros(page, 'Ana');
    const bloques = copia.project.text['main.blocks'];
    const grises = bloques.match(/typescript_(statement|expression)/g) ?? [];
    expect(grises, `bloques grises en ${id}`).toEqual([]);
    expect((bloques.match(/<block /g) ?? []).length).toBeGreaterThanOrEqual(20);
  });
}
