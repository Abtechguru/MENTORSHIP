import AuthModel from "../models/authSchema.js";
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs";

// user registration controller
const register = async (req, res) =>{
    const salt = 10
    try {
        const {name,email,password,role} = req.body;

        if(!name ||!email|| !password|| !role){
            return res.status(400).json({message:"All fields are required"});
        }
        // check if user already exists
        const existUser = await AuthModel.findOne({email})

        if(existUser){
            return res.status(400).json({message:"User already exist"});
        }
        // hash password
        const hashPassword = await bcrypt.hash(password, salt )

        // create user
        const user = new AuthModel({
            name,
            email,
            password:hashPassword,
            role
        })
        // save user to database
        await user.save();

        // generate token
        const token = jwt.sign({id: user._id}, process.env.JWT_SECRET_KEY, {
            expiresIn:"3d"
        })
        res.cookie("token", token, {
            httpOnly:true,
            secure:true,
            sameSite:"strict",
            maxAge: 3 * 24 * 60 * 60 * 1000 // 3 days
        })
        return res.status(201).json({message: "User registered successfully", user: {id: user._id, name, email, role}});
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Server error"});
    }
}

// user login controller
const login = async (req, res) =>{
    try {
        const {email, password} = req.body;
        if(!email || !password){
            return res.status(400).json({message:"Email and password are required"});
        }
        const user = await AuthModel.findOne({email});
        if(!user){
            return res.status(400).json({message:"Invalid credentials"});
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch){
            return res.status(400).json({message:"Invalid credentials"});
        }
        const token = jwt.sign({id: user._id}, process.env.JWT_SECRET_KEY, {
            expiresIn:"3d"
        })
        res.cookie("token", token, {
            httpOnly:true,
            secure:true,
            sameSite:"strict",
            maxAge: 3 * 24 * 60 * 60 * 1000 // 3 days
        })
        return res.status(200).json({message: "Login successful", user: {id: user._id, name: user.name, email: user.email, role: user.role}});
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Server error"});
    }
}


// user logout controller
const Logout = async(req,res)=>{
    try {
        res.clearCookie("token", {
            httpOnly:true,
            secure:true,
            sameSite:"strict",
        })
        return res.status(200).json({message: "Logout successful"});
        
    } catch (error) {
        res.json({message: "Server error"});
        console.log(error)
        
    }
}

//  users data 
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


export{register, login, Logout, getUserData}