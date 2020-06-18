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

const defaultChannel = 'default';

const messages = [];
let users = [];
let channels = [{
    name: defaultChannel,
    id: uniqid(),
    user: {},
    list:[]
}];

function createNewChannel(data, user) {
    channel = { name: data.value, id: data.id, user, list: []};
    channels.push(channel);
    io.emit(events.channel.new, channel);
}

io.on("connection", socket => {
    let user = null;
    let channel = defaultChannel;

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
        channels.find(e => e.name === defaultChannel).list.push(user);
        // pour moi tu envois tous les users
        socket.emit(events.user.new, { users, channels });
        // pour les autres tu envois le nouvel user
        socket.broadcast.emit(events.user.new, user);
    });

    // MESSAGE
    socket.on(events.message.new, (data, room) => {
        const regex = /\/(nick|delete|create|part|join|users|list) ?(\w*) ?(.*)/gm;
        const parseMessage = regex.exec(data.chat);
        let commandName = null;
        let commandMessage = null;

        if(parseMessage){
             commandName = parseMessage[1];
             commandMessage = parseMessage[2];
        }

        if (commandName === 'nick') {
            let tmpUsername = user.nickname
            user.nickname = commandMessage;
            data.chat = `${tmpUsername} a changé son username est s'appelle mainement ${user.nickname}`;
            socket.emit(events.user.nickname, { user, oldNickname: tmpUsername, me: true });
            socket.broadcast.emit(events.user.nickname, { user, oldNickname: tmpUsername, me: false });
        }
        else if (commandName === 'create') {
            createNewChannel({
                value: commandMessage,
                id: uniqid()
            }, user)
        } else if (commandName === 'join') {
            const chan = channels.find(e => e.name === commandMessage);
            if (chan){
                socket.join(commandMessage);
                chan.list.push(user);
                io.in(commandMessage).emit(events.channel.join, {name: commandMessage, user});
            }
        } else if(commandName === 'part'){
            const chan = channels.find(e => e.name === commandMessage)
            if (chan) {
                chan.list.filter((u) => u.nickname !== user.nickname);
                socket.join(defaultChannel);
                socket.emit(events.channel.join, {name: defaultChannel, user});
            }
        } else if (commandName === 'delete'){
            const chan = channels.find(e => e.name === commandName);
            if (chan) {
                channels = channels.filter(chan => chan.name !== commandMessage);
                io.emit(events.channel.delete, {channelDelete : commandMessage, id: chan.id});
            }
        } else if(commandName ==='users'){
            const chan = channels.find(e => e.name === room);
            if(chan){
                const us = chan.list.map(u => u.nickname).join(', ');
                socket.emit(events.message.new, {
                    nickname: 'List des membres ',
                    chat: us,
                    id: uniqid(),
                    room: room
                });
            }
        } else if(commandName ==='list'){
            let matchedChannel = null;

            if(commandMessage){
                console.log(commandMessage);
                const regex = new RegExp(commandMessage);
                matchedChannel = channels.filter(({name}) => name.match(regex)).map(({name}) => name);
                console.log(matchedChannel)
            } else {
                console.log(commandMessage);
                matchedChannel = channels.map(c => c.name);
                console.log(matchedChannel)
            }

            socket.emit(events.message.new, {
                nickname: 'List des channels ',
                chat: matchedChannel.join(', '),
                id: uniqid(),
                room: room
            });
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
        createNewChannel(data, user);
    });

    // CHANNEL JOIN
    socket.on(events.channel.join, data => {
        const chan = channels.find(e => e.name === data);
        if (chan) {
            socket.join(data);
            chan.list.push(user);
        }
    });

    //DELETE CHANNEL
    socket.on(events.channel.delete, data => {
        channels = channels.filter(chan => chan.id !== data.id);
        io.emit(events.channel.delete, data);
    })

    // DISCONNECT
    socket.on('disconnect', function () {
        if (user) {
            socket.broadcast.emit(events.user.disconnect, user);
            users = users.filter(usr => usr.id !== user.id);
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