import { validateSignUpData } from "../../utils/signUpValidation";
import { validatePassword, getPasswordStrength } from "../../utils/passwordValidation";
import User, { IUser } from "../../models/user";
import bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
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

// Signup Controller
const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    // validating the data
    validateSignUpData(req);
    const { firstName, lastName, emailId, password } = req.body;
    
    // Validate password strength with modern requirements
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      sendErrorResponse(res, 400, `Password requirements not met: ${passwordValidation.errors.join(', ')}`);
      return;
    }
    
    // Log password strength for security monitoring
    const passwordStrength = getPasswordStrength(passwordValidation.score);
    console.log(`Password strength for ${emailId}: ${passwordStrength} (${passwordValidation.score}/100)`);
    
    // Hash the password
    const saltRounds = process.env.PASSWORD_SALT_ROUNDS ? parseInt(process.env.PASSWORD_SALT_ROUNDS) : 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create user with hashed password and initialize tracking fields
    const user = new User({ 
      firstName, 
      lastName, 
      emailId, 
      password: hashedPassword,
      // Initialize login tracking fields
      failedLoginAttempts: 0,
      isLocked: false,
      loginCount: 0,
      provider: 'local',
      isEmailVerified: false,
      twoFactorEnabled: false
    });
    
    // Save user to database
    await user.save();
    
    // Check if JWT secrets are configured
    const jwtSecret = process.env.JWT_SECRET;
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    
    if (!jwtSecret || !jwtRefreshSecret) {
      console.error("JWT secrets not configured. Please set JWT_SECRET and JWT_REFRESH_SECRET in .env file");
      sendErrorResponse(res, 500, "Server configuration error");
      return;
    }
    
    // Generate JWT token using JWT_EXPIRY from environment
    const token = jwt.sign(
      { userId: user._id, emailId: user.emailId },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRY! } as jwt.SignOptions
    );
    
    // Generate refresh token using JWT_EXPIRY from environment
    const refreshToken = jwt.sign(
      { userId: user._id, emailId: user.emailId },
      jwtRefreshSecret,
      { expiresIn: process.env.JWT_EXPIRY! } as jwt.SignOptions
    );
    
    // Note: refreshToken is stored in cookies, not in user document for security
    // The user document doesn't need to store the refresh token
    
    // Set JWT token as HTTP-only cookie using COOKIE_EXPIRY from environment
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: parseInt(process.env.COOKIE_EXPIRY!)
    });
    
    // Set refresh token as HTTP-only cookie using COOKIE_EXPIRY from environment
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: parseInt(process.env.COOKIE_EXPIRY!)
    });
    
    // Log successful signup
    console.log(`New user registered: ${user.emailId} at ${new Date().toISOString()}`);
    
    // Return success response (without tokens in body for security)
    sendSuccessResponse(res, "User registered successfully", {
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
        twoFactorEnabled: user.twoFactorEnabled,
        loginCount: user.loginCount,
        failedLoginAttempts: user.failedLoginAttempts,
        isLocked: user.isLocked,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
    
  } catch (error: any) {
    console.error("Signup error:", error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      sendErrorResponse(res, 400, errors.join(', '));
      return;
    }
    
    // Handle duplicate email error
    if (error.code === 11000) {
      sendErrorResponse(res, 400, "Email already exists");
      return;
    }
    
    // Handle other errors
    sendErrorResponse(res, 500, "Internal server error");
  }
};

export {
  signup
};
