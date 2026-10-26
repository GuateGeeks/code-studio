# Capacidades locales experimentales

Este SDK describe únicamente lo implementado en F3. Los documentos GGPROJ no conceden permiso para descargar o ejecutar código de extensiones.

Cada pack bajo src/packs contiene un manifiesto de datos: id, version, apiVersion, dependencies, configSchema/defaults, permisos y contribuciones editor/traducción. src/packs/catalog.mjs fija versiones y hashes SHA256 sobre canonicalPackData(manifest). Las pruebas comprueban esos hashes contra los bytes semánticos reales. La modificación de un manifiesto requiere una versión revisada y un lock nuevo.

El editor consume createContributions de forma genérica. gg.sprites aporta el vocabulario 2D; gg.score aporta gg_score_set, gg_score_change y gg_score_value. Score baja a operaciones IR0 de variable con ID global estable gg-pack-score. Ambos generadores y adaptadores reutilizan ese IR; el núcleo no contiene una rama por ID de pack.

El proyecto configura packs por createCapabilities, valida antes de abrir y migra explícitamente mediante migrateCapabilities. La configuración de score0.2 usa variableId, label e initialValue; score0.1 usa initial. La migración es reversible para estas configuraciones conocidas. No hay sustitución automática de un lock desconocido por el último disponible.

El anfitrión puede crear createCapabilityBroker({capabilities,call,getContext}) y obtener client(packId).invoke(method,args). El principal se captura al crear el cliente y no viaja en un campo elegido por el programa. El runner vuelve a verificar la política del proyecto. El cliente de score está limitado a su variable declarada; mover sprites desde él produce error antes de llamar al adaptador.

## Tabla de lenguaje (ADR-011, `block-language-contract`)

Cada bloque que aporta un pack se declara en **una entrada de datos**: tipo de bloque, `kind` (`call`, `event`, `assign`, `change`, `read`, `control` o `value`), argumentos, objetivo (`target: 'sprite'` para métodos del objeto), forma JavaScript y Python (`js`/`python`, ambas o ninguna), plantilla Static TypeScript (`typescript`, micro:bit) y bajada por contexto (`lower`). Ejemplo: `{block: 'gg_move', kind: 'call', target: 'sprite', js: 'move', python: 'move', args: ['STEPS'], lower: {ir: 'move'}}` se lee `hero.move(10)`.

- **Dónde vive:** un manifiesto `apiVersion: 2` lleva su tabla en `language` y solo se acepta con una tabla válida. Las versiones ya publicadas (`apiVersion: 1`, congeladas por su hash) tienen su tabla en `src/packs/language-tables.mjs` por `pack@versión`. 3D y web derivan sus entradas de los descriptores de operaciones.
- **Reglas bloqueables** (`src/contracts/language-table.mjs`), comprobadas al instalar: una entrada por bloque, una forma canónica por bloque salvo `supersedes` explícito, identificadores válidos fuera de las palabras reservadas, plantillas que usan exactamente sus argumentos y bajada obligatoria. La cobertura exige que todo bloque instalado tenga entrada.
- **Lenguajes por contexto:** un contexto ofrece JavaScript y Python solo si todas las acciones y eventos de sus packs activos para esa bajada los declaran (`languageAvailability`). Si falta, la lectura y la copia muestran «no disponible» con el pack y la causa; las estructuras del núcleo nunca bloquean un lenguaje.

## API textual del alumno

La lectura derivada y las copias nuevas usan la **API v3**: espacios de nombres legibles (`hero.move(10)`, `onStart(() => { … })`, `sphere.move(1, 0, 0)`), sin `GG.`, `ctx`, `await` ni nombres `gg_*`. El origen del lenguaje la traduce a la API interna antes de ejecutar (API1 en 2D, API2 en 3D/web). `GG` sigue siendo el puente interno del sandbox: las copias API1/API2 guardadas se ejecutan con su texto intacto, y un documento en blanco todavía empieza en API1 hasta que `synced-code-views` decida su forma. No existe un servicio GG.score; los bloques de puntuación usan el almacenamiento nativo de variables, y los mutadores sin contexto se revocan dentro de un programa de eventos.

Los packs de distribución offline son una lista distinta: studio-core, scratch-2d, javascript-quickjs, python-stdlib, microbit-compiler y microbit-simulator. Un lock de capacidad no equivale a un runtime descargado. Preparar recursos verifica cada origen y no ejecuta el proyecto.

Para contribuir, añadir datos al pack y catálogo, comprobar colisiones/esquemas/permisos/recursos, generar su lock y ejecutar pruebas del lowering, los backends afectados y persistencia. Un nuevo permiso privilegiado o nueva operación de runtime exige un contrato y adaptador propios antes de anunciarla.
