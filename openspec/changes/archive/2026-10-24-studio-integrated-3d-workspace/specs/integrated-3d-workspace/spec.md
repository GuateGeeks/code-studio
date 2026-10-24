# Spec Delta

## Purpose

Reunir autoría 3D, resultado y consulta de objetos en un espacio accesible para principiantes con docente, conservando ejecución explícita y separación entre estado inicial y runtime.

## ADDED Requirements

### Requirement: Composición integrada 3D
El contexto 3D SHALL situar bloques o documento independiente en el área principal, ejecutar y detener en la barra común y resultado más consulta junto al programa en escritorio amplio. En estrecho o zoom real SHALL conservar controles, foco y enlaces accesibles sin desbordamiento horizontal global.

#### Scenario: Programa y resultado próximos
- **WHEN** el usuario añade 3D y ejecuta sus bloques
- **THEN** observa la escena junto al programa y puede detenerla con el transporte común

#### Scenario: Reflujo y teclado
- **WHEN** el espacio disponible disminuye o el usuario aumenta el zoom
- **THEN** alcanza programa, ejecución, resultado y consulta por teclado y desplazamiento

### Requirement: Consulta de estado inicial diferenciada
La consulta 3D SHALL reunir objetos, cámara, propiedades y modelos del estado inicial; consultar MUST conservar autoría y sesión. Aplicar propiedades SHALL validar antes de sustituir el estado inicial y no ejecutar ni confundir la última escena renderizada con el proyecto guardado.

#### Scenario: Consultar durante la ejecución
- **WHEN** el usuario consulta objetos o cámara mientras corre el programa
- **THEN** conserva la sesión y encuentra una explicación de que esas propiedades pertenecen al estado inicial

#### Scenario: Propiedad o modelo inválido
- **WHEN** una edición o importación no supera la validación existente
- **THEN** aparece un error accesible y se conservan la autoría y la escena válidas anteriores

### Requirement: Documentos y código independientes
El espacio SHALL conservar una única instancia del editor textual y distinguir bloques, código derivado de solo lectura y copia JavaScript/Python independiente. Cambiar modo, consultar o crear una copia MUST conservar los bloques y no iniciar ejecución; el documento seleccionado SHALL identificar su destino 3D.

#### Scenario: Crear una copia textual
- **WHEN** el usuario crea explícitamente una copia de los bloques 3D
- **THEN** edita el documento independiente en el área principal sin modificar los bloques ni ejecutar

### Requirement: Continuidad y límites existentes
La integración MUST conservar validación de recursos, exportación autónoma, GGPROJ, autosave, offline preparado, aislamiento por origen y guardas de sesión/revisión. Reabrir MUST conservar el programa sin autorun; detener el resultado desde otro contexto SHALL invalidar la ejecución anterior y conservar autoría.

#### Scenario: Reapertura y Stop
- **WHEN** el usuario reabre un proyecto 3D o detiene su resultado desde otro contexto
- **THEN** conserva bloques, documentos y objetos iniciales sin ejecución implícita ni referencias activas de la sesión detenida
