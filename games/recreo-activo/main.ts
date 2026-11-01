// Recreo activo: una jornada larga en el aula. Se clasifican hábitos y se arma un plan de recreo con tres pausas.
// Clases: 0 higiene, 1 movimiento, 2 agua, 3 comida.
const CLASES = ["Higiene", "Movimiento", "Agua", "Comida"]
const EXPLICA = ["Cuida la limpieza de tu cuerpo.", "Mueve tu cuerpo.", "Es tomar la bebida que tu cuerpo necesita.", "Es parte de lo que comes cada día."]
const HABITOS = [
    "Después de jugar, me lavo las manos y la cara con agua y jabón.",
    "Salto la cuerda en el recreo.",
    "Llevo mi botella con agua a la escuela.",
    "Llevo una fruta de refacción.",
    "Antes de jugar, me pongo ropa limpia y cómoda.",
    "Tomo agua cuando hace calor.",
    "Juego a la pelota con mis compañeros y compañeras.",
    "Como verduras en el almuerzo.",
    "Durante el partido, me seco el sudor con mi toalla.",
    "Me levanto y camino un rato entre clases.",
    "Tomo agua durante la mañana.",
    "Desayuno antes de salir de casa.",
    "Lleno mi botella de agua antes de salir al recreo.",
    "Antes de correr, reviso que mi ropa esté limpia.",
    "Almuerzo frijoles con tortilla.",
    "Bailo con mis compañeros y compañeras en el recreo.",
    "Después de hacer ejercicio, me baño y me pongo ropa limpia."
]
const TIPO = [0, 1, 2, 3, 0, 2, 1, 3, 0, 1, 2, 3, 2, 0, 3, 1, 0]
const PRACTICA = [4, 5, 6]
const SERIE_A = [7, 8, 9, 10, 11]
const SERIE_B = [12, 13, 14, 15, 16]
const ICONOS: Image[] = [sprites.gg.persona, sprites.gg.huella, sprites.gg.gota, sprites.gg.manzana]
const MOMENTO = ["a media mañana", "antes del recreo", "antes de salir de clases"]
const DE_PIE = ["Estira los brazos hacia arriba y baja despacio, 5 veces.", "Camina en el lugar durante 30 segundos.", "Sube los hombros hacia las orejas y suéltalos, 5 veces."]
const SENTADO = ["Con la espalda recta, estira los brazos al frente y luego hacia arriba, 5 veces.", "Levanta una rodilla y luego la otra, 10 veces.", "Abre y cierra las manos 10 veces y sube los hombros 5 veces."]
const DETENTE = "Detente al terminar o antes, si algo te duele, te mareas o te falta el aire."
let variante: number[] = [0, 0, 0]
let jugadas: number[] = []
let correcto = false

scene.setBackgroundImage(sprites.gg.fondoEscuela)

function mostrarIcono(n: number) {
    sprites.destroyAllSpritesOfKind(SpriteKind.Food)
    let icono = sprites.create(ICONOS[n], SpriteKind.Food)
    icono.setPosition(160, 105)
}

function mostrarEstudiante() {
    sprites.destroyAllSpritesOfKind(SpriteKind.Food)
    let estudiante = sprites.create(sprites.gg.persona, SpriteKind.Food)
    estudiante.setPosition(160, 105)
}

function clasificar(n: number): number {
    let enunciado = HABITOS[n] + " ¿Qué tipo de hábito es?"
    return experiencias.elegir(enunciado, ["Higiene", "Movimiento", "Agua", "Comida"], EjeEleccion.Horizontal)
}

function pistaDe(n: number): string {
    let pista = "La higiene cuida la limpieza de tu cuerpo. Inténtalo otra vez."
    if (TIPO[n] == 1) {
        pista = "El movimiento es mover tu cuerpo: caminar, saltar, estirarte. Inténtalo otra vez."
    } else if (TIPO[n] == 2) {
        pista = "Esta frase habla de tomar agua. Inténtalo otra vez."
    } else if (TIPO[n] == 3) {
        pista = "La comida es lo que comes cada día. Inténtalo otra vez."
    }
    return pista
}

function pausa(i: number) {
    mostrarEstudiante()
    experiencias.decir("Pausa " + (i + 1) + ", " + MOMENTO[i] + ". Es un ratito para mover el cuerpo. Puedes hacerla o solo leerla.")
    variante[i] = experiencias.elegir("¿Cómo haces la pausa " + (i + 1) + "?", ["De pie", "En una silla"], EjeEleccion.Horizontal)
    if (variante[i] == 0) {
        experiencias.decir("De pie: " + DE_PIE[i] + " " + DETENTE + " Pulsa A cuando termines.")
    } else {
        experiencias.decir("En una silla: " + SENTADO[i] + " " + DETENTE + " Pulsa A cuando termines.")
    }
}

function explorar() {
    experiencias.fase(FaseExperiencia.Explorar)
    experiencias.decir("Llevas horas en el aula. Hoy armas tu plan de recreo.")
    experiencias.decir("Es un modelo en la pantalla: nadie te pide moverte de verdad para aprobar.")
    mostrarEstudiante()
    let idea = experiencias.elegir("Sin miedo a equivocarte. Llevas mucho rato en tu silla. ¿Qué te ayudaría?", ["Moverme", "Tomar agua", "Lavarme las manos"], EjeEleccion.Horizontal)
    if (idea >= 0) {
        experiencias.decir("Cualquier idea sirve para empezar. Un buen recreo tiene un poco de todo.")
    }
}

function construir() {
    experiencias.fase(FaseExperiencia.Construir)
    experiencias.decir("Un buen recreo tiene cuatro partes: higiene, movimiento, agua y comida.")
    mostrarIcono(0)
    experiencias.decir("Higiene: cuidar la limpieza de tu cuerpo antes, durante y después de moverte.")
    experiencias.decir("Antes: ropa limpia y cómoda. Durante: sécate el sudor. Después: lávate las manos y la cara.")
    experiencias.decir("Ejemplo: " + HABITOS[0])
    mostrarIcono(1)
    experiencias.decir("Movimiento: mover tu cuerpo, como caminar, saltar o estirarte. Ejemplo: " + HABITOS[1])
    mostrarIcono(2)
    experiencias.decir("Agua: la bebida que tu cuerpo necesita. Toma agua durante el día, sobre todo si hace calor o si juegas. Ejemplo: " + HABITOS[2])
    experiencias.decir("Los refrescos y las bebidas con azúcar, mejor solo de vez en cuando.")
    mostrarIcono(3)
    experiencias.decir("Comida: lo que comes cada día. Una buena refacción incluye fruta. Ejemplo: " + HABITOS[3])
    mostrarEstudiante()
    experiencias.decir("Pasar mucho tiempo sin mover el cuerpo se llama sedentarismo. Es un hábito que daña la salud. Para evitarlo, haz pausas activas.")
    experiencias.decir("Una pausa activa dura un ratito y mueve el cuerpo. Arma tres pausas para tu jornada.")
    for (let i = 0; i < 3; i++) {
        pausa(i)
    }
    experiencias.decir("Listo: tu plan tiene tres pausas. Ahora practica con los hábitos.")
}

function aplicar() {
    experiencias.fase(FaseExperiencia.Aplicar)
    experiencias.decir("Practica con tres hábitos. Si te equivocas, tendrás una pista.")
    mostrarEstudiante()
    for (let i = 0; i < PRACTICA.length; i++) {
        let n = PRACTICA[i]
        correcto = false
        while (!correcto) {
            correcto = clasificar(n) == TIPO[n]
            if (!correcto) {
                experiencias.todaviaNo(pistaDe(n))
            }
        }
        experiencias.decir("Así es: " + CLASES[TIPO[n]] + ". " + EXPLICA[TIPO[n]])
    }
}

function comprobar() {
    experiencias.comprobar()
    experiencias.decir("Ahora, sin pistas: cinco hábitos. Necesitas 4 aciertos.")
    jugadas = SERIE_A
    if (experiencias.serieActual() == 1) {
        jugadas = SERIE_B
    }
    mostrarEstudiante()
    for (let i = 0; i < jugadas.length; i++) {
        let n = jugadas[i]
        experiencias.anotar(clasificar(n) == TIPO[n])
    }
}

function reflexionar() {
    experiencias.fase(FaseExperiencia.Reflexionar)
    sprites.destroyAllSpritesOfKind(SpriteKind.Food)
    let respuesta = experiencias.elegir("Pasar mucho tiempo sin mover el cuerpo se llama...", ["Higiene", "Sedentarismo", "Refacción"], EjeEleccion.Horizontal)
    if (respuesta == 1) {
        experiencias.decir("Así es. Las pausas activas ayudan a evitar el sedentarismo.")
    } else {
        experiencias.todaviaNo("Pasar mucho tiempo sin mover el cuerpo se llama sedentarismo.")
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
sprites.destroyAllSpritesOfKind(SpriteKind.Food)
let lineas: string[] = ["Acertaste " + experiencias.aciertos() + " de 5 hábitos. Este es tu plan:"]
for (let i = 0; i < 3; i++) {
    let como = "de pie: " + DE_PIE[i]
    if (variante[i] == 1) {
        como = "en una silla: " + SENTADO[i]
    }
    lineas.push("Pausa " + (i + 1) + ", " + MOMENTO[i] + ", " + como)
}
lineas.push("Agua: toma agua en la mañana y cuando hace calor.")
lineas.push("Aseo antes de jugar: ropa limpia y cómoda.")
lineas.push("Aseo durante el juego: sécate el sudor.")
lineas.push("Aseo después: lávate las manos y la cara.")
lineas.push("En una pausa, detente si algo te duele, te mareas o te falta el aire.")
experiencias.final("Plan de recreo", lineas)
