# E4: espacio integrado web

**23 de octubre de 2026 · Incremento implementado y verificado técnicamente.**

El cambio `studio-integrated-web-workspace` extiende el patrón 2D, micro:bit, Scratch y 3D. Los bloques o el único editor JavaScript/Python independiente comparten la estación con la aplicación interactiva. Ejecutar/Detener están en el transporte común; Componentes web consulta el estado inicial validado y Código web reúne fuente derivada de solo lectura, copias explícitas y exportación autónoma.

Consultar, copiar, cambiar modo o reabrir no ejecuta. Aplicar componentes valida antes del reemplazo y no modifica el formulario runtime: los datos introducidos y la lista del resultado no se guardan como autoría inicial. Se conservan nodos, IDs, documentos, eventos nativos, GGPROJ, recursos, motores y seis orígenes.

En escritorio desde 1060×700 se conserva la proporción 1.45:1, workspace mínimo 700px y frame 300px con consulta desplazable; en estrecho/zoom se usa flujo de documento y enlaces de retorno/Stop. Estado/error conserva su altura antes del editor textual desplazable, mínimo 240px. La ayuda propone predicción, un cambio, envío y comparación con el docente sin modificar actividades ni su contrato.

## Evidencia y límites

Snapshot previo: 575 archivos y tres muestras restauradas verificadas en `artifacts/e4web-baseline`; puerta 3D preservada en `artifacts/e4web-approved-3d-gate`. Quick aprobó 400 Node, 63 herramientas y tres smoke. El focal inicial pasó 2/4 y detectó una etiqueta recortada al enfocar la copia textual; se corrigió el foco/desplazamiento en producto y se conservó el intento. El focal ampliado final aprobó 21/21; affected aprobó 46/46 casos, 400 Node, 63 herramientas y OpenSpec, sin avanzar referencia. Full aprobó **400 Node, 63 herramientas y 168 E2E (3 smoke + 165 regresiones)**, 21 cambios OpenSpec y tres upstreams preservados, sin fallos, reintentos ni omisiones. La referencia solo avanzó tras esa puerta con archivos estables. Véase [evidencia final](integrated-web-evidence.json). Los intentos y las puertas se registran por separado en `artifacts/e4web-*`.

El cierre de esta extensión funcional web no equivale al rework visual ni a aceptación educativa. Quedan revisión transversal, brief/rework visual y validación con docentes, estudiantes, tecnologías de asistencia y equipos físicos. E5/E6 mantienen su alcance separado.


## Cierre de integración

Las pruebas verifican edición Blockly real, formulario/lista con eventos nativos y texto escapado, propiedades iniciales válidas e inválidas, sesión conservada, fuente derivada de solo lectura, copias explícitas JavaScript/Python, único editor textual, foco/caret, separación de estado/error, teclado, zoom real 200/400%, Stop transversal, GGPROJ y exportación autónoma. Las integraciones anteriores conservan su regresión.

La revisión usa trece capturas válidas en .impeccable/review/e4web/: escritorio 1440/1280, estrecho 390×844 y ventana del usuario 448×932, con vacío, programa/resultado, consulta, texto, error y Stop. El detector se ejecutó una vez. El dictamen fresco se conserva en artifacts/e4web-finish-review.md; el documenter describe la extensión en PRODUCT y DESIGN preservando tokens y sidecar. La revisión visual y las puertas de software son evidencias distintas de comprensión o aceptación escolar.

Offline frío produjo actualización A/B con identidades distintas, rechazo de candidato corrupto conservando el actual, rollback y segunda visita con Chromium nuevo y seis servidores detenidos. La actividad E3 conservó su variante x=80 y los contextos 3D/web se crearon y ejecutaron sin servidores. Los hashes de las 142 fuentes runtime coinciden con la puerta aprobada; no se modificaron motores upstream ni dependencias.

Los seis contextos comparten ya el patrón funcional de programa, resultado, transporte y consulta. La revisión transversal previa al rework visual, el brief visual y la aceptación con docentes, estudiantes, tecnologías de asistencia y equipos físicos permanecen pendientes. E5/E6 mantienen su alcance separado. El cambio conserva sus seis tareas completas sin archivar. El cierre posterior a full es documental: especificaciones y build validados sin repetir suites aprobadas.
