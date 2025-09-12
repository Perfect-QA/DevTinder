const User = require("../../models/user");
const bcrypt = require("bcrypt");
const validator = require("validator");
const mongoose = require("mongoose");

// Serve Reset Password Page
const getResetPasswordPage = async (req, res) => {
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
};

// Reset Password API Route
const resetPassword = async (req, res) => {
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
    if (!validator.isStrongPassword(password)) {
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
    
    // Use database transaction for atomic operation
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
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
      
      await user.save({ session });
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
    
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
};

module.exports = {
  getResetPasswordPage,
  resetPassword
};
