# scratch-adapter Specification

## Purpose
Ejecutar programas 2D de Studio mediante el motor reutilizado, conservando su semántica y el vínculo con la autoría.

## Requirements

### Requirement: GG-SCRATCH-001 Ejecución sin editor externo
El adaptador SHALL ejecutar el subconjunto inicial sin cargar otra interfaz de autoría y SHALL conservar un mapa de los bloques ejecutados a sus IDs de origen.

#### Scenario: Movimiento real en el motor
- **WHEN** se ejecuta el programa de tres movimientos de cinco pasos con posición inicial cero
- **THEN** la posición final del sprite es quince
- **AND** el proyecto de autoría conserva sus scripts y la posición inicial
- **AND** una captura serializada puede reabrirse con la posición de ejecución

### Requirement: GG-SCRATCH-002 Stop de programa cooperativo
El adaptador SHALL detener los scripts activos para que pasos posteriores del motor no sigan cambiando la escena.

#### Scenario: Detener repetición continua
- **WHEN** se detiene un programa que mueve un sprite indefinidamente
- **THEN** ejecutar pasos adicionales del motor no cambia su posición

### Requirement: GG-SCRATCH-003 Importación sin extensiones remotas
El adaptador SHALL rechazar proyectos con URLs externas de extensiones antes de entregarlos al cargador del motor.

#### Scenario: Proyecto con extensión externa
- **WHEN** un proyecto declara una URL remota de extensión
- **THEN** la importación falla sin solicitar esa URL ni cargar el motor para ese proyecto

### Requirement: GG-SCRATCH-004 Movimiento renderizado
El runner SHALL dibujar un sprite con recursos locales y reflejar en sus píxeles la posición de la VM, dentro de la vista integrada del anfitrión.

#### Scenario: Movimiento visible en canvas
- **WHEN** el programa visual mueve quince pasos un sprite desde cero
- **THEN** la VM informa x=15 y los píxeles identificables del sprite se desplazan quince píxeles en el escenario de referencia
- **AND** el recurso gráfico no se obtiene de un servicio externo

### Requirement: GG-SCRATCH-005 Eventos y temporización
El runner SHALL entregar teclado y clic del canvas a los dispositivos de entrada de la VM y ejecutar esperas mediante el scheduler real.

#### Scenario: Espera y entrada DOM
- **WHEN** el programa espera antes de mover y luego recibe espacio y un clic sobre el sprite
- **THEN** el movimiento inicial no ocurre antes de la espera y los dos eventos modifican la posición según sus scripts
- **AND** los píxeles reflejan la posición final

### Requirement: GG-SCRATCH-006 Mensajes y clones
El runner SHALL conservar el orden de broadcast-and-wait y ejecutar clones mediante targets reales de la VM.

#### Scenario: Mensaje con espera
- **WHEN** el emisor envía un mensaje con espera y el receptor contiene una espera y un movimiento
- **THEN** el movimiento posterior del emisor ocurre después del receptor

#### Scenario: Clon visible y eliminación
- **WHEN** se crea un clon con movimiento y eliminación diferida
- **THEN** hay dos targets y dos sprites visibles antes de eliminarlo
- **AND** la escena vuelve a un solo sprite al completar el script

### Requirement: GG-SCRATCH-007 Stop durante esperas y clones
Stop SHALL cancelar scripts pendientes y eliminar clones para impedir movimientos tardíos, conservando la autoría al recrear el runner.

#### Scenario: Cancelación en mitad del corpus
- **WHEN** se detiene una ejecución con espera o clon pendiente
- **THEN** no se observan movimientos posteriores ni clones residuales
- **AND** el mismo fixture puede volver a ejecutarse

### Requirement: GG-SCRATCH-008 Estado y ramas reales
El runner SHALL ejecutar variables y condicionales mediante el estado y los bloques nativos de la VM. La lectura en eventos posteriores SHALL reflejar el valor actual; reiniciar desde el fixture SHALL restaurar los valores de autoría.

#### Scenario: Contador y decisiones
- **WHEN** el contador pasa de cero a tres dentro de una repetición con ramas verdadera y falsa y luego recibe un evento de teclado
- **THEN** los movimientos y valores coinciden con esas decisiones y con los píxeles renderizados
- **AND** recargar el fixture conserva los IDs y restaura valor y posición iniciales

### Requirement: GG-SCRATCH-009 Audio local real
El runner SHALL usar Scratch Audio y Web Audio reales para un WAV propio local. SHALL activar el AudioContext mediante un gesto del usuario sin deshabilitar las restricciones de autoplay del navegador.

#### Scenario: Reproducción con espera
- **WHEN** el usuario activa un script que reproduce el WAV y espera antes de mover
- **THEN** el buffer decodificado y el analizador muestran una señal no silenciosa durante la reproducción
- **AND** el movimiento posterior ocurre al terminar el sonido y la señal vuelve a silencio

#### Scenario: Bloque detener sonidos
- **WHEN** un script inicia el sonido sin espera y ejecuta detener sonidos
- **THEN** el sonido deja de producir señal y el script continúa según el programa

### Requirement: GG-SCRATCH-010 Cancelación de audio
Stop SHALL detener sonidos activos y sus continuaciones pendientes. Destruir el runner SHALL retirar su contexto de audio; una sesión nueva SHALL poder volver a reproducir sin perder la fuente del anfitrión.

#### Scenario: Detener durante reproducción
- **WHEN** se solicita Stop mientras un bloque espera el final del sonido
- **THEN** la señal se hace silenciosa y no se ejecuta el movimiento posterior
- **AND** tras recrear el frame una nueva activación vuelve a producir audio y la autoría permanece intacta

### Requirement: GG-SCRATCH-011 Bindings GG sobre el estado único
Los bindings GG SHALL consultar y modificar la misma VM que ejecuta los bloques, mediante DTOs propios de sprite, variable y escena. SHALL ofrecer movimiento, posición, lectura/escritura numérica y emisión de mensajes declarados, rechazando operaciones, destinos y valores inválidos.

#### Scenario: Convivencia entre bloques y llamadas externas
- **WHEN** un programa Blockly termina su movimiento inicial, un binding mueve el sprite y cambia una variable, y emite un mensaje declarado
- **THEN** el receptor Blockly lee el valor nuevo, modifica ese mismo estado y mueve el mismo sprite
- **AND** consulta GG, estado VM, posición visible y píxeles coinciden sin alterar la autoría inicial

### Requirement: GG-SCRATCH-014 Ámbito local y global
El adaptador SHALL almacenar variables globales en Stage y locales en su target, preservando IDs y reglas nativas de clones.

#### Scenario: Estado global compartido y local independiente
- **WHEN** un clon modifica una variable local y una global del fixture
- **THEN** el original conserva su local y observa el cambio de la global compartida
- **AND** una nueva carga restaura los valores de autoría

### Requirement: GG-SCRATCH-015 Scripts concurrentes
El runner SHALL ejecutar dos scripts del mismo evento con el scheduler nativo. Las pruebas SHALL verificar progreso intercalado y orden dentro de cada script sin exigir un orden global entre instrucciones independientes.

#### Scenario: Dos esperas superpuestas
- **WHEN** dos scripts iniciados por el mismo evento incluyen cambios de estado y esperas pendientes
- **THEN** ambos progresan antes de que termine el otro y cada uno conserva su secuencia
- **AND** al completar ambos no quedan threads activos ni se pierde el mapa de origen

### Requirement: GG-SCRATCH-016 Disfraces locales visibles
El adaptador SHALL cambiar entre los dos disfraces locales autorizados mediante bloques nativos y reflejarlo en los píxeles.

#### Scenario: Cambio visible de disfraz
- **WHEN** el script selecciona el disfraz alternativo y después el inicial
- **THEN** el nombre/índice nativo y el color de los píxeles corresponden a cada recurso local
