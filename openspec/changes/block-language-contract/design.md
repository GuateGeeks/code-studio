# Design

## Context

Véanse `proposal.md`, ADR-011 y el [plan de maduración](../../../docs/product/FEATURE-MATURATION-PLAN.md) (H2, H4, H5, H9, H10). Estado actual verificado en el código:

- **2D:** las reglas `hats/statements/expressions` del pack bajan a 12 kinds IR0 cerrados (`program-contract.mjs`). `generated-program-source.mjs` y el adaptador Scratch son `switch` sobre esos kinds. La VM ya ejecuta 84 opcodes (matriz F5).
- **micro:bit:** `gg.microbit` aporta bloques con traducción vacía; `device-program.mjs` tiene su tabla y un `switch` a Static TypeScript.
- **3D/web:** `operationDescriptors` genera bloque, llamada IR1 y texto `await ctx.<path>(args)`, con validación en línea `gg_*`.
- **Texto:** QuickJS instala `GG` en el global (`quickjs-engine.mjs:175`) y Pyodide lo registra como módulo (`python-engine.mjs:121`). El host captura sesión, revisión, contexto y objetivo de cada invocación (ADR-009).
- `workspace-from-ir.mjs` ya invierte reglas declarativas para la copia Scratch y verifica el resultado con la traducción directa.

## Goals / Non-Goals

**Goals:** una tabla por bloque como contrato de pack; API v3 legible y bloqueable; generadores genéricos; misma ejecución; copias anteriores intactas.

**Non-Goals:** parser texto→bloques (`synced-code-views`), vocabulario nuevo, editor de código nuevo, cambiar motores u orígenes.

## Decisions

1. **Forma de una entrada.** Una entrada es dato puro:
   ```js
   { block: 'gg_move', category: 'Movimiento', label: 'mover %STEPS pasos',
     args: { STEPS: {type: 'number', min: -1e6, max: 1e6, default: 10} },
     namespace: 'sprite', name: 'move', kind: 'call',
     js: 'sprite.move(STEPS)', python: 'sprite.move(STEPS)',
     lower: { scene2d: {opcode: 'motion_movesteps', inputs: {STEPS: 'STEPS'}} } }
   ```
   Los `kind` posibles son `call`, `value`, `event` (callback como último argumento) y `enum`. Las plantillas solo admiten sustitución de argumentos ya validados; nunca se evalúan como código.
2. **Bajada por contexto.**
   - 2D baja a **opcodes Scratch VM** de la matriz F5 revisada, en lugar de a kinds IR0 nuevos. El adaptador pasa de un `switch` a una proyección genérica limitada a opcodes revisados.
   - micro:bit baja a **plantillas Static TypeScript** sobre APIs reales de `pxt-microbit/libs` (equivalente en datos a las anotaciones `//% block` de MakeCode).
   - 3D/web baja a **operaciones de capacidad** existentes.
   - Las IR0/IR1 se conservan como representación validada; la tabla aporta las reglas que antes estaban en código.
3. **Espacios de nombres en lugar de `GG`.** Cada pack declara uno: `sprite` y el nombre del objeto en 2D, `score`, `basic`, `led`, `input`, `scene`, `app`. El catálogo mantiene una lista de palabras reservadas por lenguaje (`print`, `input`, `round`, `len`, `Math`…). `GG` sigue existiendo como puente del sandbox, pero la capa API v3 lo envuelve y el texto del alumno no lo nombra.
4. **Capa API v3 en el origen del lenguaje.** Un módulo de API por versión (`api-v3` en JavaScript y Python), escrito sobre el puente `GG` y cargado por el motor según `runtime.api`. API1 y API2 se conservan como capas existentes. El parser y la capa viven en `src/targets/text`, nunca en la shell (AGENTS.md).
5. **Contexto de invocación implícito.** El host ya captura sesión, revisión, contexto y objetivo por invocación; la capa API v3 asocia cada callback a su invocación sin exponer `ctx`. Stop y revocación de tokens no cambian.
6. **`await`, decidido con una prueba técnica (tarea 1.2).**
   - **Objetivo:** la API v3 no exige `await` en llamadas que esperan (`wait`, `say` durante, `broadcastAndWait`). Así el mismo texto vale como vista sincronizada (que se analiza a IR y no se ejecuta) y como copia independiente (que sí se ejecuta).
   - **Candidatos:** variante asyncify de QuickJS en quickjs-emscripten, y `run_sync` de Pyodide sobre JSPI en Chromium.
   - **Si la prueba no supera los criterios** (Stop < umbral actual, sin regresión de memoria ni de cohorte offline): la API v3 conserva `await` explícito solo en las operaciones que esperan, documentado como regla del lenguaje, y el parser de `synced-code-views` lo acepta.
   - **Alternativa descartada:** dos dialectos distintos para la vista y para la copia.
7. **Validación de dominio fuera del texto.** Los límites (±1e6, 0..1000 repeticiones, 0..60 s) se validan en la capa API v3 y en el host contra el esquema de la tabla; la lectura no incluye funciones `gg_*`. La exportación autónoma empaqueta la misma capa.
8. **Variables.** Los nombres nuevos deben ser identificadores válidos. Los existentes no válidos se presentan con un derivado determinista y estable (transliteración, `_` y sufijo numérico ante colisión), guardado como alias en el proyecto para que el resultado no cambie entre sesiones. El ID de la variable sigue siendo la identidad. «Cambiar en» se lee `puntos.changeBy(1)` (o `puntos += 1` si la prueba 6 permite atomicidad), para preservar la atomicidad de ADR-004 con clones.
9. **Rótulos educativos en la tabla.** Los rótulos de `capability-labels.mjs` (capa de editor del rework) pasan a la entrada como `label`. Ya no hace falta separar el rótulo del hash, porque los manifiestos se versionan con `pack-versioning-and-migrations`.

## Risks / Trade-offs

- [El núcleo pasa a interpretar tablas y es más difícil de depurar] → errores de validación que nombran pack, entrada y campo; prueba de herramientas que recorre todas las entradas.
- [La migración de packs cambia comportamiento] → corpus de equivalencia y fixtures ejecutados antes y después, con trazas comparadas.
- [La prueba de `await` falla] → alternativa ya decidida en el punto 6; no bloquea el cambio.
- [Nombres de variables derivados confunden] → el bloque conserva el nombre original y la lectura muestra un comentario con él la primera vez que aparece.
- [Coste por bloque mayor] → la tabla genera bloque, texto, ayuda y, en el cambio siguiente, el parser; las pruebas de ida y vuelta se generan desde la tabla.

## Migration Plan

1. Esquema de manifiesto v2 y validador del catálogo.
2. Prueba técnica de `await` (decide el punto 6).
3. Capa API v3 en el origen del lenguaje, junto a API1 y API2.
4. Migrar `gg.score` (el más pequeño), después `gg.sprites` y `gg.assets`, operaciones 3D/web y `gg.microbit`, cada uno con fixtures y corpus.
5. Generadores genéricos.
6. Sustituir aserciones literales por archivos de referencia por API.

Cada paso se verifica con `test:affected`; una `test:full` al final. Reversión: restaurar los archivos del cambio; no hay datos nuevos sin migración inversa hasta publicar release.

## Open Questions

- Espacio de nombres 2D: ¿`sprite.move()` sobre el objeto seleccionado o `hero.move()` con el nombre del objeto? Propuesta: el nombre del objeto, que exige un identificador válido por sprite y prepara `scene2d-multi-sprite`.
- ¿Python micro:bit (Static Python de MakeCode) entra en este cambio? Propuesta: no; micro:bit declara solo TypeScript por ahora.
