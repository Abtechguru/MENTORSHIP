import express from 'express';
import cors from 'cors';
import dotenv from "dotenv";
import bodyParser from "body-parser"
import connectDb from './config/Mongodb.js';
import AuthRoutes from './routes/AuthRoutes.js';

dotenv.config();

const app = express();

app.use(express.json());
app.use("/api/auth", AuthRoutes)
// connecting to the database
connectDb();

app.listen(8000, () => {
    console.log("Server is running on port 8000");  


})
