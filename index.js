import express from 'express';
import cors from 'cors';
import dotenv from "dotenv";
import bodyParser from "body-parser"
import connectDb from './config/Mongodb.js';
import AuthRoutes from './routes/AuthRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import cookieParser from 'cookie-parser';
import mentorRoutes from "./routes/mentorRoutes.js";



dotenv.config();
const port = process.env.PORT
const app = express();

app.use(express.json());
app.use(cookieParser());

const allowedOrigins = [
    "http://localhost:5173", //frontend development URL
    "https://mentorship-frontend-xoig.vercel.app/"
];
app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Set-Cookie"]      
}));
app.use("/api/profile", profileRoutes);
app.use("/api/auth", AuthRoutes)
app.use("/api/addMentor", mentorRoutes)

app.get("/", (req, res) => {
    res.json({ message: "welcome to backend" });
});
    // connecting to the database
connectDb();

app.listen(8000, () => {
    console.log("Server is running");  


})
