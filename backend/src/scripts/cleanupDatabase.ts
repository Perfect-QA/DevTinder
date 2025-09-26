import mongoose from 'mongoose';
import { connectDB } from '../config/database';
import User from '../models/user';

/**
 * Database Cleanup Script
 * Cleans up invalid data and fixes database issues
 */
async function cleanupDatabase(): Promise<void> {
  try {
    console.log('🧹 Starting database cleanup...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');

    // 1. Remove users with null or invalid emails
    console.log('🔍 Checking for users with invalid emails...');
    const invalidUsers = await User.find({
      $or: [
        { emailId: null },
        { emailId: '' },
        { emailId: { $exists: false } }
      ]
    });

    if (invalidUsers.length > 0) {
      console.log(`⚠️ Found ${invalidUsers.length} users with invalid emails`);
      
      // Option 1: Delete invalid users (uncomment if you want to delete them)
      // await User.deleteMany({
      //   $or: [
      //     { emailId: null },
      //     { emailId: '' },
      //     { emailId: { $exists: false } }
      //   ]
      // });
      // console.log(`🗑️ Deleted ${invalidUsers.length} users with invalid emails`);

      // Option 2: Update invalid users with placeholder emails (safer approach)
      for (const user of invalidUsers) {
        const placeholderEmail = `user_${user._id}@placeholder.local`;
        await User.findByIdAndUpdate(user._id, { 
          emailId: placeholderEmail,
          isEmailVerified: false 
        });
        console.log(`📧 Updated user ${user._id} with placeholder email: ${placeholderEmail}`);
      }
      console.log(`✅ Updated ${invalidUsers.length} users with placeholder emails`);
    } else {
      console.log('✅ No users with invalid emails found');
    }

    // 2. Check for duplicate emails
    console.log('🔍 Checking for duplicate emails...');
    const duplicateEmails = await User.aggregate([
      {
        $group: {
          _id: '$emailId',
          count: { $sum: 1 },
          users: { $push: '$_id' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    if (duplicateEmails.length > 0) {
      console.log(`⚠️ Found ${duplicateEmails.length} duplicate email addresses`);
      
      for (const duplicate of duplicateEmails) {
        console.log(`📧 Email "${duplicate._id}" has ${duplicate.count} users:`, duplicate.users);
        
        // Keep the first user, update others with unique emails
        const [keepUser, ...updateUsers] = duplicate.users;
        
        for (let i = 0; i < updateUsers.length; i++) {
          const newEmail = `${duplicate._id.split('@')[0]}_${i + 1}@${duplicate._id.split('@')[1]}`;
          await User.findByIdAndUpdate(updateUsers[i], { 
            emailId: newEmail,
            isEmailVerified: false 
          });
          console.log(`📧 Updated user ${updateUsers[i]} with unique email: ${newEmail}`);
        }
      }
    } else {
      console.log('✅ No duplicate emails found');
    }

    // 3. Recreate indexes to fix any index conflicts
    console.log('🔧 Recreating indexes...');
    try {
      // Drop and recreate the email unique index
      await User.collection.dropIndex('email_unique');
      console.log('🗑️ Dropped existing email_unique index');
    } catch (error) {
      console.log('ℹ️ Email unique index may not exist or already dropped');
    }

    // Create the email unique index with sparse option to handle null values
    await User.collection.createIndex(
      { emailId: 1 }, 
      { 
        unique: true, 
        sparse: true,  // This allows multiple null values
        name: 'email_unique' 
      }
    );
    console.log('✅ Created new email_unique index with sparse option');

    console.log('🎉 Database cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run cleanup if this script is executed directly
if (require.main === module) {
  cleanupDatabase()
    .then(() => {
      console.log('✅ Cleanup script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Cleanup script failed:', error);
      process.exit(1);
    });
}

export default cleanupDatabase;
