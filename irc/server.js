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

function createNewChannel(data, user) {
    channel = {name: data.value, id: data.id, user};
    channels.push(channel);
    io.emit(events.channel.new, channel);
}

io.on("connection", socket => {
    let user = null;
    let channel = 'default';

    // socket.emit envoie a moi
    // socket.broadcast.emit envoie a tous le monde sauf moi
    // io.emit envoie à tous le monde

    // socket.broadcast.to(_channelName).emit ->  all in a channel without me
    // io.in(_channelName).emit -> all in a channel with me
    // socket.broadcast.to(socketid).emit -> One user with specific id

    // USER
    socket.on(events.user.new, data => {
        socket.join(channel)

        user = { nickname: data.value, id: data.id };
        users.push(user);
        // pour moi tu envois tous les users
        socket.emit(events.user.new, {users, channels});
        // pour les autres tu envois le nouvel user
        socket.broadcast.emit(events.user.new, user);
    });

    // MESSAGE
    socket.on(events.message.new, (data, room) => {
        const regex = /\/(msg|nick|delete|create|part|join) (\w*) ?(.*)/gm;
        const parseMessage = regex.exec(data.chat);
        let commandName = null;
        let commandMessage = null;

        if(parseMessage){
             commandName = parseMessage[1];
             commandMessage = parseMessage[2];
        }

        if(commandName === 'nick'){
            let tmpUsername = user.nickname
            user.nickname = commandMessage;
            data.chat = `${tmpUsername} a changé son username est s'appelle mainement ${user.nickname}`;
            socket.emit(events.user.nickname, {user, oldNickname: tmpUsername, me: true});
            socket.broadcast.emit(events.user.nickname, {user, oldNickname: tmpUsername, me: false});
        }
        else if(commandName === 'create'){
            createNewChannel({
                value: commandMessage,
                id: uniqid()
            }, user)
        } else if(commandName === 'join'){
            socket.join(commandMessage);
            io.in(commandMessage).emit(events.channel.join, {name: commandMessage, user});
        } else {
            io.in(room).emit(events.message.new, {
                nickname: user.nickname,
                chat: data.chat,
                id: uniqid(),
                room: room
            });
        }
    })

    // CHANNEL CREATE
    socket.on(events.channel.new, data => {
        //messages.push(data);
       createNewChannel(data, user);
    });

    // CHANNEL JOIN
    socket.on(events.channel.join, data => {
       socket.join(data);
    });

    // CHANNEL LEAVE
    socket.on(events.channel.part, data => {
        console.log('leave a channel', data);
        socket.leave(data);
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