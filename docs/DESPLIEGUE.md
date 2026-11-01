# Despliegue

Cada push a `arcade` que cambie el producto publica en <https://guategeeks.com/code-studio/>. Antes de hacerlo, `npm run recorrido` debe pasar en local.

## Primera vez

1. En **Settings → Pages**, elegir **GitHub Actions** como fuente.
2. En **Settings → Environments → github-pages**, permitir la rama `arcade`. Sin esto, GitHub rechaza el despliegue porque no es la rama por defecto.
3. En **Settings → Security**, activar el reporte privado de vulnerabilidades, que enlaza `SECURITY.md`.

## Actualizar los equipos

Un equipo recibe la versión nueva al abrir el estudio con internet, en segundo plano. Se aplica al cerrar todas las pestañas del estudio, o con **Actualizar a la versión nueva** en la portada. La portada muestra la versión instalada.

## Cuánto pesa y cuándo publicar

Con los 12 juegos, el service worker guarda unos 71 MB por equipo (`sw-manifest.json`, 223 archivos). Por la red viajan unos 16 MB, porque el servidor comprime. Cada publicación cambia la versión, y el service worker instala la lista completa otra vez, no solo lo que cambió.

Por eso conviene agrupar los cambios en pocas publicaciones y hacerlas fuera de clase. Si varios equipos se actualizan a la vez en una red escolar lenta, tardan más.

Plan B, si la descarga falla en un equipo escolar: publicar los juegos como `.js.gz` y descomprimirlos en el navegador con `DecompressionStream`, desde `player.mjs`. Los 12 juegos pasarían de 25 MB a unos 3,6 MB en el equipo. No está implementado: solo se hace si una medición real lo pide.

## Retirar un service worker defectuoso

Si un `sw.js` publicado impide recibir arreglos, publicar en su lugar:

```js
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil((async () => {
  const names = await caches.keys();
  await Promise.all(names.filter(name => name.startsWith('gg-code-studio-')).map(name => caches.delete(name)));
  await self.registration.unregister();
})()));
```

Eso borra solo la copia del sitio. Los proyectos de los estudiantes están en IndexedDB y no se tocan.
