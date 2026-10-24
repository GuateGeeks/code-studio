# Capacidades locales experimentales

Este SDK describe únicamente lo implementado en F3. Los documentos GGPROJ no conceden permiso para descargar o ejecutar código de extensiones.

Cada pack bajo src/packs contiene un manifiesto de datos: id, version, apiVersion, dependencies, configSchema/defaults, permisos y contribuciones editor/traducción. src/packs/catalog.mjs fija versiones y hashes SHA256 sobre canonicalPackData(manifest). Las pruebas comprueban esos hashes contra los bytes semánticos reales. La modificación de un manifiesto requiere una versión revisada y un lock nuevo.

El editor consume createContributions de forma genérica. gg.sprites aporta el vocabulario 2D; gg.score aporta gg_score_set, gg_score_change y gg_score_value. Score baja a operaciones IR0 de variable con ID global estable gg-pack-score. Ambos generadores y adaptadores reutilizan ese IR; el núcleo no contiene una rama por ID de pack.

El proyecto configura packs por createCapabilities, valida antes de abrir y migra explícitamente mediante migrateCapabilities. La configuración de score0.2 usa variableId, label e initialValue; score0.1 usa initial. La migración es reversible para estas configuraciones conocidas. No hay sustitución automática de un lock desconocido por el último disponible.

El anfitrión puede crear createCapabilityBroker({capabilities,call,getContext}) y obtener client(packId).invoke(method,args). El principal se captura al crear el cliente y no viaja en un campo elegido por el programa. El runner vuelve a verificar la política del proyecto. El cliente de score está limitado a su variable declarada; mover sprites desde él produce error antes de llamar al adaptador.

Para el alumno siguen disponibles las operaciones reales GG.scene.get, GG.sprite.get/move/setPosition, GG.variables.get/set, GG.events.emit y GG.wait. Los programas de eventos usan GG.program.configure, GG.events.onStart/onKey/onClick/onMessage/onClone/run y ctx. No existe un servicio GG.score; los bloques de puntuación usan el mismo almacenamiento nativo de variables. Las operaciones asíncronas requieren await y los mutadores sin contexto se revocan dentro de un programa de eventos.

Los packs de distribución offline son una lista distinta: studio-core, scratch-2d, javascript-quickjs, python-stdlib, microbit-compiler y microbit-simulator. Un lock de capacidad no equivale a un runtime descargado. Preparar recursos verifica cada origen y no ejecuta el proyecto.

Para contribuir, añadir datos al pack y catálogo, comprobar colisiones/esquemas/permisos/recursos, generar su lock y ejecutar pruebas del lowering, los backends afectados y persistencia. Un nuevo permiso privilegiado o nueva operación de runtime exige un contrato y adaptador propios antes de anunciarla.
