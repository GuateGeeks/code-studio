# ADR-006: Preparación offline por cohort y origen

Fecha: 22 de octubre de 2026. Estado: aceptada e implementada; segunda visita fría con HEX y full F3 aprobados.

Un snapshot inmutable incorpora los cuatro roles actuales, orígenes, inventario, código del rewriter y protocolo. El identificador precede al rewrite; los manifiestos verifican bytes finales y el descriptor externo evita ciclos de hashes. Imports relativos mantienen su estructura. Literales y atributos conocidos se versionan; operadores "/" y "/=" no se reemplazan. El origen puro sigue siendo la autoridad de postMessage.

La preparación autentica cada WindowClient/preparador y puerto por origin, source, nonce y operación. La cadena shell→runner→simulador y shell→lenguaje conserva CSP. Cada origen valida su inventario, MIME, tamaño y SHA antes de publicar ready. El marcador incluye la selección completa; un candidato parcial nunca equivale a preparación lista. Un hash conflictivo del mismo cohort se rechaza antes de escribir metadata que afectaría una preparación anterior.

El único commit lógico de selección ocurre en IndexedDB del shell, separado de autosave, mediante generación CAS. Current/previous son conjuntos completos; no se afirma atomicidad distribuida. Error, cancelación, integridad o cuota antes del commit conservan current. Las operaciones no borran caches compartidas por otras pestañas.

El bootstrap almacenado pertenece al cohort y usa scripts versionados. Comprueba todos los roles antes de abrir el proyecto; solo puede volver a una versión anterior completa. Los recursos faltantes no caen a otra versión ni a la raíz. La primera pestaña online legada conserva sus URLs; la navegación posterior usa la selección preparada.

Se retienen las versiones preparadas; este corte no implementa recolección automática que pudiera borrar una dependencia de un proyecto o una pestaña. El almacenamiento puede agotarse y debe reportar ese fallo sin sustituir la preparación vigente.

El núcleo requiere Scratch2D porque el shell crea ese runner al iniciar. JavaScript/Python y PXT se cargan según paquetes declarados; un lock de Pyodide no equivale a wheels descargados. indexURL y packageBaseUrl se fijan al mismo directorio local, sin fallback de instalación a CDN.

La especificación Service Workers exige mismo origen para su ejecución y aplica CSP al script del worker; la implementación conserva un SW por origen. [Especificación W3C](https://www.w3.org/TR/service-workers/). El comportamiento del loader Pyodide se contrastó con la versión instalada314.0.7 y su [implementación oficial](https://github.com/pyodide/pyodide/blob/main/src/js/pyodide.ts).

Pruebas Node cubren integridad, cuotas simuladas, arrays densos, cancelación, CAS y rollback. La prueba Chromium usa perfil persistente, cierra el proceso, detiene los cuatro servidores y abre otro proceso: distingue esa evidencia de una recarga con recursos ya vivos. Los resultados finales se registrarán en el acta F3.
