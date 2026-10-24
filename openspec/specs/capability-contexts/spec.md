# capability-contexts Specification

## Purpose

Ofrecer contextos 3D y de aplicación web registrados de forma independiente del target 2D, con IR1 tipada, una única autoría, operaciones y eventos con autoridad capturada y recursos cualificados. Origen: cambio `phase-6-capability-contexts` (archivado).

## Requirements

### Requirement: Registro de capacidades independiente del target
El sistema SHALL resolver contextos, operaciones, validadores, políticas y contribuciones solo desde registros locales revisados y locks verificados. Un proveedor nuevo SHALL funcionar sin ramas por target en el formato base ni editor central.

#### Scenario: Primer proveedor3D
- **WHEN** se selecciona gg.3d-basic con sus dependencias
- **THEN** esfera/cámara/movimiento funcionan mediante el registro
- **AND** el perfil no necesita un proveedor2D artificial
- **AND** GGPROJ3 y las contribuciones históricas conservan formato/hashes

### Requirement: IR1 tipada y autoría única
Los nuevos contextos SHALL derivar IR1 validada desde BlockGraph con IDs/layout. Código generado SHALL ser readonly; texto libre SHALL ser independiente en documentos existentes. Bloques SHALL ejecutar generación efímera mediante QuickJS, sin eval ni control de flujo de usuario en el host.

#### Scenario: Edición y copia textual
- **WHEN** se edita un bloque, se genera código y se crea una copiaJS/Python
- **THEN** generación/sourceMap reflejan la autoría actual y la copia permanece independiente
- **AND** abrir/reabrir conserva autoría y queda sin ejecutar

### Requirement: Operaciones y eventos con autoridad capturada
El SDK API2 SHALL usar operaciones/eventos instalados con esquemas y cuotas. Sesión/revisión/contexto/principal/target SHALL proceder del host. API1/IR0 SHALL conservar su validación cerrada.

#### Scenario: Token retenido o autoridad falsificada
- **WHEN** llega una llamada/evento de otra sesión, revisión o invocación, o se añade autoridad al DTO
- **THEN** se rechaza sin mutar escena/app
- **AND** Stop cancela callbacks, esperas, candidatos y workers
- **AND** un mutador global no evita el contexto de invocación

### Requirement: Recursos cualificados y compatibilidad
La política2 SHALL conservar bytes/IDs/metadatos al promover recursos1, usar bindings cualificados y mantener GGPROJ3/STORE. Políticas/versiones antiguas SHALL seguir leyendo exactamente sus documentos. Un downgrade con datos no representables SHALL ser rechazado.

#### Scenario: Proyecto mixto guardable
- **WHEN** se añade un modelo/imagen de app a un proyecto2D/dispositivo válido
- **THEN** se preparan todos los participantes y recursos antes del commit
- **AND** fallo/importación inválida conserva autoría, borradores y ejecución previa
- **AND** el adaptador2D recibe su proyección validada sin recursos3D

### Requirement: Autoría Babylon real y acotada
El proveedor3D SHALL usar Babylon local para geometría, cámara, jerarquía, transformaciones locales/mundo, GLB estático, luces y colisiones cinemáticas. GLB SHALL validarse antes del loader y no activar descargas/codecs/extensiones. Preparación fallida SHALL conservar la escena activa.

#### Scenario: Jerarquía y colisión
- **WHEN** un objeto hijo se transforma y se mueve contra un collider válido
- **THEN** snapshots/render reflejan matrices reales y colisión de Babylon
- **AND** guardar/reabrir recupera el estado inicial de autoría
- **AND** no se afirma simulación física distinta de la implementada

### Requirement: Aplicaciones DOM y Python mediante bindings
El proveedor web SHALL renderizar componentes nativos accesibles con atributos/estilos enumerados y textContent. Eventos SHALL ser JSON acotado. Python SHALL operar mediante bindings en worker, sin DOM directo.

#### Scenario: Formulario a lista
- **WHEN** se completa y envía un formulario con teclado
- **THEN** el callback añade texto literal a la lista y conserva etiquetas/foco utilizables
- **AND** submit no navega y texto con markup no ejecuta HTML
- **AND** bloques/JS/Python producen trazas y resultados equivalentes

### Requirement: Nuevos renderers y cohorts compatibles
El sistema SHALL aislar scene3d y webapp de shell/runner/simulador/lenguaje, sin relajar políticas existentes. Cohort2 SHALL preparar seis roles y conservar lector/rollback de cohort1.

#### Scenario: Visita fría ampliada
- **WHEN** se prepara el cohort completo, se cierra Chromium y se apagan los servidores
- **THEN** la segunda visita recupera y ejecuta los contextos preparados sin red/CDN
- **AND** preparación corrupta/tardía no reemplaza el cohort confirmado
- **AND** un rollback anterior no reduce silenciosamente un proyecto nuevo

### Requirement: Exportación autónoma verificable
Los exportadores SHALL incluir autoría inicial/recursos/programa/runtime seleccionado, hashes/avisos y dependencias/limitaciones declaradas. Python SHALL incluir Pyodide/stdlib/worker/bindings reales. El runtime SHALL corresponder al cohort activo.

#### Scenario: Paquete fuera de Studio
- **WHEN** se descomprime fuera del workspace y se inicia el servidor local documentado con Studio detenido y sin internet
- **THEN** escena3D y formulario/lista ejecutan el programa exportado
- **AND** Stop y límites siguen funcionando
- **AND** GGPROJ mantiene el roundtrip de autoría separado del artefacto autónomo
