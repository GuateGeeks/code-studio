# Preparación F2 — sin implementación declarada

**22 de octubre de 2026.** La autorización de continuidad abarca los pendientes del plan. Primero se consolida F1 (inspector, toolbox y extracción); este documento recoge decisiones preparatorias, no evidencia de lenguajes ejecutándose.

## Dependencias verificadas

- QuickJS: quickjs-emscripten-core y @jitl/quickjs-wasmfile-release-sync 0.32.0. No depender del QuickJS transitivo de PXT. El [proyecto oficial](https://github.com/justjake/quickjs-emscripten) documenta runtimes/contextos, handles que deben liberarse, límites de memoria/pila, interrupt handler y bombeo explícito de promesas.
- Pyodide: 314.0.7, contrastado con npm y [release oficial](https://github.com/pyodide/pyodide/releases/tag/314.0.7). Su [worker actual es de tipo module](https://pyodide.org/en/stable/usage/webworker.html). El pack local debe incluir loader, módulo ASM, WASM, stdlib y lock; no usar carga automática de imports ni CDN durante ejecución.
- [API Pyodide](https://pyodide.org/en/stable/usage/api/js-api.html): loadPyodide/runPythonAsync, filename y streams, jsglobals limitado. Reducir globals no sustituye separación de origen.

## Fronteras previstas

Origen textual separado con iframe anfitrión y workers efímeros por Run. La excepción WASM específica se limita a esa superficie; shell y runner 2D conservan CSP. La inspección del tarball oficial encontró 0 sitios new Function/eval en el loader browser QuickJS, pero 6 sitios dinámicos JS en pyodide.asm.mjs 314.0.7, incluidos el enlace EM_JS y emscripten_run_script. Antes de implementar Python se debe verificar su arranque bajo CSP real y decidir explícitamente la excepción requerida únicamente en el origen textual o una distribución oficial compatible. No prometer wasm-unsafe-eval suficiente sin esa prueba. Stop invalida sesión antes de terminar worker/frame y rechaza solicitudes pendientes. No introducir SAB/COOP/COEP inicialmente; la terminación forzada permite recuperar bucles infinitos.

RPC propio enumerado/acotado por sesión/revisión, sin VM/DOM/credenciales del shell. QuickJS requiere resolver promesas y ejecutar jobs explícitamente; Python usa operaciones async de igual semántica. Recursos y paquetes locales versionados con hashes; runtime ausente falla visible antes de ejecutar.

## Trabajo contractual antes de código

GG actual ofrece operaciones de original hero y sus variables locales, sin wait, suscripciones, contexto de clon, globales Stage, disfraces, sonido ni broadcast-and-wait. events.emit confirma hats iniciados, no finalización. La equivalencia completa del corpus necesita nuevas capacidades explícitas con contexto de target y cancelación; no basta copiar el listado educativo F1.

GGPROJ v1 admite únicamente blockly/deviceSource. Los documentos JS/Python independientes requieren versión/migración atómica, manteniendo lectura v1 y autoría original. La copia textual será acción explícita; editar texto no sincroniza bloques. Un solo backend activo por ejecución.

## Puertas F2

Primero infraestructura de workers y documentos persistentes, luego capacidades/corpus completo. Probar secuencia/repetición/condición/variables/movimiento y ampliar a eventos, concurrencia, mensajes con espera, clones/ámbitos, disfraces y sonido. Comparar estados/trazas/orden parcial entre bloques, JS y Python; además error por línea, runtime ausente, Stop en espera/bucle y reapertura de ambos documentos. No declarar aceptada toda F2 con el subconjunto inicial.

## Hallazgo ejecutado: preflight JavaScript de módulos

En QuickJS Emscripten 0.32.0 se reprodujo una devolución errática de error sin valor al usar evalCode con type module y compileOnly, incluso con JavaScript válido. La inspección de [QTS_Eval en la versión fijada](https://github.com/justjake/quickjs-emscripten/blob/v0.32.0/c/interface.c) identifica que esa ruta llega a la conversión de namespace sin inicializar su puntero de módulo. No se parchearon engines ni checkouts hermanos.

El corte usa acorn 8.19.0 como dependencia propia exacta, instalado con ignore-scripts. Su [API oficial](https://github.com/acornjs/acorn/tree/master/acorn#interface) documenta parse, sourceType, ecmaVersion y ubicaciones. Preflight analiza ECMAScript 2022 en modo module antes de cargar WASM; admite top-level await, rechaza imports e import.meta y no ejecuta fuente. El runtime ejecuta después la fuente completa original en modo module, sin concatenarla dentro de funciones. Las incompatibilidades específicas restantes de QuickJS se presentan como errores del runtime; no se anuncia equivalencia de todos los dialectos JavaScript.

Las pruebas Node incluyen ausencia de efectos antes de Run, error sintáctico con línea antes de cargar un WASM ausente, imports rechazados, Promise.resolve con top-level await real, módulo síncrono y bucles infinitos tanto directos como en jobs. El diagnóstico terminal conserva su lugar aun después de cien logs; los mensajes mantienen el límite compatible de 1024 unidades UTF-16, no una promesa de 1024 bytes UTF-8.
