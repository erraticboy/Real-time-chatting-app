console.log("Initializing modules...");
require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require("mongoose");
const Message = require("./models/Message");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
// preflight CORS handled by app.use(cors()) above
// app.options call removed to avoid path-to-regexp errors (use wildcard pattern)
app.use(express.json());

// Debug logging: Show every request in the terminal
app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.url}`);
    next();
});

// --- MONGODB CONNECTION ---
const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/chatapp";
mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// Serve Frontend Static Files
app.use(express.static(path.join(__dirname, "Frontend")));

// Serve index.html for root path
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "Frontend", "index.html"));
});

// --- AUTHENTICATION ---
const usersFilePath = path.join(__dirname, "users.json");
let users = [];

// Load users
if (fs.existsSync(usersFilePath)) {
    try { users = JSON.parse(fs.readFileSync(usersFilePath)); } catch(e) { users = []; }
}

app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ msg: "Missing fields" });
    if (users.find(u => u.username === username)) return res.status(400).json({ msg: "User exists" });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ username, password: hashedPassword });
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
    res.json({ message: "Registered successfully" });
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ msg: "Invalid credentials" });
    }
    res.json({ message: "Logged in", username });
});

// --- AI CHAT ---
const apiKey = process.env.GEMINI_API_KEY;
let genAI = null;
if (apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
}

app.post("/api/chat", async (req, res) => {
    if (!genAI) return res.status(500).json({ reply: "AI not configured (Missing API Key)" });
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(req.body.message);
        res.json({ reply: result.response.text() });
    } catch (e) {
        // Fallback to pro if flash fails
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
            const result = await model.generateContent(req.body.message);
            res.json({ reply: result.response.text() });
        } catch (err2) {
            res.status(500).json({ reply: "AI Error: " + e.message });
        }
    }
});

// --- REAL-TIME CHAT ---
const roomMessages = {};

io.on("connection", (socket) => {
    console.log("✅ User connected:", socket.id);

    socket.on("joinRoom", async (room) => {
        socket.join(room);
        console.log(`📍 User ${socket.id} joined room: ${room}`);
        
        try {
            // Load last 50 messages from MongoDB
            const messages = await Message.find({ room })
                .sort({ timestamp: -1 })
                .limit(50)
                .lean()
                .then(msgs => msgs.reverse()); // Reverse to get chronological order
            
            console.log(`📥 Sending ${messages.length} previous messages to ${socket.id}`);
            if (messages.length > 0) {
                socket.emit("previousMessages", messages);
            } else {
                console.log(`📭 No previous messages in room: ${room}`);
            }
        } catch (err) {
            console.error(`❌ Error loading messages for room ${room}:`, err);
        }
        
        // Update in-memory cache for quick access
        if (!roomMessages[room]) {
            roomMessages[room] = [];
        }
    });

    socket.on("message", async (data) => {
        console.log("📨 Message received from client:", data);
        const { room } = data;
        
        if (!room) {
            console.error("❌ ERROR: Message received with no room specified!");
            return;
        }

        // Add ID
        data.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        console.log(`✏️ Assigned message ID: ${data.id}`);

        // Save to memory for quick access
        if (!roomMessages[room]) roomMessages[room] = [];
        roomMessages[room].push(data);
        if (roomMessages[room].length > 50) roomMessages[room].shift();

        // Save to MongoDB (async, don't block broadcast)
        try {
            const newMessage = new Message({
                ...data,
                timestamp: new Date()
            });
            await newMessage.save();
            console.log(`💾 Message ${data.id} saved to MongoDB`);
        } catch (err) {
            console.error(`❌ Error saving message to MongoDB:`, err);
        }

        console.log(`📤 Broadcasting message to room "${room}" (${roomMessages[room].length} total messages)`);
        io.to(room).emit("message", data);
    });

    socket.on("deleteMessage", async (data) => {
        const { room, id } = data;
        console.log(`🗑️ Deleting message ${id} from room ${room}`);
        
        // Remove from memory
        if (roomMessages[room]) {
            roomMessages[room] = roomMessages[room].filter(msg => msg.id !== id);
        }
        
        // Remove from MongoDB
        try {
            await Message.deleteOne({ id });
            console.log(`💾 Message ${id} deleted from MongoDB`);
        } catch (err) {
            console.error(`❌ Error deleting message from MongoDB:`, err);
        }
        
        io.to(room).emit("messageDeleted", id);
    });

    socket.on("disconnect", () => {
        console.log("❌ User disconnected:", socket.id);
    });
});

const PORT = process.env.PORT || 3001;
console.log(`Attempting to start server on port ${PORT}...`);
server.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));

server.on('error', (err) => {
    console.error("❌ Server failed to start:", err);
});