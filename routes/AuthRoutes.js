import { register, login, Logout, getUserData } from "../controller/Auth.js";
import express from "express";
const AuthRoutes = express.Router()

// User registration route
AuthRoutes.post("/register", register)

// User login route
AuthRoutes.post("/login", login)

// User logout route
AuthRoutes.post("/Logout",Logout)

// Get user data route
AuthRoutes.get("/getUserData/:id", getUserData)

export default AuthRoutes;