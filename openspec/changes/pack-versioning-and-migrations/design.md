# Design

## Context

Véanse `proposal.md`, ADR-005 (packs declarativos y GGPROJ3) y ADR-011. Hoy `validateProject` compara `canonical(document.locks)` con `catalog.locks`; `resolveOperationProfile` concede operaciones solo a `lock.version==='0.1.0'`; `validateDocument` exige `runtime.engine` y `runtime.version` idénticos a `textDocumentRuntimes`. Los manifiestos ya incluyen `migrations:[]` y existe `migrateCapabilities` para la configuración de score 0.1→0.2, lo que demuestra el patrón a escala pequeña.

## Goals / Non-Goals

**Goals:** abrir cualquier proyecto válido anterior; permitir que los packs evolucionen; separar versión de API textual de versión de intérprete; migraciones auditables.

**Non-Goals:** catálogo remoto, packs de terceros, migrar código escrito por el alumno, cambiar bloques o API (cambios posteriores).

## Decisions

1. **GGPROJ v4 con locks declarados.** `locks` deja de compararse por igualdad y pasa a ser la declaración del proyecto: `{id, version, sha256}` por pack. El hash identifica la versión revisada instalada, no un requisito de igualdad con el catálogo vigente.
2. **Migración hacia adelante, no multiinstalación por defecto.** Cada versión nueva de un pack declara migraciones puras desde las anteriores (configuración y workspace Blockly). Se instala una sola versión vigente por pack; mantener varias versiones instaladas solo se usa si una migración es imposible. Alternativa descartada: instalar todas las versiones históricas, que multiplica bloques duplicados en el editor y el peso offline.
3. **Migraciones como datos más funciones puras revisadas.** Las funciones viven en `src/` junto al pack (código revisado, nunca del proyecto). Entrada y salida se validan con el esquema de cada versión. Una migración de workspace MUST conservar IDs de bloques; si un bloque cambia de tipo, el ID se mantiene.
4. **Permisos derivados del lock.** Los grants se calculan con la versión declarada y la tabla de permisos de esa versión instalada (o migrada), eliminando la constante `0.1.0`.
5. **API textual separada del intérprete.** `runtime` pasa a `{engine, version, api}`; `version` se valida contra un rango declarado por el target textual. Documentos sin `api` se asignan por su contexto: 2D → `api1`, 3D/web → `api2`.
6. **Pack desconocido = contexto en cuarentena.** Se conservan sus bytes originales en el documento y se reescriben tal cual al guardar.

## Risks / Trade-offs

- [Una migración altera comportamiento] → fixtures de proyectos reales de cada versión; ejecutar antes y después y comparar estado final y trazas con el corpus existente.
- [Crece la superficie de mantenimiento] → cada migración tiene pruebas Node propias y se retira solo con una decisión explícita.
- [El hash deja de proteger contra manipulación] → el hash sigue verificando que la versión declarada corresponde a datos revisados instalados; un hash desconocido activa la cuarentena del punto 6.

## Migration Plan

1. Fixtures de GGPROJ v1–v3 y de autosave tomados de las puertas anteriores. 2. Lectura v4 y escritura v4 manteniendo lectura v1–v3. 3. Permisos por versión. 4. `runtime.api` y rangos. 5. Pack de prueba `@0.2.0` sin cambios visibles para demostrar la migración extremo a extremo. Reversión: restaurar los archivos del cambio; los GGPROJ v4 guardados durante la prueba no se abren en la versión anterior, por lo que no se publica release hasta la puerta completa.

## Open Questions

- ¿Se permite abrir un GGPROJ v4 en una release anterior en modo de solo lectura? Propuesta: no; se informa la versión mínima requerida.
