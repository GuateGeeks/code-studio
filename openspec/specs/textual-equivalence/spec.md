# textual-equivalence Specification

## Purpose

Crear copias textuales explícitas e independientes de los bloques, ejecutar sus callbacks sobre la misma escena con semántica nativa de eventos y esperas, y demostrar equivalencia observable con el corpus. Origen: cambio `phase-2-textual-equivalence` (archivado).

## Requirements

### Requirement: GG-COPY-001 Explicit independent textual copies
Studio MUST generar JS/Python determinista desde IR0 validada y crear copias solo por acción explícita. MUST conservar bloques originales y persistir la fuente independiente sin sincronización ficticia ni logs.
#### Scenario: Copy and reopen
- **WHEN** el alumno crea una copia, edita su fuente y guarda/reabre
- **THEN** conserva documento/ID/fuente y bloques originales, sin ejecución automática

### Requirement: GG-TEXT-PROGRAM-001 Contextual callbacks on one scene
Studio MUST ejecutar callbacks textuales con contexto por invocación/target y estado2D propio de la VM. MUST implementar eventos, ámbitos, clones, disfraces y audio del corpus sin ejecutar cuerpos Blockly simultáneos.
#### Scenario: Clone and shared variables
- **WHEN** un clon modifica su local y una global durante un callback
- **THEN** conserva independencia local y comparte la global, con comandos atómicos y sin mezclar contexto tras await

### Requirement: GG-TEXT-PROGRAM-002 Native event and waiting semantics
Studio MUST conservar hats, mensajes con espera y cancelación por reinicio/Stop. MUST imponer límites de trabajo activo y rechazar tokens antiguos.
#### Scenario: Receiver waits
- **WHEN** un emisor envía y espera a un receptor que suspende
- **THEN** el emisor continúa después de ese receptor y Stop cancela ambos sin continuación tardía

### Requirement: GG-COPY-002 Observable corpus equivalence
Studio MUST comparar el corpus compartido entre bloques, JS y Python por estado/traza/orden parcial y render/audio reales. MUST declarar límites numéricos y operaciones incompatibles sin omitir ni recortar silenciosamente.
#### Scenario: Independent configurations
- **WHEN** una copia textual se ejecuta tras editar los bloques originales
- **THEN** usa sus declaraciones y recursos propios de fuente, y conserva el comportamiento del corpus soportado
