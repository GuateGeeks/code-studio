# Proposal

## Why

Hoy, para pasar de bloques a texto hay que crear una copia independiente: los bloques quedan atrás y el estudiante decide qué documento ejecutar. El usuario decidió el 24 de octubre de 2026 adoptar el modelo de MakeCode ([ADR-011](../../../docs/adr/011-contrato-de-lenguaje-y-vistas-sincronizadas.md)): un único programa que se edita en Bloques, JavaScript o Python y vuelve a bloques conservando los cambios, siempre que el código esté dentro del subconjunto bloqueable. Así el paso a texto se convierte en un andamiaje gradual: mirar el código, cambiar un número, volver a bloques si hace falta.

## What Changes

- **Selector Bloques · JavaScript · Python sobre el mismo programa** en los contextos que lo admitan. En modo sincronizado la vista de texto es editable.
- **Vuelta a bloques**: el texto se analiza en el origen del lenguaje, se convierte a la representación validada mediante la tabla de `block-language-contract` y reconstruye el workspace conservando los IDs de los bloques que no cambiaron.
- **Rechazo explicado**: si el código tiene un error de sintaxis o usa algo fuera del subconjunto, el sistema no cambia de vista. Indica la línea y la causa, y ofrece seguir editando, volver a la última versión en bloques o guardar el texto como copia independiente. Ninguna opción pierde trabajo.
- **Ejecutar** usa el mismo programa desde cualquier vista. Cambiar de vista nunca ejecuta.
- La **copia independiente** se conserva para el código libre que va más allá del subconjunto.
- **Despliegue por contextos**: 2D JavaScript, después 2D Python, micro:bit TypeScript y 3D/web.
- La actividad «De bloques a tu propio código» se rediseña como **nueva revisión**; la revisión 1 y su progreso siguen legibles.

## Capabilities

### New Capabilities

- `code-views`: edición del mismo programa en bloques y en texto con conversión en ambos sentidos dentro del subconjunto bloqueable, rechazo explicado y conservación del trabajo.

### Modified Capabilities

Ninguna consolidada. Sustituye, según ADR-011, la regla «código derivado de solo lectura, sin sincronización inversa» de `PRODUCT.md` y ADR-004, y los checks `text-copy`/`blocks-unchanged` como único recorrido de transición de E3.

## Impact

Selector de modo y editor textual de la shell (`src/studio/*`, un único escritor). Parser y conversión texto→IR en `src/targets/text` (origen del lenguaje). `src/editor/workspace-from-ir.mjs` y `block-program.mjs`, `src/lessons.mjs` y el catálogo de actividades, y el autosave (puntos de restauración por cambio de vista). Afecta pruebas de lenguajes, equivalencia, actividades, persistencia, accesibilidad y espacios integrados.

**Depende de** `pack-versioning-and-migrations` y `block-language-contract`.

Fuera de alcance: conversión de código arbitrario fuera del subconjunto, sincronización en tiempo real carácter a carácter, ejecución automática al editar y Python para micro:bit (Static Python).
