# scene-inspection Specification

## Purpose

Permitir seleccionar e inspeccionar objetos de la escena en modo de solo lectura, acotado y accesible, sin modificar la autoría ni la ejecución. Origen: cambio `phase-1-scene-inspector` (archivado).

## Requirements

### Requirement: GG-INSPECT-001 Read-only scoped inspection
Studio MUST permitir seleccionar Escena/hero y mostrar estado inicial separado de snapshot GG validado. MUST NOT persistir ni mutar ejecución al inspeccionar.
#### Scenario: Read and preserve
- **WHEN** se ejecuta/mueve hero y se actualiza inspector
- **THEN** x/y y variables locales coinciden con GG y la autoría guardada no cambia

### Requirement: GG-INSPECT-002 Stale reads and failures
Studio MUST descartar respuestas de sesión/revisión sustituida y solicitudes anteriores a la última. MUST mantener controles y lectura válida ante DTO inválido.
#### Scenario: Late response
- **WHEN** una lectura termina después de Stop o carga nueva
- **THEN** no reemplaza el inspector vigente

### Requirement: GG-INSPECT-003 Authorable F1 toolbox
Studio MUST exponer en toolbox las operaciones ya soportadas de clon, disfraz y sonido sin ampliar recursos/IR ni APIs GG.
#### Scenario: Construct and reopen
- **WHEN** se añade un bloque desde toolbox, guarda y reabre
- **THEN** autoría/IDs se conservan y su ejecución produce el comportamiento del subconjunto
#### Scenario: Mobile and keyboard
- **WHEN** se usa inspector y toolbox en móvil o teclado
- **THEN** controles tienen nombres accesibles y no desbordan la página
