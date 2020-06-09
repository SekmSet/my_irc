const app = require("express")();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const next = require("next");
const ent = require("ent");
var uniqid = require('uniqid');


const events = require("./event.json");

const port = parseInt(process.env.PORT) || 3000;
const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const nextHandler = nextApp.getRequestHandler();

const messages = [];
const users = [];

io.on("connection", socket => {
    let user = null;

    socket.on(events.user.new, data => {
        messages.push(data);
        user = { nickname: data.value, id: data.id }
        socket.broadcast.emit(events.user.new, data);
    });

    socket.on(events.message.new, data => {
        /*      message = ent.encode(message); */
        console.log(data);
        // sending to all clients except sender
        socket.broadcast.emit(events.message.new, {
            nickname: user.nickname,
            chat: data.chat,
            id: uniqid()
        });
        /* console.log(data.value) */
    })
});


nextApp.prepare().then(() => {
    app.get("*", (req, res) => {
        return nextHandler(req, res);
    });

    server.listen(port, err => {
        if (err) throw err;
        console.log(`> Ready on http://localhost:${port}`);
    });
});