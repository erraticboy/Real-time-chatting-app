require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.options('*', cors()); // Enable pre-flight for all routes
app.use(express.json());

// Debug Logging: See exactly what hits the server
app.use((req, res, next) => {
    console.log(`[Auth Service] Received ${req.method} request for ${req.url}`);
    next();
});

// --- User Persistence with JSON file ---
const usersFilePath = path.join(__dirname, 'users.json');
let users = [];

function readUsers() {
    try {
        if (fs.existsSync(usersFilePath)) {
            const data = fs.readFileSync(usersFilePath, 'utf-8');
            users = JSON.parse(data);
            console.log(`[Auth Service] Loaded ${users.length} users from users.json`);
        } else {
            console.log('[Auth Service] users.json not found, starting with empty user list.');
        }
    } catch (error) {
        console.error('[Auth Service] Error reading users.json:', error);
        users = []; // Start fresh if file is corrupt
    }
}

function writeUsers() {
    try {
        fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf-8');
    } catch (error) {
        console.error('[Auth Service] Error writing to users.json:', error);
    }
}

// Load users on startup
readUsers();

// Register Route
app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ msg: "Please enter all fields" });
    try {
        const existingUser = users.find(u => u.username === username);
        if (existingUser) return res.status(400).json({ msg: "User already exists" });
        
        // Hash the password before saving
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = { username, password: hashedPassword };
        users.push(newUser);
        writeUsers(); // Save the new user to the file
        res.json({ message: "User registered successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login Route
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ msg: "Please enter all fields" });
    try {
        const user = users.find(u => u.username === username);
        if (!user) {
            console.log(`[Auth Service] Login failed: User '${username}' not found.`);
            return res.status(400).json({ msg: "Invalid credentials" });
        }
        console.log(`[Auth Service] Login attempt: Found user '${username}'. Comparing password...`);

        // Compare the provided password with the stored hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log(`[Auth Service] Login failed: Password for '${username}' does not match.`);
            return res.status(400).json({ msg: "Invalid credentials" });
        }

        console.log(`[Auth Service] Login successful for '${username}'.`);
        res.json({ message: "Login successful", username: user.username });
    } catch (err) {
        console.error('[Auth Service] CRITICAL ERROR in /login:', err);
        res.status(500).json({ error: err.message });
    }
});

const server = app.listen(5000, () => console.log("Auth Service running on 5000"));

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error("❌ Port 5000 is already in use. Please close the other terminal running the Auth Service.");
    } else {
        console.error("❌ Server error:", err);
    }
});