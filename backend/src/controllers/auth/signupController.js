const { validateSignUpData } = require("../../utils/signUpValidation");
const User = require("../../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// DRY: Common error response handler
const sendErrorResponse = (res, statusCode, message) => {
  return res.status(statusCode).json({
    success: false,
    error: message
  });
};

// DRY: Common success response handler
const sendSuccessResponse = (res, message, data = null) => {
  const response = {
    success: true,
    message: message
  };
  if (data) {
    response.data = data;
  }
  return res.json(response);
};

// Signup Controller
const signup = async (req, res) => {
  try {
    // validating the data
    validateSignUpData(req);
    const { firstName, lastName, emailId, password } = req.body;
    
    // Hash the password
    const saltRounds = process.env.PASSWORD_SALT_ROUNDS ? parseInt(process.env.PASSWORD_SALT_ROUNDS) : 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create user with hashed password
    const user = new User({ 
      firstName, 
      lastName, 
      emailId, 
      password: hashedPassword 
    });
    
    // Save user to database
    await user.save();
    
    // Check if JWT secrets are configured
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      console.error("JWT secrets not configured. Please set JWT_SECRET and JWT_REFRESH_SECRET in .env file");
      return sendErrorResponse(res, 500, "Server configuration error");
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, emailId: user.emailId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY }
    );
    
    // Generate refresh token
    const refreshToken = jwt.sign(
      { userId: user._id, emailId: user.emailId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_EXPIRY }
    );
    
    // Update user with refresh token
    user.refreshToken = refreshToken;
    await user.save();
    
    // Set JWT token as HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: process.env.COOKIE_EXPIRY
    });
    
    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: process.env.COOKIE_EXPIRY
    });
    
    // Log successful signup
    console.log(`New user registered: ${user.emailId} at ${new Date().toISOString()}`);
    
    // Return success response (without tokens in body for security)
    return sendSuccessResponse(res, "User registered successfully", {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        emailId: user.emailId
      }
    });
    
  } catch (error) {
    console.error("Signup error:", error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return sendErrorResponse(res, 400, errors.join(', '));
    }
    
    // Handle duplicate email error
    if (error.code === 11000) {
      return sendErrorResponse(res, 400, "Email already exists");
    }
    
    // Handle other errors
    return sendErrorResponse(res, 500, "Internal server error");
  }
};

module.exports = {
  signup
};
