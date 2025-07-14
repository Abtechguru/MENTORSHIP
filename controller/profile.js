import AuthModel from "../models/authSchema.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getUserData = async(req,res)=>{
    try {
        const {id} = req.params;
        const userData = await AuthModel.findById(id).select("-password");
        if(!userData){
            return res.status(404).json({message: "User not found"});
        }
        return res.status(200).json({userData});
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Server error"});
    }
}

const EditProfile = async (req,res)=>{
    try {
        const {id} = req.params;
        const {name, email, bio, skills, goal} = req.body;

        const user = await AuthModel.findById(id);
        if(!user){
            return res.status(404).json({message: "User not found"});
        }

        user.name = name || user.name;
        user.email = email || user.email;
        user.bio = bio || user.bio;
        user.skills = skills || user.skills;
        user.goal = goal || user.goal;

        await user.save();
        return res.status(200).json({message: "Profile updated successfully", user});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Server error"});
    }
}

const uploadProfileImage = async (req, res) => {
    try {
        const {id} = req.params;
        
        if (!req.file) {
            return res.status(400).json({message: "No image file provided"});
        }

        const user = await AuthModel.findById(id);
        if (!user) {
            return res.status(404).json({message: "User not found"});
        }

        // Delete old profile image if it exists
        if (user.profileImage && user.profileImage !== "") {
            const oldImagePath = path.join(__dirname, '../uploads/', user.profileImage);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        // Update user with new image path
        user.profileImage = req.file.filename;
        await user.save();

        return res.status(200).json({
            message: "Profile image uploaded successfully",
            profileImage: req.file.filename
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Server error"});
    }
}

const deleteProfileImage = async (req, res) => {
    try {
        const {id} = req.params;
        
        const user = await AuthModel.findById(id);
        if (!user) {
            return res.status(404).json({message: "User not found"});
        }

        // Delete image file if it exists
        if (user.profileImage && user.profileImage !== "") {
            const imagePath = path.join(__dirname, '../uploads/', user.profileImage);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        // Remove image reference from user
        user.profileImage = "";
        await user.save();

        return res.status(200).json({message: "Profile image deleted successfully"});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Server error"});
    }
}

export { getUserData, EditProfile, uploadProfileImage, deleteProfileImage };