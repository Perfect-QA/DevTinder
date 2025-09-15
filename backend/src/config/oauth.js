const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/user');
const crypto = require('crypto');
require('dotenv').config();

// OAuth provider validation
const validateOAuthProfile = (profile, provider) => {
  if (!profile || !profile.id) {
    throw new Error(`Invalid ${provider} profile`);
  }
  
  if (provider === 'google' && !profile.emails?.[0]?.value) {
    throw new Error('Google profile missing email');
  }
  
  if (provider === 'github' && !profile.username) {
    throw new Error('GitHub profile missing username');
  }
  
  return true;
};

// DRY: Common OAuth user update logic
const updateOAuthUserTokens = (user, provider, accessToken, refreshToken) => {
  if (refreshToken) {
    user[`${provider}RefreshToken`] = refreshToken;
  }
  if (accessToken) {
    user[`${provider}AccessToken`] = accessToken;
    user[`${provider}TokenExpiry`] = new Date(Date.now() + 3600 * 1000); // 1 hour
  }
  user.lastOAuthProvider = provider;
  return user;
};

// DRY: Common OAuth account linking logic
const linkOAuthAccount = (user, provider, profile, accessToken, refreshToken) => {
  user[`${provider}Id`] = profile.id;
  user.provider = provider;
  
  // Update tokens
  updateOAuthUserTokens(user, provider, accessToken, refreshToken);
  
  // Provider-specific profile data
  if (provider === 'google') {
    user.googleProfileUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : null;
    user.oauthScopes = ['profile', 'email'];
    user.isEmailVerified = true; // Google emails are verified
  } else if (provider === 'github') {
    user.githubProfileUrl = profile.profileUrl;
    user.githubUsername = profile.username;
    user.oauthScopes = ['user:email'];
    const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
    user.isEmailVerified = email ? true : false;
  }
  
  user.oauthConsentDate = new Date();
  if (!user.oauthAccountsLinked.includes(provider)) {
    user.oauthAccountsLinked.push(provider);
  }
  
  return user;
};

// DRY: Common OAuth user creation logic
const createOAuthUser = (provider, profile, accessToken, refreshToken) => {
  const baseUser = {
    [`${provider}Id`]: profile.id,
    provider: provider,
    [`${provider}RefreshToken`]: refreshToken,
    [`${provider}AccessToken`]: accessToken,
    [`${provider}TokenExpiry`]: new Date(Date.now() + 3600 * 1000),
    oauthScopes: provider === 'google' ? ['profile', 'email'] : ['user:email'],
    oauthConsentDate: new Date(),
    oauthAccountsLinked: [provider],
    lastOAuthProvider: provider,
    password: crypto.randomBytes(32).toString('hex')
  };

  if (provider === 'google') {
    return new User({
      ...baseUser,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      emailId: profile.emails[0].value,
      googleProfileUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
      isEmailVerified: true
    });
  } else if (provider === 'github') {
    const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
    return new User({
      ...baseUser,
      firstName: profile.displayName ? profile.displayName.split(' ')[0] : profile.username,
      lastName: profile.displayName && profile.displayName.split(' ').length > 1 ? 
                profile.displayName.split(' ').slice(1).join(' ') : '',
      emailId: email || `${profile.username}@github.local`,
      githubProfileUrl: profile.profileUrl,
      githubUsername: profile.username,
      isEmailVerified: email ? true : false
    });
  }
};

// Only initialize OAuth strategies if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    // Google OAuth Strategy
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback",
        accessType: 'offline', // Request refresh token
        prompt: 'consent' // Force consent screen
    }, async (accessToken, refreshToken, profile, done) => {
    try {
        // Validate OAuth profile
        validateOAuthProfile(profile, 'google');
        
        // Check if user already exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });
        
        if (user) {
            // Update tokens and tracking
            updateOAuthUserTokens(user, 'google', accessToken, refreshToken);
            await user.save();
            return done(null, user);
        }
        
        // Check if user exists with same email
        user = await User.findOne({ emailId: profile.emails[0].value });
        
        if (user) {
            // Link Google account to existing user
            linkOAuthAccount(user, 'google', profile, accessToken, refreshToken);
            await user.save();
            return done(null, user);
        }
        
        // Create new user
        user = createOAuthUser('google', profile, accessToken, refreshToken);
        await user.save();
        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
    }));
} else {
    console.log('Google OAuth credentials not provided. Google login will be disabled.');
}

// GitHub OAuth Strategy
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL || "/auth/github/callback"
    }, async (accessToken, refreshToken, profile, done) => {
    try {
        // Validate OAuth profile
        validateOAuthProfile(profile, 'github');
        
        // Check if user already exists with this GitHub ID
        let user = await User.findOne({ githubId: profile.id });
        
        if (user) {
            // Update tokens and tracking
            updateOAuthUserTokens(user, 'github', accessToken, refreshToken);
            await user.save();
            return done(null, user);
        }
        
        // Check if user exists with same email
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        if (email) {
            user = await User.findOne({ emailId: email });
            
            if (user) {
                // Link GitHub account to existing user
                linkOAuthAccount(user, 'github', profile, accessToken, refreshToken);
                await user.save();
                return done(null, user);
            }
        }
        
        // Create new user
        user = createOAuthUser('github', profile, accessToken, refreshToken);
        await user.save();
        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
    }));
} else {
    console.log('GitHub OAuth credentials not provided. GitHub login will be disabled.');
}

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;
