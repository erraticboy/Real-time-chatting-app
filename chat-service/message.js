const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  room: String,
  user: String,
  text: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Message", MessageSchema);