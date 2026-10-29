---
version: 1
slug: "src-studio-index-html"
primary_target: "src/studio/index.html"
related_targets: ["src/studio/style.css"]
---

# Editor integrado E4: 2D, micro:bit, Scratch importado, 3D y web

> **Vigente desde el 23 de octubre de 2026: sección «Rework visual» al final.** Las secciones intermedias documentan los cortes E4 históricos (alturas 1060×700, consulta por anclas, detenciones contextuales) y quedan sustituidas donde contradigan esa sección.

Modo de la superficie: Operate.

Alcance: primer corte del ciclo editar, ejecutar, observar y consultar para principiantes con docente. Scratch y MakeCode aportan proximidad funcional; la paleta y los controles siguen siendo los existentes. Se conservan documentos independientes, actividad/pistas, guardado y recuperación, motores y seis orígenes. Las extensiones micro:bit, Scratch importado, 3D y web comparten esta composición. Siguen revisión transversal, rework visual y aceptación humana/física.

## Direction contract

THESIS: operar una creación 2D, micro:bit, 3D o web, o revisar un original Scratch, junto al resultado; sustituir la larga secuencia de formularios por un espacio de creación y consulta. micro:bit admite bloques de firmware o su documento TypeScript independiente; Scratch conserva el original de solo lectura y ofrece copia GG solo mediante acción explícita.

OWN-WORLD: superficies blancas, fondo verde claro, acción verde y foco coral del sistema existente; tipografía del sistema y controles nativos. Aula luminosa, principiantes acompañados por docente.

STORY: continuar o crear, predecir, cambiar un movimiento o LED, ejecutar, comparar escena y placa simulada y consultar ayuda o Firmware sin abandonar el programa. En Scratch: importar, leer cobertura, predecir con el docente, ejecutar/detener, comparar y consultar el original o crear una copia GG independiente.

FIRST VIEWPORT: barra de proyecto compacta; contexto y ejecución arriba; programa ocupa aproximadamente tres quintos del ancho, resultado y consulta el resto. Interacción distintiva: cambiar un valor y contrastar el movimiento o LED con el resultado en la misma estación. En micro:bit, la autoría seleccionada y el resultado conjunto permanecen próximos; Firmware es consulta secundaria. En Scratch, importación y cobertura de solo lectura ocupan la izquierda; resultado y Original y copia, la derecha; ejecutar/detener comparten el transporte superior.

FORM: composición fijada por la solicitud de integración 2D y sus extensiones micro:bit, Scratch importado, 3D y web con referencia Scratch/MakeCode; extensión concreta del sistema existente, ejecución code-led sin torneo ni comp. Excepción explícita de Impeccable new-work §3: «Never run the script for a local extension or a precisely specified narrow request; shape those directly.» No se ejecutó concept-seed y no existe referencia de semilla que registrar.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Adaptación y evidencia

En escritorio 2D/texto, micro:bit, Scratch importado, 3D y web, autoría o revisión del original a la izquierda, resultado arriba a la derecha y consulta desplazable debajo. Se conservan los 240px del contenedor 2D/texto; micro:bit usa 300px para su resultado conjunto. En este último contexto el workspace tiene mínimo de 640px y altura `max(640px, calc(100dvh - 360px))`; main usa altura automática para contener ambas columnas antes del pie. Con ancho menor a 1060px o altura menor a 700px, el documento vuelve a flujo sin desplazamiento propio de consulta. Los enlaces abren y enfocan destinos sin reconstruir herramientas.

Capturas: artifacts/e4-look-desktop.png, artifacts/e4-look-activity.png, artifacts/e4-look-narrow.png, artifacts/e4-look-narrow-result.png y artifacts/e4-look-narrow-activity.png. La revisión visual y las pruebas de software no acreditan aceptación docente, tecnologías de asistencia, equipos escolares ni hardware físico. El cierre final de pruebas se registra en la evidencia E4; no se infiere desde quick/focal.

## Extensión integrada micro:bit E4

Alcance autorizado el 23 de octubre de 2026: conservar el patrón 2D y extenderlo a bloques de firmware o un único documento TypeScript independiente, placa simulada y escena juntas, transporte común y consulta Firmware. Sigue en modo Operate, con el mismo mundo y el contrato code-led anterior, sin torneo ni semilla por la misma excepción de extensión local. La placa física y aceptación docente no se acreditan desde el navegador.

La autoría TypeScript conserva una única instancia `#source`: principal en modo TypeScript y secundaria en Firmware en modo bloques, conservando nodo y contenido sin conversión implícita. Ejecutar dispositivo y escena y Detener dispositivo y escena usan el transporte común. Firmware agrupa variante, compilación, descarga HEX, transferencia USB y fuente seleccionada de solo lectura. Compilar, descargar y transferir son acciones distintas de ejecutar. El resultado conjunto dispone escena y simulador en columnas con ancho interno de al menos 480px y en vertical por debajo. Selectores, botones de entrada de escena y acción de audio tienen mínimo de 44px en el resultado combinado, incluido escritorio. En este hito micro:bit, SB3 conservaba su composición anterior; la extensión Scratch documentada abajo la sustituye. En ese corte 3D y web continuaban pendientes; la extensión 3D documentada abajo sustituye ese estado para 3D.

La evidencia de la extensión se reúne en `.impeccable/review/e4mb/`: desktop (1440), desktop-1280, mobile (390), user-651, sus vistas de resultado, desktop-typescript, desktop-firmware, desktop-empty y mobile-empty. Las recapturas corresponden a contención y controles de 44px finales. El focal final pasó 4/4; el revisor puntuó resueltos sus dos hallazgos y emitió `ship` para esas correcciones y contención. La puerta completa aprobó 400 Node, 63 herramientas y 155 E2E (3 smoke + 152 regresiones), 18 cambios OpenSpec y tres upstreams preservados. Ver docs/product/INTEGRATED-MICROBIT-RESULTS.md e integrated-microbit-evidence.json. La aceptación docente, lector humano y hardware físico quedan separados; no se declara cerrada toda E4.

## Extensión integrada Scratch importado E4

Alcance autorizado el 23 de octubre de 2026: revisión del original Scratch junto al resultado, transporte común y consulta Original y copia, siguiendo el patrón 2D/micro:bit. Se mantiene Operate y el mundo existente, sin semilla ni comp por extensión local concreta. Esta extensión sustituye para SB3 la composición anterior y las referencias a integración pendiente; En ese corte 3D y web mantenían sus recorridos; la extensión 3D documentada abajo sustituye esa composición para 3D.

La revisión es de solo lectura y muestra cobertura por objeto y bloque, con identificación técnica desplegable. Ejecutar Scratch y Detener Scratch están en la barra común. Original y copia reúne descarga exacta del original identificado por SHA-256, copia explícita solo para `gg-editable` y lectura secundaria del resultado actual. La copia reemplaza el programa 2D tras validar la traducción completa y abre ese contexto sin ejecutar. `vm-compatible` mantiene ejecución Scratch sin prometer copia; `unsupported` conserva descarga original con ejecución y copia bloqueadas. El feedback y la cancelación conservan un único grupo de nodos trasladado junto al importador; al ocultarse el botón Cancelar enfocado, el foco vuelve al importador pertinente. Importar, consultar, copiar o reabrir no ejecuta automáticamente. Archivo inválido y cancelación conservan estado vigente. La ayuda propone predicción y comparación con el docente.

En escritorio la consulta tiene desplazamiento propio; Scratch usa mínimo 600px y altura `max(600px, calc(100dvh - 360px))`, con main en altura automática para contener las columnas. Bajo 1060px o 700px de altura se usa flujo de documento. No se ofrece edición nativa del original, conversión general ni permisos nuevos para extensiones externas. La aceptación escolar y tecnologías de asistencia siguen pendientes. La evidencia de este corte se registra en docs/product/INTEGRATED-SCRATCH-RESULTS.md y artifacts/e4sb-*.

La revisión fresca `artifacts/e4sb-finish-review.md` emitió `ship` con sus cinco secciones de contrato y sin correcciones materiales. Sus 13 capturas verificadas en `.impeccable/review/e4sb/` son desktop-empty, mobile-empty, desktop, desktop-1280, mobile, mobile-result, user-708, user-708-result, desktop-inspection, desktop-compatible, desktop-error, desktop-blocked y desktop-copy (PNG). El paquete `artifacts/e4sb-look.json` registra ausencia de desbordamiento horizontal en 1440, 1280, 390 y 708px, un único feedback y pie bajo ambas columnas; `artifacts/e4sb-detector.json` conserva los avisos mecánicos evaluados por el revisor como no materiales en este alcance.

Quick aprobó 400 Node, 63 herramientas y tres smoke; el focal pasó 19/19, incluido zoom real, conservación del original, copia, reapertura, cancelación y Stop. Affected aprobó 54/54 casos y la puerta completa final aprobó 400 Node, 63 herramientas y 160 E2E (3 smoke + 157 regresiones), 19 cambios OpenSpec y preservación de los tres upstreams. La evidencia final está en docs/product/integrated-scratch-evidence.json, con fuentes estables y cold offline. El dictamen visual no sustituye esa puerta ni la validación humana. Los conteos de la sección micro:bit son históricos y se conservan separados.

## Extensión integrada 3D E4

Alcance autorizado: conservar Operate y el patrón 2D/micro:bit/Scratch. Programa 3D en bloques o en el único documento textual independiente a la izquierda; resultado aislado y consulta a la derecha, transporte común arriba. Objetos y estado inicial agrupa cámara, propiedades y GLB; Código y exportación agrupa fuente derivada, copias explícitas y paquete autónomo. La ayuda propone predecir un movimiento con el docente y comparar después de ejecutar. Los objetos iniciales no representan la escena runtime; consultar y cambiar modo no ejecutan.

Es una extensión local precisa code-led del mismo mundo y contrato, sin semilla ni comp por la excepción new-work §3. Se preservan nodos, IDs, borradores, seis orígenes, sesiones, GGPROJ y recuperación sin autorun. El renderer conserva publicación/cancelación existentes. En escritorio el workspace contiene ambas columnas y el pie; en estrecho/zoom recupera flujo con enlaces y foco accesible. El cierre requiere capturas, detector una vez, revisor fresco y documenter. En ese corte web conservaba su composición anterior; la extensión web documentada abajo la sustituye. La aceptación humana permanece separada.

La documentación de PRODUCT y DESIGN describe la extensión implementada; se conserva el mundo, tokens y sidecar. La revisión y las puertas de software se registran por separado en docs/product/INTEGRATED-3D-RESULTS.md y artifacts/e43d-*.

Cierre del corte 3D: affected aprobó 42/42 casos; full aprobó 400 Node, 63 herramientas y 164 E2E (3 smoke + 161 regresiones), 20 cambios OpenSpec y preservación de los tres upstreams. Capturas verificadas en .impeccable/review/e43d/; artifacts/e43d-finish-verdict.md puntúa resueltas las dos correcciones del revisor (`ship` limitado a esa lista). Evidencia final en docs/product/integrated-3d-evidence.json. En ese corte web estaba pendiente; la extensión web siguiente la integra. Aceptación humana/física permanece pendiente.


## Extensión integrada web E4

Alcance autorizado: conservar Operate y el patrón 2D/micro:bit/Scratch/3D. Programa web en bloques o en el único editor JavaScript/Python independiente a la izquierda; aplicación interactiva existente y consulta a la derecha; ejecutar/detener en el transporte común. Componentes web reúne el estado inicial validado, que no es el formulario runtime. Código web reúne fuente derivada de solo lectura, copias explícitas y exportación. La ayuda propone anticipar con el docente qué añadirá el formulario, cambiar un valor, enviar, comparar y probar una variante.

Mismo mundo verde/blanco, controles nativos y tipografía del sistema. Extensión local precisa code-led, sin semilla ni comp por new-work §3; no se solicita un rework visual. Se conserva la proporción 1.45:1, umbral 1060×700, workspace mínimo 700px y frame 300px. En estrecho o zoom se usa flujo de documento, foco y enlaces de retorno/Stop. En texto, estado/error conserva su altura y se separa del editor compartido desplazable, mínimo 240px. No se duplican controles ni documentos, ni se añade HTML/CSS libre, permisos o motores.

El cierre exige capturas válidas de escritorio, estrecho y viewport del usuario, estados vacío/activo/consulta/texto/error/Stop; detector una sola vez, revisor fresco y documenter. Quick/affected/full se registran por separado. La revisión transversal previa al rework visual y la aceptación docente/física permanecen pendientes; este corte cierra la extensión funcional web, no certifica aprendizaje ni equipos escolares.

Cierre técnico web: focal 21/21, affected 46/46, full 400 Node, 63 herramientas y 168 E2E (3 smoke + 165 regresiones), 21 cambios OpenSpec y tres upstreams preservados. Evidencia en docs/product/integrated-web-evidence.json, revisión en artifacts/e4web-finish-review.md y documentación en artifacts/e4web-documentation.md. Se conserva el mundo actual; revisión transversal, rework visual y aceptación humana/física siguen separados.


## Rework visual (studio-visual-workspace-rework)

Alcance autorizado: rework de presentación e interacción de los seis contextos para resolver E4-01…08. Modo Operate. Dirección confirmada por el usuario: identidad actual refinada (verdes, blanco, foco coral, tipografía del sistema) y distribución tipo Scratch con piezas de MakeCode. No es marca oficial.

THESIS: una estación de creación donde programa, ejecución y resultado se reconocen juntos; la administración y el detalle técnico quedan a un clic.

STORY: entrar o continuar → «Editando …» → predecir con el docente → cambiar un bloque o documento → Ejecutar (nombrado por la autoría) → observar «Resultado de …» → corregir con ayuda o diagnósticos en español → Detener → conservar.

FIRST VIEWPORT (1280×720): cabecera de 48px; programa a la izquierda desde y≈56 con barra Qué programas · Programa (Bloques · JavaScript · Python) · identidad; derecha: transporte, resultado con imagen 4:3 de al menos 240px y consulta con pestañas. Sin desplazamiento global. Expandir resultado sin remontar el iframe.

FORM: extensión precisa sobre el código existente, code-led, sin comp ni semilla (new-work §3, extensión local concreta). Una sola hoja de tokens en `src/studio/style.css` reflejada en `DESIGN.md` y `.impeccable/design.json`.

Contrato: una única detención `#stop-result`; consulta con pestañas reales y selección por contexto; aviso de cambios sin ejecutar con ejecución explícita; errores de validación dentro del formulario; diagnósticos explicados con detalle técnico; estado del original Scratch junto a la importación; actividad por pasos y destino 2D anunciado desde otros contextos. Rótulos educativos de bloques 3D/web solo en el editor (los manifests y sus SHA-256 no cambian). Flujo de documento bajo 1024×640 con barra de transporte fija (Programa · Resultado · Ayuda · Detener).

FINISH: capturas válidas por contexto y viewport, detector una vez, revisión fresca y documentación; resultados en `docs/product/VISUAL-REWORK-RESULTS.md`. La aceptación docente, de estudiantes, lector humano y hardware físico sigue separada.



## Extensión local: vistas sincronizadas 2D

Se conserva Operate y el mundo verde/blanco con foco coral, tipografía del sistema y controles nativos. Extensión precisa code-led, sin comp ni nuevos tokens. Bloques, JavaScript y Python representan el mismo programa 2D mediante los radios existentes y el textarea compartido. Volver a Bloques comprueba el texto sin ejecutar; el rechazo identifica la línea y ofrece seguir editando, recuperar bloques o crear una copia independiente. Se mantienen aviso de formato y Deshacer. Copias API1/API2 conservadas; nuevos documentos API3. Micro:bit, 3D/web y la revisión 2 de actividad siguen pendientes.

Capturas: .impeccable/review/synced2d/; detector: artifacts/synced-code-views/views-20261026/impeccable-detector.json. El reviewer fresco emitió ship para el corte visual 2D. La documentación compara implementación y sistema existente, preservando tokens y sidecar. Este dictamen no certifica conversión completa, offline ni comprensión humana. Se reporta sin reparar el drift observado del Don't de sincronización en el sidecar y su sección Motion histórica.
