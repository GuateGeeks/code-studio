# Proposal

## Why

El repositorio del producto no tiene commits: `git log` responde «does not have any commits yet» y los 28 elementos de primer nivel están sin seguimiento. No hay trazabilidad, recuperación ni forma de relacionar una evidencia con una versión, que es el hallazgo P0-6 de la evaluación Code.org.

Además, 22 cambios OpenSpec están completos sin archivar y `openspec/specs/` está vacío. Cada cambio nuevo se valida contra deltas acumulados en vez de contra especificaciones consolidadas (hallazgo H12 del [plan de maduración](../../../docs/product/FEATURE-MATURATION-PLAN.md)). Con cinco cambios nuevos propuestos y unos 25 más previstos, conviene consolidar antes de implementar.

## What Changes

- **Commit inicial** del árbol actual, con las exclusiones vigentes de `.gitignore` (`artifacts/` ocupa 47 GB y no se versiona). Se registra la huella SHA-256 de `src/` en el mensaje y en el acta.
- **Etiquetas** `v0.1.0-alpha.1` y `e4-visual-rework` sobre ese commit, que corresponde a la puerta completa del 24/10.
- **Archivo de los 22 cambios completos** con `openspec archive`, consolidando sus capacidades en `openspec/specs/` (26 capacidades sin colisiones de nombre).
- **Enlaces conservados**: se actualizan las rutas de los enlaces Markdown a los cambios archivados (84 enlaces en 22 documentos) y la prueba de herramientas que las referencia. Se añade un índice de rutas antiguas → nuevas para las evidencias JSON, que no se modifican.
- Los cinco cambios propuestos (`pack-versioning-and-migrations`, `block-language-contract`, `synced-code-views`, este y `test-gate-scaling`) **no se archivan**.

## Capabilities

### New Capabilities

- `repository-baseline`: trazabilidad de versiones del producto, consolidación de especificaciones y conservación de enlaces y evidencia histórica.

### Modified Capabilities

Ninguna. Las 26 capacidades de los cambios archivados pasan a `openspec/specs/` sin modificar sus requisitos.

## Impact

`.git` (commit y etiquetas), `openspec/changes/` → `openspec/changes/archive/`, `openspec/specs/`, rutas de enlaces en documentos y `tests/tools/test-impact.test.mjs`. No cambia código de producto, pruebas de producto, upstreams ni release.

**Requiere autorización explícita del usuario al aplicar** para el commit, las etiquetas y el archivado (decisión D8 del plan). No se publica ningún remoto.

Fuera de alcance: crear remoto o publicar, reescribir actas históricas o sus conteos, versionar `artifacts/`.
