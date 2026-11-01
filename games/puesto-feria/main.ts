// Mi puesto en la feria: preparas un puesto de fruta con monedas de juego y decides el costo, el precio y la cantidad.
// Es un ensayo: los números son del juego. La feria real la organiza tu docente.
// Calidad: 0 común, 1 buena, 2 especial. Precio y cantidad se eligen entre tres opciones.
const CALIDAD_NOMBRE = ["común", "buena", "especial"]
const COSTO_UNIDAD = [2, 3, 5]
const CLIENTES_EXTRA = [0, 2, 3]
const PRECIOS = [3, 5, 8]
const CLIENTES_BASE = [12, 9, 5]
const CANTIDADES = [6, 10, 14]
const FRUTAS: Image[] = [sprites.gg.manzana, sprites.gg.banano, sprites.gg.mango]
const C_SIT = [
    "Un puesto vende 6 frutas a 5 monedas cada una. ¿Cuál es el ingreso?",
    "Comprar 10 frutas a 3 monedas cada una. ¿Cuál es el costo?",
    "El ingreso fue 40 monedas y el costo 28. ¿Cuál es la ganancia?",
    "Cada fruta cuesta 5 monedas y la vendes a 4. ¿Qué pasa?",
    "Compraste 12 frutas y vendiste 8. ¿Qué mejora conviene?",
    "Un puesto vende 5 frutas a 8 monedas cada una. ¿Cuál es el ingreso?",
    "Comprar 14 frutas a 2 monedas cada una. ¿Cuál es el costo?",
    "El ingreso fue 45 monedas y el costo 20. ¿Cuál es la ganancia?",
    "Cada fruta cuesta 3 monedas y la vendes a 5. ¿Cuánto ganas por cada una?",
    "Se acabó toda la fruta y siguen llegando clientes. ¿Qué mejora conviene?"
]
const C_UNO = ["11 monedas", "30 monedas", "68 monedas", "Ganas en cada fruta que vendes", "Comprar menos la próxima vez", "40 monedas", "16 monedas", "65 monedas", "8 monedas", "Comprar más la próxima vez"]
const C_DOS = ["30 monedas", "13 monedas", "28 monedas", "Pierdes en cada fruta que vendes", "Comprar más la próxima vez", "13 monedas", "12 monedas", "25 monedas", "15 monedas", "Comprar menos la próxima vez"]
const C_TRES = ["25 monedas", "7 monedas", "12 monedas", "Ni ganas ni pierdes", "Subir el costo de la fruta", "45 monedas", "28 monedas", "20 monedas", "2 monedas", "Cerrar el puesto"]
const C_OK = [1, 0, 2, 1, 0, 0, 2, 1, 2, 0]
const SERIE_A = [0, 1, 2, 3, 4]
const SERIE_B = [5, 6, 7, 8, 9]
let calidad = 0
let precioOpcion = 0
let precio = 0
let cantidad = 0
let clientes = 0
let vendidos = 0
let costo = 0
let ingreso = 0
let ganancia = 0
let hecho = false

scene.setBackgroundImage(sprites.gg.fondoMercado)

function mostrarPuesto(compradas: number, vendidas: number) {
    sprites.destroyAllSpritesOfKind(SpriteKind.Food)
    let vendedor = sprites.create(sprites.gg.persona, SpriteKind.Food)
    vendedor.setPosition(160, 100)
    let inicio = 169 - Math.idiv(compradas * 18, 2)
    for (let i = 0; i < compradas; i++) {
        if (i < vendidas) {
            let moneda = sprites.create(sprites.gg.moneda, SpriteKind.Food)
            moneda.setPosition(inicio + 18 * i, 58)
        } else {
            let fruta = sprites.create(FRUTAS[i % 3], SpriteKind.Food)
            fruta.setPosition(inicio + 18 * i, 58)
        }
    }
    if (compradas > 0) {
        vendedor.sayText("Vendidas: " + vendidas + ". Sobran: " + (compradas - vendidas))
    }
}

function mostrarVendedor(texto: string) {
    sprites.destroyAllSpritesOfKind(SpriteKind.Food)
    let vendedor = sprites.create(sprites.gg.persona, SpriteKind.Food)
    vendedor.setPosition(160, 100)
    vendedor.sayText(texto)
}

function decidir(n: number): number {
    return experiencias.elegir(C_SIT[n], [C_UNO[n], C_DOS[n], C_TRES[n]], EjeEleccion.Vertical)
}

// Todas las cuentas salen de lo elegido: costo = cantidad por costo de cada una; ingreso = vendidas por precio.
function simular() {
    clientes = CLIENTES_BASE[precioOpcion] + CLIENTES_EXTRA[calidad]
    vendidos = cantidad
    if (clientes < cantidad) {
        vendidos = clientes
    }
    costo = cantidad * COSTO_UNIDAD[calidad]
    ingreso = vendidos * precio
    ganancia = ingreso - costo
}


function cuentaGanancia(): string {
    if (ganancia > 0) {
        return "Ganancia: " + ingreso + " - " + costo + " = " + ganancia + " monedas."
    }
    if (ganancia == 0) {
        return "Ni ganas ni pierdes: " + ingreso + " - " + costo + " = 0 monedas."
    }
    return "Pierdes " + (costo - ingreso) + " monedas: el ingreso (" + ingreso + ") es menor que el costo (" + costo + ")."
}

function sobranTexto(n: number): string {
    if (n == 1) {
        return "sobró 1 fruta, que ya pagaste"
    }
    return "sobraron " + n + " frutas, que ya pagaste"
}

function masClientes(n: number): string {
    if (n == 1) {
        return "llegó 1 cliente más"
    }
    return "llegaron " + n + " clientes más"
}

function pistaDelPuesto(): string {
    if (precio <= COSTO_UNIDAD[calidad]) {
        return "Cada fruta te cuesta " + COSTO_UNIDAD[calidad] + " monedas y la vendes a " + precio + ". Así no ganas. Prueba otro precio u otra fruta."
    }
    return "Compraste " + cantidad + " y vendiste " + vendidos + ": " + sobranTexto(cantidad - vendidos) + ". Prueba comprar menos."
}

function mejoraDelPuesto(): string {
    if (vendidos < cantidad) {
        return sobranTexto(cantidad - vendidos) + ". La próxima vez compra menos."
    }
    if (clientes > cantidad) {
        return "se acabó la fruta y " + masClientes(clientes - cantidad) + ". La próxima vez compra más."
    }
    return "vendiste todo y no sobró nada. Prueba otro precio y compara la ganancia."
}

function explorar() {
    experiencias.fase(FaseExperiencia.Explorar)
    mostrarVendedor("Mi puesto")
    experiencias.decir("Prepararás un puesto de fruta para una feria. Es un modelo en la pantalla, con monedas de juego.")
    experiencias.decir("Los números son del juego. La feria real la organiza tu docente.")
    let idea = experiencias.elegir("Sin miedo a equivocarte. ¿Qué crees que decide quien tiene un puesto?", ["El precio de lo que vende", "Cuánto prepara", "Las dos cosas"], EjeEleccion.Vertical)
    if (idea >= 0) {
        experiencias.decir("Cualquier idea sirve para empezar. Hoy decidirás tres cosas: la fruta, el precio y la cantidad.")
    }
}

function construir() {
    experiencias.fase(FaseExperiencia.Construir)
    mostrarPuesto(4, 0)
    experiencias.decir("El costo es lo que pagas por preparar el puesto. El precio es lo que cobras por cada fruta. La cantidad es cuántas frutas compras.")
    experiencias.decir("El ingreso es lo que recibes al vender: lo vendido por el precio. La ganancia es lo que queda del ingreso al restar el costo.")
    mostrarPuesto(4, 3)
    experiencias.decir("Ejemplo: compras 4 frutas a 2 monedas cada una. El costo es 4 por 2 = 8 monedas.")
    experiencias.decir("Vendes 3 a 4 monedas cada una. El ingreso es 3 por 4 = 12 monedas. La ganancia es 12 - 8 = 4 monedas.")
    experiencias.decir("Reglas del juego: con un precio de 3 monedas llegan 12 clientes; con 5, llegan 9; con 8, llegan 5.")
    experiencias.decir("Con fruta buena llegan 2 clientes más y con fruta especial, 3 más. Solo vendes la fruta que compraste.")
}

function aplicar() {
    experiencias.fase(FaseExperiencia.Aplicar)
    mostrarVendedor("Mi puesto")
    experiencias.decir("Arma tu puesto en tres pasos. Si no ganas monedas, tendrás una pista.")
    hecho = false
    while (!hecho) {
        calidad = experiencias.elegir("Paso 1. ¿Qué fruta compras? Eso fija el costo.", ["Común: cuesta 2 monedas cada una", "Buena: cuesta 3 monedas cada una", "Especial: cuesta 5 monedas cada una"], EjeEleccion.Vertical)
        precioOpcion = experiencias.elegir("Paso 2. ¿A qué precio vendes cada fruta?", ["3 monedas", "5 monedas", "8 monedas"], EjeEleccion.Vertical)
        precio = PRECIOS[precioOpcion]
        let opcionCantidad = experiencias.elegir("Paso 3. ¿Cuántas frutas compras?", ["6 frutas", "10 frutas", "14 frutas"], EjeEleccion.Vertical)
        cantidad = CANTIDADES[opcionCantidad]
        simular()
        mostrarPuesto(cantidad, vendidos)
        experiencias.decir("Compraste " + cantidad + " frutas de calidad " + CALIDAD_NOMBRE[calidad] + " a " + COSTO_UNIDAD[calidad] + " monedas cada una. Llegaron " + clientes + " clientes y vendiste " + vendidos + ".")
        experiencias.decir("Costo: " + cantidad + " por " + COSTO_UNIDAD[calidad] + " = " + costo + " monedas.")
        experiencias.decir("Ingreso: " + vendidos + " por " + precio + " = " + ingreso + " monedas.")
        experiencias.decir(cuentaGanancia())
        hecho = ganancia > 0
        if (!hecho) {
            experiencias.todaviaNo(pistaDelPuesto())
        }
    }
}

function comprobar() {
    experiencias.comprobar()
    experiencias.decir("Ahora, sin pistas: cinco cuentas del puesto. Necesitas 4 aciertos.")
    let serie = SERIE_A
    if (experiencias.serieActual() == 1) {
        serie = SERIE_B
    }
    mostrarVendedor("Cuentas")
    for (let i = 0; i < serie.length; i++) {
        let n = serie[i]
        experiencias.anotar(decidir(n) == C_OK[n])
    }
}

function reflexionar() {
    experiencias.fase(FaseExperiencia.Reflexionar)
    mostrarVendedor("Mi puesto")
    let respuesta = experiencias.elegir("¿Qué es la ganancia?", ["Lo que queda del ingreso al restar el costo", "Lo que pagas por la fruta", "Lo que cobras por cada fruta"], EjeEleccion.Vertical)
    if (respuesta == 0) {
        experiencias.decir("Así es. La ganancia es el ingreso menos el costo.")
    } else {
        experiencias.todaviaNo("La ganancia es lo que queda del ingreso al restar el costo.")
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
mostrarPuesto(cantidad, vendidos)
let lineas: string[] = ["Acertaste " + experiencias.aciertos() + " de 5. Este es el informe de tu puesto:"]
lineas.push("Fruta de calidad " + CALIDAD_NOMBRE[calidad] + ": costó " + COSTO_UNIDAD[calidad] + " monedas cada una.")
lineas.push("Compraste " + cantidad + " y vendiste cada una a " + precio + " monedas.")
lineas.push("Llegaron " + clientes + " clientes y vendiste " + vendidos + ".")
lineas.push("Costo: " + cantidad + " por " + COSTO_UNIDAD[calidad] + " = " + costo + " monedas.")
lineas.push("Ingreso: " + vendidos + " por " + precio + " = " + ingreso + " monedas.")
lineas.push(cuentaGanancia())
lineas.push("Mejora: " + mejoraDelPuesto())
lineas.push("Es un modelo en la pantalla. Los números son del juego, no de una feria real.")
experiencias.final("Informe del puesto", lineas)
