# E4: primer editor 2D integrado

**23 de octubre de 2026 · Primer corte implementado y verificado técnicamente.**

El cambio `studio-integrated-2d-editor` integra el ciclo 2D para principiantes con docente. En escritorio, Blockly ocupa la izquierda; escenario y consulta comparten la derecha. Ejecutar y Detener están en una barra común. La entrada se puede plegar tras crear o continuar, sin ocultar los avisos de proyecto.

Actividad, propiedades, código, diagnósticos, recursos y ayuda se alcanzan con enlaces que enfocan su destino y desplazan el área de consulta. Las herramientas permanecen montadas: no se duplican editores ni se reinicia la actividad al navegar. En ancho reducido y zoom vuelve el flujo de documento. Las copias JavaScript/Python siguen siendo independientes y el resultado conserva su identidad al cambiar contexto.

Scratch orienta la proximidad de programa, escenario y propiedades; [MakeCode](https://makecode.adafruit.com/courses/maker/general/coding/environment) documenta la separación entre simulador, herramientas y programa, y sus [guías de acceso](https://makecode.com/accessibility) conservan áreas reconocibles al cambiar ancho/zoom. Son referencias de organización; Code Studio mantiene sus motores, operaciones y controles propios.

## Verificación

La puerta completa aprobó **400 Node, 63 herramientas y 151 E2E (3 smoke + 148 regresiones)**, 17 cambios OpenSpec y preservación de los tres upstreams. Cero fallos, reintentos u omisiones en esa puerta. La referencia de impacto se avanzó solo al finalizar. La [evidencia E4](integrated-2d-evidence.json) registra comandos, tiempos y hash de las fuentes.

Quick aprobó 400 Node, 63 herramientas y tres smoke. El grupo ampliado aprobó 30/31 antes de corregir un desbordamiento de un píxel; zoom final aprobó 2/2 a 200/400 % en ventanas de escritorio y estrecha. La puerta completa posterior incluye todos esos casos con las fuentes finales; los intentos previos se conservan sin contarlos como aprobados. Offline se comprobó con un proceso Chromium nuevo, los seis servidores detenidos y el reto E3 x=80.

La revisión visual independiente no pidió cambios materiales en la interfaz; su verdict pass puntuó resueltos los dos hallazgos de documentación/contrato. El detector se ejecutó una vez; sus avisos sobre preview de imagen vacío hasta importar, inset del summary y escala compacta se revisaron según el modo Operate. DESIGN, PRODUCT, sidecar y brief conservan la dirección documentada.

La prueba nueva conduce geometría real a 1280×900 y 1440×900, edición nativa del número de un bloque, Run/Stop, consulta con teclado sin cambiar la autoría ni la sesión, una pista E3, recuperación y copia textual estrecha. Las suites previas conservan las pruebas de descarga/apertura, diagnóstico por bloque/línea, seis contextos y offline.

Snapshot previo: `artifacts/e4-baseline` (541 archivos, tres muestras restauradas). Puerta E3 preservada: `artifacts/e3-approved-gate`. Consultas y sincronización CodeGraph, capturas e intentos focales se conservan bajo `artifacts/e4-*`. Las actas anteriores conservan sus conteos históricos.

El primer intento full se interrumpió tras 47 casos aprobados y un fallo de clic: una prueba calculaba coordenadas sobre todo el canvas en lugar de la imagen ajustada con bandas laterales. Se corrigió el cálculo en el corpus 2D, textual y SB3, conservando clics reales y aserciones de ejecución/píxeles. `artifacts/e4-full-attempt1-*` conserva ese intento (un caso interrumpido y 99 sin ejecutar); no avanzó la referencia de impacto. No fue una puerta aprobada.

La comprobación focal posterior aprobó el clic del corpus y la equivalencia de eventos entre bloques/JavaScript/Python. El grupo SB3 de veinte archivos y el caso separado de audio suspendido aprobaron 2/2: la comparación usa un navegador con audio autorizado para ejecutar una sola bandera por versión; las pruebas de permiso por gesto mantienen su contexto suspendido real. Se conserva el primer fallo de comparación (doble inicio al pulsar Reproducir sonido) en `artifacts/e4-pointer-attempt1-*`.

El segundo intento full aprobó 147/148 casos, con un único fallo en la construcción del fixture de actualización offline: buscar `<body>` exacto ya no cambiaba el HTML con atributos de E4, por lo que B conservaba la identidad A. El fixture ahora preserva los atributos y exige contenido e identidad distintos antes de corromper el recurso. `artifacts/e4-full-attempt2-*` conserva el resultado fallido; tampoco avanzó la referencia de impacto.

La prueba offline focal corregida aprobó 1/1, incluyendo actualización, rechazo de recurso corrupto, rollback, cierre total del navegador y segunda visita con los seis servidores detenidos. Su resultado está en `artifacts/e4-offline-final.log`; la puerta completa final debe producir su propia evidencia fresca.

## Alcance pendiente

Este cambio cubre el primer editor 2D y su copia textual. La extensión de la composición integrada a micro:bit, Scratch importado, 3D y web sigue pendiente de cortes posteriores de E4; sus recorridos funcionales existentes se conservan. También quedan por decidir el acabado adicional y la identidad oficial, apoyados en observación de uso. No existe aún validación de comprensión con docentes/estudiantes, lector humano, equipos escolares ni hardware físico. E5 y el contrato de Sócrates en E6 siguen separados.


Actualización posterior del mismo 23 de octubre: la extensión micro:bit se implementó y verificó en su propio cambio; véanse [resultados del incremento micro:bit](INTEGRATED-MICROBIT-RESULTS.md). Los recuentos y el alcance anteriores corresponden a la puerta 2D histórica.
