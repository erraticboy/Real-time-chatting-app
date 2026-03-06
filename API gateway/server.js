const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const path = require("path");

const app = express();

app.use(express.static(path.join(__dirname, "../Frontend")));

app.use("/auth", createProxyMiddleware({ 
    target: "http://localhost:4000", 
    changeOrigin: true,
    pathRewrite: { '^/auth': '' },
    onProxyReq: (proxyReq, req, res) => {
        console.log(`[Gateway] Proxying ${req.method} ${req.url} -> Auth Service`);
    }
}));

// Proxy Socket.io requests to Chat Service
const socketProxy = createProxyMiddleware({ 
    target: "http://localhost:5000", 
    changeOrigin: true, 
    ws: true 
});

// Use a wrapper to prevent path stripping, so the proxy receives /socket.io/...
app.use("/socket.io", (req, res, next) => {
    req.url = req.originalUrl || req.url;
    socketProxy(req, res, next);
});

app.use("/ai", createProxyMiddleware({ 
    target: "http://localhost:6001", 
    changeOrigin: true,
    pathRewrite: { '^/ai': '' }
}));

app.listen(3000, () => console.log("Gateway running on 3000"));