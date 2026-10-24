# Design

## Context

La motivación y el alcance están en [proposal.md](proposal.md); el contrato observable está en [studio-entry-journey](specs/studio-entry-journey/spec.md). El público prioritario, principiantes con docente, fue confirmado por el usuario. No hay edad, grado, equipo escolar ni identidad de marca confirmados.

La revisión del código encontró una aplicación de módulos JavaScript nativos, HTML y CSS con Blockly. `src/studio/shell.js` compone controladores de proyecto, actividades, documentos, recursos y contextos. Los controladores consultan IDs DOM existentes. `project-ui.mjs` administra recuperación, cola de acciones, commit de autosave y preparación atómica; `loadStarter` usa `replacePrepared`, que exige proteger el trabajo antes del reemplazo. `lessons-ui.mjs` ya distingue seleccionar instrucciones de cargar un ejemplo.

Las capacidades implementadas de F0–F7 se conservan. El cierre F6/F7 acredita una puerta histórica; no acredita este cambio. El checkout del producto aparece completamente sin seguimiento en Git, por lo que no ofrece aún una base de comparación útil por sí solo. Los trece cambios OpenSpec históricos permanecen sin archivar y el catálogo principal de specs está vacío.

## Goals / Non-Goals

**Goals:**
- Integrar una capa de presentación de entrada sobre los controladores existentes, manteniendo una sola autoría y el manejo actual de errores y cancelación.
- Hacer explícitas las acciones y los estados del recorrido 2D sin introducir un segundo coordinador de ejecución.
- Poder comparar y revertir los archivos de este corte sin alterar trabajo previo ni evidencia histórica.

**Non-Goals:**
- Migrar framework, instalar bibliotecas de animación o modificar motores, CSP, grants, orígenes, formatos GGPROJ y contratos de runtime.
- Evolucionar el esquema de actividades, agregar un tutor o integrar Sócrates; la actividad actual sirve como entrada al recorrido.
- Declarar validación pedagógica, escolar, de lector humano o de hardware mediante pruebas automatizadas.

## Decisions

### 1. Contexto de producto y diseño antes de cambios visuales

Registrar `PRODUCT.md` y `DESIGN.md` del producto durante la implementación, contrastando la interfaz renderizada con el código y la documentación existente. Identificar por separado decisiones confirmadas, hipótesis de diseño y pendientes: público principiante con docente confirmado; edad, equipos y marca pendientes. Documentar lenguaje, jerarquía, componentes, tokens y estados que el corte realmente use. Los sprites de ejemplo no se convierten en identidad aprobada.

Alternativa considerada: aplicar directamente una plantilla de otra skill o presentar una marca completa como establecida. Se descarta porque agregaría decisiones no sustentadas y dificultaría revisar el propósito del cambio.

### 2. Entrada como presentación, sin duplicar estado del proyecto

Mantener `createProjectUI`, `createProjectAuthoring` y los controladores actuales como autoridades. La entrada se compone en `index.html` y `shell.js`; si hace falta separar interacciones, usar un módulo pequeño de presentación en `src/studio/` que reciba callbacks y snapshots de estado. No importa almacenamiento, editores ni runtimes internos.

El estado visible se deriva de la inicialización del controlador de proyecto: buscando, sin copia recuperada, recuperado, recuperado desde respaldo o recuperación bloqueada. Si el estado público no expresa ese resultado, añadir al controlador una notificación o campo de solo lectura que lo derive de la recuperación existente. No deducirlo de textos de la interfaz, no crear otra clave de almacenamiento ni persistir una copia del proyecto en el nuevo módulo.

Continuar conduce al editor del proyecto abierto y coloca el foco en una ubicación útil. Explorar actividad abre las instrucciones sin cargar el starter. Abrir utiliza el input y la operación de apertura existentes. Primera creación usa un starter 2D local ya compatible, con el mecanismo `loadStarter`/`replacePrepared`, manteniendo el flush protector y la validación antes de aplicar. La entrada no llama Run como consecuencia de navegar.

Alternativa considerada: una aplicación de bienvenida separada con su propio almacenamiento o un flujo nuevo de carga. Se descarta por las carreras y divergencias que introduciría en recuperación y reemplazo.

### 3. Reorganizar nodos y conservar sus identidades

Mantener los IDs de controles, las instancias de editores y los listeners existentes. Reorganizar la estructura HTML y CSS antes de agregar wrappers o módulos; no clonar botones, inputs, workspaces ni elementos con IDs repetidos. Evitar remount de Blockly al cambiar entre entrada y trabajo. Notificar su redimensionamiento mediante el mecanismo del editor cuando pase de oculto a visible y verificar posición y foco con interacción real.

Agrupar selector de corpus, ejecución de ejemplos y controles GG de diagnóstico en herramientas avanzadas mediante controles nativos de revelado. Conservar sus IDs y acciones. Mantener el escenario, el transporte principal y el estado de guardado fuera de esa agrupación. Mostrar herramientas no carga ni ejecuta un ejemplo. El cierre de paneles restaura foco solo cuando este quedaría oculto.

Alternativa considerada: una reescritura en componentes de otro framework. Se descarta para este corte porque sus beneficios no justifican migrar contratos y pruebas que ya funcionan.

### 4. Autoridad de ejecución y lenguaje contextual

La acción principal 2D se conecta a `runEditable` y el botón existente `run-editor`; Detener conserva `reset` y su revocación por sesión. El botón de corpus `run` mantiene su rol avanzado y una etiqueta inequívoca. Las acciones textuales, de micro:bit y de capacidades siguen asociadas a sus controladores y contextos; no se unifican en un Run genérico que ignore cuál documento está activo.

Los mensajes visibles se proyectan desde el estado real: preparando, listo, ejecutando, detenido y error. Los detalles técnicos pueden permanecer en diagnóstico, mientras el texto principal explica la acción posible. La vista de código derivado y las copias independientes conservan su semántica, nombres accesibles y mapas de origen. No renombrar un control de forma que parezca guardar, sincronizar o ejecutar algo que no hace.

Alternativa considerada: un coordinador universal de todos los modos. Se aplaza; excede el recorrido inicial y aumentaría la superficie de regresión.

### 5. Persistencia y casos difíciles forman parte del recorrido

Conservar los outputs actuales de guardado, recuperación y error accesibles desde la entrada y el trabajo, moviendo sus nodos si hace falta. No presentar guardado confirmado antes del commit. La descarga portable sigue siendo la salida cuando IndexedDB no está disponible. Una recuperación bloqueada conserva los datos dañados y las acciones explícitas existentes; el onboarding no los reemplaza.

Las pruebas nuevas cubren selección de instrucciones sin reemplazo, primera creación protegida, fallos de protección y recorrido de vuelta. La suite de persistencia existente mantiene los casos de cuota, corrupción, importación inválida y carreras con Stop. No extender contratos de archivo para guardar estado de presentación.

Alternativa considerada: guardar automáticamente la elección de bienvenida en GGPROJ. Se descarta porque no es autoría y produciría una migración innecesaria.

### 6. Verificación de UX y accesibilidad explícita

Añadir una suite de recorrido con interacciones reales y aprovechar `project-persistence`, `packs-lessons`, `bindings-editor`, `code-console`, `textual-equivalence` y `capability-contexts` según impacto. Toda prueba que use un control movido abre primero su superficie legítima; no se oculta un fallo mediante clic forzado, inyección de autoría o aumento arbitrario de tiempos.

El inventario `normalBrowserFiles` de `tools/test/impact.mjs` aún no enumera `accessibility-shell`, `accessibility-runner` ni `accessibility-zoom`; el perfil full sí descubre todo `tests/browser`. Actualizar el mapa para que HTML/CSS y el recorrido nuevo incluyan esas suites y probar el comportamiento del selector. Hasta verificar esa selección, ejecutarlas explícitamente. La consola, los enlaces de salto, los nombres accesibles y el zoom real forman parte de la aceptación.

Capturar la interfaz renderizada a 1280×900 y 390×844, más los factores reales 200/400 % del harness existente. Son perfiles de laboratorio para comparar y detectar regresiones, no una política móvil aprobada ni evidencia de un teléfono físico. Si se añade movimiento, probar la preferencia reducida y que el estado siga siendo entendible sin la transición.

Alternativa considerada: aprobar solo mediante capturas o `test:affected`. Se descarta porque una imagen no demuestra interacción y la selección actual omite accesibilidad focal.

## Risks / Trade-offs

- [Todo el producto está sin seguimiento Git] → Crear inventario y snapshot verificable de las fuentes previas; no limpiar el checkout ni usar una reversión amplia. El snapshot debe incluir las rutas nuevas y modificadas de este corte con su procedencia.
- [Mover controles rompe referencias, foco o Blockly oculto] → Preservar IDs e instancias, comprobar resize y tabulación, y verificar hit-testing real en escritorio y viewport estrecho.
- [La entrada oculta un fallo de recuperación] → Derivar su estado del controlador y mantener avisos y descarga visibles; probar corrupción y almacenamiento no disponible.
- [Ejecutar no deja claro qué programa se usa] → Conservar botones contextuales y distinguir el corpus avanzado; probar cambios de contexto y copia independiente.
- [Actualizar el mapa de impacto amplía el costo de desarrollo] → Seleccionar suites según la superficie afectada y reservar una puerta full para fuentes estables; no bajar cobertura para ahorrar tiempo.
- [La dirección visual se confunde con marca aprobada] → Documentar decisiones provisionales y evidencias en PRODUCT/DESIGN; usar recursos existentes con su procedencia.
- [El piloto exige otros dispositivos o niveles educativos] → Registrar esos pendientes fuera de este corte; sus resultados podrían ajustar la evolución siguiente sin prometerlos ahora.

## Migration Plan

1. Conservar una base verificable del checkout actual y registrar el estado de las herramientas y la evidencia histórica.
2. Documentar producto/diseño, observar el recorrido actual y mapear los controles que cambiarán de ubicación.
3. Implementar entrada, jerarquía de ejecución y herramientas avanzadas por incrementos con sus casos focales y documentación.
4. Ejecutar regresión de accesibilidad y contextos, revisar las capturas y comprobar recuperación offline preparada. Consolidar una sola puerta completa con fuentes estables.
5. Mantener el cambio sin archivar hasta su cierre real. Para revertir, restaurar únicamente archivos y adiciones identificados de este corte contra el snapshot, sin modificar GGPROJ, IndexedDB ni motores. No publicar como efecto secundario.

La entrega actual prepara estos artefactos; ninguna tarea de implementación queda acreditada por su existencia.
