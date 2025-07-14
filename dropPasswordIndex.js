import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const dropPasswordIndex = async () => {
    try {
        const url = `${process.env.MONGODB_URL}/MentorProject`;
        await mongoose.connect(url);
        console.log("Connected to MongoDB");

        // Get the mentors collection
        const db = mongoose.connection.db;
        const mentorsCollection = db.collection('mentors');

        // Drop the unique index on password field
        await mentorsCollection.dropIndex('password_1');
        console.log("Successfully dropped password_1 index");

        // List remaining indexes to verify
        const indexes = await mentorsCollection.indexes();
        console.log("Remaining indexes:", indexes);

        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
    } catch (error) {
        console.error("Error dropping index:", error);
        await mongoose.disconnect();
    }
};

dropPasswordIndex(); 