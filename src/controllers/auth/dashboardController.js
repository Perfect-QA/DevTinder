const User = require("../../models/user");
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

// Dashboard Controller
const getDashboard = async (req, res) => {
  try {
    const userId = req.userId;
    
    // Find user
    const user = await User.findById(userId).select('-password -refreshToken');
    
    if (!user) {
      return sendErrorResponse(res, 404, "User not found");
    }
    
    // Return user dashboard data
    return sendSuccessResponse(res, "Dashboard data retrieved successfully", {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        emailId: user.emailId,
        lastLogin: user.lastLogin,
        loginIP: user.loginIP,
        oauthAccountsLinked: user.oauthAccountsLinked || [],
        lastOAuthProvider: user.lastOAuthProvider
      }
    });
    
  } catch (error) {
    console.error("Dashboard error:", error);
    return sendErrorResponse(res, 500, "Internal server error");
  }
};

// Get User Info Controller
const getUserInfo = async (req, res) => {
  try {
    const userId = req.userId;
    
    // Find user
    const user = await User.findById(userId).select('-password -refreshToken');
    
    if (!user) {
      return sendErrorResponse(res, 404, "User not found");
    }
    
    // Return user info
    return sendSuccessResponse(res, "User info retrieved successfully", {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        emailId: user.emailId,
        lastLogin: user.lastLogin,
        loginIP: user.loginIP,
        oauthAccountsLinked: user.oauthAccountsLinked || [],
        lastOAuthProvider: user.lastOAuthProvider
      }
    });
    
  } catch (error) {
    console.error("Get user info error:", error);
    return sendErrorResponse(res, 500, "Internal server error");
  }
};

// Refresh Token Controller
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    const userId = req.userId;
    
    if (!refreshToken) {
      return sendErrorResponse(res, 401, "No refresh token provided");
    }
    
    // Find user
    const user = await User.findById(userId);
    if (!user || user.refreshToken !== refreshToken) {
      return sendErrorResponse(res, 401, "Invalid refresh token");
    }
    
    // Verify refresh token
    try {
      jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      // Clear invalid refresh token if user exists
      if (user) {
        user.refreshToken = undefined;
        await user.save();
      }
      return sendErrorResponse(res, 401, "Invalid refresh token");
    }
    
    // Verify user still exists and has required fields
    if (!user || !user._id || !user.emailId) {
      return sendErrorResponse(res, 401, "User data invalid");
    }
    
    // Check if JWT secrets are configured
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      console.error("JWT secrets not configured. Please set JWT_SECRET and JWT_REFRESH_SECRET in .env file");
      return sendErrorResponse(res, 500, "Server configuration error");
    }
    
    // Generate new access token
    const newToken = jwt.sign(
      { userId: user._id, emailId: user.emailId },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Generate new refresh token
    const newRefreshToken = jwt.sign(
      { userId: user._id, emailId: user.emailId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    
    // Update user with new refresh token
    user.refreshToken = newRefreshToken;
    await user.save();
    
    return sendSuccessResponse(res, "Token refreshed successfully", {
      token: newToken,
      refreshToken: newRefreshToken
    });
    
  } catch (error) {
    console.error("Refresh token error:", error);
    return sendErrorResponse(res, 500, "Internal server error");
  }
};

module.exports = {
  getDashboard,
  getUserInfo,
  refreshToken
};
