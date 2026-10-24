# Proposal

## Why

Para que Code Studio evolucione (vocabulario nuevo, API legible de [ADR-011](../../../docs/adr/011-contrato-de-lenguaje-y-vistas-sincronizadas.md), actualizaciones de Blockly, Scratch o de los intérpretes) sin dejar sin abrir los proyectos guardados por estudiantes. Al aplicar este cambio, el código mostró que **el catálogo de packs ya es multiversión**: `gg.score` 0.1.0/0.2.0, `gg.assets` y `gg.sb3` 0.1.0/0.2.0 conviven, y `migrateCapabilities` aplica migraciones explícitas. Las rigideces reales son otras:

1. **Versiones de motores por igualdad exacta.** `document.locks` (`blockly`, `ir`, `adapter`, `scratch`, `scratchAudio`) debe ser idéntico al catálogo vigente (`src/project-format.mjs:85`). Actualizar Blockly o Scratch invalidaría todos los proyectos.
2. **`apiVersion` de manifiesto fijado a 1** (`src/contracts/packs.mjs`). El manifiesto `apiVersion: 2` de `block-language-contract` sería rechazado.
3. **Permisos de operaciones 3D/web concedidos solo a `version==='0.1.0'`** (`src/contracts/operations.mjs`). Una versión nueva de esos packs no tendría operaciones.
4. **Las migraciones de pack solo renombran campos de configuración.** No pueden transformar bloques (tipos, campos) conservando IDs, que es lo que exige migrar los packs a la tabla de lenguaje. Además, «Actualizar packs» está fijado a `gg.score` 0.2.0.
5. **Documentos textuales con versión exacta del intérprete** (`src/text-documents.mjs:26`) y sin versión de API declarada.

## What Changes

- **Historial de motores compatibles**: un proyecto se acepta si sus locks de motores coinciden con el conjunto vigente o con uno anterior registrado. Una versión desconocida sigue rechazándose. Al guardar se escriben los locks vigentes.
- **Versiones de API de manifiesto admitidas** como lista declarada (hoy `[1]`), ampliable por cambios posteriores.
- **Permisos por `pack@versión`** declarados en datos, sin constantes en el código.
- **Migraciones de proyecto**: cada migración de pack puede transformar configuración y bloques (renombrar tipos y campos, mapear valores) conservando IDs. Se aplican en cadena, de forma atómica y sin ejecutar, con un resumen. «Actualizar packs» ofrece todas las actualizaciones disponibles.
- **Documentos textuales con API declarada**: `runtime.api` opcional (GGPROJ v4, que solo se escribe cuando el contenido lo requiere) y versiones de intérprete compatibles en lugar de igualdad exacta.
- **Mensajes claros** cuando un proyecto requiere un pack, una versión, un motor o un formato no instalados: qué falta y que se necesita una versión más reciente de Code Studio. El proyecto abierto no cambia.

## Capabilities

### New Capabilities

- `project-compatibility`: apertura, migración y conservación de proyectos guardados cuando evolucionan motores, packs, APIs textuales e intérpretes.

### Modified Capabilities

Ninguna en este delta. Este cambio flexibiliza reglas de `project-persistence` y `packs-lessons-offline` (igualdad exacta de locks, `apiVersion` 1); ADR-011 registra la sustitución.

## Impact

`src/project-format.mjs`, `src/contracts/packs.mjs`, `src/packs/catalog.mjs`, `src/contracts/operations.mjs`, `src/text-documents.mjs`, construcción del catálogo de proyecto (`tools/f1/build-project-catalog.mjs`) y la acción «Actualizar packs» de la shell. Afecta pruebas de formato, packs, persistencia y actividades. No cambia motores, renderers, orígenes ni el comportamiento de ningún bloque.

**Depende de:** nada. Lo usan `block-language-contract` y los cambios de vocabulario.

**Diferido, con motivo:** abrir parcialmente un proyecto con un pack desconocido (cuarentena del contexto). Exige preservar datos no validados a través de toda la autoría y la shell, y hoy el caso real (proyecto de una release más nueva) también cambia de formato, así que la cuarentena no lo resolvería. Queda como pregunta abierta. También quedan fuera: retirar versiones de packs del catálogo, migrar código escrito por el alumno y servicios remotos de catálogo.
