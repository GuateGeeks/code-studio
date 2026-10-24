# Spec Delta

## Purpose

Que los estudiantes de primaria alta construyan juegos e historias 2D completos solo con bloques, y lean y ejecuten ese mismo programa en JavaScript y Python.

## ADDED Requirements

### Requirement: Proyectos canónicos 2D

El vocabulario 2D SHALL permitir construir «Atrapa la fruta», «Laberinto» y «Diálogo» solo con bloques y menús, y cada uno MUST existir como fixture canónico que se abre sin ejecutar, alcanza su estado final y se detiene.

#### Scenario: Atrapa la fruta
- **WHEN** se ejecuta el fixture canónico «Atrapa la fruta» y la fruta toca la cesta tres veces
- **THEN** los puntos valen 3, la fruta vuelve arriba en cada contacto y Detener deja el estado inicial

### Requirement: Equivalencia por bloque

Cada bloque nuevo SHALL tener una forma JavaScript y una Python canónicas, y su caso en el corpus MUST producir el mismo resultado observable como bloques, como copia JavaScript y como copia Python, según las reglas de semántica declaradas (división, aleatorio con semilla en pruebas, coerción texto/número).

#### Scenario: Bucle por siempre con colisión
- **WHEN** un programa usa «por siempre» con «si tocando borde, rebotar» y se ejecuta como bloques y como copias
- **THEN** las trazas de posición coinciden en las tres formas durante el intervalo medido

### Requirement: Proyectos anteriores intactos

Los proyectos con la versión anterior de `gg.sprites` SHALL abrirse sin cambios, y actualizarlos SHALL conservar sus bloques, IDs y comportamiento.

#### Scenario: Proyecto con vocabulario v1
- **WHEN** se actualiza un proyecto que solo usa bloques de la versión anterior
- **THEN** su ejecución es idéntica y sus bloques conservan tipo e ID
