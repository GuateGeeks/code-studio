# Spec Delta

## Purpose

Ofrecer a cada proyecto 2D una biblioteca local de disfraces, fondos y sonidos propios, con procedencia, licencia e integridad declaradas, disponible sin red y copiada al proyecto mediante los contratos de recursos existentes.

## ADDED Requirements

### Requirement: GG-LIB-001 Original reproducible content
La biblioteca MUST contener al menos 20 disfraces, 8 fondos y 10 sonidos que sean obra original del proyecto, generados por una herramienta versionada del repositorio. MUST NOT incluir medios copiados de Scratch, MakeCode, Code.org ni con licencias ajenas.

#### Scenario: Regenerating the library
- **WHEN** se ejecuta la herramienta de generación dos veces con la misma toolchain fijada
- **THEN** produce bytes idénticos y cada SHA-256 coincide con el archivo de bloqueo versionado

### Requirement: GG-LIB-002 Declared license, attribution and hashes
El índice de la biblioteca MUST declarar una licencia SPDX, la atribución y, por entrada, identificador, tipo, nombre visible en español, formato, bytes y SHA-256. Los avisos de terceros y el SBOM de release MUST mencionar la biblioteca y su licencia sin atribuirle licencias ajenas.

#### Scenario: Release materials
- **WHEN** se construyen los materiales de release
- **THEN** `THIRD_PARTY_NOTICES` y el SBOM nombran la biblioteca, su licencia y el hash de su bloqueo

### Requirement: GG-LIB-003 Media contracts apply unchanged
Cada medio de la biblioteca MUST superar los contratos de medios instalados (SVG pasivo, WAV PCM16) y estar ya en forma canónica, de modo que su identificador de recurso en el proyecto sea su SHA-256 declarado. Un índice o medio que no valide MUST rechazarse sin cambiar el proyecto.

#### Scenario: Tampered library entry
- **WHEN** los bytes de una entrada no coinciden con su SHA-256 o no superan el contrato de medios
- **THEN** la acción falla con un mensaje en español y la autoría, los recursos y la ejecución anteriores no cambian

### Requirement: GG-LIB-004 Available without network
El paquete de la biblioteca MUST publicarse en el origen del estudio y formar parte de la cohorte de preparación sin red. Una vez cargado en la página, añadir desde la biblioteca MUST NOT requerir red.

#### Scenario: Offline cohort inventory
- **WHEN** se crea la instantánea de release
- **THEN** el manifiesto del rol del estudio incluye el paquete de la biblioteca con su hash, dentro del paquete offline del estudio

#### Scenario: Add while disconnected
- **WHEN** la biblioteca ya está cargada y se pierde la red
- **THEN** añadir un disfraz, un sonido o un fondo sigue funcionando y el proyecto se guarda y se descarga

### Requirement: GG-LIB-005 Add costumes and sounds to the current sprite
Añadir un disfraz o un sonido MUST copiar el medio al proyecto como recurso del objeto `hero`, con nombre en español, sin ejecutar el programa. El recurso MUST aparecer en los menús de recursos de bloques. Añadir dos veces la misma entrada MUST NOT duplicarla.

#### Scenario: Costume used by a block
- **WHEN** se añade «Gato» desde la biblioteca y un bloque «disfraz» lo selecciona y se ejecuta
- **THEN** el menú ofrece «Gato», el objeto muestra ese disfraz y nada se ejecutó antes de pulsar Ejecutar

#### Scenario: Same entry twice
- **WHEN** se añade una entrada que ya está en el proyecto
- **THEN** no se crea otro recurso y se informa que ya está en el proyecto

### Requirement: GG-LIB-006 Initial stage backdrop
Usar un fondo MUST sustituir el medio del fondo inicial del escenario conservando su identificador, sin ejecutar. MUST existir una acción explícita para volver al fondo inicial del catálogo. Cambiar de fondo durante la ejecución y varios fondos por escenario quedan fuera de este cambio.

#### Scenario: Use and restore a backdrop
- **WHEN** se usa «Playa» como fondo y luego se elige volver al fondo inicial
- **THEN** el escenario muestra la playa al ejecutar y después vuelve a la cuadrícula inicial, y ambos cambios se guardan

### Requirement: GG-LIB-007 Portable persistence
Los recursos añadidos desde la biblioteca MUST guardarse en el proyecto local y en el GGPROJ descargado, y reabrirse idénticos en un perfil nuevo sin acceso a la biblioteca. Los lectores GGPROJ v1–v5 y los recursos existentes MUST NOT cambiar.

#### Scenario: Reopen in a fresh profile
- **WHEN** se descarga el GGPROJ tras añadir recursos de la biblioteca y se abre en otro perfil
- **THEN** los recursos, sus hashes y los bloques que los usan son idénticos y el programa produce el mismo resultado

### Requirement: GG-LIB-008 Accessible library controls
La sección Biblioteca MUST usar controles nativos con nombre accesible que incluya la entrada, operable por teclado con foco visible, utilizable en ancho estrecho sin desbordamiento horizontal, y anunciar el resultado de cada acción en una región de estado.

#### Scenario: Keyboard only on a narrow screen
- **WHEN** a 390 px de ancho se abre la Biblioteca, se elige «Sonidos» con flechas y se añade uno con Enter
- **THEN** el foco permanece visible en el control usado, el estado anuncia el resultado y la página no se desplaza en horizontal
