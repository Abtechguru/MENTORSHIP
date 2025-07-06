import { register, login } from "../controller/Auth.js";
import express from "express";
const AuthRoutes = express.Router()

// User registration route
AuthRoutes.post("/register", register)

// User login route
AuthRoutes.post("/login", login)

export default AuthRoutes;