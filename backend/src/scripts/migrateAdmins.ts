#!/usr/bin/env ts-node

/**
 * Admin Migration Script
 * Migrates existing admin users from users collection to admin_users collection
 * Preserves all data and enhances permission management
 */

import mongoose from 'mongoose';
import { connectDB } from '../config/database';
import AdminUser from '../models/adminUser';
import User from '../models/user';

interface MigrationResult {
  success: boolean;
  migrated: number;
  skipped: number;
  errors: string[];
  details: any[];
}

const migrateAdmins = async (): Promise<MigrationResult> => {
  const result: MigrationResult = {
    success: true,
    migrated: 0,
    skipped: 0,
    errors: [],
    details: []
  };

  try {
    console.log('🚀 Starting admin migration...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');

    // Find all admin users in the users collection
    const adminUsers = await User.find({ 
      $or: [
        { isAdmin: true },
        { role: { $in: ['admin', 'superadmin'] } }
      ]
    });

    console.log(`📊 Found ${adminUsers.length} admin users to migrate`);

    if (adminUsers.length === 0) {
      console.log('ℹ️ No admin users found to migrate');
      return result;
    }

    // Process each admin user
    for (const user of adminUsers) {
      try {
        console.log(`🔄 Migrating admin: ${user.emailId} (${user.role || 'admin'})`);

        // Check if admin user already exists in admin_users collection
        const existingAdmin = await AdminUser.findOne({ emailId: user.emailId });
        if (existingAdmin) {
          console.log(`⚠️ Admin user ${user.emailId} already exists in admin_users collection, skipping`);
          result.skipped++;
          result.details.push({
            emailId: user.emailId,
            status: 'skipped',
            reason: 'Already exists in admin_users collection'
          });
          continue;
        }

        // Create new admin user in admin_users collection
        const adminUser = new AdminUser({
          firstName: user.firstName,
          lastName: user.lastName,
          emailId: user.emailId,
          password: user.password, // Already hashed
          role: user.role || 'admin',
          isActive: true,
          isEmailVerified: user.isEmailVerified || true,
          failedLoginAttempts: user.failedLoginAttempts || 0,
          isLocked: user.isLocked || false,
          lockUntil: user.lockUntil,
          lastLogin: user.lastLogin,
          loginIP: user.loginIP,
          loginCount: user.loginCount || 0,
          lastAdminAction: user.lastAdminAction,
          adminActionsCount: 0,
          activeSessions: user.activeSessions || [],
          refreshToken: user.refreshToken,
          refreshTokenExpiry: user.refreshTokenExpiry,
          twoFactorEnabled: user.twoFactorEnabled || false,
          twoFactorSecret: user.twoFactorSecret,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        });

        // Set default permissions based on role
        if (user.role === 'superadmin') {
          adminUser.defaultPermissions = [
            'view_analytics',
            'manage_users',
            'view_tokens',
            'manage_system',
            'view_logs',
            'manage_permissions',
            'manage_admins',
            'system_settings'
          ];
        } else {
          adminUser.defaultPermissions = [
            'view_analytics',
            'view_tokens',
            'view_logs'
          ];
        }

        // Add existing permissions as custom permissions
        if (user.permissions && user.permissions.length > 0) {
          user.permissions.forEach(permission => {
            if (!adminUser.defaultPermissions.includes(permission)) {
              adminUser.addPermission(permission);
            }
          });
        }

        // Set permissions array
        adminUser.permissions = [...adminUser.defaultPermissions, ...adminUser.customPermissions];

        await adminUser.save();

        console.log(`✅ Successfully migrated: ${user.emailId}`);
        result.migrated++;
        result.details.push({
          emailId: user.emailId,
          status: 'migrated',
          role: adminUser.role,
          permissions: adminUser.permissions,
          defaultPermissions: adminUser.defaultPermissions,
          customPermissions: adminUser.customPermissions
        });

      } catch (error) {
        console.error(`❌ Failed to migrate ${user.emailId}:`, error);
        result.errors.push(`${user.emailId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        result.details.push({
          emailId: user.emailId,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Summary
    console.log('\n📋 Migration Summary:');
    console.log(`✅ Successfully migrated: ${result.migrated}`);
    console.log(`⚠️ Skipped: ${result.skipped}`);
    console.log(`❌ Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (result.migrated > 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('📝 Next steps:');
      console.log('1. Test admin login with migrated accounts');
      console.log('2. Verify permissions are working correctly');
      console.log('3. Update admin controllers to use new collection');
      console.log('4. Consider removing admin users from users collection after verification');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    result.success = false;
    result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    await mongoose.connection.close();
    console.log('📡 Database connection closed');
  }

  return result;
};

/**
 * Rollback migration (remove admin users from admin_users collection)
 */
const rollbackMigration = async (): Promise<void> => {
  try {
    console.log('🔄 Starting rollback...');
    
    await connectDB();
    console.log('✅ Database connected');

    // Remove all admin users from admin_users collection
    const result = await AdminUser.deleteMany({});
    
    console.log(`🗑️ Removed ${result.deletedCount} admin users from admin_users collection`);
    console.log('✅ Rollback completed');

  } catch (error) {
    console.error('❌ Rollback failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📡 Database connection closed');
  }
};

/**
 * Verify migration
 */
const verifyMigration = async (): Promise<void> => {
  try {
    console.log('🔍 Verifying migration...');
    
    await connectDB();
    console.log('✅ Database connected');

    // Count admin users in both collections
    const usersCollectionCount = await User.countDocuments({ 
      $or: [
        { isAdmin: true },
        { role: { $in: ['admin', 'superadmin'] } }
      ]
    });

    const adminUsersCollectionCount = await AdminUser.countDocuments({ isActive: true });

    console.log(`📊 Users collection admin count: ${usersCollectionCount}`);
    console.log(`📊 Admin users collection count: ${adminUsersCollectionCount}`);

    if (adminUsersCollectionCount > 0) {
      console.log('\n👥 Admin users in admin_users collection:');
      const adminUsers = await AdminUser.find({ isActive: true })
        .select('firstName lastName emailId role permissions')
        .sort({ createdAt: -1 });

      adminUsers.forEach(admin => {
        console.log(`  - ${admin.firstName} ${admin.lastName} (${admin.emailId}) - ${admin.role}`);
        console.log(`    Permissions: ${admin.permissions.join(', ')}`);
      });
    }

    console.log('✅ Verification completed');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📡 Database connection closed');
  }
};

// Main execution
const main = async () => {
  const command = process.argv[2];

  switch (command) {
    case 'migrate':
      await migrateAdmins();
      break;
    case 'rollback':
      await rollbackMigration();
      break;
    case 'verify':
      await verifyMigration();
      break;
    default:
      console.log('📋 Admin Migration Script');
      console.log('');
      console.log('Usage:');
      console.log('  npx ts-node src/scripts/migrateAdmins.ts migrate   # Migrate admin users');
      console.log('  npx ts-node src/scripts/migrateAdmins.ts rollback  # Rollback migration');
      console.log('  npx ts-node src/scripts/migrateAdmins.ts verify    # Verify migration');
      console.log('');
      console.log('Examples:');
      console.log('  npx ts-node src/scripts/migrateAdmins.ts migrate');
      console.log('  npx ts-node src/scripts/migrateAdmins.ts verify');
      break;
  }
};

// Run the script
main().catch(console.error);
