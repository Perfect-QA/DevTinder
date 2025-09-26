import { Request, Response, NextFunction } from 'express';
import AdminAuditLog from '../models/adminAuditLog';
import { IUser } from '../models/user';

interface AuditLogData {
  action: string;
  resource: string;
  resourceId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'user_management' | 'data_access' | 'system_config' | 'security' | 'api_usage';
  changes?: any;
  previousValues?: any;
  newValues?: any;
  tags?: string[];
  metadata?: any;
}

/**
 * Admin Audit Logger Middleware
 * Logs all admin actions for security and compliance purposes
 */
export const adminAuditLogger = (auditData: AuditLogData) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const originalSend = res.send;

    // Override res.send to capture response data
    res.send = function(body: any) {
      const responseTime = Date.now() - startTime;
      
      // Log the audit entry asynchronously
      logAdminActionFromMiddleware(req, res, auditData, responseTime, body).catch((error: any) => {
        console.error('❌ Failed to log admin action:', error);
      });
      
      return originalSend.call(this, body);
    };

    next();
  };
};

/**
 * Log Admin Action Directly
 * Direct method to log admin actions without middleware
 */
export const logAdminAction = async (auditData: {
  adminId: string;
  adminEmail: string;
  action: string;
  resource: string;
  details?: any;
}) => {
  try {
    const auditLog = new AdminAuditLog({
      adminId: auditData.adminId,
      adminEmail: auditData.adminEmail,
      action: auditData.action,
      resource: auditData.resource,
      severity: 'medium',
      category: 'user_management',
      changes: auditData.details,
      ipAddress: '127.0.0.1', // Default IP for direct calls
      userAgent: 'Admin System',
      timestamp: new Date()
    });

    await auditLog.save();
    console.log(`📝 Admin action logged: ${auditData.action} by ${auditData.adminEmail}`);
  } catch (error) {
    console.error('❌ Failed to log admin action:', error);
  }
};

/**
 * Log Admin Action From Middleware
 * Creates audit log entry for admin actions from middleware context
 */
async function logAdminActionFromMiddleware(
  req: Request, 
  res: Response, 
  auditData: AuditLogData, 
  responseTime: number, 
  responseBody: any
): Promise<void> {
  try {
    const user = req.user as IUser;
    const adminContext = req.adminContext;

    if (!user || !adminContext) {
      console.warn('⚠️ No user or admin context found for audit logging');
      return;
    }

    // Determine risk level based on action and response
    const riskLevel = determineRiskLevel(auditData, res.statusCode, responseTime);

    // Get device information from session
    const session = user.activeSessions?.find(s => s.isActive);
    const deviceInfo = session ? {
      deviceType: session.deviceType,
      deviceName: session.deviceName,
      location: session.location
    } : undefined;

    // Create audit log entry
    const auditLog = new AdminAuditLog({
      adminId: user._id?.toString() || '',
      adminEmail: user.emailId,
      adminRole: user.role as 'admin' | 'superadmin',
      action: auditData.action,
      resource: auditData.resource,
      resourceId: auditData.resourceId,
      details: {
        method: req.method,
        endpoint: req.originalUrl,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        requestBody: sanitizeRequestBody(req.body),
        responseStatus: res.statusCode,
        responseTime,
        changes: auditData.changes,
        previousValues: auditData.previousValues,
        newValues: auditData.newValues
      },
      severity: auditData.severity,
      category: auditData.category,
      sessionId: session?.sessionId,
      deviceInfo,
      riskLevel,
      tags: auditData.tags || [],
      metadata: {
        ...auditData.metadata,
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer'),
        origin: req.get('Origin')
      }
    });

    await auditLog.save();

    // Log high-risk actions to console
    if (riskLevel === 'high_risk' || auditData.severity === 'critical') {
      console.warn(`🚨 HIGH RISK ADMIN ACTION: ${user.emailId} - ${auditData.action} on ${auditData.resource}`);
    }

  } catch (error) {
    console.error('❌ Failed to create audit log:', error);
  }
}

/**
 * Determine Risk Level
 * Analyzes the action and response to determine risk level
 */
function determineRiskLevel(
  auditData: AuditLogData, 
  statusCode: number, 
  responseTime: number
): 'safe' | 'suspicious' | 'high_risk' {
  // High risk indicators
  if (statusCode >= 500) return 'high_risk';
  if (auditData.severity === 'critical') return 'high_risk';
  if (auditData.category === 'security' && auditData.severity === 'high') return 'high_risk';
  if (responseTime > 10000) return 'suspicious'; // Very slow response

  // Suspicious indicators
  if (statusCode >= 400) return 'suspicious';
  if (auditData.severity === 'high') return 'suspicious';
  if (auditData.category === 'authentication') return 'suspicious';

  return 'safe';
}

/**
 * Sanitize Request Body
 * Removes sensitive information from request body for logging
 */
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') return body;

  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Predefined Audit Actions
 * Common admin actions with predefined audit data
 */
export const AdminAuditActions = {
  // Authentication actions
  LOGIN: {
    action: 'admin_login',
    resource: 'authentication',
    severity: 'medium' as const,
    category: 'authentication' as const,
    tags: ['login', 'security']
  },
  
  LOGOUT: {
    action: 'admin_logout',
    resource: 'authentication',
    severity: 'low' as const,
    category: 'authentication' as const,
    tags: ['logout']
  },

  // User management actions
  CREATE_USER: {
    action: 'create_user',
    resource: 'user_management',
    severity: 'medium' as const,
    category: 'user_management' as const,
    tags: ['user', 'create']
  },

  UPDATE_USER: {
    action: 'update_user',
    resource: 'user_management',
    severity: 'medium' as const,
    category: 'user_management' as const,
    tags: ['user', 'update']
  },

  DELETE_USER: {
    action: 'delete_user',
    resource: 'user_management',
    severity: 'high' as const,
    category: 'user_management' as const,
    tags: ['user', 'delete']
  },

  PROMOTE_USER: {
    action: 'promote_user',
    resource: 'user_management',
    severity: 'high' as const,
    category: 'user_management' as const,
    tags: ['user', 'promote', 'admin']
  },

  // Data access actions
  VIEW_SENSITIVE_DATA: {
    action: 'view_sensitive_data',
    resource: 'data_access',
    severity: 'medium' as const,
    category: 'data_access' as const,
    tags: ['data', 'view', 'sensitive']
  },

  EXPORT_DATA: {
    action: 'export_data',
    resource: 'data_access',
    severity: 'high' as const,
    category: 'data_access' as const,
    tags: ['data', 'export']
  },

  // System configuration
  UPDATE_CONFIG: {
    action: 'update_config',
    resource: 'system_config',
    severity: 'high' as const,
    category: 'system_config' as const,
    tags: ['config', 'system']
  },

  // Security actions
  SECURITY_ALERT: {
    action: 'security_alert',
    resource: 'security',
    severity: 'critical' as const,
    category: 'security' as const,
    tags: ['security', 'alert']
  },

  // API usage monitoring
  API_ACCESS: {
    action: 'api_access',
    resource: 'api_usage',
    severity: 'low' as const,
    category: 'api_usage' as const,
    tags: ['api', 'access']
  },

  // Admin management actions
  CREATE_ADMIN: {
    action: 'create_admin',
    resource: 'admin_management',
    severity: 'high' as const,
    category: 'user_management' as const,
    tags: ['admin', 'create']
  },

  UPDATE_PERMISSIONS: {
    action: 'update_permissions',
    resource: 'admin_management',
    severity: 'high' as const,
    category: 'user_management' as const,
    tags: ['admin', 'permissions', 'update']
  },

  REMOVE_ADMIN: {
    action: 'remove_admin',
    resource: 'admin_management',
    severity: 'critical' as const,
    category: 'user_management' as const,
    tags: ['admin', 'remove']
  }
};

/**
 * Audit Log Query Helper
 * Helper functions for querying audit logs
 */
export class AuditLogQuery {
  static async getAdminActions(adminId: string, limit: number = 50) {
    return AdminAuditLog.find({ adminId })
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  static async getHighRiskActions(limit: number = 20) {
    return AdminAuditLog.find({ riskLevel: 'high_risk' })
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  static async getActionsByCategory(category: string, limit: number = 50) {
    return AdminAuditLog.find({ category })
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  static async getActionsBySeverity(severity: string, limit: number = 50) {
    return AdminAuditLog.find({ severity })
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  static async getRecentActions(hours: number = 24, limit: number = 100) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return AdminAuditLog.find({ timestamp: { $gte: since } })
      .sort({ timestamp: -1 })
      .limit(limit);
  }
}
