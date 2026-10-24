# project-persistence Specification

## Purpose
Conservar la autoría de Studio en un archivo GGPROJ portable y en revisiones locales recuperables, permitiendo cerrar y reabrir sin perder IDs, recursos ni comportamiento.

## Requirements

### Requirement: GG-PROJECT-001 Documento de autoría versionado
El documento SHALL identificar formato y versión, proyecto, nombre, revisión y fechas. SHALL conservar Blockly con sus IDs, fuente de dispositivo, estado inicial de escena, recursos embebidos y locks. SHALL excluir estado mutable del runner y credenciales o referencias de sesión.

#### Scenario: Autoría separada de ejecución
- **WHEN** el usuario ejecuta bloques y cambia posición o variables mediante GG antes de exportar
- **THEN** el proyecto conserva los bloques e IDs y el estado inicial de autoría
- **AND** no convierte la posición o variable final del runner en estado inicial ni guarda su sesión

### Requirement: GG-PROJECT-002 Archivo GGPROJ portable y acotado
El archivo .ggproj SHALL usar ZIP v1 sin compresión con manifiesto y recursos del proyecto. SHALL limitar archivo y contenido expandido a 2 MiB y entradas a 16, verificando nombres de ruta, tamaños y CRC antes de aceptar contenido. SHALL rechazar rutas ambiguas, entradas duplicadas, cifrado y métodos no soportados.

#### Scenario: Descarga y apertura del archivo real
- **WHEN** el usuario descarga un GGPROJ y lo abre en una página nueva del Studio
- **THEN** se restaura el documento portable con sus recursos y versiones
- **AND** el archivo no depende de referencias temporales o de una sesión del navegador anterior

#### Scenario: Contenedor inválido
- **WHEN** el archivo está truncado, excede límites o contiene una entrada con ruta no permitida o CRC incorrecto
- **THEN** la apertura falla con diagnóstico antes de sustituir el proyecto abierto

### Requirement: GG-PROJECT-003 Recursos y versiones verificables
El importador SHALL aceptar únicamente el formato, locks y catálogo de recursos propios fijados para este corte. SHALL verificar hashes y referencias de recursos antes de abrir. SHALL rechazar recursos ausentes, alterados, desconocidos y metadatos o URLs de extensiones remotas.

#### Scenario: Recurso o versión incompatible
- **WHEN** el manifiesto declara una versión no soportada, altera un hash o referencia un recurso ausente o remoto
- **THEN** el importador muestra el motivo y conserva autoría, escena, sesión y autosave anteriores
- **AND** no solicita ni ejecuta el recurso externo

### Requirement: GG-PROJECT-004 Importación atómica preparada
La apertura SHALL validar documento, recursos y workspace Blockly con su IR antes de sustituir autoría o invalidar la sesión. Una validación fallida SHALL conservar el proyecto activo y su recuperación. La apertura válida SHALL iniciar una sesión limpia sin ejecutar o compilar automáticamente el programa.

#### Scenario: Workspace inválido en un contenedor válido
- **WHEN** un GGPROJ estructuralmente válido contiene un bloque, referencia o valor fuera del subconjunto
- **THEN** el diagnóstico conserva el trabajo abierto y no reinicia su escena ni sobrescribe su copia confirmada

#### Scenario: Apertura válida
- **WHEN** el documento preparado se acepta
- **THEN** el workspace y la fuente corresponden al documento y el runner anterior se descarta
- **AND** el nuevo runner no ejecuta hasta una acción explícita del usuario

### Requirement: GG-PROJECT-005 Reapertura conserva comportamiento
El flujo SHALL permitir editar, ejecutar, detener, exportar, cerrar y reabrir desde una UI. La reapertura SHALL conservar autoría, IDs y recursos y SHALL reproducir el comportamiento esperado al ejecutar de nuevo. Conservar el workspace solo en memoria SHALL NOT contar como persistencia.

#### Scenario: Proyecto editable después de cerrar
- **WHEN** se cambian los pasos del movimiento, se exporta, se cierra la página y se reabre el archivo
- **THEN** el valor editado y los IDs originales se conservan
- **AND** ejecutar produce el mismo movimiento esperado sobre un estado inicial limpio

### Requirement: GG-PROJECT-006 Autosave con confirmación transaccional
El autosave SHALL conservar revisiones actual y anterior mediante una operación atómica en IndexedDB. SHALL confirmar guardado únicamente después del commit. Los cambios pendientes SHALL tener un estado visible distinto de una copia confirmada; una escritura fallida SHALL conservar la última copia confirmada.

#### Scenario: Escritura interrumpida
- **WHEN** una escritura falla después de intentar rotar la revisión anterior
- **THEN** ni la revisión actual ni el respaldo quedan parcialmente sustituidos
- **AND** la UI no anuncia guardado completado

### Requirement: GG-PROJECT-007 Recuperación de revisión confirmada
El arranque SHALL validar la última copia confirmada y restaurarla sin ejecutar el programa. Si la actual está dañada y la anterior es válida, SHALL recuperar la anterior con aviso. Si ninguna es válida, SHALL conservar ambas y suspender autosave hasta una decisión explícita o una importación válida.

#### Scenario: Recargar después de guardar
- **WHEN** el usuario cierra o recarga después de la confirmación del autosave
- **THEN** se recupera el proyecto, con autoría e IDs conservados y una sesión nueva detenida

#### Scenario: Respaldo válido
- **WHEN** la revisión actual no valida y la anterior sí
- **THEN** se restaura la anterior y se informa la recuperación
- **AND** un siguiente guardado fallido no destruye el respaldo válido

#### Scenario: Ambas revisiones dañadas
- **WHEN** ninguna revisión local valida
- **THEN** se muestra un aviso y se conservan las copias almacenadas
- **AND** editar el ejemplo no las sobrescribe automáticamente antes de la decisión de recuperación

### Requirement: GG-PROJECT-008 Fallos de almacenamiento sin pérdida de trabajo
Si IndexedDB no está disponible o se agota la cuota, la UI SHALL mostrar que el guardado no está confirmado. SHALL mantener edición, ejecución y exportación disponibles. SHALL permitir volver a intentar sin que un error anterior bloquee permanentemente la cola de guardado.

#### Scenario: Almacenamiento denegado o sin espacio
- **WHEN** el navegador deniega IndexedDB o rechaza una escritura por cuota
- **THEN** se presenta el fallo y el usuario puede seguir editando y descargar su GGPROJ
- **AND** no se pierde la última revisión confirmada ni se informa un guardado ficticio

### Requirement: GG-PROJECT-009 Stop y sesión no mutan la autoría persistente
Stop, reinicio, llamadas GG y mensajes de sesiones o revisiones antiguas SHALL NOT modificar la autoría ni sus copias guardadas. Una recuperación SHALL establecer una sesión nueva que rechace referencias anteriores y conserve autoría recuperada al detener trabajo pendiente.

#### Scenario: Recuperar y detener ejecutor con trabajo pendiente
- **WHEN** se recupera un proyecto, se ejecuta espera, audio o worker bloqueado y se solicita Stop
- **THEN** la fuente recuperada permanece disponible y reabrible
- **AND** una referencia o mensaje del runner anterior no cambia la autoría ni el nuevo proyecto

### Requirement: GG-PROJECT-010 Persistencia local integrada y accesible
La UI SHALL ofrecer nombre de proyecto, apertura, descarga, estado de guardado y diagnóstico de recuperación con etiquetas accesibles, también a ancho móvil. La persistencia SHALL funcionar con servidores estáticos; el servidor SHALL NOT recibir autoría para guardarla, ejecutarla o compilarla.

#### Scenario: Operaciones visibles en escritorio y móvil
- **WHEN** el usuario abre, edita, guarda y exporta en los tamaños verificados
- **THEN** puede identificar controles y estado sin desbordamiento de página
- **AND** las peticiones de red permanecen en los recursos estáticos autorizados
