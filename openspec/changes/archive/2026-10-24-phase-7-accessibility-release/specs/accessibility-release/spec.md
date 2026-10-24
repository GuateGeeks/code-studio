## ADDED Requirements

### Requirement: Navegación y activación accesibles
El sistema SHALL permitir salir del canvas con Tab/ShiftTab, conservar Escape y atajos del navegador y liberar teclas retenidas al perder foco. SHALL ofrecer activación semántica de objetos vinculada al bundle y revisión actuales y revocada por Stop, sin ampliar permisos del proyecto.

#### Scenario: Teclado de escenario
- **WHEN** un alumno enfoca el canvas y después navega o activa un objeto mediante un control nativo
- **THEN** Tab no queda atrapado y el evento activa el mismo objetivo que el puntero
- **AND** los controles antiguos no afectan una ejecución nueva

### Requirement: Foco de autoría y Blockly
Los formularios SHALL conservar foco lógico y selección al aplicar valores, preservar borradores inválidos y ofrecer un destino visible al activar contexto. La ayuda SHALL describir la navegación instalada de Blockly. La validación SHALL incluir creación, conexión, edición, borrado y undo reales con teclado.

#### Scenario: Continuar una edición
- **WHEN** se aplica una propiedad con Enter o se corrige un diagnóstico
- **THEN** el foco sigue en un control válido y el borrador no se pierde por un error
- **AND** guardar/reabrir conserva autoría e IDs sin autorun

### Requirement: Zoom real
La interfaz SHALL conservar controles alcanzables y funciones a zoom de navegador 200 y 400 por ciento. Las herramientas exclusivas de prueba SHALL permanecer fuera del runtime ejecutable del producto y su preparación offline; su fuente de prueba puede acompañar las fuentes correspondientes.

#### Scenario: Verificación del navegador
- **WHEN** un perfil Chromium temporal aplica zoom real mediante su API
- **THEN** la prueba confirma el factor aplicado y verifica alcance de controles y ausencia de recortes de página
- **AND** viewport/DPR/CSS zoom no sustituyen esa evidencia

### Requirement: Fuente y procedencia de release
La distribución SHALL incluir licencia del código propio, avisos originales, SBOM de alcance explícito, fuente correspondiente accesible, versiones, integridad y recetas. SHALL conservar parches previos y distinguir fuentes de precompilados PXT. SHALL excluir datos personales, perfiles, cachés y credenciales.

#### Scenario: Paquete verificable
- **WHEN** se genera una release desde la lista de fuentes revisada
- **THEN** fuente, runtime, avisos y manifiestos tienen hashes verificables
- **AND** una licencia, fuente o precompilado requerido ausente o alterado bloquea la generación
- **AND** no se promete reconstrucción nativa desde cero sin receta demostrada

### Requirement: Reproducción y evidencia honesta
La release SHALL comparar bytes de payload y cohort en dos raíces de fuentes con iguales orígenes y toolchain fijado, declarar dependencias compartidas y excluir metadatos diagnósticos no reproducibles de la comparación. SHALL rechazar rutas locales absolutas emitidas.

#### Scenario: Dos construcciones
- **WHEN** se construye desde dos copias reales en directorios distintos
- **THEN** los payloads/cohort coinciden y las fuentes no dependen de rutas locales del autor
- **AND** la receta registra insumos precompilados y límites de la prueba

### Requirement: Preparación escolar y mediciones locales
La documentación SHALL explicar preparación offline, recuperación, compatibilidad, ausencia de cuenta y telemetría predeterminada, y mantenimiento de dependencias. Las mediciones SHALL registrar método y entorno, diez ciclos Run/Stop y carga fija de 100 sprites sin sobrescribir evidencia histórica. Las aceptaciones físicas, humanas y de aula SHALL permanecer pendientes sin evidencia externa real.

#### Scenario: Evaluar los resultados
- **WHEN** se publican resultados locales y la guía del docente
- **THEN** heaps parciales no se presentan como RAM total ni draw throughput como FPS del equipo escolar
- **AND** software implementado y validación externa pendiente se distinguen expresamente
