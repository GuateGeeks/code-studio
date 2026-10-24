# Design

## Context

Véanse `proposal.md`, la revisión E4 y `VISUAL-REWORK-BRIEF.md`. El código estable ya separa autoría y ejecución, usa consulta por anclas, traslada editores conservando nodos y mantiene seis roles/orígenes. No requiere sustituir Blockly, Scratch VM, PXT, QuickJS/Pyodide, Babylon ni el renderer DOM. El inventario de specs consolidadas está vacío; las especificaciones previas permanecen en cambios sin archivar.

La apariencia actual es evidencia funcional, no marca oficial aprobada. Este turno entrega preparación y prompt para Claude Opus; las tareas de código siguen pendientes.

## Goals / Non-Goals

**Goals:** expresar `workspace-presentation` en una composición Operate compartida; conservar propietarios de estado y listeners; resolver E4-01…08 con evidencia visual y funcional.

**Non-Goals:** migrar framework, ampliar motores/formatos/permisos, agregar servicio obligatorio, sincronización bidireccional, tutor o editor Scratch nativo. No limpiar upstreams ni corregir drift incidental de Impeccable.

## Decisions

1. **Shell común sobre capacidades existentes.** Regiones de proyecto, autoría, transporte, resultado y consulta. Reutilizar nodos/modelos, un único editor textual y el documento micro:bit trasladable. Se descartan páginas independientes por contexto porque duplican continuidad y verificación.
2. **Diseñar desde 1280×720.** Cabecera compacta, archivos/preparación como accesos secundarios y resultado medido en su canvas, no solo en el iframe. Contenido 4:3 sin deformación y vista ampliada reversible. Se descarta reducir mínimos del editor, recortar o esconder overflow para aprobar capturas.
3. **Consulta como herramienta seleccionada.** La propuesta usa un panel contextual activo con selección y foco consistentes. Navegación no inicia procesos ni reescribe modelos. Se descarta mantener apariencia de pestaña sobre un documento que no representa ese estado. Si se usan tabs, implementar semántica y teclado completos.
4. **Acciones con identidad.** Conservar handlers y guardas, distinguiendo autoría seleccionada y procedencia del resultado. Reducir detenciones equivalentes sin eliminar capacidad ni confundir Stop con borrar autoría o compilar. Mantener y explicar las acciones específicas con distinto efecto.
5. **Traducción solo de presentación.** Etiquetas educativas para contribuciones y propiedades propias; IDs, campos y operaciones públicos estables. Mapear errores conocidos a explicación y siguiente paso, conservando detalle y origen vigentes. No ocultar causas bajo una excepción genérica.
6. **Una fuente de diseño.** Seguir las skills y una dirección educativa familiar tipo Scratch/MakeCode. Registrar decisiones implementadas y tokens en DESIGN y sidecar, y actualizar el brief activo por su CLI. Este brief previo no reemplaza el contrato visual vigente antes de implementar. No duplicar sistemas ni inventar marca oficial.
7. **Educación y Scratch honestos.** Identificar actividades 2D/texto conservando IDs/revisiones. Anteponer estado y acciones del original al detalle de cobertura. Una copia GG no modifica el original; no ampliar el motor de conversión.

### Decisiones de implementación (23 de octubre de 2026)

8. **Dirección confirmada por el usuario.** Se conserva la identidad de `DESIGN.md` (verdes, superficies blancas, foco coral, tipografía del sistema) y se refina; no se aplica la paleta GuateGeeks de Sócrates. Distribución tipo Scratch (programa a la izquierda; transporte, resultado y consulta a la derecha) con piezas de MakeCode: selector Bloques · JavaScript · Python, controles junto al resultado y actividad como tutorial por pasos. Plan y desviaciones en `docs/product/VISUAL-REWORK-EXECUTION-PLAN.md`.
9. **Una detención.** Las seis detenciones contextuales y «Detener resultado» llamaban al mismo `reset`. Queda `#stop-result` («Detener») junto al resultado; se retiran los botones `stop`, `stop-document`, `stop-device`, `stop-sb3`, `scene3d-stop` y `webapp-stop`, y sus pruebas pasan al control único. Las acciones con efecto distinto (compilar, HEX, USB, ejemplo técnico, copia Scratch) se conservan y explican.
10. **Consulta con pestañas reales.** `tablist`/`tab`/`tabpanel` con flechas, Inicio/Fin y selección recordada por contexto sobre paneles que siguen montados (`hidden`, sin recrear nodos). Un evento de presentación `gg-reveal` permite a otros módulos revelar un destino sin conocer la consulta. Archivo y Preparar para clase (offline y capacidades) pasan a menús de la cabecera.
11. **Rótulos de bloques en el editor.** Los manifests de packs incluyen las definiciones de bloques y su SHA-256 forma parte del lock GGPROJ; cambiar `message0` en el contrato rompería proyectos guardados. Los rótulos educativos 3D/web se aplican al bloque ya registrado en la capa del editor (`src/editor/capability-labels.mjs`) con los mismos marcadores, campos y orden.
12. **Extras aprobados dentro del alcance.** Aviso «el resultado muestra la versión anterior» con ejecución explícita en un clic (sin autorun); selector de modo que elige documentos independientes existentes sin convertir; actividad E3 presentada por pasos sin nuevos datos ni catálogos.
13. **Vista ampliada sin remontar.** El transporte y el resultado pasan a posición fija con fondo; el resto queda `inert`; Esc o «Reducir» devuelven el foco al botón. El iframe no se mueve en el DOM.
14. **Ningún cambio de distribución bajo el puntero.** La banda «Empezar o continuar» se cierra al empezar/continuar, cambiar de contexto o ejecutar/detener, no al hacer clic en el editor: un doble clic sobre un campo de bloque desplazaba la estación entre clics y editaba otro bloque.
15. **Consulta alcanzable en 1280×720.** Placa y escena micro:bit comparten la altura de resultado de la estación (antes mínimo 520px, que dejaba la consulta en 0). Si el resultado pertenece a otro contexto, su escena de referencia cede 120px a la consulta. Las validaciones de formulario se desplazan dentro de la consulta, nunca la página. La rejilla reserva a la consulta un mínimo de 140px (`minmax(140px, 1fr)`) y el resultado cede altura hasta 200px cuando una nota o aviso no cabe; con el aviso de cambios sin ejecutar a 1280×720 el lienzo 2D baja a 190px, compromiso aceptado frente a una consulta inaccesible. Los avisos del proyecto restan su altura a la estación (variable `--gg-notices-height`); añadir una capacidad lo anuncia como «Capacidades del proyecto actualizadas. No se ejecutó nada…» en vez de «Proyecto abierto».

## Risks / Trade-offs

- [Mover contenedores recrea un editor o borra caret] → conservar nodos y comprobar identidad, contenido, borradores y foco al alternar modo/contexto.
- [Ocultar paneles rompe diagnóstico o enlace de salto] → revelar contexto/herramienta antes de enfocar; probar teclado y referencias obsoletas.
- [Simplificar elimina capacidades] → inventario de acciones y acceso secundario probado para recursos, firmware/USB/HEX y exportación.
- [Traducir altera serialización] → separar rótulos de IDs/fields y verificar reapertura de proyectos anteriores y equivalencia de ejecución.
- [Medir iframe falsea legibilidad] → medir canvas e imagen, proporción y controles nativos con foco.
- [Captura pierde superficie GPU] → encuadrar iframe, verificar contenido interno y recapturar; no confundir fallo de herramienta con regresión de producto.
- [Pruebas pasan sin comprensión] → observación docente/estudiantes separada, sin prometer mejoras porcentuales sin línea base.

## Migration Plan

Antes del código, conservar snapshot recuperable, gate web y capturas base; no depender de un commit inicial porque el producto todavía no tiene uno. Leer AGENTS y usar CodeGraph cuando corresponda, sin limpiar trabajo previo.

Implementar primero presentación común y después variaciones/estados. Reproducir cada defecto, quick durante edición, affected por impacto y full una vez con archivos estables. Mantener reportes separados. Tras un full aprobado, prosa posterior requiere validación estricta sin repetir suites sin motivo.

No se prevé migración de datos. La reversión restaura solo los archivos de este incremento desde su snapshot; no utiliza reset/clean ni restaura upstreams. No archivar cambios anteriores por efecto lateral.

## Open Questions

Edad, currículo y equipos reales se acordarán para la observación humana; no cambian este contrato. Los activos oficiales de marca no están proporcionados: resolver una dirección coherente documentada sin presentarla como identidad institucional aprobada.
