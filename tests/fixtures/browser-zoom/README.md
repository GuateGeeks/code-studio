# Fixture de zoom real

Esta extensión MV3 se carga únicamente desde un perfil temporal de Chromium incluido con Playwright. No usa un perfil del usuario, content scripts, permisos de sitios externos ni mensajes desde páginas. El harness invoca el controlador en el service worker; este admite solamente una pestaña HTTP localhost y factores 1, 2 o 4.

La prueba usa `chrome.tabs.setZoom/getZoom`, con alcance por pestaña, y restaura 1 antes de cerrar y eliminar el perfil. El tamaño de ventana se controla sin emular viewport, DPR ni pageScale. Se conserva evidencia del factor nativo y del ancho CSS real.

Estas fuentes de prueba pueden acompañar el archivo de fuentes. No se incluyen ni cargan como recursos ejecutables de Studio, preparación offline o exportaciones autónomas.

Referencias primarias: [extensiones con Playwright](https://playwright.dev/docs/chrome-extensions) y [API tabs de Chrome](https://developer.chrome.com/docs/extensions/reference/api/tabs).
