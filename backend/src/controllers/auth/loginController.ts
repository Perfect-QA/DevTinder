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
    
    // Validate password
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      sendErrorResponse(res, 401, "Invalid email or password");
      return;
    }
    
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
        emailId: user.emailId
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
