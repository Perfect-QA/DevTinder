#!/usr/bin/env ts-node

/**
 * Admin Setup Script
 * Creates the first admin user for the system
 */

import mongoose from 'mongoose';
import { createAdminUser, promoteUserToAdmin, listAdminUsers } from '../utils/createAdminUser';
import { connectDB } from '../config/database';

const setupAdmin = async () => {
  try {
    console.log('🚀 Setting up admin user...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');

    // Check if admin users already exist
    const existingAdmins = await listAdminUsers();
    if (existingAdmins.success && existingAdmins.admins && existingAdmins.admins.length > 0) {
      console.log('⚠️ Admin users already exist:');
      existingAdmins.admins.forEach(admin => {
        console.log(`  - ${admin.emailId} (${admin.role})`);
      });
      
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise<string>((resolve) => {
        rl.question('Do you want to create another admin user? (y/n): ', resolve);
      });
      
      rl.close();
      
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('❌ Admin setup cancelled');
        process.exit(0);
      }
    }

    // Create admin user
    const adminData = {
      firstName: 'Admin',
      lastName: 'User',
      emailId: 'PerfectAdmin@gmail.com',
      password: 'Perfect@007',
      role: 'superadmin' as const,
      permissions: [
        'view_analytics',
        'manage_users', 
        'view_tokens',
        'manage_system',
        'view_logs',
        'manage_permissions'
      ]
    };

    console.log('📝 Creating admin user...');
    const result = await createAdminUser(adminData);

    if (result.success) {
      console.log('✅ Admin user created successfully!');
      console.log('📋 Admin Details:');
      console.log(`  Email: ${result.user.emailId}`);
      console.log(`  Role: ${result.user.role}`);
      console.log(`  Permissions: ${result.user.permissions.join(', ')}`);
      console.log(`  Password: ${adminData.password}`);
      console.log('');
      console.log('🔐 Please change the default password after first login!');
      console.log('');
      console.log('🧪 Test admin access:');
      console.log('1. Login with the admin credentials');
      console.log('2. Use the JWT token to access admin endpoints');
      console.log('3. Test: curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/admin/openai/dashboard');
    } else {
      console.error('❌ Failed to create admin user:', result.error);
    }

  } catch (error) {
    console.error('❌ Admin setup failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📡 Database connection closed');
    process.exit(0);
  }
};

// Run the setup
setupAdmin();
