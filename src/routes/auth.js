const express = require('express');
const authRouter = express.Router();
const { userAuth } = require("../middlewares/authmiddleware");
const { loginLimiter, forgotPasswordLimiter, oauthLimiter } = require("../middlewares/rateLimiting");

// Import controllers
const {
  signup,
  login,
  logout,
  oauthLogout,
  getDashboard,
  getUserInfo,
  refreshToken
} = require('../controllers/authController');

const {
  getForgotPasswordPage,
  forgotPassword,
  resendResetEmail,
  getResetPasswordPage,
  resetPassword,
  checkResetToken,
  validateResetToken,
  getPasswordResetStatus,
  cancelPasswordReset
} = require('../controllers/passwordResetController');

const {
  googleAuth,
  googleCallback,
  unlinkGoogleAccount,
  getGoogleProfile,
  githubAuth,
  githubCallback,
  unlinkGithubAccount,
  getGithubProfile,
  getGithubRepositories,
  unlinkAccount,
  getOAuthStatus
} = require('../controllers/oauthController');

// ==================== AUTHENTICATION ROUTES ====================

// Signup route
authRouter.post("/signup", signup);

// Login route
authRouter.post("/login", loginLimiter, login);

// Logout routes
authRouter.post("/logout", userAuth, logout);
authRouter.post("/logout/oauth", userAuth, oauthLogout);

// Dashboard route (protected)
authRouter.get('/dashboard', userAuth, getDashboard);

// User info endpoint
authRouter.get('/user-info', userAuth, getUserInfo);

// Refresh token endpoint
authRouter.post('/refresh-token', userAuth, refreshToken);

// ==================== PASSWORD RESET ROUTES ====================

// Forgot Password Routes
authRouter.get("/forgot-password", getForgotPasswordPage);
authRouter.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
authRouter.post("/forgot-password/resend", forgotPasswordLimiter, resendResetEmail);
authRouter.get("/forgot-password/check/:token", checkResetToken);

// Reset Password Routes
authRouter.get("/reset-password/:token", getResetPasswordPage);
authRouter.post("/reset-password/:token", resetPassword);
authRouter.get("/reset-password/validate/:token", validateResetToken);

// Password Reset Management Routes
authRouter.get("/password-reset/status", getPasswordResetStatus);
authRouter.post("/password-reset/cancel", cancelPasswordReset);

// ==================== OAUTH ROUTES ====================

// Google OAuth Routes
authRouter.get('/google', oauthLimiter, googleAuth);
authRouter.get('/google/callback', googleCallback);
authRouter.get('/google/profile', userAuth, getGoogleProfile);
authRouter.post('/google/unlink', userAuth, unlinkGoogleAccount);

// GitHub OAuth Routes
authRouter.get('/github', oauthLimiter, githubAuth);
authRouter.get('/github/callback', githubCallback);
authRouter.get('/github/profile', userAuth, getGithubProfile);
authRouter.get('/github/repositories', userAuth, getGithubRepositories);
authRouter.post('/github/unlink', userAuth, unlinkGithubAccount);

// Generic OAuth Routes (for backward compatibility)
authRouter.get('/oauth/status', userAuth, getOAuthStatus);
authRouter.post('/unlink/:provider', userAuth, unlinkAccount);

module.exports = authRouter;