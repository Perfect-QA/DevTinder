// Import Google and GitHub OAuth controllers
const {
  googleAuth,
  googleCallback,
  unlinkGoogleAccount,
  getGoogleProfile
} = require('./googleOAuthController');

const {
  githubAuth,
  githubCallback,
  unlinkGithubAccount,
  getGithubProfile,
  getGithubRepositories
} = require('./githubOAuthController');

// Generic Account Unlinking (for backward compatibility)
const unlinkAccount = async (req, res) => {
  const { provider } = req.params;
  
  if (provider === 'google') {
    return unlinkGoogleAccount(req, res);
  } else if (provider === 'github') {
    return unlinkGithubAccount(req, res);
  } else {
    return res.status(400).json({
      success: false,
      error: "Invalid provider. Must be 'google' or 'github'"
    });
  }
};

// Get OAuth Status
const getOAuthStatus = async (req, res) => {
  try {
    const User = require('../models/user');
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }
    
    res.json({
      success: true,
      oauthStatus: {
        hasGoogle: !!user.googleId,
        hasGithub: !!user.githubId,
        linkedProviders: user.oauthAccountsLinked || [],
        lastOAuthProvider: user.lastOAuthProvider
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch OAuth status: ' + error.message
    });
  }
};

module.exports = {
  // Google OAuth
  googleAuth,
  googleCallback,
  unlinkGoogleAccount,
  getGoogleProfile,
  
  // GitHub OAuth
  githubAuth,
  githubCallback,
  unlinkGithubAccount,
  getGithubProfile,
  getGithubRepositories,
  
  // Generic OAuth
  unlinkAccount,
  getOAuthStatus
};
