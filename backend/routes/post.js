const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");
const mongoose = require("mongoose");
const Post = require("../models/Post");
const Report = require("../models/report");
const User = require("../models/User");
const upload = require("../middleware/uploadMiddleware");

// ==============================
// JWT Middleware
// ==============================
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader)
        return res.status(401).json({ message: "No token provided" });

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret123");
        req.userId = decoded.id;
        next();
    } catch (err) {
        return res.status(403).json({ message: "Invalid token" });
    }
};

// ==============================
// CREATE POST WITH IMAGE
// ==============================
router.post("/", verifyToken, upload.array("images", 5), async (req, res) => {
    try {
        const { title, content } = req.body;

        if (!title && !content && (!req.files || req.files.length === 0)) {
            return res.status(400).json({ message: "Post cannot be empty" });
        }

        const imagePaths = Array.isArray(req.files)
    ? req.files.map(file => `/uploads/${file.filename}`)
    : [];

        const newPost = new Post({
            author: req.userId,
            title: title || "",
            content: content || "",
            images: imagePaths
        });

        await newPost.save();

        res.status(201).json({
            message: "Post created",
            post: newPost
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// ==============================
// GET ALL POSTS
// ==============================
router.get("/", async (req, res) => {
    try {
        const posts = await Post.find()
            .populate("author", "username handle profileImage")
            .sort({ createdAt: -1 });
        res.json({ posts });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// ==============================
// GET USER POSTS
// ==============================
router.get("/user/:id", verifyToken, async (req, res) => {
    try {
        const posts = await Post.find({ author: req.params.id })
            .populate("author", "username handle profileImage")
            .sort({ createdAt: -1 });

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({
            posts,
            followers: Array.isArray(user.followers) ? user.followers.length : 0,
            following: Array.isArray(user.following) ? user.following.length : 0
        });
    } catch (err) {
        console.error("User posts error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ==============================
// DELETE POST
// ==============================
router.delete("/:postId", verifyToken, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ message: "Post not found" });

        if (post.author.toString() !== req.userId)
            return res.status(403).json({ message: "Unauthorized" });

        await post.deleteOne();
        res.json({ message: "Post deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// ==============================
// DELETE COMMENT
// ==============================
router.delete("/:postId/comment/:commentId", verifyToken, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ message: "Post not found" });

        const comment = post.comments.id(req.params.commentId);
        if (!comment) return res.status(404).json({ message: "Comment not found" });
        if (comment.user.toString() !== req.userId) return res.status(403).json({ message: "Unauthorized" });

        comment.deleteOne();
        await post.save();

        res.json({ message: "Comment deleted" });
    } catch (err) {
        console.error("Delete comment error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

router.put(
    "/updateProfile",
    verifyToken,
    upload.single("profileImage"),
    async (req, res) => {
        try {
            const { username, handle, bio } = req.body;
            const updateData = { username, handle, bio };

            if (req.file) {
                updateData.profileImage = "/uploads/" + req.file.filename;
            }

            const updatedUser = await User.findByIdAndUpdate(req.userId, updateData, { new: true });

            res.json(updatedUser);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Server error" });
        }
    }
);


// ==============================
// HOME FEED
// ==============================
router.get("/feed", verifyToken, async (req, res) => {
    try {

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const following = Array.isArray(user.following) ? user.following : [];

        let posts = await Post.find({
            author: { $in: [...following, user._id] }
        })
        .sort({ createdAt: -1 })
        .populate("author", "username handle profileImage")
        .lean();

        // Fallback for deleted users
        posts = posts.map(post => {
            if (!post.author) {
                post.author = {
                    _id: "",
                    username: "Unknown",
                    handle: "",
                    profileImage: "/uploads/default-avatar.png"
                };
            }
            return post;
        });

        res.json(posts);

    } catch (err) {
        console.error("Feed error:", err);
        res.status(500).json({ message: "Failed to load feed" });
    }
});

// ==============================
// TRENDING POSTS (PROFESSIONAL VERSION)
// ==============================
router.get("/trending", async (req, res) => {
    try {

        const topPosts = await Post.aggregate([

            {
                $addFields: {
                    likesCount: { $size: { $ifNull: ["$likes", []] } },
                    commentsCount: { $size: { $ifNull: ["$comments", []] } }
                }
            },

            {
                $addFields: {
                    totalEngagement: { $add: ["$likesCount", "$commentsCount"] }
                }
            },

            {
                $sort: {
                    totalEngagement: -1,
                    createdAt: -1
                }
            },

            { $limit: 3 },

            {
                $lookup: {
                    from: "users",
                    localField: "author",
                    foreignField: "_id",
                    as: "author"
                }
            },

            {
                $unwind: {
                    path: "$author",
                    preserveNullAndEmptyArrays: true
                }
            },

            {
                $project: {

                    _id: 1,
                    title: 1,
                    content: 1,
                    images: 1,
                    likes: 1,
                    comments: 1,
                    createdAt: 1,

                    author: {
                        _id: "$author._id",
                        username: "$author.username",
                        handle: "$author.handle",
                        profileImage: "$author.profileImage"
                    }

                }
            }

        ]);

        res.json(topPosts);

    }
    catch (err) {

        console.error("TRENDING ERROR:", err);

        res.status(500).json({
            message: "Failed to fetch trending posts"
        });

    }
});


// -------------------------
// Get logged-in user's bookmarks
// -------------------------
router.get("/bookmarks", verifyToken, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const posts = await Post.find({
      bookmarks: { $in: [userId] }
    })
    .populate("author", "username handle profileImage")
    .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


// -------------------------
// Toggle bookmark for a post
// -------------------------
router.post("/toggle", verifyToken, async (req, res) => {
    try {

        const userId = req.userId;
        const { postId } = req.body;

        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        let updatedPost;

        if (post.bookmarks.includes(userId)) {

            updatedPost = await Post.findByIdAndUpdate(
                postId,
                { $pull: { bookmarks: userId } },
                { new: true }
            );

        } else {

            updatedPost = await Post.findByIdAndUpdate(
                postId,
                { $addToSet: { bookmarks: userId } },
                { new: true }
            );

        }

        res.json({
            bookmarksCount: updatedPost.bookmarks.length
        });

    } catch (err) {
        console.error("Toggle bookmark error:", err);
        res.status(500).json({ message: "Bookmark failed" });
    }
});

// ==============================
// LIKE / UNLIKE POST
// ==============================
router.put("/:id/like", verifyToken, async (req, res) => {

    try {

        const post = await Post.findById(req.params.id);

        if (!post)
            return res.status(404).json({ message: "Post not found" });

        const userId = req.userId;

        const index = post.likes.findIndex(id => id.toString() === userId);

        // LIKE
        if (index === -1) {

            post.likes.push(userId);

            // CREATE LIKE NOTIFICATION
            if (post.author.toString() !== userId) {

                await Notification.create({
                    type: "like",
                    recipient: post.author,
                    sender: userId,
                    post: post._id,
                    message: "liked your post"
                });

            }

        }
        // UNLIKE
        else {

            post.likes.splice(index, 1);

        }

        await post.save();

        res.json({
            message: "Like updated",
            likesCount: post.likes.length
        });

    }
    catch (err) {

        console.error("Like error:", err);

        res.status(500).json({
            message: "Server error"
        });

    }

});

// ==============================
// ADD COMMENT
// ==============================
const Notification = require("../models/Notification");

router.post("/:id/comment", verifyToken, async (req, res) => {
    try {

        console.log(" COMMENT API CALLED");
        console.log("Post ID:", req.params.id);
        console.log("User commenting:", req.userId);

        const { text } = req.body;

        if (!text || text.trim() === "") {
            return res.status(400).json({ message: "Comment cannot be empty" });
        }

        const post = await Post.findById(req.params.id);

        if (!post) {
            console.log(" Post not found");
            return res.status(404).json({ message: "Post not found" });
        }


        post.comments.push({
            user: req.userId,
            text: text.trim()
        });

        await post.save();

        console.log(" Comment saved");

        // CREATE NOTIFICATION
        if (post.author.toString() !== req.userId) {

            console.log(" Creating comment notification");

            const notif = await Notification.create({
                type: "comment",
                recipient: post.author,
                sender: req.userId,
                post: post._id,
                message: text.trim()
            });

            console.log(" Notification created:", notif._id);

        } else {
            console.log("⚠ User commented on own post. No notification.");
        }

        res.json({
            message: "Comment added",
            commentsCount: post.comments.length
        });

    } catch (err) {

        console.error(" COMMENT ERROR:", err);
        res.status(500).json({ message: "Server error" });

    }
});

// ==============================
// GET COMMENTS
// ==============================
router.get("/:id/comment", async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate("comments.user", "username handle profileImage");
        if (!post) return res.status(404).json({ message: "Post not found" });

        res.json(post.comments);
    } catch (err) {
        console.error("Get comments error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ==============================
// REPORT POST
// ==============================
router.post("/report-post", verifyToken, async (req, res) => {
    try {

        const { postId, reason } = req.body;
        const userId = req.userId;

        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        // Prevent duplicate reports
        const alreadyReported = await Report.findOne({
            postId: postId,
            reportedBy: userId
        });

        if (alreadyReported) {
            return res.status(400).json({ message: "You already reported this post" });
        }

        const report = new Report({
            postId: postId,
            reportedBy: userId,
            postOwner: post.author,
            reason: reason || "Inappropriate content"
        });

        await report.save();

        res.json({ message: "Post reported successfully" });

    } catch (error) {
        console.error("Report error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;