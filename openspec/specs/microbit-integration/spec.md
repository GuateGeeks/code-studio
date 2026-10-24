# microbit-integration Specification

## Purpose

Permitir autoría portable de micro:bit independiente de la escena 2D, con IR de firmware validada, diagnósticos de fuente, coordinación atómica y operaciones de dispositivo acotadas a su sesión. Origen: cambio `phase-4-microbit-integration` (archivado).

## Requirements

### Requirement: GG-DEVICE-001 Independent portable device authoring
Studio MUST conservar un objeto microbit con workspace contextual acotado y locks locales en GGPROJ3, preservando deviceSource independiente y lectura GGPROJ1/2 sin promoción automática. MUST excluir TS generado, HEX y estado mutable de autoría.
#### Scenario: Switch contexts and reopen
- **WHEN** se edita firmware por bloques, se alterna con texto y se guarda/reabre
- **THEN** ambos documentos conservan IDs/contenido, el TS se vuelve a derivar y nada se ejecuta automáticamente

### Requirement: GG-DEVICE-002 Validated firmware IR and source diagnostics
Studio MUST generar Static TypeScript readonly desde IR de firmware validada con IDs de origen. MUST rechazar operaciones2D/desconocidas antes de compilar y seleccionar el bloque del contexto correcto mediante diagnósticos acotados.
#### Scenario: Sprite in firmware
- **WHEN** un workspace de dispositivo incluye mover sprite
- **THEN** reporta el ID y conserva autoría/ejecución activa sin invocar PXT

### Requirement: GG-DEVICE-003 Atomic authoring coordination
Studio MUST preparar todos los participantes antes de sustituir un proyecto y restaurar borradores completos ante fallo de commit. Editar dispositivo MUST NOT recargar la autoría2D ni guardar un derivado viejo como sustituto.
#### Scenario: Participant rejects commit
- **WHEN** falla un participante tras preparar un proyecto
- **THEN** restaura identidad y borradores anteriores, incluso temporalmente inválidos, y conserva las copias durables

### Requirement: GG-DEVICE-004 Scoped device operations
Studio MUST ligar compilación/simulación/diagnósticos/HEX a sesión, dispositivo, revisión y petición. Edición, sustitución y Stop MUST revocar resultados antiguos.
#### Scenario: Edit while compiling
- **WHEN** llega una compilación correspondiente a una fuente anterior
- **THEN** no cambia vista, diagnóstico, simulación ni artefacto descargable actuales

### Requirement: GG-DEVICE-005 Simulated scene interaction
Studio MUST demostrar LEDs y botones reales del simulador junto con escena2D, mediante eventos cerrados autenticados y limitados. MUST rechazar source/origin/sesión/revisión/secuencia/token inválidos y MUST distinguir el bridge simulado del firmware autónomo.
#### Scenario: Button moves scene
- **WHEN** se pulsa el botónA del dispositivo activo en la sesión conjunta
- **THEN** el programa PXT recibe su evento y la escena recibe exactamente el mensaje declarado, mientras un evento de una instancia anterior no tiene efecto

### Requirement: GG-DEVICE-006 Explicit firmware and compatible USB
Studio MUST ofrecer descargas HEX V1/V2/universal verificadas y ligadas a autoría actual. WebUSB MUST requerir gesto y placa compatible; MUST mantener USB inaccesible a los orígenes de ejecución y conservar descarga cuando no sea compatible.
#### Scenario: Unavailable USB or local native cache
- **WHEN** el navegador no ofrece WebUSB o falta un cache nativo
- **THEN** informa el estado sin selector automático, red remota ni declaración de flasheo exitoso

### Requirement: GG-DEVICE-007 Honest offline and physical evidence
Studio MUST demostrar el contexto de dispositivo con paquetes locales preparados tras reiniciar navegador y apagar servidores. MUST registrar prueba física autónoma separadamente, sin inferirla de simulador, HEX o transporte doble.
#### Scenario: Prepared device without servers
- **WHEN** se recupera el proyecto en la segunda visita fría
- **THEN** permite editar/generar/simular/descargar los paquetes preparados y conserva explícitamente la validación física pendiente cuando no existe evidencia de placa
