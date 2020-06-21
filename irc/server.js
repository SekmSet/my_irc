const app = require("express")();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const next = require("next");
const moment = require('moment'); // require
const uniqid = require('uniqid');

const events = require("./event.json");

const port = parseInt(process.env.PORT) || 3000;
const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const nextHandler = nextApp.getRequestHandler();
const defaultChannel = 'default';

let users = [];
let channels = [{
    name: defaultChannel,
    id: uniqid(),
    user: {},
    list: [],
    create_at: moment(),
    last_message: moment(),
}];

const chanMustBeDeletedAfter = 5; // in minute

function createNewChannel(data, user) {
    channel = { name: data.value, id: data.id, user, list: [], create_at: moment(), last_message: moment() };
    channels.push(channel);
    io.emit(events.channel.new, channel);
}

setInterval(() => {
    const timeRef = moment().subtract(chanMustBeDeletedAfter, 'minutes');
    channels.forEach((chan, key) => {
        if (timeRef > chan.last_message && chan.name !== defaultChannel) {
            channels = channels.filter(c => c.id !== chan.id);
            io.emit(events.channel.delete, { channelDelete: chan.name, id: chan.id, user: { nickname: 'server'} });
            console.log(`${chan.name} deleted`);
        }
    })
}, 1000)

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
        user = { nickname: data.value, id: data.id, socket: socket.id };
        users.push(user);
        channels.find(e => e.name === defaultChannel).list.push(user);
        // pour moi tu envois tous les users
        socket.emit(events.user.new, { users, channels });
        // pour les autres tu envois le nouvel user
        socket.broadcast.emit(events.user.new, user);
    });

    // MESSAGE
    socket.on(events.message.new, (data, room) => {
        const regex = /\/(nick|delete|create|part|join|users|list|msg|rename) ?(\w*) ?(.*)/gm;
        const parseMessage = regex.exec(data.chat);
        let commandName = null;
        let commandMessage = null;
        let option = null;

        if (parseMessage) {
            commandName = parseMessage[1];
            commandMessage = parseMessage[2];
            option = parseMessage[3];
        }

        if (commandName === 'nick') {
            let tmpUsername = user.nickname
            user.nickname = commandMessage;
            data.chat = `${tmpUsername} change his name, his new name is : ${user.nickname}`;
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
            if (chan) {
                socket.join(commandMessage);
                chan.list.push(user);
                io.in(commandMessage).emit(events.channel.join, { name: commandMessage, user });
            }
        } else if (commandName === 'part') {
            const chan = channels.find(e => e.name === commandMessage)
            if (chan) {
                chan.list.filter((u) => u.nickname !== user.nickname);
                socket.join(defaultChannel);
                socket.emit(events.channel.join, { name: defaultChannel, user });
            }
        } else if (commandName === 'delete') {
            const chan = channels.find(e => e.name === commandMessage);
            if (chan) {
                channels = channels.filter(chan => chan.name !== commandMessage);
                io.emit(events.channel.delete, { channelDelete: commandMessage, id: chan.id, user });
            }
        } else if (commandName === 'users') {
            const chan = channels.find(e => e.name === room);
            if (chan) {
                const us = chan.list.map(u => u.nickname).join(', ');
                socket.emit(events.message.new, {
                    nickname: 'List of membres ',
                    chat: us,
                    id: uniqid(),
                    room: room
                });
            }
        } else if (commandName === 'list') {
            let matchedChannel = null;

            if (commandMessage) {
                console.log(commandMessage);
                const regex = new RegExp(commandMessage);
                matchedChannel = channels.filter(({ name }) => name.match(regex)).map(({ name }) => name);
                console.log(matchedChannel)
            } else {
                console.log(commandMessage);
                matchedChannel = channels.map(c => c.name);
                console.log(matchedChannel)
            }

            socket.emit(events.message.new, {
                nickname: 'List of channels ',
                chat: matchedChannel.join(', '),
                id: uniqid(),
                room: room
            });
        } else if (commandName === 'msg') {
            if (commandMessage && option) {
                console.log(commandMessage, ' - ', option);
                const u = users.find(({ nickname }) => nickname === commandMessage);
                console.log(u)
                if (u) {
                    socket.broadcast.to(u.socket).emit(events.message.new, {
                        nickname: user.nickname,
                        chat: option,
                        id: uniqid(),
                        room: room,
                        isPrivate: true
                    });
                }
            }
        } else if (commandName === 'rename') {
            const currentChan = channels.find(({ name }) => name === room);
            if (currentChan.user.id !== user.id) {
                socket.emit(events.message.new, {
                    nickname: user.nickname,
                    chat: "You cannot drop this because you are not admin!",
                    id: uniqid(),
                    room: room,
                    isPrivate: true
                })
                return;
            }

            channels = channels.map(c => {
                if (currentChan.user.id === user.id && currentChan.id === c.id) {
                    c.name = commandMessage
                    c.last_message = moment()
                }

                return c;
            });

            io.emit(events.channel.rename, {
                channels,
                oldChanName: room,
                newChanName: commandMessage,
                nickname: user.nickname
            })
        }
        else {
            io.in(room).emit(events.message.new, {
                nickname: user.nickname,
                chat: data.chat,
                id: uniqid(),
                room: room
            });
            const c = channels.find(({ name }) => name === room);
            if (c) {
                c.update_at = moment();
            }
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

    // CHANNEL JOIN
    socket.on(events.channel.rename, data => {
        const chan = channels.find(e => e.name === data);
        if (chan) {
            socket.join(data);
        }
    });

    //DELETE CHANNEL
    socket.on(events.channel.delete, data => {
        channels = channels.filter(chan => chan.id !== data.id);
        io.emit(events.channel.delete, data);
        console.log(data);
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