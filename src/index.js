const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const Filter = require('bad-words');
const {
    generateMessage,
    generateLocationMessage
} = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const chatbot = 'Chatbot';
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '../public')));

io.on('connection', (socket) => {
    //socket.on('join', (...options, callback) => {
    socket.on('join', ({ username, room }, callback) => {
        //const { error, user } = addUser({ id: socket.id, ...options});
        const { error, user } = addUser({ id: socket.id, username, room});

        if (error) {
            return callback(error);
        }

        socket.join(user.room);
        socket.emit('message', generateMessage(chatbot, 'Access granted!'));
        socket.broadcast.to(user.room).emit('message', generateMessage(chatbot, `${user.username} has joined!`));
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        });

        callback();
    });

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id);
        const filter = new Filter();

        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed.');
        }

        io.to(user.room).emit('message', generateMessage(user.username, message));
        callback();
    });

    socket.on('sendLocation', (position, callback) => {
        const user = getUser(socket.id);

        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${position.latitude},${position.longitude}`));
        callback();
    });

    socket.on('disconnect', () => {
        const user = removeUser(socket.id);

        if (user) {
            io.to(user.room).emit('message', generateMessage(chatbot, `${user.username} has left!`));
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            });
        }
    });
});

server.listen(port, () => {
    console.log(`Server is up on port ${port}!`);
});

// socket.emit = sends an event to specific client
// io.emit = sends an event to every connected client
// socket.broadcast= sends an event to every connected client expect for the sender (socket)
// io.to.emit = sends event to everbody in specific room
// socket.broadcast.to.emit = sends event to everybody excpet for the sender in specific room 