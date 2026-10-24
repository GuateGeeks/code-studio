# Prompt para Claude Opus: rework visual de Code Studio

Texto listo para pegar en Claude Opus con acceso al repositorio. Este archivo prepara la delegación; no se ha enviado a Claude ni implementado el rediseño.

---

Actúa como responsable de diseño de producto e implementación frontend de **GuateGeeks Code Studio**. Implementa el rework visual de su espacio educativo en los seis contextos existentes, siguiendo el cambio OpenSpec `studio-visual-workspace-rework`. Entrega código funcional, verificación y una versión revisable; no te limites a recomendar mejoras ni a cambiar colores sobre la composición actual.

## Contexto y objetivo

El público confirmado es **principiantes acompañados por un docente**. La experiencia debe sentirse como un editor educativo de la familia de **Scratch y Microsoft MakeCode**: herramientas reconocibles, programa protagonista, resultado próximo y ayuda contextual. No copies su marca ni supongas que sus contratos de sincronización o ejecución se aplican aquí.

El recorrido principal es: iniciar o retomar → reconocer qué se edita → predecir → modificar → ejecutar explícitamente → observar → corregir → detener → conservar y recuperar el trabajo. No presupongas edad, grado, currículo ni nivel lector.

La integración funcional E4 ya existe en **2D, texto para 2D, micro:bit, Scratch importado, 3D y aplicaciones web**. Se está rediseñando la presentación y la interacción sobre esa base; no estás construyendo seis motores nuevos.

## Repositorio y lecturas obligatorias

Producto en WSL:

`/home/adawolfs/projects/makecode/guategeeks-code-studio`

Desde Windows:

`\\wsl.localhost\Ubuntu\home\adawolfs\projects\makecode\guategeeks-code-studio`

Antes de editar, lee:

1. `AGENTS.md`, `README.md`, `PRODUCT.md`, `DESIGN.md` y las actas que AGENTS indique.
2. `docs/engineering/NEXT-SESSION.md` y `docs/engineering/TESTING.md`.
3. `docs/product/E4-CROSS-CONTEXT-REVIEW.md` y `e4-cross-context-evidence.json`.
4. `docs/product/VISUAL-REWORK-BRIEF.md`.
5. Los cuatro artefactos y specs de `openspec/changes/studio-visual-workspace-rework/`, además de los contratos de los cambios E2/E3/E4 relacionados.
6. `docs/product/INTEGRATED-WEB-RESULTS.md` e `integrated-web-evidence.json`, que identifican la última puerta aprobada.

No interpretes como pendientes las integraciones ya cerradas porque alguna nota histórica o el contexto antiguo de OpenSpec aún las describa como propuestas. Contrasta fechas y evidencia actual. El producto puede tener trabajo previo sin commits: conserva el checkout y los upstreams; no uses reset/clean para conseguir un árbol vacío.

## Skills que debes aplicar

Lee las instrucciones reales antes de usarlas:

- `.agents/skills/gg-design-system/SKILL.md`
- `.agents/skills/gg-browser-first/SKILL.md`
- `.agents/skills/gg-learning-experience/SKILL.md`
- `.agents/skills/openspec-apply-change/SKILL.md`

Usa también Impeccable y las guidelines de interfaz disponibles en este entorno. En la máquina original están en `C:/Users/adawolfs/.codex/skills/impeccable/SKILL.md` y `C:/Users/adawolfs/.codex/skills/web-design-guidelines/SKILL.md` —desde WSL, bajo `/mnt/c/Users/adawolfs/.codex/skills/`—. Localízalas si el entorno cambió. No inventes que ejecutaste una skill o revisión si no pudiste leerla. Sigue sus flujos de contexto, dirección, revisión y documentación cuando sean aplicables; no introduzcas sistemas visuales competidores por combinar skills.

Este encargo autoriza la implementación del cambio preparado. Las decisiones reversibles de composición se resuelven con criterio dentro del brief. Señala cualquier conflicto material con contratos existentes antes de ampliarlos; no agregues aprobaciones para ajustes rutinarios.

## Problemas concretos que debes resolver

Los ocho hallazgos E4-01…08 tienen reproducción y localizaciones en la revisión:

- **P1 — Espacio útil:** a 1440×900 el programa comienza cerca de y=342; en texto/micro:bit a 1280×720, cerca de y=394. El lienzo 2D observado mide 565×124px y su imagen 4:3 efectiva aproximadamente 165×124px. Reduce administración y recupera protagonismo para programa y resultado.
- **P1 — Acciones e identidad:** conviven detenciones del contexto y del resultado. Distingue claramente «Editando…» y «Resultado de…» y qué hará cada acción, incluso si se edita 2D mientras sigue activa una aplicación web.
- **P1 — Consulta inconsistente:** abrir Componentes web y cambiar a 2D deja la única marca `aria-current` en un enlace oculto. Selección, contenido y foco deben coincidir; no simules pestañas sobre simples anclas incongruentes.
- **P1 — Vocabulario:** aparecen `scene3d.move targetId`, `webapp.appendItem`, `props · styles · fontSize`, opcodes y errores como `Unexpected token`/`LANGUAGE_PREPARE`. Ofrece presentación educativa en español y conserva el detalle técnico sin cambiar IDs o serialización.
- **P2 — Recuperación de errores:** un ID duplicado web anuncia «GG capability: componente inválido», separado del campo. Explica la causa y el siguiente paso junto al formulario sin perder borrador ni sesión válida.
- **P2 — Orientación:** diferencia la guía contextual de las tres actividades disponibles de 2D/texto. No inventes un catálogo equivalente para cada contexto.
- **P2 — Scratch:** muestra estado y siguiente acción cerca de importar; detalle de cobertura e identidad como consulta secundaria. Preserva original y límites de conversión.
- **P2 — Sistema visual:** unifica componentes, tipografía, foco, estados, espaciado y tokens acumulados por las extensiones.

## Dirección y aceptación de interfaz

Diseña una estación Operate coherente: cabecera de proyecto compacta; toolbox y autoría dominantes; resultado legible próximo; consulta contextual con estado real. Archivos, opciones técnicas y preparación docente conservan acceso claro como herramientas secundarias.

No es una landing, un dashboard de tarjetas, una demo estática ni un cambio solo cosmético. Conserva contenido y funciones reales. Usa recursos locales; no inventes mascota, identidad institucional o claims educativos.

Cumple el brief y las specs: en 1280×720 y 1440×900, tras entrar y con el caso nominal cerrado, programa y resultado comienzan a más tardar en y=200 y se ven junto a ejecutar/detener sin desplazamiento global. Lienzo 2D de al menos 240px de alto con imagen 4:3 completa, Blockly de al menos 300px y fuente editable de al menos 240px. Mide el canvas y su contenido, no solo el iframe. No rebajes mínimos ni escondas overflow para aprobar una captura.

Verifica también 1280×900, 390×844, 448×884, cambios de breakpoint, nombres largos, errores y zoom real 200/400%. En estrecho, acceso directo a Programa/Resultado/Ayuda y Stop alcanzable. Una vista ampliada del resultado debe poder cerrarse por teclado con foco recuperable. Contenido expandido puede refluir, sin superposición ni recorte.

Documenta la dirección implementada en la fuente de diseño existente según las skills. El brief es una propuesta de composición, no una marca oficial ya aprobada.

## Contratos que no puedes romper

- Seis orígenes separados y guardas de origen, fuente, sesión, revisión y contexto.
- Motores, formatos, versiones y operaciones existentes; solo adaptadores conocen internals upstream.
- Guardado local confirmado, descarga GGPROJ y recuperación sin ejecución automática.
- Fuente derivada de solo lectura frente a copias JavaScript/Python independientes. No hay sincronización bidireccional implícita.
- Una sola instancia del editor textual compartido; conservar contenido, selección, caret y borradores al mover paneles. TypeScript micro:bit también sigue siendo independiente de sus bloques.
- Navegar, consultar, cambiar modo, importar o reabrir no ejecuta automáticamente. Stop conserva autoría e invalida ejecución anterior, también desde otro contexto.
- Propiedades iniciales no son el estado mutable del resultado. En web, enviar el formulario no convierte sus datos/lista en autoría guardada.
- Scratch original de solo lectura, descarga exacta y copia GG explícita solo cuando la cobertura lo permite. No ofrezcas edición Scratch nativa o conversión general.
- Simulación micro:bit, compilación, HEX, USB y validación en placa son resultados distintos.
- E3 conserva objetivos, predicción, pistas graduadas, comparación, variante, IDs, revisiones y progreso.
- Exportación autónoma, validación de recursos y offline preparado siguen funcionando.

No agregues E5/E6, Sócrates, backend, cuentas, nube, extensiones remotas, nuevos catálogos, HTML/CSS libre ni dependencias por conveniencia. No elimines funciones para simplificar la pantalla ni amplíes permisos para facilitar pruebas.

## Implementación y pruebas

Trabaja en Ubuntu/WSL con `source ../scripts/env.sh`. Conserva primero un snapshot recuperable del incremento y evidencia anterior. Consulta CodeGraph antes de cambios de fronteras y sincroniza tras cambios relevantes, conforme a AGENTS.

Aplica el cambio OpenSpec existente; no crees otro duplicado. Marca tareas solo tras implementarlas y verificarlas. Implementa primero composición/acciones/consulta comunes, después lenguaje/errores/sistema y las variaciones de los seis contextos. Añade pruebas que reproduzcan los hallazgos; no debilites expectativas, reintentos o pruebas existentes para obtener verde.

Usa el flujo del repositorio:

```bash
source ../scripts/env.sh
npm run openspec -- instructions apply --change studio-visual-workspace-rework --json
npm run test:quick
npm run test:affected -- --files <rutas-reales-modificadas> --list
npm run test:affected -- --files <rutas-reales-modificadas>
npm run test:full
npm run spec:validate
```

Los placeholders se sustituyen por las rutas reales; no ejecutes literalmente `<rutas-reales-modificadas>`. Full se corre al consolidar archivos estables, conserva reportes y solo avanza referencia si aprueba. Tras un full aprobado, prosa posterior requiere validación estricta sin repetir toda la suite sin motivo.

La última puerta histórica aprobó **400 Node, 63 herramientas y 168 E2E**. Es una referencia, no una certificación de tus cambios ni un conteo que debas copiar como resultado nuevo. Registra los conteos reales de tu ejecución.

Prueba controles y edición reales, teclado, foco/caret, error→origen, modos independientes, Stop transversal, original/copia Scratch, importación inválida, guardado/reapertura, exportaciones y offline frío con un nuevo Chromium y los seis servidores detenidos. Las capturas deben mostrar renderers reales; una superficie GPU vacía por la herramienta requiere recaptura, no esconder el fallo.

Ejecuta revisión visual y documentación según Impeccable al alcance real. Conserva por separado detector, revisión humana del agente, pruebas de software y observación educativa. No declares accesibilidad integral, comprensión del estudiante o hardware físico a partir de E2E.

## Entrega esperada

Entrega la implementación completa y una release local abierta para revisarla. Incluye:

1. Resumen de cambios y capturas comparables de los seis contextos y estados materiales.
2. Matriz E4-01…08: resuelto/parcial/pendiente, con archivos, prueba o captura que lo demuestra.
3. Resultados reales de quick/affected/full, OpenSpec y preservación de upstreams; fallos e intentos separados.
4. Brief, DESIGN/sidecar, documentación y tareas actualizados, manteniendo evidencia histórica y sin archivar cambios como efecto lateral.
5. Pendientes reales de observación con docente/estudiantes, lector humano y equipos físicos. No inventes aceptación ni mejoras porcentuales.

Comunícate en español. Avanza hasta un resultado concreto, probado y revisable; informa cualquier bloqueo real con evidencia y conserva el trabajo válido.
