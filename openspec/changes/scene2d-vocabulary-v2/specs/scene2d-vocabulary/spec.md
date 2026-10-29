# Spec Delta

## Purpose

Que los estudiantes de primaria alta construyan juegos e historias 2D completos solo con bloques, y lean y ejecuten ese mismo programa en JavaScript y Python.

## ADDED Requirements

### Requirement: Proyectos canónicos 2D

El vocabulario 2D SHALL permitir construir «Atrapa la fruta», «Laberinto» y «Diálogo» solo con bloques y menús, y cada uno MUST existir como fixture canónico que se abre sin ejecutar, alcanza su estado final y se detiene.

#### Scenario: Atrapa la fruta
- **WHEN** se ejecuta el fixture canónico «Atrapa la fruta» y la fruta toca la cesta tres veces
- **THEN** los puntos valen 3, la fruta vuelve arriba en cada contacto y Detener deja el estado inicial

#### Scenario: Hero se presenta (E1, un sprite)
- **WHEN** se abre el fixture canónico «Hero se presenta», construido solo con bloques de la caja de herramientas de `gg.sprites@0.2.0`, y se ejecuta
- **THEN** abrir no ejecuta nada; al ejecutar, Hero se presenta, se desliza, cambia de tamaño y de disfraz, dice su último mensaje y rebota por siempre; Detener deja el estado inicial

### Requirement: Estructuras de control del núcleo ofrecidas por el pack

«Por siempre», «repetir hasta», «esperar hasta» y «detener este programa» SHALL pertenecer al núcleo, y un contexto SHALL ofrecerlas solo cuando un pack activo las incluya en su caja de herramientas.

#### Scenario: Proyecto con la versión anterior del pack
- **WHEN** en un proyecto `gg.sprites@0.1.0` se escribe `while (true) { … }` en la vista JavaScript
- **THEN** la conversión a bloques se rechaza indicando la línea, y los bloques y el resultado no cambian

### Requirement: Formas textuales de las estructuras

Las estructuras SHALL escribirse en JavaScript como `while (true)`, `while (!(a > b))`, `waitUntil(() => a > b)` y `return`, y en Python como `while True:`, `while not (a > b):`, `wait_until(lambda: a > b)` y `return`. Cada vuelta de un `while` MUST ceder un fotograma, como en Scratch.

#### Scenario: Bucle sin bloque
- **WHEN** en la vista JavaScript se escribe `while (x < 3)`, un `do…while` o una función propia
- **THEN** la conversión se rechaza con la causa y la línea, y se ofrece seguir editando o guardar una copia independiente

#### Scenario: Vista sincronizada del vocabulario E1
- **WHEN** en un proyecto `gg.sprites@0.2.0` se edita en JavaScript o Python un valor de un bloque E1 y se vuelve a bloques
- **THEN** solo cambia ese valor; los demás bloques, shadows, comentarios y posiciones conservan su ID, y nada se ejecuta

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
