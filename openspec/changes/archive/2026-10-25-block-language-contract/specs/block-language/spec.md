# Spec Delta

## Purpose

Que cada bloque tenga una forma textual única, legible y ejecutable en cada lenguaje de su contexto, declarada por su pack como datos, para que leer código enseñe un lenguaje real y para que bloques y texto puedan convertirse entre sí.

## ADDED Requirements

### Requirement: Una entrada declarativa por bloque

Cada bloque contribuido por un pack SHALL declararse en una única entrada de datos que defina su presentación en bloques, sus argumentos tipados, su espacio de nombres, su forma en cada lenguaje admitido por su contexto y su bajada a ejecución. Un pack MUST NOT aportar código ejecutable, plantillas evaluadas como código ni recursos remotos.

#### Scenario: Pack que declara un bloque nuevo
- **WHEN** un pack revisado añade una entrada con bloque, forma JavaScript, forma Python y bajada para su contexto
- **THEN** el bloque aparece en la caja de herramientas, se lee en ambos lenguajes y se ejecuta, sin modificar generadores ni adaptadores del núcleo

### Requirement: Reglas bloqueables verificadas al instalar

El catálogo SHALL rechazar una entrada que no cumpla las reglas bloqueables: forma canónica única por bloque, sin sobrecargas ni argumentos de tipo objeto de opciones, valores cerrados para campos de menú, nombres que sean identificadores válidos en cada lenguaje, espacios de nombres sin colisión entre packs y sin palabras reservadas. Un pack SHALL aportar solo llamadas, valores, eventos con callback y enumeraciones; las estructuras de control MUST pertenecer al núcleo.

#### Scenario: Colisión de espacios de nombres
- **WHEN** dos packs instalados declaran el mismo espacio de nombres o la misma función
- **THEN** el catálogo rechaza el segundo con el nombre del pack y la entrada en conflicto, y el proyecto abierto no cambia

#### Scenario: Dos formas para el mismo bloque
- **WHEN** una entrada declara dos formas textuales alternativas para un mismo bloque
- **THEN** el catálogo la rechaza indicando que cada bloque requiere una forma canónica

### Requirement: Código derivado legible

La lectura derivada de bloques SHALL usar la API textual vigente, con espacios de nombres significativos (por ejemplo, `hero.move(10)`, `basic.showNumber(3)`). MUST NOT mostrar el puente interno (`GG.`), parámetros de contexto de invocación, referencias de variables como identificadores opacos ni nombres auxiliares generados. Cada evento SHALL aparecer junto a su cuerpo, y cada línea MUST conservar su vínculo con el bloque de origen.

#### Scenario: Lectura de un programa 2D
- **WHEN** se lee en JavaScript y en Python un programa con un evento al iniciar, una repetición, un movimiento, una variable y una condición
- **THEN** el texto no contiene `GG.`, `ctx`, `GG.ref` ni identificadores `gg_`, y «Ver bloque» desde cada línea selecciona el bloque correcto

### Requirement: Nombres de variables válidos en todos los lenguajes

Las variables nuevas SHALL tener nombres que sean identificadores válidos en JavaScript y Python, distintos de las palabras reservadas y de los espacios de nombres instalados. Las variables existentes con nombres no válidos MUST conservarse y presentarse con un nombre derivado determinista, sin perder su identidad.

#### Scenario: Variable con espacios en un proyecto anterior
- **WHEN** se abre un proyecto con la variable «Mi puntuación»
- **THEN** la variable conserva su ID y su valor, la lectura usa un identificador válido y estable, y el bloque sigue mostrando su nombre original

### Requirement: Misma ejecución desde bloques y desde la lectura derivada

Ejecutar los bloques y ejecutar una copia creada desde su lectura derivada SHALL producir el mismo resultado observable para el corpus de equivalencia. Cuando la semántica de un bloque difiera de la del lenguaje (división, coerción texto/número, concurrencia), la diferencia MUST estar documentada y cubierta por el corpus.

#### Scenario: Corpus de equivalencia
- **WHEN** se ejecuta cada programa del corpus como bloques, como copia JavaScript y como copia Python
- **THEN** los estados finales, las trazas y los errores coinciden según las reglas declaradas

### Requirement: Compatibilidad de copias anteriores

Las copias guardadas con API1 o API2 SHALL seguir ejecutándose con su texto intacto. Una copia nueva SHALL usar la API vigente y declararla. Los proyectos guardados con manifiestos `apiVersion: 1` MUST abrirse migrados con los mismos IDs de bloques y el mismo comportamiento.

#### Scenario: Copia API1 abierta después del cambio
- **WHEN** se abre y ejecuta una copia JavaScript creada antes del cambio
- **THEN** su texto no cambia y su resultado coincide con el registrado antes del cambio

### Requirement: Disponibilidad de lenguajes por contexto

Cada contexto SHALL ofrecer solo los lenguajes que todos sus packs activos declaran. Si un pack activo no declara un lenguaje, ese lenguaje MUST mostrarse no disponible con el nombre del pack y la causa, sin fallar en silencio.

#### Scenario: Pack sin formas textuales
- **WHEN** un proyecto usa un pack cuyas acciones o eventos del contexto no declaran forma JavaScript ni Python (cada bloque declara ambas o ninguna)
- **THEN** la lectura y la copia JavaScript y Python del contexto se muestran no disponibles indicando el pack y la causa, y la vista de IR educativa y los bloques siguen funcionando

#### Scenario: Estructuras del núcleo y otras bajadas
- **WHEN** el contexto usa asignaciones, lecturas, estructuras de control o eventos de capacidad del núcleo, o un pack activo cuyos bloques bajan a otro contexto (micro:bit)
- **THEN** esos bloques no vuelven un lenguaje no disponible
