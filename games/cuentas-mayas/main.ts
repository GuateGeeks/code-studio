// Cuentas mayas en el mercado: armas numerales con puntos, barras y ceros para anotar las ventas del día.
const CX = 150
const MARCA_X = 62
const FILAS_Y = [56, 94, 132]
const NOMBRES_FILA = ["de arriba", "del medio", "de abajo"]
const VALOR_FILA = [400, 20, 1]
const PALETA_X = [110, 150, 195, 245]
const PALETA_Y = 210
const NOMBRES_SIMBOLO = ["Punto: vale 1", "Barra: vale 5", "Cero: vale 0", "Seguir"]
const IMAGENES_PALETA: Image[] = [sprites.gg.punto, sprites.gg.barra, sprites.gg.cero, sprites.gg.flecha]
let tablero: number[] = [-1, -1, -1]
let fila = 2
let simbolo = 0
let activo = false
let ultimaPista = ""
let marcas: Sprite[] = []
let paleta: Sprite[] = []

scene.setBackgroundImage(sprites.gg.fondoMercado)
let cursor = sprites.create(sprites.gg.mira, SpriteKind.Player)
cursor.z = 10
let tablillaMeta = sprites.create(sprites.gg.casilla, SpriteKind.Player)
let tablillaValor = sprites.create(sprites.gg.casilla, SpriteKind.Player)
let mensaje = ""
let encontrada = false
let listo = false
let correcto = false
tablillaMeta.setPosition(240, 60)
tablillaValor.setPosition(240, 132)
for (let i = 0; i < 3; i++) {
    let marca = sprites.create(sprites.gg.flecha, SpriteKind.Player)
    marca.setPosition(MARCA_X, FILAS_Y[i])
    marcas.push(marca)
}
for (let i = 0; i < 4; i++) {
    let pieza = sprites.create(IMAGENES_PALETA[i], SpriteKind.Player)
    pieza.setPosition(PALETA_X[i], PALETA_Y)
    paleta.push(pieza)
}

function valorTotal(): number {
    return Math.max(tablero[0], 0) * 400 + Math.max(tablero[1], 0) * 20 + Math.max(tablero[2], 0)
}

function puntosSueltos(v: number): number {
    let puntos = v
    while (puntos >= 5) {
        puntos -= 5
    }
    return puntos
}

function dibujarFila(r: number) {
    let v = tablero[r]
    let y = FILAS_Y[r] - 17
    if (v == 0) {
        let cero = sprites.create(sprites.gg.cero, SpriteKind.Food)
        cero.setPosition(CX, y + 12)
    } else if (v > 0) {
        let puntos = puntosSueltos(v)
        let barras = (v - puntos) / 5
        for (let i = 0; i < puntos; i++) {
            let punto = sprites.create(sprites.gg.punto, SpriteKind.Food)
            punto.setPosition(CX - 5 * (puntos - 1) + 10 * i, y + 4)
        }
        let primera = y + 4
        if (puntos > 0) {
            primera = y + 14
        }
        for (let i = 0; i < barras; i++) {
            let barra = sprites.create(sprites.gg.barra, SpriteKind.Food)
            barra.setPosition(CX, primera + 8 * i)
        }
    }
}

function rotular(meta: string, conValor: boolean) {
    for (let r = 0; r < 3; r++) {
        let texto = "Posición " + VALOR_FILA[r]
        if (activo && r == fila) {
            texto = "> Posición " + VALOR_FILA[r]
        }
        marcas[r].sayText(texto)
    }
    tablillaMeta.setFlag(SpriteFlag.Invisible, meta == "")
    tablillaMeta.sayText(meta)
    tablillaValor.setFlag(SpriteFlag.Invisible, !conValor)
    if (conValor) {
        tablillaValor.sayText("Valor: " + valorTotal())
    } else {
        tablillaValor.sayText("")
    }
}

let metaActual = ""
let conValorActual = true

function dibujar() {
    sprites.destroyAllSpritesOfKind(SpriteKind.Food)
    for (let r = 0; r < 3; r++) {
        dibujarFila(r)
    }
    rotular(metaActual, conValorActual)
}

function mostrar(arriba: number, medio: number, abajo: number) {
    tablero = [arriba, medio, abajo]
    dibujar()
}

function controles(visibles: boolean) {
    cursor.setFlag(SpriteFlag.Invisible, !visibles)
    for (let i = 0; i < 4; i++) {
        paleta[i].setFlag(SpriteFlag.Invisible, !visibles)
    }
    if (!visibles) {
        cursor.sayText("")
    }
}

function ponerCursor() {
    cursor.setPosition(PALETA_X[simbolo], PALETA_Y)
    cursor.sayText(NOMBRES_SIMBOLO[simbolo])
}

controller.left.onEvent(ControllerButtonEvent.Pressed, function () {
    if (activo) {
        simbolo = Math.max(0, simbolo - 1)
        ponerCursor()
    }
})
controller.right.onEvent(ControllerButtonEvent.Pressed, function () {
    if (activo) {
        simbolo = Math.min(3, simbolo + 1)
        ponerCursor()
    }
})
controller.up.onEvent(ControllerButtonEvent.Pressed, function () {
    if (activo) {
        fila = Math.max(0, fila - 1)
        dibujar()
    }
})
controller.down.onEvent(ControllerButtonEvent.Pressed, function () {
    if (activo) {
        fila = Math.min(2, fila + 1)
        dibujar()
    }
})

function colocar(): string {
    mensaje = ""
    let v = Math.max(tablero[fila], 0)
    if (simbolo == 0) {
        if (puntosSueltos(v) >= 4) {
            mensaje = "Caben 4 puntos. Cambia 5 por una barra."
        } else {
            tablero[fila] = v + 1
        }
    } else if (simbolo == 1) {
        if (v >= 15) {
            mensaje = "Caben 3 barras."
        } else {
            tablero[fila] = v + 5
        }
    } else {
        tablero[fila] = 0
    }
    return mensaje
}

function coincide(esperado: number[]): boolean {
    let correcto = true
    for (let r = 0; r < 3; r++) {
        if (esperado[r] >= 0) {
            if (tablero[r] != esperado[r]) {
                correcto = false
            }
        } else if (tablero[r] > 0) {
            correcto = false
        }
    }
    return correcto
}

function pistaDe(esperado: number[]): string {
    let pista = "Revisa cada posición. Un punto vale 1 y una barra vale 5. Arma el numeral otra vez."
    encontrada = false
    for (let i = 0; i < 3; i++) {
        let r = 2 - i
        if (!encontrada && esperado[r] >= 0 && tablero[r] != esperado[r]) {
            encontrada = true
            if (tablero[r] < 0) {
                pista = "Falta la posición " + NOMBRES_FILA[r] + ". Si no hay unidades, ahí va el cero. Arma el numeral otra vez."
            } else {
                pista = "Revisa la posición " + NOMBRES_FILA[r] + ": ahí necesitas símbolos que sumen " + esperado[r] + ". Una barra vale 5 y un punto vale 1. Arma el numeral otra vez."
            }
        } else if (!encontrada && esperado[r] < 0 && tablero[r] > 0) {
            encontrada = true
            pista = "En la posición " + NOMBRES_FILA[r] + " no va nada. Arma el numeral otra vez."
        }
    }
    return pista
}

// El estudiante arma el numeral: flechas eligen la posición y el símbolo, A lo coloca, y «Seguir» entrega.
function componer(meta: string, esperado: number[]): boolean {
    tablero = [-1, -1, -1]
    fila = 2
    simbolo = 0
    metaActual = meta
    conValorActual = true
    controles(true)
    activo = true
    dibujar()
    ponerCursor()
    listo = false
    while (!listo) {
        experiencias.confirmar()
        if (simbolo == 3) {
            listo = true
        } else {
            let mensaje = colocar()
            dibujar()
            if (mensaje != "") {
                cursor.sayText(mensaje)
            } else {
                ponerCursor()
            }
        }
    }
    activo = false
    controles(false)
    ultimaPista = pistaDe(esperado)
    return coincide(esperado)
}

function mostrarLectura(arriba: number, medio: number, abajo: number) {
    activo = false
    controles(false)
    metaActual = ""
    conValorActual = false
    mostrar(arriba, medio, abajo)
}

function explorar() {
    experiencias.fase(FaseExperiencia.Explorar)
    experiencias.decir("Tienes un puesto en el mercado. Hoy anotas las ventas con numerales mayas.")
    experiencias.decir("Es un modelo en la pantalla: las ventas son inventadas.")
    experiencias.decir("Los numerales mayas usan puntos, barras y un signo para el cero. Pruébalos sin riesgo.")
    experiencias.decir("Arriba y abajo eligen la posición. Izquierda y derecha eligen el símbolo. A lo coloca.")
    experiencias.decir("Cuando termines, elige la flecha «Seguir» y pulsa A.")
    tablero = [-1, -1, -1]
    fila = 2
    simbolo = 0
    metaActual = "Prueba tú"
    conValorActual = true
    controles(true)
    activo = true
    dibujar()
    ponerCursor()
    listo = false
    while (!listo) {
        experiencias.confirmar()
        if (simbolo == 3) {
            listo = true
        } else {
            let mensaje = colocar()
            dibujar()
            if (mensaje != "") {
                cursor.sayText(mensaje)
            } else {
                ponerCursor()
            }
        }
    }
    activo = false
    controles(false)
}

function construir() {
    experiencias.fase(FaseExperiencia.Construir)
    activo = false
    controles(false)
    conValorActual = true
    metaActual = ""
    mostrar(-1, -1, 1)
    experiencias.decir("Un punto vale 1.")
    mostrar(-1, -1, 5)
    experiencias.decir("Una barra vale 5.")
    mostrar(-1, -1, 7)
    experiencias.decir("Una barra y dos puntos valen 7. Los puntos van arriba de la barra.")
    mostrar(-1, -1, 0)
    experiencias.decir("El cero tiene su propio dibujo y vale 0.")
    mostrar(-1, 1, 0)
    experiencias.decir("Cada posición vale 20 veces la de abajo. Un punto en la posición del medio vale 20.")
    mostrar(-1, 2, 7)
    experiencias.decir("Dos puntos en el medio valen 40. Abajo hay 7. Juntos son 47.")
    mostrar(1, 0, 0)
    experiencias.decir("La tercera posición vale 400. Un punto arriba vale 400.")
    experiencias.decir("Un numeral se lee de arriba hacia abajo, sumando el valor de cada posición.")
    experiencias.decir("Ahora las series. En la de 20 en 20, la posición del medio gana un punto cada vez.")
    for (let i = 0; i < 3; i++) {
        mostrar(-1, i + 1, 0)
        pause(900)
    }
    experiencias.decir("20, 40, 60. Cada punto nuevo suma 20.")
    experiencias.decir("En la de 100 en 100, cada barra del medio vale 100.")
    for (let i = 0; i < 3; i++) {
        mostrar(-1, 5 * (i + 1), 0)
        pause(900)
    }
    mostrar(1, 0, 0)
    experiencias.decir("100, 200, 300 y 400. Con tres barras llegas a 300. El siguiente, 400, sube un punto a la tercera posición.")
}

function aplicar() {
    experiencias.fase(FaseExperiencia.Aplicar)
    experiencias.decir("Ahora practica. Si te equivocas, tendrás una pista.")
    correcto = false
    experiencias.decir("Anota la venta de 26 panes. Arma el numeral.")
    while (!correcto) {
        correcto = componer("Venta: 26 panes", [-1, 1, 6])
        if (!correcto) {
            experiencias.todaviaNo(ultimaPista)
        }
    }
    correcto = false
    while (!correcto) {
        mostrarLectura(-1, 1, 13)
        let respuesta = experiencias.elegir("Lee el numeral. ¿Qué número es?", ["14", "33", "63"], EjeEleccion.Vertical)
        correcto = respuesta == 1
        if (!correcto) {
            experiencias.todaviaNo("Abajo suma las barras y los puntos: son 13. En el medio, el punto vale 20. Inténtalo otra vez.")
        }
    }
    correcto = false
    experiencias.decir("Serie de 100 en 100: 100, 200, 300. Arma el número que sigue.")
    while (!correcto) {
        correcto = componer("Serie: 100, 200, 300, ...", [1, 0, 0])
        if (!correcto) {
            experiencias.todaviaNo(ultimaPista)
        }
    }
}

function comprobar() {
    experiencias.comprobar()
    experiencias.decir("Ahora, sin pistas: cinco anotaciones. Necesitas 4 aciertos.")
    if (experiencias.serieActual() == 0) {
        experiencias.anotar(componer("Venta: 45 tomates", [-1, 2, 5]))
        mostrarLectura(-1, 4, 18)
        let lectura = experiencias.elegir("Lee el numeral. ¿Qué número es?", ["22", "98", "118"], EjeEleccion.Vertical)
        experiencias.anotar(lectura == 1)
        experiencias.anotar(componer("Venta: 420 limones", [1, 1, 0]))
        mostrarLectura(-1, 15, 0)
        lectura = experiencias.elegir("Serie de 100 en 100. ¿Qué número sigue?", ["320", "310", "400"], EjeEleccion.Vertical)
        experiencias.anotar(lectura == 2)
        experiencias.anotar(componer("Serie: 60, 80, ...", [-1, 5, 0]))
    } else {
        experiencias.anotar(componer("Venta: 65 naranjas", [-1, 3, 5]))
        mostrarLectura(-1, 5, 19)
        let lectura = experiencias.elegir("Lee el numeral. ¿Qué número es?", ["119", "24", "104"], EjeEleccion.Vertical)
        experiencias.anotar(lectura == 0)
        experiencias.anotar(componer("Venta: 405 panes", [1, 0, 5]))
        mostrarLectura(-1, 10, 0)
        lectura = experiencias.elegir("Serie de 100 en 100. ¿Qué número sigue?", ["300", "210", "220"], EjeEleccion.Vertical)
        experiencias.anotar(lectura == 0)
        experiencias.anotar(componer("Serie: 80, 100, ...", [-1, 6, 0]))
    }
}

function reflexionar() {
    experiencias.fase(FaseExperiencia.Reflexionar)
    mostrarLectura(-1, 1, 0)
    let respuesta = experiencias.elegir("¿Cuánto vale un punto en la posición del medio?", ["1", "20", "400"], EjeEleccion.Vertical)
    if (respuesta == 1) {
        experiencias.decir("Así es. En el medio, cada punto vale 20.")
    } else {
        experiencias.todaviaNo("En el medio, cada posición vale 20 veces la de abajo. Un punto ahí vale 20.")
    }
}

function cierre() {
    let ventas = "Hoy anotaste 45 tomates y 420 limones."
    let cuenta = 465
    mostrarLectura(1, 3, 5)
    if (experiencias.serieActual() == 1) {
        ventas = "Hoy anotaste 65 naranjas y 405 panes."
        cuenta = 470
        mostrarLectura(1, 3, 10)
    }
    experiencias.final("¡Cuenta del día!", [ventas, "La suma es " + cuenta + ". Arriba la ves en numeral maya.", "Acertaste " + experiencias.aciertos() + " de 5."])
}

explorar()
construir()
let aprobado = false
while (!aprobado) {
    aplicar()
    comprobar()
    aprobado = experiencias.cerrarComprobacion()
}
reflexionar()
cierre()
