# Plan: proyectos nuevos en el vocabulario actual y E2 · varios sprites

29 de octubre de 2026. Plan de ejecución del [plan de estabilización 2D](../../product/STABILIZATION-PLAN-2D.md), etapas E1 (cierre) y E2. Ejecutado por subagentes en el worktree `/home/adawolfs/projects/makecode/gcs-e2-multisprite` (rama `stab/e2-multisprite`, desde `a3f6585`).

**Spec:** `openspec/changes/scene2d-multi-sprite/` (proposal, design, specs `scene2d-objects`, tasks) para las tareas 2–9; `openspec/changes/scene2d-vocabulary-v2/` para la tarea 1. ADR-011 y `openspec/specs/` consolidadas como contratos vigentes.

## Global Constraints

- **Ubicación:** trabaja solo en `/home/adawolfs/projects/makecode/gcs-e2-multisprite`. No escribas en `/home/adawolfs/projects/makecode/guategeeks-code-studio` (allí corre una puerta full con archivos congelados) ni en otros worktrees `gcs-*`. `node_modules` es un symlink: no lo modifiques ni instales dependencias. No modifiques upstreams hermanos (`../xcratch-scratch-editor`, `../pxt-microbit`, `../raspberrypi-blockly`, `../.tools`).
- **Entorno:** `source ../scripts/env.sh && unset -f node npm npx` (Node v22.23.4).
- **Puertos (obligatorios en toda corrida de navegador):** `GG_SHELL_PORT=5700 GG_RUNNER_PORT=5701 GG_SIMULATOR_PORT=5702 GG_LANGUAGE_PORT=5703 GG_SCENE3D_PORT=5708 GG_WEBAPP_PORT=5709 GG_RELEASE_ROOT=$PWD/artifacts/stabilization-2d/e2-multisprite/releases`. Reportes: `GG_BROWSER_REPORT=artifacts/stabilization-2d/e2-multisprite/<nombre>.json GG_TEST_OUTPUT_DIR=artifacts/stabilization-2d/e2-multisprite/<nombre>-output npx playwright test <specs>`. Nunca uses 4173–4189, 4300 ni otros rangos.
- **Pruebas:** TDD (prueba que falla primero). Ejecuta `npm test`, `npm run test:tools`, `npm run spec:validate`, `npm run browser:build` (incremental) y specs de navegador focales que no estén en `defaultPortSuites` de `tools/test/partitions.mjs`. **No** ejecutes `test:full`, `test:quick` ni `test:affected` (los ejecuta el coordinador). Lista en tu informe las suites de partición 0 afectadas que no pudiste correr. Inventaria cada spec nueva en `tools/test/impact.mjs` y fija en `defaultPortSuites` las que nombren orígenes por defecto o arranquen servidores. Nunca debilites aserciones, timeouts ni reintentos para aprobar. Comprueba `uptime` antes de suites largas.
- **Invariantes del producto:** sin ejecución al abrir, editar, seleccionar objeto, cambiar de vista o recuperar; un único Detener; seis orígenes aislados (solo adaptadores conocen internals de Scratch; QuickJS/Pyodide y parsers solo en `src/targets/text`); GGPROJ v1–v5 y copias API1/API2 siguen abriéndose sin cambios; IDs de bloques, shadows, comentarios, posiciones y orden conservados; manifiestos publicados congelados por hash (`gg.sprites@0.1.0` `225d6c99…`, `@0.2.0` `70475dfa…`); migraciones declaradas, puras y probadas; offline sin red; sin cuentas ni telemetría.
- **Contextos congelados** (micro:bit, Scratch importado, 3D, web): sin funciones nuevas; solo mantenerlos funcionando.
- **Escritor único de la shell:** las tareas 6 y 8 pueden editar `src/studio/index.html`, `src/studio/style.css` y `src/studio/contextual-workspace.mjs` (ejecución secuencial en este worktree; el coordinador integra). El resto de tareas no los toca.
- **Interfaz:** sigue `DESIGN.md` y las skills `.agents/skills/gg-design-system`, `gg-ui-verification`, `gg-browser-first`; `gg-learning-experience` si tocas actividades. Copy en español para 10–12 años.
- **Commits:** en `stab/e2-multisprite`, mensajes en español terminados en una línea en blanco y `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Sin push, merge ni `git stash`.
- **OpenSpec:** marca una tarea solo con evidencia; registra decisiones nuevas en el `design.md` del cambio con fecha y razón. `npm run spec:validate` debe quedar válido.
- **CodeGraph** antes de cambiar fronteras: `npm run codegraph -- query --path . <símbolo> --json` (índice del worktree o, si falta, del checkout principal en solo lectura con `--path ../guategeeks-code-studio`). Guarda consultas útiles en `artifacts/stabilization-2d/e2-multisprite/codegraph/`.

## Rulings del coordinador (decisiones vinculantes para este plan)

- **R1 · Proyectos nuevos en la versión actual.** El usuario pidió continuar con la implementación recomendada: los proyectos **nuevos** (proyecto inicial sin guardar y «Crear mi primera escena») usan capacidades explícitas con la última versión de `gg.sprites`. Los proyectos guardados v1/v2 siguen abriendo idénticos en 0.1.0 y solo suben con «Actualizar packs». Cuando E2 publique 0.3.0, los nuevos crearán 0.3.0 sin otro cambio de código.
- **R2 · Vistas sincronizadas por objeto.** Bloques/JavaScript/Python muestran el programa **del objeto seleccionado**. Los eventos siguen en el nivel superior (`onStart(...)`). Las acciones de sprite se escriben sobre el identificador del objeto seleccionado (`cesta.move(10)`). Escribir acciones de **otro** objeto se rechaza con causa y línea, porque en Scratch cada objeto programa sus propios scripts. Cambiar de objeto con texto pendiente aplica la conversión como al volver a Bloques; si se rechaza, la selección no cambia y el texto se conserva.
- **R3 · Identificadores textuales.** Cada sprite tiene un identificador válido en JS y Python, derivado de su nombre y estable, sin colisión con palabras reservadas ni la API. Renombrar el sprite no cambia su `id` interno.
- **R4 · Biblioteca E4.** Los fondos y sprites de la biblioteca inicial (`src/contracts/starter-library.mjs`) se exponen ahora que existen varios objetos y fondos: añadir un sprite de la biblioteca como objeto nuevo y elegir fondos del escenario. Sin cambiar su contenido ni su licencia.
- **R5 · Fuera de alcance:** sensores, operadores y expresiones anidadas (E3); copia editable multi-sprite de SB3 (Scratch congelado); más de 8 sprites; capas y cámara.

## Task 1: proyectos nuevos con capacidades explícitas en la última versión

Cierra E1 para el piloto: hoy «Crear mi primera escena» y el proyecto inicial sin guardar resuelven a `gg.sprites@0.1.0` (`legacyPackVersions`), así que un estudiante nuevo no recibe el vocabulario E1.

- Haz que el proyecto inicial y «Crear mi primera escena» (`src/studio/entry-journey-ui.mjs`, `src/studio/project-ui.mjs`, `src/project-format.mjs`, `src/contracts/packs.mjs`) creen capacidades explícitas con `latestPackVersions` (hoy `gg.sprites@0.2.0`). Busca y cubre todos los caminos de «proyecto nuevo» (inicial, crear, restaurar ejemplo) sin tocar la apertura de archivos v1/v2 guardados.
- La caja de herramientas del proyecto nuevo ofrece el vocabulario E1 y las estructuras del núcleo (por siempre, repetir hasta, esperar hasta, detener).
- Ajusta las suites que asumen el formato inicial sin capacidades (p. ej. el inspector que exige `scene` en la exportación inicial) a la nueva verdad, sin debilitar lo que comprueban, y añade una prueba que demuestre: proyecto nuevo → 0.2.0 con vocabulario E1; archivo v1/v2 guardado → abre idéntico en 0.1.0; nada se ejecuta.
- Registra la decisión como tarea nueva en `openspec/changes/scene2d-vocabulary-v2/tasks.md` (con fecha 29/10/2026 y referencia a R1) y en su `design.md` (sustituye la «decisión pendiente» de su punto 5).

## Task 2: inventario de sprite único, `gg.sprites@0.3.0` y migración

Tareas 1.1 y 1.2 de `scene2d-multi-sprite`.

- Inventario con CodeGraph y búsqueda de supuestos de sprite único (`'hero'` literal, `projectInitialScene`, `resourceOwnerId`, target `hero`, `sprites[0]`, API v3, inspector, actividades, copia Scratch). Registra consumidores en `artifacts/stabilization-2d/e2-multisprite/inventory.md` y en el `design.md`.
- `gg.sprites@0.3.0`: configuración `{stage: {backdrop}, sprites: [{id, name, x, y, direction, size, visible, costume}]}` (1–8 sprites), manifiesto `apiVersion: 2` con su tabla, que conserva todo el vocabulario de 0.2.0. Migración `0.2.0 → 0.3.0` en el catálogo (cadena desde 0.1.0) que convierte `initialScene` en `sprites[0]` con id `hero` sin cambiar IDs ni comportamiento. Declara la compatibilidad de dependencias de los packs congelados (como `localPackCompatibility` hizo con 0.2.0).
- Pruebas de migración, validación (límites, nombres únicos, IDs estables) y ejecución equivalente de un proyecto migrado de un solo sprite.

## Task 3: GGPROJ `authoring.scene2d` e IR 2D v1 con `targetId`

Tareas 1.3 y 1.4 de `scene2d-multi-sprite`.

- `authoring.scene2d: {stage: <workspace>, sprites: {<id>: <workspace>}}` en una versión de formato coherente con la política del repo (GGPROJ v5 ya existe: decide si basta v5 con el nuevo campo bajo la capacidad 0.3.0 o hace falta v6, y regístralo). Lectores v1–v5 intactos; migración de `authoring.blockly` a `scene2d.sprites.hero` con los mismos IDs al actualizar a 0.3.0.
- IR 2D v1: scripts con `targetId` (sprite o escenario), validación, límites (8 sprites, scripts y nodos por objeto) y compatibilidad con IR0 para proyectos 0.1.0/0.2.0.
- Pruebas Node de formato, migración, lectura histórica y validación de la IR.

## Task 4: adaptador Scratch con un target por sprite

Tarea 2.1 de `scene2d-multi-sprite`.

- El adaptador crea un target VM por sprite con sus disfraces y sonidos (`ownerId`) y el escenario con sus fondos. Mensajes y variables globales compartidos (semántica Scratch). Stop detiene todos los objetos. La escena inicial respeta posición, dirección, tamaño, visibilidad y disfraz de cada sprite.
- Corpus de equivalencia multi-sprite (al menos dos sprites que se comunican por mensajes y una variable global), incluido un caso de Stop.
- Lecturas de escena (snapshot e inspector) con todos los sprites, conservando el contrato de un sprite para proyectos anteriores.

## Task 5: API v3 por objeto, traductores y vistas sincronizadas por objeto

Tarea 2.2 de `scene2d-multi-sprite`, con R2 y R3.

- Generador legible y traductores JS (QuickJS) y Python (Pyodide) con el mapa identificador → `targetId` en `runtime`; las acciones de sprite usan el identificador del objeto.
- Parser de vistas sincronizadas JS/Python por objeto (R2), conservando IDs y el comportamiento de rechazo, Deshacer y persistencia de `codeViews` (amplía su esquema si hace falta, con lectura de lo anterior).
- Copias independientes API3 de un proyecto multi-sprite: decide y documenta su forma; las copias API1/API2 anteriores no cambian.
- Pruebas de ida y vuelta por objeto y de rechazo de acciones sobre otro objeto.

## Task 6: panel de objetos y editor por objeto

Tarea 3.1 de `scene2d-multi-sprite`. Puede editar los archivos de escritor único de la shell.

- Panel de objetos al estilo Scratch (escenario + sprites): añadir, renombrar, duplicar, borrar con confirmación y seleccionar. «Editando: <nombre>» visible. Teclado con patrón APG y foco correcto. Seleccionar no ejecuta.
- Un único editor Blockly montado para el objeto seleccionado; los demás se conservan serializados sin perder borradores, Deshacer ni vistas pendientes.
- Verificación visual (`gg-ui-verification`): capturas desktop, 1280×720, estrecho 390 y zoom; sin desbordamiento global.

## Task 7: recursos, inspector, código derivado y actividades por objeto

Tarea 3.2 de `scene2d-multi-sprite`, con R4.

- Menús de recursos filtrados por el objeto seleccionado; la biblioteca inicial añade un sprite como objeto nuevo y ofrece fondos del escenario.
- Inspector y código derivado (consulta Código) por objeto.
- Actividades: los checks aceptan `targetId` opcional (por defecto `hero`); actividades, revisiones y progreso existentes intactos.

## Task 8: «ir a objeto», «fondo» y proyecto canónico «Diálogo»

Tarea 4.1 de `scene2d-multi-sprite` (incluye los bloques trasladados de E1). Puede editar los archivos de escritor único de la shell.

- Bloques «ir a objeto / posición aleatoria» y «cambiar fondo a … / siguiente fondo» en todas sus capas (tabla, IR, opcode revisado, generador, traductores, vistas sincronizadas, corpus).
- Proyecto canónico «Diálogo» (dos personajes, decir, mensajes, cambio de fondo) en `tests/fixtures/canonical/scene2d/` construible solo con bloques y menús; E2E de añadir objeto, ejecutar, Detener, guardar, reabrir en perfil nuevo y actualizar un proyecto 0.1.0 a 0.3.0.

## Task 9: documentación y estado de la tarea

Tarea 4.2 de `scene2d-multi-sprite` (salvo la puerta full, que ejecuta el coordinador).

- Acta `docs/engineering/SCENE2D-MULTI-SPRITE-RESULTS.md`: decisiones, comandos, conteos exactos, intentos fallidos, límites y la lista completa de suites (incluidas las de partición 0) para la puerta conjunta.
- Tareas OpenSpec marcadas solo con evidencia (4.2 queda abierta hasta la full). Actualiza `docs/phase-7/TEACHER-GUIDE.md` (varios objetos, fondos, biblioteca) y el guion de observación si cambia el recorrido.
