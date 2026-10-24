# Spec Delta

## Purpose

Garantizar que todo proyecto guardado por un estudiante siga abriéndose y comportándose igual cuando evolucionan los packs, la API textual o los intérpretes.

## ADDED Requirements

### Requirement: Proyectos anteriores siempre legibles

El sistema SHALL abrir todo GGPROJ v1, v2 y v3 que fuera válido en la versión en que se guardó. Abrir, recuperar o migrar MUST NOT ejecutar programas y MUST conservar IDs de bloques, documentos, recursos y nombres.

#### Scenario: Proyecto de la alpha 0.1.0
- **WHEN** se abre un GGPROJ v3 con `gg.sprites@0.1.0` en un catálogo que instala `gg.sprites@0.2.0`
- **THEN** el proyecto abre migrado, sin ejecutar, con los mismos IDs de bloques y el mismo resultado al ejecutar que antes de migrar

#### Scenario: Recuperación local
- **WHEN** el autosave contiene un proyecto guardado con versiones anteriores de packs
- **THEN** la recuperación aplica la misma migración que la apertura de archivo y conserva la copia anterior sin modificar

### Requirement: Versiones declaradas por el proyecto

GGPROJ v4 SHALL declarar la versión de cada pack utilizado y la versión de API de cada documento textual. Los permisos de operaciones MUST derivarse de la versión declarada y de los esquemas instalados, nunca de una versión fija en el código.

#### Scenario: Guardar después de migrar
- **WHEN** se guarda un proyecto abierto desde GGPROJ v3
- **THEN** se escribe GGPROJ v4 con las versiones vigentes de los packs y la API de cada documento, y vuelve a abrirse sin cambios

### Requirement: Migración atómica y explicada

Una migración SHALL ser pura y determinista, y aplicarse completa o no aplicarse. Si falla, el proyecto vigente MUST permanecer intacto y el aviso MUST indicar pack, versión y causa. Cuando la migración cambie datos visibles, el sistema SHALL mostrar un resumen sin ejecutar.

#### Scenario: Migración imposible
- **WHEN** un proyecto declara una configuración que la migración no puede convertir
- **THEN** la apertura se rechaza con pack, versión y causa, y el proyecto que estaba abierto sigue igual

### Requirement: Pack o versión desconocidos

Un pack o una versión no instalados MUST NOT impedir abrir el resto del proyecto. El sistema SHALL conservar sus datos sin modificarlos, bloquear la edición y ejecución del contexto afectado y explicar cómo recuperarlo.

#### Scenario: Proyecto de una versión futura
- **WHEN** se abre un proyecto que declara `gg.microbit@0.9.0` no instalado
- **THEN** 2D y los demás contextos funcionan, micro:bit queda bloqueado con explicación y al guardar se conservan sus datos originales

### Requirement: Documentos textuales con API declarada

Cada documento textual SHALL declarar su versión de API. Los documentos sin declaración MUST asignarse a su API original de forma determinista al abrirse. El intérprete MUST aceptar un rango compatible de versiones en lugar de una igualdad exacta, y cada API publicada SHALL seguir ejecutándose sin que se modifique el texto del alumno.

#### Scenario: Copia API1 tras actualizar el intérprete
- **WHEN** se abre una copia JavaScript guardada con API1 en una versión posterior de QuickJS dentro del rango compatible
- **THEN** la copia abre con su texto intacto y produce el mismo resultado que antes de la actualización
