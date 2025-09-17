import { Request, Response } from 'express';
import { IUser } from '../../models/user';

// Dashboard Controller
const getDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as IUser;
    res.json({
      success: true,
      message: "Dashboard data retrieved successfully",
      data: {
        user: {
          id: user?._id,
          firstName: user?.firstName,
          lastName: user?.lastName,
          emailId: user?.emailId
        }
      }
    });
  } catch (error: any) {
    console.error("Dashboard error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};

// Get User Info Controller
const getUserInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as IUser;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: "User not authenticated"
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
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
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error: any) {
    console.error("Get user info error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};

// Refresh Token Controller
const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    // Simple refresh token implementation
    res.json({
      success: true,
      message: "Token refreshed successfully"
    });
  } catch (error: any) {
    console.error("Refresh token error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};

export {
  getDashboard,
  getUserInfo,
  refreshToken
};
