# Design

## Context

La UI de capacidades genera secciones 3D/web con controles, Blockly, propiedades y código. El compositor contextual ya proyecta el único editor textual para el documento seleccionado. El frame 3D se publica como `.context-preview` junto al runner, conservando su origen y sesión. Los cortes 2D/micro:bit/Scratch fijan la composición y el mundo visual. Véase proposal.md para el motivo.

## Goals / Non-Goals

**Goals:** reorganizar instancias existentes, conservar foco/borradores/IDs y distinguir propiedades iniciales de ejecución. Cubrir vacío, bloques, texto, error, Stop y recuperación en la composición.

**Non-Goals:** cambiar modelos, permisos, motores, capacidades, versiones, formatos o composición web. No crear un editor textual duplicado ni edición directa de la escena runtime.

## Decisions

- Extensión local Operate code-led del patrón fijado: columnas 1.45:1, verde/blanco, controles nativos. Impeccable new-work §3 permite resolver directamente una extensión local precisa, sin torneo ni comp; no hay semilla ni mundo nuevo. Alternativa de rediseño global descartada por exceder el alcance.
- La UI 3D crea contenedores semánticos para programa, objetos iniciales y código/exportación. Conserva controles y referencias existentes; el compositor traslada las consultas al dock y el transporte a la barra, con foco preservado. Se evita recrear nodos o introducir segundas fuentes de verdad.
- Bloques conservan su editor; el único `.text-authoring` se muestra en el área principal al elegir un documento 3D. Las copias siguen siendo explícitas e independientes. Modo/documento y estado permanecen próximos a la autoría; el código derivado es consulta secundaria.
- El resultado 3D conserva el frame aislado y su ciclo de publicación. CSS acota su altura en escritorio y permite flujo en estrecho. Main crece para contener ambas columnas y el pie; no se monta otro renderer ni se añade una lectura de runtime con autoridad nueva.
- Propiedades de objetos/cámara y GLB existentes se consultan bajo el resultado con explicación del estado inicial. Los errores permanecen accesibles y próximos al programa mediante el aviso existente. Exportar es una acción distinta de ejecutar.
- Cambiar distribución rompe selectores de pruebas basados en padres antiguos: actualizarlos a IDs/destinos semánticos conservando acciones reales y aserciones de contenido, aislamiento y persistencia.

## Risks / Trade-offs

- [Traslado de controles rompe disponibilidad/foco] → referencias compartidas, estado listo/deshabilitado explícito y pruebas de teclado, caret y cancelación.
- [Renderer o dock solapa el pie] → altura definida de workspace, main automático y aserciones geométricas de ambos modos y tamaños.
- [Confundir edición inicial con runtime] → explicación visible y comprobación de que aplicar no ejecuta; comparar capturas del modelo y de la sesión por separado.
- [Regresión transversal] → quick, affected y full estable con OpenSpec estricto, upstreams preservados y cold offline. Evidencia histórica separada.
- [Comprensión educativa no observada] → predicción de un movimiento con el docente, comparación y variante; aceptación humana/escolar pendiente.

## Migration Plan

Sin migración de datos. Conservar instantánea previa restaurable y puerta Scratch aprobada. El retroceso puede restaurar la composición anterior sin descartar proyectos. Mantener este cambio sin archivar hasta una solicitud de consolidación.
