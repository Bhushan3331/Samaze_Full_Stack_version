router.post("/", async (req, res) => {
    try {
        const { author, content } = req.body;

        const newPost = new Post({ author, content });
        await newPost.save();

        res.json({ success: true, message: "Post created" });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});


router.get("/", async (req, res) => {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
});S