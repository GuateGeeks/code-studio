// Follow Geeky: en la feria de la escuela, Geeky sigue instrucciones escritas en inglés (First, Then, Last).
// Los puestos están en una cuadrícula de 3 por 2; la fila de abajo es la entrada, donde empieza Geeky.
const STAND_EN = ["apple", "banana", "mango", "flower", "tree", "water"]
const STAND_ES = ["manzanas", "bananos", "mangos", "flores", "árboles", "agua"]
const PALABRA = [["First", "Then", "Last"], ["First", "Second", "Third"]]
const PALABRA_ES = [["primero", "luego", "al final"], ["primero", "segundo", "tercero"]]
const COL_X = [80, 160, 240]
const FILA_Y = [114, 174, 212]
const ANCLA_X = [55, 160, 265]
// Cada ítem es [serie de palabras, puesto 1, puesto 2, puesto 3, y el orden en que se escriben los tres pasos].
const APLICAR_ITEMS: number[][] = [[0, 0, 1, 2, 0, 1, 2], [0, 3, 0, 4, 2, 0, 1], [1, 5, 2, 1, 1, 2, 0]]
const SERIE_A: number[][] = [[0, 2, 5, 4, 0, 1, 2], [0, 4, 0, 1, 2, 0, 1], [1, 3, 5, 2, 0, 1, 2], [1, 0, 4, 3, 1, 2, 0], [0, 5, 1, 3, 1, 2, 0]]
const SERIE_B: number[][] = [[0, 4, 2, 0, 0, 1, 2], [0, 1, 5, 0, 2, 0, 1], [1, 2, 3, 1, 2, 1, 0], [1, 5, 4, 2, 1, 0, 2], [0, 3, 0, 5, 2, 1, 0]]
const PUESTOS: Image[] = [sprites.gg.manzana, sprites.gg.banano, sprites.gg.mango, sprites.gg.flor, sprites.gg.arbol, sprites.gg.gota]

let cx = 1
let cy = 2
let libre = false
let verNombre = false
let rutas: string[] = []
let cumplidas: boolean[] = []
let pedidas: string[] = []

scene.setBackgroundImage(sprites.gg.fondoMercado)
for (let i = 0; i < 6; i++) {
    let puesto = sprites.create(PUESTOS[i], SpriteKind.Food)
    puesto.x = COL_X[i % 3]
    puesto.y = FILA_Y[Math.idiv(i, 3)] - 30
}
let geeky = sprites.create(sprites.gg.geeky, SpriteKind.Player)

function puestoAqui(): number {
    if (cy == 2) {
        return 6
    }
    return cy * 3 + cx
}

function nombreAqui(): string {
    let p = puestoAqui()
    if (p == 6) {
        return "entrance"
    }
    return STAND_EN[p]
}

function colocar() {
    geeky.x = COL_X[cx]
    geeky.y = FILA_Y[cy]
    if (verNombre) {
        geeky.sayText(nombreAqui())
    }
}

function irAEntrada() {
    cx = 1
    cy = 2
    colocar()
}

function mover(dx: number, dy: number) {
    if (libre) {
        cx = Math.max(0, Math.min(2, cx + dx))
        cy = Math.max(0, Math.min(2, cy + dy))
        colocar()
    }
}

controller.right.onEvent(ControllerButtonEvent.Pressed, function () {
    mover(1, 0)
})
controller.left.onEvent(ControllerButtonEvent.Pressed, function () {
    mover(-1, 0)
})
controller.up.onEvent(ControllerButtonEvent.Pressed, function () {
    mover(0, -1)
})
controller.down.onEvent(ControllerButtonEvent.Pressed, function () {
    mover(0, 1)
})

function oracion(item: number[], paso: number): string {
    return PALABRA[item[0]][paso] + ", go to the " + STAND_EN[item[1 + paso]] + " stand."
}

// Tres notas con un paso cada una, escritas en el orden del ítem, que puede no ser el orden de los pasos.
function ponerNotas(item: number[]) {
    sprites.destroyAllSpritesOfKind(SpriteKind.Projectile)
    for (let i = 0; i < 3; i++) {
        let nota = sprites.create(sprites.gg.punto, SpriteKind.Projectile)
        nota.x = ANCLA_X[i]
        nota.y = 56
        nota.sayText(oracion(item, item[4 + i]))
    }
}

function quitarNotas() {
    sprites.destroyAllSpritesOfKind(SpriteKind.Projectile)
}

function irA(destinoX: number, destinoY: number) {
    while (cy != destinoY) {
        if (cy < destinoY) {
            cy += 1
        } else {
            cy -= 1
        }
        colocar()
        pause(350)
    }
    while (cx != destinoX) {
        if (cx < destinoX) {
            cx += 1
        } else {
            cx -= 1
        }
        colocar()
        pause(350)
    }
}

function pistaPaso(item: number[], paso: number): string {
    let palabra = PALABRA[item[0]][paso]
    return "Ahora toca el paso que dice «" + palabra + "» (" + PALABRA_ES[item[0]][paso] + "). Búscalo en las notas y lee a dónde ir. Inténtalo otra vez."
}

function explorar() {
    experiencias.fase(FaseExperiencia.Explorar)
    experiencias.decir("Es la feria de tu escuela. Hay seis puestos y Geeky entra por la puerta. Es un modelo en la pantalla.")
    experiencias.decir("Mueve a Geeky con las flechas. Mira el nombre de cada puesto en inglés. Cuando termines, pulsa A.")
    verNombre = true
    libre = true
    colocar()
    experiencias.confirmar()
    libre = false
}

function construir() {
    experiencias.fase(FaseExperiencia.Construir)
    verNombre = false
    geeky.sayText("")
    irAEntrada()
    experiencias.decir("Una instrucción escrita te dice qué hacer, paso por paso. Mira esta: tiene tres pasos.")
    ponerNotas([0, 0, 1, 2, 0, 1, 2])
    experiencias.decir("First, go to the apple stand. Then, go to the banana stand. Last, go to the mango stand.")
    experiencias.decir("First significa primero. Then significa luego. Last significa al final. Estas palabras te dicen el orden.")
    experiencias.decir("También hay Second, que es segundo, y Third, que es tercero. Go to significa ve a. Stand es puesto.")
    irA(0, 0)
    experiencias.decir("First: apple stand, el puesto de manzanas.")
    irA(1, 0)
    experiencias.decir("Then: banana stand, el puesto de bananos.")
    irA(2, 0)
    experiencias.decir("Last: mango stand, el puesto de mangos. Geeky cumplió la instrucción.")
    quitarNotas()
    experiencias.decir("Ojo: a veces los pasos no están escritos en orden. Haz primero el que dice First, luego el que dice Then o Second, y al final el que dice Last o Third.")
}

function aplicar() {
    experiencias.fase(FaseExperiencia.Aplicar)
    experiencias.decir("Ahora sigue tú las instrucciones. Mueve a Geeky al puesto y pulsa A. Si te equivocas, tendrás una pista.")
    for (let i = 0; i < APLICAR_ITEMS.length; i++) {
        let item = APLICAR_ITEMS[i]
        irAEntrada()
        ponerNotas(item)
        for (let paso = 0; paso < 3; paso++) {
            libre = true
            let listo = false
            while (!listo) {
                experiencias.confirmar()
                if (puestoAqui() == item[1 + paso]) {
                    listo = true
                } else {
                    libre = false
                    experiencias.todaviaNo(pistaPaso(item, paso))
                    libre = true
                }
            }
            libre = false
            experiencias.decir("Bien. Cumpliste el paso " + (paso + 1) + ": " + PALABRA[item[0]][paso] + ", " + STAND_EN[item[1 + paso]] + ".")
        }
    }
    quitarNotas()
}

function comprobar() {
    experiencias.comprobar()
    experiencias.decir("Ahora, sin pistas: cinco instrucciones, con tres pasos cada una. Necesitas 4 aciertos.")
    let preguntas = SERIE_A
    if (experiencias.serieActual() == 1) {
        preguntas = SERIE_B
    }
    rutas = []
    cumplidas = []
    pedidas = []
    for (let i = 0; i < preguntas.length; i++) {
        let item = preguntas[i]
        irAEntrada()
        ponerNotas(item)
        let ruta = ""
        let pedido = ""
        let todos = true
        for (let paso = 0; paso < 3; paso++) {
            libre = true
            experiencias.confirmar()
            libre = false
            if (paso > 0) {
                ruta = ruta + ", "
                pedido = pedido + ", "
            }
            ruta = ruta + nombreAqui()
            pedido = pedido + STAND_EN[item[1 + paso]]
            if (puestoAqui() != item[1 + paso]) {
                todos = false
            }
        }
        experiencias.anotar(todos)
        rutas.push(ruta)
        cumplidas.push(todos)
        pedidas.push(pedido)
        geeky.sayText("Anotado")
        pause(700)
        geeky.sayText("")
    }
    quitarNotas()
}

function reflexionar() {
    experiencias.fase(FaseExperiencia.Reflexionar)
    geeky.sayText("")
    let respuesta = experiencias.elegir("En una instrucción, ¿qué te dice la palabra Then?", ["Que lo haces luego, después del primero", "Que lo haces al final de todos"], EjeEleccion.Vertical)
    if (respuesta == 0) {
        experiencias.decir("Así es. Then significa luego: va después de First.")
    } else {
        experiencias.todaviaNo("Then significa luego. El paso que va al final dice Last.")
    }
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
geeky.destroy()
let lineas: string[] = ["Cumpliste " + experiencias.aciertos() + " de 5 instrucciones. Esta es tu ruta en cada una:"]
for (let i = 0; i < rutas.length; i++) {
    if (cumplidas[i]) {
        lineas.push((i + 1) + ". " + rutas[i] + ": cumplida.")
    } else {
        lineas.push((i + 1) + ". " + rutas[i] + ": no cumplida. Pedía: " + pedidas[i] + ".")
    }
}
experiencias.final("Ruta en la feria", lineas)
