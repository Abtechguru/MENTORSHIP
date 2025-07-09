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
    role: {
      type: String,
      required: true,
      enum: ["admin", "mentor", "mentee"],
      default: "mentee" // Changed from "user" to match enum values
    },
    bio: {
      type: String,
      default: ""
    },
    skills: {
      type: [String], // Changed to array of strings
      default: []
    },
    goal: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        delete ret.password; // Automatically remove password when converted to JSON
        return ret;
      }
    }
  }
);

// Check if model already exists to prevent OverwriteModelError
const AuthModel = mongoose.models.Auth || mongoose.model("Auth", authSchema);

export default AuthModel;