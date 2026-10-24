# Design

## Context

Ver proposal.md. El producto usa scripts Node, Playwright y un build estático que actualmente empaqueta VM, audio y editor en cada ejecución. La entrega F1 conserva 44 pruebas Node y 33 E2E; su corrida completa es evidencia histórica, no una medición del nuevo flujo. El checkout del producto todavía no tiene commits y sus archivos aparecen como nuevos, por lo que HEAD no puede ser la única fuente de cambios.

## Goals / Non-Goals

**Goals:** reducir trabajo repetido mediante selección conservadora y caché comprobable, preservar códigos de salida y hacer visible el alcance realmente validado. Mantener una única puerta full al consolidar el cambio.

**Non-Goals:** reducir expectativas de pruebas existentes, prometer equivalencia entre smoke/full, ejecutar rendimiento en paralelo, sustituir revisión de impacto por una clasificación optimista o regenerar los informes históricos F0/F1 con conteos nuevos.

## Decisions

### Perfiles y planes explícitos

`test:quick` ejecuta las pruebas Node/herramientas baratas y tres smoke de navegador: autoría/runner, persistencia y Stop. `test:affected` selecciona E2E a partir de reglas de impacto y sigue ejecutando Node/herramientas para cambios de código. Un cambio exclusivamente documental ejecuta solo validación de especificaciones. `test:full` integra Node, herramientas y build incremental; ejecuta primero los tres smoke para fallar pronto y después los 33 E2E funcionales existentes, validación OpenSpec y preservación upstream. Son 36 casos E2E distribuidos en dos reportes, sin sustituir el reporte canónico de 33 por el smoke.

Los planes contienen motivos, rutas y comandos con argumentos separados. `--list` y `--dry-run` permiten revisarlos sin lanzar build o pruebas. `--files` declara una lista explícita y no afirma haber detectado todos los cambios del checkout. Los comandos de perfiles rápidos generan reportes propios; el reporte de la regresión completa no se reemplaza con una pasada parcial.

Las reglas amplían cobertura al cruzar fronteras. Persistencia selecciona sus pruebas; HTML/CSS incluye persistencia, bindings y controles de audio, porque la entrega anterior expuso regresiones de clic reales. Adaptadores de bloque/IR amplían el corpus 2D; PXT/simulador seleccionan compilación y simulación. Runner compartido, protocolos, configuración, dependencias, build/selector o rutas desconocidas fuerzan full. Esta política acepta ejecutar de más ante incertidumbre; seleccionar de menos puede esconder una regresión.

### Referencia de contenido después de full

La detección automática compara un inventario por contenido con el último full exitoso. Incluye archivos nuevos y eliminados, sin depender de que exista HEAD ni de que el usuario haya creado un commit. También considera las fronteras upstream relevantes; no trata una modificación del motor como un simple cambio documental del producto.

Solo full puede reemplazar la referencia y únicamente después de todas sus comprobaciones exitosas. Quick/affected la leen y conservan. Una referencia ausente, incompatible o corrupta exige full. Avanzar automáticamente después de un perfil parcial sería más rápido pero podría olvidar cambios que todavía no pasaron la puerta completa.

### Build por etapas y contenido

Se separan sincronización estática, fixtures/catálogo, artefactos PXT y compilaciones webpack de VM, audio y editor. Cada etapa conserva firmas de entradas y salidas, incluyendo dependencias transitivas y configuración/locks/toolchain relevantes. La reutilización verifica que las salidas sigan presentes e íntegras; mtime o el commit del checkout no bastan para decidirlo.

La sincronización de archivos planos evita webpack cuando cambia solamente HTML, CSS o un módulo no empaquetado. Un cambio del editor/Blockly invalida su bundle y fixtures relacionados; un cambio de VM/audio invalida los componentes afectados. Los chunks y recursos copiados también son salidas verificadas. Las eliminaciones retiran únicamente copias conocidas dentro del directorio generado, sin borrar rutas arbitrarias del workspace.

Las firmas válidas se registran después del éxito; una compilación interrumpida no habilita reutilización. Las salidas dañadas o ausentes se reconstruyen aunque las fuentes no hayan cambiado. La opción de reconstrucción forzada permite comparar o recuperar sin depender del estado previo de caché. El reporte detalla etapa, motivo y duración observada; conserva el formato del manifiesto consumido por la evidencia histórica.

### Verificación proporcional

Primero se verifican reglas de selección y caché con pruebas de herramientas. Después se comprueban planes representativos, reutilización sin cambios, edición estática, invalidación de bundle y corrupción de salida. El smoke verifica el camino corto; una sola corrida full final confirma que el nuevo coordinador conserva la regresión. Si esa corrida falla, se reproduce el caso concreto y las pruebas afectadas antes de volver a full.

El número de workers no aumenta por defecto para audio o mediciones. El ahorro se busca primero en evitar builds y E2E sin relación; el paralelismo de pruebas sensibles requiere evidencia posterior. Los resultados de rendimiento permanecen en su suite separada.

Las comprobaciones de Stop capturan los workers de la ejecución anterior y exigen su cierre. Un worker creado por el runner de reemplazo pertenece a otra ejecución; no debe producir un falso fallo por contarse junto con los cancelados. Se conservan las comprobaciones de audio, autoría y referencias GG obsoletas.

## Risks / Trade-offs

- Una regla incompleta puede omitir cobertura → cambios desconocidos o compartidos amplían a full y se prueban las reglas de clasificación.
- Una caché basada en entradas insuficientes puede servir código viejo → incluir dependencias transitivas, locks/configuración y hashes de salidas; comprobar edición/corrupción real.
- Un reporte parcial puede confundirse con aceptación completa → rutas y perfiles separados y referencia actualizada solo por full exitoso.
- Coste del inventario de contenido → excluir dependencias/cachés generadas del inventario de impacto y conservar las fronteras que sí pueden cambiar la ejecución; medir el coste en el informe.
- Cambios concurrentes durante una corrida → una referencia debe describir el contenido comprobado y no certificar modificaciones posteriores; conservar el alcance de la corrida.

## Migration Plan

Los comandos existentes permanecen utilizables. Los nuevos perfiles son el flujo recomendado durante edición/cierre. La primera ejecución automática sin referencia solicita full, que establece la referencia solo si pasa. La caché nueva se puede omitir mediante reconstrucción forzada; un rollback de herramientas no debe modificar los archivos del alumno ni la evidencia histórica F0/F1.
