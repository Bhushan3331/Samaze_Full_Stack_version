const User = require("../models/User");

// ==========================
// GET PROFILE
// ==========================
const getProfile = async (req, res) => {
    try {
        console.log("Fetching profile for user:", req.user.id);

        const user = await User.findById(req.user.id).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.json({
            id: user._id,
            username: user.username,
            email: user.email,
            bio: user.bio || "",
            handle: user.handle || "",
            followers: user.followers?.length || 0,
            following: user.following?.length || 0
        });

    } catch (err) {
        console.error("Get profile error:", err);

        res.status(500).json({
            message: "Server error"
        });
    }
};


// ==========================
// UPDATE PROFILE
// ==========================
const updateProfile = async (req, res) => {

    try {

        const mongoId = req.user.id;

        const { username, bio, handle } = req.body;

        const user = await User.findById(mongoId);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // HANDLE UNIQUE CHECK
        if (handle !== undefined) {

            const cleanHandle = handle.toLowerCase().trim();

            const existingHandle = await User.findOne({
                handle: cleanHandle,
                _id: { $ne: mongoId }
            });

            if (existingHandle) {
                return res.status(400).json({
                    message: "Handle already taken"
                });
            }

            user.handle = cleanHandle;
        }

        if (username !== undefined)
            user.username = username;

        if (bio !== undefined)
            user.bio = bio;

        await user.save();

        res.json({
            success: true,
            message: "Profile updated successfully",
            id: user._id,
            username: user.username,
            bio: user.bio,
            handle: user.handle,
            userId: user.userId
        });

    }
    catch (err) {

        console.error("Update profile error:", err);

        res.status(500).json({
            message: err.message
        });

    }

};


// ==========================
// CHECK HANDLE AVAILABILITY
// ==========================
const checkHandleAvailability = async (req, res) => {

    try {

        const handle = req.params.handle.toLowerCase().trim();

        const existing = await User.findOne({ handle });

        res.json({
            available: !existing
        });

    }
    catch (err) {

        res.status(500).json({
            message: "Server error"
        });

    }

};


module.exports = {
    getProfile,
    updateProfile,
    checkHandleAvailability
};