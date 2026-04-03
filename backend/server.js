require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

// ==========================
// MIDDLEWARE
// ==========================
app.use(cors());
app.use(express.json());

// ==========================
// STATIC FOLDERS
// ==========================
app.use(express.static(path.join(__dirname, "frontend")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/images", express.static(path.join(__dirname, "images")));
app.use("/Pages", express.static(path.join(__dirname, "Pages"))); // SPA pages

// ==========================
// ROUTES
// ==========================
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const postRoutes = require("./routes/post");

// Auth & Users
app.use("/api/auth", authRoutes);
app.use("/api/users", authRoutes); // for search/follow routes

// Profile
app.use("/api/profile", profileRoutes);

// Posts
app.use("/api/posts", postRoutes);

// Notifications (from auth.js)
app.use("/api/notifications", authRoutes);

const adminRouter = require("./routes/admin");
app.use("/api/admin", adminRouter);

// ==========================
// DATABASE CONNECTION
// ==========================
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected ✅"))
.catch(err => console.error("MongoDB error:", err));

// ==========================
// START SERVER
// ==========================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));