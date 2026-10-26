# Spec Delta

## MODIFIED Requirements

### Requirement: GG-PROJECT-005 Reapertura conserva comportamiento
El flujo SHALL permitir editar, ejecutar, detener, exportar, cerrar y reabrir desde una UI. La reapertura SHALL conservar autoría, IDs y recursos y SHALL reproducir el comportamiento esperado al ejecutar de nuevo. Conservar el workspace solo en memoria SHALL NOT contar como persistencia. En 2D la continuidad SHALL conservar también conexiones, posiciones de bloques y documentos independientes por recuperación local confirmada y por archivo portable.

#### Scenario: Proyecto editable después de cerrar
- **WHEN** se cambian los pasos del movimiento, se exporta, se cierra la página y se reabre el archivo
- **THEN** el valor editado y los IDs originales se conservan
- **AND** ejecutar produce el mismo movimiento esperado sobre un estado inicial limpio

#### Scenario: Recorrido completo mediante recuperación local
- **WHEN** se crea una primera creación 2D, se cambia su nombre y un valor de movimiento, se ejecuta, se detiene, se espera la confirmación local, se cierra y se abre otra página del mismo perfil y origen
- **THEN** se recuperan el nombre y la autoría confirmada, incluidos IDs de todos los bloques y variables, conexiones y posiciones
- **AND** el resultado permanece sin ejecutar hasta una acción explícita y repetir la ejecución produce el movimiento editado

#### Scenario: Recorrido portable sin almacenamiento previo
- **WHEN** se descarga el archivo real de un proyecto 2D editado con un documento textual independiente y se abre en un perfil sin copias locales
- **THEN** se conservan bloques, documentos, recursos e identidad de autoría sin depender del perfil anterior
- **AND** abrir no ejecuta y editar el documento independiente no modifica los bloques

## ADDED Requirements

### Requirement: GG-PROJECT-011 Exportación de una captura coherente
La descarga SHALL contener una única captura validada del proyecto, sin mezclar autorías de momentos diferentes. Editar o cambiar de proyecto mientras se prepara el archivo SHALL NOT atribuir ese archivo a contenido posterior. Un fallo de preparación SHALL conservar el trabajo actual y SHALL NOT registrar una descarga realizada.

#### Scenario: Edición durante la preparación del archivo
- **WHEN** se solicita descargar el proyecto A y se edita después de capturar su contenido mientras el archivo aún se prepara
- **THEN** el archivo contiene íntegramente la captura anterior y el editor conserva la edición posterior
- **AND** cualquier indicador de copia corresponde solo a la captura exportada

#### Scenario: Cambio de proyecto mientras termina una descarga
- **WHEN** se captura A para descarga y se abre válidamente B antes de terminar la preparación
- **THEN** el resultado tardío no cambia la autoría ni el estado de copia de B
- **AND** el archivo de A, si se ofrece, conserva el nombre y contenido de A

#### Scenario: Fallo de validación o empaquetado
- **WHEN** una descarga no puede preparar un archivo válido
- **THEN** se explica la causa y se conserva el proyecto abierto y su última copia confirmada
- **AND** no se afirma que se descargó la revisión fallida
