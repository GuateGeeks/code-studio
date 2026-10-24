# Spec Delta

## Purpose

Permitir que un estudiante edite el mismo programa en bloques o en texto y alterne entre ambos sin perder trabajo, con explicaciones claras cuando el texto no puede representarse como bloques.

## ADDED Requirements

### Requirement: Un programa, varias vistas

En los contextos habilitados, el sistema SHALL presentar Bloques, JavaScript y Python como vistas del mismo programa, con la vista activa identificada. Cambiar de vista MUST NOT ejecutar, detener ni reiniciar el resultado. Ejecutar SHALL usar el mismo programa desde cualquier vista.

#### Scenario: Mirar el código y volver
- **WHEN** un estudiante con un programa 2D en bloques abre la vista JavaScript sin editarla y vuelve a Bloques
- **THEN** los bloques, sus IDs, su posición y el resultado en pantalla no cambian y nada se ejecuta

### Requirement: Cambios en el texto conservados al volver a bloques

Cuando el texto de una vista sincronizada está dentro del subconjunto bloqueable, volver a Bloques SHALL reconstruir el programa con los cambios del texto. Los bloques cuyo contenido no cambió MUST conservar su ID. Los comentarios de línea SHALL convertirse en comentarios de bloque. El formato del texto MAY regenerarse; el sistema SHALL avisarlo la primera vez.

#### Scenario: Cambiar un número en JavaScript
- **WHEN** en la vista JavaScript se cambia `hero.move(10)` por `hero.move(25)` y se vuelve a Bloques
- **THEN** el bloque mover muestra 25, conserva su ID, el resto de bloques no cambia y ejecutar da el resultado de 25 pasos

#### Scenario: Añadir una instrucción en Python
- **WHEN** en la vista Python se añade `hero.say("Hola", 2)` dentro de un evento y se vuelve a Bloques
- **THEN** aparece el bloque correspondiente en ese evento, los bloques existentes conservan su ID y el programa se guarda

### Requirement: Rechazo explicado sin pérdida de trabajo

Si el texto tiene un error de sintaxis o usa una construcción fuera del subconjunto bloqueable, el sistema MUST NOT cambiar a Bloques. SHALL indicar la línea y una causa comprensible, y ofrecer tres salidas: seguir editando, volver a la última versión en bloques o guardar el texto como copia independiente. Ninguna salida MUST descartar texto sin una confirmación explícita.

#### Scenario: Construcción sin bloque
- **WHEN** el texto usa una función del lenguaje que no tiene bloque y se pulsa Bloques
- **THEN** la vista sigue en texto, se marca la línea con una explicación en español y las tres salidas están disponibles por teclado

#### Scenario: Guardar como copia
- **WHEN** ante el rechazo se elige guardar como copia independiente
- **THEN** se crea un documento independiente con el texto exacto, el programa en bloques vuelve a su última versión válida y nada se ejecuta

### Requirement: Conversión aislada y validada

El análisis del texto SHALL ocurrir en el origen del lenguaje, fuera de la shell. Su resultado MUST validarse con las mismas reglas que un programa creado con bloques antes de sustituir la autoría. Un fallo de conversión MUST conservar la autoría vigente, la sesión y el resultado.

#### Scenario: Conversión que no supera la validación
- **WHEN** el resultado del análisis excede un límite del programa (número de bloques, profundidad)
- **THEN** se rechaza con la causa, el programa en bloques sigue igual y el resultado activo continúa

### Requirement: Restauración y continuidad

Cada cambio de vista que modifique el programa SHALL crear un punto de restauración local. Deshacer SHALL volver al programa anterior al cambio. El autosave, la descarga y la apertura de proyectos MUST conservar la vista activa y el texto pendiente sin ejecutar.

#### Scenario: Deshacer una conversión
- **WHEN** después de volver a Bloques con cambios se usa Deshacer
- **THEN** el programa vuelve exactamente al estado previo, con los mismos IDs

### Requirement: Disponibilidad honesta por contexto

Cada contexto SHALL indicar qué vistas admiten edición sincronizada. Una vista no sincronizada MUST presentarse como lectura con la causa (por ejemplo, el pack no declara ese lenguaje o el contexto aún no está habilitado). La copia independiente SHALL seguir disponible en todos los contextos que la admiten hoy.

#### Scenario: Contexto aún no habilitado
- **WHEN** se abre la vista Python de un contexto sin edición sincronizada habilitada
- **THEN** se muestra como lectura con la causa y la acción «Crear copia independiente»

### Requirement: Actividad de transición compatible

La actividad de transición a texto SHALL publicarse como nueva revisión basada en editar el mismo programa en texto y volver a bloques. La revisión 1 y su progreso guardado MUST seguir legibles. Los checks MUST evaluar el programa, no el formato del texto.

#### Scenario: Progreso de la revisión anterior
- **WHEN** un perfil con progreso en la revisión 1 abre la actividad
- **THEN** su progreso se muestra como revisión 1 y puede empezar la revisión 2 sin perderlo
