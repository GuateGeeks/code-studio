# GuateGeeks Code Studio

Code Studio es un editor educativo web en español con bloques Blockly, lectura de código derivado y documentos JavaScript/Python independientes. La dirección aprobada el 24/10/2026 convierte la lectura en vistas sincronizadas del mismo programa (ver «Programa único con vistas sincronizadas»). Reúne contextos 2D, micro:bit, Scratch importado, 3D y aplicaciones web dentro de proyectos GGPROJ.

## Público y tarea confirmados

El usuario confirmó principiantes con acompañamiento docente como prioridad para el primer recorrido. La tarea es iniciar o retomar una creación, modificar bloques, anticipar un resultado, ejecutar, observar, detener y recuperar el trabajo. El docente facilita la conversación y prepara el uso offline.

El alcance autorizado incluye E1 `studio-guided-first-creation`, E2 `studio-contextual-workspace`, E3 `studio-educational-activities`, el primer editor 2D integrado E4 `studio-integrated-2d-editor` y sus extensiones `studio-integrated-microbit-workspace`, `studio-integrated-scratch-workspace`, `studio-integrated-3d-workspace` y `studio-integrated-web-workspace`, dentro de `openspec/changes/`. Sus especificaciones y tareas determinan el alcance. E3 conserva su verificación de software y la revisión docente pendiente. El corte 2D y la extensión micro:bit están implementados y verificados técnicamente. La puerta final micro:bit aprobó 400 Node, 63 herramientas y 155 E2E (3 smoke + 152 regresiones), con 18 cambios OpenSpec y preservación upstream; su evidencia se registra en docs/product/integrated-microbit-evidence.json. Las pruebas quick, focales y affected se conservan como evidencia separada. F0–F7 y las verificaciones previas de E3/2D son evidencia histórica.

## Editor integrado E4: 2D, texto, micro:bit, Scratch importado, 3D y web

Programa y escenario comparten el espacio de escritorio. El transporte común permite ejecutar y detener; bajo el escenario, un panel de consulta desplazable da acceso a actividad, propiedades, código, diagnósticos, ayuda y recursos. Consultar una herramienta conserva el programa y el estado de la actividad. En poco ancho, poca altura o zoom, programa, resultado y herramientas vuelven al flujo del documento con enlaces para editar, ver el resultado y alcanzar Detener.

La extensión micro:bit reúne bloques de firmware o un documento TypeScript independiente, placa simulada y escena 2D. Ejecutar dispositivo y escena y Detener dispositivo y escena viven en el transporte común. La consulta Firmware agrupa variante, compilación, descarga HEX, transferencia USB y fuente seleccionada de solo lectura. El único editor TypeScript ocupa la autoría principal en modo texto y vuelve a Firmware en modo bloques; cambiar de modo conserva ambas versiones sin conversión implícita. Simulación, firmware válido y prueba física son resultados distintos.

La extensión Scratch importado sitúa importación, revisión del original de solo lectura y cobertura por objeto y bloque a la izquierda, con resultado y consulta a la derecha. Ejecutar Scratch y Detener Scratch comparten el transporte común. Original y copia reúne descarga exacta del original identificado por SHA-256, copia editable explícita solo para cobertura `gg-editable` y lectura secundaria del resultado actual. La copia reemplaza el programa 2D después de validar la traducción completa y abre ese contexto sin ejecutar; original y copia conservan autorías independientes. La cobertura `vm-compatible` permite ejecución Scratch sin prometer copia y `unsupported` conserva el original descargable con ejecución y copia bloqueadas.

Los avisos y la cancelación conservan un único grupo compartido de controles junto al importador Scratch; si al terminar la cancelación se oculta su botón enfocado, el foco vuelve al importador pertinente. Archivo inválido y cancelación conservan el proyecto vigente. Importar, consultar, copiar o reabrir no ejecuta automáticamente. En escritorio Scratch usa un espacio de trabajo de al menos 600px de alto con consulta desplazable; bajo 1060px de ancho o 700px de alto usa flujo de documento y enlaces de retorno/Detener.

La revisión fresca `artifacts/e4sb-finish-review.md` emitió `ship` sin correcciones materiales, con 13 capturas en `.impeccable/review/e4sb/`. Quick aprobó 400 Node, 63 herramientas y tres smoke; el focal aprobó 19/19. Affected aprobó 54/54 casos de navegador y la puerta completa final aprobó 400 Node, 63 herramientas y 160 E2E (3 smoke + 157 regresiones), 19 cambios OpenSpec y preservación de los tres upstreams, con fuentes estables y cold offline. Su evidencia se conserva en docs/product/integrated-scratch-evidence.json. Los resultados del corte se registran en docs/product/INTEGRATED-SCRATCH-RESULTS.md.

La extensión 3D sitúa los bloques o el único editor compartido de documentos JavaScript/Python independientes a la izquierda, y el iframe 3D existente con consulta a la derecha. Ejecutar escena 3D y Detener comparten el transporte superior. Objetos 3D reúne objetos, cámara, propiedades y modelos GLB del estado inicial; aplicar valida antes de sustituir la autoría y no convierte la escena runtime en estado guardado ni inicia ejecución. Código 3D reúne fuente derivada de solo lectura, copias explícitas e independientes y exportación autónoma. Cambiar modo, consultar, copiar o reabrir conserva la autoría sin ejecución automática. La ayuda propone predecir un movimiento con el docente, cambiar un valor y comparar.

En escritorio desde 1060×700, 3D conserva las dos columnas y la consulta desplazable, con workspace de al menos 700px, iframe de 300px y área principal que contiene ambas columnas antes del pie. En estrecho y zoom vuelve al flujo del documento con enlaces de retorno y Detener. El incremento está implementado y verificado técnicamente: affected aprobó 42/42 casos y full aprobó 400 Node, 63 herramientas y 164 E2E (3 smoke + 161 regresiones), 20 cambios OpenSpec y preservación de los tres upstreams, con fuentes estables y cold offline. La revisión inicial pidió separar estado/error de la etiqueta textual y actualizar documentación; el dictamen posterior artifacts/e43d-finish-verdict.md puntuó ambas correcciones resueltas (`ship` para esa lista). La evidencia final se conserva en docs/product/integrated-3d-evidence.json.

La extensión web sitúa los bloques o el único editor compartido JavaScript/Python independiente a la izquierda, y la aplicación interactiva en su iframe aislado con consulta a la derecha. Ejecutar aplicación web y Detener usan el transporte común. Componentes web reúne componentes y propiedades del estado inicial guardado; aplicar valida antes del reemplazo, sin ejecutar ni modificar el formulario o la lista en uso. Código web reúne fuente derivada de solo lectura, copias explícitas e independientes y exportación autónoma. Consultar, copiar, cambiar modo y reabrir conservan la autoría sin ejecución automática. La guía propone anticipar con el docente qué añadirá el formulario, cambiar un valor, enviar, comparar y probar una variante; no añade una actividad educativa.

En escritorio desde 1060×700, web conserva la proporción 1.45:1, workspace de al menos 700px, iframe de 300px, consulta desplazable y pie debajo de ambas columnas. En estrecho y zoom vuelve al flujo de documento con enlaces de retorno y Detener. Estado y error permanecen separados del editor textual desplazable; crear una copia enfoca el mismo editor conservando su etiqueta visible. La revisión artifacts/e4web-finish-review.md verificó las 13 capturas y pidió corregir la documentación actual. Quick aprobó 400 Node, 63 herramientas y tres smoke; el focal ampliado aprobó 21/21. Affected aprobó 46/46 casos y full aprobó 400 Node, 63 herramientas y 168 E2E (3 smoke + 165 regresiones), 21 cambios OpenSpec y tres upstreams preservados, con fuentes estables y cold offline. Evidencia en docs/product/integrated-web-evidence.json; las puertas anteriores conservan su historia propia. El dictamen artifacts/e4web-finish-verdict.md puntúa resuelta la corrección documental del revisor (`ship` para esa lista).

Scratch y MakeCode son referencias funcionales para la proximidad de programa, resultado y consulta. La implementación conserva la identidad y los controles existentes. Las extensiones locales micro:bit, Scratch importado, 3D y web siguen el patrón 2D en modo Operate y ejecución code-led; el patrón funcional está implementado en los seis contextos. La revisión transversal del 23 de octubre está documentada en docs/product/E4-CROSS-CONTEXT-REVIEW.md, con ocho hallazgos priorizados. El rework visual (studio-visual-workspace-rework) está implementado; véase la sección siguiente. La aceptación con docentes, estudiantes, tecnologías de asistencia y equipos físicos siguen pendientes. Este alcance no constituye el cierre de toda E4.

## Rework visual del espacio (studio-visual-workspace-rework)

El 23 de octubre de 2026 se implementó el rework de presentación de los seis contextos sobre la integración E4. El usuario confirmó conservar la identidad visual existente y organizar el espacio como Scratch con piezas de MakeCode. La cabecera compacta reúne proyecto, guardado, Inicio, Archivo y Preparar para clase. El programa ocupa la izquierda; a la derecha están el transporte (Ejecutar nombrado por su autoría y un único Detener), el resultado y la consulta con pestañas reales. «Editando…» y «Resultado de…» identifican qué se edita y de dónde viene el resultado; una nota avisa cuando el resultado pertenece a otro contexto o muestra una versión anterior, y ejecutar sigue siendo una acción explícita. Bloques 3D/web, propiedades, cobertura Scratch y diagnósticos conocidos se presentan en español con el detalle técnico disponible; las validaciones se explican dentro del formulario. El estado del original Scratch y su siguiente acción están junto a la importación. Las actividades E3 se muestran como tutorial por pasos y anuncian su destino 2D desde otros contextos. Resultados, pruebas y límites en docs/product/VISUAL-REWORK-RESULTS.md; la aceptación con docentes, estudiantes, lector humano y equipos físicos sigue pendiente.

## Programa único con vistas sincronizadas (decisión del 24 de octubre de 2026)

El usuario aprobó adoptar el modelo de MakeCode para el paso de bloques a texto ([ADR-011](docs/adr/011-contrato-de-lenguaje-y-vistas-sincronizadas.md)). **Estado: dirección aprobada, implementación pendiente.** El comportamiento actual descrito en las secciones anteriores sigue vigente hasta que cada cambio apruebe su puerta.

- **Un programa, tres vistas.** Bloques, JavaScript y Python son vistas del mismo programa. El estudiante puede editar el texto y volver a bloques conservando los cambios, siempre que el código esté dentro del subconjunto que tiene bloques.
- **Rechazo sin pérdida.** Si el código tiene un error o usa algo sin bloque, no se cambia de vista. Se explica la causa con su línea y se ofrece seguir editando, volver a la última versión en bloques o guardar el texto como copia independiente.
- **Código legible.** El código que ve el estudiante usa nombres reconocibles (`hero.move(10)`, `basic.showNumber(3)`) y deja de mostrar el mecanismo interno (`GG.`, `ctx`, `gg_*`).
- **Packs como contrato de lenguaje.** Cada bloque declara, como datos revisados, su forma en bloques, JavaScript y Python y cómo se ejecuta en su contexto. Un pack aporta todas sus vistas a la vez.
- **Compatibilidad.** Los proyectos y copias guardados siguen abriéndose y ejecutándose; las copias anteriores conservan su texto.
- **Se conservan:** la copia independiente para el código libre, la ausencia de ejecución automática, el único Detener, el uso offline y sin cuenta, y los seis orígenes.

Orden de implementación: `pack-versioning-and-migrations` → `block-language-contract` → `synced-code-views` (2D JavaScript, 2D Python, micro:bit TypeScript, 3D/web). La actividad «De bloques a tu propio código» tendrá una revisión 2 basada en editar y volver; la revisión 1 y su progreso se conservan. El Exp. 1 con docentes comparará el modo sincronizado con la copia independiente y puede cambiar cuál es el modo predeterminado.

## Hoja de ruta de maduración (propuesta del 24 de octubre de 2026)

El [plan de maduración por feature](docs/product/FEATURE-MATURATION-PLAN.md) ordena la evolución posterior a E4 y al rework, y sustituye la secuencia E0–E6 del [plan de acción del 22/10](docs/product/PLAN-DE-ACCION-2026-10-22.md) desde ese punto. **Estado: propuesta.** Están decididos ADR-011 y el archivado de los cambios completos (D8). El resto depende de las decisiones abiertas D1–D7 y de que cada cambio OpenSpec se apruebe por separado.

**Diagnóstico.** El producto es ancho y poco profundo:

- 2D tiene un único sprite y unos 16 bloques;
- micro:bit tiene 12 bloques;
- 3D y web usan campos de texto libre;
- el editor de texto es un área de texto simple;
- solo hay tres actividades.

El cuello de botella es la expresividad de cada contexto y el contenido, no la arquitectura.

**Escala de madurez.**

| Nivel | Significado |
|---|---|
| N0 | Demostración |
| N1 | Verificado por pruebas |
| N2 | Comprensible |
| N3 | Expresivo: los **proyectos canónicos** del contexto se construyen solo con bloques y menús, por ejemplo «Atrapa la fruta», «Laberinto», «Dado», «Mensajes por radio», «Lista de tareas persistente» |
| N4 | Validado con personas, equipos escolares o placa física |

El piloto apunta a N3 en 2D, texto, micro:bit y actividades, y a N4 en 2D, actividades y offline.

| Ola | Contenido | Estado |
|---|---|---|
| 0 · Higiene | `repo-baseline-and-spec-consolidation`, `pack-versioning-and-migrations`, `test-gate-scaling` | Línea base aplicada el 24/10: commit `670ab20`, etiquetas, 22 cambios archivados y 26 especificaciones consolidadas ([acta](docs/engineering/REPO-BASELINE-RESULTS.md)). `pack-versioning-and-migrations` aplicado el 24/10 ([acta](docs/engineering/PACK-VERSIONING-RESULTS.md)); `test-gate-scaling`, propuesto |
| 1 · Núcleo 2D y texto | `block-language-contract`, multi-sprite, vocabulario 2D v2, `synced-code-views`, editor de código, modelo de continuidad, biblioteca de recursos | Dos cambios propuestos; el resto, por redactar |
| 2 · Aprendizaje | Actividades v3 con feedback graduado, unidades, entrada «actividad primero», catálogo CNB, contenido; **Exp. 1** en aula | Por redactar; requiere D1 y un docente |
| 3 · Capacidades | micro:bit v2 con radio y prueba física, bloques tipados 3D/web, Scratch importado multi-sprite | Por redactar |
| 4 · Distribución y acceso | Despliegue en seis orígenes HTTPS, cohortes opcionales, lector de pantalla humano, catálogo de cadenas; **Exp. 2** | Por redactar; requiere D2 |
| 5 · Docente y Sócrates | Paquete de entrega, contrato v0 con Sócrates, autoría docente | Por redactar; requiere el contrato con Sócrates |

**Decisiones abiertas del plan.**

- D1: segmento y grado del piloto.
- D2: equipos y conectividad.
- D3: uso comercial.
- D4: idiomas mayas.
- D5: multi-sprite y GGPROJ v4.
- D6: CodeMirror 6.
- D7: editor de escena 3D en el piloto.
D8 (archivar los 22 cambios completos) se resolvió y aplicó el 24/10. D9 (vistas sincronizadas) quedó resuelta por ADR-011.

## Verdad de producto

- La autoría se conserva localmente, con confirmación de guardado y archivo portable. Abrir o recuperar no ejecuta programas.
- Hoy el código derivado es de solo lectura y Crear copia genera otro documento independiente, sin sincronización inversa. Por decisión del 24/10/2026 (ADR-011), las vistas sincronizadas sustituirán la lectura de solo lectura dentro del subconjunto bloqueable; la copia independiente se mantiene. Ningún texto se convierte en bloques sin una acción explícita del estudiante, y ninguna conversión ejecuta el programa.
- La preparación offline requiere recursos verificados y el mismo perfil del navegador. Crear y recuperar no exigen cuenta.
- Los checks de actividades acreditan condiciones del programa, no comprensión del estudiante. Observar una predicción y una explicación requiere participación humana.
- Los runtimes y renderers conservan sus seis orígenes y contratos; la interfaz no concede permisos nuevos a proyectos importados.
- El resultado identifica su contexto de ejecución. Cambiar de contexto o consultar herramientas no inicia ejecución; el único Detener actúa sobre el resultado activo, de cualquier contexto.

## Decisiones abiertas

Edad, grado, currículo, nivel lector, duración de clase, equipos escolares y alcance móvil final no están confirmados. Tampoco existe aquí una identidad visual oficial aprobada ni contrato implementado con Sócrates. Los sprites del proyecto son recursos de demostración.

Fuentes: README, docs/phase-6/RESULTS.md, docs/phase-7/RESULTS.md, docs/phase-7/TEACHER-GUIDE.md, docs/product/PLAN-DE-ACCION-2026-10-22.md y los cambios openspec/changes/archive/2026-10-24-studio-integrated-2d-editor/, openspec/changes/archive/2026-10-24-studio-integrated-microbit-workspace/, openspec/changes/archive/2026-10-24-studio-integrated-scratch-workspace/, openspec/changes/archive/2026-10-24-studio-integrated-3d-workspace/ y openspec/changes/archive/2026-10-24-studio-integrated-web-workspace/. La dirección de vistas sincronizadas se rige por docs/adr/011-contrato-de-lenguaje-y-vistas-sincronizadas.md, docs/product/FEATURE-MATURATION-PLAN.md y los cambios openspec/changes/pack-versioning-and-migrations/, openspec/changes/block-language-contract/ y openspec/changes/synced-code-views/. La puerta micro:bit se registra en docs/product/INTEGRATED-MICROBIT-RESULTS.md y su integrated-microbit-evidence.json; el incremento Scratch conserva su estado de verificación en docs/product/INTEGRATED-SCRATCH-RESULTS.md, 3D en docs/product/INTEGRATED-3D-RESULTS.md y web en docs/product/INTEGRATED-WEB-RESULTS.md. La aceptación con docentes, estudiantes, tecnologías de asistencia, dispositivos escolares y hardware físico permanece separada de las pruebas automatizadas.

