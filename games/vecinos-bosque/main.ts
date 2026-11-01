// Vecinos del bosque: una guardarrecursos te enseña relaciones entre seres vivos en un bosque nuboso.
// Tipos: 0 parasitismo, 1 mutualismo, 2 comensalismo. Parásitos: 0 externo, 1 interno.
const ICONOS: Image[] = [sprites.gg.colibri, sprites.gg.abeja, sprites.gg.flor, sprites.gg.arbol, sprites.gg.bromelia, sprites.gg.hongo, sprites.gg.garrapata, sprites.gg.lombriz, sprites.gg.persona, sprites.gg.perro]
const NOMBRE = ["Colibrí y flor", "Bromelia y árbol", "Garrapata y perro", "Lombriz y persona", "Abeja y flor", "Musgo y tronco", "Pulga y perro", "Hongo y raíces", "Garrapata y persona", "Helecho y rama", "Lombriz y perro", "Murciélago y flor", "Ave y frutos", "Pulga y gato", "Orquídea y árbol", "Tenia y persona", "Liquen"]
const TEXTO = [
    "Un colibrí toma néctar de una flor y lleva su polen a otras flores.",
    "Una bromelia crece sobre la rama de un árbol. Gana un lugar con luz. Al árbol no le pasa nada.",
    "Una garrapata se pega a la piel de un perro y se alimenta de su sangre.",
    "Una lombriz vive dentro del intestino de una persona y se alimenta de lo que ella come.",
    "Una abeja toma néctar de una flor y lleva su polen a otras flores.",
    "Un musgo crece sobre el tronco de un árbol. Gana un lugar donde vivir. Al árbol no le pasa nada.",
    "Una pulga vive entre el pelo de un perro y se alimenta de su sangre.",
    "Un hongo vive en las raíces de un árbol. Ayuda a la raíz a tomar agua y recibe alimento del árbol.",
    "Una garrapata se pega a la piel de una persona que camina por el monte y se alimenta de su sangre.",
    "Un helecho crece sobre la rama de un árbol. Gana un lugar con luz. Al árbol no le pasa nada.",
    "Una lombriz vive dentro del intestino de un perro y se alimenta de lo que él come.",
    "Un murciélago toma néctar de flores de noche y lleva polen de una flor a otra.",
    "Un ave come frutos y deja las semillas en otros sitios. El ave se alimenta y la planta se esparce.",
    "Una pulga vive entre el pelo de un gato y se alimenta de su sangre.",
    "Una orquídea crece sobre el tronco de un árbol. Gana un lugar con luz. Al árbol no le pasa nada.",
    "Una tenia vive dentro del intestino de una persona y se alimenta de lo que ella come.",
    "Un liquen es un hongo y un alga que viven juntos. El alga hace alimento con la luz y el hongo la protege."
]
const ICONO_A = [0, 4, 6, 7, 1, 3, -1, 5, 6, -1, 7, -1, -1, -1, 2, -1, 5]
const ICONO_B = [2, 3, 9, 8, 2, -1, 9, 3, 8, 3, 9, 2, -1, -1, 3, 8, -1]
const TIPO = [1, 2, 0, 0, 1, 2, 0, 1, 0, 2, 0, 1, 1, 0, 2, 0, 1]
const EXTERNO = [-1, -1, 0, 1, -1, -1, 0, -1, 0, -1, 1, -1, -1, 0, -1, 1, -1]
const GANA = ["gana el parásito; pierde el hospedero.", "ganan los dos.", "gana uno; al otro no le pasa nada."]
const SERIE_A = [7, 8, 9, 10, 11]
const SERIE_B = [12, 13, 14, 15, 16]
const PRACTICA = [4, 5, 6]
let halladas: number[] = []

scene.setBackgroundImage(sprites.gg.fondoBosque)

function mostrarPar(n: number) {
    sprites.destroyAllSpritesOfKind(SpriteKind.Food)
    if (ICONO_A[n] >= 0) {
        let uno = sprites.create(ICONOS[ICONO_A[n]], SpriteKind.Food)
        uno.setPosition(115, 105)
    }
    if (ICONO_B[n] >= 0) {
        let otro = sprites.create(ICONOS[ICONO_B[n]], SpriteKind.Food)
        otro.setPosition(205, 105)
    }
}

function clasificar(texto: string): number {
    return experiencias.elegir(texto + " ¿Qué relación es?", ["Parasitismo", "Mutualismo", "Comensalismo"], EjeEleccion.Horizontal)
}

function tipoDeParasito(): number {
    return experiencias.elegir("Es un parásito. ¿Vive fuera o dentro del cuerpo?", ["Fuera: externo", "Dentro: interno"], EjeEleccion.Horizontal)
}

function pistaDe(n: number): string {
    let pista = "En el parasitismo gana el parásito y el otro sale perdiendo. Inténtalo otra vez."
    if (TIPO[n] == 1) {
        pista = "En el mutualismo ganan los dos. Inténtalo otra vez."
    } else if (TIPO[n] == 2) {
        pista = "En el comensalismo gana uno y al otro no le pasa nada. Inténtalo otra vez."
    }
    return pista
}

function explorar() {
    experiencias.fase(FaseExperiencia.Explorar)
    experiencias.decir("Eres aprendiz de guardarrecursos. Hoy recorres un bosque nuboso de Baja Verapaz.")
    experiencias.decir("Es un modelo en la pantalla: los dibujos son esquemas.")
    experiencias.decir("En el bosque, los seres vivos dependen unos de otros. Mira a estos vecinos.")
    mostrarPar(0)
    experiencias.decir(TEXTO[0])
    let idea = experiencias.elegir("Sin miedo a equivocarte. ¿A quién le sirve esta relación?", ["Al colibrí", "A la flor", "A los dos"], EjeEleccion.Horizontal)
    if (idea >= 0) {
        experiencias.decir("Cualquier idea sirve para empezar. Ahora veremos cómo se llaman estas relaciones.")
    }
}

function construir() {
    experiencias.fase(FaseExperiencia.Construir)
    experiencias.decir("Hay tres clases de relaciones. Se distinguen por quién gana.")
    mostrarPar(0)
    experiencias.decir("Mutualismo: ganan los dos. El colibrí toma néctar y la flor recibe polen de otras flores.")
    mostrarPar(1)
    experiencias.decir("Comensalismo: gana uno y al otro no le pasa nada. La bromelia gana un lugar con luz. Al árbol no le hace daño.")
    mostrarPar(2)
    experiencias.decir("Parasitismo: gana el parásito y el otro sale perdiendo. La garrapata es el parásito y el perro es el hospedero.")
    experiencias.decir("Un parásito externo vive fuera del cuerpo, como la garrapata.")
    mostrarPar(3)
    experiencias.decir("Un parásito interno vive dentro del cuerpo, como la lombriz del intestino.")
    experiencias.decir("Las personas también tenemos parásitos. Lavarte las manos ayuda a prevenir las lombrices.")
}

function aplicar() {
    experiencias.fase(FaseExperiencia.Aplicar)
    experiencias.decir("Ahora practica con tres relaciones. Si te equivocas, tendrás una pista.")
    for (let i = 0; i < PRACTICA.length; i++) {
        let n = PRACTICA[i]
        mostrarPar(n)
        let correcto = false
        while (!correcto) {
            let respuesta = clasificar(TEXTO[n])
            correcto = respuesta == TIPO[n]
            if (!correcto) {
                experiencias.todaviaNo(pistaDe(n))
            }
        }
        if (TIPO[n] == 0) {
            correcto = false
            while (!correcto) {
                let tipo = tipoDeParasito()
                correcto = tipo == EXTERNO[n]
                if (!correcto) {
                    experiencias.todaviaNo("El parásito externo vive fuera del cuerpo. El interno vive dentro. Inténtalo otra vez.")
                }
            }
        }
        experiencias.decir("Así es: " + NOMBRE[n] + ", " + GANA[TIPO[n]])
    }
}

function comprobar() {
    experiencias.comprobar()
    experiencias.decir("Ahora, sin pistas: cinco relaciones. Necesitas 4 aciertos.")
    let serie = SERIE_A
    if (experiencias.serieActual() == 1) {
        serie = SERIE_B
    }
    halladas = []
    for (let i = 0; i < serie.length; i++) {
        let n = serie[i]
        mostrarPar(n)
        let acierto = clasificar(TEXTO[n]) == TIPO[n]
        if (acierto && TIPO[n] == 0) {
            acierto = tipoDeParasito() == EXTERNO[n]
        }
        experiencias.anotar(acierto)
        if (acierto) {
            halladas.push(n)
        }
    }
}

function reflexionar() {
    experiencias.fase(FaseExperiencia.Reflexionar)
    sprites.destroyAllSpritesOfKind(SpriteKind.Food)
    let respuesta = experiencias.elegir("En el mutualismo, ¿quién gana?", ["Solo uno", "Los dos", "Ninguno"], EjeEleccion.Horizontal)
    if (respuesta == 1) {
        experiencias.decir("Así es. En el mutualismo ganan los dos.")
    } else {
        experiencias.todaviaNo("En el mutualismo ganan los dos seres vivos.")
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
let lineas: string[] = ["Acertaste " + experiencias.aciertos() + " de 5. Estas relaciones hallaste:"]
for (let i = 0; i < halladas.length; i++) {
    lineas.push(NOMBRE[halladas[i]] + ": " + GANA[TIPO[halladas[i]]])
}
experiencias.final("Cuaderno de campo", lineas)
