# Spec Delta

## Purpose

Permitir que una instalación local muestre solo los contextos del piloto, sin perder la autoría de los demás.

## ADDED Requirements

### Requirement: Contextos visibles por despliegue

Una instalación SHALL poder declarar los contextos visibles (por ejemplo, Escena 2D y Texto para 2D). El selector de contexto MUST ofrecer solo esos contextos, y ninguna acción interna SHALL cambiar a un contexto oculto. Sin declaración, los seis contextos siguen disponibles y la configuración publicada conserva su forma.

#### Scenario: Instalación del piloto
- **WHEN** el estudio se sirve con el perfil `2d,text`
- **THEN** «Qué programas» ofrece solo Escena 2D y Texto 2D, y el resto de la experiencia 2D funciona igual

### Requirement: Autoría oculta conservada

Un proyecto con micro:bit, Scratch importado, 3D o web SHALL conservar esos datos al abrirse, guardarse, descargarse y reabrirse en una instalación que los oculta. La interfaz SHALL indicar que esta instalación no los muestra y que se conservan. Abrir el proyecto MUST NOT ejecutarlo.

#### Scenario: Proyecto con micro:bit en el piloto
- **WHEN** se abre en el piloto un proyecto con micro:bit y se descarga
- **THEN** se avisa que micro:bit no se muestra aquí, y el archivo descargado conserva su configuración de micro:bit
