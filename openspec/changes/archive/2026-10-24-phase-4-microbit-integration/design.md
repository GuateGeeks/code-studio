# Diseño F4

CodeGraph se consulta antes de modificar fronteras; las consultas y fuentes primarias se conservan en artifacts/f4-*. El plan es referencia del alcance; las APIs se verifican contra los paquetes instalados.

## Autoría y contextos
GGPROJ3 incorpora el pack local gg.microbit con lock/hash y configuración exacta {deviceId,variant,mode,workspace}. Un dispositivo inicial, variantes universal/v1/v2, modo blocks/typescript. El workspace es un BlockGraph plano propio versionado con IDs, tipos, campos, referencias de conexiones y layout: máximo48 bloques,8 hats, profundidad semántica4 y8KiB UTF-8. La configuración agregada conserva16KiB. El grafo dispositivo y el workspace2D son documentos distintos. Cambiar contexto es preferencia de interfaz y no borra, convierte ni ejecuta documentos.

deviceSource conserva sus bytes como documento independiente; modo blocks no lo reemplaza con código generado. El TS, sourceMap, JS del simulador, estado mutable y HEX son derivados efímeros. Cambiar a texto conserva el grafo inactivo y volver a bloques conserva la fuente textual.

El esquema genérico de packs incorpora enums, booleanos, arrays densos y JSON acotado; un registro local selecciona validadores puros revisados. No hay validadores importados desde archivos ni una rama específica microbit dentro del validador central. Un coordinador de autoría materializa el perfil portable combinando ajustes estables con el único workspace mutable del deviceEditor. Capture es lectura; no mantiene otra copia activa del grafo. Editar dispositivo no recarga el workspace2D.

Abrir/recovery/starter/activación preparan todos los candidatos antes del commit síncrono. Checkpoints opacos restauran incluso borradores inválidos, foco y selección. Autosave inválido o cuota conservan actual/anterior. Retirar un pack con autoría no la descarta silenciosamente.

## Subconjunto de firmware
IR de dispositivo propia, versionada y con sourceBlockId original. Subconjunto inicial: inicio, forever cooperativo PXT, botónA/B/A+B, mostrar icono conocido/número/matriz25bits, plot/unplot LED, limpiar pantalla, pausa, repetición finita y condición buttonIsPressed. Pausa0–60000ms, repetición0–1000, coordenadas0–4 y números mostrados±9999; hats duplicados de inicio/forever/mismo botón se rechazan. Números/índices/esperas/repeticiones y nodos están acotados. Se genera Static TypeScript exclusivamente mediante plantillas de ese IR validado, usando basic/input/led reales del target. Una operación de sprites u otro bloque fuera del contexto produce diagnóstico por ID antes de invocar el compilador. Texto libre sigue siendo el documento textual PXT explícito.

El generador devuelve fuente e intervalos de líneas/offsets por ID. La vista es readonly. Los diagnósticos PXT son datos limitados y solo enlazan el grafo de la misma autoría. La consola selecciona por contexto/origen además del ID, evitando colisiones con el workspace2D.

## Identidad y ejecución
El ámbito del dispositivo contiene sessionId/deviceId/deviceRevision/requestId; cambia al editar modo, variante, grafo, fuente o proyecto. Compilación, simulación, diagnósticos y descarga descartan respuestas antiguas. Stop revoca sesión, termina workers/frame y pendientes; no persiste estado de ejecución. Un candidato inválido no detiene ni reemplaza la escena válida.

La acción conjunta valida primero IR2D y firmware; luego inicia ambos dentro de una sesión. El runner muestra sus superficies simultáneas sin exponer DOM entre orígenes. El simulador observa eventos reales del bus de botones y emite DTOs cerrados, con secuencia, token de instancia y revisión capturados. El host solo traduce los botones declarados a mensajes2D conocidos, limitando frecuencia/cantidad; mensajes falsos, tardíos o de un dispositivo no activo no afectan la escena. El bridge es simulado; el firmware autónomo no contiene un GG de navegador inventado ni ofrece control conectado de placa.

## Compilación, descarga y USB
PXT permanece en worker, con paquetes locales y cachés nativas explícitas. Compilar para simulador no sustituye caches de firmware. La matriz distingue TS puro y combinaciones core/radio/microphone con hashes V1/V2 disponibles; un paquete/hash faltante falla visiblemente sin red. Descarga real selecciona mbdal-binary.hex, mbcodal-binary.hex o binary.hex universal, comprueba estructura/checksum y liga el artefacto a autoría/variante/compilerPackHash antes de habilitar la acción.

WebUSB se activa únicamente mediante gesto del usuario, feature detection y selección explícita de una placa compatible. Transporte local revisado DAPjs/WebUSB/DAPLink con versión fijada, VID/PID/familia/firmware reconocidos, límites y desconexión/cancelación visibles. Una página propia de transferencia de nivel superior del origen shell obtiene permiso USB únicamente en su ruta; el shell ordinario, iframes y workers conservan usb=(). La página recibe un artefacto validado por canal autenticado con opener/origen/nonce/scope; el proyecto no puede abrir el selector ni escoger comandos de transporte. No se amplía CSP ni se llama automáticamente al selector. Cancelar no promete restaurar firmware previo ni cortar físicamente una transferencia ya aceptada. Pruebas de transporte con doble no equivalen a una placa flasheada. Descarga de archivo permanece disponible cuando WebUSB no es compatible.

## Verificación
Contratos y corpus grafo→IR→TS, v1/v2 intactos, v3 mixto, configuración/límites/permisos y rollback. Clics/teclado reales desktop/móvil: dispositivo, edición, TS actualizado, simulación de LEDs/botón y escena simultánea, diagnóstico/selección, Stop, descargaHEX, guardar/reabrir sin autorun. Carrera editar/Stop/importación durante compile/sim y mensajes falsos. Segunda visita preparada con servidores apagados cubre el nuevo contexto. Full estable una vez, OpenSpec y preservación/sync. La placa autónoma, lector humano y equipos escolares conservan estado pendiente hasta evidencia externa.
