# F2 — Lenguajes y transición educativa

22 de octubre de2026. Implementación del corte `phase-2-textual-equivalence` sobre los [fundamentos aprobados](LANGUAGE-FOUNDATIONS.md). La consolidación full de este corte está aprobada; los resultados y límites siguientes corresponden a evidencia real.

## Comportamiento entregado
La vista de código ofrece IR educativa, JavaScript y Python de solo lectura desde la misma IR0 validada. Crear copia añade un documento independiente sin ejecutar ni alterar bloques. La copia declara variables/ámbitos y registra callbacks; editar bloques o texto después no sincroniza la otra autoría. ZIP/autosave conservan fuentes/IDs, y abrir/recuperar no ejecuta.

QuickJS0.32.0/Pyodide314.0.7 locales ejecutan funciones async y for/if reales; Acorn8.19.0 valida módulos ECMAScript2022 sin imports. Callbacks con ctx están ligados a invocación/target/revisión; hats/eventos y estado mutable siguen en la VM. Las referencias de variable se resuelven atómicamente en el comando. Mensajes con espera, clones, ámbitos, disfraces y audio están implementados para el corpus. El [ADR004](../adr/004-contextos-textuales-y-corpus.md) fija límites.

El programa identifica el documento y la versión ejecutados cuando se selecciona o edita otro documento. Stop cancela preparación, callbacks, RPC, esperas/audio y destruye workers/frames. Una espera contextual de21s pasó sin el antiguo timeout20s; Stop durante otra espera50s respondió sin esperar su final. El broker mantiene límites de16handlers/64invocaciones/64clones/64operaciones pendientes y dominio contextual±1e12, con errores explícitos. No anuncia equivalencia de toda IR posible ni un SDK estable.

## Corpus real por separado
Cada fixture se ejecutó en bloques, JavaScript y Python, con estados/trazas normalizados comparados contra bloques y autoría conservada:

| Fixture | Observación |
|---|---|
| Eventos | espera inicial, espacio y clic reales; movimientos5,12,23 |
| Mensajes | recorrido1,11,13; emisor espera receptor |
| Clones | original2, clon60, doble área coral y eliminación |
| Variables | ramas/bucles:21/score3; espacio19/score2 |
| Ámbitos | global17; local original3 y clon5; borrado conserva original |
| Concurrentes | ambos hats solapados; corto termina durante espera larga |
| Disfraces | hero-alt azul y retorno a hero con píxeles reales |
| Audio | WAV mono1.2s, señal/frecuencia y movimiento después del final |
| Detener sonido | corte anticipado, silencio y continuación a3 |

La matriz comprende27ejecuciones más3Run/Stop activos de audio. Se comprobaron arrays dispersos antes de mutar, tipo de tecla, nombres/IDs alineados con IR, contexto tras awaits y cancelación antes del temporizador. La revisión independiente detectó esos bordes y estados ambiguos; se corrigieron y verificaron concretamente. La revisión visual acotada aprobó selector/copia/documento en escritorio y móvil, con detector sin hallazgos.

## Medidas locales
Herramienta reproducible `node tools/f2/runtime-metrics.mjs`, después del build, usa4193–4196 y navegador nuevo por lenguaje. Diez ciclos Run/Stop por lenguaje; cada Run incluye nuevo runner/intérprete y un comando GG. Entorno local: Node22.23.4, WSL2/Linux6.18.54.1, Ryzen73700X y Chromium156.0.8078.4.

| Medida | JavaScript | Python |
|---|---:|---:|
| Primer Run en proceso nuevo |571ms|3209ms|
| Mediana de nueve Runs siguientes |469ms|2891ms|
| Mayor Stop hasta nuevo runner listo |363ms|392ms|

Inventario servido44,853,900bytes sumando los cuatro roles, antes de preparación offline. RSS suma procesos Chromium y puede contar páginas compartidas varias veces: base~686/687MB, pico~1039/966MB, después del último Stop~992/894MB respectivamente. Incluye cachés/procesos/GPU/V8 y no mide heap privado ni WASM aislado; no prueba ausencia de retención ni certifica presupuesto escolar. Cada Stop confirmó que no quedaba runtime textual activo/candidato. `artifacts/f2-runtime-metrics.json` conserva muestras crudas y limitaciones.

Equipos escolares, Chromebook, lector de pantalla humano, piloto docente y micro:bit físico conservan evidencia pendiente. No se envía código/actividad por telemetría predeterminada.

## Consolidación
Full estable aprobado: 123 pruebas Node, 33 de herramientas, tres smoke y 67 de regresión completa (70 E2E), ocho cambios OpenSpec y preservación de los tres upstreams. Duración total 520.968s; regresión 499.419s. Build incremental: nueve etapas reutilizadas, 1383ms, sin --force. La primera consolidación detectó una carrera de inicialización en la prueba de disfraces (studioProbe aún no disponible); se añadió la espera explícita, se reprodujo el caso aprobado y después se repitió full con fuentes congeladas. La referencia de contenido quedó confirmada.

[Acta JSON](textual-equivalence-evidence.json) y `artifacts/cuts/phase-2-textual-equivalence/` conservan reportes, hashes, medidas y matriz por backend. Los informes anteriores F0/F1/fundamentos F2 y sus OpenSpec permanecen sin archivar. El software de este corte F2 está cerrado; mediciones escolares y verificaciones humanas/físicas conservan sus límites declarados. Siguiente implementación: F3, packs, lecciones y preparación offline.
