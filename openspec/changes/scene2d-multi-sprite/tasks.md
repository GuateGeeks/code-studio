# Tasks

## 1. Contratos

- [ ] 1.1 CodeGraph e inventario de supuestos de sprite único; registrar consumidores.
- [ ] 1.2 `gg.sprites@0.2.0` (escenario + lista de sprites) con migración desde 0.1.0 y pruebas de migración y ejecución equivalente.
- [ ] 1.3 GGPROJ v4 `authoring.scene2d` (workspace por objeto) con lectura de v1–v4 y migración de `authoring.blockly`.
- [ ] 1.4 IR 2D v1 con `targetId` por script; validación y límites (8 sprites).

## 2. Ejecución

- [ ] 2.1 Adaptador Scratch con un target por sprite, recursos por `ownerId`, mensajes y variables globales compartidos; corpus de equivalencia multi-sprite.
- [ ] 2.2 API v3 por objeto en generador y traductores (JS y Python), con mapa identificador → `targetId` en `runtime`.

## 3. Interfaz

- [ ] 3.1 Panel de objetos (añadir, renombrar, duplicar, borrar, seleccionar) con teclado; editor montado para el objeto seleccionado sin perder borradores.
- [ ] 3.2 Menús de recursos, inspector y código derivado por objeto.

## 4. Verificación

- [ ] 4.1 Proyecto canónico «Diálogo» en `tests/fixtures/canonical/scene2d/`; E2E de añadir/ejecutar/Detener/guardar/reabrir; actualización de un proyecto 0.1.0.
- [ ] 4.2 `test:affected` y una puerta completa; acta con límites.
