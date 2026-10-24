# Design

## Context

Ver la motivación en proposal.md. El workspace dispone de los checkouts Blockly, Xcratch y micro:bit, pero solo micro:bit tiene dependencias preparadas. El núcleo PXT se distribuye como dependencia npm compilada; su gitHead permite analizar la fuente exacta. Los cambios previos de micro:bit deben preservarse.

## Goals / Non-Goals

**Goals:** probar fronteras de integración mediante fixtures locales, conservar procedencia y producir informes repetibles. Configurar herramientas dentro del producto con versiones fijadas.

**Non-Goals:** entregar el editor visual completo, prometer equivalencia general de lenguajes o declarar que el firmware funciona en hardware sin evidencia física.

## Decisions

- Usar Node test runner para las pruebas headless: reduce dependencias y permite aislar motores en procesos de prueba separados.
- Leer el código de Xcratch del checkout e instalar sus dependencias con npm ci y sin lifecycle scripts. Construir solo los módulos que la VM necesite.
- Usar un subconjunto IR de inicio, repetición y movimiento. Los mapas de origen serán parte de la salida, no inferidos de nombres de bloques posteriores.
- Registrar y rechazar metadatos de extensiones externas antes de cargar proyectos en Xcratch.
- Aislar PXT en su propio proceso de prueba para contener sus namespaces/globales. Resolver paquetes y artefactos desde las versiones locales; cualquier acceso de red inesperado debe fallar.
- Medir Stop cooperativo en la VM real y terminación forzada en un worker. Las pruebas headless no demuestran aún aislamiento de origen ni comportamiento del navegador; conservar ese criterio como pendiente hasta su E2E.
- Indexar por separado Blockly, Xcratch, micro:bit, la fuente PXT exacta y el producto. Configuraciones de exclusión versionadas en el producto; cachés locales fuera de Git.

## Risks / Trade-offs

- Acoplamiento del loader de Xcratch a bundlers → detectar mediante ejecución real y contener cualquier compatibilidad en el harness de prueba.
- Cachés nativas PXT incompletas → reportar faltantes; no aceptar SKIP como firmware.
- Grafo estático incompleto ante importación dinámica → contrastar consultas con código y llamadas reales.
- Dependencias antiguas upstream → mantenerlas fijadas para caracterización y registrar su costo; no actualizar todo el árbol durante el spike.

## Migration Plan

El trabajo nuevo vive en un repositorio independiente. Conservar inventario y parches iniciales; comprobar al finalizar que el diff de archivos versionados de cada upstream coincide con la línea base. Los índices y configuraciones nuevos son reversibles y no requieren migrar proyectos de usuarios.

## Browser Integration

Dos servidores HTTP estáticos locales representan los orígenes shell y runner. El runner se integra con iframe sandbox que permite scripts y conserva su propio origen. El origen diferente protege DOM y localStorage; no se utiliza como simulación de aislamiento una mera ruta distinta.

El handshake valida origin, source, versión y sesión antes de transferir un MessagePort. Las respuestas usan secuencias y IDs de petición. Stop invalida la sesión, cierra el puerto y reemplaza el frame, lo que destruye también los workers subordinados. La CSP del runner limita conexiones/scripts a su propio origen y bloquea acceso HTTP al shell y a sitios externos.

Los assets SVG propios se precargan en Scratch Storage sin un web store remoto. VM y renderer viven juntos en el runner. Medir píxeles coloreados del framebuffer comprueba el movimiento renderizado, además del estado de la VM.

El fixture nativo se valida con scratch-parser durante el build y entra por deserializeProject. El loader SB3 genérico usa AJV con generación dinámica de funciones, bloqueada por la CSP. El banco no admite archivos arbitrarios: su importación futura requiere validadores precompilados y saneamiento, sin habilitar unsafe-eval en el runner.

PXT usa los bundles browser oficiales instalados: TypeScript y pxtworker. Un worker clásico importa esos scripts y recibe un pack estático con target, configuración y cachés HEX. Un Host local resuelve paquetes y runtimes en memoria. No se ejecuta el JS compilado como parte de la compilación. La prueba offline desconecta el contexto después de precargar ese pack; no implica una PWA persistente entre visitas.

El driver PXT evalúa normalmente compilerExtension del target. Se registra compilerHooks y se importa built/compiler.js como un script estático del pack fijado. Así se conserva el hook que combina firmware V1/V2 en HEX universal y se mantiene prohibida la evaluación dinámica en el worker. Las pruebas verifican ambas marcas de placa en la salida universal.

La detección legacy isNodeJS de PXT trata un worker sin window como Node y su compresión intenta require("lzma"). El adaptador suministra la implementación browser real de LZMA a lzmaCompressAsync. Esto conserva la fuente embebida del firmware, sin inventar un require o exponer un DOM ficticio al worker.

Playwright con Chromium verifica las fronteras y conserva capturas/trazas. El banco de prueba tiene botones y estado mínimos; no constituye todavía la interfaz final de Studio. La evidencia de hardware sigue separada.

## Corpus and Simulator Extension

La entrega siguiente amplía el subconjunto de Blockly y su IR con eventos, esperas, broadcast-and-wait y clones. Los fixtures se traducen y validan durante el build, conservando el camino real de autoría. El canvas reenvía eventos DOM por postIOData; las esperas y clones usan el scheduler/targets reales de la VM. Los E2E comprueban orden, píxeles y Stop durante trabajo pendiente.

El simulador micro:bit usa pxsim.Runtime, DalBoard y su SVG del target local. Runtime evalúa el JS compilado como parte de su contrato; por ello vive en un tercer origen, dentro de un iframe subordinado al runner. Solo ese origen recibe unsafe-eval y los estilos requeridos por el SVG oficial. Shell, runner 2D y worker compilador conservan script-src self. El protocolo valida origin/source/sesión y usa MessagePort. Stop destruye la cadena de frames. No se habilita la mensajería global no autenticada del Embed upstream.

El bundle pxtsim registra automáticamente Embed.start en load. Un script defer, cargado inmediatamente después de pxtsim, neutraliza ese arranque antes de load; no basta con omitir una llamada propia. Un mensaje global run falsificado no puede ejecutar código ni reemplazar el programa autorizado. Los bundles upstream permanecen intactos.

Se compara la matriz 5×5 del runtime con la opacidad de las 25 celdas SVG para corazón y botón, y se registra el hash del JS recibido frente al devuelto por el compilador. Esta evidencia es de simulación y no aprueba hardware.

## Validation Results — Corpus and Simulator

El 21 de octubre de 2026 (Guatemala) pasaron 15 pruebas Node en 2,28 s y 14 E2E Chromium en 53,0 s; sin fallos ni omisiones. La secuencia de eventos 2D alcanzó x=23 y desplazó sus píxeles 23 unidades. Broadcast-and-wait produjo posiciones 1→11→13. El clon duplicó los píxeles de color (984→1968) antes de borrarse. Stop canceló esperas y eliminó clones pendientes, con reinicio ejecutable y fuente preservada.

El JS del worker y el recibido por el simulador tienen el mismo SHA-256. Runtime y SVG mostraron el corazón esperado de 16 LEDs y los cambios del botón A. La prueba de Stop destruyó el frame anterior y el programa nuevo solo encendió (4,4). El acceso al DOM del runner fue rechazado; un run global ajeno al canal no ejecutó código. Los controles visibles también pasan un E2E.

Los resultados están en `docs/phase-0/CORPUS-SIMULATOR-RESULTS.md` y `browser-evidence.json`, con capturas en artifacts. OpenSpec pasa validación estricta; los tres upstreams preservan commit, diff versionado y lockfile. Quedan audio, corpus completo, bindings externos, periféricos/V2 del simulador, hardware y reapertura offline; physicalBoardValidated sigue false. No se archiva el cambio ni se cierra la fase 0 global.

## Audio, Variables and Conditions Extension

La IR añade expresiones numéricas de variable y comparaciones EQ/LT/GT, con IDs de origen separados de los IDs de variable. Blockly aporta variables_set, math_change, variables_get, logic_compare y controls_if; las ramas se traducen a control_if/control_if_else y los valores viven en las variables locales del target. Las formas no soportadas se rechazan explícitamente.

Un WAV PCM mono generado localmente se entrega por el mismo Helper de assets, con su hash y metadatos. Scratch Audio se empaqueta desde la dependencia fijada de Xcratch y se adjunta antes de deserializar los sonidos. Un botón dentro del runner reanuda AudioContext durante un gesto real; no se añaden flags de autoplay a Chromium ni acceso al micrófono.

Un AnalyserNode en la salida real del motor permite comprobar señal, frecuencia aproximada y silencio junto con eventos de SoundPlayer y posición del sprite. Las pruebas distinguen sonido decodificado, señal Web Audio y salida física: no se afirma haber validado altavoces ni percepción acústica. Stop se prueba durante sound_playuntildone, después del tiempo original del WAV y tras destruir/recrear el frame.

Stop invalida la sesión primero, rechaza peticiones pendientes y solicita shutdown al puerto anterior. El runner detiene VM/workers y cierra AudioContext; el anfitrión espera como máximo 150 ms antes de retirar el frame y recrearlo. Este cierre cooperativo acotado libera el audio sin depender solo de descarte/GC y conserva la recuperación si el runner no responde. El E2E observa contextChanged=closed mediante CDP del frame y su posterior separación del árbol.

## Validation Results — Audio and State

El 22 de octubre de 2026 (Guatemala) finalizaron 20 pruebas Node y 18 E2E Chromium aprobadas, sin fallos ni omisiones. El contador recorrió ambas ramas con movimientos 4→11→18→21, conservó la autoría inicial y respondió a espacio con valor 2 y x=19. Recargar restauró valor y posición cero; los IDs de variable y expresiones se conservaron.

El WAV local se decodificó como mono de 1,2 s; el analizador midió RMS no silencioso y pico alrededor de 430,66 Hz con FFT de 2048 muestras. La reproducción con espera mantuvo x=0 hasta terminar y después movió a x=5. El bloque detener sonidos interrumpió antes del final y permitió continuar a x=3. La señal volvió a silencio en ambos casos.

Stop durante audio evitó la continuación posterior incluso después de la duración original. Durante una segunda reproducción, el cierre/reemplazo produjo un evento CDP closed para el contexto anterior y separó su frame. El nuevo runner volvió a reproducir con gesto real, preservando la fuente del anfitrión. La posición visible del anfitrión coincide con la VM en los nuevos ejemplos.

La evidencia completa está en `docs/phase-0/browser-evidence.json` y los detalles en `docs/phase-0/AUDIO-STATE-RESULTS.md`. La validación estricta de OpenSpec y la preservación upstream pasan; CodeGraph se sincroniza con las nuevas fuentes. Faltan bindings externos, corpus más amplio, hardware y reapertura offline. El audio se valida como señal digital, no como salida acústica física. No se archiva el cambio ni se cierra la fase 0 global.

## GG Bindings and Editable Blockly

El compilador de IR a bloques Scratch se separa de las importaciones Blockly para ejecutarse dentro del runner sin cargar el editor. La frontera de IR es un esquema propio estricto, con límites de tamaño, profundidad, nodos, scripts, variables y valores. No se confía en un marcador validatedAtBuild recibido del anfitrión: la nueva ruta solo acepta IR validada y reutiliza los recursos locales del build.

GG expone DTOs y operaciones acotadas, no objetos de VM, referencias de renderer ni acceso a propiedades arbitrarias. El adaptador aplica todo sobre el target original hero y sus variables numéricas. Emitir un mensaje declarado usa los hats nativos de la VM. El transporte sigue siendo el MessagePort autenticado y añade revisión de programa; las referencias antiguas se rechazan también en el cliente.

El anfitrión empaqueta Blockly 13.4.0 y el mismo traductor de workspace. El ejemplo incluye movimiento repetido, variable score y receptor boost. El editor conserva su workspace al ejecutar o detener; Run crea una ejecución desde esa autoría. No se entrega todavía GGPROJ ni un editor general de recursos. Blockly requiere CSS dinámico, por lo que solo el anfitrión permite estilos inline; script-src self y las políticas estrictas del runner/compilador se conservan.

El adaptador genera projectVersion=3 para deserializeProject después de validar IR; ese discriminador normalmente lo añade scratch-parser. No habilita AJV dinámico ni acepta un proyecto nativo enviado por el cliente. Las cargas en curso rechazan llamadas concurrentes. GG presenta los literales numéricos de Scratch como números en sus DTOs, sin guardar otro estado.

## Validation Results — GG and Editable Blockly

El 22 de octubre de 2026 (Guatemala) pasaron 23 pruebas Node y 22 E2E Chromium, sin fallos ni omisiones. El campo nativo Blockly cambió 4 a 6 y el programa recorrió 18 pasos. GG movió a 28, estableció posición 40, escribió score=4 y emitió boost; el receptor nativo produjo score=5 y x=45. Consulta GG, VM, posición visible y píxeles coincidieron. La autoría permaneció igual tras bindings y Stop y volvió a ejecutar 18 desde el estado inicial.

Referencias antiguas de sesión/revisión, revisión antigua enviada directamente por el puerto y argumentos GG inválidos fueron rechazados sin cambiar la escena. La IR con extensiones u operación desconocida no reemplazó el programa. Un bloque no soportado mostró tipo e ID sin perder autoría. Node cubrió límites, referencias, IDs y movimiento nativo hacia arriba; la prueba móvil ejecutó y controló la escena a 390 px sin desbordamiento de página.

Los resultados están en `docs/phase-0/BINDINGS-EDITOR-RESULTS.md` y `browser-evidence.json`; hay capturas de escritorio/móvil en artifacts. Las regresiones de audio, aislamiento y micro:bit siguen pasando. OpenSpec valida estrictamente y los upstreams conservan su línea base. G1 sigue abierta por corpus ampliado y rendimiento; GGPROJ, hardware y reapertura offline permanecen pendientes. No se archiva el cambio.

## Phase 0 Closeout Design

El cierre añade únicamente las piezas ausentes del corpus mínimo: ámbito local/global, dos disfraces propios y dos scripts concurrentes. Los valores globales residen en Stage; los locales siguen en el target y se copian al crear un clon mediante las reglas del motor. Las aserciones de concurrencia verifican el orden dentro de cada script y el solapamiento de esperas, sin depender de un orden total de instrucciones independientes.

Las mediciones viven en una suite separada con orígenes y reporte propios para no sobrescribir las regresiones funcionales. Se registran muestras de arranque, bytes, heap JS observable por CDP, diez ciclos de recursos/Stop y una escena de cien targets con scheduler y renderer reales. Un contexto nuevo caracteriza arranque frío de navegador; repetir la navegación caracteriza caliente, sin afirmar caché HTTP cuando el servidor usa no-store. El cierre de AudioContext y la desaparición de workers/frames son evidencia de recursos conocidos, no una demostración de ausencia de fugas de memoria del proceso completo.

Los presupuestos de respuesta visual de Stop (100 ms), descarte (1 s) y cien sprites (30 FPS en máquina escolar acordada) conservan su origen en el plan. El informe separa valores observados, cumplimiento en este banco y validación escolar todavía pendiente; no cambia umbrales para acomodar WebGL por software. El tiempo hasta que el nuevo runner está listo se informa aparte del descarte del anterior.

Los ADRs y `docs/phase-0/CLOSEOUT.md` documentan la decisión G1 para el primer corte 2D de fase 1 y las condiciones que obligan a reabrirla. G2 conserva generación/simulación aprobadas y ejecución autónoma física pendiente. `docs/phase-0/PHASE-1-ENTRY.md` define GGPROJ/autosave/recuperación como trabajo de fase 1. No se convierten los spikes en paquetes estables por cerrar la caracterización.

Los apartados Validation Results de este documento son hitos históricos; el acta de cierre y la evidencia estable contienen el estado consolidado.

## Validation Results — Phase 0 Closeout

El 22 de octubre de 2026 (Guatemala) pasan 30/30 pruebas Node y 25/25 E2E Chromium, sin fallos, omisiones o reintentos. Variables globales en Stage y locales por clon, dos scripts concurrentes y cambio visible de disfraz completan el corpus mínimo. Las regresiones previas de Blockly editable, GG, audio, aislamiento, compilación y simulación siguen aprobadas.

Pasan tres experimentos separados, más una repetición aislada del arranque: diez ciclos conservan autoría y cierran diez contextos de audio y los 33 workers observados, con cero workers anteriores después de Stop. Feedback máximo 41 ms, retirada de frame máximo 49,2 ms y nuevo runner listo máximo 1730,8 ms. Cien targets nativos alcanzan 57–59 draws completados/s en SwiftShader; no equivale a FPS del compositor ni valida el equipo escolar. El heap JS shell pos-GC crece 6,94 % y se registra como investigación de soak prolongado, sin afirmar ausencia de fugas.

El acta `docs/phase-0/CLOSEOUT.md` habilita F1: G1 aceptada para el corte 2D acotado, G2 clasificada con física pendiente, y GGPROJ/autosave/recuperación como siguiente trabajo. Las métricas completas, límites y muestras viven en `performance-evidence.json`; la corrida funcional y preservación, en `browser-evidence.json`. Los once hashes de bundles coinciden entre medición y regresión final. Los tres upstreams conservan commit, diff versionado y lockfile; CodeGraph queda sincronizado. El cierre técnico no publica APIs estables ni archiva administrativamente este cambio.

## Historical Initial Browser Validation

El 21 de octubre de 2026 (Guatemala) pasaron 11 pruebas de integración Node y 6 E2E Chromium, sin fallos ni omisiones. El sprite conserva 984 píxeles identificables y su centro se desplaza exactamente 15 píxeles al alcanzar x=15. SOP, validación de source, mensajes de sesiones antiguas, Stop con worker infinito y CSP de conexión pasan los escenarios ejecutados.

El worker PXT genera binary.js, HEX V1/V2 y universal; las longitudes y checksums de los registros se verifican. La compilación nativa también pasa después de desconectar el contexto precargado, sin intentos HTTP externos por el adaptador. Una API inexistente produce diagnósticos en main.ts y la fuente del anfitrión sigue editable durante la compilación.

La evidencia estable está en `docs/phase-0/browser-evidence.json`; los detalles y límites, en `docs/phase-0/BROWSER-RESULTS.md`. OpenSpec pasa validación estricta. Los commits, diffs versionados y lockfiles upstream coinciden con la línea base. G1/G2 permanecen abiertas por el corpus completo, el simulador y hardware; la prueba offline no valida una segunda visita ni instalación PWA. El cambio permanece sin archivar.
