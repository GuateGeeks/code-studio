# ADR-001: Scratch VM y Scratch Render para el corte vertical 2D

**Fecha:** 22 de octubre de 2026.  
**Estado:** aceptada para F1 y activada por el [acta de cierre F0](../phase-0/CLOSEOUT.md).  
**Puerta:** G1, limitada al corpus GG y recursos declarados.

## Contexto

El [plan](../../../docs/architecture/IMPLEMENTATION-PLAN.md) exige decidir si el motor reutilizado puede ejecutar programas GG sin la GUI de Scratch, recibir cambios por una API propia y ser detenido incluso cuando un ejecutor no coopera. Reconstruir simultáneamente scheduler, clones, audio y renderer introduciría otra semántica que habría que probar.

El spike carga la VM y el renderer del checkout Xcratch fijado en [procedencia](../phase-0/provenance.json). La [integración visible](../phase-0/BROWSER-RESULTS.md), el [corpus con eventos y clones](../phase-0/CORPUS-SIMULATOR-RESULTS.md), [audio y estado](../phase-0/AUDIO-STATE-RESULTS.md) y los [bindings sobre Blockly editable](../phase-0/BINDINGS-EDITOR-RESULTS.md) muestran ejecución real y coherencia entre VM, consulta GG y píxeles. El acta incorpora la ampliación del corpus y las medidas de estabilidad/rendimiento; los informes anteriores por sí solos no cierran esa ampliación de F0.

## Decisión

Usar Scratch VM + Scratch Render detrás del adaptador 2D de Studio para F1. La VM es propietaria del estado mutable de ejecución; Blockly y GG actúan sobre ella mediante contratos propios. El shell no carga Scratch GUI. La autoría conserva el estado inicial y los IDs de origen; ejecutar y detener no convierte automáticamente el estado final de la VM en autoría.

G1 se acepta únicamente para construir el corte F1 con un sprite y el corpus mínimo acordado: secuencia, repetición, condiciones, variables locales/globales, espera, teclado/clic, scripts concurrentes, mensajes con espera, clones, cambio de disfraz, audio, diagnóstico y Stop. La aceptación requiere la evidencia ejecutada enlazada en el acta. No promete compatibilidad general SB3, listas, efectos, proyectos ajenos ni equivalencia JavaScript/Python.

La ruta dinámica recibe IR v0 validada con recursos locales registrados. No acepta archivos Scratch arbitrarios ni URLs de extensiones. La importación SB3 y el corpus de 20 proyectos pertenecen a F5. Se conserva la prohibición de descargar y ejecutar extensiones solo porque un proyecto las mencione.

No construir un segundo motor nativo durante F1. Si la evidencia obliga a cambiar de backend, evaluar primero renderer independiente con scheduler GG mínimo y, después, PixiJS, siguiendo G1. La interfaz del adaptador y el corpus permiten comparar esa sustitución.

## Consecuencias

- Se reutilizan scheduler, targets, clones, audio y renderizado, con un solo modelo de ejecución y mapas de origen para diagnóstico.
- El adaptador debe aislar tipos e internals de Scratch. Extraer paquetes de producción desde `spikes/` es trabajo de F1; las APIs del laboratorio no se publican como estables.
- Tamaño de descarga, arranque, memoria, latencia y 100 sprites se registran con el perfil de medición. Chromium con software WebGL en WSL no representa por sí solo un equipo escolar. Una desviación queda visible, con tratamiento explícito en el acta.
- El upstream exige revisión y lockfile fijados, receta reproducible y preservación de modificaciones previas. Una futura distribución no puede depender de las carpetas hermanas de esta máquina.
- La intención open source no resuelve la distribución: siguen pendientes licencia del producto, avisos, SBOM, acceso a fuentes y revisión individual de assets. El plan propone AGPL-3.0-only para la distribución integrada; este ADR no cambia licencias ni atribuye esa licencia a todos los recursos.

## Evidencia y criterios para reabrir

Los contratos [scratch-adapter](../../openspec/changes/phase-0-integration-foundations/specs/scratch-adapter/spec.md) y [block-program](../../openspec/changes/phase-0-integration-foundations/specs/block-program/spec.md) son la referencia verificable. Los [criterios de entrada](../phase-0/PHASE-1-ENTRY.md) y el acta determinan la corrida de cierre y sus límites.

Reabrir si una operación obligatoria no puede ejecutarse o detenerse preservando autoría; si GG requiere duplicar estado mutable; si ejecutar sin GUI exige descarga arbitraria o evaluación dinámica en el runner 2D; si una regresión bloquea recuperación tras Stop; o si el perfil escolar acordado incumple un presupuesto que no puede resolverse razonablemente dentro del adaptador. Una nueva capacidad o cambio sustancial de upstream requiere repetir las pruebas afectadas, sin atribuirle automáticamente la aprobación de este corte.
