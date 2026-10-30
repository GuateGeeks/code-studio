# Preparar una actividad y recuperar trabajo

Esta guía describe el software local. La validación con docentes, lectores de pantalla y equipos escolares sigue pendiente y no se deduce de las pruebas automatizadas.

## Primera creación con acompañamiento docente

En la entrada, «Continuar mi proyecto» aparece cuando se recuperó o abrió una creación. Lleva al contexto actual sin ejecutarlo. «Crear mi primera escena» carga una historia 2D local después de proteger el trabajo actual; si esa protección falla, se conserva el proyecto y se explica el problema. «Explorar una actividad» abre sus instrucciones sin reemplazar el proyecto. «Abrir un proyecto» permite elegir un archivo GGPROJ y valida antes de sustituir la autoría.

Para la primera escena, pedir al estudiante que cambie los pasos de un bloque Mover y cuente qué cree que ocurrirá. Pulsar «Ejecutar bloques», observar y comparar con la predicción. «Detener» conserva los bloques y reinicia el resultado. Desde el escenario, «Volver al programa» e «Ir a Detener» permiten regresar con teclado a esos controles. Las herramientas avanzadas reúnen «Ejecutar ejemplo» y controles GG: ejecutan ejemplos o diagnóstico, no sustituyen la autoría de los bloques visibles.

Nombrar la creación y esperar «Guardado en este navegador» antes de cerrar. Una edición aún pendiente no tiene recuperación garantizada. En Archivo, «Llevar o entregar» solicita un archivo portable .ggproj. Comprueba la carpeta de descargas: Studio no puede confirmar que se haya escrito en disco ni envía el proyecto a tu docente. Al volver en el mismo perfil, continuar el proyecto recuperado y decidir cuándo ejecutar. Si se recuperó un respaldo o falló el almacenamiento, atender el aviso visible y descargar una copia; guardar localmente no equivale a un respaldo externo.

La cabecera muestra dos mensajes independientes. «Guardado en este navegador» confirma el guardado local; «Copia solicitada…» recuerda una solicitud de copia del contenido actual. «Hay cambios desde la última solicitud de copia» indica que debes volver a llevar una copia si quieres incluirlos. «Sin registro de copia en este navegador» también puede aparecer al abrir un archivo en otro perfil: no significa que el archivo sea inválido.

Si falla el almacenamiento, puedes seguir editando, ejecutando y usando «Llevar o entregar». El aviso de fallo local permanece aunque la copia se haya solicitado. «Reintentar guardado local» vuelve a intentar el commit; si solo falló el registro de la copia, Archivo ofrece «Reintentar guardar el registro». Un registro recordado solo en esta sesión no sobrevivirá al cierre. «Seguir trabajando» cierra la ayuda sin descargar.

Esperar la confirmación local antes de cerrar. Un aviso nativo de salida es complementario y depende del navegador: no guarda por sí mismo ni garantiza recuperar una edición pendiente. Para cambiar de computadora, comprobar el archivo portable y abrirlo desde Archivo → Abrir archivo GGPROJ; volver a ejecutar es una decisión explícita.

El acompañamiento puede comprobarse pidiendo una modificación distinta y una explicación. El resultado del programa y los checks automáticos no acreditan por sí solos comprensión. Las edades, el currículo y la duración de la actividad deben acordarse con el docente.

## Preparación con conexión

1. Abrir Studio en el navegador y equipo que usará el alumno. No se requiere cuenta.
2. En «Aprende con una actividad», seleccionar historia animada, juego con puntuación o transición a texto. Leer los pasos antes de cargar el ejemplo: cargar reemplaza el proyecto actual y protege su copia.
3. Descargar un archivo GGPROJ de respaldo. Conservar una copia fuera del almacenamiento del navegador.
4. Abrir «Trabajar sin conexión» y pulsar «Preparar todos los recursos». Esperar la confirmación completa; una preparación cancelada o incompleta no garantiza todos los motores.
5. Cerrar todas las ventanas del navegador. Desconectar la red y volver a abrir la misma dirección en el mismo perfil. Comprobar la actividad y los lenguajes necesarios antes de la clase.

La preparación ocupa almacenamiento de ese perfil. Borrar datos del sitio, usar otro perfil o navegación privada puede eliminar o separar proyectos y paquetes. Una nueva versión se prepara y verifica antes de seleccionarse; se puede volver a la preparación anterior disponible. La actualización no ejecuta automáticamente los proyectos.

## Durante la actividad

En Escena 2D las vistas editan el mismo programa del objeto elegido; Código es de solo lectura. «Crear copia» produce un documento JavaScript/Python independiente y editarlo no modifica bloques. Elegir el contexto correspondiente al ejecutar: escena 2D, dispositivo, escena 3D o aplicación web.

Usar los enlaces iniciales de salto y la ayuda «Usar bloques con el teclado». El escenario tiene selección y activación de objetos, incluidos clones. Tab y Escape permiten salir; Stop conserva la autoría. Los errores de consola enlazan al bloque o a la línea cuando existe una referencia válida. Un mensaje de una ejecución anterior no se utiliza para seleccionar autoría nueva.

Descargar periódicamente GGPROJ. El autosave conserva la versión actual y la anterior en IndexedDB; es una ayuda local, no una copia externa. Abrir GGPROJ restaura autoría y recursos sin ejecutar. Los logs, coordenadas modificadas al ejecutar y demás estado mutable del runner no se guardan como autoría.

## Si algo falla

Después de recargar, atender el aviso de recuperación. Descargar una copia recuperada antes de reemplazarla. Un archivo inválido debe mostrar un error y conservar el proyecto activo. Si falta un pack o su versión, conservar el original y preparar la versión requerida; no instalar una extensión arbitraria por indicación del archivo.

Si un programa no responde, pulsar Stop. El host invalida su sesión y reemplaza el ejecutor cuando corresponde. El proyecto y las fuentes permanecen. Para reportar un fallo usar un ejemplo propio mínimo; los archivos pueden contener trabajo de alumnos.

## Compartir y límites

GGPROJ sirve para continuar la autoría. La exportación autónoma 3D/web descarga un ZIP con el runtime seleccionado y un servidor local Node 22; no basta con abrir index.html mediante file://. Seguir el README del paquete. Incluye fuentes y avisos accesibles sin Studio.

La simulación y un HEX compilado no prueban una placa física. WebUSB depende del navegador, del dispositivo y de una selección explícita. No se ha aprobado aún el presupuesto de rendimiento escolar ni un piloto de aula.

## Controles del corte verificado

Las capturas son píxeles reales del grupo afectado aprobado, sin sustituir el
contenido del escenario ni modificar estilos para la imagen.

![Guardado local y solicitud de copia portable, en dos líneas de cabecera](../product/scene2d-continuity-images/header.png)

Archivo conserva una única acción para solicitar el .ggproj. La ayuda pide
comprobar descargas y aclara que no se envía a un docente.

![Menú Archivo con Llevar o entregar y Abrir archivo GGPROJ](../product/scene2d-continuity-images/file-menu.png)

En la semilla de verificación, repetir tres veces un movimiento editado a siete
da x21. Esta captura del canvas acompaña la medición del test, no la reemplaza.
La primera escena del alumno conserva su historia propia.

![Escenario real tras ejecutar la semilla de 21 pasos](../product/scene2d-continuity-images/result-21.png)


## Objetos y vistas del mismo programa 2D (E2, 30/10/2026)

Los proyectos nuevos usan gg.sprites 0.3.0: un escenario y entre uno y ocho
sprites. Los archivos anteriores conservan su versión hasta «Actualizar packs»;
abrirlos o activar puntuación no los actualiza. La actualización conserva
autoría y no ejecuta. Si hubo cambios posteriores, volver a la versión anterior
puede dejar de ofrecerse o rechazarse para conservarlos.

El panel permite seleccionar, añadir, renombrar, duplicar y borrar sprites;
no permite borrar el escenario ni el último sprite. Flechas, Inicio y Fin
mueven el foco; Enter o Espacio elige. Pedir señalar el nombre de «Editando»
antes de cambiar un programa y predecir qué hará.

Bloques, JavaScript y Python editan el programa del objeto seleccionado.
Para escribir acciones de otro, elegirlo primero. Cambiar de objeto aplica el
texto pendiente: si se rechaza, conserva texto y selección y muestra causa/línea.
Se puede corregir, recuperar bloques con confirmación o crear copia independiente.
Seleccionar o cambiar de vista no ejecuta ni detiene. Editar objetos/recursos
sí reinicia el ejecutor y detiene lo que estaba corriendo.

**El resultado en reposo refleja la escena del proyecto solo tras Ejecutar.**
Un objeto añadido puede no verse aún y uno borrado puede seguir en el resultado
previo. Comparar panel y resultado, ejecutar y contrastar la predicción.
Un único Detener conserva el trabajo. «Ir a objeto» y posición aleatoria son
bloques distintos; si se borra el destino, su bloque pide elegir otro al ejecutar.

GGPROJ v6 conserva programas, selección, vistas y borradores por objeto.
Esperar guardado confirmado o comprobar la copia descargada antes de cerrar.
V1–v5 siguen legibles; una instalación antigua sin E2 puede no abrir v6.
Undo/cámara son de sesión y no viajan en el archivo.

## Biblioteca y fondos

«Nuevo objeto» añade un dibujo de la biblioteca como sprite vacío; «Añadir»
lo incorpora como disfraz del seleccionado. Los sonidos también pertenecen a
su objeto; añadir uno antes de usarlo en un objeto nuevo. Duplicar copia programa
y recursos con identidades nuevas y conserva variables compartidas. Biblioteca
local con contenido/licencia CC0-1.0 sin cambios.

Con el escenario seleccionado, elegir o subir fondo lo añade y deja como inicial;
los otros fondos siguen disponibles para los bloques. No hay borrado de recursos
en este corte. El texto usa nombres visibles para fondos; disfraces aún pueden
mostrar IDs técnicos. Conviene usar su menú y consultar el código generado.

## Copias, documentos y límites

Código es consulta de solo lectura del seleccionado. Copia de vista conserva su
texto exacto; «Código › Crear copia» reúne la escena en un documento independiente,
hasta **16 eventos y 16 variables**. Una escena mayor puede rechazarse: copias
por objeto no ejecutan conjuntamente los programas de los demás. Editar una copia
no modifica bloques. Un documento nuevo toma el sprite seleccionado, o el primero
si está elegido el escenario. Todos los documentos 0.3.0 usan la escena configurada,
pero ejecutan sus propios scripts.

«Por siempre» y controles E1 están disponibles con sus packs; una expresión libre
sin bloque puede rechazarse. Sensores/operadores E3, más de ocho sprites, capas,
cámara y copia editable multi-sprite SB3 quedan fuera. Antecedente del 26/10:
la guía de vistas usaba hero y GGPROJ v5; esas afirmaciones son históricas.
Micro:bit y 3D/web mantienen documentos independientes. No hay aceptación
docente/estudiantil de E2 realizada; software y comprensión se comprueban aparte.

## «De bloques a tu propio código», revisión 2 (29/10/2026)

La actividad pide abrir JavaScript o Python sobre el mismo programa, cambiar
solo el número del movimiento para llegar a x=18, ejecutar y volver a Bloques
para encontrar el 6 dentro de la repetición. El reto variante llega a x=24
cambiando repeticiones o pasos desde el texto. Pedir la predicción antes de
abrir el texto y la explicación al volver.

Comprobar verifica condiciones del programa: que hubo un cambio aplicado desde
el texto, la posición y el valor del bloque Mover. No verifica la explicación.
La revisión 1, basada en una copia independiente, sigue en la lista como
«revisión anterior 1» y conserva su progreso. Al abrir la revisión 2 en el mismo
proyecto se informa ese progreso sin mezclarlo.

## Instalación del piloto: solo Escena 2D y Texto

En cada equipo, quien instala arranca el estudio con `npm run serve:pilot`.
El selector «Qué programas» muestra entonces solo Escena 2D y Texto 2D. Si un
proyecto traído de otra instalación incluye micro:bit, Scratch, 3D o web, un
aviso lo indica: esos datos no se muestran aquí, pero se conservan al guardar
y descargar. El estudiante no puede cambiar esta configuración desde la
interfaz.
