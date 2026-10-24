# Diseño F6

## Extensión instalada
El kernel resuelve registros importados estáticamente y revisados: proveedores de contexto, operaciones/eventos tipados, validadores, tipos de entidades, políticas de recursos, editores y exportadores. Un archivo solo selecciona locks/config; no aporta funciones, URLs de módulos o autoridad. Infraestructura genérica primero, pack independiente después. El perfil no requiere gg.sprites cuando tiene otro proveedor real. Los aliases2D existentes conservan su comportamiento.

Los participantes de autoría declaran contexto/dependencias. Recursos se preparan antes de consumidores. Proyección de ejecución incluye únicamente contexto y dependencias; un borrador ajeno no bloquea el target. Configuración agregada64KiB para perfiles nuevos con presupuesto instalado, conservando16KiB y límites individuales de perfiles anteriores. Fuentes libres viven en textDocuments; el config contextual referencia IDs, sin otra copia mutable de código.

## IR y SDK
IR0/API1 siguen cerradas. IR1 añade contexto/documento, variables tipadas, eventos, llamadas registradas, control de flujo común y expresiones tipadas. El BlockGraph plano conserva IDs/raíces/conexiones/layout. Un editor genérico consume contribuciones instaladas; añadir un pack no añade ramas al formato base ni al editor central.

La generación produce JS/Python readonly con sourceMap. Los bloques ejecutan JS efímero en QuickJS; no hay intérprete de control de flujo privilegiado adicional. API2 se activa por perfil instalado. Los engines construyen GG.scene3d/GG.web y sus ctx desde el mismo registro. Callbacks API2 reciben ctx y evento JSON acotado. Python usa proxies en worker de módulo, sin Element/Event/Babylon/DOM.

El host captura sesión/revisión/contexto/documento/principal/target por invocación. El worker aporta invocationId/operationId/args; no concede autoridad. Tras configurar callbacks, mutadores globales no evaden ctx. Stop cancela candidatos, eventos, RPC, esperas y workers. Diagnósticos de fuente efímera vuelven al bloque solo mientras coincidan autoría y generación.

## Recursos
GGPROJ3/STORE/base authoring y locks históricos permanecen. gg.assets0.2 habilita política2 con bindings cualificados por contexto/documento/target y roles revisados. Promoción explícita de v1 conserva bytes/IDs/orden/centros/resolución. El adaptador Scratch recibe proyección validada v1, nunca modelos3D. No se descarta información mediante downgrade implícito. Nuevas versiones de packs dependientes se añaden; manifests anteriores no cambian.

Contenedor2MiB;32assets; medios128KiB y cuotas de imagen/WAV anteriores; Model/glb hasta512KiB. Bindings≤128 con propietarios y propiedades cerrados. GLB estático: cabeceras/chunks/rangos/accessors/índices/valores finitos y cuotas antes del loader; hasta32nodos,64primitivas,20000vértices/60000índices y8imágenesPNG. Prohibir URI externas/data, compresión/codecs, extensiones, skins, animaciones y morphs inicialmente. PNG embebido requiere validación y decode limitado. No basta la extensión.glb.

## Babylon y DOM
Babylon9.32.0 core/loaders fijados, locales. Pack básico demuestra esfera/cámara/movimiento. Autoría avanzada añade grupos/parentesco acíclico, transformación local/mundo, caja/suelo/GLB y luces. Hasta32entidades, profundidad8, poses finitas acotadas. Escena right-handed antes de cargar GLB. El loader prepara AssetContainer/escena/engine separados antes de publicar. Colisiones mediante moveWithCollisions/ellipsoid real; no se presenta como motor de física. Snapshots son DTOs sin objetos del motor y no se guardan como autoría.

El proveedor web construye elementos nativos de un árbol declarativo≤64nodos/profundidad8: grupos, formulario, texto, input con etiqueta, botón, lista e imagen. Atributos/estilos enumerados, textContent y recursos validados; sin HTML libre, URLs CSS ni selectores. Eventos click/input/submit se capturan como JSON, submit no navega. Solo el iframe webapp declara allow-forms para que el navegador produzca el evento nativo submit; el listener cancela su acción y CSP form-action 'none' permanece sin cambios, bloqueando navegación incluso ante un fallo del listener. Listas/strings/tasas tienen límites y Stop retira listeners/invocaciones.

## Orígenes y offline
Se añaden scene3d y webapp separados del shell, runner, simulador y lenguaje. Ambos son renderers de código propio; texto del usuario permanece en el origen de lenguajes. CSP de nuevos renderers script-src self, sin eval/CDN. Políticas existentes no se relajan.

Puertos normales scene3d4181/webapp4182, manual4191/4192, rendimiento4201/4202, offline4188/4189. Conservar4173–4176/4177–4180/4183–4186/4193–4196 existentes. Cohort2 seis roles, lector/rollback de cohort1 cuatro roles. Un código anterior que no comprende un proyecto nuevo debe rechazarlo sin reducir autoría.

## Exportación
ZIP/carpeta autónoma del contexto seleccionado: autoría inicial, recursos necesarios, programa, runtime seleccionado completo, hashes, avisos y README/servidor HTTP local. JS incluye QuickJS; Python Pyodide/stdlib/worker y bindings reales. Los archivos corresponden al cohort activo verificado, sin mezclar latest. Config/orígenes se adaptan al servidor exportado preservando separación; declarar Node/HTTP y límites offline. GGPROJ conserva roundtrip de autoría; el paquete autónomo es artefacto ejecutable.

Pruebas descomprimen fuera del workspace, detienen Studio y ejecutan sin internet. Comparar esfera y formulario/lista entre bloques/JS/Python, jerarquía/GLB/luces/colisión, guardar/reabrir, Source maps/Stop/mensajes tardíos, segunda visita fría de seis roles y compatibilidad legacy. Medir bytes/arranque/latencia/RAM localmente; no atribuir resultados a equipos escolares ausentes.

Primarias consultadas: Babylon documentación de NPM/glTF/LoadAssetContainerAsync y colisiones; KhronosglTF2; Pyodide314.0.7 worker/registerJsModule. Versiones instaladas se verificarán antes de compilar. F7 conserva accesibilidad integral, release reproducible, notices/SBOM/fuentes y evidencia humana/escolar como trabajo posterior.
