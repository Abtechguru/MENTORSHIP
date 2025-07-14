import express from "express";
import {getUserData, EditProfile, uploadProfileImage, deleteProfileImage} from "../controller/profile.js"
import { authMiddleware } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

const ProfileRoutes = express.Router()

ProfileRoutes.get("/getUserData/:id", authMiddleware, getUserData);
ProfileRoutes.put("/editProfile/:id", authMiddleware, EditProfile);
ProfileRoutes.post("/uploadImage/:id", authMiddleware, upload.single('profileImage'), uploadProfileImage);
ProfileRoutes.delete("/deleteImage/:id", authMiddleware, deleteProfileImage);

export default ProfileRoutes;