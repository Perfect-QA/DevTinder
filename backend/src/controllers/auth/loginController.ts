import { validateLoginData } from "../../utils/loginValidation";
import User from "../../models/user";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Request, Response } from 'express';

// DRY: Common error response handler
const sendErrorResponse = (res: Response, statusCode: number, message: string): Response => {
  return res.status(statusCode).json({
    success: false,
    error: message
  });
};

// DRY: Common success response handler
const sendSuccessResponse = (res: Response, message: string, data: any = null): Response => {
  const response: any = {
    success: true,
    message: message
  };
  if (data) {
    response.data = data;
  }
  return res.json(response);
};

// Login Controller
const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input data
    validateLoginData(req);
    const { emailId, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ emailId });
    if (!user) {
      sendErrorResponse(res, 401, "Invalid email or password");
      return;
    }
    
    // Check if account is locked
    if (user.isAccountLocked()) {
      const lockTimeRemaining = user.getLockTimeRemaining();
      sendErrorResponse(res, 423, `Account is locked due to too many failed attempts. Try again in ${lockTimeRemaining} minutes.`);
      return;
    }
    
    // If lock has expired, reset the lock
    if (user.isLocked && user.lockUntil && user.lockUntil <= new Date()) {
      user.isLocked = false;
      user.lockUntil = undefined;
      user.failedLoginAttempts = 0;
      await user.save();
    }
    
    // Validate password
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      // Increment failed login attempts
      user.failedLoginAttempts += 1;
      
      // Lock account after 5 failed attempts
      if (user.failedLoginAttempts >= 5) {
        user.isLocked = true;
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
        console.log(`Account locked for user: ${user.emailId} due to ${user.failedLoginAttempts} failed attempts`);
      }
      
      await user.save();
      sendErrorResponse(res, 401, "Invalid email or password");
      return;
    }
    
    // Reset failed login attempts on successful login
    user.failedLoginAttempts = 0;
    user.isLocked = false;
    user.lockUntil = undefined;
    
    // Update login tracking information
    user.loginCount += 1;
    user.lastLogin = new Date();
    user.loginIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    // Save updated user information
    await user.save();
    
    // Generate JWT token
    const token = user.getJWT();
    
    // Set JWT token as HTTP-only cookie using COOKIE_EXPIRY from environment
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: parseInt(process.env.COOKIE_EXPIRY!)
    });
    
    // Log successful login
    console.log(`User logged in: ${user.emailId} at ${new Date().toISOString()}`);
    
    // Return success response
    sendSuccessResponse(res, "Login successful", {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        emailId: user.emailId,
        age: user.age,
        gender: user.gender,
        photoUrl: user.photoUrl,
        about: user.about,
        provider: user.provider,
        isEmailVerified: user.isEmailVerified,
        loginCount: user.loginCount,
        lastLogin: user.lastLogin,
        loginIP: user.loginIP,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
    
  } catch (error: any) {
    console.error("Login error:", error);
    sendErrorResponse(res, 500, "Internal server error");
  }
};

export {
  login
};
