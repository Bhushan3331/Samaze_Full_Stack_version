const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const Post = require("../models/Post");
const User = require("../models/User");

// -----------------------------
// ADMIN ONLY MIDDLEWARE
// -----------------------------
async function adminOnly(req, res, next) {
    try {
        // Fetch user from DB using userId set by authMiddleware
        const user = await User.findById(req.userId);

        if (!user) return res.status(401).json({ message: "User not found" });

        if (user.role !== "admin") return res.status(403).json({ message: "Admins only" });

        // Attach user to request for later use
        req.user = user;

        next();
    } catch (err) {
        console.error("Admin check failed:", err);
        res.status(500).json({ message: "Server error" });
    }
}

// -----------------------------
// GET posts stats
// -----------------------------
router.get("/posts-stats", authMiddleware, adminOnly, async (req, res) => {
    try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const totalPostsThisMonth = await Post.countDocuments({ createdAt: { $gte: startOfMonth } });

        res.json({ totalPostsThisMonth });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

// -----------------------------
// GET users stats
// -----------------------------
router.get("/users-stats", authMiddleware, adminOnly, async (req, res) => {
    try {
        const users = await User.find({});

        const userStats = await Promise.all(users.map(async (u) => {
            const posts = await Post.find({ author: u._id });
            const postsCount = posts.length;
            const likesReceived = posts.reduce((sum, p) => sum + (p.likes?.length || 0), 0);
            const followersGained = u.followers?.length || 0;

            return { username: u.username, postsCount, likesReceived, followersGained };
        }));

        res.json({ totalUsers: users.length, users: userStats });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

// -----------------------------
// GET reported posts
// -----------------------------
router.get("/reported-posts", authMiddleware, adminOnly, async (req, res) => {
    try {
        const posts = await Post.find({ reports: { $exists: true, $not: { $size: 0 } } })
            .populate("author", "username");

        const reportedPosts = posts.map(p => ({
            _id: p._id,
            author: p.author,
            content: p.content,
            reason: p.reports.map(r => r.reason).join(", ")
        }));

        res.json({ posts: reportedPosts });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

// -----------------------------
// POST resolve a report
// -----------------------------
router.post("/reported-posts/:postId/resolve", authMiddleware, adminOnly, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ message: "Post not found" });

        post.reports = [];
        await post.save();

        res.json({ message: "Report resolved" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;