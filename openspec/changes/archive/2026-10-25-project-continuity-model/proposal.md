# Proposal

## Why

El estudiante necesita distinguir el trabajo confirmado en este navegador del archivo que puede llevar a otra computadora. El recorrido 2D requiere estados fiables aun cuando el almacenamiento falla o se edita mientras se prepara una descarga.

## What Changes

- Separar dos estados simultáneos: guardado local (pendiente, confirmado, fallido o recuperación bloqueada) y última copia solicitada (sin registro, del contenido actual o anterior).
- Ofrecer una única acción «Llevar o entregar» que descarga GGPROJ; no envía el proyecto a ninguna institución.
- Guardar localmente la identidad del contenido y hora de la solicitud de descarga después de preparar el archivo y entregarlo al navegador. No afirmar que el archivo quedó escrito en disco.
- Mostrar un recordatorio dentro de Studio cuando no hay copia solicitada del contenido actual; conservar las protecciones de reemplazo y limitar los avisos nativos de salida a lo que permite el navegador.
- Corregir la promesa anterior de guardado garantizado al cerrar: la recuperación solo garantiza la última revisión confirmada, como ya establece GGPROJ.
- Comprobar metadatos ausentes/corruptos, edición durante descarga y cambio de proyecto, sin alterar autoría ni archivo portable.

## Capabilities

### New Capabilities

- `project-continuity`: estado comprensible y verificable del guardado local y de las solicitudes de copia portable.

### Modified Capabilities

Ninguna. Las garantías de `project-persistence` se conservan; su ampliación del recorrido y captura coherente pertenece a [scene2d-journey-stabilization](../2026-10-25-scene2d-journey-stabilization/proposal.md).

## Impact

Implementación futura en `src/studio/project-ui.mjs`, metadatos opcionales de `src/autosave-store.mjs`, un derivador propio de estado y controles de cabecera/Archivo. Pruebas Node del estado y E2E de persistencia/entrada/accesibilidad. Sin dependencias nuevas ni cambio GGPROJ.

Revisión documental del 25/10/2026 dentro del plan de estabilización solicitado. No se implementa, hace commit ni push. Se conserva este cambio como único propietario de continuidad; no se modifica synced-code-views. Antes de una implementación se acuerda escritor único de autoría/UI con code-studio-worker.

Fuera de alcance: nube, envío o recibo académico, garantía de escritura física del archivo, catálogo multiusuario, fusión entre pestañas, conversiones y metadatos de vistas sincronizadas.

## Encargo vigente

Implementación autorizada posteriormente por el usuario, con escritor único
code-studio-worker y coordinación de solo lectura. La revisión documental anterior
se conserva como antecedente; esta autorización permite las fuentes, pruebas y
actas descritas por el plan. No incluye commit, archivo ni push.
