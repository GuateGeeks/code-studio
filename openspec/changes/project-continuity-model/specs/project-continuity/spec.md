# Spec Delta

## Purpose

Que el estudiante y el docente sepan siempre dónde está el trabajo y si existe una copia fuera del navegador.

## ADDED Requirements

### Requirement: Estado de continuidad visible

La cabecera SHALL indicar si el proyecto está guardado en este equipo y cuándo se descargó la última copia portable, o que no se ha descargado desde el último cambio. El estado MUST actualizarse al editar, al guardar y al descargar, y MUST NOT ejecutar el programa.

#### Scenario: Cambios después de descargar
- **WHEN** se descarga el proyecto y después se edita un bloque
- **THEN** el indicador pasa a «Sin descargar desde el último cambio» y el guardado local sigue confirmado

### Requirement: Recordatorio sin pérdida

Si el proyecto tiene cambios que nunca se descargaron, salir de la página SHALL mostrar un recordatorio que permite descargar o salir. El guardado local MUST completarse en ambos casos.

#### Scenario: Equipo compartido
- **WHEN** un estudiante cierra la pestaña sin haber descargado nunca su proyecto
- **THEN** ve el recordatorio y, salga o descargue, el autosave conserva la última revisión
