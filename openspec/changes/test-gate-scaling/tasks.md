# Tasks

## 1. Medición

- [ ] 1.1 Medir duración por archivo de navegador y memoria por proceso en la puerta en serie actual; fijar el número de particiones por defecto y registrarlo.

## 2. Particiones

- [ ] 2.1 Implementar particiones con servidores y puertos propios (4273 + 100·i), comprobación de puertos libres y artefactos separados; conservar el modo en serie.
- [ ] 2.2 Agrupar en una partición en serie las pruebas con estado global (offline frío, exportaciones autónomas, `standalone-contexts`) y repartir el resto por duración histórica.
- [ ] 2.3 Fusionar reportes con partición y duración; avanzar la referencia solo si todas aprueban con fuentes estables. Pruebas de herramientas para fusión, fallo de partición y referencia.

## 3. Impacto y fixtures

- [ ] 3.1 Añadir los grupos de impacto por contexto y para los módulos de los cambios propuestos, con una prueba de herramientas por grupo; lo desconocido sigue yendo a la puerta completa.
- [ ] 3.2 Crear el formato `tests/fixtures/canonical/`, el ejecutor `canonical-projects.spec.mjs` y un fixture 2D mínimo (sin ejecución al abrir, estado final, Detener).

## 4. Verificación y documentación

- [ ] 4.1 Ejecutar dos puertas particionadas con distinto orden y una en serie; comprobar listas de pruebas idénticas y registrar duraciones.
- [ ] 4.2 Actualizar `docs/engineering/TESTING.md`, `NEXT-SESSION.md` y el acta de resultados con duración, particiones y límites.
