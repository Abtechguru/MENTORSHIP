import AuthModel from "../models/authSchema.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// Constants
const SALT_ROUNDS = 12; // Increased for better security
const TOKEN_EXPIRY = "3d";
const COOKIE_EXPIRY = 3 * 24 * 60 * 60 * 1000; // 3 days
const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  MENTOR: 'mentor'
};

// Validation helpers
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

const validateRole = (role) => {
  return Object.values(ROLES).includes(role);
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

// User registration controller
const register = async (req, res) => {
  try {
    const { name, email, password, role = ROLES.USER } = req.body;

    // Input validation
    if (!name?.trim() || !email?.trim() || !password || !role) {
      return sendErrorResponse(res, "All fields are required", 400);
    }

    if (!validateEmail(email)) {
      return sendErrorResponse(res, "Please provide a valid email address", 400);
    }

    if (!validatePassword(password)) {
      return sendErrorResponse(res, "Password must be at least 6 characters long", 400);
    }

    if (!validateRole(role)) {
      return sendErrorResponse(res, "Invalid role specified", 400);
    }

    if (name.trim().length < 2) {
      return sendErrorResponse(res, "Name must be at least 2 characters long", 400);
    }

    // Check if user already exists
    const existingUser = await AuthModel.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return sendErrorResponse(res, "User already exists with this email", 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = new AuthModel({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role
    });

    // Save user to database
    await user.save();

    // Generate token
    const token = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        role: user.role 
      }, 
      process.env.JWT_SECRET_KEY, 
      { 
        expiresIn: TOKEN_EXPIRY,
        issuer: 'abtech-beacon',
        subject: user._id.toString()
      }
    );

    // Set HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: COOKIE_EXPIRY,
      path: "/"
    });

    // Return success response without sensitive data
    return sendSuccessResponse(
      res, 
      "User registered successfully", 
      { 
        user: { 
          id: user._id, 
          name: user.name, 
          email: user.email, 
          role: user.role,
          createdAt: user.createdAt
        } 
      }, 
      201
    );

  } catch (error) {
    console.error("Registration error:", error);

    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return sendErrorResponse(res, "Validation failed", 400, errors);
    }

    if (error.code === 11000) {
      return sendErrorResponse(res, "User with this email already exists", 409);
    }

    return sendErrorResponse(res, "Internal server error during registration");
  }
};

// User login controller
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email?.trim() || !password) {
      return sendErrorResponse(res, "Email and password are required", 400);
    }

    if (!validateEmail(email)) {
      return sendErrorResponse(res, "Please provide a valid email address", 400);
    }

    // Find user (case-insensitive email search)
    const user = await AuthModel.findOne({ 
      email: email.toLowerCase().trim() 
    });

    if (!user) {
      // Use generic message for security
      return sendErrorResponse(res, "Invalid email or password", 401);
    }

    // Check if account is active (if you add status field later)
    if (user.status === 'suspended') {
      return sendErrorResponse(res, "Account has been suspended. Please contact support.", 403);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return sendErrorResponse(res, "Invalid email or password", 401);
    }

    // Update last login timestamp (if you add this field)
    user.lastLoginAt = new Date();
    await user.save();

    // Generate token with additional claims
    const token = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        role: user.role 
      }, 
      process.env.JWT_SECRET_KEY, 
      { 
        expiresIn: TOKEN_EXPIRY,
        issuer: 'abtech-beacon',
        subject: user._id.toString()
      }
    );

    // Set HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: COOKIE_EXPIRY,
      path: "/"
    });

    // Return success response
    return sendSuccessResponse(
      res, 
      "Login successful", 
      { 
        user: { 
          id: user._id, 
          name: user.name, 
          email: user.email, 
          role: user.role,
          lastLoginAt: user.lastLoginAt
        } 
      }
    );

  } catch (error) {
    console.error("Login error:", error);
    return sendErrorResponse(res, "Internal server error during login");
  }
};

// User logout controller
const logout = async (req, res) => {
  try {
    // Clear the token cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/"
    });

    return sendSuccessResponse(res, "Logout successful");

  } catch (error) {
    console.error("Logout error:", error);
    return sendErrorResponse(res, "Internal server error during logout");
  }
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

    // Return user data (exclude sensitive information)
    const safeUserData = {
      id: userData._id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
      lastLoginAt: userData.lastLoginAt,
      // Add any other non-sensitive fields here
    };

    return sendSuccessResponse(res, "User data retrieved successfully", { user: safeUserData });

  } catch (error) {
    console.error("Get user data error:", error);
    
    if (error.name === 'CastError') {
      return sendErrorResponse(res, "Invalid user ID format", 400);
    }

    return sendErrorResponse(res, "Internal server error while retrieving user data");
  }
};

// Additional utility controller - Get current user profile
const getCurrentUser = async (req, res) => {
  try {
    // This assumes you have middleware that attaches user to req
    if (!req.user) {
      return sendErrorResponse(res, "User not authenticated", 401);
    }

    const userData = await AuthModel.findById(req.user.id).select("-password -__v");

    if (!userData) {
      return sendErrorResponse(res, "User not found", 404);
    }

    const safeUserData = {
      id: userData._id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
      lastLoginAt: userData.lastLoginAt,
    };

    return sendSuccessResponse(res, "User profile retrieved successfully", { user: safeUserData });

  } catch (error) {
    console.error("Get current user error:", error);
    return sendErrorResponse(res, "Internal server error while retrieving user profile");
  }
};

// Additional utility controller - Update user profile
const updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    // Validate permissions (user can only update their own profile unless admin)
    if (req.user.id !== id && req.user.role !== ROLES.ADMIN) {
      return sendErrorResponse(res, "Unauthorized to update this profile", 403);
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
        return sendErrorResponse(res, "Email is already taken", 409);
      }
    }

    const updatedUser = await AuthModel.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).select("-password -__v");

    if (!updatedUser) {
      return sendErrorResponse(res, "User not found", 404);
    }

    return sendSuccessResponse(res, "Profile updated successfully", { user: updatedUser });

  } catch (error) {
    console.error("Update profile error:", error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return sendErrorResponse(res, "Validation failed", 400, errors);
    }

    if (error.code === 11000) {
      return sendErrorResponse(res, "Email is already taken", 409);
    }

    return sendErrorResponse(res, "Internal server error while updating profile");
  }
};

export { 
  register, 
  login, 
  logout, 
  getUserData, 
  getCurrentUser, 
  updateProfile,
  ROLES 
};
