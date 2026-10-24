# Resultados: compatibilidad de proyectos y migraciones de packs

24 de octubre de 2026, Guatemala. Cambio OpenSpec `pack-versioning-and-migrations` (Ola 0 del [plan de maduración](../product/FEATURE-MATURATION-PLAN.md), prerrequisito de [ADR-011](../adr/011-contrato-de-lenguaje-y-vistas-sincronizadas.md)).

## Corrección del diseño al aplicar

El borrador suponía que los packs se fijaban por igualdad exacta. El código mostró otra situación, y los artefactos del cambio se reescribieron antes de implementar:

- El catálogo de packs ya era multiversión y la migración ya era explícita.
- Lo que se exigía por igualdad exacta eran los **locks de motores** (`blockly`, `ir`, `adapter`, `scratch`, `scratchAudio`).
- Las otras rigideces reales eran: la `apiVersion` 1 fija, los permisos 3D/web atados a `0.1.0`, unas migraciones que solo renombraban configuración, «Actualizar packs» limitado a `gg.score` y la versión exacta del intérprete en los documentos textuales.

La migración automática al abrir se descartó en favor del modelo existente, explícito y conservador. Abrir parcialmente un proyecto con un pack desconocido (cuarentena) queda diferido, con su motivo registrado en la propuesta.

## Qué cambió

- **Motores compatibles:** `src/contracts/engine-locks.mjs` (`currentEngineLocks`, `engineLockHistory`) es la única fuente del builder del catálogo y de la validación. Acepta conjuntos anteriores registrados y rechaza los desconocidos nombrando el motor.
- **API de manifiesto:** `supportedPackApiVersions = [1]`.
- **Permisos:** `operationPermissionGrantsByVersion` (`pack@versión`). La tabla por ID se conserva porque está embebida en manifiestos con hash congelado, y una prueba comprueba que ambas coinciden.
- **Migraciones:** `src/contracts/pack-migrations.mjs` valida los registros (datos), encuentra la cadena más corta sobre versiones instaladas y transforma tipos, campos, entradas y valores de bloques en Blockly anidado y en grafos planos sin tocar IDs, posiciones ni conexiones. `migrateCapabilities` recorre la cadena.
- **Migración de proyecto:** `src/project-migration.mjs` (`availablePackUpdates`, `migrateProject` atómico con resumen, `describeMigrationSummary`).
- **Interfaz:** «Actualizar packs» aplica todas las actualizaciones disponibles mediante `replaceAuthoring` (atómico, sin ejecución), con aviso. «Revertir» restaura la instantánea completa del proyecto.
- **Documentos textuales:** `runtime.api` (`api1`/`api2`) solo en GGPROJ v4, que se escribe únicamente si algún documento declara su API. Se añaden `textDocumentCompatibleVersions` y `resolveTextDocumentApi`.
- **Mensajes:** formato más nuevo, pack o versión ausente, motor e intérprete no admitidos explican qué falta y que hace falta una versión más reciente.
- **Documentación:** `docs/phase-1/GGPROJ.md`, sección «Compatibilidad y migraciones».

## Pruebas

- Nuevas: `tests/integration/project-compatibility.test.mjs`, 7 pruebas GG-COMPAT-001…006.
- Node: 407/407 (400 previas + 7). Herramientas: 63/63.
- Foco de navegador: `packs-lessons` y `project-persistence`, 17/17 (5,4 min), incluida la actualización y reversión real de `gg.score` 0.1→0.2→0.1 con el workspace idéntico.
- Puerta completa: **aprobada en el tercer intento** (`npm run test:full`, 2026-10-24T15:07:56Z–15:48:54Z, `artifacts/pack-versioning/full-3.log`): 407 Node, 63 herramientas, 3 smoke y **177 E2E**, OpenSpec estricto 31/31 y preservación de los tres upstreams. Fuentes estables; la referencia de impacto avanzó (`baselineWritten: true`).

| Intento | Resultado | Causa y resolución |
|---|---|---|
| 1 (09:12–10:12Z) | 176 ✓ · 1 ✗ `GG-SB3-005` (tiempo agotado a los 240 s en el fixture 12/20) | Carga externa de otra sesión de Claude (`socrates.app`: grabaciones con Chromium, `tsc`, Vite), con una media de 25–31 en 16 núcleos. La corrida fue más lenta que la puerta del rework: mediana 1,13× y percentil 90 2,05×, también en suites que no usan packs ni el formato. La prueba ya consumía el 73 % de su presupuesto (174 s). Repetida sola con carga < 10, aprobó en 2,8 min (2,9 min en el rework). No se tocó la prueba ni los procesos ajenos. |
| 2 (10:38–11:29Z) | 176 ✓ · 1 ✗ `integrated-2d-workspace` «consulta estrecha y copia textual» («Session stopped») | **Carrera preexistente en la prueba:** el primer `snapshot` de `expect.poll` podía llegar mientras el `reset()` de la propia ejecución rechazaba las peticiones pendientes. Reproducida sin este cambio (`git stash`): 2 fallos en 24 ejecuciones; con el cambio, 3 en 17; mismo error. Con autorización del usuario se corrigió solo esa prueba: espera la etiqueta «· activo», que aparece después del `reset`, antes de leer la escena. La aserción `x = 9` no cambia. Después pasó 24/24 seguidas. |
| 3 (15:07–15:48Z) | **Aprobada** | — |

El patrón `expect.poll(snapshot)` aparece en unas 85 llamadas de 20 suites. Solo se vio fallar en esta prueba; el endurecimiento general se propone para `test-gate-scaling`.

## Límites

- No hay todavía una versión de pack que transforme bloques en el catálogo real; esa ruta se prueba con registros inyectados en Node. La primera migración real llegará con `block-language-contract`.
- `engineLockHistory` solo contiene el conjunto vigente; la aceptación de conjuntos anteriores se prueba con un historial inyectado.
- No se probó abrir proyectos GGPROJ v4 en una release anterior: se rechazan por formato, como se diseñó.
