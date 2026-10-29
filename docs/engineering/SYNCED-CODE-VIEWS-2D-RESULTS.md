# Vistas sincronizadas 2D: implementación y verificación

26 de octubre de 2026. Working tree sobre c1b8901, sin commit, archivo ni push.
Corte 2D verificado técnicamente, con 8/13 tareas completas.
Este corte no cierra todo synced-code-views: micro:bit, 3D/web y la revisión 2
de la actividad siguen pendientes.

## Alcance

El usuario confirmó mantener el subconjunto instalado y ajustar el diseño.
No se amplían IR0, bloques ni runtimes para while, forever o funciones propias.
JavaScript usa Acorn; Python usa ast en Pyodide, cargado solo cuando se necesita
analizar una edición. Ambos trabajan en el origen del lenguaje, sin evaluar el
texto del estudiante. Las formas de llamadas y eventos proceden de las tablas
y reglas instaladas.

En Escena 2D, Bloques, JavaScript y Python son vistas del mismo programa.
Mirar y volver no ejecuta ni detiene. Ejecutar valida y convierte antes de
reemplazar la sesión. Una conversión rechazada conserva texto, bloques y resultado;
indica causa y línea y ofrece seguir editando, volver a bloques con confirmación
o crear una copia independiente con el texto exacto. El formato puede regenerarse
y se avisa la primera vez. La consulta Código conserva su fuente derivada de lectura.

El diff conserva IDs no afectados, incluidos bloques numéricos y shadows,
comentarios y posiciones de eventos. scriptOrder conserva el orden textual sin
mover los eventos; un arrastre nativo de raíces restablece el orden visual.
La validación en la shell precede al commit. La generación de carga invalida
candidatas de otro proyecto aunque sus bytes de autoría coincidan.

## Continuidad

GGPROJ v5 añade vista activa, texto pendiente, orden y puntos de restauración.
Las versiones 1–4 siguen legibles; v4 sigue siendo la versión que declara APIs.
Antes de aplicar un cambio se intenta confirmar su punto local. Si IndexedDB
falla, el error de guardado permanece visible; edición, ejecución, Deshacer en
memoria y descarga portable siguen disponibles, sin afirmar un guardado confirmado.

Deshacer conserva los IDs del programa anterior y no modifica el resultado activo.
Si hay texto pendiente o ediciones posteriores se pide confirmación antes de
descartarlas. Los metadatos baselineSource importados no conceden confianza para
saltar el parser. Escribir, detener o sustituir un proyecto cancela análisis antiguos.
El fallo de apertura revierte también borradores que aún no serían exportables.

Texto 2D conserva los documentos independientes anteriores API1/API2.
Los nuevos documentos JavaScript/Python empiezan en API3 con eventos y hero.move,
con ayuda acorde a la API seleccionada. Los recorridos nuevos de guardar/reabrir
se migran a API3; se conservan las pruebas del puente histórico y su compatibilidad.

## Evidencia aprobada

- Viabilidad inicial corregida: 9/9 programas, todos los IDs y posiciones;
  cero IDs perdidos. El intento con 38 IDs regenerados se conserva en su acta.
- Diff estructural: 491/491 propiedades en worker real; 489 reconstrucciones y
  dos rechazos explícitos de ámbito. Acta SYNCED-CODE-VIEWS-STRUCTURAL-DIFF.md.
- Python: nueve programas completos reconstruidos por Pyodide real, con IR,
  workspace, IDs y posiciones iguales. Corpus AST local de 491 variantes,
  incluidas inserciones, eliminaciones, reemplazos, números y comentarios;
  dos rechazos de shared sin asignación global. Sus pruebas verifican
  explícitamente los IDs no afectados. No se equipara CPython con Pyodide.
- browser-6.json: 17/17 casos, incluidos flujos de usuario, carga Python,
  GGPROJ en perfil nuevo, guardado no disponible, cancelación, metadatos no
  confiables, mezcla de packs, nuevos documentos API3 y zoom nativo 200/400 %
  en escritorio y ventana estrecha.
- Quick previo a las correcciones de actividad y canal offline: 469 Node,
  76 herramientas, build incremental y tres smoke.
  quick-1/quick-results.json confirma exitCode 0 y baselineWritten false.
  La ampliación posterior de las aserciones Python se repitió aparte, 2/2.
- Affected del corte 2D: 469 Node, 76 herramientas y 85 E2E, sin fallos,
  reintentos ni omisiones; build y OpenSpec 35/35.
  affected-1/affected-results.json confirma exitCode 0 y baselineWritten false.
  Este perfil usa la selección explícita de lenguaje/persistencia/zoom/offline
  guardada en affected-2d-plan.json; no cubre el plan global conservador completo.

La evidencia se conserva bajo artifacts/synced-code-views/views-20261026/.
La puerta Python del navegador está en browser-4.json y su python-corpus.json;
los conteos de ese reporte completo son 9/10, porque falló otro caso de Undo
portátil, corregido y aprobado después. No se presenta ese reporte como aprobado.

## Intentos conservados

1. browser-1: 1/4. Las pruebas usaban check() para un radio cuya transición
   asíncrona puede rechazarse; se cambió por clic real y comprobación del estado final.
2. browser-2: 4/4 recorridos JavaScript.
3. browser-3: 7/9. Una lectura de runtime se emitía antes del fin de la carga;
   se espera el estado observado de ejecución. Deshacer podía descartar un
   borrador posterior; ahora requiere confirmación.
4. browser-4: 9/10. Deshacer tras reabrir requería distinguir texto pendiente
   de una generación comprobable y esperar a que terminara la restauración.
5. browser-5: 30/35. Zoom reprodujo pérdida de caret al volver a 2D; se restaura
   su selección. Los documentos nuevos API3 se verificaban con código/estado
   API1; se migraron los recorridos y se espera el estado de eventos activos.
6. browser-6: 17/17. La captura móvil de página completa dejó el canvas fuera de
   pantalla suspendido; se recaptura editor y resultado visible por separado.

7. browser-7: 1/3. Se reprodujeron dos fallos reales de integración: el chequeo
   de actividad usaba la ejecución anterior con texto pendiente; ahora la identidad
   incluye ese borrador. El nonce en query del iframe impedía recuperarlo desde
   caché offline; se trasladó al fragmento conservando origen, fuente, nonce y
   puerto privado, sin relajar el contrato de caché.
8. browser-8: 2/3. Las conversiones frías avanzaron, pero el recorrido posterior
   agotó el tiempo buscando una copia 3D antes de terminar de añadir el contexto.
   Se espera el modo visible antes de buscar sus herramientas; no se aumentó
   el presupuesto. El perfil afectado posterior aprobó el recorrido completo.

El detector visual se ejecutó una vez: seis avisos evaluados por un reviewer
fresco como no materiales en las regiones modificadas. Su disposición fue ship
para el corte visual 2D, con cinco secciones; no audita exhaustivamente el parser.
La comprobación fresca del documenter confirmó que se conserva el sistema y
sus tokens. Se registró el drift observado del sidecar sin repararlo. Informes:
finish-review.md y documentation-review.md, en la carpeta de evidencia.

## Cierre del corte 2D y pendientes del cambio

La visita fría completa aprobó con un proceso nuevo de Chromium y los seis
servidores apagados. JavaScript/Python convierten cambios y Deshacer restaura
exactamente el programa, conservando x=80 en la ejecución activa. La evidencia
específica está en affected-1/cases/offline-synced-views.json y el recorrido
completo en offline-second-visit.json. También aprobaron los recorridos posteriores
de 3D/web y las copias API1/API2, sin habilitar sincronización en esos contextos.

Se completaron 3.1, 3.2, 3.3 y 4.1, con una comprobación OpenSpec después de
cada casilla. El cambio está en 8/13. Micro:bit conserva su TypeScript
independiente; 3D/web mantienen sus copias; la actividad revisión 1 y su progreso
siguen vigentes. Quedan 4.2, 4.3, 5.1, 5.2 y el cierre documental global 5.3.

El siguiente paso es 4.2: parser Static TypeScript sobre las plantillas instaladas,
validación con el contrato de dispositivo y prueba de HEX idéntico tras ida y
vuelta sin cambios, antes de modificar su interfaz. No reutilizar IR0 como si
fuera la IR del dispositivo o IR1 de 3D/web.

El plan global affected-all-plan.json exige cobertura completa (39 archivos
de navegador) y no se ejecutó como parte de este perfil acotado. La puerta full
de todo synced-code-views sigue pendiente; no se avanzó baseline. La full
histórica de estabilización/continuidad (435/74/217) no certifica estas fuentes.
No se hizo commit, archivo ni push. La aceptación docente, tecnologías de
asistencia y equipos escolares permanece separada.
