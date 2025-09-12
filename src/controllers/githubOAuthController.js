const passport = require('passport');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// GitHub OAuth Initiation
const githubAuth = (req, res) => {
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
};

// GitHub OAuth Callback
const githubCallback = [
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
      
      // Check if JWT secrets are configured
      if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
        console.error("JWT secrets not configured. Please set JWT_SECRET and JWT_REFRESH_SECRET in .env file");
        return res.redirect((process.env.CLIENT_URL || 'http://localhost:7777') + '/login?error=server_config_error');
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
      res.redirect((process.env.CLIENT_URL || 'http://localhost:7777') + '/dashboard');
    } catch (error) {
      console.error('GitHub OAuth callback error:', error);
      res.redirect((process.env.CLIENT_URL || 'http://localhost:7777') + '/login?error=oauth_failed');
    }
  }
];

// GitHub Account Unlinking
const unlinkGithubAccount = async (req, res) => {
  try {
    const User = require('../models/user');
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }
    
    // Unlink GitHub account
    user.githubId = undefined;
    user.githubAccessToken = undefined;
    user.githubRefreshToken = undefined;
    user.githubTokenExpiry = undefined;
    user.githubProfileUrl = undefined;
    user.githubUsername = undefined;
    
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
    
    // Remove GitHub from linked accounts
    if (user.oauthAccountsLinked) {
      user.oauthAccountsLinked = user.oauthAccountsLinked.filter(provider => provider !== 'github');
    }
    
    await user.save();
    
    res.json({
      success: true,
      message: "GitHub account unlinked successfully",
      user: {
        hasGoogle: !!user.googleId,
        hasGithub: !!user.githubId,
        hasPassword: hasPassword
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to unlink GitHub account: ' + error.message
    });
  }
};

// Get GitHub Profile Info
const getGithubProfile = async (req, res) => {
  try {
    const User = require('../models/user');
    const user = await User.findById(req.userId);
    
    if (!user || !user.githubId) {
      return res.status(404).json({
        success: false,
        error: "GitHub account not linked"
      });
    }
    
    res.json({
      success: true,
      githubProfile: {
        githubId: user.githubId,
        githubUsername: user.githubUsername,
        githubProfileUrl: user.githubProfileUrl,
        oauthScopes: user.oauthScopes,
        oauthConsentDate: user.oauthConsentDate
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch GitHub profile: ' + error.message
    });
  }
};

// Get GitHub Repositories (if access token is available)
const getGithubRepositories = async (req, res) => {
  try {
    const User = require('../models/user');
    const user = await User.findById(req.userId);
    
    if (!user || !user.githubId || !user.githubAccessToken) {
      return res.status(404).json({
        success: false,
        error: "GitHub account not linked or access token not available"
      });
    }
    
    // Note: In a real implementation, you would call GitHub's API here
    // For now, we'll return a placeholder response
    res.json({
      success: true,
      message: "GitHub repositories feature not implemented yet",
      repositories: []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch GitHub repositories: ' + error.message
    });
  }
};

module.exports = {
  githubAuth,
  githubCallback,
  unlinkGithubAccount,
  getGithubProfile,
  getGithubRepositories
};
