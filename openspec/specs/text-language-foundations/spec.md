# text-language-foundations Specification

## Purpose

Ofrecer documentos JavaScript y Python y su ejecución inicial en motores aislados, con límites de tiempo, memoria y Stop que conservan la autoría. Origen: cambio `phase-2-language-foundations` (archivado).

## Requirements

### Requirement: GG-TEXT-001 Independent persisted documents
Studio MUST conservar documentos JS/Python independientes con IDs/runtime fijado en GGPROJ2/autosave y mantener esquema1 exacto para proyectos sin textos. MUST validar atómicamente límites/recursos/selección sin perder proyecto activo.
#### Scenario: Versioned round trip
- **WHEN** se crean y editan documentos, guarda y reabre
- **THEN** conserva fuentes/IDs/selección y bloques originales sin persistir estado ejecutado

### Requirement: GG-TEXT-002 Real isolated interpreters
Studio MUST ejecutar JS en QuickJS y Python en Pyodide locales, en workers de origen textual separado. MUST NOT evaluar fuentes de alumno en shell/runner2D ni ampliar sus CSP.
#### Scenario: Actual program
- **WHEN** se ejecuta secuencia/repetición/condición/variables/movimiento en cada lenguaje
- **THEN** resultado del adaptador coincide con el subconjunto equivalente de bloques
#### Scenario: Syntax-only preflight
- **WHEN** se prepara un documento JavaScript
- **THEN** se valida como módulo ECMAScript2022 sin importaciones mediante parser local sin evaluar fuente, y QuickJS ejecuta la misma fuente únicamente tras activar la escena

### Requirement: GG-TEXT-003 Preparation and cancellation
Studio MUST preparar runtime/sintaxis antes de reemplazar escena y descartar candidatos/solicitudes antiguos. Stop MUST invalidar y terminar worker/frame aun con bucle infinito, conservando autoría.
#### Scenario: Failed or stale preparation
- **WHEN** falta runtime, hay sintaxis inválida o Stop sustituye preparación
- **THEN** no se ejecuta código tardío ni se pierde proyecto/escena vigente

### Requirement: GG-TEXT-004 Bounded bridge and source diagnostics
Studio MUST validar canal por sesión/revisión/documento/secuencia y operaciones/tamaño/cuotas. MUST mostrar logs/errores acotados y seleccionar línea existente del documento cuando se conoce.
#### Scenario: Unsafe or stale message
- **WHEN** llega RPC desconocido/excesivo o mensaje de ejecución anterior
- **THEN** se rechaza sin mutar escena ni contaminar consola actual
#### Scenario: Terminal error after log quota
- **WHEN** un programa agota su cupo de logs y luego falla
- **THEN** se conserva el error terminal y su ubicación, manteniendo solo100registros recientes en consola y1024unidades UTF16 por mensaje
#### Scenario: Source error
- **WHEN** el intérprete devuelve error con ubicación válida
- **THEN** consola permite enfocar esa línea sin atribuir un bloque ficticio
