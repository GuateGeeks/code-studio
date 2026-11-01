# Experiencias CNB: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Método ya decidido:** cada tarea la ejecuta un subagente con el `Modelo:` que indica, y la sesión principal solo orquesta. **Sin revisor por tarea:** las únicas revisiones son las Tareas 8, 21 y 22. No se hace push ni se publica.

**Goal:** 12 juegos educativos alineados con el CNB de Sexto, que el estudiante abre en una pulsación desde la portada, sin editor y sin red, y con una copia editable en bloques.

**Architecture:** Cada juego es un proyecto PXT en `games/<id>/`. `tools/games.mjs` lo compila con `pxt build --local` y publica `games/<id>.js` y `.ts`. `studio/player.html` lo corre por el relevo `simulator.html`, y la biblioteca `libs/gg-experiencias` da las fases y la evaluación. La biblioteca informa su estado por `control.simmessages`; el reproductor lo refleja en `data-`, y las pruebas leen ahí. La portada guarda al estudiante y crea la copia, porque ahí viven el almacén y el editor.

**Tech Stack:** PXT 13.2.1, pxt-arcade 4.2.1, TypeScript estático de Arcade, ES modules en el navegador, `node --test`, Playwright 1.64.

**Spec:** `docs/superpowers/specs/2026-10-31-experiencias-cnb-design.md`

## Global Constraints

- No modificar `pxt-core`. Nunca `--githubpages`. `socrates.app` es solo lectura. Sin push ni publicación: exigen pedido expreso del usuario.
- Sin datos de estudiantes en el repositorio. Sin marcas Microsoft o MakeCode en lo publicado. Crédito a CNB Guatemala / Ministerio de Educación (CC BY-SA 4.0) donde se cite su texto.
- Antes de cualquier orden de Node: `source /home/adawolfs/projects/makecode/scripts/env.sh; unset -f node npm npx`. Antes de Playwright: `npm start` en segundo plano (puerto 5310). Para ver cambios, el sitio debe estar reconstruido en `dist/site/`.
- Presupuesto: mientras se programa, compilación y prueba de lo que cambió en menos de 1 minuto; al cerrar una función, `npm run recorrido` en menos de 3; al cerrar un hito (Tareas 8, 18 y 22), `npm test` y `npm run journey`, en segundo plano. Si una prueba rebasa su tope, se recorta o se reescribe.
- **Toda prueba demuestra el efecto.** Prohibido `force`. Prohibido localizar por un texto que también aparezca fuera del juego (misión, portada): se acota con un contenedor (`#catalog`, `#player-bar`). Cada tecla se mantiene ~120 ms con `pulsar`. Los aciertos y las fases se leen de los `data-` del reproductor, nunca de una captura.
- Reglas de `main.ts`: solo `for (let i = 0; i < n; i++)`; sin rangos negativos (se calcula `x = i - 7`); sin `if` de una línea con llamadas anidadas; todo en `main.ts`; sin `drawLine`, `askForString`, `game.over`, `.charAt` ni `.onButtonEvent`.
- Los bloques de `gg-experiencias`, una vez cerrada la Tarea 8, **solo se añaden; nunca se renombran ni se quitan**.
- Texto: tuteo, una idea por oración, tildes en mayúsculas, frases cortas en 320×240 (53 caracteres por línea con `font8`), sin depender solo del color o del sonido. Primero la experiencia, después el nombre. Lo simulado se declara: «Es un modelo en la pantalla.» Sin `Í` mayúscula en textos visibles ni textos todo en mayúsculas: con `font8`, Í se lee como “f”. Opciones verticales de `elegir` de hasta 44 caracteres.
- Temas evitados: conflicto armado, sexualidad, Cholq'ij, vocabulario maya inventado. Sin datos, personas ni medios inventados que parezcan reales.
- Commits en español, en imperativo y con un título por tarea, terminados en `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. `git add` por ruta exacta.

## Review Focus

1. **Pestaña con un estudiante que ya no existe o sin estudiante.** Debe verse la lista y no crearse nada. Prueba en la Tarea 5.
2. **Copia borrada.** «Ver cómo está hecho» crea una nueva: no reabre la borrada. Prueba en la Tarea 6.
3. **Foco tras usar la barra.** Tras «Jugar otra vez», el teclado sigue en el juego sin clic. Prueba en la Tarea 4.
4. **Proyectos previos y misión.** Un proyecto guardado sin `gg-experiencias` sigue abriendo y la misión sigue filtrando bloques. Prueba en la Tarea 6.
5. **Teclas no previstas.** La tecla de menú y B no sacan del juego ni muestran el menú en inglés. Prueba en la Tarea 4.

## Decisiones que cierran huecos del diseño

| Tema | Decisión | Evidencia |
|---|---|---|
| Error en Comprobar | Aplicar: `todaviaNo(pista)` y reintento. Comprobar: un intento por ítem, sin pista; «Todavía no…» al cerrar la serie | «Sin pista» e «inténtalo otra vez» chocan si se aplican al mismo ítem |
| Serie tras fallar B | Alterna: A, B, A… | El diseño solo dice «la otra» |
| Dónde vive el arte | En `libs/gg-studio`, con `whenUsed`; `main.ts` solo lo referencia | «Arte en `main.ts`» choca con «ampliar `gg-studio`» |
| `main.blocks` de la copia | `''` en `text`, sin tocar `config.files`, y `switchblocks` al cargar | La plantilla trae 125 bytes de XML con `pxt-on-start`, no vacío. PXT usa `''` en `importTypescriptFile`; con `''` abre `main.ts` en texto y activa `shouldTryDecompile` |
| Quién crea la copia | La portada: el reproductor navega a `index.html?ver=<id>` | `store` y `openEditor` viven en `studio.mjs` |
| `experiencia` al guardar | `host.mjs` la lee del registro guardado, igual que `derivedFrom` | El `pxt.json` que manda PXT no garantiza traer `ggProject` |
| `games/catalogo.json` | Se publica filtrado a los juegos con carpeta | El reproductor valida contra él; así la ola 2 crece sin romper `checkSite` |
| `fc:4.3.2` | La ficha declara cobertura parcial por defecto | La revisión cultural llega después de construir |
| Sin red | `context.setOffline(true)` **y** servidor apagado | El diseño pide lo primero; `offline.spec.mjs` usa lo segundo, que es más fuerte |

Riesgos ya acotados leyendo el código: `font8` contiene Á É Í Ó Ú Ñ ¿ ¡ (falta verlos en pantalla, Tarea 4). `simulator.html` deja pasar `messagepacket`. `askForString` y `game.over` no se usan.

## Estructura

```text
games/catalogo.json                 Tarea 1
games/<id>/{pxt.json,main.ts,solucion.json}
libs/gg-experiencias/{pxt.json,experiencias.ts}
libs/gg-studio/{gg.ts,gg.jres}, tools/gg-art.mjs    Arte
tools/games.mjs, tools/build.mjs, tools/site.mjs    Compilación y publicación
studio/player.html, player.mjs, experiencias.mjs    Reproductor y lógica pura
studio/{index.html,studio.mjs,studio.css}           Portada
studio/{project.mjs,identity.mjs,host.mjs}          Copia
tests/fixtures/cnb-sexto-ids.json
tests/unit/{catalogo,fuente,games,experiencias}.test.mjs
tests/journey/{reproductor,solucion,catalogo,copia,juegos,legibilidad}.spec.mjs
docs/EXPERIENCIAS.md
```

---

# Ola 1: Rescate en el plano, de punta a punta

## Tarea 1: Catálogo y fixture del CNB

**Modelo:** Sonnet

**Files:**
- Create: `games/catalogo.json`, `tests/fixtures/cnb-sexto-ids.json`, `tests/unit/catalogo.test.mjs`

**Interfaces:**
- Produces: `games/catalogo.json`, arreglo de `{id, titulo, area, contenidos: ["mat:1.5.3"], situacion, mecanica, resultado, repiteSocrates?: true, cobertura?: {"fc:4.3.2": "parcial"}}`. `mecanica` ∈ `moverse | ordenar | clasificar | decidir | leer`. Fixture: arreglo plano de 834 cadenas `areaId:contenidoCodigo`.

- [ ] **Step 1: Generar el fixture** con una sola lectura de `/home/adawolfs/projects/socrates.app/content/cnb/sexto-primaria/contenidos.json`. Debe dar 834 ids únicos.

- [ ] **Step 2: Escribir la prueba `catalogo.test.mjs`**

```js
test('hay 12 entradas con id único', ...);          // length 12; Set de ids 12
test('cumple las cuotas por área', ...);            // mat ≥2, cnt ≥2, ccss ≥2, l1+l3 ≥2; art, ef, fc, pyd ≥1
test('L 2 queda fuera', ...);                       // ningún contenido empieza con 'l2:'
test('hay 25 contenidos y todos existen en el CNB', ...);  // flatMap length 25; cada uno en el fixture
test('area coincide con el prefijo de sus contenidos', ...);
test('Rescate y Cuentas declaran que repiten Sócrates', ...);  // solo esos dos, repiteSocrates === true
test('las mecánicas cubren 1,5,8 / 2 / 4,7,10 / 3,6,11,12 / 9', ...);
```

- [ ] **Step 3: Verificar que falla:** `node --test tests/unit/catalogo.test.mjs` → FAIL, falta `games/catalogo.json`.

- [ ] **Step 4: Escribir `games/catalogo.json`** copiando id, título, contenidos, situación, mecánica y final de la tabla del diseño, en ese orden. `fc:4.3.2` lleva `cobertura: parcial`.

- [ ] **Step 5: Verificar que pasa** con la misma orden.

- [ ] **Step 6: Commit** `Añadir el catálogo de experiencias`.

## Tarea 2: Compilación y publicación de juegos

**Modelo:** Sonnet

**Files:**
- Create: `tools/games.mjs`, `games/rescate-plano/{pxt.json,main.ts}`, `tests/unit/games.test.mjs`, `tests/unit/fuente.test.mjs`
- Modify: `tools/build.mjs`, `tools/site.mjs:71-79`, `tests/unit/site.test.mjs`

**Interfaces:**
- Consumes: `games/catalogo.json`.
- Produces, en `tools/games.mjs`:
  - `readCatalog(root) → Entry[]`
  - `presentGames(root) → Entry[]`: entradas con `games/<id>/main.ts`.
  - `sourceHash(root, id) → string`: sha256 de `main.ts`, el `pxt.json` del juego, `libs/gg-experiencias/` y `libs/gg-studio/` (sin `built/` ni `_locales/`) y la versión de `pxt-core`.
  - `compileGame(root, id, run = execFileSync) → 'compilado' | 'sin cambios'`: guarda el hash en `games/<id>/built/fuente.sha256`, ya ignorado por git.
  - `publishGames(root, site, {only} = {}) → string[]`: compila todos o solo `only`, copia `built/debug/binary.js` a `games/<id>.js` y `main.ts` a `games/<id>.ts`, escribe `games/catalogo.json` filtrado, imprime el resultado de cada `compileGame` y devuelve los ids publicados.
- En `tools/build.mjs`: `parseJuego(argv) → string | null`, y `build({juego})`.

- [ ] **Step 1: Escribir `games.test.mjs` y `fuente.test.mjs`**

`games.test.mjs`, sobre una raíz temporal:

```js
test('sourceHash cambia si cambia main.ts y no si cambia built/', ...);
test('compileGame no vuelve a compilar lo que no cambió', ...);  // run falso: 1 llamada tras dos compileGame
test('compileGame llama a pxt build --local en games/<id>', ...);
test('publishGames copia .js y .ts y filtra el catálogo', ...);  // catálogo de 2, una carpeta → 1 entrada publicada
test('publishGames rechaza un id desconocido', ...);             // /Juego desconocido/
test('parseJuego lee --juego <id>', ...);
```

`fuente.test.mjs`, sobre cada `games/*/`:

```js
test('todo for tiene la forma permitida', ...);   // cada /\bfor\s*\(/ casa con /for \(let \w+ = 0; \w+ < [^;]+; \w+\+\+\)/
test('sin APIs prohibidas', ...);                 // sin askForString, drawLine, game.over
test('sin if de una línea con llamada', ...);     // sin /^\s*if \(.+\) [^{\s].*\)\s*$/m
test('dependencias iguales a la plantilla', ...); // claves iguales a libs/blocksprj/pxt.json; valor `file:../../libs/<nombre>`
test('un solo archivo de código', ...);           // pxt.json.files igual a ['main.ts']; name === id
```

En `site.test.mjs`: `test('checkSite rechaza un juego del catálogo sin su .js', ...)`, con un sitio temporal completo y `assert.throws(..., /Falta games\/x\.js/)`.

- [ ] **Step 2: Verificar que fallan:** `node --test tests/unit/games.test.mjs tests/unit/fuente.test.mjs tests/unit/site.test.mjs` → FAIL.

- [ ] **Step 3: Crear el esqueleto de `games/rescate-plano/`**: `pxt.json` como `projects/spike-plano/pxt.json`, con `name: "rescate-plano"`, y `main.ts` mínimo.

- [ ] **Step 4: Implementar `tools/games.mjs`.** Compila con `execFileSync('node', [join(root, 'node_modules/pxt-core/built/pxt.js'), 'build', '--local'], {cwd: games/<id>, stdio: 'inherit'})`.

- [ ] **Step 5: Integrar en `build.mjs` y `site.mjs`.** `build()` llama a `publishGames(ROOT, site)` después de `injectLocales` y antes de `finishSite`. Con `juego`: sin `fetchSimulator` ni `staticpkg`, `publishGames(ROOT, site, {only: [juego]})`, `finishSite(site)` y `checkSite(site)`. `REQUIRED` suma `games/catalogo.json`; `checkSite` exige `.js` y `.ts` de cada entrada publicada. El CLI usa `parseJuego(process.argv)`.

- [ ] **Step 6: Comprobar compilación real.** `npm run build` una vez, en segundo plano. Después, `npm run build -- --juego rescate-plano` dos veces: la primera, «compilado»; la segunda, «sin cambios», en menos de 2 s. Debe existir `dist/site/code-studio/games/rescate-plano.ts` y estar en `sw-manifest.json`.

- [ ] **Step 7: Verificar** `node --test tests/unit/games.test.mjs tests/unit/fuente.test.mjs tests/unit/site.test.mjs` → PASS.

- [ ] **Step 8: Commit** `Compilar y publicar los juegos con el sitio`.

## Tarea 3: Reproductor

**Modelo:** Sonnet

**Files:**
- Create: `studio/player.html`, `studio/player.mjs`, `studio/experiencias.mjs`, `tests/unit/experiencias.test.mjs`, `tests/journey/reproductor.spec.mjs`
- Modify: `games/rescate-plano/main.ts`, `tools/site.mjs` (`REQUIRED`), `tests/journey/helpers.mjs`

**Interfaces:**
- Produces, en `studio/experiencias.mjs`:
  - `CANAL = 'gg-experiencia'`
  - `gameById(catalog, id) → Entry | null`
  - `playerUrl(id) → string`
  - `parseEstado(bytes: Uint8Array) → Estado | null`: JSON UTF-8. Conserva solo `fase` (`explorar|construir|aplicar|comprobar|reflexionar`), `serie` (`A|B`), `espera` (`ninguna|dialogo|eleccion|confirmar|final`), `aciertos`, `total`, `paso`, `avisos` (enteros ≥ 0), `aprobado`, `final` (booleanos). Lo que el juego manda es no confiable.
  - `reflectEstado(element, estado) → void`: `dataset[k] = String(v)`.
  - `clearEstado(element) → void`.
- `body` lleva `data-estado` (`cargando|jugando|error`) más los campos de `Estado`.
- En `helpers.mjs`: `abrirJuego(page, id, origin = LOCAL)`, que espera `body[data-estado=jugando]`; `estadoJuego(page) → dataset`; `pulsar(page, tecla)`, con `tecla` ∈ `A|der|izq|arr|aba`, `Space` para A, 120 ms abajo y 80 ms de espera.

- [ ] **Step 1: Escribir `experiencias.test.mjs`**

```js
test('parseEstado conserva solo campos conocidos', ...);      // {fase:'aplicar',x:1} → {fase:'aplicar'}
test('parseEstado rechaza JSON inválido y valores fuera de lista', ...); // null; fase:'otra' se descarta
test('reflectEstado escribe en dataset y clearEstado limpia', ...);
test('gameById no acepta un id fuera del catálogo', ...);     // '../x' → null
```

- [ ] **Step 2: Escribir `reproductor.spec.mjs`**

```js
test('abre sin editor ni salidas externas', {tag: '@recorrido'}, ...);
  // vigilarRed []; ninguna respuesta a editor.html, main.js ni target.js; sin pageerror ni console.error;
  // el iframe ocupa ≥90 % del alto libre bajo #player-bar
test('las teclas llegan al juego sin clic', ...);  // paso antes, pulsar('A'), paso aumenta
test('un id desconocido muestra el aviso y no pide ningún juego', ...);
  // ?juego=../../x → #player-error con el texto exacto; ninguna petición a /games/*.js
test('si el juego no descarga, muestra el aviso', ...);
  // page.route('**/games/rescate-plano.js', abort) → mismo aviso; data-estado=error
```

Texto exacto del aviso: «No pudimos abrir este juego. Tus proyectos siguen guardados. Vuelve a Experiencias e inténtalo otra vez.»

- [ ] **Step 3: Hacer que el esqueleto emita.** Al arrancar y con cada A: `control.simmessages.send("gg-experiencia", Buffer.fromUTF8(JSON.stringify({fase: "explorar", paso: n})), true)`. Es el `parentOnly` que evita reenvíos y resuelve el riesgo de `simmessages`.

- [ ] **Step 4: Verificar que fallan** las unitarias y, tras `npm run build -- --juego rescate-plano`, `npx playwright test tests/journey/reproductor.spec.mjs`.

- [ ] **Step 5: Implementar `studio/experiencias.mjs`, `player.html` y `player.mjs`.**
  - `player.html`: CSP `script-src 'self'`; `<nav id="player-bar">` con `#player-back` «Volver a Experiencias», `#player-again` «Jugar otra vez» y `#player-code` «Ver cómo está hecho»; `<p id="player-error" role="alert" hidden>`; `<div id="sim" tabindex="-1">`; `pxtsim.js` y `player.mjs`. El CSS del spike, sección 3, con `#sim{top:<alto de la barra>}`.
  - `player.mjs`: lee `juego`, valida contra `games/catalogo.json`, baja `games/<id>.js` y llama a `new pxsim.SimulatorDriver(sim, {simUrl: new URL('simulator.html', location.href).href})` con `driver.run(js, {aspectRatio: 4/3, autofocus: true, single: true, hideSimButtons: true})`. `simUrl` debe ser absoluta.
  - Un oyente `message` acepta solo `type === 'messagepacket'`, `channel === CANAL` y `event.source` igual al `contentWindow` del iframe. El simulador también emite `keydown-*` por ese tipo.
  - `SIN_SENAL_MS = 15000`: sin ningún estado en ese tiempo, aviso de error.
  - `#player-back` va a `index.html?pantalla=experiencias`; `#player-code`, a `index.html?ver=<id>`.
  - `#player-again`: `clearEstado`, `driver.run` de nuevo con `autofocus` y foco de vuelta al iframe.
  - En error se ocultan `#player-again` y `#player-code`.

- [ ] **Step 6: Añadir `player.html` y `player.mjs` a `REQUIRED`** y verificar: `npm run build -- --juego rescate-plano`, unitarias y `npx playwright test tests/journey/reproductor.spec.mjs` → PASS.

- [ ] **Step 7: Commit** `Añadir el reproductor de experiencias`.

## Tarea 4: Biblioteca y Rescate en el plano

**Modelo:** Sonnet

**Files:**
- Create: `libs/gg-experiencias/{pxt.json,experiencias.ts}`, `games/rescate-plano/solucion.json`, `tests/journey/solucion.spec.mjs`
- Modify: `pxtarget.json` (`bundleddirs`), `libs/blocksprj/pxt.json`, `games/rescate-plano/{pxt.json,main.ts}`, `tools/gg-art.mjs`, `libs/gg-studio/{gg.ts,gg.jres}`, `tests/unit/art.test.mjs`, `tests/journey/reproductor.spec.mjs`, `tests/journey/helpers.mjs`

**Interfaces:**
- Consumes: `CANAL`, `Estado`, `abrirJuego`, `estadoJuego`, `pulsar`.
- Produces, en `libs/gg-experiencias/experiencias.ts`, categoría «Experiencias» con todo el texto en `//% block`:

```ts
enum FaseExperiencia { Explorar, Construir, Aplicar, Comprobar, Reflexionar }
enum EjeEleccion { Vertical, Horizontal }
namespace experiencias {
  export function fase(f: FaseExperiencia): void      // emite; la primera llamada anula el menú del sistema
  export function decir(texto: string): void          // diálogo bloqueante; espera 'dialogo'
  export function confirmar(): void                   // espera A; espera 'confirmar'
  export function elegir(enunciado: string, opciones: string[], eje: EjeEleccion): number // índice; espera 'eleccion'
  export function todaviaNo(pista: string): void      // «Todavía no. » + pista; avisos++
  export function comprobar(): void                   // aciertos 0, total 5, fase Comprobar
  export function anotar(acierto: boolean): void
  export function cerrarComprobacion(): boolean       // aciertos*100 >= total*70; si no: todaviaNo y cambia de serie
  export function serieActual(): number               // 0 = A, 1 = B
  export function aciertos(): number
  export function final(titulo: string, lineas: string[]): void // panel sobre el fondo; final=true; no regresa
}
```

- Cada cambio de estado incrementa `paso` y emite `Estado` con `control.simmessages.send(CANAL, Buffer.fromUTF8(JSON.stringify(...)), true)`. No hay `game.over`. `elegir` y `confirmar` esperan a soltar A antes de aceptar otra.
- Forma de cualquier juego, sin que la biblioteca imponga más:

```ts
let aprobado = false
while (!aprobado) { practicar(); evaluar(); aprobado = experiencias.cerrarComprobacion() }
```

- `solucion.json`: `{rondas: Ronda[], erradas?: Ronda[], serieB?: Ronda[]}`. `Ronda` es un arreglo de teclas para un momento de entrada, por ejemplo `["der","der","arr","A"]`. `rondas` gana a la primera; `erradas` falla Aplicar una vez y Comprobar A, y termina de vuelta en Aplicar; `serieB` sigue desde ahí hasta el final.
- En `helpers.mjs`: `pasarDialogos(page)`, que pulsa A mientras `espera === 'dialogo'`, retorna al ver `eleccion|confirmar|final` y falla a los 15 s; `jugar(page, rondas)`, que por ronda llama a `pasarDialogos` y pulsa; al terminar, llama de nuevo a `pasarDialogos`.
- Patrón de arte: `tools/gg-art.mjs` exporta fondos 320×240 aparte de `SPRITES`, y cada uno se declara en `gg.ts` con `//% fixedInstance jres whenUsed blockIdentity=images._image` y `//% tags="gg-fondo"`, para que no entre en la galería de la misión. El precedente es `font12` en `screen/text.ts`.

- [ ] **Step 1: Escribir `solucion.spec.mjs`**

```js
const REPRESENTANTES = new Set(['rescate-plano', 'cuentas-mayas', 'vecinos-bosque', 'comunidad-preparada', 'lee-marimba']);
// Por cada games/*/solucion.json:
//   test.skip(!REPRESENTANTES.has(id) && !process.env.GG_SOLUCIONES)
test(`${id} se termina con teclado`, ...);
  // jugar(page, rondas) → final 'true', aprobado 'true', fase 'reflexionar', total '5', Number(aciertos) ≥ 4
test('con errores da «Todavía no» y la serie B', ...);  // solo rescate-plano
  // jugar(erradas) → Number(avisos) ≥ 2, serie 'B', fase 'aplicar', aprobado 'false'
  // jugar(serieB) → final 'true', serie 'B', aprobado 'true'
```

- [ ] **Step 2: Ampliar `reproductor.spec.mjs`**

```js
test('Jugar otra vez reinicia desde la pantalla final y deja el foco en el juego', ...);
  // jugar(rondas); clic en #player-again; fase 'explorar', final no 'true', aciertos '0';
  // sin clic en el iframe: pulsar('A') aumenta paso
test('la tecla de menú y B no sacan del juego', ...);
  // pulsar Escape, Enter y KeyX; luego A sigue aumentando paso
```

- [ ] **Step 3: Verificar que fallan:** `npm run build -- --juego rescate-plano` falla o las pruebas no llegan a `final`.

- [ ] **Step 4: Crear y registrar la biblioteca.** Depende de `device`, como `gg-studio`. `libs/gg-experiencias` en `bundleddirs`, junto a `libs/gg-studio`. `"gg-experiencias": "file:../gg-experiencias"` en `libs/blocksprj/pxt.json`. `"gg-experiencias": "file:../../libs/gg-experiencias"` en el `pxt.json` del juego. Anular el menú con `controller.menu.onEvent(ControllerButtonEvent.Pressed, () => {})` (precedente: `multiplayer.ts:21`).

- [ ] **Step 5: Añadir arte.** `fondoPlano` como imagen (cuadrícula de -7..7 y -5..5, celda 20 px, origen en 160,120) y tres animales de 16×16. `fuente.test.mjs` ya prohíbe `drawLine`, así que los números de los ejes van en la imagen. Actualizar `art.test.mjs` y regenerar `gg.jres`.

- [ ] **Step 6: Escribir el juego real en `main.ts` y `solucion.json`.** Flechas mueven a Geeky por la cuadrícula y A confirma.
  - Explorar: moverse libre, viendo su coordenada.
  - Construir: ejemplo guiado; después, el término «par ordenado».
  - Aplicar: 3 ítems con pista («Todavía no. Revisa el signo de la primera coordenada e inténtalo otra vez.»).
  - Comprobar: series A y B de 5 ítems fijos, un intento por ítem, y al menos un ítem por cuadrante.
  - Reflexionar: `elegir` sobre qué número va primero.
  - Final: mapa con cada rescate, su coordenada y `N de 5`.
  - El catálogo y la ficha declaran que repite tema de Sócrates.

- [ ] **Step 7: Medir y ver.** `npm run build`, en segundo plano. Comprobar que `games/rescate-plano.js` pesa menos de 2,5 MB. Tomar captura de un diálogo y de la pantalla final y **leerla**: ¿se ven tildes, ñ, ¿ y ¡? Si un carácter falla, se reescribe el texto o se ajusta la fuente de la biblioteca, nunca se quita la tilde. Las capturas van a `.superpowers/` para la Tarea 8.

- [ ] **Step 8: Verificar** `npm test`, `npx playwright test tests/journey/reproductor.spec.mjs tests/journey/solucion.spec.mjs` y `npx playwright test tests/journey/mission.spec.mjs` → PASS. La misión demuestra que la categoría nueva no la altera.

- [ ] **Step 9: Commit** `Añadir la biblioteca de experiencias y Rescate en el plano`.

## Tarea 5: Pantalla Experiencias en la portada

**Modelo:** Sonnet

**Files:**
- Create: `tests/journey/catalogo.spec.mjs`
- Modify: `studio/index.html`, `studio/studio.mjs`, `studio/studio.css`, `studio/experiencias.mjs`, `tests/unit/experiencias.test.mjs`

**Interfaces:**
- Consumes: `playerUrl`, `gameById`.
- Produces, en `experiencias.mjs`:
  - `loadCatalog(get = fetch) → Promise<Entry[]>`
  - `groupByArea(catalog) → [{area, nombre, juegos}]`, en orden `mat, cnt, ccss, l1, l3, art, ef, fc, pyd`, con nombres iguales a los del CNB.
  - `rememberStudent(storage, name) → void` y `recallStudent(storage, known: string[]) → string | null`, con clave `gg-estudiante`, sin lanzar nunca.
  - `parseEntry(search) → {pantalla?: 'experiencias', ver?: string}`
- DOM: `#open-catalog` «Experiencias» en `#projects`; `<main id="catalog" class="screen" hidden>` con `#catalog-areas` y `#catalog-back`. `show()` añade `catalog`.
- Consumido por la Tarea 6: `showCatalog(student)` y `routeEntry()` en `studio.mjs`.

- [ ] **Step 1: Escribir las unitarias**

```js
test('groupByArea sigue el orden y agrupa', ...);
test('recallStudent solo devuelve un estudiante conocido', ...);   // 'Ana' fuera de ['Beto'] → null
test('rememberStudent y recallStudent no lanzan si storage falla', ...); // storage que lanza → null
test('parseEntry lee ver y pantalla e ignora lo demás', ...);
```

- [ ] **Step 2: Escribir `catalogo.spec.mjs`**

```js
test('lista por área y abre el juego con una pulsación', {tag: '@recorrido'}, ...);
  // entrarComo Ana; #open-catalog; en #catalog: encabezado Matemáticas y botón Rescate en el plano;
  // clic → URL player.html?juego=rescate-plano; data-estado jugando
test('Volver a Experiencias conserva al estudiante', ...);
  // #player-back → #catalog visible; #catalog-back → #projects-title 'Hola, Ana'
test('un estudiante que no está en la lista lleva a elegir de nuevo', ...);
  // sessionStorage gg-estudiante='Nadie'; goto index.html?ver=rescate-plano → #students visible; 0 registros
test('sin estudiante guardado, ?ver no crea nada', ...);
```

- [ ] **Step 3: Verificar que fallan** las nuevas unitarias y `npx playwright test tests/journey/catalogo.spec.mjs`.

- [ ] **Step 4: Implementar.** `#open-catalog` llama a `showCatalog(student)` con `guard`, y el mensaje de fallo es «No pudimos abrir las experiencias. Avísale a tu docente.». Cada juego es un `button` con título, situación y, si `repiteSocrates`, la etiqueta «Repite un tema de Sócrates». El clic llama a `rememberStudent(sessionStorage, student)` y navega a `playerUrl(id)`. El arranque cambia `await showStudents()` por `await routeEntry()`: lee `parseEntry`, recupera al estudiante, limpia la URL con `history.replaceState` y muestra la lista, el catálogo o (Tarea 6) la copia.

- [ ] **Step 5: Verificar** `npm test`, `npx playwright test tests/journey/catalogo.spec.mjs` → PASS tras reconstruir el sitio (`node tools/site.mjs dist/site/code-studio` basta para `studio/`).

- [ ] **Step 6: Commit** `Añadir la pantalla Experiencias a la portada`.

## Tarea 6: «Ver cómo está hecho»

**Modelo:** Sonnet

**Files:**
- Create: `tests/journey/copia.spec.mjs`
- Modify: `studio/project.mjs`, `studio/identity.mjs`, `studio/host.mjs:29`, `studio/studio.mjs`, `studio/experiencias.mjs`, `tests/unit/{identity,host,experiencias}.test.mjs`, `tests/journey/helpers.mjs`

**Interfaces:**
- Consumes: `routeEntry`, `loadCatalog`, `gameById`.
- Produces:
  - `newProject(template, {name, id, headerId, now, files = {}, experiencia})`, con `text: {...template.files, ...files, 'pxt.json': ...}` y `ggProject: {id, v: 1, experiencia?}`.
  - `readExperiencia(project) → string | undefined`
  - `stampIdentity(project, id, derivedFrom, experiencia)`
  - `findCopy(records, id) → record | undefined`: por `readExperiencia`, sin `isDeleted`, el más reciente. Es independiente de `findMission`.
  - En `studio.mjs`: `openCopy(student, id)`.
- `helpers.mjs`: `verCopia(page)`, que pulsa `#player-code` y espera `.blocklyDraggable` en `#editor-frame`.

- [ ] **Step 1: Escribir las unitarias**

```js
// identity.test
test('stampIdentity conserva experiencia y derivedFrom', ...);
test('readExperiencia sin marca es undefined', ...);
// project: en experiencias.test o un project.test nuevo
test('newProject reemplaza archivos y marca la experiencia', ...);
  // files {'main.ts':'x','main.blocks':''} → text igual; config.files intacto; ggProject.experiencia
test('newProject sin experiencia no añade la clave', ...);
// host.test
test('un guardado cuyo pxt.json no trae ggProject conserva la experiencia', ...);
  // registro con experiencia 'rescate-plano'; guardar pxt.json '{"name":"n"}'; sigue marcada
// experiencias.test
test('findCopy encuentra por marca, no por nombre', ...);  // proyecto homónimo sin marca → undefined
test('findCopy ignora una copia borrada', ...);            // isDeleted → undefined
```

- [ ] **Step 2: Escribir `copia.spec.mjs`**

```js
test('la copia cae en el estudiante correcto y se ve en bloques', {tag: '@recorrido'}, ...);
  // Ana entra; Beto entra, juega y verCopia; registros Beto 1, Ana 0;
  // experiencia 'rescate-plano'; `.blocklyDraggable` > 20; main.ts contiene 'experiencias.comprobar';
  // la vista activa es Bloques
test('el código sigue tras abrir, guardar y reabrir', ...);
  // Cambiar de estudiante (requestSave); page.reload; registro: main.ts con 'experiencias.comprobar',
  // main.blocks no vacío; abrir de nuevo: bloques > 20; ejecutar(page, editor) arranca
test('pulsar otra vez abre la misma, con sus cambios, aunque esté renombrada', ...);
  // renombrar en la caja de nombre del editor; escribir `let marca = 7`; guardar; volver a jugar; verCopia;
  // registros 1; mismo header.id; nombre nuevo; main.ts contiene 'marca'; experiencia sigue
test('un proyecto sin la biblioteca sigue abriendo y ejecutándose', ...);
  // store.put con dependencias {device:'*','gg-studio':'*'}; abrir; ejecutar arranca
```

- [ ] **Step 3: Verificar que fallan** las unitarias y `npx playwright test tests/journey/copia.spec.mjs`.

- [ ] **Step 4: Implementar `project.mjs`, `identity.mjs` y `host.mjs`.** En `save`, `const experiencia = readExperiencia(source)` y `stampIdentity(merged, id, derivedFrom ?? readDerivedFrom(source), experiencia)`.

- [ ] **Step 5: Implementar `openCopy`.**
  - Si `findCopy` halla la copia, usa ese registro.
  - Si no: `fetch('games/<id>.ts')` con `.text()`, porque Pages puede servir `.ts` con otro tipo MIME; `loadTemplate()`; `newProject(template, {name: entrada.titulo, id, headerId, now, experiencia: id, files: {'main.ts': code, 'main.blocks': ''}})`; `store.put`.
  - Abre con `openEditor(student, openHeader(headerId), afterLoad)`. Si `project.text['main.blocks']` está vacío, `afterLoad` es `() => post(session.frame, {action: 'switchblocks'})`.
  - `routeEntry` la llama para `?ver=`. Con `guard`: «No pudimos abrir el código de este juego. Avísale a tu docente.», y deja ver el catálogo.
  - **Plan B**, solo si la prueba demuestra que `''` no abre en Bloques: generar `main.blocks` al compilar y publicarlo como `games/<id>.blocks`. Avisar antes al orquestador.

- [ ] **Step 6: Verificar** `npm test`, `npx playwright test tests/journey/copia.spec.mjs` y `npm run recorrido` (< 3 min) → PASS.

- [ ] **Step 7: Commit** `Crear la copia editable de una experiencia`.

## Tarea 7: Sin red, arranque y legibilidad

**Modelo:** Sonnet

**Files:**
- Create: `tests/journey/juegos.spec.mjs`, `tests/journey/legibilidad.spec.mjs`
- Modify: `tests/journey/offline.spec.mjs`

**Interfaces:**
- Consumes: `abrirJuego`, `pulsar`, `verCopia`, `registros`, y `iniciar`, `detener`, `listo` de `offline.spec.mjs`.
- Las tres pruebas generan sus casos desde `dist/site/code-studio/games/catalogo.json`, así crecen solas con la ola 2.

- [ ] **Step 1: Escribir las pruebas**

```js
// juegos.spec: por entrada del catálogo publicado
test(`${id} arranca sin errores ni salidas`, ...);
  // data-estado jugando; fase 'explorar'; vigilarRed []; sin pageerror ni console.error
// legibilidad.spec: por entrada
test(`${id} se lee en bloques`, ...);
  // verCopia; Cambiar de estudiante; main.blocks sin /typescript_(statement|expression)/;
  // main.blocks con al menos 20 elementos <block
// offline.spec
test('sin red, abre un juego y crea su copia', ...);
  // servidor propio; listo; entrarComo Ana; detener(server); context.setOffline(true);
  // #open-catalog → juego → pulsar('A') aumenta paso → verCopia;
  // registros Ana 1; requestfailed del origen === []
```

- [ ] **Step 2: Ejecutar:** `npx playwright test tests/journey/juegos.spec.mjs tests/journey/legibilidad.spec.mjs` y `npx playwright test tests/journey/offline.spec.mjs -g "sin red"`. Corregir lo que falle en la Tarea correspondiente. Un bloque gris se arregla en `main.ts`, nunca relajando la prueba.

- [ ] **Step 3: Commit** `Probar sin red, arranque y legibilidad de los juegos`.

## Tarea 8: Punto de control de la ola 1

**Modelo:** Opus

**Files:** ninguno de producto. Evidencia en `.superpowers/` (ignorada por git).

Es una revisión de evidencia, no de estilo. **La ola 2 no empieza hasta que este punto dé «seguir».**

- [ ] **Step 1: Ejecutar** `npm run build`, `npm test` y `npm run journey`, en segundo plano. Anotar duración de cada uno. Si `npm run journey` pasa de 10 minutos, recortar la legibilidad reutilizando la misma página entre juegos.

- [ ] **Step 2: Comprobar, leyendo pruebas y salidas, cada riesgo que el diseño pide cerrar:**

| Riesgo | Evidencia exigida |
|---|---|
| Copia | `copia.spec` demuestra estudiante, no duplicar, renombrado, abrir-guardar-reabrir y bloques |
| Fin de juego | Reinicio desde `final` con foco, por `data-` |
| Fuentes | Capturas leídas por la persona revisora: tildes, ñ, ¿ y ¡ en diálogo y pantalla final |
| `simmessages` | `reproductor.spec` lee estados emitidos, sin atajos dentro del iframe |
| Sin red | La prueba corre con servidor apagado y `setOffline` |
| Tamaño | Peso del juego comparado con 2,34 MB; extrapolación a 12 |
| Tiempo | Duración del recorrido anotada; los 10–15 min quedan para la observación humana |

- [ ] **Step 3: Revisar con `superpowers:requesting-code-review`** desde el commit `Planificar las experiencias CNB` hasta `HEAD`: API de la biblioteca (quedará congelada), bloques legibles y aislamiento del juego en el iframe opaco.

- [ ] **Step 4: Decidir.** «Seguir» o lista de correcciones. Las correcciones las hace un subagente Sonnet y se vuelven a verificar. Si un riesgo no se pudo cerrar, parar y avisar al orquestador. Commit solo si hubo correcciones: `Corregir la revisión de la ola 1`.

---

# Ola 2: las otras 11

**Sin conflictos:** la Tarea 9 deja el arte compartido. Cada tarea siguiente toca solo sus `games/<id>/` y, si hace falta, añade a `libs/gg-experiencias` sin cambiar lo existente. Las pruebas generan los casos solas. Se ejecutan en orden, una a la vez.

**Procedimiento común de cada juego** (Tareas 10–17). Cada tarea solo fija lo propio:

- [ ] **a.** Crear `pxt.json` igual al de `rescate-plano` y `solucion.json` con `rondas`.
- [ ] **b.** Verificar que falla: `GG_SOLUCIONES=1 npx playwright test tests/journey/solucion.spec.mjs -g <id>`.
- [ ] **c.** Escribir `main.ts` con las cinco fases: Explorar sin riesgo, Construir con ejemplo y término, Aplicar con pistas (`todaviaNo`), Comprobar con series fijas A y B de 5 ítems y un intento, Reflexionar con `elegir`, y `final`. Sin azar.
- [ ] **d.** `npm run build -- --juego <id>`.
- [ ] **e.** Verificar: `node --test tests/unit/fuente.test.mjs` y `GG_SOLUCIONES=1 npx playwright test tests/journey/solucion.spec.mjs tests/journey/juegos.spec.mjs tests/journey/legibilidad.spec.mjs -g <id>` → PASS.
- [ ] **f.** Captura de la pantalla final, leída: el texto cabe y se entiende sin color ni sonido.
- [ ] **g.** Commit `Añadir <título>`.

Si el juego necesita ajustar una respuesta para pasar, se corrige la solución o el juego, nunca el umbral de 4 de 5.

## Tarea 9: Arte compartido

**Modelo:** Sonnet

**Files:**
- Modify: `tools/gg-art.mjs`, `libs/gg-studio/{gg.ts,gg.jres}`, `tests/unit/art.test.mjs`

**Interfaces:**
- Produces, en `sprites.gg`, con `whenUsed` y etiqueta `gg-fondo` los fondos: `fondoMercado` (2, 12), `fondoBosque` (3, 4), `fondoMundo` (5, 6: franjas de latitud esquemáticas, declaradas como esquema), `fondoEscuela` (7, 8, 10, 11), `fondoMarimba` (9). Sprites de hasta 32×32 con el mismo `whenUsed`, a criterio, para lo que pidan los juegos: numerales mayas (punto, barra, cero), árbol, brote, gota, huella, carta, moneda, nota.

Límite: esos 5 fondos más `fondoPlano`, porque cada uno añade ~51 KB a `target.js` y otros tantos a `target.json`.

- [ ] **Step 1: Ampliar `art.test.mjs`:** `test('cada fondo mide 320×240 y usa la paleta', ...)` y `test('todo fondo se declara con whenUsed y sin la etiqueta gg', ...)`, leyendo `gg.ts`.

- [ ] **Step 2: Verificar que falla**, dibujar el arte propio, sin marcas ni material con derechos, y regenerar `gg.jres`.

- [ ] **Step 3: Demostrar `whenUsed`.** `npm run build`; `games/rescate-plano.js` debe crecer menos de 5 KB respecto a la Tarea 4. Si crece más, parar: los fondos no usados están entrando en cada juego.

- [ ] **Step 4: Verificar** `npm test` y `npx playwright test tests/journey/mission.spec.mjs` → PASS. Commit `Añadir el arte de las experiencias`.

## Tarea 10: Cuentas mayas en el mercado

**Modelo:** Sonnet. **Representante de Ordenar.** Procedimiento común.

- **Contenidos:** `mat:4.1.5`, `mat:4.1.7`. **Controles:** flechas para elegir, A para colocar.
- **Mecánica:** armar numerales con punto, barra y cero en posiciones 1, 20 y 400, y seguir series de 20 en 20 y de 100 en 100.
- **Final:** cuenta del día en maya y en decimal.
- **Cuidados:** sin sentido ceremonial ni calendario. Sin vocabulario maya: solo «numeral», «punto», «barra», «cero». El numeral se dibuja vertical y lleva su valor en texto. Repite tema de Sócrates, ya declarado.

## Tarea 11: Vecinos del bosque

**Modelo:** Sonnet. **Representante de Clasificar.** Procedimiento común.

- **Contenidos:** `cnt:1.5.1`, `1.5.4`, `1.5.6`, `1.5.7`. **Controles:** izquierda o derecha, A (`EjeEleccion.Horizontal`).
- **Mecánica:** clasificar relaciones en parasitismo, mutualismo y comensalismo. Parásitos: distingue externos e internos, porque `cnt:1.5.1` lo pide. Incluye al menos una relación con personas (`1.5.7`).
- **Final:** cuaderno de campo con relaciones halladas y quién gana.
- **Cuidados:** solo especies y relaciones comprobables de bosque nuboso; la Tarea 19 las lista para revisión humana.

## Tarea 12: Detective de noticias y Recreo activo

**Modelo:** Sonnet. Procedimiento común, un commit por juego.

**`detective-noticias`**
- **Contenido:** `l1:4.3.2`. **Controles:** izquierda o derecha, A.
- **Mecánica:** clasificar frases en hecho, opinión o generalización.
- **Final:** mural con cada frase marcada y `N de 5`.
- **Cuidados:** noticias ficticias, sin personas ni medios reales, y el juego dice que son ficticias.

**`recreo-activo`**
- **Contenidos:** `ef:3.1.1`, `3.1.3`, `3.2.1`. **Controles:** izquierda o derecha, A.
- **Mecánica:** clasificar hábitos de higiene, movimiento, agua y alimentación, con pausas guiadas. Cada pausa ofrece variante de pie o sentado y dice cuándo detenerse.
- **Final:** plan de recreo con tres pausas, agua y aseo.
- **Cuidados:** la prueba no exige moverse de verdad; aprobar no depende de la pausa.

## Tarea 13: Comunidad preparada

**Modelo:** Sonnet. **Representante de Decidir.** Procedimiento común.

- **Contenidos:** `ccss:1.3.1`, `1.3.2`, `1.3.3`. **Controles:** arriba o abajo, A.
- **Mecánica:** comparar fenómenos de Guatemala y del mundo, lugares de peligro y quién ayuda. Cada decisión muestra su consecuencia.
- **Final:** plan con fenómeno, lugar de peligro y quién ayuda.
- **Cuidados:** sin víctimas. Cruz Roja y Médicos Sin Fronteras, solo en texto y sin emblemas.

## Tarea 14: La ladera viva y Mi puesto en la feria

**Modelo:** Sonnet. Procedimiento común, un commit por juego.

**`ladera-viva`**
- **Contenidos:** `cnt:6.3.1`, `6.3.3`. **Controles:** arriba o abajo, A.
- **Mecánica:** sembrar y pasar por lluvia y sequía, viendo suelo, agua y animales.
- **Final:** ladera final con suelo, agua y animales, y el aviso «Es un modelo en la pantalla.»
- **Cuidados:** sin víctimas.

**`puesto-feria`**
- **Contenido:** `pyd:4.3.1`. **Controles:** arriba o abajo, A.
- **Mecánica:** decidir precio, costo y cantidad con dinero de juego.
- **Final:** informe con costo, ingreso, ganancia y una mejora. Las cuentas se muestran y coinciden con lo elegido.
- **Cuidados:** el juego prepara; la feria real depende de la docente, y la ficha lo dice.

## Tarea 15: Mediación en el recreo

**Modelo:** Sonnet. Procedimiento común.

- **Contenidos:** `fc:4.3.1`, `fc:4.3.2`. **Controles:** arriba o abajo, A.
- **Mecánica:** dos grupos quieren la cancha; cada forma de afrontar el conflicto muestra su efecto.
- **Final:** acuerdo escrito y efecto de cada forma.
- **Cuidados:** no atribuir conductas a un pueblo. **Sin ejemplo cultural inventado:** queda `cobertura: parcial` hasta que la revisión cultural aporte uno con fuente.

## Tarea 16: Vuelta al mundo y Follow Geeky

**Modelo:** Sonnet. Procedimiento común, un commit por juego.

**`vuelta-mundo`**
- **Contenidos:** `ccss:1.2.1`, `1.2.2`. **Controles:** flechas y A.
- **Mecánica:** Geeky sale de Guatemala con pistas de latitud, longitud y altitud, y confirma destino.
- **Final:** pasaporte con las zonas climáticas visitadas.
- **Cuidados:** el mapa se declara esquemático; lugares y datos reales y comprobables.

**`follow-geeky`**
- **Contenidos:** `l3:3.3.1`, `3.3.3`. **Controles:** flechas y A.
- **Mecánica:** búsqueda en la feria escolar con instrucciones escritas en inglés (first, then, last).
- **Final:** ruta recorrida e instrucciones cumplidas de 5.
- **Cuidados:** las instrucciones van en inglés; lo demás, en español.

## Tarea 17: Lee la marimba

**Modelo:** Sonnet. **Representante de Leer y tocar.** Procedimiento común.

- **Contenidos:** `art:1.1.1`, `1.1.2`. **Controles:** flechas según la nota, A.
- **Mecánica:** leer ritmo y melodía de una pieza original, compás por compás.
- **Final:** partitura completa con aciertos por compás.
- **Cuidados:** música original. Cada nota se ve y lleva su nombre. **Se aprueba sin sonido:** ninguna condición de `main.ts` lee el audio, y el recorrido de `solucion.spec` lo demuestra porque corre sin oír nada. `aciertos` cuenta los 5 ítems de Comprobar, no las notas.

## Tarea 18: Cierre de la ola 2

**Modelo:** Sonnet

**Files:**
- Modify: `tests/unit/catalogo.test.mjs`, `AGENTS.md`

- [ ] **Step 1: Añadir** `test('cada entrada tiene su carpeta y su solución', ...)`: `games/<id>/{main.ts,pxt.json,solucion.json}` para las 12.

- [ ] **Step 2: Añadir a `AGENTS.md`**, en una línea cada una: las reglas de `main.ts`, y que los bloques de `gg-experiencias` solo se añaden.

- [ ] **Step 3: Verificar:** `npm run build`, `npm test`, `npm run journey` y `GG_SOLUCIONES=1 npx playwright test tests/journey/solucion.spec.mjs`, en segundo plano. Deben pasar los 12 de `juegos` y `legibilidad`, con cero bloques grises, y las 12 soluciones.

- [ ] **Step 4: Commit** `Cerrar la ola 2 de experiencias`.

---

# Cierre

## Tarea 19: Fichas docentes

**Modelo:** Haiku

**Files:**
- Create: `docs/EXPERIENCIAS.md`
- Modify: `docs/GUIA-DOCENTE.md`, `tests/unit/catalogo.test.mjs`

- [ ] **Step 1: Añadir** `test('cada juego tiene ficha con sus contenidos', ...)`: cada título y cada código aparecen en `docs/EXPERIENCIAS.md`, y `CC BY-SA 4.0` también. Verificar que falla.

- [ ] **Step 2: Escribir una ficha por juego**, en el orden del catálogo: tiempo (10–15 min), área, contenidos CNB (código y texto tal cual de `contenidos.json`), objetivo y cómo usarlo. Sin convertir unidades en semanas. Declarar: repite tema de Sócrates (1, 2); cobertura parcial de `fc:4.3.2` (11); la feria real depende de la docente (12); el resultado solo se ve en la pantalla final y no se guarda.

- [ ] **Step 3: Añadir al final** el crédito a CNB Guatemala / Ministerio de Educación (CC BY-SA 4.0), y una sección «Datos por revisar» que liste, juego por juego, los datos de Ciencias y Sociales que afirma cada `main.ts` (3, 4, 5, 6).

- [ ] **Step 4: Enlazar** desde `docs/GUIA-DOCENTE.md`. Verificar `npm test` y hacer commit: `Añadir las fichas docentes`.

## Tarea 20: Medición de tamaño y Guía docente

**Modelo:** Sonnet

**Files:**
- Modify: `docs/GUIA-DOCENTE.md:15`, `docs/DESPLIEGUE.md`

- [ ] **Step 1: Medir** con el sitio final, y anotar las cifras reales:
  - `sw-manifest.json.bytes` y `du -sb dist/site/code-studio` (diseño: ≈ 71 MB).
  - Suma de `gzip -6` de `games/*.js` (diseño: ≈ 3,9 MB; 327 KB por juego).
  - `navigator.storage.estimate().usage` tras «Listo para usar», con perfil limpio (diseño: ~28 MB más por computadora).
  - Si es accesible, tamaño comprimido real con `curl --compressed` sobre el sitio publicado actual. Solo lectura y sin publicar. Si no, se declara inferido.

- [ ] **Step 2: Corregir la Guía:** sustituir «unos 40 MB» por la cifra de descarga y añadir lo que ocupa en la computadora. Añadir una sección breve de Experiencias: cómo abrirlas y que el resultado no llega a la docente. La Guía docente dice: si la pantallita se queda girando y Play no responde, pulsa Bloques y vuelve a JavaScript; el código sigue guardado. Actualiza el tamaño: ≈ 69 MB sin red con 12 juegos.

- [ ] **Step 3: En `DESPLIEGUE.md`:** el service worker instala la lista completa por publicación, así que conviene agrupar publicaciones y hacerlas fuera de clase; plan B si falla en un equipo escolar: `.js.gz` y `DecompressionStream` en `player.mjs`. No implementar el plan B.

- [ ] **Step 4: Commit** `Medir el tamaño y corregir la Guía docente`.

## Tarea 21: Revisión editorial

**Modelo:** Opus

**Files:**
- Modify: textos de `games/*/main.ts`, `games/catalogo.json`, `studio/{index.html,player.html,studio.mjs,player.mjs}`, `docs/EXPERIENCIAS.md`, sección nueva de `docs/GUIA-DOCENTE.md`

- [ ] **Step 1: Leer**, solo lectura, `/home/adawolfs/projects/socrates.app/docs/GUIA_EDITORIAL_GUATEGEEKS.md`, y las reglas de texto del diseño.

- [ ] **Step 2: Revisar cada texto visible** contra la guía, la audiencia (primaria para juegos, docente para fichas) y los cuidados por juego. Corregir directamente. No cambiar respuestas, orden de opciones, series ni mecánica.

- [ ] **Step 3: Verificar** `npm run build`, `npm test` y `GG_SOLUCIONES=1 npx playwright test tests/journey/solucion.spec.mjs` → PASS. Las líneas de `final` no superan 53 caracteres. Commit `Revisar los textos de las experiencias`.

## Tarea 22: Revisión final y lista humana

**Modelo:** Opus

**Files:**
- Modify: `docs/EXPERIENCIAS.md`

- [ ] **Step 1: Ejecutar** `npm run build`, `npm test`, `npm run journey` y `GG_SOLUCIONES=1 npx playwright test tests/journey/solucion.spec.mjs`, en segundo plano.

- [ ] **Step 2: Revisar la rama** con `superpowers:requesting-code-review`, desde el commit `Planificar las experiencias CNB`: cobertura del diseño, las pruebas demuestran efecto, Global Constraints y Review Focus. Corregir con un subagente Sonnet y volver a verificar. Commit `Corregir la revisión final`, si hubo cambios.

- [ ] **Step 3: Añadir a `docs/EXPERIENCIAS.md` la sección «Revisión humana pendiente»:**
  - Pertinencia cultural de Cuentas mayas, Lee la marimba y Mediación, incluido el ejemplo con fuente para `fc:4.3.2`.
  - Datos de Ciencias y Sociales: la lista «Datos por revisar».
  - Una clase real: 10–15 minutos sin ayuda, comprensión de textos, foco con teclado real y ventana recién abierta.
  - Equipos escolares: sonido, Edge y Firefox, tamaño de caché.
  - Pendientes sin causa: pantallita cargando en la vista JavaScript al pegar código, y CLI frente a editor sin comparar byte a byte.
  - Publicación: solo con pedido expreso del usuario, después de lo anterior.

- [ ] **Step 4: Commit** `Listar la revisión humana pendiente` y entregar al orquestador el resumen: resultados, cifras medidas y lista humana. Sin push.
