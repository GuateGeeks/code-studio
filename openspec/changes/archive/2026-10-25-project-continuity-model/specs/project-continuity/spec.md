# Spec Delta

## Purpose

Permitir que estudiante y docente distingan el trabajo confirmado en este navegador de la copia portable solicitada, con estados comprensibles y garantías acordes al almacenamiento disponible.

## ADDED Requirements

### Requirement: Estado de continuidad visible
La cabecera SHALL presentar por separado el estado de guardado local y el de la copia portable. SHALL distinguir cambios pendientes, guardado confirmado, fallo y recuperación bloqueada, sin ocultarlos con una descarga. El estado de copia SHALL indicar sin registro, solicitud del contenido actual o solicitud anterior, y MUST NOT ejecutar ni modificar autoría.

#### Scenario: Cambios después de descargar
- **WHEN** se solicita una copia del contenido actual y después se edita un bloque
- **THEN** la copia se identifica como anterior a los cambios actuales y el guardado local pasa a pendiente
- **AND** solo el commit de esos cambios permite volver a mostrar guardado local confirmado

#### Scenario: Guardado lento con nuevas ediciones
- **WHEN** una escritura de A termina después de que el estudiante haya editado B
- **THEN** la cabecera no afirma que B está guardado
- **AND** conserva el estado pendiente hasta que B se confirme

#### Scenario: Copia portable con almacenamiento fallido
- **WHEN** falla el guardado local y se prepara correctamente una descarga
- **THEN** el fallo local permanece visible junto a la solicitud de copia
- **AND** el estudiante puede seguir editando, ejecutando, solicitando copia y reintentando el guardado

### Requirement: Copia portable identificada por contenido
La acción «Llevar o entregar» SHALL preparar una captura coherente del proyecto y solicitar su descarga como GGPROJ, sin envío académico ni ejecución. SHALL registrar la solicitud solo tras preparar el archivo y entregarlo al navegador; SHALL NOT afirmar escritura física en disco. La vigencia de la copia SHALL depender del contenido capturado, no solo de fechas o revisión.

#### Scenario: Edición mientras se empaqueta
- **WHEN** se captura A para descargar y el estudiante edita B antes de completar el empaquetado
- **THEN** la solicitud corresponde a A y la cabecera indica que B tiene cambios posteriores
- **AND** la autoría B no se reemplaza por A

#### Scenario: Preparación fallida o cancelación externa
- **WHEN** falla la preparación del archivo o el navegador no informa si el usuario completó su descarga
- **THEN** un fallo de preparación no crea un registro de solicitud
- **AND** cuando la entrega al navegador sí ocurrió, el mensaje se limita a solicitud realizada y pide verificar el archivo, sin asegurar que esté en disco

### Requirement: Registro local independiente de autoría
El registro SHALL identificar proyecto y contenido, persistir cuando sea posible y quedar fuera de GGPROJ, sin cambiar autoría, revisiones ni respaldos. Sin registro ni recuerdo válido SHALL indicar estado desconocido sin impedir descarga o recuperación. Si falla persistir una solicitud válida SHALL conservar memoria por proyecto con aviso de sesión y reintento, sin prometer durabilidad.

#### Scenario: Abrir en otro perfil o sin metadatos
- **WHEN** se abre un archivo válido en un perfil sin registro de copia, o el registro local es inválido
- **THEN** la autoría se abre sin ejecutar y el estado portable indica que no hay registro en este navegador
- **AND** no se inventa una descarga previa ni se rechaza el proyecto por ese metadato opcional

#### Scenario: Solicitud válida recordada sin persistencia
- **WHEN** se solicita una copia válida de A y falla la escritura de su registro local
- **THEN** la sesión conserva el recuerdo por proyecto y advierte su falta de durabilidad con opción de reintento
- **AND** pasar de A a B y volver a A conserva ese recuerdo sin atribuirlo a B ni modificar autoría o respaldos

#### Scenario: Resultado tardío de otro proyecto
- **WHEN** se termina la descarga capturada de A después de abrir B
- **THEN** el registro de A no cambia el estado de copia ni la autoría de B

### Requirement: Recordatorio sin pérdida
Studio SHALL mostrar un recordatorio dentro de la página cuando no haya registro de una solicitud de copia del contenido actual. SHALL ofrecer descargar o seguir trabajando, conservar las protecciones de reemplazo y no exigir descargar para editar. Los avisos nativos de salida SHALL ser complementarios y SHALL NOT prometer guardar antes de un cierre abrupto.

#### Scenario: Equipo compartido
- **WHEN** el estudiante trabaja sin copia solicitada del contenido actual
- **THEN** puede leer que el trabajo local pertenece a este navegador y solicitar «Llevar o entregar» o seguir editando
- **AND** no se abre un diálogo repetitivo con cada edición

#### Scenario: Reemplazo controlado y cierre externo
- **WHEN** se solicita reemplazar el proyecto dentro de Studio y falla la protección del trabajo vigente, o se cierra externamente antes de confirmar el autosave
- **THEN** el reemplazo interno fallido conserva el trabajo vigente y explica las opciones
- **AND** el cierre externo solo tiene garantizada la última revisión confirmada; no se afirma que el navegador siempre mostrará un diálogo

### Requirement: Continuidad accesible y local
Los estados y la acción de copia SHALL ser alcanzables por teclado y comprensibles sin depender del color. SHALL seguir disponibles en ancho reducido, zoom real 200/400 % y preparación offline válida, sin cuenta ni servicios nuevos. Los cambios relevantes SHALL anunciarse sin repetir mensajes por cada actualización del reloj.

#### Scenario: Consultar y llevar con teclado sin red
- **WHEN** se recorre una preparación offline válida mediante teclado, con ancho reducido o zoom
- **THEN** se localizan el estado local, la vigencia de copia y la descarga, con foco visible
- **AND** consultar el estado no ejecuta el programa ni inicia peticiones a servicios nuevos
