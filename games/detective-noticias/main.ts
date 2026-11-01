// Detective de noticias: al periódico mural de la escuela llegan noticias inventadas y hay que marcar cada frase.
// Clases: 0 hecho, 1 opinión, 2 generalización.
const CLASES = ["Hecho", "Opinión", "Generalización"]
const EXPLICA = ["Se puede comprobar con un dato.", "Dice lo que alguien piensa o siente.", "Dice todos, nadie, siempre o nunca sin revisar cada caso."]
const FRASES = [
    "El mural nuevo de la escuela es muy bonito.",
    "La biblioteca prestó 40 libros en marzo, según su registro.",
    "Todos los estudiantes de la escuela llegan tarde.",
    "Nadie en sexto lee libros.",
    "El torneo de la escuela empezó a las 9 de la mañana, según el programa.",
    "La refacción de hoy estuvo deliciosa.",
    "En la huerta escolar se sembraron 12 matas de tomate.",
    "La mejor clase de la semana es la de música.",
    "Siempre llueve cuando hay torneo.",
    "El calendario escolar marca la feria de libros del martes al jueves.",
    "En esta escuela nadie come fruta.",
    "El torneo de este año fue el más emocionante.",
    "Nunca hay fila en la tienda escolar.",
    "El coro tiene 18 estudiantes inscritos, según la hoja de inscripción.",
    "Las matemáticas son la materia más difícil.",
    "La excursión salió a las 8 de la mañana y regresó a las 2 de la tarde."
]
const TIPO = [1, 0, 2, 2, 0, 1, 0, 1, 2, 0, 2, 1, 2, 0, 1, 0]
const PRACTICA = [3, 4, 5]
const SERIE_A = [6, 7, 8, 9, 10]
const SERIE_B = [11, 12, 13, 14, 15]
let jugadas: number[] = []
let marcadas: number[] = []

scene.setBackgroundImage(sprites.gg.fondoEscuela)

function mostrarNoticia(n: number) {
    sprites.destroyAllSpritesOfKind(SpriteKind.Food)
    let carta = sprites.create(sprites.gg.carta, SpriteKind.Food)
    carta.setPosition(160, 105)
    carta.sayText("Noticia " + n)
}

function clasificar(n: number): number {
    let enunciado = "Frase del mural: " + FRASES[n] + " ¿Qué clase de frase es?"
    return experiencias.elegir(enunciado, ["Hecho", "Opinión", "Generalización"], EjeEleccion.Horizontal)
}

function pistaDe(n: number): string {
    let pista = "Un hecho se puede comprobar con un dato, como un registro, un conteo o un horario. Inténtalo otra vez."
    if (TIPO[n] == 1) {
        pista = "Una opinión dice lo que alguien piensa. Otra persona puede pensar distinto. Inténtalo otra vez."
    } else if (TIPO[n] == 2) {
        pista = "Una generalización dice todos, nadie, siempre o nunca sin revisar cada caso. Inténtalo otra vez."
    }
    return pista
}

function explorar() {
    experiencias.fase(FaseExperiencia.Explorar)
    experiencias.decir("Eres parte del periódico mural de la escuela. Hoy llegan noticias.")
    experiencias.decir("Todas las noticias de este juego son inventadas. Es un modelo en la pantalla.")
    experiencias.decir("Quien investiga lee cada frase y se pregunta: ¿cómo lo sé?")
    mostrarNoticia(1)
    let enunciado = "Sin miedo a equivocarte. Frase: " + FRASES[0] + " ¿Se puede comprobar con un dato?"
    let idea = experiencias.elegir(enunciado, ["Sí", "No", "No sé"], EjeEleccion.Horizontal)
    if (idea >= 0) {
        experiencias.decir("Cualquier idea sirve para empezar. Ahora veremos tres clases de frases.")
    }
}

function construir() {
    experiencias.fase(FaseExperiencia.Construir)
    experiencias.decir("Hoy separas las frases en tres clases. Se distinguen por cómo se pueden revisar.")
    mostrarNoticia(1)
    experiencias.decir("Hecho: se puede comprobar con un dato, como un registro, un conteo o un horario. Ejemplo: " + FRASES[1])
    mostrarNoticia(2)
    experiencias.decir("Opinión: dice lo que alguien piensa o siente. Otra persona puede pensar distinto. Ejemplo: " + FRASES[0])
    mostrarNoticia(3)
    experiencias.decir("Generalización: dice todos, nadie, siempre o nunca sin revisar cada caso. Con un solo caso distinto, ya no es cierta. Ejemplo: " + FRASES[2])
    experiencias.decir("Antes de compartir una noticia, revisa cada frase: ¿es un hecho, una opinión o una generalización?")
}

function aplicar() {
    experiencias.fase(FaseExperiencia.Aplicar)
    experiencias.decir("Ahora practica con tres frases. Si te equivocas, tendrás una pista.")
    for (let i = 0; i < PRACTICA.length; i++) {
        let n = PRACTICA[i]
        mostrarNoticia(i + 1)
        let correcto = false
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
    experiencias.decir("Ahora, sin pistas: cinco frases. Necesitas 4 aciertos.")
    jugadas = SERIE_A
    if (experiencias.serieActual() == 1) {
        jugadas = SERIE_B
    }
    marcadas = []
    for (let i = 0; i < jugadas.length; i++) {
        let n = jugadas[i]
        mostrarNoticia(i + 1)
        let respuesta = clasificar(n)
        marcadas.push(respuesta)
        experiencias.anotar(respuesta == TIPO[n])
    }
}

function reflexionar() {
    experiencias.fase(FaseExperiencia.Reflexionar)
    sprites.destroyAllSpritesOfKind(SpriteKind.Food)
    let respuesta = experiencias.elegir("Antes de compartir una noticia, ¿qué conviene hacer?", ["Compartirla rápido", "Buscar un dato que la compruebe", "Creerla si suena muy segura"], EjeEleccion.Vertical)
    if (respuesta == 1) {
        experiencias.decir("Así es. Comprobar con un dato te ayuda a no repetir algo que no es cierto.")
    } else {
        experiencias.todaviaNo("Antes de compartir, busca un dato que compruebe la frase.")
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
let lineas: string[] = ["Acertaste " + experiencias.aciertos() + " de 5. Así quedó el mural:"]
for (let i = 0; i < jugadas.length; i++) {
    let n = jugadas[i]
    let marca = " Acertaste."
    if (marcadas[i] != TIPO[n]) {
        marca = " Tú marcaste: " + CLASES[marcadas[i]] + "."
    }
    lineas.push((i + 1) + ". " + CLASES[TIPO[n]] + ": " + FRASES[n] + marca)
}
lineas.push("Recuerda: estas noticias son inventadas.")
experiencias.final("Mural de la escuela", lineas)
