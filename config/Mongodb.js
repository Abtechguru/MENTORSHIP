import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Database connection function
const connectDb = async () => {
  try {
    const url = `${process.env.MONGODB_URL}/AbtechBlosson2`;

    // Connect to MongoDB
    await mongoose.connect(url);

    console.log("✅ Database connected successfully");

    // Optional: handle runtime errors
    mongoose.connection.on("error", (error) => {
      console.error("❌ MongoDB connection error:", error);
    });
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
  }
};

export default connectDb;
