# Spec Delta

## Purpose

Presentar los seis contextos de Code Studio como una herramienta educativa coherente, permitiendo reconocer la autoría, ejecutar, observar y corregir con ayuda pertinente sin perder continuidad local.

## ADDED Requirements

### Requirement: Área de creación prioritaria

El espacio SHALL presentar programa, transporte y resultado juntos tras entrar al proyecto a 1280×720 y 1440×900, sin desplazamiento global para el primer resultado. La administración SHALL tener acceso secundario. En el caso nominal cerrado, autoría y resultado MUST comenzar a más tardar en y=200, con lienzo 2D de al menos 240px de alto e imagen 4:3 completa, Blockly de al menos 300px y fuente editable de al menos 240px.

#### Scenario: Primer cambio en portátil
- **WHEN** se abre un proyecto listo, sin consultas auxiliares expandidas, a 1280×720 y se selecciona cualquiera de los seis contextos con autoría disponible
- **THEN** se reconocen programa, ejecución y resultado sin desplazamiento de página, cumpliendo las dimensiones mínimas y sin esconder acciones por recorte

#### Scenario: Contenido expandido
- **WHEN** una ayuda, error o contenido largo necesita más espacio
- **THEN** se permite reflujo y desplazamiento accesible sin superponer controles, ocultar foco ni modificar autoría o ejecución

### Requirement: Identidad y alcance de acciones

El espacio SHALL distinguir contexto/documento editado de procedencia del resultado. Ejecutar MUST usar solo la autoría seleccionada. La detención del resultado activo SHALL tener alcance inequívoco; cualquier acción específica con distinto efecto SHALL explicarlo y permanecer disponible. Navegar, consultar o cambiar modo MUST conservar autoría y no ejecutar ni detener automáticamente.

#### Scenario: Resultado de otro contexto
- **WHEN** una aplicación web está activa y se selecciona 2D para editar
- **THEN** se identifica que se edita 2D y que el resultado sigue siendo web; detener el resultado invalida esa ejecución y no ejecuta 2D

### Requirement: Consulta con selección real

La consulta SHALL ofrecer herramientas pertinentes mediante un modelo de selección coherente con el contenido visible y el estado accesible. Cambiar contexto o abrir un diagnóstico MUST revelar una herramienta válida y conservar borradores, posición del cursor y sesión. Un enlace oculto MUST NOT permanecer como única selección.

#### Scenario: Cambio después de consultar componentes
- **WHEN** se abre Componentes web, se cambia a 2D y se vuelve a web
- **THEN** cada contexto muestra una selección visible y su contenido correspondiente, sin ejecutar, perder borradores ni atribuir a 2D las propiedades web

#### Scenario: Diagnóstico desde otro contexto
- **WHEN** se activa un enlace vigente de diagnóstico de un documento contextual
- **THEN** se revela el documento y su destino correcto, con foco en la línea o bloque correspondiente y selección de consulta consistente

### Requirement: Lenguaje educativo con identidad conservada

La presentación de bloques propios, propiedades, cobertura y estados SHALL usar español comprensible en el primer nivel y ofrecer identificadores y detalles originales cuando sean necesarios. Traducir rótulos MUST conservar tipos de bloque, nombres de campo, IDs, operaciones públicas y serialización. El código del alumno MUST permanecer sin traducción automática ni sincronización implícita con bloques.

#### Scenario: Bloque contextual legible
- **WHEN** se edita y reabre un bloque 3D o web con el nuevo rótulo educativo
- **THEN** su acción se comprende por la presentación y se conservan su tipo, campos, identidad y comportamiento anterior

### Requirement: Error accionable y autoría válida conservada

Una validación fallida SHALL presentar junto al campo o formulario afectado un mensaje comprensible, causa conocida y siguiente paso, con aviso accesible y detalle técnico disponible. MUST conservar borrador editable, autoría válida y ejecución anteriores. Los diagnósticos de ejecución SHALL conservar enlaces de origen solo mientras su referencia sea vigente.

#### Scenario: Identificador duplicado
- **WHEN** se aplica un componente web con un identificador ya usado mientras la aplicación está activa
- **THEN** se informa cómo corregir el identificador, permanece editable el borrador y no cambian la autoría válida ni la sesión de la aplicación

### Requirement: Orientación pertinente y original Scratch explícito

La ayuda SHALL distinguir orientación del contexto y actividades 2D/texto disponibles, conservando objetivos, predicción, pistas graduadas y variante de E3. Scratch SHALL mostrar el estado del original y la siguiente acción pertinente cerca de la importación. MUST conservar original descargable, cobertura y copia explícita solo cuando sea convertible, sin prometer edición nativa ni nuevas actividades.

#### Scenario: Actividad desde otro contexto
- **WHEN** se consulta una actividad 2D mientras se edita 3D, web o micro:bit
- **THEN** se identifica su destino antes de cargarla y consultar no reemplaza ni ejecuta el proyecto

#### Scenario: Original no convertible
- **WHEN** se importa un original solo ejecutable o bloqueado
- **THEN** se explica su alcance y la siguiente acción, se conserva su descarga y no se ofrece una copia editable inexistente

### Requirement: Reflujo, foco y sistema visual coherentes

El espacio SHALL conservar acceso directo a programa, resultado, ayuda y detención en 390×844, 448×884 y zoom real 200/400%, sin overflow horizontal global ni trampas de teclado. Foco, contraste, estados y controles SHALL seguir un sistema compartido con recursos locales y movimiento reducido. La apariencia MUST distinguir fuente derivada de solo lectura, documento independiente, estado inicial y lectura de ejecución.

#### Scenario: Consulta en pantalla estrecha
- **WHEN** se abre ayuda o propiedades por teclado y se vuelve al programa con ancho reducido o zoom
- **THEN** el foco y la selección son visibles, la autoría conserva su contenido y posición y el resultado puede detenerse sin depender de un gesto de arrastre

### Requirement: Continuidad de los seis contextos

El rework MUST conservar seis orígenes, guardas de sesión/revisión, motores y versiones, GGPROJ, guardado local confirmado, reapertura sin autorun, modos independientes, exportaciones y offline preparado. La interacción con el resultado MUST NOT convertirse en autoría guardada. Simulación, firmware válido y prueba física SHALL seguir siendo resultados distintos.

#### Scenario: Recuperación y uso offline
- **WHEN** se reabre un proyecto preparado en un Chromium nuevo con los seis servidores apagados
- **THEN** se recuperan las autorías y recursos admitidos sin ejecución automática y se puede ejecutar explícitamente cada contexto preparado según su contrato

#### Scenario: Separación de resultado y estado inicial
- **WHEN** se usa el formulario web, se mueve un objeto en ejecución o se consulta una placa simulada
- **THEN** la interfaz distingue ese resultado del proyecto inicial y no declara guardado un estado runtime ni validación de hardware físico
