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

// --- NEW: Swipe Gestures for Android Sidebar with Advanced Animation ---
if (isAndroid) {
    let touchStartX = 0;
    let touchEndX = 0;
    let isAnimating = false;

    function handleTouchStart(e) {
        touchStartX = e.changedTouches[0].screenX;
        isAnimating = false;
    }

    function handleTouchEnd(e) {
        if (isAnimating) return;
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }

    function handleSwipe() {
        const sidebar = document.querySelector('.sidebar');
        const deltaX = touchEndX - touchStartX;

        if (deltaX > 80) {
            // Swipe right: show sidebar with smooth animation
            isAnimating = true;
            sidebar.style.transform = 'translateX(0)';
            sidebar.style.opacity = '1';
            sidebar.classList.remove('mobile-hidden');
            setTimeout(() => { isAnimating = false; }, 400);
        } else if (deltaX < -80) {
            // Swipe left: hide sidebar with smooth animation
            isAnimating = true;
            sidebar.style.transform = 'translateX(-100%)';
            sidebar.style.opacity = '0';
            setTimeout(() => {
                sidebar.classList.add('mobile-hidden');
                isAnimating = false;
            }, 400);
        }
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Add haptic feedback simulation for Android
    function hapticFeedback() {
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }

    // Add haptic feedback to interactive elements
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('icon-btn') || e.target.classList.contains('pill-btn') || e.target.classList.contains('send-btn')) {
            hapticFeedback();
        }
    });

    // Add advanced particle effect for messages
    function createParticleEffect(x, y, color) {
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: fixed;
                width: 4px;
                height: 4px;
                background: ${color};
                border-radius: 50%;
                pointer-events: none;
                z-index: 9999;
                left: ${x}px;
                top: ${y}px;
                animation: particle-explode 0.8s ease-out forwards;
            `;

            const angle = (i / 8) * Math.PI * 2;
            const distance = 50 + Math.random() * 50;
            particle.style.setProperty('--tx', Math.cos(angle) * distance + 'px');
            particle.style.setProperty('--ty', Math.sin(angle) * distance + 'px');

            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), 800);
        }
    }

    // Add particle effect to send button
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('send-btn')) {
            const rect = e.target.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            createParticleEffect(centerX, centerY, '#667eea');
        }
    });
}

// --- Connect to Chat Service (on the same server) ---
// Moved to top to ensure it's defined before use
const socket = io({ autoConnect: false });

socket.on("connect", () => {
    console.log("✅ Connected to Chat Server, Socket ID:", socket.id);
    socket.emit("joinRoom", currentRoom);
});

socket.on("disconnect", () => {
    console.log("❌ Disconnected from Chat Server");
});

socket.on("connect_error", (err) => {
    console.error("❌ Socket connection error:", err);
});

// Message listener - MUST be set up BEFORE login
socket.on("message", (data) => {
    console.log("📨 Message received from server:", data);
    
    // Prevent duplicate messages for the sender
    if (data.user === currentUser) return;

    if (data.isStory) {
        console.log("📸 Rendering story...");
        renderStory(data.user, data.file, data.fileType);
    } else {
        console.log("💬 Adding message to chat:", data.text);
        addMessage(data.text, data.user === currentUser ? 'sent' : 'received', data.file, data.fileType, data.id, data.fileSize);
    }
});

socket.on("previousMessages", (msgs) => {
    console.log("📥 Received previous messages:", msgs.length);
    messagesDiv.innerHTML = ''; // Clear before loading
    storyContainer.innerHTML = ''; // Clear stories before loading
    msgs.forEach(msg => {
        if (msg.isStory) {
            console.log("📸 Loading previous story...");
            renderStory(msg.user, msg.file, msg.fileType, true); // true = isPrevious
        } else {
            addMessage(msg.text, msg.user === currentUser ? 'sent' : 'received', msg.file, msg.fileType, msg.id, msg.fileSize);
        }
    });
});

socket.on("messageDeleted", (id) => {
    console.log("🗑️ Message deleted:", id);
    const msgEl = document.getElementById(`msg-${id}`);
    if (msgEl) {
        msgEl.remove();
    }
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

    /* Android Mobile Interface - Advanced Futuristic Design */
    ${isAndroid ? `
    /* Advanced Gradient Background with Animation */
    body {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%);
        background-size: 400% 400%;
        animation: advanced-bg-shift 15s ease infinite;
        overflow: hidden;
        position: fixed;
        width: 100%;
        height: 100%;
        color: #ffffff;
        font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    @keyframes advanced-bg-shift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }

    /* Glassmorphism Effect */
    .glass-panel {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 20px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    }

    /* Full Screen Futuristic Containers */
    #chat-container {
        width: 100%;
        height: 100%;
        border-radius: 0;
        margin: 0;
        position: absolute;
        top: 0;
        left: 0;
        background: transparent;
        border: none;
        overflow: hidden;
    }

    /* Advanced Sidebar with Glass Effect */
    .sidebar {
        width: 100%;
        height: 100%;
        position: absolute;
        z-index: 100;
        border-right: none;
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(30px);
        -webkit-backdrop-filter: blur(30px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        transform: translateX(0);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .sidebar.mobile-hidden {
        transform: translateX(-100%);
        opacity: 0;
    }

    .sidebar-header {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(20px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        color: #ffffff;
        padding: 20px;
        border-radius: 0 0 20px 20px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }

    .sidebar-header h3 {
        color: #ffffff;
        font-weight: 700;
        font-size: 24px;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        letter-spacing: -0.5px;
    }

    .user-list li {
        background: rgba(255, 255, 255, 0.05);
        color: #ffffff;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding: 16px 20px;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
    }

    .user-list li::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
        transition: left 0.5s;
    }

    .user-list li:hover::before,
    .user-list li.active::before {
        left: 100%;
    }

    .user-list li:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateX(8px);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }

    .user-list li.active {
        background: rgba(255, 255, 255, 0.15);
        border-left: 4px solid #00d4ff;
        box-shadow: 0 0 20px rgba(0, 255, 212, 0.3);
    }

    .user-profile {
        background: rgba(255, 255, 255, 0.1);
        border-top: 1px solid rgba(255, 255, 255, 0.2);
        color: #ffffff;
        padding: 20px;
        backdrop-filter: blur(20px);
    }

    .user-profile small {
        color: rgba(255, 255, 255, 0.7);
    }

    /* Advanced Chat Area */
    .chat-area {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        background: transparent;
        position: relative;
    }

    .chat-header {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(20px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        color: #ffffff;
        padding: 16px 20px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        border-radius: 0 0 20px 20px;
        position: relative;
        overflow: hidden;
    }

    .chat-header::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(45deg, rgba(0, 212, 255, 0.1), rgba(255, 85, 108, 0.1));
        z-index: -1;
    }

    .chat-header .back-btn {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
    }

    .chat-header .back-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(1.1);
    }

    /* Futuristic Messages Area */
    #messages {
        flex: 1;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        background: transparent;
        padding: 20px;
        position: relative;
    }

    #messages::before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background:
            radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.1) 0%, transparent 50%);
        pointer-events: none;
        z-index: -1;
    }

    /* Advanced Message Bubbles */
    .message {
        font-size: 16px;
        max-width: 85%;
        margin: 8px 0;
        padding: 12px 16px;
        border-radius: 18px;
        position: relative;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
        animation: message-appear 0.5s ease-out;
    }

    @keyframes message-appear {
        from {
            opacity: 0;
            transform: translateY(20px) scale(0.9);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    .message.sent {
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: #ffffff;
        margin-left: auto;
        border-bottom-right-radius: 4px;
        box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
    }

    .message.sent::before {
        content: '';
        position: absolute;
        bottom: -2px;
        right: 12px;
        width: 0;
        height: 0;
        border-left: 8px solid #764ba2;
        border-top: 8px solid transparent;
        border-bottom: 8px solid transparent;
    }

    .message.received {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        margin-right: auto;
        border-bottom-left-radius: 4px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }

    .message.received::before {
        content: '';
        position: absolute;
        bottom: -2px;
        left: 12px;
        width: 0;
        height: 0;
        border-right: 8px solid rgba(255, 255, 255, 0.1);
        border-top: 8px solid transparent;
        border-bottom: 8px solid transparent;
    }

    .message.system {
        background: rgba(255, 85, 108, 0.2);
        color: #ffffff;
        border: 1px solid rgba(255, 85, 108, 0.3);
        text-align: center;
        font-weight: 500;
        margin: 16px auto;
        max-width: 80%;
        box-shadow: 0 4px 20px rgba(255, 85, 108, 0.2);
    }

    /* Advanced Input Bar with Floating Label */
    .input-bar {
        padding: 16px 20px;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(20px);
        border-top: 1px solid rgba(255, 255, 255, 0.2);
        min-height: auto;
        flex-direction: column;
        border-radius: 20px 20px 0 0;
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
        position: relative;
        overflow: hidden;
        animation: slide-up 0.5s ease-out;
    }

    @keyframes slide-up {
        from { transform: translateY(100px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }

    .input-bar::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(45deg, rgba(0, 212, 255, 0.05), rgba(255, 85, 108, 0.05));
        z-index: -1;
    }

    /* Floating Label Input */
    .input-container {
        position: relative;
        margin-bottom: 12px;
    }

    .input-container label {
        position: absolute;
        left: 16px;
        top: 12px;
        color: rgba(255, 255, 255, 0.6);
        transition: all 0.3s ease;
        pointer-events: none;
        font-size: 16px;
        font-weight: 500;
    }

    .input-container input:focus + label,
    .input-container input:not(:placeholder-shown) + label {
        top: -8px;
        left: 12px;
        font-size: 12px;
        color: #00d4ff;
        background: rgba(255, 255, 255, 0.1);
        padding: 2px 8px;
        border-radius: 10px;
        backdrop-filter: blur(10px);
    }

    #message-input {
        font-size: 16px;
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.2);
        padding: 12px 16px;
        border-radius: 25px;
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
        width: 100%;
        box-sizing: border-box;
    }

    #message-input:focus {
        border-color: #00d4ff;
        box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
        background: rgba(255, 255, 255, 0.15);
        transform: translateY(-2px);
    }

    #message-input::placeholder {
        color: rgba(255, 255, 255, 0.6);
        opacity: 0;
        transition: opacity 0.3s ease;
    }

    #message-input:focus::placeholder {
        opacity: 0.6;
    }

    /* Advanced Buttons */
    .icon-btn {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        border-radius: 50%;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        font-size: 20px;
    }

    .icon-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(1.1);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }

    .send-btn {
        background: linear-gradient(135deg, #667eea, #764ba2);
        width: 48px;
        height: 48px;
        border-radius: 50%;
        box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: none;
        position: relative;
        overflow: hidden;
    }

    .send-btn::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        transition: width 0.6s, height 0.6s;
    }

    .send-btn:hover {
        transform: scale(1.1) rotate(5deg);
        box-shadow: 0 6px 25px rgba(102, 126, 234, 0.6);
    }

    .send-btn:active::before {
        width: 60px;
        height: 60px;
    }

    .send-btn:hover::after {
        content: '🚀';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 16px;
        opacity: 0;
        animation: send-emoji 0.5s ease-out;
    }

    @keyframes send-emoji {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
        50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
    }

    .pill-btn {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.2);
        padding: 12px 24px;
        font-size: 16px;
        margin: 8px;
        border-radius: 25px;
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
        font-weight: 500;
    }

    .pill-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: translateY(-2px);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }

    /* Advanced Back Button */
    .back-btn {
        display: flex !important;
        margin-right: 12px;
        font-size: 24px;
        cursor: pointer;
        color: #ffffff;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        transition: all 0.3s ease;
    }

    .back-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(1.1);
    }

    /* Room Controls */
    #room-controls {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(20px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 0 0 20px 20px;
    }

    /* Advanced Story View */
    #story-view {
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(30px);
        color: #ffffff;
        border-radius: 20px;
        margin: 20px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    #story-view h2 {
        color: #ffffff !important;
        font-weight: 700;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    }

    /* Loading Animation */
    .loading {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: #ffffff;
        animation: spin 1s ease-in-out infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    /* Particle Animation */
    @keyframes particle-explode {
        0% {
            opacity: 1;
            transform: scale(1) translate(0, 0);
        }
        100% {
            opacity: 0;
            transform: scale(0) translate(var(--tx), var(--ty));
        }
    }

    /* Advanced Hover Effects */
    .message.sent:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 25px rgba(102, 126, 234, 0.4);
    }

    .message.received:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2);
    }

    /* Typing Indicator */
    .typing-indicator {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 18px;
        margin: 8px 0;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        max-width: 85%;
    }

    .typing-indicator span {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        margin: 0 2px;
        animation: typing 1.4s infinite;
    }

    .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes typing {
        0%, 60%, 100% { transform: scale(1); opacity: 0.6; }
        30% { transform: scale(1.2); opacity: 1; }
    }

    /* Scrollbar Styling */
    #messages::-webkit-scrollbar {
        width: 6px;
    }

    #messages::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
    }

    #messages::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 3px;
    }

    #messages::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.5);
    }

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

// Global story storage
let allStories = [];

function renderStory(user, fileData, fileType, isPrevious = false) {
    if (!fileType) fileType = 'image/jpeg'; // Safety check with fallback

    // Add to global stories array
    const storyData = { user, fileData, fileType, timestamp: Date.now() };
    allStories.push(storyData);

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
        openStoryViewer(storyData);
    };
    storyContainer.appendChild(storyItem);
    
    // Auto-remove story after 5 minutes (only for new stories, not previous ones)
    if (!isPrevious) {
        setTimeout(() => { 
            if(storyItem.parentNode) storyItem.parentNode.removeChild(storyItem);
            // Remove from global array
            allStories = allStories.filter(s => s !== storyData);
        }, 300000); // 5 minutes
    }
}

function openStoryViewer(currentStory) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; display: flex; justify-content: center; align-items: center;';
    
    const viewer = document.createElement('div');
    viewer.style.cssText = 'position: relative; max-width: 90%; max-height: 90%;';
    
    // Navigation buttons
    const prevBtn = document.createElement('button');
    prevBtn.innerText = '⬅️';
    prevBtn.style.cssText = 'position: absolute; left: -60px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: white; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; font-size: 20px;';
    
    const nextBtn = document.createElement('button');
    nextBtn.innerText = '➡️';
    nextBtn.style.cssText = 'position: absolute; right: -60px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: white; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; font-size: 20px;';
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.innerText = '✕';
    closeBtn.style.cssText = 'position: absolute; top: -50px; right: 0; background: rgba(0,0,0,0.5); color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 16px;';
    closeBtn.onclick = () => document.body.removeChild(overlay);
    
    // User info
    const userInfo = document.createElement('div');
    userInfo.style.cssText = 'position: absolute; top: -50px; left: 0; color: white; font-weight: 500;';
    userInfo.innerText = currentStory.user;
    
    let currentIndex = allStories.indexOf(currentStory);
    
    function showStory(index) {
        if (index < 0 || index >= allStories.length) return;
        
        currentIndex = index;
        const story = allStories[index];
        
        // Clear previous content
        const existingContent = viewer.querySelector('img, video');
        if (existingContent) existingContent.remove();
        
        userInfo.innerText = story.user;
        
        let content = story.fileType.startsWith('video') ? document.createElement('video') : document.createElement('img');
        content.src = story.fileData;
        if(story.fileType.startsWith('video')) { 
            content.controls = true; 
            content.autoplay = true; 
        }
        content.style.maxHeight = '80vh'; 
        content.style.maxWidth = '80vw';
        content.style.borderRadius = '8px';
        
        viewer.insertBefore(content, closeBtn);
        
        // Update navigation buttons
        prevBtn.style.opacity = index > 0 ? '1' : '0.3';
        nextBtn.style.opacity = index < allStories.length - 1 ? '1' : '0.3';
    }
    
    prevBtn.onclick = () => showStory(currentIndex - 1);
    nextBtn.onclick = () => showStory(currentIndex + 1);
    
    // Add click outside to close
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    };
    
    viewer.appendChild(prevBtn);
    viewer.appendChild(nextBtn);
    viewer.appendChild(closeBtn);
    viewer.appendChild(userInfo);
    overlay.appendChild(viewer);
    document.body.appendChild(overlay);
    
    showStory(currentIndex);
}

// -------------------------------

// --- File Sharing UI & Logic ---
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.style.display = 'none';
fileInput.accept = 'image/*,video/*,.pdf,.doc,.docx,.txt,.zip,.rar,.ppt,.pptx,.xls,.xlsx';

const docInput = document.createElement('input');
docInput.type = 'file';
docInput.style.display = 'none';
docInput.accept = '.pdf,.doc,.docx,.txt,.zip,.rar,.ppt,.pptx,.xls,.xlsx';

const storyInput = document.createElement('input');
storyInput.type = 'file';
storyInput.style.display = 'none';
storyInput.accept = 'image/*,video/*';

const attachBtn = document.createElement('button');
attachBtn.innerText = '📎';
attachBtn.className = 'icon-btn';
attachBtn.title = 'Attach file (images, videos, documents)';
attachBtn.onclick = () => fileInput.click();

const docBtn = document.createElement('button');
docBtn.innerText = '📄';
docBtn.className = 'icon-btn';
docBtn.title = 'Attach document';
docBtn.onclick = () => docInput.click();

const storyBtn = document.createElement('button');
storyBtn.innerText = '📸';
storyBtn.className = 'icon-btn';
storyBtn.title = 'Add to story';
storyBtn.onclick = () => storyInput.click();

// --- Fix: Define Missing Buttons ---
const botBtn = document.createElement('button');
botBtn.innerText = '🤖';
botBtn.className = 'icon-btn';
botBtn.onclick = () => {
    messageInput.value = '/ai ';
    messageInput.focus();
};

const sendBtn = document.createElement('button');
sendBtn.innerText = '➤';
sendBtn.className = 'send-btn';
sendBtn.onclick = sendMessage;

// Create Input Bar Container
const inputBar = document.createElement('div');
inputBar.className = 'input-bar';

// Move elements into inputBar
messageInput.parentNode.insertBefore(inputBar, messageInput);

if (isAndroid) {
    // Vertical layout for Android like WhatsApp with advanced design
    const buttonRow = document.createElement('div');
    buttonRow.style.display = 'flex';
    buttonRow.style.gap = '12px';
    buttonRow.style.justifyContent = 'space-between';
    buttonRow.style.alignItems = 'center';
    buttonRow.style.marginTop = '12px';

    buttonRow.appendChild(attachBtn);
    buttonRow.appendChild(docBtn);
    buttonRow.appendChild(storyBtn);
    buttonRow.appendChild(botBtn);
    buttonRow.appendChild(sendBtn);

    // Create input container with floating label
    const inputContainer = document.createElement('div');
    inputContainer.className = 'input-container';

    const floatingLabel = document.createElement('label');
    floatingLabel.textContent = 'Type a message...';
    floatingLabel.setAttribute('for', 'message-input');

    inputContainer.appendChild(messageInput);
    inputContainer.appendChild(floatingLabel);

    inputBar.appendChild(inputContainer);
    inputBar.appendChild(buttonRow);
} else {
    // Horizontal layout for desktop
    inputBar.appendChild(attachBtn);
    inputBar.appendChild(docBtn);
    inputBar.appendChild(storyBtn);
    inputBar.appendChild(messageInput);
    inputBar.appendChild(botBtn);
    inputBar.appendChild(sendBtn);
}

inputBar.appendChild(fileInput);
inputBar.appendChild(docInput);
inputBar.appendChild(storyInput);

fileInput.addEventListener('change', function() {
    const file = this.files[0];
    if (!file) return;
    
    const maxSize = 30 * 1024 * 1024; // 30MB limit
    
    if (file.size > maxSize) {
        alert(`File too large (Max 30MB)`);
        this.value = "";
        return;
    }

    // Show upload progress
    const progressDiv = document.createElement('div');
    progressDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 8px; z-index: 1001;';
    progressDiv.innerText = 'Uploading...';
    document.body.appendChild(progressDiv);

    const reader = new FileReader();
    reader.onload = (e) => {
        // Fix: Better type detection
        let type = file.type;
        if (!type) {
            const name = file.name.toLowerCase();
            if (name.match(/\.(jpg|jpeg|png|gif|webp)$/)) type = 'image/jpeg';
            else if (name.match(/\.(mp4|webm|ogg|mov)$/)) type = 'video/mp4';
            else if (name.endsWith('.pdf')) type = 'application/pdf';
            else if (name.match(/\.(doc|docx)$/)) type = 'application/msword';
            else if (name.endsWith('.txt')) type = 'text/plain';
            else type = 'application/octet-stream';
            console.log("Detected file type:", type);
        }

        const messageData = {
            room: currentRoom,
            user: currentUser,
            text: file.name,
            file: e.target.result,
            fileType: type,
            fileName: file.name,
            fileSize: file.size
        };
        console.log("📎 Sending file message:", { 
            room: currentRoom, 
            user: currentUser, 
            fileName: file.name, 
            fileType: file.type,
            fileSize: file.size 
        });
        socket.emit("message", messageData);

        // Render locally immediately
        addMessage(file.name, 'sent', e.target.result, type, null, file.size);
        
        // Remove progress indicator
        setTimeout(() => {
            if (progressDiv.parentNode) {
                progressDiv.parentNode.removeChild(progressDiv);
            }
        }, 1000);
    };
    reader.onerror = () => {
        alert('Error reading file');
        if (progressDiv.parentNode) {
            progressDiv.parentNode.removeChild(progressDiv);
        }
    };
    reader.readAsDataURL(file);
    this.value = "";
});

docInput.addEventListener('change', function() {
    const file = this.files[0];
    if (!file) return;
    
    // 30MB limit for documents
    if (file.size > 30 * 1024 * 1024) {
        alert("Document too large (Max 30MB)");
        this.value = "";
        return;
    }

    // Show upload progress
    const progressDiv = document.createElement('div');
    progressDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 8px; z-index: 1001;';
    progressDiv.innerText = 'Uploading document...';
    document.body.appendChild(progressDiv);

    const reader = new FileReader();
    reader.onload = (e) => {
        // Fix: Better type detection for documents
        let type = file.type;
        if (!type) {
            const name = file.name.toLowerCase();
            if (name.endsWith('.pdf')) type = 'application/pdf';
            else if (name.match(/\.(doc|docx)$/)) type = 'application/msword';
            else type = 'application/octet-stream';
            console.log("Detected doc type:", type);
        }

        const messageData = {
            room: currentRoom,
            user: currentUser,
            text: file.name,
            file: e.target.result,
            fileType: type,
            fileName: file.name,
            fileSize: file.size
        };
        console.log("📄 Sending document:", { 
            room: currentRoom, 
            user: currentUser, 
            fileName: file.name, 
            fileType: file.type,
            fileSize: file.size 
        });
        socket.emit("message", messageData);

        // Render locally immediately
        addMessage(file.name, 'sent', e.target.result, type || 'application/octet-stream', null, file.size);
        
        setTimeout(() => {
            if (progressDiv.parentNode) {
                progressDiv.parentNode.removeChild(progressDiv);
            }
        }, 1000);
    };
    reader.onerror = () => {
        alert('Error reading document');
        if (progressDiv.parentNode) {
            progressDiv.parentNode.removeChild(progressDiv);
        }
    };
    reader.readAsDataURL(file);
    this.value = "";
});

storyInput.addEventListener('change', function() {
    const file = this.files[0];
    if (!file) return;
    
    // 30MB limit for story media
    if (file.size > 30 * 1024 * 1024) {
        alert("Story file too large (Max 30MB)");
        this.value = "";
        return;
    }

    // Show upload progress
    const progressDiv = document.createElement('div');
    progressDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 8px; z-index: 1001;';
    progressDiv.innerText = 'Adding to story...';
    document.body.appendChild(progressDiv);

    const reader = new FileReader();
    reader.onload = (e) => {
        // Fix: Better type detection for stories
        let type = file.type;
        if (!type) {
            const name = file.name.toLowerCase();
            if (name.match(/\.(mp4|webm|ogg|mov)$/)) type = 'video/mp4';
            else type = 'image/jpeg';
            console.log("Detected story type:", type);
        }

        socket.emit("message", {
            room: currentRoom,
            user: currentUser,
            text: "New Story",
            file: e.target.result,
            fileType: type,
            isStory: true // Flag for story
        });

        // Render story locally immediately
        renderStory(currentUser, e.target.result, type);
        
        // Notify user in chat
        addMessage("You posted a new story! 📸", 'system');
        
        // Remove progress indicator
        setTimeout(() => {
            if (progressDiv.parentNode) {
                progressDiv.parentNode.removeChild(progressDiv);
            }
        }, 1000);
    };
    reader.onerror = () => {
        alert('Error reading story file');
        if (progressDiv.parentNode) {
            progressDiv.parentNode.removeChild(progressDiv);
        }
    };
    reader.readAsDataURL(file);
    this.value = "";
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
    
    // Check socket connection
    if (!socket.connected) {
        console.error("❌ Socket not connected! Status:", socket.io.engine.readyState);
        alert("❌ Not connected to chat server. Please refresh the page.");
        return;
    }
    
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
        const messageData = {
            room: currentRoom,
            user: currentUser,
            text: text
        };
        
        console.log("📤 Emitting message:", messageData);
        console.log("🔗 Socket connected:", socket.connected);
        console.log("👤 Current user:", currentUser);
        console.log("🏠 Current room:", currentRoom);
        
        socket.emit("message", messageData);
        messageInput.value = "";
        addMessage(text, 'sent'); // Show message immediately in UI
    }
}

function addMessage(text, type, fileData = null, fileType = null, id = null, fileSize = null) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', type);
    
    if (id) {
        msgDiv.id = `msg-${id}`;
    }
    
    if (fileData) {
        const mediaContainer = document.createElement('div');
        
        // Fix: Ensure fileType is a string
        if (!fileType) fileType = 'application/octet-stream';
        if (fileType.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = fileData;
            img.style.maxWidth = '200px';
            img.style.borderRadius = '8px';
            img.style.cursor = 'pointer';
            img.onclick = () => window.open(fileData, '_blank');
            mediaContainer.appendChild(img);
        } else if (fileType.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = fileData;
            video.controls = true;
            video.style.maxWidth = '200px';
            video.style.borderRadius = '8px';
            mediaContainer.appendChild(video);
        } else {
            // Document file
            const docContainer = document.createElement('div');
            docContainer.style.cssText = 'display: flex; align-items: center; gap: 10px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px;';
            
            const docIcon = document.createElement('div');
            docIcon.style.cssText = 'font-size: 24px;';
            
            // Set appropriate icon based on file type
            if (fileType.includes('pdf')) {
                docIcon.innerText = '📄';
            } else if (fileType.includes('word') || fileType.includes('document')) {
                docIcon.innerText = '📝';
            } else if (fileType.includes('text')) {
                docIcon.innerText = '📃';
            } else if (fileType.includes('spreadsheet') || fileType.includes('excel')) {
                docIcon.innerText = '📊';
            } else if (fileType.includes('presentation') || fileType.includes('powerpoint')) {
                docIcon.innerText = '📽️';
            } else if (fileType.includes('zip') || fileType.includes('rar')) {
                docIcon.innerText = '📦';
            } else {
                docIcon.innerText = '📎';
            }
            
            const docInfo = document.createElement('div');
            docInfo.style.cssText = 'flex: 1;';
            
            const docName = document.createElement('div');
            docName.style.cssText = 'font-weight: 500; font-size: 14px; color: inherit;';
            docName.innerText = text || 'Document';
            
            const docSize = document.createElement('div');
            docSize.style.cssText = 'font-size: 12px; opacity: 0.7;';
            if (fileSize) {
                const sizeKB = Math.round(fileSize / 1024);
                docSize.innerText = `${sizeKB} KB`;
            } else {
                docSize.innerText = 'File';
            }
            
            docInfo.appendChild(docName);
            docInfo.appendChild(docSize);
            
            // Download button
            const downloadBtn = document.createElement('button');
            downloadBtn.innerText = '⬇️';
            downloadBtn.style.cssText = 'background: none; border: none; cursor: pointer; font-size: 16px; padding: 5px; border-radius: 4px;';
            downloadBtn.title = 'Download file';
            downloadBtn.onclick = (e) => {
                e.stopPropagation();
                const link = document.createElement('a');
                link.href = fileData;
                link.download = text || 'document';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            };
            
            docContainer.appendChild(docIcon);
            docContainer.appendChild(docInfo);
            docContainer.appendChild(downloadBtn);
            mediaContainer.appendChild(docContainer);
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

// Add typing indicator functionality
let typingTimeout;
function showTypingIndicator() {
    clearTimeout(typingTimeout);
    let typingIndicator = document.querySelector('.typing-indicator');
    if (!typingIndicator) {
        typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator received';
        typingIndicator.innerHTML = '<span></span><span></span><span></span>';
        messagesDiv.appendChild(typingIndicator);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    typingTimeout = setTimeout(() => {
        if (typingIndicator && typingIndicator.parentNode) {
            typingIndicator.parentNode.removeChild(typingIndicator);
        }
    }, 1000);
}

// Show typing indicator when user starts typing
if (isAndroid) {
    messageInput.addEventListener('input', function() {
        if (this.value.length > 0) {
            socket.emit('typing', { room: currentRoom, user: currentUser });
        }
    });

    messageInput.addEventListener('blur', function() {
        socket.emit('stopTyping', { room: currentRoom, user: currentUser });
    });

    // Listen for typing events
    socket.on('userTyping', (data) => {
        if (data.user !== currentUser) {
            showTypingIndicator();
        }
    });

    socket.on('userStopTyping', (data) => {
        const typingIndicator = document.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    });
}