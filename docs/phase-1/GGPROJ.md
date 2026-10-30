# Formato GGPROJ y recuperación local

**Actualización E2, 30/10/2026:** gg.sprites 0.3.0 guarda v6 con un workspace
por objeto y vistas por objeto; los lectores v1–v5 se conservan. Una instalación
antigua sin E2 puede rechazar v6. Las secciones F1 siguientes son históricas;
Objetos 2D al final describe el formato actual. Abrir no promueve el perfil.

## Corte histórico F1: GGPROJ v1

Este corte guarda la autoría del editor: bloques e IDs, fuente micro:bit, nombre/identidad del proyecto, estado inicial, recursos y versiones. Los valores modificados por la ejecución o por GG permanecen en la VM y no sustituyen esa autoría. Abrir o recuperar no ejecuta bloques ni compila la fuente automáticamente.

## Archivo portable

La descarga `.ggproj` es un ZIP estándar del subconjunto STORE, sin compresión. Contiene `manifest.json` y cuatro recursos propios bajo `assets/<id>.svg` o `.wav`. Los IDs del catálogo heredados del motor son MD5; cada contenido se verifica además mediante SHA-256 y longitud. No se confía solo en el nombre del archivo ni en su extensión.

El documento rehidratado tiene estos campos:

| Campo | Contenido |
|---|---|
| `format`, `version` | `ggproj`, `1` |
| `project` | UUID, nombre, revisión entera, creación y actualización ISO UTC |
| `authoring.blockly` | Serialización Blockly, con IDs de bloques/variables y coordenadas de autoría |
| `authoring.deviceSource` | Fuente editable del dispositivo; no JS compilado ni firmware cacheado |
| `scene` | Sprite `hero`, x/y=0, dirección 90, tamaño 100 y disfraz inicial `hero` |
| `resources` | Assets, disfraces, sonidos e integridad; el manifiesto ZIP usa referencias a las entradas binarias |
| `locks` | Blockly 13.4.0, IR 0, adaptador `scratch-2d-v0`, Scratch 12.3.1 y Scratch Audio 2.0.268 |

El catálogo corresponde al build instalado: stage, hero, hero-alt y tone. Importar verifica el catálogo completo, los locks, las referencias, hashes y contenido. La portabilidad de v1 funciona entre páginas/contextos de una versión compatible de Studio. No admite assets ajenos, extensiones remotas, cambios arbitrarios de locks o importación SB3. Las versiones futuras deberán definir compatibilidad/migración explícitas.

| Límite | Valor |
|---|---:|
| Documento JSON, archivo y contenido ZIP total | 2 MiB cada uno |
| Entradas ZIP | 16 como máximo; v1 requiere exactamente las del catálogo y manifiesto |
| Manifiesto ZIP | 512 KiB |
| Cada asset | 256 KiB |
| Workspace y fuente de dispositivo | 64 KiB UTF-8 cada uno |
| Nombre | 1–80 caracteres, sin controles |

El lector rechaza rutas desconocidas/peligrosas, duplicados, cabeceras locales/centrales incoherentes, CRC inválido, tamaños incompatibles, cifrado, symlinks, ZIP64, carpetas, extras, comentarios y DEFLATE. No expande datos comprimidos. Las pruebas usan JSZip como lector/escritor independiente para comprobar interoperabilidad del subformato STORE; JSZip no se incorpora al runtime.

## Apertura atómica

Antes de cambiar la UI se validan archivo y documento y se construye un workspace Blockly separado. El mismo traductor y contrato IR de la ejecución rechazan bloques, referencias o valores no soportados. Un fallo conserva autoría, nombre, fuente, escena, sesión y copias confirmadas. El archivo válido sustituye autoría y descarta el runner anterior; el nuevo queda sin ejecutar.

`Descargar proyecto` produce el archivo desde el editor, incluso si falla el almacenamiento. `Abrir archivo GGPROJ` usa el selector local; no sube autoría al servidor. El servidor continúa entregando solamente archivos estáticos y configuración. La edición visible se bloquea brevemente durante recuperación inicial para evitar sobrescribir una edición mientras llega la copia local.

## Autosave y recuperación

IndexedDB usa `gg-studio-projects`, versión 1, store `snapshots`, claves `current` y `previous`. Cada registro contiene `{serialized,savedAt}`. `serialized` es el documento JSON con assets embebidos, diferente del archivo ZIP portable. Las operaciones van en cola y la rotación actual/anterior ocurre dentro de una sola transacción, después de validar la revisión entrante. La UI anuncia **Guardado en este navegador** únicamente al completar el commit.

El debounce de 400 ms agrupa cambios de bloques, fuente y nombre. Run/Stop, consultas y movimientos GG no producen revisiones de autoría. La garantía de recuperación cubre la última copia confirmada: cerrar abruptamente antes del commit puede perder la edición pendiente. Los intentos de flush al ocultar/cerrar son complementarios y no convierten el cierre asíncrono en una garantía.

Al iniciar se restaura la revisión actual válida, o la anterior con aviso si la actual está dañada. Si ambas fallan, se mantienen los registros y se suspende autosave: el usuario puede abrir un archivo o pulsar **Guardar este proyecto como copia nueva**. No se borra la evidencia dañada automáticamente al cargar el ejemplo.

Un fallo por cuota, denegación o transacción deja intacta la última copia confirmada y muestra que no se guardó. Se puede editar, ejecutar y descargar; una edición o nuevo intento de guardado puede recuperarse del error sin reiniciar la cola. La base pertenece al origen del navegador: cambiar de puerto/perfil/equipo no transporta esas copias; para eso sirve el archivo GGPROJ. No existe todavía catálogo de proyectos, sincronización de cuentas ni fusión entre pestañas.

## Reproducción histórica de F1

Desde Ubuntu/WSL en el producto, después de preparar las dependencias:

```bash
source ../scripts/env.sh
npm run browser:build
npm test > artifacts/f1-integration.tap
npm run test:browser
node tools/f0/verify-baseline.mjs
node tools/f1/evidence.mjs
npm run spec:validate
```

El [informe de resultados](RESULTS.md) identifica la corrida validada, capturas y límites. La evidencia histórica F0 se conserva por separado.


## Dispositivo contextual de F4

GGPROJ3 conserva el contenedor capabilities y fija gg.microbit con deviceId/variant/mode/workspace. El BlockGraph plano propio conserva IDs/conexiones/layout y tiene límite8KiB; el perfil completo sigue limitado a16KiB. deviceSource es un documento TypeScript independiente. Alternar modo no borra ninguno. StaticTS, sourceMap, JSsimulador, HEX/USB, logs y estado mutable no se guardan como autoría. Lectura de v1/v2 permanece exacta, sin promoción automática. La coordinación prepara todos los participantes antes del commit y usa checkpoints opacos para restaurar borradores inválidos. Véase ../phase-4/RESULTS.md.

## Recursos portables de F5

La política instalada gg-resources-v1 (gg.assets0.1.0) habilita resources.version1 en GGPROJ3. No cambia el ZIP STORE ni los locks históricos del contenedor. Un documento v1/v2 o v3 sin esta política sigue usando el catálogo exacto descrito arriba; abrirlo no lo promueve.

Cada asset tipado Image/svg, Image/png, Sound/wav o Source/sb3 se identifica mediante SHA256 y declara encoding base64/data. integrity conserva bytes y sha256. Descriptores costumes/sounds separan id, ownerId, name y assetId; los disfraces incluyen centerX/centerY/bitmapResolution. Los IDs estables, sin puntos ni rutas, son valores de los bloques; un nombre solo cambia la etiqueta. Source/sb3 es un original ZIP inerte, nunca un segundo programa editable o estado del VM.

El ZIP moderno admite manifest más hasta32assets (33entradas), rutas derivadas de SHA64 y formato revisado. Mantiene2MiB para el documento/contenedor; medio128KiB, originalSB3256KiB;32disfraces/16sonidos/4originales. Imagen1024porlado/1MPindividual/4MPtotal; WAV PCM16 mono/estéreo8–48kHz y2s además del límite de bytes. El intake SB3 usa otro parser limitado que admite DEFLATE; esto no habilita DEFLATE en GGPROJ.

La apertura verifica estructura, hashes, formato y referencias; PNG requiere salida zlib/filtros válidos y decode real antes del commit. ResourceStore se prepara antes de Blockly y los participantes. Los IDs raw de dropdown se verifican antes de deserializar para evitar sustitución silenciosa por Blockly. Candidatos y checkpoints son opacos; el rollback restaura recursos, selección y campos abiertos.

La promoción copy-on-write es explícita. No se retira una política perdiendo recursos; reemplazar el proyecto es una transacción distinta. Los logs, candidatos VM, audio activo, cobertura derivada y exportaciones no forman parte de la autoría. La configuración gg.sb3 referencia el SHA del original. Véanse [ADR008](../adr/008-recursos-y-compatibilidad-sb3.md) y [resultados F5](../phase-5/RESULTS.md).

## Compatibilidad y migraciones (pack-versioning-and-migrations, 24/10/2026)

Cambio OpenSpec `pack-versioning-and-migrations`, decidido en [ADR-011](../adr/011-contrato-de-lenguaje-y-vistas-sincronizadas.md).

- **Motores.** `locks` se acepta si coincide con el conjunto vigente o con uno anterior de `engineLockHistory` (`src/contracts/engine-locks.mjs`), sin importar el orden de las claves. Una versión desconocida se rechaza nombrando el motor. Al guardar se escriben los locks vigentes. Cuando se actualice un motor, el conjunto anterior se añade al historial y nunca se retira.
- **Packs.** Un proyecto conserva la versión que declara mientras esté instalada; abrir no migra. «Actualizar packs» aplica de forma explícita la cadena de migraciones registrada hasta la versión más reciente:
  - la migración es atómica, sin ejecución y con resumen;
  - «Revertir» restaura el proyecto anterior completo;
  - una migración puede renombrar campos de configuración y transformar bloques (tipos, campos, entradas y valores) en `authoring.blockly` y en los grafos de los packs, sin cambiar IDs, posiciones ni conexiones (`src/contracts/pack-migrations.mjs`, `src/project-migration.mjs`).
- **Permisos y API de manifiesto.** Los permisos se resuelven por `pack@versión` (`operationPermissionGrantsByVersion`). Los manifiestos se aceptan si su `apiVersion` está en `supportedPackApiVersions`.
- **GGPROJ v4.** Es GGPROJ3 con `runtime.api` (`api1`/`api2`) en los documentos textuales y solo se escribe cuando algún documento declara su API. Los documentos v2/v3 sin API usan la de su contexto: 2D → `api1`, documento de 3D/web → `api2`. La versión del intérprete se acepta si está en `textDocumentCompatibleVersions`. El texto del alumno nunca cambia.
- **Requisitos no instalados.** Un formato más nuevo, un pack o versión ausente, un motor o un intérprete no admitidos se rechazan explicando qué falta y que hace falta una versión más reciente de Code Studio. El proyecto abierto no cambia. Abrir parcialmente un proyecto con un pack desconocido queda diferido.

## Objetos 2D: GGPROJ v6 (scene2d-multi-sprite, 29/10/2026)

- **Forma.** Con `gg.sprites@0.3.0` (escenario y 1–8 sprites en la configuración del pack), la autoría 2D es un workspace Blockly por objeto: `authoring.scene2d = {stage: <workspace>, sprites: {<id>: <workspace>}}`. Sustituye a `authoring.blockly`.
- **Validación.** Las claves son exactamente los IDs de los sprites configurados y se validan antes de usarse. Cada workspace mantiene el límite de 64 KiB.
- **Versiones anteriores.** v1–v5 no cambian. Un archivo v6 en una versión anterior de Code Studio se rechaza explicando que es de una versión más reciente.
- **Actualizar packs.** Lleva el workspace único a `scene2d.sprites.hero` con los mismos IDs, sin ejecutar. Un v3 con 0.3.0 y un solo workspace (forma intermedia de esta etapa) se abre igual y se guarda como v6.
- **Pérdidas.** El contrato exige rechazar la pérdida de scripts al salir de 0.3.0, pero queda la [limitación conocida del helper de downgrade](#precisiones-e2-del-corte-fb4215f) para workspaces no vacíos idénticos en un v6 externo válido. No se presenta ese helper como corregido.

Decisión y razones en `openspec/changes/scene2d-multi-sprite/design.md` (puntos 12–14).


### Precisiones E2 del corte fb4215f

Los locks de motores se conservan; la IR 2D v1 por objeto se deriva del perfil
y no es program-ir1 de capacidades. Consola, estado mutable e historial/cámara
en memoria no son autoría persistida. Trabajo incompleto de objetos puede
guardarse y reabrirse; la validación de bloques ofrecidos recorre los objetos
antes de abrir/guardar/transaccionar y Ejecutar exige completar el programa.

La apertura explícita limpia historial vivo y sesiones incluso con mismo UUID;
una transacción del mismo proyecto los conserva y un commit fallido los restaura.
La actualización legada es explícita y activar score no cambia su versión de
sprites. Revertir compara nombre, configuración y contenido durable completo,
más texto pendiente, antes de preparar y al commit. Renombrar desde el panel
ya invalida la oferta; no era el trigger de pérdida atribuido por la revisión
inicial. El cambio de nombre de proyecto sí lo era y fue reparado.

La conversión prueba herencia global desde escenario/otros objetos durables;
no acepta quitar la única asignación shared del dueño. API1 puede recibir como
no disponible un grupo local de hero que excede 16, entero y sin truncarlo:
un documento sin variables ejecuta y un acceso no disponible falla. Estructura,
tipos e identidades siguen validándose; native Run permanece estricto.
Las revisiones acotadas atienden estos bloqueantes; no sustituyen la puerta
amplia del HEAD ni la aceptación humana.

Deuda menor retenida: el guard del helper de downgrade compara igualdad
canónica y puede aceptar workspaces no vacíos idénticos. Duplicar normalmente
regenera IDs, pero eso no prueba la garantía para documentos válidos fabricados
externamente. No afirmar que esta documentación corrige ese helper.
