const User = require("../../models/user");

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

// Logout Controller
const logout = async (req, res) => {
  try {
    const userId = req.userId;
    
    // Find user and clear refresh token
    const user = await User.findById(userId);
    if (user) {
      user.refreshToken = undefined;
      await user.save();
    }
    
    // Clear cookies
    res.clearCookie('token');
    res.clearCookie('refreshToken');
    
    // Log logout
    console.log(`User ${req.userEmail} logged out at ${new Date().toISOString()}`);
    
    return sendSuccessResponse(res, "Logout successful");
    
  } catch (error) {
    console.error("Logout error:", error);
    return sendErrorResponse(res, 500, "Internal server error");
  }
};

// OAuth Logout Controller
const oauthLogout = async (req, res) => {
  try {
    const userId = req.userId;
    const { provider } = req.body;
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return sendErrorResponse(res, 404, "User not found");
    }
    
    // Clear refresh token
    user.refreshToken = undefined;
    
    // Clear OAuth tokens if provider specified
    if (provider === 'google') {
      user.googleAccessToken = undefined;
      user.googleRefreshToken = undefined;
    } else if (provider === 'github') {
      user.githubAccessToken = undefined;
      user.githubRefreshToken = undefined;
    }
    
    await user.save();
    
    // Clear cookies
    res.clearCookie('token');
    res.clearCookie('refreshToken');
    
    // Log OAuth logout
    console.log(`OAuth logout for user ${req.userEmail}, revoked tokens for: ${provider || 'all'}`);
    
    return sendSuccessResponse(res, "OAuth logout successful");
    
  } catch (error) {
    console.error("OAuth logout error:", error);
    return sendErrorResponse(res, 500, "Internal server error");
  }
};

module.exports = {
  logout,
  oauthLogout
};
