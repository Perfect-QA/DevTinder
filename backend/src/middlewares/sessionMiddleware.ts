import { Request, Response, NextFunction } from 'express';
import User from '../models/user';

// Session activity tracking middleware
export const trackSessionActivity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Only track for authenticated users
    if (req.user) {
      const user = req.user as any;
      const sessionId = req.headers['x-session-id'] as string;
      
      if (sessionId) {
        // Update session activity
        user.updateSessionActivity(sessionId);
        await user.save();
      }
    }
    
    next();
  } catch (error) {
    // Don't block the request if session tracking fails
    console.error('Session tracking error:', error);
    next();
  }
};

// Session validation middleware
export const validateSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user) {
      const user = req.user as any;
      const sessionId = req.headers['x-session-id'] as string;
      
      if (sessionId) {
        const session = user.getSessionById(sessionId);
        
        if (!session || !session.isActive) {
          res.status(401).json({
            success: false,
            error: 'Session expired or invalid'
          });
          return;
        }
        
        // Check if session is too old (optional - 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        if (session.lastActivity < thirtyDaysAgo) {
          // Remove expired session
          user.removeSession(sessionId);
          await user.save();
          
          res.status(401).json({
            success: false,
            error: 'Session expired due to inactivity'
          });
          return;
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Session validation error:', error);
    next();
  }
};

// Clean up inactive sessions (can be called periodically)
export const cleanupInactiveSessions = async (): Promise<void> => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Find users with inactive sessions
    const users = await User.find({
      'activeSessions.lastActivity': { $lt: thirtyDaysAgo }
    });
    
    for (const user of users) {
      const originalLength = user.activeSessions.length;
      user.activeSessions = user.activeSessions.filter(session => 
        session.lastActivity >= thirtyDaysAgo
      );
      
      if (user.activeSessions.length !== originalLength) {
        await user.save();
        console.log(`Cleaned up ${originalLength - user.activeSessions.length} inactive sessions for user ${user.emailId}`);
      }
    }
  } catch (error) {
    console.error('Session cleanup error:', error);
  }
};
