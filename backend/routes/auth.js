const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
// const verifyToken = require("../middleware/authMiddleware");
const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const Notification = require("../models/Notification");
const Post = require("../models/Post"); 
const mongoose = require("mongoose");
//Add storage config
const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        cb(null, "uploads/");
    },

    filename: function (req, file, cb) {

        const uniqueName =
            Date.now() + path.extname(file.originalname);

        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

// ================= Helper: Generate Unique User ID =================
async function generateUniqueUserId() {
    let id;
    let exists = true;

    while (exists) {
        id = "USR" + crypto.randomBytes(3).toString("hex").toUpperCase();
        exists = await User.findOne({ userId: id });
    }

    return id;
}

// ================= Helper: Generate Unique Handle =================
async function generateUniqueHandle(username) {
    let baseHandle = username.toLowerCase().replace(/\s+/g, "");
    let handle = baseHandle;
    let counter = 1;

    while (await User.findOne({ handle })) {
        handle = baseHandle + counter;
        counter++;
    }

    return handle;
}

// Admin login route
router.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if the user is admin
    if (user.role !== "admin") return res.status(403).json({ message: "Access denied" });

    // Check password
    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(400).json({ message: "Invalid password" });

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,  // make sure you have this in your .env
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ================= SIGNUP =================
router.post("/signup", async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "All fields are required"
        });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Email already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = await generateUniqueUserId();

        // 🔥 ADD THIS LINE
        const handle = await generateUniqueHandle(username);

        const user = new User({
        username,
        email,
        password: hashedPassword,
        userId,
        handle
    });
        await user.save();

        return res.status(201).json({
            success: true,
            message: "Signup successful",
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                userId: user.userId,
                handle: user.handle   // ✅ ADD THIS
            }
        });

    } catch (err) {
        console.error("Signup error:", err);
        return res.status(500).json({
            success: false,
            message: "Signup failed"
        });
    }
});

// ================= LOGIN =================
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email and password are required"
        });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found"
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Wrong password"
            });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || "secret123",
            { expiresIn: "7d" }
        );

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                userId: user.userId,
                handle: user.handle,
                role: user.role
            }
        });

    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error. Login failed"
        });
    }
});

// ================= LOGOUT =================
router.post("/logout", (req, res) => {
    return res.status(200).json({
        success: true,
        message: "Logout successful"
    });
});


// ================= GET PROFILE =================
router.get("/profile", authMiddleware, async (req, res) => {
    try {

        const user = await User.findById(req.userId).select("-password");

        if (!user)
            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        res.json({
            success: true,
            id: user._id,
            username: user.username,
            email: user.email,
            userId: user.userId,
            handle: user.handle,
            bio: user.bio || "",
            profileImage: user.profileImage || "",
            coverPhoto: user.coverPhoto || "",
            followersCount: user.followers.length,
            followingCount: user.following.length
        });

    }
    catch (err) {

        console.error("Profile fetch error:", err);

        res.status(500).json({
            success: false,
            message: "Server error"
        });

    }
});

// ================= /ME =================
router.get("/me", authMiddleware, async (req, res) => {
    try {

        const user = await User.findById(req.userId).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                userId: user.userId,
                handle: user.handle,
                bio: user.bio || "",
                role: user.role
            }
        });

    } catch (err) {
        console.error("/me fetch error:", err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

// ================= GET USER BY ID =================
router.get("/users/:id", authMiddleware, async (req, res) => {

    try {

        const user = await User.findById(req.params.id)
            .select("-password");

        if (!user)
            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        res.json({
            success: true,
            id: user._id,
            username: user.username,
            handle: user.handle,
            bio: user.bio || "",
            profileImage: user.profileImage || "",
            followers: user.followers || [],
            following: user.following || []
        });

    }
    catch (err) {

        console.error("Fetch user error:", err);

        res.status(500).json({
            success: false,
            message: "Server error"
        });

    }

});



// PUT /api/auth/profile
router.put("/profile", authMiddleware, upload.single("profileImage"), async (req, res) => {

    try {

        const user = await User.findById(req.userId);

        if (!user)
            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        const { username, handle, bio } = req.body;

        if (username)
            user.username = username;

        if (handle) {

            const existingHandle =
                await User.findOne({ handle });

            if (
                existingHandle &&
                existingHandle._id.toString() !== req.userId
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Handle already taken"
                });
            }

            user.handle = handle;
        }

        if (bio !== undefined)
            user.bio = bio;

        // ✅ SAVE IMAGE
        if (req.file) {

            user.profileImage =
                "/uploads/" + req.file.filename;
        }

        await user.save();

        res.json({

            success: true,

            message: "Profile updated!",

            user: {

                id: user._id,

                username: user.username,

                handle: user.handle,

                bio: user.bio,

                profileImage: user.profileImage
            }
        });

    }
    catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            message: "Server error"
        });
    }
});


// FOLLOW USER
router.put("/:id/follow", authMiddleware, async (req, res) => {
    try {
        const targetUser = await User.findById(req.params.id);
        const currentUser = await User.findById(req.userId);

        if (!targetUser)
            return res.status(404).json({ message: "User not found" });

        if (!currentUser)
            return res.status(404).json({ message: "Current user not found" });

        if (targetUser._id.equals(currentUser._id))
            return res.status(400).json({ message: "You can't follow yourself" });

        if (!targetUser.followers.includes(currentUser._id)) {

            targetUser.followers.push(currentUser._id);
            currentUser.following.push(targetUser._id);

            await Promise.all([
                targetUser.save(),
                currentUser.save()
            ]);
            if (!targetUser._id.equals(currentUser._id)) { // avoid self-follow
        await Notification.create({
            type: "follow",
            recipient: targetUser._id,
            sender: currentUser._id,
            message: "follow"
        });
    }
            
        }

        res.json({
            message: "Followed successfully",
            followers: targetUser.followers.length,
            following: currentUser.following.length
        });

    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// UNFOLLOW USER
router.put("/:id/unfollow", authMiddleware, async (req, res) => {
    try {
        const targetUser = await User.findById(req.params.id);
        const currentUser = await User.findById(req.userId);

        if (!targetUser)
            return res.status(404).json({ message: "User not found" });

        if (!currentUser)
            return res.status(404).json({ message: "Current user not found" });

        if (targetUser._id.equals(currentUser._id))
            return res.status(400).json({ message: "You can't unfollow yourself" });

        targetUser.followers =
            targetUser.followers.filter(f => !f.equals(currentUser._id));

        currentUser.following =
            currentUser.following.filter(f => !f.equals(targetUser._id));

        await Promise.all([
            targetUser.save(),
            currentUser.save()
        ]);

        res.json({
            message: "Unfollowed successfully",
            followers: targetUser.followers.length,
            following: currentUser.following.length
        });

    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

//Update data for followers and following count

router.get("/:id/follow-data", authMiddleware, async (req, res) => {
  try {

    const user = await User.findById(req.params.id)
      .select("followers following");

    if (!user)
        return res.status(404).json({ message: "User not found" });

    const isFollowing =
        user.followers.some(f => f.toString() === req.userId);

    res.json({
      followersCount: user.followers.length,
      followingCount: user.following.length,
      isFollowing
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SEARCH USERS
router.get("/search", authMiddleware, async (req, res) => {

    try {

        const query = req.query.q;

        if (!query)
            return res.json([]);

        const users = await User.find({
            _id: { $ne: req.userId },
            $or: [
                { username: { $regex: query, $options: "i" } },
                { handle: { $regex: query, $options: "i" } }
            ]
        })
        .select("_id username handle profileImage")
        .limit(20);

        res.json(users);

    }
    catch (err) {

        console.error("Search error:", err);

        res.status(500).json({
            message: "Server error"
        });

    }

});

// GET all notifications for logged-in user
router.get("/notifications", authMiddleware, async (req, res) => {
    try {

        const notifications = await Notification.find({
            recipient: req.userId,
        })
        .sort({ createdAt: -1 })
        .populate("sender", "username profileImage")
        .populate("post", "_id");

        const formatted = notifications
        .filter(n => n.sender)
        .map(notif => {

            const senderName = notif.sender?.username || "Someone";

            let message = "";

            if (notif.type === "follow") {
                message = `${senderName} started following you`;
            }

            if (notif.type === "like") {
                message = `${senderName} liked your post`;
            }

            if (notif.type === "comment") {
                message = `${senderName} commented: "${notif.message}"`;
            }

            return {
                _id: notif._id,
                type: notif.type,
                sender: notif.sender,
                post: notif.post,
                message,
                isRead: notif.isRead,
                createdAt: notif.createdAt
            };

        });

        res.json(formatted);

    } catch (err) {

        console.error("Notifications fetch error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// PUT mark notification as read
router.put("/notifications/:id/read", authMiddleware, async (req, res) => {
    try {

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid notification ID" });
        }

        const notification = await Notification.findOne({
            _id: req.params.id,
            recipient: req.userId   // ✅ correct field
        });

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        notification.isRead = true;   // ✅ use correct field name
        await notification.save();

        res.json({ message: "Marked as read" });

    } catch (err) {
        console.error("Read notification error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// GET unread notifications count
router.get("/notifications/unread-count", authMiddleware, async (req, res) => {

  try {

    const count = await Notification.countDocuments({
      recipient: req.userId,
      isRead: false
    });

    res.json({ count });

  } catch (error) {

    console.error("Unread notification error:", error);
    res.status(500).json({ message: "Server error" });

  }

});

// PUT mark all notifications as read
router.put("/notifications/mark-read", authMiddleware, async (req, res) => {

  try {

    await Notification.updateMany(
      { recipient: req.userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ message: "Notifications marked as read" });

  } catch (error) {

    console.error("Mark read error:", error);
    res.status(500).json({ message: "Server error" });

  }

});

// LIKE A POST
router.put("/posts/:postId/like", authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        const currentUser = await User.findById(req.userId);

        if (!post) return res.status(404).json({ message: "Post not found" });

        if (!post.likes.includes(currentUser._id)) {
            post.likes.push(currentUser._id);
            await post.save();

            // Notify post owner
           if (!post.author.equals(currentUser._id)) {
            await Notification.create({
                type: "like",
                recipient: post.author,
                sender: currentUser._id,
                post: post._id,
                message: ""
            });
        }

            return res.json({ message: "Post liked successfully", likesCount: post.likes.length });
        } else {
            return res.status(400).json({ message: "You already liked this post" });
        }

    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// COMMENT ON POST
router.post("/posts/:postId/comment", authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        const currentUser = await User.findById(req.userId);

        if (!post) return res.status(404).json({ message: "Post not found" });

        const comment = {
            user: currentUser._id,
            text: req.body.text
        };
        post.comments.push(comment);
        await post.save();

        // Notify post owner
        if (!post.author.equals(currentUser._id)) {
            await Notification.create({
                type: "comment",
                recipient: post.author,
                sender: currentUser._id,
                post: post._id,
                message: req.body.text
            });
        }

        res.json({ message: "Comment added", commentsCount: post.comments.length });

    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;

