# Resultados del rework visual

23 de octubre de 2026, Guatemala. Cambio OpenSpec `studio-visual-workspace-rework`. Implementación del [brief](VISUAL-REWORK-BRIEF.md) según el [plan de ejecución](VISUAL-REWORK-EXECUTION-PLAN.md). Este documento separa pruebas de software, revisión visual del agente, detector automático y la observación humana pendiente.

> Estado: **implementado y verificado en software** (puerta completa aprobada el 24 de octubre). Observación docente, lector de pantalla humano y hardware físico siguen pendientes. Evidencia: [visual-rework-evidence.json](visual-rework-evidence.json).

## Decisiones confirmadas por el usuario

Identidad actual refinada (sin paleta GuateGeeks de Sócrates); skills `gg-*` reutilizadas con `gg-ui-verification` nueva; distribución Scratch con piezas de MakeCode; extras: aviso de cambios sin ejecutar, selector Bloques · JavaScript · Python y actividad por pasos. Fuera de alcance, con razón: reinicio automático al editar y conversión texto→bloques.

## Qué cambió

- **Composición (E4-01):** cabecera de 48px con proyecto, guardado, Inicio, Archivo y Preparar para clase; avisos en franja reconocible; estación de dos columnas a partir de 1024×640 con programa a la izquierda y transporte, resultado y consulta a la derecha; vista ampliada del resultado sin remontar el iframe; flujo de documento con barra fija Programa · Resultado · Ayuda · Detener.
- **Acciones e identidad (E4-02):** un Ejecutar por contexto nombrado por su autoría y un único Detener (`#stop-result`); «Editando…» y «Resultado de…»; nota de resultado de otro contexto; aviso de cambios sin ejecutar con ejecución explícita.
- **Consulta (E4-03):** pestañas reales con flechas, Inicio/Fin y selección por contexto sobre paneles montados; `gg-reveal` para revelar destinos.
- **Vocabulario (E4-04):** rótulos educativos de bloques 3D/web en la capa del editor (los manifests y sus SHA-256 no cambian); propiedades en español con ruta técnica; diagnósticos explicados con detalle técnico; nombres educativos de opcodes Scratch.
- **Errores (E4-05):** validación de propiedades dentro del formulario con causa, siguiente paso, `aria-invalid` y detalle; errores de intérprete explicados junto al editor.
- **Orientación (E4-06):** Ayuda distingue la orientación del contexto; Actividad anuncia el destino 2D desde otros contextos; actividad presentada por pasos.
- **Scratch (E4-07):** estado del original y siguiente acción junto a la importación; copia y descarga junto al estado; cobertura secundaria.
- **Sistema (E4-08):** una sola capa de tokens en `style.css` reflejada en `DESIGN.md` y `.impeccable/design.json`; iconos SVG propios; notas con borde de 1px; superficies del navegador tematizadas; movimiento reducido.

## Matriz E4-01…08

| Hallazgo | Estado | Evidencia automática | Límite declarado |
|---|---|---|---|
| E4-01 composición | Resuelto en escritorio y flujo | `workspace-presentation` (1280×720 y 1440×900: autoría y resultado en y=56/126, sin scroll, lienzo 2D medido dentro del iframe 326×244 y 566×425 en ejecución, Blockly ≥300, fuente ≥240; vista ampliada con Esc); matriz visual | micro:bit en ejecución a 1280×720 reparte el resultado entre placa y escena: escena 206×155 (282×212 a 1440×900); «Ampliar» la muestra grande |
| E4-02 identidad y alcance | Resuelto | Pruebas «Editando/Resultado de», nota de resultado ajeno, Detener transversal y aviso de cambios sin autorun | — |
| E4-03 consulta | Resuelto | Componentes web → 2D → web conserva pestaña, contenido y sesión; diagnóstico → documento; teclado APG en pestañas | — |
| E4-04 vocabulario | Resuelto en bloques 3D/web, propiedades, diagnósticos y opcodes Scratch | Reapertura conserva tipo, campos e identidad; manifests y SHA-256 sin cambios | Bloques 2D/micro:bit ya estaban en español; código del alumno no se traduce |
| E4-05 errores | Resuelto | ID duplicado explicado junto al formulario, visible dentro de la consulta, con `aria-invalid`, borrador, autoría y sesión conservados; sintaxis explicada con línea | — |
| E4-06 orientación | Resuelto | Actividad desde 3D anuncia destino 2D y no cambia ni ejecuta; actividad por pasos | Comprensión real pendiente de observación docente |
| E4-07 Scratch | Resuelto | Estado del original y siguiente acción junto a la importación (convertible, solo ejecutable, bloqueado) | Sin edición nativa del original |
| E4-08 sistema | Resuelto | Tokens únicos, SVG, movimiento reducido; 390×844, 448×884 y zoom sin desbordamiento; detector triado | Hoja del runner aislado conserva su foco `#ef6b54`, radio 5px y texto 11px (preexistentes) |

## Revisión visual y detector

**Matriz:** 75 estados reales (seis contextos × vacío/listo/ejecución/consulta/pendiente/detenido/ampliado/error/otro contexto) en 1280×720, 1440×900 y 390×844, con perfiles Chromium nuevos y controles reales (`artifacts/visual-rework/matrix/`, `matrix.json` con geometría y SHA-256 de cada captura). Resultado final: sin errores de captura, sin desplazamiento global ni desbordamiento en escritorio, sin desbordamiento horizontal en 390. La matriz descubrió y se corrigieron: consulta en 0px con micro:bit en ejecución a 1280×720, consulta en 58px cuando una nota acompaña el resultado, avisos tardíos que empujaban la estación fuera de la pantalla, validación web oculta dentro de la consulta y «Estado:» separado de su texto.

**Detector Impeccable (una ejecución):** 11 hallazgos; uno real corregido (marca a 17px), uno inocuo corregido (encabezado oculto con color de tinta), cinco falsos positivos verificados y una decisión documentada (escala 13/16/18); los tres de la hoja del runner aislado son preexistentes. Triage en `artifacts/visual-rework/impeccable-triage.md`.

**Revisión fresca (agente de solo lectura) — dictamen verificado en código y capturas:**

| Hallazgo | Verificación | Acción |
|---|---|---|
| P1 caja de herramientas Blockly sobre vista ampliada y barra móvil | Confirmado en capturas | `.authoring { isolation: isolate }`; comprobado en vista ampliada |
| P2 escena 2D sin explicación en Scratch y micro:bit antes de ejecutar | Confirmado | Nota «Todavía no has ejecutado…» también en Scratch y micro:bit, actualizada al importar o añadir |
| P2 escena micro:bit < 240px | Confirmado | Límite declarado (placa + escena comparten el resultado); «Ampliar» |
| P2 error de texto duplicado («No se completó la acción») y recortado | Confirmado (`SHELL_ERROR` tras `LANGUAGE_PREPARE`; aviso bajo el editor fuera de vista a 1280×720) | La shell no duplica un error que el intérprete ya registró; la explicación pasa encima del código |
| P2 vocabulario residual | Parcial | Corregidos «Static TypeScript para PXT», «Programa contextual activo», «fuera del subconjunto» y tipos de objeto nuevo («Esfera (sphere)», «Luz ambiental (hemisphericLight)», «Campo de texto (input)»…); se conservan la versión de quickjs (dato docente), «Autoría actualizada» (contrato de 5 pruebas) y valores de bloque del alumno |
| P2 «Editando el original de solo lectura» | Confirmado | «Revisando el original · solo lectura» |
| P3 «x = 0» junto a resultado web/3D | Confirmado | Se oculta para resultados 3D y web |
| P3 «Escena 2D con text…» recortado | Confirmado | Contexto «Texto 2D» |
| P3 nota de cambios sin ejecutar en tres líneas | Confirmado | Una línea con su botón al lado |
| P3 «Detenido» sin haber ejecutado | Confirmado | «Sin ejecutar» hasta que un documento se ejecuta |
| Barra móvil de transporte (~165px) | Detectado en la matriz | Ejecutar y Detener comparten fila a ≤600px |
| Resultado en blanco en `2d-expanded` | No reproducido: temporización de captura («Preparando…») | La matriz espera al runner |
| «Choose File» en inglés | Idioma del Chromium de captura | Sin cambio (control nativo) |

## Pruebas

**Puerta completa aprobada** (`npm run test:full`, 24 de octubre 06:54–07:43 UTC, `artifacts/visual-rework/full-approved.log`): 400 Node de integración, 63 de herramientas, 3 smoke y **177 E2E**, 22 cambios OpenSpec estrictos y preservación de los tres upstreams (mismo commit, diff y lock). Sin archivos cambiados durante la corrida; la referencia de impacto avanzó (`baselineWritten: true`). Incluye offline frío con los seis servidores detenidos y las exportaciones autónomas JS/Python de 3D y web ejecutadas con Studio apagado.

**Siempre verificados en esta implementación:** 400 Node de integración, 63 de herramientas y 3 smoke (`test:quick`, después de migrar `tests/quick/studio.spec.mjs` a la pestaña Firmware); OpenSpec estricto 22/22; CodeGraph sincronizado; tres upstreams con el mismo HEAD, estado y diff que la línea base y `pxt-core-source` sin archivos posteriores; alcance contra 593 hashes de la línea base en `artifacts/visual-rework/scope-diff.txt` (solo presentación, pruebas, skills y documentos de diseño; sin contratos, runtime de motores, formatos ni release).

**Pruebas nuevas:** `tests/browser/workspace-presentation.spec.mjs`, 12 casos de regresión E4-01…08 (geometría medida dentro del iframe, vista ampliada por teclado, consulta, identidad, aviso de cambios, vocabulario con reapertura, validación junto al formulario, sintaxis explicada, destino de actividades, estado Scratch, estrecho y zoom).

**Migración de pruebas existentes al modelo de pestañas, menús y Detener único:** helpers `revealPanel`, `revealControl`, `consult`, `chooseMode` y `clickVisible` (busca en pestañas y menús de la cabecera como lo haría una persona); ningún clic forzado ni estado inyectado.

**Historial de intentos focalizados** (logs en `artifacts/visual-rework/`; no son puertas aprobadas):

| Lote | Resultado | Causa de los fallos y resolución |
|---|---|---|
| batchA | 25 ✓ · 9 ✗ | Pruebas que esperaban paneles siempre visibles y detenciones contextuales → migración |
| batchB | 44 ✓ · 30 ✗ | Ídem, más menú de cabecera que cubría Ejecutar → cierre por clic exterior/Esc |
| retry2 | 84 ✓ · 7 ✗ | Ejecutó código previo a dos arreglos (detectado en la traza) |
| retry3 | 20 ✓ · 1 ✗ | micro:bit a 390px: el programa perdía 10px y la barra de Blockly tapaba el campo → márgenes estrechos |
| retry4 | 20 ✓ | — |
| batchC | 64 ✓ · 10 ✗ | Banda de inicio que se cerraba al hacer clic en el editor y desplazaba el doble clic a otro bloque (defecto de producto, corregido); rótulo «escena 3D» |
| retry5 | 53 ✓ · 2 ✗ | Servidor huérfano de una prueba con tiempo agotado (detenido por el usuario); aserción E4-01 ajustada a la decisión de resultado ajeno |
| retry6 | 12 ✓ | — |
| retry7 | 77 ✓ · 4 ✗ | Consulta en 0px con nota + aviso a 1280×900 (defecto de producto) → rejilla con consulta mínima de 140px |
| retry8 | 44 ✓ | — |
| retry9 | detenido en 16/71 · 1 ✗ | Primero, arranque >15 s; con 60 s, el zoom a 400% en móvil mostró Detener encima de Ejecutar (defecto de producto de la fila única) → fila que se parte cuando no cabe; se detuvo para no validar el build defectuoso |
| retry10 | 71 ✓ | Mismo conjunto con el build corregido |

**Intentos de la puerta completa no aprobados:** 1 (smoke sin migrar), 2 (interrumpido por reinicio de la máquina), 3–5 (el servidor de prueba superó los 15 s de arranque), 6 (todas las pruebas aprobadas, pero se editó este documento durante la corrida y el runner no avanzó la referencia; se repitió sin tocar archivos). Sus logs se conservan con sufijo `full-attempt*`. Con autorización del usuario, `webServer.timeout` de `playwright.config.mjs` pasó de 15 a 60 s: tras el reinicio de la máquina el snapshot de release por arranque tarda ~9 s y el servidor completo 13–15 s. Es infraestructura de prueba; no cambia producto, contratos ni lo que se verifica. Las configuraciones de rendimiento conservan 15 s.

## Release local abierta

`http://127.0.0.1:5083/` (runner 5084, simulador 5085, lenguaje 5086, 3D 5091, web 5092), raíz `artifacts/visual-rework/release-final`, cohorte `481df311…` (manifest `83abea8c…`). Comprobación: abre sin autorun (x = 0), «Ejecutar bloques» → x = 12, Detener vuelve a «sin ejecutar», sin errores de página (`artifacts/visual-rework/release-check.json`). Las vistas E4 anteriores (4583–4983) no estaban activas tras el reinicio de la máquina; no se reabrieron.

## Límites declarados

- micro:bit en ejecución a 1280×720: escena 206×155 junto a la placa (282×212 a 1440×900); «Ampliar» la muestra grande.
- Resultado de otro contexto antes de ejecutar: escena 2D de referencia 166×124 a 1280×720, para que la consulta (Objetos 3D, Componentes web, Firmware) conserve espacio.
- Con el aviso de cambios sin ejecutar, el lienzo 2D baja a 290×217 a 1280×720.
- Hoja del runner aislado con su foco `#ef6b54`, texto de 11px y radio de 5px (preexistentes).
- «Autoría actualizada · sin ejecutar», «Opcode no habilitado» y la versión de quickjs se conservan.
- `standalone-contexts` deja carpetas `/tmp/gg-standalone-browser-*` (preexistente).

## Pendientes humanos y físicos

- Observación con docentes y estudiantes según la ampliación del [guion](E3-TEACHER-OBSERVATION.md): no realizada.
- Lector de pantalla humano y tecnologías de asistencia: no evaluados; las pruebas comprueban roles, nombres y foco, no la experiencia con un lector.
- Placa micro:bit, USB y equipos escolares: no probados; la simulación y el HEX válido no certifican una prueba física.
