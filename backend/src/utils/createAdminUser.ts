import bcrypt from 'bcrypt';
import User from '../models/user';

/**
 * Create Admin User Utility
 * Creates a new admin user with proper permissions
 */
export const createAdminUser = async (userData: {
  firstName: string;
  lastName: string;
  emailId: string;
  password: string;
  role?: 'admin' | 'superadmin';
  permissions?: string[];
}): Promise<{ success: boolean; user?: any; error?: string }> => {
  try {
    const {
      firstName,
      lastName,
      emailId,
      password,
      role = 'admin',
      permissions = ['view_analytics', 'manage_users', 'view_tokens']
    } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ emailId });
    if (existingUser) {
      return {
        success: false,
        error: 'User with this email already exists'
      };
    }

    // Hash password
    const saltRounds = parseInt(process.env.PASSWORD_SALT_ROUNDS || '12');
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create admin user
    const adminUser = new User({
      firstName,
      lastName,
      emailId,
      password: hashedPassword,
      role,
      isAdmin: true,
      permissions,
      isEmailVerified: true, // Admin users are pre-verified
      lastAdminAction: new Date()
    });

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
        isAdmin: adminUser.isAdmin,
        permissions: adminUser.permissions,
        createdAt: adminUser.createdAt
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
 * Promote Existing User to Admin
 * Promotes an existing user to admin role
 */
export const promoteUserToAdmin = async (
  emailId: string,
  role: 'admin' | 'superadmin' = 'admin',
  permissions: string[] = ['view_analytics', 'manage_users', 'view_tokens']
): Promise<{ success: boolean; user?: any; error?: string }> => {
  try {
    const user = await User.findOne({ emailId });
    if (!user) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    // Update user to admin
    user.role = role;
    user.isAdmin = true;
    user.permissions = permissions;
    user.lastAdminAction = new Date();

    await user.save();

    console.log(`✅ User promoted to admin: ${emailId} (${role})`);

    return {
      success: true,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        emailId: user.emailId,
        role: user.role,
        isAdmin: user.isAdmin,
        permissions: user.permissions,
        lastAdminAction: user.lastAdminAction
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
 * Demote Admin User
 * Removes admin privileges from a user
 */
export const demoteAdminUser = async (
  emailId: string
): Promise<{ success: boolean; user?: any; error?: string }> => {
  try {
    const user = await User.findOne({ emailId });
    if (!user) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    // Remove admin privileges
    user.role = 'user';
    user.isAdmin = false;
    user.permissions = [];
    user.lastAdminAction = new Date();

    await user.save();

    console.log(`✅ User demoted from admin: ${emailId}`);

    return {
      success: true,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        emailId: user.emailId,
        role: user.role,
        isAdmin: user.isAdmin,
        permissions: user.permissions
      }
    };
  } catch (error) {
    console.error('❌ Failed to demote admin user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * List All Admin Users
 * Get list of all users with admin privileges
 */
export const listAdminUsers = async (): Promise<{ success: boolean; admins?: any[]; error?: string }> => {
  try {
    const adminUsers = await User.find({
      $or: [
        { isAdmin: true },
        { role: { $in: ['admin', 'superadmin'] } }
      ]
    }).select('firstName lastName emailId role isAdmin permissions lastAdminAction createdAt');

    return {
      success: true,
      admins: adminUsers
    };
  } catch (error) {
    console.error('❌ Failed to list admin users:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
