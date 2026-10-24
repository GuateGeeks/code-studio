# Spec Delta

## Purpose

Reunir programa, aplicación web interactiva y consulta en una estación accesible para principiantes con docente, conservando autoría inicial, documentos independientes y ejecución explícita.

## ADDED Requirements

### Requirement: Composición integrada web
El contexto web SHALL situar bloques o documento independiente en el área principal, ejecutar y detener en el transporte común y resultado más consulta próximos en escritorio. En estrecho y zoom SHALL conservar controles, teclado y enlaces de retorno sin desbordamiento horizontal global.

#### Scenario: Programa y formulario próximos
- **WHEN** el usuario añade web, modifica sus bloques y ejecuta
- **THEN** puede enviar el formulario nativo y observar su resultado junto al programa

#### Scenario: Reflujo y teclado
- **WHEN** el espacio disponible disminuye o aumenta el zoom
- **THEN** programa, resultado, consulta y Detener permanecen alcanzables con foco visible

### Requirement: Componentes iniciales diferenciados
La consulta SHALL reunir componentes y propiedades del estado inicial. Consultar MUST conservar autoría y sesión; aplicar SHALL validar antes del reemplazo y no ejecutar ni convertir la interacción runtime en autoría guardada.

#### Scenario: Consulta durante ejecución
- **WHEN** el usuario consulta o modifica válidamente un componente mientras usa el formulario
- **THEN** encuentra la explicación de estado inicial y conserva la sesión y el resultado interactivo anterior hasta ejecutar explícitamente de nuevo

#### Scenario: Propiedad inválida
- **WHEN** una modificación no supera la validación existente
- **THEN** aparece un error accesible y se conservan la autoría válida y la aplicación activa

### Requirement: Documento y código independientes
El espacio SHALL conservar una sola instancia del editor textual, identificar su destino web y distinguir fuente derivada de solo lectura de copia JavaScript/Python independiente. Consultar, copiar o cambiar modo MUST conservar los bloques sin ejecución implícita.

#### Scenario: Copia explícita
- **WHEN** el usuario crea una copia textual web
- **THEN** edita el documento independiente enfocado en el área principal, conservando bloques, resultado y posición del cursor al consultar

### Requirement: Continuidad y límites existentes
La integración MUST conservar componentes declarativos, eventos nativos, recursos validados, exportación autónoma, GGPROJ, autosave, offline preparado, seis orígenes y guardas de sesión/revisión. Reabrir SHALL conservar la autoría sin autorun; Detener resultado desde otro contexto SHALL invalidar la ejecución anterior.

#### Scenario: Reapertura y Stop transversal
- **WHEN** el usuario reabre el proyecto web o detiene su resultado desde otro contexto
- **THEN** conserva componentes, bloques y documentos independientes sin ejecución automática ni referencias activas anteriores
