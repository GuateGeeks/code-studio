# Experiencias CNB: diseño

31 de octubre de 2026. Estado: aprobado.

## Intención

Dar a la docente 12 juegos educativos ya armados, alineados con el CNB de Sexto, que un estudiante abre y juega en una sola pulsación. Hoy el estudio solo ofrece crear: la misión Atrapa la fruta enseña a programar, pero no cubre las áreas del currículo. Las experiencias usan el juego para enseñar esas áreas y dejan la programación a la vista.

**Éxito:** en una clase, cada estudiante abre una experiencia desde el catálogo, la termina en 10–15 minutos sin ayuda de un desarrollador y ve su resultado. Quien pulsa «Ver cómo está hecho» encuentra el juego en bloques legibles, en sus proyectos.

## Objetivos

- Catálogo de 12 experiencias por área, en la portada.
- Reproductor a pantalla completa, sin editor, que funciona sin red.
- Copia editable del juego con «Ver cómo está hecho».
- Una ficha docente por juego, con sus contenidos CNB.

## No objetivos

- Misiones que el estudiante construya.
- Guardar resultados o partidas, o enviarlos a la docente: un juego se reinicia.
- Quinto u otros grados: solo Sexto tiene CNB cargado.
- Conexión con Sócrates, o abrir proyectos de estudiantes en el reproductor.

## Anti-objetivos

- Que la copia editable sobrescriba o duplique lo que hizo el estudiante.
- Evaluar antes de enseñar.
- Inventar vocabulario maya, significados culturales o datos.
- Depender solo del color o del sonido para jugar o aprobar.
- Peticiones externas durante una clase.

## Restricciones

- No modificar `pxt-core`. Nunca `--githubpages`. socrates.app es solo lectura. Publicar exige pedido expreso del usuario.
- Sin datos de estudiantes en el repositorio. Sin marcas Microsoft o MakeCode en lo publicado. El CNB es CC BY-SA 4.0: dar crédito donde se cite su texto.

## Enfoques considerados

| Enfoque | Qué pasa al abrir | Decisión |
|---|---|---|
| A. Proyectos normales | Entra al editor primero; el estudiante puede romper el juego | Descartado |
| B. Solo jugar | Abre el juego, sin ver el código | Descartado |
| **C. Jugar y ver cómo está hecho** | Abre el juego directo; un botón crea una copia editable en el editor | **Elegido por el usuario:** cumple «listo para usar» y conecta con la programación |

## Decisiones del usuario

1. Experiencias ya armadas y listas para usar, no misiones que el estudiante construya.
2. Doce en total: al menos 2 de matemática, ciencia, sociales e idioma, y 1 de cada otra área.
3. Alineadas con el CNB y el contexto de Sócrates.
4. Entrega con la opción C.

## Decisiones del orquestador

El grado, y todo lo que dicen Arquitectura, Contenido, Pruebas y Orden, son decisiones del orquestador: el usuario puede cambiarlas. Las marcadas **[R]** se añadieron al redactar, para cerrar un hueco que dejaba la evidencia, y también se pueden cambiar.

## Catálogo

Sexto grado, 10–12 años. Los 25 ids se comprobaron contra `socrates.app/content/cnb/sexto-primaria/contenidos.json`, como `areaId:contenidoCodigo`: todos existen.

| # | Id | Experiencia | Contenidos | Situación | Mecánica | Final con resultado |
|---|---|---|---|---|---|---|
| 1 | `rescate-plano` | Rescate en el plano | `mat:1.5.3` | Tras un aguacero, la brigada de la aldea busca animales dispersos. La radio dicta pares ordenados | Moverse y confirmar | Mapa con cada rescate y su coordenada; aciertos de 5 |
| 2 | `cuentas-mayas` | Cuentas mayas en el mercado | `mat:4.1.5`, `4.1.7` | Un puesto del mercado anota sus ventas con numerales mayas | Ordenar y componer: armar numerales y seguir series de 20 en 20 y de 100 en 100 | Cuenta del día en maya y en decimal |
| 3 | `ladera-viva` | La ladera viva | `cnt:6.3.1`, `6.3.3` | Una comunidad reforesta la ladera sobre su nacimiento de agua | Decidir y ver consecuencias: sembrar, pasar por lluvia y sequía | Ladera final con suelo, agua y animales; avisa que es un modelo |
| 4 | `vecinos-bosque` | Vecinos del bosque | `cnt:1.5.1`, `1.5.4`, `1.5.6`, `1.5.7` | Una guardarrecursos enseña un bosque nuboso de Baja Verapaz | Clasificar: parasitismo, mutualismo, comensalismo | Cuaderno de campo: relaciones halladas y quién gana |
| 5 | `vuelta-mundo` | Vuelta al mundo | `ccss:1.2.1`, `1.2.2` | Geeky sale de Guatemala con pistas de latitud, longitud y altitud | Moverse y confirmar | Pasaporte con las zonas climáticas visitadas |
| 6 | `comunidad-preparada` | Comunidad preparada | `ccss:1.3.1`, `1.3.2`, `1.3.3` | El comité escolar compara fenómenos de Guatemala y del mundo | Decidir y ver consecuencias | Plan: fenómeno, lugar de peligro y quién ayuda |
| 7 | `detective-noticias` | Detective de noticias | `l1:4.3.2` | Al periódico mural de la escuela llegan noticias ficticias | Clasificar: hecho, opinión, generalización | Mural publicado con cada frase marcada; aciertos de 5 |
| 8 | `follow-geeky` | Follow Geeky (inglés) | `l3:3.3.1`, `3.3.3` | Búsqueda en la feria escolar con instrucciones escritas en inglés (first, then, last) | Moverse y confirmar | Ruta recorrida; instrucciones cumplidas de 5 |
| 9 | `lee-marimba` | Lee la marimba | `art:1.1.1`, `1.1.2` | El conjunto de marimba de la escuela ensaya una pieza original | Leer y tocar ritmo y melodía | Partitura completa con aciertos por compás |
| 10 | `recreo-activo` | Recreo activo | `ef:3.1.1`, `3.1.3`, `3.2.1` | Una jornada larga en el aula, con refacción y recreo | Clasificar hábitos, con pausas de movimiento guiadas | Plan de recreo: tres pausas, agua y aseo |
| 11 | `mediacion-recreo` | Mediación en el recreo | `fc:4.3.1`, `4.3.2` | Dos grupos quieren la cancha al mismo tiempo | Decidir y ver consecuencias | Acuerdo escrito y efecto de cada forma de afrontar el conflicto |
| 12 | `puesto-feria` | Mi puesto en la feria | `pyd:4.3.1` | Preparas un puesto para la feria escolar, con dinero de juego | Decidir y ver consecuencias | Informe: costo, ingreso, ganancia y una mejora |

**Ajustes de alineación [R].** Los ids existen, pero el CNB pide más que el título en estos casos:
- **Recreo activo:** los contenidos son hábitos higiénicos, sedentarismo, y líquidos y alimentación. Las pausas solo cubren `ef:3.1.3`, así que incluye aseo y agua. Cada pausa ofrece variante de pie o sentado y dice cuándo detenerse.
- **Comunidad preparada:** `ccss:1.3.x` habla del mundo, así que compara con Guatemala. Cruz Roja y Médicos Sin Fronteras, citados por el CNB, van en texto y sin emblemas.
- **Mediación en el recreo:** `fc:4.3.2` pide comparar diferentes culturas, y una escena de cancha no lo cubre. La revisión cultural aporta un ejemplo con fuente, sin atribuir conductas a un pueblo. Si no aparece, la ficha declara cobertura parcial.
- **Mi puesto en la feria:** `pyd:4.3.1` incluye participar en ferias. El juego prepara; la feria real depende de la docente, y la ficha lo dice.
- **Vecinos del bosque:** `cnt:1.5.1` pide tipos de parásitos: distingue externos e internos.

**Áreas [R].** El CNB de Sexto tiene 10 áreas. L 2 queda sin experiencia: la cuota de idioma se cubre con L 1 y L 3, y un juego de L 2 chocaría con no inventar vocabulario maya.

Las unidades del CNB no son fechas: la ficha no las convierte en semanas. Rescate en el plano y Cuentas mayas repiten temas de Sócrates, y catálogo y ficha lo declaran.

## Arquitectura

```text
games/catalogo.json            Fuente única del catálogo
games/<id>/pxt.json, main.ts   Proyecto PXT de cada juego
libs/gg-experiencias/          Diálogos, preguntas, resultado final
tools/build.mjs                Publica games/<id>.js y games/<id>.ts
studio/player.html, player.mjs Juego a pantalla completa
studio/ (portada)              Pantalla Experiencias, por área
studio/project.mjs             newProject crea la copia
```

### Fuente y compilación

- `tools/build.mjs` ejecuta `pxt build --local` en cada `games/<id>/` y toma `built/debug/binary.js` (~2,3 MB, 4–5 s por juego).
- Cada `pxt.json` de juego declara las mismas dependencias que la plantilla, y el build lo comprueba: lo que compila aquí compila en la copia.
- **[R]** Publica también `games/<id>.ts`, copia de `main.ts`: sin él, «Ver cómo está hecho» no funciona sin red.
- **[R]** Admite `--juego <id>` y omite lo que no cambió, porque los 12 ya gastan casi el minuto de pruebas.

### Reproductor y catálogo

- `studio/player.html` + `studio/player.mjs`, CSP `script-src 'self'`, `pxsim.SimulatorDriver` con `simUrl` **absoluta** y `autofocus: true`. Siempre por `simulator.html` y su iframe opaco.
- **[R]** Es una página de nivel superior, `player.html?juego=<id>`, porque eso probó el spike. El id se valida contra el catálogo.
- **[R]** Barra mínima: «Volver a Experiencias», «Jugar otra vez» y «Ver cómo está hecho». Si no abre: «No pudimos abrir este juego. Tus proyectos siguen guardados. Vuelve a Experiencias e inténtalo otra vez.»
- El catálogo es una pantalla nueva de la portada, tras elegir estudiante, por área. El estudiante sigue identificado para que la copia vaya a sus proyectos. **[R]** La portada deja el estudiante en `sessionStorage` antes de abrir el juego. Si no puede recuperarlo, muestra la lista.

### «Ver cómo está hecho»

- Usa `newProject` de `studio/project.mjs` con el `main.ts` del juego. El proyecto se llama como el juego.
- Si ya existe la copia, la abre: nunca duplica ni sobrescribe. Jugar siempre abre el original.
- **[R]** Detecta la copia con `ggProject.experiencia: "<id>"` en `pxt.json`, no por nombre: el estudiante puede renombrarla o tener otro proyecto con ese título.

### Biblioteca común: `libs/gg-experiencias`, sí

**Decisión:** biblioteca empaquetada en el target y añadida a la plantilla, con bloques en español. Lleva solo lo repetido: diálogos, pregunta de opción, fases, «Todavía no…», cálculo del 70 % y pantalla de resultado. Datos, mecánica y arte quedan en `main.ts`.

**Por qué:** las 12 comparten ciclo y evaluación, y repetirlos daría doce copias de cada corrección. El spike ya dio 197 elementos de bloque con un juego simple; la fontanería repetida taparía lo que el estudiante quiere ver. Y al estar en la plantilla, la copia compila solo con `main.ts`, sin tocar `pxt.json`.

**Costo aceptado:** los proyectos nuevos ven una categoría más y el compilado crece un poco. Las copias guardadas dependen de la biblioteca: sus bloques **solo se añaden, nunca se renombran ni se quitan**. El texto va directo en `//% block`, sin archivos de traducción.

### Reglas de `main.ts` para que se lea en bloques

- Solo `for (let i = 0; i < n; i++)`. Prohibidos los rangos negativos, que salen como bloque gris: se calcula `x = i - 7`.
- Sin `if` de una línea con llamadas anidadas. Todo en `main.ts`, sin recursos aparte, porque la copia solo recibe ese archivo.
- **[R]** Fondos como imagen, sin `drawLine`, que sale en inglés. Sin `askForString`: las respuestas se eligen.

### Sin red y tamaño

Los juegos son archivos estáticos y entran solos en `sw-manifest.json`. Se descarta IndexedDB, que sugirió el spike: el catálogo es fijo.

| Medida | Hoy | Con 12 juegos |
|---|---|---|
| Sitio sin comprimir | 43 MB | ≈ 71 MB (+28 MB) |
| Juegos por la red, con gzip | — | ≈ 3,9 MB (327 KB por juego) |

**Decisión:** comprimir en tránsito, que GitHub Pages ya hace, y no compartir código entre juegos. Los 2,3 MB son casi todo la misma biblioteca, pero separarla obligaría a alterar lo que produce PXT.

**[R]** Eso reduce la descarga, no necesariamente lo que ocupa el caché: se asumen ~28 MB más por computadora. Medir ambas cifras y corregir los «unos 40 MB» de la Guía docente. Plan B si falla en un equipo escolar: publicar `.js.gz` y descomprimir en `player.mjs` con `DecompressionStream`. Como el service worker instala la lista completa por publicación, conviene agrupar publicaciones y hacerlas fuera de clase.

### Requisitos de la ola 1

- `stampIdentity` (`studio/identity.mjs`) reescribe `ggProject` al guardar y borraría `experiencia`: debe preservarla, con prueba de guardar y reabrir.
- La plantilla trae un `main.blocks` vacío que puede borrar el código al abrir en Bloques: la copia debe omitirlo o generarlo, con prueba de que el código sigue tras abrir, guardar y reabrir.
- `games/<id>/pxt.json` usa los mismos nombres de dependencias que la plantilla, con rutas ajustadas.
- `libs/gg-experiencias` se registra en `bundleddirs` de `pxtarget.json` y en `libs/blocksprj/pxt.json`.
- La copia se detecta por la marca en `pxt.json`, distinta de `findMission`, y se prueba aparte.

## Contenido y evaluación

| Fase (10–15 min en total) | Qué hace el estudiante |
|---|---|
| Explorar | Prueba la situación sin riesgo |
| Construir | Construye la idea con un ejemplo y recibe el término. No programa |
| Aplicar | Practica con pistas |
| Comprobar | Resuelve sin pista; se supera con 70 %, como el reto de Sócrates |
| Reflexionar | Responde una pregunta sobre lo aprendido y ve su resultado |

- **[R]** Comprobar lleva 5 ítems y pide 4 aciertos. Hay dos series fijas, A y B: quien no alcanza vuelve a Aplicar y recibe la otra. Sin azar, para que las pruebas conozcan las respuestas.
- El error nunca castiga y da el siguiente paso: «Todavía no. Revisa el signo de la primera coordenada e inténtalo otra vez.»
- El resultado solo se ve en la pantalla final: no se guarda ni llega a la docente.
- **[R]** La pantalla final es de la biblioteca, sin `game.over`, que el spike no probó en el reproductor.

| Mecánica | Juegos | Controles |
|---|---|---|
| Moverse y confirmar | 1, 5, 8 | Flechas y A |
| Ordenar y componer | 2 | Flechas para elegir, A para colocar |
| Clasificar | 4, 7, 10 | Izquierda o derecha, A |
| Decidir y ver consecuencias | 3, 6, 11, 12 | Arriba o abajo, A |
| Leer y tocar | 9 | Flechas según la nota, A |

- **Texto:** tuteo, una idea por oración, tildes en mayúsculas, sin depender solo del color o del sonido, frases cortas en 320×240. Primero la experiencia, después el nombre. Lo simulado se declara: «Es un modelo en la pantalla.»
- **Temas evitados:** conflicto armado, sexualidad, Cholq'ij (sin validar), vocabulario maya inventado.
- **Cuidados por juego [R]:** Cuentas mayas usa posiciones 1, 20 y 400, sin sentido ceremonial ni calendario. Lee la marimba usa música original y se aprueba sin sonido: cada nota se ve y lleva su nombre. Comunidad preparada y La ladera viva no muestran víctimas. Detective de noticias no usa personas ni medios reales.
- **Arte:** propio, ampliando `tools/gg-art.mjs` y `libs/gg-studio`, sin marcas ni material con derechos.
- **Docentes:** `docs/EXPERIENCIAS.md`, enlazado desde la Guía docente, con una ficha por juego: tiempo, área, contenidos CNB, objetivo y cómo usarlo. Da crédito a CNB Guatemala / Ministerio de Educación (CC BY-SA 4.0) donde cite su texto.

## Pruebas

Presupuesto: mientras se programa, menos de 1 minuto; al cerrar una función, menos de 3; al cerrar un hito, la suite completa.

- **Catálogo (unitaria):** 12 entradas, cuotas por área y cada id presente en `tests/fixtures/cnb-sexto-ids.json`, copia local de los 834 ids.
- **Fuente (unitaria) [R]:** ningún `for` fuera de la forma permitida, sin `askForString`, dependencias iguales a la plantilla.
- **Arranque (navegador):** abre los 12 juegos y comprueba que corren, sin errores ni peticiones externas.
- **Sin red (navegador) [R]:** con el service worker instalado y `context.setOffline(true)`, abre un juego y crea su copia. El spike solo lo razonó.
- **Recorrido con teclado:** uno completo por mecánica (juegos 1, 2, 4, 6 y 9). **[R]** Otro con respuestas erróneas, que debe dar «Todavía no…» y la serie B.
- **Copia [R]:** cae en el estudiante correcto; pulsar otra vez abre la misma, con sus cambios, aunque esté renombrada.
- **Legibilidad [R]:** al cerrar un hito, abre las 12 copias en Bloques y exige cero bloques grises.

Las pruebas deben demostrar el efecto, no solo que no hubo error:
- Prohibidos `force` y localizar por un texto que también aparezca en la misión. Mantener cada tecla unos 120 ms: una pulsación instantánea no cierra diálogos.
- **[R]** Una captura ya engañó en el spike, y el juego corre en un iframe opaco. Por eso la biblioteca emite fase y resultado por `control.simmessages`, y `player.mjs` los refleja en atributos `data-`. Las pruebas leen ahí los aciertos. Nada se guarda.

## Riesgos

- Sonido no probado en equipos escolares; afecta a Lee la marimba.
- Sin probar Edge, Firefox ni teclado real. El foco sin clic solo se vio en Playwright.
- La CLI y el editor no se compararon byte a byte.
- La pantallita se queda girando con Play deshabilitado si se escribe ~3,3–3,9 s después de pasar a JavaScript. No pierde código. Se sale pasando por Bloques o reabriendo. Está fuera de `studio/`: no se corrige.
- `askForString` sin probar con acentos y ñ. Fin de juego y reinicio sin probar en el reproductor.
- Copia sin probar: el spike pegó código en un proyecto nuevo. Si un proyecto sin `main.blocks` no abre en Bloques, se genera ese archivo al compilar.
- Las fuentes de arcade pueden no mostrar bien Á, É, Í, Ó, Ú, Ñ, ¿ o ¡.
- `simulator.html` puede filtrar los mensajes de `simmessages`; es nuestro y se puede ajustar.
- Que Pages comprima detrás de Cloudflare es inferido, y 327 KB es un cálculo sobre un juego.

## Queda para quien lo construya

**Comprobar primero.** Resultados ya comprobados en el código del estudio:
- La plantilla ya depende de `gg-studio` (`libs/blocksprj/pxt.json`) y `libs/gg-studio` está en `bundleddirs`.
- `newProject(template, {name, id, headerId, now})` no acepta `main.ts` ni `experiencia`: hay que ampliarlo con `files` y `experiencia`.
- En `tools/build.mjs`, los juegos se compilan después de `staticpkg` y se copian a `dist/site/.../games/` antes de `finishSite`, para que entren en `sw-manifest.json`. `tools/site-files.txt` no excluye `games/`. `checkSite` debe ampliarse para exigir los juegos.
- El 70 % se mantiene como decisión del encargo, tomada de la respuesta de Sócrates; no se comprobó en este repositorio.

**Orden.** Ola 1: reproductor, catálogo, compilación, biblioteca y Rescate en el plano, de punta a punta; resuelve antes de seguir los riesgos de copia, fin de juego, fuentes y `simmessages`. Ola 2: las otras 11. Cierre: fichas, medición de tamaño y Guía docente.

Modelos: Sonnet para integración y juegos; Haiku para fichas mecánicas; Opus para la revisión editorial y la final.

**Antes de publicar.** Revisión humana de pertinencia cultural (juegos 2, 9 y 11) y de los datos de Ciencias y Sociales. Después, pedido expreso del usuario.

**A su criterio.** Forma de las tarjetas, texto exacto y series A y B de cada juego, y nombres de los bloques.
