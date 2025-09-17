import { Request, Response } from 'express';
import User from '../../models/user';
import crypto from 'crypto';

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

// Get all active sessions for the user
const getActiveSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as any;
    
    if (!user) {
      sendErrorResponse(res, 401, "User not authenticated");
      return;
    }
    
    const activeSessions = user.getActiveSessions();
    
    // Add current session indicator
    const currentSessionId = req.headers['x-session-id'] as string;
    const sessionsWithCurrent = activeSessions.map((session: any) => ({
      ...session,
      isCurrentSession: session.sessionId === currentSessionId
    }));
    
    sendSuccessResponse(res, "Active sessions retrieved successfully", {
      sessions: sessionsWithCurrent,
      totalSessions: sessionsWithCurrent.length
    });
    
  } catch (error: any) {
    console.error("Get active sessions error:", error);
    sendErrorResponse(res, 500, "Internal server error");
  }
};

// Remove a specific session
const removeSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as any;
    const { sessionId } = req.params;
    
    if (!user) {
      sendErrorResponse(res, 401, "User not authenticated");
      return;
    }
    
    if (!sessionId) {
      sendErrorResponse(res, 400, "Session ID is required");
      return;
    }
    
    // Check if session exists
    const session = user.getSessionById(sessionId);
    if (!session) {
      sendErrorResponse(res, 404, "Session not found");
      return;
    }
    
    // Remove session
    user.removeSession(sessionId);
    await user.save();
    
    console.log(`Session ${sessionId} removed for user ${user.emailId}`);
    
    sendSuccessResponse(res, "Session removed successfully", {
      removedSessionId: sessionId
    });
    
  } catch (error: any) {
    console.error("Remove session error:", error);
    sendErrorResponse(res, 500, "Internal server error");
  }
};

// Remove all sessions (logout from all devices)
const removeAllSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as any;
    
    if (!user) {
      sendErrorResponse(res, 401, "User not authenticated");
      return;
    }
    
    const sessionCount = user.activeSessions.length;
    
    // Clear all sessions
    user.removeAllSessions();
    await user.save();
    
    console.log(`All sessions (${sessionCount}) removed for user ${user.emailId}`);
    
    sendSuccessResponse(res, "All sessions removed successfully", {
      removedSessionCount: sessionCount
    });
    
  } catch (error: any) {
    console.error("Remove all sessions error:", error);
    sendErrorResponse(res, 500, "Internal server error");
  }
};

// Get session statistics
const getSessionStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as any;
    
    if (!user) {
      sendErrorResponse(res, 401, "User not authenticated");
      return;
    }
    
    const activeSessions = user.getActiveSessions();
    const totalSessions = user.activeSessions.length;
    const inactiveSessions = totalSessions - activeSessions.length;
    
    // Get unique IP addresses
    const uniqueIPs = [...new Set(user.activeSessions.map((s: any) => s.ipAddress))];
    
    // Get device type statistics
    const deviceTypes = user.activeSessions.reduce((acc: any, session: any) => {
      acc[session.deviceType] = (acc[session.deviceType] || 0) + 1;
      return acc;
    }, {});
    
    // Get recent activity (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivity = user.activeSessions.filter((s: any) => s.lastActivity > oneDayAgo).length;
    
    sendSuccessResponse(res, "Session statistics retrieved successfully", {
      stats: {
        totalSessions,
        activeSessions: activeSessions.length,
        inactiveSessions,
        uniqueIPs: uniqueIPs.length,
        deviceTypes,
        recentActivity
      }
    });
    
  } catch (error: any) {
    console.error("Get session stats error:", error);
    sendErrorResponse(res, 500, "Internal server error");
  }
};

// Update session activity (called on each request)
const updateSessionActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as any;
    const sessionId = req.headers['x-session-id'] as string;
    
    if (!user || !sessionId) {
      sendErrorResponse(res, 401, "User not authenticated or session ID missing");
      return;
    }
    
    // Update session activity
    user.updateSessionActivity(sessionId);
    await user.save();
    
    sendSuccessResponse(res, "Session activity updated", {
      sessionId,
      lastActivity: new Date()
    });
    
  } catch (error: any) {
    console.error("Update session activity error:", error);
    sendErrorResponse(res, 500, "Internal server error");
  }
};

// Generate a new session ID
const generateSessionId = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export {
  getActiveSessions,
  removeSession,
  removeAllSessions,
  getSessionStats,
  updateSessionActivity,
  generateSessionId
};
