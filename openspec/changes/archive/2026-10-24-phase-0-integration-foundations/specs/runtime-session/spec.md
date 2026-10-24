# Spec Delta

## Purpose

Mantener la autoría disponible al detener programas e impedir que ejecuciones anteriores cambien la sesión actual.

## ADDED Requirements

### Requirement: GG-RUN-003 Invalidación de sesión
El coordinador SHALL invalidar una sesión al detenerla y SHALL rechazar comandos pendientes de esa sesión incluso después de iniciar otra.

#### Scenario: Mensaje tardío
- **WHEN** se detiene A, se inicia B y llega un comando de A
- **THEN** el comando no modifica el estado de B
- **AND** los datos de autoría permanecen intactos

### Requirement: GG-RUN-004 Terminación forzada
El coordinador SHALL poder destruir un ejecutor bloqueado sin bloquear su propio hilo ni perder la fuente del proyecto.

#### Scenario: Bucle sin cooperación
- **WHEN** un ejecutor entra en un bucle infinito y se solicita Stop
- **THEN** el ejecutor termina dentro del plazo de la prueba
- **AND** el coordinador sigue respondiendo y conserva la fuente original

### Requirement: GG-RUN-005 Frontera de origen y canal autenticado
El runner SHALL residir en otro origen y validar origin, source, versión y sesión antes de aceptar un puerto. SHALL NOT poder leer DOM o almacenamiento del anfitrión.

#### Scenario: Acceso al anfitrión e inicio falsificado
- **WHEN** el runner intenta leer DOM o localStorage del anfitrión y se envía un handshake desde otro frame
- **THEN** los accesos fallan y el handshake no crea una sesión autorizada

### Requirement: GG-RUN-006 Recuperación de navegador
Stop SHALL invalidar la sesión y destruir el frame con sus workers, preservando la fuente del anfitrión y permitiendo otra ejecución.

#### Scenario: Worker bloqueado y mensajes tardíos
- **WHEN** un worker subordinado entra en un bucle infinito y el usuario pulsa Stop
- **THEN** el anfitrión sigue respondiendo, recrea el runner y conserva la fuente
- **AND** un mensaje de la sesión anterior no modifica el estado actual

### Requirement: GG-RUN-007 Red restringida
La política del runner y sus workers SHALL bloquear conexiones a otros orígenes, incluido el anfitrión, para el perfil restringido del spike.

#### Scenario: Intento de acceso externo
- **WHEN** el runner y un worker intentan hacer fetch a un origen externo
- **THEN** la política del navegador rechaza las peticiones antes de obtener datos externos

### Requirement: GG-RUN-008 Referencias GG acotadas
Una referencia GG SHALL pertenecer a una sesión y revisión de programa. El coordinador y el runner SHALL rechazar su uso después de Stop o de reemplazar el programa, antes de mutar la escena vigente.

#### Scenario: Referencia retenida
- **WHEN** se conserva una referencia, se detiene o reemplaza su programa y se intenta mover un sprite con ella
- **THEN** la llamada falla y la nueva escena no cambia

### Requirement: GG-RUN-009 Estabilidad repetida y medición
El banco SHALL ejecutar diez ciclos Run/Stop y conservar muestras por ciclo de latencia, frames, workers y cierre de AudioContext, además de la autoría. SHALL reportar arranque frío/caliente, tamaño estático, heap JavaScript observado y rendimiento de cien sprites con el entorno utilizado. SHALL distinguir descarte del frame de arranque de su reemplazo y heap JavaScript de memoria total de proceso/GPU.

#### Scenario: Diez ciclos sin acumulación de ejecutores
- **WHEN** se ejecutan y detienen diez sesiones con trabajo pendiente
- **THEN** cada sesión anterior se invalida, su frame y workers se retiran y su AudioContext se cierra
- **AND** el reemplazo vuelve a ejecutar y la autoría conserva su contenido
- **AND** las muestras publicadas identifican valores observados y objetivos aún sin validar
