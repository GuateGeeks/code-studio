# Proyectos canónicos

Fixtures de los proyectos canónicos del [plan de maduración](../../../docs/product/FEATURE-MATURATION-PLAN.md) (§3). Cada proyecto vive en `<contexto>/<proyecto>/` y lo ejecuta `tests/browser/canonical-projects.spec.mjs`:

- `project.json`: `{format: 'gg-canonical-fixture', version: 1, context, name, packIds, blockly}`. Se abre con `project.loadStarter`, igual que una actividad, sin depender del hash del catálogo del build.
- `expect.json`: `{initial, final}` con campos del snapshot de la escena. El ejecutor comprueba que abrir no ejecuta (`initial`), que «Ejecutar» alcanza `final` y que «Detener» vuelve a `initial`.

Contextos admitidos por el ejecutor: `scene2d`. Cada ola que añada proyectos de otro contexto amplía la tabla de botones del ejecutor.
