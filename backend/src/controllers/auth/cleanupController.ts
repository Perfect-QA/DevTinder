import { Request, Response } from 'express';
import sessionCleanupService from '../../services/sessionCleanupService';
import User from '../../models/user';
import { getSessionExpiryDate, getSessionExpiryMs } from '../../utils/sessionUtils';

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

// Manual cleanup trigger
const triggerCleanup = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔧 Manual session cleanup triggered via API');
    
    const stats = await sessionCleanupService.triggerManualCleanup();
    
    sendSuccessResponse(res, "Session cleanup completed successfully", {
      stats: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error("Manual cleanup error:", error);
    sendErrorResponse(res, 500, "Failed to trigger session cleanup");
  }
};

// Get cleanup statistics
const getCleanupStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = sessionCleanupService.getStats();
    const isRunning = sessionCleanupService.isCleanupRunning();
    
    sendSuccessResponse(res, "Cleanup statistics retrieved successfully", {
      stats: stats,
      isRunning: isRunning,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error("Get cleanup stats error:", error);
    sendErrorResponse(res, 500, "Failed to retrieve cleanup statistics");
  }
};

// Get session statistics for all users
const getSessionStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get total users with sessions
    const totalUsersWithSessions = await User.countDocuments({
      'activeSessions.0': { $exists: true }
    });
    
    // Get total active sessions across all users
    const usersWithSessions = await User.find({
      'activeSessions.0': { $exists: true }
    }).select('activeSessions');
    
    let totalActiveSessions = 0;
    let totalExpiredSessions = 0;
    const now = new Date();
    
    // Get session expiry date from shared utility
    const expiryDate = getSessionExpiryDate();
    
    usersWithSessions.forEach(user => {
      user.activeSessions.forEach(session => {
        const sessionDate = new Date(session.lastActivity);
        if (sessionDate > expiryDate) {
          totalActiveSessions++;
        } else {
          totalExpiredSessions++;
        }
      });
    });
    
    // Get device type breakdown
    const deviceStats = {
      desktop: 0,
      mobile: 0,
      tablet: 0,
      unknown: 0
    };
    
    usersWithSessions.forEach(user => {
      user.activeSessions.forEach(session => {
        const sessionDate = new Date(session.lastActivity);
        if (sessionDate > expiryDate) {
          deviceStats[session.deviceType as keyof typeof deviceStats]++;
        }
      });
    });
    
    sendSuccessResponse(res, "Session statistics retrieved successfully", {
      totalUsersWithSessions,
      totalActiveSessions,
      totalExpiredSessions,
      deviceBreakdown: deviceStats,
      sessionExpiryDays: Math.round(getSessionExpiryMs() / (24 * 60 * 60 * 1000)),
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error("Get session stats error:", error);
    sendErrorResponse(res, 500, "Failed to retrieve session statistics");
  }
};

// Clean up expired sessions for a specific user
const cleanupUserSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as any;
    
    if (!user) {
      sendErrorResponse(res, 401, "User not authenticated");
      return;
    }
    
    const removedCount = user.cleanupExpiredSessions();
    await user.save();
    
    sendSuccessResponse(res, "User sessions cleaned up successfully", {
      removedSessions: removedCount,
      remainingSessions: user.activeSessions.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error("Cleanup user sessions error:", error);
    sendErrorResponse(res, 500, "Failed to cleanup user sessions");
  }
};

export {
  triggerCleanup,
  getCleanupStats,
  getSessionStats,
  cleanupUserSessions
};
