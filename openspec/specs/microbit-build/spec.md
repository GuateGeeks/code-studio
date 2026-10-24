# microbit-build Specification

## Purpose
Compilar programas de dispositivo mediante un adaptador que declare dependencias, diagnósticos y límites de disponibilidad de firmware.

## Requirements

### Requirement: GG-PXT-001 Compilación separada del editor
El compilador SHALL procesar un programa elemental de LEDs sin iniciar la interfaz MakeCode y SHALL devolver diagnósticos y el artefacto de simulación.

#### Scenario: Mostrar corazón
- **WHEN** se compila un programa que muestra el icono de corazón con paquetes locales fijados
- **THEN** se obtiene código de simulación sin errores ni solicitudes de red

### Requirement: GG-PXT-002 Diagnóstico de fuente inválida
El compilador SHALL devolver diagnósticos asociados a la fuente al recibir una API inexistente.

#### Scenario: Función desconocida
- **WHEN** la fuente invoca una función no definida
- **THEN** la compilación no se declara satisfactoria y el diagnóstico identifica el archivo

### Requirement: GG-PXT-003 Evidencia diferenciada de firmware
Los resultados SHALL distinguir simulación compilada, firmware generado, disponibilidad sin red y ejecución en placa. Ninguna evidencia de simulación SHALL equivaler a validación física.

#### Scenario: Firmware sin prueba física
- **WHEN** se genera un artefacto nativo sin disponer de una prueba sobre la placa declarada
- **THEN** el informe marca pendiente la ejecución física y no cierra esa validación

### Requirement: GG-PXT-004 Compilación en worker del navegador
El adaptador SHALL compilar simulación y HEX de las variantes declaradas en un worker del navegador, usando paquetes estáticos locales y devolviendo diagnósticos vinculados a la fuente.

#### Scenario: Programa válido y API inexistente
- **WHEN** se compila un corazón y después una llamada a una API inexistente
- **THEN** el primero produce JS y HEX V1/V2 con registros válidos y el segundo produce un diagnóstico de main.ts
- **AND** el hilo del anfitrión permanece disponible

### Requirement: GG-PXT-005 Compilación sin conexión tras precarga
El worker SHALL poder repetir la compilación con el contexto del navegador sin red después de cargar su pack estático completo.

#### Scenario: Contexto desconectado
- **WHEN** se precargan compilador, configuración, paquetes y runtimes y después se deshabilita la red
- **THEN** la compilación nativa termina sin solicitudes externas ni fallback de servidor
- **AND** el resultado mantiene pendiente la validación física

### Requirement: GG-PXT-006 Ejecución real en simulador
El adaptador SHALL ejecutar el binary.js producido por el worker en pxsim.Runtime y DalBoard locales, sin reemplazar sus APIs por dobles. El contexto con evaluación dinámica SHALL estar separado del shell, runner 2D y compilador.

#### Scenario: Corazón compilado
- **WHEN** se compila y ejecuta basic.showIcon(IconNames.Heart)
- **THEN** la matriz real y las 25 celdas SVG muestran el patrón de corazón esperado
- **AND** no hay peticiones externas y la validación física sigue pendiente

#### Scenario: Mensaje global no autorizado
- **WHEN** se recibe un mensaje global run con código ajeno al MessagePort autorizado
- **THEN** ese código no se ejecuta ni reemplaza el programa activo

### Requirement: GG-PXT-007 Eventos y ciclo de vida del simulador
El simulador SHALL procesar eventos del botón representado y SHALL detenerse y reiniciarse sin perder la fuente del anfitrión.

#### Scenario: Botón A y nuevo programa
- **WHEN** el programa registra un evento que alterna un LED y se pulsa el botón A del SVG
- **THEN** cambia ese LED en la matriz y la representación visual
- **AND** Stop elimina el contexto anterior y un programa nuevo comienza sin su estado residual
