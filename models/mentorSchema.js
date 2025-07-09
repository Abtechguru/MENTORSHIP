import mongoose from "mongoose";

const authSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    available: {
      type: String,
      required: true,
      enum: ["NOT-AVAILABLE", "AVAILABLE", "PENDING"],
      default: "AVAILABLE",
    },
    bio: { type: String, default: "" },
    topic: {
      type: String,
    },
    goal: {
      type: String,
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

const MentorModel =
  mongoose.models.Mentor || mongoose.model("Mentor", authSchema);

export default MentorModel;
