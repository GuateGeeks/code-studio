# Spec Delta

## Purpose

Acompañar actividades locales con predicción, experimentación y reflexión, distinguiendo condiciones técnicas del programa y evidencia educativa humana.

## ADDED Requirements

### Requirement: Contrato educativo compatible
El sistema SHALL aceptar actividades declarativas versión 1 y versión 2 con límites y predicados revisados, rechazando campos desconocidos, datos ejecutables y metadatos educativos incompletos.

#### Scenario: Leer una actividad anterior
- **WHEN** se valida una actividad versión 1 válida
- **THEN** conserva su ejemplo, pasos y checks sin exigir campos educativos nuevos.

#### Scenario: Rechazar una definición inválida
- **WHEN** una actividad versión 2 omite objetivo, predicción o reto, excede límites o incluye código ejecutable
- **THEN** se rechaza antes de cambiar la autoría o ejecutar.

### Requirement: Recorrido de aprendizaje explícito
Las tres actividades del catálogo SHALL mostrar objetivo, conocimientos previos, predicción antes de ejecutar y reflexión para contrastar el resultado con el docente.

#### Scenario: Explorar sin reemplazar
- **WHEN** se selecciona una actividad
- **THEN** se puede leer la guía sin cambiar el proyecto ni iniciar una ejecución.

### Requirement: Pistas graduadas
Las pistas SHALL revelarse de una en una, desde observación y causa/efecto hasta una acción concreta, conservando las ya reveladas al actualizar lecturas o volver al recorrido durante la sesión.

#### Scenario: Pedir ayuda por teclado
- **WHEN** se activa Mostrar primera pista y después Siguiente pista por teclado
- **THEN** aparece solo una pista nueva en orden y el foco permanece útil sin revelar las restantes.

### Requirement: Reto variante independiente
Cada actividad versión 2 SHALL ofrecer un reto variante con predicción, instrucciones y reflexión propias, comprobable sin reemplazar el proyecto ni exigir una copia automática.

#### Scenario: Cambiar de recorrido
- **WHEN** se elige Reto variante o Recorrido principal
- **THEN** cambia la guía y sus metas, conserva la autoría y no ejecuta ni carga un ejemplo.

### Requirement: Comprobación contextual y revocable
Comprobar SHALL evaluar solo las metas del recorrido seleccionado contra la ejecución vigente; cambiar recorrido, autoría, sesión o proyecto invalida lecturas y escrituras pendientes.

#### Scenario: Terminar solo el reto
- **WHEN** la ejecución satisface las metas del reto y se comprueba ese recorrido
- **THEN** se registra el reto sin aprobar los pasos principales por inferencia.

#### Scenario: Cambiar durante una lectura
- **WHEN** se cambia de recorrido mientras existe una lectura o guardado pendiente
- **THEN** el resultado anterior no concede progreso al recorrido nuevo.

### Requirement: Progreso compatible y separado
El progreso SHALL conservar los IDs principales anteriores y distinguir los IDs del reto dentro del almacenamiento local separado del proyecto, sin guardar respuestas ni estado runtime como autoría.

#### Scenario: Recuperar historial principal
- **WHEN** existe un registro anterior válido del mismo proyecto y revisión
- **THEN** sus pasos principales siguen disponibles sin acreditar el reto ni certificar los cambios actuales.

### Requirement: Evidencia educativa honesta
La interfaz SHALL explicar que sus checks verifican condiciones técnicas y ofrecer reflexión o explicación con el docente sin afirmar comprensión ni corregir una predicción automáticamente.

#### Scenario: Completar una meta
- **WHEN** se aprueba una comprobación
- **THEN** se indica qué se observó y se mantiene la invitación a explicar o contrastar el resultado.

### Requirement: Continuidad accesible y local
Las actividades SHALL conservar carga protegida, reintento, controles nativos por teclado, uso en ancho reducido y guía/pistas/reto disponibles en el conjunto offline preparado.

#### Scenario: Segunda visita sin servidores
- **WHEN** se abre el conjunto preparado en un proceso nuevo sin los seis servidores
- **THEN** se puede leer la guía, pedir pistas, elegir el reto, editar y comprobar sin servicios remotos.
