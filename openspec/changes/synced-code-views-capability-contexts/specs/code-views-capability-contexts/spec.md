# Spec Delta

## Purpose

Extender las vistas sincronizadas del mismo programa a micro:bit, 3D y web con las garantías del corte 2D.

## ADDED Requirements

### Requirement: Vista TypeScript del programa micro:bit

En micro:bit con bloques de firmware, el sistema SHALL presentar la vista TypeScript como el mismo programa. Mirar la vista y volver sin cambios MUST conservar el programa, los IDs, el layout y el firmware compilado byte a byte. Cambiar de vista MUST NOT compilar, simular ni transferir.

#### Scenario: Mirar TypeScript y volver
- **WHEN** se abre la vista TypeScript de un programa de firmware y se vuelve a Bloques sin editar
- **THEN** los bloques, sus IDs y posiciones no cambian y compilar produce un HEX idéntico al anterior

### Requirement: Rechazo por defecto en 3D y web

En 3D y web, el texto fuera del subconjunto bloqueable SHALL rechazarse con su línea y causa, y con las tres salidas del corte 2D, hasta que se registre otra decisión sobre bloques grises.

#### Scenario: Código sin bloque en 3D
- **WHEN** la vista de texto de una escena 3D usa una construcción sin bloque y se pulsa Bloques
- **THEN** la vista sigue en texto, se indica la línea y nada se ejecuta
