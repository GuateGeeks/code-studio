# Spec Delta

## Purpose

Conservar el significado de un programa visual y sus referencias de origen al traducirlo a ejecutores diferentes.

## ADDED Requirements

### Requirement: GG-BLOCK-006 Corpus mínimo de cierre
El traductor SHALL representar variables locales/globales, cambio de disfraz entre recursos locales autorizados y varios scripts del mismo evento, preservando IDs, ámbito y mapas de origen en el round-trip. SHALL rechazar ámbitos y disfraces fuera del subconjunto antes de cargar la VM.

#### Scenario: Autoría del corpus mínimo
- **WHEN** se guarda y restaura un workspace con variable local, global y cambio de disfraz
- **THEN** la IR equivalente conserva valores iniciales, ámbitos, recursos e IDs y se traduce a bloques nativos
- **AND** un ámbito o disfraz desconocido falla explícitamente sin reemplazar una escena activa

### Requirement: GG-BLOCK-001 Traducción del subconjunto inicial
El traductor SHALL representar inicio, repetición entera y movimiento mediante una representación intermedia serializable que conserve los IDs de origen.

#### Scenario: Repetición de movimiento
- **WHEN** se traduce un programa de inicio que repite tres veces un movimiento de cinco pasos
- **THEN** la representación contiene esos valores y los IDs de cada bloque
- **AND** guardar y restaurar el programa visual conserva la misma representación

### Requirement: GG-BLOCK-002 Rechazo explícito de instrucciones desconocidas
El traductor SHALL rechazar bloques no soportados con un diagnóstico que identifique el bloque; SHALL NOT omitirlos silenciosamente.

#### Scenario: Bloque sin implementación
- **WHEN** un programa contiene un bloque desconocido
- **THEN** la traducción falla indicando tipo e ID antes de iniciar ejecución

### Requirement: GG-BLOCK-003 Corpus ampliado con trazabilidad
El traductor SHALL representar teclado, clic de sprite, recepción de mensaje, inicio de clon, espera, envío de mensaje con espera, creación y eliminación de clon, conservando IDs de origen y nombres de mensajes estables.

#### Scenario: Round-trip del corpus
- **WHEN** se guardan, restauran y traducen los fixtures de eventos, mensajes y clones
- **THEN** su IR y mapas de origen permanecen equivalentes
- **AND** una espera negativa se rechaza antes de ejecutar

### Requirement: GG-BLOCK-004 Variables, decisiones y audio trazables
El traductor SHALL representar asignación, cambio y lectura de variables numéricas con IDs estables, comparaciones EQ/LT/GT y un if con rama alternativa opcional. SHALL representar reproducción de sonido local con o sin espera y detener sonidos. SHALL rechazar operadores y recursos fuera del subconjunto en lugar de omitirlos.

#### Scenario: Round-trip con expresiones y ramas
- **WHEN** se guarda, restaura y traduce el corpus de variables y audio
- **THEN** la IR, los IDs de variables y los mapas de origen de expresiones y ambas ramas permanecen equivalentes
- **AND** una comparación no soportada o un nombre de sonido ajeno al fixture falla con el ID del bloque

### Requirement: GG-BLOCK-005 Autoría editable y validación de frontera
El anfitrión SHALL ofrecer un workspace Blockly editable y generar la misma IR que los fixtures. El runner SHALL validar estructura, tipos, IDs, referencias, operaciones y límites antes de traducir la IR; SHALL NOT aceptar proyectos Scratch ni URLs de recursos arbitrarios por esa ruta.

#### Scenario: Editar y ejecutar
- **WHEN** se cambia un valor con el editor nativo de un bloque y se ejecuta el workspace
- **THEN** el runner ejecuta el valor editado y devuelve revisión y mapa de origen
- **AND** Stop y una ejecución posterior conservan los bloques editados

#### Scenario: Programa inválido
- **WHEN** la IR contiene una operación desconocida, datos fuera de límites o metadatos de extensión
- **THEN** se rechaza antes de reemplazar la escena existente
- **AND** un bloque sin soporte muestra un diagnóstico de autoría sin perder el workspace
