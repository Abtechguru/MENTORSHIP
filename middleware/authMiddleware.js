import jwt from "jsonwebtoken";
import AuthModel from "../models/authSchema.js";

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ message: "Unauthorized access" });
        }
        let decodedToken;
        try {
            decodedToken = jwt.verify(token, process.env.JWTSECRETKEY);
        } catch (error) {
            console.log(error);
            return res.status(401).json({ message: "Invalid token" });
        }
        const user = await AuthModel.findById(decodedToken.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        req.user = user;
        next();
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server error" });
    }
}

export { authMiddleware }