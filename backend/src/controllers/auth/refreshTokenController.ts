import { Request, Response } from 'express';
import User from '../../models/user';

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

// Refresh Token Controller
const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      sendErrorResponse(res, 401, "Refresh token not provided");
      return;
    }
    
    // Verify refresh token and get user
    const refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
    if (!refreshTokenSecret) {
      sendErrorResponse(res, 500, "Server configuration error");
      return;
    }
    
    let decoded: any;
    try {
      decoded = require('jsonwebtoken').verify(refreshToken, refreshTokenSecret);
    } catch (error) {
      sendErrorResponse(res, 401, "Invalid refresh token");
      return;
    }
    
    // Find user by ID from token
    const user = await User.findById(decoded.userId);
    if (!user) {
      sendErrorResponse(res, 401, "User not found");
      return;
    }
    
    // Validate refresh token against user's stored token
    if (!user.validateRefreshToken(refreshToken)) {
      sendErrorResponse(res, 401, "Invalid or expired refresh token");
      return;
    }
    
    // Generate new access token
    const newAccessToken = user.getJWT();
    
    // Set new access token as HTTP-only cookie
    res.cookie('token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: parseInt(process.env.COOKIE_EXPIRY!)
    });
    
    // Log token refresh
    console.log(`Token refreshed for user: ${user.emailId} at ${new Date().toISOString()}`);
    
    // Return success response
    sendSuccessResponse(res, "Token refreshed successfully", {
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
    console.error("Refresh token error:", error);
    sendErrorResponse(res, 500, "Internal server error");
  }
};

export {
  refreshToken
};
