# Proposal

## Why

Code Studio ya implementa F0–F7, pero la entrada presenta gestión de archivos, capacidades y varios controles de ejecución antes de un recorrido claro de creación. La revisión del kit del 22/10/2026 y del HTML/CSS actual justifica un primer recorrido 2D que conecte empezar, editar, ejecutar, detener y recuperar, conservando la arquitectura existente.

## What Changes

- Ofrecer continuar el proyecto recuperado, iniciar la primera creación 2D, explorar una actividad o abrir GGPROJ; seleccionar una opción informativa no reemplaza autoría.
- Mostrar una ruta principal de ejecución inequívoca para los bloques 2D activos, con estado real y Detener alcanzable junto a edición y resultado.
- Agrupar corpus y controles GG de diagnóstico en herramientas avanzadas, conservando sus funciones y contratos.
- Mantener visibles el estado real de guardado, la descarga portable y los errores de recuperación.
- Conservar teclado, foco, zoom y navegación a otros contextos; el nuevo recorrido no elimina las funciones avanzadas.
- Comprobar el recorrido completo y las regresiones de accesibilidad, persistencia y contextos existentes.

Público prioritario confirmado por el usuario: estudiantes principiantes con acompañamiento docente. Edad, grado, currículo, equipos, identidad de marca y política móvil final siguen abiertos; no son requisitos inventados. El corte no cambia el esquema de actividades ni incorpora Sócrates, cuentas o servicios nuevos.

## Capabilities

### New Capabilities

- `studio-entry-journey`: entrada y primera creación recuperable con jerarquía de acciones y estado contextual comprensibles.

### Modified Capabilities

Ninguna capacidad consolidada bajo `openspec/specs/`; el inventario de la CLI está vacío porque los trece cambios históricos permanecen sin archivar. Este cambio añade comportamiento de presentación y conserva los requisitos de persistencia, consola, actividades y accesibilidad de esos cambios, sin duplicarlos ni archivarlos como efecto secundario.

## Impact

Principalmente `src/studio/index.html`, `style.css`, composición de `shell.js`, `project-ui.mjs` y `lessons-ui.mjs`; un controlador de presentación pequeño si resulta necesario. Pruebas en `tests/browser/` y selección de impacto en `tools/test/impact.mjs`.

Sin migración de framework, formatos GGPROJ, motores, grants, CSP ni orígenes. Se conserva una sola autoría y el flujo existente de protección al reemplazar. Dirección visual y layout final se documentarán durante la implementación usando evidencia del producto, sin presentar los sprites de ejemplo como marca aprobada.
