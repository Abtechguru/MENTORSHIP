import mongoose from "mongoose";

const authSchema = new mongoose.Schema({
    name: {type: String, required: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    availability: {
        type: String, 
        required: true, 
        enum: ["NOT-AVAILABLE", "AVAILABLE", "PENDING"],
        default: "AVAILABLE"
    },
    bio: {type: String, default: ""},
    topic: {type: String},
    profileImage: {type: String, default: ""}
}, {timestamps: true})

const MentorModel = mongoose.model.mentor || mongoose.model("mentor", authSchema);
export default MentorModel;