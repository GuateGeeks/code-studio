# ADR-011: Contrato de lenguaje de bloques y vistas sincronizadas

**Fecha:** 24 de octubre de 2026. **Estado:** aceptada por el usuario como dirección de producto; packs/versiones y contrato de lenguaje implementados; vistas sincronizadas 2D implementadas y verificadas técnicamente en el working tree, con extensiones por contexto pendientes en `synced-code-views`.

## Contexto

Hasta ahora, el paso de bloques a texto se hacía con una lectura derivada de solo lectura y una copia JavaScript/Python independiente, sin sincronización inversa (ADR-004, ADR-007, `PRODUCT.md`). El código generado expone el puente del sandbox (`GG.`, `ctx`, `GG.ref`, auxiliares `gg_*`). Además, cada contexto convierte bloques en código de una forma distinta: 2D con 12 operaciones IR fijas y generadores escritos a mano, micro:bit con su propia tabla y 3D/web con una tabla de operaciones. Los manifiestos se fijan por igualdad exacta de lock (ADR-005).

La evaluación Code.org del 23/10 recomendaba validar con estudiantes antes de construir la conversión. MakeCode (bloques ↔ Static TypeScript/Python mediante una API anotada) y Code.org App Lab (Droplet: el texto es siempre la fuente y los bloques una vista de su sintaxis) se analizaron como referencias.

## Decisión

1. **Programa único con vistas sincronizadas (modelo MakeCode).** Bloques, JavaScript y Python son vistas del mismo programa dentro del subconjunto bloqueable. El texto se puede editar y volver a bloques conservando los cambios. El código fuera del subconjunto no se convierte: se explica la causa, con la línea, y se ofrece guardarlo como copia independiente. La copia independiente se mantiene para el código libre.
2. **API bloqueable declarada por los packs.** Cada bloque tiene una única entrada de datos con su presentación, sus argumentos tipados, su espacio de nombres, sus formas textuales y su bajada por contexto. El catálogo verifica las reglas bloqueables. Los packs aportan llamadas, valores, eventos con callback y enumeraciones; el control de flujo es del núcleo. Los packs siguen siendo solo datos revisados.
3. **API textual legible sin `GG` visible.** El código del estudiante usa espacios de nombres significativos (`hero.move`, `basic.showNumber`, `scene`, `app`). `GG` queda como puente interno del sandbox, envuelto por una capa de API versionada en el origen del lenguaje.
4. **Compatibilidad permanente.** Los proyectos declaran versiones de packs y de API textual (GGPROJ v4) y migran hacia adelante sin ejecutar. Las copias API1/API2 siguen ejecutándose con su texto intacto.

## Sustituye

- **ADR-004:** «la vista derivada se mantiene de solo lectura» y la copia como única vía a texto. Se conservan las semánticas de contexto por invocación, atomicidad de variables, revocación en Stop y dominio finito.
- **ADR-005:** la igualdad exacta de locks como condición de apertura y el manifiesto `apiVersion: 1` como único formato.
- **ADR-007:** el `switch` fijo a Static TypeScript, sustituido por plantillas declaradas. Se conservan los documentos independientes bloques/TypeScript existentes, la compilación en worker, la validación HEX y la transferencia USB.
- **ADR-009:** la forma generada `await ctx.<ruta>(args)` de API2 como texto por defecto.

## Se conserva

Sin ejecución automática al abrir, editar o cambiar de vista; un único Detener; seis orígenes aislados; uso offline y sin cuenta; los checks acreditan condiciones del programa y no comprensión; ningún pack ni proyecto aporta código ejecutable o remoto; el parser vive en el origen del lenguaje, nunca en la shell.

## Consecuencias

- **Positivas:** código legible que enseña JavaScript y Python reales; el paso a texto es gradual y reversible; un pack aporta todas sus vistas a la vez y deja de exigir cambios en el núcleo; la cobertura de la copia Scratch crece con la tabla; las actividades pueden verificar el programa desde cualquier vista.
- **Costes:**
  - Cada bloque nuevo exige formas JavaScript y Python canónicas y pruebas de ida y vuelta (generadas desde la tabla).
  - Hay un techo de subconjunto que el estudiante puede alcanzar.
  - El formato del texto se regenera al cambiar de vista.
  - Python requiere cargar Pyodide para volver a bloques.
  - La actividad E3 de transición necesita una nueva revisión.
- **Riesgo aceptado:** se avanza antes de la evidencia con estudiantes que pedía la evaluación. El Exp. 1 comparará el modo sincronizado con la copia independiente y puede cambiar cuál es el modo predeterminado, no el contrato.

## Evidencia y seguimiento

[Plan de maduración](../product/FEATURE-MATURATION-PLAN.md), [evaluación Code.org](../../../docs/architecture/EVALUACION-CODEORG-VS-GUATEGEEKS-2026-10-23.md) y los cambios OpenSpec citados. Este ADR pasa a «implementada» cuando `synced-code-views` apruebe su puerta completa.


### Seguimiento del 26/10/2026

El usuario confirmó conservar el subconjunto 2D instalado: while, forever y
funciones propias sin bloque se rechazan con causa y línea, sin ampliar IR0
ni runtimes. JavaScript/Acorn y Python/ast trabajan en el origen del lenguaje.
GGPROJ v5 conserva vista, borrador y restauración, sin reinterpretar v1–v4.
El [acta 2D](../engineering/SYNCED-CODE-VIEWS-2D-RESULTS.md) distingue evidencia
aprobada y controles pendientes. Este ADR no pasa todavía a implementación
completa: micro:bit, 3D/web y la nueva revisión de actividad siguen abiertos.
