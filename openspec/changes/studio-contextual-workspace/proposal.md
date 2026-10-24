# Proposal

## Why

E1 conecta la primera creación 2D, pero las herramientas restantes siguen formando una página extensa sin indicar a qué contexto pertenecen. Principiantes con docente necesitan reconocer qué editan, qué resultado observan y dónde buscar ayuda sin perder sus borradores.

## What Changes

- Navegación común entre edición, resultado y ayuda, con acciones específicas de cada contexto.
- Documentos independientes junto al editor, con destino de ejecución explícito y acceso desde código derivado.
- Inspector y biblioteca pertinentes al contexto; diagnóstico compartido y preparación docente accesibles.
- Identidad del último resultado separada del contexto seleccionado: navegar no ejecuta ni reemplaza el resultado.
- Verificación en todos los contextos, teclado, zoom, persistencia y offline.
- Ordenación de lecturas de recursos para que autosave y apertura no se cancelen entre sí; carrera detectada durante la regresión 3D.
- Fuera de alcance: esquema educativo E3, cuentas, integración Sócrates, cambios de motores o permisos.

## Capabilities

### New Capabilities

- `studio-contextual-workspace`: composición y navegación contextual de autoría, resultado y ayuda.

### Modified Capabilities

Ninguna especificación consolidada: el inventario está vacío; los cambios F0–F7 y E1 permanecen sin archivar y conservan sus contratos.

## Impact

Shell DOM/CSS y controladores de presentación, selección de contexto y documentos; pruebas Playwright y documentación de producto. Sin dependencias nuevas ni cambios GGPROJ, intérpretes o seis orígenes. Snapshot E2 conserva el árbol previo, incluidas fuentes no rastreadas.
