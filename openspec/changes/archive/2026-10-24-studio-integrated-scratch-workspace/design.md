# Design

## Context

Ver `proposal.md`. El controlador de recursos posee importación, cobertura, original y copia GG; el shell posee ejecución y Stop. La composición E4 ya integra 2D y micro:bit. Scratch conserva una sección larga con todos sus controles. El reporte existente distingue `gg-editable`, `vm-compatible` y `unsupported`; no es un editor gráfico nativo del SB3.

## Goals / Non-Goals

**Goals:** conservar instancias y contratos, situar revisión de original junto al resultado, hacer visibles estados y feedback, comprobar los tres tipos de cobertura y el paso explícito a 2D.

**Non-Goals:** nuevo editor Scratch, conversión adicional, ampliar operaciones o extensiones, cambiar formato o motores, nuevas actividades, integración visual 3D/web o acreditación educativa.

## Decisions

### Presentación sin nueva autoridad

Mover los controles existentes de transporte y consulta conservando IDs y listeners. Mantener importación y cobertura en el área principal de solo lectura; las operaciones y razones del reporte son datos textuales, nunca HTML ni autoridad de ejecución. La cobertura identifica objetos por nombre cuando el candidato validado lo ofrece y conserva IDs técnicos en un detalle secundario. Se descarta representar bloques GG como si fueran el original Scratch.

Original, copia y lectura de ejecución viven en la consulta lateral. La copia sigue usando la traducción completa existente y cambia explícitamente al contexto 2D. No se mueve el iframe del renderer, no se recrean sesiones al consultar y no se introducen APIs de motor en el shell.

### Feedback compartido, una sola instancia

El mismo grupo de estado, error y cancelación de recursos se proyecta junto a importación en Scratch y vuelve a la biblioteca en otros contextos. No duplicar controles ni listeners. Si al cancelar se oculta su botón enfocado, devolver foco a la importación pertinente. Mantener validación y epochs actuales; la composición no decide si un archivo puede ejecutarse.

### Direction contract

THESIS: revisar un original, predecir con el docente, ejecutar y comparar; crear una copia editable solo mediante acción explícita.

OWN-WORLD: conservar PRODUCT y DESIGN, verde, superficies claras, bordes finos, sistema tipográfico y controles nativos existentes. Modo Operate para principiantes con docente.

STORY: elegir SB3, leer compatibilidad, anticipar su comportamiento, ejecutar/detener, consultar o crear una copia; mantener separado original y trabajo 2D.

FIRST VIEWPORT: importación y cobertura a la izquierda, transporte arriba, escenario y consulta derecha; dock desplazable y pie bajo ambas columnas. En estrecho usar orden natural y enlaces de retorno.

FORM: extensión local precisa del patrón fijado por el usuario. Construcción code-led; aplica la excepción de Impeccable `new-work.md §3`: «Never run the script for a local extension or a precisely specified narrow request; shape those directly.» Sin torneo, semilla, comp o assets nuevos; no cambiar el mundo visual.

FINISH: revisar capturas 1440/1280, estrecho y ventana de usuario; detector una vez, revisor fresco y documenter. Verificar controles reales, hash original, cobertura, copia, error, Stop, teclado, zoom y regresión completa.

## Risks / Trade-offs

- [Se confunde cobertura con editor nativo] → rótulo de solo lectura, instrucciones sobre copia y ninguna edición falsa del original.
- [El reporte es largo o técnico] → resumen claro, área desplazable, nombres cuando están disponibles e IDs en detalles, sin ocultar motivos de bloqueo.
- [Cambios de panel pierden foco o reinician trabajo] → conservar nodos e IDs, navegación enfocada y pruebas de sesión/hash.
- [Alturas del escenario y dock desbordan el pie] → composición acotada con mínimo que contiene ambas áreas; comprobar rectángulos reales.
- [Pruebas antiguas esperan controles antes visibles] → actualizar recorridos según visibilidad real antes de full, sin force ni mayor timeout.

## Migration Plan

Sin migración de datos ni dependencias. Snapshot previo y puerta micro:bit preservados en artefactos. Nueva release local aislada; anteriores disponibles. Revertir solo fuentes propias del incremento si fuera necesario, sin limpiar upstreams.
