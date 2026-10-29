# Tasks

## 1. Tanda 1: movimiento, apariencia y control

Re-alcance del 29/10/2026: 1.1–1.3 son la etapa E1 (un sprite). «Ir a objeto», «fondo» y «Diálogo» pasan a 1.4 (E2, con `scene2d-multi-sprite`).

- [x] 1.1 Entradas de la tabla y bajada a opcodes revisados; IR y adaptador; corpus de equivalencia por bloque. Incluye la bajada 2D a opcodes VM desde la tabla, trasladada de [block-language-contract 3.2](../archive/2026-10-25-block-language-contract/tasks.md) y aceptada al archivar el 25/10/2026. Evidencia (29/10/2026): VOC-001…011 y VOC-015 en `tests/integration/scene2d-vocabulary.test.mjs`; acta [SCENE2D-VOCABULARY-E1-RESULTS](../../../docs/engineering/SCENE2D-VOCABULARY-E1-RESULTS.md).
- [x] 1.2 API v3 (JS/Python) y traductores para la tanda 1; parser de vistas sincronizadas; prueba de ida y vuelta. Evidencia (29/10/2026): VOC-005…007 y VOC-011…013 (Node) y E1-02…04 (Chromium).
- [ ] 1.3 Proyecto canónico «Hero se presenta» (un sprite) y puerta de la tanda E1. El canónico y sus E2E aprueban (29/10/2026); queda la puerta full conjunta, que ejecuta el coordinador al integrar.
- [ ] 1.4 (E2, con `scene2d-multi-sprite`) «Ir a objeto/aleatorio», «fondo» y proyecto canónico «Diálogo».

## 2. Tanda 2: sensores y operadores

- [ ] 2.1 Expresiones anidadas en la IR 2D, con límites; lecturas atómicas en los traductores.
- [ ] 2.2 Entradas, corpus y API v3 de sensores y operadores; semántica documentada en ADR-004.
- [ ] 2.3 Proyectos canónicos «Atrapa la fruta» y «Laberinto»; cobertura de la copia Scratch medida; puerta final y acta.
