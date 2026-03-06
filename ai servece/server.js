const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Gemini
let genAI;
const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";

if (!apiKey || apiKey === "your_actual_api_key_here") {
  console.error("❌ ERROR: GEMINI_API_KEY is missing or invalid in .env file");
  console.error("👉 Please open 'ai servece/.env' and paste your real API key.");
} else {
  genAI = new GoogleGenerativeAI(apiKey);
}

app.post("/chat", async (req, res) => {
  if (!genAI) {
    return res.status(500).json({ reply: "AI Service is not configured. Check terminal for API Key error." });
  }
  const { message } = req.body;
  try {
    // Attempt 1: Try gemini-1.5-flash
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(message);
    const response = await result.response;
    const text = response.text();
    res.json({ reply: text });
  } catch (error) {
    console.error("Primary Model Error:", error.message);
    
    // Attempt 2: Fallback to gemini-1.5-pro if the first one fails
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const result = await model.generateContent(message);
      const response = await result.response;
      res.json({ reply: response.text() });
    } catch (fallbackError) {
      console.error("Fallback Model Error:", fallbackError.message);
      res.status(500).json({ reply: `AI Error: ${fallbackError.message}` });
    }
  }
});

app.listen(6001, () => console.log("AI Service running on 6001"));