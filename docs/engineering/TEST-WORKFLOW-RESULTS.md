# Resultados del flujo de pruebas incremental

**22 de octubre de 2026, Guatemala · Estado: implementado y verificado.**

El cambio `incremental-test-workflow` implementa `test:quick`, `test:affected` y `test:full`, más build por siete etapas con verificación de entradas, dependencias y salidas. La [guía de uso](TESTING.md) describe comandos, reglas y límites. El [prompt de continuación](NEXT-SESSION.md) recoge el siguiente corte de la plataforma para otra sesión.

## Resultados

Los planes CLI confirman selección de persistencia (8 E2E), HTML (16), PXT (6), documentación sin Chromium y código desconocido con cobertura completa. La ausencia de referencia amplía a full; argumentos inválidos y rutas externas fallan.

Quick aprobó 44 Node, 22 pruebas de herramientas y tres smoke Chromium en 17,8 s. Affected aprobó la selección de una suite de renderizado real en 7,8 s. Ninguno avanzó la referencia; 63 archivos protegidos, incluidos reportes completos y documentos históricos, conservaron sus hashes.

La puerta final aprobó **44/44 Node, 23/23 herramientas y 36/36 E2E**, sin fallos, omisiones, casos flaky ni reintentos. Los E2E se mantienen separados: tres smoke en 14,24 s y 33 regresiones en 144,43 s. El perfil full tomó 164,15 s, incluyendo su comprobación final de contenido. Solo este éxito creó la referencia de 12 665 archivos. Affected automático comprobó inmediatamente después `unchanged`, sin ejecutar comandos ni avanzar esa referencia. El caso adicional de herramientas verifica cambios/eliminación de chunks instalados.

El build completo tomó 8,80 s; repetirlo sin cambios tomó 0,46 s. HTML actualizó solo estáticos (0,51 s); editor actualizó estáticos y su bundle (1,22 s). Salidas ausentes/corruptas reconstruyeron únicamente la etapa responsable. Las fuentes temporales de prueba se restauraron con hashes idénticos. Se corrigió además la copia de chunks de Scratch Storage, antes dependiente de residuos de builds anteriores.

La [evidencia estable](test-workflow-evidence.json) conserva entorno, comandos, planes, tiempos por etapa, hashes restaurados, resultados de perfiles y referencia. CodeGraph sincronizó las herramientas y registró consultas de `createPlan` y `StageCache`. Los tres upstreams conservaron commit, diff versionado y lockfile. OpenSpec valida estrictamente los tres cambios y el flujo queda con 10/10 tareas completas.

## Correcciones encontradas al verificar

El primer intento full falló en el test de persistencia de Stop: su contador incluía los workers del runner de reemplazo. No avanzó la referencia. La comprobación ahora captura los workers anteriores y exige su cierre; mantiene audio, autoría y referencias GG obsoletas. El grupo affected de persistencia aprobó sus ocho casos en 57,08 s de Chromium (62,07 s de perfil) antes del full final. Los registros conservan el intento fallido separado del aprobado.

## Uso y límites

Usar quick durante edición, affected para el área modificada y full al consolidar fuentes estables. Documentación posterior al cierre requiere solo validación de especificaciones. Ver [TESTING](TESTING.md) y el [prompt de la siguiente sesión](NEXT-SESSION.md).

Los tiempos corresponden a esta máquina de desarrollo, no a una garantía de duración. El inventario cubre fuentes, locks y artefactos consumidos explícitos; no inspecciona cambios arbitrarios de todas las dependencias instaladas. Los informes históricos F0/F1 conservan sus datos. Este cambio no mide rendimiento escolar ni reemplaza las pruebas prolongadas, físicas o de segunda visita offline.
