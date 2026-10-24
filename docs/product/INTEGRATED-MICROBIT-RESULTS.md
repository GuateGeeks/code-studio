# E4: espacio integrado micro:bit

**23 de octubre de 2026 · Incremento implementado y verificado técnicamente.**

El cambio `studio-integrated-microbit-workspace` extiende el patrón 2D existente: autoría principal en bloques de firmware o documento TypeScript independiente, controles de ejecución conjunta en la barra común y resultado con placa simulada más escena. La consulta Firmware reúne variante, compilación, descarga HEX, transferencia USB y fuente de solo lectura.

Hay una sola instancia del documento TypeScript: al seleccionar ese modo pasa al área principal; al volver a bloques permanece como documento secundario en la consulta. Su texto no se convierte ni reemplaza los bloques. Consultar herramientas, cambiar modo o reabrir el proyecto no inicia la ejecución. La ayuda propone predecir un LED y un movimiento con el docente antes de pulsar un botón.

En escritorio amplio la placa y la escena se organizan en columnas dentro del resultado conjunto. En menor ancho vuelven a una disposición vertical; las herramientas y el programa recuperan el flujo de documento. Los seis orígenes y las instancias de runtime se conservan. El firmware actual queda invalidado al editar o cambiar variante mediante las guardas ya existentes.

## Verificación

Quick aprobó 400 pruebas Node, 63 de herramientas y tres smoke. El primer grupo focal aprobó 16/16 casos: dispositivo, editor integrado 2D, nueva composición micro:bit y zoom real. El perfil affected explícito amplió la comprobación a teclado, renderer, transferencia y espacio contextual: 400 Node, 63 herramientas, 39/39 casos de navegador y 18 cambios OpenSpec válidos, sin avanzar la referencia de impacto.

La inspección renderizada detectó un conflicto entre la altura de la composición y el pie al dividir la barra en dos filas. Se ajustó la contención con una altura definida del espacio y crecimiento natural del documento; se añadieron aserciones de desplazamiento interno, posición del pie bajo ambas columnas y altura total. La repetición final aprobó 4/4 casos, incluyendo los controles de 44px en el resultado combinado. La puerta completa final aprobó **400 Node, 63 herramientas y 155 E2E (3 smoke + 152 regresiones)**, con 18 cambios OpenSpec válidos y los tres upstreams preservados. Cero fallos, reintentos y omisiones en esta puerta; las fuentes permanecieron estables y solo entonces se avanzó la referencia de impacto. Véase la [evidencia del incremento](integrated-microbit-evidence.json).

Impeccable ejecutó el detector una vez y un revisor fresco inspeccionó escritorio 1440/1280, estrecho 390 y ventana 651, modos de autoría, firmware y estado vacío. El documenter actualizó el alcance de PRODUCT, DESIGN y el brief conservando el frontmatter de tokens y el sidecar por hash; no se sustituyó el mundo visual ni se normalizó el drift histórico. El veredicto final de las correcciones se conserva en los artefactos del incremento.

La instantánea previa `artifacts/e4mb-baseline` conserva 551 archivos y tres muestras verificadas desde su archivo restaurable. La puerta 2D anterior está preservada en `artifacts/e4-2d-approved-gate`; su evidencia durable y recuentos históricos no se sustituyen por los de este incremento.

El primer intento full terminó con 150/152 regresiones aprobadas y dos expectativas antiguas incompatibles con la nueva composición: buscar por rol un botón dentro de un detalle aún cerrado y esperar el destino genérico de Detener cuando micro:bit ya tiene transporte visible. Se conserva en `artifacts/e4mb-full-attempt1` y no avanzó la referencia de impacto. Las correcciones abren el detalle mediante su summary y comprueban que el Detener visible reinicia el resultado conservando bloques y texto; no debilitan los checks de ejecución, LEDs ni aislamiento. Sus dos suites completas aprobaron después 12/12 casos en `artifacts/e4mb-legacy-focal.log`. La UI revisada no cambia por estas correcciones de pruebas.

## Alcance pendiente

La integración visual de Scratch importado, 3D y web sigue para cortes posteriores de E4. La simulación y la validación de HEX no acreditan transferencia ni comportamiento en placa física. La observación con docentes y estudiantes, tecnologías de asistencia y equipos escolares permanece pendiente. E5 y el contrato de Sócrates en E6 conservan su alcance separado.


## Cierre de integración

La puerta final produjo evidencia offline fresca: actualización A/B con identidades distintas, rechazo de candidato corrupto sin sustituir el actual, rollback y segunda visita con un proceso Chromium nuevo y los seis servidores detenidos. La actividad E3 offline conservó el reto x=80. Estas pruebas de navegador no equivalen a funcionamiento en placa física.

El revisor fresco emitió `fix` y después `ship` al puntuar resueltos sus dos hallazgos (controles de 44px y documentación), además de verificar contención y pie en las doce capturas. Ese verdict pass acredita las correcciones evaluadas; no se presenta como aceptación escolar. Los avisos del detector sobre imagen oculta sin recurso, inset del summary y jerarquía compacta se contrastaron con el render y el modo Operate. El drift descriptivo histórico del sidecar se reportó sin regenerar el sistema.

Los reportes, consultas/sincronización CodeGraph, inventario de cambios y capturas se conservan bajo `artifacts/e4mb-*` y `.impeccable/review/e4mb/`. La evidencia durable incluye los hashes de todas las fuentes runtime frente a la puerta aprobada. No hubo cambios upstream ni dependencias nuevas. La revisión final solo documental no repite la puerta completa aprobada.
