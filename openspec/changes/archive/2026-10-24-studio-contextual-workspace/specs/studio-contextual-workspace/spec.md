# Spec Delta

## Purpose

Permitir reconocer y recorrer la edición, el resultado y la ayuda de cada contexto sin perder la autoría ni confundir fuentes independientes.

## ADDED Requirements

### Requirement: Navegación común
Studio SHALL ofrecer acceso por teclado a edición, resultado y ayuda en 2D, texto, micro:bit, Scratch, 3D y web, conservando acciones de ejecución y detención específicas.

#### Scenario: Navegar en pantalla estrecha
- **WHEN** se usa la navegación del espacio con teclado o zoom
- **THEN** el destino recibe foco visible y Detener permanece alcanzable para el contexto seleccionado.

### Requirement: Selección sin pérdida ni ejecución
Cambiar el contexto SHALL conservar borradores, selección documental y autoría sin ejecutar, detener ni reemplazar el resultado automáticamente.

#### Scenario: Volver a un borrador
- **WHEN** se cambia de contexto después de editar un documento sin nombre válido
- **THEN** el borrador sigue disponible al volver y no aparece una ejecución nueva.

### Requirement: Ayuda y herramientas pertinentes
Studio SHALL identificar la tarea del contexto y ofrecer sus herramientas pertinentes, separando estado inicial del proyecto, lectura de ejecución y preparación docente.

#### Scenario: Seleccionar 3D o web
- **WHEN** se selecciona 3D o web
- **THEN** sus objetos y propiedades siguen accesibles, y el inspector y código derivados 2D no se presentan como herramientas de ese contexto.

#### Scenario: Dispositivo o Scratch
- **WHEN** se selecciona micro:bit o Scratch importado
- **THEN** la ayuda explica sus límites y permite llegar a sus controles sin conceder permisos adicionales.

### Requirement: Edición textual explícita
Studio SHALL distinguir código derivado de solo lectura de documentos independientes, mostrar el destino de ejecución y permitir editar el documento seleccionado por 3D o web sin ejecutar otro destino por error.

#### Scenario: Copiar bloques 2D
- **WHEN** se crea una copia JavaScript o Python desde bloques 2D
- **THEN** se abre la edición independiente para 2D, se enfoca la fuente y los bloques permanecen intactos.

#### Scenario: Copiar bloques 3D o web
- **WHEN** se crea una copia desde ese contexto
- **THEN** su documento seleccionado se puede editar junto a sus controles de ejecución y la acción de ejecutar documento 2D no se presenta en ese contexto.

#### Scenario: Volver a una línea de la ejecución contextual
- **WHEN** se abre un diagnóstico de texto de la ejecución 3D o web vigente mientras se edita otro contexto
- **THEN** se revela la línea en el editor del destino que produjo el error, conservando sus controles específicos.

### Requirement: Identidad del resultado
Studio SHALL mostrar a qué contexto pertenece el resultado compartido, separado del contexto que se está editando, y mantener un acceso a detener esa ejecución.

#### Scenario: Editar mientras se observa otro resultado
- **WHEN** se cambia del contexto que produjo el resultado a otro
- **THEN** el rótulo conserva el origen del resultado hasta una ejecución explícita y Detener resultado actúa sobre la ejecución vigente.

### Requirement: Continuidad local
La composición SHALL conservar apertura atómica, guardado confirmado, recuperación sin autorun, documentos independientes y preparación offline con seis orígenes.

#### Scenario: Recuperar proyecto con texto
- **WHEN** se reabre el proyecto guardado en el navegador o archivo
- **THEN** se conserva el texto y se puede seleccionar su contexto sin ejecutar automáticamente.

#### Scenario: Abrir durante una validación del guardado automático
- **WHEN** el guardado y la apertura requieren validar recursos concurrentemente
- **THEN** ambas lecturas se completan sin cancelarse entre sí, y un recurso inválido sigue rechazándose sin impedir validaciones posteriores.
