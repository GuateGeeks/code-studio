# Pruebas por impacto y build incremental

**22 de octubre de 2026 · Flujo de desarrollo de GuateGeeks Code Studio.**

Durante la edición se busca feedback corto del área modificada. Cada tarea se da por hecha con sus pruebas nuevas y la selección affected en verde; la puerta completa se sugiere por impacto ([criterio](#criterio-de-hecho-y-full-sugerida)). Los perfiles rápidos informan su alcance y no sustituyen esa puerta. La [entrega F1](../phase-1/RESULTS.md) conserva su corrida histórica de 44 Node y 33 E2E; sus tiempos no se presentan como mediciones de estas herramientas nuevas.

## Comandos

Desde Ubuntu/WSL, dentro del producto, con dependencias y target preparados según [README](../../README.md):

```bash
source ../scripts/env.sh
npm run test:quick
npm run test:affected -- --files src/project-format.mjs --list
npm run test:affected -- --files src/project-format.mjs
npm run test:full
```

| Perfil | Comprobación | Uso |
|---|---|---|
| `test:quick` | Node, pruebas de herramientas, build incremental y tres smoke Chromium | Feedback general breve durante edición |
| `test:affected` | Plan por impacto; Node/herramientas para código y E2E del área | Verificación del cambio concreto |
| `test:full` | Node/herramientas, build incremental, tres smoke previos y después la regresión funcional completa del inventario tests/browser (incluye inspector y lenguajes), OpenSpec y preservación upstream | Puerta completa, sugerida por impacto |
| Affected solo documental | Validación OpenSpec, sin build ni Chromium | Prosa y especificaciones |
| Affected sin cambios detectados | Plan vacío explicado, sin ejecutar pruebas | Confirmar que sigue vigente la referencia completa |

`--list` y `--dry-run` imprimen y guardan el plan sin ejecutar build ni pruebas. `--files` se admite en affected y declara explícitamente las rutas que quieres evaluar; no significa que se hayan detectado automáticamente todos los cambios del checkout. Admite rutas relativas al producto, absolutas WSL y UNC del workspace Ubuntu. Los argumentos desconocidos y rutas fuera de los roots admitidos fallan; los nombres de archivo no se interpretan como comandos de shell.

Para inspeccionar la selección sin esperar E2E:

```bash
npm run test:affected -- --files src/autosave-store.mjs --dry-run
npm run test:affected -- --files spikes/browser/shell/style.css --list
npm run test:affected -- --files docs/phase-1/GGPROJ.md --list
npm run test:affected -- --files package-lock.json --list
```

## Reglas de impacto

| Cambio | Selección conservadora |
|---|---|
| Formato/archivo/autosave y controlador de proyecto | Persistencia GGPROJ y recuperación |
| HTML/CSS del shell | Persistencia, bindings, audio, inspector, código/consola y lenguajes; incluye clic real y móvil |
| Editor Blockly, IR o traducción Scratch | Corpus 2D y persistencia relacionados |
| Bindings/cliente GG | Bindings y persistencia |
| Worker PXT o simulador | Compilación y simulación micro:bit |
| Documentos/target textual/protocolo de lenguajes | Intérpretes reales, persistencia textual, diagnósticos y Stop |
| Archivo de prueba | Su suite, con ampliación si también cambian fuentes compartidas |
| Runner/protocolo, servidor, build/selector, configuración, dependencias o upstream | Full |
| Ruta de código desconocida | Full |
| Solo documentación/especificaciones | Validación de especificaciones |

Las selecciones se unen cuando cambian varias áreas; el mayor alcance requerido prevalece. El plan muestra los motivos y comandos resultantes. Agregar una ruta nueva sin una regla no permite omitir pruebas: amplía la cobertura. Las reglas son mantenidas y verificadas mediante pruebas de herramientas; el mapa de CodeGraph complementa el análisis de fronteras, no sustituye la política conservadora.

## Referencia automática

Sin `--files`, affected compara contenido contra `artifacts/test-runs/baseline.json`, generado por el último full exitoso. El inventario incluye archivos nuevos y eliminados y no requiere HEAD ni commits previos. La primera ejecución, una referencia inválida o una configuración de referencia incompatible obligan a cobertura completa.

Solo full puede avanzar esa referencia, después de que todas sus comprobaciones finalizan con éxito. Quick/affected y un full fallido la conservan. Si el contenido cambia durante la corrida, no se certifican esas modificaciones posteriores mediante una referencia nueva. La herramienta vuelve a detectar el cambio pendiente. El inventario excluye dependencias generales, reportes, cachés y productos generados, pero incluye explícitamente los artefactos consumidos relevantes: bundles y recursos PXT, renderer, Scratch Storage con sus chunks y fuentes instaladas de audio/SVG, además de los locks. Un cambio de esos recursos instalados amplía la selección a full.

Esto permite trabajar con el checkout actual todavía sin commits. Git sigue siendo útil para revisión y versionado, pero no es una condición para que la selección detecte cambios reales. Una lista explícita `--files` es una ayuda de desarrollo; no certifica el conjunto, que lo cubre una full cuando el criterio la sugiere.

## Build incremental

```bash
npm run browser:build
npm run browser:build -- --force
npm run test:full -- --force-build
```

El build separa sincronización estática, fixtures/catálogo, recursos PXT, packs de lenguajes y compilación de VM, audio, editor y QuickJS/parser. Cada etapa compara contenido de entradas y dependencias transitivas, configuración/locks/toolchain relevantes y salidas generadas. Una etapa se reutiliza solo si sus salidas siguen presentes y conservan hashes. La antigüedad del archivo o el commit por sí solos no bastan.

Una edición HTML/CSS actualiza las copias estáticas sin reconstruir VM/audio/editor no afectados. Cambios del editor/IR, motores o paquetes invalidan sus etapas. Chunks, medios Blockly y recursos PXT también son salidas verificadas. Si desaparece o se corrompe una salida, se reconstruye; una etapa fallida no se registra como reutilizable. Las eliminaciones retiran solo las copias conocidas dentro del output generado.

`--force` omite reutilización para recuperar o comparar el build. `--force-build` transmite esa intención desde los perfiles. El reporte `artifacts/browser/build-report.json` identifica qué se ejecutó/reutilizó, motivos y tiempos. Los metadatos de caché son locales; no forman parte del proyecto del alumno ni sustituyen los artefactos reproducibles.

## Reportes y evidencia

| Artefacto | Alcance |
|---|---|
| `artifacts/test-runs/<perfil>-plan.json` | Archivos, motivos y comandos seleccionados |
| `artifacts/test-runs/<perfil>-results.json` | Resultado y duración del perfil ejecutado |
| `artifacts/test-runs/<perfil>-integration.tap` | Node del perfil |
| `artifacts/test-runs/<perfil>-tools.tap` | Pruebas de selección/caché |
| `artifacts/test-runs/quick-browser.json` | Smoke Chromium |
| `artifacts/test-runs/full-smoke-browser.json` | Tres smoke previos a la regresión full; si fallan, no se lanza la suite larga |
| Reporte propio affected | E2E seleccionados; separado de la regresión completa |
| `artifacts/browser-results.json` | Regresión funcional completa de full |
| `artifacts/test-runs/baseline.json` | Referencia de impacto después de full exitoso |
| `artifacts/browser/build-report.json` | Etapas y medición incremental |

El corte de código/consola amplía full a 42 casos E2E en dos reportes: tres smoke y 39 de regresión (incluidos seis casos nuevos). Las cifras 36/33 de la entrega del flujo de herramientas son históricas. Los reportes quick/affected no sobreescriben el resultado full. Ningún perfil regenera automáticamente `docs/phase-0/browser-evidence.json` o `docs/phase-1/browser-evidence.json`: esos documentos identifican entregas históricas con su propia receta y conteos. Una ejecución exitosa parcial se mantiene identificada como parcial.

## Estrategia de trabajo

1. Consultar el plan affected cuando el alcance no sea obvio.
2. Durante una corrección, ejecutar primero la prueba que la reproduce y el grupo afectado.
3. Al cambiar HTML/CSS, verificar controles reales y móvil además de la apariencia.
4. Ejecutar full cuando el [criterio](#criterio-de-hecho-y-full-sugerida) la sugiere, con fuentes estables. Si falla, reproducir el caso concreto y el grupo afectado antes de repetir full.
5. Después de una puerta aprobada, repetir suites amplias solo por cambios nuevos, fallos o inquietudes concretas pendientes. La prosa posterior requiere validación de especificaciones.

Las mediciones de rendimiento y ciclos prolongados permanecen separadas de otras suites simultáneas. El flujo no aumenta workers por defecto para audio ni cambia expectativas, timeouts o reintentos para obtener un aprobado. No promete una aceleración numérica hasta medir no-op, cambios representativos y perfiles completos en el entorno registrado.

## Validación de este cambio

La consolidación aprobó 44 Node, 23 pruebas de herramientas, tres smoke y 33 regresiones E2E. Los [resultados y mediciones](TEST-WORKFLOW-RESULTS.md) y la [evidencia estable](test-workflow-evidence.json) registran selección, reutilización/invalidez, reportes aislados y referencia de impacto. Son mediciones nuevas y no se infieren de los tiempos históricos de F1.


## F5: recursos y Scratch

El build añade una etapa webpack-assets con Pako2.1.0 fijado y copias locales shell/runner. El corpus propio de20SB3 identifica cobertura, SHA, licencia y comportamiento. Las pruebas de recursos incluyen píxeles PNG y muestras WAV reales, copia completa IR→Blockly, exportación desde autoría inicial y preservación del original. Compatibilidad VM y editabilidad son resultados distintos.

La segunda visita fría también importa/decodifica un SB3 con PNG mediante el worker preparado, ejecuta, exporta/reabre GGPROJ y vuelve a ejecutar sin HTTP. Los reportes de pruebas focales conservan su alcance; los conteos consolidados se registran en docs/phase-5/RESULTS.md.

## F3: prueba offline con cierre real

La regresión incluye packs/lecciones y una prueba offline con perfil Chromium persistente y servidor propio. Desde el 29/10/2026 sus cuatro puertos se derivan de la base configurada (+50 sobre el puerto del shell; con la base 4173, 4223–4226), no son 4177–4180 fijos como en esta entrega. No ocupa los puertos normales ni los manuales o de rendimiento. La prueba cierra todos los procesos que ella crea, reinicia Chromium y verifica que los cuatro servidores estén apagados antes de la segunda visita. Los snapshots y copias de build de prueba quedan en artifacts; no modifica fuentes para fabricar la actualización.

## Pruebas F7 de zoom y distribución

El recorrido de zoom usa Chromium completo del paquete Playwright (channel chromium), no sólo chromium-headless-shell. Prepararlo con npx playwright install chromium. La extensión MV3 propia tests/fixtures/browser-zoom se carga únicamente en perfiles temporales de prueba con permisos localhost; no se instala en el perfil del usuario ni forma parte del runtime/exportación. Se comprueban chrome.tabs.setZoom/getZoom a 200/400 %, sin sustituir zoom por DPR o CSS.

Las pruebas nuevas viven en accessibility-runner, accessibility-shell y accessibility-zoom. La exportación comprueba también las seis piezas de fuente/avisos en las cuatro combinaciones 3D/web × JavaScript/Python. Ejecutar casos concretos antes de ampliar a grupos.

La medida local F7 usa npx playwright test --config=playwright.release-performance.config.mjs y escribe artifacts/f7-performance-*.json. No ejecutar el publicador histórico F0 para documentar F7. Medir sin otras cargas de navegador/build concurrentes; los heaps por target y los draws WebGL no equivalen a RAM total o rendimiento escolar.

La reproducción manual usa node tools/release/reproduce.mjs [NUEVA_CARPETA]. Restaura dos árboles de fuente y reutiliza las dependencias instaladas mediante hardlinks en directorios distintos, recompila SVG/render y el producto y compara payload/cohort con iguales orígenes. Rechaza destinos existentes y rutas locales emitidas. No demuestra instalación desconectada de dependencias ni recompilación nativa C++/WASM.

## Criterio de hecho y full sugerida

Rige desde el 29/10/2026 y sustituye a «full al cerrar cada tarea».

- **Hecho, por tarea:** las pruebas nuevas específicas de la tarea y la selección de `test:affected` en verde. Nada más es obligatorio.
- **La full se sugiere, no se exige.** Se propone al usuario cuando `test:affected --list` da `selection: full`, cuando cambian runner, servidor, build o configuración, y antes de entregar el piloto a un docente. Decide el usuario.
- **Particiones:** la full reparte por defecto en 2 con memoria y carga suficientes (`--partitions auto`); en otro caso corre en serie.
- **Cualquier agente puede ejecutar su selección affected completa en su propio worktree**, con su propia base de puertos separada de las demás en 100 (p. ej. `GG_SHELL_PORT=5700` o `5800`, con los seis orígenes de `tests/browser/origins.mjs` en esa centena). Las pruebas no fijan puertos, así que ya no compiten por 4173.
- **Carga:** no ejecutes suites mientras corre una full. Como máximo 2–3 corridas de navegador simultáneas, según `uptime` (la política medida está en las particiones, abajo).
- **Suites exclusivas:** nunca ejecutes una `exclusiveSuite` (`standalone-contexts`) en dos corridas a la vez, p. ej. en dos worktrees.

## Particiones paralelas (test-gate-scaling, 24/10/2026)

`npm run test:full -- --partitions N` (o `GG_TEST_PARTITIONS=N`) reparte la puerta de navegador en N procesos de Playwright aislados. Sin la opción, la full usa `--partitions auto` (véase abajo); `--partitions 1` la fuerza en serie.

- **Partición 0** conserva los puertos por defecto (base 4173). Ninguna suite depende ya de ellos: `defaultPortSuites` (`tools/test/partitions.mjs`) está vacío y las suites leen sus orígenes de `tests/browser/origins.mjs`. Lo único que fija la partición 0 son las `exclusiveSuites` (hoy `standalone-contexts`, cuyos 4211–4213 fija el formato de exportación).
- **Partición *i* ≥ 1** usa 4400 + 100·*i* como base de los seis orígenes; los servidores propios de las suites se derivan de esa base (offline +50, pilot +60, standalone +70), dentro de su centena. Tiene además su propio `GG_RELEASE_ROOT`, carpeta de resultados, informe JSON (`artifacts/test-runs/partitions/p<i>-browser.json`) y evidencia.
- **Reparto:** el resto de suites se reparte por duración histórica, tomada del informe canónico `artifacts/browser-results.json` o, si falta, de los últimos informes de particiones (LPT).
- **Cobertura:** una puerta completa particionada incluye siempre todos los `tests/browser/*.spec.mjs` del disco. `test:tools` falla si un archivo no está en `normalBrowserFiles` o si un spec o helper de `tests/browser` o `tests/quick` contiene un literal de puerto (salvo los de `standalone-contexts`).
- **Referencia de impacto:** avanza solo si todas las particiones aprueban y las fuentes no cambian durante la corrida.
- **`--partitions auto`** (valor por defecto de la full; también `GG_TEST_PARTITIONS=auto|N`) usa 2 particiones si hay al menos 6 GB de `MemAvailable` y la carga es menor que 8; si no, ejecuta en serie. Es la política medida en esta máquina compartida: con 3 particiones la memoria disponible bajó a 0,7 GB, la carga llegó a 36 y fallaron cuatro pruebas con presupuesto de tiempo.
- **No ejecutes `playwright test --list` sin `--reporter=list`:** usa el reporter JSON de la configuración y sobrescribe el informe canónico de duraciones.

### Impacto por contexto

`test:affected` clasifica los módulos propios de cada contexto en grupos con sus suites (`contextGroups` en `tools/test/impact.mjs`):

- `project-compatibility`
- `scene3d`
- `webapp`
- `capability` (compartido por 3D y web)
- `microbit`
- `scratch-import`
- `canonical` (fixtures en `tests/fixtures/canonical/`)

Lo desconocido sigue yendo a la puerta completa.

### Lecturas durante una ejecución

Dentro de `expect.poll`, las lecturas de la escena usan `settled(snapshot, page)` (`tests/browser/workspace-controls.mjs`). Reintenta solo «Session stopped», que aparece por diseño cuando la propia ejecución de la prueba reinicia la sesión. Cualquier otro error, y el valor que se comprueba, no cambian.

### Proyectos canónicos

`tests/fixtures/canonical/<contexto>/<proyecto>/{project.json, expect.json}` y `tests/browser/canonical-projects.spec.mjs`. El ejecutor comprueba tres cosas: que abrir no ejecuta, que «Ejecutar» alcanza el estado final declarado y que «Detener» devuelve el estado inicial. Formato en `tests/fixtures/canonical/README.md`.

## Fallos intermitentes conocidos

Registro iniciado el 29/10/2026 para no perder lo aprendido entre sesiones. Una entrada aquí **no** autoriza a ignorar un fallo: la puerta sigue fallida hasta que una full apruebe con fuentes estables.

### Arranque bloqueado: `#run-editor` no se habilita (mecanismo demostrado y corregido el 29/10/2026)

| Fecha | Corrida | Caso | Duración del caso | Resolución |
|---|---|---|---|---|
| 25/10/2026 | `block-language-contract`, full intento 1 | `E4-02` (`workspace-presentation`) | 2,1 min | Spec aislada 14/14; la full siguiente aprobó |
| 29/10/2026 | Estabilización 2D E0, full intento 1 | `GG-F7-SHELL … (mobile)` (`accessibility-shell`) | 2,1 min | Spec aislada 12/12 en dos corridas; repetición de la full interrumpida a petición del usuario |
| 29/10/2026 | Pista E4, lote focal A (código sin la corrección) | `accessibility-runner` | ~120 s de espera | Aislada 7/7; errores de `AudioContext` en la traza |
| 29/10/2026 | Pista E4, lote focal B (código sin la corrección) | `packs-lessons` (mobile) | ~130 s de espera | Aislada 9/9; errores de `AudioContext` en la traza |

- **Síntoma:** la espera inicial `expect('#run-editor').toBeEnabled()` (15 s) falla con el botón deshabilitado. En la traza del 29/10 esa espera de 15 s tardó **123 s** en devolver el error: la página dejó de responder a Playwright, no solo tardó. La traza muestra además `The AudioContext encountered an error from the audio device or the WebAudio renderer`. Las otras 238 regresiones aprobaron.
- **Lo que no se sabía antes del 29/10 (se conserva como historial):** ninguna sesión había determinado la causa. Las actas lo atribuyen a «carga compartida»; es una hipótesis. La carga en el momento exacto del fallo no se registró (≈4–5 al comprobar después). Que las dos ocurrencias duren ~2,1 min sugiere un bloqueo con duración propia más que lentitud. Si el estudio puede quedar bloqueado al arrancar en un portátil escolar, es un riesgo del piloto, no solo ruido de pruebas; véase la lista de defectos del [plan de estabilización 2D](../product/STABILIZATION-PLAN-2D.md).
- **Manejo vigente:** conservar el reporte del intento; reproducir el caso y su spec aislados; no cambiar timeouts, reintentos ni expectativas; repetir la full con las fuentes congeladas.
- **Evidencia:** `artifacts/block-language-contract/verification-20261025/full-attempt-1/` y `artifacts/stabilization-2d/e0-20261029/full-attempt-1/` (traza incluida).
- **Causa (29/10/2026, [STARTUP-HANG-INVESTIGATION](STARTUP-HANG-INVESTIGATION.md)):** Blockly 13 crea un `AudioContext` por espacio de trabajo aunque el editor use `sounds: false`, así que el estudio construía 12 al arrancar. En Chromium cada `new AudioContext()` es síncrono contra el servicio de audio. Si el servidor de audio (en WSL, el PulseAudio de WSLg) está conectado pero no responde, cada constructor bloquea el hilo principal 20 s. Con un proxy que congela PulseAudio a mitad de la corrida, `accessibility-shell.spec.mjs:93 (mobile)` falla con la misma firma: espera de 120,2 s, caso de 2,1 min y cinco errores de `AudioContext`. Los editores ahora difieren el contexto real hasta el primer sonido, tras un gesto. Con el mismo bloqueo, el caso aprueba y Ejecutar se habilita en 256 ms. La carga de CPU sola no lo reproduce: 36/36 con dos núcleos ocupados. Un monitor del audio real registró un bloqueo espontáneo de WSLg de ~2,4 min con los mismos 20 s por constructor, 13 s después de un cambio de pantallas de Windows en Weston. Dentro de una full no se ha observado: se infiere de la firma.
- **Manejo desde la corrección:** si reaparece un caso de 2 min, buscar errores de `AudioContext` en la traza y anotar la latencia de audio (`artifacts/stabilization-2d/startup-hang/experiments/audio-probe.mjs`, copiado al checkout principal; no versionado). Un pitido de teclado o un sonido Scratch con el audio colgado todavía puede bloquear unos 20 s.

### Familia relacionada: un caso ajeno falla por corrida bajo carga

**`CV-VIEWS-005` (29/10/2026, full conjunta intento 1 y foco de E1): carrera de la prueba, corregida.** Desde una vista de texto, Ejecutar convierte primero (Python tarda más bajo carga) y `#status` conserva mientras tanto el «Bloques ejecutados» de la ejecución anterior. El helper `run` aceptaba ese texto viejo y leía la escena durante su reemplazo: `GG scene loading`, que `settled` no reintenta. Lo demostró la traza (`toHaveText` aprobó a los 65 ms; después `Session stopped` y `GG scene loading`). La prueba ahora espera la sesión nueva de su propia ejecución antes del estado. Es más estricta, no más laxa: 42/42 en tres corridas con carga ~7. Evidencia en `artifacts/stabilization-2d/joint-20261029/`.

[TEST-GATE-SCALING-RESULTS](TEST-GATE-SCALING-RESULTS.md) (24/10) registró 4 de 6 fulls fallidas por un solo caso (`GG-OFFLINE`, `GG-SB3-005`, `GG-ASSET-003` con otra sesión al 480 % de CPU) y la aprobación solo con las demás sesiones en pausa. La fase API3 terminó 199/200 por `GG-COPY-002 audioStop` (6/6 al repetir). De ahí la regla de iniciar la full con carga media de cinco minutos menor de 6 y no ejecutar suites simultáneas.

### Arranque lento del servidor propio de `offline-recovery` bajo carga

Con carga ≈16 (29/10/2026, comprobación de dos bases a la vez) `offline-recovery` falló una vez: su servidor propio tiene un presupuesto de arranque de 20 s y no llegó a tiempo. Se registra sin cambiar presupuestos ni reintentos. Manejo: repetir la suite aislada con la carga bajo control (`uptime`) y respetar el límite de corridas simultáneas del [criterio](#criterio-de-hecho-y-full-sugerida).

### Puertos ocupados por otros proyectos

El 29/10/2026, 4173–4175 los ocupaban servidores `node` de Windows del proyecto `arduino-3d` lanzados desde Codex. Con red WSL en espejo, `ss` dentro de WSL no los muestra: `curl` responde y `Get-NetTCPConnection` desde `powershell.exe` identifica el PID y su línea de comandos. Hasta ese día el smoke (`tests/quick/studio.spec.mjs`) y las suites de la partición 0 asumían esos orígenes y no podían correr en otros puertos; desde la independencia del puerto sí pueden (`GG_SHELL_PORT` y demás). Se detuvieron solo con autorización del usuario.
