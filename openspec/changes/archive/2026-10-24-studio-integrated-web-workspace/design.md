# Design

## Context

Véase proposal.md. La UI compartida monta 3D integrado y web con la composición anterior. Web ya dispone de componentes declarativos, formulario/lista, bloques, documentos, renderer DOM aislado, validación y exportación. El corte 3D aprobó 400 Node, 63 herramientas y 164 E2E; se conserva su puerta y una instantánea de 575 archivos antes de este cambio. El contexto OpenSpec conserva referencias históricas a extensiones propuestas; prevalecen los cortes verificados y la autorización web actual.

## Goals / Non-Goals

**Goals:** reutilizar el montaje integrado y los nodos existentes para programa, transporte y consultas; mantener un solo editor textual y estados reales. Usar la jerarquía, paleta, controles nativos y proporción de columnas actuales.

**Non-Goals:** cambiar modelos, contratos, adaptadores, componentes admitidos o estilos libres; añadir framework, motores, dependencias, tutoría remota o nuevas actividades. La aceptación docente/física no se infiere de pruebas automáticas.

## Decisions

- Generalizar la composición existente 3D a ambas definiciones con IDs derivados del contexto. Duplicar un editor o controlador introduciría riesgo de divergencia y listeners; reutilizar los nodos conserva referencias y checkpoints.
- Mantener el programa y error en el área principal. Trasladar componentes iniciales y código/exportación al dock, con encabezados enfocables y explicación explícita; los formularios originales conservan validación y foco/caret. El resultado runtime nunca alimenta el formulario inicial.
- Extender transporte, navegación y CSS por contexto. Escritorio desde 1060×700 conserva proporción 1.45:1, workspace mínimo 700px y frame 300px; en estrecho/zoom se usa flujo de documento. El estado/error textual conserva su altura y separación del área desplazable para evitar la colisión ya resuelta en 3D.
- Probar eventos nativos y una edición Blockly real, no resultados simulados. Reutilizar helper de interacción visible para abrir detalles y esperar compositor al cruzar iframes. Actualizar selectores afectados sin forzar clics ni debilitar aserciones.
- Ayuda de acompañamiento: anticipar qué añadirá el formulario, cambiar un valor, enviar, comparar y probar una variante con el docente. Se conserva el catálogo educativo y su contrato.

## Risks / Trade-offs

- [Composición compartida afecta 3D] → comparar sus IDs y sesiones con las suites de ambos contextos y regresión integrada anterior.
- [Consulta desplazable o texto ocultan etiqueta/foco] → verificar geometría, cursor, teclado, zoom y capturas en escritorio y estrecho.
- [Edición inicial se interpreta como resultado vivo] → explicación visible y pruebas que mantienen formulario anterior hasta nueva ejecución.
- [Prueba automática se interpreta como aceptación escolar] → separar evidencia técnica y revisión humana pendiente.

## Migration Plan

Crear especificación y tareas, montar los controles existentes sin migración de datos, verificar quick/affected y revisión visual, congelar archivos y ejecutar full. Conservar snapshot y puerta 3D; el rollback de composición no requiere migrar proyectos. Cerrar documentación y abrir una release local separada de las anteriores. Mantener el cambio sin archivar.
