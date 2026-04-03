const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

    username: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },

    password: {
        type: String,
        required: true
    },

    // 🔥 UNIQUE PUBLIC HANDLE (@username)
    handle: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    // 🔹 Unique internal ID
    userId: {
        type: String,
        unique: true,
        required: true
    },

    bio: {
        type: String,
        default: ""
    },

    profileImage: {
        type: String,
        default: ""
    },

    coverPhoto: {
        type: String,
        default: ""
    },

    // ✅ KEEP ONLY ONE
    followers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],

    following: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],
    role: { type: String, enum: ["user", "admin"], default: "user" }

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);


