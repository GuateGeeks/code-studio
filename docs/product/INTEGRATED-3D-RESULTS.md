# E4: espacio integrado 3D

**23 de octubre de 2026 · Incremento implementado y verificado técnicamente.**

El cambio `studio-integrated-3d-workspace` extiende el patrón 2D, micro:bit y Scratch importado. Programa en bloques o documento JavaScript/Python independiente en el área principal; ejecutar/detener en la barra común; resultado y consulta próximos en escritorio. Los mismos controles conservan sus IDs, contenido y validaciones. Hay un único editor textual compartido, sin sincronización inversa con bloques.

«Objetos 3D» consulta el estado inicial: objetos, cámara, propiedades, capacidades avanzadas y modelos GLB existentes. Aplicar valida antes de sustituir la autoría y no ejecuta ni convierte el resultado runtime en estado guardado. «Código 3D» reúne fuente derivada de solo lectura, copias explícitas y exportación autónoma. Consultar, copiar o reabrir no inicia ejecución.

En escritorio a partir de 1060×700, el espacio tiene dos columnas y consulta desplazable. El workspace tiene mínimo de 700px; main crece para contener ambas columnas y el pie. El frame 3D conserva su origen aislado y 300px de alto en esta composición. En estrecho y zoom vuelve al flujo del documento con enlaces de retorno y Stop. La ayuda propone predicción, cambio de un valor, comparación y variante con el docente.

## Evidencia y límites

Quick aprobó 400 Node, 63 herramientas y tres smoke. El focal inicial pasó 14/16: dos aserciones confundían el valor textual de un campo Blockly con su valor numérico runtime. Tras corregir la expectativa, el nuevo grupo focal aprobó 4/4. El primer affected quedó en 40/42 por un panel cerrado y un selector anterior a la reubicación de controles; ambos fixtures fueron adaptados a la navegación visible, sin forzar clics ni reducir verificaciones. El affected final aprobó 42/42 casos, además de 400 Node, 63 herramientas y OpenSpec, sin avanzar la referencia. La puerta completa final aprobó **400 Node, 63 herramientas y 164 E2E (3 smoke + 161 regresiones)**, 20 cambios OpenSpec y preservación de los tres upstreams, sin fallos, reintentos ni omisiones. Las fuentes permanecieron estables y la referencia de impacto solo avanzó tras esa puerta. Véase la [evidencia del incremento](integrated-3d-evidence.json). La instantánea previa `artifacts/e43d-baseline` conserva 567 archivos con tres muestras verificadas; la puerta Scratch anterior se preserva en `artifacts/e43d-approved-scratch-gate`.

No se modifican motores, formatos, dependencias ni permisos. La composición integrada web y la aceptación con docentes/estudiantes, tecnologías de asistencia y equipos físicos siguen pendientes de E4. Las pruebas de software no acreditan comprensión ni aceptación escolar. E5/E6 conservan su alcance separado.


## Cierre de integración

Las pruebas cubren edición nativa de bloques, movimiento real del renderer, JavaScript/Python independientes, una única instancia textual, foco/caret, propiedades válidas e inválidas, GLB texturado con framebuffer real, jerarquía, luces, colisiones, operaciones rechazadas, Stop, reapertura GGPROJ y exportación autónoma. Las integraciones anteriores y la navegación de los seis contextos conservan su regresión.

La revisión visual cubrió 1440/1280, estrecho 390 y ventana del usuario 489×932, con estados vacío, bloques, resultado, consulta, copia textual, error y Stop. El revisor inicial pidió separar estado/error del editor textual y actualizar documentación. Tras una única corrección y recapturas válidas, el mismo revisor puntuó ambas correcciones resueltas y emitió `ship` para esa lista, sin sustituir la puerta de software. El detector se ejecutó una sola vez. PRODUCT, DESIGN y brief describen el incremento; tokens y sidecar conservan sus hashes.

La puerta produjo evidencia offline fresca: actualización A/B con identidades distintas, rechazo de candidato corrupto conservando el actual, rollback y segunda visita en un proceso Chromium nuevo con los seis servidores detenidos. La actividad E3 offline conservó el reto x=80, y los contextos 3D/web se crearon y ejecutaron offline. Los hashes de todas las fuentes runtime coinciden con la puerta aprobada. No se cambiaron motores upstream ni dependencias.

Reportes en `artifacts/e43d-*`; capturas en `.impeccable/review/e43d/`. Los intentos fallidos se conservan por separado y no cuentan como puertas aprobadas. El cambio OpenSpec conserva sus seis tareas completas sin archivar. El cierre posterior a la puerta es documental: especificaciones y build validados sin repetir suites aprobadas. La composición web y la aceptación con docentes/estudiantes, tecnologías de asistencia y equipos físicos siguen pendientes de E4; E5/E6 mantienen su alcance separado.
