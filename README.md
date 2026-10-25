# GuateGeeks Code Studio

Estado al 24 de octubre de 2026: el [rework visual](docs/product/VISUAL-REWORK-RESULTS.md) está implementado y su puerta completa aprobó 400 Node, 63 herramientas y 177 E2E. La evolución siguiente sigue el [plan de maduración por feature](docs/product/FEATURE-MATURATION-PLAN.md) y [ADR-011](docs/adr/011-contrato-de-lenguaje-y-vistas-sincronizadas.md), que aprueba vistas sincronizadas bloques↔texto y una API textual legible. La [línea base del repositorio](docs/engineering/REPO-BASELINE-RESULTS.md) se aplicó el mismo día: commit inicial `670ab20` con etiquetas `v0.1.0-alpha.1` y `e4-visual-rework`, 22 cambios archivados en `openspec/changes/archive/` y 26 especificaciones consolidadas en `openspec/specs/`. [Compatibilidad de proyectos y migraciones de packs](docs/engineering/PACK-VERSIONING-RESULTS.md) también está aplicada (puerta completa: 407 Node, 63 herramientas, 177 E2E). También están aplicados el [escalado de la puerta](docs/engineering/TEST-GATE-SCALING-RESULTS.md) (2 particiones: 200 E2E en 28 min) y la [API v3 legible para 2D](docs/engineering/API3-2D-RESULTS.md). Siguen en curso o propuestos y `block-language-contract` y `synced-code-views` (Ola 1). Los párrafos siguientes conservan su fecha y corte.

La [revisión transversal E4](docs/product/E4-CROSS-CONTEXT-REVIEW.md) examinó los seis contextos y documentó ocho hallazgos priorizados. El [brief del rework](docs/product/VISUAL-REWORK-BRIEF.md), el cambio `studio-visual-workspace-rework` y el [prompt para Claude Opus](docs/product/CLAUDE-OPUS-VISUAL-REWORK-PROMPT.md) están preparados; el rediseño no se ha implementado y sus 19 tareas siguen pendientes. La observación humana permanece separada. Las notas de cada integración que siguen conservan su fecha y corte.

La [integración web E4](docs/product/INTEGRATED-WEB-RESULTS.md) completa la extensión funcional del patrón integrado a los seis contextos: programa, resultado interactivo, transporte común y consulta. `studio-integrated-web-workspace` aprobó 400 Node, 63 herramientas y 168 E2E (3 smoke + 165 regresiones), 21 cambios OpenSpec y tres upstreams preservados. Continúan la revisión transversal, el rework visual y la aceptación humana/física.

La [integración 3D E4](docs/product/INTEGRATED-3D-RESULTS.md) reúne bloques o documentos JavaScript/Python independientes, resultado aislado, transporte común y consulta de objetos iniciales, GLB, código y exportación. El cambio `studio-integrated-3d-workspace` aprobó 400 Node, 63 herramientas y 164 E2E (3 smoke + 161 regresiones), 20 cambios OpenSpec y preservación de los tres upstreams. La composición web se registra arriba; aceptación humana/física y revisión transversal siguen pendientes.

La [integración Scratch importado E4](docs/product/INTEGRATED-SCRATCH-RESULTS.md) reúne original y cobertura de solo lectura, ejecución, resultado y consulta «Original y copia» siguiendo el patrón 2D/micro:bit. El cambio `studio-integrated-scratch-workspace` aprobó 400 Node, 63 herramientas y 160 E2E (3 smoke + 157 regresiones), 19 cambios OpenSpec y preservación de los tres upstreams. La copia editable es explícita y solo se habilita para cobertura completamente convertible; el original se conserva.

La [extensión integrada micro:bit de E4](docs/product/INTEGRATED-MICROBIT-RESULTS.md) reúne bloques o TypeScript independiente, simulación conjunta y consulta de firmware siguiendo el patrón 2D. El incremento `studio-integrated-microbit-workspace` aprobó 400 Node, 63 herramientas y 155 E2E (3 smoke + 152 regresiones), 18 cambios OpenSpec y preservación de los tres upstreams; simulación, HEX y prueba física conservan evidencias distintas.

El [primer editor 2D integrado E4](docs/product/INTEGRATED-2D-RESULTS.md) reúne programa, ejecución, escenario y consulta de herramientas. Su puerta completa en `studio-integrated-2d-editor` aprobó 400 Node, 63 herramientas y 151 E2E (3 smoke + 148 regresiones), 17 cambios OpenSpec y preservación upstream. Las extensiones micro:bit, Scratch importado, 3D y web se registran arriba; la revisión transversal, el rework visual y la validación docente conservan trabajo pendiente.

Las [actividades educativas E3](docs/product/EDUCATIONAL-ACTIVITIES-RESULTS.md) añaden objetivos, predicción, pistas graduadas, reflexión y un reto variante a las tres actividades. El software aprobó 400 Node, 63 herramientas y 147 E2E (3 smoke + 144 regresiones), 16 cambios OpenSpec y preservación upstream. Sus diez tareas técnicas están completas; la revisión docente y la comprensión observada siguen pendientes.

El [espacio de trabajo contextual E2](docs/product/CONTEXTUAL-WORKSPACE-RESULTS.md) organiza editor, resultado y ayuda en seis contextos, identifica el destino de las copias textuales y permite detener el resultado desde otro contexto. Su puerta completa aprobó 392 Node, 63 herramientas y 142 E2E (3 smoke + 139 regresiones), 15 cambios OpenSpec y preservación upstream. El cambio `studio-contextual-workspace` conserva sus diez tareas completas y evidencia propia.

El [primer recorrido para principiantes con docente](docs/product/FIRST-CREATION-RESULTS.md) incorpora entrada guiada, creación 2D protegida, herramientas avanzadas y continuidad local. La puerta E1 aprobó 390 Node, 63 herramientas y 136 E2E (3 smoke + 133 regresiones). Su evidencia y tareas viven en el cambio `studio-guided-first-creation`; la evidencia F0–F7 siguiente permanece histórica.

Repositorio del producto, versión alpha 0.1.0-alpha.1. Los cortes de software F0–F7 están implementados y consolidados: bloques Blockly, código derivado de solo lectura y diagnósticos por bloque, GGPROJ/autosave/recuperación, JavaScript/QuickJS y Python/Pyodide, actividades y offline, micro:bit, recursos/Scratch, [contextos 3D y apps web](docs/phase-6/RESULTS.md), [accesibilidad y distribución reproducible](docs/phase-7/RESULTS.md). La puerta conjunta F6+F7 aprobó 390 Node, 62 herramientas y 128 E2E (3 smoke + 125 regresiones), con 13 cambios OpenSpec válidos. Hardware físico, evaluación humana y aceptación escolar conservan evidencia pendiente.

El [corte de persistencia F1](docs/phase-1/RESULTS.md) añade descarga/apertura de proyectos y recuperación local conservando autoría, IDs, recursos y comportamiento. El [formato GGPROJ](docs/phase-1/GGPROJ.md) explica límites y confirmación de autosave. El [acta F0](docs/phase-0/CLOSEOUT.md) conserva la evidencia histórica del motor, corpus y rendimiento.

- [Resultados F1](docs/phase-1/RESULTS.md) y [evidencia actual](docs/phase-1/browser-evidence.json).
- [Resultados F0](docs/phase-0/RESULTS.md).
- [Recursos/Scratch F5](docs/phase-5/RESULTS.md), [contextos F6](docs/phase-6/RESULTS.md) y [accesibilidad/release F7](docs/phase-7/RESULTS.md).
- [Guía docente](docs/phase-7/TEACHER-GUIDE.md), [compatibilidad](docs/phase-7/COMPATIBILITY.md), [fuentes/reconstrucción](docs/release/BUILD.md) y [contribución](CONTRIBUTING.md).
- [ADRs](docs/adr/README.md) y [mediciones de estabilidad/rendimiento](docs/phase-0/performance-evidence.json).
- [Mapa de integración](docs/phase-0/INTEGRATION-MAP.md).
- [Procedencia y hashes](docs/phase-0/provenance.json).
- [Flujo de pruebas incremental](docs/engineering/TESTING.md) y [resultados](docs/engineering/TEST-WORKFLOW-RESULTS.md).
- [Prompt para la siguiente sesión](docs/engineering/NEXT-SESSION.md).
- [Cambio OpenSpec de herramientas](openspec/changes/archive/2026-10-24-incremental-test-workflow/proposal.md).
- Plan de producto: `docs/architecture/IMPLEMENTATION-PLAN.md` del workspace original (no publicado en este repositorio).

## Preparar el workspace

El producto resuelve sus repositorios hermanos en la carpeta padre. La disposición es `<workspace>/guategeeks-code-studio`, `<workspace>/xcratch-scratch-editor`, `<workspace>/pxt-microbit`, `<workspace>/.tools` y `<workspace>/scripts/env.sh`. Clona este repositorio dentro de una carpeta propia y prepara el resto desde fuentes públicas fijadas en `release/source-lock.json` (Linux x86_64, con git, curl, tar y sha256sum):

```bash
mkdir code-studio-workspace && cd code-studio-workspace
git clone https://github.com/GuateGeeks/code-studio.git guategeeks-code-studio
cd guategeeks-code-studio
bash tools/workspace/bootstrap.sh --browsers
```

El script descarga Node 22.23.4 con su suma de verificación y clona Xcratch y pxt-microbit en sus revisiones. A pxt-microbit le aplica el parche previo y su `package-lock.json` fijado. Además construye los módulos Scratch y el target micro:bit con `pxt serve`, descarga la fuente de PXT Core (212 MB) e instala las dependencias. Al final verifica árboles, precompilados y runtimes contra el lock. Los repositorios que ya existan solo se verifican; si están en otra revisión, el script se detiene. Los registros quedan en `artifacts/bootstrap/`. Detalle de procedencia en [fuentes y reconstrucción](docs/release/BUILD.md).

Sin workspace, `npm ci && npm run test:standalone` ejecuta las suites de Node que no cargan los repositorios hermanos (lista en `tools/test/standalone.mjs`). La CI (`.github/workflows/ci.yml`) corre ese job y otro que prepara el workspace con el script y ejecuta `npm run test:quick`.

## Ejecutar las pruebas

En Ubuntu/WSL, desde esta carpeta, con el workspace preparado:

```bash
source ../scripts/env.sh
set -o pipefail
npm test | tee artifacts/f1-integration.tap
npm run spec:validate
```

Para el desarrollo diario, después de preparar las dependencias:

```bash
npm run test:quick
npm run test:affected -- --files src/project-format.mjs --list
npm run test:affected -- --files src/project-format.mjs
npm run test:full
```

Quick ejecuta Node/herramientas y tres smoke de navegador. Affected selecciona el área modificada y explica su alcance; sin `--files` compara contenido con el último full exitoso, incluso sin commits. Full ejecuta la puerta completa y actualiza esa referencia solo al aprobar. El build es incremental por defecto. Consulta la [guía de pruebas](docs/engineering/TESTING.md) para reglas, reportes y reconstrucción forzada.

En el workspace original, `tools/f0/prepare.sh` instala Xcratch con su lockfile y `--ignore-scripts`, construye sus módulos SVG/render y conserva una línea base inicial; en un clon nuevo usa `tools/workspace/bootstrap.sh`. Las pruebas de compilación PXT resuelven los paquetes y los cachés de runtime desde los archivos locales de micro:bit.

Los tests requieren el target micro:bit ya preparado (lo hace el script de preparación). No ejecutan firmware en una placa. La suite `npm test` es headless; la suite de navegador siguiente verifica también el renderizado real.

## Runner y compilador en navegador

Desde Ubuntu/WSL con el entorno anterior preparado:

```bash
node node_modules/playwright/cli.js install chromium
npm run browser:build
npm run test:browser
```

Para ver el banco de prueba manualmente:

```bash
npm run browser:serve
```

La puerta completa requiere Chromium completo para comprobar zoom real mediante una extensión MV3 temporal sólo de pruebas. El headless shell basta para las suites que no usan esa extensión.

El servidor usa seis orígenes separados:

| Rol | Pruebas/default | Vista manual | Variable |
|---|---:|---:|---|
| Shell | 4173 | 4183 | GG_SHELL_PORT |
| Runner 2D | 4174 | 4184 | GG_RUNNER_PORT |
| Simulador | 4175 | 4185 | GG_SIMULATOR_PORT |
| Lenguajes | 4176 | 4186 | GG_LANGUAGE_PORT |
| Escena 3D | 4181 | 4191 | GG_SCENE3D_PORT |
| App web | 4182 | 4192 | GG_WEBAPP_PORT |

Para mantener una vista manual disponible sin ocupar los puertos de las pruebas:

```bash
GG_SHELL_PORT=4183 GG_RUNNER_PORT=4184 GG_SIMULATOR_PORT=4185 GG_LANGUAGE_PORT=4186 GG_SCENE3D_PORT=4191 GG_WEBAPP_PORT=4192 npm run browser:serve
```

Abrir http://127.0.0.1:4183/. Detener el servidor con Ctrl+C. Abrir un proyecto recupera autoría sin ejecutar; elegir el contexto y pulsar su control de ejecución. Las pruebas rechazan puertos ya ocupados.

El servidor entrega archivos estáticos y configuración. Los bloques 2D siguen Blockly→IR→adaptador; la fuente generada es una vista. QuickJS/Pyodide viven en un origen textual aislado y el simulador PXT conserva su política propia. Shell, runner 2D y renderers Babylon/DOM no evalúan texto libre del alumno. Cohort2 verifica seis roles y conserva lector/rollback de cohort1; [F3](docs/phase-3/RESULTS.md) registra la evidencia histórica de cuatro roles y [F6](docs/phase-6/RESULTS.md) la visita fría de seis con navegador cerrado y servidores detenidos. Capturas, diagnósticos y resultados locales viven en artifacts/.


Los ejemplos Sonido y espera y Detener sonidos requieren pulsar Reproducir sonido dentro del escenario, después de Ejecutar. Ese gesto activa Web Audio según las reglas del navegador; no se necesita micrófono. Contador y decisiones permite observar las ramas mediante el movimiento y probar espacio sobre el escenario.

El workspace Programa 2D permite editar valores y añadir bloques desde la toolbox. Ejecutar bloques envía IR validada al runner. Los controles GG mueven hero, cambian score y emiten boost sobre esa misma ejecución; Consultar escena muestra su estado. La [API GG experimental](docs/phase-0/BINDINGS-EDITOR-RESULTS.md) 2D está disponible como `window.GG`; cada referencia pertenece a una sesión y revisión. La API2 contextual deriva operaciones/grants del catálogo instalado y no concede DOM libre a Python.

La sección Tu proyecto permite nombrar, descargar un `.ggproj` ZIP y abrirlo desde otro contexto compatible. Los cambios de bloques, nombre y fuente micro:bit se agrupan durante 400 ms y se confirman en IndexedDB con respaldo de la revisión anterior. Espera **Guardado en este navegador** antes de cerrar: una edición aún pendiente no tiene garantía de recuperación. Al regresar se restaura autoría sin ejecutar; si la última copia está dañada se usa la anterior y se avisa. Si fallan ambas se conservan y puedes abrir un archivo o guardar una copia nueva explícitamente. Las copias locales pertenecen al origen/perfil del navegador; el archivo portable permite llevarlas a otro equipo.

La receta siguiente corresponde a la evidencia histórica del primer corte persistente. No regenerarla con reportes de cortes posteriores; código/consola usa `test:full` y su [evidencia propia](docs/phase-1/CODE-CONSOLE.md):

```bash
node tools/f0/verify-baseline.mjs
node tools/f1/evidence.mjs
```

Para reproducir aquel corte, guardar la salida completa de `npm test` en `artifacts/f1-integration.tap` antes de publicar su evidencia. Ese integrador histórico exige 44 pruebas Node y 33 E2E completos, sin fallos, omisiones ni reintentos. Conserva la evidencia histórica F0 por separado. El benchmark opcional se ejecuta con `node node_modules/playwright/cli.js test --config=playwright.performance.config.mjs`, en 4193/4194/4195 y sin otras suites simultáneas; no se atribuyen sus resultados históricos a este build ni se aprueba con ellos el equipo escolar.

Para repetir el spike de compilación y guardar los artefactos:

```bash
npm run probe:pxt
node tools/f0/verify-baseline.mjs
```

Los resultados locales quedan en `artifacts/`, incluidos el TAP, los parches de la línea base y los HEX. Esa carpeta está excluida de Git. El archivo de evidencia estable está en `docs/phase-0/`.

## CodeGraph

Se utiliza `@colbymchenry/codegraph@1.6.2`, con un índice por repositorio y uno del producto. Los presets versionados están en `config/codegraph/`.

```bash
bash tools/f0/index.sh
npm run analyze
npm run codegraph -- query --path ../xcratch-scratch-editor loadProject --json
npm run codegraph -- node --path ../.tools/pxt-core-source simpleCompileAsync
npm run codegraph -- status .
```

`index.sh` descarga la fuente PXT correspondiente al gitHead del paquete instalado, instala los presets como `codegraph.json` en cada repositorio y crea sus índices `.codegraph/`. Rechaza sobrescribir una configuración diferente. Ver [provenance.json](docs/phase-0/provenance.json) para revisión y hash de la fuente descargada. El índice es local; no se utiliza un servicio de embeddings ni se envía código a un servicio remoto.

Configuración MCP local para el Codex de Windows, ejecutada desde WSL:

```bash
node tools/configure-mcp.mjs --windows
npm run check:mcp
```

Para Codex dentro de Linux/WSL, omitir `--windows`. El archivo generado `.codex/config.toml` contiene rutas de esta máquina y no se versiona. Al abrir este repositorio como proyecto confiable, Codex puede cargar esa configuración; el catálogo de herramientas de una conversación ya iniciada no se da por actualizado automáticamente. La comprobación de esta entrega inicializó el servidor por stdio y recibió `codegraph_explore`.

El servidor usa `--no-watch` para evitar procesos de vigilancia permanentes durante esta fase; ejecutar `npm run codegraph -- sync <ruta>` tras cambios. [Referencia oficial de configuración MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).

## OpenSpec

Se utiliza `@fission-ai/openspec@1.14.3`, esquema `spec-driven`, artefactos en español y seis skills locales de Codex generadas por la herramienta. Se conserva la sintaxis estructural de requisitos y escenarios en inglés para su validación.

```bash
npm run openspec -- status --change incremental-test-workflow
npm run openspec -- instructions apply --change incremental-test-workflow --json
npm run spec:validate
```

Las invocaciones mediante los scripts npm desactivan telemetría de herramientas y la descarga automática de respaldo de CodeGraph. Los contratos documentan la intención; las pruebas y sus resultados determinan lo que efectivamente está demostrado.

## Contextos y transición a texto

Elegir Programa 2D, dispositivo micro:bit, escena 3D o app web. Los packs 3D/web se habilitan explícitamente desde el catálogo local; el pack básico 3D funciona sin sprites. Los recursos y documentos pertenecen a su contexto. El código JavaScript/Python generado conserva IDs de origen y es de solo lectura; Crear copia produce un documento textual independiente. Guardar/reabrir conserva ambas autorías sin sincronización implícita ni ejecución automática.

Babylon aporta primitivas, cámara, GLB estático acotado, jerarquía, luces y colisión cinemática. La app web usa componentes nativos etiquetados, formulario y lista; no interpreta HTML/CSS libre. Consultar [límites F6](docs/phase-6/RESULTS.md). La integración micro:bit incluye StaticTS, simulación, HEX V1/V2/universal y transferencia USB explícita; placa autónoma y USB físico siguen pendientes.

La exportación autónoma 3D/web descarga un ZIP con autoría inicial, runtime JS/Python elegido, recursos e inventario verificado. Extraer y seguir su README para servirlo con Node 22 por HTTP local; no se ejecuta mediante file://. release/index.html permite obtener fuente, licencia, avisos y SBOM sin Studio. Los cuatro paquetes se probaron con los servicios Studio detenidos y red limitada a sus tres orígenes.

La preparación offline, la recuperación y las actividades no requieren cuenta. La [guía docente](docs/phase-7/TEACHER-GUIDE.md) explica respaldo GGPROJ y preparación previa. La [matriz](docs/phase-7/COMPATIBILITY.md) separa la evidencia automatizada Chromium/WSL de lector humano, aula, dispositivos móviles físicos y rendimiento escolar.

La distribución propia usa AGPL-3.0-only, conserva licencias originales y publica fuentes deterministas con manifiesto externo, locks/parches y precompilados verificados. La [receta](docs/release/BUILD.md) explica la reproducción y sus límites; no afirma compilación C/C++/WASM desde cero ni un piloto o publicación pública ya realizados.
