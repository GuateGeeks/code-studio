# Spec Delta

## Purpose

Acortar el feedback durante el desarrollo mediante selección explicable por impacto y reutilización del build, conservando una puerta completa reproducible antes de cerrar cambios.

## ADDED Requirements

### Requirement: GG-TEST-001 Perfiles de verificación diferenciados
La herramienta SHALL ofrecer quick, affected y full. Quick SHALL ejecutar Node/herramientas y smoke de autoría, persistencia y Stop. Full SHALL ejecutar build, smoke previo y toda la regresión funcional, validación OpenSpec y preservación upstream. Una ejecución parcial SHALL NOT anunciar equivalencia con full.

#### Scenario: Verificación rápida y cierre
- **WHEN** se elige quick durante la edición y full para cerrar el cambio
- **THEN** los planes y reportes distinguen qué comprobaciones se ejecutaron
- **AND** full conserva las expectativas de las pruebas existentes y propaga cualquier fallo

### Requirement: GG-TEST-002 Selección conservadora por impacto
Affected SHALL seleccionar las pruebas relacionadas con los archivos modificados. Cambios de fronteras compartidas, herramientas de selección/build, dependencias, configuración o rutas desconocidas SHALL ampliar a full. Cambios exclusivamente documentales SHALL validar especificaciones sin ejecutar Chromium.

#### Scenario: Persistencia, documentación y alcance desconocido
- **WHEN** la lista de cambios afecta persistencia, solo documentación o una ruta sin regla conocida
- **THEN** el plan selecciona respectivamente sus E2E, validación de especificaciones o cobertura full
- **AND** presenta la regla y el motivo de la selección

### Requirement: GG-TEST-003 Plan previo y entradas explícitas
La herramienta SHALL permitir consultar el plan sin ejecutar build ni pruebas, y aceptar una lista explícita de archivos. SHALL validar argumentos y normalizar rutas sin interpretar los nombres como código de shell. El plan SHALL identificar cuándo la lista es declarada por el usuario y cuándo es detección automática.

#### Scenario: Inspección del alcance
- **WHEN** se usa --files junto con --list o --dry-run
- **THEN** se imprimen perfil, motivos y comandos seleccionados sin ejecutarlos
- **AND** argumentos no admitidos fallan de forma visible

### Requirement: GG-TEST-004 Referencia de contenido independiente de HEAD
La detección automática SHALL comparar contenido con una referencia del último full exitoso e incluir altas, cambios y eliminaciones. SHALL funcionar sin commits. Una referencia ausente, inválida o incompleta SHALL forzar cobertura completa en vez de asumir ausencia de impacto.

#### Scenario: Checkout sin historial y archivo eliminado
- **WHEN** no existe una referencia válida o desaparece un archivo desde la referencia
- **THEN** se exige full en el primer caso y se incluye la ruta eliminada al calcular impacto en el segundo

### Requirement: GG-TEST-005 Referencia y reportes protegidos
La referencia de impacto SHALL actualizarse solo después de que todas las comprobaciones full terminen con éxito. Quick y affected SHALL conservar sus reportes separados y SHALL NOT sobrescribir reportes full ni evidencia histórica F0/F1. Un fallo SHALL conservar la referencia válida anterior.

#### Scenario: Verificación parcial o fallida
- **WHEN** termina quick, affected o un full fallido
- **THEN** la referencia de impacto anterior se conserva y el resultado no se publica como full aprobado

### Requirement: GG-TEST-006 Reutilización verificable del build
El build SHALL reutilizar una etapa únicamente si sus entradas relevantes y dependencias transitivas conservan contenido y sus salidas existen con los hashes esperados. Cambios de archivos estáticos SHALL evitar recompilar bundles sin relación. Los reportes SHALL identificar etapas reutilizadas o ejecutadas y su motivo.

#### Scenario: Sin cambios y edición de HTML
- **WHEN** se repite el build sin cambios y después se modifica solamente HTML
- **THEN** el primero reutiliza las etapas válidas y el segundo actualiza la salida estática sin recompilar VM, audio o editor sin cambios

### Requirement: GG-TEST-007 Invalidación y recuperación de caché
El build SHALL invalidar etapas ante entradas o dependencias cambiadas, salidas ausentes/corruptas o metadatos de caché inválidos. Una etapa fallida SHALL NOT quedar registrada como reutilizable. SHALL existir una opción explícita para reconstruir sin reutilización.

#### Scenario: Bundle corrupto y fallo de compilación
- **WHEN** se altera un bundle generado o falla una etapa
- **THEN** la siguiente ejecución reconstruye la salida inválida y no acepta como éxito una etapa incompleta

### Requirement: GG-TEST-008 Evidencia proporcional y reproducible
La entrega SHALL verificar reglas de impacto, invalidación del build, smoke y una regresión completa final. SHALL registrar comandos, entorno, conteos y tiempos observados sin prometer aceleraciones no medidas. Las mediciones de rendimiento SHALL permanecer separadas de pruebas concurrentes.

#### Scenario: Cierre del cambio de herramientas
- **WHEN** se consolida este flujo
- **THEN** se pueden revisar selección por impacto, ejecución incremental y resultados full en sus artefactos
- **AND** las suites se repiten después de aprobar solo ante cambios nuevos, fallos o inquietudes concretas pendientes
