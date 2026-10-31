# Atrapa la fruta

### @explicitHints true

## {¡Hola! @showdialog}

¡Hola! Soy **Geeky**, las gafas de GuateGeeks.

Hoy vas a crear tu propio juego: las frutas caen del cielo y tú las atrapas antes de que se acabe el tiempo.

## {Paso 1: Pinta el cielo}

Las frutas van a caer del cielo, así que primero vamos a pintarlo.

En **Escenario**, toma **establecer color de fondo a** y ponlo dentro de **al inicio**. Haz clic en el color y elige celeste.

#### ~ tutorialhint

```blocks
scene.setBackgroundColor(9)
```

## {Paso 2: Aparece Geeky}

Primero necesito entrar al juego.

En **Sprites**, busca **establecer mySprite como** y ponlo debajo del bloque anterior. Después haz clic en el cuadro gris y abre **Galería**. Pulsa **Filtro**, marca **Gg** y búscame: soy las gafas.

#### ~ tutorialhint

```blocks
let mySprite = sprites.create(sprites.gg.geeky, SpriteKind.Player)
```

## {Paso 3: Muéveme}

Quiero moverme con las flechas del teclado.

En **Controles**, toma **mover mySprite con los botones** y ponlo debajo del bloque anterior. Después agrega **establecer mySprite permanecer en pantalla**, de **Sprites**, para que no me salga del juego.

Haz clic en la pantallita y prueba las flechas: ¿me muevo?

#### ~ tutorialhint

```blocks
let mySprite: Sprite = null
controller.moveSprite(mySprite)
mySprite.setStayInScreen(true)
```

## {Paso 4: Que caigan frutas}

Ahora vienen las frutas.

En **Juego**, arrastra **actualizar juego cada** al área de trabajo. Mete dentro **establecer projectile como proyectil**, de **Sprites**. Elige una fruta en la **Galería**, con el filtro **Gg**. Pon **vx** en `0` y **vy** en `80` para que caiga.

#### ~ tutorialhint

```blocks
game.onUpdateInterval(1000, function () {
    let projectile = sprites.createProjectileFromSide(sprites.gg.manzana, 0, 80)
})
```

## {Paso 5: Por todo el cielo}

Todas caen por el mismo lugar. ¡Qué fácil!

Agrega **establecer mySprite x como** debajo del proyectil y cambia `mySprite` por `projectile`. En el número, pon **escoger al azar de** `10` **a** `310`, que está en **Matemáticas**.

#### ~ tutorialhint

```blocks
let projectile: Sprite = null
projectile.x = randint(10, 310)
```

## {Paso 6: Atrápala}

Cuando yo toque una fruta, debe desaparecer.

En **Sprites**, arrastra **cuando el sprite de tipo Player coincide** al área de trabajo y cambia el segundo tipo a **Projectile**. Mete dentro **destruir** y pon `otherSprite` en él.

#### ~ tutorialhint

```blocks
sprites.onOverlap(SpriteKind.Player, SpriteKind.Projectile, function (sprite, otherSprite) {
    sprites.destroy(otherSprite)
})
```

## {Paso 7: Cuenta tus puntos}

Cada fruta atrapada vale un punto.

En **Información**, toma **cambiar puntaje por** `1` y ponlo dentro de **cuando el sprite de tipo Player coincide**.

#### ~ tutorialhint

```blocks
info.changeScoreBy(1)
```

## {Paso 8: Contra el reloj}

Un buen juego tiene un final.

En **Información**, toma **iniciar cuenta atrás** `30` y ponlo al final de **al inicio**.

#### ~ tutorialhint

```blocks
info.startCountdown(30)
```

## {¡Lo lograste! @showdialog}

¡Tu juego está listo! Haz clic en la pantallita, juega una partida y mira cuántas frutas atrapas en 30 segundos.

¿Quieres un reto? Haz que caigan más rápido, cambia la fruta o intenta atrapar más de 20.

Cuando termines, pulsa **Terminar el tutorial**.
