# Spec Delta

## Purpose

Que escribir código en Code Studio se parezca a un editor real, sin perder accesibilidad ni el funcionamiento offline.

## ADDED Requirements

### Requirement: Edición asistida

El editor SHALL mostrar resaltado de sintaxis y números de línea para JavaScript y Python, y SHALL ofrecer autocompletado y firma de las funciones de la API v3 disponibles en el contexto. Un error del traductor o del intérprete SHALL marcarse en su línea con la explicación en español.

#### Scenario: Error marcado en su línea
- **WHEN** una copia tiene `hero.fly(1)` en la línea 3 y se ejecuta
- **THEN** la línea 3 queda marcada con «hero no tiene la acción fly» y el foco puede ir a ella con el teclado

### Requirement: Accesible y offline

El editor MUST conservar la navegación por teclado, la etiqueta visible y el anuncio de errores del `textarea` actual, y SHALL funcionar sin red una vez preparada la cohorte. El tamaño añadido a la cohorte MUST registrarse en el acta.

#### Scenario: Teclado y zoom
- **WHEN** se edita una copia solo con teclado al 200 % de zoom
- **THEN** se puede escribir, autocompletar, saltar a un error y salir del editor con Tab sin quedar atrapado
