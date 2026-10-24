# Plan de evolución de GuateGeeks Code Studio

> **Nota del 24 de octubre de 2026:** desde el cierre de E4 y del rework visual, la secuencia de este documento queda sustituida por el [plan de maduración por feature](FEATURE-MATURATION-PLAN.md) (olas 0–5) y por [ADR-011](../adr/011-contrato-de-lenguaje-y-vistas-sincronizadas.md). Este plan conserva su valor histórico para E0–E4; E5 (aula) y E6 (Sócrates) continúan en las olas 2, 4 y 5 del plan nuevo.

Preparación posterior del 23 de octubre: [revisión transversal E4](E4-CROSS-CONTEXT-REVIEW.md) completada como auditoría y recorrido heurístico, con ocho hallazgos priorizados y evidencia nueva. [Brief](VISUAL-REWORK-BRIEF.md), cambio `studio-visual-workspace-rework` y [prompt para Claude Opus](CLAUDE-OPUS-VISUAL-REWORK-PROMPT.md) preparados. El usuario pidió delegar la implementación: no se ha aplicado el rework y las 19 tareas siguen pendientes. Observación humana/física y E5/E6 conservan alcance separado. El estado anterior y los hitos siguientes permanecen históricos.

Fecha: 22 de octubre de 2026, Guatemala; actualización 23 de octubre. E1/E2 completos, E3 verificado técnicamente con revisión docente pendiente. E4 tiene el patrón funcional integrado en 2D/texto, micro:bit, Scratch, 3D y web; la última puerta aprobó 400 Node, 63 herramientas y 168 E2E (3 smoke + 165 regresiones), 21 cambios OpenSpec y tres upstreams preservados. Siguen revisión transversal, brief/rework visual y aceptación humana/física. E5/E6 conservan alcance separado. Las evaluaciones y conteos históricos que siguen conservan su fecha.

## Decisión principal

Convertir la base funcional F0–F7 en una experiencia clara de aprendizaje y creación para **principiantes con acompañamiento docente**, público confirmado por el usuario durante esta revisión. El primer resultado será un recorrido completo: entrar, modificar bloques, ejecutar, observar, detener, guardar y recuperar. Mantener ejecución en navegador, preparación offline y uso sin cuenta.

La conversación [Plan de mejora de plataforma](chatgpt-conversation://6ada6e95-4f24-83e8-b487-062a8d9e6462) aporta una buena dirección, pero necesita priorización, evidencia del repositorio y criterios de aceptación. Instalar muchas skills no resuelve por sí solo la organización de la interfaz ni demuestra aprendizaje.

Este documento ordena la evolución. Los requisitos y tareas de E1 viven en [studio-guided-first-creation](../../openspec/changes/studio-guided-first-creation/proposal.md); los de E2, autorizado después, en [studio-contextual-workspace](../../openspec/changes/studio-contextual-workspace/proposal.md). E3 fue autorizado después y su software está implementado en [studio-educational-activities](../../openspec/changes/studio-educational-activities/proposal.md), con [resultados](EDUCATIONAL-ACTIVITIES-RESULTS.md) y revisión docente pendiente. E4 fue autorizado después para crear e implementar primero el editor 2D integrado; véanse [resultados E4](INTEGRATED-2D-RESULTS.md) y el cambio `studio-integrated-2d-editor`. La extensión a otros contextos y E5–E6 siguen como propuestas. La evidencia de la evaluación inicial que sigue conserva su fecha y alcance; las corridas posteriores se identifican en los resultados de cada corte.

## Evidencia revisada y límites

- Conversación recuperada: recomendaciones de skills públicas, skills propias y rediseño UX/UI. Dos respuestas anteriores aparecen únicamente como referencias internas; su contenido no se pudo evaluar. No atribuirles conclusiones.
- ZIP adjunto `GuateGeeks-kit-producto-2026-10-22.zip`: dossier, flujos, diseño observado, decisiones y capturas. Se inspeccionaron visualmente inicio y bloques/escenario. Las fuentes del kit de `index.html`, `style.css` y `lessons/catalog.mjs` coinciden por SHA-256 con el árbol actual.
- Fuentes, instrucciones del repositorio, resultados F0/F1/F6/F7, actividades, persistencia, pruebas y cambios OpenSpec. Véase también [NEXT-SESSION](../engineering/NEXT-SESSION.md), [TESTING](../engineering/TESTING.md) y [compatibilidad](../phase-7/COMPATIBILITY.md).
- La última puerta **histórica** registra 390 Node, 62 herramientas y 128 E2E; no se volvió a ejecutar para esta entrega documental. Los trece cambios anteriores aparecen completos, sin archivar. `openspec/specs/` no contiene aún especificaciones consolidadas.
- El producto aparece completo como archivos no rastreados por Git. Una futura implementación necesita un inventario/snapshot de partida; `git diff` por sí solo no distingue todo el trabajo preexistente. No se crearon commits ni se limpiaron checkouts.
- No se ejecutó la aplicación durante esta evaluación. Las capturas y fuentes permiten evaluar estructura, pero no sustituyen pruebas de uso con estudiantes/docentes.

## Qué conservar y qué corregir de la conversación

| Propuesta de la conversación | Evaluación y decisión |
|---|---|
| Conservar OpenSpec y la arquitectura browser-first | Adoptar. Ya existen contratos, runtimes y evidencia; la evolución debe apoyarse en ellos. |
| Impeccable para rediseño integral | Adoptar como dirección de UX/diseño. Está disponible localmente, versión declarada 4.7.0. |
| Añadir Interface Design como segunda base | Posponer. Impeccable ya documenta patrones; evitar dos autoridades visuales mantenidas por separado. |
| Motion Design desde el comienzo | Condicional. Primero definir selección, ejecución, errores y paneles; CSS y APIs nativas pueden bastar. |
| UI UX Pro Max para explorar estilos | Prescindible en el primer corte. La necesidad principal es jerarquía y comprensión, no un catálogo de estilos. |
| Frontend Design/Frontend App Builder adicionales | Alternativas para una tarea delimitada, no direcciones creativas simultáneas. |
| Web Design Guidelines | Adoptar como revisión independiente. Ya disponible en el entorno. Registrar la revisión de las reglas consultadas. |
| Skills de pruebas, debugging y verificación | Reutilizar primero Playwright y el flujo incremental del repositorio. Incorporar una skill externa cuando aporte un procedimiento faltante concreto. |
| Superpowers completo | No sustituir OpenSpec ni crear otro backlog. Depuración o TDD pueden usarse selectivamente para contratos con riesgo. |
| React Best Practices | Solo donde exista React. El shell actual usa módulos JavaScript y DOM; no migrarlo para aprovechar una skill. |
| Threat Model / Game Playtest | Aplicar ante nuevas fronteras de confianza o cambios sustanciales de interacción 2D/3D, no como dependencia de toda edición. |
| Skills propias de GuateGeeks | Adoptar tres ahora; dividir otras cuando haya uso repetido que lo justifique. |
| Sócrates | Diseñar más adelante contra contratos reales. No se encontró integración implementada; no inventar API, cuentas ni datos compartidos. |

Las capacidades públicas se contrastaron con [Impeccable](https://github.com/pbakaus/impeccable), [Interface Design](https://github.com/Dammyjay93/interface-design), [Motion Design](https://github.com/LottieFiles/motion-design-skill) y [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills). Son referencias consultadas, no instalaciones ni auditorías completas de esos paquetes.

## Diagnóstico del producto

| Prioridad | Evidencia concreta | Consecuencia para el plan |
|---|---|---|
| P0 | La captura inicial de 1265×712 muestra gestión del proyecto y cuatro desplegables antes de casi todo el editor. `src/studio/index.html:8–34`. | Entrada orientada a continuar/crear/actividad/abrir; barra compacta de proyecto y guardado. |
| P0 | Coexisten Ejecutar bloques, corpus/Ejecutar, texto y acciones por contexto. `index.html:39,94,103` y módulos contextuales. | Identificar documento/contexto de cada acción. Primer corte resuelve 2D; después extender el patrón a otros contextos. |
| P0 | A menos de 1040 px se apilan secciones, separando edición, diagnóstico y resultado. | Navegación accesible entre editor/resultado/ayuda; Detener alcanzable desde el recorrido activo. |
| P0 | Recuperación, guardado transaccional y apertura atómica ya existen. | Reorganizar sin perder estados ni confundir guardado en navegador con respaldo portable o nube. |
| P1 | Tres actividades declarativas; pistas como cambiar directamente un valor y todas visibles juntas. `src/assets/lessons/catalog.mjs`, `src/studio/lessons-ui.mjs`. | Objetivos y predicción, pistas graduadas y una tarea variante para observar comprensión. |
| P1 | “Objeto a programar” mezcla escenas y dispositivos. | Validar vocabulario proyecto → contexto → documento → objeto; presentar opciones por tarea. |
| P1 | `src/lessons.mjs` valida un esquema cerrado. | Evolucionar esquema y compatibilidad antes de añadir campos educativos o actividades 3D/web. |
| P1 | `tools/test/impact.mjs` no selecciona las tres suites `accessibility-*` para HTML/CSS. | Ejecutarlas expresamente o corregir el mapa con una prueba de selección útil. Full sí las descubre. |
| P2 | CSS con valores literales; no PRODUCT.md/DESIGN.md normativos. | Documentar contexto, dirección y tokens antes de extender la nueva composición. |

P0/P1 son prioridades de producto; no equivalen a severidad de fallos de seguridad. Las posibles dificultades de comprensión siguen siendo hipótesis hasta observar personas.

## Skills y herramientas de trabajo

| Recurso | Responsabilidad | Estado en esta entrega |
|---|---|---|
| Seis skills `openspec-*` | Proponer, aplicar, actualizar y cerrar requisitos/tareas | Existentes en el proyecto, generadas con OpenSpec 1.14.3 |
| `impeccable` | Recorridos, jerarquía, copy, composición y acabado | Disponible a nivel usuario; no reinstalada ni activados hooks |
| `web-design-guidelines` | Revisión web de la implementación | Aplicada en E1 y E2; reglas y límites registrados en sus resultados |
| `skill-creator` | Autoría y validación de las skills propias | Utilizada en la preparación |
| `gg-learning-experience` | Objetivo, predicción, acción, feedback, pistas y evidencia de aprendizaje | Preparada para el proyecto |
| `gg-browser-first` | Autoría/ejecución, aislamiento, offline, persistencia y copias textuales | Preparada para el proyecto |
| `gg-design-system` | Autoridad visual única, español, patrones de interacción y accesibilidad | Preparada para el proyecto |

Las skills nuevas se ubican en `.agents/skills/`; su descubrimiento automático en una sesión ya abierta debe comprobarse. Mientras tanto pueden leerse/invocarse por ruta. Las skills orientan al agente de desarrollo; no añaden tutoría al runtime. [Documentación oficial de skills](https://learn.chatgpt.com/docs/build-skills).

El [inventario de skills](SKILLS-INVENTORY.json) registra rutas, versiones declaradas y hashes observados. Para paquetes futuros: revisar licencia, referencias, scripts, hooks y dependencias; fijar una revisión antes de incorporarlos. No usar `npx ... latest` como actualización implícita. Un hash de `SKILL.md` identifica ese archivo, no audita todo el paquete ni sus referencias remotas.

| Herramienta/MCP | Uso previsto | Disponibilidad y límites |
|---|---|---|
| OpenSpec CLI | Único conjunto de requisitos y tareas | Instalado y verificado; no necesita otro MCP |
| CodeGraph | Impacto antes de modificar fronteras | CLI y configuración local documentadas; herramienta MCP no expuesta en esta sesión. Usar CLI y verificar servidor si se necesita |
| Playwright | E2E, teclado, zoom, estados y capturas | Ya fijado en el repo. Es la evidencia reproducible; el control manual de navegador complementa |
| Browser/CUA | Inspección y pruebas exploratorias | Disponible en el entorno; no confundir con ejecución de la suite |
| OpenAI Docs | Configuración de Codex y APIs cuando proceda | Documentación consultada; MCP oficial opcional, no instalado por este plan |
| Figma/Motion/GitHub MCP | Solo ante diseños, dependencias o colaboración que los requieran | No son requisitos para el primer corte; no se conectaron cuentas |
| Sócrates | Futuro intercambio de actividad/contexto/evidencia | Sin contrato ni integración disponibles en este repo |

El [MCP oficial de documentación](https://developers.openai.com/learn/docs-mcp) ofrece documentación, no ejecuta llamadas a la API por el producto. No hace falta añadir un backend de IA al editor para que Codex lo mejore.

## Organización de agentes y modelos

Un agente coordinador integra alcance, contratos y evidencia. En paralelo: agente UX/pedagogía, agente de implementación con propiedad explícita de archivos y agente de revisión/pruebas. Con cuatro plazas disponibles, mantener máximo coordinador + tres colaboradores; serializar tareas que escriban el mismo módulo o utilicen los mismos puertos. Una sola persona/agente integra `shell.js` y el cambio OpenSpec.

Cada encargo incluye objetivo observable, archivos permitidos, invariantes, pruebas esperadas y formato de entrega. La revisión debe leer el cambio real y comprobar escenarios; el informe de otro agente no es prueba suficiente por sí solo.

Mantener el modelo configurado por el usuario durante ejecución. Como opciones observadas en este entorno, `gpt-6.1-sol` puede cubrir implementación y revisión habituales, y `gpt-6-astra` decisiones complejas de arquitectura/pedagogía si el usuario lo elige. Son recomendaciones de asignación, no cambios de configuración realizados ni garantías de calidad/coste. No hace falta usar modelos diferentes por rol. Un modelo para Sócrates requeriría evaluación separada con respuestas educativas y datos reales autorizados.

## Secuencia de ejecución

Los tamaños son relativos (S/M/L), no fechas prometidas. La implementación completa se estima después del primer recorrido y la línea base humana.

| Corte | Entrega y prioridad | Dependencia | Tamaño | Criterio de salida |
|---|---|---|---|---|
| E0 · Preparación | Evaluación, skills, inventario, snapshot e instrucciones operativas actuales | Ninguna | S | Requisitos/skills validados; trabajo previo identificable; sin declarar gates históricos como nuevos |
| E1 · Primera creación | Continuar/crear/actividad/abrir, bloques y resultado conectados, Run/Stop y guardado claros | E0 | M | Editar→ejecutar→detener→guardar→reabrir con teclado, móvil/zoom y sin autorun ni pérdida |
| E2 · Espacio contextual | Paneles de editor/resultado/ayuda, biblioteca/inspector por tarea, copia textual clara | E1 | L | Mismo patrón en 2D, texto, 3D, web y dispositivo conservando acciones específicas |
| E3 · Actividades | Evolución compatible del esquema, objetivos, pistas graduadas y transferencia | E1; coordinar con E2 | M | Una actividad completa revisada por docente; checks diferenciados de comprensión |
| E4 · Integración y acabado | Primer editor 2D integrado; extender el patrón a otros contextos y afinar selección, feedback, errores y movimiento reducido | Patrones E1–E3 y recorrido 2D verificado | M | Programa, resultado y ayuda próximos; Run/Stop y teclado accesibles; sin regresiones de contratos ni estados ficticios |
| E5 · Aula | Preparación offline docente, guion de observación, equipos y hardware reales | E1 y actividad E3; reclutamiento puede empezar antes | M + externo | Evidencia humana/física identificada y problemas críticos resueltos |
| E6 · Sócrates | Contrato de contexto/actividad/evidencia, ayuda opcional y límites de datos | Necesidad docente validada y contrato real | Por definir | Funciona sin dependencia obligatoria; permisos/consentimiento y fallback comprobados |

E4 refina el sistema; el mínimo de identidad/tokens necesario se define desde E1. La validación con docentes puede informar cada corte y no tiene que esperar al final.

Durante E3, el usuario señaló que la composición actual se aleja del entorno integrado de creación esperado, con Scratch/MakeCode como referencia. La propuesta discutida para E4 prioriza integrar edición, ejecución, resultado, ayuda y selección en un mismo espacio, validar un recorrido 2D completo y extender su patrón antes del acabado visual. La composición precisa y sus criterios requieren un nuevo cambio OpenSpec; esta orientación no equivale a un rediseño ya implementado o aprobado en detalle.

### Tres recorridos de referencia

1. **Primera creación:** continuar o cargar explícitamente ejemplo 2D → predecir un movimiento → cambiar un valor → ejecutar → observar → detener → confirmar guardado → reabrir. La persona puede identificar qué cambió y por qué.
2. **Actividad guiada:** elegir y leer objetivo → proteger trabajo → cargar → experimentar → pedir una pista cada vez → comprobar → resolver una variante. Un check aprobado acredita su predicado, no dominio del concepto.
3. **Explorar y pasar a texto:** abrir proyecto → leer código derivado → crear copia JS/Python independiente → editar y ejecutar esa copia → comparar → guardar/reabrir. No se promete sincronización con los bloques.

### Dirección de experiencia propuesta

Modo de interfaz: operar y aprender. Recomendación a prototipar: taller guiado con entrada breve, editor y resultado como centro, ayuda contextual lateral y herramientas avanzadas bajo demanda. Para docente: preparación de actividad, respaldo y verificación offline agrupadas en un recorrido visible; sin inventar dashboard de aula o cuentas.

Comparar primero dos composiciones del mismo recorrido: editor/resultado con ayuda contextual frente a actividad/edición con resultado alternable en ancho reducido. Evaluar alcance de Detener, visibilidad del objetivo, foco y distancia entre error y origen. No convertir estas composiciones en tres productos diferentes.

El verde/coral actual es evidencia de diseño observado. No se considera marca aprobada; `hero.svg` es un sprite de ejemplo. Registrar decisiones en una única autoridad visual (`DESIGN.md`) y contexto en `PRODUCT.md`, distinguiendo decisiones del usuario, recomendaciones y asuntos abiertos. No imponer una estética antes de revisar recursos oficiales.

## Implementación del primer corte

La [propuesta](../../openspec/changes/studio-guided-first-creation/proposal.md), el [diseño técnico](../../openspec/changes/studio-guided-first-creation/design.md), los [requisitos](../../openspec/changes/studio-guided-first-creation/specs/studio-entry-journey/spec.md) y las [tareas](../../openspec/changes/studio-guided-first-creation/tasks.md) forman el paquete de implementación. E1 completó sus 23 tareas; E2 y E3, sus diez tareas técnicas cada uno, con evidencia propia. E3 conserva pendiente la revisión docente y la evidencia de comprensión. Las especificaciones de los cortes propuestos no equivalen a implementación.

Conservar módulos JavaScript/DOM, Blockly, adaptadores Scratch/PXT y QuickJS/Pyodide. Reorganizar la presentación apoyándose en controladores existentes; conservar IDs y eventos durante la migración o actualizarlos junto con sus consumidores. Evitar dos copias editables del mismo documento o listeners duplicados. Nuevas dependencias de UI/animación requieren un beneficio verificable frente a CSS y capacidades nativas.

Antes de editar: inventario/snapshot del árbol, lectura de evidencia actual y consulta CodeGraph si se cambia una frontera. El contexto de `openspec/config.yaml` se actualizó para E1/E2 y enlaza F6/F7. Conservar actas históricas, incluidos sus conteos; no regenerarlas como evidencia nueva.

### Validación y definición de terminado

Desde Ubuntu/WSL, en la raíz del producto:

```bash
source ../scripts/env.sh
npm run spec:validate
npm run test:quick
npm run test:affected -- --files src/studio/index.html src/studio/style.css --list
npm run test:affected -- --files src/studio/index.html src/studio/style.css
node node_modules/playwright/cli.js test tests/browser/accessibility-shell.spec.mjs tests/browser/accessibility-runner.spec.mjs tests/browser/accessibility-zoom.spec.mjs
npm run test:full
```

Adaptar `--files` a todos los archivos realmente cambiados. `shell.js` puede seleccionar full por ser frontera compartida. No ejecutar suites simultáneas en los mismos puertos. Si affected ya selecciona full y lo aprueba con fuentes estables, no repetir otra puerta completa sin cambios o inquietudes concretas. `browser:build` incremental; `--force` solo con motivo. Sin cambios de producto, esta entrega requiere validación de specs/skills y enlaces, no estas suites.

Un corte está terminado cuando sus escenarios están demostrados, las pruebas relevantes pasan, la UI se inspeccionó renderizada en sus tamaños, teclado/zoom/movimiento reducido conservan funcionalidad, guardado/recuperación y errores funcionan, y se registra comando, resultado, entorno y límites. La validación humana pendiente se declara por separado. Sin datos de aula, no afirmar idoneidad escolar.

### Medidas propuestas

Registrar primero una línea base con tareas acordadas: tiempo hasta primer resultado, ayudas requeridas, confusiones sobre qué ejecutar, recuperación exitosa, explicación de guardado local frente a descarga y predicción de la independencia de una copia textual. En aprendizaje, observar una variante del reto y la explicación del estudiante.

Definir umbrales de mejora después de esa línea base con el docente. Usar observación y registro local mínimo; este plan no autoriza telemetría remota ni datos personales del alumnado. Las medidas técnicas se ejecutan en equipos escolares acordados, separadas de benchmarks WSL/SwiftShader.

## Decisiones pendientes y riesgos

| Asunto | Decisión provisional o trabajo necesario |
|---|---|
| Edad/grado, nivel lector, currículo y duración de clase | Acordar con docente antes de validar copy y dificultad de actividades; no bloquear estructura general del editor |
| Equipos y política móvil | Preservar funciones existentes en ancho reducido; decidir alcance escolar después de observar dispositivos reales |
| Identidad visual oficial | Inventariar activos aprobados; no convertir recursos de demostración en logo/mascota |
| Pérdida de autoría por reorganización | Reutilizar protección y apertura atómica; probar recuperación y cancelación |
| Cambios transversales en shell | Propiedad única de archivos, pasos pequeños, regresiones de todos los contextos |
| Skills demasiado amplias o contradictorias | Una dirección visual y un plan OpenSpec; disparadores precisos, sin instalar catálogos completos |
| Offline o aislamiento debilitados | Conservar seis orígenes, CSP/grants, hashes/cohorts y ausencia de red arbitraria |
| Aceptación externa | micro:bit/USB físicos, lector humano, docentes/alumnos, equipos escolares y navegadores adicionales siguen pendientes |

## Estado de la entrega

La evaluación preparatoria, el público confirmado y las tres skills propias se conservan en el inventario y [registro de preparación](VALIDATION-2026-10-22.md). La solicitud posterior autorizó implementar E1: el primer recorrido está implementado y su puerta completa aprobó 390 Node, 63 herramientas y 136 E2E. Los [resultados E1](FIRST-CREATION-RESULTS.md) y su evidencia identifican lo verificado. La solicitud posterior autorizó E2: editor, resultado y ayuda comparten navegación para 2D, texto, micro:bit, Scratch, 3D y web; las copias muestran su destino y los diagnósticos vuelven a su fuente. La puerta E2 aprobó 392 Node, 63 herramientas y 142 E2E, con 15 cambios OpenSpec y preservación upstream. Véanse [resultados E2](CONTEXTUAL-WORKSPACE-RESULTS.md) y su [evidencia](contextual-workspace-evidence.json). La solicitud posterior autorizó E3: las tres actividades incorporan objetivo, requisitos, predicción, pistas graduadas, reflexión y reto variante. El software aprobó 400 Node, 63 herramientas y 147 E2E, con 16 cambios OpenSpec y preservación upstream. Véanse [resultados E3](EDUCATIONAL-ACTIVITIES-RESULTS.md), [evidencia](educational-activities-evidence.json) y [guion docente](E3-TEACHER-OBSERVATION.md). La revisión docente de una actividad completa sigue pendiente; no se considera cumplido ese criterio educativo. El primer corte 2D de E4 está implementado y su puerta completa aprobó 400 Node, 63 herramientas y 151 E2E (3 smoke + 148 regresiones); extensión a otros contextos, E5 y E6 siguen pendientes, con aceptación humana y física separada.



Actualización E4, 23 de octubre: primer editor 2D integrado técnicamente verificado. Puerta completa: 400 Node, 63 herramientas y 151 E2E (3 smoke + 148 regresiones), 17 cambios OpenSpec y preservación upstream. Ver [resultados E4](INTEGRATED-2D-RESULTS.md) y [evidencia](integrated-2d-evidence.json). Extender el patrón a otros contextos y la aceptación educativa requieren trabajo posterior; este corte no cierra toda la evolución E4–E6.


Actualización E4 micro:bit, 23 de octubre: el cambio `studio-integrated-microbit-workspace` extiende el patrón a bloques/TypeScript, simulación conjunta y consulta Firmware. La puerta completa aprobó 400 Node, 63 herramientas y 155 E2E (3 smoke + 152 regresiones), 18 cambios OpenSpec y preservación de los tres upstreams, con cold offline y fuentes estables. Véanse [resultados micro:bit](INTEGRATED-MICROBIT-RESULTS.md) y [evidencia](integrated-microbit-evidence.json). Quedan integración visual de Scratch importado/3D/web y validación docente/física; E5/E6 siguen separados.


Actualización E4 Scratch importado, 23 de octubre: `studio-integrated-scratch-workspace` integra original/cobertura, transporte común, resultado y consulta de original/copia. Puerta completa: 400 Node, 63 herramientas y 160 E2E (3 smoke + 157 regresiones), 19 cambios OpenSpec, tres upstreams preservados, fuentes estables y cold offline. Véanse [resultados Scratch](INTEGRATED-SCRATCH-RESULTS.md) y [evidencia](integrated-scratch-evidence.json). Quedan composición integrada 3D/web y aceptación humana/física; E5/E6 mantienen alcance separado. Los recuentos anteriores son históricos.


Actualización E4 3D, 23 de octubre: `studio-integrated-3d-workspace` integra bloques o documento independiente, transporte común, renderer aislado y consulta de estado inicial, GLB y código/exportación. Puerta completa: 400 Node, 63 herramientas y 164 E2E (3 smoke + 161 regresiones), 20 cambios OpenSpec, tres upstreams preservados, fuentes estables y cold offline. Véanse [resultados 3D](INTEGRATED-3D-RESULTS.md) y [evidencia](integrated-3d-evidence.json). Quedan composición integrada web y aceptación humana/física; E5/E6 mantienen alcance separado. Los recuentos anteriores son históricos.


Actualización E4 web, 23 de octubre: `studio-integrated-web-workspace` integra programa, transporte común, aplicación interactiva aislada y consulta de componentes iniciales/código/exportación. Puerta completa: 400 Node, 63 herramientas y 168 E2E (3 smoke + 165 regresiones), 21 cambios OpenSpec, fuentes estables, cold offline y tres upstreams preservados. Véanse [resultados web](INTEGRATED-WEB-RESULTS.md) y [evidencia](integrated-web-evidence.json). El patrón funcional abarca los seis contextos; siguiente trabajo: revisión transversal, observación temprana con docente/principiantes y brief/rework visual. La validación física y E5 pueden avanzar en paralelo; Sócrates conserva su contrato futuro separado.
