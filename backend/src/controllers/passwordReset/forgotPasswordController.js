const User = require("../../models/user");
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Email transporter configuration
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Serve Forgot Password Page
const getForgotPasswordPage = (req, res) => {
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
};

// Forgot Password API Route
const forgotPassword = async (req, res) => {
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
    
    // Create reset URL
    const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset-password/${resetToken}`;
    
    // Send email first, then save token
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
      
      // Only save reset token after email is sent successfully
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpiry = resetTokenExpiry;
      await user.save();
      
      res.json({
        success: true,
        message: "If the email exists, a password reset link has been sent"
      });
      
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      
      res.status(500).json({
        success: false,
        error: "Failed to send reset email. Please try again later."
      });
    }
    
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};

// Resend Reset Email
const resendResetEmail = async (req, res) => {
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
        message: "If the email exists, a new password reset link has been sent"
      });
    }
    
    // Check if there's already a valid reset token
    if (user.resetPasswordToken && user.resetPasswordExpiry > Date.now()) {
      return res.status(400).json({
        success: false,
        error: "A reset link has already been sent. Please check your email or wait before requesting another."
      });
    }
    
    // Generate new reset token
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
        subject: 'Password Reset Request - PerfectQA (Resent)',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request (Resent)</h2>
            <p>Hello ${user.firstName},</p>
            <p>You requested a new password reset link for your PerfectQA account.</p>
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
        message: "If the email exists, a new password reset link has been sent"
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
    console.error("Resend reset email error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};

module.exports = {
  getForgotPasswordPage,
  forgotPassword,
  resendResetEmail
};
