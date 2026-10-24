# Proposal

## Why

Scratch importado conserva una composición separada del espacio integrado 2D y micro:bit. Acercar importación, cobertura, ejecución y consulta permite a principiantes con docente entender qué se conserva, qué puede ejecutarse y cuándo hace falta una copia editable.

## What Changes

- Integrar revisión del original y cobertura en el área principal, con Ejecutar Scratch y Detener Scratch en la barra común.
- Reunir descarga original, copia editable explícita y consulta de ejecución en el dock junto al resultado y recursos.
- Mostrar estados vacío, revisión, compatible, convertible y bloqueado sin prometer un editor nativo del archivo original ni ampliar el subconjunto soportado.
- Conservar identidad del original, validación previa, GGPROJ, recuperación sin autorun, aislamiento, Stop y funcionamiento offline preparado.
- Verificar la composición en escritorio, estrecho, teclado y zoom real, y consolidar la regresión completa con evidencia separada.

## Capabilities

### New Capabilities

- `integrated-scratch-workspace`: composición contextual del original Scratch importado, su cobertura, ejecución y creación explícita de copia GG.

### Modified Capabilities

Ninguna especificación consolidada: el inventario local está vacío. Se conservan los contratos de cambios previos sin archivar.

## Impact

HTML/CSS del shell, presentación contextual y estado de recursos/SB3 existentes; pruebas, documentación y OpenSpec. Sin motores, dependencias o formatos nuevos, cambios upstream, descargas de extensiones, nuevas actividades ni integración visual 3D/web. Esta extensión no acredita aceptación docente ni dispositivos físicos.
