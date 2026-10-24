# Spec Delta

## Purpose

Permitir proyectos 2D con varios personajes y un escenario, cada uno con sus scripts, disfraces, sonidos y estado inicial, como en Scratch.

## ADDED Requirements

### Requirement: Objetos del proyecto 2D

El contexto 2D SHALL admitir un escenario y entre 1 y 8 sprites, cada uno con un ID estable, un nombre visible único y su estado inicial (posición, dirección, tamaño, visibilidad y disfraz). Añadir, renombrar, duplicar o borrar un sprite MUST NOT ejecutar el programa y SHALL conservarse al guardar y reabrir.

#### Scenario: Segundo personaje
- **WHEN** se añade el sprite «Cesta», se le da un script y se guarda el proyecto
- **THEN** al reabrir, «hero» y «Cesta» conservan sus IDs, scripts y estado inicial, y nada se ejecuta

### Requirement: Scripts por objeto

Cada objeto SHALL tener sus propios scripts. Seleccionar un objeto SHALL mostrar solo sus scripts y anunciar cuál se edita, MUST NOT ejecutar el programa y MUST conservar los borradores de los demás. Ejecutar SHALL iniciar los scripts de todos los objetos.

#### Scenario: Dos personajes que interactúan
- **WHEN** «hero» envía el mensaje «hola» al iniciar y «Cesta» responde moviéndose al recibirlo
- **THEN** al ejecutar, «Cesta» se mueve después del mensaje y Detener detiene a ambos

### Requirement: Proyectos anteriores intactos

Un proyecto con `gg.sprites@0.1.0` SHALL abrirse sin cambios. Actualizarlo a 0.2.0 SHALL producir un único sprite `hero` con el mismo estado inicial, los mismos scripts e IDs, y el mismo resultado al ejecutar.

#### Scenario: Actualizar un proyecto de la alpha
- **WHEN** se actualizan los packs de un proyecto de la alpha 0.1.0
- **THEN** el resultado tiene un sprite `hero` equivalente y la ejecución coincide con la anterior

### Requirement: Recursos y texto por objeto

Los menús de disfraces y sonidos SHALL ofrecer solo los recursos del objeto seleccionado. La API v3 SHALL nombrar cada sprite con un identificador válido y estable en JavaScript y Python (`cesta.move(10)`), y la copia textual MUST conservar el ID de cada objeto en sus metadatos.

#### Scenario: Copia de un proyecto con dos sprites
- **WHEN** se crea una copia JavaScript de un proyecto con «hero» y «Cesta» y se ejecuta
- **THEN** cada sprite hace lo mismo que con los bloques y el texto usa `hero.` y `cesta.`
