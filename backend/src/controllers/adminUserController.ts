import { Request, Response } from 'express';
import { 
  createAdminUser, 
  promoteUserToAdmin, 
  listAdminUsers, 
  removeAdminAccess, 
  updateAdminPermissions,
  addPermissionToAdmin,
  removePermissionFromAdmin,
  resetAdminPermissions,
  getAdminUser,
  getAvailablePermissions,
  getDefaultPermissionsForRole
} from '../utils/adminUserManager';
import { adminAuditLogger, AdminAuditActions, logAdminAction } from '../middlewares/adminAuditLogger';

/**
 * Admin User Management Controller
 * Handles creation, promotion, and management of admin users
 */

/**
 * Create New Admin User
 * Only superadmin can create new admin users
 */
export const createAdminUserController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, emailId, password, role = 'admin', permissions } = req.body;
    const adminUser = req.user as any;

    // Validate required fields
    if (!firstName || !lastName || !emailId || !password) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'firstName, lastName, emailId, and password are required'
      });
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      res.status(400).json({
        success: false,
        error: 'Weak password',
        message: 'Password must be at least 8 characters long'
      });
      return;
    }

    // Create admin user
    const result = await createAdminUser({
      firstName,
      lastName,
      emailId,
      password,
      role,
      permissions
    });

    if (result.success) {
      // Log admin creation
      await logAdminAction({
        adminId: adminUser._id?.toString() || '',
        adminEmail: adminUser.emailId,
        action: AdminAuditActions.CREATE_ADMIN.action,
        resource: AdminAuditActions.CREATE_ADMIN.resource,
        details: {
          createdUserEmail: emailId,
          createdUserRole: role,
          permissions: permissions || []
        }
      });

      res.status(201).json({
        success: true,
        message: 'Admin user created successfully',
        data: {
          user: result.user,
          createdBy: adminUser.emailId
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: 'Failed to create admin user'
      });
    }
  } catch (error) {
    console.error('❌ Create admin user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to create admin user'
    });
  }
};

/**
 * Promote Existing User to Admin
 * Only superadmin can promote users
 */
export const promoteUserToAdminController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userEmail, role = 'admin', permissions } = req.body;
    const adminUser = req.user as any;

    if (!userEmail) {
      res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'userEmail is required'
      });
      return;
    }

    // Promote user to admin
    const result = await promoteUserToAdmin(userEmail, role, permissions);

    if (result.success) {
      // Log promotion
      await logAdminAction({
        adminId: adminUser._id?.toString() || '',
        adminEmail: adminUser.emailId,
        action: AdminAuditActions.PROMOTE_USER.action,
        resource: AdminAuditActions.PROMOTE_USER.resource,
        details: {
          promotedUserEmail: userEmail,
          newRole: role,
          permissions: permissions || []
        }
      });

      res.json({
        success: true,
        message: 'User promoted to admin successfully',
        data: {
          user: result.user,
          promotedBy: adminUser.emailId
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: 'Failed to promote user to admin'
      });
    }
  } catch (error) {
    console.error('❌ Promote user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to promote user to admin'
    });
  }
};

/**
 * List All Admin Users
 * Admin users can view the list
 */
export const listAdminUsersController = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await listAdminUsers();

    if (result.success) {
      res.json({
        success: true,
        message: 'Admin users retrieved successfully',
        data: {
          admins: result.admins,
          total: result.admins?.length || 0
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Failed to retrieve admin users'
      });
    }
  } catch (error) {
    console.error('❌ List admin users error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve admin users'
    });
  }
};

/**
 * Update Admin Permissions
 * Only superadmin can update permissions
 */
export const updateAdminPermissionsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { permissions, role } = req.body;
    const adminUser = req.user as any;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameter',
        message: 'userId is required'
      });
      return;
    }

    // Update admin permissions
    const result = await updateAdminPermissions(userId, { permissions, role });

    if (result.success) {
      // Log permission update
      await logAdminAction({
        adminId: adminUser._id?.toString() || '',
        adminEmail: adminUser.emailId,
        action: AdminAuditActions.UPDATE_PERMISSIONS.action,
        resource: AdminAuditActions.UPDATE_PERMISSIONS.resource,
        details: {
          targetUserId: userId,
          newPermissions: permissions,
          newRole: role
        }
      });

      res.json({
        success: true,
        message: 'Admin permissions updated successfully',
        data: {
          user: result.user,
          updatedBy: adminUser.emailId
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: 'Failed to update admin permissions'
      });
    }
  } catch (error) {
    console.error('❌ Update admin permissions error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update admin permissions'
    });
  }
};

/**
 * Remove Admin Access
 * Only superadmin can remove admin access
 */
export const removeAdminAccessController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const adminUser = req.user as any;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameter',
        message: 'userId is required'
      });
      return;
    }

    // Prevent self-removal
    if (userId === adminUser._id?.toString()) {
      res.status(400).json({
        success: false,
        error: 'Cannot remove own admin access',
        message: 'You cannot remove your own admin access'
      });
      return;
    }

    // Remove admin access
    const result = await removeAdminAccess(userId);

    if (result.success) {
      // Log admin removal
      await logAdminAction({
        adminId: adminUser._id?.toString() || '',
        adminEmail: adminUser.emailId,
        action: AdminAuditActions.REMOVE_ADMIN.action,
        resource: AdminAuditActions.REMOVE_ADMIN.resource,
        details: {
          removedUserId: userId,
          removedUserEmail: result.user?.emailId
        }
      });

      res.json({
        success: true,
        message: 'Admin access removed successfully',
        data: {
          user: result.user,
          removedBy: adminUser.emailId
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: 'Failed to remove admin access'
      });
    }
  } catch (error) {
    console.error('❌ Remove admin access error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to remove admin access'
    });
  }
};

/**
 * Get Admin User Details
 * Admin users can view admin details
 */
export const getAdminUserController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameter',
        message: 'userId is required'
      });
      return;
    }

    // Get admin user details
    const result = await getAdminUser(userId);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Admin user details retrieved successfully',
        data: { user: result.user }
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error,
        message: 'Admin user not found'
      });
    }
  } catch (error) {
    console.error('❌ Get admin user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve admin user details'
    });
  }
};

/**
 * Add Permission to Admin User
 * Only superadmin can add permissions
 */
export const addPermissionController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { permission } = req.body;
    const adminUser = req.user as any;

    if (!userId || !permission) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        message: 'userId and permission are required'
      });
      return;
    }

    // Add permission to admin user
    const result = await addPermissionToAdmin(userId, permission);

    if (result.success) {
      // Log permission addition
      await logAdminAction({
        adminId: adminUser._id?.toString() || '',
        adminEmail: adminUser.emailId,
        action: AdminAuditActions.UPDATE_PERMISSIONS.action,
        resource: AdminAuditActions.UPDATE_PERMISSIONS.resource,
        details: {
          targetUserId: userId,
          action: 'add_permission',
          permission: permission
        }
      });

      res.json({
        success: true,
        message: 'Permission added successfully',
        data: {
          user: result.user,
          addedBy: adminUser.emailId
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: 'Failed to add permission'
      });
    }
  } catch (error) {
    console.error('❌ Add permission error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to add permission'
    });
  }
};

/**
 * Remove Permission from Admin User
 * Only superadmin can remove permissions
 */
export const removePermissionController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { permission } = req.body;
    const adminUser = req.user as any;

    if (!userId || !permission) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        message: 'userId and permission are required'
      });
      return;
    }

    // Remove permission from admin user
    const result = await removePermissionFromAdmin(userId, permission);

    if (result.success) {
      // Log permission removal
      await logAdminAction({
        adminId: adminUser._id?.toString() || '',
        adminEmail: adminUser.emailId,
        action: AdminAuditActions.UPDATE_PERMISSIONS.action,
        resource: AdminAuditActions.UPDATE_PERMISSIONS.resource,
        details: {
          targetUserId: userId,
          action: 'remove_permission',
          permission: permission
        }
      });

      res.json({
        success: true,
        message: 'Permission removed successfully',
        data: {
          user: result.user,
          removedBy: adminUser.emailId
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: 'Failed to remove permission'
      });
    }
  } catch (error) {
    console.error('❌ Remove permission error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to remove permission'
    });
  }
};

/**
 * Reset Admin Permissions to Default
 * Only superadmin can reset permissions
 */
export const resetPermissionsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const adminUser = req.user as any;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameter',
        message: 'userId is required'
      });
      return;
    }

    // Reset admin permissions
    const result = await resetAdminPermissions(userId);

    if (result.success) {
      // Log permission reset
      await logAdminAction({
        adminId: adminUser._id?.toString() || '',
        adminEmail: adminUser.emailId,
        action: AdminAuditActions.UPDATE_PERMISSIONS.action,
        resource: AdminAuditActions.UPDATE_PERMISSIONS.resource,
        details: {
          targetUserId: userId,
          action: 'reset_permissions'
        }
      });

      res.json({
        success: true,
        message: 'Admin permissions reset to default successfully',
        data: {
          user: result.user,
          resetBy: adminUser.emailId
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: 'Failed to reset permissions'
      });
    }
  } catch (error) {
    console.error('❌ Reset permissions error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to reset permissions'
    });
  }
};

/**
 * Get Available Permissions
 * Returns list of all available permissions
 */
export const getAvailablePermissionsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const permissions = getAvailablePermissions();
    const defaultAdminPermissions = getDefaultPermissionsForRole('admin');
    const defaultSuperAdminPermissions = getDefaultPermissionsForRole('superadmin');

    res.json({
      success: true,
      message: 'Available permissions retrieved successfully',
      data: {
        permissions,
        defaultAdminPermissions,
        defaultSuperAdminPermissions
      }
    });
  } catch (error) {
    console.error('❌ Get available permissions error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve available permissions'
    });
  }
};
