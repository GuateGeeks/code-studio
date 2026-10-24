# Design

## Context

Ver la motivación en proposal.md y la entrada aprobada en `docs/phase-0/PHASE-1-ENTRY.md`. F0 ya separa autoría en el shell y ejecución en una VM aislada; el editor solo conserva su workspace en memoria. Este corte añade persistencia sin modificar motores upstream ni atribuir estabilidad de producto a todos los spikes.

## Goals / Non-Goals

**Goals:** establecer un documento propio versionado, un contenedor portable acotado y recuperación local con confirmación de commit. Preparar toda importación antes de sustituir autoría o runner. Conservar los escenarios F0 durante la integración.

**Non-Goals:** importar SB3, SVG/WAV arbitrarios o extensiones, soportar ZIP cifrado/comprimido, instalar una PWA offline, fusionar ediciones de varias pestañas o completar consola/editor de recursos. Se admiten exclusivamente los recursos propios del catálogo fijado. Los errores incompatibles se diagnostican; no se inventa una migración de formatos futuros.

## Decisions

### Documento propio y archivo ZIP separados

`src/project-format.mjs` define un documento JSON con formato/versión, metadatos de proyecto, autoría Blockly/fuente de dispositivo, escena inicial, recursos y locks. El JSON es la unidad de autosave; el archivo `.ggproj` empaqueta manifiesto y recursos en ZIP STORE. Así la recuperación no necesita procesar un contenedor binario cada vez que cambia un campo. Un JSON descargado con extensión GGPROJ sería más simple, pero no cumple el contenedor portable del corte y mezcla representación interna con distribución.

Los límites son 2 MiB para documento/archivo y expansión total, 16 entradas de archivo, 64 KiB para workspace y 64 KiB para fuente de dispositivo. El lector verifica estructura ZIP, método, CRC, rutas y duplicados antes de entregar contenido al validador del proyecto. No se añade una dependencia de descompresión ni un servicio de archivos. La compresión queda fuera de v1 para acotar complejidad y expansión.

El catálogo del build contiene los SVG propios stage/hero/hero-alt y el WAV propio tone, con hashes SHA-256 y descriptores fijados. El importador compara catálogo, referencias y locks, no confía en una URL ni convierte metadatos de extensión en autorización de red. Los recursos embebidos permiten reabrir en otra página de la misma versión compatible, sin URLs blob temporales del contexto anterior. Catálogos heterogéneos requerirán una decisión posterior.

### Preparación antes de mutar

El editor prepara la autoría en un workspace separado sin interfaz y usa la misma traducción a IR y validación de F0. Solo un candidato completo y válido puede pasar al reemplazo. Un error conserva workspace, fuente, nombre, sesión y autosave abiertos. Después de aceptar el candidato se descarta la ejecución anterior y se establece autoría/estado inicial sin iniciar scripts ni PXT automáticamente. Validar después de `workspace.clear()` perdería el proyecto ante archivos semánticamente inválidos y se descarta como alternativa.

La autoría se guarda desde el editor y la fuente, nunca desde snapshots del motor. Run/Stop y GG pueden cambiar la VM, pero no revisionan ni serializan ese estado como autoría. El coordinador conserva sesión/revisión y rechazo de comandos antiguos durante importación y recuperación.

### Autosave transaccional con respaldo

`src/autosave-store.mjs` usa IndexedDB `gg-studio-projects`, versión1, store `snapshots` y claves `current`/`previous` con registros `{serialized,savedAt}`. Se valida el documento antes de abrir transacciones de escritura. Una cola serializa operaciones asíncronas; el commit rota la revisión actual válida y escribe la nueva dentro de la misma transacción. Si otra conexión cambió el registro durante validación, se repite la lectura antes de rotar. Esto evita una rotación basada en datos obsoletos, sin prometer fusión de varias pestañas.

Una revisión actual corrupta no se rota encima de un respaldo válido. Cuota, abortos o excepciones de escritura rechazan la operación sin confirmar y conservan la transacción previa. `localStorage` no se usa para blobs de proyecto porque sus escrituras síncronas y sus límites no ofrecen la misma unidad transaccional actual/anterior.

El controlador agrupa cambios con debounce de 400 ms y distingue pendiente de guardado confirmado. Solo `transaction.complete` habilita la confirmación. En arranque valida current y recupera previous si hace falta; avisa si usó respaldo. Si ambas fallan, conserva los registros y suspende nuevas escrituras hasta aceptación explícita o importación válida. Denegación o cuota no impiden editar, ejecutar ni exportar.

Los eventos de cierre pueden intentar vaciar cambios pendientes, pero no garantizan finalizar trabajo asíncrono después de que el navegador termina la página. La garantía de reapertura corresponde a la última revisión con commit confirmado, no a una edición todavía dentro del debounce. La UI hace visible esa diferencia.

### Integración incremental en la UI existente

El shell añade controles de nombre, apertura y descarga y estados accesibles de guardado/recuperación, manteniendo la composición de escritorio y móvil. La inicialización del proyecto tiene una promesa de disponibilidad separada del runner. Los recursos se copian al build estático; no se relaja CSP para importar recursos remotos ni se añade backend para subir autoría.

## Risks / Trade-offs

- Almacenamiento denegado, cuota o cierre inesperado → diagnóstico explícito, exportación disponible y última copia transaccional conservada; no afirmar guardado antes del commit.
- Archivo válido como ZIP pero inválido como proyecto → validación de documento, hashes, locks y Blockly/IR en preparación independiente antes de mutar.
- Recuperación de datos incompatibles con una versión posterior → conservar registros y diagnosticar, sin migración silenciosa ni destrucción del respaldo.
- Dos pestañas editando el mismo proyecto → operaciones locales en cola y relectura al commit; la fusión y coordinación de conflictos de autoría permanecen fuera del corte.
- Catálogo fijo y ZIP sin compresión → menor superficie del importador a cambio de compatibilidad restringida y tamaño mayor; documentar v1 sin prometer importación libre.
- Dependencia de módulos F0 en el shell → mantener las regresiones de aislamiento, audio y compilación; la extracción de todo el editor a paquetes estables sigue siendo trabajo posterior de F1.

## Migration Plan

No existe un formato de usuario previo en el producto: los workspaces de F0 no persistían. Introducir GGPROJ1 y base local versión1 sin modificar los artefactos históricos de F0. Las futuras migraciones requerirán validación explícita y conservación del original. Un rollback de UI no debe borrar automáticamente la base local ni los archivos exportados.

La aceptación se registra con pruebas Node del formato/errores, Chromium para descarga/apertura/recarga real, corrupción y cuota, y la regresión F0. La evidencia final indicará conteos y límites; no se infiere disponibilidad de segunda visita offline ni ejecución física de firmware.

## Validation Results

El 22 de octubre de 2026 se aprueban 44/44 Node y 33/33 E2E Chromium, con cero fallos, omisiones, casos flaky o reintentos. Ocho E2E nuevos verifican descarga ZIP real y reapertura en contexto limpio/móvil, autosave y respaldo, once entradas inválidas rechazadas sin mutación, cuota/denegación con transacciones intactas, audio/worker/Stop y carreras durante recuperación. El archivo descargado tiene 61 908 bytes, con manifiesto y cuatro recursos; conserva autoría y ejecuta x=18 sobre estado inicial0, sin persistir la posición28 del runtime anterior.

Se corrigió la espera rAF de texturas fuera de pantalla y se mantuvo una comprobación real de píxeles. La ubicación del control del corpus se ajustó para evitar un hit-test del iframe tras scroll; las pruebas previas siguen usando clics reales y no se modificaron sus expectativas. Flush espera el arranque antes de encolar y las promesas de sesiones sustituidas se cancelan para no colgar reapertura/Stop.

`docs/phase-1/browser-evidence.json` conserva muestras, hashes, catálogo y preservación de los tres upstreams. CodeGraph está sincronizado y OpenSpec pasa validación estricta de ambos cambios. La evidencia F0 permanece histórica. Este corte de persistencia está completo; no se declara terminada toda F1 ni se amplían las aprobaciones de hardware, offline o rendimiento escolar.
