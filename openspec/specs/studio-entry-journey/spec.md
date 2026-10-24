# studio-entry-journey Specification

## Purpose
Permitir que una persona comience o retome una creación en Code Studio y llegue a editar, ejecutar, detener y recuperar su trabajo mediante acciones comprensibles, conservando las capacidades y garantías existentes.

## Requirements

### Requirement: GG-ENTRY-001 Entrada con decisiones comprensibles
Studio SHALL ofrecer continuar el proyecto recuperado cuando exista, iniciar una primera creación 2D, explorar una actividad y abrir un archivo GGPROJ. La entrada SHALL indicar cuándo la recuperación está pendiente y evitar presentar como recuperado un proyecto cuya carga no terminó.

#### Scenario: Primera visita sin proyecto recuperable
- **WHEN** termina la búsqueda local y no existe una copia recuperable
- **THEN** la entrada ofrece primera creación 2D, actividades y apertura de archivo, sin afirmar que hay un proyecto previo disponible

#### Scenario: Regreso con proyecto recuperado
- **WHEN** termina correctamente la recuperación de una copia local
- **THEN** la entrada identifica el proyecto disponible y permite continuar hacia su contexto de autoría sin ejecutarlo

### Requirement: GG-ENTRY-002 Explorar sin reemplazar autoría
Studio SHALL permitir leer las instrucciones de una actividad o inspeccionar una opción de inicio sin sustituir el proyecto activo, sus borradores ni su copia local. Crear o cargar otro proyecto SHALL requerir una acción explícita y conservar la protección de reemplazo existente.

#### Scenario: Seleccionar una actividad con trabajo abierto
- **WHEN** la persona selecciona una actividad para leer sus instrucciones
- **THEN** cambian las instrucciones visibles y se conservan la autoría, los borradores y el proyecto activo

#### Scenario: Falla la protección antes del reemplazo
- **WHEN** se solicita cargar un ejemplo o crear otro proyecto y la protección del trabajo actual no puede completarse
- **THEN** no se sustituye el trabajo actual, se explica el problema y permanecen disponibles las acciones de recuperación o descarga que correspondan

#### Scenario: Abrir un archivo inválido desde la entrada
- **WHEN** se elige un GGPROJ inválido mediante Abrir
- **THEN** se informa el rechazo y el proyecto activo permanece disponible con su autoría intacta

### Requirement: GG-ENTRY-003 Primera creación 2D con resultado observable
Studio SHALL conducir la primera creación 2D al editor y al escenario con una instrucción breve que permita modificar un valor y observar su efecto. Crear el ejemplo SHALL conservar el modelo de proyecto existente y esperar una acción explícita para ejecutar.

#### Scenario: Modificar y probar la primera creación
- **WHEN** la persona inicia la creación 2D, modifica un valor de un bloque y ejecuta el programa
- **THEN** el escenario refleja el cambio y la autoría editada continúa disponible para detener, guardar y volver a ejecutar

### Requirement: GG-ENTRY-004 Ejecución contextual inequívoca
Studio SHALL identificar qué contexto y autoría ejecutará la acción principal. Para los bloques 2D activos SHALL presentar su acción de ejecución junto al flujo editor-resultado y mantener Detener alcanzable durante la ejecución. Los controles de ejemplos o diagnósticos SHALL distinguirse de la ejecución del programa editado.

#### Scenario: Ejecutar los bloques visibles
- **WHEN** el contexto activo es Programa 2D y se usa su acción principal de ejecución
- **THEN** se ejecutan los bloques editados, se identifica ese origen y los controles de corpus no sustituyen silenciosamente el programa elegido

#### Scenario: Detener desde el recorrido principal
- **WHEN** se activa Detener durante una ejecución del recorrido 2D
- **THEN** se muestra el estado detenido, se conserva la autoría y las respuestas tardías de la ejecución anterior no modifican el resultado actual

#### Scenario: Cambiar a otro contexto
- **WHEN** la persona cambia a micro:bit, escena 3D o app web
- **THEN** puede identificar las acciones de ese contexto y no se presenta Ejecutar bloques 2D como ejecución del documento contextual seleccionado

### Requirement: GG-ENTRY-005 Guardado y recuperación visibles
Studio SHALL mantener accesibles el estado real de guardado, la descarga portable y los avisos de recuperación durante el recorrido. SHALL distinguir guardado pendiente, confirmado y fallido; una recuperación degradada SHALL conservar las opciones existentes para proteger el trabajo.

#### Scenario: Edición aún pendiente de confirmación
- **WHEN** se modifica el proyecto y su guardado local todavía no se confirma
- **THEN** la interfaz indica que el guardado está pendiente y no promete recuperación de esa edición

#### Scenario: Almacenamiento no disponible
- **WHEN** el almacenamiento local falla durante el recorrido
- **THEN** se comunica el fallo sin bloquear la edición ni la descarga portable del proyecto válido

#### Scenario: Recuperación desde respaldo
- **WHEN** se recupera la revisión anterior porque la última copia está dañada
- **THEN** la entrada y el espacio de trabajo mantienen visible el aviso de recuperación y no ejecutan automáticamente el proyecto

### Requirement: GG-ENTRY-006 Herramientas avanzadas disponibles
Studio SHALL agrupar los controles de corpus y diagnóstico GG bajo una entrada avanzada identificable, conservando su funcionalidad y acceso por teclado. Ocultar su presentación SHALL conservar los datos y las selecciones de autoría; mostrarlos SHALL evitar ejecutar acciones automáticamente.

#### Scenario: Mostrar herramientas avanzadas
- **WHEN** la persona abre las herramientas avanzadas desde el espacio de trabajo
- **THEN** puede acceder a los controles existentes de ejemplos y diagnóstico, con nombres que diferencian su alcance del programa editado

#### Scenario: Regresar al recorrido principal
- **WHEN** se cierran las herramientas avanzadas
- **THEN** el foco vuelve a un control útil y permanecen el proyecto, sus borradores y el estado de ejecución que corresponde

### Requirement: GG-ENTRY-007 Lenguaje contextual y transición a texto
Studio SHALL usar textos en español que identifiquen proyecto, contexto, bloques y documento seleccionado cuando sea necesario para decidir una acción. El código derivado SHALL seguir identificado como solo lectura y Crear copia SHALL explicar que genera un documento independiente sin sincronización implícita.

#### Scenario: Crear una copia desde código derivado
- **WHEN** la persona consulta el código derivado y elige Crear copia JavaScript o Python
- **THEN** entiende qué documento se crea, la copia no se ejecuta automáticamente y los bloques originales se conservan al editarla

### Requirement: GG-ENTRY-008 Recorrido accesible y adaptable
Studio SHALL permitir completar el recorrido por teclado con foco visible y orden comprensible. A zoom real de 200 % y 400 % SHALL conservar las acciones esenciales y evitar desplazamiento horizontal global. Cualquier movimiento añadido SHALL respetar movimiento reducido sin ocultar cambios de estado.

#### Scenario: Completar el recorrido con teclado
- **WHEN** la persona recorre entrada, edición, ejecución, parada y descarga usando el teclado
- **THEN** puede completar las acciones, abandonar el escenario y localizar el foco sin quedar atrapada en un panel

#### Scenario: Usar zoom real y movimiento reducido
- **WHEN** el navegador usa zoom verificado de 200 % o 400 % y la preferencia de movimiento reducido está activa
- **THEN** los controles esenciales siguen alcanzables, no aparece desplazamiento horizontal global y los cambios de estado se comprenden sin depender de animación

### Requirement: GG-ENTRY-009 Continuidad local del recorrido
Studio SHALL conservar la posibilidad de retomar y editar proyectos con los recursos previamente preparados sin cuenta ni servicios nuevos obligatorios. El recorrido SHALL mantener acceso a los contextos existentes y a la preparación offline sin conceder permisos adicionales al proyecto.

#### Scenario: Regreso con preparación offline existente
- **WHEN** se abre una preparación válida sin red y existe un proyecto recuperable compatible
- **THEN** la entrada permite retomarlo y usar las capacidades preparadas, con el estado local de guardado y las limitaciones existentes visibles
