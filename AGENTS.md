# GuateGeeks Code Studio

- Leer `README.md`, `docs/phase-0/RESULTS.md` y `docs/phase-0/PHASE-1-ENTRY.md` antes de ampliar el producto. Leer también `docs/phase-1/RESULTS.md` cuando exista para el estado de persistencia.
- Los cambios OpenSpec `incremental-test-workflow`, `phase-0-integration-foundations` y `phase-1-project-persistence` están completos y conservan evidencia sin archivar. Crear un cambio propio antes del siguiente corte; consultar `docs/engineering/NEXT-SESSION.md` y los resultados del flujo de pruebas.
- Las implementaciones históricas de fase 0 conservan wrappers/sondas en `spikes/`; el camino productivo F1 vive en `src/`. No publicar APIs experimentales ni probes como SDK estable. Consultar `docs/phase-1/F1-COMPLETION.md` para la extracción.
- Contratos/modelos propios viven en `src/`; editor, studio, runtime, adaptadores Scratch y target micro:bit tienen fronteras separadas. Solo adaptadores conocen internals. Ejecutar la comprobación de dependencias y no sobrescribir evidencia histórica con conteos nuevos.
- Ejecutar en Ubuntu/WSL con `source ../scripts/env.sh`. Usar `test:quick` durante edición, `test:affected -- --files <rutas>` para el grupo afectado y `test:full` una vez para consolidar fuentes estables; consultar `docs/engineering/TESTING.md`. Para cambios solo documentales validar especificaciones sin repetir suites ya aprobadas. Repetir una puerta completa después de aprobar solo ante cambios nuevos, fallos o inquietudes concretas pendientes.
- No tratar quick/affected como full ni avanzar con ellos la referencia de impacto. Conservar reportes de perfiles separados y evidencia histórica F0/F1. Usar el build incremental por defecto; reconstruir con `browser:build -- --force` cuando exista una razón concreta de caché/validación.
- Consultar CodeGraph antes de cambiar fronteras: `npm run codegraph -- query --path ../xcratch-scratch-editor loadProject --json`. Los otros índices son `../raspberrypi-blockly`, `../pxt-microbit`, `../.tools/pxt-core-source` y `.`.
- El watcher MCP está desactivado; ejecutar `npm run codegraph -- sync <ruta>` tras cambios y guardar consultas útiles en artefactos.
- Usar datos, tipos y contratos propios fuera de adaptadores. Solo los adaptadores conocen internals de Scratch/PXT; QuickJS/Pyodide y su parser pertenecen al target textual en src/targets/text, nunca al shell ni a modelos.
- Conservar las modificaciones previas upstream y revisar `artifacts/baseline/verification.json`; nunca limpiar sus checkouts para hacer pasar una prueba.
- No equiparar una prueba Node con renderizado, sandbox por origen, offline del navegador o ejecución física de firmware.
- Los proyectos importados no conceden permiso para descargar ni ejecutar extensiones externas.
