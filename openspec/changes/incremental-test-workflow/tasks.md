# Tasks

## 1. Selección de verificación

- [x] 1.1 Implementar los perfiles quick, affected y full y sus planes; verificar argumentos válidos/inválidos, normalización de rutas y modo --list/--dry-run con pruebas de herramientas.
- [x] 1.2 Implementar reglas conservadoras de impacto; verificar persistencia, HTML/CSS, Blockly/IR, GG, PXT, fronteras compartidas, documentación y ruta desconocida con planes representativos y pruebas.
- [x] 1.3 Implementar referencia de contenido del último full exitoso; verificar ausencia/corrupción, altas/eliminaciones sin HEAD, conservación ante fallo y que quick/affected no la avancen.
- [x] 1.4 Separar reportes de perfiles y documentar comandos/alcance; verificar que una pasada parcial no sobrescriba el reporte completo ni la evidencia histórica F0/F1.

## 2. Build incremental

- [x] 2.1 Separar etapas estáticas, fixtures/catálogo, PXT y bundles VM/audio/editor; verificar dependencias transitivas y firmas por contenido con pruebas de herramientas.
- [x] 2.2 Verificar build sin cambios y edición HTML: comprobar reutilización del primero y actualización estática del segundo sin webpack innecesario, con reporte y tiempos observados.
- [x] 2.3 Verificar invalidación por editor/dependencia, salida ausente/corrupta y caché inválida; comprobar reconstrucción, fallo no reutilizable y opción --force sin alterar fuentes upstream.

## 3. Integración y puerta final

- [x] 3.1 Integrar y ejecutar tres smoke de navegador sobre autoría, persistencia y Stop; verificar que quick produce su reporte propio y no se anuncia como full.
- [x] 3.2 Ejecutar una regresión final mediante test:full; comprobar Node/herramientas, tres smoke previos y 33 E2E funcionales con reportes separados, OpenSpec, preservación upstream y actualización de referencia solo tras éxito.
- [x] 3.3 Consolidar documentación, evidencia de selección/build y criterios de uso; validar OpenSpec estrictamente y registrar límites sin atribuir tiempos históricos al nuevo flujo.

## Workflow follow-up

- Revisar la evidencia antes de archivar administrativamente el cambio.
- Repetir full después de aprobar únicamente ante cambios nuevos, fallos o inquietudes concretas pendientes; los cambios solo documentales requieren validación de especificaciones.
