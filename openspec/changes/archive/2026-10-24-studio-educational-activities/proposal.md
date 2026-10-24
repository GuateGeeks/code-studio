# Proposal

## Why

Las tres actividades actuales comprueban condiciones reales del programa, pero muestran todas las pistas juntas y no ofrecen un recorrido explícito de predicción y transferencia. E3 acompaña a principiantes con docente para anticipar, experimentar y explicar sin confundir un check técnico con aprendizaje demostrado.

## What Changes

- Añadir un contrato educativo versión 2 compatible con actividades versión 1: objetivo, conocimientos previos, predicción, reflexión y reto variante declarativos.
- Ampliar las tres actividades existentes conservando sus ejemplos, IDs y checks principales; revelar las pistas de observación, relación y acción de una en una.
- Ofrecer recorrido principal y reto variante separados, conservando el proyecto al cambiar y comprobando exclusivamente las metas seleccionadas.
- Conservar el progreso principal anterior y registrar IDs del reto por separado; ninguna respuesta, código o dato personal se envía a servicios.
- Entregar guion docente y evidencia técnica, dejando revisión docente y comprensión observada pendientes de participación real.

## Capabilities

### New Capabilities

- `educational-activities`: guía declarativa de objetivo, predicción, pistas graduadas, reflexión y reto variante con progreso local y comprobaciones acotadas.

### Modified Capabilities

Ninguna consolidada: el inventario `openspec list --specs` está vacío. Se preservan los contratos históricos GG-LESSON-001 y GG-OFFLINE de `phase-3-packs-lessons-offline`, además de E1/E2.

## Impact

`src/lessons.mjs`, catálogo local, evaluación, progreso y controladores/vista de actividades; HTML/CSS e inventario de pruebas. Sin dependencias nuevas, cambios de motores, permisos, formato GGPROJ, red remota ni tutor de IA. Node comprueba contrato/compatibilidad/concurrencia; Playwright comprueba interacción, ejecución real, persistencia, teclado, vista estrecha y offline frío. La aceptación educativa con docente no se sustituye por automatización.
