// Mediación en el recreo: el grupo de fútbol y el grupo de voleibol quieren la misma cancha. Cada forma de afrontar el conflicto muestra su efecto.
// Formas, en el orden de las opciones: 0 gritar, 1 alejarse, 2 dialogar, 3 ceder todo.
const FORMA_OPCION = ["Gritar y quedarse con la cancha", "Alejarse y no decir nada", "Hablar, escuchar y buscar un acuerdo", "Dejar toda la cancha al otro grupo"]
const FORMA_EFECTO = [
    "Un grupo grita y se queda con la cancha. El otro grupo se enoja y no quiere escuchar. El conflicto crece.",
    "Los dos grupos se alejan y no dicen lo que quieren. La cancha queda sin usar y el problema sigue. Puede volver mañana.",
    "Cada grupo dice lo que quiere y escucha al otro. Así buscan un acuerdo. Los dos pueden jugar.",
    "Un grupo deja toda la cancha al otro. Ese grupo se queda sin jugar y puede quedar molesto. El problema no se resolvió para los dos."
]
const FORMA_PISTA = [
    "Gritar no resuelve el conflicto: el otro grupo se enoja. Prueba otra forma.",
    "Alejarse no resuelve el conflicto: el problema sigue. Prueba otra forma.",
    "Hablar y escuchar sí ayuda.",
    "Dejar toda la cancha deja a un grupo sin jugar. Prueba otra forma."
]
const FIN_FORMAS = [
    "Gritar: el otro grupo se enoja y el conflicto crece.",
    "Alejarse: el problema sigue y puede volver.",
    "Hablar y escuchar: los dos grupos juegan.",
    "Dejar toda la cancha: un grupo se queda sin jugar."
]
const REPARTO_OPCION = ["Cada grupo usa la mitad de la cancha", "Turnos: hoy uno y mañana el otro", "El grupo más grande se queda la cancha"]
const REPARTO_FINAL = ["Cada grupo usa la mitad de la cancha.", "Hoy juega un grupo y mañana el otro."]
const C_SIT = [
    "Un grupo grita para quedarse con la cancha. ¿Qué efecto tiene?",
    "Nadie habla del problema y todos se alejan. ¿Qué pasa después?",
    "¿Cuál es una propuesta para construir paz en el recreo?",
    "Un grupo deja toda la cancha al otro y no juega. ¿Qué efecto puede tener?",
    "¿Qué es dialogar?",
    "Un grupo se impone y no escucha. ¿Qué propuesta ayuda?",
    "Dos grupos hablan, escuchan y acuerdan turnos. ¿Qué efecto tiene?",
    "¿Qué ayuda a que un acuerdo se cumpla?",
    "Para construir paz, ¿qué haces cuando otro grupo habla?",
    "¿Qué es un conflicto?"
]
const C_UNO = ["Los dos grupos quedan contentos", "El problema sigue y puede volver", "Quedarse con el balón", "Ese grupo puede quedar molesto", "Hablar más fuerte que el otro", "Gritar más fuerte", "Los dos juegan y se resuelve el problema", "Que solo lo conozca un grupo", "Lo interrumpo", "Un juego con reglas"]
const C_DOS = ["El otro grupo se enoja y el conflicto crece", "Se hace un acuerdo", "Burlarse de quien pierde", "Los dos grupos juegan", "Hablar y escuchar para llegar a un acuerdo", "Escuchar a los dos grupos y acordar turnos", "Un grupo se queda sin cancha", "Que se guarde en secreto", "Escucho hasta que termina", "Una fiesta de la escuela"]
const C_TRES = ["El problema se resuelve solo", "El problema desaparece para siempre", "Turnos para usar la cancha", "No cambia nada", "No decir nada", "Dejar el problema para otro día", "Nadie vuelve a hablar", "Que los dos grupos lo conozcan", "Me voy sin responder", "Cuando dos grupos quieren cosas distintas"]
const C_OK = [1, 0, 2, 0, 1, 1, 0, 2, 1, 2]
const SERIE_A = [0, 1, 2, 3, 4]
const SERIE_B = [5, 6, 7, 8, 9]
let reparto = 0

scene.setBackgroundImage(sprites.gg.fondoEscuela)

// Dibuja la cancha y los dos grupos: cada grupo son dos personas, y la primera dice cómo está.
function colocar(izquierda: number, derecha: number, textoUno: string, textoDos: string) {
    sprites.destroyAllSpritesOfKind(SpriteKind.Food)
    let canchaUno = sprites.create(sprites.gg.cancha, SpriteKind.Food)
    canchaUno.setPosition(144, 118)
    let canchaDos = sprites.create(sprites.gg.cancha, SpriteKind.Food)
    canchaDos.setPosition(176, 118)
    let futbol = sprites.create(sprites.gg.persona, SpriteKind.Food)
    futbol.setPosition(izquierda, 96)
    futbol.sayText(textoUno)
    let futbolDos = sprites.create(sprites.gg.persona, SpriteKind.Food)
    futbolDos.setPosition(izquierda + 18, 96)
    let voleibol = sprites.create(sprites.gg.persona, SpriteKind.Food)
    voleibol.setPosition(derecha, 96)
    voleibol.sayText(textoDos)
    let voleibolDos = sprites.create(sprites.gg.persona, SpriteKind.Food)
    voleibolDos.setPosition(derecha + 18, 96)
}

function mostrarForma(forma: number) {
    if (forma == 0) {
        colocar(128, 240, "Gritan", "Se enojan")
    } else if (forma == 1) {
        colocar(84, 252, "Callan", "Callan")
    } else if (forma == 2) {
        colocar(100, 190, "Escuchan", "Escuchan")
    } else {
        colocar(128, 250, "Juegan", "Esperan")
    }
}

function mostrarAcuerdo(r: number) {
    if (r == 0) {
        colocar(130, 176, "Mitad", "Mitad")
    } else {
        colocar(140, 240, "Hoy juegan", "Mañana")
    }
}

function decidir(n: number): number {
    return experiencias.elegir(C_SIT[n], [C_UNO[n], C_DOS[n], C_TRES[n]], EjeEleccion.Vertical)
}

function explorar() {
    experiencias.fase(FaseExperiencia.Explorar)
    colocar(96, 200, "Fútbol", "Voleibol")
    experiencias.decir("Es el recreo. El grupo de fútbol y el grupo de voleibol quieren la misma cancha al mismo tiempo. Es un modelo en la pantalla.")
    let idea = experiencias.elegir("Sin miedo a equivocarte. ¿Qué crees que pueden hacer los dos grupos?", ["Hablar entre los grupos", "Gritar más fuerte", "Alejarse sin decir nada"], EjeEleccion.Vertical)
    if (idea >= 0) {
        experiencias.decir("Cualquier idea sirve para empezar. Ahora veremos qué pasa con cada forma.")
    }
}

function construir() {
    experiencias.fase(FaseExperiencia.Construir)
    colocar(96, 200, "Fútbol", "Voleibol")
    experiencias.decir("Un conflicto es cuando dos personas o grupos quieren cosas distintas y no se ponen de acuerdo. Se puede afrontar de varias formas.")
    experiencias.decir("Una forma es gritar para imponerse. Mira su efecto.")
    mostrarForma(0)
    experiencias.decir(FORMA_EFECTO[0])
    experiencias.decir("Otra forma es alejarse y no decir nada.")
    mostrarForma(1)
    experiencias.decir(FORMA_EFECTO[1])
    experiencias.decir("Otra forma es dejar toda la cancha al otro grupo.")
    mostrarForma(3)
    experiencias.decir(FORMA_EFECTO[3])
    experiencias.decir("Otra forma es dialogar: hablar, escuchar y buscar un acuerdo.")
    mostrarForma(2)
    experiencias.decir(FORMA_EFECTO[2])
    experiencias.decir("Una propuesta es una idea para resolver el conflicto. Un acuerdo es lo que los dos grupos aceptan y escriben.")
    experiencias.decir("La cultura de paz busca resolver los conflictos escuchando y respetando a todas las personas.")
}

function aplicar() {
    experiencias.fase(FaseExperiencia.Aplicar)
    colocar(96, 200, "Fútbol", "Voleibol")
    experiencias.decir("Ahora tú ayudas a los dos grupos. Si te equivocas, tendrás una pista.")
    let hecho = false
    while (!hecho) {
        let forma = experiencias.elegir("Paso 1. Los dos grupos quieren la cancha. ¿Cómo afrontan el conflicto?", [FORMA_OPCION[0], FORMA_OPCION[1], FORMA_OPCION[2], FORMA_OPCION[3]], EjeEleccion.Vertical)
        mostrarForma(forma)
        experiencias.decir(FORMA_EFECTO[forma])
        hecho = forma == 2
        if (!hecho) {
            experiencias.todaviaNo(FORMA_PISTA[forma])
        }
    }
    hecho = false
    while (!hecho) {
        reparto = experiencias.elegir("Paso 2. Escribe el acuerdo: ¿cómo usan la cancha?", [REPARTO_OPCION[0], REPARTO_OPCION[1], REPARTO_OPCION[2]], EjeEleccion.Vertical)
        hecho = reparto < 2
        if (hecho) {
            mostrarAcuerdo(reparto)
            experiencias.decir("Acuerdo anotado: " + REPARTO_FINAL[reparto] + " Los dos grupos pueden jugar.")
        } else {
            experiencias.todaviaNo("Si un grupo se queda con todo, el otro no juega. Busca un acuerdo para los dos.")
        }
    }
    hecho = false
    while (!hecho) {
        let cumplir = experiencias.elegir("Paso 3. ¿Qué proponen para que el acuerdo se cumpla?", ["Cada grupo elige quién recuerda el acuerdo", "Quien tenga el balón decide por todos", "Nadie revisa si se cumple"], EjeEleccion.Vertical)
        hecho = cumplir == 0
        if (hecho) {
            experiencias.decir("Así es. Si cada grupo tiene quién recuerde el acuerdo, es más fácil cumplirlo.")
        } else {
            experiencias.todaviaNo("Un acuerdo se cumple mejor si los dos grupos lo cuidan. Inténtalo otra vez.")
        }
    }
}

function comprobar() {
    experiencias.comprobar()
    experiencias.decir("Ahora, sin pistas: cinco preguntas sobre el conflicto. Necesitas 4 aciertos.")
    let serie = SERIE_A
    if (experiencias.serieActual() == 1) {
        serie = SERIE_B
    }
    colocar(96, 200, "Fútbol", "Voleibol")
    for (let i = 0; i < serie.length; i++) {
        let n = serie[i]
        experiencias.anotar(decidir(n) == C_OK[n])
    }
}

function reflexionar() {
    experiencias.fase(FaseExperiencia.Reflexionar)
    mostrarAcuerdo(reparto)
    let respuesta = experiencias.elegir("¿Qué forma de afrontar el conflicto construye paz?", ["Gritar para ganar", "Hablar y escuchar para acordar", "Alejarse sin hablar"], EjeEleccion.Vertical)
    if (respuesta == 1) {
        experiencias.decir("Así es. Hablar y escuchar ayuda a que los dos grupos jueguen y a que el problema no vuelva.")
    } else {
        experiencias.todaviaNo("Hablar y escuchar es la forma que ayuda a que los dos grupos jueguen.")
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
mostrarAcuerdo(reparto)
let lineas: string[] = ["Acertaste " + experiencias.aciertos() + " de 5. Este es el acuerdo escrito:"]
lineas.push("1. " + REPARTO_FINAL[reparto])
lineas.push("2. Cada grupo elige quién recuerda el acuerdo.")
lineas.push("3. Si hay un problema, volvemos a hablar y escuchar.")
lineas.push("Efecto de cada forma de afrontar el conflicto:")
for (let i = 0; i < FIN_FORMAS.length; i++) {
    lineas.push(FIN_FORMAS[i])
}
experiencias.final("Acuerdo del recreo", lineas)
