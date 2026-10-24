# Design

## Context

Véase proposal.md. El shell usa un registro de contextos, controladores DOM y un único resultado con runtimes aislados. E1 conserva editor y resultado próximos, pero documentos y herramientas siguen debajo. El snapshot artifacts/e2-baseline conserva 518 archivos anteriores; CodeGraph confirma el registro en authoring-contexts y shell.

## Goals / Non-Goals

**Goals:** composición contextual sin duplicar editores, navegar sin mutar autoría y aclarar documento/destino/resultado.

**Non-Goals:** sincronización bloques/texto, nuevos runtimes, persistir navegación en GGPROJ o cambiar validación educativa.

## Decisions

- Mantener DOM y controladores existentes con IDs estables. Mover el selector a una barra común y añadir navegación mediante enlaces con foco; evitar pestañas que oculten el resultado y dificulten detenerlo.
- Añadir contexto de edición textual 2D al registro. Reutilizar una única instancia de documentos en el editor; en 3D/web se muestra cuando su modo usa un documento y se selecciona el documento correspondiente sin modificar su fuente. Alternativa descartada: dos textareas sincronizados, por pérdida de borradores y caret.
- Ayuda visible breve según contexto, con enlaces a objetos, biblioteca, código y preparación. Herramientas 2D se muestran en 2D/texto/micro:bit cuando corresponden; objetos 3D/web conservan sus detalles nativos. Consola compartida mantiene origen y enlaces a fuentes.
- Resultado mantiene identidad explícita actualizada únicamente al ejecutar/restablecer. Navegar no detiene. Botón común Detener resultado llama al reset ya existente, sin duplicar contratos runtime.
- No registrar navegación como autoría. Suscripciones del registro y controladores se limitan a presentación; el guardado y las revisiones siguen en sus dueños actuales.
- Serializar las lecturas de recursos del controlador de proyecto. La corrida integral expuso que autosave y apertura compartían un validador de un solo trabajo que cancela al anterior: se conserva ese límite y se ordenan sus llamadas. Cada rechazo llega a su solicitante y la cola continúa. La cancelación de importaciones interactivas conserva su contrato.

## Risks / Trade-offs

- Foco en contenido oculto → revelar antes de enfocar copias, enlaces y diagnósticos; verificar teclado/zoom.
- Documento compartido entre destinos → mostrar destino y selección real del contexto; no cambiar el modo por navegar.
- Herramientas dependientes del runtime → no deducir el resultado de la selección de autoría; mantener rótulo y detención independientes.
- Cambio transversal → quick, casos focales y full con fuentes estables; conservar evidencia E1 y upstream.

## Migration Plan

Sin migración de proyectos. Build incremental y mismos seis roles. El snapshot permite restaurar fuentes anteriores; las nuevas pruebas recorren controles visibles reales. Aceptación humana y hardware siguen pendientes.
