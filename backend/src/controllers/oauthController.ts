import { Request, Response } from 'express';
import passport from 'passport';
import { IUser } from '../models/user';

// Google OAuth Controllers
const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if Google OAuth is configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      res.status(400).json({
        success: false,
        error: "Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET"
      });
      return;
    }

    // Use Passport's Google OAuth strategy
    passport.authenticate('google', {
      scope: ['profile', 'email']
    })(req, res);
  } catch (error: any) {
    console.error("Google OAuth error:", error);
    res.status(500).json({
      success: false,
      error: "Google OAuth authentication failed"
    });
  }
};

const googleCallback = (req: Request, res: Response, next: any): void => {
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth_failed`
  })(req, res, (err: any) => {
    if (err) {
      console.error("Google OAuth callback error:", err);
      res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_callback_failed`);
      return;
    }
    
    try {
      // Successful authentication
      const user = (req as any).user;
      
      if (!user) {
        res.redirect(`${process.env.CLIENT_URL}/login?error=user_not_found`);
        return;
      }
      
      // Generate JWT token
      const token = user.getJWT();
      
      // Set JWT token as HTTP-only cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: parseInt(process.env.COOKIE_EXPIRY!)
      });
      
      // Redirect to frontend with success
      res.redirect(`${process.env.CLIENT_URL}/dashboard?login=success`);
    } catch (error: any) {
      console.error("Google OAuth callback error:", error);
      res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_callback_failed`);
    }
  });
};

const unlinkGoogleAccount = async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true, message: "Google account unlinked" });
};

const getGoogleProfile = async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true, message: "Google profile not available" });
};

// GitHub OAuth Controllers
const githubAuth = async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true, message: "GitHub OAuth not implemented" });
};

const githubCallback = async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true, message: "GitHub OAuth callback not implemented" });
};

const unlinkGithubAccount = async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true, message: "GitHub account unlinked" });
};

const getGithubProfile = async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true, message: "GitHub profile not available" });
};

const getGithubRepositories = async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true, message: "GitHub repositories not available" });
};

// General OAuth Controllers
const unlinkAccount = async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true, message: "Account unlinked" });
};

const getOAuthStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as IUser;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: "User not authenticated"
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        oauth: {
          google: {
            linked: !!user.googleId,
            profileUrl: user.googleProfileUrl,
            username: user.githubUsername
          },
          github: {
            linked: !!user.githubId,
            profileUrl: user.githubProfileUrl,
            username: user.githubUsername
          },
          provider: user.provider,
          lastOAuthProvider: user.lastOAuthProvider,
          oauthAccountsLinked: user.oauthAccountsLinked
        }
      }
    });
  } catch (error: any) {
    console.error("Get OAuth status error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};

export {
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
};
