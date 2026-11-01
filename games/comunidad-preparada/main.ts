// Comunidad preparada: el comité escolar compara fenómenos de Guatemala y del mundo, marca lugares de peligro y busca quién ayuda.
// Fenómenos: 0 sismo, 1 lluvias muy fuertes, 2 volcán activo. Quién ayuda: 0 Cruz Roja, 1 Médicos Sin Fronteras.
const FEN_NOMBRE = ["sismo", "lluvias muy fuertes", "volcán activo"]
const FEN_TEXTO = [
    "Los sismos no se pueden predecir, así que el plan necesita una ruta de salida y un punto de reunión. La corteza de la Tierra está partida en placas. Los sismos ocurren sobre todo en los bordes de esas placas, como en Guatemala y en Japón.",
    "En Guatemala, las lluvias más fuertes llegan en la época de lluvias, más o menos de mayo a octubre. Los ríos pueden crecer y las laderas pueden moverse. En el mundo, el sur de Asia tiene lluvias de monzón y el mar Caribe tiene huracanes.",
    "Guatemala tiene volcanes activos, como el Pacaya y el Santiaguito. Hay instituciones que los vigilan y dan avisos. En el mundo también hay volcanes activos, por ejemplo en Japón e Indonesia."
]
const LUG_PREG = ["Paso 2. ¿Cuál es un lugar de peligro durante un sismo?", "Paso 2. ¿Cuál es un lugar de peligro con lluvias muy fuertes?", "Paso 2. ¿Cuál es un lugar de peligro con un volcán activo?"]
const LUG_UNO = ["Un patio abierto, lejos de los muros", "Una zona alta y firme, lejos del río", "Cerca del cráter y de las barrancas"]
const LUG_DOS = ["Junto a una ventana o un muro agrietado", "Un salón con techo firme", "Un patio de la escuela, lejos de barrancas"]
const LUG_TRES = ["Una zona de reunión marcada", "La orilla de un río que crece", "Una zona de reunión marcada"]
const LUG_OK = [1, 2, 0]
const LUG_PLAN = ["junto a una ventana o un muro agrietado", "la orilla de un río que crece", "cerca del cráter y de las barrancas"]
const LUG_CONS = [
    "Un patio abierto, lejos de los muros, sirve para reunirse. El peligro está en otro lugar.",
    "Cierto: los vidrios y los muros débiles pueden caer. El plan marca ese lugar de peligro.",
    "Una zona de reunión marcada sirve para ponerse a salvo. El peligro está en otro lugar.",
    "Una zona alta y firme, lejos del río, sirve para ponerse a salvo. El peligro está en otro lugar.",
    "Un salón con techo firme sirve para resguardarse. El peligro está en otro lugar.",
    "Cierto: con lluvias muy fuertes el río puede crecer rápido. El plan marca la orilla y un camino hacia una zona alta.",
    "Cierto: desde el cráter puede bajar material por las barrancas. El plan marca esa zona de peligro.",
    "Un patio lejos de las barrancas es un lugar más seguro. El peligro está en otro lugar.",
    "Una zona de reunión marcada sirve para ponerse a salvo. El peligro está en otro lugar."
]
const AYUDA_CONS = [
    "La Cruz Roja da primeros auxilios y ayuda humanitaria en emergencias. Trabaja en muchos países, también en Guatemala.",
    "Médicos Sin Fronteras da atención médica a personas en emergencias, en muchos países.",
    "Una tienda de ropa no está hecha para atender emergencias. Busca una organización que ayude con salud y primeros auxilios."
]
const AYUDA_PLAN = ["La Cruz Roja, con primeros auxilios y ayuda humanitaria.", "Médicos Sin Fronteras, con atención médica en emergencias."]
const C_SIT = [
    "Guatemala tiene volcanes activos. El comité compara con otro país que también los tiene. ¿Cuál elige?",
    "Un río crece por lluvias muy fuertes. ¿Cuál es el lugar de peligro?",
    "El comité necesita primeros auxilios y ayuda humanitaria. ¿A quién busca?",
    "El comité compara los sismos de Guatemala con los del mundo. ¿Dónde ocurren más sismos?",
    "Llueve sin parar. ¿Cuál es un lugar de peligro por deslizamientos?",
    "Un volcán está activo. ¿Cuál es el lugar de peligro?",
    "Guatemala tiene volcanes activos. El comité compara con otro país que también los tiene. ¿Cuál elige?",
    "El comité busca una organización internacional que da atención médica en emergencias. ¿A quién busca?",
    "Hay un sismo. ¿Cuál es el lugar de peligro?",
    "Algunos huracanes y tormentas tropicales traen lluvias a Guatemala. ¿Qué necesita un huracán para formarse?"
]
const C_UNO = ["Egipto", "La orilla del río", "A un club de fútbol", "En los bordes de las placas de la corteza", "Una cancha plana", "Una zona de reunión marcada", "Uruguay", "A Médicos Sin Fronteras", "Una zona de reunión marcada", "Aguas cálidas del mar"]
const C_DOS = ["Japón", "Una zona alta y firme", "A una tienda de ropa", "Solo en los desiertos", "Una ladera muy inclinada", "Cerca del cráter y de las barrancas", "Egipto", "A una tienda de ropa", "Un patio abierto, lejos de los muros", "Un desierto seco"]
const C_TRES = ["Uruguay", "Un salón con techo firme", "A la Cruz Roja", "Solo en las ciudades grandes", "Un patio techado", "Un patio lejos de las barrancas", "Indonesia", "A un club de fútbol", "Junto a una ventana o un muro agrietado", "Un glaciar"]
const C_OK = [1, 0, 2, 0, 1, 1, 2, 0, 2, 0]
const SERIE_A = [0, 1, 2, 3, 4]
const SERIE_B = [5, 6, 7, 8, 9]
let fenomeno = 0
let ayuda = 0

scene.setBackgroundImage(sprites.gg.fondoEscuela)

function mostrarComite() {
    sprites.destroyAllSpritesOfKind(SpriteKind.Food)
    let comite = sprites.create(sprites.gg.persona, SpriteKind.Food)
    comite.setPosition(160, 105)
    comite.sayText("Comité escolar")
}

function decidir(n: number): number {
    return experiencias.elegir(C_SIT[n], [C_UNO[n], C_DOS[n], C_TRES[n]], EjeEleccion.Vertical)
}

function explorar() {
    experiencias.fase(FaseExperiencia.Explorar)
    experiencias.decir("Eres parte del comité escolar. Hoy preparan un plan para la comunidad.")
    experiencias.decir("Es un modelo en la pantalla: practicas decisiones, no hay una emergencia real.")
    mostrarComite()
    let idea = experiencias.elegir("Sin miedo a equivocarte. ¿Qué crees que debe tener un plan?", ["Un lugar seguro", "Una ruta de salida", "Una lista de quién ayuda"], EjeEleccion.Vertical)
    if (idea >= 0) {
        experiencias.decir("Cualquier idea sirve para empezar. Ahora veremos las tres partes de un plan.")
    }
}

function construir() {
    experiencias.fase(FaseExperiencia.Construir)
    mostrarComite()
    experiencias.decir("Un plan dice tres cosas: qué fenómeno puede ocurrir, dónde está el peligro y quién ayuda.")
    experiencias.decir("Un fenómeno natural es algo que pasa en la naturaleza, como un sismo, una lluvia muy fuerte o la actividad de un volcán. A un sismo fuerte también se le llama terremoto.")
    experiencias.decir("En Guatemala hay sismos, lluvias muy fuertes y volcanes activos. Otros países tienen fenómenos parecidos: hay sismos y volcanes activos en Japón, y huracanes que se forman sobre aguas cálidas del mar.")
    experiencias.decir("Un lugar de peligro es un sitio donde un fenómeno puede ser peligroso para las personas. Por ejemplo, la orilla de un río cuando llueve mucho.")
    experiencias.decir("Quién ayuda: la Cruz Roja da primeros auxilios y ayuda humanitaria. Médicos Sin Fronteras da atención médica en emergencias. Las vecinas y los vecinos también ayudan.")
    experiencias.decir("Al armar el plan, cada decisión muestra su consecuencia.")
}

function aplicar() {
    experiencias.fase(FaseExperiencia.Aplicar)
    experiencias.decir("Ahora arma el plan del comité en tres pasos. Si te equivocas, tendrás una pista.")
    mostrarComite()
    fenomeno = experiencias.elegir("Paso 1. ¿Qué fenómeno de Guatemala estudia el comité?", ["Un sismo (la tierra se mueve)", "Lluvias muy fuertes", "Un volcán activo"], EjeEleccion.Vertical)
    experiencias.decir("Elegiste " + FEN_NOMBRE[fenomeno] + ". " + FEN_TEXTO[fenomeno])
    let correcto = false
    while (!correcto) {
        let lugar = experiencias.elegir(LUG_PREG[fenomeno], [LUG_UNO[fenomeno], LUG_DOS[fenomeno], LUG_TRES[fenomeno]], EjeEleccion.Vertical)
        correcto = lugar == LUG_OK[fenomeno]
        if (correcto) {
            experiencias.decir(LUG_CONS[fenomeno * 3 + lugar])
        } else {
            experiencias.todaviaNo(LUG_CONS[fenomeno * 3 + lugar] + " Inténtalo otra vez.")
        }
    }
    correcto = false
    while (!correcto) {
        ayuda = experiencias.elegir("Paso 3. ¿Quién ayuda después de una emergencia?", ["La Cruz Roja", "Médicos Sin Fronteras", "Una tienda de ropa"], EjeEleccion.Vertical)
        correcto = ayuda < 2
        if (correcto) {
            experiencias.decir(AYUDA_CONS[ayuda] + " Las vecinas y los vecinos también ayudan.")
        } else {
            experiencias.todaviaNo(AYUDA_CONS[ayuda] + " Inténtalo otra vez.")
        }
    }
}

function comprobar() {
    experiencias.comprobar()
    experiencias.decir("Ahora, sin pistas: cinco preguntas del comité. Necesitas 4 aciertos.")
    let serie = SERIE_A
    if (experiencias.serieActual() == 1) {
        serie = SERIE_B
    }
    mostrarComite()
    for (let i = 0; i < serie.length; i++) {
        let n = serie[i]
        experiencias.anotar(decidir(n) == C_OK[n])
    }
}

function reflexionar() {
    experiencias.fase(FaseExperiencia.Reflexionar)
    sprites.destroyAllSpritesOfKind(SpriteKind.Food)
    let respuesta = experiencias.elegir("¿Qué incluye un plan de la comunidad?", ["Solo el nombre del fenómeno", "Fenómeno, lugar de peligro y quién ayuda", "Solo una lista de países"], EjeEleccion.Vertical)
    if (respuesta == 1) {
        experiencias.decir("Así es. Un plan dice qué fenómeno puede ocurrir, dónde está el peligro y quién ayuda.")
    } else {
        experiencias.todaviaNo("Un plan incluye el fenómeno, el lugar de peligro y quién ayuda.")
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
let lineas: string[] = ["Acertaste " + experiencias.aciertos() + " de 5. Este es el plan del comité:"]
lineas.push("Fenómeno: " + FEN_NOMBRE[fenomeno] + ".")
lineas.push("Lugar de peligro: " + LUG_PLAN[fenomeno] + ".")
lineas.push("Quién ayuda: " + AYUDA_PLAN[ayuda])
lineas.push("Es un modelo en la pantalla. En una emergencia real, sigue las indicaciones de las personas adultas y de las autoridades.")
experiencias.final("Plan del comité", lineas)
