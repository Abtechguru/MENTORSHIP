import express from "express";
import { getMentors, addMentor, bookSession } from "../controller/mentorcontroller.js";

const mentorRouter = express.Router();

// Mentor management routes
mentorRouter.post("/", addMentor);  
mentorRouter.get("/", getMentors);   

// Session booking route
mentorRouter.post("/:mentorId/sessions", bookSession);

export default mentorRouter;