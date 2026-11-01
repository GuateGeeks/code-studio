// Rescate en el plano: la radio dicta pares ordenados y la brigada busca a los animales.
const CELDA = 20
const OX = 160
const OY = 120
const practica: number[][] = [[2, 3], [-3, 2], [3, -2]]
const serieA: number[][] = [[3, 2], [-4, 3], [-2, -2], [5, -1], [0, 3]]
const serieB: number[][] = [[6, 4], [-5, 2], [-3, -2], [2, -2], [-6, 0]]
const animales: Image[] = [sprites.gg.pollito, sprites.gg.perro, sprites.gg.cabra]
let rescatados: number[][] = []
let cx = 0
let cy = 0
let libre = false
let verCoordenada = false

scene.setBackgroundImage(sprites.gg.fondoPlano)
let brigada = sprites.create(sprites.gg.mira, SpriteKind.Player)
let listo = false

function colocar() {
    brigada.x = OX + cx * CELDA
    brigada.y = OY - cy * CELDA
    if (verCoordenada) {
        brigada.sayText("(" + cx + ", " + cy + ")")
    }
}

function irAlOrigen() {
    cx = 0
    cy = 0
    colocar()
}

function mover(dx: number, dy: number) {
    if (libre) {
        cx = Math.max(-7, Math.min(7, cx + dx))
        cy = Math.max(-5, Math.min(5, cy + dy))
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

function ponerAnimal(n: number, x: number, y: number) {
    let animal = sprites.create(animales[n % 3], SpriteKind.Food)
    animal.x = OX + x * CELDA
    animal.y = OY - y * CELDA
}

function dictar(x: number, y: number) {
    brigada.sayText("Ve a (" + x + ", " + y + ")")
}

function pista(x: number, y: number): string {
    if (cx != x) {
        if ((cx > 0 && x < 0) || (cx < 0 && x > 0)) {
            return "Revisa el signo de la primera coordenada e inténtalo otra vez."
        }
        return "Revisa la primera coordenada: x cuenta pasos a la derecha o a la izquierda. Inténtalo otra vez."
    }
    if ((cy > 0 && y < 0) || (cy < 0 && y > 0)) {
        return "Revisa el signo de la segunda coordenada e inténtalo otra vez."
    }
    return "Revisa la segunda coordenada: y cuenta pasos hacia arriba o hacia abajo. Inténtalo otra vez."
}

function explorar() {
    experiencias.fase(FaseExperiencia.Explorar)
    experiencias.decir("Un aguacero dispersó a los animales de la aldea.")
    experiencias.decir("Geeky te pide ayuda: eres de la brigada de rescate. La mira marca dónde buscas.")
    experiencias.decir("Mueve la mira con las flechas. Mira cómo cambian los dos números. Cuando termines, pulsa A.")
    verCoordenada = true
    libre = true
    colocar()
    experiencias.confirmar()
    libre = false
}

function construir() {
    experiencias.fase(FaseExperiencia.Construir)
    verCoordenada = false
    brigada.sayText("")
    irAlOrigen()
    experiencias.decir("La radio avisa: hay un pollito en (3, 2). Sigue la mira.")
    experiencias.decir("El primer número dice cuántos pasos das a la derecha: 3.")
    for (let i = 0; i < 3; i++) {
        cx += 1
        colocar()
        pause(500)
    }
    experiencias.decir("El segundo número dice cuántos pasos subes: 2.")
    for (let i = 0; i < 2; i++) {
        cy += 1
        colocar()
        pause(500)
    }
    ponerAnimal(0, 3, 2)
    experiencias.decir("¡Encontraste al pollito! Si el primer número es negativo, vas a la izquierda. Si el segundo es negativo, bajas.")
    experiencias.decir("Dos números en orden, (x, y), se llaman par ordenado. Primero va x y después y.")
    sprites.destroyAllSpritesOfKind(SpriteKind.Food)
}

function aplicar() {
    experiencias.fase(FaseExperiencia.Aplicar)
    experiencias.decir("Ahora la radio te dicta el punto. Mueve la mira y pulsa A. Si te equivocas, tendrás una pista.")
    for (let i = 0; i < practica.length; i++) {
        let x = practica[i][0]
        let y = practica[i][1]
        irAlOrigen()
        dictar(x, y)
        libre = true
        listo = false
        while (!listo) {
            experiencias.confirmar()
            if (cx == x && cy == y) {
                listo = true
            } else {
                libre = false
                experiencias.todaviaNo(pista(x, y))
                libre = true
            }
        }
        libre = false
        ponerAnimal(i + 1, x, y)
        experiencias.decir("¡Lo encontraste en (" + x + ", " + y + ")!")
    }
    sprites.destroyAllSpritesOfKind(SpriteKind.Food)
}

function comprobar() {
    experiencias.comprobar()
    experiencias.decir("Ahora, sin pistas: cinco rescates. Necesitas 4 aciertos.")
    let preguntas = serieA
    if (experiencias.serieActual() == 1) {
        preguntas = serieB
    }
    rescatados = []
    for (let i = 0; i < preguntas.length; i++) {
        let x = preguntas[i][0]
        let y = preguntas[i][1]
        irAlOrigen()
        dictar(x, y)
        libre = true
        experiencias.confirmar()
        libre = false
        let acierto = cx == x && cy == y
        experiencias.anotar(acierto)
        if (acierto) {
            rescatados.push([x, y])
        }
        brigada.sayText("Anotado")
        pause(700)
    }
}

function reflexionar() {
    experiencias.fase(FaseExperiencia.Reflexionar)
    brigada.sayText("")
    let respuesta = experiencias.elegir("En el par (4, 1), ¿qué número va primero?", ["El de y: cuánto subes o bajas", "El de x: cuánto avanzas a los lados"], EjeEleccion.Vertical)
    if (respuesta == 1) {
        experiencias.decir("Así es. En un par ordenado va primero x y después y.")
    } else {
        experiencias.todaviaNo("En un par ordenado va primero x, que mueve a la derecha o a la izquierda.")
    }
}

function mostrarMapa() {
    brigada.destroy()
    for (let i = 0; i < rescatados.length; i++) {
        let x = rescatados[i][0]
        let y = rescatados[i][1]
        let animal = sprites.create(animales[i % 3], SpriteKind.Food)
        animal.x = OX + x * CELDA
        animal.y = OY - y * CELDA
        animal.sayText("(" + x + ", " + y + ")")
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
mostrarMapa()
experiencias.final("¡Rescate terminado!", ["Rescataste " + experiencias.aciertos() + " de 5 animales.", "Cada animal está en el punto (x, y) que la radio dictó."])
