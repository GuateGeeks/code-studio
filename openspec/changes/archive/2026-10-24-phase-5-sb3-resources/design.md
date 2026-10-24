# Diseño F5

## Recursos y compatibilidad legacy
GGPROJ sigue versión3/ZIP STORE. Una política instalada gg-resources-v1, declarada por gg.assets local, permite resources.version:1 con assets tipados Image/svg, Image/png, Sound/wav y Source/sb3, IDs SHA256 y descriptores costumes/sounds con IDs estables/owner/name/assetId/centro/resolución. Las versiones1/2 y v3 sin política conservan catálogo y locks exactos. Promoción explícita copy-on-write; nunca descartar recursos nuevos por downgrade implícito.

Límites iniciales: contenedor2MiB, SB3 original256KiB, expandido512KiB, project.json128KiB,64entradas, recursos individuales128KiB (Source/sb3 hasta256KiB),32assets,32disfraces,16sonidos y4originales. SVG/PNG lado≤1024 y≤1MP por imagen, con4MP agregados antes de decodificar; WAV PCM16 mono/estéreo8–48kHz y≤2s además de la cuota de bytes. PNG inicial bit8/nointerlace con salida zlib exacta por scanlines comprobada antes del decoder. Recursos/targets/bloques y decodificación tienen cuotas adicionales documentadas en código y resultados. El catálogo provisto por un archivo nunca es autoridad: política y validadores vienen del build local.

ResourceStore es el único propietario mutable, participante del coordinador. prepare valida recursos/referencias antes de editores; commit/checkpoint/rollback agrupan todo. ResourceView validada pasa editor→IR/generador→broker/RPC→adaptador. IDs se almacenan como valores; nombres solo etiquetas. No inventar GG.assets.

## Intake y medios
Parser ZIP propio primero inventaría cabeceras/rangos y luego extrae STORE o DEFLATE mediante dependencia explícita fijada con salida incremental limitada, en worker cancelable con timeout. CRC y salida real se verifican antes de JSON. No JSZip.async sin cuotas. Source/sb3 es inerte.

SVG solo nodos/atributos pasivos allowlisted, sin DTD/entidades/script/eventos/CSS/referencias remotas o data anidado. PNG valida estructura/CRC/dimensiones/píxeles y decodifica antes de commit; una normalización produce nuevo hash. WAV PCM16 mono/estéreo, límites de frecuencia/frames; recorte por frames y ganancia acotada. No fallback silencioso de asset inválido.

## Cobertura y ejecución
Cobertura exacta, incluyendo huérfanos/monitores, no por prefijo. Unknown bloquea ejecución completa, conserva original. Config gg.sb3 contiene referencia al original y modo, no segunda copia mutable del programa. Editable solo traducción completa al subconjunto IR0; compatibilidad no promete equivalencia textual.

Adaptador construye proyecto Scratch canónico solo de opcodes/campos/mutations permitidos; no raw loadProject ni trust boolean del shell. Prepara VM/renderer inactivos y recursos antes del commit. Readiness comprueba skins, no color de hero. Scheduler nativo; guards acotan listas1024, strings1024, clones/hilos64,8sprites originales y datos agregados. Warp/cloud/hardware/extensiones bloqueados. Sesión/revisión se autentican y Stop revoca preparación/ejecución.

Exportador parte de autoría inicial validada; intersección explícita, descarga original separada. Veinte fixtures propios con licencia/procedencia/hash/cobertura y comportamiento/roundtrip; negativos adicionales ZIP/SVG/WAV/flood/carreras. Build incremental y pruebas proporcionales, full una vez estable. Mantener evidencia física/escolar fuera de certificaciones software.

## Contribuciones y vocabulario
Los manifiestos/locks gg.sprites históricos no cambian. gg.assets puede añadir bloques propios de selección de recursos y proveedores de menú revisados, con IDs estables y etiquetas editables, sin reescribir definiciones globales por proyecto. Los proveedores se vinculan al workspace antes de deserializar. La IR sigue setCostume/playSound y el vocabulario contextual real ctx.setCostume/ctx.playSound; no se expone un GG.assets ficticio. RPC valida estructura y el broker comprueba ResourceView/política/principal capturados por el host.

La activación de audio sigue requiriendo gesto dentro del origen del runner. El candidato no hace greenFlag durante prepare; cuando falta activación, el control de audio inicia una sola vez y está ligado al mismo scope. Abrir/reabrir no inicia scripts ni audio. Stop revoca también candidatos y gestos pendientes.
