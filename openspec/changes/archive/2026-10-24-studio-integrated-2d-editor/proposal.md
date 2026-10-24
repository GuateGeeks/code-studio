# Proposal

## Why

El recorrido 2D todavía se presenta como una página larga: ejecutar, observar y pedir ayuda requiere desplazarse entre secciones. E4 integra ese recorrido para principiantes con docente, tomando la proximidad entre programa, resultado y herramientas de Scratch y MakeCode como referencia funcional.

## What Changes

- Barra compacta de proyecto y transporte de ejecución común, sin controles duplicados.
- Programa Blockly y escenario contiguos; herramientas en un panel de consulta desplazable con navegación directa a actividad, propiedades, código, recursos y diagnósticos.
- En ancho reducido o zoom, orden de documento y navegación con foco conservan todas las acciones.
- Copia textual 2D independiente dentro del mismo espacio; conservación de actividad E3, guardado, apertura y demás contextos.

## Capabilities

### New Capabilities

- `integrated-2d-workspace`: composición y navegación del ciclo editar, ejecutar, observar y consultar en el editor 2D.

### Modified Capabilities

Ninguna capacidad consolidada; los cortes E1–E3 mantienen sus contratos y evidencia sin archivar.

## Impact

HTML/CSS y composición del shell, navegación contextual y pruebas de navegador. Sin dependencias nuevas, cambios de motor, formato GGPROJ, permisos ni fusión de los seis orígenes. Primer corte 2D; no rediseña los editores micro:bit, SB3, 3D o web. Revisión docente, dispositivos escolares, hardware y Sócrates permanecen fuera de esta implementación.
