# Espacio de trabajo contextual · E2

Estado: implementado y verificado. Cambio `studio-contextual-workspace`, diez tareas completas. Público: principiantes con acompañamiento docente.

La barra de contexto organiza Editar, Ver resultado, Ayuda y herramientas, Diagnósticos y Preparar para clase. El mismo recorrido sirve para bloques 2D, documentos JavaScript/Python para 2D, micro:bit, Scratch importado, escena 3D y aplicación web. La ayuda explica la tarea y enlaza inspector, biblioteca, objetos o documento TypeScript cuando corresponden.

El editor textual se reutiliza junto a los controles de 3D/web cuando su modo selecciona un documento independiente. El destino aparece explícito y Ejecutar documento 2D se oculta en esos contextos. Navegar conserva los borradores y proyecta la selección del contexto sin modificar la selección guardada para 2D. Copiar es una acción explícita y no ejecuta ni modifica los bloques.

El resultado compartido tiene rótulo propio y Detener resultado. Cambiar el contexto de edición no ejecuta, detiene ni reasigna ese rótulo. Los diagnósticos siguen enlazando fuentes reales, revelando el editor correspondiente antes de enfocar.

La regresión integral detectó además una carrera del validador de recursos compartido: abrir un proyecto 3D mientras autosave validaba sus recursos podía cancelar una lectura válida con `AbortError`. El controlador ordena ahora las lecturas de validación, manteniendo el worker de un solo trabajo y propagando cada error a su solicitante. Una lectura inválida no bloquea las posteriores. La autoría, el formato y las transacciones de guardado conservan sus contratos.

## Evidencia

El snapshot `artifacts/e2-baseline/source.tar.gz` y su manifest conservan 518 archivos previos con SHA-256 y tres muestras restauradas. Los resultados E1 y F0–F7 se conservan. La puerta `npm run test:full`, en Ubuntu/WSL con Node v22.23.4 y Chromium fijado por Playwright, aprobó con fuentes estables: **392 Node, 63 herramientas y 142 E2E (3 smoke + 139 regresiones)**, sin fallos, omisiones ni reintentos. OpenSpec validó estrictamente los 15 cambios y la comprobación upstream conservó commits, diffs y locks de los tres motores. La referencia de impacto avanzó únicamente al aprobar.

Inicio UTC: `2026-10-23T01:55:28.762Z`; fin UTC: `2026-10-23T02:20:50.222Z`; duración total: 25.4 minutos. El [JSON de evidencia](contextual-workspace-evidence.json) conserva pasos, conteos y SHA-256 agregado de 142 fuentes runtime, comparadas con la puerta aprobada. CodeGraph se sincronizó antes de la consolidación.

La regresión incluye los seis casos E2, teclado, zoom real, movimiento reducido, vista estrecha, diagnósticos 3D, copias independientes, aislamiento de los seis orígenes, guardado/recuperación, reapertura GLB y segunda visita offline con navegador y seis servidores detenidos. Las capturas de escritorio/texto/estrecho están en `artifacts/e2-desktop-workspace.png`, `artifacts/e2-desktop-text.png` y `artifacts/e2-narrow-text.png`.

Quick y focales conservan reportes separados: navegación contextual, recursos concurrentes, controles visibles/iframes, diagnóstico 3D, audio real y reapertura Scratch. No se suman a full. Los intentos fallidos o interrumpidos permanecen bajo `artifacts/e2-full-attempt*`; la última corrida fallida fue 138/139 por la consulta prematura documentada abajo. La corrección focal aprobó 2/2 antes de esta consolidación.

Las pruebas nuevas están en `tests/browser/studio-contextual-workspace.spec.mjs`. Las pruebas anteriores usan `workspace-controls.mjs` para acceder por el selector visible a controles que ahora pertenecen a un contexto; se mantienen los predicados y clics reales, sin forzar interacción ni añadir reintentos.

## Revisión de interfaz

Se usa Impeccable y las tres skills propias del producto. La revisión de [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), consultada el 22 de octubre de 2026, cubre semántica, foco, formularios, navegación, movimiento reducido y desbordamiento de los cambios. No se añaden fuentes, motores, permisos, peticiones de IA ni dependencias.

Las reglas genéricas de URL para filtros no convierten la navegación transitoria del editor en autoría o estado portable. El español y el vocabulario aprobado del producto prevalecen sobre recomendaciones de Title Case o sustitución de conjunciones. La imagen de recursos existente no tiene dimensiones fijas porque muestra medios importados de tamaños variables; se conserva oculta hasta disponer de un recurso válido.

El detector Impeccable conserva dos avisos heurísticos: imagen sin `src` (recurso condicional oculto) y margen interior de `keyboard-help` (la regla vigente establece `padding-block: 8px`). La lectura computada final confirma 8 px arriba y abajo. La vista final ejecutó una copia textual con resultado x = 25, identificó su documento y no presentó desbordamiento global a 390 px; las capturas se inspeccionaron visualmente. Los JSON se conservan en `artifacts/e2-design-detection.json` y `artifacts/e2-preview-check.json`. El registro PRODUCT usa un esquema anterior de Impeccable: actualizarlo con `init` es mantenimiento opcional fuera de E2, sin reinterpretar las decisiones confirmadas.

La reproducción de diagnóstico a 1280×900 identificó un problema de hit-test de Chromium al hacer clic automáticamente después de desplazar la página junto a un iframe de otro origen: ningún evento llegaba al botón de consola. El helper coloca el control en pantalla, espera dos frames del compositor y hace un clic real; conserva la aserción de foco/línea. No se añade `force`, reintento ni espera temporal arbitraria al test.

El mismo acceso visible se aplica de forma consistente a los clics sin coordenadas de las suites, incluidas copias, controles GG, ventanas e iframes. Se conservan los clics con coordenadas, las interacciones de teclado y todas las aserciones. La adaptación se realiza sobre expresiones de llamada analizadas, excluyendo funciones ejecutadas dentro del navegador y helpers que ya estabilizan el scroll. La suite conserva un worker, cero reintentos y sus timeouts; `maxFailures: 0` recoge todos los fallos de una corrida. Cualquier fallo sigue rechazando la puerta y evita avanzar la referencia.

Para controles dentro de iframes anidados, se revelan primero sus marcos contenedores, del exterior al interior. Esto evita esperar la estabilidad de un elemento cuyo marco aún está fuera de pantalla. Los handles temporales se liberan después de la acción, incluso si Stop destruyó ese marco.

La reapertura Scratch espera el estado visible «Bloques ejecutados» antes de consultar la posición. Consultar directamente el probe inmediatamente después del clic podía recibir `GG scene loading` durante la carga legítima del programa. Se conserva la comprobación de posición y la corrida fallida con su traza; no se convierte una consulta prematura en un reintento del test.

El corpus de equivalencia textual usa un perfil Chromium con audio ya permitido: cada backend ejecuta una vez. La secuencia anterior pulsaba después de Ejecutar un botón que reinicia la bandera nativa, mientras en texto solo habilita audio; si el programa corto terminaba antes del gesto, comparaba dos ejecuciones nativas con una textual. Se conserva la medición Web Audio real, posición, frecuencia y tiempos, y se exige una única reproducción. Las suites de audio/recursos mantienen por separado la política de activación y la suspensión nativa real. Este perfil de prueba no cambia la política del producto.

## Límites

Las verificaciones de laboratorio no demuestran comprensión del estudiante, accesibilidad con lector humano, compatibilidad en equipos escolares ni firmware en placa. E3 (evolución educativa), E5 (aula/hardware) y E6 (Sócrates) conservan sus propias condiciones. Observar con un docente si una persona puede nombrar documento y destino, predecir qué ejecutará y explicar por qué una copia no cambia sus bloques sigue pendiente.
