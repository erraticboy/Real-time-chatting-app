const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow connections from frontend
        methods: ["GET", "POST"]
    }
});

// Store messages in memory
const roomMessages = {}; 

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('joinRoom', (room) => {
        socket.join(room);
        console.log(`User joined room: ${room}`);
        
        // Send previous messages for this room
        if (roomMessages[room]) {
            socket.emit('previousMessages', roomMessages[room]);
        }
    });

    socket.on('message', (data) => {
        const { room } = data;
        
        // Assign a unique ID to the message
        data.id = Date.now().toString(36) + Math.random().toString(36).substr(2);

        // Save message to memory
        if (!roomMessages[room]) {
            roomMessages[room] = [];
        }
        // Keep only last 50 messages to save memory
        if (roomMessages[room].length > 50) {
            roomMessages[room].shift();
        }
        roomMessages[room].push(data);

        // Broadcast to everyone in the room
        io.to(room).emit('message', data);
    });

    socket.on('deleteMessage', (data) => {
        const { room, id } = data;
        if (roomMessages[room]) {
            roomMessages[room] = roomMessages[room].filter(msg => msg.id !== id);
        }
        io.to(room).emit('messageDeleted', id);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = 5000;
server.listen(PORT, () => {
    console.log(`Chat Service running on port ${PORT}`);
});