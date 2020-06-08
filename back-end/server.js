const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const http = require('http');

require('dotenv').config();

// Connexion MongoDB
// const host = process.env.DB_HOST;
// const db_port = process.env.DB_PORT;
// const db_name = process.env.DB_NAME;
//
// mongoose.connect(`mongodb://${host}:${db_port}/${db_name}`, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//     useCreateIndex: true,
//     useFindAndModify: false
// })
//     .then(() => console.log('Now connected to MongoDB!'))
//     .catch(err => console.error('Something went wrong', err));
//

const server = http.createServer(function(req, res) {
    fs.readFile('./index.html', 'utf-8', function(error, content) {
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(content);
    });
});

const io = require('socket.io').listen(server);

io.sockets.on('connection', function (socket, pseudol) {
    socket.emit('message', 'Vous êtes bien connecté !');
    socket.broadcast.emit('message', 'Un autre client vient de se connecter !');

    socket.on('petit_nouveau', function(pseudo) {
        socket.pseudo = pseudo;
    });

    socket.on('message', function (message) {
        console.log('Un client me parle ! Il me dit : ' + message);
        console.log(socket.pseudo + ' me parle ! Il me dit : ' + message);

    });
});
const app = express();
server.listen(8080);
// const port = process.env.SERVER_PORT;
// app.listen(port, () => console.log(`http://localhost:${port}`));