# Actividades educativas · E3

Estado: software implementado y verificado. Cambio `studio-educational-activities`, diez tareas técnicas completas. Revisión docente y comprensión observada pendientes.

## Contrato y compatibilidad

El esquema v2 añade `learning` con objetivo, conocimientos previos, predicción, reflexión y reto variante. El reto tiene ID, título, instrucciones, predicción, reflexión, pistas y checks declarativos revisados. El lector v1 conserva sus campos exactos y no exige los nuevos. Se mantienen los límites de tamaño, profundidad y predicados; ningún campo concede ejecución o red.

Los tres starters, IDs y checks principales del catálogo E2 conservan revisión 1. El esquema de presentación cambia a v2; no cambia la meta técnica principal ni se invalida el historial anterior. La fixture `tests/fixtures/lessons-v1.json` se obtuvo del snapshot E2 real y comprueba esta compatibilidad. Cambiar una meta principal existente en el futuro exige nueva revisión.

El registro de progreso v1 sigue separado de GGPROJ y admite los IDs nuevos `story-variant`, `score-variant` y `text-variant`. Un ID del reto no acredita pasos principales. Cambiar de recorrido revoca lecturas y guardados pendientes; no modifica ni ejecuta el proyecto. Cargar ejemplo conserva el reemplazo protegido existente y vuelve al principal.

## Guía educativa

Las tres actividades explicitan objetivo, requisitos, predicción y reflexión. Las pistas orientan observación, relación y acción; se revelan una por vez y se conservan al volver durante la sesión. Predicción y explicación se conversan con el docente o se anotan por cuenta propia; la aplicación no guarda ni califica respuestas. Los checks acreditan condiciones técnicas, sin afirmar comprensión.

| Actividad | Meta principal conservada | Reto variante |
|---|---|---|
| Historia | x=60 y cambio de disfraz declarado | x=80 y explicar otra combinación |
| Puntos | 3 puntos y x=30 | 4 puntos y x=40 |
| Copia textual | Procedencia, bloques intactos y x=18 | Procedencia, bloques intactos y x=24 |

## Evidencia y límites

Se aplican Impeccable y las skills propias de aprendizaje, diseño y arquitectura local. La revisión de [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), consultada el 22 de octubre de 2026, cubre los cambios HTML/CSS y de vista: controles nativos, nombres accesibles acordes al texto visible, foco, estados anunciados, lectura acotada y ausencia de animación decorativa. El recorrido transitorio no se convierte en autoría ni requiere URL persistente; prevalecen español y contratos del producto. La inspección renderizada detectó y corrigió el espacio vacío de una columna, dando al panel una fila completa.

El snapshot `artifacts/e3-baseline/source.tar.gz` conserva 530 archivos con hashes y tres muestras restauradas. La evidencia E1/E2 permanece histórica. La puerta `npm run test:full` aprobó **400 Node, 63 herramientas y 147 E2E (3 smoke + 144 regresiones)**, sin fallos, omisiones ni reintentos. Validó estrictamente 16 cambios OpenSpec y preservó commits, diffs y locks de los tres upstreams. La referencia de impacto avanzó únicamente al aprobar con fuentes estables.

Entorno: Ubuntu/WSL, Node v22.23.4 y Chromium fijado por Playwright. Inicio UTC `2026-10-23T03:33:22.389Z`; fin UTC `2026-10-23T04:00:40.186Z`; duración 27.3 minutos. La [evidencia JSON](educational-activities-evidence.json) conserva los siete pasos, conteos, guardas y SHA-256 agregado de 142 fuentes runtime coincidentes con la puerta aprobada. CodeGraph se consultó y sincronizó.

Las pruebas incluyen cinco recorridos nuevos: historia con teclado/pistas/recuperación en escritorio y vista estrecha, cuatro puntos y copias JS/Python con bloques intactos. El offline frío detuvo navegador y seis servidores; después se leyó la guía, reveló una pista y completó el reto de historia hasta x=80. Las suites de accesibilidad verificaron teclado y zoom real 200/400 %. Las capturas se inspeccionaron en 1280×900 y 390×844.

Los reportes focales permanecen separados: modelo/controlador 25/25; quick final 400 Node, 63 herramientas y 3 smoke; primera suite actividades/packs 14/14; suite final de nombres accesibles y offline 6/6. La corrida intermedia de accesibilidad/actividades/offline pasó 13/14: su aserción posterior todavía comparaba el programa inicial tras editar deliberadamente el reto; se corrigió para preservar el programa editado, conservando la comparación estricta. Esa corrida fallida se conserva en `artifacts/e3-focal-attempt1.*` y no se presenta como aprobada. No se suman focales como full. La primera corrida integral se interrumpió después de 24/144 casos aprobados: la sesión dejó de existir y se verificó que no quedaba proceso de la suite. Se conservan log, plan y estado en `artifacts/e3-full-attempt1-*`; no avanzó la referencia. La puerta aprobada anterior es una corrida nueva completa, con las mismas fuentes. La revisión con docente/estudiantes, lector humano y hardware físico permanece pendiente; véase el [guion de observación](E3-TEACHER-OBSERVATION.md).
