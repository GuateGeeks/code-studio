# Proposal

## Why

E4 ya integra funcionalmente seis contextos, pero la revisión transversal muestra exceso de administración sobre la creación, resultado reducido, selección de consulta inconsistente y lenguaje técnico en recorridos iniciales. Se propone convertir esa base en un editor educativo coherente para principiantes con docente, siguiendo las referencias Scratch/MakeCode solicitadas.

## What Changes

- Reorganizar cabecera, autoría, resultado y consulta con presupuesto verificable de espacio en escritorio y acceso directo en estrecho.
- Hacer explícitos contexto/documento editado, origen del resultado, alcance de Ejecutar/Detener y selección real de consulta.
- Presentar bloques, propiedades, errores y cobertura propios con español comprensible; conservar detalle técnico y contratos serializados.
- Integrar orientación E3, estados de recuperación y original Scratch sin prometer funciones o actividades inexistentes.
- Consolidar el sistema visual y sus estados en la fuente de diseño existente, con teclado, reflujo, foco y recursos locales.
- Resolver los ocho hallazgos E4-01…08 con evidencia visual y funcional. Este turno prepara la propuesta y el prompt para Claude Opus; no implementa el rediseño.

## Capabilities

### New Capabilities

- `workspace-presentation`: presentación e interacción común del espacio educativo: regiones, identidad de autoría/resultado, consulta, vocabulario y estados accesibles en los seis contextos.

### Modified Capabilities

Ninguna capacidad consolidada: `openspec list --specs --json` devuelve inventario vacío. Los contratos de integración existentes siguen en cambios sin archivar y se conservan como base; no se crea una nueva capacidad por contexto ni se archivan los anteriores.

## Impact

Principalmente `src/studio/index.html`, `style.css`, `contextual-workspace.mjs`, presentación de capacidades/documentos/recursos/diagnósticos y etiquetas propias de Blockly. Puede ajustar CSS del resultado propio si lo exige su legibilidad; no sustituye renderers ni expone internals upstream al shell. Afecta suites de espacios integrados, navegación, accesibilidad, persistencia, lenguajes, actividades, exportación y offline.

Fuentes: `docs/product/E4-CROSS-CONTEXT-REVIEW.md`, `e4-cross-context-evidence.json` y `VISUAL-REWORK-BRIEF.md`. La puerta web histórica aprobó 400 Node, 63 herramientas y 168 E2E. El contexto OpenSpec aún menciona SB3/3D/web como propuestas; las actas implementadas y la solicitud actual resuelven esa referencia desactualizada sin reescribir la historia.

Fuera de alcance: E5/E6, Sócrates, backend/cuentas/nube, nuevos motores/dependencias por conveniencia, formatos o permisos, nuevas actividades, sincronización bidireccional y edición nativa Scratch. Las observaciones humanas y físicas se registran por separado; no se atribuyen a las pruebas automatizadas.
