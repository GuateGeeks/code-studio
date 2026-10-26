# Proposal

## Why

El recorrido 2D ya tiene pruebas de persistencia y ejecución, pero necesita una aceptación conjunta y reproducible antes de ampliar capacidades. El usuario pidió el 25/10/2026 preparar solo este plan y la continuidad, coordinados con `code-studio-worker`, sin implementar ni hacer push.

## What Changes

- Precisar en `project-persistence` la continuidad del recorrido crear → editar → ejecutar → detener → guardar confirmado → cerrar → recuperar, y su alternativa portable en un perfil nuevo.
- Exigir una exportación de una captura coherente cuando hay ediciones durante la preparación del archivo; verificarla sin confundir número de revisión con contenido.
- Ampliar pruebas existentes solo donde falten escenarios: errores de almacenamiento, archivo inválido, respaldo, cancelación de reemplazo, trabajo tardío tras Stop y retorno offline preparado. Corregir únicamente fallos reproducidos contra esos contratos.
- Integrar el indicador y la acción «Llevar o entregar» definidos exclusivamente por el cambio existente [project-continuity-model](../2026-10-25-project-continuity-model/proposal.md). Ese cambio es dependencia de la aceptación conjunta, no una segunda implementación aquí.
- Entregar una matriz requisito → caso → evidencia → revisión de código, con límites explícitos de laboratorio y de aceptación docente.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `project-persistence`: precisar la reapertura completa de autoría 2D y la coherencia de una exportación mientras cambia el editor. Los demás contratos de persistencia se conservan y se ejercitan como regresión.

## Impact

En una futura implementación: `src/studio/project-ui.mjs`, `src/project-authoring.mjs`, `src/autosave-store.mjs` o `src/studio/entry-journey-ui.mjs` solo ante defectos demostrados; suites de persistencia, entrada, 2D integrado y offline. Sin dependencias nuevas ni cambios previstos de GGPROJ, IR, motores o catálogo.

El alcance actual escribe únicamente esta carpeta OpenSpec y revisa los cuatro artefactos existentes de `project-continuity-model`. No toca `synced-code-views`, sus actas, `NEXT-SESSION.md`, código o pruebas. La implementación futura requiere un encargo nuevo y acuerdo de escritor único antes de tocar superficies compartidas.

Fuera de alcance: multi-sprite, vocabulario nuevo, CodeMirror, conversión bloques↔texto, plantillas/ayuda API1 (tarea 3.3 de synced-code-views), ampliación de otros contextos, nube, despliegue, cambios de CI y aceptación escolar sin participantes. Este cambio no sustituye ADR-011 ni reordena el encargo vigente de code-studio-worker.

## Encargo vigente

Implementación autorizada posteriormente por el usuario, con escritor único
code-studio-worker y coordinación de solo lectura. La revisión documental anterior
se conserva como antecedente; esta autorización permite las fuentes, pruebas y
actas descritas por el plan. No incluye commit, archivo ni push.
