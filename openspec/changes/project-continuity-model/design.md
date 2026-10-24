# Design

## Context

`project-ui.mjs` ya conoce `savedAt` (autosave) y gestiona la descarga (`#save-project`). No registra cuándo se descargó la última copia.

## Decisions

1. **Metadato local `lastDownloadedRevision` y su hora**, guardado junto al autosave en IndexedDB. No forma parte del GGPROJ portable.
2. **Estado derivado:** «sin descargar desde el último cambio» cuando la revisión actual es mayor que la última descargada.
3. **Recordatorio con `beforeunload`** solo si nunca se descargó una copia y hay cambios. Es el mensaje nativo del navegador, que no se puede personalizar. Dentro de la página, un aviso persistente ofrece «Llevar o entregar».
4. **Copy para 10–12 años** (D1): frases cortas y sin jerga. Por ejemplo, «Tu trabajo está guardado en esta computadora. ¿Lo quieres llevar a otra? Descárgalo».

## Risks / Trade-offs

- [El recordatorio molesta en clase] → solo aparece si nunca se descargó; el docente puede descargarlo una vez para todo el grupo.
