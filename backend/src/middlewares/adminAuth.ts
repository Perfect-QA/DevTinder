import { Request, Response, NextFunction } from 'express';
import { IUser } from '../models/user';
import { adminAuditLogger, AdminAuditActions } from './adminAuditLogger';

/**
 * Admin Authentication Middleware
 * Ensures only users with admin privileges can access admin endpoints
 */
export const adminAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Check if user is authenticated (should be set by userAuth middleware)
    const user = req.user as IUser;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please login to access this resource'
      });
      return;
    }
    
    // Check if user has admin privileges
    if (!user.isAdmin && user.role !== 'admin' && user.role !== 'superadmin') {
      res.status(403).json({
        success: false,
        error: 'Admin access required',
        message: 'You do not have permission to access admin resources',
        requiredRole: 'admin',
        userRole: user.role || 'user'
      });
      return;
    }
    
    // Log admin access for audit purposes
    console.log(`🔐 Admin access granted to user: ${user.emailId} (${user.role || 'admin'})`);
    
    // Add admin context to request
    req.adminContext = {
      userId: user._id?.toString() || '',
      userEmail: user.emailId,
      userRole: user.role || 'admin',
      isSuperAdmin: user.role === 'superadmin',
      accessTime: new Date()
    };
    
    next();
  } catch (error) {
    console.error('❌ Admin auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to verify admin access'
    });
  }
};

/**
 * Permission-Based Admin Authentication Middleware
 * Checks specific permissions for admin actions
 */
export const adminAuthWithPermissions = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = req.user as IUser;
      
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }
      
      // Check admin privileges
      if (!user.isAdmin && user.role !== 'admin' && user.role !== 'superadmin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
          message: 'You do not have admin privileges'
        });
        return;
      }
      
      // Check specific permissions
      const userPermissions = user.permissions || [];
      const hasRequiredPermissions = requiredPermissions.every(permission => 
        userPermissions.includes(permission) || user.role === 'superadmin'
      );
      
      if (!hasRequiredPermissions) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          message: 'You do not have the required permissions for this action',
          requiredPermissions,
          userPermissions
        });
        return;
      }
      
      // Add permission context to request
      req.adminContext = {
        userId: user._id?.toString() || '',
        userEmail: user.emailId,
        userRole: user.role || 'admin',
        isSuperAdmin: user.role === 'superadmin',
        accessTime: new Date(),
        permissions: userPermissions
      };
      
      next();
    } catch (error) {
      console.error('❌ Permission-based admin auth error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
};

/**
 * Super Admin Only Middleware
 * Restricts access to super admins only
 */
export const superAdminOnly = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const user = req.user as IUser;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }
    
    if (user.role !== 'superadmin') {
      res.status(403).json({
        success: false,
        error: 'Super admin access required',
        message: 'Only super administrators can access this resource',
        requiredRole: 'superadmin',
        userRole: user.role || 'user'
      });
      return;
    }
    
    console.log(`🔐 Super admin access granted to user: ${user.emailId}`);
    
    req.adminContext = {
      userId: user._id?.toString() || '',
      userEmail: user.emailId,
      userRole: user.role,
      isSuperAdmin: true,
      accessTime: new Date()
    };
    
    next();
  } catch (error) {
    console.error('❌ Super admin auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Admin Authentication with Audit Logging
 * Combines admin auth with audit logging
 */
export const adminAuthWithAudit = (auditAction: any) => {
  return [
    adminAuth,
    adminAuditLogger(auditAction)
  ];
};

/**
 * Permission-Based Admin Auth with Audit Logging
 * Combines permission checking with audit logging
 */
export const adminAuthWithPermissionsAndAudit = (requiredPermissions: string[], auditAction: any) => {
  return [
    adminAuthWithPermissions(requiredPermissions),
    adminAuditLogger(auditAction)
  ];
};

/**
 * Super Admin Authentication Middleware
 * Ensures only super admins can access critical admin functions
 */
export const superAdminAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const user = req.user as IUser;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }
    
    if (user.role !== 'superadmin') {
      res.status(403).json({
        success: false,
        error: 'Super admin access required',
        message: 'Only super administrators can access this resource',
        requiredRole: 'superadmin',
        userRole: user.role || 'user'
      });
      return;
    }
    
    console.log(`🔐 Super admin access granted to user: ${user.emailId}`);
    
    req.adminContext = {
      userId: user._id?.toString() || '',
      userEmail: user.emailId,
      userRole: user.role,
      isSuperAdmin: true,
      accessTime: new Date()
    };
    
    next();
  } catch (error) {
    console.error('❌ Super admin auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Admin Role Checker Utility
 * Helper function to check if user has admin privileges
 */
export const isAdmin = (user: IUser): boolean => {
  return user.isAdmin || user.role === 'admin' || user.role === 'superadmin';
};

/**
 * Super Admin Role Checker Utility
 * Helper function to check if user has super admin privileges
 */
export const isSuperAdmin = (user: IUser): boolean => {
  return user.role === 'superadmin';
};

// Extend Request interface to include admin context
declare global {
  namespace Express {
    interface Request {
      adminContext?: {
        userId: string;
        userEmail: string;
        userRole: string;
        isSuperAdmin: boolean;
        accessTime: Date;
        permissions?: string[];
      };
    }
  }
}
