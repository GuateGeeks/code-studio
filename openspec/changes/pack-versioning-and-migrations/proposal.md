# Proposal

## Why

GGPROJ solo abre un proyecto si sus locks de packs son idénticos al catálogo (`src/project-format.mjs:85`), los permisos de operaciones se conceden únicamente a `version==='0.1.0'` (`src/contracts/operations.mjs`) y cada documento textual exige la versión exacta de su intérprete (`src/text-documents.mjs:26`). Con estas reglas, el primer bloque nuevo, la nueva API legible (`block-language-contract`) o una actualización de QuickJS/Pyodide dejarían sin abrir los proyectos guardados por estudiantes. Es el bloqueo técnico de todo el [plan de maduración](../../../docs/product/FEATURE-MATURATION-PLAN.md) (hallazgo H10) y de la decisión de producto [ADR-011](../../../docs/adr/011-contrato-de-lenguaje-y-vistas-sincronizadas.md).

## What Changes

- **GGPROJ v4**: el proyecto declara `packId@version` y la versión de API de cada documento textual; GGPROJ v1–v3 siguen abriéndose.
- **Catálogo multiversión**: el catálogo puede instalar varias versiones revisadas de un pack o declarar migraciones puras hacia adelante (`migrations` ya existe en los manifiestos y hoy está vacío).
- **Migración al abrir**: atómica, sin ejecución, con resumen visible y conservación de IDs de bloques; si falla, el proyecto vigente no cambia.
- **Permisos por versión declarada** en lugar de la constante `0.1.0`.
- **Documentos textuales con `runtime.api`** (API1, API2 y futuras) y rango compatible de versión del intérprete, en lugar de igualdad exacta.
- **Pack o versión desconocidos**: se conservan los datos, se bloquea solo el contexto afectado y se explica cómo recuperar.

## Capabilities

### New Capabilities

- `project-compatibility`: apertura, migración y conservación de proyectos guardados con versiones distintas de packs, APIs textuales e intérpretes.

### Modified Capabilities

Ninguna capacidad consolidada: `openspec/specs/` está vacío. Este cambio sustituye explícitamente la regla de igualdad exacta de locks de ADR-005 y la de versión exacta de intérprete de los documentos textuales; ADR-011 registra la sustitución.

## Impact

`src/project-format.mjs`, `src/project-archive.mjs`, `src/contracts/packs.mjs`, `src/contracts/operations.mjs`, `src/text-documents.mjs`, `src/packs/catalog.mjs`, autosave/recuperación y apertura de archivos. Afecta pruebas de persistencia, packs, recuperación, offline y exportación. No cambia motores, renderers, orígenes ni el comportamiento de ningún bloque existente.

Fuera de alcance: nuevos bloques, nueva API textual y vistas sincronizadas (cambios `block-language-contract` y `synced-code-views`), migración de código escrito por el alumno, servicios remotos de catálogo.
