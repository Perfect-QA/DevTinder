import jwt from 'jsonwebtoken';
import User, { IUser } from "../models/user";
import AdminUser, { IAdminUser } from "../models/adminUser";
import { Request, Response, NextFunction } from 'express';

interface JwtPayload {
  userId: string;
  role?: string;
  isAdmin?: boolean;
  permissions?: string[];
}

interface AuthenticatedUser {
  // Common fields for both user types
  _id: any;
  firstName: string;
  lastName: string;
  emailId: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Admin-specific fields
  isAdminUser?: boolean;
  adminUser?: IAdminUser;
  
  // Regular user fields (only present for regular users)
  password?: string;
  age?: number;
  gender?: string;
  photoUrl?: string;
  about?: string;
  failedLoginAttempts?: number;
  isLocked?: boolean;
  lockUntil?: Date;
  lastLogin?: Date;
  loginIP?: string;
  loginCount?: number;
  resetPasswordToken?: string;
  resetPasswordExpiry?: Date;
  refreshToken?: string;
  refreshTokenExpiry?: Date;
  activeSessions?: Array<{
    sessionId: string;
    deviceId: string;
    deviceName: string;
    deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
    userAgent: string;
    ipAddress: string;
    location?: string;
    lastActivity: Date;
    createdAt: Date;
    isActive: boolean;
  }>;
  googleId?: string;
  githubId?: string;
  provider?: 'local' | 'google' | 'github';
  googleRefreshToken?: string;
  githubRefreshToken?: string;
  googleAccessToken?: string;
  githubAccessToken?: string;
  googleTokenExpiry?: Date;
  githubTokenExpiry?: Date;
  googleProfileUrl?: string;
  githubProfileUrl?: string;
  githubUsername?: string;
  oauthScopes?: string[];
  oauthConsentDate?: Date;
  isEmailVerified?: boolean;
  emailVerificationToken?: string;
  emailVerificationExpiry?: Date;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  oauthAccountsLinked?: string[];
  lastOAuthProvider?: 'google' | 'github' | 'local';
  role?: 'user' | 'admin' | 'superadmin';
  isAdmin?: boolean;
  permissions?: string[];
  lastAdminAction?: Date;
}

/**
 * Enhanced Authentication Middleware
 * Handles both regular users and admin users
 * Supports role-based access control
 */
const enhancedAuth = async (req: any, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Read the token from cookies or Authorization header
    let token = req.cookies?.token;
    
    // Also check Authorization header for Bearer token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please provide a valid token'
      });
      return;
    }
    
    let decodedObj: JwtPayload;
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        res.status(500).json({
          success: false,
          error: 'Server configuration error',
          message: 'JWT secret not configured'
        });
        return;
      }
      decodedObj = jwt.verify(token, jwtSecret) as JwtPayload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        res.status(401).json({
          success: false,
          error: 'Token expired',
          message: 'Please login again'
        });
        return;
      } else if (error.name === 'JsonWebTokenError') {
        res.status(401).json({
          success: false,
          error: 'Invalid token',
          message: 'Please provide a valid token'
        });
        return;
      } else {
        res.status(401).json({
          success: false,
          error: 'Token verification failed',
          message: 'Token verification failed'
        });
        return;
      }
    }
    
    if (!decodedObj || !decodedObj.userId) {
      res.status(401).json({
        success: false,
        error: 'Invalid token payload',
        message: 'Token does not contain valid user information'
      });
      return;
    }
    
    const { userId } = decodedObj;
    
    // First, try to find user in admin_users collection
    let adminUser = await AdminUser.findById(userId);
    let user: AuthenticatedUser | null = null;
    
    if (adminUser && adminUser.isActive) {
      // User is an admin user
      const adminUserObj = adminUser.toObject();
      user = {
        _id: adminUserObj._id,
        firstName: adminUserObj.firstName,
        lastName: adminUserObj.lastName,
        emailId: adminUserObj.emailId,
        createdAt: adminUserObj.createdAt,
        updatedAt: adminUserObj.updatedAt,
        isAdminUser: true,
        adminUser: adminUser,
        // Include admin-specific fields
        role: adminUserObj.role,
        isAdmin: true,
        permissions: adminUserObj.permissions,
        lastAdminAction: adminUserObj.lastAdminAction
      } as AuthenticatedUser;
      
      console.log(`🔐 Admin user authenticated: ${adminUser.emailId} (${adminUser.role})`);
    } else {
      // Try to find user in regular users collection
      const regularUser = await User.findById(userId);
      if (regularUser) {
        const regularUserObj = regularUser.toObject();
        user = {
          ...regularUserObj,
          isAdminUser: false
        } as AuthenticatedUser;
        
        console.log(`👤 Regular user authenticated: ${regularUser.emailId}`);
      }
    }
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found',
        message: 'User account not found or inactive'
      });
      return;
    }
    
    // Set user information in request
    req.user = user;
    req.userId = userId;
    req.userEmail = user.emailId;
    req.isAdminUser = user.isAdminUser || false;
    
    // Add admin context if user is admin
    if (user.isAdminUser && user.adminUser) {
      req.adminContext = {
        userId: user.adminUser._id?.toString() || '',
        userEmail: user.adminUser.emailId,
        userRole: user.adminUser.role,
        isSuperAdmin: user.adminUser.role === 'superadmin',
        permissions: user.adminUser.permissions,
        accessTime: new Date()
      };
    }
    
    next();
  } catch (error: any) {
    console.error('❌ Enhanced auth middleware error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: 'Authentication failed: ' + error.message
    });
  }
};

/**
 * Admin Authentication Middleware
 * Ensures only admin users can access admin endpoints
 */
const adminAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const user = req.user as AuthenticatedUser;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please login to access this resource'
      });
      return;
    }
    
    // Check if user is an admin user
    if (!user.isAdminUser) {
      res.status(403).json({
        success: false,
        error: 'Admin access required',
        message: 'You do not have permission to access admin resources',
        requiredRole: 'admin',
        userRole: 'user'
      });
      return;
    }
    
    // Check if admin user is active
    if (user.adminUser && !user.adminUser.isActive) {
      res.status(403).json({
        success: false,
        error: 'Admin account inactive',
        message: 'Your admin account is inactive'
      });
      return;
    }
    
    console.log(`🔐 Admin access granted to user: ${user.emailId} (${user.adminUser?.role || 'admin'})`);
    
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
 * Super Admin Authentication Middleware
 * Ensures only superadmin users can access superadmin endpoints
 */
const superAdminAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const user = req.user as AuthenticatedUser;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please login to access this resource'
      });
      return;
    }
    
    // Check if user is an admin user
    if (!user.isAdminUser) {
      res.status(403).json({
        success: false,
        error: 'Super admin access required',
        message: 'You do not have permission to access super admin resources',
        requiredRole: 'superadmin',
        userRole: 'user'
      });
      return;
    }
    
    // Check if user is superadmin
    if (user.adminUser?.role !== 'superadmin') {
      res.status(403).json({
        success: false,
        error: 'Super admin access required',
        message: 'Only super administrators can access this resource',
        requiredRole: 'superadmin',
        userRole: user.adminUser?.role || 'admin'
      });
      return;
    }
    
    // Check if superadmin user is active
    if (!user.adminUser?.isActive) {
      res.status(403).json({
        success: false,
        error: 'Super admin account inactive',
        message: 'Your super admin account is inactive'
      });
      return;
    }
    
    console.log(`🔐 Super admin access granted to user: ${user.emailId}`);
    
    next();
  } catch (error) {
    console.error('❌ Super admin auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to verify super admin access'
    });
  }
};

/**
 * Permission-Based Authentication Middleware
 * Checks specific permissions for admin actions
 */
const adminAuthWithPermissions = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = req.user as AuthenticatedUser;
      
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }
      
      // Check if user is an admin user
      if (!user.isAdminUser) {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
          message: 'You do not have admin privileges'
        });
        return;
      }
      
      // Check specific permissions
      const userPermissions = user.adminUser?.permissions || [];
      const hasRequiredPermissions = requiredPermissions.every(permission => 
        userPermissions.includes(permission) || user.adminUser?.role === 'superadmin'
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
 * Regular User Authentication Middleware
 * Ensures only regular users can access user endpoints
 */
const regularUserAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const user = req.user as AuthenticatedUser;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please login to access this resource'
      });
      return;
    }
    
    // Check if user is a regular user (not admin)
    if (user.isAdminUser) {
      res.status(403).json({
        success: false,
        error: 'Regular user access required',
        message: 'Admin users cannot access regular user resources',
        userRole: user.adminUser?.role || 'admin'
      });
      return;
    }
    
    console.log(`👤 Regular user access granted to user: ${user.emailId}`);
    
    next();
  } catch (error) {
    console.error('❌ Regular user auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to verify user access'
    });
  }
};

/**
 * Role Checker Utilities
 */
export const isAdmin = (user: AuthenticatedUser): boolean => {
  return user.isAdminUser === true;
};

export const isSuperAdmin = (user: AuthenticatedUser): boolean => {
  return user.isAdminUser === true && user.adminUser?.role === 'superadmin';
};

export const hasPermission = (user: AuthenticatedUser, permission: string): boolean => {
  if (!user.isAdminUser || !user.adminUser) return false;
  return user.adminUser.permissions.includes(permission) || user.adminUser.role === 'superadmin';
};

export const hasAnyPermission = (user: AuthenticatedUser, permissions: string[]): boolean => {
  if (!user.isAdminUser || !user.adminUser) return false;
  return permissions.some(permission => 
    user.adminUser?.permissions.includes(permission) || user.adminUser?.role === 'superadmin'
  );
};

export const hasAllPermissions = (user: AuthenticatedUser, permissions: string[]): boolean => {
  if (!user.isAdminUser || !user.adminUser) return false;
  return permissions.every(permission => 
    user.adminUser?.permissions.includes(permission) || user.adminUser?.role === 'superadmin'
  );
};

export {
  enhancedAuth,
  adminAuth,
  superAdminAuth,
  adminAuthWithPermissions,
  regularUserAuth
};
