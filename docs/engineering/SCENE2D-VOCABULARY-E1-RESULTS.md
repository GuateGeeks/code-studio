# Vocabulario 2D esencial (E1): implementación y verificación

29 de octubre de 2026, Guatemala. Etapa E1 del [plan de estabilización 2D](../product/STABILIZATION-PLAN-2D.md), primera tanda (re-alcanzada) de `scene2d-vocabulary-v2`. Rama `stab/e1-vocabulary` desde `356c08b`, worktree propio, en paralelo con las pistas de recursos (E4) e investigación de arranque. Sin push ni merge. **La puerta full la ejecuta el coordinador al integrar**; esta acta no la sustituye.

## Alcance entregado

Solo bloques que funcionan con un único sprite (decisión del usuario del 29/10):

- **Movimiento:** girar ↻/↺, apuntar en dirección, ir a x/y, deslizar en segundos a x/y, rebotar si toca un borde, fijar/cambiar x e y.
- **Apariencia:** decir/pensar, decir/pensar durante segundos, mostrar/esconder, fijar/cambiar tamaño, siguiente disfraz.
- **Control:** por siempre, repetir hasta que, esperar hasta que (comparaciones existentes de números y variables), detener todo, detener este programa.
- **Trasladado:** «ir a objeto», «fondo» y «Diálogo» a E2 (`scene2d-multi-sprite`, tarea 1.4 de vocabulary-v2); reporters, expresiones anidadas, sensores y operadores a la tanda 2 (E3).

Cada bloque entra en todas sus capas: entrada de tabla (`spriteLanguage02`) con forma Blockly, JS y Python API v3 y bajada; IR 2D validada con límites; opcode revisado; generador legible (API3, API1 y notación educativa); traductores API v3 en QuickJS y Pyodide; parser de vistas sincronizadas JS y Python; corpus y prueba de ida y vuelta.

## Decisiones (detalle y razones en `openspec/changes/scene2d-vocabulary-v2/design.md`, decisiones 5–11)

1. **`gg.sprites@0.2.0`** (manifiesto `apiVersion: 2` con su tabla). `0.1.0` conserva su hash `225d6c99…`; `0.2.0` = `70475dfa…`. `scene2d-multi-sprite` pasa a `0.3.0`.
2. **Migración** `0.1.0 → 0.2.0` registrada en el catálogo, sin transformar bloques; «Actualizar packs» la ofrece y no ejecuta.
3. **Compatibilidad de dependencias** (`localPackCompatibility`): 0.2.0 satisface dependencias declaradas sobre 0.1.0 (score, micro:bit, assets 0.1.0, sb3 0.2.0), en un solo sentido. Evita republicar cuatro packs congelados.
4. **Proyectos sin capacidades** (GGPROJ v1/v2 y el proyecto inicial sin guardar) siguen en 0.1.0 (`legacyPackVersions`), también cuando se les añade micro:bit, 3D/web o recursos (`lockedPackVersions`): ningún pack se actualiza implícitamente. Actividades, plantillas y selección de packs crean 0.2.0. Starters, IDs y checks de las actividades no cambian.
5. **Estructuras de control del núcleo** ofrecidas por la caja de herramientas del pack (`offeredCoreStructures`): 0.1.0 sigue rechazando `while (true)` exactamente como antes.
6. **Formas textuales:** `while (true)` / `while True:`, `while (!(a > b))` / `while not (a > b):`, `waitUntil(() => a > b)` / `wait_until(lambda: a > b)`, `return`, `stopAll()` / `stop_all()`, y `hero.turnRight(15)` / `hero.turn_right(15)` etc. con el orden de huecos del bloque.
7. **Semántica** (ADR-004 ampliado): cada vuelta de `while` cede un fotograma (`program.frame`, operación del núcleo); `waitUntil` comprueba y cede; `stopAll` es el `stopAll` de la VM y el texto vuelve en el acto; el único «Detener» del estudio sigue siendo el que restaura la escena.
8. **Opcodes:** matriz F5 más siete opcodes del núcleo revisados solo para la bajada (sección «Revisión E1» de [OPCODE-MATRIX](../phase-5/OPCODE-MATRIX.md)); **no** se abren en la importación SB3 (congelada).
9. **Decir/pensar** con texto literal (campo, ≤ 330 caracteres). Decir variables o expresiones queda para la tanda 2 (requerirá bloque con entrada y migración de tipo).

## Pruebas

Ver la sección «Ejecuciones» (conteos exactos) y la evidencia en `artifacts/stabilization-2d/e1-vocabulary/` (ignorada por Git).

### Nuevas

- `tests/integration/scene2d-vocabulary.test.mjs` (VOC-001…015) con el corpus `tests/fixtures/scene2d-vocabulary.mjs`: catálogo/hash/cobertura, versiones y compatibilidad, migración, estructuras ofrecidas, ida y vuelta bloque→IR→opcode→texto→IR con IDs por bloque, Python por `ast`, límites de la IR, opcodes revisados, efecto en la VM local, edición en la vista JS conservando IDs/shadows/comentarios/posiciones, trazas API1 = API3 en JS y Python, adaptador textual con fotogramas y `stopAll`, notación educativa y corpus de Stop.
- `tests/browser/scene2d-vocabulary.spec.mjs` (E1-01…05): caja de herramientas por menús, equivalencia bloques/JS/Python de «Hero se presenta», traza idéntica de «por siempre + rebotar» en las tres formas y nada se mueve tras Detener, vistas JS/Python que conservan IDs y reabren sin ejecutar, «Actualizar packs» 0.1.0 → 0.2.0.
- Proyecto canónico `tests/fixtures/canonical/scene2d/hero-presents/`; el ejecutor canónico admite claves anidadas (`hero.size`).

### Pruebas existentes ajustadas (sin debilitar aserciones)

- Catálogos sintéticos que reemplazan el manifiesto 0.1.0 fijan ahora `versions: {'gg.sprites': '0.1.0'}`, porque la última versión es 0.2.0 (CV-JS-005, LANG-005, GG-COMPAT-002). Su intención y aserciones no cambian.
- GG-PACK-001/002 espera `gg.sprites@0.2.0` para la selección por defecto y añade la comprobación explícita de 0.1.0.
- LANG-002 lista las formas nuevas y comprueba que las de 0.1.0 siguen derivándose.
- GG-TEXT-PROGRAM-002 enumera también las operaciones nuevas, que se revocan igual tras cancelar.

## Ejecuciones

Ubuntu/WSL, `source ../scripts/env.sh`, Node v22.23.4. Navegador con los puertos propios 5400–5409 (`GG_RELEASE_ROOT` en `artifacts/stabilization-2d/e1-vocabulary/releases`), un worker, en una máquina compartida con otras dos pistas: carga media entre 3 y 13 durante las corridas (`uptime` antes de cada una).

| Verificación | Resultado | Evidencia |
|---|---|---|
| `npm test` (Node) final | **511/511** (474 previas + 37 nuevas) | `node-final.log` |
| `npm run test:tools` | **79/79** | `tools-final.log` |
| `npm run spec:validate` (estricto) | **37/37** | — |
| `npm run browser:build` (incremental) | aprobado, tres veces | `build-1..3.log` |
| `canonical-projects` (con «Hero se presenta») | 3/3 | `canonical-1-output` |
| `scene2d-vocabulary` intento 1 | 3/5: E1-02…04 aprueban; E1-01 y E1-05 agotan el tiempo | `vocabulary-1.json` |
| `scene2d-vocabulary` E1-01 y E1-05 tras corregir la prueba | 2/2 | `vocabulary-2.json` |
| Foco 2D, 15 specs (abajo) | **86/88** | `focus-1.json`, `focus-1.log` |
| `code-views` aislada, tras reconstruir | **14/14** | `code-views-2.json` |
| Foco 2, tras `lockedPackVersions` (10 specs) | **67/67** | `focus-2.json` |

Foco 1: `scene2d-vocabulary`, `canonical-projects`, `code-views`, `code-view-conversion`, `language-copies`, `packs-lessons`, `educational-activities`, `synced-transition-activity`, `integrated-2d-workspace`, `corpus`, `minimum-corpus`, `textual-equivalence`, `bindings-editor`, `workspace-presentation`, `studio-entry-journey`. Foco 2: `scene2d-vocabulary`, `canonical-projects`, `integrated-microbit-workspace`, `capability-contexts`, `integrated-3d-workspace`, `integrated-web-workspace`, `sb3-resources`, `resource-safety`, `integrated-scratch-workspace`, `scene3d-advanced`.

### Intentos fallidos conservados

1. **`scene2d-vocabulary` intento 1, E1-01/E1-05 (defecto de la prueba nueva).** El clic iba a la etiqueta `.blocklyToolboxCategoryLabel`, cuya fila `.blocklyToolboxCategory` intercepta el puntero; en E1-01 además la página seguía en «Inicio». Corrección: seleccionar 2D y pulsar la fila de la categoría con `clickVisible`. Sin cambiar aserciones ni tiempos. Trazas en `vocabulary-1-output/`.
2. **Foco 1, `CV-VIEWS-005`** (suite existente): tras pulsar Ejecutar en la vista Python, el sondeo de `x = 78` leyó la escena durante su recarga y `settled` propagó `GG scene loading` (solo reintenta «Session stopped»). Carrera de lectura bajo carga (≈9), de la misma familia que LCOPY-001; la vista Python de ese proyecto heredado no usa ninguna estructura E1. Aislada y con el build nuevo: 14/14. No se tocó la prueba. Traza en `focus-1-output/code-views-CV-VIEWS-005-…`.
3. **Foco 1, `CV-NEW-DOCUMENTS`: arranque bloqueado** (síntoma registrado en TESTING, otra manifestación). `page.waitForFunction(() => studioProbe.project)` agotó los 90 s del caso. La traza de red muestra que **la última petición fue `editable.blocks.json`** (22:14:47Z) y que no hubo ninguna más (ni `project-catalog.json` ni el iframe del runner): la página se detuvo justo cuando `shell.js` crea el editor Blockly, antes de definir `studioProbe`. No hubo errores de consola registrados. Aislada: 14/14. No se modificaron timeouts ni reintentos. Traza: `focus-1-output/code-views-CV-NEW-DOCUMENT-…/trace.zip`. **Para la pista de investigación de arranque.**

## Límites

- **Sin puerta full** (la corre el coordinador). Tampoco se ejecutaron `test:quick`/`test:affected` ni las suites de la partición 0, que asumen los puertos por defecto.
- Rebote y tamaño necesitan el renderer: en Node se verifican bajada y texto; su efecto, en Chromium.
- La equivalencia de trazas se afirma para programas sin temporizadores; con deslizar o esperar, los fotogramas intermedios dependen del reloj (se compara el estado final).
- Las copias API v3 libres con `while` ceden ahora un fotograma por vuelta (antes agotaban el turno de 300 ms si no esperaban). API1/API2 no cambian.
- El proyecto inicial sin guardar sigue en 0.1.0: el estudiante recibe E1 por actividades, plantillas, selección de packs o «Actualizar packs». Cambiarlo es decisión del usuario.
- Una copia Scratch con decir, rebotar o detener sigue sin ejecutarse (importación congelada).
