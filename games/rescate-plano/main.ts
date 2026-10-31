let paso = 0
let geeky = sprites.create(sprites.gg.geeky, SpriteKind.Player)

function emitir() {
    paso += 1
    control.simmessages.send("gg-experiencia", Buffer.fromUTF8("{\"fase\":\"explorar\",\"paso\":" + paso + "}"), true)
}

controller.A.onEvent(ControllerButtonEvent.Pressed, function () {
    emitir()
})
geeky.sayText("Rescate en el plano")
emitir()
