const User = require("../../models/user");

// Check Reset Token Validity
const checkResetToken = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Verify token exists and is valid
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired reset token"
      });
    }
    
    res.json({
      success: true,
      message: "Reset token is valid",
      user: {
        emailId: user.emailId,
        firstName: user.firstName
      }
    });
    
  } catch (error) {
    console.error("Check reset token error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};

// Validate Reset Token (alias for checkResetToken)
const validateResetToken = checkResetToken;

// Get Password Reset Status
const getPasswordResetStatus = async (req, res) => {
  try {
    const { emailId } = req.query;
    
    if (!emailId) {
      return res.status(400).json({
        success: false,
        error: "Email is required"
      });
    }
    
    const user = await User.findOne({ emailId: emailId.toLowerCase() });
    
    if (!user) {
      return res.json({
        success: true,
        hasActiveReset: false,
        message: "No active password reset found"
      });
    }
    
    const hasActiveReset = user.resetPasswordToken && user.resetPasswordExpiry > Date.now();
    
    res.json({
      success: true,
      hasActiveReset: hasActiveReset,
      resetExpiry: hasActiveReset ? user.resetPasswordExpiry : null,
      message: hasActiveReset ? "Active password reset found" : "No active password reset found"
    });
    
  } catch (error) {
    console.error("Get password reset status error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};

// Cancel Password Reset
const cancelPasswordReset = async (req, res) => {
  try {
    const { emailId } = req.body;
    
    if (!emailId) {
      return res.status(400).json({
        success: false,
        error: "Email is required"
      });
    }
    
    const user = await User.findOne({ emailId: emailId.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }
    
    // Clear reset token
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();
    
    res.json({
      success: true,
      message: "Password reset cancelled successfully"
    });
    
  } catch (error) {
    console.error("Cancel password reset error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};

module.exports = {
  checkResetToken,
  validateResetToken,
  getPasswordResetStatus,
  cancelPasswordReset
};
