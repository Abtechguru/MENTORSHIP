import bcrypt from "bcryptjs";
import MentorModel from "../models/mentorSchema.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const SALT_ROUNDS = 12;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// Validation helpers
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

const validateAvailability = (availability) => {
  const validStatuses = ['AVAILABLE', 'NOT-AVAILABLE', 'PENDING'];
  return validStatuses.includes(availability);
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

// Add mentor controller
const addMentor = async (req, res) => {
  try {
    const { name, email, availability, bio, topic, password, experience } = req.body;

    // Input validation
    if (!name?.trim() || !email?.trim() || !availability || !bio?.trim() || !topic?.trim() || !password || !experience?.trim()) {
      return sendErrorResponse(res, "All fields are required", 400);
    }

    if (!validateEmail(email)) {
      return sendErrorResponse(res, "Please provide a valid email address", 400);
    }

    if (!validatePassword(password)) {
      return sendErrorResponse(res, "Password must be at least 6 characters long", 400);
    }

    if (!validateAvailability(availability)) {
      return sendErrorResponse(res, "Invalid availability status", 400);
    }

    if (name.trim().length < 2) {
      return sendErrorResponse(res, "Name must be at least 2 characters long", 400);
    }

    if (bio.trim().length < 10) {
      return sendErrorResponse(res, "Bio must be at least 10 characters long", 400);
    }

    // Check if mentor already exists
    const existingMentor = await MentorModel.findOne({ email: email.toLowerCase().trim() });
    if (existingMentor) {
      return sendErrorResponse(res, "Mentor with this email already exists", 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create mentor
    const mentor = new MentorModel({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      availability,
      bio: bio.trim(),
      topic: topic.trim(),
      experience: experience.trim(),
      profileImage: ""
    });

    // Save mentor to database
    await mentor.save();

    // Return success response without sensitive data
    return sendSuccessResponse(
      res,
      "Mentor added successfully",
      {
        mentor: {
          id: mentor._id,
          name: mentor.name,
          email: mentor.email,
          availability: mentor.availability,
          bio: mentor.bio,
          topic: mentor.topic,
          experience: mentor.experience,
          profileImage: mentor.profileImage,
          createdAt: mentor.createdAt
        }
      },
      201
    );

  } catch (error) {
    console.error("Add mentor error:", error);

    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return sendErrorResponse(res, "Validation failed", 400, errors);
    }

    if (error.code === 11000) {
      return sendErrorResponse(res, "Mentor with this email already exists", 409);
    }

    return sendErrorResponse(res, "Internal server error while adding mentor");
  }
};

// Upload mentor image controller
const uploadMentorImage = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return sendErrorResponse(res, "Invalid mentor ID format", 400);
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

    const mentor = await MentorModel.findById(id);
    if (!mentor) {
      // Delete uploaded file if mentor not found
      fs.unlinkSync(req.file.path);
      return sendErrorResponse(res, "Mentor not found", 404);
    }

    // Delete old profile image if it exists
    if (mentor.profileImage && mentor.profileImage !== "") {
      const oldImagePath = path.join(__dirname, '../uploads/', mentor.profileImage);
      if (fs.existsSync(oldImagePath)) {
        try {
          fs.unlinkSync(oldImagePath);
        } catch (unlinkError) {
          console.warn("Could not delete old profile image:", unlinkError);
        }
      }
    }

    // Update mentor with new image path
    mentor.profileImage = req.file.filename;
    await mentor.save();

    return sendSuccessResponse(
      res,
      "Mentor profile image uploaded successfully",
      {
        profileImage: req.file.filename,
        mentor: {
          id: mentor._id,
          name: mentor.name,
          profileImage: mentor.profileImage
        }
      }
    );

  } catch (error) {
    console.error("Upload mentor image error:", error);

    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    if (error.name === 'CastError') {
      return sendErrorResponse(res, "Invalid mentor ID format", 400);
    }

    return sendErrorResponse(res, "Internal server error while uploading mentor image");
  }
};

// Delete mentor image controller
const deleteMentorImage = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return sendErrorResponse(res, "Invalid mentor ID format", 400);
    }

    const mentor = await MentorModel.findById(id);
    if (!mentor) {
      return sendErrorResponse(res, "Mentor not found", 404);
    }

    // Check if mentor has a profile image
    if (!mentor.profileImage || mentor.profileImage === "") {
      return sendErrorResponse(res, "Mentor does not have a profile image", 400);
    }

    // Delete image file if it exists
    const imagePath = path.join(__dirname, '../uploads/', mentor.profileImage);
    if (fs.existsSync(imagePath)) {
      try {
        fs.unlinkSync(imagePath);
      } catch (unlinkError) {
        console.warn("Could not delete profile image file:", unlinkError);
        // Continue with removing the reference even if file deletion fails
      }
    }

    // Remove image reference from mentor
    mentor.profileImage = "";
    await mentor.save();

    return sendSuccessResponse(res, "Mentor profile image deleted successfully");

  } catch (error) {
    console.error("Delete mentor image error:", error);

    if (error.name === 'CastError') {
      return sendErrorResponse(res, "Invalid mentor ID format", 400);
    }

    return sendErrorResponse(res, "Internal server error while deleting mentor image");
  }
};

// Get all mentors controller
const getMentors = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      availability,
      topic,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (availability && validateAvailability(availability)) {
      filter.availability = availability;
    }
    
    if (topic?.trim()) {
      filter.topic = { $regex: topic.trim(), $options: 'i' }; // Case-insensitive search
    }

    // Parse pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Validate sort parameters
    const validSortFields = ['name', 'availability', 'topic', 'experience', 'createdAt', 'updatedAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const mentors = await MentorModel.find(filter)
      .select('-password -__v')
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count for pagination
    const totalMentors = await MentorModel.countDocuments(filter);
    const totalPages = Math.ceil(totalMentors / limitNum);

    return sendSuccessResponse(
      res,
      "Mentors retrieved successfully",
      {
        mentors,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalMentors,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }
    );

  } catch (error) {
    console.error("Get mentors error:", error);
    return sendErrorResponse(res, "Internal server error while retrieving mentors");
  }
};

// Get mentor by ID controller
const getMentorById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return sendErrorResponse(res, "Invalid mentor ID format", 400);
    }

    const mentor = await MentorModel.findById(id).select('-password -__v');

    if (!mentor) {
      return sendErrorResponse(res, "Mentor not found", 404);
    }

    return sendSuccessResponse(
      res,
      "Mentor retrieved successfully",
      { mentor }
    );

  } catch (error) {
    console.error("Get mentor by ID error:", error);

    if (error.name === 'CastError') {
      return sendErrorResponse(res, "Invalid mentor ID format", 400);
    }

    return sendErrorResponse(res, "Internal server error while retrieving mentor");
  }
};

// Delete mentor controller
const deleteMentor = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return sendErrorResponse(res, "Invalid mentor ID format", 400);
    }

    const mentor = await MentorModel.findById(id);

    if (!mentor) {
      return sendErrorResponse(res, "Mentor not found", 404);
    }

    // Delete profile image if it exists
    if (mentor.profileImage && mentor.profileImage !== "") {
      const imagePath = path.join(__dirname, '../uploads/', mentor.profileImage);
      if (fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
        } catch (unlinkError) {
          console.warn("Could not delete mentor profile image during deletion:", unlinkError);
        }
      }
    }

    // Delete mentor from database
    await MentorModel.findByIdAndDelete(id);

    return sendSuccessResponse(res, "Mentor deleted successfully");

  } catch (error) {
    console.error("Delete mentor error:", error);

    if (error.name === 'CastError') {
      return sendErrorResponse(res, "Invalid mentor ID format", 400);
    }

    return sendErrorResponse(res, "Internal server error while deleting mentor");
  }
};

// Update mentor controller
const updateMentor = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, availability, bio, topic, experience } = req.body;

    // Validate ID format
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return sendErrorResponse(res, "Invalid mentor ID format", 400);
    }

    // Input validation
    const updates = {};
    if (name?.trim()) {
      if (name.trim().length < 2) {
        return sendErrorResponse(res, "Name must be at least 2 characters long", 400);
      }
      updates.name = name.trim();
    }

    if (email?.trim()) {
      if (!validateEmail(email)) {
        return sendErrorResponse(res, "Please provide a valid email address", 400);
      }
      updates.email = email.toLowerCase().trim();
    }

    if (availability) {
      if (!validateAvailability(availability)) {
        return sendErrorResponse(res, "Invalid availability status", 400);
      }
      updates.availability = availability;
    }

    if (bio?.trim()) {
      if (bio.trim().length < 10) {
        return sendErrorResponse(res, "Bio must be at least 10 characters long", 400);
      }
      updates.bio = bio.trim();
    }

    if (topic?.trim()) {
      updates.topic = topic.trim();
    }

    if (experience?.trim()) {
      updates.experience = experience.trim();
    }

    if (Object.keys(updates).length === 0) {
      return sendErrorResponse(res, "No valid fields to update", 400);
    }

    // Check if email is already taken by another mentor
    if (updates.email) {
      const existingMentor = await MentorModel.findOne({
        email: updates.email,
        _id: { $ne: id }
      });
      if (existingMentor) {
        return sendErrorResponse(res, "Email is already taken by another mentor", 409);
      }
    }

    const updatedMentor = await MentorModel.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).select('-password -__v');

    if (!updatedMentor) {
      return sendErrorResponse(res, "Mentor not found", 404);
    }

    return sendSuccessResponse(
      res,
      "Mentor updated successfully",
      { mentor: updatedMentor }
    );

  } catch (error) {
    console.error("Update mentor error:", error);

    if (error.name === 'CastError') {
      return sendErrorResponse(res, "Invalid mentor ID format", 400);
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return sendErrorResponse(res, "Validation failed", 400, errors);
    }

    if (error.code === 11000) {
      return sendErrorResponse(res, "Email is already taken by another mentor", 409);
    }

    return sendErrorResponse(res, "Internal server error while updating mentor");
  }
};

// Book session controller (placeholder for future implementation)
const bookSession = async (req, res) => {
  try {
    // TODO: Implement session booking logic
    return sendErrorResponse(res, "Session booking feature is under development", 501);
  } catch (error) {
    console.error("Book session error:", error);
    return sendErrorResponse(res, "Internal server error while booking session");
  }
};

export {
  addMentor,
  bookSession,
  getMentors,
  uploadMentorImage,
  deleteMentorImage,
  getMentorById,
  deleteMentor,
  updateMentor
};
