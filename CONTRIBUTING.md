# Contribuir a GuateGeeks Code Studio

El producto se distribuye bajo AGPL-3.0-only. Conservar las licencias originales de dependencias y medios. No atribuir la licencia del editor a cualquier recurso de un proyecto.

Trabajar en Ubuntu/WSL, entrar en guategeeks-code-studio y cargar source ../scripts/env.sh. Usar Node y npm fijados en release/source-lock.json. Leer AGENTS.md, README, los resultados de fase y docs/engineering/TESTING.md. Las decisiones viven en docs/adr y los cambios en openspec/changes.

Antes de implementar un corte, definir su alcance, contratos y aceptación en OpenSpec. Consultar CodeGraph antes de cambiar fronteras y sincronizar después. Los modelos propios no importan internals de Scratch/PXT/QuickJS/Pyodide; esos detalles pertenecen a sus adaptadores y targets.

Durante edición usar test:quick o consultar test:affected -- --files RUTAS --list. Reproducir un fallo concreto antes de repetir grupos. browser:build reutiliza etapas por contenido; --force requiere una razón. Para HTML/CSS comprobar interacción real y móvil. Congelar fuentes y documentos durante test:full; las comprobaciones documentales posteriores validan especificaciones sin repetir toda la suite.

Conservar los cambios previos de repositorios hermanos y la evidencia histórica. No limpiar un checkout upstream ni editar node_modules para hacer pasar una prueba. Registrar cualquier parche con base, motivo y prueba; evaluar una contribución upstream por separado. Este workspace conserva un parche micro:bit previo, identificado en release/source-lock.json.

No añadir telemetría de código o actividad de alumnos. Autoría, recuperación y preparación offline funcionan sin cuenta. Los reportes deben usar fixtures propios y evitar datos personales o credenciales. Para un problema de seguridad, preparar una reproducción mínima sin publicar datos de estudiantes; no existe todavía un canal privado de seguridad anunciado.

La receta de distribución está en docs/release/BUILD.md. La publicación en un hosting y un piloto real son decisiones operativas separadas; generar un paquete local no demuestra ninguna de ellas.
