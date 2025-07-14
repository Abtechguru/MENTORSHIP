import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser  from "body-parser";
import connectDb from "./config/Mongodb.js";
import AuthRoutes from "./routes/AuthRoutes.js";
import ProfileRoutes from "./routes/profileRoutes.js"
import cookieParser from "cookie-parser";
import mentorRoutes from "./routes/mentorRoutes.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const port = process.env.PORT 
const app = express();

app.use(express.json());
app.use(cookieParser())

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const allowOrigin = [
  "https://mentorship-frontend-z3dl.vercel.app",
  "http://localhost:5173",
];
app.use(cors({
    origin: allowOrigin,
    credentials: true,
    methods: ["GET", "PUT", "DELETE", "POST"],
    allowedHeaders: ["content-type", "Authorization"]
}));

app.use("/api/auth",AuthRoutes)
app.use("/api/profile", ProfileRoutes)
app.use("/api/", mentorRoutes)

// connecting to database
app.get("/" , (req,res)=>{
    res.json({message:"welcome to Abtech Blosson backend"})
})

connectDb();

app.listen(port, ()=>{
    console.log(" server is running")
})