# Proposal

## Why

«Guardado en este navegador» y «Descargar proyecto» aparecen juntos sin un modelo común (P0-3 de la evaluación Code.org, Flujo 3). En equipos escolares compartidos, el estudiante puede perder su trabajo si el navegador se borra y nunca descargó una copia. Para primaria alta (D1), el estado tiene que ser evidente.

## What Changes

- **Indicador con tres estados:** «Guardado en este equipo», «Copia descargada hace N min» y «Sin descargar desde el último cambio».
- **Acción única «Llevar o entregar»:** por ahora, descargar el GGPROJ. Prepara el paquete de entrega de la Ola 5.
- **Recordatorio explícito, sin bloquear,** al salir si nunca se descargó una copia.
- **Fecha de la última descarga** guardada localmente con el autosave. No viaja en el GGPROJ.

## Capabilities

### New Capabilities

- `project-continuity`: estado de guardado local y de copia portable comprensible para el estudiante.

## Impact

`src/studio/project-ui.mjs`, la cabecera (`index.html`; un único escritor), el autosave (metadato local) y las suites de persistencia y de entrada. Sin cambio de formato GGPROJ.

Fuera de alcance: paquete de entrega con huella (Ola 5) y sincronización en la nube.
