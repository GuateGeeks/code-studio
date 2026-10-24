# Spec Delta

## Purpose

Garantizar que todo proyecto guardado por un estudiante siga abriéndose y comportándose igual cuando evolucionan los motores, los packs, la API textual o los intérpretes, y que cualquier migración sea explícita, atómica y conserve la identidad de los bloques.

## ADDED Requirements

### Requirement: Proyectos anteriores siempre legibles

El sistema SHALL abrir todo GGPROJ v1, v2 y v3 que fuera válido en la release en que se guardó, con los packs en la versión que declara mientras esa versión siga instalada. Abrir o recuperar MUST NOT ejecutar programas, migrar sin acción explícita ni cambiar IDs de bloques, documentos, recursos o nombres.

#### Scenario: Proyecto con una versión anterior de un pack
- **WHEN** se abre un proyecto con `gg.score@0.1.0` en un catálogo cuya versión más reciente es 0.2.0
- **THEN** el proyecto abre con `gg.score@0.1.0`, sin ejecutar y con los mismos IDs, y se ofrece actualizar

### Requirement: Motores compatibles registrados

Los locks de motores de un proyecto SHALL aceptarse si coinciden con el conjunto vigente o con un conjunto anterior registrado como compatible, sin importar el orden de las claves. Un conjunto desconocido MUST rechazarse indicando qué motor y versión no están admitidos. Al guardar, el proyecto MUST declarar el conjunto vigente.

#### Scenario: Proyecto guardado con un motor anterior registrado
- **WHEN** se abre un proyecto cuyos locks coinciden con un conjunto anterior registrado como compatible
- **THEN** el proyecto abre sin cambios y al guardarse declara los locks vigentes

#### Scenario: Motor desconocido
- **WHEN** se abre un proyecto que declara `blockly` 999.0.0
- **THEN** se rechaza indicando el motor y la versión, y el proyecto abierto no cambia

### Requirement: Permisos y API de manifiesto por versión declarada

Las operaciones concedidas a un pack SHALL derivarse de su identificador y versión declarados mediante datos, nunca de una versión fija en el código. Un manifiesto SHALL aceptarse si su versión de API está en la lista admitida.

#### Scenario: Nueva versión de un pack de capacidad
- **WHEN** el catálogo registra permisos para `gg.3d-basic@0.2.0` y un proyecto la declara
- **THEN** el perfil de operaciones contiene exactamente los permisos registrados para esa versión

### Requirement: Migración explícita, atómica y conservadora

Actualizar un pack SHALL aplicar la cadena de migraciones registradas desde la versión declarada hasta la elegida, transformando configuración y bloques sin cambiar sus IDs. La actualización MUST aplicarse completa o no aplicarse, MUST NOT ejecutar el programa y SHALL mostrar un resumen de lo cambiado. Si no hay cadena registrada o el resultado no valida, el proyecto MUST permanecer intacto y el aviso SHALL indicar pack, versiones y causa.

#### Scenario: Migración que renombra un bloque
- **WHEN** se actualiza un pack cuya migración renombra un tipo de bloque y uno de sus campos
- **THEN** los bloques afectados tienen el tipo y el campo nuevos, conservan su ID, su valor y su posición, y el resto del workspace es idéntico

#### Scenario: Migración imposible
- **WHEN** se pide actualizar a una versión sin cadena de migración registrada
- **THEN** la actualización se rechaza con pack, versiones y causa, y el proyecto sigue igual

### Requirement: Requisitos no instalados explicados

Si un proyecto requiere un formato, un pack, una versión de pack, un motor o un intérprete no instalados, el sistema MUST rechazar la apertura sin modificar el proyecto abierto. SHALL indicar en español qué falta y que se necesita una versión más reciente de Code Studio.

#### Scenario: Proyecto de una release más nueva
- **WHEN** se abre un proyecto que declara `gg.microbit@0.9.0`, que no está instalado
- **THEN** la apertura se rechaza indicando `gg.microbit` 0.9.0 y que hace falta una versión más reciente, y el proyecto vigente no cambia

### Requirement: Documentos textuales con API e intérprete compatibles

Cada documento textual SHALL tener una versión de API: la declarada en GGPROJ v4 o, en documentos anteriores, la que corresponde a su contexto. La versión del intérprete SHALL aceptarse si está en la lista compatible del motor. El texto del alumno MUST NOT modificarse al abrir, migrar o guardar. GGPROJ v4 SHALL escribirse solo cuando el contenido lo requiera.

#### Scenario: Copia anterior sin API declarada
- **WHEN** se abre una copia JavaScript de 2D guardada en GGPROJ v3
- **THEN** se trata como API1, su texto no cambia y el proyecto se guarda de nuevo como v3
