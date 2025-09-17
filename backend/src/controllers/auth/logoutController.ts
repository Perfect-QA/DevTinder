import { Request, Response } from 'express';

// Logout Controller
const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // Clear the token cookie
    res.clearCookie('token');
    res.clearCookie('refreshToken');
    
    res.json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error: any) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};

// OAuth Logout Controller
const oauthLogout = async (req: Request, res: Response): Promise<void> => {
  try {
    // Clear all cookies
    res.clearCookie('token');
    res.clearCookie('refreshToken');
    
    res.json({
      success: true,
      message: "OAuth logout successful"
    });
  } catch (error: any) {
    console.error("OAuth logout error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};

export {
  logout,
  oauthLogout
};
