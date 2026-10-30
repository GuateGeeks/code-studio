# Tasks

## 1. Tanda 1: movimiento, apariencia y control

Re-alcance del 29/10/2026: 1.1–1.3 son la etapa E1 (un sprite). «Ir a objeto», «fondo» y «Diálogo» pasan a 1.4 (E2, con `scene2d-multi-sprite`).

- [x] 1.1 Entradas de la tabla y bajada a opcodes revisados; IR y adaptador; corpus de equivalencia por bloque. Incluye la bajada 2D a opcodes VM desde la tabla, trasladada de [block-language-contract 3.2](../archive/2026-10-25-block-language-contract/tasks.md) y aceptada al archivar el 25/10/2026. Evidencia (29/10/2026): VOC-001…011 y VOC-015 en `tests/integration/scene2d-vocabulary.test.mjs`; acta [SCENE2D-VOCABULARY-E1-RESULTS](../../../docs/engineering/SCENE2D-VOCABULARY-E1-RESULTS.md).
- [x] 1.2 API v3 (JS/Python) y traductores para la tanda 1; parser de vistas sincronizadas; prueba de ida y vuelta. Evidencia (29/10/2026): VOC-005…007 y VOC-011…013 (Node) y E1-02…04 (Chromium).
- [ ] 1.3 Proyecto canónico «Hero se presenta» (un sprite) y puerta de la tanda E1. El canónico y sus E2E aprueban (29/10/2026); queda la puerta full conjunta, que ejecuta el coordinador al integrar.
- [ ] 1.4 (E2, con `scene2d-multi-sprite`) «Ir a objeto/aleatorio», «fondo» y proyecto canónico «Diálogo».
- [x] 1.5 Proyectos nuevos en la última versión (29/10/2026, ruling R1 del plan E2): el proyecto inicial sin guardar y «Crear mi primera escena» crean capacidades explícitas con `latestPackVersions` (0.2.0 en T1; 0.3.0 en E2), con el vocabulario E1 y las estructuras del núcleo en la caja; los GGPROJ v1/v2 guardados abren idénticos en 0.1.0. Decisión en `design.md` (punto 5). Evidencia (29/10/2026): NP-001…004 en `tests/integration/new-project-capabilities.test.mjs` y NP-BROWSER-001/002 en `tests/browser/new-project-capabilities.spec.mjs`.

## 2. Tanda 2: sensores y operadores

- [ ] 2.1 Expresiones anidadas en la IR 2D, con límites; lecturas atómicas en los traductores.
- [ ] 2.2 Entradas, corpus y API v3 de sensores y operadores; semántica documentada en ADR-004.
- [ ] 2.3 Proyectos canónicos «Atrapa la fruta» y «Laberinto»; cobertura de la copia Scratch medida; puerta final y acta.

Precisión T1: NP-004 y el rollback de perfil endurecido conservan RED/GREEN
en task-1-report.md; la corrección histórica fue 524/524 Node, 82/82 tools y
11/11 navegador. La revisión posterior de actualización legada/score y rollback
se registra en la cadena hasta fb4215f. 1.4/full no se cierra desde este texto.
