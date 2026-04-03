const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const User = require("../models/User");
const upload = require("../middleware/uploadMiddleware"); // multer setup

// ==============================
// GET LOGGED-IN USER PROFILE
// ==============================
router.get("/", verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId); // ✅ middleware now sets req.userId
        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({
            _id: user._id,
            username: user.username,
            handle: user.handle,
            bio: user.bio || "No bio",
            profileImage: user.profileImage || "/default-profile.png",
            followers: user.followers?.length || [],
            following: user.following?.length || []
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// ==============================
// UPDATE PROFILE
// ==============================
router.put("/updateProfile", verifyToken, upload.single("profileImage"), async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const { username, handle, bio } = req.body;

        // Validate handle uniqueness
        if (handle && handle !== user.handle) {
            const exists = await User.findOne({ handle });
            if (exists) return res.status(400).json({ message: "Handle already taken" });
            user.handle = handle;
        }

        if (username) user.username = username;
        if (bio !== undefined) user.bio = bio;

        if (req.file) user.profileImage = `/uploads/${req.file.filename}`;

        await user.save();

        res.json({
            _id: user._id,
            username: user.username,
            handle: user.handle,
            bio: user.bio || "No bio",
            profileImage: user.profileImage || "/default-profile.png",
            followers: user.followers?.length || [],
            following: user.following?.length || []
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// ==============================
// CHECK HANDLE AVAILABILITY
// ==============================
router.get("/check-handle/:handle", verifyToken, async (req, res) => {
    try {
        const handle = req.params.handle.toLowerCase().trim();
        const user = await User.findOne({ handle });
        // Allow current user’s own handle
        const available = !user || user._id.toString() === req.userId;
        res.json({ available });
    } catch (err) {
        console.error(err);
        res.status(500).json({ available: false });
    }
});

// ==============================
// GET USER BY ID (for follow buttons)
// ==============================
router.get("/user/:id", verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({
            _id: user._id,
            username: user.username,
            handle: user.handle,
            followers: user.followers || [],
            following: user.following || []
        });
    } catch (err) {
        console.error("Fetch user by ID error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ==============================
// FOLLOW USER
// ==============================
router.put("/user/:id/follow", verifyToken, async (req, res) => {
    try {
        const targetUser = await User.findById(req.params.id);
        const currentUser = await User.findById(req.userId);

        if (!targetUser) return res.status(404).json({ message: "User not found" });
        if (targetUser._id.equals(currentUser._id))
            return res.status(400).json({ message: "You can't follow yourself" });

        if (!targetUser.followers.includes(currentUser._id)) {
            targetUser.followers.push(currentUser._id);
            currentUser.following.push(targetUser._id);

            await targetUser.save();
            await currentUser.save();
        }

        res.json({
            message: "Followed successfully",
            followers: targetUser.followers.length,
            following: currentUser.following.length
        });

    } catch (err) {
        console.error("Follow error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ==============================
// UNFOLLOW USER
// ==============================
router.put("/user/:id/unfollow", verifyToken, async (req, res) => {
    try {
        const targetUser = await User.findById(req.params.id);
        const currentUser = await User.findById(req.userId);

        if (!targetUser) return res.status(404).json({ message: "User not found" });
        if (targetUser._id.equals(currentUser._id))
            return res.status(400).json({ message: "You can't unfollow yourself" });

        targetUser.followers = targetUser.followers.filter(f => !f.equals(currentUser._id));
        currentUser.following = currentUser.following.filter(f => !f.equals(targetUser._id));

        await targetUser.save();
        await currentUser.save();

        res.json({
            message: "Unfollowed successfully",
            followers: targetUser.followers.length,
            following: currentUser.following.length
        });

    } catch (err) {
        console.error("Unfollow error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// SEARCH USERS
router.get("/search", verifyToken, async (req, res) => {
    try {

        const query = req.query.q;

        if (!query)
            return res.json([]);

        const users = await User.find({
            $or: [
                { handle: { $regex: query, $options: "i" } },
                { name: { $regex: query, $options: "i" } }
            ]
        }).select("name handle profilePic");

        res.json(users);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;