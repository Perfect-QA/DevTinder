const express = require('express');
const authRouter = express.Router();
const { validateSignUpData } = require("../utils/signUpValidation");
const { validateLoginData } = require("../utils/loginValidation");
const User = require("../models/user");
const bcrypt = require("bcrypt");
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const passport = require('passport');
const { userAuth } = require("../middlewares/authmiddleware");

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

// DRY: Common rate limiter configuration
const createRateLimiter = (windowMs, max, errorMessage) => {
  return rateLimit({
    windowMs,
    max,
  message: {
    success: false,
      error: errorMessage
  },
  standardHeaders: true,
  legacyHeaders: false,
});
};

// Rate limiting configurations
const loginLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 requests per window
  "Too many login attempts, please try again after 15 minutes"
);

const forgotPasswordLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  3, // 3 requests per hour
  "Too many password reset requests, please try again after 1 hour"
);

const oauthLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  10, // 10 OAuth attempts per 15 minutes
  "Too many OAuth attempts, please try again after 15 minutes"
);

// Email transporter configuration
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail', // You can change this to your email service
    auth: {
      user: process.env.EMAIL_USER, // Your email
      pass: process.env.EMAIL_PASS  // Your email password or app password
    }
  });
};

authRouter.post("/signup", async (req, res) => {
  try {
    // validating the data
    validateSignUpData(req);
    const { firstName , lastName , emailId , password } = req.body; 
    
    // Create a new user with original password for validation
    const user = new User({ firstName, lastName, emailId, password });
    
    // Validate the user (this will trigger password validation)
    await user.validate();
    
    // If validation passes, encrypt the password
    const saltRounds = process.env.PASSWORD_SALT_ROUNDS ? parseInt(process.env.PASSWORD_SALT_ROUNDS) : 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    user.password = passwordHash;
    
    await user.save();
    sendSuccessResponse(res, "User signed up successfully", {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        emailId: user.emailId
      }
    });
  } catch (error) {
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return sendErrorResponse(res, 400, error.message);
    }
    // Handle duplicate email error
    if (error.code === 11000) {
      return sendErrorResponse(res, 400, "Email already exists");
    }
    // Handle other errors
    return sendErrorResponse(res, 500, error.message);
  }
});

authRouter.post("/login", loginLimiter, async (req, res) =>{
  try{
    const { emailId , password } = req.body;
    
    // Enhanced validation
    validateLoginData(req);
    
    // Find user with case-insensitive email
    const user = await User.findOne({ emailId: emailId ? emailId.toLowerCase() : '' });
    if(!user){
      // Don't reveal if user exists or not for security
      return sendErrorResponse(res, 401, "Invalid credentials");
    } 
    
    // Check if user account is locked (you can add this field to user schema)
    if(user.isLocked && user.lockUntil > Date.now()){
      return sendErrorResponse(res, 423, "Account temporarily locked due to too many failed attempts");
    }
    
    const isPasswordValid = await user.validatePassword(password);
    if(!isPasswordValid){
      // Increment failed login attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      
      // Lock account after 5 failed attempts for 30 minutes
      if(user.failedLoginAttempts >= 5){
        user.isLocked = true;
        user.lockUntil = Date.now() + 30 * 60 * 1000; // 30 minutes
      }
      
      await user.save();
      
      return sendErrorResponse(res, 401, "Invalid credentials");
    }
    
    // Reset failed login attempts on successful login
    user.failedLoginAttempts = 0;
    user.isLocked = false;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    user.loginIP = req.ip || req.socket.remoteAddress;
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();
    
    const token = await user.getJWT();
    
    // Enhanced cookie configuration
    const cookieExpiry = process.env.COOKIE_EXPIRY ? parseInt(process.env.COOKIE_EXPIRY) : 24 * 60 * 60 * 1000;
    const cookieOptions = {
      httpOnly: true,
      expires: new Date(Date.now() + cookieExpiry),
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    };
    
    res.cookie("token", token, cookieOptions);
    
    // Log successful login (you can add proper logging here)
    console.log(`Successful login for user: ${user.emailId} at ${new Date().toISOString()}`);
    
    sendSuccessResponse(res, "User logged in successfully", {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        emailId: user.emailId,
        lastLogin: user.lastLogin,
        loginCount: user.loginCount
      }
    });
  }catch (error) {
    console.error("Login error:", error);
    // Handle validation errors
    if (error.message && (error.message.includes("required") || error.message.includes("Invalid email"))) {
      return sendErrorResponse(res, 400, error.message);
    }
    return sendErrorResponse(res, 500, "Internal server error");
  }
})

// Enhanced Logout route - handles both manual and OAuth logouts
authRouter.post("/logout", userAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      // Clear cookie even if user not found (for cleanup)
      res.clearCookie("token");
      return sendSuccessResponse(res, "Logged out successfully");
    }
    
    // Clear JWT token cookie
    res.clearCookie("token");
    
    // Clear session data (for OAuth sessions)
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destruction error:", err);
        }
      });
    }
    
    // Log the logout event
    console.log(`User ${user.emailId} logged out at ${new Date().toISOString()}`);
    
    sendSuccessResponse(res, "User logged out successfully", {
      logoutTime: new Date().toISOString(),
      provider: user.provider
    });
    
  } catch (error) {
    console.error("Logout error:", error);
    // Even if there's an error, try to clear the cookie
    res.clearCookie("token");
    return sendErrorResponse(res, 500, "Logout failed: " + error.message);
  }
});

// OAuth-specific logout route (for revoking OAuth tokens)
authRouter.post("/logout/oauth", userAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      res.clearCookie("token");
      return sendSuccessResponse(res, "Logged out successfully");
    }
    
    // Revoke OAuth tokens if they exist
    const revokedProviders = [];
    
    if (user.googleAccessToken) {
      // Note: In a real implementation, you would call Google's revoke endpoint
      // For now, we'll just clear the tokens from our database
      user.googleAccessToken = undefined;
      user.googleRefreshToken = undefined;
      user.googleTokenExpiry = undefined;
      revokedProviders.push('google');
    }
    
    if (user.githubAccessToken) {
      // Note: In a real implementation, you would call GitHub's revoke endpoint
      // For now, we'll just clear the tokens from our database
      user.githubAccessToken = undefined;
      user.githubRefreshToken = undefined;
      user.githubTokenExpiry = undefined;
      revokedProviders.push('github');
    }
    
    // Save the updated user (with cleared OAuth tokens)
    await user.save();
    
    // Clear JWT token cookie
    res.clearCookie("token");
    
    // Clear session data
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destruction error:", err);
        }
      });
    }
    
    console.log(`OAuth logout for user ${user.emailId}, revoked tokens for: ${revokedProviders.join(', ')}`);
    
    sendSuccessResponse(res, "OAuth logout successful", {
      logoutTime: new Date().toISOString(),
      revokedProviders: revokedProviders,
      provider: user.provider
    });
    
  } catch (error) {
    console.error("OAuth logout error:", error);
    res.clearCookie("token");
    return sendErrorResponse(res, 500, "OAuth logout failed: " + error.message);
  }
});

// Serve Forgot Password Page
authRouter.get("/forgot-password", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Forgot Password - PerfectQA</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; }
            .form-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; font-weight: bold; }
            input[type="email"] { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
            button { background-color: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; width: 100%; }
            button:hover { background-color: #0056b3; }
            button:disabled { background-color: #6c757d; cursor: not-allowed; }
            .message { margin-top: 15px; padding: 10px; border-radius: 4px; }
            .success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
            .error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
            .link { color: #007bff; text-decoration: none; }
        </style>
    </head>
    <body>
        <h2>Forgot Password</h2>
        <p>Enter your email address and we'll send you a link to reset your password.</p>
        
        <form id="forgotPasswordForm">
            <div class="form-group">
                <label for="email">Email Address:</label>
                <input type="email" id="email" name="emailId" required>
            </div>
            <button type="submit" id="submitBtn">Send Reset Link</button>
        </form>
        
        <div id="message"></div>
        
        <p style="text-align: center; margin-top: 20px;">
            <a href="/auth/login" class="link">Back to Login</a>
        </p>
        
        <script>
            document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('email').value;
                const messageDiv = document.getElementById('message');
                const submitBtn = document.getElementById('submitBtn');
                
                // Disable button during request
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending...';
                
                try {
                    const response = await fetch('/auth/forgot-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ emailId: email })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        messageDiv.innerHTML = '<div class="message success">' + data.message + '</div>';
                        document.getElementById('forgotPasswordForm').reset();
                        submitBtn.textContent = 'Email Sent!';
                    } else {
                        messageDiv.innerHTML = '<div class="message error">' + data.error + '</div>';
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Send Reset Link';
                    }
                } catch (error) {
                    messageDiv.innerHTML = '<div class="message error">An error occurred. Please try again.</div>';
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Send Reset Link';
                }
            });
        </script>
    </body>
    </html>
  `);
});

// Forgot Password API Route
authRouter.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  try {
    const { emailId } = req.body;
    
    if (!emailId) {
      return res.status(400).json({
        success: false,
        error: "Email is required"
      });
    }
    
    // Find user
    const user = await User.findOne({ emailId: emailId.toLowerCase() });
    if (!user) {
      // Don't reveal if user exists for security
      return res.json({
        success: true,
        message: "If the email exists, a password reset link has been sent"
      });
    }
    
    // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    // Save reset token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = resetTokenExpiry;
    await user.save();
    
    // Create reset URL
    const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset-password/${resetToken}`;
    
    // Send email
    try {
      const transporter = createTransporter();
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.emailId,
        subject: 'Password Reset Request - PerfectQA',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>Hello ${user.firstName},</p>
            <p>You requested a password reset for your PerfectQA account.</p>
            <p>Click the link below to reset your password:</p>
            <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
            <p>This link will expire in 10 minutes.</p>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <br>
            <p>Best regards,<br>PerfectQA Team</p>
          </div>
        `
      };
      
      await transporter.sendMail(mailOptions);
      
      res.json({
        success: true,
        message: "If the email exists, a password reset link has been sent"
      });
      
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      // Clear the reset token if email fails
      user.resetPasswordToken = undefined;
      user.resetPasswordExpiry = undefined;
      await user.save();
      
      res.status(500).json({
        success: false,
        error: "Failed to send reset email"
      });
    }
    
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

// Serve Reset Password Page
authRouter.get("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  
  try {
    // Verify token exists and is valid
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invalid Reset Link - PerfectQA</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; text-align: center; }
                .error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; padding: 15px; border-radius: 4px; }
                .link { color: #007bff; text-decoration: none; }
            </style>
        </head>
        <body>
            <h2>Invalid Reset Link</h2>
            <div class="error">
                <p>This password reset link is invalid or has expired.</p>
                <p>Please request a new password reset.</p>
            </div>
            <p><a href="/auth/forgot-password" class="link">Request New Reset Link</a></p>
        </body>
        </html>
      `);
    }
    
    // Show reset password form
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Password - PerfectQA</title>
          <style>
              body { font-family: Arial, sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; }
              .form-group { margin-bottom: 15px; }
              label { display: block; margin-bottom: 5px; font-weight: bold; }
              input[type="password"] { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
              button { background-color: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; width: 100%; }
              button:hover { background-color: #0056b3; }
              button:disabled { background-color: #6c757d; cursor: not-allowed; }
              .message { margin-top: 15px; padding: 10px; border-radius: 4px; }
              .success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
              .error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
              .password-requirements { font-size: 12px; color: #666; margin-top: 5px; }
          </style>
      </head>
      <body>
          <h2>Reset Your Password</h2>
          <p>Hello ${user.firstName},</p>
          <p>Please enter your new password below:</p>
          
          <form id="resetPasswordForm">
              <div class="form-group">
                  <label for="password">New Password:</label>
                  <input type="password" id="password" name="password" required>
                  <div class="password-requirements">
                      Must contain at least 8 characters with uppercase, lowercase, number, and special character
                  </div>
              </div>
              <div class="form-group">
                  <label for="confirmPassword">Confirm Password:</label>
                  <input type="password" id="confirmPassword" name="confirmPassword" required>
              </div>
              <button type="submit" id="submitBtn">Reset Password</button>
          </form>
          
          <div id="message"></div>
          
          <script>
              document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
                  e.preventDefault();
                  const password = document.getElementById('password').value;
                  const confirmPassword = document.getElementById('confirmPassword').value;
                  const messageDiv = document.getElementById('message');
                  const submitBtn = document.getElementById('submitBtn');
                  
                  // Validate passwords match
                  if (password !== confirmPassword) {
                      messageDiv.innerHTML = '<div class="message error">Passwords do not match</div>';
                      return;
                  }
                  
                  // Disable button during request
                  submitBtn.disabled = true;
                  submitBtn.textContent = 'Resetting...';
                  
                  try {
                      const response = await fetch('/auth/reset-password/${token}', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ password: password })
                      });
                      
                      const data = await response.json();
                      
                      if (data.success) {
                          messageDiv.innerHTML = '<div class="message success">Password reset successfully! You can now login with your new password.</div>';
                          document.getElementById('resetPasswordForm').reset();
                          submitBtn.textContent = 'Password Reset Complete';
                          
                          // Redirect to login after 3 seconds
                          setTimeout(() => {
                              window.location.href = '/auth/login';
                          }, 3000);
                      } else {
                          messageDiv.innerHTML = '<div class="message error">' + data.error + '</div>';
                          submitBtn.disabled = false;
                          submitBtn.textContent = 'Reset Password';
                      }
                  } catch (error) {
                      messageDiv.innerHTML = '<div class="message error">An error occurred. Please try again.</div>';
                      submitBtn.disabled = false;
                      submitBtn.textContent = 'Reset Password';
                  }
              });
          </script>
      </body>
      </html>
    `);
    
  } catch (error) {
    console.error("Reset password page error:", error);
    res.status(500).send("Internal server error");
  }
});

// Reset Password API Route
authRouter.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({
        success: false,
        error: "Password is required"
      });
    }
    
    // Validate password strength
    if (!require('validator').isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        error: "Password must contain at least 8 characters with uppercase, lowercase, number, and special character"
      });
    }
    
    // Find user with valid reset token
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
    
    // Hash new password
    const saltRounds = process.env.PASSWORD_SALT_ROUNDS ? parseInt(process.env.PASSWORD_SALT_ROUNDS) : 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Update user password and clear reset token
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    user.failedLoginAttempts = 0; // Reset failed attempts
    user.isLocked = false;
    user.lockUntil = undefined;
    
    await user.save();
    
    res.json({
      success: true,
      message: "Password reset successfully"
    });
    
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

// OAuth Routes (moved to conditional section below)

// OAuth user info endpoint (moved to enhanced version below)

// OAuth Routes (Optional - only work if OAuth credentials are provided)

// Google OAuth Routes
authRouter.get('/google', oauthLimiter, (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(501).json({
      success: false,
      error: "Google OAuth not configured"
    });
  }
  
  // Generate state parameter for CSRF protection
  const state = crypto.randomBytes(32).toString('hex');
  req.session.oauthState = state;
  
  // Generate PKCE parameters
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  req.session.codeVerifier = codeVerifier;
  req.session.codeChallenge = codeChallenge;
  
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: state,
    accessType: 'offline',
    prompt: 'consent'
  })(req, res);
});

authRouter.get('/google/callback', 
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(501).json({
        success: false,
        error: "Google OAuth not configured"
      });
    }
    
    // Validate state parameter for CSRF protection
    if (req.query.state !== req.session.oauthState) {
      return res.status(400).json({
        success: false,
        error: "Invalid state parameter - possible CSRF attack"
      });
    }
    
    // Clear state from session
    delete req.session.oauthState;
    
    passport.authenticate('google', { 
      failureRedirect: '/auth/login?error=oauth_failed' 
    })(req, res, next);
  },
  async (req, res) => {
    try {
      // Check if user exists (OAuth authentication was successful)
      if (!req.user) {
        return res.redirect((process.env.CLIENT_URL || 'http://localhost:7777') + '/login?error=oauth_failed');
      }
      
      // Generate JWT token for the user
      const token = await req.user.getJWT();
      
      // Set cookie
      const cookieExpiry = process.env.COOKIE_EXPIRY ? parseInt(process.env.COOKIE_EXPIRY) : 24 * 60 * 60 * 1000;
      const cookieOptions = {
        httpOnly: true,
        expires: new Date(Date.now() + cookieExpiry),
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      };
      
      
      res.cookie("token", token, cookieOptions);
      
      // Update login tracking
      req.user.lastLogin = new Date();
      req.user.loginIP = req.ip || req.socket.remoteAddress;
      req.user.loginCount = (req.user.loginCount || 0) + 1;
      await req.user.save();
      
      // Redirect to dashboard or frontend
      res.redirect((process.env.CLIENT_URL || 'http://localhost:7777') + '/dashboard');
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect((process.env.CLIENT_URL || 'http://localhost:7777') + '/login?error=oauth_failed');
    }
  }
);

// GitHub OAuth Routes
authRouter.get('/github', oauthLimiter, (req, res) => {
  if (!process.env.GITHUB_CLIENT_ID) {
    return res.status(501).json({
      success: false,
      error: "GitHub OAuth not configured"
    });
  }
  
  // Generate state parameter for CSRF protection
  const state = crypto.randomBytes(32).toString('hex');
  req.session.oauthState = state;
  
  // Generate PKCE parameters
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  req.session.codeVerifier = codeVerifier;
  req.session.codeChallenge = codeChallenge;
  
  passport.authenticate('github', {
    scope: ['user:email'],
    state: state
  })(req, res);
});

authRouter.get('/github/callback',
  (req, res, next) => {
    if (!process.env.GITHUB_CLIENT_ID) {
      return res.status(501).json({
        success: false,
        error: "GitHub OAuth not configured"
      });
    }
    
    // Validate state parameter for CSRF protection
    if (req.query.state !== req.session.oauthState) {
      return res.status(400).json({
        success: false,
        error: "Invalid state parameter - possible CSRF attack"
      });
    }
    
    // Clear state from session
    delete req.session.oauthState;
    
    passport.authenticate('github', { 
      failureRedirect: '/auth/login?error=oauth_failed' 
    })(req, res, next);
  },
  async (req, res) => {
    try {
      // Check if user exists (OAuth authentication was successful)
      if (!req.user) {
        return res.redirect((process.env.CLIENT_URL || 'http://localhost:7777') + '/login?error=oauth_failed');
      }
      
      // Generate JWT token for the user
      const token = await req.user.getJWT();
      
      // Set cookie
      const cookieExpiry = process.env.COOKIE_EXPIRY ? parseInt(process.env.COOKIE_EXPIRY) : 24 * 60 * 60 * 1000;
      const cookieOptions = {
        httpOnly: true,
        expires: new Date(Date.now() + cookieExpiry),
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      };
      
      res.cookie("token", token, cookieOptions);
      
      // Update login tracking
      req.user.lastLogin = new Date();
      req.user.loginIP = req.ip || req.socket.remoteAddress;
      req.user.loginCount = (req.user.loginCount || 0) + 1;
      await req.user.save();
      
      // Redirect to dashboard or frontend
      res.redirect((process.env.CLIENT_URL || 'http://localhost:7777') + '/dashboard');
    } catch (error) {
      console.error('GitHub OAuth callback error:', error);
      res.redirect((process.env.CLIENT_URL || 'http://localhost:7777') + '/login?error=oauth_failed');
    }
  }
);

// OAuth user info endpoint
authRouter.get('/user-info', userAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json({
      success: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        emailId: user.emailId,
        provider: user.provider,
        lastLogin: user.lastLogin,
        loginCount: user.loginCount,
        createdAt: user.createdAt,
        hasGoogle: !!user.googleId,
        hasGithub: !!user.githubId,
        hasPassword: !!user.password
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user info'
    });
  }
});

// Account unlinking endpoint
authRouter.post('/unlink/:provider', userAuth, async (req, res) => {
  try {
    const { provider } = req.params;
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }
    
    // Unlink the specified provider
    if (provider === 'google') {
      user.googleId = undefined;
      user.googleRefreshToken = undefined;
    } else if (provider === 'github') {
      user.githubId = undefined;
      user.githubRefreshToken = undefined;
    } else {
      return res.status(400).json({
        success: false,
        error: "Invalid provider. Must be 'google' or 'github'"
      });
    }
    
    // Don't allow unlinking if it's the only auth method
    const hasPassword = user.password && user.password.length > 0;
    const hasGoogle = user.googleId;
    const hasGithub = user.githubId;
    
    if (!hasPassword && !hasGoogle && !hasGithub) {
      return res.status(400).json({
        success: false,
        error: "Cannot unlink the only authentication method. Please set a password first."
      });
    }
    
    await user.save();
    
    res.json({
      success: true,
      message: `${provider} account unlinked successfully`,
      user: {
        hasGoogle: !!user.googleId,
        hasGithub: !!user.githubId,
        hasPassword: hasPassword
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to unlink account: ' + error.message
    });
  }
});

// Refresh token endpoint
authRouter.post('/refresh-token', userAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }
    
    // Generate new JWT token
    const token = await user.getJWT();
    
    // Set new cookie
    const cookieExpiry = process.env.COOKIE_EXPIRY ? parseInt(process.env.COOKIE_EXPIRY) : 24 * 60 * 60 * 1000;
    const cookieOptions = {
      httpOnly: true,
      expires: new Date(Date.now() + cookieExpiry),
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    };
    
    res.cookie("token", token, cookieOptions);
    
    res.json({
      success: true,
      message: "Token refreshed successfully",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        emailId: user.emailId,
        provider: user.provider
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token: ' + error.message
    });
  }
});

module.exports = authRouter;