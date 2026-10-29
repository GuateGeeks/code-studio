# Proyectos canónicos

Fixtures de los proyectos canónicos del [plan de maduración](../../../docs/product/FEATURE-MATURATION-PLAN.md) (§3). Cada proyecto vive en `<contexto>/<proyecto>/` y lo ejecuta `tests/browser/canonical-projects.spec.mjs`:

- `project.json`: `{format: 'gg-canonical-fixture', version: 1, context, name, packIds, blockly}`. Se abre con `project.loadStarter`, igual que una actividad, sin depender del hash del catálogo del build.
- `expect.json`: `{initial, final}` con campos del snapshot de la escena. El ejecutor comprueba que abrir no ejecuta (`initial`), que «Ejecutar» alcanza `final` y que «Detener» vuelve a `initial`. Una clave con puntos nombra un campo anidado (`hero.size`, `hero.bubble`); así un proyecto que sigue animándose (por siempre) declara solo el estado que ya no cambia.

| Proyecto | Contenido |
|---|---|
| `scene2d/repeat-move` | Repetir y mover (gg.sprites@0.1.0 o posterior) |
| `scene2d/hero-presents` | «Hero se presenta» (E1, gg.sprites@0.2.0): ir a, apuntar, mostrar, decir/pensar por segundos, deslizar, cambiar tamaño, siguiente disfraz, decir y por siempre con mover y rebotar. Solo bloques y menús de la caja de herramientas |

Contextos admitidos por el ejecutor: `scene2d`. Cada ola que añada proyectos de otro contexto amplía la tabla de botones del ejecutor.
