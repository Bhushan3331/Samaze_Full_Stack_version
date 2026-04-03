const mongoose = require("mongoose");

// Post schema with embedded comments
const postSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
   images: {
    type: [String],  
    default: []
},
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    bookmarks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    comments: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            text: {
                type: String,
                required: true
            },
            createdAt: {
                type: Date,
                default: Date.now
            }
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model("Post", postSchema);