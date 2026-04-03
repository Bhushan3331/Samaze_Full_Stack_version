const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    try {

        const authHeader = req.headers.authorization;

        if (!authHeader)
            return res.status(401).json({
                message: "No token provided"
            });

        const token = authHeader.split(" ")[1];

        if (!token)
            return res.status(401).json({
                message: "Invalid token format"
            });

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "secret123"
        );

        req.userId = decoded.id;

        next();

    }
    catch (err) {

        console.error("Token verification failed:", err.message);

        return res.status(401).json({
            message: "Invalid or expired token"
        });

    }
};

module.exports = verifyToken;