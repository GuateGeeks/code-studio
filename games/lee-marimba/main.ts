// Lee la marimba: el conjunto de la escuela ensaya una pieza original, compás por compás.
// Cada compás es una lista de pares [nota, duración]: la nota es 0 Sol, 1 La, 2 Si, 3 Do, 4 Re; la duración es 1 (negra) o 2 (blanca).
// Los cuatro pulsos de cada compás se reparten así: 1 + 1 + 2, 2 + 1 + 1, 1 + 1 + 1 + 1 o 2 + 2.
const NOM = ["Sol", "La", "Si", "Do", "Re"]
const FREQ = [392, 440, 494, 523, 587]
const BARRA_X = [80, 120, 160, 200, 240]
const CABEZA_Y = [72, 69, 66, 63, 60]
const EJEMPLO: number[] = [1, 1, 0, 1, 0, 2]
const APLICAR_COMPASES: number[][] = [[0, 2, 1, 1, 2, 1], [1, 1, 2, 1, 3, 2], [3, 1, 1, 1, 0, 2]]
const SERIE_A: number[][] = [[0, 1, 1, 1, 2, 2], [2, 1, 1, 1, 0, 2], [3, 1, 2, 1, 1, 1, 0, 1], [1, 2, 2, 1, 3, 1], [4, 1, 2, 1, 0, 2]]
const SERIE_B: number[][] = [[2, 2, 3, 1, 4, 1], [3, 1, 2, 1, 1, 2], [0, 2, 2, 2], [4, 1, 3, 1, 2, 1, 1, 1], [1, 1, 0, 1, 2, 2]]

let col = 2
let dur = 1
let libre = false
let partitura: string[] = []
let tocado: string[] = []
let acertado: boolean[] = []

scene.setBackgroundImage(sprites.gg.fondoMarimba)
for (let i = 0; i < 6; i++) {
    let tramo = sprites.create(sprites.gg.pauta, SpriteKind.Enemy)
    tramo.x = 80 + i * 32
    tramo.y = 66
}
let barraIzquierda = sprites.create(sprites.gg.compas, SpriteKind.Enemy)
barraIzquierda.x = 65
barraIzquierda.y = 66
let barraDerecha = sprites.create(sprites.gg.compas, SpriteKind.Enemy)
barraDerecha.x = 255
barraDerecha.y = 66
for (let i = 0; i < 5; i++) {
    let tecla = sprites.create(sprites.gg.tecla, SpriteKind.Enemy)
    tecla.x = BARRA_X[i]
    tecla.y = 124
    tecla.sayText(NOM[i])
}
let geeky = sprites.create(sprites.gg.geeky, SpriteKind.Player)
let texto = ""
let inicio = 0
let listo = false
let tocadas: number[] = []
geeky.y = 186

function textoDuracion(d: number): string {
    if (d == 1) {
        return "negra"
    }
    return "blanca"
}

function textoNota(n: number, d: number): string {
    return NOM[n] + " " + textoDuracion(d)
}

function textoCompas(compas: number[]): string {
    texto = ""
    let n = Math.idiv(compas.length, 2)
    for (let i = 0; i < n; i++) {
        if (i > 0) {
            texto = texto + ", "
        }
        texto = texto + textoNota(compas[2 * i], compas[2 * i + 1])
    }
    return texto
}

function colocar() {
    geeky.x = BARRA_X[col]
    if (dur == 1) {
        geeky.sayText(NOM[col] + ", negra: 1 pulso")
    } else {
        geeky.sayText(NOM[col] + ", blanca: 2 pulsos")
    }
}

function centrar() {
    col = 2
    dur = 1
    colocar()
}

function mover(dc: number, dd: number) {
    if (libre) {
        col = Math.max(0, Math.min(4, col + dc))
        if (dd > 0) {
            dur = 2
        } else if (dd < 0) {
            dur = 1
        }
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
    mover(0, 1)
})
controller.down.onEvent(ControllerButtonEvent.Pressed, function () {
    mover(0, -1)
})

// El sonido acompaña, pero nada del juego depende de oírlo: cada nota también se ve y lleva su nombre.
function sonar() {
    music.playTone(FREQ[col], 200 * dur)
}

// Pulso en el que empieza la nota k del compás.
function inicioDe(compas: number[], k: number): number {
    inicio = 0
    for (let i = 0; i < k; i++) {
        inicio += compas[2 * i + 1]
    }
    return inicio
}

function mostrarCompas(compas: number[], conNombres: boolean) {
    sprites.destroyAllSpritesOfKind(SpriteKind.Projectile)
    sprites.destroyAllSpritesOfKind(SpriteKind.Food)
    let n = Math.idiv(compas.length, 2)
    for (let k = 0; k < n; k++) {
        let imagen = sprites.gg.negra
        if (compas[2 * k + 1] == 2) {
            imagen = sprites.gg.blanca
        }
        let cual = compas[2 * k]
        let figura = sprites.create(imagen, SpriteKind.Projectile)
        figura.x = 82 + 44 * inicioDe(compas, k)
        figura.y = CABEZA_Y[cual] - 7
        if (conNombres) {
            figura.sayText(NOM[cual])
        }
    }
}

function anillo(compas: number[], k: number) {
    sprites.destroyAllSpritesOfKind(SpriteKind.Food)
    let marca = sprites.create(sprites.gg.mira, SpriteKind.Food)
    marca.x = 80 + 44 * inicioDe(compas, k)
    marca.y = CABEZA_Y[compas[2 * k]]
}

function pista(nota: number, d: number): string {
    if (col != nota) {
        return "La nota del anillo se llama " + NOM[nota] + ". Busca su tecla en la marimba. Inténtalo otra vez."
    }
    if (d == 2) {
        return "La nota del anillo es una blanca: es hueca y dura 2 pulsos. Pulsa arriba para elegir blanca. Inténtalo otra vez."
    }
    return "La nota del anillo es una negra: es llena y dura 1 pulso. Pulsa abajo para elegir negra. Inténtalo otra vez."
}

function explorar() {
    experiencias.fase(FaseExperiencia.Explorar)
    experiencias.decir("El conjunto de marimba de la escuela ensaya y Geeky toca contigo. Es un modelo en la pantalla.")
    experiencias.decir("Izquierda y derecha cambian de tecla. Arriba elige una nota blanca y abajo, una negra. Pulsa A para tocar. Toca tres notas.")
    for (let i = 0; i < 3; i++) {
        centrar()
        libre = true
        experiencias.confirmar()
        libre = false
        sonar()
    }
    experiencias.decir("Tocaste tres notas. Así se toca cada una: tecla, duración y A.")
}

function construir() {
    experiencias.fase(FaseExperiencia.Construir)
    centrar()
    experiencias.decir("Una partitura se lee en la pauta: cinco líneas. Las notas se escriben sobre las líneas y entre ellas.")
    experiencias.decir("Cada nota tiene un nombre. Aquí usamos cinco: Sol, La, Si, Do y Re. La marimba tiene una tecla para cada una.")
    experiencias.decir("En una partitura de verdad, al inicio de la pauta va un signo llamado clave de sol. Aquí no se dibuja: es un modelo.")
    mostrarCompas(EJEMPLO, true)
    experiencias.decir("Mira este compás: La, Sol y Sol. Sol está en la segunda línea, contando desde abajo. La, en el segundo espacio.")
    experiencias.decir("Si va en la tercera línea. Do, en el tercer espacio. Re, en la cuarta línea.")
    experiencias.decir("La forma de la nota dice cuánto dura. La negra es llena y dura 1 pulso. La blanca es hueca y dura 2 pulsos.")
    experiencias.decir("En esta pieza, cada compás junta 4 pulsos. Aquí: 1 + 1 + 2 = 4.")
    experiencias.decir("El ritmo es cuánto dura cada nota. La melodía es qué notas suenan, una tras otra. Mira el compás. Si tienes sonido, escúchalo.")
    let n = Math.idiv(EJEMPLO.length, 2)
    for (let k = 0; k < n; k++) {
        anillo(EJEMPLO, k)
        col = EJEMPLO[2 * k]
        dur = EJEMPLO[2 * k + 1]
        colocar()
        sonar()
        pause(250)
    }
    sprites.destroyAllSpritesOfKind(SpriteKind.Food)
    experiencias.decir("Ahora te toca a ti: toca los compases que ves en la pauta.")
}

function aplicar() {
    experiencias.fase(FaseExperiencia.Aplicar)
    experiencias.decir("El anillo marca la nota que sigue. Elige la tecla y la duración, y pulsa A. Si te equivocas, tendrás una pista.")
    for (let i = 0; i < APLICAR_COMPASES.length; i++) {
        let compas = APLICAR_COMPASES[i]
        mostrarCompas(compas, true)
        let n = Math.idiv(compas.length, 2)
        for (let k = 0; k < n; k++) {
            anillo(compas, k)
            let nota = compas[2 * k]
            let d = compas[2 * k + 1]
            centrar()
            libre = true
            listo = false
            while (!listo) {
                experiencias.confirmar()
                sonar()
                if (col == nota && dur == d) {
                    listo = true
                } else {
                    libre = false
                    experiencias.todaviaNo(pista(nota, d))
                    libre = true
                }
            }
            libre = false
        }
        experiencias.decir("Compás completo: " + textoCompas(compas) + ".")
    }
    sprites.destroyAllSpritesOfKind(SpriteKind.Food)
}

function comprobar() {
    experiencias.comprobar()
    experiencias.decir("Ahora, sin pistas y sin nombres sobre las notas: cinco compases. Necesitas 4 aciertos.")
    let compases = SERIE_A
    if (experiencias.serieActual() == 1) {
        compases = SERIE_B
    }
    partitura = []
    tocado = []
    acertado = []
    for (let i = 0; i < compases.length; i++) {
        let compas = compases[i]
        mostrarCompas(compas, false)
        let n = Math.idiv(compas.length, 2)
        let todas = true
        tocadas = []
        for (let k = 0; k < n; k++) {
            anillo(compas, k)
            centrar()
            libre = true
            experiencias.confirmar()
            libre = false
            sonar()
            tocadas.push(col)
            tocadas.push(dur)
            if (col != compas[2 * k] || dur != compas[2 * k + 1]) {
                todas = false
            }
        }
        experiencias.anotar(todas)
        partitura.push(textoCompas(compas))
        tocado.push(textoCompas(tocadas))
        acertado.push(todas)
        sprites.destroyAllSpritesOfKind(SpriteKind.Food)
        geeky.sayText("Anotado")
        pause(700)
    }
}

function reflexionar() {
    experiencias.fase(FaseExperiencia.Reflexionar)
    sprites.destroyAllSpritesOfKind(SpriteKind.Projectile)
    sprites.destroyAllSpritesOfKind(SpriteKind.Food)
    geeky.sayText("")
    let respuesta = experiencias.elegir("En la pauta, ¿qué te dice la forma de la nota?", ["Cuál es su nombre: Sol o La", "Cuánto dura: negra o blanca"], EjeEleccion.Vertical)
    if (respuesta == 1) {
        experiencias.decir("Así es. La forma dice cuánto dura la nota; el lugar en la pauta dice cuál es.")
    } else {
        experiencias.todaviaNo("El nombre lo dice el lugar de la nota en la pauta. La forma dice cuánto dura.")
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
let lineas: string[] = ["Acertaste " + experiencias.aciertos() + " de 5 compases. Esta es la pieza, compás por compás:"]
for (let i = 0; i < partitura.length; i++) {
    if (acertado[i]) {
        lineas.push((i + 1) + ". " + partitura[i] + ": acierto.")
    } else {
        lineas.push((i + 1) + ". " + partitura[i] + ": todavía no. Tocaste " + tocado[i] + ".")
    }
}
experiencias.final("Partitura de la marimba", lineas)
