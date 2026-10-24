# F7 · Accesibilidad y distribución

Estado: **software F7 consolidado por la puerta conjunta F6+F7**. Fecha del resultado final: **22 de octubre de 2026**. La referencia completa avanzó después de comprobar estabilidad de fuentes durante la puerta.

El cambio OpenSpec `phase-7-accessibility-release` se definió y validó antes de implementar, con 13 cambios válidos. Consolida acceso por teclado y foco, activación semántica del escenario, zoom real, materiales de distribución, reproducción desde fuentes y medidas locales. Conserva autoría GGPROJ, autosave/recuperación y aislamiento de runtimes. Los resultados focales siguientes no sustituyen `test:full`.

## Accesibilidad implementada

El canvas consume sólo las teclas que corresponden al programa. Tab, Escape y atajos del navegador permiten salir; blur y Stop liberan teclas y puntero retenidos. Los controles semánticos del runner seleccionan y activan el objeto real, incluidos clones y Stage importado. Ejecutan los mismos hats nativos que el puntero. Capturan bundle/revisión y se revocan al detener; no crean una nueva API pública ni conceden autoridad desde el proyecto.

El shell conserva foco lógico y selección de texto al aplicar propiedades, mantiene editable el borrador inválido y activa el contexto al que pertenece un diagnóstico. Los enlaces de salto, la consola con nombre y anuncios y la ayuda española complementan el teclado nativo de Blockly 13.4. La prueba crea y conecta bloques, edita campos, cancela movimiento, borra, deshace y guarda usando teclas reales. No se sustituye esa historia por inyección de un graph.

El zoom usa `chrome.tabs.setZoom/getZoom` desde una extensión MV3 propia, sólo en perfiles Chromium temporales con permisos localhost. Verifica factores 200 % y 400 %, dimensiones reales, controles visibles, ausencia de scroll horizontal global y conservación de foco/caret. Restaura 100 % y elimina el perfil al terminar. CSS zoom, DPR y emulación de viewport no son sustitutos del factor real del navegador. La extensión no se incluye como runtime del producto, de su preparación offline o de las aplicaciones exportadas; su código de prueba puede acompañar la fuente.

## Distribución y fuente correspondiente

El producto usa AGPL-3.0-only y conserva los textos y procedencia de cada componente. La licencia propia no atribuye automáticamente esa licencia a medios o proyectos de alumnos. El inventario conserva declaraciones originales incompletas sin inventar variantes SPDX ni afirmar una auditoría jurídica.

La etapa de release genera exactamente seis materiales locales: `index.html`, `source.tar.gz`, `source-manifest.json`, `LICENSE`, `THIRD_PARTY_NOTICES.txt` y `SBOM.json`. El manifiesto externo identifica cada entrada interior por ruta, tamaño, SHA-256 y clase; también registra toolchain, repositorios, locks, parches, precompilados y limitaciones. No está dentro del tar, evitando un ciclo de hashes.

La fuente utiliza lista explícita, orden y metadatos tar/gzip deterministas, incluso sin HEAD propio del producto. Contiene código propio y fuentes seleccionadas de los repositorios necesarios, sus locks/licencias y el parche micro:bit previo. Conserva precompilados PXT verificados y sus recetas. Excluye perfiles, credenciales, proyectos personales, .git, cachés e inclusión indiscriminada de node_modules. La restauración valida todo antes de escribir en un directorio nuevo; no ejecuta código extraído ni sobrescribe un destino existente.

| Material de fuente | Límite |
|---|---|
| Archivo comprimido | 64 MiB |
| Tar expandido, incluidos headers/padding | 256 MiB |
| Entrada interior | 32 MiB |
| Inventario | 30 000 entradas, rutas ASCII seguras de hasta 240 bytes |
| JSON de metadatos | 8 MiB |

Se rechazan rutas absolutas/traversal, duplicados, enlaces, headers no canónicos y bytes/inventarios inconsistentes. El navegador valida esquema cerrado y bytes/SHA del archivo sin descomprimir tar; las herramientas de restauración verifican también su contenido interior con cuotas.

Los seis materiales viajan autenticados desde el role manifest del mismo cohort. Cada ZIP autónomo los coloca bajo `release/` una sola vez y permite acceder a fuente/licencia sin Studio. El archivo fuente no se duplica como template y payload. El servidor exportado mantiene rutas/inventario cerrados, CSP y máximo ZIP de 128 MiB/archivo de 64 MiB. No admite módulos o URLs elegidos por el proyecto como autoridad.

El SBOM es un inventario conservador de instalaciones, incluidas dependencias anidadas y de herramientas/desarrollo, con un cierre de runtime declarado. No equivale a una lista exacta de módulos ejecutados o incluidos por webpack. Los avisos Scratch, pako, fuentes, CPython/Pyodide y demás componentes conservan sus originales; declaraciones como BSD sin variante se señalan como limitación. La receta y procedencia están en [BUILD](../release/BUILD.md) y `release/source-lock.json`.

No se afirma reconstrucción DAL/CODAL C++ ni QuickJS/Pyodide WASM desde C. Esos insumos se fijan como precompilados con versiones/integridad y fuentes disponibles del alcance declarado. No se editaron node_modules ni se limpiaron los repositorios upstream para producir la distribución.

## Reproducción desde dos raíces

`artifacts/f7-reproducibility-consolidated/result.json` registra los cuatro indicadores en true:

- samePayloads: igualdad de los payloads de dos raíces.
- sameCohort: igualdad del cohort para los mismos orígenes.
- sameManifest: igualdad del manifiesto de release.
- sameDistributedPayload: igualdad frente al payload distribuido de referencia, sin diferencias.

El método extrae dos directorios de fuentes reales independientes. Reutiliza dependencias instaladas fijadas como hardlinks en árboles de paquetes distintos; reconstruye SVG/render nativos y todas las etapas del navegador. Usa Node 22.23.4, npm 10.9.9, Linux x64 y los mismos seis orígenes. Los diagnósticos de tiempos/caché/rutas no se comparan como payload ejecutable. El código emitido no conserva rutas locales file:///home/... del build.

La reutilización se declara expresamente: no es npm ci desde cero, instalación offline de dependencias, máquina fría ni reconstrucción C/WASM/C++ completa. La receta explica cómo preparar los paquetes fijados; no incluye Node ni una copia indiscriminada de su pool instalado.

Los resultados corresponden a la referencia congelada que identifica el JSON. Una actualización documental posterior cambia insumos de la siguiente generación de fuente; el manifiesto calculado, no un hash incrustado en este documento, identifica cada distribución. Al generar una distribución posterior deben verificarse otra vez materiales/inventario de esa generación, sin atribuirle automáticamente los bytes de la referencia anterior.

## Evidencia focal de accesibilidad y distribución

Los grupos se solapan y se ejecutaron durante el desarrollo. No sumar sus conteos como una puerta completa.

| Artefacto dentro de artifacts/ | Resultado y alcance |
|---|---|
| `f7-shell-browser.log` | 6/6 en 42,0 s: teclado Blockly real, propiedades/foco/caret, borradores inválidos, enlaces de salto y diagnóstico en escritorio/móvil |
| `f7-runner-final-group.log` | 7/7 en 1,3 min: puntero fuera del centro, control semántico, teclado sin trampa, clones, JS/Python independientes, Stage importado y simulador conjunto |
| `f7-zoom-fixed.log` | Desktop 1/1 en 14,0 s antes de fallar móvil; ese grupo no se presenta como 2/2 aprobado |
| `f7-zoom-mobile-inspector.log` | Móvil corregido 1/1 en 15,8 s; grupo 23,3 s |
| `f7-zoom-fixed-results/.../real-zoom-evidence.json` | Desktop: factor verificado 2/4, layout de 640/320 px, scrollWidth igual a innerWidth, CSS zoom 1 y restauración 1 |
| `f7-zoom-mobile-inspector-results/.../real-zoom-evidence.json` | Móvil: factor verificado 2/4, layout de 195/97 px, sin overflow global, caret conservado y restauración 1 |
| `f7-release-tools-focused.tap` | 10/10 en 15,55 s: archivo determinista, tar/rutas/cuotas, restauración, fuentes/licencias y precompilados |
| `f7-release-nested-inputs.tap` | 1/1: inventario nested y rechazo de escapes del lock |
| `f7-release-secret-paths.tap` | 6/6: rechazo de nombres de credenciales antes de leer y exclusión de directorios SSH |
| `f7-export-materials-focused.tap` | 23/23 en 2,11 s: contrato, templates, paquete/servidor, inventario e integridad de materiales |
| `f7-reproducibility-consolidated/result.json` | Cuatro indicadores de igualdad true; método y límites registrados |
| `f7-export-focal.log` / `f7-export-focal.json` | 1/1, test de 60,9 s: cuatro ZIP reales, fuera del workspace, Studio detenido y red limitada a sus tres orígenes |

El focal de exportación descarga las combinaciones escena3d/webapp y JavaScript/Python, abre cada carpeta exportada con su servidor local, ejecuta esfera/formulario/lista, comprueba Stop y sigue el enlace local de fuente. Valida manifiesto, licencia, avisos, SBOM y bytes/hash de la descarga. Las cuatro ejecuciones registran cero peticiones prohibidas. Su evidencia detallada está en `f7-export-focal-results/.../standalone-evidence.json`; las identidades de archivo se consultan ahí, sin repetirlas como identidad final en este documento.

Los fallos de desarrollo de zoom se conservaron y guiaron correcciones de overflow real de controles/inspector a 400 %. No se ocultaron con CSS zoom, reducción de factor ni emulación de DPR. El primer intento necesitó instalar Chromium completo: el headless shell por sí solo no ofrece este flujo MV3.

## Referencia congelada y cierre documental

La [evidencia estructurada](software-evidence.json) conserva tiempos, conteos, medidas locales y la identidad del archivo fuente que probó la puerta. Los reportes aprobados se archivaron en artifacts/cuts/phase-7-accessibility-release/approved-full/ con SHA256SUMS; el paquete congelado está separado en frozen-full-materials/. Los fallos históricos no se sobrescribieron.

La corrección final del matcher fue el único cambio entre la reconstrucción independiente original y la referencia de full. Se aplicó ese delta permitido a ambas raíces reales y se repitió su build incremental: artifacts/f7-repro-refresh-harness/result.json confirma igualdad de los 989 archivos, cohort y manifiesto frente a la distribución.

Después de full sólo cambian actas, guías, evidencia JSON y tareas OpenSpec. El paquete se actualiza con esos documentos y se verifica el delta contra la referencia congelada y las dos raíces ya reconstruidas. El [reporte posterior](../../artifacts/f7-repro-refresh-docs/result.json) identifica el archivo vigente; su manifiesto externo es la autoridad para hash y tamaño. La comprobación rechaza cambios fuera de documentos y exige que el payload distinto se limite a materiales de release. No se repite full por este cierre documental.

## Medidas locales

El grupo `artifacts/f7-performance-final.log` aprobó **4/4 en 1,1 min**. Los JSON de startup, stability, sprites y event-latency registran muestras y método.

Entorno observado: Chromium 156.0.8078.4 headless, Node 22.23.4, Linux WSL2 x64, AMD Ryzen 7 3700X y WebGL con SwiftShader. No es el perfil escolar acordado.

| Medida | Muestras / resultado |
|---|---|
| Arranque de contexto nuevo | 3 muestras; mediana 409,1 ms, máximo 427,8 ms |
| Recarga del mismo contexto | 3 muestras; mediana 417,6 ms, máximo 438,4 ms |
| Feedback visible de Stop | 10 ciclos; mediana 4,2 ms, máximo 6,1 ms |
| Retirada del iframe anterior | 10 ciclos; mediana 9,5 ms, máximo 11,7 ms |
| Runner nuevo listo | 10 ciclos; mediana 780,0 ms, máximo 850,5 ms |
| 100 sprites | 3 muestras de aproximadamente 2 s; mediana de 62,50 draws completados/s |
| Tecla hasta estado observado | 10 muestras; mediana 53,61 ms, máximo 89,21 ms |

Arranque mide desde navegación hasta Run renderizado habilitado y autoría lista. Usa tres contextos nuevos dentro del mismo proceso de navegador y sus recargas con Cache-Control:no-store: no equivale a OS/proceso frío ni caché offline/producción.

Los diez ciclos preservaron autoría editada, detuvieron señal de audio observada y cerraron todos los workers previos, incluidos los de storage. Tras Stop quedó un runner nuevo con el worker base de storage observado, cero loop/compiler workers, cero threads VM y sin contexto de audio nuevo. La prueba registra identidades/eventos de cierre; no cuenta un worker ajeno para disimular otro que continúe activo. Diez ciclos finitos no prueban ausencia de todas las fugas.

La carga de 100 sprites usa 1 original y 99 clones nativos, reposiciona los targets antes de cada draw y confirma WebGL completado con gl.finish. Mide throughput de esa carga fija; no es FPS del compositor ni rendimiento de un programa arbitrario. Superar localmente 30 draws/s no aprueba 30 FPS en una escuela.

Los heaps son métricas CDP por target/isolate después de GC. Pueden compartir isolate y no deben sumarse como RAM total. Excluyen workers, WASM, GPU/WebGL, audio nativo y RSS del navegador/sistema. Los bytes de los seis árboles y bundles están en `f7-performance-startup.json`: son bytes crudos de la generación medida, no transferencia gzip/brotli ni tamaño final garantizado. La latencia de tecla incluye automatización, scheduler, MessagePort y polling de observación; no es latencia de display ni tiempo interno de VM.

## Intento completo fallido por matcher legado

La primera puerta conjunta F6+F7 aprobó 390 Node, 62 herramientas, 3 smoke y 81 regresiones antes de fallar `project-persistence.spec.mjs:343`. **La puerta falló y no avanzó la referencia de impacto.**

El harness esperaba e intentaba demorar runnerOrigin + '/?session=...', mientras el iframe legítimo navegaba a /releases/<cohort>/?session=.... Su waitForRequest nunca se resolvía. Se reprodujo sin cambios en `f7-recovery-repro.log`; luego se corrigió sólo el matcher para el releaseBase activo, conservando origen, navegación y sesión. El caso concreto posterior pasó 1/1 en 8,4 s (`f7-recovery-fixed.log`). El grupo completo posterior aprobó **8/8 en 1,0 min** (`artifacts/f7-persistence-fixed.log`). La auditoría estática completa de URLs browser/quick está en `f7-url-audit.md`.

Los reportes/traces del intento están en `artifacts/cuts/phase-7-accessibility-release/failed-legacy-runner-route/`. Este apartado registra una corrección de harness y un focal aprobado; no convierte el intento fallido en una puerta aprobada. Los tres intentos anteriores de F6 siguen descritos en su [acta](../phase-6/RESULTS.md).

## Puerta consolidada F6+F7

La puerta estable aprobó todos los pasos y avanzó la referencia de contenido.

| Comprobación | Resultado |
|---|---|
| Estado y fecha | aprobado; software consolidado por puerta conjunta F6+F7 / 22 de octubre de 2026 |
| Node | 390/390, 12,02 s |
| Herramientas | 62/62, 15,14 s |
| Tres smoke | 3/3, cero fallos/omisiones/reintentos, 24,08 s |
| Regresión completa | 125/125, cero fallos/omisiones/reintentos, 1348,75 s |
| OpenSpec estricto | validación estricta --all aprobada; paso specs exitCode 0 |
| Build incremental / reutilización | incremental sin --force aprobado, 2,72 s; consultar reutilización por etapa en su reporte |
| CodeGraph / preservación upstream | CodeGraph sincronizado antes de consolidar (artifacts/f7-codegraph-final.log); upstream-preservation aprobado y tres commits/diffs/locks preservados |
| Reportes y referencia de impacto | artifacts/test-runs/full-results.json, full-plan.json, full-integration.tap, full-tools.tap, full-smoke-browser.json y artifacts/browser-results.json. baselineWritten=true; referencia avanzada en artifacts/test-runs/baseline.json |

La fuente y documentación permanecieron congeladas mientras full tomó su inventario y ejecutó. Estas actas se incorporan después como actualización exclusivamente documental, distinta de la referencia que probó la puerta. Se validan las especificaciones tras actualizar, sin repetir full sólo por el texto. Una generación posterior de distribución verifica su propio inventario; no hereda automáticamente los bytes del archivo anterior.

## Documentación disponible y aceptación externa

La [guía docente](TEACHER-GUIDE.md) explica preparación offline, comprobación previa, copias GGPROJ, recuperación y ausencia de cuenta. La [matriz de compatibilidad](COMPATIBILITY.md) distingue las superficies implementadas y los límites. [Contribuir](../../CONTRIBUTING.md) y la [receta de distribución](../release/BUILD.md) documentan pruebas proporcionales, procedencia, preservación de forks y límites de reconstrucción.

Quedan pendientes placa física, firmware autónomo en la placa soportada, selección/transferencia USB física, evaluación humana con lector de pantalla, docente/alumnos/aula y rendimiento en equipo escolar acordado. Simulación, pruebas de USB con dobles, viewport móvil, zoom automatizado y WSL no equivalen a esa evidencia.

No se ha realizado un piloto ni una publicación pública por generar estos artefactos locales. No hay integración académica porque no se identificó una necesidad concreta. Autoría, recuperación y offline no requieren cuenta ni envían por defecto código o actividad de alumnos como telemetría.
