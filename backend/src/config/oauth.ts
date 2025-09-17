import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import User, { IUser } from '../models/user';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// OAuth provider validation
const validateOAuthProfile = (profile: any, provider: string): boolean => {
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
const updateOAuthUserTokens = (user: any, provider: string, accessToken: string, refreshToken?: string): any => {
  if (refreshToken) {
    (user as any)[`${provider}RefreshToken`] = refreshToken;
  }
  if (accessToken) {
    (user as any)[`${provider}AccessToken`] = accessToken;
    (user as any)[`${provider}TokenExpiry`] = new Date(Date.now() + 3600 * 1000); // 1 hour
  }
  user.lastOAuthProvider = provider as 'google' | 'github' | 'local';
  return user;
};

// DRY: Common OAuth account linking logic
const linkOAuthAccount = (user: any, provider: string, profile: any, accessToken: string, refreshToken?: string): any => {
  (user as any)[`${provider}Id`] = profile.id;
  user.provider = provider as 'google' | 'github' | 'local';
  
  // Update tokens
  updateOAuthUserTokens(user, provider, accessToken, refreshToken);
  
  // Provider-specific profile data
  if (provider === 'google') {
    user.googleProfileUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : undefined;
    user.oauthScopes = ['profile', 'email'];
    user.isEmailVerified = true; // Google emails are verified
  } else if (provider === 'github') {
    user.githubProfileUrl = profile.profileUrl;
    user.githubUsername = profile.username;
    user.oauthScopes = ['user:email'];
    user.isEmailVerified = false; // GitHub emails need verification
  }
  
  // Update OAuth account linking status
  if (!user.oauthAccountsLinked.includes(provider)) {
    user.oauthAccountsLinked.push(provider);
  }
  
  user.oauthConsentDate = new Date();
  return user;
};

// DRY: Common OAuth user creation logic
const createOAuthUser = (provider: string, profile: any, accessToken: string, refreshToken?: string): any => {
  const userData: Partial<IUser> = {
    provider: provider as 'google' | 'github' | 'local',
    isEmailVerified: provider === 'google',
    oauthScopes: provider === 'google' ? ['profile', 'email'] : ['user:email'],
    oauthConsentDate: new Date(),
    oauthAccountsLinked: [provider],
    lastOAuthProvider: provider as 'google' | 'github' | 'local'
  };
  
  if (provider === 'google') {
    userData.firstName = profile.name?.givenName || 'Google';
    userData.lastName = profile.name?.familyName || 'User';
    userData.emailId = profile.emails[0].value;
    userData.googleId = profile.id;
    userData.googleProfileUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : undefined;
    userData.password = crypto.randomBytes(32).toString('hex'); // Random password for OAuth users
  } else if (provider === 'github') {
    userData.firstName = profile.displayName || profile.username || 'GitHub';
    userData.lastName = 'User';
    userData.emailId = profile.emails?.[0]?.value || `${profile.username}@github.local`;
    userData.githubId = profile.id;
    userData.githubProfileUrl = profile.profileUrl;
    userData.githubUsername = profile.username;
    userData.password = crypto.randomBytes(32).toString('hex'); // Random password for OAuth users
  }
  
  // Update tokens
  if (refreshToken) {
    (userData as any)[`${provider}RefreshToken`] = refreshToken;
  }
  if (accessToken) {
    (userData as any)[`${provider}AccessToken`] = accessToken;
    (userData as any)[`${provider}TokenExpiry`] = new Date(Date.now() + 3600 * 1000);
  }
  
  return new User(userData);
};

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
    try {
      validateOAuthProfile(profile, 'google');
      
      // Check if user already exists with this Google ID
      let user = await User.findOne({ googleId: profile.id });
      
      if (user) {
        // Update existing user's tokens and last login
        user = updateOAuthUserTokens(user, 'google', accessToken, refreshToken);
        if (user) {
          user.lastLogin = new Date();
          await user.save();
        }
        return done(null, user);
      }
      
      // Check if user exists with same email
      user = await User.findOne({ emailId: profile.emails[0].value });
      
      if (user) {
        // Link Google account to existing user
        user = linkOAuthAccount(user, 'google', profile, accessToken, refreshToken);
        if (user) {
          user.lastLogin = new Date();
          await user.save();
        }
        return done(null, user);
      }
      
      // Create new user
      user = createOAuthUser('google', profile, accessToken, refreshToken);
      if (user) {
        user.lastLogin = new Date();
        await user.save();
      }
      
      return done(null, user);
    } catch (error) {
      console.error('Google OAuth error:', error);
      return done(error, null);
    }
  }));
} else {
  console.log('Google OAuth credentials not provided. Google login will be disabled.');
}

// GitHub OAuth Strategy
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET && process.env.GITHUB_CALLBACK_URL) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL
  }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
    try {
      validateOAuthProfile(profile, 'github');
      
      // Check if user already exists with this GitHub ID
      let user = await User.findOne({ githubId: profile.id });
      
      if (user) {
        // Update existing user's tokens and last login
        user = updateOAuthUserTokens(user, 'github', accessToken, refreshToken);
        if (user) {
          user.lastLogin = new Date();
          await user.save();
        }
        return done(null, user);
      }
      
      // Check if user exists with same email (if available)
      if (profile.emails && profile.emails[0]) {
        user = await User.findOne({ emailId: profile.emails[0].value });
        
        if (user) {
          // Link GitHub account to existing user
          user = linkOAuthAccount(user, 'github', profile, accessToken, refreshToken);
          if (user) {
            user.lastLogin = new Date();
            await user.save();
          }
          return done(null, user);
        }
      }
      
      // Create new user
      user = createOAuthUser('github', profile, accessToken, refreshToken);
      if (user) {
        user.lastLogin = new Date();
        await user.save();
      }
      
      return done(null, user);
    } catch (error) {
      console.error('GitHub OAuth error:', error);
      return done(error, null);
    }
  }));
} else {
  console.log('GitHub OAuth credentials not provided. GitHub login will be disabled.');
}

// Serialize user for session
passport.serializeUser((user: any, done: any) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done: any) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
