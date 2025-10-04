import AuthModel from "../models/authSchema.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// Validation helpers
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateSkills = (skills) => {
  if (!Array.isArray(skills)) return false;
  return skills.every(skill => typeof skill === 'string' && skill.trim().length > 0);
};

const validateGoal = (goal) => {
  return goal && typeof goal === 'string' && goal.trim().length >= 5;
};

const validateBio = (bio) => {
  return bio && typeof bio === 'string' && bio.trim().length >= 10;
};

// Response helpers
const sendSuccessResponse = (res, message, data = null, statusCode = 200) => {
  const response = { success: true, message };
  if (data) response.data = data;
  return res.status(statusCode).json(response);
};

const sendErrorResponse = (res, message, statusCode = 500, errors = null) => {
  const response = { success: false, message };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

// Get user data controller
const getUserData = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return sendErrorResponse(res, "Invalid user ID format", 400);
    }

    const userData = await AuthModel.findById(id).select("-password -__v");

    if (!userData) {
      return sendErrorResponse(res, "User not found", 404);
    }

    // Return safe user data
    const safeUserData = {
      id: userData._id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      profileImage: userData.profileImage,
      bio: userData.bio || "",
      skills: userData.skills || [],
      goal: userData.goal || "",
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
      lastLoginAt: userData.lastLoginAt
    };

    return sendSuccessResponse(
      res,
      "User data retrieved successfully",
      { user: safeUserData }
    );

  } catch (error) {
    console.error("Get user data error:", error);

    if (error.name === 'CastError') {
      return sendErrorResponse(res, "Invalid user ID format", 400);
    }

    return sendErrorResponse(res, "Internal server error while retrieving user data");
  }
};

// Edit profile controller
const editProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, bio, skills, goal } = req.body;

    // Validate ID format
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return sendErrorResponse(res, "Invalid user ID format", 400);
    }

    // Input validation and sanitization
    const updates = {};
    const validationErrors = [];

    if (name?.trim()) {
      if (name.trim().length < 2) {
        validationErrors.push("Name must be at least 2 characters long");
      } else {
        updates.name = name.trim();
      }
    }

    if (email?.trim()) {
      if (!validateEmail(email)) {
        validationErrors.push("Please provide a valid email address");
      } else {
        updates.email = email.toLowerCase().trim();
      }
    }

    if (bio?.trim()) {
      if (!validateBio(bio)) {
        validationErrors.push("Bio must be at least 10 characters long");
      } else {
        updates.bio = bio.trim();
      }
    }

    if (skills !== undefined) {
      if (!validateSkills(skills)) {
        validationErrors.push("Skills must be an array of non-empty strings");
      } else {
        updates.skills = skills.map(skill => skill.trim()).filter(skill => skill.length > 0);
      }
    }

    if (goal?.trim()) {
      if (!validateGoal(goal)) {
        validationErrors.push("Goal must be at least 5 characters long");
      } else {
        updates.goal = goal.trim();
      }
    }

    // Return validation errors if any
    if (validationErrors.length > 0) {
      return sendErrorResponse(res, "Validation failed", 400, validationErrors);
    }

    // Check if no valid updates provided
    if (Object.keys(updates).length === 0) {
      return sendErrorResponse(res, "No valid fields to update", 400);
    }

    // Check if email is already taken by another user
    if (updates.email) {
      const existingUser = await AuthModel.findOne({
        email: updates.email,
        _id: { $ne: id }
      });
      if (existingUser) {
        return sendErrorResponse(res, "Email is already taken by another user", 409);
      }
    }

    // Update user profile
    const updatedUser = await AuthModel.findByIdAndUpdate(
      id,
      updates,
      { 
        new: true, 
        runValidators: true 
      }
    ).select("-password -__v");

    if (!updatedUser) {
      return sendErrorResponse(res, "User not found", 404);
    }

    // Return updated user data
    const safeUserData = {
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      profileImage: updatedUser.profileImage,
      bio: updatedUser.bio,
      skills: updatedUser.skills,
      goal: updatedUser.goal,
      updatedAt: updatedUser.updatedAt
    };

    return sendSuccessResponse(
      res,
      "Profile updated successfully",
      { user: safeUserData }
    );

  } catch (error) {
    console.error("Edit profile error:", error);

    // Handle specific MongoDB errors
    if (error.name === 'CastError') {
      return sendErrorResponse(res, "Invalid user ID format", 400);
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return sendErrorResponse(res, "Validation failed", 400, errors);
    }

    if (error.code === 11000) {
      return sendErrorResponse(res, "Email is already taken by another user", 409);
    }

    return sendErrorResponse(res, "Internal server error while updating profile");
  }
};

// Upload profile image controller
const uploadProfileImage = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return sendErrorResponse(res, "Invalid user ID format", 400);
    }

    if (!req.file) {
      return sendErrorResponse(res, "No image file provided", 400);
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(req.file.mimetype)) {
      // Delete uploaded file if invalid type
      fs.unlinkSync(req.file.path);
      return sendErrorResponse(res, "Invalid file type. Only JPEG, JPG, PNG, and WebP images are allowed", 400);
    }

    // Validate file size
    if (req.file.size > MAX_IMAGE_SIZE) {
      fs.unlinkSync(req.file.path);
      return sendErrorResponse(res, "Image size too large. Maximum size is 5MB", 400);
    }

    const user = await AuthModel.findById(id);
    if (!user) {
      // Delete uploaded file if user not found
      fs.unlinkSync(req.file.path);
      return sendErrorResponse(res, "User not found", 404);
    }

    // Delete old profile image if it exists
    if (user.profileImage && user.profileImage !== "") {
      const oldImagePath = path.join(__dirname, '../uploads/', user.profileImage);
      if (fs.existsSync(oldImagePath)) {
        try {
          fs.unlinkSync(oldImagePath);
        } catch (unlinkError) {
          console.warn("Could not delete old profile image:", unlinkError);
          // Continue with update even if old image deletion fails
        }
      }
    }

    // Update user with new image path
    user.profileImage = req.file.filename;
    await user.save();

    return sendSuccessResponse(
      res,
      "Profile image uploaded successfully",
      {
        profileImage: req.file.filename,
        user: {
          id: user._id,
          name: user.name,
          profileImage: user.profileImage
        }
      }
    );

  } catch (error) {
    console.error("Upload profile image error:", error);

    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    if (error.name === 'CastError') {
      return sendErrorResponse(res, "Invalid user ID format", 400);
    }

    return sendErrorResponse(res, "Internal server error while uploading profile image");
  }
};

// Delete profile image controller
const deleteProfileImage = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return sendErrorResponse(res, "Invalid user ID format", 400);
    }

    const user = await AuthModel.findById(id);
    if (!user) {
      return sendErrorResponse(res, "User not found", 404);
    }

    // Check if user has a profile image
    if (!user.profileImage || user.profileImage === "") {
      return sendErrorResponse(res, "User does not have a profile image", 400);
    }

    // Delete image file if it exists
    const imagePath = path.join(__dirname, '../uploads/', user.profileImage);
    if (fs.existsSync(imagePath)) {
      try {
        fs.unlinkSync(imagePath);
      } catch (unlinkError) {
        console.warn("Could not delete profile image file:", unlinkError);
        // Continue with removing the reference even if file deletion fails
      }
    }

    // Remove image reference from user
    user.profileImage = "";
    await user.save();

    return sendSuccessResponse(res, "Profile image deleted successfully");

  } catch (error) {
    console.error("Delete profile image error:", error);

    if (error.name === 'CastError') {
      return sendErrorResponse(res, "Invalid user ID format", 400);
    }

    return sendErrorResponse(res, "Internal server error while deleting profile image");
  }
};

// Get user profile by ID (public profile)
const getPublicProfile = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return sendErrorResponse(res, "Invalid user ID format", 400);
    }

    const userData = await AuthModel.findById(id).select("-password -__v -email");

    if (!userData) {
      return sendErrorResponse(res, "User not found", 404);
    }

    // Return public profile data only
    const publicProfile = {
      id: userData._id,
      name: userData.name,
      role: userData.role,
      profileImage: userData.profileImage,
      bio: userData.bio || "",
      skills: userData.skills || [],
      goal: userData.goal || "",
      createdAt: userData.createdAt
    };

    return sendSuccessResponse(
      res,
      "Public profile retrieved successfully",
      { user: publicProfile }
    );

  } catch (error) {
    console.error("Get public profile error:", error);

    if (error.name === 'CastError') {
      return sendErrorResponse(res, "Invalid user ID format", 400);
    }

    return sendErrorResponse(res, "Internal server error while retrieving public profile");
  }
};

// Update user skills (dedicated endpoint)
const updateSkills = async (req, res) => {
  try {
    const { id } = req.params;
    const { skills } = req.body;

    // Validate ID format
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return sendErrorResponse(res, "Invalid user ID format", 400);
    }

    if (!validateSkills(skills)) {
      return sendErrorResponse(res, "Skills must be an array of non-empty strings", 400);
    }

    const user = await AuthModel.findByIdAndUpdate(
      id,
      { 
        skills: skills.map(skill => skill.trim()).filter(skill => skill.length > 0)
      },
      { new: true }
    ).select("-password -__v");

    if (!user) {
      return sendErrorResponse(res, "User not found", 404);
    }

    return sendSuccessResponse(
      res,
      "Skills updated successfully",
      { skills: user.skills }
    );

  } catch (error) {
    console.error("Update skills error:", error);

    if (error.name === 'CastError') {
      return sendErrorResponse(res, "Invalid user ID format", 400);
    }

    return sendErrorResponse(res, "Internal server error while updating skills");
  }
};

export { 
  getUserData, 
  editProfile, 
  uploadProfileImage, 
  deleteProfileImage,
  getPublicProfile,
  updateSkills
};
