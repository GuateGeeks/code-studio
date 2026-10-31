// Cycle and evaluation shared by every experience. Blocks here are only ever added, never renamed or removed:
// saved copies of the games depend on them.

enum FaseExperiencia {
    //% block="explorar"
    Explorar,
    //% block="construir"
    Construir,
    //% block="aplicar"
    Aplicar,
    //% block="comprobar"
    Comprobar,
    //% block="reflexionar"
    Reflexionar
}

enum EjeEleccion {
    //% block="arriba o abajo"
    Vertical,
    //% block="izquierda o derecha"
    Horizontal
}

//% weight=70 color="#6942a1" icon="" block="Experiencias"
namespace experiencias {
    const CANAL = "gg-experiencia"
    const NOMBRES_FASE = ["explorar", "construir", "aplicar", "comprobar", "reflexionar"]
    const ITEMS = 5
    const MINIMO = 70
    const ANCHO_PANEL = 304
    const CARACTERES = 46

    let faseActual = 0
    let serie = 0
    let espera = "ninguna"
    let nAciertos = 0
    let total = 0
    let paso = 0
    let avisos = 0
    let aprobado = false
    let terminado = false
    let menuAnulado = false
    let seleccion = 0
    let eligio = false

    // The page that plays the game reads this state: tests and the player never look inside the game.
    function emitir() {
        paso += 1
        const texto = "{\"fase\":\"" + NOMBRES_FASE[faseActual]
            + "\",\"serie\":\"" + (serie == 0 ? "A" : "B")
            + "\",\"espera\":\"" + espera
            + "\",\"aciertos\":" + nAciertos
            + ",\"total\":" + total
            + ",\"paso\":" + paso
            + ",\"avisos\":" + avisos
            + ",\"aprobado\":" + (aprobado ? "true" : "false")
            + ",\"final\":" + (terminado ? "true" : "false") + "}"
        control.simmessages.send(CANAL, Buffer.fromUTF8(texto), true)
    }

    function anularMenu() {
        controller.menu.onEvent(ControllerButtonEvent.Pressed, function () { })
    }

    // The pause menu is in English and Backspace restarts the game, so the system keys are turned off
    // and every scene gets the menu button silenced.
    function prepararMenu() {
        if (menuAnulado) return
        menuAnulado = true
        keymap.setSystemKeys(keymap.KeyCode.None, keymap.KeyCode.None, keymap.KeyCode.None, keymap.KeyCode.None)
        anularMenu()
        game.addScenePushHandler(function () {
            anularMenu()
        })
    }

    function partir(texto: string, ancho: number): string[] {
        const palabras = texto.split(" ")
        const lineas: string[] = []
        let linea = ""
        for (let i = 0; i < palabras.length; i++) {
            const intento = linea.length == 0 ? palabras[i] : linea + " " + palabras[i]
            if (intento.length > ancho && linea.length > 0) {
                lineas.push(linea)
                linea = palabras[i]
            } else {
                linea = intento
            }
        }
        if (linea.length > 0) lineas.push(linea)
        return lineas
    }

    function abrirEscena() {
        game.pushScene()
        game.currentScene().flags |= scene.Flag.SeeThrough
        anularMenu()
    }

    /**
     * Marca la fase en la que está el estudiante.
     */
    //% blockId=experiencias_fase block="fase %f"
    //% weight=100
    export function fase(f: FaseExperiencia) {
        prepararMenu()
        faseActual = f
        emitir()
    }

    /**
     * Muestra un mensaje y espera a que se pulse A.
     */
    //% blockId=experiencias_decir block="decir %texto"
    //% texto.defl="Hola"
    //% weight=90
    export function decir(texto: string) {
        prepararMenu()
        espera = "dialogo"
        emitir()
        game.showLongText(texto, DialogLayout.Bottom)
        espera = "ninguna"
        emitir()
    }

    /**
     * Espera a que se pulse A. Sirve para confirmar una posición o una respuesta.
     */
    //% blockId=experiencias_confirmar block="esperar a que pulse A"
    //% weight=80
    export function confirmar() {
        prepararMenu()
        pauseUntil(() => !controller.A.isPressed())
        espera = "confirmar"
        emitir()
        controller.A.pauseUntil(ControllerButtonEvent.Pressed)
        espera = "ninguna"
        emitir()
    }

    function dibujarEleccion(imagen: Image, enunciado: string[], opciones: string[], eje: EjeEleccion) {
        imagen.fill(1)
        imagen.drawRect(0, 0, imagen.width, imagen.height, 12)
        let y = 6
        for (let i = 0; i < enunciado.length; i++) {
            imagen.print(enunciado[i], 8, y, 15, image.font8)
            y += 10
        }
        y += 4
        if (eje == EjeEleccion.Vertical) {
            for (let i = 0; i < opciones.length; i++) {
                if (i == seleccion) imagen.fillRect(4, y - 2, imagen.width - 8, 12, 5)
                imagen.print((i == seleccion ? "> " : "  ") + opciones[i], 8, y, 15, image.font8)
                y += 14
            }
            imagen.print("Arriba o abajo para elegir. A confirma.", 8, y + 2, 12, image.font8)
        } else {
            const ancho = Math.idiv(imagen.width - 8, opciones.length)
            let alto = 0
            for (let i = 0; i < opciones.length; i++) {
                const lineas = partir(opciones[i], Math.idiv(ancho - 12, 6))
                if (i == seleccion) imagen.fillRect(4 + i * ancho, y - 2, ancho, lineas.length * 10 + 6, 5)
                for (let j = 0; j < lineas.length; j++) {
                    imagen.print((j == 0 && i == seleccion ? "> " : "") + lineas[j], 8 + i * ancho, y + j * 10, 15, image.font8)
                }
                if (lineas.length * 10 > alto) alto = lineas.length * 10
            }
            imagen.print("Izquierda o derecha. A confirma.", 8, y + alto + 12, 12, image.font8)
        }
    }

    /**
     * Muestra una pregunta con opciones y devuelve la que elige el estudiante (0 es la primera).
     */
    //% blockId=experiencias_elegir block="elegir %enunciado entre %opciones con %eje"
    //% enunciado.defl="¿Qué eliges?"
    //% weight=70
    export function elegir(enunciado: string, opciones: string[], eje: EjeEleccion): number {
        prepararMenu()
        pauseUntil(() => !controller.A.isPressed())
        const lineasEnunciado = partir(enunciado, CARACTERES)
        let alto = 6 + lineasEnunciado.length * 10 + 4 + 14
        if (eje == EjeEleccion.Vertical) {
            alto += opciones.length * 14 + 6
        } else {
            let mayor = 1
            const columna = Math.idiv(Math.idiv(ANCHO_PANEL - 8, opciones.length) - 12, 6)
            for (let i = 0; i < opciones.length; i++) {
                const cuenta = partir(opciones[i], columna).length
                if (cuenta > mayor) mayor = cuenta
            }
            alto += mayor * 10 + 10
        }
        abrirEscena()
        seleccion = 0
        eligio = false
        const panel = sprites.create(image.create(ANCHO_PANEL, alto), SpriteKind.Player)
        panel.z = 100
        panel.setPosition(160, 240 - Math.idiv(alto, 2) - 6)
        dibujarEleccion(panel.image, lineasEnunciado, opciones, eje)
        const anterior = eje == EjeEleccion.Vertical ? controller.up : controller.left
        const siguiente = eje == EjeEleccion.Vertical ? controller.down : controller.right
        anterior.onEvent(ControllerButtonEvent.Pressed, function () {
            seleccion = (seleccion + opciones.length - 1) % opciones.length
            dibujarEleccion(panel.image, lineasEnunciado, opciones, eje)
        })
        siguiente.onEvent(ControllerButtonEvent.Pressed, function () {
            seleccion = (seleccion + 1) % opciones.length
            dibujarEleccion(panel.image, lineasEnunciado, opciones, eje)
        })
        controller.A.onEvent(ControllerButtonEvent.Pressed, function () {
            eligio = true
        })
        espera = "eleccion"
        emitir()
        pauseUntil(() => eligio)
        const elegida = seleccion
        game.popScene()
        espera = "ninguna"
        emitir()
        return elegida
    }

    /**
     * Avisa que todavía no es correcto y da el siguiente paso.
     */
    //% blockId=experiencias_todavia_no block="decir todavía no, con la pista %pista"
    //% pista.defl="Inténtalo otra vez."
    //% weight=60
    export function todaviaNo(pista: string) {
        avisos += 1
        decir("Todavía no. " + pista)
    }

    /**
     * Empieza la comprobación: cinco ítems sin pista.
     */
    //% blockId=experiencias_comprobar block="empezar la comprobación"
    //% weight=50
    export function comprobar() {
        prepararMenu()
        nAciertos = 0
        total = ITEMS
        faseActual = FaseExperiencia.Comprobar
        emitir()
    }

    /**
     * Anota un ítem de la comprobación.
     */
    //% blockId=experiencias_anotar block="anotar acierto %acierto"
    //% weight=45
    export function anotar(acierto: boolean) {
        if (acierto) nAciertos += 1
        emitir()
    }

    /**
     * Cierra la comprobación: se supera con el 70 %. Si no, cambia de serie.
     */
    //% blockId=experiencias_cerrar block="superó la comprobación"
    //% weight=40
    export function cerrarComprobacion(): boolean {
        aprobado = nAciertos * 100 >= total * MINIMO
        if (aprobado) {
            emitir()
            return true
        }
        serie = 1 - serie
        todaviaNo("Vuelve a practicar. Después prueba con otra serie.")
        return false
    }

    /**
     * Serie de la comprobación: 0 es la A y 1 es la B.
     */
    //% blockId=experiencias_serie block="serie actual"
    //% weight=30
    export function serieActual(): number {
        return serie
    }

    /**
     * Aciertos de la comprobación.
     */
    //% blockId=experiencias_aciertos block="aciertos"
    //% weight=29
    export function aciertos(): number {
        return nAciertos
    }

    /**
     * Muestra el resultado y termina. No regresa: para jugar otra vez se reinicia el juego.
     */
    //% blockId=experiencias_final block="mostrar el resultado %titulo con %lineas"
    //% titulo.defl="¡Terminaste!"
    //% weight=20
    export function final(titulo: string, lineas: string[]) {
        prepararMenu()
        let texto: string[] = []
        for (let i = 0; i < lineas.length; i++) {
            const partes = partir(lineas[i], CARACTERES)
            for (let j = 0; j < partes.length; j++) texto.push(partes[j])
        }
        const grande = titulo.length <= 24
        const alto = 8 + (grande ? 16 : 12) + texto.length * 10 + 4
        abrirEscena()
        const panel = sprites.create(image.create(ANCHO_PANEL, alto), SpriteKind.Player)
        panel.z = 100
        panel.setPosition(160, 240 - Math.idiv(alto, 2) - 4)
        panel.image.fill(1)
        panel.image.drawRect(0, 0, ANCHO_PANEL, alto, 12)
        panel.image.print(titulo, 8, 6, 12, grande ? image.scaledFont(image.font8, 2) : image.font8)
        let y = 8 + (grande ? 16 : 12)
        for (let i = 0; i < texto.length; i++) {
            panel.image.print(texto[i], 8, y, 15, image.font8)
            y += 10
        }
        terminado = true
        espera = "final"
        emitir()
        while (true) {
            pause(1000)
        }
    }
}
