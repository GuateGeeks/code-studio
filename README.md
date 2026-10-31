# GuateGeeks Code Studio

Estudio de creación de videojuegos 2D para estudiantes de 10 a 12 años, con docente y en computadoras compartidas. Es un fork del target [`pxt-arcade`](https://github.com/microsoft/pxt-arcade) con portada, misión guiada y marca propias.

Se publica en <https://guategeeks.com/code-studio/>. Tras la primera visita con internet, cuando la portada dice que está listo, funciona sin conexión.

## Para docentes

- [Guía docente](docs/GUIA-DOCENTE.md): preparar las computadoras, dar la clase, hacer copias y qué hacer si algo falla.
- [Guion de observación](docs/OBSERVACION.md): probar un equipo escolar y observar la primera clase.

## Desarrollo

Requiere Node 22.

```bash
npm ci
npm run build
npm start
```

El estudio queda en <http://127.0.0.1:5310/code-studio/>.

| Comando | Qué hace |
|---|---|
| `npm test` | Pruebas unitarias |
| `npm run recorrido` | Recorrido corto en el navegador, con `npm start` encendido |
| `npm run journey` | Todas las pruebas en el navegador |
| `node tools/site.mjs dist/site/code-studio` | Aplica cambios de `studio/` sin recompilar |

## Cómo está hecho

- `pxtarget.json`, `theme/`, `docfiles/`, `libs/`: target personalizado.
- `studio/`: portada, almacenamiento por estudiante, misión y service worker.
- `sim/public/`: página del simulador, que ejecuta los juegos en un iframe aislado.
- `tools/`: compilación y servidor de desarrollo.

Versiones fijadas y procedencia en [UPSTREAM.md](UPSTREAM.md). Diseño en [docs/superpowers/specs](docs/superpowers/specs).

## Licencias

El código heredado conserva su licencia MIT y sus avisos en [LICENSE](LICENSE) y [ThirdPartyNotice](ThirdPartyNotice).

Este proyecto no está afiliado a Microsoft ni cuenta con su respaldo.
