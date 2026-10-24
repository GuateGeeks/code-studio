# Spec Delta

## Purpose

Mantener una puerta completa fiable y ejecutable en un tiempo razonable mientras el producto crece, sin reducir lo que se verifica.

## ADDED Requirements

### Requirement: Particiones aisladas

La puerta de navegador SHALL poder ejecutarse en varias particiones simultáneas. Cada partición MUST usar sus propios servidores, puertos, artefactos y perfiles de navegador, sin compartir estado con otra partición ni con una vista previa del usuario en ejecución. El conjunto de pruebas ejecutadas por todas las particiones MUST ser idéntico al de la ejecución en serie.

#### Scenario: Puerta completa particionada
- **WHEN** se ejecuta `test:full` con tres particiones
- **THEN** cada prueba de navegador se ejecuta exactamente una vez, ninguna partición usa los puertos de otra ni los de la vista previa abierta, y el reporte final lista las mismas pruebas que la ejecución en serie

### Requirement: Aprobación conjunta

La referencia de impacto SHALL avanzar solo si todas las particiones aprueban y las fuentes no cambiaron durante la corrida. El fallo de una partición MUST hacer fallar la puerta e identificar la partición y la prueba.

#### Scenario: Una partición falla
- **WHEN** una prueba falla en la segunda partición y las demás aprueban
- **THEN** la puerta falla, el reporte nombra la partición y la prueba, y la referencia de impacto no avanza

### Requirement: Selección de impacto por contexto

`test:affected` SHALL clasificar los módulos propios de cada contexto y de los cambios propuestos en grupos específicos con sus pruebas de navegador. Un módulo nuevo sin clasificar MUST seguir ampliándose a la puerta completa, explicando el motivo.

#### Scenario: Cambio limitado a micro:bit
- **WHEN** solo cambia un módulo del contexto micro:bit
- **THEN** se seleccionan las pruebas de micro:bit y las de persistencia afectadas, y no la puerta completa

### Requirement: Proyectos canónicos ejecutables

El repositorio SHALL ofrecer un formato de fixture para proyectos canónicos y un ejecutor que abre el proyecto sin ejecutarlo, ejecuta de forma explícita, comprueba el estado final declarado y detiene. Un proyecto canónico que falla MUST identificar el proyecto y la comprobación.

#### Scenario: Fixture de ejemplo
- **WHEN** se ejecuta el fixture canónico mínimo incluido en este cambio
- **THEN** el ejecutor verifica que no hubo ejecución al abrir, que el estado final coincide y que Detener deja el resultado sin ejecutar

### Requirement: Duración medida

Cada puerta completa SHALL registrar su duración total y la de cada partición. El objetivo es completarla en menos de 30 minutos en la máquina de referencia; si no se alcanza, el acta MUST registrar la medición y la causa.

#### Scenario: Registro de duración
- **WHEN** termina una puerta completa
- **THEN** su resultado incluye la duración total, la de cada partición y el número de pruebas por partición
