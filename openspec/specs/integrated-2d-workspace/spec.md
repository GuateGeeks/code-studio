# integrated-2d-workspace Specification

## Purpose
Permitir que un principiante con docente modifique, ejecute y observe una creación 2D, consultando su actividad y herramientas dentro del mismo espacio de trabajo.

## Requirements

### Requirement: Programa y resultado próximos
El editor SHALL presentar programa 2D y escenario contiguos en escritorio, con Ejecutar bloques y Detener accesibles en una barra común y sin desplazamiento de página para el primer resultado.

#### Scenario: Editar y observar en escritorio
- **WHEN** se abre el espacio a 1280×900 o 1440×900 y se modifica un bloque de movimiento
- **THEN** el programa, la acción de ejecutar y el escenario son visibles; ejecutar usa el programa modificado y detener reinicia el resultado conservando la autoría

### Requirement: Herramientas dentro del espacio
El espacio SHALL ofrecer navegación directa a actividad, propiedades, código derivado, recursos, ayuda y diagnósticos en un panel de consulta; consultar o seleccionar herramientas no ejecuta ni reemplaza el programa.

#### Scenario: Actividad y propiedades
- **WHEN** se consulta una actividad, una pista o la lectura de propiedades
- **THEN** la consulta ocupa el panel secundario, el editor y escenario permanecen en el escritorio y los cambios del programa se conservan

### Requirement: Continuidad independiente
El espacio SHALL conservar guardado local confirmado, descarga y reapertura GGPROJ sin ejecución automática, así como copias textuales independientes y el origen de los diagnósticos.

#### Scenario: Copia y reapertura
- **WHEN** se crea una copia textual, se modifica, se ejecuta y se descarga y reabre el proyecto
- **THEN** bloques y documento conservan sus versiones independientes, la reapertura no ejecuta y un diagnóstico vigente puede llevar a la línea correspondiente

### Requirement: Navegación accesible y adaptable
El espacio SHALL conservar navegación con teclado, foco visible y ausencia de desbordamiento horizontal en ancho reducido y zoom real 200/400 %, con acceso a edición, resultado, ejecución y herramientas sin trampas de foco.

#### Scenario: Ventana estrecha
- **WHEN** el ancho disponible no admite editor y resultado contiguos
- **THEN** se presentan en orden de documento, los enlaces revelan y enfocan su destino y todas las acciones siguen disponibles

### Requirement: Aislamiento y contextos conservados
La integración SHALL conservar seis orígenes, guardas de ejecución y los contextos existentes; cambiar contexto o herramienta no inicia ejecución y Detener resultado actúa sobre el resultado activo.

#### Scenario: Otro contexto durante la ejecución
- **WHEN** se cambia desde una ejecución 2D a otro contexto y se usa Detener resultado
- **THEN** se detiene la ejecución vigente sin perder el programa ni iniciar la del contexto seleccionado
