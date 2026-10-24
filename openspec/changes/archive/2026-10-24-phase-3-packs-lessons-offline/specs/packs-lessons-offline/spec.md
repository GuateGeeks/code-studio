## ADDED Requirements
### Requirement: GG-PACK-001 Local reviewed contributions
Studio MUST resolver capacidades únicamente mediante un catálogo local revisado con versiones y hashes fijos. MUST incorporar gg.score por contribución del registro sin una rama específica en el editor central y sin ejecutar módulos del archivo importado.
#### Scenario: Install the second contribution
- **WHEN** se activa gg.score del catálogo local
- **THEN** sus bloques bajan al IR validado y funcionan con los mismos adaptadores y generadores, conservando el núcleo genérico
### Requirement: GG-PACK-002 Portable configuration and reversible migrations
Studio MUST conservar lectura exacta GGPROJ1/2 y escribir configuración de capacidades solo en GGPROJ3 explícito. MUST validar locks/configuración antes del commit y ofrecer migración conocida reversible.
#### Scenario: Unknown lock
- **WHEN** un proyecto declara un lock o configuración no soportados
- **THEN** informa el problema, conserva el proyecto activo y no obtiene código remoto
### Requirement: GG-PACK-003 Permission and resource enforcement
Studio MUST comprobar operaciones, permisos y recursos en el broker antes de mutar. MUST rechazar recursos ambiguos o no declarados sin otorgar autoridad por contenido importado.
#### Scenario: Scoped score client
- **WHEN** un cliente limitado a score intenta mover un sprite o escribir una variable ajena
- **THEN** recibe un error y no cambia estado de escena
### Requirement: GG-LESSON-001 Declarative Spanish activities
Studio MUST ofrecer historia, puntuación y transición a texto mediante instrucciones y predicados cerrados. MUST proteger el proyecto actual al cargar ejemplos y conservar progreso fuera de GGPROJ.
#### Scenario: Stale observation
- **WHEN** Stop o una edición invalida una comprobación pendiente
- **THEN** su respuesta no completa pasos ni afecta otro proyecto o actividad
### Requirement: GG-OFFLINE-001 Verified preparation across origins
Studio MUST preparar únicamente recursos locales seleccionados, verificando hashes/tamaños de los cuatro roles y publicando la selección actual solo después de todos los recibos coherentes.
#### Scenario: Partial candidate
- **WHEN** falla un origen por red, cuota o integridad
- **THEN** conserva la selección preparada anterior y no declara lista la candidata
### Requirement: GG-OFFLINE-002 Immutable updates and rollback
Studio MUST usar assets inmutables por cohort, mantener current/previous y volver únicamente a un conjunto anterior completo. MUST impedir fallback de un recurso faltante hacia otro cohort o recurso raíz.
#### Scenario: Two tabs
- **WHEN** otra pestaña prepara y activa una actualización
- **THEN** la pestaña existente sigue usando su cohort y el nuevo arranque usa solo el conjunto verificado
### Requirement: GG-OFFLINE-003 Real second visit
Studio MUST demostrar reapertura con perfil persistente tras cerrar el navegador y detener todos los servidores, conservando autoría y ejecución de los paquetes preparados.
#### Scenario: Prepared activity without servers
- **WHEN** se inicia un nuevo proceso de navegador sin los cuatro servidores
- **THEN** recupera, permite editar y ejecutar 2D/JavaScript/Python y completar una actividad preparada, sin CDN ni archivos de otra versión
