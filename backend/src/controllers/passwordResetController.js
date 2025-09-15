// Import from smaller password reset modules
const {
  getForgotPasswordPage,
  forgotPassword,
  resendResetEmail
} = require('./passwordReset/forgotPasswordController');

const {
  getResetPasswordPage,
  resetPassword
} = require('./passwordReset/resetPasswordController');

const {
  checkResetToken,
  validateResetToken,
  getPasswordResetStatus,
  cancelPasswordReset
} = require('./passwordReset/tokenManagementController');

// Re-export all password reset functions
module.exports = {
  // Forgot Password
  getForgotPasswordPage,
  forgotPassword,
  resendResetEmail,
  
  // Reset Password
  getResetPasswordPage,
  resetPassword,
  
  // Token Management
  checkResetToken,
  validateResetToken,
  
  // Password Reset Management
  getPasswordResetStatus,
  cancelPasswordReset
};
