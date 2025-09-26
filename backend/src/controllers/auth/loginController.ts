import { validateLoginData } from "../../utils/loginValidation";
import { validatePassword, getPasswordStrength } from "../../utils/passwordValidation";
import { generateSessionId } from "./sessionController";
import User from "../../models/user";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Request, Response } from 'express';

// DRY: Common error response handler
const sendErrorResponse = (res: Response, statusCode: number, message: string): Response => {
  return res.status(statusCode).json({
    success: false,
    error: message
  });
};

// DRY: Common success response handler
const sendSuccessResponse = (res: Response, message: string, data: any = null): Response => {
  const response: any = {
    success: true,
    message: message
  };
  if (data) {
    response.data = data;
  }
  return res.json(response);
};

// Login Controller
const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input data
    validateLoginData(req);
    const { emailId, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ emailId });
    if (!user) {
      sendErrorResponse(res, 401, "Invalid email or password");
      return;
    }
    
    // If lock has expired, reset the lock
    if (user.isLocked && user.lockUntil && user.lockUntil <= new Date()) {
      user.isLocked = false;
      user.lockUntil = undefined as any;
      user.failedLoginAttempts = 0;
      await user.save();
    }
    
    // Validate password FIRST
    const isPasswordValid = await user.validatePassword(password);
    
    if (!isPasswordValid) {
      // Check if account is locked (only for wrong password)
      if (user.isAccountLocked()) {
        const lockTimeRemaining = user.getLockTimeRemaining();
        sendErrorResponse(res, 423, `Account is locked due to too many failed attempts. Try again in ${lockTimeRemaining} minutes.`);
        return;
      }
      
      // Increment failed login attempts
      user.failedLoginAttempts += 1;
      
      // Lock account after max failed attempts
      const maxAttempts = Number(process.env.MAX_FAILED_LOGIN_ATTEMPTS);
      const lockoutDurationMs = Number(process.env.ACCOUNT_LOCKOUT_DURATION_MINUTES) * 60 * 1000;
      
      if (user.failedLoginAttempts >= maxAttempts) {
        user.isLocked = true;
        user.lockUntil = new Date(Date.now() + lockoutDurationMs);
        console.log(`Account locked for user: ${user.emailId} due to ${user.failedLoginAttempts} failed attempts`);
      }
      
      await user.save();
      sendErrorResponse(res, 401, "Invalid email or password");
      return;
    }
    
    // If password is correct, unlock the account immediately (even if it was locked)
    if (user.isLocked) {
      console.log(`Account unlocked for user: ${user.emailId} due to correct password`);
    }
    
    // Reset failed login attempts on successful login
    user.failedLoginAttempts = 0;
    user.isLocked = false;
    user.lockUntil = undefined as any;
    
    // Update login tracking information
    user.loginCount += 1;
    user.lastLogin = new Date();
    user.loginIP = req.ip || req.socket.remoteAddress || 'unknown';
    
    // Create new session
    const sessionId = generateSessionId();
    const deviceId = req.headers['x-device-id'] as string || crypto.randomBytes(16).toString('hex');
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    
    // Generate better device name from user agent
    const deviceName = generateDeviceName(userAgent, req.headers['x-device-name'] as string);
    
    user.addSession(sessionId, deviceId, deviceName, userAgent, ipAddress);
    
    // Save updated user information
    await user.save();
    
    // Generate JWT token and refresh token
    const token = user.getJWT();
    const refreshToken = user.generateRefreshToken();
    
    // Save user with refresh token
    await user.save();
    
    // Set JWT token as HTTP-only cookie using COOKIE_EXPIRY from environment
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: parseInt(process.env.COOKIE_EXPIRY!)
    });
    
    // Set refresh token as HTTP-only cookie (7 days)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    // Log successful login
    console.log(`User logged in: ${user.emailId} at ${new Date().toISOString()}`);
    
    // Return success response
    sendSuccessResponse(res, "Login successful", {
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
        loginCount: user.loginCount,
        lastLogin: user.lastLogin,
        loginIP: user.loginIP,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      session: {
        sessionId,
        deviceId,
        deviceName,
        deviceType: user.getSessionById(sessionId)?.deviceType || 'unknown'
      }
    });
    
  } catch (error: any) {
    console.error("Login error:", error);
    sendErrorResponse(res, 500, "Internal server error");
  }
};

// Helper function to generate device name from user agent
const generateDeviceName = (userAgent: string, customDeviceName?: string): string => {
  if (customDeviceName) {
    return customDeviceName;
  }
  
  if (!userAgent || userAgent === 'Unknown') {
    return 'Unknown Device';
  }
  
  const ua = userAgent.toLowerCase();
  
  // Detect browser with more comprehensive patterns
  let browser = 'Unknown Browser';
  if (ua.includes('edg/') || ua.includes('edge/')) browser = 'Edge';
  else if (ua.includes('chrome/') && !ua.includes('edg/') && !ua.includes('edge/')) browser = 'Chrome';
  else if (ua.includes('firefox/')) browser = 'Firefox';
  else if (ua.includes('safari/') && !ua.includes('chrome/') && !ua.includes('edg/')) browser = 'Safari';
  else if (ua.includes('opera/') || ua.includes('opr/')) browser = 'Opera';
  else if (ua.includes('msie') || ua.includes('trident/')) browser = 'Internet Explorer';
  
  // Detect operating system with more patterns
  let os = 'Unknown OS';
  if (ua.includes('windows nt') || ua.includes('windows 10') || ua.includes('windows 11')) os = 'Windows';
  else if (ua.includes('macintosh') || ua.includes('mac os x') || ua.includes('macos')) os = 'macOS';
  else if (ua.includes('linux') || ua.includes('ubuntu') || ua.includes('debian')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
  else if (ua.includes('x11') || ua.includes('unix')) os = 'Unix';
  
  // Detect device type
  let deviceType = 'Desktop';
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('blackberry')) deviceType = 'Mobile';
  else if (ua.includes('tablet') || ua.includes('ipad')) deviceType = 'Tablet';
  
  return `${browser} on ${os} ${deviceType}`;
};

export {
  login
};
