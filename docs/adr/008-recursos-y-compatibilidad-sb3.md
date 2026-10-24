# ADR008 · Recursos portables y compatibilidad Scratch

Estado: aceptado para el software F5; puerta completa aprobada. Fecha:2026-10-22.
Cambio: phase-5-sb3-resources.

GGPROJ3 conserva el contenedor STORE y los locks locales. El pack instalado gg.assets declara la política gg-resources-v1: blobs tipados con SHA256 y descriptores por propietario. Source/sb3 conserva el ZIP original como dato inerte. Los documentos anteriores conservan catálogo y bytes hasta una promoción explícita.

ResourceStore participa en la transacción de autoría. Recursos y menús se preparan antes de Blockly y de los demás participantes. Los IDs seleccionados se comprueban en la serialización antes de cargar: Blockly puede sustituir un valor de dropdown desconocido. El checkpoint conserva también el campo abierto y su borrador.

La importación se ejecuta en un worker local reemplazable, cancelable y con plazo. ZIP, SVG, PNG y WAV tienen límites estructurales y de salida real. Pako2.1.0 es una dependencia explícita local; PNG valida zlib/scanlines y decodificación antes del commit. No se amplía CSP.

La clasificación cubre todos los bloques, huérfanos y monitores. Unknown bloquea el proyecto completo. El runner vuelve a leer el original y reconstruye una proyección canónica de opcodes/campos/referencias revisados; el listado del shell no concede autoridad. Otro VM/renderer y sus recursos se preparan antes de reemplazar el activo. Stop invalida candidatos y audio pendiente. La ejecución de compatibilidad conserva nombres y objetos importados, sin asignarles el principal hero ni habilitar mutaciones GG.

La conversión completa a IR0 crea una copia explícita del programa2D. Copia descriptores de sprite y fondo, conserva el original y comparte bytes inmutables por hash. El editor inverso comprueba un roundtrip real y rechaza iniciales, ámbitos y layouts que no puede representar. No introduce inicializaciones sintéticas bajo concurrencia.

La exportación SB3 reconstruye el estado inicial validado de GG, sin leer el estado mutable del VM. Sus filenames MD5 son interoperabilidad Scratch; los recursos GG conservan SHA256. La descarga del original es una operación independiente y byteexacta.

Consecuencias: formatos parciales no ejecutan scripts conocidos; medios fuera del subconjunto quedan señalados. No se monta Scratch GUI ni se cambian motores upstream. La compatibilidad textual no se infiere de la clasificación VM. Nuevos formatos o capacidades requieren otra política instalada y evidencia propia.

Referencias primarias: [Pako2.1.0](https://github.com/nodeca/pako/tree/2.1.0), [Compression Streams](https://compression.spec.whatwg.org/), los adaptadores y fuentes Scratch VM/Render/Storage fijados en los repositorios hermanos. Evidencia: [RESULTS F5](../phase-5/RESULTS.md).
