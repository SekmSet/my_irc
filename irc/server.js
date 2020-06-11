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
let users = [];
const channels = [];

io.on("connection", socket => {
    let user = null;
    let channel = null;

    // socket.emit envoie a moi
    // socket.broadcast.emit envoie a tous le monde sauf moi
    // io.emit envoie à tous le monde

    socket.on(events.user.new, data => {
        user = { nickname: data.value, id: data.id };
        users.push(user);
        // pour moi tu envois tous les users
        socket.emit(events.user.new, {users, channels});
        // pour les autres tu envois le nouvel user
        socket.broadcast.emit(events.user.new, user);
    });

    socket.on(events.message.new, data => {
        io.emit(events.message.new, {
            nickname: user.nickname,
            chat: data.chat,
            id: uniqid()
        });
    })

    // CHANNEL
    socket.on(events.channel.new, data => {
        //messages.push(data);
        channel = { name: data.value, id: data.id, user };
        channels.push(channel);

        io.emit(events.channel.new, channel);
    });

    // DISCONNECT
    socket.on('disconnect', function () {
        if (user) {
            socket.broadcast.emit(events.user.disconnect, user);
            users = users.filter(usr => usr.id !== user.id );
        }
    });
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