# Proposal

## Why

`synced-code-views` se cerró con 2D por decisión del usuario del 29/10/2026: estabilizar 2D y entregar un piloto en aula antes de ampliar ([plan de estabilización 2D](../../../docs/product/STABILIZATION-PLAN-2D.md)). Las vistas sincronizadas de micro:bit (Static TypeScript) y de 3D/web (IR1) quedaron pendientes como tareas 4.2 y 4.3 trasladadas. Este cambio las conserva como trabajo futuro con su propio alcance y su propia puerta. **No está autorizado para implementarse** dentro del plan de estabilización 2D.

## What Changes

- **micro:bit:** vista TypeScript del mismo programa de bloques de firmware. El parser vive en el origen del lenguaje y lo dirigen las plantillas `typescript` de la tabla `gg.microbit`. La ida y vuelta sin cambios debe conservar el programa, todos los IDs, el layout y producir un **HEX idéntico** con el compilador PXT real. El documento TypeScript independiente, la simulación conjunta y las acciones explícitas de compilar, descargar y transferir se conservan.
- **3D/web:** vistas sobre los contratos IR1. Por defecto se rechaza lo que no tiene bloque; la decisión sobre bloques grises se registra antes de incorporarlos.
- Las mismas garantías del corte 2D: rechazo con línea y tres salidas, Deshacer, persistencia GGPROJ v5, ninguna ejecución al cambiar de vista y respuestas obsoletas descartadas por proyecto.

## Capabilities

### New Capabilities

- `code-views-capability-contexts`: vistas sincronizadas en micro:bit, 3D y web, con las garantías de `code-views`.

### Modified Capabilities

Ninguna. `code-views` se consolida al archivar `synced-code-views`.

## Impact

micro:bit: `src/contracts/device-program.mjs`, `src/editor/device-editor.mjs`, `src/studio/device-ui.mjs`, el canal y la UI de vistas, el parser del origen del lenguaje y las suites de dispositivo y transferencia. 3D/web: `program-ir1.mjs`, `capability-editor.mjs` y sus suites. **Depende de** que se archive `synced-code-views`.

Fuera de alcance: Static Python de micro:bit, sensores y radio, y vocabulario nuevo de 3D/web.
