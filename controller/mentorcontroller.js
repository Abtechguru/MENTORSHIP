import bcrypt from 'bcrypt';
import validator from 'validator';
import MentorModel from '../models/mentorSchema.js';

const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '10');
const MIN_PASSWORD_LENGTH = 8;

// Password validation
const validatePassword = (password) => {
  const regex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
  return regex.test(password);
};

export const addMentor = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      availibility = [], 
      bio = '', 
      topic = '', 
      password 
    } = req.body;

    // Input validation
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Name, email and password are required" 
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid email format" 
      });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ 
        success: false,
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must contain uppercase, lowercase, and numbers"
      });
    }

    // Check for existing mentor
    const existingMentor = await MentorModel.findOne({ email });
    if (existingMentor) {
      return res.status(409).json({ 
        success: false,
        message: "Email already registered" 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Create and save mentor
    const mentor = new MentorModel({
      name,
      email,
      availibility,
      bio,
      topic,
      password: hashedPassword
    });
    
    await mentor.save();
    
    // Remove password from response
    const mentorResponse = mentor.toObject();
    delete mentorResponse.password;
    
    return res.status(201).json({ 
      success: true,
      message: "Mentor added successfully",
      data: mentorResponse
    });
  } catch (error) {
    console.error("[MENTOR CONTROLLER ERROR]:", error);
    return res.status(500).json({ 
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

export const bookSession = async (req, res) => {
  try {
    return res.status(200).json({ 
      success: true,
      message: "Session booked successfully",
      data: req.body 
    });
  } catch (error) {
    console.error("[SESSION ERROR]:", error);
    return res.status(500).json({ 
      success: false,
      message: "Failed to book session",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

export const getMentors = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const mentors = await MentorModel.find()
      .select('-password')
      .skip(skip)
      .limit(limit);

    const total = await MentorModel.countDocuments();

    return res.status(200).json({
      success: true,
      message: "Mentors retrieved successfully",
      data: {
        mentors,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit
        }
      }
    });
  } catch (error) {
    console.error("[GET MENTORS ERROR]:", error);
    return res.status(500).json({ 
      success: false,
      message: "Failed to fetch mentors",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};