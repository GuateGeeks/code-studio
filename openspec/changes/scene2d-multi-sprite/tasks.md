# Tasks

## 1. Contratos

- [x] 1.1 CodeGraph e inventario de supuestos de sprite único; registrar consumidores. (29/10/2026: `artifacts/stabilization-2d/e2-multisprite/inventory.md` y design punto 6.)
- [x] 1.2 `gg.sprites@0.3.0` (escenario + lista de sprites) con migración desde 0.2.0 (y cadena desde 0.1.0) y pruebas de migración y ejecución equivalente. Versión ajustada el 29/10/2026: 0.2.0 es el vocabulario E1. (29/10/2026: design puntos 7–11; MS-001…006 en `tests/integration/scene2d-objects.test.mjs`; 0.3.0 es la última versión.)
- [x] 1.3 GGPROJ `authoring.scene2d` (workspace por objeto) con lectura de v1–v5 y migración de `authoring.blockly`. Versión ajustada el 29/10/2026: GGPROJ v6, porque v4 y v5 ya existían. (29/10/2026: design puntos 12–13; MS-007…012 en `tests/integration/scene2d-authoring.test.mjs`.)
- [x] 1.4 IR 2D v1 con `targetId` por script; validación y límites (8 sprites). (29/10/2026: design punto 14; MS-013…015.)

## 2. Ejecución

- [x] 2.1 Adaptador Scratch con un target por sprite, recursos por `ownerId`, mensajes y variables globales compartidos; corpus de equivalencia multi-sprite. (29/10/2026: design puntos 15–21; MS-017…025 en `tests/integration/scene2d-execution.test.mjs`; `tests/browser/scene2d-multi-sprite.spec.mjs`.)
- [x] 2.2 API v3 por objeto en generador y traductores (JS y Python), con mapa identificador → `targetId` en `runtime`. (30/10/2026: design puntos 22–27; MS-026…034 en `tests/integration/scene2d-text.test.mjs`; MS-BROWSER-003…006 en `tests/browser/scene2d-object-views.spec.mjs`.)

## 3. Interfaz

- [x] 3.1 Panel de objetos (añadir, renombrar, duplicar, borrar, seleccionar) con teclado; editor montado para el objeto seleccionado sin perder borradores. (30/10/2026: design puntos 28–40; MS-036…047 en `tests/integration/scene2d-object-edits.test.mjs`; MS-BROWSER-007…015 en `tests/browser/scene2d-objects-panel.spec.mjs`; capturas en `artifacts/stabilization-2d/e2-multisprite/task-6/`.)
- [ ] 3.2 Menús de recursos, inspector y código derivado por objeto.

## 4. Verificación

- [ ] 4.1 Proyecto canónico «Diálogo» en `tests/fixtures/canonical/scene2d/`; E2E de añadir/ejecutar/Detener/guardar/reabrir; actualización de un proyecto 0.1.0.
- [ ] 4.2 `test:affected` y una puerta completa; acta con límites.
