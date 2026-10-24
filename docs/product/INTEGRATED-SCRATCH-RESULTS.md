# E4: Scratch importado en el espacio integrado

**23 de octubre de 2026 · Incremento implementado y verificado técnicamente.**

El cambio `studio-integrated-scratch-workspace` extiende el patrón integrado 2D y micro:bit. El área principal permite importar y revisar la cobertura de un original Scratch; Ejecutar Scratch y Detener Scratch comparten la barra de ejecución. El resultado se mantiene junto a la revisión y la consulta «Original y copia» reúne descarga del original, copia editable permitida e inspección del resultado actual.

La revisión es de solo lectura: no presenta un editor nativo Scratch ni sincronización con los bloques 2D. La copia es una acción explícita disponible solo para la cobertura `gg-editable`; reemplaza la autoría 2D después de validarla y no ejecuta. Los originales compatibles con la VM mantienen ejecución sin prometer copia editable. La cobertura bloqueada conserva el original descargable sin habilitar ejecución ni copia. No se amplían extensiones ni permisos externos.

Los avisos y la cancelación usan un único grupo de controles que se traslada al contexto activo. Un archivo inválido conserva original, autoría y ejecución vigentes; la cancelación por teclado devuelve el foco al importador. Consultar, copiar o reabrir GGPROJ no inicia ejecución automáticamente. La ayuda propone predecir con el docente y comparar con el resultado antes de crear una variante.

En escritorio, revisión a la izquierda y resultado/consulta a la derecha. Con ancho menor a 1060px o altura menor a 700px, recuperan el flujo del documento. La cobertura técnica se despliega de forma secundaria y los textos se construyen con nodos de texto seguros.

## Evidencia y límites

Quick aprobó 400 pruebas Node, 63 de herramientas y tres smoke. El grupo focal aprobó 19/19 casos, incluyendo los veinte archivos Scratch públicos, audio, cancelación, conservación del original y zoom real. El perfil affected explícito aprobó 400 Node, 63 herramientas y 54/54 casos de navegador, más 19 cambios OpenSpec, sin avanzar la referencia de impacto. La puerta completa final aprobó **400 Node, 63 herramientas y 160 E2E (3 smoke + 157 regresiones)**, 19 cambios OpenSpec y preservación de los tres upstreams, sin fallos, reintentos ni omisiones. Las fuentes permanecieron estables y la referencia de impacto solo avanzó tras esa puerta. Véase la [evidencia del incremento](integrated-scratch-evidence.json). La instantánea previa `artifacts/e4sb-baseline` conserva 559 archivos; la puerta micro:bit anterior se conserva en `artifacts/e4mb-approved-gate`.

La integración 3D y web continúa pendiente de otros cortes E4. La comprensión por principiantes, aceptación docente, tecnologías de asistencia y equipos escolares requieren validación humana. Ninguna prueba de navegador acredita hardware físico ni cierra toda E4. E5 y E6 conservan su alcance separado.



## Cierre de integración

La revisión renderizada cubrió escritorio 1440/1280, estrecho 390 y la ventana del usuario 708×932, con estados vacío, compatible, bloqueado, error, lectura de ejecución y copia a 2D. Se corrigió el aviso que permanecía en «Preparando…» después de rechazar un archivo. El revisor fresco de Impeccable emitió `ship` para la extensión sin hallazgos materiales; la aceptación escolar permanece separada. El detector se ejecutó una vez: sus avisos sobre imagen oculta, inset y jerarquía compacta se contrastaron con el render y el sistema existente. El documenter consolidó PRODUCT, DESIGN y el brief sin cambiar tokens ni sidecar.

La puerta produjo evidencia offline fresca: actualización A/B con identidades distintas, rechazo de candidato corrupto conservando el actual, rollback y segunda visita en un proceso Chromium nuevo con los seis servidores detenidos. La actividad E3 offline conservó el reto x=80. Los hashes de todas las fuentes runtime coinciden con la puerta aprobada. No se cambiaron motores upstream ni dependencias.

Los reportes, consulta y sincronización CodeGraph, inventario de cambios y capturas se conservan en `artifacts/e4sb-*` y `.impeccable/review/e4sb/`. El cambio OpenSpec conserva sus seis tareas completas sin archivar. El cierre posterior a la puerta es documental: se validaron especificaciones y build, sin repetir las suites aprobadas.
