const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    room: {
        type: String,
        required: true,
        index: true
    },
    user: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required: true
    },
    file: {
        type: String,
        default: null
    },
    fileType: {
        type: String,
        default: null
    },
    isStory: {
        type: Boolean,
        default: false
    },
    id: {
        type: String,
        unique: true,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Auto-delete stories after 5 minutes (300000ms)
messageSchema.index({ timestamp: 1 }, { 
    expireAfterSeconds: 300,
    partialFilterExpression: { isStory: true }
});

module.exports = mongoose.model('Message', messageSchema);
