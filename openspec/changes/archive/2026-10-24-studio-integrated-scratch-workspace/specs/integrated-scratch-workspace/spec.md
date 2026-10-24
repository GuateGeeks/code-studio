# Spec Delta

## Purpose

Integrar la revisión del original Scratch importado, su ejecución y la creación explícita de una copia editable en un espacio próximo y accesible para principiantes con docente.

## ADDED Requirements

### Requirement: Composición integrada del original
El contexto Scratch importado SHALL reunir importación y cobertura de solo lectura en el área principal, Ejecutar y Detener en el transporte común y resultado más consulta junto a ella en escritorio amplio. En estrecho SHALL conservar orden de documento, teclado y acceso mediante enlaces sin desbordamiento horizontal global.

#### Scenario: Revisar y ejecutar en escritorio
- **WHEN** el usuario importa un original compatible
- **THEN** ve su cobertura sin ejecución automática y puede ejecutar y detener mediante el transporte común manteniendo próximo el resultado

#### Scenario: Ventana estrecha o zoom real
- **WHEN** el usuario reduce el espacio o aumenta el zoom del navegador
- **THEN** importación, cobertura, controles, resultado y consulta siguen accesibles por teclado y desplazamiento

### Requirement: Original y copia diferenciados
El espacio SHALL distinguir original conservado, original ejecutable y copia GG editable. SHALL permitir descargar el original incluso si su ejecución está bloqueada y ofrecer la copia solo cuando toda la traducción existente lo permita. Crear una copia MUST ser explícito y conservar el original, cambiando al contexto 2D sin ejecutar.

#### Scenario: Original convertible
- **WHEN** el usuario crea una copia de un original completamente convertible
- **THEN** se muestra su programa 2D editable, el original sigue disponible y no comienza ninguna ejecución

#### Scenario: Original ejecutable o bloqueado
- **WHEN** la cobertura solo permite ejecución nativa o la bloquea
- **THEN** se explica ese estado, la copia GG permanece deshabilitada y se conservan el original y sus límites

### Requirement: Revisión y consulta conservan el estado
Consultar recursos, cobertura, identidad del original o última lectura de ejecución MUST conservar el programa, el original y la sesión; consultar no ejecuta ni sustituye la autoría. La lectura del resultado SHALL distinguirse del estado inicial y se actualizará solo mediante la acción correspondiente.

#### Scenario: Navegar mientras se ejecuta
- **WHEN** el usuario consulta las herramientas durante una ejecución Scratch
- **THEN** mantiene sesión y original y puede detener el resultado desde el contexto seleccionado

### Requirement: Importación y recuperación seguras
La integración MUST conservar validación previa, límites, aislamiento, GGPROJ, autosave y offline preparado. Los avisos de importación y su cancelación SHALL estar próximos al archivo. Una importación inválida o cancelada MUST preservar el trabajo anterior; reabrir o recuperar MUST conservar el original sin autorun.

#### Scenario: Fallo de importación
- **WHEN** el usuario selecciona un archivo inválido o cancela su preparación
- **THEN** recibe un aviso accesible y conserva el proyecto y el original anteriores

#### Scenario: Reapertura portable
- **WHEN** el usuario reabre un GGPROJ con un original Scratch
- **THEN** recupera el original y puede revisar su cobertura sin ejecutar de forma implícita
