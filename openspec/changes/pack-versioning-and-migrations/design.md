# Design

## Context

Estado verificado al aplicar (corrige el borrador inicial, que suponía packs con igualdad exacta):

- **Locks de motores.** `document.locks` contiene `{blockly, ir, adapter, scratch, scratchAudio}`, viene de `project-catalog.json` (`tools/f1/build-project-catalog.mjs`) y `validateProject` lo compara por igualdad canónica (`project-format.mjs:85`). La prueba GG-PROJ-002 exige rechazar `blockly: 999.0.0` y aceptar las claves en cualquier orden.
- **Packs.** `capabilities.locks` declara `{id, version, sha256}`. `localPackCatalog` contiene varias versiones (score, assets, sb3), `latestPackVersions` fija las versiones de proyectos nuevos y `migrateCapabilities` aplica una migración de un salto (manifiesto o `localPackMigrations`) que solo renombra campos de configuración. `validateCapabilities` rechaza `apiVersion !== 1`.
- **Permisos.** `resolveOperationProfile` concede `operationPermissionGrants[id]` solo si `lock.version === '0.1.0'`. Los manifiestos 3D/web copian esa misma tabla en `permissions.operations` (forma parte de su hash).
- **Workspaces.** El 2D está en `authoring.blockly` (serialización anidada de Blockly). micro:bit, 3D y web guardan grafos planos `{version, nodes[{id,type,fields,inputs,next,x,y}], …}` en `capabilities.config[pack].workspace`.
- **Documentos textuales.** `runtime` es `{engine, version}` con igualdad exacta contra `textDocumentRuntimes`, y el valor se normaliza a la versión vigente al validar.
- **Interfaz.** «Actualizar packs» (`#update-packs`) llama a `migrateCapabilities(…, {id: 'gg.score', toVersion: '0.2.0'})`. `project.replaceAuthoring` ya ofrece un reemplazo atómico sin ejecución.

## Goals / Non-Goals

**Goals:** motores compatibles registrados; API de manifiesto por lista; permisos por `pack@versión`; migraciones encadenadas de configuración y bloques conservando IDs; API textual declarable; mensajes claros.

**Non-Goals:** cuarentena de packs desconocidos, retirar versiones, migración automática al abrir, cambiar bloques o comportamiento.

## Decisions

1. **Historial de motores como dato propio.** `src/contracts/engine-locks.mjs` exporta `engineLockHistory`, la lista de conjuntos de motores publicados (hoy, el vigente). `validateProject` acepta `document.locks` si coincide canónicamente con `catalog.locks` o con un elemento del historial. El historial es inyectable para pruebas (`{engineHistory}`). Al guardar, `createProject` sigue escribiendo `catalog.locks`. No hace falta tocar el build: cuando se actualice un motor, el conjunto anterior se añade al historial.
2. **Lista de API de manifiesto.** `supportedPackApiVersions = [1]` en `packs.mjs`. `block-language-contract` añadirá 2.
3. **Permisos por versión sin tocar hashes.** `operationPermissionGrantsByVersion` (`'gg.3d-basic@0.1.0'`, …) en `operations.mjs` es la fuente de `resolveOperationProfile`. `operationPermissionGrants[id]` se conserva para los manifiestos existentes, cuyo hash no cambia. Una prueba verifica que ambas tablas coinciden para cada versión instalada. Se descarta leer los permisos del manifiesto desde `operations.mjs` porque crearía un ciclo de módulos (los manifiestos importan `operations.mjs`).
4. **Migraciones encadenadas con transformación de bloques.** Un registro de migración admite, además de `rename` (configuración), `blocks: {types: {viejo: nuevo}, fields: {tipo: {VIEJO: NUEVO}}, inputs: {tipo: {VIEJO: NUEVO}}, values: {tipo: {CAMPO: {viejo: nuevo}}}}`. Las claves de `fields`, `inputs` y `values` usan el tipo nuevo.
   - `src/contracts/pack-migrations.mjs` (puro, sin Blockly) valida los registros, busca la cadena desde la versión declarada hasta la elegida y transforma tanto la serialización anidada de Blockly como los grafos planos.
   - Los IDs, posiciones, conexiones y valores no mapeados no cambian. Los tipos de bloque son únicos por pack, así que la transformación se aplica a todos los workspaces del proyecto.
   - `migrateCapabilities` pasa a recorrer la cadena, sin cambiar su firma.
5. **Migración de proyecto.** `src/project-migration.mjs` exporta:
   - `availablePackUpdates(capabilities)`: las actualizaciones hacia `latestPackVersions` con cadena registrada;
   - `migrateProject(document, updates, {catalog})`: aplica configuración y bloques sobre una copia, valida con `validateProject` y devuelve `{document, summary}`. Si algo falla, lanza la excepción sin tocar el original.

   La shell usa `project.replaceAuthoring` (atómico, sin ejecución) y muestra el resumen en `#packs-error`/estado. `#update-packs` conserva su ID y aplica todas las actualizaciones disponibles; hoy el resultado es el mismo que antes (score 0.1→0.2).
6. **API textual latente en GGPROJ v4.** `runtime` admite `api` (`api1`/`api2`) solo en GGPROJ v4, que tiene la misma estructura que v3. `createProject` escribe v4 únicamente si algún documento declara `api`, siguiendo el patrón actual de elegir la versión según el contenido. `resolveTextDocumentApi(document, capabilities)` devuelve la declarada o la del contexto: 2D → `api1`; documento referenciado por 3D/web → `api2`. `textDocumentRuntimes` añade `compatibleVersions`.
7. **Mensajes.** Conservan las subcadenas que fijan las pruebas («no instalado», «runtime o versión») y añaden qué falta y la acción: «ábrelo con una versión más reciente de Code Studio».

## Risks / Trade-offs

- [La transformación de bloques corrompe un workspace] → pruebas de propiedad: workspace sin bloques afectados = idéntico; con bloques afectados = solo cambian los campos declarados; IDs y posiciones intactos; resultado validado antes de aplicar.
- [Dos tablas de permisos divergen] → prueba de igualdad por versión instalada.
- [GGPROJ v4 en una release anterior] → no se escribe hasta que un contenido lo requiera (no ocurre en este cambio).

## Migration Plan

Sin migración de datos: ningún proyecto existente cambia al abrir. Orden: contratos puros con pruebas Node → integración en `validateProject`/`migrateCapabilities` → acción de la shell → E2E de actualización y rechazo → `test:affected` y una `test:full`. Reversión: revertir el commit del cambio.

## Open Questions

- Cuarentena de packs desconocidos (diferida): ¿se necesita en aulas con releases mezcladas? Se evaluará con el despliegue real (Exp. 2).
