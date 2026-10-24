# Tasks

## 1. Línea base

- [x] 1.1 Consultar CodeGraph sobre `validateProject`, `validateCapabilities`, `migrateCapabilities`, `resolveOperationProfile` y `validateTextDocuments`; registrar consumidores en artefactos.

## 2. Contratos

- [x] 2.1 Historial de motores (`engine-locks.mjs`) aceptado por `validateProject`, inyectable en pruebas; motor desconocido rechazado con mensaje claro; orden de claves irrelevante.
- [x] 2.2 `supportedPackApiVersions` y permisos por `pack@versión` (`operationPermissionGrantsByVersion`), con prueba de igualdad frente a los manifiestos instalados.
- [x] 2.3 `pack-migrations.mjs`: validación de registros, búsqueda de cadena y transformación de bloques en Blockly anidado y grafos planos conservando IDs; pruebas Node de propiedad.
- [x] 2.4 `migrateCapabilities` encadenado y `project-migration.mjs` (`availablePackUpdates`, `migrateProject` atómico con resumen); pruebas con un catálogo sintético que renombra un bloque.
- [x] 2.5 `runtime.api` en GGPROJ v4 latente, `compatibleVersions` de intérpretes y `resolveTextDocumentApi`; pruebas de v2/v3 sin cambios y de v4 con API.
- [x] 2.6 Mensajes claros para formato, pack, versión, motor e intérprete no instalados, conservando las subcadenas existentes.

## 3. Interfaz

- [x] 3.1 `#update-packs` aplica todas las actualizaciones disponibles mediante `migrateProject` y `replaceAuthoring`, sin ejecución, con resumen; comportamiento idéntico para score 0.1→0.2.

## 4. Verificación y documentación

- [x] 4.1 `test:quick`, `test:affected` con rutas reales y una `test:full`.
- [x] 4.2 Actualizar `docs/phase-1/GGPROJ.md` (v4, motores compatibles, migraciones) y el acta de resultados con evidencia y límites.
