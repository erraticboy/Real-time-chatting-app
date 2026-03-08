const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');
const messageInput = document.getElementById('message-input');
const messagesDiv = document.getElementById('messages');
const usernameInput = document.getElementById('username-input');
const passwordInput = document.getElementById('password-input');

let currentUser = "";
let currentRoom = "Global Room";
const isAndroid = /Android/i.test(navigator.userAgent);

// --- NEW: Inject Viewport Meta for Mobile (Fixes scaling) ---
if (isAndroid) {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
        meta = document.createElement('meta');
        meta.name = "viewport";
        document.head.appendChild(meta);
    }
    meta.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
}

// --- Connect to Chat Service (on the same server) ---
// Moved to top to ensure it's defined before use
const socket = io({ autoConnect: false });
socket.on("connect", () => {
    console.log("Connected to Chat Server");
    socket.emit("joinRoom", currentRoom);
});

socket.on("connect_error", (err) => {
    console.error("Socket connection error:", err);
});

// --- NEW: Inject Modern CSS ---
const style = document.createElement('style');
style.innerHTML = `
    /* Modern Reset & Base */
    body { font-family: 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif; background: linear-gradient(45deg, #ff0000, #ff7300, #fffb00, #48ff00, #00ffd5, #002bff, #7a00ff, #ff00c8, #ff0000); background-size: 400%; animation: rgb-bg 20s linear infinite; margin: 0; height: 100vh; overflow: hidden; }
    
    @keyframes rgb-bg {
        0% { background-position: 0 0; }
        100% { background-position: 400% 0; }
    }
    
    /* Main Chat Container */
    #chat-container { 
        max-width: 1600px; 
        margin: 0 auto; 
        height: 100vh; 
        background: #fff; 
        display: flex; 
        flex-direction: row; 
        box-shadow: 0 0 20px rgba(0,0,0,0.1);
        position: relative;
    }
    @media (min-width: 1400px) {
        #chat-container { height: 95vh; margin-top: 2.5vh; border-radius: 18px; overflow: hidden; border: 1px solid rgba(0,0,0,0.1); }
    }

    /* Sidebar Styling */
    .sidebar {
        width: 300px;
        background: #fff;
        border-right: 1px solid #d1d7db;
        display: flex;
        flex-direction: column;
        z-index: 2;
    }
    
    .sidebar-header {
        height: 64px;
        background: #f0f2f5;
        padding: 0 16px;
        display: flex;
        align-items: center;
        border-bottom: 1px solid #d1d7db;
    }
    
    .sidebar-header h3 {
        margin: 0;
        color: #54656f;
        font-size: 16px;
    }
    
    .user-list li {
        color: #111b21;
        padding: 12px 16px;
        border-bottom: 1px solid #f0f2f5;
    }
    
    .user-list li:hover { background: #f5f6f6; }
    .user-list li.active { background: #f0f2f5; }
    
    .user-profile {
        padding: 10px 16px;
        background: #f0f2f5;
        border-top: 1px solid #d1d7db;
        color: #111b21;
    }
    .user-profile small { color: #54656f; }

    /* Header */
    .chat-header {
        padding: 10px 20px;
        background: #f0f2f5;
        border-bottom: 1px solid #d1d7db;
        display: flex;
        align-items: center;
        gap: 15px;
        height: 64px;
        flex-shrink: 0;
        z-index: 20;
    }

    /* Messages Area */
    #messages { 
        flex: 1; 
        padding: 20px 8%; 
        overflow-y: auto; 
        background-color: #e0f2f1; 
        background-image: url('https://img.freepik.com/free-vector/abstract-white-shapes-background_79603-1362.jpg');
        background-size: cover;
        background-position: center;
        display: flex; 
        flex-direction: column; 
        gap: 8px; 
    }

    /* Custom Scrollbar */
    #messages::-webkit-scrollbar { width: 6px; }
    #messages::-webkit-scrollbar-track { background: transparent; }
    #messages::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 3px; }
    
    /* Message Bubbles */
    .message { 
        max-width: 65%; 
        padding: 10px 15px; 
        border-radius: 15px; 
        font-size: 15px; 
        line-height: 1.4; 
        position: relative; 
        word-wrap: break-word; 
        box-shadow: 0 1px 2px rgba(0,0,0,0.15); 
        margin-bottom: 2px;
    }
    .sent { 
        align-self: flex-end; 
        background-color: #d9fdd3; 
        color: #000000; 
        border-top-right-radius: 0;
    }
    .received { 
        align-self: flex-start; 
        background-color: #fff; 
        color: #000000; 
        border-top-left-radius: 0;
    }
    .system { 
        align-self: center; 
        background-color: rgba(255,255,255,0.9); 
        backdrop-filter: blur(2px);
        color: #54656f; 
        font-size: 12.5px; 
        padding: 6px 14px; 
        border-radius: 8px; 
        box-shadow: 0 1px 2px rgba(0,0,0,0.1); 
        margin: 12px 0; 
        text-align: center;
    }
    
    /* Story Page */
    #story-view {
        flex: 1;
        display: none; /* Hidden by default */
        flex-direction: column;
        background: #fff;
        padding: 20px;
    }

    /* Room Controls */
    #room-controls {
        background: #fff;
        padding: 12px 16px;
        display: flex;
        gap: 10px;
        border-bottom: 1px solid #e9edef;
        overflow-x: auto;
        align-items: center;
    }
    
    /* Input Bar */
    .input-bar {
        background: #f0f2f5;
        padding: 10px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        border-top: 1px solid #d1d7db;
        min-height: 60px;
    }
    
    #message-input { 
        padding: 12px 16px; 
        border-radius: 24px; 
        border: 1px solid #fff; 
        background: #fff; 
        outline: none; 
        font-size: 15px; 
        flex-grow: 1; 
        color: #000000; 
        box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
    }
    #message-input:focus { border-color: #fff; }

    /* Buttons */
    button { cursor: pointer; border: none; transition: all 0.2s; }
    
    .icon-btn {
        background: transparent;
        color: #54656f;
        font-size: 24px;
        padding: 8px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
    }
    .icon-btn:hover { background: rgba(0,0,0,0.05); color: #111b21; }

    .send-btn {
        background: #00a884;
        color: white;
        border-radius: 50%;
        width: 42px;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        padding-left: 4px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    .send-btn:hover { background: #008f6f; transform: scale(1.05); }

    .pill-btn {
        background: #e9edef;
        color: #54656f;
        padding: 8px 16px;
        border-radius: 24px;
        font-weight: 500;
        font-size: 14px;
        white-space: nowrap;
    }
    .pill-btn:hover { background: #d1d7db; color: #111b21; }

    /* Delete Button */
    .delete-msg-btn {
        position: absolute;
        top: 5px;
        right: 5px;
        cursor: pointer;
        color: #888;
        font-size: 10px;
        display: none;
    }
    .message:hover .delete-msg-btn { display: block; }

    /* Android Mobile Interface */
    ${isAndroid ? `
    /* Dark Mode Base */
    body { background: #0b141a; animation: none; overflow: hidden; position: fixed; width: 100%; height: 100%; color: #e9edef; }
    
    /* Full Screen Containers */
    #chat-container { width: 100%; height: 100%; border-radius: 0; margin: 0; position: absolute; top: 0; left: 0; background: #0b141a; border: none; }
    
    /* Sidebar (Dark) */
    .sidebar { width: 100%; height: 100%; position: absolute; z-index: 100; border-right: none; background: #111b21; }
    .sidebar.mobile-hidden { display: none; }
    .sidebar-header { background: #202c33; border-bottom: 1px solid #2f3b43; color: #e9edef; }
    .sidebar-header h3 { color: #e9edef; }
    .user-list li { background: #111b21; color: #e9edef; border-bottom: 1px solid #202c33; }
    .user-list li:hover { background: #202c33; }
    .user-list li.active { background: #2a3942; }
    .user-profile { background: #202c33; border-top: 1px solid #2f3b43; color: #e9edef; }
    .user-profile small { color: #8696a0; }

    /* Chat Area (Dark) */
    .chat-area { width: 100%; height: 100%; display: flex; flex-direction: column; background: #0b141a; }
    .chat-header { background: #202c33; border-bottom: 1px solid #2f3b43; color: #e9edef; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
    .chat-header .back-btn { color: #e9edef; }
    
    /* Messages Background */
    #messages { 
        flex: 1; 
        overflow-y: auto; 
        -webkit-overflow-scrolling: touch; 
        background-color: #0b141a; 
        background-image: url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png'); 
        background-blend-mode: overlay;
        opacity: 1;
    }

    /* Message Bubbles (Dark Mode) */
    .message { font-size: 16px; max-width: 85%; box-shadow: 0 1px 0.5px rgba(0,0,0,0.13); color: #e9edef; }
    .message.sent { background: #005c4b; color: #e9edef; }
    .message.received { background: #202c33; color: #e9edef; }
    .message.system { background: #1f2c33; color: #8696a0; border: 1px solid #2f3b43; }
    
    /* Input Bar (Dark) */
    .input-bar { padding: 8px 10px; background: #202c33; border-top: 1px solid #2f3b43; min-height: auto; }
    #message-input { font-size: 16px; background: #2a3942; color: #e9edef; border: none; padding: 10px 16px; border-radius: 24px; }
    #message-input::placeholder { color: #8696a0; }
    
    /* Buttons */
    .icon-btn { color: #8696a0; }
    .send-btn { background: #00a884; width: 45px; height: 45px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); }
    .pill-btn { background: #2a3942; color: #e9edef; border: 1px solid #374248; padding: 12px 20px; font-size: 16px; margin: 5px; }
    
    /* Back Button */
    .back-btn { display: flex !important; margin-right: 10px; font-size: 24px; cursor: pointer; color: #e9edef; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; }
    .back-btn:active { background-color: #374248; }

    /* Room Controls */
    #room-controls { background: #202c33; border-bottom: 1px solid #2f3b43; }
    
    /* Story View */
    #story-view { background: #111b21; color: #e9edef; }
    #story-view h2 { color: #e9edef !important; }
    ` : '.back-btn { display: none; }'}
`;
document.head.appendChild(style);

// Ensure Chat Area fills the remaining space
const chatArea = document.querySelector('.chat-area');
if (chatArea) {
    chatArea.style.flex = '1';
    chatArea.style.display = 'flex';
    chatArea.style.flexDirection = 'column';
}

// --- NEW: Chat Header UI (Upper Panel) ---
const chatHeader = document.createElement('div');
chatHeader.className = 'chat-header';

if (isAndroid) {
    const backBtn = document.createElement('div');
    backBtn.className = 'back-btn';
    backBtn.innerHTML = '⬅️';
    backBtn.onclick = () => {
        document.querySelector('.sidebar').classList.remove('mobile-hidden');
    };
    chatHeader.appendChild(backBtn);
}

const headerAvatar = document.createElement('div');
headerAvatar.style.cssText = `width: 40px; height: 40px; background: ${isAndroid ? '#374248' : '#dfe3e5'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; color: ${isAndroid ? '#e9edef' : '#54656f'};`;
headerAvatar.innerText = '👥';

const headerInfo = document.createElement('div');
headerInfo.style.cssText = 'display: flex; flex-direction: column; justify-content: center;';

const headerTitle = document.createElement('div');
headerTitle.style.cssText = `font-weight: 600; font-size: 16px; color: ${isAndroid ? '#e9edef' : '#111b21'}; line-height: 1.2;`;
headerTitle.innerText = 'Global Room';

const headerSubtitle = document.createElement('div');
headerSubtitle.style.cssText = `font-size: 13px; color: ${isAndroid ? '#8696a0' : '#54656f'}; margin-top: 2px;`;
headerSubtitle.innerText = 'Offline';

headerInfo.appendChild(headerTitle);
headerInfo.appendChild(headerSubtitle);
chatHeader.appendChild(headerAvatar);
chatHeader.appendChild(headerInfo);

messagesDiv.parentNode.insertBefore(chatHeader, messagesDiv);

// --- NEW: Story Page UI ---
const storyView = document.createElement('div');
storyView.id = 'story-view';

// Add Title to Story Page
const storyTitle = document.createElement('h2');
storyTitle.innerText = "📸 Stories";
storyTitle.style.color = isAndroid ? "#e9edef" : "#54656f";

if (isAndroid) {
    const storyBackBtn = document.createElement('button');
    storyBackBtn.innerText = "⬅️ Back";
    storyBackBtn.className = 'pill-btn';
    storyBackBtn.style.marginBottom = '10px';
    storyBackBtn.onclick = () => document.querySelector('.sidebar').classList.remove('mobile-hidden');
    storyView.appendChild(storyBackBtn);
}

storyView.appendChild(storyTitle);

const storyContainer = document.createElement('div');
storyContainer.id = 'story-container';
storyContainer.style.cssText = 'display: flex; gap: 16px; overflow-x: auto; padding: 20px 0;';
storyView.appendChild(storyContainer);

// Insert Story View into the main container (hidden initially)
chatContainer.appendChild(storyView);

// Add "Stories" link to Sidebar
const userList = document.querySelector('.user-list');
const storyLink = document.createElement('li');
storyLink.innerText = "📸 Stories";
storyLink.onclick = showStoryPage;
userList.appendChild(storyLink);

// Make Global Room (first item) clickable to return to chat
const globalRoomLi = userList.querySelector('li:first-child');
if (globalRoomLi) {
    globalRoomLi.onclick = () => switchRoom("Global Room");
    globalRoomLi.style.cursor = "pointer";
}

const roomControls = document.createElement('div');
roomControls.id = 'room-controls';

messagesDiv.parentNode.insertBefore(roomControls, messagesDiv);

const createRoomBtn = document.createElement('button');
createRoomBtn.innerText = '🔒 Create Private';
createRoomBtn.className = 'pill-btn';
createRoomBtn.onclick = createPrivateRoom;

const joinRoomBtn = document.createElement('button');
joinRoomBtn.innerText = '🔑 Join Private';
joinRoomBtn.className = 'pill-btn';
joinRoomBtn.onclick = joinPrivateRoom;

const globalRoomBtn = document.createElement('button');
globalRoomBtn.innerText = '🌍 Global';
globalRoomBtn.className = 'pill-btn';
globalRoomBtn.onclick = () => switchRoom("Global Room");

const resetChatBtn = document.createElement('button');
resetChatBtn.innerText = '🧹 Reset Chat';
resetChatBtn.className = 'pill-btn';
resetChatBtn.onclick = () => {
    if(confirm("Are you sure you want to clear your chat history view?")) {
        messagesDiv.innerHTML = '';
    }
};

const addStoryBtn = document.createElement('button');
addStoryBtn.innerText = '➕ Add to Story';
addStoryBtn.className = 'pill-btn';
addStoryBtn.onclick = () => storyInput.click();

roomControls.appendChild(globalRoomBtn);
roomControls.appendChild(createRoomBtn);
roomControls.appendChild(joinRoomBtn);
roomControls.appendChild(resetChatBtn);

// Add Story button to Story Page instead of Chat
storyView.appendChild(addStoryBtn);

const storyInput = document.createElement('input');
storyInput.type = 'file';
storyInput.style.display = 'none';
storyInput.accept = 'image/*,video/*';
document.body.appendChild(storyInput);

storyInput.addEventListener('change', function() {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        socket.emit("message", {
            room: currentRoom,
            user: currentUser,
            text: "New Story",
            file: e.target.result,
            fileType: file.type,
            isStory: true // Flag for story
        });
    };
    reader.readAsDataURL(file);
    this.value = "";
});

function createPrivateRoom() {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    alert(`Your Private Room Code: ${code}\nShare this code with your friend to chat privately!`);
    switchRoom(code);
}

function joinPrivateRoom() {
    const code = prompt("Enter Private Room Code:");
    if (code && code.trim() !== "") switchRoom(code.trim());
}

function showStoryPage() {
    // Hide Chat, Show Stories
    chatArea.style.display = 'none';
    storyView.style.display = 'flex';
    
    // Update Sidebar Active State
    document.querySelectorAll('.user-list li').forEach(li => li.classList.remove('active'));
    storyLink.classList.add('active');

    if (isAndroid) {
        document.querySelector('.sidebar').classList.add('mobile-hidden');
    }
}

function switchRoom(room) {
    // Show Chat, Hide Stories
    chatArea.style.display = 'flex';
    storyView.style.display = 'none';

    currentRoom = room;
    messagesDiv.innerHTML = ''; // Auto-delete/Clear chat for privacy
    storyContainer.innerHTML = ''; // Clear stories when switching rooms
    addMessage(`Joined Room: ${room}`, 'system');
    socket.emit("joinRoom", room);

    headerTitle.innerText = room === "Global Room" ? "Global Room" : `Private Room: ${room}`;
    headerAvatar.innerText = room === "Global Room" ? "👥" : "🔒";

    // Update Sidebar Text to show current room
    const roomLi = userList.querySelector('li:first-child');
    if (roomLi) {
        roomLi.innerText = room === "Global Room" ? "🌐 Global Room" : `🔒 ${room}`;
        
        document.querySelectorAll('.user-list li').forEach(li => li.classList.remove('active'));
        roomLi.classList.add('active');
    }

    if (isAndroid) {
        document.querySelector('.sidebar').classList.add('mobile-hidden');
    }
}

function renderStory(user, fileData, fileType) {
    if (!fileType) return; // Safety check

    const storyItem = document.createElement('div');
    storyItem.style.cssText = 'display: inline-block; margin-right: 10px; text-align: center; cursor: pointer; flex-shrink: 0;';

    const ring = document.createElement('div');
    ring.style.cssText = 'width: 56px; height: 56px; border-radius: 50%; border: 2px solid #00a884; padding: 2px; display: flex; align-items: center; justify-content: center;';
    
    const img = document.createElement('img');
    img.src = fileType.startsWith('video') ? 'https://cdn-icons-png.flaticon.com/512/4406/4406124.png' : fileData;
    img.style.cssText = 'width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 1px solid #fff;';
    
    ring.appendChild(img);
    const name = document.createElement('div');
    name.innerText = user;
    name.style.fontSize = '11px';
    name.style.color = '#54656f';
    name.style.marginTop = '4px';
    storyItem.appendChild(ring);
    storyItem.appendChild(name);
    
    storyItem.onclick = () => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; display: flex; justify-content: center; align-items: center;';
        let content = fileType.startsWith('video') ? document.createElement('video') : document.createElement('img');
        content.src = fileData;
        if(fileType.startsWith('video')) { content.controls = true; content.autoplay = true; }
        content.style.maxHeight = '90%'; content.style.maxWidth = '90%';
        overlay.appendChild(content);
        overlay.onclick = () => document.body.removeChild(overlay);
        document.body.appendChild(overlay);
    };
    storyContainer.appendChild(storyItem);
    setTimeout(() => { if(storyItem.parentNode) storyItem.parentNode.removeChild(storyItem); }, 300000); // Stories last 5 mins
}

// -------------------------------

// --- File Sharing UI & Logic ---
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.style.display = 'none';
fileInput.accept = 'image/*,video/*';

const attachBtn = document.createElement('button');
attachBtn.innerText = '📎';
attachBtn.className = 'icon-btn';
attachBtn.onclick = () => fileInput.click();

// Create Input Bar Container
const inputBar = document.createElement('div');
inputBar.className = 'input-bar';

// Move elements into inputBar
messageInput.parentNode.insertBefore(inputBar, messageInput);
inputBar.appendChild(attachBtn);
inputBar.appendChild(fileInput);
inputBar.appendChild(messageInput);
// --- NEW: Bot Button ---
const botBtn = document.createElement('button');
botBtn.innerText = '🤖';
botBtn.title = "Ask AI";
botBtn.className = 'icon-btn';
botBtn.onclick = () => {
    messageInput.value = "/ai " + messageInput.value;
    messageInput.focus();
};
inputBar.appendChild(botBtn);

const sendBtn = document.createElement('button');
sendBtn.innerText = '➤';
sendBtn.className = 'send-btn';
sendBtn.onclick = sendMessage;
inputBar.appendChild(sendBtn);

fileInput.addEventListener('change', function() {
    const file = this.files[0];
    if (!file) return;
    
    // Limit to 2MB for base64 socket transfer to ensure stability
    if (file.size > 2 * 1024 * 1024) {
        alert("File too large (Max 2MB)");
        this.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        socket.emit("message", {
            room: currentRoom,
            user: currentUser,
            text: file.name, // Use filename as fallback text
            file: e.target.result, // Base64 Data
            fileType: file.type
        });
    };
    reader.readAsDataURL(file);
    this.value = "";
});
// -------------------------------

socket.on("message", (data) => {
    if (data.isStory) {
        renderStory(data.user, data.file, data.fileType);
    } else {
        addMessage(data.text, data.user === currentUser ? 'sent' : 'received', data.file, data.fileType);
    }
});

socket.on("messageDeleted", (id) => {
    const msgEl = document.getElementById(`msg-${id}`);
    if (msgEl) {
        msgEl.remove();
    }
});

socket.on("previousMessages", (msgs) => {
    messagesDiv.innerHTML = ''; // Clear before loading
    msgs.forEach(msg => {
        if (!msg.isStory) {
            addMessage(msg.text, msg.user === currentUser ? 'sent' : 'received', msg.file, msg.fileType, msg.id);
        }
    });
});

async function login() {
    const username = usernameInput.value;
    const password = passwordInput.value;
    console.log("Attempting login for:", username);

    if (username.trim() !== "" && password.trim() !== "") {
        try {
            // Call Auth Service (on the same server)
            console.log(`Sending login request to: ${window.location.origin}/login`);
            const response = await fetch("/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            let data;
            try {
                data = await response.json();
            } catch (e) {
                throw new Error(`Server Error: ${response.status}`);
            }
            console.log("Login response:", data);

            if (response.ok) {
                currentUser = username;
                document.getElementById('current-user').innerText = currentUser;
                headerSubtitle.innerText = `You: ${currentUser} • Online`;
                
                // UI Transition
                authContainer.style.opacity = '0';
                setTimeout(() => {
                    authContainer.classList.add('hidden');
                    chatContainer.classList.remove('hidden');
                    chatContainer.style.opacity = '0';
                    setTimeout(() => {
                        chatContainer.style.opacity = '1';
                        chatContainer.style.transition = 'opacity 0.5s ease';
                    }, 50);
                }, 300);

                // Connect Socket
                socket.connect();
            } else {
                console.error("Login failed:", data.msg);
                alert("❌ " + (data.msg || data.error || "Login failed"));
            }
        } catch (error) {
            alert("❌ " + (error.message || "Cannot connect to Auth Server"));
            console.error(error);
        }
    } else {
        alert("⚠️ Please enter username and password!");
    }
}

async function register() {
    const username = usernameInput.value;
    const password = passwordInput.value;

    if (username && password) {
        try {
            const response = await fetch("/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });
            
            let data;
            try {
                data = await response.json();
            } catch (e) {
                throw new Error(`Server Error: ${response.status}`);
            }

            if (response.ok) {
                alert(data.message || "Registration successful! Please login.");
            } else {
                alert("❌ " + (data.msg || data.error || "Registration failed"));
            }
        } catch (error) {
            alert("❌ " + (error.message || "Cannot connect to Auth Server"));
            console.error(error);
        }
    } else {
        alert("⚠️ Enter details to register");
    }
}

async function sendMessage() {
    const text = messageInput.value;
    if (text.trim() !== "") {
        // AI Chat Bot Integration
        if (text.toLowerCase().startsWith('/ai ')) {
            const prompt = text.substring(4).trim();
            
            // Clear input immediately for better UX
            messageInput.value = "";
            addMessage("You (to AI): " + prompt, 'sent');

            try {
                const response = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: prompt })
                });
                const data = await response.json();
                addMessage("🤖 AI: " + data.reply, 'received');
            } catch (error) {
                console.error(error);
                addMessage("🤖 AI: Error connecting to AI service.", 'received');
            }
            return; // Don't send AI commands to the public chat
        }

        // Normal Message: Emit to server
        socket.emit("message", {
            room: currentRoom,
            user: currentUser,
            text: text
        });
        messageInput.value = "";
    }
}

function addMessage(text, type, fileData = null, fileType = null, id = null) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', type);
    
    if (id) {
        msgDiv.id = `msg-${id}`;
    }
    
    if (fileData) {
        const mediaContainer = document.createElement('div');
        if (fileType && fileType.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = fileData;
            img.style.maxWidth = '200px';
            img.style.borderRadius = '8px';
            mediaContainer.appendChild(img);
        } else if (fileType && fileType.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = fileData;
            video.controls = true;
            video.style.maxWidth = '200px';
            video.style.borderRadius = '8px';
            mediaContainer.appendChild(video);
        }
        msgDiv.appendChild(mediaContainer);
    } else {
        msgDiv.innerText = text;
    }
    
    // Add Delete Button (Only for sent messages or all if you prefer)
    if (type === 'sent' && id) {
        const deleteBtn = document.createElement('span');
        deleteBtn.innerText = '🗑️';
        deleteBtn.className = 'delete-msg-btn';
        deleteBtn.onclick = () => {
            if(confirm("Delete this message?")) {
                socket.emit('deleteMessage', { room: currentRoom, id: id });
            }
        };
        msgDiv.appendChild(deleteBtn);
    }

    messagesDiv.appendChild(msgDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Allow pressing Enter to send
messageInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});