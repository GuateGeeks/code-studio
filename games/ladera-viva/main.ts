// La ladera viva: una comunidad reforesta la ladera sobre su nacimiento de agua y ve qué pasa con el suelo, el agua y los animales.
// Cantidad de árboles: 0 ninguno, 1 pocos, 2 muchos. Época: 0 antes de la lluvia, 1 lluvia, 2 sequía.
const SUELO = [1, 2, 3]
const AGUA_LLUVIA = [1, 2, 3]
const AGUA_SECA = [0, 1, 2]
const ANIMALES = [0, 1, 3]
const NIVEL_DE_OPCION = [2, 1, 0]
const NIVEL_NOMBRE = ["ningún", "pocos", "muchos"]
const LLUVIA_TXT = [
    "Sin árboles, la lluvia corre sobre la ladera y arrastra la tierra. Entra poca agua al suelo.",
    "Con pocos árboles, las raíces sujetan una parte de la tierra. Entra algo de agua al suelo, pero otra parte se sigue lavando.",
    "Con muchos árboles, las raíces sujetan la tierra y las hojas frenan la lluvia. El agua entra al suelo."
]
const SECA_TXT = [
    "En la época seca, el suelo sin árboles se seca rápido. El nacimiento casi no da agua y los animales no encuentran refugio.",
    "En la época seca, el suelo guarda algo de agua. El nacimiento da un poco y llegan pocos animales.",
    "En la época seca, el suelo guarda agua de la lluvia. El nacimiento sigue dando agua y hay refugio para aves e insectos."
]
const FIN_SUELO = ["se lavó con la lluvia.", "las raíces sujetan una parte.", "lo sujetan las raíces."]
const FIN_AGUA = ["el nacimiento casi no da agua en la época seca.", "el nacimiento da un poco de agua en la época seca.", "el nacimiento sigue dando agua en la época seca."]
const FIN_ANIMALES = ["no hay animales.", "llegan pocos, como las abejas.", "viven aves e insectos en los árboles."]
const C_SIT = [
    "En la época lluviosa, ¿qué hace un bosque con el agua de lluvia?",
    "Una ladera inclinada sin árboles recibe mucha lluvia. ¿Qué puede pasar?",
    "¿Por qué un bosque ayuda a conservar animales?",
    "¿Qué hacen las raíces con el suelo?",
    "En la época seca, ¿qué puede pasar con un nacimiento rodeado de árboles?",
    "¿Qué pasa con la lluvia sobre un suelo sin plantas?",
    "¿Qué ventaja tiene sembrar árboles en una ladera inclinada?",
    "Si no hay árboles en la ladera, ¿qué pasa con aves e insectos?",
    "¿Qué es reforestar?",
    "¿Cómo ayuda reforestar a proteger el agua de un nacimiento?"
]
const C_UNO = ["La hace correr más rápido", "La tierra puede moverse y deslizarse", "Les quita el agua", "Lo vuelven polvo", "Puede seguir dando agua", "Entra toda al suelo", "La hace más empinada", "Pierden alimento y refugio", "Cortar árboles de la ladera", "La lluvia deja de caer"]
const C_DOS = ["Deja que parte entre al suelo", "La tierra se vuelve más firme", "Les da alimento y refugio", "Lo mueven a otro lugar", "Siempre da más agua que en lluvia", "Corre y arrastra tierra", "Quita el agua del suelo", "Tienen más refugio", "Sembrar árboles donde ya no hay", "Las ramas tapan el nacimiento"]
const C_TRES = ["Impide que llegue al nacimiento", "Crecen árboles de inmediato", "No les sirve de nada", "Lo sujetan para que se lave menos", "Desaparece para siempre", "Se queda quieta en la ladera", "Ayuda a sujetar la ladera", "No cambia nada", "Regar el pasto de la escuela", "El suelo con raíces guarda agua de lluvia"]
const C_OK = [1, 0, 1, 2, 0, 1, 2, 0, 1, 2]
const SERIE_A = [0, 1, 2, 3, 4]
const SERIE_B = [5, 6, 7, 8, 9]
let nivel = 0
let probo = false

scene.setBackgroundImage(sprites.gg.fondoBosque)

function indicadores(n: number, epoca: number): string {
    let agua = AGUA_LLUVIA[n]
    if (epoca == 2) {
        agua = AGUA_SECA[n]
    }
    return "Suelo: " + SUELO[n] + " de 3. Agua del nacimiento: " + agua + " de 3. Animales: " + ANIMALES[n] + " de 3."
}

// Dibuja la ladera: siete piezas de loma bajan hacia la derecha y el nacimiento queda al pie.
function dibujar(n: number, epoca: number, brotes: boolean) {
    sprites.destroyAllSpritesOfKind(SpriteKind.Food)
    let loma = sprites.gg.lomaVerde
    if (n == 0) {
        loma = sprites.gg.lomaDesnuda
    }
    for (let k = 0; k < 7; k++) {
        let xPieza = 64 + 32 * k
        let yPieza = 108 + 4 * k
        let pieza = sprites.create(loma, SpriteKind.Food)
        pieza.setPosition(xPieza, yPieza)
        let relleno = sprites.create(sprites.gg.tierra, SpriteKind.Food)
        relleno.setPosition(xPieza, yPieza + 32)
    }
    for (let k = 0; k < 6; k++) {
        let xArbol = 64 + 32 * k
        let hay = n == 2 || (n == 1 && (k == 1 || k == 4))
        if (hay) {
            if (brotes) {
                let brote = sprites.create(sprites.gg.brote, SpriteKind.Food)
                brote.setPosition(xArbol, 90 + 4 * k)
            } else {
                let arbol = sprites.create(sprites.gg.arbol, SpriteKind.Food)
                arbol.setPosition(xArbol, 82 + 4 * k)
            }
        }
    }
    if (epoca == 1) {
        for (let i = 0; i < 6; i++) {
            let gota = sprites.create(sprites.gg.gota, SpriteKind.Food)
            gota.setPosition(84 + 34 * i, 60 + 14 * (i % 2))
        }
    }
    if (epoca == 2) {
        let sol = sprites.create(sprites.gg.sol, SpriteKind.Food)
        sol.setPosition(250, 62)
    }
    if (epoca > 0) {
        let agua = AGUA_LLUVIA[n]
        if (epoca == 2) {
            agua = AGUA_SECA[n]
        }
        for (let i = 0; i < agua; i++) {
            let charco = sprites.create(sprites.gg.gota, SpriteKind.Food)
            charco.setPosition(244 + 13 * i, 112)
        }
    }
    if (ANIMALES[n] >= 1 && epoca > 0) {
        let abeja = sprites.create(sprites.gg.abeja, SpriteKind.Food)
        abeja.setPosition(110, 62)
    }
    if (ANIMALES[n] >= 3 && epoca > 0) {
        let colibri = sprites.create(sprites.gg.colibri, SpriteKind.Food)
        colibri.setPosition(170, 58)
        let otra = sprites.create(sprites.gg.abeja, SpriteKind.Food)
        otra.setPosition(214, 64)
    }
}

function decidir(n: number): number {
    return experiencias.elegir(C_SIT[n], [C_UNO[n], C_DOS[n], C_TRES[n]], EjeEleccion.Vertical)
}

function mostrarEpocas(n: number) {
    if (n > 0) {
        dibujar(n, 0, true)
        experiencias.decir("Pasan varios años. Los brotes crecen y se vuelven árboles.")
        dibujar(n, 0, false)
    } else {
        experiencias.decir("No sembraste nada. La ladera sigue sin árboles.")
    }
    dibujar(n, 1, false)
    experiencias.decir("Llega la época lluviosa. " + LLUVIA_TXT[n])
    experiencias.decir(indicadores(n, 1))
    dibujar(n, 2, false)
    experiencias.decir("Llega la época seca. " + SECA_TXT[n])
    experiencias.decir(indicadores(n, 2))
}

function explorar() {
    experiencias.fase(FaseExperiencia.Explorar)
    dibujar(0, 0, false)
    experiencias.decir("Al pie de una ladera hay un nacimiento de agua. La comunidad lo usa. Es un modelo en la pantalla.")
    let idea = experiencias.elegir("Sin miedo a equivocarte. Cuando llueve en una ladera sin árboles, ¿qué crees que pasa?", ["El agua baja rápido y arrastra tierra", "El agua se queda quieta arriba", "No pasa nada"], EjeEleccion.Vertical)
    if (idea >= 0) {
        experiencias.decir("Cualquier idea sirve para empezar. Mira qué muestra el modelo.")
    }
    dibujar(0, 1, false)
    experiencias.decir("Llueve sobre la ladera sin árboles. " + LLUVIA_TXT[0])
    experiencias.decir(indicadores(0, 1))
}

function construir() {
    experiencias.fase(FaseExperiencia.Construir)
    dibujar(0, 0, false)
    experiencias.decir("Reforestar es sembrar árboles donde ya no hay. Una ladera inclinada de tierra se llama talud.")
    dibujar(2, 0, true)
    experiencias.decir("Ejemplo: la comunidad siembra muchos árboles en la ladera. Primero son brotes.")
    dibujar(2, 0, false)
    experiencias.decir("Con los años crecen. Sus raíces entran en la tierra y la sujetan: así la ladera se mueve menos.")
    dibujar(2, 1, false)
    experiencias.decir("Época lluviosa. " + LLUVIA_TXT[2])
    experiencias.decir(indicadores(2, 1))
    dibujar(2, 2, false)
    experiencias.decir("Época seca. " + SECA_TXT[2])
    experiencias.decir(indicadores(2, 2))
    experiencias.decir("En este modelo, el agua de la lluvia entra al suelo y en la época seca el nacimiento sigue dando agua. Por eso reforestar ayuda a proteger el agua.")
    experiencias.decir("Los árboles también dan alimento y refugio a los animales, y el suelo con raíces se lava menos.")
}

function aplicar() {
    experiencias.fase(FaseExperiencia.Aplicar)
    dibujar(0, 0, false)
    experiencias.decir("Ahora decide tú qué hace la comunidad con la ladera. Si te equivocas, tendrás una pista.")
    let hecho = false
    while (!hecho) {
        let opcion = experiencias.elegir("Paso 1. ¿Qué decide la comunidad para la ladera?", ["Sembrar muchos árboles", "Sembrar pocos árboles", "No sembrar nada"], EjeEleccion.Vertical)
        nivel = NIVEL_DE_OPCION[opcion]
        mostrarEpocas(nivel)
        hecho = nivel > 0
        if (!hecho) {
            probo = true
            experiencias.todaviaNo("Sin árboles, la ladera se lava y el nacimiento da poca agua. Prueba otra decisión.")
        } else if (nivel == 1) {
            experiencias.decir("Con más árboles, el suelo y el agua se cuidarían aún más.")
        }
    }
    hecho = false
    while (!hecho) {
        let causa = experiencias.elegir("Paso 2. ¿Qué ayuda a que el nacimiento tenga agua en la época seca?", ["Un suelo con raíces que guarda agua", "Quitar todos los árboles", "Dejar la tierra sin plantas"], EjeEleccion.Vertical)
        hecho = causa == 0
        if (hecho) {
            experiencias.decir("Así es. El suelo con raíces guarda agua de la lluvia y el nacimiento la recibe.")
        } else {
            experiencias.todaviaNo("Un suelo sin plantas se seca rápido. El suelo con raíces guarda más agua de la lluvia.")
        }
    }
    hecho = false
    while (!hecho) {
        let efecto = experiencias.elegir("Paso 3. ¿Cómo ayudan las raíces a una ladera inclinada?", ["Sujetan la tierra para que se mueva menos", "Hacen que la tierra se lave más", "No cambian nada"], EjeEleccion.Vertical)
        hecho = efecto == 0
        if (hecho) {
            experiencias.decir("Así es. Las raíces sujetan la tierra y la ladera se mueve menos con la lluvia.")
        } else {
            experiencias.todaviaNo("Las raíces sujetan la tierra. Así la ladera se mueve menos con la lluvia.")
        }
    }
}

function comprobar() {
    experiencias.comprobar()
    experiencias.decir("Ahora, sin pistas: cinco preguntas sobre la ladera. Necesitas 4 aciertos.")
    let serie = SERIE_A
    if (experiencias.serieActual() == 1) {
        serie = SERIE_B
    }
    dibujar(nivel, 0, false)
    for (let i = 0; i < serie.length; i++) {
        let n = serie[i]
        experiencias.anotar(decidir(n) == C_OK[n])
    }
}

function reflexionar() {
    experiencias.fase(FaseExperiencia.Reflexionar)
    let respuesta = experiencias.elegir("¿Qué cuida una ladera con árboles?", ["Solo da más sombra", "Sujeta el suelo, guarda agua y da refugio", "No cambia nada"], EjeEleccion.Vertical)
    if (respuesta == 1) {
        experiencias.decir("Así es. Los árboles sujetan el suelo, ayudan a que haya agua y dan refugio a los animales.")
    } else {
        experiencias.todaviaNo("Los árboles sujetan el suelo, ayudan a que haya agua y dan refugio a los animales.")
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
dibujar(nivel, 2, false)
let lineas: string[] = ["Acertaste " + experiencias.aciertos() + " de 5. Esta es tu ladera final:"]
lineas.push("Sembraste " + NIVEL_NOMBRE[nivel] + " árboles.")
lineas.push("Suelo: " + FIN_SUELO[nivel])
lineas.push("Agua: " + FIN_AGUA[nivel])
lineas.push("Animales: " + FIN_ANIMALES[nivel])
if (probo) {
    lineas.push("Antes probaste no sembrar nada: el suelo se lavó y el nacimiento dio poca agua.")
}
lineas.push("Es un modelo en la pantalla.")
lineas.push("Una ladera real depende de su suelo y de sus árboles.")
experiencias.final("Ladera final", lineas)
