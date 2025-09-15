const passport = require('passport');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Google OAuth Initiation
const googleAuth = (req, res) => {
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
};

// Google OAuth Callback
const googleCallback = [
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
        return res.redirect((process.env.CLIENT_URL || 'http://localhost:3000') + '/login?error=oauth_failed');
      }
      
      // Check if JWT secrets are configured
      if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
        console.error("JWT secrets not configured. Please set JWT_SECRET and JWT_REFRESH_SECRET in .env file");
        return res.redirect((process.env.CLIENT_URL || 'http://localhost:3000') + '/login?error=server_config_error');
      }
      
      // Generate JWT token for the user
      const token = jwt.sign(
        { userId: req.user._id, emailId: req.user.emailId },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      // Generate refresh token
      const refreshToken = jwt.sign(
        { userId: req.user._id, emailId: req.user.emailId },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );
      
      // Update user with refresh token
      req.user.refreshToken = refreshToken;
      await req.user.save();
      
      // Set cookies
      const cookieExpiry = process.env.COOKIE_EXPIRY ? parseInt(process.env.COOKIE_EXPIRY) : 24 * 60 * 60 * 1000;
      const cookieOptions = {
        httpOnly: true,
        expires: new Date(Date.now() + cookieExpiry),
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      };
      
      res.cookie("token", token, cookieOptions);
      res.cookie("refreshToken", refreshToken, { ...cookieOptions, expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
      
      // Update login tracking
      req.user.lastLogin = new Date();
      req.user.loginIP = req.ip || req.socket.remoteAddress;
      req.user.loginCount = (req.user.loginCount || 0) + 1;
      await req.user.save();
      
      // Redirect to dashboard or frontend
      res.redirect((process.env.CLIENT_URL || 'http://localhost:3000') + '/dashboard');
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect((process.env.CLIENT_URL || 'http://localhost:3000') + '/login?error=oauth_failed');
    }
  }
];

// Google Account Unlinking
const unlinkGoogleAccount = async (req, res) => {
  try {
    const User = require('../models/user');
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }
    
    // Unlink Google account
    user.googleId = undefined;
    user.googleAccessToken = undefined;
    user.googleRefreshToken = undefined;
    user.googleTokenExpiry = undefined;
    user.googleProfileUrl = undefined;
    
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
    
    // Remove Google from linked accounts
    if (user.oauthAccountsLinked) {
      user.oauthAccountsLinked = user.oauthAccountsLinked.filter(provider => provider !== 'google');
    }
    
    await user.save();
    
    res.json({
      success: true,
      message: "Google account unlinked successfully",
      user: {
        hasGoogle: !!user.googleId,
        hasGithub: !!user.githubId,
        hasPassword: hasPassword
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to unlink Google account: ' + error.message
    });
  }
};

// Get Google Profile Info
const getGoogleProfile = async (req, res) => {
  try {
    const User = require('../models/user');
    const user = await User.findById(req.userId);
    
    if (!user || !user.googleId) {
      return res.status(404).json({
        success: false,
        error: "Google account not linked"
      });
    }
    
    res.json({
      success: true,
      googleProfile: {
        googleId: user.googleId,
        googleProfileUrl: user.googleProfileUrl,
        oauthScopes: user.oauthScopes,
        oauthConsentDate: user.oauthConsentDate
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Google profile: ' + error.message
    });
  }
};

module.exports = {
  googleAuth,
  googleCallback,
  unlinkGoogleAccount,
  getGoogleProfile
};
