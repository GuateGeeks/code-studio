# phase-transition Specification

## Purpose
Cerrar la caracterización con decisiones trazables y habilitar un primer corte de producto sin confundir los experimentos con validación física o de producción.

## Requirements

### Requirement: GG-GATE-001 Decisión G1 con alcance explícito
El acta de fase 0 SHALL registrar una decisión del motor 2D para el subconjunto GG probado y enlazar corpus, Run/Stop, bindings y ADR. SHALL identificar limitaciones y condiciones para reabrir la decisión, incluyendo rendimiento en el equipo escolar de referencia.

#### Scenario: Entrada acotada a fase 1
- **WHEN** el corpus mínimo y las regresiones del runner pasan y las mediciones están registradas con su entorno
- **THEN** el acta permite iniciar el corte de fase 1 descrito en PHASE-1-ENTRY
- **AND** no presenta el resultado como compatibilidad general con Scratch ni como aprobación de equipos sin medir

### Requirement: GG-GATE-002 Clasificación G2 sin equivalencia física
El acta SHALL separar compilación de JS/HEX, ejecución del simulador y ejecución autónoma en placa. SHALL mantener physicalBoardValidated=false hasta comprobar el firmware en hardware; la falta de placa SHALL registrarse sin bloquear el corte 2D de fase 1.

#### Scenario: Firmware y simulación aprobados sin placa
- **WHEN** el worker compila artefactos válidos y el simulador ejecuta el mismo JS pero no hay prueba física
- **THEN** G2 permanece pendiente de validación física y conserva evidencia de generación y simulación
- **AND** la entrada a fase 1 no se anuncia como aceptación física de micro:bit

### Requirement: GG-GATE-003 Evidencia reproducible y preservación
El cierre SHALL enlazar resultados completos de Node, navegador y medición con versiones, muestras y límites. SHALL comprobar los cambios upstream contra la línea base y validar OpenSpec estrictamente. SHALL distinguir presupuestos propuestos de umbrales observados o validados.

#### Scenario: Revisión del cierre
- **WHEN** una persona revisa el acta y ejecuta los comandos documentados
- **THEN** puede localizar corpus, resultados, métricas, ADRs y criterios de transición
- **AND** los informes registran los fallos u objetivos no demostrados sin tratarlos como pruebas aprobadas

### Requirement: GG-GATE-004 Primer corte persistente
La entrada a fase 1 SHALL definir GGPROJ, autosave, recuperación y reapertura como trabajo de producto posterior al spike, conservando una sola autoría y los contratos de ejecución aprobados.

#### Scenario: Criterio de salida de fase 1
- **WHEN** se define el siguiente incremento
- **THEN** su aceptación incluye crear, programar, ejecutar, detener, cerrar y reabrir con autoría y comportamiento conservados
- **AND** no considera la conservación en memoria durante Run/Stop una prueba de persistencia
