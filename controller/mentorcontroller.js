import bcrypt from "bcryptjs";
import MentorModel from "../models/mentorSchema.js"
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const addMentor = async(req,res) =>{
    const salt = 10

    try {
        const {name, email, availability, bio, topic, password, experience} = req.body

        const hashPassword = await bcrypt.hash(password, salt)
        
        const mentor = new MentorModel({
            name,
            email,
            password: hashPassword,
            availability, 
            bio, 
                topic,
            experience
        })

        await mentor.save()
        return res.status(200).json({message: "mentor added successfully"})
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Server error"});
    }
}

const uploadMentorImage = async (req, res) => {
    try {
        const {id} = req.params;
        
        if (!req.file) {
            return res.status(400).json({message: "No image file provided"});
        }

        const mentor = await MentorModel.findById(id);
        if (!mentor) {
            return res.status(404).json({message: "Mentor not found"});
        }

        // Delete old profile image if it exists
        if (mentor.profileImage && mentor.profileImage !== "") {
            const oldImagePath = path.join(__dirname, '../uploads/', mentor.profileImage);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        // Update mentor with new image path
        mentor.profileImage = req.file.filename;
        await mentor.save();

        return res.status(200).json({
            message: "Mentor profile image uploaded successfully",
            profileImage: req.file.filename
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Server error"});
    }
}

const deleteMentorImage = async (req, res) => {
    try {
        const {id} = req.params;
        
        const mentor = await MentorModel.findById(id);
        if (!mentor) {
            return res.status(404).json({message: "Mentor not found"});
        }

        // Delete image file if it exists
        if (mentor.profileImage && mentor.profileImage !== "") {
            const imagePath = path.join(__dirname, '../uploads/', mentor.profileImage);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        // Remove image reference from mentor
        mentor.profileImage = "";
        await mentor.save();

        return res.status(200).json({message: "Mentor profile image deleted successfully"});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Server error"});
    }
}

const BookSession = async(req,res) =>{
    try {
        
    } catch (error) {
        
    }
}

const getMentor = async(req,res) =>{
    try {
        const mentors = await MentorModel.find()
        res.status(200).json({mentors})
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Server error"});
    }
}
const getMentorById = async(req,res) =>{
    try {
        const {id} = req.params;
        const mentor = await MentorModel.findById(id);
        res.status(200).json({mentor})
    } catch (error) {
        console.log(error)
    }
}
const deleteMentor = async(req,res) =>{
    try {
        const {id} = req.params;
        await MentorModel.findByIdAndDelete(id);
        res.status(200).json({message: "Mentor deleted successfully"})
    } catch (error) {
        console.log(error)
    }
}
export {addMentor, BookSession, getMentor, uploadMentorImage, deleteMentorImage , getMentorById , deleteMentor}