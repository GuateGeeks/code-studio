# GuateGeeks Code Studio sobre Arcade: diseño

30 de octubre de 2026. Estado: pendiente de aprobación.

## Intención

Dar a estudiantes de 10 a 12 años, con docente, una experiencia de creación 2D completa y con identidad GuateGeeks, en computadoras compartidas y sin depender de internet. Sustituye a Code Studio, que era técnicamente sólido pero tenía un 2D incompleto y un costo de pruebas mayor que el avance del producto.

**Éxito:** una docente da una clase de 45 minutos; cada estudiante completa una misión, la guarda, y en la clase siguiente la reabre en una computadora compartida sin ayuda de un desarrollador.

## Objetivos

- Fork de `pxt-arcade` como primera experiencia 2D, con bloques, TypeScript y Python estático.
- Portada GuateGeeks con Geeky, selección de estudiante y proyectos separados por estudiante.
- Una misión guiada completa, en español.
- Publicación en `https://guategeeks.com/code-studio/` con GitHub Pages, funcionando sin red tras la primera visita y con simulador aislado.

## No objetivos

- QuickJS, Pyodide, 3D, web y extensiones de simulador en el primer hito.
- Conversión de Arcade a CPython.
- Contrato multi-engine, cuentas, nube y Sócrates.
- Importar Scratch o proyectos GGPROJ.
- micro:bit dentro del primer hito.
- Unidad completa de 6 a 8 lecciones: viene después de observar la primera misión.

## Anti-objetivos

- Fork de `pxt-core` sin una necesidad demostrada.
- Que un estudiante pierda su trabajo.
- Que el código del estudiante alcance el almacenamiento del editor.
- Telemetría o peticiones externas durante una clase.
- Volver a un flujo donde las pruebas pesen más que el producto.

## Enfoques considerados

| Enfoque | Costo | Decisión |
|---|---|---|
| **Target Arcade con portada propia y almacenamiento por estudiante** | Unos 19–30 días, confianza baja | **Elegido por el usuario** |
| Almacenamiento nativo y PNG en cada clase | Menor en código | Descartado: depende de que un estudiante no pierda su archivo |
| Perfil de navegador por estudiante | Menor en código | Descartado: inmanejable para el docente |
| Blockly con runtime propio, como recomendaba la investigación externa | Mayor; repite lo retirado | Descartado |
| Continuar Code Studio | 24–41 días sin editores | Descartado por el usuario |

## Decisiones del usuario

1. `pxt-arcade` en fork como primera experiencia 2D.
2. Conservar exportación e importación PNG y Version History. **Modificada:** el almacenamiento deja de ser el nativo porque las computadoras son compartidas; lo aloja la portada.
3. Sin QuickJS, Pyodide ni conversión universal por ahora.
4. Un mismo proyecto lógico GuateGeeks al avanzar a Python real, con artefactos independientes asociados por identidad, sin traducción automática.
5. Conservar `pxt.json`, `main.ts`, `main.blocks` y los recursos de PXT.
6. Completar misión, marca, aislamiento y offline.
7. Simulador en origen opaco. **Modificada:** GitHub Pages no permite cabeceras, así que en desarrollo y en producción se usa un iframe opaco anidado, sin CSP ni segundo dominio.
8. Diferir el contrato multi-engine hasta tener una segunda experiencia concreta.
9. Público principal: 10–12 años, con docente, en computadoras compartidas.

10. Proyecto público, en el repositorio `GuateGeeks/code-studio`, iniciado desde una rama huérfana.
11. Cada estudiante escribe su nombre la primera vez; después lo elige de la lista de ese equipo. No hay lista previa del docente ni códigos.
12. Cada estudiante vuelve siempre al mismo equipo, así que el trabajo vive en esa computadora y no se sincroniza entre equipos.
13. El desarrollo ocurre en esta máquina. La versión desplegada vive en GitHub Pages de `GuateGeeks/code-studio`, en `https://guategeeks.com/code-studio/`.

## Repositorio

- La rama huérfana no comparte historia con Code Studio; `main` y su código anterior permanecen como están.
- La rama lleva sus propios `LICENSE` y avisos: conserva los de `pxt-arcade`, y no hereda el AGPL de Code Studio.
- Como es pública: sin datos de estudiantes, sin logos ni marcas de Microsoft o MakeCode en lo publicado.
- La rama se llama `arcade` y no pasa a ser la rama por defecto hasta que el MVP esté listo.

## Arquitectura

```text
GitHub Pages: https://guategeeks.com/code-studio/
  ├─ Service worker: copia local tras la primera visita
  ├─ Portada GuateGeeks: estudiante, proyectos, copias
  │    └─ IndexedDB propia, por estudiante
  ├─ Editor PXT en iframe, modo IDE, workspace "iframe"
  └─ simulator.html: construye un iframe opaco y reenvía mensajes
```

### Editor

- Fork de `pxt-arcade` sin modificar `pxt-core`.
- Target y `sim.js` de la **misma versión publicada**.
- `pxtarget.json`: `allowParentController: true`, sin nube ni GitHub, `disableLiveTranslations`, español, Version History con intervalos adecuados a 45 minutos.
- Se abre con `index.html?nosandbox=1&ws=iframe&editorlayout=ide`.
- Se conserva `pxtweb.js`. Solo se anula la carga de App Insights: quitar ese archivo rompe la importación.
- Se ocultan el selector de hardware de «Descargar», «Explicar con IA» y lo que lleve a contenido en inglés.

### Portada y persistencia

- Responde a `workspacesync`, `workspacesave`, `workspaceloaded` y `workspacereset`.
- Cada registro guarda `{key, student, ggId, project, at}`, donde `project` es `{header, text}` intacto de PXT, incluido `_history`.
- Seleccionar estudiante recrea el iframe, para no compartir memoria entre estudiantes.
- La portada lista los nombres guardados en ese equipo y permite añadir uno nuevo. Un duplicado como «Ana» y «ana m.» crea otro espacio, sin perder trabajo.
- La selección de estudiante evita mezclas; no es seguridad.
- Copia de seguridad: archivo JSON por estudiante y por clase, que conserva el historial. Es la vía de recuperación si se limpia el navegador.
- PNG: sigue siendo la copia individual portable, sin historial.

### Identidad

- La portada asigna `ggProject: {id, v: 1}` en `pxt.json`.
- El ID de PXT no sirve: cambia al importar.
- Una copia de seguridad restaurada conserva su ID.
- Un PNG importado que llegue con un ID ya presente recibe uno nuevo y guarda `derivedFrom`.
- Es el único contrato con la futura experiencia Python.

### Aislamiento y red

- `simulator.html` es propio y no ejecuta código del estudiante. Lee `sim-inner.html`, `pxtsim.js` y `sim.js`, y arma un iframe `sandbox="allow-scripts"` con `srcdoc`.
- Se usa `srcdoc` porque un iframe opaco no pasa por el service worker: con `src` no carga sin red.
- Reenvía mensajes entre el editor y ese iframe. PXT ve un simulador de su mismo origen, y su control de orígenes funciona también en un dominio real.
- Cero peticiones externas durante una clase, verificado en cada publicación.

### Despliegue y uso sin red

- Compilar con `pxt staticpkg --route code-studio`. **Nunca `--githubpages`:** intenta publicar en `origin`.
- Publicar con GitHub Actions desde la rama `arcade`, sin versionar el sitio compilado.
- Service worker con alcance `/code-studio/`. Instala la lista completa de archivos, con versión por publicación, y retira las anteriores.
- La primera visita necesita internet. Después funciona sin red, incluso sin el servidor.
- Pedir `navigator.storage.persist()`, para reducir el riesgo de que el navegador borre los proyectos.
- Desarrollo: `npm start` sirve el sitio bajo `/code-studio/` en `127.0.0.1:5310`.
- No se publica hasta revisar licencias de traducciones y `sim.js`.

## Hitos

| Hito | Contenido | Días estimados |
|---|---|---|
| M0 Base | Repositorio, versiones fijadas, marca real, ocultar lo que no aplica | 3–5 |
| M1 Estudiantes | Portada, almacenamiento, identidad, copias, Geeky | 6–9 |
| M2 Misión | Tutorial con bloques filtrados, recursos de 16 colores, 320×240 en plantilla, español completo | 5–8 |
| M3 Publicación | Service worker, despliegue en Pages, verificación en producción | 2–3 |
| M4 Clase | Instalar, observar y corregir | 3–5 |

Es una estimación sin velocidad medida; el total de 19–30 días tiene confianza baja.

## Pruebas

- Mientras se programa: compilación y la prueba de lo que cambió, en menos de 1 minuto.
- Al cerrar una función: un recorrido de crear, ejecutar, detener, guardar y reabrir, en menos de 3 minutos.
- Siempre: separación entre dos estudiantes, recarga, restauración de copia, importación de PNG.
- Antes de una clase: batería corta de menos de 10 minutos, si el usuario la autoriza.
- No se prueba PXT, solo lo que añadimos. Una revisión por hito y sin acta por tarea.

## Evidencia ya obtenida

Todo en Chromium, por HTTP y sobre `127.0.0.1` salvo que se indique. La prueba con el servidor apagado usó almacenamiento en caché al navegar, no una lista de instalación:

- Dos estudiantes en un navegador, con proyectos e IDs distintos, reabiertos tras recargar.
- Version History y restauración con almacenamiento de la portada (modo `controller=1`).
- Copia de seguridad restaurada tras borrar la base, con historial.
- Modo IDE con almacenamiento de la portada y exportación PNG.
- Importación PNG en un perfil nuevo.
- Simulador opaco anidado, con almacenamiento, padre y `top` bloqueados, en un dominio que no es localhost y bajo `/code-studio/`, incluidos Ejecutar, Detener y reiniciar.
- Con el servidor apagado: portada, editor, proyecto y juego funcionaron desde el service worker.
- Dos compilaciones limpias: 274 de 275 archivos idénticos, sin contar `docs`.

## Riesgos

- `sim.js` es solo compilado; el código fuente del simulador es privado.
- Una actualización de PXT puede romper el protocolo de portada o `simulator.html`.
- Sin cuentas, la selección de estudiante no impide abrir el proyecto de otro.
- Limpiar el navegador borra el almacenamiento si no hay copia reciente.
- En modo IDE, el botón Inicio muestra una pantalla que debe alinearse con la portada.
- Falta revisar licencias de traducciones y del icono Font Awesome Pro en `sim.js`.
- `simulator.html` propio no tiene controles táctiles.
- `guategeeks.com` es un solo origen: cualquier página de ese dominio puede leer el almacenamiento de `/code-studio/`, incluidos los nombres de estudiantes.
- La primera carga depende de internet y un navegador puede borrar datos por falta de espacio.
- Cloudflare está delante de `guategeeks.com`; su caché puede mezclar versiones tras publicar.

## Pruebas pendientes

- Version History en modo IDE, y que un primer PNG ya lleve `ggProject`.
- Tutorial con `flyoutOnly` dentro del modo IDE.
- HTTPS real en `guategeeks.com`, primera carga en un equipo escolar, Firefox y Edge, audio audible, teclado y lector de pantalla.

## Decisiones tomadas por el agente

Se pueden cambiar al revisar el documento:

- El editor abre en modo IDE, no `controller=1`, porque conserva guardar PNG.
- Identidad en `pxt.json`, y `derivedFrom` para PNG importados con ID repetido.
- Copia de seguridad en JSON además del PNG.
- Primer hito con una misión, no la unidad completa.
- micro:bit fuera del primer hito.
- Rama `arcade`, sin ser la rama por defecto hasta el MVP.

## Queda para quien lo construya

- Forma de la portada dentro de la identidad de `cotizador/DESIGN.md`.
- Contenido exacto de la misión.
