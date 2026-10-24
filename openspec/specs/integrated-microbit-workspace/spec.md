# integrated-microbit-workspace Specification

## Purpose
Permitir a principiantes con docente editar micro:bit, observar su simulación junto a la escena 2D y consultar firmware dentro de un espacio coherente y accesible.

## Requirements

### Requirement: Composición integrada de micro:bit
El espacio SHALL reunir la autoría seleccionada, los controles de ejecución conjunta, el resultado y la consulta de firmware. En escritorio amplio SHALL presentar autoría y resultado en columnas; en ventanas estrechas SHALL conservarlos en orden de documento sin desbordamiento horizontal global.

#### Scenario: Editar y contrastar en escritorio
- **WHEN** el usuario selecciona micro:bit y ejecuta un programa válido en un escritorio amplio
- **THEN** el editor, la placa simulada y la escena 2D son visibles en sus áreas, con Ejecutar y Detener en la barra común

#### Scenario: Ventana estrecha o zoom
- **WHEN** el usuario reduce la ventana o aumenta el zoom real del navegador
- **THEN** edición, resultado y consulta se apilan y los controles siguen accesibles por teclado y desplazamiento

### Requirement: Una autoría por modo sin conversión implícita
El espacio SHALL mostrar los bloques de firmware o el documento TypeScript independiente como autoría principal según el modo elegido. El cambio de modo MUST conservar ambas versiones y no ejecutar, compilar ni convertir contenido de forma implícita.

#### Scenario: Alternar el documento independiente
- **WHEN** el usuario escribe TypeScript y vuelve a bloques y después a TypeScript
- **THEN** conserva el texto y los bloques previos, con una única instancia editable del documento y sin iniciar simulación

### Requirement: Consulta de firmware separada de ejecución
La consulta SHALL agrupar variante V1/V2/universal, compilación, descarga HEX, transferencia USB y fuente seleccionada de solo lectura. SHALL distinguir simulación, firmware válido y prueba física. Editar la autoría o variante MUST invalidar el artefacto obsoleto conforme al contrato vigente.

#### Scenario: Editar después de compilar
- **WHEN** el usuario compila firmware y luego modifica su fuente o variante
- **THEN** descargar o transferir el artefacto anterior deja de estar disponible hasta una compilación válida actual

#### Scenario: Ayuda sin ejecutar
- **WHEN** el usuario consulta firmware o ayuda contextual
- **THEN** recibe orientación sobre LEDs, botones y puente con la escena sin ejecutar ni modificar el proyecto

### Requirement: Conservación de contratos del proyecto
La composición MUST conservar GGPROJ, recuperación sin autorun, Stop, diagnósticos, separación de orígenes y funcionamiento offline preparado. La navegación SHALL conservar un foco recuperable sin recrear sesiones de ejecución.

#### Scenario: Reabrir un proyecto de dispositivo
- **WHEN** el usuario reabre un GGPROJ con bloques y TypeScript de dispositivo
- **THEN** se restauran ambas autorías sin ejecutar y una acción explícita permite iniciar y detener el resultado conjunto
