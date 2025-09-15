const { validateLoginData } = require("../../utils/loginValidation");
const User = require("../../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

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

// Login Controller
const login = async (req, res) => {
  try {
    // Validate input data
    validateLoginData(req);
    const { emailId, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ emailId: emailId.toLowerCase() });
    
    if (!user) {
      return sendErrorResponse(res, 401, "Invalid email or password");
    }
    
    // Check if account is locked
    if (user.isLocked && user.lockUntil > Date.now()) {
      const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / (1000 * 60));
      return sendErrorResponse(res, 423, `Account is locked. Try again in ${lockTimeRemaining} minutes.`);
    }
    
    // Check if user has a password (OAuth users might not have one)
    if (!user.password) {
      return sendErrorResponse(res, 401, "Please use OAuth login for this account");
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      // Use atomic operation to increment failed login attempts
      const session = await mongoose.startSession();
      session.startTransaction();
      
      try {
        // Atomic increment of failed attempts
        const updatedUser = await User.findByIdAndUpdate(
          user._id,
          { 
            $inc: { failedLoginAttempts: 1 },
            $set: user.failedLoginAttempts + 1 >= 5 ? {
              isLocked: true,
              lockUntil: Date.now() + (30 * 60 * 1000) // Lock for 30 minutes
            } : {}
          },
          { new: true, session }
        );
        
        await session.commitTransaction();
        
        if (updatedUser.failedLoginAttempts >= 5) {
          return sendErrorResponse(res, 423, "Account locked due to too many failed attempts. Try again in 30 minutes.");
        }
        
        return sendErrorResponse(res, 401, "Invalid email or password");
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    }
    
    // Reset failed login attempts on successful login using atomic operation
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      await User.findByIdAndUpdate(
        user._id,
        {
          $set: {
            failedLoginAttempts: 0,
            isLocked: false,
            lockUntil: undefined,
            lastLogin: new Date(),
            loginIP: req.ip || req.connection.remoteAddress
          }
        },
        { session }
      );
      
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
    
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
    
    // Log successful login
    console.log(`Successful login for user: ${user.emailId} at ${new Date().toISOString()}`);
    
    // Return success response (without tokens in body for security)
    return sendSuccessResponse(res, "Login successful", {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        emailId: user.emailId
      }
    });
    
  } catch (error) {
    console.error("Login error:", error);
    return sendErrorResponse(res, 500, "Internal server error");
  }
};

module.exports = {
  login
};
