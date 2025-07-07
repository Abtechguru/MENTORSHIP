import AuthModel from "../models/authSchema.js";

// get user data
const getUserData = async (req, res) => {

    try {
        const {id} = req.params;

        const userData = await AuthModel.findById(id).select("-password");
        if (!userData) {
            return res.status(404).json({ message: "User not found" });
        } 
        return res.status(200).json({userData});
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server error" });
    }
}

const EditProfile = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: "User ID is required" });
        }    
        const { name, email, bio, skills, goal } = req.body;

        const user = await AuthModel.findByIdAndUpdate(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.name = name || user.name;
        user.email = email || user.email;
        user.bio = bio || user.bio;
        user.skills = skills || user.skills;
        user.goal = goal || user.goal;

        await user.save();

        return res.status(200).json({ message: "Profile updated successfully", user });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server error" });
    }
}

export { getUserData, EditProfile };
