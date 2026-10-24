# Spec Delta

## Purpose

Que cada evidencia y cada release se puedan relacionar con una versión exacta del producto, y que los cambios nuevos se validen contra especificaciones consolidadas sin perder la historia.

## ADDED Requirements

### Requirement: Versión trazable

El estado del producto con la última puerta completa aprobada SHALL corresponder a un commit identificable, etiquetado como `v0.1.0-alpha.1` y `e4-visual-rework`. La huella SHA-256 de `src/` registrada en el acta MUST coincidir con la del árbol de ese commit. Los artefactos generados y las dependencias instaladas MUST NOT versionarse.

#### Scenario: Verificar la versión de una evidencia
- **WHEN** se calcula la huella de `src/` en el commit etiquetado `e4-visual-rework`
- **THEN** coincide con la registrada en el acta, y `artifacts/` y `node_modules/` no forman parte del commit

### Requirement: Especificaciones consolidadas

Los cambios OpenSpec completos SHALL archivarse y sus capacidades MUST quedar en `openspec/specs/` con sus requisitos sin modificar. La validación estricta SHALL aprobar las especificaciones consolidadas y los cambios activos. Los cambios propuestos sin implementar MUST NOT archivarse.

#### Scenario: Validación tras consolidar
- **WHEN** se ejecuta la validación estricta después del archivado
- **THEN** aprueban todas las capacidades consolidadas y los cambios activos, y los cinco cambios propuestos siguen en `openspec/changes/`

### Requirement: Historia y enlaces conservados

Archivar MUST NOT modificar el contenido, los conteos ni las conclusiones de actas, resultados o evidencias. Los enlaces Markdown a cambios archivados SHALL seguir resolviendo. Las referencias dentro de evidencias JSON MUST conservarse tal cual, con un índice que relacione cada ruta antigua con la nueva.

#### Scenario: Enlace desde un acta histórica
- **WHEN** se sigue desde un acta F0–F7 o E1–E4 el enlace a su cambio OpenSpec
- **THEN** el enlace abre el cambio archivado y el texto del acta solo difiere en la ruta del enlace

#### Scenario: Ruta en una evidencia JSON
- **WHEN** una evidencia JSON nombra la ruta original de un cambio
- **THEN** la evidencia no cambia y el índice de archivo indica la ruta nueva
