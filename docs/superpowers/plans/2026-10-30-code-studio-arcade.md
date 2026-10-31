# Code Studio sobre Arcade: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar en `https://guategeeks.com/code-studio/` un estudio en el que una docente da una clase de 45 minutos y cada estudiante completa, guarda y reabre una misión 2D en una computadora compartida.

**Architecture:** Fork del target `pxt-arcade`, sin modificar `pxt-core`, en la rama huérfana `arcade` de `GuateGeeks/code-studio`. Una portada propia aloja el editor en un iframe y guarda los proyectos por estudiante mediante el workspace `iframe` de PXT. El simulador corre en un iframe opaco anidado y un service worker permite usarlo sin red.

**Tech Stack:** `pxt-core` 13.2.1, `pxt-common-packages` 14.1.4, `pxt-arcade` v4.2.1 y su `sim.js` de npm, Node 22, JavaScript ES modules sin framework, `node:test`, Playwright 1.64.1.

**Spec:** `docs/superpowers/specs/2026-10-30-code-studio-arcade-design.md`

## Global Constraints

- Repositorio `GuateGeeks/code-studio`, rama huérfana `arcade`; `main` no se toca y `arcade` no pasa a ser la rama por defecto hasta el MVP.
- Commits locales en cada tarea. **Sin push** hasta que el usuario lo pida al cerrar un hito. El repositorio es público: nada de datos de estudiantes.
- No modificar `pxt-core`. Si una tarea parece exigirlo, parar y consultar.
- Target y `sim.js` de la misma versión publicada: etiqueta `v4.2.1` (`2d7d59b`), tarball npm `pxt-arcade-4.2.1.tgz`, sha256 empieza por `d403926da1c96dd71a69`.
- `sim.js` y las traducciones se descargan al compilar y no se versionan hasta revisar su licencia.
- URL del editor: `index.html?nosandbox=1&ws=iframe&editorlayout=ide`.
- Ruta base `/code-studio/`. Compilar con `pxt staticpkg --route code-studio`; **nunca `--githubpages`**, porque intenta publicar en `origin`.
- Desarrollo en `127.0.0.1:5310`. Cero peticiones externas.
- Iframe del simulador: `sandbox="allow-scripts"` con `srcdoc`; sin `src`, sin CSP y sin segundo dominio.
- Identidad: `ggProject: {id, v: 1}` en `pxt.json`. Formato del registro: `{key, student, ggId, project, at}`.
- Marca según `cotizador/DESIGN.md`: morado `#6942a1`, morado oscuro `#321853`, acción `#ff9d38`, crema `#fff8ec`; logos en `cotizador/assets/brand/`. Sin marcas Microsoft o MakeCode.
- Interfaz en español. Público: 10–12 años.
- Pruebas: mientras se programa, menos de 1 minuto; recorrido completo, menos de 3 minutos; no probar PXT, solo lo añadido. Sin acta por tarea; una revisión por hito.
- Commits terminados en `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- Nombre vacío, solo espacios o con HTML como `<img src=x>`: el vacío se rechaza y el HTML se muestra como texto. Prueba en la tarea 5.
- Escritura fallida o almacenamiento lleno: aviso visible, sin afirmar que se guardó. Prueba en la tarea 4.
- Cambiar de estudiante con un guardado en curso: el proyecto queda con quien lo editaba. Prueba en la tarea 4.
- Copia corrupta o ajena: se rechaza sin alterar lo existente. Prueba en la tarea 6.
- Publicación nueva con pestaña abierta o caché antigua: no se mezclan archivos de dos versiones. Prueba en la tarea 8.

---

## Cambios durante la ejecución

- El sitio publica la portada como `index.html` y el editor pasa a `editor.html`.
- El simulador usa CSP por `<meta>` dentro de `srcdoc`, porque Pages no permite cabeceras.
- La misión usa categorías filtradas, no `flyoutOnly`, que rompe Blockly en `pxt-core` 13.2.1.
- `tools/site-files.txt` lista lo que no se guarda sin red, no lo que se guarda.

## Mapa de archivos

| Ruta | Responsabilidad |
|---|---|
| `pxtarget.json`, `theme/`, `docfiles/`, `libs/` | Target Arcade personalizado |
| `sim/public/simulator.html` | Página propia del simulador |
| `studio/identity.mjs` | Identidad de proyecto, sin navegador |
| `studio/store.mjs` | Registros en IndexedDB |
| `studio/host.mjs` | Protocolo con el editor |
| `studio/backup.mjs` | Copias JSON |
| `studio/index.html`, `studio/studio.mjs`, `studio/studio.css` | Portada |
| `studio/missions/atrapa-la-fruta.md` | Misión |
| `tools/build.mjs`, `tools/serve.mjs` | Compilar y servir en desarrollo |
| `studio/sw.js`, `tools/sw-manifest.mjs`, `.github/workflows/pages.yml` | Uso sin red y despliegue |
| `tests/unit/`, `tests/journey/` | Pruebas |

---

## M0 · Base

### Task 1: Rama huérfana y compilación fijada

**Files:**
- Create: `package.json`, `package-lock.json`, `.gitignore`, `AGENTS.md`, `UPSTREAM.md`, `tools/build.mjs`
- Copy: instantánea de `pxt-arcade` en `v4.2.1`, y los documentos de spec y plan

**Interfaces:**
- Produces: `npm run build` genera `dist/site/code-studio/`; `tools/build.mjs` exporta `async function build({skipTarget?: boolean}): Promise<void>`.

- [ ] **Step 1:** Clonar `https://github.com/GuateGeeks/code-studio.git` en `../code-studio` y ejecutar `git switch --orphan arcade`.
- [ ] **Step 2:** Exportar el árbol de la etiqueta con `git archive v4.2.1` de `microsoft/pxt-arcade`, conservando `LICENSE` y `ThirdPartyNotice`. `UPSTREAM.md` registra repositorio, etiqueta y commit.
- [ ] **Step 3:** Fijar en `package.json` `pxt-core` 13.2.1 y `pxt-common-packages` 14.1.4 exactos, quitar la dependencia opcional `pxt-arcade-sim`, y confirmar el lockfile.
- [ ] **Step 4:** Implementar `build()`: descargar el tarball, verificar su sha256 y copiar `built/sim.js` y `built/sim-strings.json`; crear `public/`; ejecutar `pxt staticpkg --route code-studio --output dist/site`. Si el hash no coincide, falla sin compilar.
- [ ] **Step 5:** `AGENTS.md` recoge las restricciones globales y el presupuesto de pruebas.
- [ ] **Step 6:** Verificar con `npm run build`. Esperado: exit 0 y `dist/site/code-studio/index.html`. Estas versiones son más antiguas que las de la prueba desechable, así que abrir el editor y ejecutar un juego antes de seguir.
- [ ] **Step 7:** Commit `Base de Arcade v4.2.1 con simulador fijado`.

### Task 2: Marca, español y configuración

**Files:**
- Modify: `pxtarget.json`, `theme/color-themes/arcade-light.json`
- Create: `theme/color-themes/overrides/gg-overrides.css`, `docs/static/gg-logo.svg`, `docfiles/apptracking.html`, `docfiles/tracking.html`, `tools/locales.mjs`
- Delete: `docs/` salvo los recursos estáticos que exija la compilación; logos Microsoft
- Test: `tests/journey/brand.spec.mjs`

**Interfaces:**
- Consumes: `build()` de la tarea 1.
- Produces: `async function fetchLocales(lang: 'es-MX'): Promise<void>` y `function injectLocales(siteDir: string): void` en `tools/locales.mjs`; deja las cadenas en `_locales/es-MX/` de cada paquete y las añade a `files` en su `pxt.json`.

- [ ] **Step 1: Escribir la prueba que falla**

```js
test('el editor no muestra marcas ajenas ni sale a la red', async ({page}) => {
  const externos = [];
  page.on('request', r => { if (!r.url().startsWith(ORIGIN)) externos.push(r.url()); });
  await abrirEditor(page);
  expect(await page.locator('body').innerText()).not.toMatch(/Microsoft|MakeCode/);
  await expect(page.getByText('Controles')).toBeVisible();
  expect(externos).toEqual([]);
});
```

- [ ] **Step 2:** Ejecutar `npx playwright test tests/journey/brand.spec.mjs`. Esperado: falla por `Microsoft`.
- [ ] **Step 3:** Configurar `pxtarget.json`: `title`, `organization`, `allowParentController: true`, `lockedEditor: true`, `disableLiveTranslations: true`, `defaultLocale: es-MX`, `selectLanguage: false`, `githubEditor: false`, sin `homeScreenHero`; `cloud` con `sharing`, `thumbnails`, `publishing`, `packages`, `githubPackages` en `false` y `cloudProviders: {}`; `simulator.autoRun: false`; `timeMachineDiffInterval: 300000`, `timeMachineSnapshotInterval: 600000`.
- [ ] **Step 4:** Aplicar la paleta y ocultar con `gg-overrides.css` el botón «Descargar» y «Explicar con IA». Mantener el botón de guardar PNG.
- [ ] **Step 5:** Vaciar solo la carga de App Insights. **Conservar `pxtweb.js`:** define `pxt.setInteractiveConsent` y `pxt.initAnalyticsAsync`.
- [ ] **Step 6:** Implementar `tools/locales.mjs` desde `https://makecode.com/api/translations` e integrarlo en `build()`. `locales/` queda en `.gitignore`.
- [ ] **Step 7:** Ejecutar la prueba. Esperado: pasa. Si queda «Inicio de MakeCode» u otro resto, cubrirlo con `theme` o `locales`, nunca con `pxt-core`.
- [ ] **Step 8:** Commit `Marca GuateGeeks, español y sin telemetría`.

### Task 3: Simulador opaco y servidor de desarrollo

**Files:**
- Create: `sim/public/simulator.html`, `sim/public/sim-inner.html`, `tools/serve.mjs`
- Test: `tests/unit/serve.test.mjs`, `tests/journey/isolation.spec.mjs`

**Interfaces:**
- Produces: `function createServer(root: string): http.Server` en `tools/serve.mjs`. `npm start` sirve `dist/site` en `http://127.0.0.1:5310/code-studio/`.

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
test('rechaza rutas fuera de la raíz', async () => {
  assert.equal((await get('/../package.json')).status, 404);
});
test('con 5310 ocupado termina con mensaje en español', async () => { /* proceso hijo */ });
```

`isolation.spec.mjs` usa `--host-resolver-rules=MAP gg-class.test 127.0.0.1`, para no depender de la excepción de localhost de PXT. Ejecuta un juego y comprueba en el frame `srcdoc`: `self.origin === 'null'`, y `SecurityError` en `indexedDB.open`, `localStorage`, `parent.document` y `top.document`. Luego comprueba Ejecutar, Detener y reiniciar.

- [ ] **Step 2:** Ejecutar `node --test tests/unit/serve.test.mjs`. Esperado: falla por módulo inexistente.
- [ ] **Step 3:** Escribir `sim-inner.html` con `#wrap`, `.game-player`, `#debug-stats`, `#safari-enable-game`, `.game-embed`, `canvas#game-screen.hidden`, `#game-buttons-container`, `#joystick-container` y `.game-player-msft`, cargando `/code-studio/pxtsim.js` y `/code-studio/sim.js`.
- [ ] **Step 4:** Escribir `simulator.html`: reenvía mensajes entre `parent` y el iframe; lee `sim-inner.html`, `pxtsim.js` y `sim.js` con `fetch`, los inserta en línea, y fija `location.hash` antes de los scripts. Escapar `</script` y usar reemplazo por función, porque el código contiene `$`.
- [ ] **Step 5:** Implementar `createServer`, que sirve solo `dist/site`.
- [ ] **Step 6:** Ejecutar ambas pruebas. Esperado: pasan, y el juego se ve.
- [ ] **Step 7:** Commit `Simulador en origen opaco`.

**Cierre de M0:** revisión del hito.

---

## M1 · Estudiantes

### Task 4: Identidad, almacenamiento y protocolo

**Files:**
- Create: `studio/identity.mjs`, `studio/store.mjs`, `studio/host.mjs`
- Test: `tests/unit/identity.test.mjs`, `tests/unit/host.test.mjs`

**Interfaces:**
- Produces:
  - `readId(project): string | null`
  - `stampIdentity(project, id, derivedFrom?): Project`
  - `resolveIdentity(project, knownIds: Map<ggId, headerId>, newId: () => string): {id, derivedFrom?}`
  - `openStore(): Promise<Store>` con `list(student)`, `put(record)`, `students()`, `removeAll()`
  - `createHost({store, student, target, onSaveError}): {handle(event): Promise<void>}`

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
test('un PNG importado con ID ya presente recibe otro y guarda el origen', () => {
  const known = new Map([['gg-1', 'header-a']]);
  const r = resolveIdentity(conId('gg-1', 'header-b'), known, () => 'gg-2');
  assert.deepEqual(r, {id: 'gg-2', derivedFrom: 'gg-1'});
});
test('una restauración del mismo header conserva su ID', () => {
  const known = new Map([['gg-1', 'header-a']]);
  assert.deepEqual(resolveIdentity(conId('gg-1', 'header-a'), known, () => 'x'), {id: 'gg-1'});
});
test('workspacesave guarda bajo el estudiante del host, no el actual', async () => { /* dos hosts, ana y luis */ });
test('un fallo de escritura llama a onSaveError y no lanza', async () => { /* store.put rechaza */ });
test('workspacesync solo devuelve proyectos del estudiante', async () => { /* store con dos estudiantes */ });
```

- [ ] **Step 2:** Ejecutar `node --test tests/unit`. Esperado: falla por módulos inexistentes.
- [ ] **Step 3:** Implementar los tres módulos. `createHost` se crea por iframe, de modo que el estudiante queda fijo durante su sesión. Responde con `{...msg, success: true, projects, editor: {}, controllerId: 'gg'}`.
- [ ] **Step 4:** Ejecutar las pruebas. Esperado: pasan.
- [ ] **Step 5:** Commit `Identidad y almacenamiento por estudiante`.

### Task 5: Portada

**Files:**
- Create: `studio/index.html`, `studio/studio.mjs`, `studio/studio.css`
- Modify: `tools/build.mjs`
- Test: `tests/journey/students.spec.mjs`

**Interfaces:**
- Consumes: `openStore`, `createHost` de la tarea 4.
- Produces: `function addStudent(name: string, existing: string[]): {ok: true, name} | {ok: false, reason: string}` y `function openEditor(student: string): void` en `studio/studio.mjs`.

- [ ] **Step 1: Escribir la prueba que falla**

```js
test('dos estudiantes no se mezclan y reabren su trabajo', async ({page}) => {
  await entrarComo(page, 'Ana');   await escribir(page, 'info.setScore(11)\n');
  await volverAPortada(page);
  await entrarComo(page, 'Luis');  await escribir(page, 'info.setScore(22)\n');
  await page.reload();
  await entrarComo(page, 'Ana');
  expect(await leerCodigo(page)).toContain('setScore(11)');
});
test('un nombre vacío se rechaza y el HTML se muestra como texto', async ({page}) => { /* '   ' y '<img src=x>' */ });
test('el primer PNG ya lleva ggProject', async ({page}) => { /* lee pxt.json tras importar el PNG */ });
```

- [ ] **Step 2:** Ejecutar `npx playwright test tests/journey/students.spec.mjs`. Esperado: falla.
- [ ] **Step 3:** Implementar la portada: Geeky y logo de `cotizador/assets/brand/`, lista de nombres de ese equipo, campo para añadir uno, botón para volver. Recrear el iframe al elegir estudiante. Usar `textContent` para los nombres.
- [ ] **Step 4:** Para el primer PNG, crear el proyecto con `newproject` y `options.filesOverride` con `gg-project.json`, y leer la identidad también desde ese archivo. Si no llega al PNG, tras el primer guardado volver a abrir el proyecto para que el editor reciba el texto con `ggProject`.
- [ ] **Step 5:** Copiar `studio/` a `dist/site/` en `build()`. `/` sirve la portada.
- [ ] **Step 6:** Ejecutar la prueba. Esperado: pasa. Comprobar también Version History en modo IDE, pendiente del diseño.
- [ ] **Step 7:** Commit `Portada de estudiantes`.

### Task 6: Copias de seguridad

**Files:**
- Create: `studio/backup.mjs`
- Modify: `studio/studio.mjs`
- Test: `tests/unit/backup.test.mjs`, `tests/journey/backup.spec.mjs`

**Interfaces:**
- Consumes: `Store` de la tarea 4.
- Produces: `exportBackup(records): string`, y `parseBackup(text): {ok: true, records} | {ok: false, reason}`, con formato `{format: 'gg-backup', v: 1, at, records}`.

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
test('la copia conserva _history', () => { /* exporta y parsea */ });
test('rechaza JSON roto, otro formato y registros sin project', () => { /* tres casos, ok:false */ });
```

`backup.spec.mjs`: crea un proyecto con versiones, exporta la copia de la clase, borra la base, restaura, y comprueba código e historial.

- [ ] **Step 2:** Ejecutar y ver el fallo.
- [ ] **Step 3:** Implementar y añadir en la portada «Copia de la clase» y «Restaurar copia». Una copia inválida deja todo intacto y muestra la causa.
- [ ] **Step 4:** Ejecutar las pruebas. Esperado: pasan.
- [ ] **Step 5:** Commit `Copias de seguridad por clase`.

**Cierre de M1:** revisión del hito.

---

## M2 · Misión

### Task 7: Plantilla y misión guiada

**Files:**
- Create: `libs/gg-studio/pxt.json`, `libs/gg-studio/gg.ts`, `studio/missions/atrapa-la-fruta.md`
- Modify: `libs/blocksprj/pxt.json`, `pxtarget.json`, `studio/studio.mjs`
- Test: `tests/journey/mission.spec.mjs`

**Interfaces:**
- Consumes: `openEditor` de la tarea 5.
- Produces: `function startMission(id: 'atrapa-la-fruta'): void`, que envía `{type: 'pxteditor', action: 'importtutorial', markdown}`.

- [ ] **Step 1: Escribir la prueba que falla:** iniciar la misión, comprobar `flyoutOnly` con solo los bloques del paso 1, avanzar los pasos, ejecutar, y encontrar el proyecto del estudiante tras recargar.
- [ ] **Step 2:** Ejecutar y ver el fallo.
- [ ] **Step 3:** `libs/gg-studio/gg.ts` define `userconfig` a `320×240`. Comprobar que no aparece un bloque gris.
- [ ] **Step 4:** Escribir la misión con `flyoutOnly`, en español, con Geeky en los textos, para unos 30 minutos: sprite, mover, frutas, colisión, marcador y cuenta atrás. Recursos propios de 16 colores.
- [ ] **Step 5:** Ejecutar la prueba. Esperado: pasa. Si `flyoutOnly` no funciona en modo IDE, parar y consultar.
- [ ] **Step 6:** Commit `Misión Atrapa la fruta`.

**Cierre de M2:** revisión del hito, con el usuario jugando la misión. Revisar aquí licencias de traducciones y del icono Font Awesome Pro de `sim.js`, en `docs/LICENCIAS.md`, porque bloquean la publicación.

---

## M3 · Publicación

### Task 8: Sin red y GitHub Pages

**Files:**
- Create: `studio/sw.js`, `tools/sw-manifest.mjs`, `tools/site-files.txt`, `.github/workflows/pages.yml`
- Modify: `tools/build.mjs`, `studio/studio.mjs`
- Test: `tests/unit/sw-manifest.test.mjs`, `tests/journey/offline.spec.mjs`

**Interfaces:**
- Consumes: `build()` de la tarea 1 y `createServer` de la tarea 3.
- Produces: `function swManifest(files: string[], version: string): {version, files}`; `dist/site/code-studio/sw-manifest.json`.

- [ ] **Step 1: Escribir las pruebas que fallan:** el manifiesto incluye `simulator.html`, `sim-inner.html`, `pxtsim.js` y `sim.js`, y excluye `docs/`. `offline.spec.mjs` visita una vez, detiene el servidor, recarga y recorre elegir estudiante, ejecutar un juego y guardar. Otra prueba publica una versión nueva y comprueba que una pestaña abierta no mezcla archivos.
- [ ] **Step 2:** Ejecutar y ver el fallo.
- [ ] **Step 3:** Implementar la lista explícita de archivos y `sw.js`: en `install` guarda todo el manifiesto bajo `gg-<version>`; en `activate` borra versiones anteriores; sirve desde caché y usa red para lo que no esté. Alcance `/code-studio/`.
- [ ] **Step 4:** En la portada, registrar `sw.js`, pedir `navigator.storage.persist()` y avisar cuando el estudio esté listo sin red.
- [ ] **Step 5:** Ejecutar las pruebas. Esperado: pasan.
- [ ] **Step 6:** `pages.yml` compila en `arcade` y publica `dist/site/code-studio` con `actions/upload-pages-artifact` y `actions/deploy-pages`.
- [ ] **Step 7:** Commit `Uso sin red y despliegue en Pages`.
- [ ] **Step 8:** Con la aprobación del usuario y las licencias revisadas: push de `arcade`, activar Pages con fuente GitHub Actions, y comprobar en `https://guategeeks.com/code-studio/` HTTPS, cero peticiones externas y uso sin red.

---

## M4 · Clase

### Task 9: Preparación y observación

**Files:**
- Create: `docs/GUIA-DOCENTE.md`, `docs/OBSERVACION.md`
- Modify: `README.md`

Esta tarea necesita personas y equipos reales.

- [ ] **Step 1:** Escribir la guía docente: iniciar, copia de la clase y qué hacer si algo falla.
- [ ] **Step 2:** Probar en un equipo escolar: primera carga, sin red, reabrir, audio audible, Edge y Firefox, teclado y lector de pantalla.
- [ ] **Step 3:** Reemplazar `README.md` del proyecto. Commit `Guía docente`.
- [ ] **Step 4:** Observar una clase con el guion de `OBSERVACION.md`, y comprobar la reapertura en la clase siguiente.

**Cierre de M4:** el usuario decide con lo observado si `arcade` pasa a ser la rama por defecto.
