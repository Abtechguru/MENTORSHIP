//user registration and login controller
import AuthModel from "../models/authSchema.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// Register controller
const register = async (req, res) => {
    const salt = 10;
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: "All fields are required" });
        }
        // Check if user already exists
        const existingUser = await AuthModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create a new user
        const user = new AuthModel({
            name,
            email,
            password: hashedPassword,
            role
        });
        await user.save();
        // Generate JWT token
        const token = jwt.sign({ id: user._id }, process.env.JWTSECRETKEY, { expiresIn: "3d" });

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            maxAge: 3 * 24 * 60 * 60 * 1000 // 3 days
        });

        res.status(201).json({ message: "User registered successfully", user });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error" });
    }
};

// Login controller
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ message: "Email and password are required" });

        const user = await AuthModel.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        const token = jwt.sign({ id: user._id }, process.env.JWTSECRETKEY, { expiresIn: "3d" });
        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            maxAge: 3 * 24 * 60 * 60 * 1000 // 3 days
        });

        return res.status(200).json({ message: "Login successful", user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server error" });
    }
};

// Logout controller
const Logout = async (req, res) => {
    try {
        res.clearCookie("token");
        return res.status(200).json({ message: "Logout successful" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server error" });
    }
};

// Get user data controller
const getUserData = async (req, res) => {
    try {
        const { id } = req.params;
        const userData = await AuthModel.findById(id).select("-password");
        if (!userData) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json({ userData });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server error" });
    }
};

export { register, login, Logout, getUserData };