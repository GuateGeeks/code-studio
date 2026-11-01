// Vuelta al mundo: Geeky sale de Guatemala y viaja por un mapa esquemático. Cada paso mide 5° de latitud o 10° de longitud.
// cy cuenta pasos de 5° hacia el norte (negativo al sur) y cx cuenta pasos de 10° hacia el este (negativo al oeste).
const SALIDA_CY = 3
const SALIDA_CX = -9
const ZONA = ["cálida", "templada", "polar"]
const PISTA_ZONA = [
    "Entre los trópicos, hasta 23,5° de latitud, la zona es cálida.",
    "Entre 23,5° y 66,5° de latitud, la zona es templada.",
    "Más allá de 66,5° de latitud, la zona es polar."
]
const LUGAR_NOMBRE = ["Quito, Ecuador", "El Cairo, Egipto", "Ciudad de México", "Lima, Perú", "Buenos Aires, Argentina", "Londres, Reino Unido"]
const LUGAR_CY = [0, 6, 4, -2, -7, 10]
const LUGAR_CX = [-8, 3, -10, -8, -6, 0]
// Destinos por zona: 0 polar al norte, 1 templada al sur, 2 templada al norte, 3 polar al sur, 4 cálida al sur.
const MOV_ZONA = [2, 1, 1, 2, 0]
const MOV_HEMI = [1, -1, 1, -1, -1]
const MOV_TEXTO = [
    "la zona polar, al norte",
    "la zona templada, al sur del ecuador",
    "la zona templada, al norte del ecuador",
    "la zona polar, al sur",
    "la zona cálida, al sur del ecuador"
]
const MOV_PISTA = [
    "La zona polar empieza más allá de 66,5° de latitud. Sube hacia el norte.",
    "La zona templada va de 23,5° a 66,5° de latitud. Baja al sur del ecuador.",
    "La zona templada va de 23,5° a 66,5° de latitud. Sube al norte del ecuador.",
    "La zona polar empieza más allá de 66,5° de latitud. Baja hacia el sur.",
    "La zona cálida llega hasta 23,5° de latitud. Baja un poco al sur del ecuador."
]
const ALT_PREGUNTA = [
    "Quito está a más de 2 800 m de altura. ¿Cómo es su aire comparado con el de una costa a 0 m?",
    "Dos ciudades están en el ecuador: una a 3 000 m de altura y otra a 0 m. ¿Cuál tiene el aire más fresco?",
    "Subes de la costa a una montaña de la zona cálida. ¿Qué pasa con el aire al subir?"
]
const ALT_UNO = ["Más fresco", "La que está a 3 000 m", "Se hace más caliente"]
const ALT_DOS = ["Igual de caliente", "La que está a 0 m", "Se hace más fresco"]
const ALT_OK = [0, 0, 1]
// Cada ítem es [tipo, referencia]: tipo 0 es un lugar, 1 es una zona y 2 es una pregunta de altitud.
const APLICAR_ITEMS: number[][] = [[0, 0], [0, 1], [1, 4]]
const SERIE_A: number[][] = [[0, 2], [0, 3], [1, 0], [1, 1], [2, 1]]
const SERIE_B: number[][] = [[0, 4], [0, 5], [1, 2], [1, 3], [2, 2]]

let cy = SALIDA_CY
let cx = SALIDA_CX
let libre = false
let verZona = false
let destino = ""
let sellos: string[] = []
let selloZona: number[] = []
let selloCy: number[] = []
let selloCx: number[] = []

scene.setBackgroundImage(sprites.gg.fondoMundo)
let geeky = sprites.create(sprites.gg.geeky, SpriteKind.Player)

function coord(y: number, x: number): string {
    let lat = Math.abs(y) * 5 + "°"
    if (y > 0) {
        lat = lat + "N"
    } else if (y < 0) {
        lat = lat + "S"
    }
    let lon = Math.abs(x) * 10 + "°"
    if (x > 0) {
        lon = lon + "E"
    } else if (x < 0) {
        lon = lon + "O"
    }
    return lat + ", " + lon
}

function zona(y: number): number {
    let grados = Math.abs(y) * 5
    if (grados <= 20) {
        return 0
    }
    if (grados <= 65) {
        return 1
    }
    return 2
}

function colocar() {
    geeky.x = 160 + Math.idiv(cx * 80, 9)
    geeky.y = 120 - Math.idiv(cy * 20, 3)
    let texto = "Estás en: " + coord(cy, cx)
    if (destino != "") {
        texto = "Destino: " + destino + ". " + texto
    } else {
        texto = coord(cy, cx)
    }
    if (verZona) {
        texto = texto + ". Zona " + ZONA[zona(cy)]
    }
    geeky.sayText(texto)
}

function irASalida() {
    sprites.destroyAllSpritesOfKind(SpriteKind.Food)
    cy = SALIDA_CY
    cx = SALIDA_CX
    colocar()
}

function mover(dx: number, dy: number) {
    if (libre) {
        cx = Math.max(-17, Math.min(17, cx + dx))
        cy = Math.max(-16, Math.min(16, cy + dy))
        colocar()
    }
}

controller.right.onEvent(ControllerButtonEvent.Pressed, function () {
    mover(1, 0)
})
controller.right.onEvent(ControllerButtonEvent.Repeated, function () {
    mover(1, 0)
})
controller.left.onEvent(ControllerButtonEvent.Pressed, function () {
    mover(-1, 0)
})
controller.left.onEvent(ControllerButtonEvent.Repeated, function () {
    mover(-1, 0)
})
controller.up.onEvent(ControllerButtonEvent.Pressed, function () {
    mover(0, 1)
})
controller.up.onEvent(ControllerButtonEvent.Repeated, function () {
    mover(0, 1)
})
controller.down.onEvent(ControllerButtonEvent.Pressed, function () {
    mover(0, -1)
})
controller.down.onEvent(ControllerButtonEvent.Repeated, function () {
    mover(0, -1)
})

function marcar() {
    let marca = sprites.create(sprites.gg.mira, SpriteKind.Food)
    marca.x = geeky.x
    marca.y = geeky.y
}

function sellar(texto: string) {
    sellos.push(texto)
    selloZona.push(zona(cy))
    selloCy.push(cy)
    selloCx.push(cx)
}

function textoDestino(tipo: number, ref: number): string {
    if (tipo == 0) {
        return LUGAR_NOMBRE[ref] + " (" + coord(LUGAR_CY[ref], LUGAR_CX[ref]) + ")"
    }
    return MOV_TEXTO[ref]
}

function correcto(tipo: number, ref: number): boolean {
    if (tipo == 0) {
        return cy == LUGAR_CY[ref] && cx == LUGAR_CX[ref]
    }
    return zona(cy) == MOV_ZONA[ref] && cy * MOV_HEMI[ref] > 0
}

function pista(tipo: number, ref: number): string {
    if (tipo == 1) {
        return MOV_PISTA[ref] + " Inténtalo otra vez."
    }
    let y = LUGAR_CY[ref]
    let x = LUGAR_CX[ref]
    if (cy != y) {
        if ((cy > 0 && y < 0) || (cy < 0 && y > 0)) {
            return "Revisa el signo de la latitud: N está arriba del ecuador y S abajo. Inténtalo otra vez."
        }
        return "Revisa la latitud: es la distancia al ecuador. Cada paso son 5°. Inténtalo otra vez."
    }
    if ((cx > 0 && x < 0) || (cx < 0 && x > 0)) {
        return "Revisa el signo de la longitud: E está a la derecha del meridiano 0 y O a la izquierda. Inténtalo otra vez."
    }
    return "Revisa la longitud: es la distancia al meridiano 0. Cada paso son 10°. Inténtalo otra vez."
}

function unir(lista: string[]): string {
    if (lista.length == 1) {
        return lista[0]
    }
    let texto = ""
    for (let i = 0; i < lista.length - 1; i++) {
        if (i > 0) {
            texto = texto + ", "
        }
        texto = texto + lista[i]
    }
    return texto + " y " + lista[lista.length - 1]
}

// Pregunta la zona de un lugar al que ya llegaste y repite con pista hasta acertar.
function preguntarZona(nombre: string) {
    let hecho = false
    while (!hecho) {
        let enunciado = "¿En qué zona climática está " + nombre + "?"
        let respuesta = experiencias.elegir(enunciado, ["Cálida", "Templada", "Polar"], EjeEleccion.Horizontal)
        hecho = respuesta == zona(cy)
        if (hecho) {
            experiencias.decir("Así es: zona " + ZONA[zona(cy)] + ". En este mapa la zona se marca por la latitud.")
        } else {
            experiencias.todaviaNo(PISTA_ZONA[zona(cy)] + " Inténtalo otra vez.")
        }
    }
}

function explorar() {
    experiencias.fase(FaseExperiencia.Explorar)
    experiencias.decir("Geeky sale de Guatemala y recorre el mundo. Es un mapa esquemático en la pantalla: no es el mapa real.")
    experiencias.decir("Mueve a Geeky con las flechas. Mira cómo cambian sus números y la zona. Cuando termines, pulsa A.")
    verZona = true
    libre = true
    colocar()
    experiencias.confirmar()
    libre = false
}

function construir() {
    experiencias.fase(FaseExperiencia.Construir)
    verZona = false
    irASalida()
    destino = ""
    experiencias.decir("Geeky sale de Guatemala, a 15°N y 90°O. El norte está arriba y el este, a la derecha.")
    experiencias.decir("Vamos a Quito, en Ecuador. Primero la latitud: es la distancia al ecuador, medida en grados. Quito está a 0°.")
    for (let i = 0; i < 3; i++) {
        cy -= 1
        colocar()
        pause(500)
    }
    experiencias.decir("Ahora la longitud: es la distancia al meridiano 0, que pasa por Greenwich. Quito está a 80° al oeste.")
    cx += 1
    colocar()
    pause(500)
    marcar()
    experiencias.decir("Llegaste a Quito: 0°, 80°O. N y S dicen si estás al norte o al sur del ecuador. E y O, si estás al este o al oeste.")
    experiencias.decir("La altitud es la altura sobre el nivel del mar. Quito está a más de 2 800 m. Mientras más alto estás, más fresco es el aire.")
    experiencias.decir("Las zonas climáticas se marcan por la latitud. Cálida: hasta 23,5° al norte y al sur del ecuador. Templada: de 23,5° a 66,5°. Polar: más allá de 66,5°.")
    experiencias.decir("Quito está en la zona cálida. Es un modelo: el clima real también cambia con la altitud y con otros factores.")
}

function aplicar() {
    experiencias.fase(FaseExperiencia.Aplicar)
    sellos = []
    selloZona = []
    selloCy = []
    selloCx = []
    experiencias.decir("Ahora viajas tú desde Guatemala. Lleva a Geeky al destino y pulsa A. Si te equivocas, tendrás una pista.")
    for (let i = 0; i < APLICAR_ITEMS.length; i++) {
        let tipo = APLICAR_ITEMS[i][0]
        let ref = APLICAR_ITEMS[i][1]
        destino = textoDestino(tipo, ref)
        irASalida()
        libre = true
        let listo = false
        while (!listo) {
            experiencias.confirmar()
            if (correcto(tipo, ref)) {
                listo = true
            } else {
                libre = false
                experiencias.todaviaNo(pista(tipo, ref))
                libre = true
            }
        }
        libre = false
        marcar()
        if (tipo == 0) {
            sellar(LUGAR_NOMBRE[ref] + ": zona " + ZONA[zona(cy)])
            preguntarZona(LUGAR_NOMBRE[ref])
        } else {
            sellar(coord(cy, cx) + ": zona " + ZONA[zona(cy)])
            experiencias.decir("Llegaste a " + coord(cy, cx) + ": zona " + ZONA[zona(cy)] + ".")
        }
        if (i == 0) {
            let hecho = false
            while (!hecho) {
                let respuesta = experiencias.elegir(ALT_PREGUNTA[0], [ALT_UNO[0], ALT_DOS[0]], EjeEleccion.Vertical)
                hecho = respuesta == ALT_OK[0]
                if (hecho) {
                    experiencias.decir("Así es. Quito está en la zona cálida, pero a esa altura el aire es más fresco.")
                } else {
                    experiencias.todaviaNo("Mientras más alto estás, más fresco es el aire. Inténtalo otra vez.")
                }
            }
        }
    }
    destino = ""
}

function comprobar() {
    experiencias.comprobar()
    experiencias.decir("Ahora, sin pistas: cinco pruebas del viaje. Necesitas 4 aciertos.")
    let preguntas = SERIE_A
    if (experiencias.serieActual() == 1) {
        preguntas = SERIE_B
    }
    for (let i = 0; i < preguntas.length; i++) {
        let tipo = preguntas[i][0]
        let ref = preguntas[i][1]
        let acierto = false
        if (tipo == 2) {
            destino = ""
            geeky.sayText("")
            let respuesta = experiencias.elegir(ALT_PREGUNTA[ref], [ALT_UNO[ref], ALT_DOS[ref]], EjeEleccion.Vertical)
            acierto = respuesta == ALT_OK[ref]
        } else {
            destino = textoDestino(tipo, ref)
            irASalida()
            libre = true
            experiencias.confirmar()
            libre = false
            acierto = correcto(tipo, ref)
            if (acierto) {
                marcar()
                if (tipo == 0) {
                    sellar(LUGAR_NOMBRE[ref] + ": zona " + ZONA[zona(cy)])
                } else {
                    sellar(coord(cy, cx) + ": zona " + ZONA[zona(cy)])
                }
            }
        }
        experiencias.anotar(acierto)
        geeky.sayText("Anotado")
        pause(700)
    }
    destino = ""
}

function reflexionar() {
    experiencias.fase(FaseExperiencia.Reflexionar)
    geeky.sayText("")
    let respuesta = experiencias.elegir("¿Qué dato de un lugar ayuda a saber su zona climática?", ["La longitud: la distancia al meridiano 0", "La latitud: la distancia al ecuador"], EjeEleccion.Vertical)
    if (respuesta == 1) {
        experiencias.decir("Así es. La latitud dice qué tan lejos del ecuador está un lugar, y eso marca su zona.")
    } else {
        experiencias.todaviaNo("La latitud es la distancia al ecuador, y eso marca la zona. La longitud dice si estás al este o al oeste.")
    }
}

function mostrarSellos() {
    geeky.destroy()
    sprites.destroyAllSpritesOfKind(SpriteKind.Food)
    for (let i = 0; i < sellos.length; i++) {
        let marca = sprites.create(sprites.gg.mira, SpriteKind.Food)
        marca.x = 160 + Math.idiv(selloCx[i] * 80, 9)
        marca.y = 120 - Math.idiv(selloCy[i] * 20, 3)
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
mostrarSellos()
let lineas: string[] = ["Acertaste " + experiencias.aciertos() + " de 5 en la prueba. Tu pasaporte tiene estos sellos:"]
let zonasVistas: string[] = []
for (let i = 0; i < ZONA.length; i++) {
    if (selloZona.indexOf(i) >= 0) {
        zonasVistas.push(ZONA[i])
    }
}
for (let i = 0; i < sellos.length; i++) {
    lineas.push(sellos[i])
}
lineas.push("Zonas visitadas: " + unir(zonasVistas) + ".")
lineas.push("El mapa es esquemático: las zonas se marcan por la latitud.")
experiencias.final("Pasaporte de Geeky", lineas)
