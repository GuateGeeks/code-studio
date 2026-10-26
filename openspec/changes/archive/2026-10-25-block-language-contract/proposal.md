# Proposal

## Why

El código JavaScript/Python que ve el estudiante expone la mecánica interna: `GG.program.configure`, `GG.events.onStart(gg_handler_0)`, `await ctx.compare("EQ", GG.ref("score"), 3)` y unas quince funciones auxiliares `gg_*` en 3D/web. No enseña un lenguaje reconocible (hallazgo H9 del plan de maduración) y no puede volver a convertirse en bloques.

Además, hoy hay tres formas distintas de convertir bloques en código. 2D baja a 12 operaciones IR fijas con generadores escritos a mano. micro:bit tiene su propia tabla y un `switch` a Static TypeScript. 3D/web genera bloques desde una tabla de operaciones. Añadir comportamiento nuevo exige editar el núcleo, salvo en 3D/web.

El usuario decidió el 24 de octubre de 2026 adoptar el modelo MakeCode: un programa con vistas sincronizadas Bloques · JavaScript · Python ([ADR-011](../../../../docs/adr/011-contrato-de-lenguaje-y-vistas-sincronizadas.md)). Ese modelo exige primero una API **bloqueable**: cada función corresponde a un único bloque y viceversa. Este cambio define ese contrato. El parser de vuelta a bloques se implementa en `synced-code-views`.

## What Changes

- **Manifiesto de pack `apiVersion: 2` con tabla de lenguaje**: cada entrada declara bloque, categoría, argumentos tipados, espacio de nombres, forma JavaScript, forma Python y bajada por contexto (opcode Scratch VM, plantilla Static TypeScript u operación de capacidad).
- **Reglas bloqueables verificadas por el catálogo**: forma canónica única, sin sobrecargas ni objetos de opciones, valores cerrados para menús, identificadores válidos, espacios de nombres sin colisiones y palabras reservadas por lenguaje. Los packs solo aportan llamadas, valores, eventos con callback y enumeraciones; el control de flujo es del núcleo.
- **API v3 legible** para la lectura derivada y las copias nuevas, sin `GG.`, `ctx`, `GG.ref` ni nombres `gg_*`. `GG` queda como puente interno del sandbox.
- **Generadores genéricos** dirigidos por la tabla para 2D, micro:bit, 3D y web, con mapa línea→bloque.
- **Migración de `gg.sprites`, `gg.score`, `gg.assets`, `gg.microbit` y las operaciones 3D/web** a la tabla, sin cambiar el comportamiento ni los IDs de bloques.
- Las copias API1/API2 existentes siguen ejecutándose sin modificar su texto.

## Capabilities

### New Capabilities

- `block-language`: contrato declarativo entre bloques, texto JavaScript/Python/Static TypeScript y ejecución por contexto, con reglas bloqueables y API textual legible versionada.

### Modified Capabilities

Ninguna consolidada (`openspec/specs/` vacío). Sustituye, según ADR-011, la API textual API1/API2 como forma generada por defecto (ADR-004, ADR-009) y el formato de manifiesto `apiVersion: 1` (ADR-005).

## Impact

`src/contracts/packs.mjs`, `src/packs/*`, `src/editor/contributions.mjs`, `src/editor/block-program.mjs`, `src/contracts/program-contract.mjs`, `src/contracts/program-ir1.mjs`, `src/contracts/operations.mjs`, `src/contracts/device-program.mjs`, `src/generated-program-source.mjs`, `src/generated-capability-source.mjs`, `src/targets/text/*` (capa API v3 en el origen del lenguaje) y la exportación autónoma. Las pruebas que fijan texto generado (~80 aserciones en 10 archivos) pasan a archivos de referencia por versión de API.

**Depende de** `pack-versioning-and-migrations`, porque los manifiestos cambian de hash y de versión.

Fuera de alcance: vuelta de texto a bloques, editor de código nuevo y vocabulario nuevo (vocabulario 2D v2, micro:bit v2), que se añadirán ya como entradas de la tabla en cambios posteriores. Tampoco entran packs de terceros ni código remoto.
