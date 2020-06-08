const app = require("express")();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const next = require("next");

const events = require("./event.json");

const port = parseInt(process.env.PORT) || 3000;
const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const nextHandler = nextApp.getRequestHandler();

const messages = [];

io.on("connection", socket => {
    socket.on(events.user.new, data => {
        console.log({ data });
        messages.push(data);
        socket.broadcast.emit(events.user.new, data);
    });


    //tu fais des fonctions de malade
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