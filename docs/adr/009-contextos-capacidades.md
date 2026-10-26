# ADR009 · Contextos, capacidades tipadas y recursos cualificados

Estado: decisión aceptada para la implementación de F6; verificación de cierre pendiente. Fecha: 22 de octubre de 2026. Cambio: `phase-6-capability-contexts`.

> **Sustitución parcial (25 de octubre de 2026):** [ADR-011](011-contrato-de-lenguaje-y-vistas-sincronizadas.md) sustituye la forma generada `await ctx.<ruta>(args)` de API2 como texto por defecto: la lectura y las copias nuevas de 3D y web usan la API v3 (`sphere.move(1, 0, 0)`), traducida a API2 en el origen del lenguaje. Los bloques siguen ejecutándose por API2 y las copias API2 guardadas se ejecutan sin cambios.

F6 amplía el producto con proveedores 3D y web sin convertir Scratch en un requisito de todos los contextos. La decisión conserva GGPROJ 1/2/3, IR0 y API1. La evidencia disponible y los pendientes se registran en [RESULTS de F6](../phase-6/RESULTS.md); este ADR no certifica la puerta completa del corte.

## Registro instalado y autoría

Los contextos, operaciones, eventos, validadores y contribuciones proceden de módulos locales revisados. Un proyecto selecciona locks y configuración; no registra funciones, módulos, URLs ni permisos nuevos. Los manifests y hashes históricos permanecen intactos. Las versiones nuevas de `gg.assets` y `gg.sb3` se seleccionan mediante una promoción explícita.

`gg.3d-basic` funciona con `gg.assets 0.2`, sin depender de `gg.sprites`. Sus declaraciones habilitan esfera, luz hemisférica, posición y cámara. `gg.3d-advanced` amplía la autoría con grupos, cajas, suelo, modelos, luz puntual, jerarquía, rotación y escala. El registro combina los `featureSet` instalados y ejecuta su validador de configuración; los grants de operaciones se comprueban por separado. Tener el vocabulario de una operación en el worker no concede permiso para ejecutarla.

Los participantes de autoría se inyectan con contexto y dependencias. El coordinador prepara recursos, textos y consumidores antes de publicar cambios; un fallo restaura los borradores completos. Los workspaces vivos pertenecen a sus editores. La configuración contextual referencia `selectedTextDocumentId` de la colección existente y no guarda otra copia mutable del código.

La proyección de ejecución toma el contexto y su cierre de dependencias, sin capturar borradores de otros contextos. Las contribuciones compartidas declaran `executionContexts`: así los bloques y permisos de recursos 2D sobreviven a una promoción a la política 2. Una contribución compartida no fabrica un contexto ausente.

## IR1 y API2

IR1 contiene contexto, documento, variables escalares tipadas, scripts de eventos, llamadas registradas, control común y expresiones tipadas. El graph plano conserva IDs de bloques, raíces, conexiones y disposición. Las contribuciones alimentan un editor genérico. Los campos numéricos admiten literales o referencias mediante una gramática cerrada; no se evalúa su texto.

La generación produce JavaScript/Python derivados y mapas de origen. Los bloques de estos contextos ejecutan JavaScript efímero en QuickJS. El control de flujo permanece en los motores textuales existentes; el host no añade un intérprete de IR privilegiado. Las fuentes independientes usan API2 de forma optativa, con `GG.context.configure`, registro de callbacks y activación. Las operaciones de `GG.scene3d`, `GG.web` y sus clientes `ctx` se construyen desde los mismos descriptores tipados.

El host captura sesión, revisión, contexto, documento, principal y target de cada invocación. El worker aporta un ID de invocación, una operación y argumentos JSON cerrados. El host conserva la intersección de grants seleccionados y esquemas instalados; resolver de nuevo metadatos no puede ampliar basic a advanced. Tras registrar callbacks, los mutadores globales no evaden el cliente contextual. Los eventos Python son datos JSON y proxies del worker, nunca objetos DOM o Babylon.

Stop revoca candidatos, listeners, invocaciones, esperas y workers. Los mensajes tardíos se rechazan por scope. Los diagnósticos de código efímero se vinculan al bloque únicamente mientras coincidan autoría y generación. Los snapshots del motor y los logs de ejecución no forman parte de la autoría.

## Recursos y motores

La política `gg-resources-v2` conserva GGPROJ3 y ZIP STORE. Los bindings tienen propietario `{contextId, documentId, targetId}`, rol, asset, nombre y propiedades cerradas. La promoción de recursos 1 a 2 conserva bytes, hashes, IDs, orden, centros y resolución. Scratch recibe una proyección validada de recursos 1. Editar esa proyección se combina con el catálogo completo sin borrar recursos 3D/web ni originales SB3. No existe un downgrade implícito que descarte esa autoría.

Los GLB se inspeccionan antes del loader: contenedor, rangos, accessors, índices, valores finitos y cuotas. Se bloquean URI, codecs, extensiones, animaciones, skins y morphs. Sus PNG embebidos también pasan validación limitada. Babylon core/loaders 9.32.0 se sirven localmente y preparan escena, engine y AssetContainer antes de reemplazar el activo. La escena usa coordenadas right-handed; las rotaciones de autoría y cámara se expresan en grados. Las colisiones usan las operaciones cinemáticas nativas, sin presentar un motor de física adicional.

El proveedor web construye un árbol de elementos nativos con etiquetas, atributos y estilos enumerados. Usa `textContent` y recursos validados; no acepta HTML/CSS libre, selectores o URLs arbitrarias. Los eventos click, input y submit se convierten en DTOs acotados. El iframe webapp permite formularios para producir submit nativo; el listener cancela la acción y CSP mantiene `form-action 'none'`. Los valores numéricos se validan antes de asignarlos al input para evitar su conversión silenciosa a vacío.

## Aislamiento y distribución

Se conservan shell, runner 2D, simulador y lenguaje, y se añaden scene3d y webapp como orígenes separados. Los renderers nuevos usan scripts locales sin eval ni CDN. El texto del usuario sigue ejecutándose exclusivamente en el origen textual. No se relajan las políticas anteriores ni se modifican motores upstream.

El cohort de versión 2 describe seis roles y mantiene lectura y rollback del cohort anterior de cuatro. La exportación prevista empaqueta autoría inicial, recursos necesarios, programa, runtime completo seleccionado, hashes, avisos y servidor HTTP local. Python requiere Pyodide, stdlib, worker y bindings; JavaScript requiere QuickJS. Los archivos deben proceder del mismo cohort verificado.

La exportación no se considera demostrada por generar un ZIP: exige descomprimir fuera del workspace, detener Studio y ejecutar sin internet. La prueba focal de cuatro paquetes JavaScript/Python para escena y web ya aprobó con Studio detenido y tráfico limitado a sus tres orígenes exportados. El fallo anterior de shaders se corrigió al fijar el publicPath de webpack respecto de import.meta.url. La visita fría de seis orígenes aprobó con Chromium reiniciado y los seis servidores apagados, incluida autoría nueva 3D/web Python y reapertura GGPROJ. La puerta full sigue pendiente de F6; las medidas escolares requieren su propio entorno. Accesibilidad integral, release reproducible y evidencia humana/escolar corresponden a F7 o a validación externa.

Referencias primarias consultadas: [paquetes npm de Babylon](https://doc.babylonjs.com/setup/frameworkPackages/npmSupport/), [importador glTF](https://doc.babylonjs.com/features/featuresDeepDive/importers/glTF/), [colisiones de Babylon](https://doc.babylonjs.com/features/featuresDeepDive/cameras/camera_collisions/) y [especificación glTF 2.0](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html).
