# Fase 1: GGPROJ, autosave y reapertura

Este informe conserva la corrida histórica de persistencia. El corte posterior de [código generado y consola](CODE-CONSOLE.md) mantiene resultados y evidencia propios.

**22 de octubre de 2026, Guatemala · Estado: primer corte de persistencia F1 implementado y verificado.**

Este incremento inicia F1 con persistencia del proyecto. No declara completada toda la fase: consola/código generado y la extracción completa de los spikes siguen en el plan. Se conserva el motor y las fronteras aceptadas en F0.

El [formato y procedimiento de recuperación](GGPROJ.md) documenta ZIP v1, límites, catálogo, locks, IndexedDB, confirmación de guardado y errores. El cambio OpenSpec es `phase-1-project-persistence`; su capacidad `project-persistence` define diez requisitos y doce tareas verificables.

## Implementación

- Modelo y archivo GGPROJ independientes de Blockly/Scratch en `src/project-format.mjs` y `src/project-archive.mjs`.
- Catálogo de recursos propio con integridad en `tools/f1/build-project-catalog.mjs` y copia local en el build del shell.
- Autosave transaccional con respaldo en `src/autosave-store.mjs`; control de UI en `spikes/browser/shell/project-ui.mjs`.
- Preparación de Blockly/IR en workspace separado antes del reemplazo. El arranque impide editar durante la recuperación; las solicitudes de ejecuciones sustituidas se cancelan.
- Controles de nombre, descarga, archivo local y diagnóstico en escritorio/móvil. No se añadió un backend de almacenamiento ni se relajó la CSP.

## Verificación

La corrida final aprueba **44/44 pruebas Node en 2,56 s y 33/33 E2E Chromium en 156,13 s**, sin fallos, omisiones, casos flaky ni reintentos. Se conservan 30 Node y 25 E2E de F0; se añaden 11 Node de formato/archivo, 3 de almacenamiento temprano/cola y 8 E2E de persistencia. ZIP se contrasta con JSZip independiente, incluyendo CRC y archivos generados por otra implementación.

| Requisitos | Evidencia final |
|---|---|
| GG-PROJECT-001/002/003/005/010 | Descarga real de ZIP de 61 908 bytes, manifiesto+4 assets; cierre y apertura en contexto limpio a 390 px. Nombre, fuente, bloques e IDs iguales; x inicial0, ejecución18 frente a28 del runtime antes de exportar |
| GG-PROJECT-003/004 | Siete documentos inválidos y cuatro archivos inválidos rechazados. Workspace, nombre, fuente, sesión y escena conservados; la referencia GG previa sigue funcionando |
| GG-PROJECT-005/006/007 | Autosave por debounce real, commit IndexedDB, cierre de página y nueva página con la misma autoría; ejecutar y recibir boost funcionan tras recuperar |
| GG-PROJECT-007 | Corrupción de current recupera previous con aviso; ambas dañadas se conservan sin escritura automática |
| GG-PROJECT-006/008 | SecurityError/cuota inyectados: diagnóstico visible, última transacción conservada, edición/ejecución/descarga disponibles y reintento posterior aprobado |
| GG-PROJECT-007/009 | Stop durante audio y worker infinito: frame retirado, workers cerrados, referencias antiguas rechazadas y ausencia de continuación tardía; recuperación y nueva reproducción por gesto funcionan |
| GG-PROJECT-006/007/009 | Flush iniciado antes de terminar el arranque e importación solapada con Stop: promesas resueltas, autoría conservada, guardado posterior y x=18 |
| Regresión F0 | Audio/variables, Blockly/GG, corpus, aislamiento, worker PXT y simulador siguen aprobados |

La [evidencia estable](browser-evidence.json) conserva resultados, ocho casos, SHA-256 del archivo descargado, hashes de fuentes/bundles/copias y catálogo. Los tres upstreams conservan commit, diff versionado y lockfile. CodeGraph sincronizó el producto y registró consultas del archivo y autosave. OpenSpec pasa validación estricta: dos cambios válidos, con **12/12 tareas** del corte F1 completas. La evidencia histórica F0 permanece sin regenerar.

La primera corrida Chromium detectó un arranque bloqueado cuando el iframe quedaba fuera de pantalla en móvil: dependía de requestAnimationFrame, que Chromium puede suspender. La preparación de texturas ahora usa espera con temporizador y exige píxeles reales antes de anunciar disponibilidad. La barra nueva también expuso un problema de hit-test OOPIF tras scroll: los clics del antiguo control de corpus llegaban al canvas. Se colocó selector/Ejecutar antes del escenario, conservando Stop/GG debajo; pasaron las 16 pruebas afectadas con sus clics reales, sin modificar las pruebas anteriores. Las corridas fallidas de desarrollo no cuentan como evidencia aprobada.

La revisión detectó y corrigió dos carreras: flush antes de terminar recuperación y reemplazos Stop superpuestos. Ambas se verificaron con retrasos controlados del catálogo y de la navegación del runner, además de la corrida final completa.

## Uso y artefactos

Recargar la vista local y usar **Tu proyecto** para cambiar nombre, descargar o abrir `.ggproj`. Esperar **Guardado en este navegador** antes de cerrar. Al volver, Studio recupera la copia confirmada y espera una acción explícita para ejecutar. Si no hay almacenamiento, descargar sigue disponible.

Los artefactos locales son `artifacts/f1-integration.tap`, `f1-browser-full.log`, `browser-results.json`, ocho `f1-*.json`, `f1-example.ggproj` y `f1-project-mobile.png`. Las pruebas están en `tests/integration/project-format.test.mjs`, `autosave-store.test.mjs` y `tests/browser/project-persistence.spec.mjs`. La receta de reproducción está en [GGPROJ.md](GGPROJ.md) y README.

## Límites

La confirmación de autosave corresponde a IndexedDB commit; no garantiza la edición aún dentro del debounce al cerrar abruptamente. Los errores de almacenamiento de las pruebas se inyectan mediante APIs del navegador sobre IndexedDB real, no agotando físicamente el disco. La recuperación no demuestra PWA de segunda visita, ejecución física de firmware, fusión entre pestañas ni ausencia de fugas prolongadas. El catálogo fijo, ZIP STORE y versiones compatibles forman parte del contrato de v1.
