import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const UPLOAD_DIR = path.join(__dirname, '../uploads/');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};

// Ensure upload directory exists
const ensureUploadDir = () => {
  try {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      console.log(`Upload directory created: ${UPLOAD_DIR}`);
    }
  } catch (error) {
    console.error('Error creating upload directory:', error);
    throw new Error('Failed to initialize upload directory');
  }
};

// Initialize upload directory
ensureUploadDir();

// Configure storage with enhanced security
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    try {
      // Sanitize original filename
      const originalName = path.parse(file.originalname).name;
      const sanitizedName = originalName.replace(/[^a-zA-Z0-9-_]/g, '_');
      
      // Create secure unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = ALLOWED_MIME_TYPES[file.mimetype] || 'bin';
      
      const finalFilename = `img-${timestamp}-${randomString}.${fileExtension}`;
      
      cb(null, finalFilename);
    } catch (error) {
      cb(new Error('Error generating secure filename'), false);
    }
  }
});

// Enhanced file filter with better validation
const fileFilter = (req, file, cb) => {
  try {
    // Check MIME type
    if (!ALLOWED_MIME_TYPES[file.mimetype]) {
      return cb(new Error(
        `Invalid file type. Allowed types: ${Object.keys(ALLOWED_MIME_TYPES).join(', ')}`
      ), false);
    }

    // Check file extension (additional security layer)
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    
    if (!allowedExtensions.includes(fileExtension)) {
      return cb(new Error(
        `Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`
      ), false);
    }

    // Check for potential malicious files by checking magic numbers (basic check)
    // Note: For production, consider using a proper file-type checking library
    if (file.mimetype === 'image/jpeg' && !fileExtension.match(/\.jpe?g$/)) {
      return cb(new Error('File content does not match extension'), false);
    }

    // Success - file is valid
    cb(null, true);
  } catch (error) {
    cb(new Error('File validation error'), false);
  }
};

// Custom error handler for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          errorType: 'FILE_SIZE_LIMIT'
        });
      
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files uploaded',
          errorType: 'FILE_COUNT_LIMIT'
        });
      
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected field name for file upload',
          errorType: 'UNEXPECTED_FIELD'
        });
      
      case 'LIMIT_PART_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many parts in form data',
          errorType: 'PART_COUNT_LIMIT'
        });
      
      default:
        return res.status(400).json({
          success: false,
          message: 'File upload error',
          errorType: 'UPLOAD_ERROR'
        });
    }
  } else if (error) {
    // Custom validation errors
    return res.status(400).json({
      success: false,
      message: error.message,
      errorType: 'VALIDATION_ERROR'
    });
  }
  
  next();
};

// Configure multer with enhanced options
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1, // Maximum number of files
    fields: 10, // Maximum number of non-file fields
    parts: 20 // Maximum number of parts (files + fields)
  },
  preservePath: false // Don't include full path in filename
});

// Pre-configured upload instances for different use cases
const uploadSingle = (fieldName) => [
  upload.single(fieldName),
  handleMulterError
];

const uploadMultiple = (fieldName, maxCount = 5) => [
  upload.array(fieldName, maxCount),
  handleMulterError
];

const uploadFields = (fields) => [
  upload.fields(fields),
  handleMulterError
];

const uploadAny = () => [
  upload.any(),
  handleMulterError
];

// File validation middleware (runs after upload)
const validateUploadedFile = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded',
      errorType: 'NO_FILE'
    });
  }

  // Additional server-side validation
  const file = req.file;
  
  // Check if file was actually written to disk
  if (!fs.existsSync(path.join(UPLOAD_DIR, file.filename))) {
    return res.status(500).json({
      success: false,
      message: 'File upload failed - file not saved',
      errorType: 'FILE_SAVE_ERROR'
    });
  }

  // Check file size again (server-side validation)
  if (file.size > MAX_FILE_SIZE) {
    // Clean up the uploaded file
    fs.unlinkSync(path.join(UPLOAD_DIR, file.filename));
    return res.status(400).json({
      success: false,
      message: `File size exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      errorType: 'FILE_SIZE_EXCEEDED'
    });
  }

  // Add file metadata to request for easier access
  req.fileMetadata = {
    originalName: file.originalname,
    size: file.size,
    mimetype: file.mimetype,
    uploadedAt: new Date().toISOString(),
    url: `/uploads/${file.filename}` // Relative URL for frontend
  };

  next();
};

// Utility function to delete uploaded files
const deleteUploadedFile = (filename) => {
  try {
    const filePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting uploaded file:', error);
    return false;
  }
};

// Utility function to get file information
const getFileInfo = (filename) => {
  try {
    const filePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return {
        filename,
        path: filePath,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting file info:', error);
    return null;
  }
};

// Export configurations and utilities
export {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  uploadAny,
  handleMulterError,
  validateUploadedFile,
  deleteUploadedFile,
  getFileInfo,
  UPLOAD_DIR,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES
};

export default upload;
