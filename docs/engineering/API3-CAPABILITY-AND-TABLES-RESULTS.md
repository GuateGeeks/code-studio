# Resultados: API v3 para 3D/web y tablas de lenguaje (block-language-contract, fase 2)

25 de octubre de 2026, Guatemala. Segunda fase del cambio OpenSpec `block-language-contract` ([ADR-011](../adr/011-contrato-de-lenguaje-y-vistas-sincronizadas.md)). La [fase 1](API3-2D-RESULTS.md) llevó la API v3 al 2D.

## API v3 para 3D y web

La lectura derivada y las copias de 3D y web ya no muestran `GG.context`, `gg_state`, `ctx` ni funciones `gg_*`:

```js
let Pasos = 2;

onStart(() => {
  sphere.move(1, 0, 0);
  Pasos += 1;
});

web_form.onSubmit((event) => {
  web_list.appendItem(event.values["web-input"]);
});
```

En Python: `@sphere.on_click`, `web_list.append_item(...)`.

- **Vocabulario derivado del perfil** (`src/contracts/api3-capability-vocabulary.mjs`), sin listas escritas a mano:
  - las operaciones con objetivo son métodos del objeto (`sphere.move`);
  - las demás cuelgan de `scene.` o `app.`;
  - los argumentos son las hojas del esquema, en orden.
- **Traductores a API2 en el origen del lenguaje:** JavaScript (`src/targets/text/api-v3-capability.mjs`, acorn, preludio API2 en la primera línea) y Python (`api3CapabilityPythonCompiler`, AST).
  - Conservan los límites, la comparación estricta y los campos de evento de la API2.
  - Las copias guardan `runtime.targetIds` (identificador → ID del objeto) y `runtime.variableIds`.
- **Bloques:** se siguen ejecutando por la vía interna API2. Solo cambian la lectura y las copias.

## Tablas de lenguaje

- **Contrato** `src/contracts/language-table.mjs`:
  - una entrada por bloque;
  - forma canónica única, salvo `supersedes` explícito (`gg.assets` reemplaza a las acciones de `gg.sprites`);
  - identificadores válidos y sin palabras reservadas de JS/Python;
  - plantillas que usan exactamente sus argumentos;
  - bajada obligatoria.
- **Datos** `src/packs/language-tables.mjs`:
  - las tablas de las versiones publicadas viven en el catálogo, por `pack@versión`, porque sus manifiestos están congelados por el hash;
  - 3D y web derivan sus entradas de los descriptores de operaciones;
  - la cobertura se comprueba: todos los bloques instalados tienen entrada y no hay entradas huérfanas.
- **Fuente única:**
  - el vocabulario v3 2D, que usan traductores y generador, se deriva de la tabla;
  - las acciones del generador 2D salen de la tabla;
  - las sentencias de micro:bit se renderizan desde sus plantillas, con texto Static TypeScript idéntico al anterior.
- **Manifiestos:** `apiVersion: 2` se aceptan solo con una tabla `language` válida.

## Pruebas

- `tests/integration/api-v3-capability.test.mjs`: equivalencia exacta con API2 (operaciones con su autoridad, suscripciones y errores) en dos programas de 3D y web, en JavaScript (QuickJS) y Python (Pyodide); errores del traductor con su línea.
- `tests/integration/language-table.test.mjs`: cobertura; reglas bloqueables con cada infracción rechazada; vocabulario derivado; TypeScript de micro:bit idéntico; manifiesto `apiVersion: 2`.
- Node: 423 (421 + 2 por carga, que repetidas aprobaron). Herramientas: 73/73.
- E2E en foco de 3D y web (capacidades, espacio contextual, 3D, web, exportación autónoma, 3D avanzado, presentación): 36/36.
- Puerta completa en 2 particiones (`artifacts/test-gate/full-p2-4.log`, 35 min): Node, herramientas, build y smoke aprobados; E2E 199/200. El único fallo fue `GG-COPY-002 audioStop`, en el paso de **bloques**, un camino que esta fase no toca: la muestra de audio llegó con `playing: false` mientras la carga compartida estaba alta. Repetida 3 veces junto con `audio`, ya con la máquina tranquila: 6/6. Es intermitente por carga.

## Límites

- El TypeScript de micro:bit conserva el contador `gg_device_i_N`, porque cambiarlo altera el texto que se compila a HEX.
- La bajada 2D a opcodes VM desde la tabla queda para `scene2d-vocabulary-v2`; hoy la tabla declara la bajada a la IR0 existente.
- No hay todavía packs `apiVersion: 2` publicados. La primera versión nueva de un pack llevará su tabla en el manifiesto.
