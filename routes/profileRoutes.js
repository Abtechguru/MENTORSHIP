import express from "express";
import { getUserData, EditProfile } from "../controller/profile.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
const profileRoutes = express.Router();

profileRoutes.get("/:id", authMiddleware, getUserData);
profileRoutes.put("/:id", authMiddleware, EditProfile);

export default profileRoutes;