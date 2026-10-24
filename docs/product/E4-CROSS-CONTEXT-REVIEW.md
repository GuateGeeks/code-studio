# Revisión transversal de E4

23 de octubre de 2026, Guatemala. Auditoría de implementación y recorrido heurístico para principiantes con docente. No es una observación con estudiantes ni una certificación de accesibilidad.

## Resultado

El patrón funcional está integrado en 2D, texto para 2D, micro:bit, Scratch importado, 3D y web. La principal deuda es la presentación de una herramienta educativa: demasiada administración antes de crear, poco protagonismo del resultado y vocabulario de implementación en recorridos iniciales. Se documentan **ocho hallazgos: cuatro P1 y cuatro P2; ningún P0 demostrado en el recorrido**. No se implementaron correcciones.

El rework puede partir de esta base. E5/E6, el tutor Sócrates, nuevos motores y nuevas actividades no son requisitos previos. La comprensión y aceptación escolar siguen pendientes de observación humana.

## Método y procedencia

- Release examinada: `http://127.0.0.1:4983/releases/e5221e6ec67febaa8a93be0c464bb4a80beea978ed4549da44b66d88ba9bab34/`.
- Skills locales: `gg-design-system`, `gg-browser-first`, `gg-learning-experience` y `openspec-propose`. Se utilizaron las dimensiones técnicas de Impeccable audit y las Web Interface Guidelines; no se ejecutó el comando de crítica dual ni se declara revisión independiente.
- Recorrido nuevo mediante controles reales en perfiles Chromium temporales: crear/añadir/importar, ejecutar, consultar, reducir pantalla y detener en los seis contextos. Texto, 3D y web incluyeron errores provocados. Formulario web con envío nativo; Scratch con el primer SB3 del corpus propio. No se inyectó presentación ni se usó el perfil del usuario para crear fixtures.
- 51 capturas base y mediciones a 1440×900, 1280×720 y 390×844; seguimiento específico del lienzo 2D, cambio web→2D, Stop transversal y error de propiedades web. Los datos originales están en `artifacts/e4-cross/evidence.json` y `followup.json`; el resumen durable es [e4-cross-context-evidence.json](e4-cross-context-evidence.json).
- Inspección visual seleccionada de los seis contextos y de sus estados materiales, complementada con mediciones de las demás capturas. Las capturas de viewport no muestran siempre todo el documento. Una captura inicial del resultado 2D estrecho perdió la superficie GPU: se sustituyó para interpretación visual por `2d-narrow-result-recapture.png`. No se reporta ese defecto de captura como fallo del producto. Los intentos de captura con reemplazo de iframe se conservan en artefactos y no cuentan como pruebas funcionales fallidas.
- Detector ejecutado una vez: cinco avisos, no cinco defectos confirmados. No se inyectó overlay; la API del navegador disponible ofrece evaluación de solo lectura. No se inició servidor nuevo para la revisión; se conservó el preview existente.
- La última puerta de software sigue siendo la de web: **400 Node, 63 herramientas y 168 E2E**, 21 cambios OpenSpec y tres upstreams preservados. Es evidencia histórica del código examinado, no una nueva suite corrida por esta auditoría. Zoom real 200/400%, offline frío, importaciones inválidas, reapertura y exportaciones se apoyan en esa puerta; no se repitieron aquí.

## Mapa de pantallas y estados

| Contexto | Autoría principal | Resultado | Consulta material | Estados examinados ahora |
|---|---|---|---|---|
| 2D | Blockly editable | Escena y objetos | Propiedades/lectura | Entrada, listo, ejecución, consulta, estrecho, Stop |
| Texto para 2D | Documento JavaScript independiente | Escena 2D | Código/diagnóstico | Sin documento, edición, ejecución, consulta, estrecho, Stop, error de sintaxis |
| micro:bit | Bloques de firmware | Escena + placa simulada | Firmware | Sin dispositivo, añadido, simulación, consulta, estrecho, Stop |
| Scratch importado | Original y cobertura de solo lectura | Ejecución Scratch | Original y copia | Sin original, importación válida, ejecución, consulta, estrecho, Stop |
| 3D | Blockly contextual | Escena 3D aislada | Objetos iniciales | Sin capacidad, añadido, ejecución, consulta, estrecho, Stop, propiedad inválida |
| Web | Blockly contextual | Formulario/lista aislados | Componentes iniciales | Sin capacidad, añadido, envío nativo, consulta, estrecho, Stop, propiedad inválida |

Python, TypeScript independiente, coberturas Scratch no convertibles, archivo inválido, recuperación y exportación tienen pruebas vigentes en la puerta web. Su estado se revisó en fuentes/evidencia, no se presenta como un nuevo recorrido visual completo en esta sesión.

## Hallazgos priorizados

P1: dificultad importante del recorrido previsto; resolver en el primer corte del rework. P2: mejora necesaria con alternativa disponible. Las prioridades son juicio de producto sustentado en la implementación; todavía no expresan frecuencia ni impacto medido con alumnado.

### E4-01 · P1 · La administración consume el espacio de creación

**Observado:** a 1440×900, programa y resultado comienzan alrededor de y=342 en los seis contextos. A 1280×720, texto y micro:bit desplazan el inicio hasta y=394 al envolver la barra. El escenario 2D real mide 565×124px; su contenido 4:3 ocupa aproximadamente 165×124px. En estrecho, el resultado empieza entre y=1393 y y=1786, aunque hay enlaces que permiten alcanzarlo.

**Impacto inferido:** el primer cambio y su efecto visual quedan subordinados a nombre, archivo, avisos y navegación. El objeto se percibe pequeño y la consulta apenas empieza dentro de un portátil de poca altura. No hay desbordamiento horizontal en las muestras: el problema es presupuesto vertical y jerarquía.

**Localización:** `src/studio/index.html:8`, `:18`, `:24`; `src/studio/style.css:204`, `:251`, `:279`; `src/runtime/stage.css:1`.

**Recomendación:** cabecera de proyecto compacta; archivos y preparación docente en acceso secundario; área de programa y resultado como centro de la pantalla. Definir dimensiones verificables del lienzo y una vista de resultado ampliable. En móvil, navegación directa entre programa/resultado/ayuda sin apilar toda la administración delante.

**Aceptación propuesta:** a 1280×720 y 1440×900, después de entrar al proyecto, programa, ejecución y resultado aparecen juntos sin desplazamiento global; lienzo 2D visible de al menos 240px de alto con su imagen 4:3 completa. No ocultar controles accesibles para ganar altura.

### E4-02 · P1 · Ejecución, detención y origen compiten por atención

**Observado:** conviven Ejecutar, Detener del contexto y Detener resultado con cinco enlaces de recorrido. En texto se muestran dos detenciones con nombres diferentes. Cambiar web→2D conserva correctamente la aplicación web activa y su rótulo; el usuario ve controles de un contexto y resultado de otro.

**Impacto inferido:** exige recordar dos identidades y decidir entre acciones de detención que llaman al mismo reset en varios casos. No se demostró ejecución equivocada: la separación funcional es correcta, pero su lectura exige más esfuerzo.

**Localización:** `src/studio/index.html:26`, `:73`; `src/studio/contextual-workspace.mjs:89`; `src/studio/shell.js:164`, `:475`.

**Recomendación:** mostrar «Editando…» y «Resultado de…» próximos a sus áreas. Dar una acción principal a ejecutar la autoría seleccionada y una detención inequívoca del resultado activo. Conservar acceso a acciones específicas que tengan distinto efecto, explicándolo; no cambiar el contrato de Stop ni introducir ejecución al navegar.

### E4-03 · P1 · La selección de consulta no representa siempre lo que se ve

**Observado reproducible:** abrir Componentes web y cambiar a 2D deja `aria-current` únicamente en el enlace Componentes web, ahora oculto; no hay selección visible. En estrecho, el enlace seleccionado conserva apariencia de pestaña, mientras el inicio de la consulta vuelve a mostrar Ayuda. El panel actual es un documento con anclas y varias secciones, no un conjunto de paneles exclusivos.

**Localización:** `src/studio/contextual-workspace.mjs:16`, `:121`; `src/studio/index.html:80`; `src/studio/style.css:226`.

**Recomendación:** elegir un único modelo explícito. Se propone una consulta con panel activo y selección real; cambiar de contexto recupera una herramienta pertinente, con foco visible y sin perder borradores. No aplicar roles de pestaña a enlaces que solo desplazan un documento.

**Prueba propuesta:** Componentes web→2D→web, consulta con teclado, error→línea de origen y reflujo durante consulta. Verificar selección visible, panel correspondiente y sesión conservada.

### E4-04 · P1 · Lenguaje interno en el primer recorrido

**Observado:** bloques 3D como `scene3d.move targetId sphere delta.x`, bloques web como `webapp.appendItem`, eventos `start`/`submit`, propiedades `props · styles · fontSize` y cobertura Scratch con opcodes. El error de texto muestra `Unexpected token (1:17)` y `LANGUAGE_PREPARE`.

**Localización:** `src/contracts/operations.mjs:50`, `:51`; `src/studio/capability-contexts-ui.mjs:24`; `src/studio/index.html:66`; generación de entradas en `src/studio/code-console-ui.mjs`.

**Recomendación:** vocabulario de acción en español y nombres legibles para elementos. Conservar identificadores, rutas y diagnóstico original en detalle técnico; traducir la presentación sin cambiar tipos de bloque, campos serializados, IDs u operaciones públicas. El texto escrito por el alumno sigue siendo código, no se traduce automáticamente.

### E4-05 · P2 · El error anuncia el problema pero no orienta la corrección

**Observado:** un ID duplicado web produce «GG capability: componente inválido». Tiene `role=alert` y conserva exactamente la sesión activa, lo cual es correcto. El mensaje queda separado del campo: aparece en la columna de programa mientras Aplicar propiedades está en la consulta. En la muestra medida el aviso sí estaba dentro del viewport; no se afirma que siempre quede oculto.

**Localización:** `src/studio/capability-contexts-ui.mjs:24`, formularios y salida de error del mismo archivo; `src/studio/shell.js:443`.

**Recomendación:** resumen comprensible, causa conocida y siguiente acción junto al campo o formulario; detalle técnico desplegable y enlace vigente al bloque/línea. Mantener el borrador inválido editable y la autoría válida y ejecución anteriores. No sustituir el aviso accesible por un toast.

### E4-06 · P2 · La ayuda no distingue actividad curricular y orientación contextual

**Observado:** todos los contextos ofrecen Actividad y «Actividad con tu docente». El catálogo contiene tres recorridos basados en 2D/texto, no seis catálogos equivalentes. 3D/web sí tienen orientación breve de predicción y comparación.

**Localización:** `src/studio/contextual-workspace.mjs:109`; `src/assets/lessons/catalog.mjs:9`, `:23`, `:37`.

**Recomendación:** mostrar la orientación pertinente al trabajo activo y señalar cuándo una actividad abre un recorrido 2D diferente. Mantener objetivos, predicción, pistas graduadas, comparación y variante de E3. No inventar actividades de micro:bit/3D/web ni declarar comprensión a partir de checks técnicos.

### E4-07 · P2 · Scratch comienza por cobertura técnica y difiere la acción de editar

**Observado:** el área principal expone una lista de bloques/opcodes; la copia editable está en Original y copia. Se explica correctamente que es solo lectura y cuándo admite conversión.

**Localización:** `src/studio/index.html:50`, `:146`; `src/studio/resources-ui.mjs`.

**Recomendación:** estado comprensible del original y siguiente acción cerca de la importación: ejecutar, crear copia o revisar por qué se bloqueó. Cobertura detallada e identidad técnica como información secundaria. Mantener descarga exacta del original y las diferencias `gg-editable`, `vm-compatible` y `unsupported`. No prometer edición nativa Scratch ni conversión general.

### E4-08 · P2 · El sistema visual acumuló reglas de cada extensión

**Observado:** coexisten colores literales y variables, múltiples bloques de sobrescritura CSS, textos auxiliares de 12px y jerarquía próxima entre títulos y cuerpos. Los avisos del detector apoyan revisar densidad, no demuestran por sí mismos fallos de lectura. La identidad actual no es marca oficial aprobada.

**Localización:** `src/studio/style.css:1`, `:195`, `:242` y extensiones posteriores; `DESIGN.md` y `.impeccable/design.json`.

**Recomendación:** una fuente de tokens y componentes para cabecera, transporte, editor, resultado, consulta y estado. Escala tipográfica legible, foco y contraste medidos. No añadir modo oscuro, fuentes remotas o identidad inventada como requisito de este trabajo.

## Detector y revisión técnica

Cinco avisos: `broken-image`×1, `cramped-padding`×3 y `flat-type-hierarchy`×1. El primero corresponde a `#resource-image`, oculto y sin `src` hasta seleccionar un recurso: **no es evidencia de imagen rota visible**. Los otros son señales para el diseño, no bloqueos funcionales ni incumplimientos WCAG probados. El detector fuente informa línea 0; las localizaciones verificadas se dan arriba, sin inventar precisión en sus resultados.

| Dimensión Impeccable audit | Valoración heurística | Alcance |
|---|---:|---|
| Accesibilidad | 3/4 | Etiquetas, avisos, foco y enlaces existentes; lectura humana y conformidad integral no verificadas |
| Rendimiento | No medido | Sin benchmark nuevo; no se asigna nota por impresión visual |
| Theming | 2/4 | Tokens existentes con valores literales y variantes; no se exige un tema oscuro no solicitado |
| Responsive | 2/4 | Sin overflow global observado, pero alto coste vertical; no son dispositivos físicos |
| Integridad de implementación | 2/4 | Patrón funcional compartido, con discrepancia verificable de selección y vocabulario |
| Total de dimensiones valoradas | 9/16 | Orientación técnica; no es una nota de usabilidad obtenida con usuarios |

Las Web Interface Guidelines se aplicaron a etiquetas, foco, navegación, estados y recuperación. Reglas propias de React, servicios remotos o convención inglesa de títulos no se trasladan a este producto sin justificación. Referencia consultada: [guía oficial](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). Las observaciones por archivo y línea están en cada hallazgo.

## Secuencia recomendada

1. Resolver E4-01 a E4-04 como primer corte común: composición, acciones, consulta y lenguaje. Usar `layout`, `clarify`, `adapt` y `harden` según Impeccable, siguiendo una sola dirección visual.
2. Integrar E4-05 a E4-08: errores, orientación, original Scratch y sistema compartido. No aplazar la conservación de foco, sesiones o autoría a una fase de acabado.
3. Ejecutar revisión visual y funcional del conjunto y terminar con `polish`, sin sustituir pruebas por capturas.
4. Hacer observación temprana con docente/principiantes conforme al [brief](VISUAL-REWORK-BRIEF.md) y [guion E3](E3-TEACHER-OBSERVATION.md). Registrar ayudas y confusiones sin telemetría remota. Sigue pendiente, no bloquea preparar el rediseño.

El alcance está convertido en `studio-visual-workspace-rework`. Su implementación permanece pendiente. El [prompt para Claude Opus](CLAUDE-OPUS-VISUAL-REWORK-PROMPT.md) transmite la revisión, el brief, los límites y la verificación requerida.
