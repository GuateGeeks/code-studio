# Proyectos canónicos

Fixtures de los proyectos canónicos del [plan de maduración](../../../docs/product/FEATURE-MATURATION-PLAN.md) (§3). Cada proyecto vive en `<contexto>/<proyecto>/` y lo ejecuta `tests/browser/canonical-projects.spec.mjs`:

- `project.json`: `{format: 'gg-canonical-fixture', version: 1, context, name, packIds, blockly}`. Se abre con `project.loadStarter`, igual que una actividad, sin depender del hash del catálogo del build.
- Con objetos (`gg.sprites@0.3.0`), `version: 2`: `{…, objects, resources, scene2d}`. `objects` es la configuración del pack, `scene2d` los workspaces y `resources` lista descriptores `{id, ownerId, name, from}` que copian el primer disfraz del dueño `from`, para no depender de bytes propios ni del hash del catálogo.
- `expect.json`: `{initial, final}` con campos del snapshot de la escena. El ejecutor comprueba que abrir no ejecuta (`initial`), que «Ejecutar» alcanza `final` y que «Detener» vuelve a `initial`. Una clave con puntos nombra un campo anidado (`hero.size`, `hero.bubble`); así un proyecto que sigue animándose (por siempre) declara solo el estado que ya no cambia.

| Proyecto | Contenido |
|---|---|
| `scene2d/repeat-move` | Repetir y mover (gg.sprites@0.1.0 o posterior) |
| `scene2d/hero-presents` | «Hero se presenta» (E1, gg.sprites@0.2.0): ir a, apuntar, mostrar, decir/pensar por segundos, deslizar, cambiar tamaño, siguiente disfraz, decir y por siempre con mover y rebotar. Solo bloques y menús de la caja de herramientas |
| `scene2d/dialogo` | «Diálogo» (E2, gg.sprites@0.3.0): dos personajes, decir, un mensaje con espera, cambiar fondo e ir a objeto. `initial` lee la escena en reposo, que es la del runner hasta ejecutar (design punto 40). `MS-BROWSER-033` lo construye en el navegador solo con bloques y menús |

Contextos admitidos por el ejecutor: `scene2d`. Cada ola que añada proyectos de otro contexto amplía la tabla de botones del ejecutor.
