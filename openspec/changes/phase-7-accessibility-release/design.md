# Diseño F7

## Acceso y foco
El canvas sólo consume teclas del programa, conserva Tab/Escape/atajos de navegador y libera teclas retenidas al perder foco. Controles nativos del runner activan el mismo evento de objeto, con bundle/revisión capturados y revocación en Stop; no amplían la API del proyecto. Los formularios conservan foco lógico y selección al reconstruirse y no borran borradores inválidos. Ayuda en español y enlaces de salto complementan la navegación integrada en Blockly13.4; no se instala otro motor de teclado.

El zoom se prueba con chrome.tabs.setZoom/getZoom mediante una extensión MV3 propia sólo en perfiles Chromium temporales. No se usa CSS zoom, DPR ni emulación de viewport como prueba de zoom real. La extensión no se instala ni ejecuta como parte del producto, sus recursos ejecutables offline o las aplicaciones exportadas; su código de prueba sí puede acompañar el archivo de fuentes.

## Distribución
La licencia propia es AGPL-3.0-only; cada componente conserva sus textos. El inventario distingue dependencias de build y componentes distribuidos. Las dependencias instaladas incluidas por prudencia se identifican como inventario conservador; el cache de webpack no se presenta como lista exacta de runtime. Faltas de fuente, licencia o integridad requerida bloquean el paquete.

La fuente usa una lista cerrada, orden y metadatos de archivo deterministas, incluso sin HEAD del producto. Incluye fuentes y locks relevantes, parches upstream previos y manifiestos/recetas de precompilados. Excluye perfiles, proyectos personales, cachés, credenciales y node_modules indiscriminado. PXT nativo se distribuye como precompilados verificados: no se afirma una reconstrucción C++ desde cero con imágenes no fijadas.

La reproducción compara payloads y cohort con iguales orígenes en dos raíces distintas de fuentes reales; cualquier dependencia instalada compartida se declara explícitamente y se fija por integridad. Se rechazan rutas locales absolutas en el código emitido. Metadatos diagnósticos de tiempo y cache quedan separados de los bytes ejecutables. La fuente correspondiente y notices se hacen accesibles desde el paquete distribuido.

## Evidencia y límites
Las mediciones locales reutilizan la sonda de carga fija de 100 sprites del adaptador y diez ciclos de recursos reales. Se conservan origen/plataforma, bytes y método; heaps por target no equivalen a RAM total y draw throughput no equivale a FPS del compositor. Sin equipo escolar acordado no se aprueba su presupuesto. Sin hardware/docente/lector humano no se certifica su aceptación. No hay telemetría predeterminada ni cuenta necesaria para autoría/offline/recuperación.
