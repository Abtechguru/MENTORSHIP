import express from 'express';
import cors from 'cors';
import dotenv from "dotenv";
import bodyParser from "body-parser"
import connectDb from './config/Mongodb.js';
import AuthRoutes from './routes/AuthRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import cookieParser from 'cookie-parser';
dotenv.config();
const port = process.env.PORT
const app = express();

app.use(express.json());
app.use(cookieParser());
app.use("/api/profile", profileRoutes);
app.use("/api/auth", AuthRoutes)
app.get("/", (req, res) => {
    res.json({ message: "welcome to backend" });
});
    // connecting to the database
connectDb();

app.listen(8000, () => {
    console.log("Server is running");  


})
