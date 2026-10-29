# Proposal

## Why

El usuario decidió el 29/10/2026 estabilizar 2D y entregar un piloto en aula con despliegue local en cada equipo ([plan de estabilización 2D](../../../docs/product/STABILIZATION-PLAN-2D.md), decisión E-3). En una clase con estudiantes de 10 a 12 años, seis contextos (incluidos micro:bit, Scratch, 3D y web, que quedan congelados) añaden superficie y confusión sin aportar al objetivo del piloto. La instalación del piloto debe mostrar solo Escena 2D y Texto para 2D, sin perder lo que un proyecto ya tenga en otros contextos.

## What Changes

- **Perfil de despliegue con contextos visibles.** El servidor local acepta `GG_CONTEXTS` (por ejemplo `2d,text`). La release lo publica en `config.json`. Sin esa variable, se mantienen los seis contextos y `config.json` conserva su forma; el perfil solo entra en las entradas de la cohorte cuando se declara.
- **El selector «Qué programas» muestra solo los contextos del perfil.** La navegación interna hacia un contexto oculto no ocurre: no cambia el contexto ni ejecuta.
- **Conservación y aviso.** Un proyecto abierto que tenga micro:bit, Scratch importado, 3D o web conserva esos datos al guardar, descargar y reabrir. Un aviso indica que esta instalación no los muestra.
- **Arranque del piloto:** `npm run serve:pilot` sirve la release con el perfil `2d,text`.

## Capabilities

### New Capabilities

- `deployment-profile`: contextos visibles por instalación, sin pérdida de autoría.

### Modified Capabilities

Ninguna.

## Impact

`tools/build/release-snapshot.mjs`, `tools/f0/serve-browser.mjs`, `package.json`, `src/contracts/deployment-profile.mjs` (nuevo), `src/studio/authoring-contexts.mjs`, `src/studio/shell.js` e `index.html` (aviso; un único escritor). Pruebas de herramientas de la release y un E2E con servidor propio.

Fuera de alcance: perfiles por usuario o por docente dentro de la interfaz, cuentas, y ocultar herramientas dentro de 2D.
