# F6 · Contextos 3D y aplicaciones web

Fecha: 22 de octubre de 2026. Estado: **software F6 consolidado mediante la puerta conjunta F6+F7**. La aceptación física, humana y escolar conserva sus pendientes.

El cambio OpenSpec `phase-6-capability-contexts` se definió antes del código y aprobó validación estricta de 12 cambios (`artifacts/f6-spec-before-implementation.log`). El [ADR009](../adr/009-contextos-capacidades.md) registra las fronteras y decisiones. F7 se definió posteriormente como cambio independiente. La puerta conjunta verificó los dos cortes sobre una misma referencia estable; los resultados focales y los intentos completos fallidos permanecen separados.

## Implementación y compatibilidad

El registro local de capacidades resuelve proveedores, operaciones/eventos tipados, validadores, contribuciones, recursos y exportadores revisados. Un proyecto selecciona locks y configuración; no instala código ni obtiene autoridad desde funciones o URLs del archivo. `gg.3d-basic` funciona sin `gg.sprites`. `gg.3d-advanced` y `gg.webapps` añaden sus propias capacidades. Los manifests históricos mantienen sus hashes.

IR1 representa contexto/documento, variables escalares tipadas, eventos, operaciones y control común. El graph plano conserva IDs, conexiones y layout. El editor contextual genera JavaScript/Python de solo lectura con mapas de origen. Los bloques ejecutan JavaScript efímero en QuickJS; las copias textuales son documentos independientes. API2 deriva sus bindings del vocabulario instalado. Python ejecuta Pyodide y proxies JSON; no recibe acceso directo al DOM ni a Babylon.

El host captura autoridad y sesión/revisión/documento por invocación. La fuente libre no amplía principal, grants ni contexto mediante un mensaje. Los featureSet validan autoría y los grants restringen llamadas: basic rechaza entidades, jerarquía, rotación y escala avanzadas y no puede llamar setLight, setParent o setTransform sin advanced. Stop cancela callbacks, listeners, candidatos, esperas y mensajes pendientes. Los diagnósticos conservan contexto y bloque de origen; editar invalida las referencias anteriores.

El coordinador prepara recursos antes de sus consumidores y restaura borradores ante fallos. La proyección de ejecución valida el contexto elegido sin convertir borradores de otros contextos en un bloqueo. La configuración referencia documentos textuales existentes; no guarda una segunda copia mutable de su fuente.

La base GGPROJ3 y su ZIP STORE se conservan; no se introduce GGPROJ4. GGPROJ1/2, IR0 y API1 mantienen sus rutas anteriores. La política recursos2 se habilita explícitamente con versiones nuevas de packs. Sus bindings usan propietario cualificado por contexto/documento/target y roles revisados. La promoción desde recursos1 conserva bytes, IDs, orden, centros y resolución. Scratch recibe una proyección validada de recursos1; el merge de ediciones 2D conserva los recursos/bindings de 3D y web. No hay downgrade implícito que descarte datos. Los recursos compartidos de `gg.assets 0.2` conservan bloques y permisos 2D después de activar 3D.

## Proveedores y ejecución aislada

Babylon core/loaders 9.32.0 se instala y sirve localmente. El pack básico aporta esfera, cámara y movimiento; el avanzado añade caja, suelo, grupos, modelos GLB, luces, jerarquía, transformaciones locales/mundo y colisión cinemática nativa. La escena activa se reemplaza después de preparar y validar el candidato.

El proveedor web construye formulario, input etiquetado, botón, lista, texto, grupo e imagen nativos desde un árbol declarativo. No interpreta HTML/CSS libre. Los eventos click/input/submit son DTOs cerrados; submit no navega. El iframe permite el evento nativo de formulario y conserva CSP `form-action 'none'`. Los inputs numéricos se validan antes de mutar para evitar que el navegador convierta silenciosamente un valor inválido a vacío.

Los seis roles son shell, runner 2D, simulador, lenguaje, scene3d y webapp. El texto del alumno permanece en el origen textual; los renderers usan scripts locales. No se relajan las CSP anteriores para incorporar 3D/web. Cohort2 describe seis roles y conserva lector/rollback de cohort1, de cuatro roles.

| Uso | Puertos anteriores | scene3d / webapp |
|---|---|---|
| Pruebas | 4173–4176 | 4181 / 4182 |
| Vista manual | 4183–4186 | 4191 / 4192 |
| Rendimiento | 4193–4196 | 4201 / 4202 |
| Offline | 4177–4180 | 4188 / 4189 |

## Límites del corte

| Área | Límite |
|---|---|
| Proyecto | 2 MiB; GGPROJ3 conserva ZIP STORE |
| Configuración | 64 KiB agregados con presupuesto de proveedor nuevo instalado; perfiles anteriores conservan 16 KiB y cuotas individuales |
| Graph / IR1 | 128 nodos, 16 hats/scripts, profundidad 8, graph de 32 KiB, 16 variables escalares |
| API2 | 16 handlers, 64 invocaciones, evento de 8 KiB, RPC JSON de 16 KiB, 20 eventos/s y 1024 eventos por ejecución |
| Datos/control | Números finitos ±1 000 000; espera de 0 a 60 s; repetición de 0 a 1000 |
| Escena | 32 entidades, jerarquía de profundidad 8; rotaciones y cámara en grados; intensidad de luces de 0 a 10 |
| Web | 64 nodos, profundidad 8, listas de 128 elementos, textos/valores de 1024 caracteres |
| Recursos | 32 assets, 128 bindings; medios de 128 KiB, originales SB3 de 256 KiB y GLB de 512 KiB |
| Imágenes / audio | 1024 por lado, 1 MP individual y 4 MP agregados, incluidos PNG de GLB; WAV PCM16 mono/estéreo de 8–48 kHz y hasta 2 s, además del límite de bytes |
| GLB estático | 32 nodos, 64 primitivas, 20 000 vértices, 60 000 índices y 8 imágenes PNG |
| Exportación | ZIP de hasta 128 MiB y archivo de hasta 64 MiB; servidor HTTP local con inventario y rutas cerrados |

Los GLB rechazan URI externas/data, compresión/codecs, extensiones, skins, animaciones y morphs. Sus rangos, accesors, índices, valores finitos, bytes y PNG embebidos se validan antes del loader. Los inputs numéricos aceptan vacío o decimal finito dentro del dominio; rechazan hexadecimal, espacios, Infinity, plus inicial y punto decimal final. No se persiste estado mutable de ejecución.

## Evidencia focal

Los grupos siguientes se solapan y pertenecen a referencias de desarrollo distintas. No se suman para construir una suite completa.

| Artefacto | Resultado observado y alcance |
|---|---|
| `f6-node-final.tap` / `f6-tools-final.tap` | 377/377 Node en 12,34 s y 48/48 herramientas en 6,82 s, antes de las correcciones posteriores del harness |
| `f6-models-focused.tap` | 81/81 modelos y regresiones de persistencia, autoría, recursos y packs |
| `f6-shared-assets-focused.tap` | 29/29 focales posteriores: cuotas, documentos por contexto, promoción/merge, featureSet, iniciales tipados y recursos compartidos |
| `f6-shared-assets-case.tap` | F5 → promoción 3D → ejecución 2D conserva IR/grants; VM headless cambia disfraz y mueve x = 5; no acredita render/audio |
| `f6-capability-sdk-focused.tap` | 50/50 SDK/engines y preservación de API1 |
| `f6-basic-grants-focal.tap` | 1/1 basic frente a operaciones advanced |
| `f6-dom-scopes.log` / `f6-channel-payloads.log` | 14/14 DOM, límites, scopes y mutación atómica; 5/5 DTOs y separación de autoridad |
| `f6-contexts-final.log` | 5/5 en 1,1 min: tres backends, formularios con Enter en escritorio/móvil, edición real → código → diagnóstico → selección y proyecto 3D sin proveedor 2D |
| `f6-render-focal.log` | 1/1: GLB con textura, jerarquía, render, luces, Stop y guardar/reabrir en escritorio |
| `f6-advanced-remaining.log` | Aprobaron móvil y colisión real antes de fallar el negativo; el grupo completo no se presenta como aprobado |
| `f6-negative-focal.log` | El negativo corregido pasó 1/1: GLB malformado, propietario ajeno y operaciones falsificadas conservan autoría y renderer |
| `f6-offline-navigation-fixed.log` | 1/1 en 1,7 min: visita fría de seis roles con Chromium cerrado y todos los servidores detenidos |
| `f6-language-group-final.log` | 24/24 en 5,0 min: intérpretes, corpus compartido, desktop/móvil, copia/reapertura, espera superior a 20 s y Stop |
| `f6-packs-group-final.log` | 9/9 en 1,5 min después de corregir URLs del harness al cohort activo |
| `f6-standalone-focused.tap` | 21/21 construcción, servidor, integridad y límites del paquete autónomo |
| `f6-standalone-browser.log` | 1/1 en 51,7 s: cuatro ZIP desde GUI, fuera del workspace, Studio detenido y red limitada a sus tres orígenes |
| `f7-export-focal.log` / `f7-export-focal.json` | Reproducción posterior con fuente/licencia: 1/1, test de 60,9 s; cuatro exportaciones ejecutadas sin Studio |

Los nombres de la tabla se resuelven dentro de `artifacts/`. Las consultas CodeGraph previas y sincronizaciones están en `f6-*-query.json`, `f6-models-codegraph-before.json` y `f6-codegraph-sync.log`. La validación de cierre, sincronización final y preservación upstream corresponden a la puerta consolidada, no a la suma de estos focales.

La visita fría probó 2D, QuickJS, Pyodide, simulación/HEX PXT, SB3 con PNG y contextos 3D/web creados por primera vez offline, con copias Python y roundtrip GGPROJ recursos2. Rechazó una actualización corrupta conservando selección y comprobó rollback. La compatibilidad del lector cohort1 tiene pruebas Node propias; no se presenta como otra visita fría de cuatro roles sobre este mismo build.

El flyout permanente que tapaba los bloques se sustituyó por categorías cerradas. También se corrigieron vida útil de PyProxy, selección de iframe y supuestos del harness sobre estados de render/snapshot. Sus fallos históricos se conservan; los focales identifican la reproducción posterior de cada caso. No se forzaron clics a través del flyout ni se relajaron guards de sesión/revisión.

## Exportación autónoma y fuente local

Cada paquete incluye autoría inicial, recursos del contexto/documento, programa, runtime seleccionado, hashes, avisos y servidor HTTP local. JavaScript incluye QuickJS; Python incluye Pyodide, stdlib, worker y bindings reales. Los insumos proceden del cohort activo verificado, sin mezclar archivos latest. Se necesita Node para servir la carpeta por HTTP; no se promete ejecución por file://.

La prueba descarga las cuatro combinaciones scene3d/webapp y JavaScript/Python, las descomprime fuera del workspace, detiene los seis servicios Studio y ejecuta las carpetas en viewport móvil. Verifica esfera x = 1, formulario/lista, Stop y ausencia de peticiones externas a los tres orígenes exportados. El fallo previo de shaders se corrigió con publicPath basado en import.meta.url, sin cambiar red ni CSP.

La repetición F7 comprueba además los seis materiales autenticados, enlace local a fuente, manifiesto, licencia, avisos, SBOM y SHA-256 de la descarga. Incluye un solo source.tar.gz por paquete y no registró peticiones prohibidas. La identidad de cada archivo se consulta en su manifiesto y standalone-evidence.json; no se incrusta en documentos contenidos por el archivo fuente.

| Paquete focal F7 | ZIP, bytes | Arranque observado, ms |
|---|---:|---:|
| scene3d JavaScript | 30 170 718 | 1 137,4 |
| scene3d Python | 42 299 691 | 4 276,8 |
| webapp JavaScript | 26 656 020 | 713,2 |
| webapp Python | 38 784 994 | 4 286,3 |

Son observaciones locales WSL/Chromium de una muestra por paquete, no percentiles ni presupuesto escolar. Los heaps que acompaña el JSON son del renderer observado; no representan RAM total de Studio, workers, WASM o sistema operativo. La evidencia completa está en `artifacts/f7-export-focal-results/standalone-contexts-GG-EXP-1369f-tricted-to-exported-origins/standalone-evidence.json`. La metodología de rendimiento F7 tiene su informe separado.

## Tres puertas F6 fallidas y correcciones

Ninguno de estos intentos avanzó la referencia de impacto ni constituye aceptación completa.

| Intento | Tramo aprobado antes del fallo | Causa y corrección posterior |
|---|---|---|
| Primero | 377 Node, 48 herramientas, 3 smoke y 32 regresiones | Navegación directa de transferencia bloqueada por SW. Se añadió únicamente el redirect de navegación shell /latest y /device-transfer.html hacia el documento inmutable, conservando nonce; sin excepción para recursos/workers/otros roles. Node de navegación 5/5 y transferencia 4/4 posteriores |
| Segundo | 378 Node, 48 herramientas, 3 smoke y 36 regresiones | Tres suites aún buscaban el nombre anterior de Ejecutar documento 2D. Se corrigieron los selectores; el grupo textual posterior pasó 24/24 |
| Tercero | 378 Node, 48 herramientas, 3 smoke y 56 regresiones | Dos imports absolutos /app/ del harness de packs fueron rechazados por cohort. Se cambiaron a URLs relativas al documento inmutable; no se amplió el SW. El grupo de packs posterior pasó 9/9 |

Los fallos/traces están en `artifacts/cuts/phase-6-capability-contexts/failed-transfer-entry/`, `failed-text-button-label/` y `failed-unversioned-test-import/`.

Durante el grupo de transferencia apareció además una carrera del harness offline: pedía snapshot durante commit-compatibility con revisión anterior. Se espera el estado visible Proyecto Scratch activo antes de leer. La reproducción fría posterior pasó 1/1; los guards de sesión/revisión no cambiaron.

## Intento conjunto F6+F7 fallido, separado de los tres intentos F6

El primer intento conjunto posterior aprobó 390 Node, 62 herramientas, 3 smoke y 81 regresiones antes de fallar el matcher de navegación de project-persistence.spec.mjs:343. El harness esperaba /?session=..., mientras el runner navegaba bajo /releases/<cohort>/. Se reprodujo sin cambios y se corrigió sólo el matcher al releaseBase activo, sin ampliar el SW ni alterar scopes. El intento falló y no avanzó la referencia de impacto.

El focal concreto pasó 1/1 y el grupo de persistencia posterior pasó **8/8 en 1,0 min** (artifacts/f7-persistence-fixed.log). El intento fallido conserva reportes/traces en artifacts/cuts/phase-7-accessibility-release/failed-legacy-runner-route/. La puerta conjunta aprobada siguiente es otra ejecución; no convierte aquel intento en aprobado.

## Puerta consolidada F6+F7

La puerta estable aprobó todos los pasos y avanzó la referencia de contenido.

- Estado: aprobado; software consolidado por puerta conjunta F6+F7.
- Referencia/cohort y fecha: 2026-10-22T19:21:38.272Z → 2026-10-22T19:45:02.793Z (UTC); referencia certificada en baseline.json.
- Node: 390/390, 12,02 s.
- Herramientas: 62/62, 15,14 s.
- Tres smoke: 3/3, cero fallos/omisiones/reintentos, 24,08 s.
- Regresión completa: 125/125, cero fallos/omisiones/reintentos, 1348,75 s.
- OpenSpec estricto: validación estricta --all aprobada; paso specs exitCode 0.
- Build incremental/etapas reutilizadas: incremental sin --force aprobado, 2,72 s; consultar reutilización por etapa en su reporte.
- CodeGraph y preservación upstream: CodeGraph sincronizado antes de consolidar (artifacts/f7-codegraph-final.log); upstream-preservation aprobado y tres commits/diffs/locks preservados.
- Reportes inmutables y referencia de impacto: artifacts/test-runs/full-results.json, full-plan.json, full-integration.tap, full-tools.tap, full-smoke-browser.json y artifacts/browser-results.json. baselineWritten=true; referencia avanzada en artifacts/test-runs/baseline.json.

El software F6 queda consolidado por esta puerta conjunta y enlaza el [acta F7](../phase-7/RESULTS.md). Los tres intentos F6 y el intento conjunto fallido permanecen separados. No existió una puerta F6 independiente aprobada.

## Pendientes externos y alcance de aceptación

El corte no acredita placa física micro:bit, funcionamiento autónomo de firmware en hardware, lector de pantalla con evaluación humana, piloto docente/aula ni rendimiento en equipos escolares. Esas evidencias conservan su estado pendiente y no se deducen de simulación, tests Node o Chromium local.

La preparación docente offline, recuperación sin cuenta, fuente distribuida y accesibilidad automatizada se documentan en F7 con sus resultados reales. El software no requiere integración académica ni telemetría de actividad por defecto. La implementación de esos flujos no equivale a una validación realizada por un docente o un alumno.

La [evidencia estructurada](software-evidence.json) conserva la puerta estable, preservación y medidas locales. Los reportes completos aprobados se archivaron en artifacts/cuts/phase-7-accessibility-release/approved-full/; la actualización documental y su paquete final se explican en el [acta F7](../phase-7/RESULTS.md).
