# F5 · Recursos y proyectos Scratch

Fecha:22 de octubre de2026. Estado: software consolidado; puerta completa aprobada.

OpenSpec phase-5-sb3-resources se definió y validó antes de implementar. Las consultas CodeGraph revisaron proyecto, autoría y VM. [ADR008](../adr/008-recursos-y-compatibilidad-sb3.md) describe decisiones y límites.

El corte incorpora ResourceStore único, recursos SHA256 tipados, biblioteca de medios y original SB3 inerte. La política instalada gg.assets amplía GGPROJ3 sin modificar el formato base ni los locks históricos. Importar no ejecuta. Nombres y centros son metadatos; las selecciones de bloques usan IDs estables por propietario. El broker valida la ResourceView actual. La vista generada continúa readonly y usa las operaciones contextuales existentes.

El worker local valida ZIP STORE/DEFLATE con salida limitada, SVG pasivo, PNG con zlib/scanlines/decode y WAV PCM16. Se puede reemplazar/cancelar su trabajo; el plazo y los límites también se aplican antes de publicar candidatos. Audio necesita gesto. No se amplía CSP ni se modifican motores upstream.

Scratch tiene cobertura exacta por bloque/objeto, incluidos huérfanos y monitores. Se reconstruye una proyección canónica antes de preparar un VM/renderer independiente. Unsupported bloquea la ejecución completa y conserva el original. La copia editable exige traducción total y roundtrip Blockly; la exportación usa autoría inicial, con descarga del original separada.

## Límites

GGPROJ2MiB; originalSB3256KiB; ZIP expandido512KiB/64entradas/project.json128KiB. Hasta32assets/32disfraces/16sonidos/4originales,128KiB por medio. Imagen1024porlado/1MPindividual/4MPagregados. WAV PCM16 mono/estéreo8–48kHz,2s además del límite de bytes. Compatibilidad:8sprites originales,64clones/hilos, listas1024elementos/4096agregados, strings1024 y datos64KiB. Extensiones remotas, cloud, warp, hardware y cámara no habilitados.

## Evidencia focal real

- Modelos/legacy/packs/generación/broker:70/70; editor Blockly real JSDOM:5/5. Se reprodujeron y corrigieron dropdowns de flyout, IDs inexistentes sustituidos por Blockly y recuperación de un campo numérico abierto.
- ZIP/medios:17/17 Node; worker/controlador e inflado real:4/4.
- Corpus de20SB3 propios CC0:17clasificados ejecutables (10editables y7compatibles) y3bloqueados. Fixtures/manifest contienen hashes, procedencia y resultados esperados; no se atribuyen proyectos a terceros.
- IR→Blockly:6/6 con roundtrip productivo y rechazos de semántica no representable. La clasificación de los diez editables también se comprobó contra la conversión real; el caso08, con variable global sin setter representable, se reclasificó compatible VM conservando bytes/SHA. No se inventaron inicializaciones.
- Contrato/adaptador Scratch focal:proyección canónica, slots, cuotas, recursos, exportación y almacenamiento SHA256 con implementaciones nativas reales. Los casos headless no certifican render/audio de navegador.
- Node completo focal:293/293 y herramientas38/38 aprobados. artifacts/f5-node.log y artifacts/f5-tools.log. La primera ejecución quick288/289 señaló una expectativa anterior de nombres cerrados en un harness sin broker; se reprodujo, se usan IDs estructuralmente inválidos para rechazo local y se añadió un caso de permiso/propietario en broker. No se relajaron permisos.
- Desktop Chromium:historia importar→ejecutar x10→Stop→descarga originalSHA→copiaGG→ejecutar x10→PNGrecorte real4x4 a2x2 azul→nombre/centro→WAVrecorte/ganancia→GGPROJ→reabrir sin autorun→ejecutar conservado aprobada en30s. El primer intento detectó clasificación cancelada por Stop; seleccionar el contexto rederiva la cobertura actual.

Chromium focal completo:4/4 en3.4min, desktop23.7s/móvil22.6s,20archivos y copia/ejecución de los diez editables2.4min, audio real suspendido/Stop/gesto7.3s. Capturas desktop/móvil muestran cobertura y biblioteca sin desbordamiento horizontal. El corpus mantiene10editables+7VMcompatibles+3bloqueados. El caso de audio admite la política real running/suspended; una prueba separada suspende un AudioContext real y verifica que Stop revoca el pendiente y el gesto inicia exactamente una vez. Seguridad Chromium:6/6 en38.5s. SVG activo, PNG con filtro inválido, WAV/ZIP truncados y cuotas conservan autoría y sesión GG operativa. Cancelar el worker y cancelar/editar después de su resultado revocan el commit. Dos GGPROJ hostiles con SHA/CRC coherentes (PNG inválido y SourceSB3 truncado referenciado) se rechazan antes de abrir. También se conserva el borrador HTML de nombre. Primera visita de pruebas ajustó supuestos del harness (valor inicial y routing del worker); los casos concretos se reprodujeron antes del grupo. Segunda visita fría ampliada:1/1 en1.1min, Chromium cerrado/reiniciado y cuatro servidores apagados; importa/decodifica SB3conPNG, ejecuta x6, exporta/reabre GGPROJ con recursos idénticos y vuelve a ejecutar. Continúan verificados QuickJS/Pyodide/PXT, update corrupto rechazado y rollback de cohort. artifacts/f5-offline-browser.json y offline-second-visit.json. La puerta full se registrará al completarse. Las afirmaciones de este archivo no sustituyen evidencia física, escolar o humana.

La revisión final corrigió el recorte implícito por endFrame fijo8000: seleccionar WAV usa su cantidad real de frames y anuncia canales/frecuencia/duración. Ganancia sin recorte pasó1/1 en9.5s con18000frames estéreo12000Hz1.5s; las36000muestras PCM, incluida la cola, duplican amplitud sin alterar duración y sobreviven GGPROJ.

El último grupo de seguridad aprobó7/7 en44.5s, incluido Source con MP3 local: importación inerte y descarga byteexacta; guardar/reabrir conserva asset:mp3/unsupported y mantiene Run/copia bloqueados. La validación previa de Source comprueba ZIP/JSON y existencia de sus medios, sin habilitar decoders nuevos. El grupo final de previews aprobó desktop25.1s/móvil23.9s y ganancia completa9.1s; no se repitieron corpus/audio por cambios de valores iniciales de formularios.

Fuentes congeladas para test:full. El resultado de esa puerta se añadirá posteriormente como documentación.

La primera puerta full aprobó295Node/38herramientas/3smoke y39regresiones antes de detenerse en GG-TEXT-007: el detector histórico de tráfico externo clasificaba las nuevas vistas locales blob: como externas. Se reprodujo el caso sin cambios y se corrigió únicamente la prueba: orígenes HTTP/blob exactos de los cuatro servicios instalados, sin aceptar blobs ajenos. El caso focal aprobó1/1 en9.5s. La evidencia fallida y su trace se conservaron en artifacts/cuts/phase-5-sb3-resources/failed-local-blob-classification/. La referencia de impacto no avanzó. No se modificó CSP ni producto para resolver esta expectativa.

El grupo afectado completo de lenguajes aprobó10/10 en1.6min (artifacts/f5-language-regression.json); incluye JavaScript/Python, preflight, diagnóstico por línea, Stop, cancelación y aislamiento. Se congela nuevamente el contenido antes de repetir full.

## Consolidación aprobada

Full estable iniciado2026-10-22T15:26:54.089Z y terminado15:44:32.500Z:1058.411s.295Node/38herramientas/3smoke/100regresiones Chromium/11OpenSpec y preservación de commit/diff/locks en los tres upstreams, sin fallos/flaky/skips. El build reutilizó11/11etapas en801.347ms, sin force. baselineWritten:true.

Se conservan reportes, evidencia focal, capturas, proyectos y hashes en artifacts/cuts/phase-5-sb3-resources/. [Evidencia de consolidación](sb3-resources-evidence.json) y [matriz pública de opcodes](OPCODE-MATRIX.md). Los reportes históricos F0–F4 permanecen separados. La evidencia fallida anterior no se presenta como parte del aprobado.

Después de esta puerta solo se actualizó documentación de cierre y se validaron especificaciones. La siguiente implementación es F6: registro extensible, capacidades3D y aplicaciones web; F7 consolida accesibilidad y release. Hardware, equipos escolares, lectura humana y aula siguen pendientes externos.
