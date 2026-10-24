## ADDED Requirements
### Requirement: GG-CODE-001 Derived validated listing
Studio MUST generar listado educativo de solo lectura desde la misma IR v0 validada de autoría actual, cubriendo el subconjunto design y conservando mapa de IDs por línea. MUST etiquetarlo no ejecutable y MUST NOT evaluarlo ni presentarlo como APIs GG operativas.
#### Scenario: Edit and reopen
- **WHEN** se edita, restaura o abre autoría válida
- **THEN** listado y mapa corresponden a esa autoría sin mutarla ni cambiar ejecución IR→adaptador
#### Scenario: Invalid generation
- **WHEN** la autoría no se puede traducir o supera límites
- **THEN** se retira listado previo, muestra error y conserva proyecto, sesión y escena
### Requirement: GG-CONSOLE-001 Bounded structured messages
Studio MUST mostrar nivel, código, origen, mensaje e ID opcional, máximo 100 entradas y 1024 unidades por mensaje, con contador de retirados, limpieza explícita y representación textual segura. MUST NOT persistirlos como autoría.
#### Scenario: Flood and unsafe text
- **WHEN** llegan mensajes excesivos o cadenas HTML
- **THEN** registro permanece acotado, rechaza entradas inválidas y muestra texto seguro
### Requirement: GG-CONSOLE-002 Session and revision isolation
Studio MUST aceptar diagnósticos runner solo por canal autorizado con versión, sesión, secuencia creciente, revisión vigente e ID de IR ejecutada cuando exista. Stop MUST invalidar canal y limpiar mensajes de ejecución inmediatamente.
#### Scenario: Old traffic
- **WHEN** llega diagnóstico de otra sesión/revisión o repetido tras carga o Stop
- **THEN** no aparece ni altera selección o ejecución vigente
### Requirement: GG-CONSOLE-003 Source selection and preservation
Studio MUST seleccionar y enfocar bloque existente por ratón/teclado, invalidar enlaces de ejecución tras editar y conservar controles accesibles en móvil. Generación/importación inválida MUST conservar proyecto activo.
#### Scenario: Complete persistent flow
- **WHEN** se edita, genera, ejecuta, selecciona inicio, detiene y guarda/reabre
- **THEN** IDs, autoría y comportamiento se conservan sin código derivado ni logs en archivo
#### Scenario: Missing source
- **WHEN** el bloque se eliminó o cambió autoría
- **THEN** no selecciona otro bloque e informa que debe volver a ejecutar
