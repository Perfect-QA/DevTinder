import AdminUser, { IAdminUser } from '../models/adminUser';
import User from '../models/user';
import { connectDB } from '../config/database';

/**
 * Enhanced Admin User Management Utilities
 * Works with separate admin_users collection
 * Supports permission management (add, not replace)
 */

export interface CreateAdminUserData {
  firstName: string;
  lastName: string;
  emailId: string;
  password: string;
  role: 'admin' | 'superadmin';
  permissions?: string[];
  createdBy?: string;
  createdByEmail?: string;
}

export interface UpdatePermissionsData {
  permissions?: string[];
  addPermissions?: string[];
  removePermissions?: string[];
  role?: 'admin' | 'superadmin';
}

export interface AdminUserResponse {
  success: boolean;
  user?: Partial<IAdminUser>;
  error?: string;
  message?: string;
}

export interface ListAdminUsersResponse {
  success: boolean;
  admins?: Partial<IAdminUser>[];
  total?: number;
  error?: string;
}

/**
 * Create New Admin User
 * Supports permission management (add to defaults, not replace)
 */
export const createAdminUser = async (userData: CreateAdminUserData): Promise<AdminUserResponse> => {
  try {
    const {
      firstName,
      lastName,
      emailId,
      password,
      role,
      permissions = [],
      createdBy,
      createdByEmail
    } = userData;

    // Check if admin user already exists
    const existingAdmin = await AdminUser.findOne({ emailId });
    if (existingAdmin) {
      return {
        success: false,
        error: 'Admin user with this email already exists'
      };
    }

    // Create admin user
    const adminUser = new AdminUser({
      firstName,
      lastName,
      emailId,
      password,
      role,
      createdBy,
      createdByEmail
    });

    // Add custom permissions to default permissions
    if (permissions.length > 0) {
      permissions.forEach(permission => {
        adminUser.addPermission(permission);
      });
    }

    await adminUser.save();

    console.log(`✅ Admin user created: ${emailId} (${role})`);

    return {
      success: true,
      user: {
        _id: adminUser._id,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        emailId: adminUser.emailId,
        role: adminUser.role,
        isActive: adminUser.isActive,
        permissions: adminUser.permissions,
        defaultPermissions: adminUser.defaultPermissions,
        customPermissions: adminUser.customPermissions,
        createdAt: adminUser.createdAt,
        ...(adminUser.createdBy && { createdBy: adminUser.createdBy }),
        ...(adminUser.createdByEmail && { createdByEmail: adminUser.createdByEmail })
      }
    };
  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Promote Regular User to Admin
 * Moves user from users collection to admin_users collection
 */
export const promoteUserToAdmin = async (
  userEmail: string, 
  role: 'admin' | 'superadmin' = 'admin',
  customPermissions: string[] = [],
  createdBy?: string,
  createdByEmail?: string
): Promise<AdminUserResponse> => {
  try {
    // Find the regular user
    const regularUser = await User.findOne({ emailId: userEmail });
    if (!regularUser) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    // Check if admin user already exists
    const existingAdmin = await AdminUser.findOne({ emailId: userEmail });
    if (existingAdmin) {
      return {
        success: false,
        error: 'User is already an admin'
      };
    }

    // Create admin user from regular user data
    const adminUser = new AdminUser({
      firstName: regularUser.firstName,
      lastName: regularUser.lastName,
      emailId: regularUser.emailId,
      password: regularUser.password, // Already hashed
      role,
      createdBy,
      createdByEmail,
      isEmailVerified: regularUser.isEmailVerified || true
    });

    // Add custom permissions
    if (customPermissions.length > 0) {
      customPermissions.forEach(permission => {
        adminUser.addPermission(permission);
      });
    }

    await adminUser.save();

    // Update regular user to mark as admin (optional)
    regularUser.isAdmin = true;
    regularUser.role = role;
    await regularUser.save();

    return {
      success: true,
      user: {
        _id: adminUser._id,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        emailId: adminUser.emailId,
        role: adminUser.role,
        isActive: adminUser.isActive,
        permissions: adminUser.permissions,
        defaultPermissions: adminUser.defaultPermissions,
        customPermissions: adminUser.customPermissions,
        createdAt: adminUser.createdAt,
        ...(adminUser.createdBy && { createdBy: adminUser.createdBy }),
        ...(adminUser.createdByEmail && { createdByEmail: adminUser.createdByEmail })
      }
    };
  } catch (error) {
    console.error('❌ Failed to promote user to admin:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * List All Admin Users
 */
export const listAdminUsers = async (): Promise<ListAdminUsersResponse> => {
  try {
    const admins = await AdminUser.find({ isActive: true })
      .select('-password -refreshToken -twoFactorSecret')
      .sort({ createdAt: -1 });

    return {
      success: true,
      admins: admins.map(admin => ({
        _id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        emailId: admin.emailId,
        role: admin.role,
        isActive: admin.isActive,
        permissions: admin.permissions,
        defaultPermissions: admin.defaultPermissions,
        customPermissions: admin.customPermissions,
        ...(admin.lastLogin && { lastLogin: admin.lastLogin }),
        ...(admin.lastAdminAction && { lastAdminAction: admin.lastAdminAction }),
        adminActionsCount: admin.adminActionsCount,
        createdAt: admin.createdAt,
        ...(admin.createdBy && { createdBy: admin.createdBy }),
        ...(admin.createdByEmail && { createdByEmail: admin.createdByEmail })
      })),
      total: admins.length
    };
  } catch (error) {
    console.error('❌ Failed to list admin users:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Update Admin Permissions (Add, not replace)
 */
export const updateAdminPermissions = async (
  userId: string, 
  updateData: UpdatePermissionsData
): Promise<AdminUserResponse> => {
  try {
    const adminUser = await AdminUser.findById(userId);
    if (!adminUser) {
      return {
        success: false,
        error: 'Admin user not found'
      };
    }

    // Update role if provided
    if (updateData.role && updateData.role !== adminUser.role) {
      adminUser.role = updateData.role;
      // Reset permissions to new role defaults
      adminUser.resetPermissions();
    }

    // Add new permissions
    if (updateData.addPermissions && updateData.addPermissions.length > 0) {
      updateData.addPermissions.forEach(permission => {
        adminUser.addPermission(permission);
      });
    }

    // Remove specific permissions (only custom ones)
    if (updateData.removePermissions && updateData.removePermissions.length > 0) {
      updateData.removePermissions.forEach(permission => {
        adminUser.removePermission(permission);
      });
    }

    // Set specific permissions (replaces all)
    if (updateData.permissions && updateData.permissions.length > 0) {
      adminUser.permissions = [...adminUser.defaultPermissions, ...updateData.permissions];
      adminUser.customPermissions = [...updateData.permissions];
    }

    await adminUser.save();

    return {
      success: true,
      user: {
        _id: adminUser._id,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        emailId: adminUser.emailId,
        role: adminUser.role,
        permissions: adminUser.permissions,
        defaultPermissions: adminUser.defaultPermissions,
        customPermissions: adminUser.customPermissions,
        updatedAt: adminUser.updatedAt
      }
    };
  } catch (error) {
    console.error('❌ Failed to update admin permissions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Remove Admin Access
 */
export const removeAdminAccess = async (userId: string): Promise<AdminUserResponse> => {
  try {
    const adminUser = await AdminUser.findById(userId);
    if (!adminUser) {
      return {
        success: false,
        error: 'Admin user not found'
      };
    }

    // Soft delete - mark as inactive
    adminUser.isActive = false;
    await adminUser.save();

    return {
      success: true,
      user: {
        _id: adminUser._id,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        emailId: adminUser.emailId,
        isActive: adminUser.isActive,
        updatedAt: adminUser.updatedAt
      }
    };
  } catch (error) {
    console.error('❌ Failed to remove admin access:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Get Admin User by ID
 */
export const getAdminUser = async (userId: string): Promise<AdminUserResponse> => {
  try {
    const adminUser = await AdminUser.findById(userId)
      .select('-password -refreshToken -twoFactorSecret');

    if (!adminUser) {
      return {
        success: false,
        error: 'Admin user not found'
      };
    }

    return {
      success: true,
      user: {
        _id: adminUser._id,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        emailId: adminUser.emailId,
        role: adminUser.role,
        isActive: adminUser.isActive,
        permissions: adminUser.permissions,
        defaultPermissions: adminUser.defaultPermissions,
        customPermissions: adminUser.customPermissions,
        ...(adminUser.lastLogin && { lastLogin: adminUser.lastLogin }),
        ...(adminUser.lastAdminAction && { lastAdminAction: adminUser.lastAdminAction }),
        adminActionsCount: adminUser.adminActionsCount,
        createdAt: adminUser.createdAt,
        ...(adminUser.createdBy && { createdBy: adminUser.createdBy }),
        ...(adminUser.createdByEmail && { createdByEmail: adminUser.createdByEmail })
      }
    };
  } catch (error) {
    console.error('❌ Failed to get admin user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Add Permission to Admin User
 */
export const addPermissionToAdmin = async (
  userId: string, 
  permission: string
): Promise<AdminUserResponse> => {
  try {
    const adminUser = await AdminUser.findById(userId);
    if (!adminUser) {
      return {
        success: false,
        error: 'Admin user not found'
      };
    }

    adminUser.addPermission(permission);
    await adminUser.save();

    console.log(`✅ Permission added to admin: ${adminUser.emailId} - ${permission}`);

    return {
      success: true,
      user: {
        _id: adminUser._id,
        emailId: adminUser.emailId,
        permissions: adminUser.permissions,
        customPermissions: adminUser.customPermissions
      }
    };
  } catch (error) {
    console.error('❌ Failed to add permission:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Remove Permission from Admin User
 */
export const removePermissionFromAdmin = async (
  userId: string, 
  permission: string
): Promise<AdminUserResponse> => {
  try {
    const adminUser = await AdminUser.findById(userId);
    if (!adminUser) {
      return {
        success: false,
        error: 'Admin user not found'
      };
    }

    adminUser.removePermission(permission);
    await adminUser.save();

    console.log(`✅ Permission removed from admin: ${adminUser.emailId} - ${permission}`);

    return {
      success: true,
      user: {
        _id: adminUser._id,
        emailId: adminUser.emailId,
        permissions: adminUser.permissions,
        customPermissions: adminUser.customPermissions
      }
    };
  } catch (error) {
    console.error('❌ Failed to remove permission:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Reset Admin Permissions to Default
 */
export const resetAdminPermissions = async (userId: string): Promise<AdminUserResponse> => {
  try {
    const adminUser = await AdminUser.findById(userId);
    if (!adminUser) {
      return {
        success: false,
        error: 'Admin user not found'
      };
    }

    adminUser.resetPermissions();
    await adminUser.save();

    return {
      success: true,
      user: {
        _id: adminUser._id,
        emailId: adminUser.emailId,
        permissions: adminUser.permissions,
        defaultPermissions: adminUser.defaultPermissions,
        customPermissions: adminUser.customPermissions
      }
    };
  } catch (error) {
    console.error('❌ Failed to reset admin permissions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Get Available Permissions
 */
export const getAvailablePermissions = (): string[] => {
  return [
    'view_analytics',
    'manage_users',
    'view_tokens',
    'manage_system',
    'view_logs',
    'manage_permissions',
    'manage_admins',
    'system_settings',
    'view_audit_logs',
    'manage_sessions',
    'view_reports',
    'manage_notifications',
    'backup_restore',
    'api_management'
  ];
};

/**
 * Get Default Permissions for Role
 */
export const getDefaultPermissionsForRole = (role: 'admin' | 'superadmin'): string[] => {
  return role === 'superadmin' 
    ? [
        'view_analytics',
        'manage_users',
        'view_tokens',
        'manage_system',
        'view_logs',
        'manage_permissions',
        'manage_admins',
        'system_settings'
      ]
    : [
        'view_analytics',
        'view_tokens',
        'view_logs'
      ];
};
