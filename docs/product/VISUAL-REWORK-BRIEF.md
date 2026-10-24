# Brief propuesto: rework visual de Code Studio

> **Estado (23 de octubre de 2026, posterior):** brief implementado en `studio-visual-workspace-rework`. Dirección confirmada por el usuario: identidad actual refinada y distribución Scratch con piezas de MakeCode; extras aprobados: aviso de cambios sin ejecutar, selector Bloques · JavaScript · Python y actividad por pasos. La autoridad visual vigente es `DESIGN.md`; resultados y límites en [VISUAL-REWORK-RESULTS](VISUAL-REWORK-RESULTS.md). El texto siguiente se conserva como propuesta original.

23 de octubre de 2026. Preparado para implementación delegada a Claude Opus. Propuesta sustentada en [la revisión E4](E4-CROSS-CONTEXT-REVIEW.md); no es un rediseño ya aplicado ni una marca aprobada. El mundo vigente sigue en `DESIGN.md` hasta ejecutar el cambio correspondiente.

## Trabajo y público

Modo **Operate**. Principiante acompañado por docente, que inicia o retoma una creación local, cambia un programa, predice, ejecuta, observa, corrige y conserva su trabajo. No se presume edad, grado, currículo o nivel lector.

Resultado deseado: sentirse dentro de un editor educativo, con programa y efecto como protagonistas. Scratch y MakeCode son referencias solicitadas de organización, controles reconocibles y herramientas próximas. No se heredan su marca, permisos, sincronización bloques/texto ni ejecución automática. La [guía oficial de MakeCode](https://makecode.microbit.org/v1/courses/csintro/making/activity) documenta simulador, toolbox y workspace; es una referencia de estructura, no una captura actual ni plantilla para copiar.

## Tesis de composición

Una estación de creación con cabecera compacta de proyecto, autoría dominante, resultado legible y consulta contextual con estado explícito. La siguiente acción debe reconocerse por su lugar y nombre. El contenido técnico y la administración aparecen cuando ayudan a la tarea.

| Región | Contenido principal | Consecuencia |
|---|---|---|
| Proyecto | Nombre, guardado local confirmado y acceso a archivos | No repetir un formulario completo de archivos encima de cada contexto |
| Contexto y autoría | Contexto, documento/modo activo, toolbox y programa | Distinguir bloques, fuente derivada y documento independiente |
| Transporte | Ejecutar la autoría seleccionada y detener el resultado activo | Alcance explícito; conservar acciones específicas con distinto efecto |
| Resultado | Contexto/documento de procedencia y escena, placa o aplicación | Visible y legible junto al programa; no mostrar el formulario de objetos iniciales como ejecución |
| Consulta | Actividad pertinente, propiedades, recursos, código, diagnósticos o ayuda | Selección y contenido coinciden; foco y borradores se conservan |
| Preparación docente | Offline, firmware/USB y opciones avanzadas cuando correspondan | Acceso claro sin dominar el recorrido inicial |

Propuesta base en escritorio: toolbox al lado del programa y resultado con consulta próxima. Se conserva el programa a la izquierda y resultado a la derecha como continuidad de E4; puede ajustarse su proporción para cumplir legibilidad. No se requiere un splitter arrastrable ni un editor nuevo. Una vista de resultado ampliada debe tener salida evidente y alternativa de teclado.

En estrecho, permitir llegar directamente a Programa, Resultado y Ayuda, con foco visible y acceso a ejecutar/detener. No intentar comprimir tres columnas ni presentar toda la administración antes del programa. Se conservan el orden de lectura y una ruta usable con zoom; no basta esconder overflow.

## Requisitos visibles y medibles

- A 1280×720 y 1440×900, tras entrar al proyecto, programa, ejecutar/detener y resultado aparecen sin desplazamiento global. Propuesta de aceptación: autoría y resultado comienzan a más tardar en y=200 para el caso nominal cerrado; el lienzo 2D tiene al menos 240px de alto y contenido 4:3 completo; Blockly y fuente editable conservan al menos 300 y 240px de alto respectivamente. Ayuda expandida, errores y zoom usan reflujo accesible en vez de superposición o recorte. Si la composición no cumple conjuntamente, resolverla antes de rebajar estos criterios.
- Verificar también 1280×900, 390×844, 448×884, límite de breakpoint y zoom real 200/400%. Las dimensiones son viewports de prueba, no promesa de dispositivos físicos.
- «Editando…» y «Resultado de…» distinguen el cambio de contexto con ejecución anterior activa. Una navegación o consulta no ejecuta ni detiene.
- Herramienta seleccionada, panel mostrado y estado accesible coinciden, incluso al cambiar de contexto o volver de un diagnóstico.
- Español claro para bloques propios, propiedades y mensajes. Identificadores y detalle original disponibles sin ocupar el primer nivel. No traducir código del alumno ni cambiar IDs, tipos de bloque, nombres de campo o esquema.
- Validación junto a la acción afectada, causa conocida y siguiente paso; conservar borrador inválido, proyecto válido y sesión anterior. Los diagnósticos mantienen enlaces solo mientras su fuente siga vigente.
- Tokens de color, tipografía, espacio, foco y estados en una sola fuente (`DESIGN.md` y sidecar conforme a Impeccable). Recursos locales y misma disponibilidad offline. No exigir modo oscuro o fuentes nuevas.

## Variaciones por contexto

- **2D:** bloques editables, escenario con objetos y recursos; lectura del estado inicial separada de ejecución.
- **Texto 2D:** documento JavaScript/Python independiente, destino y lenguaje inequívocos, consulta de código derivado separada de la fuente editable.
- **micro:bit:** bloques o TypeScript independiente, placa + escena; simular, compilar, descargar HEX y transferir son acciones distintas. No llamar exitosa a una prueba física no realizada.
- **Scratch:** original de solo lectura, estado de cobertura en lenguaje comprensible y acción siguiente cerca de la importación. Copia GG explícita solo cuando es convertible; original preservado y descargable incluso bloqueado.
- **3D:** bloques o documento independiente, escena aislada, objetos/cámara/GLB del estado inicial y exportación.
- **Web:** bloques o documento independiente, formulario/lista nativos, componentes iniciales y exportación. Lo introducido en la aplicación no se convierte en autoría guardada.

## Estados y contenido

Diseñar entrada/continuación, vacío/no añadido, preparando, listo, edición, ejecución, detenido, error de autoría, error de ejecución, recuperación, recurso faltante e importación bloqueada. Cubrir original convertible/solo ejecutable/bloqueado, modo textual sin documentos, borrador incompleto y resultado perteneciente a otro contexto.

Usar contenido real del repositorio. Probar nombre de proyecto hasta el límite actual de 80 caracteres, nombres de documento largos, listas vacías/con contenido, IDs legibles/técnicos, bloques extendidos, mensajes de error largos y tres pistas graduadas. Conservar los límites declarados de documentos, recursos y actividades; no inventar un formato nuevo para el rediseño.

## Límites y decisiones

Se mantienen motores y versiones fijadas, seis orígenes, contratos de operación, sesiones/revisiones, GGPROJ, autosave confirmado, recuperación sin autorun, copias independientes, exportaciones y offline frío. No incorporar backend, cuentas, nube, tutor, extensiones remotas, edición nativa de Scratch, HTML/CSS libre ni nuevos catálogos.

El usuario pidió una herramienta en la familia de Scratch/MakeCode. La implementación debe resolver una dirección coherente dentro de esa referencia, sin asumir identidad institucional aprobada. El verde actual es evidencia del producto, no obligación de conservar todas sus decisiones de composición. Cualquier activo de marca oficial faltante queda señalado; no se inventa.

La propuesta se centra en interacción y presentación. Una mejora que requiera cambiar motor, esquema, permisos o comportamiento educativo necesita alcance separado. Las capacidades no se eliminan para simplificar la pantalla.

## Prueba y aceptación

Por cada contexto: reconocer autoría, editar o revisar, ejecutar explícitamente, consultar sin perder sesión, detener, guardar y recuperar. En el conjunto: teclado, zoom, error→origen, cambio de contexto, modos independientes, importación inválida, cancelación, exportación autónoma y segunda visita offline con Chromium nuevo y servidores apagados. Reutilizar suites existentes y añadir solo regresiones significativas para E4-01…08.

Observación propuesta con docente/principiantes: pedir identificar qué se editará y ejecutará, hacer un cambio y una predicción, encontrar una pista o propiedad, explicar el resultado, detener y recuperar. Registrar ayudas, errores de elección y explicación con sus palabras; éxito técnico y comprensión por separado. La sesión aún no se ha realizado; no se fijan mejoras porcentuales ni se recogen datos remotos.

Entregar release revisable, capturas de estados reales, resultados de pruebas, trazabilidad de los ocho hallazgos y pendientes humanos. La última puerta web es la línea base histórica, no la aprobación del rework.
